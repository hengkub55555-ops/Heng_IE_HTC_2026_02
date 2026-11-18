import React, { useMemo, useState } from 'react';
import { MonthlyEfficiencyRow } from '../types/oec';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { formatMonthShort } from '../utils/dateHelper';
import {
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Gauge,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface UphYtdSummarySectionProps {
  monthlyEfficiency: MonthlyEfficiencyRow[];
  plantName?: string;
  selectedProdLine?: string;
  onOpenSummaryEfficiency?: () => void;
  defaultExpanded?: boolean;
}

interface LineYtdMetrics {
  planYtd: number;
  actYtd: number;
  gapYtd: number;
  workHoursYtd: number;
  weightedUphYtd: number;
  exactUphYtd: number;
  targetUph: number;
  targetGap: number;
  achievePct: number;
  latestUph: number;
  latestMonth: string;
  peakUph: number;
  peakMonth: string;
}

interface CumulativeMonthRow {
  month: string;
  lineAAct: number;
  lineAHrs: number;
  lineAUph: number;
  lineAYtdUph: number;
  lineBAct: number;
  lineBHrs: number;
  lineBUph: number;
  lineBYtdUph: number;
  combinedAct: number;
  combinedHrs: number;
  combinedUph: number;
  combinedYtdUph: number;
}

export const UphYtdSummarySection: React.FC<UphYtdSummarySectionProps> = ({
  monthlyEfficiency,
  plantName = 'HTC Ref(泰国冰箱)',
  selectedProdLine = 'All',
  onOpenSummaryEfficiency,
  defaultExpanded = false,
}) => {
  const { language, t } = useAppPreferences();
  const [showMonthlyTable, setShowMonthlyTable] = useState<boolean>(defaultExpanded);

  const ytdData = useMemo(() => {
    const sorted = [...monthlyEfficiency].sort((a, b) => a.month.localeCompare(b.month));

    let aPlan = 0;
    let aAct = 0;
    let aHrs = 0;
    let bPlan = 0;
    let bAct = 0;
    let bHrs = 0;

    let peakAUph = 0;
    let peakAMonth = '';
    let peakBUph = 0;
    let peakBMonth = '';
    let peakCombUph = 0;
    let peakCombMonth = '';

    const cumulativeRows: CumulativeMonthRow[] = [];

    sorted.forEach(row => {
      const rAPlan = Number(row.lineAPlan || 0);
      const rAAct = Number(row.lineAAct || 0);
      const rAHrs = Number(row.lineAWorkHours || 0);
      const rAUph = rAHrs > 0 ? Math.round(rAAct / rAHrs) : Number(row.lineAUph || 0);

      const rBPlan = Number(row.lineBPlan || 0);
      const rBAct = Number(row.lineBAct || 0);
      const rBHrs = Number(row.lineBWorkHours || 0);
      const rBUph = rBHrs > 0 ? Math.round(rBAct / rBHrs) : Number(row.lineBUph || 0);

      aPlan += rAPlan;
      aAct += rAAct;
      aHrs += rAHrs;
      bPlan += rBPlan;
      bAct += rBAct;
      bHrs += rBHrs;

      const combMonthAct = rAAct + rBAct;
      const combMonthHrs = rAHrs + rBHrs;
      const combMonthUph = combMonthHrs > 0 ? Math.round(combMonthAct / combMonthHrs) : 0;

      const cumAUph = aHrs > 0 ? Number((aAct / aHrs).toFixed(1)) : 0;
      const cumBUph = bHrs > 0 ? Number((bAct / bHrs).toFixed(1)) : 0;
      const cumCombHrs = aHrs + bHrs;
      const cumCombAct = aAct + bAct;
      const cumCombUph = cumCombHrs > 0 ? Number((cumCombAct / cumCombHrs).toFixed(1)) : 0;

      if (rAHrs >= 20 && rAUph > peakAUph) {
        peakAUph = rAUph;
        peakAMonth = row.month;
      } else if (peakAUph === 0 && rAUph > peakAUph) {
        peakAUph = rAUph;
        peakAMonth = row.month;
      }

      if (rBUph > peakBUph) {
        peakBUph = rBUph;
        peakBMonth = row.month;
      }

      if (combMonthUph > peakCombUph) {
        peakCombUph = combMonthUph;
        peakCombMonth = row.month;
      }

      cumulativeRows.push({
        month: row.month,
        lineAAct: rAAct,
        lineAHrs: rAHrs,
        lineAUph: rAUph,
        lineAYtdUph: cumAUph,
        lineBAct: rBAct,
        lineBHrs: rBHrs,
        lineBUph: rBUph,
        lineBYtdUph: cumBUph,
        combinedAct: combMonthAct,
        combinedHrs: combMonthHrs,
        combinedUph: combMonthUph,
        combinedYtdUph: cumCombUph,
      });
    });

    const latest = cumulativeRows[cumulativeRows.length - 1];
    const targetA = sorted[sorted.length - 1]?.lineATargetUph || 110;
    const targetB = sorted[sorted.length - 1]?.lineBTargetUph || 100;
    const targetCombined = Math.round((targetA + targetB) / 2);

    const exactAUph = aHrs > 0 ? aAct / aHrs : 0;
    const exactBUph = bHrs > 0 ? bAct / bHrs : 0;
    const combPlan = aPlan + bPlan;
    const combAct = aAct + bAct;
    const combHrs = aHrs + bHrs;
    const exactCombUph = combHrs > 0 ? combAct / combHrs : 0;

    const lineA: LineYtdMetrics = {
      planYtd: aPlan,
      actYtd: aAct,
      gapYtd: aAct - aPlan,
      workHoursYtd: Number(aHrs.toFixed(1)),
      weightedUphYtd: Math.round(exactAUph),
      exactUphYtd: Number(exactAUph.toFixed(1)),
      targetUph: targetA,
      targetGap: Math.round(exactAUph) - targetA,
      achievePct: aPlan > 0 ? (aAct / aPlan) * 100 : 0,
      latestUph: latest?.lineAUph ?? 0,
      latestMonth: latest?.month ?? '',
      peakUph: peakAUph,
      peakMonth: peakAMonth,
    };

    const lineB: LineYtdMetrics = {
      planYtd: bPlan,
      actYtd: bAct,
      gapYtd: bAct - bPlan,
      workHoursYtd: Number(bHrs.toFixed(1)),
      weightedUphYtd: Math.round(exactBUph),
      exactUphYtd: Number(exactBUph.toFixed(1)),
      targetUph: targetB,
      targetGap: Math.round(exactBUph) - targetB,
      achievePct: bPlan > 0 ? (bAct / bPlan) * 100 : 0,
      latestUph: latest?.lineBUph ?? 0,
      latestMonth: latest?.month ?? '',
      peakUph: peakBUph,
      peakMonth: peakBMonth,
    };

    const combined: LineYtdMetrics = {
      planYtd: combPlan,
      actYtd: combAct,
      gapYtd: combAct - combPlan,
      workHoursYtd: Number(combHrs.toFixed(1)),
      weightedUphYtd: Math.round(exactCombUph),
      exactUphYtd: Number(exactCombUph.toFixed(1)),
      targetUph: targetCombined,
      targetGap: Math.round(exactCombUph) - targetCombined,
      achievePct: combPlan > 0 ? (combAct / combPlan) * 100 : 0,
      latestUph: latest?.combinedUph ?? 0,
      latestMonth: latest?.month ?? '',
      peakUph: peakCombUph,
      peakMonth: peakCombMonth,
    };

    return {
      monthsCount: sorted.length,
      firstMonth: sorted[0]?.month || '',
      lastMonth: sorted[sorted.length - 1]?.month || '',
      combined,
      lineA,
      lineB,
      cumulativeRows,
    };
  }, [monthlyEfficiency]);

  const handleExportUphYtd = () => {
    const wb = XLSX.utils.book_new();

    const summarySheetRows: (string | number)[][] = [
      ['HTC Ref UPH YTD Efficiency Summary (Weighted = Total Output / Total Work Hours)'],
      ['Line Scope', 'Plan YTD', 'Actual YTD', 'Gap YTD', 'Achieve %', 'Work Hours YTD', 'Weighted UPH YTD', 'Exact UPH YTD (1 dec)', 'Target UPH', 'Target Gap', 'Latest Month UPH'],
      [
        'Combined (Line A + Line B)',
        ytdData.combined.planYtd,
        ytdData.combined.actYtd,
        ytdData.combined.gapYtd,
        `${ytdData.combined.achievePct.toFixed(1)}%`,
        ytdData.combined.workHoursYtd,
        ytdData.combined.weightedUphYtd,
        ytdData.combined.exactUphYtd,
        ytdData.combined.targetUph,
        ytdData.combined.targetGap,
        ytdData.combined.latestUph,
      ],
      [
        'Line A (2-Door Ref)',
        ytdData.lineA.planYtd,
        ytdData.lineA.actYtd,
        ytdData.lineA.gapYtd,
        `${ytdData.lineA.achievePct.toFixed(1)}%`,
        ytdData.lineA.workHoursYtd,
        ytdData.lineA.weightedUphYtd,
        ytdData.lineA.exactUphYtd,
        ytdData.lineA.targetUph,
        ytdData.lineA.targetGap,
        ytdData.lineA.latestUph,
      ],
      [
        'Line B (1-Door Ref)',
        ytdData.lineB.planYtd,
        ytdData.lineB.actYtd,
        ytdData.lineB.gapYtd,
        `${ytdData.lineB.achievePct.toFixed(1)}%`,
        ytdData.lineB.workHoursYtd,
        ytdData.lineB.weightedUphYtd,
        ytdData.lineB.exactUphYtd,
        ytdData.lineB.targetUph,
        ytdData.lineB.targetGap,
        ytdData.lineB.latestUph,
      ],
      [],
      ['Monthly vs Cumulative UPH YTD Breakdown'],
      ['Month', 'Line A Act', 'Line A Hrs', 'Line A Month UPH', 'Line A YTD UPH', 'Line B Act', 'Line B Hrs', 'Line B Month UPH', 'Line B YTD UPH', 'Combined Act', 'Combined Hrs', 'Combined Month UPH', 'Combined YTD UPH'],
      ...ytdData.cumulativeRows.map(r => [
        r.month,
        r.lineAAct,
        r.lineAHrs,
        r.lineAUph,
        r.lineAYtdUph,
        r.lineBAct,
        r.lineBHrs,
        r.lineBUph,
        r.lineBYtdUph,
        r.combinedAct,
        r.combinedHrs,
        r.combinedUph,
        r.combinedYtdUph,
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(summarySheetRows);
    XLSX.utils.book_append_sheet(wb, ws, 'UPH_YTD_Summary');
    XLSX.writeFile(wb, `UPH_YTD_Combined_LineA_LineB_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (ytdData.monthsCount === 0) return null;

  const isLineAHighlighted = selectedProdLine.toLowerCase().includes('a');
  const isLineBHighlighted = selectedProdLine.toLowerCase().includes('b');

  const cards: {
    key: 'combined' | 'line-a' | 'line-b';
    title: string;
    subtitle: string;
    metrics: LineYtdMetrics;
    accentText: string;
    barColor: string;
    highlighted: boolean;
  }[] = [
    {
      key: 'combined',
      title: t('รวมทั้ง 2 ไลน์ (Line A + Line B)', 'Both Lines Combined (A + B)', '双产线合计 (Line A + B)'),
      subtitle: t('UPH เฉลี่ยถ่วงน้ำหนักทั้งโรงงาน', 'Plant Weighted UPH YTD', '工厂加权累计 UPH'),
      metrics: ytdData.combined,
      accentText: 'text-[#0070c0]',
      barColor: 'bg-[#0070c0]',
      highlighted: selectedProdLine === 'All' || selectedProdLine === 'ทั้งหมด',
    },
    {
      key: 'line-a',
      title: t('แยกเฉพาะ Line A (ตู้เย็น 2 ประตู)', 'Line A Only (2-Door Ref)', '产线 Line A (双门冰箱)'),
      subtitle: t('UPH สะสม Line A YTD', 'Line A Weighted UPH YTD', 'Line A 累计加权 UPH'),
      metrics: ytdData.lineA,
      accentText: 'text-sky-700',
      barColor: 'bg-sky-600',
      highlighted: isLineAHighlighted,
    },
    {
      key: 'line-b',
      title: t('แยกเฉพาะ Line B (ตู้เย็น 1 ประตู)', 'Line B Only (1-Door Ref)', '产线 Line B (单门冰箱)'),
      subtitle: t('UPH สะสม Line B YTD', 'Line B Weighted UPH YTD', 'Line B 累计加权 UPH'),
      metrics: ytdData.lineB,
      accentText: 'text-indigo-700',
      barColor: 'bg-indigo-600',
      highlighted: isLineBHighlighted,
    },
  ];

  const periodRangeText =
    ytdData.firstMonth && ytdData.lastMonth
      ? `${formatMonthShort(ytdData.firstMonth, language)} – ${formatMonthShort(ytdData.lastMonth, language)}`
      : '';

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-4 mb-4 shadow-2xs">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-bold text-[#0070c0] inline-flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5" />
              <span>{plantName}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {t(`สะสม ${ytdData.monthsCount} เดือน`, `${ytdData.monthsCount} Months YTD`, `累计 ${ytdData.monthsCount} 个月`)} ({periodRangeText})
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-[11px] text-slate-600">
              {t('สูตร UPH YTD = ยอดผลิตจริงสะสม ÷ ชั่วโมงทำงานสะสม', 'Weighted UPH YTD = Total Act ÷ Total Work Hrs', 'YTD 公式 = 累计实际产量 ÷ 累计工时')}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight mt-0.5">
            {t(
              'สรุปประสิทธิภาพ UPH YTD (ทั้ง 2 ไลน์รวม & แยก Line A, Line B)',
              'UPH YTD Efficiency Summary (Combined Lines & Line A / Line B)',
              'UPH YTD 年度累计效率汇总 (双线合计及 Line A、Line B 分线)'
            )}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowMonthlyTable(prev => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {showMonthlyTable ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
            )}
            <span>
              {showMonthlyTable
                ? t('ซ่อนตารางสะสมรายเดือน', 'Hide Monthly YTD Table', '收起月度累计明细')
                : t('ดูตารางสะสมรายเดือน YTD', 'Monthly YTD Breakdown', '展开月度累计明细')}
            </span>
          </button>

          <button
            type="button"
            onClick={handleExportUphYtd}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('Export UPH YTD', 'Export UPH YTD', '导出 YTD')}</span>
          </button>

          {onOpenSummaryEfficiency && (
            <button
              type="button"
              onClick={onOpenSummaryEfficiency}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0070c0] hover:bg-[#005ba3] text-white rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{t('เปิด Sheet Summary Efficiency', 'Open Summary Efficiency', '查看效率总表')}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3 Side-by-Side Comparison Columns: Combined (Line A + Line B) | Line A | Line B */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3">
        {cards.map(card => {
          const m = card.metrics;
          const isTargetMet = m.weightedUphYtd >= m.targetUph;
          const targetBarPct = Math.min(100, Math.round((m.exactUphYtd / Math.max(1, m.targetUph)) * 100));

          return (
            <div
              key={card.key}
              className={`rounded-md border p-3.5 transition-colors ${
                card.highlighted
                  ? 'border-[#0070c0]/50 bg-slate-50/70'
                  : 'border-slate-200 bg-white'
              }`}
            >
              {/* Title & Target Status */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900">{card.title}</h3>
                  <p className="text-[11px] text-slate-500">{card.subtitle}</p>
                </div>
                <span
                  className={`text-[11px] font-bold inline-flex items-center gap-1 tabular-nums whitespace-nowrap ${
                    isTargetMet ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {isTargetMet ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {m.targetGap >= 0 ? `+${m.targetGap}` : m.targetGap} vs {m.targetUph}
                  </span>
                </span>
              </div>

              {/* Primary Weighted UPH YTD Number */}
              <div className="mt-2.5 flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-black tracking-tight tabular-nums ${card.accentText}`}>
                    {m.weightedUphYtd}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 tabular-nums">
                    ({m.exactUphYtd.toFixed(1)} {t('ตัว/ชม.', 'UPH', '台/时')})
                  </span>
                </div>
                <div className="text-right text-[11px] text-slate-600 tabular-nums">
                  <span className="text-slate-400 mr-1">{t('ล่าสุด:', 'Latest:', '最新:')}</span>
                  <span className="font-bold text-slate-800">{m.latestUph} UPH</span>
                </div>
              </div>

              {/* Progress vs Target UPH */}
              <div className="mt-2 space-y-1">
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isTargetMet ? 'bg-emerald-600' : card.barColor
                    }`}
                    style={{ width: `${targetBarPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                  <span>
                    {t('เทียบเป้า UPH', 'vs Target UPH', '目标达成率')}:{' '}
                    <strong className="text-slate-800">{targetBarPct}%</strong>
                  </span>
                  {m.peakMonth && (
                    <span>
                      {t('สูงสุด', 'Peak', '峰值')}:{' '}
                      <strong className="text-slate-800">
                        {m.peakUph} ({formatMonthShort(m.peakMonth, language, false)})
                      </strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Supporting Output, Plan & Work Hours Grid */}
              <div className="mt-3 pt-2.5 border-t border-slate-200 grid grid-cols-3 gap-2 text-[11px] tabular-nums">
                <div>
                  <span className="text-slate-400 block">
                    {t('ผลิตจริง YTD', 'Act YTD', '实际累计')}
                  </span>
                  <span className="font-extrabold text-slate-900">
                    {m.actYtd.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">
                    {t('แผนรวม YTD', 'Plan YTD', '计划累计')}
                  </span>
                  <span className="font-semibold text-slate-700">
                    {m.planYtd.toLocaleString()}
                  </span>
                  <span
                    className={`ml-1 font-bold ${
                      m.achievePct >= 100 ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    ({m.achievePct.toFixed(1)}%)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">
                    {t('ชม.ทำงาน YTD', 'Work Hrs YTD', '累计工时')}
                  </span>
                  <span className="font-bold text-slate-800">
                    {m.workHoursYtd.toLocaleString()} {t('ชม.', 'h', '时')}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expandable Monthly vs Cumulative Weighted UPH YTD Breakdown Ledger */}
      {showMonthlyTable && (
        <div className="mt-4 pt-3 border-t border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h3 className="text-xs font-extrabold text-slate-800">
              {t(
                'ตารางเปรียบเทียบ UPH รายเดือน vs ค่าสะสม UPH YTD (ทั้ง 2 ไลน์ และแยก Line A, Line B)',
                'Monthly UPH vs Cumulative Weighted UPH YTD (Combined, Line A & Line B)',
                '月度 UPH 与累计加权 UPH YTD 对比表 (双线合计及 Line A、Line B)'
              )}
            </h3>
            <span className="text-[11px] text-slate-500">
              {t(
                'ตัวเลข YTD คำนวณแบบสะสมตั้งแต่ม.ค. ถึงเดือนนั้นๆ (Cumulative Output ÷ Cumulative Hours)',
                'YTD UPH is calculated cumulatively from Jan through each month',
                'YTD UPH 按1月至当月累计产量 ÷ 累计工时实时加权计算'
              )}
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-md">
            <table className="w-full text-xs border-collapse tabular-nums min-w-[900px]">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 divide-x divide-slate-200 text-center">
                  <th rowSpan={2} className="py-2 px-3 text-left bg-slate-200/70">
                    {t('เดือน', 'Month', '月份')}
                  </th>
                  <th colSpan={4} className="py-1.5 px-2 bg-sky-50 text-sky-900">
                    Line A (2-Door Ref · Target {ytdData.lineA.targetUph})
                  </th>
                  <th colSpan={4} className="py-1.5 px-2 bg-indigo-50 text-indigo-900">
                    Line B (1-Door Ref · Target {ytdData.lineB.targetUph})
                  </th>
                  <th colSpan={4} className="py-1.5 px-2 bg-blue-50 text-[#005a9e]">
                    {t('รวม 2 ไลน์ (Combined · Target ', 'Combined A+B (Target ', '双线合计 (目标 ')}
                    {ytdData.combined.targetUph})
                  </th>
                </tr>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 divide-x divide-slate-200 text-[11px] text-right">
                  <th className="py-1.5 px-2">Act</th>
                  <th className="py-1.5 px-2">Hrs</th>
                  <th className="py-1.5 px-2">{t('UPH เดือน', 'Mo UPH', '月UPH')}</th>
                  <th className="py-1.5 px-2 bg-sky-50/70 text-sky-800 font-bold">YTD UPH</th>

                  <th className="py-1.5 px-2">Act</th>
                  <th className="py-1.5 px-2">Hrs</th>
                  <th className="py-1.5 px-2">{t('UPH เดือน', 'Mo UPH', '月UPH')}</th>
                  <th className="py-1.5 px-2 bg-indigo-50/70 text-indigo-800 font-bold">YTD UPH</th>

                  <th className="py-1.5 px-2">Act</th>
                  <th className="py-1.5 px-2">Hrs</th>
                  <th className="py-1.5 px-2">{t('UPH เดือน', 'Mo UPH', '月UPH')}</th>
                  <th className="py-1.5 px-2 bg-blue-50/80 text-[#0070c0] font-bold">YTD UPH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {ytdData.cumulativeRows.map(r => (
                  <tr key={r.month} className="hover:bg-slate-50 divide-x divide-slate-200 text-right">
                    <td className="py-1.5 px-3 text-left font-bold text-slate-900 whitespace-nowrap">
                      {formatMonthShort(r.month, language)}
                    </td>

                    <td className="py-1.5 px-2 text-slate-700">{r.lineAAct.toLocaleString()}</td>
                    <td className="py-1.5 px-2 text-slate-500">{r.lineAHrs}</td>
                    <td className="py-1.5 px-2 font-semibold text-sky-700">{r.lineAUph}</td>
                    <td className="py-1.5 px-2 font-extrabold bg-sky-50/40 text-sky-900">
                      {r.lineAYtdUph.toFixed(1)}
                    </td>

                    <td className="py-1.5 px-2 text-slate-700">{r.lineBAct.toLocaleString()}</td>
                    <td className="py-1.5 px-2 text-slate-500">{r.lineBHrs}</td>
                    <td className="py-1.5 px-2 font-semibold text-indigo-700">{r.lineBUph}</td>
                    <td className="py-1.5 px-2 font-extrabold bg-indigo-50/40 text-indigo-900">
                      {r.lineBYtdUph.toFixed(1)}
                    </td>

                    <td className="py-1.5 px-2 font-bold text-slate-900">
                      {r.combinedAct.toLocaleString()}
                    </td>
                    <td className="py-1.5 px-2 text-slate-600">{r.combinedHrs}</td>
                    <td className="py-1.5 px-2 font-bold text-[#0070c0]">{r.combinedUph}</td>
                    <td className="py-1.5 px-2 font-black bg-blue-50/50 text-[#005a9e]">
                      {r.combinedYtdUph.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold divide-x divide-slate-700 text-right">
                  <td className="py-2 px-3 text-left text-amber-300 whitespace-nowrap">
                    {t('รวม YTD ทั้งปี', 'TOTAL YTD', '年度累计 YTD')}
                  </td>

                  <td className="py-2 px-2">{ytdData.lineA.actYtd.toLocaleString()}</td>
                  <td className="py-2 px-2 text-slate-300">
                    {ytdData.lineA.workHoursYtd.toLocaleString()}
                  </td>
                  <td className="py-2 px-2 text-sky-300">{ytdData.lineA.weightedUphYtd}</td>
                  <td className="py-2 px-2 bg-slate-800 text-sky-200 font-black">
                    {ytdData.lineA.exactUphYtd.toFixed(1)}
                  </td>

                  <td className="py-2 px-2">{ytdData.lineB.actYtd.toLocaleString()}</td>
                  <td className="py-2 px-2 text-slate-300">
                    {ytdData.lineB.workHoursYtd.toLocaleString()}
                  </td>
                  <td className="py-2 px-2 text-indigo-300">{ytdData.lineB.weightedUphYtd}</td>
                  <td className="py-2 px-2 bg-slate-800 text-indigo-200 font-black">
                    {ytdData.lineB.exactUphYtd.toFixed(1)}
                  </td>

                  <td className="py-2 px-2 text-emerald-300">
                    {ytdData.combined.actYtd.toLocaleString()}
                  </td>
                  <td className="py-2 px-2 text-slate-300">
                    {ytdData.combined.workHoursYtd.toLocaleString()}
                  </td>
                  <td className="py-2 px-2 text-amber-300">{ytdData.combined.weightedUphYtd}</td>
                  <td className="py-2 px-2 bg-[#005a9e] text-white font-black">
                    {ytdData.combined.exactUphYtd.toFixed(1)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};

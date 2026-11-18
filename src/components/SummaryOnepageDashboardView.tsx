import React, { useMemo, useState } from 'react';
import {
  ActiveSheetTab,
  ActionItem,
  DayColumn,
  LineIdleSheetData,
  LineOECData,
  MonthlyEfficiencyRow,
  PeriodStorageState,
  SummaryPerformanceRow,
  UpphSheetData,
} from '../types/oec';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { formatMonthShort, formatPeriodLabel } from '../utils/dateHelper';
import {
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Gauge,
  LayoutGrid,
  Printer,
  Save,
  TrendingDown,
  TrendingUp,
  Users,
  AlertTriangle,
} from 'lucide-react';

interface SummaryOnepageDashboardViewProps {
  monthlyEfficiency: MonthlyEfficiencyRow[];
  summaryPerformance: SummaryPerformanceRow[];
  upphSheet: UpphSheetData;
  lineIdleSheet: LineIdleSheetData;
  periodData: PeriodStorageState;
  activePeriodKey: string;
  activeLines: LineOECData[];
  activeDays: DayColumn[];
  actionItems: ActionItem[];
  plantName: string;
  year: number;
  onSelectPeriod: (periodKey: string) => void;
  onNavigateToSheet: (tab: ActiveSheetTab) => void;
  onSaveOnWeb?: () => void;
  onOpenPresentation?: () => void;
  hasUnsavedChanges?: boolean;
  isSyncing?: boolean;
}

interface UnifiedMonthRecord {
  month: string;
  plan: number;
  act: number;
  gap: number;
  achievePct: number;
  workHours: number;
  lineAPlan: number;
  lineAAct: number;
  lineAWorkHours: number;
  lineAUph: number;
  lineBPlan: number;
  lineBAct: number;
  lineBWorkHours: number;
  lineBUph: number;
  avgUph: number;
  targetUph: number;
  lineAUpph: number;
  lineBUpph: number;
  avgUpph: number;
  targetUpph: number;
  attendance: number;
  idleOver1MinRate: number;
  idle1To5MinRate: number;
  idleOver5MinRate: number;
  idleOver1MinHours: number;
  targetIdleRate: number;
}

export const SummaryOnepageDashboardView: React.FC<SummaryOnepageDashboardViewProps> = ({
  monthlyEfficiency,
  summaryPerformance,
  upphSheet,
  lineIdleSheet,
  periodData,
  activePeriodKey,
  activeLines,
  activeDays,
  actionItems,
  plantName,
  year,
  onSelectPeriod,
  onNavigateToSheet,
  onSaveOnWeb,
  onOpenPresentation,
  hasUnsavedChanges = false,
  isSyncing = false,
}) => {
  const { language, t } = useAppPreferences();

  // Scope: 'YTD' for full year executive summary, or a specific month key e.g. '2026-01'
  const [scope, setScope] = useState<'YTD' | string>('YTD');
  const [trendMode, setTrendMode] = useState<'uph' | 'upph' | 'idle'>('uph');
  const [hoveredProdIdx, setHoveredProdIdx] = useState<number | null>(null);
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null);

  // Merge all data sources cleanly into chronological monthly records
  const unifiedMonths = useMemo<UnifiedMonthRecord[]>(() => {
    const monthSet = new Set<string>();
    monthlyEfficiency.forEach(m => monthSet.add(m.month));
    summaryPerformance.forEach(s => monthSet.add(s.period));
    (upphSheet.monthlyData || []).forEach(u => monthSet.add(u.month));
    (lineIdleSheet.monthlyTrends || []).forEach(i => monthSet.add(i.month));

    const sortedKeys = Array.from(monthSet).sort((a, b) => a.localeCompare(b));

    return sortedKeys.map(monthKey => {
      const eff = monthlyEfficiency.find(m => m.month === monthKey);
      const perf = summaryPerformance.find(s => s.period === monthKey);
      const upph = (upphSheet.monthlyData || []).find(u => u.month === monthKey);
      const idle = (lineIdleSheet.monthlyTrends || []).find(i => i.month === monthKey);

      const lineAPlan = eff ? eff.lineAPlan : 0;
      const lineAAct = eff ? eff.lineAAct : upph?.prodLineA ?? 0;
      const lineAWorkHours = eff ? eff.lineAWorkHours : 0;
      const lineBPlan = eff ? eff.lineBPlan : 0;
      const lineBAct = eff ? eff.lineBAct : upph?.prodLineB ?? 0;
      const lineBWorkHours = eff ? eff.lineBWorkHours : 0;

      const plan = eff ? lineAPlan + lineBPlan : perf?.totalPlan ?? 0;
      const act = eff ? lineAAct + lineBAct : perf?.totalAct ?? 0;
      const workHours =
        eff && lineAWorkHours + lineBWorkHours > 0
          ? Number((lineAWorkHours + lineBWorkHours).toFixed(2))
          : perf?.workHours ?? 0;

      const lineAUph =
        eff?.lineAUph || (lineAWorkHours > 0 ? Math.round(lineAAct / lineAWorkHours) : perf?.lineAUph ?? 0);
      const lineBUph =
        eff?.lineBUph || (lineBWorkHours > 0 ? Math.round(lineBAct / lineBWorkHours) : perf?.lineBUph ?? 0);
      const avgUph =
        workHours > 0
          ? Math.round(act / workHours)
          : perf?.avgUph || Math.round((lineAUph + lineBUph) / 2);

      const lineAUpph = upph?.upphLineA ?? perf?.lineAUpph ?? 0;
      const lineBUpph = upph?.upphLineB ?? perf?.lineBUpph ?? 0;
      const avgUpph =
        perf?.avgUpph ??
        (lineAUpph > 0 || lineBUpph > 0 ? Number(((lineAUpph + lineBUpph) / 2).toFixed(2)) : 0);

      const gap = act - plan;
      const achievePct = plan > 0 ? (act / plan) * 100 : 0;

      return {
        month: monthKey,
        plan,
        act,
        gap,
        achievePct,
        workHours,
        lineAPlan,
        lineAAct,
        lineAWorkHours,
        lineAUph,
        lineBPlan,
        lineBAct,
        lineBWorkHours,
        lineBUph,
        avgUph,
        targetUph: perf?.targetUph ?? 105,
        lineAUpph,
        lineBUpph,
        avgUpph,
        targetUpph: perf?.targetUpph && perf.targetUpph >= 5 ? perf.targetUpph : 16.5,
        attendance: perf?.attendance ?? 182,
        idleOver1MinRate: idle?.over1MinRate ?? perf?.idleOver1MinRate ?? 0,
        idle1To5MinRate: idle?.oneTo5MinRate ?? perf?.idle1To5MinRate ?? 0,
        idleOver5MinRate: idle?.over5MinRate ?? perf?.idleOver5MinRate ?? 0,
        idleOver1MinHours: idle?.over1MinTime ?? perf?.idleOver1MinHours ?? 0,
        targetIdleRate: perf?.targetIdleRate ?? lineIdleSheet.targets?.over1MinTgt ?? 7,
      };
    });
  }, [monthlyEfficiency, summaryPerformance, upphSheet, lineIdleSheet]);

  // Focused month key for daily detail panel (defaults to activePeriodKey when scope === 'YTD')
  const focusMonthKey = useMemo(() => {
    if (scope !== 'YTD') return scope;
    if (unifiedMonths.some(m => m.month === activePeriodKey)) return activePeriodKey;
    return unifiedMonths[unifiedMonths.length - 1]?.month || activePeriodKey;
  }, [scope, activePeriodKey, unifiedMonths]);

  // Aggregate metrics for the 4 KPI cards & Line A vs B comparison
  const overviewStats = useMemo(() => {
    const targetRows =
      scope === 'YTD'
        ? unifiedMonths
        : unifiedMonths.filter(m => m.month === scope);

    if (targetRows.length === 0) {
      return {
        plan: 0,
        act: 0,
        gap: 0,
        achievePct: 0,
        workHours: 0,
        avgUph: 0,
        targetUph: 105,
        lineAPlan: 0,
        lineAAct: 0,
        lineAHrs: 0,
        lineAUph: 0,
        lineBPlan: 0,
        lineBAct: 0,
        lineBHrs: 0,
        lineBUph: 0,
        avgUpph: 0,
        targetUpph: 16.5,
        lineAUpph: 0,
        lineBUpph: 0,
        attendance: 0,
        idleOver1MinRate: 0,
        idle1To5MinRate: 0,
        idleOver5MinRate: 0,
        idleOver1MinHours: 0,
        targetIdleRate: 7,
        monthsCount: 0,
      };
    }

    const plan = targetRows.reduce((s, r) => s + r.plan, 0);
    const act = targetRows.reduce((s, r) => s + r.act, 0);
    const gap = act - plan;
    const achievePct = plan > 0 ? (act / plan) * 100 : 0;

    const lineAPlan = targetRows.reduce((s, r) => s + r.lineAPlan, 0);
    const lineAAct = targetRows.reduce((s, r) => s + r.lineAAct, 0);
    const lineAHrs = targetRows.reduce((s, r) => s + r.lineAWorkHours, 0);

    const lineBPlan = targetRows.reduce((s, r) => s + r.lineBPlan, 0);
    const lineBAct = targetRows.reduce((s, r) => s + r.lineBAct, 0);
    const lineBHrs = targetRows.reduce((s, r) => s + r.lineBWorkHours, 0);

    const workHours = targetRows.reduce((s, r) => s + r.workHours, 0);

    const lineAUph =
      lineAHrs > 0
        ? Math.round(lineAAct / lineAHrs)
        : Math.round(targetRows.reduce((s, r) => s + r.lineAUph, 0) / targetRows.length);

    const lineBUph =
      lineBHrs > 0
        ? Math.round(lineBAct / lineBHrs)
        : Math.round(targetRows.reduce((s, r) => s + r.lineBUph, 0) / targetRows.length);

    const avgUph =
      workHours > 0
        ? Math.round(act / workHours)
        : Math.round(targetRows.reduce((s, r) => s + r.avgUph, 0) / targetRows.length);

    const upphRows = targetRows.filter(r => r.avgUpph > 0);
    const upphDiv = upphRows.length || 1;
    const lineAUpph = Number(
      (upphRows.reduce((s, r) => s + r.lineAUpph, 0) / upphDiv).toFixed(2)
    );
    const lineBUpph = Number(
      (upphRows.reduce((s, r) => s + r.lineBUpph, 0) / upphDiv).toFixed(2)
    );
    const avgUpph = Number(
      (upphRows.reduce((s, r) => s + r.avgUpph, 0) / upphDiv).toFixed(2)
    );

    const idleRows = targetRows.filter(r => r.idleOver1MinRate > 0);
    const idleDiv = idleRows.length || 1;
    const idleOver1MinRate = Number(
      (idleRows.reduce((s, r) => s + r.idleOver1MinRate, 0) / idleDiv).toFixed(1)
    );
    const idle1To5MinRate = Number(
      (idleRows.reduce((s, r) => s + r.idle1To5MinRate, 0) / idleDiv).toFixed(1)
    );
    const idleOver5MinRate = Number(
      (idleRows.reduce((s, r) => s + r.idleOver5MinRate, 0) / idleDiv).toFixed(1)
    );
    const idleOver1MinHours = Number(
      targetRows.reduce((s, r) => s + r.idleOver1MinHours, 0).toFixed(1)
    );

    const attendance = Math.round(
      targetRows.reduce((s, r) => s + r.attendance, 0) / targetRows.length
    );

    return {
      plan,
      act,
      gap,
      achievePct,
      workHours: Number(workHours.toFixed(1)),
      avgUph,
      targetUph: targetRows[targetRows.length - 1]?.targetUph ?? 105,
      lineAPlan,
      lineAAct,
      lineAHrs: Number(lineAHrs.toFixed(1)),
      lineAUph,
      lineBPlan,
      lineBAct,
      lineBHrs: Number(lineBHrs.toFixed(1)),
      lineBUph,
      avgUpph,
      targetUpph: targetRows[targetRows.length - 1]?.targetUpph ?? 16.5,
      lineAUpph,
      lineBUpph,
      attendance,
      idleOver1MinRate,
      idle1To5MinRate,
      idleOver5MinRate,
      idleOver1MinHours,
      targetIdleRate: targetRows[targetRows.length - 1]?.targetIdleRate ?? 7,
      monthsCount: targetRows.length,
    };
  }, [scope, unifiedMonths]);

  // Always-available YTD Weighted UPH benchmarks for Both Lines Combined & Line A / Line B
  const ytdUphBenchmarks = useMemo(() => {
    const aAct = unifiedMonths.reduce((s, r) => s + r.lineAAct, 0);
    const aHrs = unifiedMonths.reduce((s, r) => s + r.lineAWorkHours, 0);
    const bAct = unifiedMonths.reduce((s, r) => s + r.lineBAct, 0);
    const bHrs = unifiedMonths.reduce((s, r) => s + r.lineBWorkHours, 0);
    const combAct = aAct + bAct;
    const combHrs = aHrs + bHrs;
    return {
      combinedUph: combHrs > 0 ? Math.round(combAct / combHrs) : 0,
      lineAUph: aHrs > 0 ? Math.round(aAct / aHrs) : 0,
      lineBUph: bHrs > 0 ? Math.round(bAct / bHrs) : 0,
      combinedHrs: Number(combHrs.toFixed(0)),
      lineAHrs: Number(aHrs.toFixed(0)),
      lineBHrs: Number(bHrs.toFixed(0)),
    };
  }, [unifiedMonths]);

  // Daily breakdown for the focused month (uses live activeLines/activeDays if matching activePeriodKey)
  const focusDailyStats = useMemo(() => {
    const useLive = focusMonthKey === activePeriodKey;
    const monthEntry = useLive
      ? { lines: activeLines, days: activeDays }
      : periodData[focusMonthKey] || { lines: [], days: [] };

    const dayRows = (monthEntry.days || []).map(d => {
      let plan = 0;
      let act = 0;
      let hours = 0;
      (monthEntry.lines || []).forEach(l => {
        plan += Number(l.planning[d.day] || 0);
        act += Number(l.act[d.day] || 0);
        hours += Number(l.workTime[d.day] || 0);
      });
      return {
        day: d.day,
        weekday: d.weekday,
        plan,
        act,
        gap: act - plan,
        uph: hours > 0 ? Math.round(act / hours) : 0,
      };
    });

    const topLossDays = [...dayRows]
      .filter(d => d.gap < 0)
      .sort((a, b) => a.gap - b.gap)
      .slice(0, 3);

    const bestDays = [...dayRows]
      .filter(d => d.act > 0)
      .sort((a, b) => b.act - a.act)
      .slice(0, 2);

    return {
      dayRows,
      topLossDays,
      bestDays,
      maxDailyVal: Math.max(...dayRows.map(d => Math.max(d.plan, d.act)), 100),
    };
  }, [focusMonthKey, activePeriodKey, activeLines, activeDays, periodData]);

  // Production Chart SVG dimensions & scaling
  const prodChartW = 760;
  const prodChartH = 235;
  const prodPadL = 48;
  const prodPadR = 16;
  const prodPadT = 18;
  const prodPadB = 34;
  const prodPlotW = prodChartW - prodPadL - prodPadR;
  const prodPlotH = prodChartH - prodPadT - prodPadB;
  const maxProdVal = Math.max(
    ...unifiedMonths.map(m => Math.max(m.plan, m.act, m.lineAAct + m.lineBAct)),
    10000
  );
  const niceMaxProd = Math.ceil(maxProdVal / 20000) * 20000;

  // Trend Chart SVG dimensions & scaling
  const trendChartW = 760;
  const trendChartH = 235;
  const trendPadL = 44;
  const trendPadR = 18;
  const trendPadT = 18;
  const trendPadB = 34;
  const trendPlotW = trendChartW - trendPadL - trendPadR;
  const trendPlotH = trendChartH - trendPadT - trendPadB;

  const trendConfig = useMemo(() => {
    if (trendMode === 'uph') {
      const vals = unifiedMonths.flatMap(m => [m.lineAUph, m.lineBUph, m.avgUph, m.targetUph]);
      const maxV = Math.max(...vals, 140);
      const minV = 0;
      return {
        minV,
        maxV: Math.ceil(maxV / 20) * 20,
        targetVal: 105,
        targetLabel: t('เป้า UPH: 105', 'Target: 105', '目标: 105'),
        unit: 'UPH',
        seriesA: unifiedMonths.map(m => m.lineAUph),
        seriesB: unifiedMonths.map(m => m.lineBUph),
        seriesAvg: unifiedMonths.map(m => m.avgUph),
        labelA: 'Line A UPH',
        labelB: 'Line B UPH',
        labelAvg: t('เฉลี่ยโรงงาน', 'Plant AVG', '工厂均值'),
      };
    }
    if (trendMode === 'upph') {
      const vals = unifiedMonths.flatMap(m => [m.lineAUpph, m.lineBUpph, m.avgUpph, m.targetUpph]);
      const maxV = Math.max(...vals, 1.5);
      return {
        minV: 0,
        maxV: Number((Math.ceil(maxV * 5) / 5).toFixed(1)),
        targetVal: 16.5,
        targetLabel: t('เป้า UPPH: 16.50', 'Target: 16.50', '目标: 16.50'),
        unit: 'UPPH',
        seriesA: unifiedMonths.map(m => m.lineAUpph),
        seriesB: unifiedMonths.map(m => m.lineBUpph),
        seriesAvg: unifiedMonths.map(m => m.avgUpph),
        labelA: 'Line A UPPH',
        labelB: 'Line B UPPH',
        labelAvg: t('เฉลี่ย UPPH', 'Plant AVG UPPH', '平均 UPPH'),
      };
    }
    const vals = unifiedMonths.flatMap(m => [
      m.idleOver1MinRate,
      m.idle1To5MinRate,
      m.idleOver5MinRate,
      m.targetIdleRate,
    ]);
    const maxV = Math.max(...vals, 25);
    return {
      minV: 0,
      maxV: Math.ceil(maxV / 10) * 10,
      targetVal: 7,
      targetLabel: t('เป้า Idle: 7.0%', 'Target: 7.0%', '目标停机率: 7.0%'),
      unit: '%',
      seriesA: unifiedMonths.map(m => m.idle1To5MinRate),
      seriesB: unifiedMonths.map(m => m.idleOver5MinRate),
      seriesAvg: unifiedMonths.map(m => m.idleOver1MinRate),
      labelA: '1–5 min %',
      labelB: '>5 min %',
      labelAvg: t('รวม >1 นาที %', 'Total >1m %', '总停机 >1m %'),
    };
  }, [trendMode, unifiedMonths, t]);

  const scopeLabel =
    scope === 'YTD'
      ? t(`ภาพรวมสะสมทั้งปี ${year} (ม.ค.–พ.ย.)`, `YTD Cumulative ${year} (Jan–Nov)`, `${year}年 全年累计汇总 (1月–11月)`)
      : formatPeriodLabel(year, scope, language);

  const openActionsCount = actionItems.filter(a => a.status !== 'Resolved').length;

  return (
    <div className="space-y-4 pb-6 print:space-y-3 print:pb-0">
      {/* Top Executive Onepage Bar */}
      <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs print:border-slate-300">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1.5 text-[#0070c0] font-bold">
                <LayoutGrid className="w-4 h-4" />
                <span>{plantName}</span>
              </span>
              <span>·</span>
              <span>{scopeLabel}</span>
              <span>·</span>
              <span>
                {unifiedMonths.length} {t('เดือนข้อมูล', 'Months Tracked', '个月度记录')}
              </span>
              <span>·</span>
              <span>
                {activeLines.length} {t('สายการผลิต', 'Prod Lines', '条产线')}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
              {t(
                'Summary Onepage Dashboard — สรุปผู้บริหารแบบหน้าเดียว',
                'Summary Onepage Dashboard — Executive Operations Overview',
                '一页式运营汇总看板 (Summary Onepage Dashboard)'
              )}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {/* Period Focus Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#0070c0] shrink-0" />
              <select
                value={scope}
                onChange={e => setScope(e.target.value)}
                aria-label={t('เลือกช่วงเวลาสรุป', 'Select Summary Scope', '选择汇总范围')}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="YTD">
                  {t(`YTD สะสม (${unifiedMonths.length} เดือน)`, `YTD Full (${unifiedMonths.length} Mos)`, `全年累计 YTD (${unifiedMonths.length}个月)`)}
                </option>
                {unifiedMonths.map(m => (
                  <option key={m.month} value={m.month}>
                    {formatPeriodLabel(year, m.month, language)}
                  </option>
                ))}
              </select>
            </div>

            {onOpenPresentation && (
              <button
                onClick={onOpenPresentation}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-md text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#0070c0]" />
                <span>{t('รายงานนำเสนอ ผจก.', 'Manager Report', '厂长汇报')}</span>
              </button>
            )}

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('พิมพ์ Onepage / PDF', 'Print Onepage / PDF', '打印 / 导出 PDF')}</span>
            </button>

            {onSaveOnWeb && (
              <button
                onClick={onSaveOnWeb}
                disabled={isSyncing}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  hasUnsavedChanges
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>
                  {isSyncing
                    ? t('กำลังบันทึก...', 'Saving...', '保存中...')
                    : t('บันทึกบน Web', 'Save on Web', '网页保存')}
                </span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 4-Pillar Executive KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Pillar 1: Total Production & Plan Achievement */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {t('1. ยอดผลิตรวม (Production)', '1. Production Output', '1. 生产产量汇总')}
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${
                  overviewStats.achievePct >= 95
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : overviewStats.achievePct >= 88
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {overviewStats.achievePct.toFixed(1)}% {t('บรรลุเป้า', 'Achieved', '达成率')}
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                {overviewStats.act.toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-slate-500 tabular-nums">
                / {overviewStats.plan.toLocaleString()} {t('เครื่อง', 'Units', '台')}
              </span>
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  overviewStats.achievePct >= 95
                    ? 'bg-emerald-500'
                    : overviewStats.achievePct >= 88
                    ? 'bg-amber-500'
                    : 'bg-[#0070c0]'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, overviewStats.achievePct))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className="text-slate-500">{t('ผลต่าง (Gap)', 'Net Gap', '差异 (Gap)')}</span>
              <span
                className={`tabular-nums inline-flex items-center gap-1 ${
                  overviewStats.gap >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {overviewStats.gap >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {overviewStats.gap > 0
                  ? `+${overviewStats.gap.toLocaleString()}`
                  : overviewStats.gap.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Pillar 2: Factory & Line UPH */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {t('2. ประสิทธิภาพผลิต (UPH)', '2. Output Speed (UPH)', '2. 生产效率 (UPH)')}
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${
                  overviewStats.avgUph >= overviewStats.targetUph
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {overviewStats.avgUph >= overviewStats.targetUph
                  ? t('ผ่านเป้า', 'On Target', '达标')
                  : t('ต่ำกว่าเป้า', 'Below Target', '低于目标')}{' '}
                ({overviewStats.targetUph})
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[#0070c0] tabular-nums">
                {overviewStats.avgUph}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {scope === 'YTD'
                  ? t('ตัว/ชม. (รวม 2 ไลน์ YTD)', 'Units/Hr (Both Lines YTD)', '台/小时 (双线 YTD)')
                  : t('ตัว/ชม. (รวม 2 ไลน์)', 'Units/Hr (Combined)', '台/小时 (双线合计)')}
              </span>
            </div>
            {scope !== 'YTD' && (
              <div className="mt-1 text-[11px] font-semibold text-slate-500 tabular-nums">
                {t('สะสม YTD:', 'YTD Weighted:', '累计 YTD:')}{' '}
                <span className="text-[#0070c0] font-bold">{ytdUphBenchmarks.combinedUph}</span>
                <span className="mx-1 text-slate-300">·</span>
                <span>A: {ytdUphBenchmarks.lineAUph}</span>
                <span className="mx-1 text-slate-300">·</span>
                <span>B: {ytdUphBenchmarks.lineBUph}</span>
              </div>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-3 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400 block">Line A ({overviewStats.lineAHrs.toLocaleString()}h)</span>
              <span className="font-bold text-slate-800 tabular-nums">{overviewStats.lineAUph} UPH</span>
            </div>
            <div>
              <span className="text-slate-400 block">Line B ({overviewStats.lineBHrs.toLocaleString()}h)</span>
              <span className="font-bold text-slate-800 tabular-nums">{overviewStats.lineBUph} UPH</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block">{t('ชม.ทำงานรวม', 'Total Hrs', '总工时')}</span>
              <span className="font-bold text-slate-800 tabular-nums">
                {overviewStats.workHours.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Pillar 3: Labor Efficiency (UPPH) */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {t('3. ประสิทธิภาพแรงงาน (UPPH)', '3. Labor Efficiency (UPPH)', '3. 人均效率 (UPPH)')}
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${
                  overviewStats.avgUpph >= overviewStats.targetUpph
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {t('เป้า', 'Target', '目标')} {overviewStats.targetUpph.toFixed(2)}
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-700 tabular-nums">
                {overviewStats.avgUpph.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {t('ตัว/คน/ชม.', 'Units/Person/Hr', '台/人/小时')}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-3 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400 block">Line A</span>
              <span className="font-bold text-slate-800 tabular-nums">
                {overviewStats.lineAUpph.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Line B</span>
              <span className="font-bold text-slate-800 tabular-nums">
                {overviewStats.lineBUpph.toFixed(2)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block">{t('มาทำงาน', 'Attend.', '出勤人数')}</span>
              <span className="font-bold text-slate-800 tabular-nums inline-flex items-center gap-1">
                <Users className="w-3 h-3 text-slate-400" />
                {overviewStats.attendance}
              </span>
            </div>
          </div>
        </div>

        {/* Pillar 4: FA Line Stop / Idle Time */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {t('4. เวลาหยุดไลน์ (FA Line Stop)', '4. FA Line Idle Rate', '4. 总装停机率 (Idle)')}
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${
                  overviewStats.idleOver1MinRate <= overviewStats.targetIdleRate
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {overviewStats.idleOver1MinRate <= overviewStats.targetIdleRate
                  ? t('คุมได้ตามเป้า', 'Within Target', '可控达标')
                  : t('สูงกว่าเป้า', 'Over Target', '超出目标')}{' '}
                ({overviewStats.targetIdleRate}%)
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-rose-600 tabular-nums">
                {overviewStats.idleOver1MinRate.toFixed(1)}%
              </span>
              <span className="text-xs font-semibold text-slate-500 tabular-nums">
                ({overviewStats.idleOver1MinHours.toLocaleString()} {t('ชม.', 'hrs', '小时')})
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-3 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400 block">1–5 min</span>
              <span className="font-bold text-amber-700 tabular-nums">
                {overviewStats.idle1To5MinRate.toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">&gt;5 min</span>
              <span className="font-bold text-rose-700 tabular-nums">
                {overviewStats.idleOver5MinRate.toFixed(1)}%
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block">{t('สถานะ', 'Status', '状态')}</span>
              <span className="font-bold text-slate-700 inline-flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                &gt;1 min
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Dual Interactive SVG Analytics Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* Chart 1: Monthly Production Output (Line A + Line B vs Plan) */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-[#0070c0]" />
                <span>
                  {t(
                    'แนวโน้มยอดผลิตรายเดือน: Line A + Line B เทียบ Plan',
                    'Monthly Production Output: Line A + Line B vs Plan',
                    '月度产量趋势: Line A + Line B 对比 Plan'
                  )}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                {t(
                  'คลิกแท่งกราฟเดือนใดก็ได้เพื่อเจาะดูข้อมูลเดือนนั้นแบบเจาะลึก',
                  'Hover for exact metrics or click any month bar to focus that period',
                  '悬停查看详细数据，点击任意月份柱状图即可聚焦查看该月'
                )}
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-600">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#0070c0]" /> Line A
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#38bdf8]" /> Line B
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-0.5 bg-amber-500 inline-block" /> Plan
              </span>
            </div>
          </div>

          <div className="relative w-full">
            <svg
              viewBox={`0 0 ${prodChartW} ${prodChartH}`}
              className="w-full h-56 overflow-visible select-none"
            >
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map(frac => {
                const yPos = prodPadT + prodPlotH - frac * prodPlotH;
                const val = Math.round(niceMaxProd * frac);
                return (
                  <g key={frac}>
                    <line
                      x1={prodPadL}
                      y1={yPos}
                      x2={prodChartW - prodPadR}
                      y2={yPos}
                      stroke="#e2e8f0"
                      strokeDasharray={frac === 0 ? undefined : '3 3'}
                    />
                    <text
                      x={prodPadL - 6}
                      y={yPos + 3.5}
                      textAnchor="end"
                      className="fill-slate-400 text-[10px] font-mono"
                    >
                      {val >= 1000 ? `${Math.round(val / 1000)}k` : val}
                    </text>
                  </g>
                );
              })}

              {/* Stacked Bars (Line A bottom + Line B top) */}
              {unifiedMonths.map((m, idx) => {
                const slotW = prodPlotW / Math.max(unifiedMonths.length, 1);
                const barW = Math.min(34, slotW * 0.58);
                const x = prodPadL + idx * slotW + (slotW - barW) / 2;

                const hA = (m.lineAAct / niceMaxProd) * prodPlotH;
                const hB = (m.lineBAct / niceMaxProd) * prodPlotH;
                const yB = prodPadT + prodPlotH - hA - hB;
                const yA = prodPadT + prodPlotH - hA;
                const isSelected = scope === m.month || (scope === 'YTD' && focusMonthKey === m.month);

                return (
                  <g
                    key={m.month}
                    onMouseEnter={() => setHoveredProdIdx(idx)}
                    onMouseLeave={() => setHoveredProdIdx(null)}
                    onClick={() => setScope(prev => (prev === m.month ? 'YTD' : m.month))}
                    className="cursor-pointer"
                  >
                    {hoveredProdIdx === idx && (
                      <rect
                        x={prodPadL + idx * slotW + 2}
                        y={prodPadT}
                        width={slotW - 4}
                        height={prodPlotH}
                        rx={4}
                        fill="#eff6ff"
                        opacity={0.7}
                      />
                    )}
                    <rect
                      x={x}
                      y={yA}
                      width={barW}
                      height={Math.max(0, hA)}
                      fill="#0070c0"
                      opacity={isSelected ? 1 : 0.88}
                    />
                    <rect
                      x={x}
                      y={yB}
                      width={barW}
                      height={Math.max(0, hB)}
                      rx={2}
                      fill="#38bdf8"
                      opacity={isSelected ? 1 : 0.88}
                    />
                    <text
                      x={x + barW / 2}
                      y={prodChartH - 12}
                      textAnchor="middle"
                      className={`text-[10px] font-semibold ${
                        isSelected ? 'fill-[#0070c0] font-bold' : 'fill-slate-500'
                      }`}
                    >
                      {formatMonthShort(m.month, language, false)}
                    </text>
                  </g>
                );
              })}

              {/* Plan Overlay Line */}
              {unifiedMonths.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2.2"
                  strokeDasharray="5 3"
                  points={unifiedMonths
                    .map((m, idx) => {
                      const slotW = prodPlotW / unifiedMonths.length;
                      const cx = prodPadL + idx * slotW + slotW / 2;
                      const cy = prodPadT + prodPlotH - (m.plan / niceMaxProd) * prodPlotH;
                      return `${cx},${cy}`;
                    })
                    .join(' ')}
                />
              )}

              {/* Plan points */}
              {unifiedMonths.map((m, idx) => {
                const slotW = prodPlotW / Math.max(unifiedMonths.length, 1);
                const cx = prodPadL + idx * slotW + slotW / 2;
                const cy = prodPadT + prodPlotH - (m.plan / niceMaxProd) * prodPlotH;
                return (
                  <circle
                    key={`pt-${m.month}`}
                    cx={cx}
                    cy={cy}
                    r={hoveredProdIdx === idx ? 4.5 : 3}
                    fill="#f59e0b"
                    stroke="#ffffff"
                    strokeWidth="1.2"
                  />
                );
              })}
            </svg>

            {/* Hover Tooltip */}
            {hoveredProdIdx !== null && unifiedMonths[hoveredProdIdx] && (
              <div className="mt-2 px-3 py-2 bg-slate-900 text-white rounded-md text-[11px] flex flex-wrap items-center justify-between gap-3">
                <span className="font-bold text-sky-300">
                  {formatPeriodLabel(year, unifiedMonths[hoveredProdIdx].month, language)}
                </span>
                <div className="flex flex-wrap items-center gap-3 tabular-nums">
                  <span>Plan: {unifiedMonths[hoveredProdIdx].plan.toLocaleString()}</span>
                  <span className="text-sky-300 font-bold">
                    Act: {unifiedMonths[hoveredProdIdx].act.toLocaleString()}
                  </span>
                  <span>Line A: {unifiedMonths[hoveredProdIdx].lineAAct.toLocaleString()}</span>
                  <span>Line B: {unifiedMonths[hoveredProdIdx].lineBAct.toLocaleString()}</span>
                  <span
                    className={
                      unifiedMonths[hoveredProdIdx].gap >= 0 ? 'text-emerald-300' : 'text-rose-300'
                    }
                  >
                    Gap:{' '}
                    {unifiedMonths[hoveredProdIdx].gap > 0
                      ? `+${unifiedMonths[hoveredProdIdx].gap.toLocaleString()}`
                      : unifiedMonths[hoveredProdIdx].gap.toLocaleString()}
                  </span>
                  <span className="text-amber-300 font-bold">
                    {unifiedMonths[hoveredProdIdx].achievePct.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Multi-Metric Efficiency & Line Stop Trend */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-emerald-600" />
                <span>
                  {t(
                    'ดัชนีประสิทธิภาพ & เวลาหยุดไลน์ (UPH / UPPH / Line Stop)',
                    'Efficiency & Idle Trend (UPH / UPPH / Line Stop)',
                    '效率与停机率趋势 (UPH / UPPH / 停机率)'
                  )}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">{trendConfig.targetLabel}</p>
            </div>

            {/* Clean Metric Mode Switcher */}
            <div className="inline-flex bg-slate-100 border border-slate-200 rounded-md p-0.5 text-[11px] font-bold">
              {(
                [
                  { id: 'uph' as const, label: 'UPH' },
                  { id: 'upph' as const, label: 'UPPH' },
                  { id: 'idle' as const, label: t('Line Stop %', 'Idle %', '停机率 %') },
                ] as const
              ).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setTrendMode(tab.id)}
                  className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
                    trendMode === tab.id
                      ? 'bg-[#0070c0] text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full">
            <svg
              viewBox={`0 0 ${trendChartW} ${trendChartH}`}
              className="w-full h-56 overflow-visible select-none"
            >
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map(frac => {
                const yPos = trendPadT + trendPlotH - frac * trendPlotH;
                const val = trendConfig.maxV * frac;
                return (
                  <g key={frac}>
                    <line
                      x1={trendPadL}
                      y1={yPos}
                      x2={trendChartW - trendPadR}
                      y2={yPos}
                      stroke="#e2e8f0"
                      strokeDasharray={frac === 0 ? undefined : '3 3'}
                    />
                    <text
                      x={trendPadL - 6}
                      y={yPos + 3.5}
                      textAnchor="end"
                      className="fill-slate-400 text-[10px] font-mono"
                    >
                      {trendMode === 'upph' ? val.toFixed(1) : Math.round(val)}
                    </text>
                  </g>
                );
              })}

              {/* Target Benchmark Line */}
              {(() => {
                const ty =
                  trendPadT +
                  trendPlotH -
                  Math.min(1, trendConfig.targetVal / trendConfig.maxV) * trendPlotH;
                return (
                  <g>
                    <line
                      x1={trendPadL}
                      y1={ty}
                      x2={trendChartW - trendPadR}
                      y2={ty}
                      stroke="#ef4444"
                      strokeWidth="1.5"
                      strokeDasharray="6 4"
                    />
                    <text
                      x={trendChartW - trendPadR}
                      y={ty - 4}
                      textAnchor="end"
                      className="fill-rose-600 text-[10px] font-bold"
                    >
                      {trendConfig.targetLabel}
                    </text>
                  </g>
                );
              })()}

              {/* Series Polylines */}
              {unifiedMonths.length > 1 && (
                <>
                  <polyline
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="2.2"
                    points={unifiedMonths
                      .map((_, idx) => {
                        const slotW = trendPlotW / unifiedMonths.length;
                        const cx = trendPadL + idx * slotW + slotW / 2;
                        const v = trendConfig.seriesA[idx] || 0;
                        const cy =
                          trendPadT +
                          trendPlotH -
                          Math.min(1, v / trendConfig.maxV) * trendPlotH;
                        return `${cx},${cy}`;
                      })
                      .join(' ')}
                  />
                  <polyline
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2.2"
                    points={unifiedMonths
                      .map((_, idx) => {
                        const slotW = trendPlotW / unifiedMonths.length;
                        const cx = trendPadL + idx * slotW + slotW / 2;
                        const v = trendConfig.seriesB[idx] || 0;
                        const cy =
                          trendPadT +
                          trendPlotH -
                          Math.min(1, v / trendConfig.maxV) * trendPlotH;
                        return `${cx},${cy}`;
                      })
                      .join(' ')}
                  />
                  <polyline
                    fill="none"
                    stroke="#059669"
                    strokeWidth="2.6"
                    points={unifiedMonths
                      .map((_, idx) => {
                        const slotW = trendPlotW / unifiedMonths.length;
                        const cx = trendPadL + idx * slotW + slotW / 2;
                        const v = trendConfig.seriesAvg[idx] || 0;
                        const cy =
                          trendPadT +
                          trendPlotH -
                          Math.min(1, v / trendConfig.maxV) * trendPlotH;
                        return `${cx},${cy}`;
                      })
                      .join(' ')}
                  />
                </>
              )}

              {/* Hover targets + X labels */}
              {unifiedMonths.map((m, idx) => {
                const slotW = trendPlotW / Math.max(unifiedMonths.length, 1);
                const cx = trendPadL + idx * slotW + slotW / 2;
                const yAvg =
                  trendPadT +
                  trendPlotH -
                  Math.min(1, (trendConfig.seriesAvg[idx] || 0) / trendConfig.maxV) * trendPlotH;

                return (
                  <g
                    key={`t-${m.month}`}
                    onMouseEnter={() => setHoveredTrendIdx(idx)}
                    onMouseLeave={() => setHoveredTrendIdx(null)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={trendPadL + idx * slotW}
                      y={trendPadT}
                      width={slotW}
                      height={trendPlotH}
                      fill="transparent"
                    />
                    <circle
                      cx={cx}
                      cy={yAvg}
                      r={hoveredTrendIdx === idx ? 5 : 3.2}
                      fill="#059669"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    <text
                      x={cx}
                      y={trendChartH - 12}
                      textAnchor="middle"
                      className="fill-slate-500 text-[10px] font-semibold"
                    >
                      {formatMonthShort(m.month, language, false)}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Legend & Hover Readout */}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-3 font-semibold text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-600" /> {trendConfig.labelA}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> {trendConfig.labelB}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> {trendConfig.labelAvg}
                </span>
              </div>

              {hoveredTrendIdx !== null && unifiedMonths[hoveredTrendIdx] && (
                <div className="px-2.5 py-1 bg-slate-900 text-white rounded text-[11px] font-semibold tabular-nums flex items-center gap-2.5">
                  <span className="text-sky-300">
                    {formatMonthShort(unifiedMonths[hoveredTrendIdx].month, language)}
                  </span>
                  <span>
                    {trendConfig.labelA}: {trendConfig.seriesA[hoveredTrendIdx]}
                  </span>
                  <span>
                    {trendConfig.labelB}: {trendConfig.seriesB[hoveredTrendIdx]}
                  </span>
                  <span className="text-emerald-300">
                    {trendConfig.labelAvg}: {trendConfig.seriesAvg[hoveredTrendIdx]}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Balanced 2-Column Operational Matrix: Line A vs Line B Scorecard + Action Tracker */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left: Line A vs Line B Comparison & Focused Month Daily Pulse */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-extrabold text-slate-900">
                {t(
                  'เปรียบเทียบ Line A vs Line B',
                  'Line A vs Line B Head-to-Head Scorecard',
                  'Line A 与 Line B 产线对比评分卡'
                )}
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">{scopeLabel}</span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-md">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 text-left">{t('สายการผลิต', 'Line', '产线')}</th>
                    <th className="py-2 px-2.5 text-right">Plan</th>
                    <th className="py-2 px-2.5 text-right">Actual</th>
                    <th className="py-2 px-2.5 text-right">Gap</th>
                    <th className="py-2 px-2.5 text-right">%</th>
                    <th className="py-2 px-2.5 text-right">UPH</th>
                    <th className="py-2 px-2.5 text-right">UPPH</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 tabular-nums">
                  {(() => {
                    const rowsData = [
                      {
                        name: 'Line A',
                        plan: overviewStats.lineAPlan,
                        act: overviewStats.lineAAct,
                        uph: overviewStats.lineAUph,
                        upph: overviewStats.lineAUpph,
                        badgeClass: 'text-[#0070c0]',
                      },
                      {
                        name: 'Line B',
                        plan: overviewStats.lineBPlan,
                        act: overviewStats.lineBAct,
                        uph: overviewStats.lineBUph,
                        upph: overviewStats.lineBUpph,
                        badgeClass: 'text-indigo-700',
                      },
                    ];

                    return rowsData.map(r => {
                      const gap = r.act - r.plan;
                      const pct = r.plan > 0 ? (r.act / r.plan) * 100 : 0;
                      return (
                        <tr key={r.name} className="hover:bg-slate-50">
                          <td className={`py-2 px-3 font-extrabold ${r.badgeClass}`}>{r.name}</td>
                          <td className="py-2 px-2.5 text-right text-slate-600">
                            {r.plan.toLocaleString()}
                          </td>
                          <td className="py-2 px-2.5 text-right font-bold text-slate-900">
                            {r.act.toLocaleString()}
                          </td>
                          <td
                            className={`py-2 px-2.5 text-right font-semibold ${
                              gap >= 0 ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {gap > 0 ? `+${gap.toLocaleString()}` : gap.toLocaleString()}
                          </td>
                          <td className="py-2 px-2.5 text-right font-bold text-slate-700">
                            {pct.toFixed(1)}%
                          </td>
                          <td className="py-2 px-2.5 text-right font-extrabold text-[#0070c0]">
                            {r.uph}
                          </td>
                          <td className="py-2 px-2.5 text-right font-bold text-emerald-700">
                            {r.upph.toFixed(2)}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* Focused Month Daily Production Bar Pulse */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-slate-800">
                {t(
                  `ยอดผลิตรายวัน (${formatPeriodLabel(year, focusMonthKey, language)})`,
                  `Daily Output Pulse (${formatPeriodLabel(year, focusMonthKey, language)})`,
                  `每日产量脉冲 (${formatPeriodLabel(year, focusMonthKey, language)})`
                )}
              </span>
              <button
                onClick={() => {
                  onSelectPeriod(focusMonthKey);
                  onNavigateToSheet('daily-oec');
                }}
                className="text-[11px] font-bold text-[#0070c0] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{t('เปิดตารางรายวัน', 'Open Daily Sheet', '打开日清主表')}</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {focusDailyStats.dayRows.length > 0 ? (
              <div className="flex items-end gap-1 h-24 pt-2 border-b border-slate-200">
                {focusDailyStats.dayRows.map(d => {
                  const hPct = Math.max(4, Math.round((d.act / focusDailyStats.maxDailyVal) * 100));
                  const metPlan = d.act >= d.plan;
                  return (
                    <div
                      key={d.day}
                      title={`${t('วันที่', 'Day', '日期')} ${d.day} (${d.weekday}) · Plan: ${d.plan.toLocaleString()} | Act: ${d.act.toLocaleString()} | UPH: ${d.uph}`}
                      className="flex-1 flex flex-col items-center justify-end h-full group"
                    >
                      <div
                        className={`w-full rounded-t-xs transition-all ${
                          d.act === 0
                            ? 'bg-slate-200'
                            : metPlan
                            ? 'bg-emerald-500 group-hover:bg-emerald-600'
                            : 'bg-[#0070c0] group-hover:bg-[#005ba3]'
                        }`}
                        style={{ height: `${hPct}%` }}
                      />
                      <span className="text-[9px] font-mono text-slate-400 mt-1 leading-none">
                        {d.day}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                {t('ไม่มีข้อมูลรายวันในเดือนที่เลือก', 'No daily rows in selected month', '所选月份暂无每日明细')}
              </div>
            )}
          </div>
        </div>

        {/* Right: Bottleneck Days & Executive Action Items + Sheet Navigation */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>
                  {t(
                    'จุดคอขวดรายวัน & แผนแก้ไข (Action Items)',
                    'Bottleneck Days & Countermeasures',
                    '生产瓶颈与改善对策 (Action Items)'
                  )}
                </span>
              </h3>
              <span className="text-[11px] font-bold text-slate-600">
                {openActionsCount} {t('รายการกำลังดำเนินการ', 'Active Actions', '项进行中')}
              </span>
            </div>

            {/* Top Loss Days Strip */}
            <div className="bg-slate-50 border border-slate-200 rounded-md p-2.5">
              <div className="text-[11px] font-bold text-slate-600 mb-1.5">
                {t(
                  `วันที่ขาดเป้ามากสุด (${formatMonthShort(focusMonthKey, language)})`,
                  `Top Variance Days (${formatMonthShort(focusMonthKey, language)})`,
                  `负差异最大日期 (${formatMonthShort(focusMonthKey, language)})`
                )}
              </div>
              {focusDailyStats.topLossDays.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {focusDailyStats.topLossDays.map(d => (
                    <div
                      key={d.day}
                      className="bg-white border border-slate-200 rounded px-2.5 py-1.5 flex items-center justify-between tabular-nums"
                    >
                      <span className="font-semibold text-slate-700">
                        {t('วัน', 'D', '日')} {d.day}
                      </span>
                      <span className="font-bold text-rose-600">{d.gap.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {t(
                      'ยอดผลิตผ่านเป้าหมายทุกวันในเดือนนี้',
                      'All production days met target plan',
                      '本月所有工作日均达成计划目标'
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Action Items Compact List */}
            <div className="border border-slate-200 rounded-md overflow-hidden">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-1.5 px-3 text-left">{t('ประเด็น / ปัญหา', 'Issue', '问题点')}</th>
                    <th className="py-1.5 px-2.5 text-left">{t('ผู้รับผิดชอบ', 'Owner', '负责人')}</th>
                    <th className="py-1.5 px-2.5 text-center">{t('สถานะ', 'Status', '状态')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {actionItems.slice(0, 4).map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-900 line-clamp-1">{item.issue}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{item.action}</div>
                      </td>
                      <td className="py-2 px-2.5 text-slate-600 whitespace-nowrap">{item.owner}</td>
                      <td className="py-2 px-2.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold ${
                            item.status === 'Resolved'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : item.status === 'In Progress'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {actionItems.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-slate-400">
                        {t('ไม่มีรายการ Action Item ค้าง', 'No action items logged', '暂无改善追踪项')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Module Links */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 print:hidden">
            <span className="text-[11px] font-bold text-slate-500 mr-1">
              {t('เปิดชีตย่อย:', 'Jump to Sheet:', '快捷跳转:')}
            </span>
            {(
              [
                { id: 'daily-oec' as ActiveSheetTab, label: t('Daily OEC', 'Daily OEC', '生产日清主表') },
                { id: 'upph-oec' as ActiveSheetTab, label: t('UPPH OEC', 'UPPH OEC', '人效日清 UPPH') },
                { id: 'line-idle' as ActiveSheetTab, label: t('Line Stop', 'Line Stop', '总装停机时') },
                {
                  id: 'summary-performance' as ActiveSheetTab,
                  label: t('Summary Perf', 'Summary Perf', '综合汇总表'),
                },
                {
                  id: 'summary-efficiency' as ActiveSheetTab,
                  label: t('Efficiency YTD', 'Efficiency YTD', '效率汇总 YTD'),
                },
              ] as const
            ).map(link => (
              <button
                key={link.id}
                onClick={() => onNavigateToSheet(link.id)}
                className="px-2.5 py-1 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#0070c0] border border-slate-200 rounded text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Consolidated Monthly Performance Ledger (2026-01 .. 2026-11) */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              {t(
                'ตารางสรุปผลการดำเนินงานรายเดือนครบทุกมิติ (Consolidated Monthly Ledger)',
                'Consolidated Monthly Operations Ledger (Jan – Nov)',
                '全维度月度运营绩效总账表 (1月 – 11月)'
              )}
            </h3>
            <p className="text-[11px] text-slate-500">
              {t(
                'คลิกแถวเดือนเพื่อสลับมุมมอง Onepage ไปยังเดือนนั้น หรือดับเบิลคลิกเพื่อเปิดดูตารางรายวัน',
                'Click any month row to inspect that month, or open its Daily OEC matrix directly',
                '点击任意月份行可筛选该月一页式视图，或直接跳转至每日明细表'
              )}
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-500">
            {unifiedMonths.length} {t('งวดบัญชี', 'Periods', '个周期')}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2 px-3 text-left whitespace-nowrap">
                  {t('เดือน', 'Month', '月份')}
                </th>
                <th className="py-2 px-2.5 text-right whitespace-nowrap">Plan</th>
                <th className="py-2 px-2.5 text-right whitespace-nowrap">Actual</th>
                <th className="py-2 px-2.5 text-right whitespace-nowrap">Gap</th>
                <th className="py-2 px-2.5 text-right whitespace-nowrap">
                  {t('บรรลุ %', 'Achv %', '达成率')}
                </th>
                <th className="py-2 px-2.5 text-right whitespace-nowrap">Line A UPH</th>
                <th className="py-2 px-2.5 text-right whitespace-nowrap">Line B UPH</th>
                <th className="py-2 px-2.5 text-right whitespace-nowrap">AVG UPH</th>
                <th className="py-2 px-2.5 text-right whitespace-nowrap">AVG UPPH</th>
                <th className="py-2 px-2.5 text-right whitespace-nowrap">
                  {t('คนมาทำงาน', 'Attend.', '出勤')}
                </th>
                <th className="py-2 px-2.5 text-right whitespace-nowrap">
                  {t('หยุดไลน์ %', 'Idle %', '停机率')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 tabular-nums">
              {unifiedMonths.map(m => {
                const isFocused = scope === m.month;
                return (
                  <tr
                    key={m.month}
                    onClick={() => setScope(prev => (prev === m.month ? 'YTD' : m.month))}
                    className={`cursor-pointer transition-colors ${
                      isFocused ? 'bg-blue-50/80' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2 px-3 font-bold text-slate-900 whitespace-nowrap">
                      {formatMonthShort(m.month, language)}
                    </td>
                    <td className="py-2 px-2.5 text-right text-slate-600">
                      {m.plan.toLocaleString()}
                    </td>
                    <td className="py-2 px-2.5 text-right font-bold text-slate-900">
                      {m.act.toLocaleString()}
                    </td>
                    <td
                      className={`py-2 px-2.5 text-right font-semibold ${
                        m.gap >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {m.gap > 0 ? `+${m.gap.toLocaleString()}` : m.gap.toLocaleString()}
                    </td>
                    <td className="py-2 px-2.5 text-right font-bold text-slate-700">
                      {m.achievePct.toFixed(1)}%
                    </td>
                    <td className="py-2 px-2.5 text-right text-sky-700 font-semibold">
                      {m.lineAUph}
                    </td>
                    <td className="py-2 px-2.5 text-right text-indigo-700 font-semibold">
                      {m.lineBUph}
                    </td>
                    <td className="py-2 px-2.5 text-right font-extrabold text-[#0070c0]">
                      {m.avgUph}
                    </td>
                    <td className="py-2 px-2.5 text-right font-bold text-emerald-700">
                      {m.avgUpph > 0 ? m.avgUpph.toFixed(2) : '-'}
                    </td>
                    <td className="py-2 px-2.5 text-right text-slate-600">{m.attendance}</td>
                    <td
                      className={`py-2 px-2.5 text-right font-bold ${
                        m.idleOver1MinRate <= m.targetIdleRate ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {m.idleOver1MinRate > 0 ? `${m.idleOver1MinRate.toFixed(1)}%` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* YTD Footer */}
            {(() => {
              const totPlan = unifiedMonths.reduce((s, r) => s + r.plan, 0);
              const totAct = unifiedMonths.reduce((s, r) => s + r.act, 0);
              const totGap = totAct - totPlan;
              const totAchv = totPlan > 0 ? (totAct / totPlan) * 100 : 0;
              const totHrs = unifiedMonths.reduce((s, r) => s + r.workHours, 0);
              const totLineAAct = unifiedMonths.reduce((s, r) => s + r.lineAAct, 0);
              const totLineAHrs = unifiedMonths.reduce((s, r) => s + r.lineAWorkHours, 0);
              const totLineBAct = unifiedMonths.reduce((s, r) => s + r.lineBAct, 0);
              const totLineBHrs = unifiedMonths.reduce((s, r) => s + r.lineBWorkHours, 0);
              const ytdAUph = totLineAHrs > 0 ? Math.round(totLineAAct / totLineAHrs) : 0;
              const ytdBUph = totLineBHrs > 0 ? Math.round(totLineBAct / totLineBHrs) : 0;
              const ytdAvgUph = totHrs > 0 ? Math.round(totAct / totHrs) : 0;
              const upphItems = unifiedMonths.filter(r => r.avgUpph > 0);
              const ytdUpph =
                upphItems.length > 0
                  ? (upphItems.reduce((s, r) => s + r.avgUpph, 0) / upphItems.length).toFixed(2)
                  : '-';
              const avgAtt =
                unifiedMonths.length > 0
                  ? Math.round(
                      unifiedMonths.reduce((s, r) => s + r.attendance, 0) / unifiedMonths.length
                    )
                  : 0;
              const idleItems = unifiedMonths.filter(r => r.idleOver1MinRate > 0);
              const ytdIdle =
                idleItems.length > 0
                  ? `${(
                      idleItems.reduce((s, r) => s + r.idleOver1MinRate, 0) / idleItems.length
                    ).toFixed(1)}%`
                  : '-';

              return (
                <tfoot className="bg-slate-900 text-white font-bold border-t border-slate-700 tabular-nums">
                  <tr>
                    <td className="py-2.5 px-3 text-amber-300 whitespace-nowrap">
                      {t('รวม / เฉลี่ย YTD', 'TOTAL / AVG YTD', '年度累计 / 均值 YTD')}
                    </td>
                    <td className="py-2.5 px-2.5 text-right">{totPlan.toLocaleString()}</td>
                    <td className="py-2.5 px-2.5 text-right text-sky-300">
                      {totAct.toLocaleString()}
                    </td>
                    <td
                      className={`py-2.5 px-2.5 text-right ${
                        totGap >= 0 ? 'text-emerald-300' : 'text-rose-300'
                      }`}
                    >
                      {totGap > 0 ? `+${totGap.toLocaleString()}` : totGap.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2.5 text-right text-amber-300">
                      {totAchv.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-2.5 text-right text-sky-200">{ytdAUph}</td>
                    <td className="py-2.5 px-2.5 text-right text-indigo-200">{ytdBUph}</td>
                    <td className="py-2.5 px-2.5 text-right text-white">{ytdAvgUph}</td>
                    <td className="py-2.5 px-2.5 text-right text-emerald-300">{ytdUpph}</td>
                    <td className="py-2.5 px-2.5 text-right text-slate-200">{avgAtt}</td>
                    <td className="py-2.5 px-2.5 text-right text-rose-300">{ytdIdle}</td>
                  </tr>
                </tfoot>
              );
            })()}
          </table>
        </div>
      </section>
    </div>
  );
};

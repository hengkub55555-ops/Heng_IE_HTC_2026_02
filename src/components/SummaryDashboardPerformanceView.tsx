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
  PieChart as PieChartIcon,
  Calendar,
  Download,
  Printer,
  Save,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Gauge,
  Users,
  Clock,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface SummaryDashboardPerformanceViewProps {
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
  hasUnsavedChanges?: boolean;
  isSyncing?: boolean;
}

interface PieSlice {
  id: string;
  label: string;
  subLabel?: string;
  value: number;
  displayValue: string;
  color: string;
}

interface UnifiedPerfMonth {
  month: string;
  lineAPlan: number;
  lineAAct: number;
  lineAHrs: number;
  lineAUph: number;
  lineBPlan: number;
  lineBAct: number;
  lineBHrs: number;
  lineBUph: number;
  plan: number;
  act: number;
  gap: number;
  achievePct: number;
  workHours: number;
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

interface InteractivePieCardProps {
  title: string;
  subtitle: string;
  dimensionTag: string;
  slices: PieSlice[];
  chartStyle: 'donut' | 'pie';
  centerLabel: string;
  centerValue: string;
  unitLabel: string;
  emptyText: string;
  footerSummary?: string;
  isDark?: boolean;
}

const InteractivePieCard: React.FC<InteractivePieCardProps> = ({
  title,
  subtitle,
  dimensionTag,
  slices,
  chartStyle,
  centerLabel,
  centerValue,
  unitLabel,
  emptyText,
  footerSummary,
  isDark = false,
}) => {
  const [activeSliceId, setActiveSliceId] = useState<string | null>(null);

  const positiveSlices = useMemo(
    () => slices.filter(s => s.value > 0),
    [slices]
  );

  const total = useMemo(
    () => positiveSlices.reduce((sum, s) => sum + s.value, 0),
    [positiveSlices]
  );

  const activeSlice = useMemo(
    () => slices.find(s => s.id === activeSliceId) || null,
    [slices, activeSliceId]
  );

  const cx = 96;
  const cy = 96;
  const outerR = 76;
  const innerR = chartStyle === 'donut' ? 47 : 0;
  const strokeDivider = isDark ? '#1e293b' : '#ffffff';

  const describeSlicePath = (startAngle: number, endAngle: number) => {
    const x1 = cx + outerR * Math.cos(startAngle);
    const y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(endAngle);
    const y2 = cy + outerR * Math.sin(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

    if (innerR <= 0) {
      return `M ${cx} ${cy} L ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    }

    const ix1 = cx + innerR * Math.cos(endAngle);
    const iy1 = cy + innerR * Math.sin(endAngle);
    const ix2 = cx + innerR * Math.cos(startAngle);
    const iy2 = cy + innerR * Math.sin(startAngle);

    return [
      `M ${x1} ${y1}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2}`,
      'Z',
    ].join(' ');
  };

  let runningAngle = -Math.PI / 2;

  return (
    <article className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between transition-colors">
      <div>
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
          <span className="font-semibold text-[#0070c0]">{dimensionTag}</span>
          <span className="tabular-nums font-mono text-[11px]">{unitLabel}</span>
        </div>
        <h3 className="text-base font-bold text-slate-900 mt-1 leading-snug">{title}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>

      {total <= 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center text-xs text-slate-400">
          <PieChartIcon className="w-8 h-8 mb-2 opacity-40" />
          <span>{emptyText}</span>
        </div>
      ) : (
        <div className="mt-4 flex flex-col sm:flex-row items-center gap-5">
          {/* Interactive SVG Pie / Donut */}
          <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 192 192" className="w-full h-full overflow-visible select-none">
              {positiveSlices.map(slice => {
                const fraction = slice.value / total;
                const angleSpan = fraction * Math.PI * 2;
                const start = runningAngle;
                const end = runningAngle + angleSpan;
                runningAngle = end;

                const isHighlighted = activeSliceId === slice.id;
                const isDimmed = activeSliceId !== null && !isHighlighted;
                const midAngle = start + angleSpan / 2;
                const tx = isHighlighted ? Math.cos(midAngle) * 5 : 0;
                const ty = isHighlighted ? Math.sin(midAngle) * 5 : 0;

                if (fraction >= 0.9995) {
                  return (
                    <g
                      key={slice.id}
                      onMouseEnter={() => setActiveSliceId(slice.id)}
                      onMouseLeave={() => setActiveSliceId(null)}
                      onClick={() =>
                        setActiveSliceId(prev => (prev === slice.id ? null : slice.id))
                      }
                      style={{
                        transform: `translate(${tx}px, ${ty}px)`,
                        transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1), opacity 160ms ease',
                      }}
                      className="cursor-pointer"
                    >
                      {chartStyle === 'donut' ? (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={(outerR + innerR) / 2}
                          fill="none"
                          stroke={slice.color}
                          strokeWidth={outerR - innerR}
                          opacity={isDimmed ? 0.45 : 1}
                        />
                      ) : (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={outerR}
                          fill={slice.color}
                          opacity={isDimmed ? 0.45 : 1}
                        />
                      )}
                    </g>
                  );
                }

                return (
                  <path
                    key={slice.id}
                    d={describeSlicePath(start, end)}
                    fill={slice.color}
                    stroke={strokeDivider}
                    strokeWidth={1.8}
                    opacity={isDimmed ? 0.45 : 1}
                    onMouseEnter={() => setActiveSliceId(slice.id)}
                    onMouseLeave={() => setActiveSliceId(null)}
                    onClick={() =>
                      setActiveSliceId(prev => (prev === slice.id ? null : slice.id))
                    }
                    style={{
                      transform: `translate(${tx}px, ${ty}px)`,
                      transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1), opacity 160ms ease',
                    }}
                    className="cursor-pointer"
                  />
                );
              })}
            </svg>

            {/* Center Focal Telemetry (Donut Mode) */}
            {chartStyle === 'donut' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-7 text-center">
                <span className="text-[10px] font-semibold text-slate-500 truncate max-w-[84px]">
                  {activeSlice ? activeSlice.label : centerLabel}
                </span>
                <span className="text-lg font-extrabold text-slate-900 tabular-nums leading-tight mt-0.5">
                  {activeSlice
                    ? `${((activeSlice.value / total) * 100).toFixed(1)}%`
                    : centerValue}
                </span>
                {activeSlice && (
                  <span className="text-[10px] font-mono text-slate-500 tabular-nums truncate max-w-[84px]">
                    {activeSlice.displayValue}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Crisp Tabular Legend */}
          <div className="flex-1 w-full space-y-2">
            {slices.map(slice => {
              const pct = total > 0 ? (slice.value / total) * 100 : 0;
              const isSelected = activeSliceId === slice.id;
              return (
                <button
                  type="button"
                  key={slice.id}
                  onMouseEnter={() => setActiveSliceId(slice.id)}
                  onMouseLeave={() => setActiveSliceId(null)}
                  onClick={() =>
                    setActiveSliceId(prev => (prev === slice.id ? null : slice.id))
                  }
                  className={`w-full text-left px-2.5 py-2 rounded-md border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-slate-50 border-slate-300'
                      : 'bg-transparent border-transparent hover:bg-slate-50/70 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="font-semibold text-slate-800 truncate">{slice.label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 tabular-nums font-mono">
                      <span className="text-slate-600 text-[11px]">{slice.displayValue}</span>
                      <span className="font-bold text-slate-900 w-12 text-right">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-1.5 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-200"
                      style={{
                        width: `${Math.min(100, Math.max(0, pct))}%`,
                        backgroundColor: slice.color,
                      }}
                    />
                  </div>
                  {slice.subLabel && (
                    <div className="mt-1 text-[10px] text-slate-500 truncate">{slice.subLabel}</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {footerSummary && (
        <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between gap-2">
          <span>{footerSummary}</span>
        </div>
      )}
    </article>
  );
};

export const SummaryDashboardPerformanceView: React.FC<SummaryDashboardPerformanceViewProps> = ({
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
  hasUnsavedChanges = false,
  isSyncing = false,
}) => {
  const { language, currentTheme, t } = useAppPreferences();

  const [scope, setScope] = useState<'YTD' | string>('YTD');
  const [chartStyle, setChartStyle] = useState<'donut' | 'pie'>('donut');
  const [selectedLineFilter, setSelectedLineFilter] = useState<'all' | 'line-a' | 'line-b'>('all');

  // Unify all chronological monthly records cleanly
  const unifiedMonths = useMemo<UnifiedPerfMonth[]>(() => {
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
      const lineAHrs = eff ? eff.lineAWorkHours : 0;
      const lineBPlan = eff ? eff.lineBPlan : 0;
      const lineBAct = eff ? eff.lineBAct : upph?.prodLineB ?? 0;
      const lineBHrs = eff ? eff.lineBWorkHours : 0;

      const plan = eff ? lineAPlan + lineBPlan : perf?.totalPlan ?? 0;
      const act = eff ? lineAAct + lineBAct : perf?.totalAct ?? 0;
      const workHours =
        eff && lineAHrs + lineBHrs > 0
          ? Number((lineAHrs + lineBHrs).toFixed(1))
          : perf?.workHours ?? 0;

      const lineAUph =
        eff?.lineAUph || (lineAHrs > 0 ? Math.round(lineAAct / lineAHrs) : perf?.lineAUph ?? 0);
      const lineBUph =
        eff?.lineBUph || (lineBHrs > 0 ? Math.round(lineBAct / lineBHrs) : perf?.lineBUph ?? 0);
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
        lineAPlan,
        lineAAct,
        lineAHrs,
        lineAUph,
        lineBPlan,
        lineBAct,
        lineBHrs,
        lineBUph,
        plan,
        act,
        gap,
        achievePct,
        workHours,
        avgUph,
        targetUph: perf?.targetUph ?? 105,
        lineAUpph,
        lineBUpph,
        avgUpph,
        targetUpph: perf?.targetUpph && perf.targetUpph >= 5 ? perf.targetUpph : 16.5,
        attendance: perf?.attendance ?? 212,
        idleOver1MinRate: idle?.over1MinRate ?? perf?.idleOver1MinRate ?? 0,
        idle1To5MinRate: idle?.oneTo5MinRate ?? perf?.idle1To5MinRate ?? 0,
        idleOver5MinRate: idle?.over5MinRate ?? perf?.idleOver5MinRate ?? 0,
        idleOver1MinHours: idle?.over1MinTime ?? perf?.idleOver1MinHours ?? 0,
        targetIdleRate: perf?.targetIdleRate ?? lineIdleSheet.targets?.over1MinTgt ?? 7,
      };
    });
  }, [monthlyEfficiency, summaryPerformance, upphSheet, lineIdleSheet]);

  const scopedRows = useMemo(
    () => (scope === 'YTD' ? unifiedMonths : unifiedMonths.filter(m => m.month === scope)),
    [scope, unifiedMonths]
  );

  // Scoped Aggregate Stats (Filtered by All / Line A / Line B cleanly)
  const kpiStats = useMemo(() => {
    const plan = scopedRows.reduce((s, r) => {
      if (selectedLineFilter === 'line-a') return s + r.lineAPlan;
      if (selectedLineFilter === 'line-b') return s + r.lineBPlan;
      return s + r.plan;
    }, 0);

    const act = scopedRows.reduce((s, r) => {
      if (selectedLineFilter === 'line-a') return s + r.lineAAct;
      if (selectedLineFilter === 'line-b') return s + r.lineBAct;
      return s + r.act;
    }, 0);

    const workHours = scopedRows.reduce((s, r) => {
      if (selectedLineFilter === 'line-a') return s + r.lineAHrs;
      if (selectedLineFilter === 'line-b') return s + r.lineBHrs;
      return s + r.workHours;
    }, 0);

    const lineAAct = scopedRows.reduce((s, r) => s + r.lineAAct, 0);
    const lineBAct = scopedRows.reduce((s, r) => s + r.lineBAct, 0);
    const lineAPlan = scopedRows.reduce((s, r) => s + r.lineAPlan, 0);
    const lineBPlan = scopedRows.reduce((s, r) => s + r.lineBPlan, 0);
    const lineAHrs = scopedRows.reduce((s, r) => s + r.lineAHrs, 0);
    const lineBHrs = scopedRows.reduce((s, r) => s + r.lineBHrs, 0);

    const lineAUph = lineAHrs > 0 ? Math.round(lineAAct / lineAHrs) : 0;
    const lineBUph = lineBHrs > 0 ? Math.round(lineBAct / lineBHrs) : 0;
    const weightedUph = workHours > 0 ? Math.round(act / workHours) : 0;

    // UPPH weighted or average across covered periods
    const upphRows = scopedRows.filter(r => r.avgUpph > 0);
    const divU = upphRows.length || 1;
    const lineAUpph = Number((upphRows.reduce((s, r) => s + r.lineAUpph, 0) / divU).toFixed(2));
    const lineBUpph = Number((upphRows.reduce((s, r) => s + r.lineBUpph, 0) / divU).toFixed(2));
    const avgUpph =
      selectedLineFilter === 'line-a'
        ? lineAUpph
        : selectedLineFilter === 'line-b'
        ? lineBUpph
        : Number((upphRows.reduce((s, r) => s + r.avgUpph, 0) / divU).toFixed(2));

    // Workforce split from UPPH Sheet matrices when available
    let lineAManpowerSum = 0;
    let lineBManpowerSum = 0;
    let lineAManpowerDays = 0;
    let lineBManpowerDays = 0;

    scopedRows.forEach(r => {
      const matrix = upphSheet.periodMatrices?.[r.month];
      if (matrix) {
        const uA = matrix.lines.find(l => l.prodLine.toLowerCase().includes('a')) || matrix.lines[0];
        const uB = matrix.lines.find(l => l.prodLine.toLowerCase().includes('b')) || matrix.lines[1];
        matrix.days.forEach(d => {
          const attA = Number(uA?.attendance?.[d.day] || 0);
          const attB = Number(uB?.attendance?.[d.day] || 0);
          if (attA > 0) {
            lineAManpowerSum += attA;
            lineAManpowerDays += 1;
          }
          if (attB > 0) {
            lineBManpowerSum += attB;
            lineBManpowerDays += 1;
          }
        });
      }
    });

    const avgLineAAtt = lineAManpowerDays > 0 ? Math.round(lineAManpowerSum / lineAManpowerDays) : 120;
    const avgLineBAtt = lineBManpowerDays > 0 ? Math.round(lineBManpowerSum / lineBManpowerDays) : 95;
    const totalAvgAtt = avgLineAAtt + avgLineBAtt;

    // Idle Rates (months with tracked idle metrics)
    const idleRows = scopedRows.filter(r => r.idleOver1MinRate > 0);
    const idleDiv = idleRows.length || 1;
    const idleOver1Rate = Number(
      (idleRows.reduce((s, r) => s + r.idleOver1MinRate, 0) / idleDiv).toFixed(1)
    );
    const idle1To5Rate = Number(
      (idleRows.reduce((s, r) => s + r.idle1To5MinRate, 0) / idleDiv).toFixed(1)
    );
    const idleOver5Rate = Number(
      (idleRows.reduce((s, r) => s + r.idleOver5MinRate, 0) / idleDiv).toFixed(1)
    );
    const productiveRunRate = Number(Math.max(0, 100 - idleOver1Rate).toFixed(1));
    const idleTotalHrs = Number(
      scopedRows.reduce((s, r) => s + r.idleOver1MinHours, 0).toFixed(1)
    );

    const gap = act - plan;
    const achievePct = plan > 0 ? (act / plan) * 100 : 0;

    return {
      plan,
      act,
      gap,
      achievePct,
      workHours: Number(workHours.toFixed(0)),
      weightedUph,
      lineAPlan,
      lineAAct,
      lineAHrs: Number(lineAHrs.toFixed(0)),
      lineAUph,
      lineBPlan,
      lineBAct,
      lineBHrs: Number(lineBHrs.toFixed(0)),
      lineBUph,
      avgUpph,
      lineAUpph,
      lineBUpph,
      avgLineAAtt,
      avgLineBAtt,
      totalAvgAtt,
      idleOver1Rate,
      idle1To5Rate,
      idleOver5Rate,
      productiveRunRate,
      idleTotalHrs,
      targetUph: scopedRows[scopedRows.length - 1]?.targetUph ?? 105,
      targetUpph: scopedRows[scopedRows.length - 1]?.targetUpph ?? 16.5,
      targetIdleRate: scopedRows[scopedRows.length - 1]?.targetIdleRate ?? 7,
    };
  }, [scopedRows, selectedLineFilter, upphSheet.periodMatrices]);

  // Daily Achievement Distribution across all working days in scope
  const dailyAchievementMix = useMemo(() => {
    let exceedDays = 0; // >= 100%
    let nearDays = 0; // 90% - 99.9%
    let belowDays = 0; // < 90%
    let unplannedDays = 0; // Act > 0, Plan = 0
    let totalActiveDays = 0;

    scopedRows.forEach(m => {
      const useLive = m.month === activePeriodKey;
      const entry = useLive
        ? { lines: activeLines, days: activeDays }
        : periodData[m.month] || { lines: [], days: [] };

      (entry.days || []).forEach(d => {
        let dayPlan = 0;
        let dayAct = 0;
        (entry.lines || []).forEach(l => {
          const isA = l.prodLine.toLowerCase().includes('a');
          const isB = l.prodLine.toLowerCase().includes('b');
          if (selectedLineFilter === 'line-a' && !isA) return;
          if (selectedLineFilter === 'line-b' && !isB) return;
          dayPlan += Number(l.planning?.[d.day] || 0);
          dayAct += Number(l.act?.[d.day] || 0);
        });

        if (dayAct <= 0 && dayPlan <= 0) return;
        totalActiveDays += 1;

        if (dayPlan <= 0 && dayAct > 0) {
          unplannedDays += 1;
        } else if (dayPlan > 0) {
          const pct = (dayAct / dayPlan) * 100;
          if (pct >= 100) exceedDays += 1;
          else if (pct >= 90) nearDays += 1;
          else belowDays += 1;
        }
      });
    });

    return {
      exceedDays,
      nearDays,
      belowDays,
      unplannedDays,
      totalActiveDays,
    };
  }, [scopedRows, activePeriodKey, activeLines, activeDays, periodData, selectedLineFilter]);

  // Dynamic Time-Slice Pie: Quarterly Production Mix (in YTD) OR Weekly Production Mix (in Single Month)
  const timeBreakdownSlices = useMemo<{
    title: string;
    subtitle: string;
    tag: string;
    centerLabel: string;
    slices: PieSlice[];
  }>(() => {
    const palette = ['#0070c0', '#0ea5e9', '#10b981', '#f59e0b', '#6366f1'];

    if (scope === 'YTD') {
      const quarters = [
        { id: 'Q1', label: t('ไตรมาส 1 (ม.ค.–มี.ค.)', 'Q1 (Jan–Mar)', '第一季度 (1–3月)'), months: ['01', '02', '03'] },
        { id: 'Q2', label: t('ไตรมาส 2 (เม.ย.–มิ.ย.)', 'Q2 (Apr–Jun)', '第二季度 (4–6月)'), months: ['04', '05', '06'] },
        { id: 'Q3', label: t('ไตรมาส 3 (ก.ค.–ก.ย.)', 'Q3 (Jul–Sep)', '第三季度 (7–9月)'), months: ['07', '08', '09'] },
        { id: 'Q4', label: t('ไตรมาส 4 (ต.ค.–ธ.ค.)', 'Q4 (Oct–Dec)', '第四季度 (10–12月)'), months: ['10', '11', '12'] },
      ];

      const slices: PieSlice[] = quarters.map((q, idx) => {
        const rows = unifiedMonths.filter(m => q.months.includes(m.month.split('-')[1] || ''));
        const qAct = rows.reduce((s, r) => {
          if (selectedLineFilter === 'line-a') return s + r.lineAAct;
          if (selectedLineFilter === 'line-b') return s + r.lineBAct;
          return s + r.act;
        }, 0);
        const qPlan = rows.reduce((s, r) => {
          if (selectedLineFilter === 'line-a') return s + r.lineAPlan;
          if (selectedLineFilter === 'line-b') return s + r.lineBPlan;
          return s + r.plan;
        }, 0);
        const pctPlan = qPlan > 0 ? ((qAct / qPlan) * 100).toFixed(1) : '0.0';
        return {
          id: q.id,
          label: q.label,
          subLabel: `${t('แผน', 'Plan', '计划')}: ${qPlan.toLocaleString()} (${pctPlan}%)`,
          value: qAct,
          displayValue: qAct.toLocaleString(),
          color: palette[idx % palette.length],
        };
      });

      return {
        title: t('สัดส่วนผลผลิตแยกตามไตรมาส (Q1–Q4)', 'Quarterly Production Output Share (Q1–Q4)', '各季度产量占比分布 (Q1–Q4)'),
        subtitle: t('เปรียบเทียบสัดส่วนปริมาณการผลิตรวมแต่ละไตรมาสตลอดปี', 'Output contribution split across operational quarters', '对比全年各季度累计产出贡献比例'),
        tag: t('มิติช่วงเวลา (Quarterly)', 'Time Dimension · Quarterly', '时间维度 · 季度分布'),
        centerLabel: t('รวมทั้งปี', 'YTD Total', '全年总计'),
        slices,
      };
    }

    // Single Month -> Weekly Breakdown (Days 1-7, 8-14, 15-21, 22-31)
    const useLive = scope === activePeriodKey;
    const entry = useLive
      ? { lines: activeLines, days: activeDays }
      : periodData[scope] || { lines: [], days: [] };

    const weekBuckets = [
      { id: 'W1', label: t('สัปดาห์ที่ 1 (วันที่ 1–7)', 'Week 1 (Days 1–7)', '第 1 周 (1–7日)'), min: 1, max: 7 },
      { id: 'W2', label: t('สัปดาห์ที่ 2 (วันที่ 8–14)', 'Week 2 (Days 8–14)', '第 2 周 (8–14日)'), min: 8, max: 14 },
      { id: 'W3', label: t('สัปดาห์ที่ 3 (วันที่ 15–21)', 'Week 3 (Days 15–21)', '第 3 周 (15–21日)'), min: 15, max: 21 },
      { id: 'W4', label: t('สัปดาห์ที่ 4–5 (วันที่ 22–31)', 'Week 4–5 (Days 22–31)', '第 4–5 周 (22–31日)'), min: 22, max: 31 },
    ];

    const slices: PieSlice[] = weekBuckets.map((wb, idx) => {
      let wAct = 0;
      let wPlan = 0;
      (entry.days || [])
        .filter(d => d.day >= wb.min && d.day <= wb.max)
        .forEach(d => {
          (entry.lines || []).forEach(l => {
            const isA = l.prodLine.toLowerCase().includes('a');
            const isB = l.prodLine.toLowerCase().includes('b');
            if (selectedLineFilter === 'line-a' && !isA) return;
            if (selectedLineFilter === 'line-b' && !isB) return;
            wAct += Number(l.act?.[d.day] || 0);
            wPlan += Number(l.planning?.[d.day] || 0);
          });
        });
      const pctPlan = wPlan > 0 ? `${((wAct / wPlan) * 100).toFixed(1)}%` : t('ไม่มีแผน', 'Unplanned', '无计划');
      return {
        id: wb.id,
        label: wb.label,
        subLabel: `${t('แผน', 'Plan', '计划')}: ${wPlan.toLocaleString()} (${pctPlan})`,
        value: wAct,
        displayValue: wAct.toLocaleString(),
        color: palette[idx % palette.length],
      };
    });

    return {
      title: t('สัดส่วนผลผลิตแยกตามสัปดาห์ในเดือน', 'Weekly Production Share in Month', '当月各周产量占比'),
      subtitle: t('กระจายยอดผลิตจริงรายสัปดาห์เพื่อติดตามจังหวะเร่งส่งมอบ', 'Weekly output cadence for selected period', '按周查看当月实际产出分布与交付节奏'),
      tag: t('มิติรายสัปดาห์ (Weekly)', 'Time Dimension · Weekly', '时间维度 · 周度分布'),
      centerLabel: t('รวมทั้งเดือน', 'Month Total', '当月总计'),
      slices,
    };
  }, [scope, unifiedMonths, selectedLineFilter, activePeriodKey, activeLines, activeDays, periodData, t]);

  // 6 Core Multi-Dimensional Pie Datasets
  const lineProductionSlices: PieSlice[] = useMemo(
    () => [
      {
        id: 'line-a',
        label: 'Line A',
        subLabel: `${t('แผน', 'Plan', '计划')}: ${kpiStats.lineAPlan.toLocaleString()} · UPH ${kpiStats.lineAUph}`,
        value: kpiStats.lineAAct,
        displayValue: kpiStats.lineAAct.toLocaleString(),
        color: currentTheme.id === 'ocean' ? '#0070c0' : currentTheme.primaryHex,
      },
      {
        id: 'line-b',
        label: 'Line B',
        subLabel: `${t('แผน', 'Plan', '计划')}: ${kpiStats.lineBPlan.toLocaleString()} · UPH ${kpiStats.lineBUph}`,
        value: kpiStats.lineBAct,
        displayValue: kpiStats.lineBAct.toLocaleString(),
        color: '#0ea5e9',
      },
    ],
    [kpiStats, currentTheme, t]
  );

  const workHoursSlices: PieSlice[] = useMemo(
    () => [
      {
        id: 'hrs-a',
        label: `Line A (${kpiStats.lineAUph} UPH)`,
        subLabel: t('อัตราผลิตเฉลี่ยต่อชั่วโมงถ่วงน้ำหนัก', 'Weighted output rate per run hour', '加权每小时产出'),
        value: kpiStats.lineAHrs,
        displayValue: `${kpiStats.lineAHrs.toLocaleString()}h`,
        color: '#4f46e5',
      },
      {
        id: 'hrs-b',
        label: `Line B (${kpiStats.lineBUph} UPH)`,
        subLabel: t('อัตราผลิตเฉลี่ยต่อชั่วโมงถ่วงน้ำหนัก', 'Weighted output rate per run hour', '加权每小时产出'),
        value: kpiStats.lineBHrs,
        displayValue: `${kpiStats.lineBHrs.toLocaleString()}h`,
        color: '#14b8a6',
      },
    ],
    [kpiStats, t]
  );

  const achievementSlices: PieSlice[] = useMemo(
    () => [
      {
        id: 'exceed',
        label: t('บรรลุแผน ≥ 100%', 'On / Exceed Plan ≥ 100%', '达标/超产 ≥ 100%'),
        subLabel: t('จำนวนวันที่ทำได้ถึงหรือเกินเป้าหมาย', 'Days meeting or exceeding daily plan', '达成或超过日计划的天数'),
        value: dailyAchievementMix.exceedDays,
        displayValue: `${dailyAchievementMix.exceedDays} ${t('วัน', 'd', '天')}`,
        color: '#16a34a',
      },
      {
        id: 'near',
        label: t('ใกล้เป้า 90%–99.9%', 'Near Target 90%–99.9%', '接近目标 90%–99.9%'),
        value: dailyAchievementMix.nearDays,
        displayValue: `${dailyAchievementMix.nearDays} ${t('วัน', 'd', '天')}`,
        color: '#f59e0b',
      },
      {
        id: 'below',
        label: t('ต่ำกว่าแผน < 90%', 'Below Plan < 90%', '低于计划 < 90%'),
        value: dailyAchievementMix.belowDays,
        displayValue: `${dailyAchievementMix.belowDays} ${t('วัน', 'd', '天')}`,
        color: '#dc2626',
      },
      {
        id: 'unplanned',
        label: t('ผลิตนอกแผน / วันเสาร์-อาทิตย์', 'Unplanned / Extra Run', '额外加班/无计划产出'),
        value: dailyAchievementMix.unplannedDays,
        displayValue: `${dailyAchievementMix.unplannedDays} ${t('วัน', 'd', '天')}`,
        color: '#64748b',
      },
    ],
    [dailyAchievementMix, t]
  );

  const workforceSlices: PieSlice[] = useMemo(
    () => [
      {
        id: 'mp-a',
        label: `Line A (UPPH ${kpiStats.lineAUpph.toFixed(2)})`,
        subLabel: t('สัดส่วนกำลังคนเข้าปฏิบัติงานเฉลี่ย', 'Average daily attendance manpower', '日均出勤人力占比'),
        value: kpiStats.avgLineAAtt,
        displayValue: `${kpiStats.avgLineAAtt} ${t('คน', 'ppl', '人')}`,
        color: '#059669',
      },
      {
        id: 'mp-b',
        label: `Line B (UPPH ${kpiStats.lineBUpph.toFixed(2)})`,
        subLabel: t('สัดส่วนกำลังคนเข้าปฏิบัติงานเฉลี่ย', 'Average daily attendance manpower', '日均出勤人力占比'),
        value: kpiStats.avgLineBAtt,
        displayValue: `${kpiStats.avgLineBAtt} ${t('คน', 'ppl', '人')}`,
        color: '#34d399',
      },
    ],
    [kpiStats, t]
  );

  const runtimeLossSlices: PieSlice[] = useMemo(() => {
    if (kpiStats.idleOver1Rate <= 0) {
      return [
        {
          id: 'run',
          label: t('เวลาเดินเครื่องปกติ', 'Active Runtime', '有效运行时间'),
          value: 100,
          displayValue: '100%',
          color: '#10b981',
        },
      ];
    }
    const otherOver1 = Math.max(
      0,
      Number((kpiStats.idleOver1Rate - kpiStats.idle1To5Rate - kpiStats.idleOver5Rate).toFixed(1))
    );
    return [
      {
        id: 'run',
        label: t('เวลาเดินเครื่องผลิตสุทธิ', 'Net Productive Runtime', '有效净生产时间'),
        subLabel: t('หักลบการหยุดไลน์ทั้งหมดที่เกิน 1 นาที', 'Excludes all tracked stoppages > 1 min', '扣除所有大于1分钟的停线后'),
        value: kpiStats.productiveRunRate,
        displayValue: `${kpiStats.productiveRunRate.toFixed(1)}%`,
        color: '#10b981',
      },
      {
        id: 'minor-stop',
        label: t('หยุดสั้น (1–5 นาที)', 'Minor Stops (1–5 min)', '短停机 (1–5分钟)'),
        value: kpiStats.idle1To5Rate,
        displayValue: `${kpiStats.idle1To5Rate.toFixed(1)}%`,
        color: '#f59e0b',
      },
      {
        id: 'major-stop',
        label: t('หยุดยาว (> 5 นาที)', 'Major Downtime (> 5 min)', '长停机 (> 5分钟)'),
        value: Number((kpiStats.idleOver5Rate + otherOver1).toFixed(1)),
        displayValue: `${(kpiStats.idleOver5Rate + otherOver1).toFixed(1)}%`,
        color: '#e11d48',
      },
    ];
  }, [kpiStats, t]);

  const actionStatusSlices: PieSlice[] = useMemo(() => {
    const resolved = actionItems.filter(a => a.status === 'Resolved').length;
    const inProgress = actionItems.filter(a => a.status === 'In Progress').length;
    const open = actionItems.filter(a => a.status === 'Open').length;
    return [
      {
        id: 'resolved',
        label: t('แก้ไขเสร็จสิ้น (Resolved)', 'Resolved', '已完成整改'),
        value: resolved,
        displayValue: `${resolved}`,
        color: '#16a34a',
      },
      {
        id: 'in-progress',
        label: t('กำลังดำเนินการ (In Progress)', 'In Progress', '整改进行中'),
        value: inProgress,
        displayValue: `${inProgress}`,
        color: '#f59e0b',
      },
      {
        id: 'open',
        label: t('รอดำเนินการ (Open)', 'Open', '待处理'),
        value: open,
        displayValue: `${open}`,
        color: '#dc2626',
      },
    ];
  }, [actionItems, t]);

  const topBottomMonths = useMemo(() => {
    const withOutput = unifiedMonths.filter(m => m.act > 0);
    const highestOutput = [...withOutput].sort((a, b) => b.act - a.act).slice(0, 3);
    const negativeGaps = [...withOutput].filter(m => m.gap < 0).sort((a, b) => a.gap - b.gap).slice(0, 3);
    return { highestOutput, negativeGaps };
  }, [unifiedMonths]);

  const totalCombinedAct = kpiStats.lineAAct + kpiStats.lineBAct;
  const lineASharePct = totalCombinedAct > 0 ? (kpiStats.lineAAct / totalCombinedAct) * 100 : 0;
  const lineBSharePct = totalCombinedAct > 0 ? (kpiStats.lineBAct / totalCombinedAct) * 100 : 0;

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const summaryRows = unifiedMonths.map(m => ({
      Month: m.month,
      Plan: m.plan,
      Actual: m.act,
      Gap: m.gap,
      'Achieve %': Number(m.achievePct.toFixed(1)),
      'Output Share %':
        totalCombinedAct > 0 ? Number(((m.act / totalCombinedAct) * 100).toFixed(1)) : 0,
      'Line A Act': m.lineAAct,
      'Line A Share %': m.act > 0 ? Number(((m.lineAAct / m.act) * 100).toFixed(1)) : 0,
      'Line B Act': m.lineBAct,
      'Line B Share %': m.act > 0 ? Number(((m.lineBAct / m.act) * 100).toFixed(1)) : 0,
      'Line A UPH': m.lineAUph,
      'Line B UPH': m.lineBUph,
      'Combined UPH': m.avgUph,
      'Combined UPPH': m.avgUpph,
      'Line Stop >1min %': m.idleOver1MinRate,
    }));
    const ws = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Dashboard Performance');
    XLSX.writeFile(wb, `Dashboard_Performance_${year}_${scope}.xlsx`);
  };

  const scopeLabel =
    scope === 'YTD'
      ? t(`สะสมทั้งปี ${year} (ม.ค.–พ.ย.)`, `Full Year YTD ${year} (Jan–Nov)`, `${year}年 全年累计 (1–11月)`)
      : formatPeriodLabel(year, scope, language);

  return (
    <div className="space-y-5 pb-8 print:space-y-3 print:pb-0">
      {/* Header & Multi-Dimensional Controls Bar */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-[#0070c0]">{plantName}</span>
              <span aria-hidden="true">·</span>
              <span>{scopeLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {unifiedMonths.length} {t('เดือนข้อมูล', 'Months', '个月度')}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {dailyAchievementMix.totalActiveDays} {t('วันทำงานในขอบเขต', 'Working Days Analyzed', '统计工作日')}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
              {t(
                'Summary Dashboard Performance — วิเคราะห์สัดส่วนครบมิติ (Pie & Donut Analytics)',
                'Summary Dashboard Performance — Multi-Dimensional Pie & Mix Analytics',
                '绩效综合总览看板 — 多维度饼图分析 (Performance Analytics)'
              )}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {/* Period Scope Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#0070c0] shrink-0" />
              <select
                value={scope}
                onChange={e => setScope(e.target.value)}
                aria-label={t('เลือกช่วงเวลา', 'Select Period Scope', '选择时间范围')}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="YTD">
                  {t(`ทั้งปี YTD (${unifiedMonths.length} เดือน)`, `YTD Cumulative (${unifiedMonths.length} Mos)`, `全年累计 YTD (${unifiedMonths.length}个月)`)}
                </option>
                {unifiedMonths.map(m => (
                  <option key={m.month} value={m.month}>
                    {formatPeriodLabel(year, m.month, language)}
                  </option>
                ))}
              </select>
            </div>

            {/* Line Dimensional Filter */}
            <div className="inline-flex bg-slate-100 border border-slate-200 rounded-md p-0.5 text-xs font-semibold">
              {(
                [
                  { id: 'all' as const, label: t('ทุกไลน์', 'All Lines', '全部产线') },
                  { id: 'line-a' as const, label: 'Line A' },
                  { id: 'line-b' as const, label: 'Line B' },
                ] as const
              ).map(opt => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setSelectedLineFilter(opt.id)}
                  className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedLineFilter === opt.id
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Pie / Donut Style Switcher */}
            <div className="inline-flex bg-slate-100 border border-slate-200 rounded-md p-0.5 text-xs font-semibold">
              {(
                [
                  { id: 'donut' as const, label: t('Donut Ring', 'Donut', '环形图') },
                  { id: 'pie' as const, label: t('Full Pie', 'Full Pie', '实心饼图') },
                ] as const
              ).map(mode => (
                <button
                  type="button"
                  key={mode.id}
                  onClick={() => setChartStyle(mode.id)}
                  className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    chartStyle === mode.id
                      ? 'bg-[#0070c0] text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-md text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('Export Excel', 'Export Excel', '导出 Excel')}</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('พิมพ์รายงาน', 'Print', '打印')}</span>
            </button>

            {onSaveOnWeb && (
              <button
                type="button"
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

      {/* 4-Dimension Executive Headline Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Metric 1: Volume & Plan */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#0070c0]" />
              {t('มิติที่ 1 · ปริมาณผลิตจริง', 'Dim 1 · Total Output', '维度一 · 实际总产量')}
            </span>
            <span
              className={`font-bold tabular-nums inline-flex items-center gap-1 ${
                kpiStats.achievePct >= 95
                  ? 'text-emerald-700'
                  : kpiStats.achievePct >= 88
                  ? 'text-amber-700'
                  : 'text-rose-700'
              }`}
            >
              {kpiStats.achievePct >= 95 ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
              {kpiStats.achievePct.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
              {kpiStats.act.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 tabular-nums">
              / {kpiStats.plan.toLocaleString()}
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">{t('ส่วนต่างแผน (Gap)', 'Net Gap', '计划差异')}</span>
            <span
              className={`font-bold tabular-nums inline-flex items-center gap-1 ${
                kpiStats.gap >= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {kpiStats.gap >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              {kpiStats.gap > 0 ? `+${kpiStats.gap.toLocaleString()}` : kpiStats.gap.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Metric 2: Speed (Weighted UPH) */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-indigo-600" />
              {t('มิติที่ 2 · อัตราผลิต (UPH)', 'Dim 2 · Speed (UPH)', '维度二 · 产能效率 (UPH)')}
            </span>
            <span
              className={`font-bold tabular-nums ${
                kpiStats.weightedUph >= kpiStats.targetUph ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {kpiStats.weightedUph >= kpiStats.targetUph
                ? t('ผ่านเป้า', 'On Target', '达标')
                : t('ต่ำกว่าเป้า', 'Below Target', '低于目标')}{' '}
              ({kpiStats.targetUph})
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#0070c0] tabular-nums">
              {kpiStats.weightedUph}
            </span>
            <span className="text-xs text-slate-500">{t('ตัว/ชม. (ถ่วงน้ำหนัก)', 'Units/Hr (Weighted)', '台/小时 (加权)')}</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs tabular-nums">
            <span className="text-slate-600">Line A: <strong>{kpiStats.lineAUph}</strong></span>
            <span className="text-slate-600">Line B: <strong>{kpiStats.lineBUph}</strong></span>
            <span className="text-slate-500">{kpiStats.workHours.toLocaleString()}h</span>
          </div>
        </div>

        {/* Metric 3: Workforce (UPPH) */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              {t('มิติที่ 3 · ประสิทธิภาพคน (UPPH)', 'Dim 3 · Workforce (UPPH)', '维度三 · 人均效率 (UPPH)')}
            </span>
            <span className="font-mono tabular-nums text-slate-600">
              {t('เป้า', 'Tgt', '目标')} {kpiStats.targetUpph.toFixed(1)}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 tabular-nums">
              {kpiStats.avgUpph.toFixed(2)}
            </span>
            <span className="text-xs text-slate-500">{t('Output ÷ Manpower', 'Output ÷ Manpower', '产量 ÷ 人力')}</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs tabular-nums">
            <span className="text-slate-600">Line A: <strong>{kpiStats.avgLineAAtt}</strong> {t('คน', 'ppl', '人')}</span>
            <span className="text-slate-600">Line B: <strong>{kpiStats.avgLineBAtt}</strong> {t('คน', 'ppl', '人')}</span>
          </div>
        </div>

        {/* Metric 4: Line Idle & Runtime */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-rose-600" />
              {t('มิติที่ 4 · เวลาเดินเครื่อง / หยุดไลน์', 'Dim 4 · Runtime & Idle', '维度四 · 运转与停机率')}
            </span>
            <span
              className={`font-bold tabular-nums ${
                kpiStats.idleOver1Rate <= kpiStats.targetIdleRate
                  ? 'text-emerald-700'
                  : 'text-rose-600'
              }`}
            >
              {kpiStats.idleOver1Rate <= kpiStats.targetIdleRate
                ? t('ปกติ', 'Nominal', '正常')
                : t('ต้องปรับปรุง', 'High Stop', '停机偏高')}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
              {kpiStats.productiveRunRate.toFixed(1)}%
            </span>
            <span className="text-xs text-rose-600 font-semibold tabular-nums">
              ({kpiStats.idleOver1Rate.toFixed(1)}% Idle)
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs tabular-nums">
            <span className="text-amber-700">1–5m: <strong>{kpiStats.idle1To5Rate.toFixed(1)}%</strong></span>
            <span className="text-rose-600">&gt;5m: <strong>{kpiStats.idleOver5Rate.toFixed(1)}%</strong></span>
            <span className="text-slate-500">{kpiStats.idleTotalHrs}h</span>
          </div>
        </div>
      </section>

      {/* Primary Pie Analytics Trio #1: Production, Work Hours, Plan Fulfillment */}
      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <h3 className="text-sm font-bold text-slate-800">
            {t(
              'กลุ่มที่ 1: วิเคราะห์สัดส่วนผลผลิต ชั่วโมงเดินเครื่อง และวินัยตามแผน (Output, Capacity & Plan Mix)',
              'Group 1: Production Output, Run-Hour Capacity & Plan Discipline Mix',
              '第一组：产量结构、工时分配与计划达成分布'
            )}
          </h3>
          <span className="text-xs text-slate-500">
            {t('ชี้เมาส์หรือคลิกที่ชิ้นกราฟเพื่อดูสัดส่วนละเอียด', 'Hover or click any slice to inspect exact share', '悬停或点击饼图切片查看详细占比')}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
          <InteractivePieCard
            dimensionTag={t('มิติสายการผลิต · Production Share', 'Line Dimension · Production Share', '产线维度 · 产量占比')}
            title={t('สัดส่วนยอดผลิตแยก Line A vs Line B', 'Production Share: Line A vs Line B', 'Line A 与 Line B 产量占比')}
            subtitle={t('เทียบสัดส่วนการส่งมอบผลิตรวมทั้ง 2 สายการผลิต', 'Contribution split between Line A & Line B', '对比两条产线的实际产出贡献比例')}
            slices={lineProductionSlices}
            chartStyle={chartStyle}
            centerLabel={t('ผลิตรวม', 'Combined', '双线合计')}
            centerValue={totalCombinedAct.toLocaleString()}
            unitLabel={t('หน่วย: เครื่อง', 'Unit: Units', '单位: 台')}
            emptyText={t('ยังไม่มีข้อมูลยอดผลิตในช่วงเวลานี้', 'No production records for selected scope', '所选范围内暂无产量数据')}
            footerSummary={`${t('สัดส่วนต่าง', 'Split Ratio', '双线比例')}: A ${lineASharePct.toFixed(1)}% / B ${lineBSharePct.toFixed(1)}%`}
            isDark={currentTheme.isDark}
          />

          <InteractivePieCard
            dimensionTag={t('มิติกำลังการผลิต · Run Hours Mix', 'Capacity Dimension · Run Hours', '产能维度 · 工时占比')}
            title={t('สัดส่วนชั่วโมงทำงาน Line A vs Line B', 'Work Hours Allocation: Line A vs B', '产线工时分配占比 (Work Hours)')}
            subtitle={t('ชั่วโมงเดินเครื่องผลิตจริงเทียบกับประสิทธิภาพ UPH', 'Actual operating hours paired with line UPH', '对比双线实际投入工时与对应 UPH')}
            slices={workHoursSlices}
            chartStyle={chartStyle}
            centerLabel={t('ชม.รวม', 'Total Hrs', '总工时')}
            centerValue={`${(kpiStats.lineAHrs + kpiStats.lineBHrs).toLocaleString()}h`}
            unitLabel={t('หน่วย: ชั่วโมง', 'Unit: Hours', '单位: 小时')}
            emptyText={t('ยังไม่มีข้อมูลชั่วโมงทำงาน', 'No work hour records available', '暂无工时数据')}
            footerSummary={`${t('UPH ถ่วงน้ำหนักรวม', 'Combined Weighted UPH', '综合加权 UPH')}: ${kpiStats.weightedUph} ${t('ตัว/ชม.', 'Units/Hr', '台/时')}`}
            isDark={currentTheme.isDark}
          />

          <InteractivePieCard
            dimensionTag={t('มิติคุณภาพแผน · Plan Discipline', 'Plan Discipline · Daily Attainment', '计划达成维度 · 日达成分布')}
            title={t('สัดส่วนวันบรรลุเป้าหมายตามแผน (รายวัน)', 'Daily Plan Achievement Breakdown', '每日计划达成情况占比分布')}
            subtitle={t('จำแนกวันทำงานตามระดับ % การผลิตเทียบ Plan', 'Working days grouped by plan attainment tier', '按日实际与计划达成率区间统计工作日')}
            slices={achievementSlices}
            chartStyle={chartStyle}
            centerLabel={t('วันทำงาน', 'Active Days', '统计天数')}
            centerValue={`${dailyAchievementMix.totalActiveDays}`}
            unitLabel={t('หน่วย: วัน', 'Unit: Days', '单位: 天')}
            emptyText={t('ยังไม่มีข้อมูลรายวันในช่วงนี้', 'No daily matrix rows found', '暂无日数据记录')}
            footerSummary={`${t('บรรลุ 100%+', '100%+ Days', '达标天数')}: ${dailyAchievementMix.exceedDays} / ${dailyAchievementMix.totalActiveDays}`}
            isDark={currentTheme.isDark}
          />
        </div>
      </section>

      {/* Primary Pie Analytics Trio #2: Workforce/UPPH, Runtime vs Idle, Quarterly/Weekly Output */}
      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <h3 className="text-sm font-bold text-slate-800">
            {t(
              'กลุ่มที่ 2: วิเคราะห์กำลังคน เวลาเดินเครื่อง vs หยุดไลน์ และโครงสร้างช่วงเวลา (Workforce, Idle & Time Mix)',
              'Group 2: Workforce Allocation, Runtime vs Line Idle Losses & Time Distribution',
              '第二组：人力分布、有效运转与停机损失及时间结构'
            )}
          </h3>
          <button
            type="button"
            onClick={() => onNavigateToSheet('upph-oec')}
            className="text-xs font-semibold text-[#0070c0] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>{t('เปิด Sheet UPPH / Line Stop เพื่อแก้ไขข้อมูล', 'Open UPPH / Line Stop Sheets', '前往 UPPH / 停机表编辑')}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
          <InteractivePieCard
            dimensionTag={t('มิติกำลังคน · Workforce & UPPH', 'Workforce Dimension · Manpower Mix', '人力维度 · 出勤与人效')}
            title={t('สัดส่วนกำลังคนเฉลี่ย & UPPH รายไลน์', 'Manpower Share & Line UPPH', '产线人力占比与人均效率 UPPH')}
            subtitle={t('โครงสร้างพนักงานเข้าปฏิบัติงานเฉลี่ยต่อวัน (Attendance)', 'Daily attendance distribution linked to UPPH sheet', '基于人效表的双线日均出勤人数对比')}
            slices={workforceSlices}
            chartStyle={chartStyle}
            centerLabel={t('คนเฉลี่ย', 'Avg Staff', '总出勤')}
            centerValue={`${kpiStats.totalAvgAtt}`}
            unitLabel={t('หน่วย: คน/วัน', 'Unit: Headcount', '单位: 人/天')}
            emptyText={t('ยังไม่มีข้อมูลกำลังคน', 'No manpower records found', '暂无出勤数据')}
            footerSummary={`${t('UPPH เฉลี่ยโรงงาน', 'Plant UPPH', '工厂 UPPH')}: ${kpiStats.avgUpph.toFixed(2)} (${t('เป้า', 'Tgt', '目标')} ${kpiStats.targetUpph.toFixed(1)})`}
            isDark={currentTheme.isDark}
          />

          <InteractivePieCard
            dimensionTag={t('มิติความสูญเสีย · Runtime vs Idle Loss', 'Loss Dimension · Runtime vs Stoppage', '停机损耗维度 · 运转与损失')}
            title={t('สัดส่วนเวลาเดินเครื่อง vs เวลาหยุดไลน์', 'Net Productive Time vs Line Idle Loss', '有效运行时间 vs 停线损失占比')}
            subtitle={t('สัดส่วนเวลาผลิตจริงเทียบกับการหยุด 1–5 นาที และ >5 นาที', 'Active run percentage vs minor & major stoppages', '对比净产出运行时间与短停/长停机损失占比')}
            slices={runtimeLossSlices}
            chartStyle={chartStyle}
            centerLabel={t('เดินเครื่อง', 'Run Rate', '有效率')}
            centerValue={`${kpiStats.productiveRunRate.toFixed(1)}%`}
            unitLabel={t('หน่วย: % เวลา', 'Unit: % Share', '单位: 时间占比 %')}
            emptyText={t('ยังไม่มีข้อมูลสถิติ Line Stop', 'No line idle data tracked for this scope', '所选范围暂无停机率记录')}
            footerSummary={`${t('หยุดไลน์รวม >1 นาที', 'Total Idle >1m', '总停机率 >1m')}: ${kpiStats.idleOver1Rate.toFixed(1)}% (${kpiStats.idleTotalHrs}h)`}
            isDark={currentTheme.isDark}
          />

          <InteractivePieCard
            dimensionTag={timeBreakdownSlices.tag}
            title={timeBreakdownSlices.title}
            subtitle={timeBreakdownSlices.subtitle}
            slices={timeBreakdownSlices.slices}
            chartStyle={chartStyle}
            centerLabel={timeBreakdownSlices.centerLabel}
            centerValue={kpiStats.act.toLocaleString()}
            unitLabel={t('หน่วย: เครื่อง', 'Unit: Units', '单位: 台')}
            emptyText={t('ยังไม่มีข้อมูลแยกช่วงเวลา', 'No period breakdown available', '暂无分时段产量数据')}
            footerSummary={`${t('ยอดรวมช่วงที่เลือก', 'Selected Scope Total', '当前范围累计')}: ${kpiStats.act.toLocaleString()} ${t('เครื่อง', 'Units', '台')}`}
            isDark={currentTheme.isDark}
          />
        </div>
      </section>

      {/* Deep-Dive Row: Multi-Dimensional Line Comparison + Action Status & Highlights */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left 7 cols: Multi-Dimensional Balance Scoreboard (Line A vs Line B) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-[#0070c0]">
                {t('เปรียบเทียบสมดุลทุกมิติ · Line A vs Line B', 'Multi-Dimensional Balance · Line A vs Line B', '双线多维均衡对比 · Line A vs Line B')}
              </span>
              <span>{scopeLabel}</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              {t('สมดุลกำลังผลิต ชั่วโมงงาน และประสิทธิภาพระหว่าง Line A กับ Line B', 'Cross-Dimensional Line A vs Line B Capability Profile', 'Line A 与 Line B 产能、工时与效率多维对比')}
            </h3>

            <div className="mt-5 space-y-4">
              {[
                {
                  label: t('ยอดผลิตจริง (Actual Output)', 'Actual Output Volume', '实际产出总量'),
                  valA: kpiStats.lineAAct,
                  valB: kpiStats.lineBAct,
                  fmtA: kpiStats.lineAAct.toLocaleString(),
                  fmtB: kpiStats.lineBAct.toLocaleString(),
                },
                {
                  label: t('ชั่วโมงทำงาน (Work Hours)', 'Operating Work Hours', '实际运行工时'),
                  valA: kpiStats.lineAHrs,
                  valB: kpiStats.lineBHrs,
                  fmtA: `${kpiStats.lineAHrs.toLocaleString()}h`,
                  fmtB: `${kpiStats.lineBHrs.toLocaleString()}h`,
                },
                {
                  label: t('อัตราผลิตเฉลี่ย (Weighted UPH)', 'Weighted Speed (UPH)', '加权小时产能 (UPH)'),
                  valA: kpiStats.lineAUph,
                  valB: kpiStats.lineBUph,
                  fmtA: `${kpiStats.lineAUph} UPH`,
                  fmtB: `${kpiStats.lineBUph} UPH`,
                },
                {
                  label: t('กำลังคนเฉลี่ย (Avg Attendance)', 'Daily Avg Manpower', '日均出勤人力'),
                  valA: kpiStats.avgLineAAtt,
                  valB: kpiStats.avgLineBAtt,
                  fmtA: `${kpiStats.avgLineAAtt} ${t('คน', 'ppl', '人')}`,
                  fmtB: `${kpiStats.avgLineBAtt} ${t('คน', 'ppl', '人')}`,
                },
                {
                  label: t('ประสิทธิภาพแรงงาน (UPPH)', 'Labor Productivity (UPPH)', '人均产值 (UPPH)'),
                  valA: kpiStats.lineAUpph,
                  valB: kpiStats.lineBUpph,
                  fmtA: kpiStats.lineAUpph.toFixed(2),
                  fmtB: kpiStats.lineBUpph.toFixed(2),
                },
              ].map(dim => {
                const sum = dim.valA + dim.valB;
                const pctA = sum > 0 ? (dim.valA / sum) * 100 : 50;
                const pctB = sum > 0 ? 100 - pctA : 50;
                return (
                  <div key={dim.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{dim.label}</span>
                      <div className="flex items-center gap-3 tabular-nums font-mono text-[11px]">
                        <span className="text-[#0070c0] font-bold">
                          A: {dim.fmtA} ({pctA.toFixed(1)}%)
                        </span>
                        <span className="text-slate-300">/</span>
                        <span className="text-sky-600 font-bold">
                          B: {dim.fmtB} ({pctB.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-[#0070c0] transition-all duration-200"
                        style={{ width: `${pctA}%` }}
                      />
                      <div
                        className="h-full bg-sky-400 transition-all duration-200"
                        style={{ width: `${pctB}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Executive Month Highlights */}
          <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="font-bold text-slate-700 mb-2">
                {t('Top 3 เดือนยอดผลิตสูงสุด', 'Top 3 Output Months', '产量最高前 3 月份')}
              </div>
              <div className="space-y-1.5">
                {topBottomMonths.highestOutput.map((m, idx) => (
                  <button
                    type="button"
                    key={m.month}
                    onClick={() => setScope(m.month)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-50 hover:bg-slate-100 text-left transition-colors cursor-pointer"
                  >
                    <span className="font-semibold text-slate-800">
                      {idx + 1}. {formatMonthShort(m.month, language, true)}
                    </span>
                    <span className="font-mono font-bold text-emerald-700 tabular-nums">
                      {m.act.toLocaleString()} ({m.achievePct.toFixed(0)}%)
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="font-bold text-slate-700 mb-2">
                {t('Top 3 เดือน Gap ติดลบสูงสุด', 'Top 3 Deficit Months', '欠产缺口前 3 月份')}
              </div>
              <div className="space-y-1.5">
                {topBottomMonths.negativeGaps.map((m, idx) => (
                  <button
                    type="button"
                    key={m.month}
                    onClick={() => setScope(m.month)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-50 hover:bg-slate-100 text-left transition-colors cursor-pointer"
                  >
                    <span className="font-semibold text-slate-800">
                      {idx + 1}. {formatMonthShort(m.month, language, true)}
                    </span>
                    <span className="font-mono font-bold text-rose-600 tabular-nums">
                      {m.gap.toLocaleString()} ({m.achievePct.toFixed(0)}%)
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 cols: Action Plan Pie Chart + Quick Drill-Down Links */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <InteractivePieCard
            dimensionTag={t('มิติการแก้ไขปัญหา · Action Closure', 'Action Dimension · Follow-up Mix', '改善闭环维度 · 对策进度')}
            title={t('สถานะแผนแก้ไขปัญหาหน้างาน (Action Items)', 'Action Item Resolution Mix', '现场问题整改闭环分布')}
            subtitle={t('ติดตามสัดส่วนปัญหาที่ปิดงานแล้วเทียบกับที่รอดำเนินการ', 'Tracking open vs resolved operational countermeasures', '跟踪已关闭与待处理的生产改善对策比例')}
            slices={actionStatusSlices}
            chartStyle={chartStyle}
            centerLabel={t('รายการทั้งหมด', 'Total Items', '总项数')}
            centerValue={`${actionItems.length}`}
            unitLabel={t('หน่วย: รายการ', 'Unit: Items', '单位: 项')}
            emptyText={t('ยังไม่มีรายการปัญหาในระบบ', 'No action items logged', '暂无改善项记录')}
            footerSummary={`${t('ปิดงานแล้ว', 'Resolved', '已完成')}: ${actionItems.filter(a => a.status === 'Resolved').length} / ${actionItems.length}`}
            isDark={currentTheme.isDark}
          />
        </div>
      </section>

      {/* Complete Monthly Share & Performance Contribution Ledger */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {t(
                'ตารางสรุปสัดส่วนและตัวชี้วัดรายเดือนครบมิติ (คลิกแถวเพื่อเจาะดูรายเดือน หรือเปิด Daily OEC)',
                'Monthly Multi-Dimensional Contribution & Performance Matrix (Click any row to filter)',
                '各月份多维占比与绩效指标汇总表 (点击任意行即可聚焦分析)'
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t(
                'เชื่อมโยงข้อมูลอัตโนมัติจากตาราง Daily OEC, UPPH OEC และ FA Line Idle Time',
                'Synchronized live from Daily OEC, UPPH OEC, and FA Line Idle sheets',
                '实时联动 Daily OEC、UPPH OEC 与总装停机表数据'
              )}
            </p>
          </div>
          {scope !== 'YTD' && (
            <button
              type="button"
              onClick={() => setScope('YTD')}
              className="px-3 py-1.5 text-xs font-bold text-[#0070c0] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md cursor-pointer"
            >
              {t('กลับสู่มุมมองทั้งปี (YTD)', 'Reset to YTD View', '返回全年 YTD 视图')}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-4 text-left whitespace-nowrap">{t('เดือน', 'Month', '月份')}</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">{t('แผนรวม', 'Plan', '计划')}</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">{t('ผลิตจริง', 'Actual', '实际')}</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">{t('สัดส่วนปี %', 'YTD Share %', '全年占比 %')}</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">{t('% บรรลุ', 'Achieve %', '达成率 %')}</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Line A %</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Line B %</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">UPH (A / B / Avg)</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">UPPH</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Idle &gt;1m %</th>
                <th className="py-2.5 px-4 text-center whitespace-nowrap print:hidden">{t('จัดการ', 'Action', '操作')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums font-mono">
              {unifiedMonths.map(row => {
                const ytdTotalAll = unifiedMonths.reduce((s, r) => s + r.act, 0);
                const shareYtd = ytdTotalAll > 0 ? (row.act / ytdTotalAll) * 100 : 0;
                const rowSum = row.lineAAct + row.lineBAct;
                const shareA = rowSum > 0 ? (row.lineAAct / rowSum) * 100 : 0;
                const shareB = rowSum > 0 ? (row.lineBAct / rowSum) * 100 : 0;
                const isSelected = scope === row.month;

                return (
                  <tr
                    key={row.month}
                    onClick={() => setScope(prev => (prev === row.month ? 'YTD' : row.month))}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-4 text-left font-sans font-bold text-slate-900 whitespace-nowrap">
                      {formatMonthShort(row.month, language, true)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{row.plan.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">{row.act.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right text-[#0070c0] font-bold">{shareYtd.toFixed(1)}%</td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        row.achievePct >= 100
                          ? 'text-emerald-700'
                          : row.achievePct >= 90
                          ? 'text-amber-700'
                          : 'text-rose-600'
                      }`}
                    >
                      {row.achievePct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700">{shareA.toFixed(1)}%</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">{shareB.toFixed(1)}%</td>
                    <td className="py-2.5 px-3 text-right text-slate-700 whitespace-nowrap">
                      {row.lineAUph} / {row.lineBUph} / <strong className="text-[#0070c0]">{row.avgUph}</strong>
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-bold">
                      {row.avgUpph.toFixed(2)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-semibold ${
                        row.idleOver1MinRate <= row.targetIdleRate ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {row.idleOver1MinRate > 0 ? `${row.idleOver1MinRate.toFixed(1)}%` : '—'}
                    </td>
                    <td
                      className="py-2.5 px-4 text-center font-sans print:hidden"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectPeriod(row.month);
                          onNavigateToSheet('daily-oec');
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[#0070c0] hover:bg-blue-50 rounded transition-colors cursor-pointer"
                      >
                        <span>Daily OEC</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

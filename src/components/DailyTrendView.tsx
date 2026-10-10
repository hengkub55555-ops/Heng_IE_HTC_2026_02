/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { DayColumn, LineOECData } from '../types/oec';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Calendar,
  Save,
  SlidersHorizontal,
  Edit3,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Layers,
  Plus,
  Check,
  X
} from 'lucide-react';
import { getWeekdayName } from '../utils/dateHelper';
import { useAppPreferences } from '../contexts/AppPreferencesContext';

interface DailyTrendViewProps {
  days: DayColumn[];
  lines: LineOECData[];
  periodLabel: string;
  plantName: string;
  onUpdateCellValue: (
    lineId: string,
    category: 'planning' | 'act' | 'workTime',
    day: number,
    value: number | null
  ) => void;
  onAddDay?: (day: number, weekday: string) => void;
  onOpenDatePeriod?: () => void;
  onSaveOnWeb?: () => void;
  hasUnsavedChanges?: boolean;
  isSyncing?: boolean;
}

export const DailyTrendView: React.FC<DailyTrendViewProps> = ({
  days,
  lines,
  periodLabel,
  plantName,
  onUpdateCellValue,
  onAddDay,
  onOpenDatePeriod,
  onSaveOnWeb,
  hasUnsavedChanges = false,
  isSyncing = false,
}) => {
  const { t } = useAppPreferences();
  // Interactive Filter Controls
  const [dayFilterMode, setDayFilterMode] = useState<'active' | 'all'>('active');
  const [selectedLineFilter, setSelectedLineFilter] = useState<string>('all');
  const [showMovingAvg, setShowMovingAvg] = useState<boolean>(true);
  const [showDataLabels, setShowDataLabels] = useState<boolean>(true);
  const [targetUphBenchmark, setTargetUphBenchmark] = useState<number>(115);

  // Quick Add Day Record Form
  const [showQuickAddDay, setShowQuickAddDay] = useState<boolean>(false);
  const [newDateInput, setNewDateInput] = useState<string>('');
  const [newDayNum, setNewDayNum] = useState<string>('');
  const [newWeekday, setNewWeekday] = useState<string>('MON');

  // Hover states for charts
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);

  // Inline table editing state on the Trend page
  const [editingCell, setEditingCell] = useState<{
    lineId: string;
    category: 'planning' | 'act' | 'workTime';
    day: number;
    val: string;
  } | null>(null);

  const lineA = useMemo(
    () => lines.find(l => l.prodLine.toLowerCase().includes('a')) || lines[0] || null,
    [lines]
  );
  const lineB = useMemo(
    () => lines.find(l => l.prodLine.toLowerCase().includes('b')) || (lines.length > 1 ? lines[1] : null),
    [lines]
  );

  // Compute rich daily dataset with cumulative & moving averages
  const rawDailyPoints = useMemo(() => {
    let cumPlan = 0;
    let cumAct = 0;
    let cumWorkHours = 0;

    return days.map(d => {
      const aPlan = Number(lineA?.planning[d.day] ?? 0);
      const aAct = Number(lineA?.act[d.day] ?? 0);
      const aWt = Number(lineA?.workTime[d.day] ?? 0);
      const aUph = aWt > 0 ? Math.round(aAct / aWt) : 0;
      const aGap = aAct - aPlan;

      const bPlan = Number(lineB?.planning[d.day] ?? 0);
      const bAct = Number(lineB?.act[d.day] ?? 0);
      const bWt = Number(lineB?.workTime[d.day] ?? 0);
      const bUph = bWt > 0 ? Math.round(bAct / bWt) : 0;
      const bGap = bAct - bPlan;

      // Filtered values depending on selectedLineFilter
      let focusPlan = aPlan + bPlan;
      let focusAct = aAct + bAct;
      let focusWt = aWt + bWt;

      if (selectedLineFilter === 'lineA') {
        focusPlan = aPlan;
        focusAct = aAct;
        focusWt = aWt;
      } else if (selectedLineFilter === 'lineB') {
        focusPlan = bPlan;
        focusAct = bAct;
        focusWt = bWt;
      }

      const focusGap = focusAct - focusPlan;
      const focusUph = focusWt > 0 ? Math.round(focusAct / focusWt) : 0;
      const dailyAchieveRate = focusPlan > 0 ? (focusAct / focusPlan) * 100 : 0;

      cumPlan += focusPlan;
      cumAct += focusAct;
      cumWorkHours += focusWt;

      const cumAchieveRate = cumPlan > 0 ? (cumAct / cumPlan) * 100 : 0;
      const cumUph = cumWorkHours > 0 ? Math.round(cumAct / cumWorkHours) : 0;
      const hasActivity = aPlan > 0 || aAct > 0 || bPlan > 0 || bAct > 0 || aWt > 0 || bWt > 0;

      return {
        day: d.day,
        weekday: d.weekday,
        label: `${d.day} ${d.weekday}`,
        hasActivity,
        // Line A
        aPlan,
        aAct,
        aWt,
        aUph,
        aGap,
        // Line B
        bPlan,
        bAct,
        bWt,
        bUph,
        bGap,
        // Focus totals
        focusPlan,
        focusAct,
        focusWt,
        focusGap,
        focusUph,
        dailyAchieveRate,
        // Cumulative MTD
        cumPlan,
        cumAct,
        cumGap: cumAct - cumPlan,
        cumAchieveRate,
        cumUph,
      };
    });
  }, [days, lineA, lineB, selectedLineFilter]);

  // Apply day filter mode and compute 3-point moving average + day-over-day delta
  const chartPoints = useMemo(() => {
    const filtered =
      dayFilterMode === 'active'
        ? rawDailyPoints.filter(p => p.hasActivity)
        : rawDailyPoints;

    const source = filtered.length > 0 ? filtered : rawDailyPoints;

    return source.map((pt, idx, arr) => {
      // 3-period moving average of focusAct and focusUph
      const windowSlice = arr.slice(Math.max(0, idx - 2), idx + 1);
      const avgAct3 =
        windowSlice.reduce((sum, item) => sum + item.focusAct, 0) / windowSlice.length;
      const validUphSlice = windowSlice.filter(item => item.focusUph > 0);
      const avgUph3 =
        validUphSlice.length > 0
          ? validUphSlice.reduce((sum, item) => sum + item.focusUph, 0) / validUphSlice.length
          : 0;

      const prevPt = idx > 0 ? arr[idx - 1] : null;
      const actDelta = prevPt ? pt.focusAct - prevPt.focusAct : 0;
      const uphDelta = prevPt && prevPt.focusUph > 0 ? pt.focusUph - prevPt.focusUph : 0;

      return {
        ...pt,
        avgAct3: Math.round(avgAct3),
        avgUph3: Math.round(avgUph3),
        actDelta,
        uphDelta,
      };
    });
  }, [rawDailyPoints, dayFilterMode]);

  // Compute Trend Summary Analytics (First Half vs Second Half slope, Peak Day, Lowest Day)
  const trendInsights = useMemo(() => {
    const activeOnly = rawDailyPoints.filter(p => p.focusAct > 0);
    if (activeOnly.length === 0) {
      return {
        activeDaysCount: 0,
        avgDailyAct: 0,
        avgDailyPlan: 0,
        peakDay: null,
        lowestDay: null,
        uphSlope: 0,
        prodSlope: 0,
        daysMetPlan: 0,
        daysAboveTargetUph: 0,
      };
    }

    const totalAct = activeOnly.reduce((s, p) => s + p.focusAct, 0);
    const totalPlan = activeOnly.reduce((s, p) => s + p.focusPlan, 0);
    const avgDailyAct = Math.round(totalAct / activeOnly.length);
    const avgDailyPlan = Math.round(totalPlan / activeOnly.length);

    const sortedByAct = [...activeOnly].sort((a, b) => b.focusAct - a.focusAct);
    const peakDay = sortedByAct[0];
    const lowestDay = sortedByAct[sortedByAct.length - 1];

    // Compare first half vs second half average to determine trend direction
    const mid = Math.floor(activeOnly.length / 2);
    const firstHalf = activeOnly.slice(0, Math.max(1, mid));
    const secondHalf = activeOnly.slice(Math.max(1, mid));

    const firstHalfActAvg = firstHalf.reduce((s, p) => s + p.focusAct, 0) / firstHalf.length;
    const secondHalfActAvg = secondHalf.reduce((s, p) => s + p.focusAct, 0) / secondHalf.length;
    const prodSlope = firstHalfActAvg > 0 ? ((secondHalfActAvg - firstHalfActAvg) / firstHalfActAvg) * 100 : 0;

    const firstHalfUphAvg = firstHalf.reduce((s, p) => s + p.focusUph, 0) / firstHalf.length;
    const secondHalfUphAvg = secondHalf.reduce((s, p) => s + p.focusUph, 0) / secondHalf.length;
    const uphSlope = firstHalfUphAvg > 0 ? ((secondHalfUphAvg - firstHalfUphAvg) / firstHalfUphAvg) * 100 : 0;

    const daysMetPlan = activeOnly.filter(p => p.focusAct >= p.focusPlan && p.focusPlan > 0).length;
    const daysAboveTargetUph = activeOnly.filter(p => p.focusUph >= targetUphBenchmark).length;

    return {
      activeDaysCount: activeOnly.length,
      avgDailyAct,
      avgDailyPlan,
      peakDay,
      lowestDay,
      uphSlope,
      prodSlope,
      daysMetPlan,
      daysAboveTargetUph,
    };
  }, [rawDailyPoints, targetUphBenchmark]);

  // Smooth SVG Catmull-Rom spline builder
  const createSmoothPath = (points: { x: number; y: number }[]): string => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 >= points.length ? points.length - 1 : i + 2];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  };

  const handleSaveInlineEdit = () => {
    if (!editingCell) return;
    const num = editingCell.val.trim() === '' ? null : Number(editingCell.val);
    onUpdateCellValue(
      editingCell.lineId,
      editingCell.category,
      editingCell.day,
      isNaN(num as number) ? null : num
    );
    setEditingCell(null);
  };

  // Chart dimensions
  const svgWidth = Math.max(760, chartPoints.length * 46);
  const svgHeight = 270;
  const pad = { top: 36, right: 40, bottom: 44, left: 48 };
  const innerW = svgWidth - pad.left - pad.right;
  const innerH = svgHeight - pad.top - pad.bottom;

  const getX = (idx: number) => {
    if (chartPoints.length <= 1) return pad.left + innerW / 2;
    return pad.left + (idx / (chartPoints.length - 1)) * innerW;
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Top Control & Filter Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>{plantName}</span>
            <span aria-hidden="true">·</span>
            <span>{periodLabel}</span>
            <span aria-hidden="true">·</span>
            <span>
              {t(
                `เดินเครื่องผลิต ${trendInsights.activeDaysCount} วัน จาก ${days.length} วันในตาราง`,
                `Active production ${trendInsights.activeDaysCount} of ${days.length} days`,
                `实际生产 ${trendInsights.activeDaysCount} 天 (共 ${days.length} 天)`
              )}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#0070c0]" />
            <span>
              {t(
                'วิเคราะห์กราฟเทรนด์ข้อมูลรายวัน (Daily OEC Production & Efficiency Trends)',
                'Daily OEC Production & Efficiency Trends Analysis',
                '每日 OEC 生产与效率趋势分析图表 (Daily Trends)'
              )}
            </span>
          </h2>
        </div>

        {/* Interactive Controls */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Line Filter Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
            <button
              onClick={() => setSelectedLineFilter('all')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                selectedLineFilter === 'all'
                  ? 'bg-white text-[#0070c0] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('ทุกสายการผลิต (Line A+B)', 'All Lines (Line A+B)', '全部产线 (Line A+B)')}
            </button>
            <button
              onClick={() => setSelectedLineFilter('lineA')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                selectedLineFilter === 'lineA'
                  ? 'bg-white text-[#0070c0] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t(`เฉพาะ ${lineA?.prodLine || 'Line A'}`, `Only ${lineA?.prodLine || 'Line A'}`, `仅 ${lineA?.prodLine || 'Line A'}`)}
            </button>
            {lineB && (
              <button
                onClick={() => setSelectedLineFilter('lineB')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  selectedLineFilter === 'lineB'
                    ? 'bg-white text-[#0070c0] shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t(`เฉพาะ ${lineB.prodLine}`, `Only ${lineB.prodLine}`, `仅 ${lineB.prodLine}`)}
              </button>
            )}
          </div>

          {/* Day Mode Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
            <button
              onClick={() => setDayFilterMode('active')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                dayFilterMode === 'active'
                  ? 'bg-[#0070c0] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t(
                `เฉพาะวันที่มีผลิตจริง (${trendInsights.activeDaysCount} วัน)`,
                `Active Days (${trendInsights.activeDaysCount}d)`,
                `仅生产日 (${trendInsights.activeDaysCount}天)`
              )}
            </button>
            <button
              onClick={() => setDayFilterMode('all')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                dayFilterMode === 'all'
                  ? 'bg-[#0070c0] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t(`ทุกวันในตาราง (${days.length} วัน)`, `All Days (${days.length}d)`, `全部日期 (${days.length}天)`)}
            </button>
          </div>

          {/* Moving Average Toggle */}
          <button
            onClick={() => setShowMovingAvg(!showMovingAvg)}
            className={`px-3 py-1.5 rounded-lg border font-semibold transition-colors cursor-pointer ${
              showMovingAvg
                ? 'bg-violet-50 border-violet-300 text-violet-800'
                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {showMovingAvg
              ? t('✓ เส้นเทรนด์ค่าเฉลี่ย 3 วัน (MA)', '✓ 3-Day Moving Avg (MA)', '✓ 3日移动平均线 (MA)')
              : t('+ เปิดเส้นเทรนด์ MA', '+ Enable MA Trend', '+ 开启移动平均线')}
          </button>

          {/* Data Labels Toggle */}
          <button
            onClick={() => setShowDataLabels(!showDataLabels)}
            className={`px-3 py-1.5 rounded-lg border font-semibold transition-colors cursor-pointer ${
              showDataLabels
                ? 'bg-blue-50 border-blue-200 text-[#0070c0]'
                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {showDataLabels
              ? t('✓ แสดงตัวเลขบนกราฟ', '✓ Data Labels On', '✓ 显示图表数值')
              : t('ซ่อนตัวเลข', 'Hide Labels', '隐藏数值')}
          </button>

          {/* Save on Web Button */}
          {onSaveOnWeb && (
            <button
              onClick={onSaveOnWeb}
              disabled={isSyncing}
              className={`px-3.5 py-1.5 rounded-lg font-bold text-white flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer ${
                hasUnsavedChanges
                  ? 'bg-amber-500 hover:bg-amber-600'
                  : 'bg-emerald-600 hover:bg-emerald-700'
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

      {/* Trend Executive Insights Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">แนวโน้มยอดผลิตรายวัน (Production Trend)</div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {trendInsights.avgDailyAct.toLocaleString()} <span className="text-xs font-normal text-slate-500">ชิ้น/วัน</span>
            </span>
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-bold tabular-nums ${
                trendInsights.prodSlope >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {trendInsights.prodSlope >= 0 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              {trendInsights.prodSlope >= 0 ? '+' : ''}
              {trendInsights.prodSlope.toFixed(1)}% ช่วงครึ่งหลัง
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            เทียบแผนเฉลี่ย {trendInsights.avgDailyPlan.toLocaleString()} ชิ้น/วัน · บรรลุแผน {trendInsights.daysMetPlan}/{trendInsights.activeDaysCount} วัน
          </p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">แนวโน้มประสิทธิภาพ (UPH Trend Direction)</div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#0070c0] tabular-nums">
              {chartPoints.length > 0 ? chartPoints[chartPoints.length - 1].cumUph : 0}{' '}
              <span className="text-xs font-normal text-slate-500">UPH สะสม</span>
            </span>
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-bold tabular-nums ${
                trendInsights.uphSlope >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {trendInsights.uphSlope >= 0 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              {trendInsights.uphSlope >= 0 ? '+' : ''}
              {trendInsights.uphSlope.toFixed(1)}% เทรนด์ UPH
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            ผ่านเกณฑ์เป้าหมาย ({targetUphBenchmark} UPH) จำนวน {trendInsights.daysAboveTargetUph}/{trendInsights.activeDaysCount} วัน
          </p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">วันที่ผลิตได้สูงสุด (Peak Production Day)</div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-700 tabular-nums">
              {trendInsights.peakDay ? `${trendInsights.peakDay.focusAct.toLocaleString()}` : '-'}{' '}
              <span className="text-xs font-normal text-slate-500">ชิ้น</span>
            </span>
            {trendInsights.peakDay && (
              <span className="text-xs font-bold text-slate-700">
                วันที่ {trendInsights.peakDay.day} ({trendInsights.peakDay.weekday})
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {trendInsights.peakDay
              ? `UPH วันพีค: ${trendInsights.peakDay.focusUph} UPH · ใช้เวลา ${trendInsights.peakDay.focusWt} ชม.`
              : 'ยังไม่มีข้อมูล'}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">วันที่ผลิตต่ำสุด / ต้องเฝ้าระวัง (Lowest Active Day)</div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-600 tabular-nums">
              {trendInsights.lowestDay ? `${trendInsights.lowestDay.focusAct.toLocaleString()}` : '-'}{' '}
              <span className="text-xs font-normal text-slate-500">ชิ้น</span>
            </span>
            {trendInsights.lowestDay && (
              <span className="text-xs font-bold text-slate-700">
                วันที่ {trendInsights.lowestDay.day} ({trendInsights.lowestDay.weekday})
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {trendInsights.lowestDay
              ? `UPH: ${trendInsights.lowestDay.focusUph} UPH · Gap: ${trendInsights.lowestDay.focusGap.toLocaleString()}`
              : 'ยังไม่มีข้อมูล'}
          </p>
        </div>
      </div>

      {/* Main 2-Column Daily Trend Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* CHART 1: Daily Planning vs. Actual + 3-Day Moving Average Trend */}
        {(() => {
          const allVals = chartPoints.flatMap(p => [p.focusPlan, p.focusAct, p.avgAct3]);
          const maxVal = Math.max(...allVals, 100) * 1.18;
          const getY = (v: number) =>
            pad.top + innerH - (Math.max(0, Math.min(maxVal, v)) / maxVal) * innerH;

          const planPts = chartPoints.map((p, i) => ({ x: getX(i), y: getY(p.focusPlan), val: p.focusPlan }));
          const actPts = chartPoints.map((p, i) => ({ x: getX(i), y: getY(p.focusAct), val: p.focusAct }));
          const maPts = chartPoints.map((p, i) => ({ x: getX(i), y: getY(p.avgAct3), val: p.avgAct3 }));

          const actPath = createSmoothPath(actPts);
          const planPath = createSmoothPath(planPts);
          const maPath = createSmoothPath(maPts);

          // Area fill under Actual curve
          const areaPath =
            actPts.length > 1
              ? `${actPath} L ${actPts[actPts.length - 1].x} ${pad.top + innerH} L ${actPts[0].x} ${pad.top + innerH} Z`
              : '';

          return (
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    01. กราฟเทรนด์ยอดการผลิตรายวัน (Daily Planning vs. Actual Trend)
                  </h3>
                  <p className="text-xs text-slate-500">
                    เปรียบเทียบเป้าหมายการผลิต (Planning) กับยอดผลิตจริง (Actual) และเส้นแนวโน้มค่าเฉลี่ยเคลื่อนที่
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0070c0]" />
                    <span>ผลิตจริง (Actual)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>แผนผลิต (Planning)</span>
                  </span>
                  {showMovingAvg && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-violet-600" />
                      <span>เทรนด์เฉลี่ย 3 วัน (MA)</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="w-full overflow-x-auto pb-2">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  style={{ minWidth: `${svgWidth}px`, width: '100%', height: 'auto' }}
                >
                  <defs>
                    <linearGradient id="actAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0070c0" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#0070c0" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Gridlines & Y-Axis Labels */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const y = pad.top + innerH * ratio;
                    const labelVal = Math.round(maxVal * (1 - ratio));
                    return (
                      <g key={idx}>
                        <line
                          x1={pad.left}
                          y1={y}
                          x2={svgWidth - pad.right}
                          y2={y}
                          stroke="#e2e8f0"
                          strokeWidth="1"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={pad.left - 8}
                          y={y + 3}
                          textAnchor="end"
                          className="text-[9.5px] fill-slate-400 font-mono"
                        >
                          {labelVal.toLocaleString()}
                        </text>
                      </g>
                    );
                  })}

                  {/* Area under Actual */}
                  {areaPath && <path d={areaPath} fill="url(#actAreaGrad)" />}

                  {/* Planning Dashed Line */}
                  <path
                    d={planPath}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.2"
                    strokeDasharray="5 4"
                    strokeLinecap="round"
                  />

                  {/* 3-Day Moving Average Trend Line */}
                  {showMovingAvg && (
                    <path
                      d={maPath}
                      fill="none"
                      stroke="#7c3aed"
                      strokeWidth="2.2"
                      strokeDasharray="2 2"
                      strokeLinecap="round"
                    />
                  )}

                  {/* Actual Solid Line */}
                  <path
                    d={actPath}
                    fill="none"
                    stroke="#0070c0"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* Points & Labels */}
                  {chartPoints.map((pt, i) => {
                    const x = getX(i);
                    const yAct = actPts[i].y;
                    const yPlan = planPts[i].y;
                    const isHovered = hoveredDayIdx === i;

                    return (
                      <g
                        key={pt.day}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredDayIdx(i)}
                        onMouseLeave={() => setHoveredDayIdx(null)}
                      >
                        {/* Plan point */}
                        <circle
                          cx={x}
                          cy={yPlan}
                          r={isHovered ? 5 : 3}
                          fill="#f59e0b"
                          stroke="#fff"
                          strokeWidth="1.5"
                        />
                        {/* Actual point */}
                        <circle
                          cx={x}
                          cy={yAct}
                          r={isHovered ? 6 : 4}
                          fill={pt.focusAct >= pt.focusPlan ? '#0070c0' : '#e11d48'}
                          stroke="#fff"
                          strokeWidth="1.5"
                        />
                        {showDataLabels && pt.focusAct > 0 && (
                          <text
                            x={x}
                            y={yAct - 9}
                            textAnchor="middle"
                            className="text-[9.5px] font-semibold fill-slate-800 font-mono pointer-events-none"
                          >
                            {pt.focusAct.toLocaleString()}
                          </text>
                        )}
                        {/* X-Axis Day Label */}
                        <text
                          x={x}
                          y={svgHeight - 14}
                          textAnchor="middle"
                          className="text-[10px] fill-slate-600 font-medium"
                        >
                          {pt.day} {pt.weekday}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          );
        })()}

        {/* CHART 2: Daily UPH Efficiency Trend (Line A vs Line B vs Target Benchmark) */}
        {(() => {
          const allUph = chartPoints.flatMap(p => [p.aUph, p.bUph, p.focusUph, targetUphBenchmark]);
          const maxUph = Math.max(...allUph, 140) * 1.15;
          const getY = (v: number) =>
            pad.top + innerH - (Math.max(0, Math.min(maxUph, v)) / maxUph) * innerH;

          const lineAPts = chartPoints.map((p, i) => ({ x: getX(i), y: getY(p.aUph), val: p.aUph }));
          const lineBPts = chartPoints.map((p, i) => ({ x: getX(i), y: getY(p.bUph), val: p.bUph }));
          const maUphPts = chartPoints.map((p, i) => ({ x: getX(i), y: getY(p.avgUph3), val: p.avgUph3 }));

          const pathA = createSmoothPath(lineAPts);
          const pathB = createSmoothPath(lineBPts);
          const pathMa = createSmoothPath(maUphPts);
          const targetY = getY(targetUphBenchmark);

          return (
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    02. กราฟเทรนด์ประสิทธิภาพรายวัน (Daily UPH Trend: Line A vs. Line B)
                  </h3>
                  <p className="text-xs text-slate-500">
                    ติดตามแนวโน้ม UPH รายวันเทียบเกณฑ์มาตรฐาน ({targetUphBenchmark} UPH)
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#009fe3]" />
                    <span>{lineA?.prodLine || 'Line A'}</span>
                  </span>
                  {lineB && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#002060]" />
                      <span>{lineB.prodLine}</span>
                    </span>
                  )}
                  <div className="flex items-center gap-1 text-emerald-700">
                    <span>เป้า UPH:</span>
                    <input
                      type="number"
                      value={targetUphBenchmark}
                      onChange={e => setTargetUphBenchmark(Number(e.target.value) || 110)}
                      className="w-14 bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-center font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="w-full overflow-x-auto pb-2">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  style={{ minWidth: `${svgWidth}px`, width: '100%', height: 'auto' }}
                >
                  {/* Gridlines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const y = pad.top + innerH * ratio;
                    const labelVal = Math.round(maxUph * (1 - ratio));
                    return (
                      <g key={idx}>
                        <line
                          x1={pad.left}
                          y1={y}
                          x2={svgWidth - pad.right}
                          y2={y}
                          stroke="#e2e8f0"
                          strokeWidth="1"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={pad.left - 8}
                          y={y + 3}
                          textAnchor="end"
                          className="text-[9.5px] fill-slate-400 font-mono"
                        >
                          {labelVal}
                        </text>
                      </g>
                    );
                  })}

                  {/* Target Benchmark Horizontal Line */}
                  <line
                    x1={pad.left}
                    y1={targetY}
                    x2={svgWidth - pad.right}
                    y2={targetY}
                    stroke="#10b981"
                    strokeWidth="1.8"
                    strokeDasharray="6 4"
                  />
                  <text
                    x={svgWidth - pad.right - 4}
                    y={targetY - 5}
                    textAnchor="end"
                    className="text-[9.5px] font-bold fill-emerald-700"
                  >
                    Target {targetUphBenchmark} UPH
                  </text>

                  {/* Line B Path */}
                  {lineB && selectedLineFilter !== 'lineA' && (
                    <path
                      d={pathB}
                      fill="none"
                      stroke="#002060"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                    />
                  )}

                  {/* Line A Path */}
                  {selectedLineFilter !== 'lineB' && (
                    <path
                      d={pathA}
                      fill="none"
                      stroke="#009fe3"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                    />
                  )}

                  {/* Moving Average UPH Path */}
                  {showMovingAvg && (
                    <path
                      d={pathMa}
                      fill="none"
                      stroke="#7c3aed"
                      strokeWidth="2"
                      strokeDasharray="2 2"
                    />
                  )}

                  {/* Points & Labels */}
                  {chartPoints.map((pt, i) => {
                    const x = getX(i);
                    return (
                      <g key={pt.day}>
                        {selectedLineFilter !== 'lineB' && (
                          <>
                            <circle
                              cx={x}
                              cy={lineAPts[i].y}
                              r={4}
                              fill="#009fe3"
                              stroke="#fff"
                              strokeWidth="1.5"
                            />
                            {showDataLabels && pt.aUph > 0 && (
                              <text
                                x={x}
                                y={lineAPts[i].y - 8}
                                textAnchor="middle"
                                className="text-[9.5px] font-semibold fill-[#0070c0] font-mono"
                              >
                                {pt.aUph}
                              </text>
                            )}
                          </>
                        )}
                        {lineB && selectedLineFilter !== 'lineA' && (
                          <>
                            <circle
                              cx={x}
                              cy={lineBPts[i].y}
                              r={4}
                              fill="#002060"
                              stroke="#fff"
                              strokeWidth="1.5"
                            />
                            {showDataLabels && pt.bUph > 0 && (
                              <text
                                x={x}
                                y={lineBPts[i].y + 14}
                                textAnchor="middle"
                                className="text-[9.5px] font-semibold fill-slate-800 font-mono"
                              >
                                {pt.bUph}
                              </text>
                            )}
                          </>
                        )}
                        <text
                          x={x}
                          y={svgHeight - 14}
                          textAnchor="middle"
                          className="text-[10px] fill-slate-600 font-medium"
                        >
                          {pt.day} {pt.weekday}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          );
        })()}

        {/* CHART 3: Daily Gap Variance Bars + Cumulative Achievement % Trend */}
        {(() => {
          const maxAbsGap = Math.max(
            ...chartPoints.map(p => Math.abs(p.focusGap)),
            1000
          ) * 1.25;
          const zeroY = pad.top + innerH / 2;
          const barWidth = Math.min(26, Math.max(12, innerW / Math.max(1, chartPoints.length * 1.8)));

          const getRateY = (rate: number) => {
            const clamped = Math.max(0, Math.min(130, rate));
            return pad.top + innerH - (clamped / 130) * innerH;
          };

          const cumRatePts = chartPoints.map((p, i) => ({
            x: getX(i),
            y: getRateY(p.cumAchieveRate),
            val: p.cumAchieveRate,
          }));
          const cumRatePath = createSmoothPath(cumRatePts);

          return (
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    03. กราฟเทรนด์ส่วนต่างรายวัน (Daily Gap) & อัตราบรรลุเป้าหมายสะสม (MTD %)
                  </h3>
                  <p className="text-xs text-slate-500">
                    แท่งสีเขียว = ผลิตเกินแผน (+Gap) · แท่งสีแดง = ต่ำกว่าแผน (-Gap) · เส้นสีน้ำเงิน = % บรรลุแผนสะสม
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                    <span>+Gap (เกินแผน)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" />
                    <span>-Gap (ต่ำกว่าแผน)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0070c0]" />
                    <span>% บรรลุสะสม (MTD)</span>
                  </span>
                </div>
              </div>

              <div className="w-full overflow-x-auto pb-2">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  style={{ minWidth: `${svgWidth}px`, width: '100%', height: 'auto' }}
                >
                  {/* Zero Baseline */}
                  <line
                    x1={pad.left}
                    y1={zeroY}
                    x2={svgWidth - pad.right}
                    y2={zeroY}
                    stroke="#94a3b8"
                    strokeWidth="1.2"
                  />

                  {/* 100% Achievement Reference Line */}
                  <line
                    x1={pad.left}
                    y1={getRateY(100)}
                    x2={svgWidth - pad.right}
                    y2={getRateY(100)}
                    stroke="#0070c0"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    opacity="0.5"
                  />

                  {/* Gap Bars */}
                  {chartPoints.map((pt, i) => {
                    const x = getX(i);
                    const barH = (Math.abs(pt.focusGap) / maxAbsGap) * (innerH / 2);
                    const isPos = pt.focusGap >= 0;
                    const barY = isPos ? zeroY - barH : zeroY;

                    return (
                      <g key={pt.day}>
                        <rect
                          x={x - barWidth / 2}
                          y={barY}
                          width={barWidth}
                          height={Math.max(2, barH)}
                          rx="2"
                          fill={isPos ? '#10b981' : '#f43f5e'}
                          opacity="0.82"
                        />
                        {showDataLabels && pt.focusGap !== 0 && (
                          <text
                            x={x}
                            y={isPos ? barY - 5 : barY + barH + 11}
                            textAnchor="middle"
                            className={`text-[8.5px] font-mono font-semibold ${
                              isPos ? 'fill-emerald-700' : 'fill-rose-600'
                            }`}
                          >
                            {pt.focusGap > 0 ? `+${pt.focusGap}` : pt.focusGap}
                          </text>
                        )}
                        <text
                          x={x}
                          y={svgHeight - 14}
                          textAnchor="middle"
                          className="text-[10px] fill-slate-600 font-medium"
                        >
                          {pt.day} {pt.weekday}
                        </text>
                      </g>
                    );
                  })}

                  {/* Cumulative Achievement % Line */}
                  <path
                    d={cumRatePath}
                    fill="none"
                    stroke="#0070c0"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  {cumRatePts.map((pt, i) => (
                    <g key={`rate-${i}`}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={3.5}
                        fill="#0070c0"
                        stroke="#fff"
                        strokeWidth="1.5"
                      />
                      {showDataLabels && pt.val > 0 && (
                        <text
                          x={pt.x}
                          y={pt.y - 7}
                          textAnchor="middle"
                          className="text-[8.5px] font-bold fill-[#0070c0] font-mono"
                        >
                          {pt.val.toFixed(0)}%
                        </text>
                      )}
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          );
        })()}

        {/* CHART 4: Daily Work Hours vs Production Output Trend */}
        {(() => {
          const maxWt = Math.max(...chartPoints.map(p => p.aWt + p.bWt), 24) * 1.2;
          const barWidth = Math.min(24, Math.max(12, innerW / Math.max(1, chartPoints.length * 1.8)));

          return (
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    04. กราฟเทรนด์ชั่วโมงการทำงานรายวัน (Daily Work Time Hours: Line A & Line B)
                  </h3>
                  <p className="text-xs text-slate-500">
                    เปรียบเทียบชั่วโมงการเดินเครื่องรายวันของแต่ละสายการผลิตคู่กับประสิทธิภาพ
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#009fe3]" />
                    <span>ชั่วโมง {lineA?.prodLine || 'Line A'}</span>
                  </span>
                  {lineB && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#002060]" />
                      <span>ชั่วโมง {lineB.prodLine}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="w-full overflow-x-auto pb-2">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  style={{ minWidth: `${svgWidth}px`, width: '100%', height: 'auto' }}
                >
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const y = pad.top + innerH * ratio;
                    const labelVal = Math.round(maxWt * (1 - ratio));
                    return (
                      <g key={idx}>
                        <line
                          x1={pad.left}
                          y1={y}
                          x2={svgWidth - pad.right}
                          y2={y}
                          stroke="#e2e8f0"
                          strokeWidth="1"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={pad.left - 8}
                          y={y + 3}
                          textAnchor="end"
                          className="text-[9.5px] fill-slate-400 font-mono"
                        >
                          {labelVal}h
                        </text>
                      </g>
                    );
                  })}

                  {chartPoints.map((pt, i) => {
                    const x = getX(i);
                    const aH = (pt.aWt / maxWt) * innerH;
                    const bH = (pt.bWt / maxWt) * innerH;
                    const totalWt = pt.aWt + pt.bWt;

                    const yA = pad.top + innerH - aH;
                    const yB = yA - bH;

                    return (
                      <g key={pt.day}>
                        {/* Line A Work Hours Bar */}
                        {pt.aWt > 0 && (
                          <rect
                            x={x - barWidth / 2}
                            y={yA}
                            width={barWidth}
                            height={aH}
                            fill="#009fe3"
                            rx="1"
                          />
                        )}
                        {/* Line B Work Hours Stacked Bar */}
                        {lineB && pt.bWt > 0 && (
                          <rect
                            x={x - barWidth / 2}
                            y={yB}
                            width={barWidth}
                            height={bH}
                            fill="#002060"
                            rx="1"
                          />
                        )}
                        {showDataLabels && totalWt > 0 && (
                          <text
                            x={x}
                            y={(lineB && pt.bWt > 0 ? yB : yA) - 6}
                            textAnchor="middle"
                            className="text-[9px] font-bold fill-slate-700 font-mono"
                          >
                            {totalWt}h
                          </text>
                        )}
                        <text
                          x={x}
                          y={svgHeight - 14}
                          textAnchor="middle"
                          className="text-[10px] fill-slate-600 font-medium"
                        >
                          {pt.day} {pt.weekday}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Interactive Day-by-Day Trend & Quick-Edit Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              ตารางบันทึกข้อมูลรายวัน & วิเคราะห์เทรนด์เชื่อมโยงกราฟทันที (Daily Data Record & Live Trend Table)
            </h3>
            <p className="text-xs text-slate-500">
              คลิกที่ช่องตัวเลข Planning, Actual หรือ Work Time ของแต่ละวันเพื่อบันทึก/แก้ไขค่า กราฟเทรนด์ด้านบนจะคำนวณและแสดงผลตามทันที
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onOpenDatePeriod && (
              <button
                onClick={onOpenDatePeriod}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Calendar className="w-3.5 h-3.5 text-[#0070c0]" />
                <span>จัดการวัน/เดือน/ปี</span>
              </button>
            )}
            {onAddDay && (
              <button
                onClick={() => {
                  const nextDay = days.length > 0 ? Math.min(31, Math.max(...days.map(d => d.day)) + 1) : 1;
                  setNewDayNum(String(nextDay));
                  setShowQuickAddDay(!showQuickAddDay);
                }}
                className="px-3 py-1.5 bg-[#0070c0] hover:bg-[#005ba3] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มวันบันทึกข้อมูล</span>
              </button>
            )}
            {onSaveOnWeb && (
              <button
                onClick={onSaveOnWeb}
                disabled={isSyncing}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>บันทึกการเปลี่ยนแปลงบน Web</span>
              </button>
            )}
          </div>
        </div>

        {/* Inline Add Day Form */}
        {showQuickAddDay && onAddDay && (
          <div className="bg-blue-50/70 px-5 py-3 border-b border-blue-200 flex flex-wrap items-center gap-3 text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#0070c0]" />
              <span>เพิ่มวันใหม่ในตารางบันทึก:</span>
            </span>
            <div className="flex items-center gap-1.5">
              <label className="text-slate-600 font-medium">เลือกจากปฏิทิน:</label>
              <input
                type="date"
                value={newDateInput}
                onChange={e => {
                  const val = e.target.value;
                  setNewDateInput(val);
                  if (val) {
                    const [y, m, d] = val.split('-').map(Number);
                    if (y && m && d) {
                      setNewDayNum(String(d));
                      setNewWeekday(getWeekdayName(y, m, d));
                    }
                  }
                }}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 font-medium"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-slate-600 font-medium">วันที่ (1-31):</label>
              <input
                type="number"
                min={1}
                max={31}
                value={newDayNum}
                onChange={e => setNewDayNum(e.target.value)}
                className="w-16 bg-white border border-slate-300 rounded px-2 py-1 text-center font-bold text-slate-900"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-slate-600 font-medium">วันในสัปดาห์:</label>
              <select
                value={newWeekday}
                onChange={e => setNewWeekday(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1 font-semibold text-slate-800"
              >
                {['MON', 'TUE', 'WEN', 'THU', 'FRI', 'SAT', 'SUN'].map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                const dayNumber = parseInt(newDayNum, 10);
                if (!isNaN(dayNumber) && dayNumber >= 1 && dayNumber <= 31) {
                  onAddDay(dayNumber, newWeekday);
                  setDayFilterMode('all');
                  setShowQuickAddDay(false);
                }
              }}
              className="px-3 py-1 bg-[#0070c0] hover:bg-[#005ba3] text-white font-bold rounded flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>เพิ่มวันทันที</span>
            </button>
            <button
              onClick={() => setShowQuickAddDay(false)}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>ยกเลิก</span>
            </button>
          </div>
        )}

        <div className="overflow-x-auto max-h-[520px]">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-300">
              <tr className="divide-x divide-slate-200">
                <th className="py-2.5 px-3 text-center">วันที่ (Day)</th>
                <th className="py-2.5 px-3 text-right bg-sky-50/60">
                  {lineA?.prodLine || 'Line A'} Plan (คลิกแก้)
                </th>
                <th className="py-2.5 px-3 text-right bg-sky-50/60">
                  {lineA?.prodLine || 'Line A'} Act (คลิกแก้)
                </th>
                <th className="py-2.5 px-3 text-right bg-sky-50/60">
                  {lineA?.prodLine || 'Line A'} ชม. (คลิกแก้)
                </th>
                <th className="py-2.5 px-3 text-right bg-sky-50/60">UPH A</th>
                {lineB && (
                  <>
                    <th className="py-2.5 px-3 text-right bg-indigo-50/50">
                      {lineB.prodLine} Plan (คลิกแก้)
                    </th>
                    <th className="py-2.5 px-3 text-right bg-indigo-50/50">
                      {lineB.prodLine} Act (คลิกแก้)
                    </th>
                    <th className="py-2.5 px-3 text-right bg-indigo-50/50">
                      {lineB.prodLine} ชม. (คลิกแก้)
                    </th>
                    <th className="py-2.5 px-3 text-right bg-indigo-50/50">UPH B</th>
                  </>
                )}
                <th className="py-2.5 px-3 text-right">รวมผลิตจริง</th>
                <th className="py-2.5 px-3 text-right">ส่วนต่าง (Gap)</th>
                <th className="py-2.5 px-3 text-center">เทรนด์เทียบวันก่อน</th>
                <th className="py-2.5 px-3 text-right">สะสม MTD (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 tabular-nums">
              {chartPoints.map(pt => {
                const renderEditableCell = (
                  lineObj: LineOECData | null,
                  category: 'planning' | 'act' | 'workTime',
                  val: number
                ) => {
                  if (!lineObj) return <td className="py-2 px-3 text-right">-</td>;
                  const isEditing =
                    editingCell?.lineId === lineObj.id &&
                    editingCell?.category === category &&
                    editingCell?.day === pt.day;

                  return (
                    <td
                      onClick={() =>
                        setEditingCell({
                          lineId: lineObj.id,
                          category,
                          day: pt.day,
                          val: val > 0 ? String(val) : '',
                        })
                      }
                      className="py-2 px-3 text-right font-mono cursor-pointer hover:bg-blue-50 transition-colors"
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          type="number"
                          value={editingCell.val}
                          onChange={e => setEditingCell({ ...editingCell, val: e.target.value })}
                          onBlur={handleSaveInlineEdit}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveInlineEdit();
                            if (e.key === 'Escape') setEditingCell(null);
                          }}
                          className="w-20 text-right bg-white border border-blue-500 rounded px-1.5 py-0.5 font-mono text-slate-900 outline-none"
                        />
                      ) : (
                        <span className={val > 0 ? 'text-slate-800 font-medium' : 'text-slate-300'}>
                          {val > 0 ? val.toLocaleString() : '-'}
                        </span>
                      )}
                    </td>
                  );
                };

                return (
                  <tr key={pt.day} className="hover:bg-slate-50/80 divide-x divide-slate-200">
                    <td className="py-2 px-3 text-center font-bold text-slate-800 whitespace-nowrap">
                      {pt.day} <span className="text-[10px] font-normal text-slate-500">{pt.weekday}</span>
                    </td>
                    {renderEditableCell(lineA, 'planning', pt.aPlan)}
                    {renderEditableCell(lineA, 'act', pt.aAct)}
                    {renderEditableCell(lineA, 'workTime', pt.aWt)}
                    <td className="py-2 px-3 text-right font-mono font-bold text-[#0070c0]">
                      {pt.aUph > 0 ? pt.aUph : '-'}
                    </td>

                    {lineB && (
                      <>
                        {renderEditableCell(lineB, 'planning', pt.bPlan)}
                        {renderEditableCell(lineB, 'act', pt.bAct)}
                        {renderEditableCell(lineB, 'workTime', pt.bWt)}
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                          {pt.bUph > 0 ? pt.bUph : '-'}
                        </td>
                      </>
                    )}

                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 bg-slate-50/60">
                      {pt.focusAct > 0 ? pt.focusAct.toLocaleString() : '-'}
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-mono font-bold ${
                        pt.focusGap < 0
                          ? 'text-rose-600 bg-rose-50/30'
                          : pt.focusGap > 0
                          ? 'text-emerald-700 bg-emerald-50/30'
                          : 'text-slate-400'
                      }`}
                    >
                      {pt.focusPlan > 0 || pt.focusAct > 0
                        ? pt.focusGap > 0
                          ? `+${pt.focusGap.toLocaleString()}`
                          : pt.focusGap.toLocaleString()
                        : '-'}
                    </td>
                    <td className="py-2 px-3 text-center font-mono whitespace-nowrap">
                      {pt.actDelta > 0 ? (
                        <span className="text-emerald-600 font-semibold inline-flex items-center gap-0.5">
                          <ArrowUpRight className="w-3.5 h-3.5" />+{pt.actDelta.toLocaleString()}
                        </span>
                      ) : pt.actDelta < 0 ? (
                        <span className="text-rose-600 font-semibold inline-flex items-center gap-0.5">
                          <ArrowDownRight className="w-3.5 h-3.5" />
                          {pt.actDelta.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-[#0070c0]">
                      {pt.cumPlan > 0 ? `${pt.cumAchieveRate.toFixed(1)}%` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

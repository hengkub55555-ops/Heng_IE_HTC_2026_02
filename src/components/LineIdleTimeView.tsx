import React, { useState, useMemo } from 'react';
import {
  LineIdleSheetData,
  LineIdleDailyRow,
  LineIdleMonthlyItem,
} from '../types/oec';
import {
  Save,
  Edit3,
  Plus,
  Trash2,
  Download,
  RotateCcw,
  Check,
  Clock,
  Sparkles,
  Calculator,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { INITIAL_LINE_IDLE_SHEET_DATA } from '../data/initialData';

interface LineIdleTimeViewProps {
  data: LineIdleSheetData;
  onUpdateData: (newData: LineIdleSheetData) => void;
  onSaveOnWeb?: (customTitle?: string) => void;
  hasUnsavedChanges?: boolean;
  isSyncing?: boolean;
}

export const LineIdleTimeView: React.FC<LineIdleTimeViewProps> = ({
  data,
  onUpdateData,
  onSaveOnWeb,
  hasUnsavedChanges = false,
  isSyncing = false,
}) => {
  const { t } = useAppPreferences();

  // Toggle panels
  const [showMonthlyEditor, setShowMonthlyEditor] = useState<boolean>(false);
  const [showQuickAddRow, setShowQuickAddRow] = useState<boolean>(false);
  const [showTargetEditor, setShowTargetEditor] = useState<boolean>(false);
  const [autoCalcRates, setAutoCalcRates] = useState<boolean>(true);

  // Active inline cell editing for Daily Table
  const [editingDailyCell, setEditingDailyCell] = useState<{
    rowId: string;
    field: keyof LineIdleDailyRow;
    val: string;
  } | null>(null);

  // Active inline editing for Top KPI Cards or Plant Summary Table
  const [editingKpiField, setEditingKpiField] = useState<{
    field:
      | 'workTimeTotal'
      | 'over1MinTime'
      | 'over1MinRate'
      | 'oneTo5MinTime'
      | 'oneTo5MinRate'
      | 'over5MinTime'
      | 'over5MinRate';
    val: string;
  } | null>(null);

  // Quick Add Daily Row state
  const [newDate, setNewDate] = useState<string>('2026/10/11');
  const [newWorkTime, setNewWorkTime] = useState<string>('41.70');
  const [new1To5Time, setNew1To5Time] = useState<string>('12.40');
  const [newOver5Time, setNewOver5Time] = useState<string>('0.60');

  // Computed totals from dailyRows (or manual override if set)
  const totals = useMemo(() => {
    let sumWorkTime = 0;
    let sumOver1Min = 0;
    let sum1To5Min = 0;
    let sumOver5Min = 0;

    data.dailyRows.forEach(r => {
      sumWorkTime += Number(r.workTime) || 0;
      sumOver1Min += Number(r.idleOver1MinTime) || 0;
      sum1To5Min += Number(r.idle1To5MinTime) || 0;
      sumOver5Min += Number(r.idleOver5MinTime) || 0;
    });

    const workTimeTotal =
      data.kpiOverrides?.workTimeTotal != null
        ? data.kpiOverrides.workTimeTotal
        : Number(sumWorkTime.toFixed(2));

    const over1MinTime =
      data.kpiOverrides?.over1MinTime != null
        ? data.kpiOverrides.over1MinTime
        : Number(sumOver1Min.toFixed(1));

    const oneTo5MinTime =
      data.kpiOverrides?.oneTo5MinTime != null
        ? data.kpiOverrides.oneTo5MinTime
        : Number(sum1To5Min.toFixed(2));

    const over5MinTime =
      data.kpiOverrides?.over5MinTime != null
        ? data.kpiOverrides.over5MinTime
        : Number(sumOver5Min.toFixed(1));

    const over1MinRate =
      data.kpiOverrides?.over1MinRate != null
        ? data.kpiOverrides.over1MinRate
        : workTimeTotal > 0
        ? Number(((over1MinTime / workTimeTotal) * 100).toFixed(1))
        : 0;

    const oneTo5MinRate =
      data.kpiOverrides?.oneTo5MinRate != null
        ? data.kpiOverrides.oneTo5MinRate
        : workTimeTotal > 0
        ? Number(((oneTo5MinTime / workTimeTotal) * 100).toFixed(1))
        : 0;

    const over5MinRate =
      data.kpiOverrides?.over5MinRate != null
        ? data.kpiOverrides.over5MinRate
        : workTimeTotal > 0
        ? Number(((over5MinTime / workTimeTotal) * 100).toFixed(1))
        : 0;

    return {
      workTimeTotal,
      over1MinTime,
      over1MinRate,
      oneTo5MinTime,
      oneTo5MinRate,
      over5MinTime,
      over5MinRate,
    };
  }, [data.dailyRows, data.kpiOverrides]);

  // Helper to get daily rate %
  const getDailyOver1MinRate = (row: LineIdleDailyRow) => {
    if (row.idleOver1MinRate !== undefined && !autoCalcRates) return row.idleOver1MinRate;
    if (row.workTime > 0) {
      return Number(((row.idleOver1MinTime / row.workTime) * 100).toFixed(1));
    }
    return row.idleOver1MinRate ?? 0;
  };

  const getDaily1To5MinRate = (row: LineIdleDailyRow) => {
    if (row.idle1To5MinRate !== undefined && !autoCalcRates) return row.idle1To5MinRate;
    if (row.workTime > 0) {
      return Number(((row.idle1To5MinTime / row.workTime) * 100).toFixed(1));
    }
    return row.idle1To5MinRate ?? 0;
  };

  const getDailyOver5MinRate = (row: LineIdleDailyRow) => {
    if (row.idleOver5MinRate !== undefined && !autoCalcRates) return row.idleOver5MinRate;
    if (row.workTime > 0) {
      return Number(((row.idleOver5MinTime / row.workTime) * 100).toFixed(1));
    }
    return row.idleOver5MinRate ?? 0;
  };

  // Format current timestamp in DD/MM/YYYY H:mm:ss
  const getFormattedNow = () => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    const hh = now.getHours();
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${d}/${m}/${y} ${hh}:${mm}:${ss}`;
  };

  // Commit Daily Cell Edit
  const handleCommitDailyCell = () => {
    if (!editingDailyCell) return;
    const { rowId, field, val } = editingDailyCell;

    const updatedRows = data.dailyRows.map(row => {
      if (row.id !== rowId) return row;

      if (field === 'date' || field === 'plantName') {
        return { ...row, [field]: val };
      }

      const num = Number(val);
      const validNum = isNaN(num) ? 0 : num;
      const nextRow: LineIdleDailyRow = {
        ...row,
        [field]: validNum,
      };

      if (autoCalcRates) {
        // If user edited 1-5min time or >5min time, update >1min time = 1-5min + >5min
        if (field === 'idle1To5MinTime' || field === 'idleOver5MinTime') {
          nextRow.idleOver1MinTime = Number(
            (Number(nextRow.idle1To5MinTime) + Number(nextRow.idleOver5MinTime)).toFixed(1)
          );
        }
        const wt = Number(nextRow.workTime);
        if (wt > 0) {
          nextRow.idleOver1MinRate = Number(((nextRow.idleOver1MinTime / wt) * 100).toFixed(1));
          nextRow.idle1To5MinRate = Number(((nextRow.idle1To5MinTime / wt) * 100).toFixed(1));
          nextRow.idleOver5MinRate = Number(((nextRow.idleOver5MinTime / wt) * 100).toFixed(1));
        }
      }

      return nextRow;
    });

    // Sync active month (last month in monthlyTrends) with updated totals
    let sumWt = 0,
      sumO1 = 0,
      sum15 = 0,
      sumO5 = 0;
    updatedRows.forEach(r => {
      sumWt += Number(r.workTime) || 0;
      sumO1 += Number(r.idleOver1MinTime) || 0;
      sum15 += Number(r.idle1To5MinTime) || 0;
      sumO5 += Number(r.idleOver5MinTime) || 0;
    });

    const nextMonthly = data.monthlyTrends.map((m, idx) => {
      if (idx !== data.monthlyTrends.length - 1) return m;
      return {
        ...m,
        over1MinTime: Number(sumO1.toFixed(1)),
        over1MinRate: sumWt > 0 ? Number(((sumO1 / sumWt) * 100).toFixed(1)) : m.over1MinRate,
        oneTo5MinTime: Number(sum15.toFixed(1)),
        oneTo5MinRate: sumWt > 0 ? Number(((sum15 / sumWt) * 100).toFixed(1)) : m.oneTo5MinRate,
        over5MinTime: Number(sumO5.toFixed(1)),
        over5MinRate: sumWt > 0 ? Number(((sumO5 / sumWt) * 100).toFixed(1)) : m.over5MinRate,
      };
    });

    onUpdateData({
      ...data,
      dailyRows: updatedRows,
      monthlyTrends: nextMonthly,
      kpiOverrides: {}, // clear overrides so KPI cards reflect live daily sum
      updateTime: getFormattedNow(),
      updatedAt: new Date().toISOString(),
    });
    setEditingDailyCell(null);
  };

  // Commit KPI / Summary Override Edit
  const handleCommitKpiEdit = () => {
    if (!editingKpiField) return;
    const { field, val } = editingKpiField;
    const trimmed = val.trim();
    const num = trimmed === '' ? null : Number(trimmed);
    const validNum = num !== null && !isNaN(num) ? num : null;

    onUpdateData({
      ...data,
      kpiOverrides: {
        ...data.kpiOverrides,
        [field]: validNum,
      },
      updateTime: getFormattedNow(),
      updatedAt: new Date().toISOString(),
    });
    setEditingKpiField(null);
  };

  // Add a new Daily Row
  const handleAddDailyRow = () => {
    const wt = Number(newWorkTime) || 41.7;
    const t15 = Number(new1To5Time) || 12.4;
    const t5 = Number(newOver5Time) || 0.6;
    const t1 = Number((t15 + t5).toFixed(1));

    const newRow: LineIdleDailyRow = {
      id: `idle-d-${Date.now()}`,
      date: newDate || '2026/10/11',
      plantName: data.plant || 'HTC Ref(泰国冰箱)',
      workTime: wt,
      idleOver1MinTime: t1,
      idleOver1MinRate: wt > 0 ? Number(((t1 / wt) * 100).toFixed(1)) : 0,
      idle1To5MinTime: t15,
      idle1To5MinRate: wt > 0 ? Number(((t15 / wt) * 100).toFixed(1)) : 0,
      idleOver5MinTime: t5,
      idleOver5MinRate: wt > 0 ? Number(((t5 / wt) * 100).toFixed(1)) : 0,
    };

    const nextRows = [...data.dailyRows, newRow];
    onUpdateData({
      ...data,
      dailyRows: nextRows,
      kpiOverrides: {},
      updateTime: getFormattedNow(),
      updatedAt: new Date().toISOString(),
    });
    setShowQuickAddRow(false);
  };

  const handleDeleteDailyRow = (rowId: string) => {
    const nextRows = data.dailyRows.filter(r => r.id !== rowId);
    onUpdateData({
      ...data,
      dailyRows: nextRows,
      kpiOverrides: {},
      updateTime: getFormattedNow(),
      updatedAt: new Date().toISOString(),
    });
  };

  // Update Monthly Trend Chart Data
  const handleUpdateMonthlyItem = (
    idx: number,
    field: keyof LineIdleMonthlyItem,
    rawVal: string
  ) => {
    const nextMonthly = data.monthlyTrends.map((item, i) => {
      if (i !== idx) return item;
      if (field === 'month') return { ...item, month: rawVal };
      const num = Number(rawVal);
      return { ...item, [field]: isNaN(num) ? 0 : num };
    });

    onUpdateData({
      ...data,
      monthlyTrends: nextMonthly,
      updateTime: getFormattedNow(),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddMonthlyTrendRow = () => {
    const nextMonthIdx = data.monthlyTrends.length + 1;
    const monthStr = `2026-${String(nextMonthIdx).padStart(2, '0')}`;
    onUpdateData({
      ...data,
      monthlyTrends: [
        ...data.monthlyTrends,
        {
          month: monthStr,
          over1MinTime: 130.0,
          over1MinRate: 35.0,
          oneTo5MinTime: 120.0,
          oneTo5MinRate: 32.0,
          over5MinTime: 10.0,
          over5MinRate: 3.0,
        },
      ],
      updateTime: getFormattedNow(),
      updatedAt: new Date().toISOString(),
    });
  };

  // Export Excel (.xlsx)
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const dailySheetRows = data.dailyRows.map(r => ({
      Date: r.date,
      'Plant Name': r.plantName,
      'Work Time': r.workTime,
      '>1 min time (h)': r.idleOver1MinTime,
      '>1 min rate (%)': `${getDailyOver1MinRate(r).toFixed(1)}%`,
      '>1-5min time (h)': r.idle1To5MinTime,
      '>1-5min rate (%)': `${getDaily1To5MinRate(r).toFixed(1)}%`,
      '>5min time (h)': r.idleOver5MinTime,
      '>5min rate (%)': `${getDailyOver5MinRate(r).toFixed(1)}%`,
    }));

    dailySheetRows.push({
      Date: 'Total',
      'Plant Name': data.plant,
      'Work Time': totals.workTimeTotal,
      '>1 min time (h)': totals.over1MinTime,
      '>1 min rate (%)': `${totals.over1MinRate.toFixed(1)}%`,
      '>1-5min time (h)': totals.oneTo5MinTime,
      '>1-5min rate (%)': `${totals.oneTo5MinRate.toFixed(1)}%`,
      '>5min time (h)': totals.over5MinTime,
      '>5min rate (%)': `${totals.over5MinRate.toFixed(1)}%`,
    });

    const wsDaily = XLSX.utils.json_to_sheet(dailySheetRows);
    XLSX.utils.book_append_sheet(wb, wsDaily, 'FA_Line_Idle_Daily');

    const wsMonthly = XLSX.utils.json_to_sheet(data.monthlyTrends);
    XLSX.utils.book_append_sheet(wb, wsMonthly, 'Monthly_Idle_Trend');

    XLSX.writeFile(wb, `FA_Line_Idle_Time_${data.month}.xlsx`);
  };

  // Helper to render each of the 3 Combo Charts (Bar + Line) matching the PowerBI / Haier screenshot
  const renderComboTrendChart = (
    title: string,
    barLabel: string,
    lineLabel: string,
    barColor: string,
    timeKey: 'over1MinTime' | 'oneTo5MinTime' | 'over5MinTime',
    rateKey: 'over1MinRate' | 'oneTo5MinRate' | 'over5MinRate',
    maxTimeDomain: number,
    minRateAxis: number,
    maxRateAxis: number,
    rightAxisTicks: string[]
  ) => {
    const items = data.monthlyTrends;
    const svgW = 460;
    const svgH = 210;
    const pad = { top: 24, right: 38, bottom: 38, left: 34 };
    const innerW = svgW - pad.left - pad.right;
    const innerH = svgH - pad.top - pad.bottom;

    const stepW = items.length > 0 ? innerW / items.length : innerW;
    const barW = Math.min(26, stepW * 0.62);

    const getBarY = (val: number) => {
      const clamped = Math.max(0, Math.min(maxTimeDomain, val));
      return pad.top + innerH - (clamped / maxTimeDomain) * innerH;
    };

    const getRateY = (rate: number) => {
      const clamped = Math.max(minRateAxis, Math.min(maxRateAxis, rate));
      return (
        pad.top +
        innerH -
        ((clamped - minRateAxis) / (maxRateAxis - minRateAxis)) * innerH
      );
    };

    const linePts = items.map((m, idx) => ({
      x: pad.left + stepW * idx + stepW / 2,
      y: getRateY(Number(m[rateKey])),
      rate: Number(m[rateKey]),
      time: Number(m[timeKey]),
      month: m.month,
    }));

    const linePath =
      linePts.length > 0
        ? linePts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ')
        : '';

    return (
      <div className="bg-white rounded-xs border border-slate-200/90 shadow-2xs p-3 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 text-center flex-1">{title}</h3>
            <button
              onClick={() => setShowMonthlyEditor(!showMonthlyEditor)}
              className="text-[10px] text-[#0b65b8] hover:underline flex items-center gap-0.5 cursor-pointer"
              title={t('คลิกเพื่อแก้ไขตัวเลขกราฟ', 'Click to edit chart data', '点击编辑图表数据')}
            >
              <Edit3 className="w-3 h-3" />
              <span>{t('แก้ไข', 'Edit', '编辑')}</span>
            </button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-600 font-medium">
            <span className="inline-flex items-center gap-1">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: barColor }}
              />
              {barLabel}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#eb7d3c] inline-block" />
              {lineLabel}
            </span>
          </div>
        </div>

        <div className="w-full overflow-x-auto select-none mt-1">
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="w-full h-auto min-w-[360px] cursor-pointer"
            onClick={() => setShowMonthlyEditor(true)}
          >
            {/* Horizontal dotted grid lines */}
            {[0, 0.5, 1].map((r, idx) => {
              const y = pad.top + innerH * r;
              const leftLabel = Math.round(maxTimeDomain * (1 - r));
              const rightLabel = rightAxisTicks[idx] || '';
              return (
                <g key={idx}>
                  <line
                    x1={pad.left}
                    y1={y}
                    x2={svgW - pad.right}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeDasharray="2 2"
                    strokeWidth="1"
                  />
                  <text
                    x={pad.left - 5}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[9.5px] fill-slate-500"
                  >
                    {leftLabel}
                  </text>
                  <text
                    x={svgW - pad.right + 5}
                    y={y + 3}
                    textAnchor="start"
                    className="text-[9.5px] fill-slate-500"
                  >
                    {rightLabel}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {items.map((m, idx) => {
              const val = Number(m[timeKey]);
              const cx = pad.left + stepW * idx + stepW / 2;
              const barY = getBarY(val);
              const barH = Math.max(2, pad.top + innerH - barY);
              const showTimeLabel =
                timeKey === 'oneTo5MinTime' ||
                idx % 2 === 0 ||
                idx === items.length - 1;

              return (
                <g key={`bar-${m.month}`}>
                  <rect
                    x={cx - barW / 2}
                    y={barY}
                    width={barW}
                    height={barH}
                    fill={barColor}
                    rx="1"
                  />
                  {showTimeLabel && (
                    <text
                      x={cx}
                      y={Math.max(11, barY - 4)}
                      textAnchor="middle"
                      className="text-[9.5px] font-semibold fill-slate-700"
                    >
                      {timeKey === 'oneTo5MinTime' ? Math.round(val) : val.toFixed(1)}
                    </text>
                  )}
                  {/* Rotated X-axis month label */}
                  <text
                    x={cx}
                    y={svgH - 12}
                    textAnchor="end"
                    transform={`rotate(-28, ${cx}, ${svgH - 12})`}
                    className="text-[9.5px] fill-slate-500 font-medium"
                  >
                    {m.month}
                  </text>
                </g>
              );
            })}

            {/* Orange Rate Line */}
            <path
              d={linePath}
              fill="none"
              stroke="#eb7d3c"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Rate Pills on selected points matching screenshot */}
            {linePts.map((pt, idx) => {
              const showBadge =
                idx === 0 ||
                idx === 3 ||
                idx === 6 ||
                idx === 8 ||
                idx === items.length - 1;
              if (!showBadge) return null;
              const badgeW = 36;
              const badgeH = 15;
              const bx = pt.x - badgeW / 2;
              const by = Math.min(pad.top + innerH - badgeH - 2, pt.y + 4);
              return (
                <g key={`rate-${idx}`}>
                  <rect
                    x={bx}
                    y={by}
                    width={badgeW}
                    height={badgeH}
                    rx="2"
                    fill="#f8fafc"
                    fillOpacity="0.92"
                    stroke="#cbd5e1"
                    strokeWidth="0.8"
                  />
                  <text
                    x={pt.x}
                    y={by + 10.5}
                    textAnchor="middle"
                    className="text-[9px] font-bold fill-slate-700"
                  >
                    {pt.rate.toFixed(1)}%
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#f2f2f2] p-3 rounded-md border border-slate-300 space-y-3 pb-6">
      {/* =====================================================================
          1. TOP HEADER BAR: FA Line Idle Time (总装停机时) + Plant / Year / Month / Update Time
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">
        {/* Title Box */}
        <div className="lg:col-span-5 bg-white px-4 py-3 rounded-xs border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-black text-[#0b65b8] tracking-tight">
            FA Line Idle Time (总装停机时)
          </h1>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] bg-blue-50 text-[#0b65b8] px-2 py-0.5 rounded font-semibold border border-blue-200">
            <Sparkles className="w-3 h-3" />
            {t('คลิกตัวเลขเพื่อแก้ไขได้ทุกจุด', 'All Numbers Editable', '全表数据可点击修改')}
          </span>
        </div>

        {/* Plant Box */}
        <div className="lg:col-span-2 bg-white px-3 py-1.5 rounded-xs border border-slate-200/90 shadow-2xs flex flex-col justify-center">
          <div className="text-[11px] font-bold text-slate-700 text-center mb-1">Plant</div>
          <select
            value={data.plant}
            onChange={e =>
              onUpdateData({
                ...data,
                plant: e.target.value,
                updateTime: getFormattedNow(),
              })
            }
            className="w-full border border-slate-300 rounded-xs px-2 py-1 text-xs font-semibold text-slate-700 bg-white focus:outline-none cursor-pointer"
          >
            <option value="HTC Ref(泰国冰箱)">HTC Ref(泰国冰箱)</option>
          </select>
        </div>

        {/* Year Box */}
        <div className="lg:col-span-1 bg-white px-2.5 py-1.5 rounded-xs border border-slate-200/90 shadow-2xs flex flex-col justify-center">
          <div className="text-[11px] font-bold text-slate-700 text-center mb-1">Year</div>
          <select
            value={data.year}
            onChange={e =>
              onUpdateData({
                ...data,
                year: Number(e.target.value),
                updateTime: getFormattedNow(),
              })
            }
            className="w-full border border-slate-300 rounded-xs px-1.5 py-1 text-xs font-semibold text-slate-700 bg-white focus:outline-none cursor-pointer"
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
        </div>

        {/* Month Box */}
        <div className="lg:col-span-2 bg-white px-3 py-1.5 rounded-xs border border-slate-200/90 shadow-2xs flex flex-col justify-center">
          <div className="text-[11px] font-bold text-slate-700 text-center mb-1">Month</div>
          <select
            value={data.month}
            onChange={e =>
              onUpdateData({
                ...data,
                month: e.target.value,
                updateTime: getFormattedNow(),
              })
            }
            className="w-full border border-slate-300 rounded-xs px-2 py-1 text-xs font-semibold text-slate-700 bg-white focus:outline-none cursor-pointer"
          >
            {[
              '2026-01',
              '2026-02',
              '2026-03',
              '2026-04',
              '2026-05',
              '2026-06',
              '2026-07',
              '2026-08',
              '2026-09',
              '2026-10',
              '2026-11',
              '2026-12',
            ].map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Update Time Box (Editable!) */}
        <div className="lg:col-span-2 bg-white px-3 py-1.5 rounded-xs border border-slate-200/90 shadow-2xs flex flex-col justify-center text-center">
          <div className="text-[11px] font-bold text-slate-800">Update Time</div>
          <input
            type="text"
            value={data.updateTime}
            onChange={e => onUpdateData({ ...data, updateTime: e.target.value })}
            className="text-sm font-semibold text-slate-800 text-center bg-transparent border border-transparent hover:border-slate-300 focus:border-[#0b65b8] focus:bg-white rounded px-1 py-0.5 mt-0.5"
            title={t('คลิกเพื่อแก้ไขเวลาอัปเดต', 'Click to edit Update Time', '点击修改更新时间')}
          />
        </div>
      </div>

      {/* =====================================================================
          WEB EDITING CONTROL BAR
         ===================================================================== */}
      <div className="bg-white px-3.5 py-2 rounded-xs border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowQuickAddRow(!showQuickAddRow)}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0b65b8] hover:bg-[#084e8e] text-white font-semibold rounded cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('เพิ่มข้อมูลรายวัน (Add Date Row)', 'Add Daily Row', '新增每日停机记录')}</span>
          </button>

          <button
            onClick={() => setShowMonthlyEditor(!showMonthlyEditor)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-semibold border cursor-pointer ${
              showMonthlyEditor
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-[#0b65b8]" />
            <span>{t('แก้ไขข้อมูลกราฟ 3 เทรนด์รายเดือน', 'Edit 3 Monthly Trend Charts', '编辑月度趋势图数据')}</span>
          </button>

          <button
            onClick={() => setShowTargetEditor(!showTargetEditor)}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded font-semibold cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-teal-700" />
            <span>{t('แก้ไขค่าเป้าหมาย Tgt%', 'Edit Target %', '修改目标值 Tgt%')}</span>
          </button>

          <label className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50/70 text-slate-700 border border-blue-200 rounded font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={autoCalcRates}
              onChange={e => setAutoCalcRates(e.target.checked)}
              className="rounded text-[#0b65b8]"
            />
            <Calculator className="w-3.5 h-3.5 text-[#0b65b8]" />
            <span>
              {t(
                'คำนวณ % และผลรวมอัตโนมัติเมื่อแก้ตัวเลข',
                'Auto-calculate % & Totals on edit',
                '修改数值时自动计算百分比与合计'
              )}
            </span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() =>
              onUpdateData({
                ...INITIAL_LINE_IDLE_SHEET_DATA,
                updatedAt: new Date().toISOString(),
              })
            }
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded font-medium cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('ค่าต้นฉบับ', 'Reset Original', '恢复原版')}</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-[#0b65b8] border border-blue-300 rounded font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          {onSaveOnWeb && (
            <button
              onClick={() => onSaveOnWeb('บันทึกอัปเดต FA Line Idle Time (总装停机时)')}
              disabled={isSyncing}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded font-bold shadow-xs transition-all cursor-pointer ${
                hasUnsavedChanges
                  ? 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-300'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>
                {isSyncing
                  ? t('กำลังบันทึก...', 'Saving...', '保存中...')
                  : t('บันทึกอัพเดทบน Web', 'Save on Web', '网页保存更新')}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* =====================================================================
          COLLAPSIBLE PANEL: ADD DAILY ROW
         ===================================================================== */}
      {showQuickAddRow && (
        <div className="bg-blue-50 border border-blue-200 rounded-xs p-3 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-bold text-blue-950">
            {t('เพิ่มข้อมูลรายวันใหม่ (Add Daily Idle Record):', 'Add New Daily Idle Record:', '新增每日停机记录:')}
          </span>
          <div className="flex items-center gap-1">
            <label>Date:</label>
            <input
              type="text"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="w-28 bg-white border border-slate-300 rounded px-2 py-1 font-semibold"
            />
          </div>
          <div className="flex items-center gap-1">
            <label>Work Time (h):</label>
            <input
              type="number"
              step="0.01"
              value={newWorkTime}
              onChange={e => setNewWorkTime(e.target.value)}
              className="w-20 bg-white border border-slate-300 rounded px-2 py-1 font-semibold"
            />
          </div>
          <div className="flex items-center gap-1">
            <label>{'>1-5min time (h):'}</label>
            <input
              type="number"
              step="0.01"
              value={new1To5Time}
              onChange={e => setNew1To5Time(e.target.value)}
              className="w-20 bg-white border border-slate-300 rounded px-2 py-1 font-semibold"
            />
          </div>
          <div className="flex items-center gap-1">
            <label>{'>5min time (h):'}</label>
            <input
              type="number"
              step="0.1"
              value={newOver5Time}
              onChange={e => setNewOver5Time(e.target.value)}
              className="w-20 bg-white border border-slate-300 rounded px-2 py-1 font-semibold"
            />
          </div>
          <button
            onClick={handleAddDailyRow}
            className="px-3 py-1 bg-[#0b65b8] hover:bg-[#084e8e] text-white font-bold rounded cursor-pointer"
          >
            {t('เพิ่มลงตาราง', 'Add Row', '添加')}
          </button>
          <button
            onClick={() => setShowQuickAddRow(false)}
            className="px-2 py-1 text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            {t('ปิด', 'Close', '关闭')}
          </button>
        </div>
      )}

      {/* =====================================================================
          COLLAPSIBLE PANEL: EDIT MONTHLY TREND CHARTS
         ===================================================================== */}
      {showMonthlyEditor && (
        <div className="bg-white border border-blue-300 rounded-xs p-3 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-[#0b65b8]" />
              <span>
                {t(
                  'ตารางแก้ไขข้อมูลกราฟเทรนด์รายเดือน (>1min, 1-5min, >5min Idle Trend)',
                  'Edit Monthly Idle Trend Charts Data',
                  '编辑月度停机趋势图数据'
                )}
              </span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddMonthlyTrendRow}
                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#0b65b8] border border-blue-200 rounded text-xs font-semibold cursor-pointer"
              >
                + {t('เพิ่มเดือน', 'Add Month', '新增月份')}
              </button>
              <button
                onClick={() => setShowMonthlyEditor(false)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('เสร็จสิ้น', 'Done', '完成')}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="text-white">
                  <th className="bg-slate-700 border border-slate-600 px-2 py-1.5 text-center">Month</th>
                  <th className="bg-[#0b65b8] border border-blue-800 px-2 py-1.5 text-right">{'>1min Time(h)'}</th>
                  <th className="bg-[#0b65b8] border border-blue-800 px-2 py-1.5 text-right">{'>1min Rate(%)'}</th>
                  <th className="bg-[#2b7a8b] border border-teal-800 px-2 py-1.5 text-right">{'1-5min Time(h)'}</th>
                  <th className="bg-[#2b7a8b] border border-teal-800 px-2 py-1.5 text-right">{'1-5min Rate(%)'}</th>
                  <th className="bg-[#39608f] border border-slate-800 px-2 py-1.5 text-right">{'>5min Time(h)'}</th>
                  <th className="bg-[#39608f] border border-slate-800 px-2 py-1.5 text-right">{'>5min Rate(%)'}</th>
                </tr>
              </thead>
              <tbody>
                {data.monthlyTrends.map((m, idx) => (
                  <tr key={idx} className="even:bg-slate-50 hover:bg-blue-50/40">
                    <td className="border border-slate-200 px-2 py-1 text-center">
                      <input
                        type="text"
                        value={m.month}
                        onChange={e => handleUpdateMonthlyItem(idx, 'month', e.target.value)}
                        className="w-20 text-center font-bold bg-transparent border border-transparent hover:border-slate-300 focus:bg-white rounded px-1"
                      />
                    </td>
                    <td className="border border-slate-200 px-2 py-1 text-right">
                      <input
                        type="number"
                        step="0.1"
                        value={m.over1MinTime}
                        onChange={e => handleUpdateMonthlyItem(idx, 'over1MinTime', e.target.value)}
                        className="w-20 text-right font-bold text-[#0b65b8] bg-transparent border border-transparent hover:border-slate-300 focus:bg-white rounded px-1"
                      />
                    </td>
                    <td className="border border-slate-200 px-2 py-1 text-right">
                      <input
                        type="number"
                        step="0.1"
                        value={m.over1MinRate}
                        onChange={e => handleUpdateMonthlyItem(idx, 'over1MinRate', e.target.value)}
                        className="w-20 text-right font-semibold text-slate-700 bg-transparent border border-transparent hover:border-slate-300 focus:bg-white rounded px-1"
                      />
                    </td>
                    <td className="border border-slate-200 px-2 py-1 text-right">
                      <input
                        type="number"
                        step="0.1"
                        value={m.oneTo5MinTime}
                        onChange={e => handleUpdateMonthlyItem(idx, 'oneTo5MinTime', e.target.value)}
                        className="w-20 text-right font-bold text-[#2b7a8b] bg-transparent border border-transparent hover:border-slate-300 focus:bg-white rounded px-1"
                      />
                    </td>
                    <td className="border border-slate-200 px-2 py-1 text-right">
                      <input
                        type="number"
                        step="0.1"
                        value={m.oneTo5MinRate}
                        onChange={e => handleUpdateMonthlyItem(idx, 'oneTo5MinRate', e.target.value)}
                        className="w-20 text-right font-semibold text-slate-700 bg-transparent border border-transparent hover:border-slate-300 focus:bg-white rounded px-1"
                      />
                    </td>
                    <td className="border border-slate-200 px-2 py-1 text-right">
                      <input
                        type="number"
                        step="0.1"
                        value={m.over5MinTime}
                        onChange={e => handleUpdateMonthlyItem(idx, 'over5MinTime', e.target.value)}
                        className="w-20 text-right font-bold text-[#39608f] bg-transparent border border-transparent hover:border-slate-300 focus:bg-white rounded px-1"
                      />
                    </td>
                    <td className="border border-slate-200 px-2 py-1 text-right">
                      <input
                        type="number"
                        step="0.1"
                        value={m.over5MinRate}
                        onChange={e => handleUpdateMonthlyItem(idx, 'over5MinRate', e.target.value)}
                        className="w-20 text-right font-semibold text-slate-700 bg-transparent border border-transparent hover:border-slate-300 focus:bg-white rounded px-1"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          2. ROW OF 6 KPI CARDS (ALL CLICKABLE TO EDIT DIRECTLY)
         ===================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 px-1">
        {/* Card 1: >1min Idle Time(h) */}
        <div
          onClick={() =>
            setEditingKpiField({
              field: 'over1MinTime',
              val: String(totals.over1MinTime),
            })
          }
          className="bg-[#0b65b8] text-white py-2.5 px-3 text-center shadow-xs cursor-pointer hover:brightness-105 transition-all"
          title={t('คลิกเพื่อแก้ไขตัวเลข', 'Click to edit value', '点击修改数值')}
        >
          <div className="text-xs font-semibold text-white/95">{'>1min Idle Time(h)'}</div>
          {editingKpiField?.field === 'over1MinTime' ? (
            <input
              autoFocus
              type="number"
              step="0.1"
              value={editingKpiField.val}
              onChange={e => setEditingKpiField({ ...editingKpiField, val: e.target.value })}
              onBlur={handleCommitKpiEdit}
              onKeyDown={e => e.key === 'Enter' && handleCommitKpiEdit()}
              className="w-24 text-center bg-white text-slate-900 font-black text-2xl rounded mt-1"
            />
          ) : (
            <div className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
              {totals.over1MinTime.toFixed(1)}
            </div>
          )}
        </div>

        {/* Card 2: >1min Idle Rate(%) */}
        <div
          onClick={() =>
            setEditingKpiField({
              field: 'over1MinRate',
              val: String(totals.over1MinRate),
            })
          }
          className="bg-[#0b65b8] text-white py-2.5 px-3 text-center shadow-xs cursor-pointer hover:brightness-105 transition-all"
          title={t('คลิกเพื่อแก้ไขตัวเลข', 'Click to edit value', '点击修改数值')}
        >
          <div className="text-xs font-semibold text-white/95">{'>1min Idle Rate(%)'}</div>
          {editingKpiField?.field === 'over1MinRate' ? (
            <input
              autoFocus
              type="number"
              step="0.1"
              value={editingKpiField.val}
              onChange={e => setEditingKpiField({ ...editingKpiField, val: e.target.value })}
              onBlur={handleCommitKpiEdit}
              onKeyDown={e => e.key === 'Enter' && handleCommitKpiEdit()}
              className="w-24 text-center bg-white text-slate-900 font-black text-2xl rounded mt-1"
            />
          ) : (
            <div className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
              {totals.over1MinRate.toFixed(1)}%
            </div>
          )}
        </div>

        {/* Card 3: 1-5min Idle Time(h) */}
        <div
          onClick={() =>
            setEditingKpiField({
              field: 'oneTo5MinTime',
              val: String(totals.oneTo5MinTime),
            })
          }
          className="bg-[#2b7a8b] text-white py-2.5 px-3 text-center shadow-xs cursor-pointer hover:brightness-105 transition-all"
          title={t('คลิกเพื่อแก้ไขตัวเลข', 'Click to edit value', '点击修改数值')}
        >
          <div className="text-xs font-semibold text-white/95">{'1-5min Idle Time(h)'}</div>
          {editingKpiField?.field === 'oneTo5MinTime' ? (
            <input
              autoFocus
              type="number"
              step="0.1"
              value={editingKpiField.val}
              onChange={e => setEditingKpiField({ ...editingKpiField, val: e.target.value })}
              onBlur={handleCommitKpiEdit}
              onKeyDown={e => e.key === 'Enter' && handleCommitKpiEdit()}
              className="w-24 text-center bg-white text-slate-900 font-black text-2xl rounded mt-1"
            />
          ) : (
            <div className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
              {totals.oneTo5MinTime.toFixed(1)}
            </div>
          )}
        </div>

        {/* Card 4: 1-5min Idle Rate(%) */}
        <div
          onClick={() =>
            setEditingKpiField({
              field: 'oneTo5MinRate',
              val: String(totals.oneTo5MinRate),
            })
          }
          className="bg-[#2b7a8b] text-white py-2.5 px-3 text-center shadow-xs cursor-pointer hover:brightness-105 transition-all"
          title={t('คลิกเพื่อแก้ไขตัวเลข', 'Click to edit value', '点击修改数值')}
        >
          <div className="text-xs font-semibold text-white/95">{'1-5min Idle Rate(%)'}</div>
          {editingKpiField?.field === 'oneTo5MinRate' ? (
            <input
              autoFocus
              type="number"
              step="0.1"
              value={editingKpiField.val}
              onChange={e => setEditingKpiField({ ...editingKpiField, val: e.target.value })}
              onBlur={handleCommitKpiEdit}
              onKeyDown={e => e.key === 'Enter' && handleCommitKpiEdit()}
              className="w-24 text-center bg-white text-slate-900 font-black text-2xl rounded mt-1"
            />
          ) : (
            <div className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
              {totals.oneTo5MinRate.toFixed(1)}%
            </div>
          )}
        </div>

        {/* Card 5: >5min Idle Time(h) */}
        <div
          onClick={() =>
            setEditingKpiField({
              field: 'over5MinTime',
              val: String(totals.over5MinTime),
            })
          }
          className="bg-[#39608f] text-white py-2.5 px-3 text-center shadow-xs cursor-pointer hover:brightness-105 transition-all"
          title={t('คลิกเพื่อแก้ไขตัวเลข', 'Click to edit value', '点击修改数值')}
        >
          <div className="text-xs font-semibold text-white/95">{'>5min Idle Time(h)'}</div>
          {editingKpiField?.field === 'over5MinTime' ? (
            <input
              autoFocus
              type="number"
              step="0.1"
              value={editingKpiField.val}
              onChange={e => setEditingKpiField({ ...editingKpiField, val: e.target.value })}
              onBlur={handleCommitKpiEdit}
              onKeyDown={e => e.key === 'Enter' && handleCommitKpiEdit()}
              className="w-24 text-center bg-white text-slate-900 font-black text-2xl rounded mt-1"
            />
          ) : (
            <div className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
              {totals.over5MinTime.toFixed(1)}
            </div>
          )}
        </div>

        {/* Card 6: >5min Idle Rate(%) */}
        <div
          onClick={() =>
            setEditingKpiField({
              field: 'over5MinRate',
              val: String(totals.over5MinRate),
            })
          }
          className="bg-[#39608f] text-white py-2.5 px-3 text-center shadow-xs cursor-pointer hover:brightness-105 transition-all"
          title={t('คลิกเพื่อแก้ไขตัวเลข', 'Click to edit value', '点击修改数值')}
        >
          <div className="text-xs font-semibold text-white/95">{'>5min Idle Rate(%)'}</div>
          {editingKpiField?.field === 'over5MinRate' ? (
            <input
              autoFocus
              type="number"
              step="0.1"
              value={editingKpiField.val}
              onChange={e => setEditingKpiField({ ...editingKpiField, val: e.target.value })}
              onBlur={handleCommitKpiEdit}
              onKeyDown={e => e.key === 'Enter' && handleCommitKpiEdit()}
              className="w-24 text-center bg-white text-slate-900 font-black text-2xl rounded mt-1"
            />
          ) : (
            <div className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
              {totals.over5MinRate.toFixed(1)}%
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          3. ROW OF 3 MONTHLY COMBO TREND CHARTS
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {renderComboTrendChart(
          '>1min Idle Trend',
          '>1Min Time(hour)',
          '>1Min Rate(%)',
          '#0b65b8',
          'over1MinTime',
          'over1MinRate',
          620,
          20,
          80,
          ['80%', '50%', '20%']
        )}

        {renderComboTrendChart(
          '1 - 5min Idle Trend',
          '>1-5min time(hour)',
          '>1-5min rate(%)',
          '#2b7a8b',
          'oneTo5MinTime',
          'oneTo5MinRate',
          460,
          30,
          50,
          ['50%', '40%', '30%']
        )}

        {renderComboTrendChart(
          '5min Idle Trend',
          '>5min time(hour)',
          '>5min rate(%)',
          '#39608f',
          'over5MinTime',
          'over5MinRate',
          200,
          0,
          24,
          ['20%', '10%', '0%']
        )}
      </div>

      {/* =====================================================================
          4. BOTTOM TWO TABLES SIDE BY SIDE:
             Left: Plant Summary Table | Right: Daily Breakdown Table
         ===================================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-stretch">
        {/* Bottom-Left: Plant Summary Table */}
        <div className="xl:col-span-5 bg-white rounded-xs border border-slate-200/90 shadow-2xs p-3 flex flex-col justify-between">
          <div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="text-white font-semibold">
                    <th className="bg-[#0b65b8] border-r border-white/20 px-2.5 py-2 text-left min-w-[115px]">
                      Plant Name
                    </th>
                    <th className="bg-[#d95f5f] border-r border-white/20 px-2 py-2 text-right">
                      Work
                      <br />
                      Time
                    </th>
                    <th className="bg-[#0b65b8] border-r border-white/20 px-2 py-2 text-right">
                      {'>1 min'}
                      <br />
                      time
                    </th>
                    <th className="bg-[#0b65b8] border-r border-white/20 px-2 py-2 text-right">
                      {'>1 min'}
                      <br />
                      rate
                    </th>
                    <th className="bg-[#2b7a8b] border-r border-white/20 px-2 py-2 text-right">
                      {'>1-5min'}
                      <br />
                      time
                    </th>
                    <th className="bg-[#2b7a8b] border-r border-white/20 px-2 py-2 text-right">
                      {'>1-5min'}
                      <br />
                      rate
                    </th>
                    <th className="bg-[#39608f] border-r border-white/20 px-2 py-2 text-right">
                      {'>5min'}
                      <br />
                      time
                    </th>
                    <th className="bg-[#39608f] px-2 py-2 text-right">
                      {'>5min'}
                      <br />
                      rate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1: Plant Summary Row (Clickable to edit!) */}
                  <tr className="border-b border-slate-200 hover:bg-blue-50/40">
                    <td className="px-2.5 py-2 font-medium text-slate-800 whitespace-nowrap">
                      {data.plant}
                    </td>
                    <td
                      onClick={() =>
                        setEditingKpiField({
                          field: 'workTimeTotal',
                          val: String(totals.workTimeTotal),
                        })
                      }
                      className="px-2 py-2 text-right font-medium text-slate-800 cursor-pointer hover:bg-blue-100"
                    >
                      {editingKpiField?.field === 'workTimeTotal' ? (
                        <input
                          autoFocus
                          type="number"
                          step="0.01"
                          value={editingKpiField.val}
                          onChange={e =>
                            setEditingKpiField({ ...editingKpiField, val: e.target.value })
                          }
                          onBlur={handleCommitKpiEdit}
                          onKeyDown={e => e.key === 'Enter' && handleCommitKpiEdit()}
                          className="w-16 text-right bg-white border border-[#0b65b8] rounded px-1"
                        />
                      ) : (
                        totals.workTimeTotal.toFixed(2)
                      )}
                    </td>
                    <td
                      onClick={() =>
                        setEditingKpiField({
                          field: 'over1MinTime',
                          val: String(totals.over1MinTime),
                        })
                      }
                      className="px-2 py-2 text-right font-medium text-slate-800 cursor-pointer hover:bg-blue-100"
                    >
                      {totals.over1MinTime.toFixed(1)}
                    </td>
                    <td
                      onClick={() =>
                        setEditingKpiField({
                          field: 'over1MinRate',
                          val: String(totals.over1MinRate),
                        })
                      }
                      className="px-2 py-2 text-right font-semibold text-red-500 cursor-pointer hover:bg-blue-100"
                    >
                      {totals.over1MinRate.toFixed(1)}%
                    </td>
                    <td
                      onClick={() =>
                        setEditingKpiField({
                          field: 'oneTo5MinTime',
                          val: String(totals.oneTo5MinTime),
                        })
                      }
                      className="px-2 py-2 text-right font-medium text-slate-800 cursor-pointer hover:bg-blue-100"
                    >
                      {totals.oneTo5MinTime.toFixed(2)}
                    </td>
                    <td
                      onClick={() =>
                        setEditingKpiField({
                          field: 'oneTo5MinRate',
                          val: String(totals.oneTo5MinRate),
                        })
                      }
                      className="px-2 py-2 text-right font-semibold text-red-500 cursor-pointer hover:bg-blue-100"
                    >
                      {totals.oneTo5MinRate.toFixed(1)}%
                    </td>
                    <td
                      onClick={() =>
                        setEditingKpiField({
                          field: 'over5MinTime',
                          val: String(totals.over5MinTime),
                        })
                      }
                      className="px-2 py-2 text-right font-medium text-slate-800 cursor-pointer hover:bg-blue-100"
                    >
                      {totals.over5MinTime.toFixed(1)}
                    </td>
                    <td
                      onClick={() =>
                        setEditingKpiField({
                          field: 'over5MinRate',
                          val: String(totals.over5MinRate),
                        })
                      }
                      className="px-2 py-2 text-right font-semibold text-red-500 cursor-pointer hover:bg-blue-100"
                    >
                      {totals.over5MinRate.toFixed(1)}%
                    </td>
                  </tr>

                  {/* Total Row */}
                  <tr className="border-t-2 border-[#0b65b8] font-bold text-slate-900">
                    <td className="px-2.5 py-2">Total</td>
                    <td className="px-2 py-2 text-right">{totals.workTimeTotal.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right">{totals.over1MinTime.toFixed(1)}</td>
                    <td className="px-2 py-2 text-right">{totals.over1MinRate.toFixed(1)}%</td>
                    <td className="px-2 py-2 text-right">{totals.oneTo5MinTime.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right">{totals.oneTo5MinRate.toFixed(1)}%</td>
                    <td className="px-2 py-2 text-right">{totals.over5MinTime.toFixed(1)}</td>
                    <td className="px-2 py-2 text-right">{totals.over5MinRate.toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>
              {t(
                '* คลิกตัวเลขในตารางเพื่อปรับค่า หรือคลิกแก้ไขรายวันในตารางฝั่งขวา',
                '* Click any number to adjust or edit daily rows on the right table',
                '* 点击表中数字即可修改，或在右侧表格按日修改'
              )}
            </span>
          </div>
        </div>

        {/* Bottom-Right: Daily Breakdown Table */}
        <div className="xl:col-span-7 bg-white rounded-xs border border-slate-200/90 shadow-2xs p-3">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="text-white font-semibold">
                  <th className="bg-[#0b65b8] border-r border-white/20 px-2.5 py-2 text-left">
                    Date
                  </th>
                  <th className="bg-[#0b65b8] border-r border-white/20 px-2.5 py-2 text-left">
                    Plant Name
                  </th>
                  <th className="bg-[#d95f5f] border-r border-white/20 px-2 py-2 text-right">
                    Work
                    <br />
                    Time
                  </th>
                  <th className="bg-[#0b65b8] border-r border-white/20 px-2 py-2 text-right">
                    {'>1 min'}
                    <br />
                    time
                  </th>
                  <th className="bg-[#0b65b8] border-r border-white/20 px-2 py-2 text-right">
                    {'>1 min'}
                    <br />
                    rate
                  </th>
                  <th className="bg-[#2b7a8b] border-r border-white/20 px-2 py-2 text-right">
                    {'>1-5min'}
                    <br />
                    time
                  </th>
                  <th className="bg-[#2b7a8b] border-r border-white/20 px-2 py-2 text-right">
                    {'>1-5min'}
                    <br />
                    rate
                  </th>
                  <th className="bg-[#39608f] border-r border-white/20 px-2 py-2 text-right">
                    {'>5min'}
                    <br />
                    time
                  </th>
                  <th className="bg-[#39608f] px-2 py-2 text-right">
                    {'>5min'}
                    <br />
                    rate
                  </th>
                  <th className="bg-[#39608f] px-1.5 py-2 text-center w-7" title="Delete">
                    #
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.dailyRows.map((row, idx) => {
                  const rOver1 = getDailyOver1MinRate(row);
                  const r1To5 = getDaily1To5MinRate(row);
                  const rOver5 = getDailyOver5MinRate(row);

                  // Green vs Red coloring matching screenshot (e.g. 2026/10/9 has 27.5% green, 26.8% green, 0.7% green)
                  const isLowOver1 = rOver1 <= 28.0;
                  const isLow1To5 = r1To5 <= 27.0;
                  const isLowOver5 = rOver5 <= 0.8;

                  const renderEditableCell = (
                    field: keyof LineIdleDailyRow,
                    displayVal: string | number,
                    extraClass = ''
                  ) => {
                    const isEditing =
                      editingDailyCell?.rowId === row.id &&
                      editingDailyCell?.field === field;

                    return (
                      <td
                        onClick={() =>
                          setEditingDailyCell({
                            rowId: row.id,
                            field,
                            val: String(row[field] ?? displayVal).replace('%', ''),
                          })
                        }
                        className={`px-2 py-1.5 cursor-pointer hover:bg-blue-50 transition-colors ${extraClass}`}
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            type={field === 'date' || field === 'plantName' ? 'text' : 'number'}
                            step="0.01"
                            value={editingDailyCell.val}
                            onChange={e =>
                              setEditingDailyCell({
                                ...editingDailyCell,
                                val: e.target.value,
                              })
                            }
                            onBlur={handleCommitDailyCell}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleCommitDailyCell();
                              if (e.key === 'Escape') setEditingDailyCell(null);
                            }}
                            className="w-16 text-right bg-white border border-[#0b65b8] rounded px-1 py-0.5 text-xs font-bold focus:outline-none"
                          />
                        ) : (
                          displayVal
                        )}
                      </td>
                    );
                  };

                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-100 ${
                        idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'
                      }`}
                    >
                      {renderEditableCell('date', row.date, 'text-left font-medium text-slate-800 whitespace-nowrap')}
                      {renderEditableCell('plantName', row.plantName, 'text-left text-slate-800 whitespace-nowrap')}
                      {renderEditableCell('workTime', row.workTime.toFixed(2), 'text-right text-slate-800')}
                      {renderEditableCell('idleOver1MinTime', row.idleOver1MinTime.toFixed(1), 'text-right text-slate-800')}
                      {renderEditableCell(
                        'idleOver1MinRate',
                        `${rOver1.toFixed(1)}%`,
                        `text-right font-semibold ${isLowOver1 ? 'text-emerald-600' : 'text-red-500'}`
                      )}
                      {renderEditableCell('idle1To5MinTime', row.idle1To5MinTime.toFixed(2), 'text-right text-slate-800')}
                      {renderEditableCell(
                        'idle1To5MinRate',
                        `${r1To5.toFixed(1)}%`,
                        `text-right font-semibold ${isLow1To5 ? 'text-emerald-600' : 'text-red-500'}`
                      )}
                      {renderEditableCell('idleOver5MinTime', row.idleOver5MinTime.toFixed(1), 'text-right text-slate-800')}
                      {renderEditableCell(
                        'idleOver5MinRate',
                        `${rOver5.toFixed(1)}%`,
                        `text-right font-semibold ${isLowOver5 ? 'text-emerald-600' : 'text-red-500'}`
                      )}
                      <td className="px-1 py-1.5 text-center">
                        <button
                          onClick={() => handleDeleteDailyRow(row.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors cursor-pointer"
                          title={t('ลบแถวนี้', 'Delete row', '删除此行')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {/* Total Row */}
                <tr className="border-t-2 border-[#0b65b8] font-bold text-slate-900 bg-slate-50">
                  <td className="px-2.5 py-2" colSpan={2}>
                    Total
                  </td>
                  <td className="px-2 py-2 text-right">{totals.workTimeTotal.toFixed(2)}</td>
                  <td className="px-2 py-2 text-right">{totals.over1MinTime.toFixed(1)}</td>
                  <td className="px-2 py-2 text-right">{totals.over1MinRate.toFixed(1)}%</td>
                  <td className="px-2 py-2 text-right">{totals.oneTo5MinTime.toFixed(2)}</td>
                  <td className="px-2 py-2 text-right">{totals.oneTo5MinRate.toFixed(1)}%</td>
                  <td className="px-2 py-2 text-right">{totals.over5MinTime.toFixed(1)}</td>
                  <td className="px-2 py-2 text-right">{totals.over5MinRate.toFixed(1)}%</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* =====================================================================
          5. BOTTOM TARGET REFERENCE BAR (Matching exact bottom bar of screenshot)
         ===================================================================== */}
      <div className="bg-white px-4 py-2 rounded-xs border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-800">
        {showTargetEditor ? (
          <div className="flex flex-wrap items-center gap-4 w-full">
            <div className="flex items-center gap-1.5">
              <span>{'>1 min Tgt(%):'}</span>
              <input
                type="number"
                step="0.01"
                value={data.targets.over1MinTgt}
                onChange={e =>
                  onUpdateData({
                    ...data,
                    targets: { ...data.targets, over1MinTgt: Number(e.target.value) },
                  })
                }
                className="w-16 border border-slate-300 rounded px-1.5 py-0.5"
              />
              <span>2024_Tgt(%):</span>
              <input
                type="number"
                step="0.01"
                value={data.targets.over1Min2024Tgt}
                onChange={e =>
                  onUpdateData({
                    ...data,
                    targets: { ...data.targets, over1Min2024Tgt: Number(e.target.value) },
                  })
                }
                className="w-16 border border-slate-300 rounded px-1.5 py-0.5"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span>1-5 min Tgt(%):</span>
              <input
                type="number"
                step="0.01"
                value={data.targets.oneTo5MinTgt}
                onChange={e =>
                  onUpdateData({
                    ...data,
                    targets: { ...data.targets, oneTo5MinTgt: Number(e.target.value) },
                  })
                }
                className="w-16 border border-slate-300 rounded px-1.5 py-0.5"
              />
              <span>2024_Tgt(%):</span>
              <input
                type="number"
                step="0.01"
                value={data.targets.oneTo5Min2024Tgt}
                onChange={e =>
                  onUpdateData({
                    ...data,
                    targets: { ...data.targets, oneTo5Min2024Tgt: Number(e.target.value) },
                  })
                }
                className="w-16 border border-slate-300 rounded px-1.5 py-0.5"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span>{'>5 min Tgt(%):'}</span>
              <input
                type="number"
                step="0.01"
                value={data.targets.over5MinTgt}
                onChange={e =>
                  onUpdateData({
                    ...data,
                    targets: { ...data.targets, over5MinTgt: Number(e.target.value) },
                  })
                }
                className="w-16 border border-slate-300 rounded px-1.5 py-0.5"
              />
              <span>2024_Tgt(%):</span>
              <input
                type="number"
                step="0.01"
                value={data.targets.over5Min2024Tgt}
                onChange={e =>
                  onUpdateData({
                    ...data,
                    targets: { ...data.targets, over5Min2024Tgt: Number(e.target.value) },
                  })
                }
                className="w-16 border border-slate-300 rounded px-1.5 py-0.5"
              />
            </div>

            <button
              onClick={() => setShowTargetEditor(false)}
              className="px-2.5 py-0.5 bg-[#0b65b8] text-white rounded cursor-pointer"
            >
              {t('ตกลง', 'Done', '完成')}
            </button>
          </div>
        ) : (
          <div
            onClick={() => setShowTargetEditor(true)}
            className="flex flex-wrap items-center gap-8 cursor-pointer hover:text-[#0b65b8]"
            title={t('คลิกเพื่อแก้ไขค่าเป้าหมาย Tgt%', 'Click to edit Target %', '点击修改目标百分比')}
          >
            <span>
              {`>1 min   Tgt:${data.targets.over1MinTgt}%  2024_Tgt:${data.targets.over1Min2024Tgt}%`}
            </span>
            <span>
              {`1-5 min   Tgt:${data.targets.oneTo5MinTgt}%  2024_Tgt:${data.targets.oneTo5Min2024Tgt}%`}
            </span>
            <span>
              {`>5 min   Tgt:${data.targets.over5MinTgt}%  2024_Tgt:${data.targets.over5Min2024Tgt}%`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

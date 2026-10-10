import React, { useState, useMemo } from 'react';
import { MonthlyTrendItem, DayColumn, LineOECData } from '../types/oec';
import { 
  LineChart as LineChartIcon
} from 'lucide-react';
import { useAppPreferences } from '../contexts/AppPreferencesContext';

interface OecChartsProps {
  monthlyProduction: MonthlyTrendItem[];
  monthlyUph: MonthlyTrendItem[];
  days: DayColumn[];
  lines: LineOECData[];
  selectedProdLine?: string;
}

export const OecCharts: React.FC<OecChartsProps> = ({
  monthlyProduction,
  monthlyUph,
  days,
  lines,
}) => {
  const { currentTheme, t } = useAppPreferences();
  // View mode: 'daily' (directly plots table days) or 'monthly' (plots monthly trend where current month is synced with table)
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('monthly');
  // Comparison mode: 'lines' (Line A vs Line B) or 'planAct' (Planning vs Actual)
  const [comparisonMode, setComparisonMode] = useState<'lines' | 'planAct'>('lines');
  const [hoveredIndex, setHoveredIndex] = useState<{ chart: 'prod' | 'uph'; idx: number } | null>(null);

  // Extract Line A and Line B dynamically
  const lineA = useMemo(() => {
    return lines.find(l => l.prodLine.toLowerCase().includes('a')) || lines[0] || null;
  }, [lines]);

  const lineB = useMemo(() => {
    return lines.find(l => l.prodLine.toLowerCase().includes('b')) || (lines.length > 1 ? lines[1] : null);
  }, [lines]);

  // 1. Daily Data (Directly extracted from each day column in the Daily Table)
  const dailyData = useMemo(() => {
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

      const totalPlan = aPlan + bPlan;
      const totalAct = aAct + bAct;
      const totalWt = aWt + bWt;
      const combinedUph = totalWt > 0 ? Math.round(totalAct / totalWt) : 0;

      return {
        label: `${d.day} ${d.weekday}`,
        day: d.day,
        weekday: d.weekday,
        // Line comparison
        lineAProd: aAct,
        lineBProd: bAct,
        lineAUph: aUph,
        lineBUph: bUph,
        // Plan vs Act comparison (if filtered or selected)
        totalPlan,
        totalAct,
        combinedUph,
        // Detailed metrics for tooltip
        aPlan,
        aAct,
        aGap,
        aWt,
        bPlan,
        bAct,
        bGap,
        bWt,
      };
    });
  }, [days, lineA, lineB]);

  // 2. Monthly Data (Live synchronized with table for the latest month)
  const monthlyData = useMemo(() => {
    return monthlyProduction.map((m, idx) => {
      const uphItem = monthlyUph[idx] || { lineA: 0, lineB: 0 };
      const totPlan = m.lineA + m.lineB; // approximation or direct
      const totAct = m.lineA + m.lineB;
      const avgUph = Math.round((uphItem.lineA + uphItem.lineB) / 2);

      return {
        label: m.month,
        lineAProd: m.lineA,
        lineBProd: m.lineB,
        lineAUph: uphItem.lineA,
        lineBUph: uphItem.lineB,
        totalPlan: totPlan,
        totalAct: totAct,
        combinedUph: avgUph,
      };
    });
  }, [monthlyProduction, monthlyUph]);

  // Active dataset depending on view mode
  const activeDataset = viewMode === 'daily' ? dailyData : monthlyData;

  // Helper to build smooth SVG path using Catmull-Rom to Cubic Bezier
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

  const renderLineChart = (
    title: string,
    chartType: 'prod' | 'uph',
    unit: string
  ) => {
    // Dynamic width for daily mode if many points
    const pointCount = activeDataset.length;
    const minWidth = viewMode === 'daily' ? Math.max(680, pointCount * 36) : 600;
    const svgWidth = minWidth;
    const svgHeight = 220;
    const padding = { top: 38, right: 35, bottom: 45, left: 30 };

    const innerWidth = svgWidth - padding.left - padding.right;
    const innerHeight = svgHeight - padding.top - padding.bottom;

    // Determine series 1 and series 2 based on comparison mode
    let series1Name = lineA?.prodLine || 'Line A';
    let series2Name = lineB?.prodLine || 'Line B';
    let color1 = currentTheme.primaryHex;
    let color2 = currentTheme.secondaryHex;

    if (comparisonMode === 'planAct') {
      series1Name = t('ยอดผลิตจริง (Actual)', 'Actual Output', '实际产量 (Actual)');
      series2Name = t('เป้าหมาย (Planning)', 'Planned Target', '计划目标 (Planning)');
      color1 = currentTheme.primaryHex;
      color2 = '#f59e0b';
    }

    // Extract values
    const dataPoints = activeDataset.map((d: any, idx: number) => {
      let val1 = 0;
      let val2 = 0;

      if (chartType === 'prod') {
        if (comparisonMode === 'lines') {
          val1 = d.lineAProd;
          val2 = d.lineBProd;
        } else {
          val1 = d.totalAct;
          val2 = d.totalPlan;
        }
      } else {
        // UPH chart
        if (comparisonMode === 'lines') {
          val1 = d.lineAUph;
          val2 = d.lineBUph;
        } else {
          val1 = d.combinedUph;
          val2 = 110; // Target benchmark UPH
        }
      }

      return {
        label: d.label,
        val1,
        val2,
        raw: d,
      };
    });

    const allValues = dataPoints.flatMap(d => [d.val1, d.val2]).filter(v => v !== undefined && v !== null && !isNaN(v));
    const rawMax = Math.max(...allValues, 10);
    const maxVal = chartType === 'uph' ? Math.max(rawMax * 1.15, 140) : rawMax * 1.15;
    const minVal = 0;

    const getX = (index: number) => {
      if (dataPoints.length <= 1) return padding.left + innerWidth / 2;
      return padding.left + (index / (dataPoints.length - 1)) * innerWidth;
    };

    const getY = (val: number) => {
      const clamped = Math.max(minVal, Math.min(maxVal, val));
      return padding.top + innerHeight - ((clamped - minVal) / (maxVal - minVal)) * innerHeight;
    };

    const points1 = dataPoints.map((d, i) => ({ x: getX(i), y: getY(d.val1), val: d.val1, label: d.label }));
    const points2 = dataPoints.map((d, i) => ({ x: getX(i), y: getY(d.val2), val: d.val2, label: d.label }));

    const path1 = createSmoothPath(points1);
    const path2 = createSmoothPath(points2);

    return (
      <div className="bg-white rounded-md border border-slate-200 p-4 shadow-xs flex flex-col justify-between relative">
        {/* Header & Legends matching screenshot */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
            {viewMode === 'daily' && (
              <span className="text-[10px] bg-blue-50 text-[#0070c0] font-bold px-1.5 py-0.5 rounded border border-blue-200">
                Daily Linked
              </span>
            )}
            {viewMode === 'monthly' && (
              <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded border border-slate-200">
                Monthly YTD
              </span>
            )}
          </div>

          {/* Legends */}
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color1 }} />
              <span>{series1Name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color2 }} />
              <span>{series2Name}</span>
            </div>
          </div>
        </div>

        {/* SVG Chart with horizontal scrolling for Daily view */}
        <div className="w-full overflow-x-auto select-none pb-1 scrollbar-thin">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            style={{ minWidth: `${minWidth}px`, width: '100%', height: 'auto' }}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Horizontal Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const y = padding.top + innerHeight * ratio;
              return (
                <line
                  key={idx}
                  x1={padding.left}
                  y1={y}
                  x2={svgWidth - padding.right}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              );
            })}

            {/* Path 2 (Series 2 - Navy Blue for Line B or Amber for Plan) */}
            <path
              d={path2}
              fill="none"
              stroke={color2}
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={comparisonMode === 'planAct' ? '4 3' : 'none'}
            />

            {/* Path 1 (Series 1 - Light Blue for Line A or Blue for Act) */}
            <path
              d={path1}
              fill="none"
              stroke={color1}
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Points & Data Labels for Series 2 */}
            {points2.map((pt, i) => {
              const isHovered = hoveredIndex?.chart === chartType && hoveredIndex?.idx === i;
              const labelY = pt.y > points1[i].y ? pt.y + 14 : pt.y - 8;

              return (
                <g key={`s2-${i}`} className="cursor-pointer">
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 5.5 : 3.5}
                    fill={color2}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    onMouseEnter={() => setHoveredIndex({ chart: chartType, idx: i })}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                  {/* Data Label directly on point like screenshot */}
                  <text
                    x={pt.x}
                    y={labelY}
                    textAnchor="middle"
                    className="text-[9.5px] font-medium fill-slate-700 pointer-events-none"
                  >
                    {pt.val > 0 ? pt.val.toLocaleString() : ''}
                  </text>
                </g>
              );
            })}

            {/* Points & Data Labels for Series 1 */}
            {points1.map((pt, i) => {
              const isHovered = hoveredIndex?.chart === chartType && hoveredIndex?.idx === i;
              const labelY = pt.y <= points2[i].y ? pt.y - 9 : pt.y + 14;

              return (
                <g key={`s1-${i}`} className="cursor-pointer">
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 5.5 : 3.5}
                    fill={color1}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    onMouseEnter={() => setHoveredIndex({ chart: chartType, idx: i })}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                  {/* Data Label directly on point like screenshot */}
                  <text
                    x={pt.x}
                    y={labelY}
                    textAnchor="middle"
                    className="text-[9.5px] font-medium fill-slate-700 pointer-events-none"
                  >
                    {pt.val > 0 ? pt.val.toLocaleString() : ''}
                  </text>
                </g>
              );
            })}

            {/* X Axis Labels */}
            {dataPoints.map((d, i) => {
              const x = getX(i);
              return (
                <text
                  key={`lbl-${i}`}
                  x={x}
                  y={svgHeight - 12}
                  textAnchor="middle"
                  className="text-[9px] sm:text-[10px] fill-slate-500 font-medium"
                >
                  {d.label}
                </text>
              );
            })}

            {/* Hover Tooltip Overlay */}
            {hoveredIndex?.chart === chartType && (
              <g>
                {(() => {
                  const idx = hoveredIndex.idx;
                  const item = dataPoints[idx];
                  const raw = item.raw;
                  const x = getX(idx);
                  const isRightSide = x > svgWidth - 130;
                  const tooltipX = isRightSide ? x - 135 : x + 10;
                  const tooltipY = padding.top;

                  return (
                    <g className="pointer-events-none">
                      <line
                        x1={x}
                        y1={padding.top}
                        x2={x}
                        y2={svgHeight - padding.bottom}
                        stroke="#94a3b8"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                      />
                      <rect
                        x={tooltipX}
                        y={tooltipY}
                        width="125"
                        height={viewMode === 'daily' ? 70 : 55}
                        rx="5"
                        fill="#0f172a"
                        opacity="0.94"
                      />
                      <text x={tooltipX + 8} y={tooltipY + 14} fill="#e2e8f0" fontSize="9.5" fontWeight="bold">
                        {item.label} (ตาราง OEC)
                      </text>
                      <text x={tooltipX + 8} y={tooltipY + 29} fill="#38bdf8" fontSize="9.5" fontWeight="bold">
                        {series1Name}: {item.val1.toLocaleString()} {unit}
                      </text>
                      <text x={tooltipX + 8} y={tooltipY + 44} fill="#93c5fd" fontSize="9.5" fontWeight="bold">
                        {series2Name}: {item.val2.toLocaleString()} {unit}
                      </text>
                      {viewMode === 'daily' && raw && (
                        <text x={tooltipX + 8} y={tooltipY + 59} fill="#cbd5e1" fontSize="8.5">
                          Work Time: A({raw.aWt}h) · B({raw.bWt}h)
                        </text>
                      )}
                    </g>
                  );
                })()}
              </g>
            )}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="mb-5">
      {/* Chart Control Toolbar & Linking Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-2.5 bg-slate-50/80 p-2 rounded-md border border-slate-200">
        
        {/* Title and Live Sync Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
            <LineChartIcon className="w-4 h-4 text-[#0070c0]" />
            <span>{t('Production & Efficiency Trends (แนวโน้มการผลิตและประสิทธิภาพ)', 'Production & Efficiency Trends', '生产与效率趋势分析 (Trends)')}</span>
          </span>
          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[11px] font-semibold px-2 py-0.5 rounded border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{t('เชื่อมโยงกับตารางบนเว็บแบบ Real-Time', 'Live Synced with Web Table', '与网页表格实时联动')}</span>
          </div>
        </div>

        {/* View Switchers */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Comparison Mode Toggle */}
          <div className="flex items-center bg-white p-0.5 rounded border border-slate-200 shadow-2xs">
            <button
              onClick={() => setComparisonMode('lines')}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                comparisonMode === 'lines'
                  ? 'bg-blue-50 text-[#0070c0] font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Line A vs Line B
            </button>
            <button
              onClick={() => setComparisonMode('planAct')}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                comparisonMode === 'planAct'
                  ? 'bg-blue-50 text-[#0070c0] font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('Plan vs Actual (แผน vs จริง)', 'Plan vs Actual', '计划 vs 实际')}
            </button>
          </div>

          {/* Time Horizon Toggle (Monthly vs Daily) */}
          <div className="flex items-center bg-white p-0.5 rounded border border-slate-200 shadow-2xs">
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                viewMode === 'monthly'
                  ? 'bg-[#0070c0] text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('รายเดือน (Monthly YTD)', 'Monthly YTD', '月度趋势 (Monthly)')}
            </button>
            <button
              onClick={() => setViewMode('daily')}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                viewMode === 'daily'
                  ? 'bg-[#0070c0] text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('รายวัน (ตามตาราง Daily)', 'Daily (1-25)', '每日趋势 (Daily)')}
            </button>
          </div>
        </div>
      </div>

      {/* Two Side-by-Side Charts matching screenshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {renderLineChart(t('Production (ยอดการผลิต)', 'Production Output', '产量趋势 (Production)'), 'prod', t('ชิ้น', 'pcs', '台'))}
        {renderLineChart(t('UPH (ประสิทธิภาพต่อชั่วโมง)', 'UPH Efficiency', '每小时产出效率 (UPH)'), 'uph', 'UPH')}
      </div>

      {/* Helpful Hint */}
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 px-1">
        <span>
          💡 {viewMode === 'daily' 
            ? t(
                'กราฟกำลังแสดงข้อมูลรายวันตามคอลัมน์ในตารางด้านล่าง: แก้ไขตัวเลข Act หรือ Work Time เส้นกราฟจะขยับทันที',
                'Chart displays daily columns from the table below: editing Act or Work Time updates the chart immediately.',
                '图表正在显示下方表格的每日数据：修改实际产量或工时将实时更新曲线。'
              )
            : t(
                'กราฟรายเดือนสะสม (2026-01 ถึง 2026-09): เดือนล่าสุดจะอัปเดตยอดรวมและ UPH ตามตารางด้านล่างโดยอัตโนมัติ',
                'Cumulative monthly trend (2026-01 to 2026-09): latest month automatically syncs totals & UPH from the table below.',
                '月度累计趋势 (2026-01 至 2026-09)：最新月份自动同步下方表格的总产量与 UPH。'
              )}
        </span>
        <span className="font-semibold text-[#0070c0] hidden sm:inline">
          {viewMode === 'daily'
            ? t(`แสดง ${days.length} วันทำการ`, `Showing ${days.length} working days`, `显示 ${days.length} 个工作日`)
            : t(`แสดง ${activeDataset.length} งวดเดือน`, `Showing ${activeDataset.length} months`, `显示 ${activeDataset.length} 个月份`)}
        </span>
      </div>
    </div>
  );
};

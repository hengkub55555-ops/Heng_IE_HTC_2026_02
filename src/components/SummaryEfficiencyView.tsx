import React, { useState, useMemo } from 'react';
import { MonthlyEfficiencyRow } from '../types/oec';
import { 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Target, 
  Clock, 
  FileSpreadsheet, 
  Download, 
  Plus, 
  Edit3, 
  Check, 
  X, 
  BarChart2, 
  Layers, 
  Award,
  AlertCircle,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAppPreferences } from '../contexts/AppPreferencesContext';

interface SummaryEfficiencyViewProps {
  data: MonthlyEfficiencyRow[];
  onUpdateData: (newData: MonthlyEfficiencyRow[]) => void;
  plantName: string;
}

export const SummaryEfficiencyView: React.FC<SummaryEfficiencyViewProps> = ({
  data,
  onUpdateData,
  plantName,
}) => {
  const { t } = useAppPreferences();
  const [activeChartTab, setActiveChartTab] = useState<'uph' | 'volume'>('uph');
  const [editingCell, setEditingCell] = useState<{
    index: number;
    field: keyof MonthlyEfficiencyRow;
    val: string;
  } | null>(null);

  const [showAddMonthModal, setShowAddMonthModal] = useState(false);
  const [newMonthStr, setNewMonthStr] = useState('2026-10');
  const [newMonthTh, setNewMonthTh] = useState('ต.ค. 2026');

  // Compute YTD Sums and Averages
  const ytdStats = useMemo(() => {
    let lineAPlanYTD = 0;
    let lineAActYTD = 0;
    let lineAWorkHoursYTD = 0;

    let lineBPlanYTD = 0;
    let lineBActYTD = 0;
    let lineBWorkHoursYTD = 0;

    data.forEach(row => {
      lineAPlanYTD += Number(row.lineAPlan || 0);
      lineAActYTD += Number(row.lineAAct || 0);
      lineAWorkHoursYTD += Number(row.lineAWorkHours || 0);

      lineBPlanYTD += Number(row.lineBPlan || 0);
      lineBActYTD += Number(row.lineBAct || 0);
      lineBWorkHoursYTD += Number(row.lineBWorkHours || 0);
    });

    const totalPlantPlanYTD = lineAPlanYTD + lineBPlanYTD;
    const totalPlantActYTD = lineAActYTD + lineBActYTD;
    const totalPlantWorkHoursYTD = lineAWorkHoursYTD + lineBWorkHoursYTD;
    const totalPlantGapYTD = totalPlantActYTD - totalPlantPlanYTD;

    const lineAAvgUphYTD = lineAWorkHoursYTD > 0 ? Math.round(lineAActYTD / lineAWorkHoursYTD) : 0;
    const lineBAvgUphYTD = lineBWorkHoursYTD > 0 ? Math.round(lineBActYTD / lineBWorkHoursYTD) : 0;
    const plantAvgUphYTD = totalPlantWorkHoursYTD > 0 ? Math.round(totalPlantActYTD / totalPlantWorkHoursYTD) : 0;

    const lineAAchieveRate = lineAPlanYTD > 0 ? (lineAActYTD / lineAPlanYTD) * 100 : 0;
    const lineBAchieveRate = lineBPlanYTD > 0 ? (lineBActYTD / lineBPlanYTD) * 100 : 0;
    const plantAchieveRate = totalPlantPlanYTD > 0 ? (totalPlantActYTD / totalPlantPlanYTD) * 100 : 0;

    const lineAGapYTD = lineAActYTD - lineAPlanYTD;
    const lineBGapYTD = lineBActYTD - lineBPlanYTD;

    return {
      lineAPlanYTD,
      lineAActYTD,
      lineAWorkHoursYTD,
      lineAAvgUphYTD,
      lineAAchieveRate,
      lineAGapYTD,

      lineBPlanYTD,
      lineBActYTD,
      lineBWorkHoursYTD,
      lineBAvgUphYTD,
      lineBAchieveRate,
      lineBGapYTD,

      totalPlantPlanYTD,
      totalPlantActYTD,
      totalPlantWorkHoursYTD,
      totalPlantGapYTD,
      plantAvgUphYTD,
      plantAchieveRate,

      totalMonths: data.length,
      lineAAvgMonthly: data.length > 0 ? Math.round(lineAActYTD / data.length) : 0,
      lineBAvgMonthly: data.length > 0 ? Math.round(lineBActYTD / data.length) : 0,
    };
  }, [data]);

  // Handle cell edit
  const handleStartEdit = (index: number, field: keyof MonthlyEfficiencyRow, val: any) => {
    setEditingCell({
      index,
      field,
      val: val !== undefined && val !== null ? String(val) : '',
    });
  };

  const handleSaveEdit = () => {
    if (!editingCell) return;
    const { index, field, val } = editingCell;

    const updated = [...data];
    const currentRow = { ...updated[index] };

    if (field === 'notes' || field === 'month' || field === 'monthNameTh') {
      (currentRow as any)[field] = val;
    } else {
      const num = val.trim() === '' ? 0 : Number(val);
      (currentRow as any)[field] = isNaN(num) ? 0 : num;

      // Recalculate derived UPH if workhours or act changed
      if (field === 'lineAAct' || field === 'lineAWorkHours') {
        const act = field === 'lineAAct' ? num : currentRow.lineAAct;
        const hrs = field === 'lineAWorkHours' ? num : currentRow.lineAWorkHours;
        if (hrs > 0) currentRow.lineAUph = Math.round(act / hrs);
      }
      if (field === 'lineBAct' || field === 'lineBWorkHours') {
        const act = field === 'lineBAct' ? num : currentRow.lineBAct;
        const hrs = field === 'lineBWorkHours' ? num : currentRow.lineBWorkHours;
        if (hrs > 0) currentRow.lineBUph = Math.round(act / hrs);
      }
    }

    updated[index] = currentRow;
    onUpdateData(updated);
    setEditingCell(null);
  };

  const handleAddMonth = () => {
    if (!newMonthStr) return;
    if (data.some(d => d.month === newMonthStr)) {
      alert(`เดือน ${newMonthStr} มีอยู่แล้วในตาราง`);
      return;
    }

    const newRow: MonthlyEfficiencyRow = {
      month: newMonthStr,
      monthNameTh: newMonthTh || newMonthStr,
      lineAPlan: 50000,
      lineAAct: 48000,
      lineAUph: 115,
      lineATargetUph: 110,
      lineAWorkHours: 417,
      lineBPlan: 40000,
      lineBAct: 39000,
      lineBUph: 98,
      lineBTargetUph: 100,
      lineBWorkHours: 398,
      notes: 'เพิ่มงวดใหม่',
    };

    onUpdateData([...data, newRow]);
    setShowAddMonthModal(false);
  };

  // Export Summary Sheet to Excel
  const handleExportExcel = () => {
    const headers = [
      'Month',
      'Month (TH)',
      'Line A Plan',
      'Line A Act',
      'Line A Gap',
      'Line A Hours',
      'Line A UPH',
      'Line A Target UPH',
      'Line A Efficiency %',
      'Line B Plan',
      'Line B Act',
      'Line B Gap',
      'Line B Hours',
      'Line B UPH',
      'Line B Target UPH',
      'Line B Efficiency %',
      'Total Plant Plan',
      'Total Plant Act',
      'Total Plant Gap',
      'Total Plant Hours',
      'Plant Avg UPH',
      'Plant Achieve %',
      'Remarks',
    ];

    const rows: (string | number)[][] = [headers];

    data.forEach(r => {
      const aGap = r.lineAAct - r.lineAPlan;
      const aEff = r.lineATargetUph > 0 ? ((r.lineAUph / r.lineATargetUph) * 100).toFixed(1) : '0';
      const bGap = r.lineBAct - r.lineBPlan;
      const bEff = r.lineBTargetUph > 0 ? ((r.lineBUph / r.lineBTargetUph) * 100).toFixed(1) : '0';
      const totPlan = r.lineAPlan + r.lineBPlan;
      const totAct = r.lineAAct + r.lineBAct;
      const totGap = totAct - totPlan;
      const totHrs = r.lineAWorkHours + r.lineBWorkHours;
      const plantUph = totHrs > 0 ? Math.round(totAct / totHrs) : 0;
      const plantAch = totPlan > 0 ? ((totAct / totPlan) * 100).toFixed(1) : '0';

      rows.push([
        r.month,
        r.monthNameTh || '',
        r.lineAPlan,
        r.lineAAct,
        aGap,
        r.lineAWorkHours,
        r.lineAUph,
        r.lineATargetUph,
        `${aEff}%`,
        r.lineBPlan,
        r.lineBAct,
        bGap,
        r.lineBWorkHours,
        r.lineBUph,
        r.lineBTargetUph,
        `${bEff}%`,
        totPlan,
        totAct,
        totGap,
        totHrs,
        plantUph,
        `${plantAch}%`,
        r.notes || '',
      ]);
    });

    // Append Summary Rows
    rows.push([
      'TOTAL YTD',
      `รวม ${data.length} เดือน`,
      ytdStats.lineAPlanYTD,
      ytdStats.lineAActYTD,
      ytdStats.lineAGapYTD,
      ytdStats.lineAWorkHoursYTD,
      ytdStats.lineAAvgUphYTD,
      110,
      `${((ytdStats.lineAAvgUphYTD / 110) * 100).toFixed(1)}%`,
      ytdStats.lineBPlanYTD,
      ytdStats.lineBActYTD,
      ytdStats.lineBGapYTD,
      ytdStats.lineBWorkHoursYTD,
      ytdStats.lineBAvgUphYTD,
      100,
      `${((ytdStats.lineBAvgUphYTD / 100) * 100).toFixed(1)}%`,
      ytdStats.totalPlantPlanYTD,
      ytdStats.totalPlantActYTD,
      ytdStats.totalPlantGapYTD,
      ytdStats.totalPlantWorkHoursYTD,
      ytdStats.plantAvgUphYTD,
      `${ytdStats.plantAchieveRate.toFixed(1)}%`,
      'รายงานสรุปสะสม YTD',
    ]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Summary_Efficiency_YTD');
    XLSX.writeFile(wb, `Summary_Efficiency_LineAB_YTD_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions for Sheet 2 */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-[#0070c0] font-bold text-xs px-2.5 py-1 rounded">
              Sheet: Summary Efficiency
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-xs font-semibold text-slate-600">
              Plant: {plantName}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mt-1">
            {t(
              'สรุปประสิทธิภาพการผลิต Line A & Line B (AVG & Actual YTD)',
              'Summary Production Efficiency Line A & Line B (AVG & Actual YTD)',
              '产线 A 与 产线 B 生产效率汇总 (月均与年度累计 YTD)'
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t(
              'รวบรวมข้อมูลรายเดือน ค่าเฉลี่ยประสิทธิภาพ UPH, ยอดผลิตจริงสะสม (Actual YTD), เปรียบเทียบแผนงาน และดัชนีประสิทธิภาพของแต่ละสายการผลิต',
              'Monthly summary of average UPH efficiency, cumulative Actual YTD output, plan comparison, and performance indices per line.',
              '汇总各月平均 UPH 效率、年度累计实际产量 (Actual YTD)、计划对比及各产线效率指标。'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAddMonthModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded border border-slate-300 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            <span>{t('เพิ่มงวดเดือน', 'Add Month', '新增月份')}</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded shadow-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{t('ส่งออกตารางสรุป YTD (Excel)', 'Export YTD Summary (Excel)', '导出 YTD 汇总表 (Excel)')}</span>
          </button>
        </div>
      </div>

      {/* 4 Executive YTD Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Line A YTD */}
        <div className="bg-gradient-to-br from-[#0284c7] to-[#0369a1] text-white rounded-lg p-4 shadow-sm border border-sky-600 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-200">Line A (ตู้เย็น 2 ประตู)</span>
              <span className="text-[10px] bg-sky-900/60 px-2 py-0.5 rounded font-medium">Actual YTD</span>
            </div>
            <div className="text-3xl font-black tracking-tight">
              {ytdStats.lineAActYTD.toLocaleString()}
              <span className="text-xs font-normal text-sky-200 ml-1">ตัว</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-sky-400/30 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[11px] text-sky-200 block">AVG UPH YTD:</span>
              <span className="font-extrabold text-base text-amber-200 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                {ytdStats.lineAAvgUphYTD}
              </span>
              <span className="text-[10px] text-sky-200">เป้าหมาย 110</span>
            </div>
            <div>
              <span className="text-[11px] text-sky-200 block">บรรลุแผน:</span>
              <span className="font-extrabold text-base text-white">
                {ytdStats.lineAAchieveRate.toFixed(1)}%
              </span>
              <span className="text-[10px] text-sky-200">
                Gap: {ytdStats.lineAGapYTD > 0 ? `+${ytdStats.lineAGapYTD.toLocaleString()}` : ytdStats.lineAGapYTD.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Line B YTD */}
        <div className="bg-gradient-to-br from-[#1e3a8a] to-[#172554] text-white rounded-lg p-4 shadow-sm border border-blue-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-200">Line B (ตู้เย็น 1 ประตู)</span>
              <span className="text-[10px] bg-blue-950/70 px-2 py-0.5 rounded font-medium">Actual YTD</span>
            </div>
            <div className="text-3xl font-black tracking-tight">
              {ytdStats.lineBActYTD.toLocaleString()}
              <span className="text-xs font-normal text-blue-200 ml-1">ตัว</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-blue-400/20 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[11px] text-blue-200 block">AVG UPH YTD:</span>
              <span className="font-extrabold text-base text-amber-300 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                {ytdStats.lineBAvgUphYTD}
              </span>
              <span className="text-[10px] text-blue-200">เป้าหมาย 100</span>
            </div>
            <div>
              <span className="text-[11px] text-blue-200 block">บรรลุแผน:</span>
              <span className="font-extrabold text-base text-white">
                {ytdStats.lineBAchieveRate.toFixed(1)}%
              </span>
              <span className="text-[10px] text-blue-200">
                Gap: {ytdStats.lineBGapYTD > 0 ? `+${ytdStats.lineBGapYTD.toLocaleString()}` : ytdStats.lineBGapYTD.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Plant Production YTD */}
        <div className="bg-[#0070c0] text-white rounded-lg p-4 shadow-sm border border-blue-600 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-100">Total Plant Output</span>
              <span className="text-[10px] bg-blue-900/60 px-2 py-0.5 rounded font-medium">Line A + B YTD</span>
            </div>
            <div className="text-3xl font-black tracking-tight">
              {ytdStats.totalPlantActYTD.toLocaleString()}
              <span className="text-xs font-normal text-blue-100 ml-1">ตัว</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-blue-400/30 flex items-center justify-between text-xs">
            <div>
              <span className="text-[11px] text-blue-100 block">ชั่วโมงทำงานรวม:</span>
              <span className="font-bold text-white flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-200" />
                {ytdStats.totalPlantWorkHoursYTD.toLocaleString()} ชม.
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-blue-100 block">เป้าสะสม YTD:</span>
              <span className="font-bold text-white">
                {ytdStats.totalPlantPlanYTD.toLocaleString()} ตัว
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Overall AVG UPH */}
        <div className="bg-gradient-to-br from-emerald-700 to-teal-900 text-white rounded-lg p-4 shadow-sm border border-emerald-600 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">Factory Combined UPH</span>
              <span className="text-[10px] bg-emerald-950/70 px-2 py-0.5 rounded font-medium">Weighted AVG</span>
            </div>
            <div className="text-3xl font-black tracking-tight flex items-baseline gap-2">
              <span>{ytdStats.plantAvgUphYTD}</span>
              <span className="text-xs font-medium text-emerald-200">Units/Hour</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-emerald-500/30 flex items-center justify-between text-xs">
            <div>
              <span className="text-[11px] text-emerald-200 block">อัตราเฉลี่ยต่อเดือน:</span>
              <span className="font-bold text-white">
                {Math.round(ytdStats.totalPlantActYTD / ytdStats.totalMonths).toLocaleString()} ตัว/ด.
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-emerald-200 block">ดัชนีภาพรวม:</span>
              <span className="font-bold text-emerald-200 flex items-center justify-end gap-0.5">
                <Award className="w-3.5 h-3.5 text-amber-300" />
                {ytdStats.plantAchieveRate.toFixed(1)}% Plan
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Charts: Monthly UPH & Production Trajectory */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#0070c0]" />
              <span>แนวโน้มประสิทธิภาพรายเดือนเปรียบเทียบ Line A vs Line B</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              กราฟแท่งและเส้นเปรียบเทียบประสิทธิภาพ UPH และปริมาณผลผลิตรายเดือนจริง
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded border border-slate-200 text-xs">
            <button
              onClick={() => setActiveChartTab('uph')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                activeChartTab === 'uph' ? 'bg-white text-[#0070c0] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              เปรียบเทียบ UPH (Efficiency)
            </button>
            <button
              onClick={() => setActiveChartTab('volume')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                activeChartTab === 'volume' ? 'bg-white text-[#0070c0] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ยอดผลิตรายเดือน (Volume)
            </button>
          </div>
        </div>

        {/* Chart View */}
        <div className="overflow-x-auto select-none">
          {activeChartTab === 'uph' ? (
            <div className="min-w-[700px] h-64 flex flex-col justify-end pt-4 pb-2">
              {/* Bars and lines */}
              <div className="flex-1 flex items-end justify-between gap-2 px-6 border-b border-slate-300 relative">
                {/* Benchmark Lines: Line A Target 110, Line B Target 100 */}
                <div className="absolute inset-x-6 top-[28%] border-b border-dashed border-sky-400 z-0 opacity-70">
                  <span className="text-[10px] text-sky-600 bg-white/80 px-1 font-semibold absolute -top-3 right-0">
                    Line A Target (110 UPH)
                  </span>
                </div>
                <div className="absolute inset-x-6 top-[36%] border-b border-dashed border-blue-800 z-0 opacity-70">
                  <span className="text-[10px] text-blue-900 bg-white/80 px-1 font-semibold absolute -top-3 left-0">
                    Line B Target (100 UPH)
                  </span>
                </div>

                {data.map(item => {
                  const maxChartUph = 150;
                  const heightPctA = Math.min(100, (item.lineAUph / maxChartUph) * 100);
                  const heightPctB = Math.min(100, (item.lineBUph / maxChartUph) * 100);

                  return (
                    <div key={item.month} className="flex-1 flex flex-col items-center z-10 group relative">
                      {/* Bars Group */}
                      <div className="w-full flex items-end justify-center gap-1.5 h-44">
                        {/* Line A Bar */}
                        <div
                          style={{ height: `${heightPctA}%` }}
                          className="w-4 sm:w-5 bg-gradient-to-t from-sky-500 to-sky-400 hover:from-sky-600 hover:to-sky-500 rounded-t transition-all relative flex items-start justify-center"
                        >
                          <span className="text-[9px] font-bold text-white -mt-4 opacity-90 group-hover:opacity-100">
                            {item.lineAUph}
                          </span>
                        </div>

                        {/* Line B Bar */}
                        <div
                          style={{ height: `${heightPctB}%` }}
                          className="w-4 sm:w-5 bg-gradient-to-t from-blue-950 to-blue-800 hover:from-blue-900 hover:to-blue-700 rounded-t transition-all relative flex items-start justify-center"
                        >
                          <span className="text-[9px] font-bold text-white -mt-4 opacity-90 group-hover:opacity-100">
                            {item.lineBUph}
                          </span>
                        </div>
                      </div>

                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-lg pointer-events-none z-30 whitespace-nowrap">
                        <span className="font-bold">{item.monthNameTh || item.month}</span>: Line A: {item.lineAUph} UPH | Line B: {item.lineBUph} UPH
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* X Axis Labels */}
              <div className="flex items-center justify-between px-6 mt-2 text-[11px] text-slate-600 font-semibold">
                {data.map(item => (
                  <div key={item.month} className="flex-1 text-center truncate">
                    {item.monthNameTh || item.month}
                  </div>
                ))}
              </div>

              {/* Legends */}
              <div className="flex items-center justify-center gap-6 mt-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-sky-500 rounded-xs inline-block" />
                  <span className="font-semibold text-slate-700">Line A Actual UPH</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-900 rounded-xs inline-block" />
                  <span className="font-semibold text-slate-700">Line B Actual UPH</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="min-w-[700px] h-64 flex flex-col justify-end pt-4 pb-2">
              {/* Production Volume Bars */}
              <div className="flex-1 flex items-end justify-between gap-2 px-6 border-b border-slate-300 relative">
                {data.map(item => {
                  const maxVolume = 70000;
                  const heightPctA = Math.min(100, (item.lineAAct / maxVolume) * 100);
                  const heightPctB = Math.min(100, (item.lineBAct / maxVolume) * 100);

                  return (
                    <div key={item.month} className="flex-1 flex flex-col items-center z-10 group relative">
                      <div className="w-full flex items-end justify-center gap-1.5 h-44">
                        {/* Line A */}
                        <div
                          style={{ height: `${heightPctA}%` }}
                          className="w-4 sm:w-5 bg-sky-500 hover:bg-sky-600 rounded-t transition-all relative flex items-start justify-center"
                        >
                          <span className="text-[8.5px] font-bold text-slate-800 -mt-4 opacity-90 truncate">
                            {(item.lineAAct / 1000).toFixed(0)}k
                          </span>
                        </div>

                        {/* Line B */}
                        <div
                          style={{ height: `${heightPctB}%` }}
                          className="w-4 sm:w-5 bg-blue-900 hover:bg-blue-800 rounded-t transition-all relative flex items-start justify-center"
                        >
                          <span className="text-[8.5px] font-bold text-slate-800 -mt-4 opacity-90 truncate">
                            {(item.lineBAct / 1000).toFixed(0)}k
                          </span>
                        </div>
                      </div>

                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-lg pointer-events-none z-30 whitespace-nowrap">
                        <span className="font-bold">{item.monthNameTh || item.month}</span>: Line A: {item.lineAAct.toLocaleString()} | Line B: {item.lineBAct.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* X Axis */}
              <div className="flex items-center justify-between px-6 mt-2 text-[11px] text-slate-600 font-semibold">
                {data.map(item => (
                  <div key={item.month} className="flex-1 text-center truncate">
                    {item.monthNameTh || item.month}
                  </div>
                ))}
              </div>

              {/* Legends */}
              <div className="flex items-center justify-center gap-6 mt-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-sky-500 rounded-xs inline-block" />
                  <span className="font-semibold text-slate-700">Line A ผลิตจริง (ชิ้น)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-900 rounded-xs inline-block" />
                  <span className="font-semibold text-slate-700">Line B ผลิตจริง (ชิ้น)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Comprehensive Summary Table */}
      <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
        <div className="bg-slate-100 px-4 py-3 border-b border-slate-300 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-slate-800 uppercase tracking-wide">
              ตารางสรุปเปรียบเทียบผลการผลิตและประสิทธิภาพรายเดือน (Monthly OEC Master Sheet)
            </span>
            <span className="text-xs bg-blue-100 text-[#0070c0] font-semibold px-2 py-0.5 rounded">
              {data.length} งวดบันทึก
            </span>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            💡 คลิกตัวเลขในตารางเพื่อแก้ไขค่าได้โดยตรง ระบบจะคำนวณ Gap และ UPH ให้อัตโนมัติ
          </span>
        </div>

        <div className="overflow-x-auto max-h-[700px]">
          <table className="w-full text-xs text-left border-collapse border border-slate-300 min-w-[1300px]">
            {/* Multi-tier Header */}
            <thead>
              {/* Grouping Header */}
              <tr className="bg-[#cbd5e1] text-slate-900 font-extrabold text-center border-b border-slate-400 divide-x divide-slate-300">
                <th rowSpan={2} className="py-2.5 px-3 min-w-[110px] align-middle bg-slate-300">
                  งวดเดือน / Month
                </th>
                <th colSpan={6} className="py-1.5 px-2 bg-sky-200 text-sky-950 font-black">
                  Line A (สายการผลิตตู้เย็น 2 ประตู)
                </th>
                <th colSpan={6} className="py-1.5 px-2 bg-blue-200 text-blue-950 font-black">
                  Line B (สายการผลิตตู้เย็น 1 ประตู)
                </th>
                <th colSpan={5} className="py-1.5 px-2 bg-emerald-200 text-emerald-950 font-black">
                  รวมทั้งโรงงาน (Total Factory Performance)
                </th>
                <th rowSpan={2} className="py-2.5 px-3 min-w-[140px] align-middle bg-slate-300">
                  หมายเหตุ / เหตุการณ์สำคัญ
                </th>
              </tr>

              {/* Sub Columns Header */}
              <tr className="bg-slate-200 text-slate-800 font-bold text-center border-b border-slate-300 divide-x divide-slate-300 text-[11px]">
                {/* Line A Columns */}
                <th className="py-2 px-2 min-w-[65px]">Plan</th>
                <th className="py-2 px-2 min-w-[65px]">Actual</th>
                <th className="py-2 px-2 min-w-[60px]">Gap</th>
                <th className="py-2 px-2 min-w-[55px]">Hours</th>
                <th className="py-2 px-2 min-w-[55px] bg-sky-100 text-sky-900">UPH</th>
                <th className="py-2 px-2 min-w-[55px]">Target</th>

                {/* Line B Columns */}
                <th className="py-2 px-2 min-w-[65px]">Plan</th>
                <th className="py-2 px-2 min-w-[65px]">Actual</th>
                <th className="py-2 px-2 min-w-[60px]">Gap</th>
                <th className="py-2 px-2 min-w-[55px]">Hours</th>
                <th className="py-2 px-2 min-w-[55px] bg-blue-100 text-blue-900">UPH</th>
                <th className="py-2 px-2 min-w-[55px]">Target</th>

                {/* Plant Summary Columns */}
                <th className="py-2 px-2 min-w-[75px]">Total Plan</th>
                <th className="py-2 px-2 min-w-[75px]">Total Act</th>
                <th className="py-2 px-2 min-w-[65px]">Total Gap</th>
                <th className="py-2 px-2 min-w-[60px]">Total Hrs</th>
                <th className="py-2 px-2 min-w-[65px] bg-emerald-100 text-emerald-900">AVG UPH</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-slate-800">
              {data.map((row, idx) => {
                const lineAGap = row.lineAAct - row.lineAPlan;
                const lineBGap = row.lineBAct - row.lineBPlan;
                const totPlan = row.lineAPlan + row.lineBPlan;
                const totAct = row.lineAAct + row.lineBAct;
                const totGap = totAct - totPlan;
                const totHrs = row.lineAWorkHours + row.lineBWorkHours;
                const plantUph = totHrs > 0 ? Math.round(totAct / totHrs) : 0;

                return (
                  <tr key={row.month} className="hover:bg-blue-50/40 transition-colors divide-x divide-slate-200">
                    {/* Month Cell */}
                    <td className="py-2 px-3 font-bold text-slate-900 bg-slate-50 text-center whitespace-nowrap">
                      <div>{row.month}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{row.monthNameTh}</div>
                    </td>

                    {/* LINE A: Plan */}
                    <td
                      onClick={() => handleStartEdit(idx, 'lineAPlan', row.lineAPlan)}
                      className="py-1.5 px-2 text-right font-medium cursor-pointer hover:bg-sky-50"
                    >
                      {editingCell?.index === idx && editingCell.field === 'lineAPlan' ? (
                        <input
                          autoFocus
                          type="number"
                          value={editingCell.val}
                          onChange={e => setEditingCell({ ...editingCell, val: e.target.value })}
                          onBlur={handleSaveEdit}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                          className="w-full text-right bg-white border border-blue-500 outline-none px-1"
                        />
                      ) : (
                        row.lineAPlan.toLocaleString()
                      )}
                    </td>

                    {/* LINE A: Act */}
                    <td
                      onClick={() => handleStartEdit(idx, 'lineAAct', row.lineAAct)}
                      className="py-1.5 px-2 text-right font-bold text-slate-900 cursor-pointer hover:bg-sky-50"
                    >
                      {editingCell?.index === idx && editingCell.field === 'lineAAct' ? (
                        <input
                          autoFocus
                          type="number"
                          value={editingCell.val}
                          onChange={e => setEditingCell({ ...editingCell, val: e.target.value })}
                          onBlur={handleSaveEdit}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                          className="w-full text-right bg-white border border-blue-500 outline-none px-1"
                        />
                      ) : (
                        row.lineAAct.toLocaleString()
                      )}
                    </td>

                    {/* LINE A: Gap */}
                    <td className={`py-1.5 px-2 text-right font-bold ${
                      lineAGap < 0 ? 'text-rose-600 bg-rose-50/30' : 'text-emerald-700'
                    }`}>
                      {lineAGap > 0 ? `+${lineAGap.toLocaleString()}` : lineAGap.toLocaleString()}
                    </td>

                    {/* LINE A: Hours */}
                    <td
                      onClick={() => handleStartEdit(idx, 'lineAWorkHours', row.lineAWorkHours)}
                      className="py-1.5 px-2 text-center cursor-pointer hover:bg-sky-50 text-slate-600"
                    >
                      {editingCell?.index === idx && editingCell.field === 'lineAWorkHours' ? (
                        <input
                          autoFocus
                          type="number"
                          value={editingCell.val}
                          onChange={e => setEditingCell({ ...editingCell, val: e.target.value })}
                          onBlur={handleSaveEdit}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                          className="w-full text-center bg-white border border-blue-500 outline-none px-1"
                        />
                      ) : (
                        row.lineAWorkHours
                      )}
                    </td>

                    {/* LINE A: UPH */}
                    <td className="py-1.5 px-2 text-center font-black bg-sky-50/60 text-[#0284c7]">
                      {row.lineAUph}
                    </td>

                    {/* LINE A: Target */}
                    <td className="py-1.5 px-2 text-center text-slate-500 font-medium">
                      {row.lineATargetUph}
                    </td>

                    {/* LINE B: Plan */}
                    <td
                      onClick={() => handleStartEdit(idx, 'lineBPlan', row.lineBPlan)}
                      className="py-1.5 px-2 text-right font-medium cursor-pointer hover:bg-blue-50"
                    >
                      {editingCell?.index === idx && editingCell.field === 'lineBPlan' ? (
                        <input
                          autoFocus
                          type="number"
                          value={editingCell.val}
                          onChange={e => setEditingCell({ ...editingCell, val: e.target.value })}
                          onBlur={handleSaveEdit}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                          className="w-full text-right bg-white border border-blue-500 outline-none px-1"
                        />
                      ) : (
                        row.lineBPlan.toLocaleString()
                      )}
                    </td>

                    {/* LINE B: Act */}
                    <td
                      onClick={() => handleStartEdit(idx, 'lineBAct', row.lineBAct)}
                      className="py-1.5 px-2 text-right font-bold text-slate-900 cursor-pointer hover:bg-blue-50"
                    >
                      {editingCell?.index === idx && editingCell.field === 'lineBAct' ? (
                        <input
                          autoFocus
                          type="number"
                          value={editingCell.val}
                          onChange={e => setEditingCell({ ...editingCell, val: e.target.value })}
                          onBlur={handleSaveEdit}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                          className="w-full text-right bg-white border border-blue-500 outline-none px-1"
                        />
                      ) : (
                        row.lineBAct.toLocaleString()
                      )}
                    </td>

                    {/* LINE B: Gap */}
                    <td className={`py-1.5 px-2 text-right font-bold ${
                      lineBGap < 0 ? 'text-rose-600 bg-rose-50/30' : 'text-emerald-700'
                    }`}>
                      {lineBGap > 0 ? `+${lineBGap.toLocaleString()}` : lineBGap.toLocaleString()}
                    </td>

                    {/* LINE B: Hours */}
                    <td
                      onClick={() => handleStartEdit(idx, 'lineBWorkHours', row.lineBWorkHours)}
                      className="py-1.5 px-2 text-center cursor-pointer hover:bg-blue-50 text-slate-600"
                    >
                      {editingCell?.index === idx && editingCell.field === 'lineBWorkHours' ? (
                        <input
                          autoFocus
                          type="number"
                          value={editingCell.val}
                          onChange={e => setEditingCell({ ...editingCell, val: e.target.value })}
                          onBlur={handleSaveEdit}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                          className="w-full text-center bg-white border border-blue-500 outline-none px-1"
                        />
                      ) : (
                        row.lineBWorkHours
                      )}
                    </td>

                    {/* LINE B: UPH */}
                    <td className="py-1.5 px-2 text-center font-black bg-blue-50/70 text-[#1e3a8a]">
                      {row.lineBUph}
                    </td>

                    {/* LINE B: Target */}
                    <td className="py-1.5 px-2 text-center text-slate-500 font-medium">
                      {row.lineBTargetUph}
                    </td>

                    {/* TOTAL PLANT: Plan */}
                    <td className="py-1.5 px-2 text-right font-semibold bg-emerald-50/20 text-slate-800">
                      {totPlan.toLocaleString()}
                    </td>

                    {/* TOTAL PLANT: Act */}
                    <td className="py-1.5 px-2 text-right font-extrabold bg-emerald-50/40 text-slate-900">
                      {totAct.toLocaleString()}
                    </td>

                    {/* TOTAL PLANT: Gap */}
                    <td className={`py-1.5 px-2 text-right font-bold ${
                      totGap < 0 ? 'text-rose-600 bg-rose-50/30' : 'text-emerald-700 bg-emerald-50/30'
                    }`}>
                      {totGap > 0 ? `+${totGap.toLocaleString()}` : totGap.toLocaleString()}
                    </td>

                    {/* TOTAL PLANT: Hrs */}
                    <td className="py-1.5 px-2 text-center font-medium text-slate-700">
                      {totHrs}
                    </td>

                    {/* TOTAL PLANT: AVG UPH */}
                    <td className="py-1.5 px-2 text-center font-black text-emerald-800 bg-emerald-100/50">
                      {plantUph}
                    </td>

                    {/* Remark */}
                    <td
                      onClick={() => handleStartEdit(idx, 'notes', row.notes)}
                      className="py-1.5 px-3 text-slate-600 text-[11px] cursor-pointer hover:bg-slate-50 truncate max-w-[200px]"
                      title={row.notes}
                    >
                      {editingCell?.index === idx && editingCell.field === 'notes' ? (
                        <input
                          autoFocus
                          type="text"
                          value={editingCell.val}
                          onChange={e => setEditingCell({ ...editingCell, val: e.target.value })}
                          onBlur={handleSaveEdit}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                          className="w-full bg-white border border-blue-500 outline-none px-1"
                        />
                      ) : (
                        row.notes || '-'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Prominent TOTAL YTD & AVG YTD Footer Rows */}
            <tfoot className="border-t-2 border-slate-400 bg-slate-900 text-white font-bold divide-y divide-slate-700">
              {/* Row 1: TOTAL YTD */}
              <tr className="divide-x divide-slate-700 text-[11.5px]">
                <td className="py-2.5 px-3 text-center bg-slate-950 font-black text-amber-300">
                  TOTAL YTD
                </td>

                {/* Line A Total */}
                <td className="py-2.5 px-2 text-right text-sky-200">
                  {ytdStats.lineAPlanYTD.toLocaleString()}
                </td>
                <td className="py-2.5 px-2 text-right text-white font-black text-[12px]">
                  {ytdStats.lineAActYTD.toLocaleString()}
                </td>
                <td className={`py-2.5 px-2 text-right ${
                  ytdStats.lineAGapYTD < 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {ytdStats.lineAGapYTD > 0 ? `+${ytdStats.lineAGapYTD.toLocaleString()}` : ytdStats.lineAGapYTD.toLocaleString()}
                </td>
                <td className="py-2.5 px-2 text-center text-slate-300">
                  {ytdStats.lineAWorkHoursYTD.toLocaleString()}
                </td>
                <td className="py-2.5 px-2 text-center text-sky-300 font-black text-[12.5px] bg-slate-800">
                  {ytdStats.lineAAvgUphYTD}
                </td>
                <td className="py-2.5 px-2 text-center text-slate-400">
                  110
                </td>

                {/* Line B Total */}
                <td className="py-2.5 px-2 text-right text-blue-200">
                  {ytdStats.lineBPlanYTD.toLocaleString()}
                </td>
                <td className="py-2.5 px-2 text-right text-white font-black text-[12px]">
                  {ytdStats.lineBActYTD.toLocaleString()}
                </td>
                <td className={`py-2.5 px-2 text-right ${
                  ytdStats.lineBGapYTD < 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {ytdStats.lineBGapYTD > 0 ? `+${ytdStats.lineBGapYTD.toLocaleString()}` : ytdStats.lineBGapYTD.toLocaleString()}
                </td>
                <td className="py-2.5 px-2 text-center text-slate-300">
                  {ytdStats.lineBWorkHoursYTD.toLocaleString()}
                </td>
                <td className="py-2.5 px-2 text-center text-amber-300 font-black text-[12.5px] bg-slate-800">
                  {ytdStats.lineBAvgUphYTD}
                </td>
                <td className="py-2.5 px-2 text-center text-slate-400">
                  100
                </td>

                {/* Total Plant YTD */}
                <td className="py-2.5 px-2 text-right text-slate-300 font-semibold">
                  {ytdStats.totalPlantPlanYTD.toLocaleString()}
                </td>
                <td className="py-2.5 px-2 text-right text-emerald-300 font-black text-[13px]">
                  {ytdStats.totalPlantActYTD.toLocaleString()}
                </td>
                <td className={`py-2.5 px-2 text-right ${
                  ytdStats.totalPlantGapYTD < 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {ytdStats.totalPlantGapYTD > 0 ? `+${ytdStats.totalPlantGapYTD.toLocaleString()}` : ytdStats.totalPlantGapYTD.toLocaleString()}
                </td>
                <td className="py-2.5 px-2 text-center text-slate-300">
                  {ytdStats.totalPlantWorkHoursYTD.toLocaleString()}
                </td>
                <td className="py-2.5 px-2 text-center text-emerald-300 font-black text-[13px] bg-emerald-950">
                  {ytdStats.plantAvgUphYTD}
                </td>

                <td className="py-2.5 px-3 text-center text-xs text-amber-300 font-normal">
                  ยอดรวมสะสม {ytdStats.totalMonths} เดือน
                </td>
              </tr>

              {/* Row 2: AVERAGE YTD */}
              <tr className="divide-x divide-slate-700 text-[11px] bg-slate-950">
                <td className="py-2 px-3 text-center font-bold text-sky-400">
                  AVG / MONTH
                </td>

                {/* Line A Avg */}
                <td className="py-2 px-2 text-right text-slate-400">
                  {Math.round(ytdStats.lineAPlanYTD / ytdStats.totalMonths).toLocaleString()}
                </td>
                <td className="py-2 px-2 text-right text-sky-300 font-bold">
                  {ytdStats.lineAAvgMonthly.toLocaleString()}
                </td>
                <td className="py-2 px-2 text-right text-slate-400">
                  {Math.round(ytdStats.lineAGapYTD / ytdStats.totalMonths).toLocaleString()}
                </td>
                <td className="py-2 px-2 text-center text-slate-400">
                  {Math.round(ytdStats.lineAWorkHoursYTD / ytdStats.totalMonths)}
                </td>
                <td className="py-2 px-2 text-center font-extrabold text-sky-300">
                  {ytdStats.lineAAvgUphYTD} UPH
                </td>
                <td className="py-2 px-2 text-center text-slate-500">
                  -
                </td>

                {/* Line B Avg */}
                <td className="py-2 px-2 text-right text-slate-400">
                  {Math.round(ytdStats.lineBPlanYTD / ytdStats.totalMonths).toLocaleString()}
                </td>
                <td className="py-2 px-2 text-right text-blue-300 font-bold">
                  {ytdStats.lineBAvgMonthly.toLocaleString()}
                </td>
                <td className="py-2 px-2 text-right text-slate-400">
                  {Math.round(ytdStats.lineBGapYTD / ytdStats.totalMonths).toLocaleString()}
                </td>
                <td className="py-2 px-2 text-center text-slate-400">
                  {Math.round(ytdStats.lineBWorkHoursYTD / ytdStats.totalMonths)}
                </td>
                <td className="py-2 px-2 text-center font-extrabold text-amber-300">
                  {ytdStats.lineBAvgUphYTD} UPH
                </td>
                <td className="py-2 px-2 text-center text-slate-500">
                  -
                </td>

                {/* Total Plant Avg */}
                <td className="py-2 px-2 text-right text-slate-400">
                  {Math.round(ytdStats.totalPlantPlanYTD / ytdStats.totalMonths).toLocaleString()}
                </td>
                <td className="py-2 px-2 text-right text-emerald-300 font-bold">
                  {Math.round(ytdStats.totalPlantActYTD / ytdStats.totalMonths).toLocaleString()}
                </td>
                <td className="py-2 px-2 text-right text-slate-400">
                  {Math.round(ytdStats.totalPlantGapYTD / ytdStats.totalMonths).toLocaleString()}
                </td>
                <td className="py-2 px-2 text-center text-slate-400">
                  {Math.round(ytdStats.totalPlantWorkHoursYTD / ytdStats.totalMonths)}
                </td>
                <td className="py-2 px-2 text-center font-extrabold text-emerald-400">
                  {ytdStats.plantAvgUphYTD} UPH
                </td>

                <td className="py-2 px-3 text-center text-slate-400 text-[10px]">
                  ค่าเฉลี่ยต่อเดือน
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Table Footnote */}
        <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              <span>Line A (เป้า UPH: 110)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-900" />
              <span>Line B (เป้า UPH: 100)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <span>Plant Weighted AVG UPH = Total Output ÷ Total Hours</span>
            </span>
          </div>
          <span className="text-slate-400">
            Exported to Excel supported (.xlsx)
          </span>
        </div>
      </div>

      {/* Quick Add Month Modal */}
      {showAddMonthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in">
            <div className="bg-[#0070c0] text-white px-4 py-3 flex items-center justify-between">
              <h4 className="font-bold text-sm">เพิ่มงวดเดือนใหม่ในตารางสรุป</h4>
              <button onClick={() => setShowAddMonthModal(false)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">รหัสเดือน (YYYY-MM):</label>
                <input
                  type="text"
                  value={newMonthStr}
                  onChange={e => setNewMonthStr(e.target.value)}
                  placeholder="เช่น 2026-10"
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อเดือน (ภาษาไทย):</label>
                <input
                  type="text"
                  value={newMonthTh}
                  onChange={e => setNewMonthTh(e.target.value)}
                  placeholder="เช่น ต.ค. 2026"
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddMonthModal(false)}
                  className="px-3 py-1 text-slate-600 hover:bg-slate-100 rounded"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleAddMonth}
                  className="px-3.5 py-1 bg-[#0070c0] hover:bg-[#005ba3] text-white font-semibold rounded shadow-xs"
                >
                  เพิ่มเดือน
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  UpphSheetData,
  UpphLineData,
  UpphMonthlyItem,
  LineOECData,
} from '../types/oec';
import {
  Save,
  Edit3,
  Plus,
  Download,
  RefreshCw,
  Columns,
  Maximize2,
  Check,
  Users,
  Gauge,
  Calendar,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { INITIAL_UPPH_SHEET_DATA } from '../data/initialData';

interface UpphOecViewProps {
  data: UpphSheetData;
  onUpdateData: (newData: UpphSheetData) => void;
  dailyOecLines: LineOECData[];
  onSaveOnWeb?: (customTitle?: string) => void;
  hasUnsavedChanges?: boolean;
  isSyncing?: boolean;
  plantName?: string;
}

type EditableUpphCategory = 'onTheJob' | 'attendance' | 'targetUpph' | 'actUpph';

export const UpphOecView: React.FC<UpphOecViewProps> = ({
  data,
  onUpdateData,
  dailyOecLines,
  onSaveOnWeb,
  hasUnsavedChanges = false,
  isSyncing = false,
}) => {
  const { t } = useAppPreferences();

  // Filter states inside the original UPPH OEC blue header bar
  const [selectedPlant, setSelectedPlant] = useState<string>('HTC Ref(泰国冰箱)');
  const [selectedMonthLabel, setSelectedMonthLabel] = useState<string>('9月');
  const [selectedProdLine, setSelectedProdLine] = useState<string>('All');

  // View layout mode: 'original-split' (Left Charts + Right 2 Tables like original image) or 'expanded' (Full width)
  const [layoutMode, setLayoutMode] = useState<'original-split' | 'expanded'>('original-split');

  // Toggle inline panels
  const [showMonthlyEditor, setShowMonthlyEditor] = useState<boolean>(false);
  const [showQuickEntry, setShowQuickEntry] = useState<boolean>(false);
  const [showAddDayBar, setShowAddDayBar] = useState<boolean>(false);
  const [autoRecalcUpphOnAttendanceChange, setAutoRecalcUpphOnAttendanceChange] = useState<boolean>(false);

  // Active cell editing state for the 2 right-hand matrices
  const [editingCell, setEditingCell] = useState<{
    lineId: string;
    category: EditableUpphCategory;
    day: number | 'TOTAL';
    val: string;
  } | null>(null);

  // Quick Entry state
  const [quickLineId, setQuickLineId] = useState<string>(data.lines[0]?.id || 'line-a');
  const [quickDay, setQuickDay] = useState<number>(data.days[data.days.length - 1]?.day || 25);
  const [quickOnTheJob, setQuickOnTheJob] = useState<string>('');
  const [quickAttendance, setQuickAttendance] = useState<string>('');
  const [quickTargetUpph, setQuickTargetUpph] = useState<string>('');
  const [quickActUpph, setQuickActUpph] = useState<string>('');

  // Batch Target UPPH state
  const [batchTargetA, setBatchTargetA] = useState<string>('1.22');
  const [batchTargetB, setBatchTargetB] = useState<string>('0.96');

  // Add Day state
  const [newDayNum, setNewDayNum] = useState<number>(26);
  const [newDayWeekday, setNewDayWeekday] = useState<string>('SAT');
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState<{
    chart: 'prod' | 'upph';
    idx: number;
  } | null>(null);

  const createSmoothPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpx1 = p0.x + (p1.x - p0.x) * 0.35;
      const cpy1 = p0.y;
      const cpx2 = p0.x + (p1.x - p0.x) * 0.65;
      const cpy2 = p1.y;
      path += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${p1.x} ${p1.y}`;
    }
    return path;
  };

  const filteredLines = data.lines.filter(l => {
    if (selectedProdLine !== 'All' && l.prodLine !== selectedProdLine) return false;
    return true;
  });

  // Helper to compute Total On-the-job for a line
  const getLineTotalOnTheJob = (line: UpphLineData): number => {
    if (line.totalOnTheJobOverride !== undefined && line.totalOnTheJobOverride !== null) {
      return line.totalOnTheJobOverride;
    }
    const vals = data.days
      .map(d => line.onTheJob[d.day])
      .filter((v): v is number => v !== null && v !== undefined && !isNaN(Number(v)));
    if (vals.length === 0) return 0;
    return Math.round(vals.reduce((a, b) => a + Number(b), 0) / vals.length);
  };

  // Helper to compute Total Attendance for a line
  const getLineTotalAttendance = (line: UpphLineData): number => {
    if (line.totalAttendanceOverride !== undefined && line.totalAttendanceOverride !== null) {
      return line.totalAttendanceOverride;
    }
    // Average across regular working days where onTheJob is present (or all days if none)
    const regularDays = data.days.filter(
      d => line.onTheJob[d.day] !== null && line.onTheJob[d.day] !== undefined
    );
    const targetDays = regularDays.length > 0 ? regularDays : data.days;
    const vals = targetDays
      .map(d => line.attendance[d.day])
      .filter((v): v is number => v !== null && v !== undefined && !isNaN(Number(v)));
    if (vals.length === 0) return 0;
    return Math.round(vals.reduce((a, b) => a + Number(b), 0) / vals.length);
  };

  // Helper to compute Total Target UPPH for a line
  const getLineTotalTargetUpph = (line: UpphLineData): number => {
    if (line.totalTargetUpphOverride !== undefined && line.totalTargetUpphOverride !== null) {
      return line.totalTargetUpphOverride;
    }
    const vals = data.days
      .map(d => line.targetUpph[d.day])
      .filter((v): v is number => v !== null && v !== undefined && !isNaN(Number(v)));
    if (vals.length === 0) return 0;
    return Number((vals.reduce((a, b) => a + Number(b), 0) / vals.length).toFixed(2));
  };

  // Helper to compute Total Act UPPH for a line
  const getLineTotalActUpph = (line: UpphLineData): number => {
    if (line.totalActUpphOverride !== undefined && line.totalActUpphOverride !== null) {
      return line.totalActUpphOverride;
    }
    const vals = data.days
      .map(d => line.actUpph[d.day])
      .filter((v): v is number => v !== null && v !== undefined && !isNaN(Number(v)));
    if (vals.length === 0) return 0;
    return Number((vals.reduce((a, b) => a + Number(b), 0) / vals.length).toFixed(2));
  };

  // Start editing a cell
  const handleStartEdit = (
    lineId: string,
    category: EditableUpphCategory,
    day: number | 'TOTAL',
    currentVal: number | null | undefined
  ) => {
    setEditingCell({
      lineId,
      category,
      day,
      val: currentVal !== null && currentVal !== undefined ? String(currentVal) : '',
    });
  };

  // Commit cell edit
  const handleCommitEdit = () => {
    if (!editingCell) return;
    const { lineId, category, day, val } = editingCell;
    const trimmed = val.trim();
    const parsedNum = trimmed === '' ? null : Number(trimmed);
    const validNum = parsedNum !== null && !isNaN(parsedNum) ? parsedNum : null;

    const updatedLines = data.lines.map(line => {
      if (line.id !== lineId) return line;

      if (day === 'TOTAL') {
        if (category === 'onTheJob') return { ...line, totalOnTheJobOverride: validNum };
        if (category === 'attendance') return { ...line, totalAttendanceOverride: validNum };
        if (category === 'targetUpph') return { ...line, totalTargetUpphOverride: validNum };
        if (category === 'actUpph') return { ...line, totalActUpphOverride: validNum };
        return line;
      }

      const nextLine: UpphLineData = {
        ...line,
        [category]: {
          ...line[category],
          [day]: validNum,
        },
      };

      // Clear total override for that category so Total dynamically reflects the updated daily cells
      if (category === 'onTheJob') nextLine.totalOnTheJobOverride = null;
      if (category === 'attendance') {
        nextLine.totalAttendanceOverride = null;
        // Optional auto-recalc of Act UPPH from Daily OEC Act / (WorkTime * Attendance)
        if (autoRecalcUpphOnAttendanceChange && validNum && validNum > 0) {
          const matchingOec = dailyOecLines.find(
            l => l.id === line.id || l.prodLine === line.prodLine
          );
          const actProd = matchingOec?.act[day];
          const workHrs = matchingOec?.workTime[day];
          if (actProd && workHrs && workHrs > 0) {
            const computedUpph = Number((actProd / (workHrs * validNum)).toFixed(2));
            nextLine.actUpph = {
              ...nextLine.actUpph,
              [day]: computedUpph,
            };
          }
        }
      }
      if (category === 'targetUpph') nextLine.totalTargetUpphOverride = null;
      if (category === 'actUpph') nextLine.totalActUpphOverride = null;

      return nextLine;
    });

    // Also keep the latest month (2026-09) in monthlyData synced if Total Act UPPH changed
    const nextMonthly = data.monthlyData.map((m, idx) => {
      if (idx !== data.monthlyData.length - 1) return m;
      const lineA = updatedLines.find(l => l.prodLine === 'Line A') || updatedLines[0];
      const lineB = updatedLines.find(l => l.prodLine === 'Line B') || updatedLines[1];
      return {
        ...m,
        upphLineA: lineA ? getLineTotalActUpph(lineA) : m.upphLineA,
        upphLineB: lineB ? getLineTotalActUpph(lineB) : m.upphLineB,
      };
    });

    onUpdateData({
      ...data,
      lines: updatedLines,
      monthlyData: nextMonthly,
      updatedAt: new Date().toISOString(),
    });
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommitEdit();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  // Quick Entry Apply
  const handleQuickEntrySave = () => {
    const updatedLines = data.lines.map(line => {
      if (line.id !== quickLineId) return line;
      const nextLine = { ...line };
      if (quickOnTheJob.trim() !== '') {
        nextLine.onTheJob = { ...nextLine.onTheJob, [quickDay]: Number(quickOnTheJob) };
        nextLine.totalOnTheJobOverride = null;
      }
      if (quickAttendance.trim() !== '') {
        nextLine.attendance = { ...nextLine.attendance, [quickDay]: Number(quickAttendance) };
        nextLine.totalAttendanceOverride = null;
      }
      if (quickTargetUpph.trim() !== '') {
        nextLine.targetUpph = { ...nextLine.targetUpph, [quickDay]: Number(quickTargetUpph) };
        nextLine.totalTargetUpphOverride = null;
      }
      if (quickActUpph.trim() !== '') {
        nextLine.actUpph = { ...nextLine.actUpph, [quickDay]: Number(quickActUpph) };
        nextLine.totalActUpphOverride = null;
      }
      return nextLine;
    });

    onUpdateData({
      ...data,
      lines: updatedLines,
      updatedAt: new Date().toISOString(),
    });

    setQuickOnTheJob('');
    setQuickAttendance('');
    setQuickTargetUpph('');
    setQuickActUpph('');

    if (onSaveOnWeb) {
      setTimeout(() => onSaveOnWeb('บันทึกข้อมูล Sheet UPPH OEC'), 100);
    }
  };

  // Batch apply Target UPPH across all days for Line A & Line B
  const handleApplyBatchTargets = () => {
    const valA = Number(batchTargetA);
    const valB = Number(batchTargetB);
    const updatedLines = data.lines.map(line => {
      const targetVal = line.prodLine === 'Line A' ? valA : valB;
      if (isNaN(targetVal) || targetVal <= 0) return line;
      const newTargetMap: Record<number, number> = {};
      data.days.forEach(d => {
        newTargetMap[d.day] = targetVal;
      });
      return {
        ...line,
        targetUpph: newTargetMap,
        totalTargetUpphOverride: targetVal,
      };
    });
    onUpdateData({
      ...data,
      lines: updatedLines,
      updatedAt: new Date().toISOString(),
    });
  };

  // Sync / Calculate Act UPPH from Sheet 1 (Daily OEC: Act / (WorkTime * Attendance))
  const handleSyncActUpphFromDailyOec = () => {
    const updatedLines = data.lines.map(line => {
      const matchingOec = dailyOecLines.find(
        l => l.id === line.id || l.prodLine === line.prodLine
      );
      if (!matchingOec) return line;

      const nextActUpph = { ...line.actUpph };
      data.days.forEach(d => {
        const actProd = matchingOec.act[d.day];
        const workHrs = matchingOec.workTime[d.day];
        const att = line.attendance[d.day];
        if (
          actProd !== null &&
          actProd !== undefined &&
          workHrs !== null &&
          workHrs !== undefined &&
          workHrs > 0 &&
          att !== null &&
          att !== undefined &&
          att > 0
        ) {
          nextActUpph[d.day] = Number((Number(actProd) / (Number(workHrs) * Number(att))).toFixed(2));
        }
      });

      return {
        ...line,
        actUpph: nextActUpph,
        totalActUpphOverride: null,
      };
    });

    onUpdateData({
      ...data,
      lines: updatedLines,
      updatedAt: new Date().toISOString(),
    });
  };

  // Add new Day column to UPPH Sheet
  const handleAddDayColumn = () => {
    if (!newDayNum || newDayNum < 1 || newDayNum > 31) return;
    if (data.days.some(d => d.day === newDayNum)) return;

    const nextDays = [...data.days, { day: newDayNum, weekday: newDayWeekday }].sort(
      (a, b) => a.day - b.day
    );
    const nextLines = data.lines.map(line => ({
      ...line,
      targetUpph: {
        ...line.targetUpph,
        [newDayNum]: line.prodLine === 'Line A' ? 1.22 : 0.96,
      },
    }));

    onUpdateData({
      ...data,
      days: nextDays,
      lines: nextLines,
      updatedAt: new Date().toISOString(),
    });
    setShowAddDayBar(false);
  };

  // Update monthly chart item
  const handleUpdateMonthlyItem = (
    index: number,
    field: keyof UpphMonthlyItem,
    rawVal: string
  ) => {
    const nextMonthly = data.monthlyData.map((item, idx) => {
      if (idx !== index) return item;
      if (field === 'month') {
        return { ...item, month: rawVal };
      }
      const num = Number(rawVal);
      return {
        ...item,
        [field]: isNaN(num) ? 0 : num,
      };
    });

    onUpdateData({
      ...data,
      monthlyData: nextMonthly,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddMonthlyRow = () => {
    const nextMonthNum = data.monthlyData.length + 1;
    const monthStr = `2026-${String(nextMonthNum).padStart(2, '0')}`;
    onUpdateData({
      ...data,
      monthlyData: [
        ...data.monthlyData,
        {
          month: monthStr,
          prodLineA: 50000,
          prodLineB: 42000,
          upphLineA: 1.05,
          upphLineB: 1.02,
        },
      ],
      updatedAt: new Date().toISOString(),
    });
  };

  const handleResetToOriginal = () => {
    onUpdateData({
      ...INITIAL_UPPH_SHEET_DATA,
      updatedAt: new Date().toISOString(),
    });
  };

  // Export UPPH OEC Sheet to Excel (.xlsx)
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Attendance & UPPH Daily Matrices (matching original layout)
    const headers = [
      'Table',
      'Plant',
      'Prod-line',
      'Category',
      'Total',
      ...data.days.map(d => `${d.day} (${d.weekday})`),
    ];

    const aoa: (string | number | null)[][] = [headers];

    // Top Table: Attendance
    data.lines.forEach(line => {
      const totOtj = getLineTotalOnTheJob(line);
      const totAtt = getLineTotalAttendance(line);
      const totGap = totAtt - totOtj;

      aoa.push([
        'Attendance OEC',
        line.plant,
        line.prodLine,
        'On-the-job(在册)',
        totOtj,
        ...data.days.map(d => line.onTheJob[d.day] ?? ''),
      ]);
      aoa.push([
        'Attendance OEC',
        line.plant,
        line.prodLine,
        'Attendance(出勤)',
        totAtt,
        ...data.days.map(d => line.attendance[d.day] ?? ''),
      ]);
      aoa.push([
        'Attendance OEC',
        line.plant,
        line.prodLine,
        'Gap(差异)',
        totGap,
        ...data.days.map(d => {
          const otj = line.onTheJob[d.day];
          const att = line.attendance[d.day];
          if (otj == null || att == null) return '';
          return Number(att) - Number(otj);
        }),
      ]);
    });

    aoa.push([]);

    // Bottom Table: UPPH
    data.lines.forEach(line => {
      const totTarget = getLineTotalTargetUpph(line);
      const totAct = getLineTotalActUpph(line);
      const totGap = Number((totAct - totTarget).toFixed(2));

      aoa.push([
        'UPPH OEC',
        line.plant,
        line.prodLine,
        'Target UPPH(目标)',
        totTarget,
        ...data.days.map(d => line.targetUpph[d.day] ?? ''),
      ]);
      aoa.push([
        'UPPH OEC',
        line.plant,
        line.prodLine,
        'Act UPPH(实际)',
        totAct,
        ...data.days.map(d => line.actUpph[d.day] ?? ''),
      ]);
      aoa.push([
        'UPPH OEC',
        line.plant,
        line.prodLine,
        'Gap(差异)',
        totGap,
        ...data.days.map(d => {
          const tgt = line.targetUpph[d.day];
          const act = line.actUpph[d.day];
          if (tgt == null || act == null) return '';
          return Number((Number(act) - Number(tgt)).toFixed(2));
        }),
      ]);
    });

    const wsMatrix = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, wsMatrix, 'UPPH_OEC_Matrix');

    // Sheet 2: Monthly Production & Monthly UPPH
    const monthlyRows = data.monthlyData.map(m => ({
      Month: m.month,
      'Month Production Line A': m.prodLineA,
      'Month Production Line B': m.prodLineB,
      'Month UPPH Line A': m.upphLineA,
      'Month UPPH Line B': m.upphLineB,
    }));
    const wsMonthly = XLSX.utils.json_to_sheet(monthlyRows);
    XLSX.utils.book_append_sheet(wb, wsMonthly, 'Month_UPPH_Trend');

    XLSX.writeFile(wb, `UPPH_OEC_HTC_Ref_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-3 pb-8">
      {/* =====================================================================
          ORIGINAL HAIER UPPH OEC(人效日清) TOP BANNER & FILTER BAR
          Matches the exact dark blue (#0070c0) header bar from the screenshot
         ===================================================================== */}
      <div className="bg-[#0070c0] text-white rounded-md shadow-md border border-[#005ba3] overflow-hidden">
        <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Haier Logo & Original Title */}
          <div className="flex items-center gap-4">
            <span className="text-2xl font-black tracking-tighter italic select-none">
              Haier
            </span>
            <div className="h-5 w-px bg-white/30 hidden sm:block" />
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold tracking-wide">
                UPPH OEC(人效日清)
              </h2>
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] bg-white/15 px-2 py-0.5 rounded font-medium border border-white/20">
                <Sparkles className="w-3 h-3 text-amber-300" />
                {t('คลิกแก้ไขตัวเลขได้ทุกช่องบน Web', 'Click any cell to edit on Web', '网页直接点击编辑任意数据')}
              </span>
            </div>
          </div>

          {/* Right: Original Filters (Plant, Month, Prod-Line) */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-white/90">Plant</span>
              <select
                value={selectedPlant}
                onChange={e => setSelectedPlant(e.target.value)}
                className="bg-white text-slate-800 font-semibold px-2.5 py-1 rounded border border-white/40 focus:outline-none cursor-pointer min-w-[140px]"
              >
                <option value="HTC Ref(泰国冰箱)">HTC Ref(泰国冰箱)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-white/90">Month</span>
              <select
                value={selectedMonthLabel}
                onChange={e => setSelectedMonthLabel(e.target.value)}
                className="bg-white text-slate-800 font-semibold px-2.5 py-1 rounded border border-white/40 focus:outline-none cursor-pointer min-w-[90px]"
              >
                {['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-white/90">Prod-Line</span>
              <select
                value={selectedProdLine}
                onChange={e => setSelectedProdLine(e.target.value)}
                className="bg-white text-slate-800 font-semibold px-2.5 py-1 rounded border border-white/40 focus:outline-none cursor-pointer min-w-[100px]"
              >
                <option value="All">All</option>
                <option value="Line A">Line A</option>
                <option value="Line B">Line B</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sub-Toolbar for Web Editing, Layout Toggle & Cloud Save */}
        <div className="bg-[#005a9e] px-4 py-2 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Layout Switcher */}
            <div className="inline-flex rounded bg-black/20 p-0.5 border border-white/15">
              <button
                onClick={() => setLayoutMode('original-split')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${
                  layoutMode === 'original-split'
                    ? 'bg-white text-[#0070c0] shadow-2xs'
                    : 'text-white/85 hover:text-white'
                }`}
                title={t('แสดงผลแบบต้นฉบับ (กราฟซ้าย + ตารางขวา)', 'Original Split Layout (Left Charts + Right Tables)', '原版分栏视图 (左图右表)')}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>{t('มุมมองต้นฉบับ (Original)', 'Original Layout', '原版布局')}</span>
              </button>
              <button
                onClick={() => setLayoutMode('expanded')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${
                  layoutMode === 'expanded'
                    ? 'bg-white text-[#0070c0] shadow-2xs'
                    : 'text-white/85 hover:text-white'
                }`}
                title={t('ขยายตารางเต็มความกว้างหน้าจอ', 'Full-Width Expanded Tables', '全宽展开表格')}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>{t('ขยายตารางเต็มจอ', 'Expand Tables', '全宽表格')}</span>
              </button>
            </div>

            {/* Quick Daily Edit Toggle */}
            <button
              onClick={() => setShowQuickEntry(!showQuickEntry)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-semibold border transition-colors cursor-pointer ${
                showQuickEntry
                  ? 'bg-amber-400 text-slate-900 border-amber-300'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/25'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{t('กรอก/ปรับข้อมูลรายวันด่วน', 'Quick Daily Input', '按日快速录入')}</span>
            </button>

            {/* Edit Monthly Charts Toggle */}
            <button
              onClick={() => setShowMonthlyEditor(!showMonthlyEditor)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-semibold border transition-colors cursor-pointer ${
                showMonthlyEditor
                  ? 'bg-amber-400 text-slate-900 border-amber-300'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/25'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>{t('แก้ไขกราฟรายเดือน (Month UPPH)', 'Edit Monthly Charts', '编辑月度图表数据')}</span>
            </button>

            {/* Add Day Button */}
            <button
              onClick={() => setShowAddDayBar(!showAddDayBar)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/25 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('เพิ่มคอลัมน์วัน', 'Add Day', '新增日期列')}</span>
            </button>

            {/* Auto-calc Act UPPH from Daily OEC */}
            <button
              onClick={handleSyncActUpphFromDailyOec}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/25 transition-colors cursor-pointer"
              title={t(
                'คำนวณ Act UPPH จากยอดผลิตจริง (Sheet 1) ÷ (ชั่วโมงทำงาน × คนมาทำงาน)',
                'Calculate Act UPPH = Daily Act / (Work Hours × Attendance)',
                '根据 Sheet 1 实际产量 ÷ (工时 × 出勤人数) 自动计算实际 UPPH'
              )}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('คำนวณ Act UPPH จากยอดผลิต', 'Calc UPPH from OEC', '由日清产量计算UPPH')}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleResetToOriginal}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded font-medium bg-white/10 hover:bg-white/20 text-white/90 border border-white/20 transition-colors cursor-pointer"
              title={t('รีเซ็ตกลับเป็นค่าต้นฉบับตามภาพ', 'Reset to original template values', '恢复原版初始数据')}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('ค่าต้นฉบับ', 'Reset Original', '恢复原版')}</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded font-semibold bg-white text-[#0070c0] hover:bg-blue-50 transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            {onSaveOnWeb && (
              <button
                onClick={() => onSaveOnWeb('บันทึกอัปเดต Sheet UPPH OEC (人效日清)')}
                disabled={isSyncing}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded font-bold shadow-xs transition-all cursor-pointer ${
                  hasUnsavedChanges
                    ? 'bg-amber-400 hover:bg-amber-500 text-slate-950 ring-2 ring-amber-200'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
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
      </div>

      {/* =====================================================================
          COLLAPSIBLE PANEL 1: QUICK DAILY INPUT & TARGET UPPH SETTER
         ===================================================================== */}
      {showQuickEntry && (
        <div className="bg-emerald-50/95 border border-emerald-300 rounded-md p-3 shadow-xs space-y-2.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 pb-2">
            <div className="font-bold text-emerald-950 flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-emerald-700" />
              <span>
                {t(
                  'แถบกรอกและปรับข้อมูล UPPH & อัตรากำลังคนรายวันด่วน (Quick Daily Attendance & UPPH Editor)',
                  'Quick Daily Attendance & UPPH Editor',
                  '每日出勤与 UPPH 快速编辑栏'
                )}
              </span>
            </div>
            <label className="inline-flex items-center gap-1.5 text-emerald-900 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={autoRecalcUpphOnAttendanceChange}
                onChange={e => setAutoRecalcUpphOnAttendanceChange(e.target.checked)}
                className="rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500"
              />
              <span>
                {t(
                  'คำนวณ Act UPPH อัตโนมัติเมื่อแก้จำนวนคนมาทำงาน (Attendance)',
                  'Auto-recalculate Act UPPH when Attendance changes',
                  '修改出勤人数时自动重算实际 UPPH'
                )}
              </span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <label className="font-semibold text-slate-700">{t('สายการผลิต:', 'Prod-Line:', '产线:')}</label>
              <select
                value={quickLineId}
                onChange={e => setQuickLineId(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2.5 py-1 font-bold text-slate-800"
              >
                {data.lines.map(l => (
                  <option key={l.id} value={l.id}>{l.prodLine} ({l.plant})</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <label className="font-semibold text-slate-700">{t('วันที่:', 'Day:', '日期:')}</label>
              <select
                value={quickDay}
                onChange={e => setQuickDay(Number(e.target.value))}
                className="bg-white border border-slate-300 rounded px-2.5 py-1 font-bold text-slate-800"
              >
                {data.days.map(d => (
                  <option key={d.day} value={d.day}>
                    {t(`วันที่ ${d.day} (${d.weekday})`, `Day ${d.day} (${d.weekday})`, `${d.day}日 (${d.weekday})`)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <label className="font-semibold text-slate-700">On-the-job(在册):</label>
              <input
                type="number"
                placeholder="เช่น 125"
                value={quickOnTheJob}
                onChange={e => setQuickOnTheJob(e.target.value)}
                className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 font-semibold"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label className="font-semibold text-slate-700">Attendance(出勤):</label>
              <input
                type="number"
                placeholder="เช่น 117"
                value={quickAttendance}
                onChange={e => setQuickAttendance(e.target.value)}
                className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 font-semibold"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label className="font-semibold text-slate-700">Target UPPH(目标):</label>
              <input
                type="number"
                step="0.01"
                placeholder="เช่น 1.22"
                value={quickTargetUpph}
                onChange={e => setQuickTargetUpph(e.target.value)}
                className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 font-semibold"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label className="font-semibold text-slate-700">Act UPPH(实际):</label>
              <input
                type="number"
                step="0.01"
                placeholder="เช่น 1.32"
                value={quickActUpph}
                onChange={e => setQuickActUpph(e.target.value)}
                className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 font-semibold"
              />
            </div>

            <button
              onClick={handleQuickEntrySave}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-2xs flex items-center gap-1 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{t('อัปเดตลงตาราง & บันทึกบน Web', 'Update & Save on Web', '更新并保存')}</span>
            </button>
          </div>

          {/* Batch Target UPPH setter */}
          <div className="pt-2 border-t border-emerald-200/80 flex flex-wrap items-center gap-3">
            <span className="font-semibold text-emerald-900">
              {t('ตั้งค่า Target UPPH ทั้งเดือน:', 'Set Monthly Target UPPH for All Days:', '批量设置全月目标 UPPH:')}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-slate-700">Line A Target:</span>
              <input
                type="number"
                step="0.01"
                value={batchTargetA}
                onChange={e => setBatchTargetA(e.target.value)}
                className="w-20 bg-white border border-slate-300 rounded px-2 py-0.5 font-bold text-slate-800"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-700">Line B Target:</span>
              <input
                type="number"
                step="0.01"
                value={batchTargetB}
                onChange={e => setBatchTargetB(e.target.value)}
                className="w-20 bg-white border border-slate-300 rounded px-2 py-0.5 font-bold text-slate-800"
              />
            </div>
            <button
              onClick={handleApplyBatchTargets}
              className="px-2.5 py-0.5 bg-[#0070c0] hover:bg-[#005a9e] text-white font-semibold rounded cursor-pointer"
            >
              {t('นำไปใช้ทุกวันในตาราง', 'Apply to All Days', '应用至全月')}
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          COLLAPSIBLE PANEL 2: ADD DAY COLUMN BAR
         ===================================================================== */}
      {showAddDayBar && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-bold text-blue-950 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-[#0070c0]" />
            <span>{t('เพิ่มคอลัมน์วันใน Sheet UPPH:', 'Add Day Column to UPPH Sheet:', '新增日期列:')}</span>
          </span>
          <div className="flex items-center gap-1.5">
            <label className="text-slate-700">{t('วันที่ (1-31):', 'Day (1-31):', '日期 (1-31):')}</label>
            <input
              type="number"
              min={1}
              max={31}
              value={newDayNum}
              onChange={e => setNewDayNum(Number(e.target.value))}
              className="w-16 bg-white border border-slate-300 rounded px-2 py-1 font-bold"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-slate-700">{t('วันในสัปดาห์:', 'Weekday:', '星期:')}</label>
            <select
              value={newDayWeekday}
              onChange={e => setNewDayWeekday(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2 py-1 font-bold"
            >
              {['MON', 'TUE', 'WEN', 'THU', 'FRI', 'SAT', 'SUN'].map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAddDayColumn}
            className="px-3 py-1 bg-[#0070c0] hover:bg-[#005a9e] text-white font-bold rounded cursor-pointer"
          >
            {t('เพิ่มคอลัมน์', 'Add Column', '添加')}
          </button>
          <button
            onClick={() => setShowAddDayBar(false)}
            className="px-2 py-1 text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            {t('ยกเลิก', 'Cancel', '取消')}
          </button>
        </div>
      )}

      {/* =====================================================================
          COLLAPSIBLE PANEL 3: INLINE MONTHLY CHART DATA EDITOR
         ===================================================================== */}
      {showMonthlyEditor && (
        <div className="bg-white border border-blue-300 rounded-md p-3.5 shadow-sm space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-[#0070c0]" />
                <span>
                  {t(
                    'ตารางแก้ไขข้อมูลกราฟ Month Production (月度产出) & Month UPPH (月度UPPH)',
                    'Edit Monthly Production & Monthly UPPH Chart Data',
                    '编辑月度产出与月度 UPPH 图表数据'
                  )}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                {t(
                  'พิมพ์แก้ไขตัวเลขยอดผลิตรายเดือน หรือค่า UPPH รายเดือนด้านล่าง กราฟด้านซ้ายจะอัปเดตทันที',
                  'Edit monthly production or UPPH values below to immediately update the charts.',
                  '直接修改下方月度产出或月度 UPPH 数值，左侧图表将实时更新。'
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddMonthlyRow}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#0070c0] border border-blue-200 rounded text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('เพิ่มเดือน', 'Add Month', '新增月份')}</span>
              </button>
              <button
                onClick={() => setShowMonthlyEditor(false)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('เสร็จสิ้น', 'Done', '完成')}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#0070c0] text-white">
                  <th className="border border-blue-700 px-2.5 py-1.5 text-center">Month</th>
                  <th className="border border-blue-700 px-2.5 py-1.5 text-right bg-[#0091da]">
                    Month Production Line A
                  </th>
                  <th className="border border-blue-700 px-2.5 py-1.5 text-right">
                    Month Production Line B
                  </th>
                  <th className="border border-blue-700 px-2.5 py-1.5 text-right bg-[#0091da]">
                    Month UPPH Line A
                  </th>
                  <th className="border border-blue-700 px-2.5 py-1.5 text-right">
                    Month UPPH Line B
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.monthlyData.map((m, idx) => (
                  <tr key={idx} className="even:bg-slate-50 hover:bg-blue-50/40">
                    <td className="border border-slate-200 px-2 py-1 text-center font-semibold">
                      <input
                        type="text"
                        value={m.month}
                        onChange={e => handleUpdateMonthlyItem(idx, 'month', e.target.value)}
                        className="w-24 text-center bg-transparent border border-transparent hover:border-slate-300 focus:border-[#0070c0] focus:bg-white rounded px-1 py-0.5 font-semibold"
                      />
                    </td>
                    <td className="border border-slate-200 px-2 py-1 text-right">
                      <input
                        type="number"
                        value={m.prodLineA}
                        onChange={e => handleUpdateMonthlyItem(idx, 'prodLineA', e.target.value)}
                        className="w-28 text-right bg-transparent border border-transparent hover:border-slate-300 focus:border-[#0070c0] focus:bg-white rounded px-1.5 py-0.5 font-bold text-[#0091da]"
                      />
                    </td>
                    <td className="border border-slate-200 px-2 py-1 text-right">
                      <input
                        type="number"
                        value={m.prodLineB}
                        onChange={e => handleUpdateMonthlyItem(idx, 'prodLineB', e.target.value)}
                        className="w-28 text-right bg-transparent border border-transparent hover:border-slate-300 focus:border-[#0070c0] focus:bg-white rounded px-1.5 py-0.5 font-bold text-[#0070c0]"
                      />
                    </td>
                    <td className="border border-slate-200 px-2 py-1 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={m.upphLineA}
                        onChange={e => handleUpdateMonthlyItem(idx, 'upphLineA', e.target.value)}
                        className="w-24 text-right bg-transparent border border-transparent hover:border-slate-300 focus:border-[#0070c0] focus:bg-white rounded px-1.5 py-0.5 font-bold text-[#0091da]"
                      />
                    </td>
                    <td className="border border-slate-200 px-2 py-1 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={m.upphLineB}
                        onChange={e => handleUpdateMonthlyItem(idx, 'upphLineB', e.target.value)}
                        className="w-24 text-right bg-transparent border border-transparent hover:border-slate-300 focus:border-[#0070c0] focus:bg-white rounded px-1.5 py-0.5 font-bold text-[#0070c0]"
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
          MAIN ORIGINAL UPPH OEC CONTENT:
          In 'original-split' mode: Left Column (44% width on XL) = 2 Charts,
                                    Right Column (56% width on XL) = 2 Matrices
         ===================================================================== */}
      <div
        className={
          layoutMode === 'original-split'
            ? 'grid grid-cols-1 xl:grid-cols-12 gap-3 items-start'
            : 'space-y-4'
        }
      >
        {/* LEFT COLUMN: Month Production(月度产出) & Month UPPH(月度UPPH) */}
        <div
          className={
            layoutMode === 'original-split'
              ? 'xl:col-span-5 space-y-3'
              : 'grid grid-cols-1 lg:grid-cols-2 gap-4'
          }
        >
          {/* Top-Left Chart Card: Month Production(月度产出) */}
          <div className="bg-white rounded-md border border-slate-300 shadow-xs p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex-1 text-center">
                <h3 className="text-base font-bold text-slate-800">
                  Month Production(月度产出)
                </h3>
                {/* Legend matching screenshot */}
                <div className="flex items-center justify-center gap-4 mt-1 text-xs font-semibold text-slate-700">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-[#00b0f0] inline-block" />
                    Line A
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-[#0070c0] inline-block" />
                    Line B
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowMonthlyEditor(!showMonthlyEditor)}
                className="text-[11px] text-[#0070c0] hover:underline flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 cursor-pointer"
                title={t('คลิกเพื่อแก้ไขตัวเลขกราฟ', 'Click to edit chart numbers', '点击修改图表数据')}
              >
                <Edit3 className="w-3 h-3" />
                <span>{t('แก้ไข', 'Edit', '编辑')}</span>
              </button>
            </div>

            {/* SVG Grouped Bar Chart matching screenshot */}
            <div className="w-full overflow-x-auto select-none">
              {(() => {
                const items = data.monthlyData;
                const svgW = 680;
                const svgH = 245;
                const pad = { top: 28, right: 20, bottom: 28, left: 20 };
                const innerW = svgW - pad.left - pad.right;
                const innerH = svgH - pad.top - pad.bottom;

                const allVals = items.flatMap(m => [m.prodLineA, m.prodLineB]);
                const maxVal = Math.max(...allVals, 60000) * 1.14;
                const stepW = items.length > 0 ? innerW / items.length : innerW;
                const barW = Math.min(22, stepW * 0.34);

                return (
                  <svg
                    viewBox={`0 0 ${svgW} ${svgH}`}
                    className="w-full h-auto min-w-[500px]"
                  >
                    {[0.25, 0.5, 0.75, 1].map((r, i) => (
                      <line
                        key={i}
                        x1={pad.left}
                        y1={pad.top + innerH * r}
                        x2={svgW - pad.right}
                        y2={pad.top + innerH * r}
                        stroke="#f1f5f9"
                        strokeWidth="1"
                      />
                    ))}

                    {items.map((m, idx) => {
                      const centerX = pad.left + stepW * idx + stepW / 2;
                      const hA = Math.max(2, (m.prodLineA / maxVal) * innerH);
                      const hB = Math.max(2, (m.prodLineB / maxVal) * innerH);
                      const yA = pad.top + innerH - hA;
                      const yB = pad.top + innerH - hB;

                      const showA = selectedProdLine === 'All' || selectedProdLine === 'Line A';
                      const showB = selectedProdLine === 'All' || selectedProdLine === 'Line B';
                      const xA = showB ? centerX - barW - 2 : centerX - barW / 2;
                      const xB = showA ? centerX + 2 : centerX - barW / 2;

                      return (
                        <g
                          key={m.month}
                          onMouseEnter={() => setHoveredMonthIdx({ chart: 'prod', idx })}
                          onMouseLeave={() => setHoveredMonthIdx(null)}
                          onClick={() => setShowMonthlyEditor(true)}
                          className="cursor-pointer"
                        >
                          {showA && (
                            <>
                              <rect
                                x={xA}
                                y={yA}
                                width={barW}
                                height={hA}
                                fill="#00b0f0"
                                rx="1.5"
                              />
                              <text
                                x={xA + barW / 2}
                                y={yA - 5}
                                textAnchor="middle"
                                className="text-[9.5px] font-bold fill-slate-800"
                              >
                                {m.prodLineA.toLocaleString()}
                              </text>
                            </>
                          )}
                          {showB && (
                            <>
                              <rect
                                x={xB}
                                y={yB}
                                width={barW}
                                height={hB}
                                fill="#0070c0"
                                rx="1.5"
                              />
                              <text
                                x={xB + barW / 2}
                                y={yB - 5}
                                textAnchor="middle"
                                className="text-[9.5px] font-bold fill-slate-800"
                              >
                                {m.prodLineB.toLocaleString()}
                              </text>
                            </>
                          )}
                          <text
                            x={centerX}
                            y={svgH - 8}
                            textAnchor="middle"
                            className="text-[10.5px] font-semibold fill-slate-700"
                          >
                            {m.month}
                          </text>
                        </g>
                      );
                    })}

                    <line
                      x1={pad.left}
                      y1={pad.top + innerH}
                      x2={svgW - pad.right}
                      y2={pad.top + innerH}
                      stroke="#cbd5e1"
                      strokeWidth="1"
                    />
                  </svg>
                );
              })()}
            </div>
          </div>

          {/* Bottom-Left Chart Card: Month UPPH(月度UPPH) */}
          <div className="bg-white rounded-md border border-slate-300 shadow-xs p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex-1 text-center">
                <h3 className="text-base font-bold text-slate-800">
                  Month UPPH(月度UPPH)
                </h3>
                {/* Legend matching screenshot */}
                <div className="flex items-center justify-center gap-4 mt-1 text-xs font-semibold text-slate-700">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#00b0f0] inline-block" />
                    Line A
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#0070c0] inline-block" />
                    Line B
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowMonthlyEditor(!showMonthlyEditor)}
                className="text-[11px] text-[#0070c0] hover:underline flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 cursor-pointer"
                title={t('คลิกเพื่อแก้ไขตัวเลขกราฟ UPPH', 'Click to edit UPPH chart numbers', '点击修改 UPPH 图表数据')}
              >
                <Edit3 className="w-3 h-3" />
                <span>{t('แก้ไข', 'Edit', '编辑')}</span>
              </button>
            </div>

            {/* SVG Dual Line Chart matching screenshot */}
            <div className="w-full overflow-x-auto select-none">
              {(() => {
                const items = data.monthlyData;
                const svgW = 680;
                const svgH = 245;
                const pad = { top: 28, right: 32, bottom: 28, left: 32 };
                const innerW = svgW - pad.left - pad.right;
                const innerH = svgH - pad.top - pad.bottom;

                const allVals = items.flatMap(m => [m.upphLineA, m.upphLineB]);
                const maxVal = Math.max(...allVals, 1.3) * 1.15;
                const minVal = 0;

                const getX = (i: number) =>
                  items.length <= 1
                    ? pad.left + innerW / 2
                    : pad.left + (i / (items.length - 1)) * innerW;

                const getY = (v: number) =>
                  pad.top + innerH - ((v - minVal) / (maxVal - minVal)) * innerH;

                const ptsA = items.map((m, i) => ({
                  x: getX(i),
                  y: getY(m.upphLineA),
                  val: m.upphLineA,
                  month: m.month,
                }));
                const ptsB = items.map((m, i) => ({
                  x: getX(i),
                  y: getY(m.upphLineB),
                  val: m.upphLineB,
                  month: m.month,
                }));

                const pathA = createSmoothPath(ptsA);
                const pathB = createSmoothPath(ptsB);

                const showA = selectedProdLine === 'All' || selectedProdLine === 'Line A';
                const showB = selectedProdLine === 'All' || selectedProdLine === 'Line B';

                return (
                  <svg
                    viewBox={`0 0 ${svgW} ${svgH}`}
                    className="w-full h-auto min-w-[500px]"
                  >
                    {[0.25, 0.5, 0.75, 1].map((r, i) => (
                      <line
                        key={i}
                        x1={pad.left}
                        y1={pad.top + innerH * r}
                        x2={svgW - pad.right}
                        y2={pad.top + innerH * r}
                        stroke="#f1f5f9"
                        strokeWidth="1"
                      />
                    ))}

                    {showB && (
                      <path
                        d={pathB}
                        fill="none"
                        stroke="#0070c0"
                        strokeWidth="2.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                    {showA && (
                      <path
                        d={pathA}
                        fill="none"
                        stroke="#00b0f0"
                        strokeWidth="2.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Nodes & Labels for Line B */}
                    {showB &&
                      ptsB.map((pt, i) => {
                        const isBelowA = pt.y >= ptsA[i].y;
                        const lblY = isBelowA ? pt.y + 15 : pt.y - 8;
                        return (
                          <g
                            key={`b-${i}`}
                            onClick={() => setShowMonthlyEditor(true)}
                            onMouseEnter={() => setHoveredMonthIdx({ chart: 'upph', idx: i })}
                            onMouseLeave={() => setHoveredMonthIdx(null)}
                            className="cursor-pointer"
                          >
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={hoveredMonthIdx?.idx === i ? 5 : 3.5}
                              fill="#0070c0"
                              stroke="#fff"
                              strokeWidth="1.5"
                            />
                            <text
                              x={pt.x}
                              y={lblY}
                              textAnchor="middle"
                              className="text-[10px] font-bold fill-slate-800"
                            >
                              {pt.val.toFixed(2)}
                            </text>
                          </g>
                        );
                      })}

                    {/* Nodes & Labels for Line A */}
                    {showA &&
                      ptsA.map((pt, i) => {
                        const isAboveB = pt.y < ptsB[i].y;
                        const lblY = isAboveB ? pt.y - 8 : pt.y + 15;
                        return (
                          <g
                            key={`a-${i}`}
                            onClick={() => setShowMonthlyEditor(true)}
                            onMouseEnter={() => setHoveredMonthIdx({ chart: 'upph', idx: i })}
                            onMouseLeave={() => setHoveredMonthIdx(null)}
                            className="cursor-pointer"
                          >
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={hoveredMonthIdx?.idx === i ? 5 : 3.5}
                              fill="#00b0f0"
                              stroke="#fff"
                              strokeWidth="1.5"
                            />
                            <text
                              x={pt.x}
                              y={lblY}
                              textAnchor="middle"
                              className="text-[10px] font-bold fill-slate-800"
                            >
                              {pt.val.toFixed(2)}
                            </text>
                          </g>
                        );
                      })}

                    {/* X Axis Month labels */}
                    {items.map((m, i) => (
                      <text
                        key={`xl-${m.month}`}
                        x={getX(i)}
                        y={svgH - 8}
                        textAnchor="middle"
                        className="text-[10.5px] font-semibold fill-slate-700"
                      >
                        {m.month}
                      </text>
                    ))}

                    <line
                      x1={pad.left}
                      y1={pad.top + innerH}
                      x2={svgW - pad.right}
                      y2={pad.top + innerH}
                      stroke="#cbd5e1"
                      strokeWidth="1"
                    />
                  </svg>
                );
              })()}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Top Matrix (On-the-job / Attendance / Gap) & Bottom Matrix (Target UPPH / Act UPPH / Gap) */}
        <div
          className={
            layoutMode === 'original-split' ? 'xl:col-span-7 space-y-3' : 'space-y-4'
          }
        >
          {/* =================================================================
              TABLE 1 (TOP-RIGHT): ATTENDANCE OEC MATRIX
              On-the-job(在册) | Attendance(出勤) | Gap(差异)
             ================================================================= */}
          <div className="bg-white rounded-md border border-slate-300 shadow-xs overflow-hidden">
            <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0070c0]" />
                <span className="text-xs font-bold text-slate-800">
                  {t(
                    'ตารางที่ 1: อัตรากำลังคนรายวัน — On-the-job(在册) / Attendance(出勤) / Gap(差异)',
                    'Table 1: Daily Manpower & Attendance OEC — On-the-job(在册) / Attendance(出勤) / Gap(差异)',
                    '表 1: 每日在册与出勤日清表 — On-the-job(在册) / Attendance(出勤) / Gap(差异)'
                  )}
                </span>
              </div>
              <span className="text-[11px] text-[#0070c0] font-semibold">
                {t(
                  '* คลิกที่ตัวเลขเพื่อแก้ไขได้ทันที (Gap = Attendance - On-the-job)',
                  '* Click any cell to edit (Gap = Attendance - On-the-job)',
                  '* 点击任意单元格即可修改 (Gap = 出勤 - 在册)'
                )}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[11px] select-none">
                <thead>
                  <tr className="bg-[#0070c0] text-white font-bold">
                    <th
                      rowSpan={2}
                      className="border border-blue-800 px-2 py-1 text-center sticky left-0 z-20 bg-[#0070c0] min-w-[78px]"
                    >
                      Plant
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-blue-800 px-2 py-1 text-center sticky left-[78px] z-20 bg-[#0070c0] min-w-[64px]"
                    >
                      Prod-line
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-blue-800 px-2 py-1 text-left sticky left-[142px] z-20 bg-[#0070c0] min-w-[118px]"
                    >
                      Category
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-blue-800 px-2 py-1 text-center sticky left-[260px] z-20 bg-[#005a9e] min-w-[48px]"
                    >
                      Total
                    </th>
                    {data.days.map(d => (
                      <th
                        key={`att-day-${d.day}`}
                        className="border border-blue-800 px-1.5 py-0.5 text-center min-w-[40px]"
                      >
                        {d.day}
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-[#0070c0] text-white font-semibold text-[10px]">
                    {data.days.map(d => (
                      <th
                        key={`att-wk-${d.day}`}
                        className="border border-blue-800 px-1 py-0.5 text-center"
                      >
                        {d.weekday}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLines.map((line, lineIdx) => {
                    const totalOtj = getLineTotalOnTheJob(line);
                    const totalAtt = getLineTotalAttendance(line);
                    const totalGap = totalAtt - totalOtj;
                    const totalPlantRows = filteredLines.length * 3;

                    return (
                      <React.Fragment key={`att-${line.id}`}>
                        {/* ROW 1: On-the-job(在册) */}
                        <tr className="hover:bg-blue-50/40 transition-colors">
                          {lineIdx === 0 && (
                            <td
                              rowSpan={totalPlantRows}
                              className="border border-slate-300 px-1.5 py-1 text-center font-bold text-slate-800 bg-white sticky left-0 z-10 align-middle"
                            >
                              <div className="leading-tight whitespace-pre-line">
                                {line.plant.replace('(', '\n(')}
                              </div>
                            </td>
                          )}
                          <td
                            rowSpan={3}
                            className="border border-slate-300 px-1.5 py-1 text-center font-bold text-slate-800 bg-white sticky left-[78px] z-10 align-middle"
                          >
                            {line.prodLine}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 font-semibold text-slate-800 bg-slate-50 sticky left-[142px] z-10 whitespace-nowrap">
                            On-the-job(在册)
                          </td>

                          {/* Total On-the-job */}
                          <td
                            onClick={() =>
                              handleStartEdit(line.id, 'onTheJob', 'TOTAL', totalOtj)
                            }
                            className="border border-slate-300 px-1.5 py-1 text-center font-bold text-slate-900 bg-slate-100 sticky left-[260px] z-10 cursor-pointer hover:bg-blue-100"
                            title={t('คลิกเพื่อแก้ไขค่า Total', 'Click to edit Total', '点击修改合计值')}
                          >
                            {editingCell?.lineId === line.id &&
                            editingCell?.category === 'onTheJob' &&
                            editingCell?.day === 'TOTAL' ? (
                              <input
                                autoFocus
                                type="number"
                                value={editingCell.val}
                                onChange={e =>
                                  setEditingCell({ ...editingCell, val: e.target.value })
                                }
                                onBlur={handleCommitEdit}
                                onKeyDown={handleKeyDown}
                                className="w-12 text-center bg-white border border-[#0070c0] rounded px-0.5 py-0 text-[11px] font-bold focus:outline-none"
                              />
                            ) : (
                              totalOtj
                            )}
                          </td>

                          {/* Daily On-the-job cells */}
                          {data.days.map(d => {
                            const val = line.onTheJob[d.day];
                            const isEditing =
                              editingCell?.lineId === line.id &&
                              editingCell?.category === 'onTheJob' &&
                              editingCell?.day === d.day;

                            return (
                              <td
                                key={`otj-${line.id}-${d.day}`}
                                onClick={() =>
                                  handleStartEdit(line.id, 'onTheJob', d.day, val)
                                }
                                className="border border-slate-300 px-1 py-1 text-center text-slate-800 hover:bg-blue-50 cursor-pointer"
                              >
                                {isEditing ? (
                                  <input
                                    autoFocus
                                    type="number"
                                    value={editingCell.val}
                                    onChange={e =>
                                      setEditingCell({ ...editingCell, val: e.target.value })
                                    }
                                    onBlur={handleCommitEdit}
                                    onKeyDown={handleKeyDown}
                                    className="w-11 text-center bg-white border border-[#0070c0] rounded px-0.5 py-0 text-[11px] font-bold focus:outline-none"
                                  />
                                ) : val !== null && val !== undefined ? (
                                  val
                                ) : (
                                  ''
                                )}
                              </td>
                            );
                          })}
                        </tr>

                        {/* ROW 2: Attendance(出勤) */}
                        <tr className="hover:bg-blue-50/40 transition-colors">
                          <td className="border border-slate-300 px-2 py-1 font-semibold text-slate-800 bg-slate-50 sticky left-[142px] z-10 whitespace-nowrap">
                            Attendance(出勤)
                          </td>

                          {/* Total Attendance */}
                          <td
                            onClick={() =>
                              handleStartEdit(line.id, 'attendance', 'TOTAL', totalAtt)
                            }
                            className="border border-slate-300 px-1.5 py-1 text-center font-bold text-slate-900 bg-slate-100 sticky left-[260px] z-10 cursor-pointer hover:bg-blue-100"
                          >
                            {editingCell?.lineId === line.id &&
                            editingCell?.category === 'attendance' &&
                            editingCell?.day === 'TOTAL' ? (
                              <input
                                autoFocus
                                type="number"
                                value={editingCell.val}
                                onChange={e =>
                                  setEditingCell({ ...editingCell, val: e.target.value })
                                }
                                onBlur={handleCommitEdit}
                                onKeyDown={handleKeyDown}
                                className="w-12 text-center bg-white border border-[#0070c0] rounded px-0.5 py-0 text-[11px] font-bold focus:outline-none"
                              />
                            ) : (
                              totalAtt
                            )}
                          </td>

                          {/* Daily Attendance cells */}
                          {data.days.map(d => {
                            const val = line.attendance[d.day];
                            const isEditing =
                              editingCell?.lineId === line.id &&
                              editingCell?.category === 'attendance' &&
                              editingCell?.day === d.day;

                            return (
                              <td
                                key={`att-${line.id}-${d.day}`}
                                onClick={() =>
                                  handleStartEdit(line.id, 'attendance', d.day, val)
                                }
                                className="border border-slate-300 px-1 py-1 text-center text-slate-800 hover:bg-blue-50 cursor-pointer"
                              >
                                {isEditing ? (
                                  <input
                                    autoFocus
                                    type="number"
                                    value={editingCell.val}
                                    onChange={e =>
                                      setEditingCell({ ...editingCell, val: e.target.value })
                                    }
                                    onBlur={handleCommitEdit}
                                    onKeyDown={handleKeyDown}
                                    className="w-11 text-center bg-white border border-[#0070c0] rounded px-0.5 py-0 text-[11px] font-bold focus:outline-none"
                                  />
                                ) : val !== null && val !== undefined ? (
                                  val
                                ) : (
                                  ''
                                )}
                              </td>
                            );
                          })}
                        </tr>

                        {/* ROW 3: Gap(差异) = Attendance - On-the-job */}
                        <tr className="bg-slate-50/70 border-b-2 border-slate-300">
                          <td className="border border-slate-300 px-2 py-1 font-semibold text-slate-700 bg-slate-100 sticky left-[142px] z-10 whitespace-nowrap">
                            Gap(差异)
                          </td>
                          <td
                            className={`border border-slate-300 px-1.5 py-1 text-center font-bold bg-slate-100 sticky left-[260px] z-10 ${
                              totalGap < 0 ? 'text-red-600' : 'text-slate-900'
                            }`}
                          >
                            {totalGap}
                          </td>
                          {data.days.map(d => {
                            const otj = line.onTheJob[d.day];
                            const att = line.attendance[d.day];
                            const hasBoth =
                              otj !== null &&
                              otj !== undefined &&
                              att !== null &&
                              att !== undefined;
                            const gapVal = hasBoth ? Number(att) - Number(otj) : null;

                            return (
                              <td
                                key={`att-gap-${line.id}-${d.day}`}
                                className={`border border-slate-300 px-1 py-1 text-center font-semibold ${
                                  gapVal !== null && gapVal < 0
                                    ? 'text-red-600'
                                    : 'text-slate-800'
                                }`}
                              >
                                {gapVal !== null ? gapVal : ''}
                              </td>
                            );
                          })}
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* =================================================================
              TABLE 2 (BOTTOM-RIGHT): DAILY UPPH OEC MATRIX
              Target UPPH(目标) | Act UPPH(实际) | Gap(差异)
             ================================================================= */}
          <div className="bg-white rounded-md border border-slate-300 shadow-xs overflow-hidden">
            <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-[#0070c0]" />
                <span className="text-xs font-bold text-slate-800">
                  {t(
                    'ตารางที่ 2: ประสิทธิภาพรายคนต่อชั่วโมง (UPPH) — Target UPPH(目标) / Act UPPH(实际) / Gap(差异)',
                    'Table 2: Daily UPPH Matrix — Target UPPH(目标) / Act UPPH(实际) / Gap(差异)',
                    '表 2: 每日人均小时产出 (UPPH) 日清表 — Target UPPH(目标) / Act UPPH(实际) / Gap(差异)'
                  )}
                </span>
              </div>
              <span className="text-[11px] text-[#0070c0] font-semibold">
                {t(
                  '* คลิกที่ตัวเลขเพื่อแก้ไขได้ทันที (Gap = Act UPPH - Target UPPH)',
                  '* Click any cell to edit (Gap = Act UPPH - Target UPPH)',
                  '* 点击任意单元格即可修改 (Gap = 实际 UPPH - 目标 UPPH)'
                )}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[11px] select-none">
                <thead>
                  <tr className="bg-[#0070c0] text-white font-bold">
                    <th
                      rowSpan={2}
                      className="border border-blue-800 px-2 py-1 text-center sticky left-0 z-20 bg-[#0070c0] min-w-[78px]"
                    >
                      Plant
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-blue-800 px-2 py-1 text-center sticky left-[78px] z-20 bg-[#0070c0] min-w-[64px]"
                    >
                      Prod-line
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-blue-800 px-2 py-1 text-left sticky left-[142px] z-20 bg-[#0070c0] min-w-[118px]"
                    >
                      Category
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-blue-800 px-2 py-1 text-center sticky left-[260px] z-20 bg-[#005a9e] min-w-[48px]"
                    >
                      Total
                    </th>
                    {data.days.map(d => (
                      <th
                        key={`upph-day-${d.day}`}
                        className="border border-blue-800 px-1.5 py-0.5 text-center min-w-[40px]"
                      >
                        {d.day}
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-[#0070c0] text-white font-semibold text-[10px]">
                    {data.days.map(d => (
                      <th
                        key={`upph-wk-${d.day}`}
                        className="border border-blue-800 px-1 py-0.5 text-center"
                      >
                        {d.weekday}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLines.map((line, lineIdx) => {
                    const totalTarget = getLineTotalTargetUpph(line);
                    const totalAct = getLineTotalActUpph(line);
                    const totalGap = Number((totalAct - totalTarget).toFixed(2));
                    const totalPlantRows = filteredLines.length * 3;

                    return (
                      <React.Fragment key={`upph-${line.id}`}>
                        {/* ROW 1: Target UPPH(目标) */}
                        <tr className="hover:bg-blue-50/40 transition-colors">
                          {lineIdx === 0 && (
                            <td
                              rowSpan={totalPlantRows}
                              className="border border-slate-300 px-1.5 py-1 text-center font-bold text-slate-800 bg-white sticky left-0 z-10 align-middle"
                            >
                              <div className="leading-tight whitespace-pre-line">
                                {line.plant.replace('(', '\n(')}
                              </div>
                            </td>
                          )}
                          <td
                            rowSpan={3}
                            className="border border-slate-300 px-1.5 py-1 text-center font-bold text-slate-800 bg-white sticky left-[78px] z-10 align-middle"
                          >
                            {line.prodLine}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 font-semibold text-slate-800 bg-slate-50 sticky left-[142px] z-10 whitespace-nowrap">
                            Target UPPH(目标)
                          </td>

                          {/* Total Target UPPH */}
                          <td
                            onClick={() =>
                              handleStartEdit(line.id, 'targetUpph', 'TOTAL', totalTarget)
                            }
                            className="border border-slate-300 px-1.5 py-1 text-center font-bold text-slate-900 bg-slate-100 sticky left-[260px] z-10 cursor-pointer hover:bg-blue-100"
                          >
                            {editingCell?.lineId === line.id &&
                            editingCell?.category === 'targetUpph' &&
                            editingCell?.day === 'TOTAL' ? (
                              <input
                                autoFocus
                                type="number"
                                step="0.01"
                                value={editingCell.val}
                                onChange={e =>
                                  setEditingCell({ ...editingCell, val: e.target.value })
                                }
                                onBlur={handleCommitEdit}
                                onKeyDown={handleKeyDown}
                                className="w-12 text-center bg-white border border-[#0070c0] rounded px-0.5 py-0 text-[11px] font-bold focus:outline-none"
                              />
                            ) : (
                              totalTarget.toFixed(2)
                            )}
                          </td>

                          {/* Daily Target UPPH cells */}
                          {data.days.map(d => {
                            const val = line.targetUpph[d.day];
                            const isEditing =
                              editingCell?.lineId === line.id &&
                              editingCell?.category === 'targetUpph' &&
                              editingCell?.day === d.day;

                            return (
                              <td
                                key={`tgt-${line.id}-${d.day}`}
                                onClick={() =>
                                  handleStartEdit(line.id, 'targetUpph', d.day, val)
                                }
                                className="border border-slate-300 px-1 py-1 text-center text-slate-800 hover:bg-blue-50 cursor-pointer"
                              >
                                {isEditing ? (
                                  <input
                                    autoFocus
                                    type="number"
                                    step="0.01"
                                    value={editingCell.val}
                                    onChange={e =>
                                      setEditingCell({ ...editingCell, val: e.target.value })
                                    }
                                    onBlur={handleCommitEdit}
                                    onKeyDown={handleKeyDown}
                                    className="w-12 text-center bg-white border border-[#0070c0] rounded px-0.5 py-0 text-[11px] font-bold focus:outline-none"
                                  />
                                ) : val !== null && val !== undefined ? (
                                  Number(val).toFixed(2)
                                ) : (
                                  ''
                                )}
                              </td>
                            );
                          })}
                        </tr>

                        {/* ROW 2: Act UPPH(实际) */}
                        <tr className="hover:bg-blue-50/40 transition-colors">
                          <td className="border border-slate-300 px-2 py-1 font-semibold text-slate-800 bg-slate-50 sticky left-[142px] z-10 whitespace-nowrap">
                            Act UPPH(实际)
                          </td>

                          {/* Total Act UPPH */}
                          <td
                            onClick={() =>
                              handleStartEdit(line.id, 'actUpph', 'TOTAL', totalAct)
                            }
                            className="border border-slate-300 px-1.5 py-1 text-center font-bold text-slate-900 bg-slate-100 sticky left-[260px] z-10 cursor-pointer hover:bg-blue-100"
                          >
                            {editingCell?.lineId === line.id &&
                            editingCell?.category === 'actUpph' &&
                            editingCell?.day === 'TOTAL' ? (
                              <input
                                autoFocus
                                type="number"
                                step="0.01"
                                value={editingCell.val}
                                onChange={e =>
                                  setEditingCell({ ...editingCell, val: e.target.value })
                                }
                                onBlur={handleCommitEdit}
                                onKeyDown={handleKeyDown}
                                className="w-12 text-center bg-white border border-[#0070c0] rounded px-0.5 py-0 text-[11px] font-bold focus:outline-none"
                              />
                            ) : (
                              totalAct.toFixed(2)
                            )}
                          </td>

                          {/* Daily Act UPPH cells */}
                          {data.days.map(d => {
                            const val = line.actUpph[d.day];
                            const isEditing =
                              editingCell?.lineId === line.id &&
                              editingCell?.category === 'actUpph' &&
                              editingCell?.day === d.day;

                            return (
                              <td
                                key={`actupph-${line.id}-${d.day}`}
                                onClick={() =>
                                  handleStartEdit(line.id, 'actUpph', d.day, val)
                                }
                                className="border border-slate-300 px-1 py-1 text-center text-slate-900 font-medium hover:bg-blue-50 cursor-pointer"
                              >
                                {isEditing ? (
                                  <input
                                    autoFocus
                                    type="number"
                                    step="0.01"
                                    value={editingCell.val}
                                    onChange={e =>
                                      setEditingCell({ ...editingCell, val: e.target.value })
                                    }
                                    onBlur={handleCommitEdit}
                                    onKeyDown={handleKeyDown}
                                    className="w-12 text-center bg-white border border-[#0070c0] rounded px-0.5 py-0 text-[11px] font-bold focus:outline-none"
                                  />
                                ) : val !== null && val !== undefined ? (
                                  Number(val).toFixed(2)
                                ) : (
                                  ''
                                )}
                              </td>
                            );
                          })}
                        </tr>

                        {/* ROW 3: Gap(差异) = Act UPPH - Target UPPH */}
                        <tr className="bg-slate-50/70 border-b-2 border-slate-300">
                          <td className="border border-slate-300 px-2 py-1 font-semibold text-slate-700 bg-slate-100 sticky left-[142px] z-10 whitespace-nowrap">
                            Gap(差异)
                          </td>
                          <td
                            className={`border border-slate-300 px-1.5 py-1 text-center font-bold bg-slate-100 sticky left-[260px] z-10 ${
                              totalGap < 0 ? 'text-red-600' : 'text-slate-900'
                            }`}
                          >
                            {totalGap.toFixed(2)}
                          </td>
                          {data.days.map(d => {
                            const tgt = line.targetUpph[d.day];
                            const act = line.actUpph[d.day];
                            const hasBoth =
                              tgt !== null &&
                              tgt !== undefined &&
                              act !== null &&
                              act !== undefined;
                            const gapVal = hasBoth
                              ? Number((Number(act) - Number(tgt)).toFixed(2))
                              : null;

                            return (
                              <td
                                key={`upph-gap-${line.id}-${d.day}`}
                                className={`border border-slate-300 px-1 py-1 text-center font-semibold ${
                                  gapVal !== null && gapVal < 0
                                    ? 'text-red-600'
                                    : 'text-slate-800'
                                }`}
                              >
                                {gapVal !== null ? gapVal.toFixed(2) : ''}
                              </td>
                            );
                          })}
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  UpphSheetData,
  UpphLineData,
  UpphMonthlyItem,
  LineOECData,
  DayColumn,
  PeriodStorageState,
  MonthlyEfficiencyRow,
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
  Calculator,
  TrendingUp,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { INITIAL_UPPH_SHEET_DATA } from '../data/initialData';
import {
  calculateDailyActUpph,
  calculateLinePeriodUpph,
  buildUpphMatrixForPeriod,
  syncUpphSheetWithDailyOec,
  UPPH_DEFAULT_TARGETS,
} from '../utils/upphCalculator';

interface UpphOecViewProps {
  data: UpphSheetData;
  onUpdateData: (newData: UpphSheetData) => void;
  dailyOecLines: LineOECData[];
  dailyOecDays?: DayColumn[];
  periodData?: PeriodStorageState;
  monthlyEfficiency?: MonthlyEfficiencyRow[];
  activePeriodKey?: string;
  onUpdateDailyOecCell?: (
    monthKey: string,
    lineId: string,
    category: 'planning' | 'act' | 'workTime',
    day: number,
    value: number | null
  ) => void;
  onSaveOnWeb?: (customTitle?: string) => void;
  hasUnsavedChanges?: boolean;
  isSyncing?: boolean;
  plantName?: string;
}

type EditableUpphCategory = 'attendance' | 'targetUpph' | 'actUpph';

export const UpphOecView: React.FC<UpphOecViewProps> = ({
  data,
  onUpdateData,
  dailyOecLines,
  dailyOecDays,
  periodData,
  monthlyEfficiency = [],
  activePeriodKey,
  onUpdateDailyOecCell,
  onSaveOnWeb,
  hasUnsavedChanges = false,
  isSyncing = false,
}) => {
  const { t } = useAppPreferences();

  // Filter states inside the original UPPH OEC blue header bar
  const [selectedPlant, setSelectedPlant] = useState<string>('HTC Ref(泰国冰箱)');
  const [selectedProdLine, setSelectedProdLine] = useState<string>('All');

  const selectedMonthKey = data.activeMonth || '2026-09';
  const selectedMonthNum = parseInt(selectedMonthKey.split('-')[1] || '9', 10);
  const selectedMonthLabel = `${selectedMonthNum}月`;

  // Resolve full Daily OEC periodData combining live active period
  const resolvedPeriodData = useMemo<PeriodStorageState>(() => {
    const merged: PeriodStorageState = { ...(periodData || {}) };
    if (activePeriodKey && dailyOecLines?.length > 0) {
      merged[activePeriodKey] = {
        lines: dailyOecLines,
        days:
          dailyOecDays && dailyOecDays.length > 0
            ? dailyOecDays
            : merged[activePeriodKey]?.days || data.days,
        updatedAt: merged[activePeriodKey]?.updatedAt,
      };
    }
    return merged;
  }, [periodData, activePeriodKey, dailyOecLines, dailyOecDays, data.days]);

  const monthOecEntry = resolvedPeriodData[selectedMonthKey];
  const monthOecLines = useMemo<LineOECData[]>(() => {
    if (monthOecEntry?.lines?.length) return monthOecEntry.lines;
    if (selectedMonthKey === activePeriodKey) return dailyOecLines;
    return [];
  }, [monthOecEntry, selectedMonthKey, activePeriodKey, dailyOecLines]);

  // View layout mode: 'original-split' (Left Charts + Right 2 Tables like original image) or 'expanded' (Full width)
  const [layoutMode, setLayoutMode] = useState<'original-split' | 'expanded'>('original-split');

  // Toggle inline panels
  const [showMonthlyEditor, setShowMonthlyEditor] = useState<boolean>(false);
  const [showQuickEntry, setShowQuickEntry] = useState<boolean>(false);
  const [showAddDayBar, setShowAddDayBar] = useState<boolean>(false);
  const [autoRecalcUpphOnAttendanceChange, setAutoRecalcUpphOnAttendanceChange] = useState<boolean>(true);

  // Quick Batch Fill Manpower state (for Table 1)
  const [batchManpowerLineId, setBatchManpowerLineId] = useState<string>(data.lines[0]?.id || 'line-a');
  const [batchManpowerVal, setBatchManpowerVal] = useState<string>('');

  // Active cell editing state for the right-hand matrices
  const [editingCell, setEditingCell] = useState<{
    lineId: string;
    category: EditableUpphCategory;
    day: number | 'TOTAL';
    val: string;
  } | null>(null);

  // Active cell editing state for linked Daily OEC Output cells inside Table 1
  const [editingOecCell, setEditingOecCell] = useState<{
    lineId: string;
    category: 'act';
    day: number;
    val: string;
  } | null>(null);

  // Quick Entry state
  const [quickLineId, setQuickLineId] = useState<string>(data.lines[0]?.id || 'line-a');
  const [quickDay, setQuickDay] = useState<number>(data.days[data.days.length - 1]?.day || 25);
  const [quickAttendance, setQuickAttendance] = useState<string>('');
  const [quickOutputAct, setQuickOutputAct] = useState<string>('');
  const [quickTargetUpph, setQuickTargetUpph] = useState<string>('');
  const [quickActUpph, setQuickActUpph] = useState<string>('');

  // Batch Target UPPH state
  const [batchTargetA, setBatchTargetA] = useState<string>('18.00');
  const [batchTargetB, setBatchTargetB] = useState<string>('15.00');

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

  const findMatchingOecLine = (line: UpphLineData) =>
    monthOecLines.find(
      l => l.id === line.id || l.prodLine.toLowerCase() === line.prodLine.toLowerCase()
    );

  // Selected Month Per-Line Summary Statistics: Direct Output ÷ Manpower
  const lineSummaries = useMemo(() => {
    const lineA = data.lines.find(l => l.prodLine.toLowerCase().includes('a')) || data.lines[0];
    const lineB = data.lines.find(l => l.prodLine.toLowerCase().includes('b')) || data.lines[1];

    const sumA = lineA
      ? calculateLinePeriodUpph(data.days, findMatchingOecLine(lineA), lineA)
      : null;
    const sumB = lineB
      ? calculateLinePeriodUpph(data.days, findMatchingOecLine(lineB), lineB)
      : null;

    const totalAct = (sumA?.totalAct || 0) + (sumB?.totalAct || 0);
    const totalManpower = (sumA?.totalManpower || 0) + (sumB?.totalManpower || 0);
    const totalCoveredAct = (sumA?.coveredAct || 0) + (sumB?.coveredAct || 0);
    const totalCoveredMp = (sumA?.coveredManpower || 0) + (sumB?.coveredManpower || 0);
    const avgAttendance = (sumA?.avgAttendance || 0) + (sumB?.avgAttendance || 0);
    const factoryUpph =
      totalCoveredMp > 0 ? Number((totalCoveredAct / totalCoveredMp).toFixed(2)) : 0;

    return {
      sumA,
      sumB,
      totalAct,
      totalManpower,
      avgAttendance,
      factoryUpph,
    };
  }, [data.days, data.lines, monthOecLines]);

  // Helper to compute Total Target UPPH for a line
  const getLineTotalTargetUpph = (line: UpphLineData): number =>
    calculateLinePeriodUpph(data.days, findMatchingOecLine(line), line).totalTargetUpph;

  // Helper to compute Total Act UPPH for a line from Daily Output ÷ Manpower
  const getLineTotalActUpph = (line: UpphLineData): number =>
    calculateLinePeriodUpph(data.days, findMatchingOecLine(line), line).totalActUpph;

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

  // Switch UPPH Month view (1月..12月 -> '2026-01'..'2026-12') and align matrix with Daily OEC
  const handleSelectMonth = (monthKey: string) => {
    const updatedMatrices = {
      ...(data.periodMatrices || {}),
      [selectedMonthKey]: {
        days: data.days,
        lines: data.lines,
        updatedAt: new Date().toISOString(),
      },
    };

    const oecEntry = resolvedPeriodData[monthKey];
    let targetMatrix = updatedMatrices[monthKey];
    if (oecEntry?.lines?.length && oecEntry?.days?.length) {
      targetMatrix = buildUpphMatrixForPeriod(
        monthKey,
        oecEntry.days,
        oecEntry.lines,
        targetMatrix
      );
      updatedMatrices[monthKey] = targetMatrix;
    }

    const baseSheet: UpphSheetData = {
      ...data,
      activeMonth: monthKey,
      days: targetMatrix?.days || data.days,
      lines: targetMatrix?.lines || data.lines,
      periodMatrices: updatedMatrices,
    };

    const nextSheet = syncUpphSheetWithDailyOec(
      baseSheet,
      resolvedPeriodData,
      monthlyEfficiency,
      monthKey
    );

    if (nextSheet.days.length > 0) {
      setQuickDay(nextSheet.days[nextSheet.days.length - 1].day);
    }
    onUpdateData(nextSheet);
  };

  // Helper to update selected month's matrix & re-sync monthly charts from Daily OEC
  const commitLinesAndSyncMonthly = (updatedLines: UpphLineData[], nextDays = data.days) => {
    const updatedMatrices = {
      ...(data.periodMatrices || {}),
      [selectedMonthKey]: {
        days: nextDays,
        lines: updatedLines,
        updatedAt: new Date().toISOString(),
      },
    };

    const nextSheet = syncUpphSheetWithDailyOec(
      {
        ...data,
        activeMonth: selectedMonthKey,
        days: nextDays,
        lines: updatedLines,
        periodMatrices: updatedMatrices,
      },
      resolvedPeriodData,
      monthlyEfficiency,
      selectedMonthKey
    );

    onUpdateData(nextSheet);
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
      if (category === 'attendance') {
        nextLine.totalAttendanceOverride = null;
        nextLine.totalActUpphOverride = null;
        // Auto-recalc Act UPPH strictly from Daily Output / Daily Manpower
        if (autoRecalcUpphOnAttendanceChange) {
          const matchingOec = findMatchingOecLine(line);
          const computed = calculateDailyActUpph(matchingOec?.act[day], validNum);
          nextLine.actUpph = {
            ...nextLine.actUpph,
            [day]: computed,
          };
        }
      }
      if (category === 'targetUpph') nextLine.totalTargetUpphOverride = null;
      if (category === 'actUpph') nextLine.totalActUpphOverride = null;

      return nextLine;
    });

    commitLinesAndSyncMonthly(updatedLines);
    setEditingCell(null);
  };

  // Direct inline update for daily Manpower with instant UPPH = Output ÷ Manpower calculation
  const handleDirectManpowerChange = (lineId: string, day: number, rawValue: string) => {
    const trimmed = rawValue.trim();
    const parsedNum = trimmed === '' ? null : Number(trimmed);
    if (parsedNum !== null && isNaN(parsedNum)) return;
    const validNum = parsedNum !== null ? Math.max(0, parsedNum) : null;

    const updatedLines = data.lines.map(line => {
      if (line.id !== lineId) return line;
      const matchingOec = findMatchingOecLine(line);
      const computed = autoRecalcUpphOnAttendanceChange
        ? calculateDailyActUpph(matchingOec?.act[day], validNum)
        : line.actUpph[day];
      return {
        ...line,
        attendance: {
          ...line.attendance,
          [day]: validNum,
        },
        actUpph: autoRecalcUpphOnAttendanceChange
          ? {
              ...line.actUpph,
              [day]: computed,
            }
          : line.actUpph,
        totalAttendanceOverride: null,
        totalActUpphOverride: null,
      };
    });

    commitLinesAndSyncMonthly(updatedLines);
  };

  // Paste row of Manpower numbers from Excel directly across consecutive days
  const handlePasteManpowerRow = (
    lineId: string,
    startDayIdx: number,
    e: React.ClipboardEvent<HTMLInputElement>
  ) => {
    const text = e.clipboardData.getData('text');
    const tokens = text
      .trim()
      .split(/[\t\n\r,;\s]+/)
      .filter(Boolean);
    if (tokens.length <= 1) return;
    e.preventDefault();

    const updatedLines = data.lines.map(line => {
      if (line.id !== lineId) return line;
      const matchingOec = findMatchingOecLine(line);
      const nextAtt = { ...line.attendance };
      const nextActUpph = { ...line.actUpph };

      tokens.forEach((tok, offset) => {
        const targetDayObj = data.days[startDayIdx + offset];
        if (!targetDayObj) return;
        const n = Number(tok.replace(/,/g, ''));
        if (!isNaN(n) && n >= 0) {
          nextAtt[targetDayObj.day] = n;
          if (autoRecalcUpphOnAttendanceChange) {
            nextActUpph[targetDayObj.day] = calculateDailyActUpph(
              matchingOec?.act[targetDayObj.day],
              n
            );
          }
        }
      });

      return {
        ...line,
        attendance: nextAtt,
        actUpph: nextActUpph,
        totalAttendanceOverride: null,
        totalActUpphOverride: null,
      };
    });

    commitLinesAndSyncMonthly(updatedLines);
  };

  // Batch fill daily Manpower for all working days (or all days) of a selected line
  const handleBatchFillManpower = (onlyWorkingDays: boolean) => {
    const num = Number(batchManpowerVal);
    if (isNaN(num) || num <= 0) return;

    const updatedLines = data.lines.map(line => {
      if (line.id !== batchManpowerLineId) return line;
      const matchingOec = findMatchingOecLine(line);
      const nextAtt = { ...line.attendance };
      const nextActUpph = { ...line.actUpph };

      data.days.forEach(d => {
        const hasProd =
          matchingOec?.act?.[d.day] != null && Number(matchingOec.act[d.day]) > 0;
        if (!onlyWorkingDays || hasProd) {
          nextAtt[d.day] = num;
          nextActUpph[d.day] = calculateDailyActUpph(matchingOec?.act?.[d.day], num);
        }
      });

      return {
        ...line,
        attendance: nextAtt,
        actUpph: nextActUpph,
        totalAttendanceOverride: null,
        totalActUpphOverride: null,
      };
    });

    commitLinesAndSyncMonthly(updatedLines);
  };

  // Commit Daily OEC Output edit directly from Table 1
  const handleCommitOecCellEdit = () => {
    if (!editingOecCell || !onUpdateDailyOecCell) {
      setEditingOecCell(null);
      return;
    }
    const { lineId, category, day, val } = editingOecCell;
    const trimmed = val.trim();
    const parsedNum = trimmed === '' ? null : Number(trimmed);
    const validNum = parsedNum !== null && !isNaN(parsedNum) ? parsedNum : null;
    onUpdateDailyOecCell(selectedMonthKey, lineId, category, day, validNum);
    setEditingOecCell(null);
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
    if (onUpdateDailyOecCell && quickOutputAct.trim() !== '') {
      onUpdateDailyOecCell(selectedMonthKey, quickLineId, 'act', quickDay, Number(quickOutputAct));
    }

    const updatedLines = data.lines.map(line => {
      if (line.id !== quickLineId) return line;
      const nextLine = { ...line };
      const matchingOec = findMatchingOecLine(line);
      const effectiveAct =
        quickOutputAct.trim() !== '' ? Number(quickOutputAct) : matchingOec?.act[quickDay];

      if (quickAttendance.trim() !== '') {
        const attNum = Number(quickAttendance);
        nextLine.attendance = { ...nextLine.attendance, [quickDay]: attNum };
        nextLine.totalAttendanceOverride = null;
        if (autoRecalcUpphOnAttendanceChange && attNum > 0 && quickActUpph.trim() === '') {
          const computed = calculateDailyActUpph(effectiveAct, attNum);
          nextLine.actUpph = { ...nextLine.actUpph, [quickDay]: computed };
          nextLine.totalActUpphOverride = null;
        }
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

    commitLinesAndSyncMonthly(updatedLines);

    setQuickAttendance('');
    setQuickOutputAct('');
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
    commitLinesAndSyncMonthly(updatedLines);
  };

  // Sync / Recalculate Act UPPH for ALL months (2026-01..2026-11) & current matrix directly from Daily OEC
  const handleSyncActUpphFromDailyOec = () => {
    const nextSheet = syncUpphSheetWithDailyOec(
      data,
      resolvedPeriodData,
      monthlyEfficiency,
      selectedMonthKey
    );
    onUpdateData(nextSheet);
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
        [newDayNum]: line.prodLine === 'Line A' ? 18.0 : 15.0,
      },
    }));

    commitLinesAndSyncMonthly(nextLines, nextDays);
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
          upphLineA: 18.0,
          upphLineB: 15.0,
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

    // Top Table: Direct Daily Manpower & Output -> UPPH (Output ÷ Manpower)
    data.lines.forEach(line => {
      const matchingOec = findMatchingOecLine(line);
      const periodSum = calculateLinePeriodUpph(data.days, matchingOec, line);

      aoa.push([
        'Daily Manpower & UPPH',
        line.plant,
        line.prodLine,
        'Manpower (คน/วัน)',
        periodSum.totalManpower,
        ...data.days.map(d => line.attendance[d.day] ?? ''),
      ]);
      aoa.push([
        'Daily Manpower & UPPH',
        line.plant,
        line.prodLine,
        'Output Act (产出)',
        periodSum.totalAct,
        ...data.days.map(d => matchingOec?.act[d.day] ?? ''),
      ]);
      aoa.push([
        'Daily Manpower & UPPH',
        line.plant,
        line.prodLine,
        'UPPH (Output ÷ Manpower)',
        periodSum.totalActUpph,
        ...data.days.map(d => {
          const val =
            calculateDailyActUpph(matchingOec?.act[d.day], line.attendance[d.day]) ??
            line.actUpph[d.day];
          return val ?? '';
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
                onChange={e => {
                  const mNum = parseInt(e.target.value.replace('月', ''), 10);
                  const yearPrefix = selectedMonthKey.split('-')[0] || '2026';
                  handleSelectMonth(`${yearPrefix}-${String(mNum).padStart(2, '0')}`);
                }}
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

            {/* Auto-calc Act UPPH from Daily OEC Output ÷ Manpower */}
            <button
              onClick={handleSyncActUpphFromDailyOec}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/25 transition-colors cursor-pointer"
              title={t(
                'คำนวณ UPPH = ยอดผลิต Output (Daily OEC) ÷ ยอดคน Manpower รายวัน (ตรงแม่นยำ)',
                'Calculate UPPH = Daily Output ÷ Daily Manpower',
                '根据日清实际产量 Output ÷ 每日人力 Manpower 精确计算 UPPH'
              )}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('คำนวณ Output ÷ Manpower', 'Calc Output ÷ MP', '产量÷人力重算UPPH')}</span>
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
          PER-LINE DAILY OUTPUT ÷ MANPOWER = UPPH SUMMARY CARDS
         ===================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {/* Line A Summary Card */}
        {(() => {
          const s = lineSummaries.sumA;
          const upph = s?.totalActUpph || 0;
          const tgt = s?.totalTargetUpph || UPPH_DEFAULT_TARGETS.lineA;
          const gap = Number((upph - tgt).toFixed(2));
          return (
            <div className="bg-white rounded-md border border-slate-200 px-3.5 py-2.5 shadow-2xs flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00b0f0]" />
                  <span className="text-xs font-extrabold text-slate-800">
                    Line A ({selectedMonthKey})
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 space-x-2">
                  <span>Output: <strong className="text-slate-800">{(s?.totalAct || 0).toLocaleString()}</strong></span>
                  <span>·</span>
                  <span>Manpower: <strong className="text-slate-800">{(s?.totalManpower || 0).toLocaleString()}</strong></span>
                  <span>·</span>
                  <span>Avg: <strong className="text-slate-700">{s?.avgAttendance || 0}/day</strong></span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-semibold uppercase text-slate-400">
                  {t('UPPH (Output ÷ คน)', 'Act / Target UPPH', 'UPPH (产量 ÷ 人力)')}
                </div>
                <div className="flex items-baseline justify-end gap-1.5">
                  <span className="text-xl font-black text-[#0091da] tabular-nums">{upph.toFixed(2)}</span>
                  <span className="text-xs font-semibold text-slate-400">/ {tgt.toFixed(2)}</span>
                </div>
                <div className={`text-[10px] font-bold ${gap >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  Gap {gap >= 0 ? `+${gap.toFixed(2)}` : gap.toFixed(2)}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Line B Summary Card */}
        {(() => {
          const s = lineSummaries.sumB;
          const upph = s?.totalActUpph || 0;
          const tgt = s?.totalTargetUpph || UPPH_DEFAULT_TARGETS.lineB;
          const gap = Number((upph - tgt).toFixed(2));
          return (
            <div className="bg-white rounded-md border border-slate-200 px-3.5 py-2.5 shadow-2xs flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0070c0]" />
                  <span className="text-xs font-extrabold text-slate-800">
                    Line B ({selectedMonthKey})
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 space-x-2">
                  <span>Output: <strong className="text-slate-800">{(s?.totalAct || 0).toLocaleString()}</strong></span>
                  <span>·</span>
                  <span>Manpower: <strong className="text-slate-800">{(s?.totalManpower || 0).toLocaleString()}</strong></span>
                  <span>·</span>
                  <span>Avg: <strong className="text-slate-700">{s?.avgAttendance || 0}/day</strong></span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-semibold uppercase text-slate-400">
                  {t('UPPH (Output ÷ คน)', 'Act / Target UPPH', 'UPPH (产量 ÷ 人力)')}
                </div>
                <div className="flex items-baseline justify-end gap-1.5">
                  <span className="text-xl font-black text-[#0070c0] tabular-nums">{upph.toFixed(2)}</span>
                  <span className="text-xs font-semibold text-slate-400">/ {tgt.toFixed(2)}</span>
                </div>
                <div className={`text-[10px] font-bold ${gap >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  Gap {gap >= 0 ? `+${gap.toFixed(2)}` : gap.toFixed(2)}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Factory Overall Weighted UPPH Card */}
        {(() => {
          const upph = lineSummaries.factoryUpph;
          const tgt = UPPH_DEFAULT_TARGETS.factory;
          const gap = Number((upph - tgt).toFixed(2));
          return (
            <div className="bg-slate-900 text-white rounded-md border border-slate-800 px-3.5 py-2.5 shadow-2xs flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-xs font-extrabold">
                    {t('รวมโรงงาน (Output ÷ Manpower)', 'Plant UPPH (Output ÷ MP)', '全厂综合 UPPH')} · {selectedMonthKey}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 mt-1 space-x-2">
                  <span>Output: <strong className="text-white">{lineSummaries.totalAct.toLocaleString()}</strong></span>
                  <span>·</span>
                  <span>Manpower: <strong className="text-sky-300">{lineSummaries.totalManpower.toLocaleString()}</strong></span>
                  <span>·</span>
                  <span>Avg: <strong className="text-white">{lineSummaries.avgAttendance}/day</strong></span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-semibold uppercase text-slate-400">
                  Output ÷ Manpower
                </div>
                <div className="flex items-baseline justify-end gap-1.5">
                  <span className="text-xl font-black text-sky-300 tabular-nums">{upph.toFixed(2)}</span>
                  <span className="text-xs font-semibold text-slate-400">/ {tgt.toFixed(2)}</span>
                </div>
                <div className={`text-[10px] font-bold ${gap >= 0 ? 'text-emerald-400' : 'text-amber-300'}`}>
                  Gap {gap >= 0 ? `+${gap.toFixed(2)}` : gap.toFixed(2)}
                </div>
              </div>
            </div>
          );
        })()}
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
                  'แถบกรอก Manpower & Output รายวันด่วน → คำนวณ UPPH = Output ÷ Manpower',
                  'Quick Daily Manpower & Output Editor (UPPH = Output ÷ Manpower)',
                  '每日人力与产量快速录入 (UPPH = 产量 ÷ 人力)'
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
                  'คำนวณ UPPH อัตโนมัติทันทีเมื่อแก้ยอด Manpower',
                  'Auto-recalculate UPPH when Manpower changes',
                  '修改 Manpower 时自动计算 UPPH'
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
              <label className="font-semibold text-[#0070c0]">Manpower (คน):</label>
              <input
                type="number"
                placeholder={String(data.lines.find(l => l.id === quickLineId)?.attendance[quickDay] ?? 119)}
                value={quickAttendance}
                onChange={e => setQuickAttendance(e.target.value)}
                className="w-20 bg-white border-2 border-[#0070c0]/60 rounded px-2 py-1 text-slate-900 font-bold"
              />
            </div>

            {(() => {
              const qLine = data.lines.find(l => l.id === quickLineId) || data.lines[0];
              const qOec = qLine ? findMatchingOecLine(qLine) : undefined;
              const curAct = qOec?.act[quickDay];
              const effAct = quickOutputAct.trim() !== '' ? Number(quickOutputAct) : curAct;
              const effMp =
                quickAttendance.trim() !== ''
                  ? Number(quickAttendance)
                  : qLine?.attendance[quickDay];
              const previewUpph = calculateDailyActUpph(effAct, effMp);
              return (
                <>
                  <div className="flex items-center gap-1.5">
                    <label className="font-semibold text-slate-700">Output (Act):</label>
                    <input
                      type="number"
                      placeholder={curAct != null ? String(curAct) : '0'}
                      value={quickOutputAct}
                      onChange={e => setQuickOutputAct(e.target.value)}
                      disabled={!onUpdateDailyOecCell}
                      className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 font-semibold"
                    />
                  </div>
                  <div className="inline-flex items-center gap-1.5 bg-white border border-emerald-300 rounded px-2.5 py-1 font-bold text-emerald-800">
                    <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      UPPH (Output ÷ MP):{' '}
                      <span className="text-sm font-black text-emerald-700">
                        {previewUpph !== null ? previewUpph.toFixed(2) : '-'}
                      </span>
                    </span>
                  </div>
                </>
              );
            })()}

            <div className="flex items-center gap-1.5">
              <label className="font-semibold text-slate-700">Target UPPH:</label>
              <input
                type="number"
                step="0.01"
                placeholder="18.00"
                value={quickTargetUpph}
                onChange={e => setQuickTargetUpph(e.target.value)}
                className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 font-semibold"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label className="font-semibold text-slate-700">Act UPPH:</label>
              <input
                type="number"
                step="0.01"
                placeholder="Auto"
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
                const svgW = 760;
                const svgH = 248;
                const pad = { top: 28, right: 16, bottom: 30, left: 16 };
                const innerW = svgW - pad.left - pad.right;
                const innerH = svgH - pad.top - pad.bottom;

                const allVals = items.flatMap(m => [m.prodLineA, m.prodLineB]);
                const maxVal = Math.max(...allVals, 60000) * 1.15;
                const stepW = items.length > 0 ? innerW / items.length : innerW;
                const barW = Math.min(20, stepW * 0.34);

                return (
                  <svg
                    viewBox={`0 0 ${svgW} ${svgH}`}
                    className="w-full h-auto min-w-[540px]"
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
                      const hA = m.prodLineA > 0 ? Math.max(2, (m.prodLineA / maxVal) * innerH) : 0;
                      const hB = m.prodLineB > 0 ? Math.max(2, (m.prodLineB / maxVal) * innerH) : 0;
                      const yA = pad.top + innerH - hA;
                      const yB = pad.top + innerH - hB;
                      const isSelected = m.month === selectedMonthKey;

                      const showA = selectedProdLine === 'All' || selectedProdLine === 'Line A';
                      const showB = selectedProdLine === 'All' || selectedProdLine === 'Line B';
                      const xA = showB ? centerX - barW - 1.5 : centerX - barW / 2;
                      const xB = showA ? centerX + 1.5 : centerX - barW / 2;

                      const fmtProd = (v: number) =>
                        items.length > 9 && v >= 10000
                          ? `${(v / 1000).toFixed(1)}k`
                          : v.toLocaleString();

                      return (
                        <g
                          key={m.month}
                          onMouseEnter={() => setHoveredMonthIdx({ chart: 'prod', idx })}
                          onMouseLeave={() => setHoveredMonthIdx(null)}
                          onClick={() => handleSelectMonth(m.month)}
                          className="cursor-pointer"
                        >
                          {isSelected && (
                            <rect
                              x={pad.left + stepW * idx + 2}
                              y={pad.top - 6}
                              width={stepW - 4}
                              height={innerH + 8}
                              rx="4"
                              fill="#e0f2fe"
                              opacity="0.55"
                            />
                          )}
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
                                y={yA - 4}
                                textAnchor="middle"
                                className="text-[8.5px] font-bold fill-slate-800"
                              >
                                {fmtProd(m.prodLineA)}
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
                                y={yB - 4}
                                textAnchor="middle"
                                className="text-[8.5px] font-bold fill-slate-800"
                              >
                                {fmtProd(m.prodLineB)}
                              </text>
                            </>
                          )}
                          <text
                            x={centerX}
                            y={svgH - 8}
                            textAnchor="middle"
                            className={`text-[9.5px] ${
                              isSelected ? 'font-black fill-[#0070c0]' : 'font-semibold fill-slate-700'
                            }`}
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
                const svgW = 760;
                const svgH = 248;
                const pad = { top: 28, right: 32, bottom: 30, left: 32 };
                const innerW = svgW - pad.left - pad.right;
                const innerH = svgH - pad.top - pad.bottom;

                const allVals = items.flatMap(m => [m.upphLineA, m.upphLineB]);
                const maxVal = Math.max(...allVals, 20) * 1.15;
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
                    className="w-full h-auto min-w-[540px]"
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
                        const isClose = Math.abs(pt.y - ptsA[i].y) < 16;
                        const isBelowA = pt.y >= ptsA[i].y;
                        const lblY = isBelowA ? pt.y + (isClose ? 16 : 14) : pt.y - 8;
                        return (
                          <g
                            key={`b-${i}`}
                            onClick={() => handleSelectMonth(pt.month)}
                            onMouseEnter={() => setHoveredMonthIdx({ chart: 'upph', idx: i })}
                            onMouseLeave={() => setHoveredMonthIdx(null)}
                            className="cursor-pointer"
                          >
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={hoveredMonthIdx?.idx === i || pt.month === selectedMonthKey ? 5 : 3.5}
                              fill="#0070c0"
                              stroke="#fff"
                              strokeWidth="1.5"
                            />
                            <text
                              x={pt.x}
                              y={lblY}
                              textAnchor="middle"
                              className="text-[9.5px] font-bold fill-slate-800"
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
                        const lblY = isAboveB ? pt.y - 8 : pt.y + 14;
                        return (
                          <g
                            key={`a-${i}`}
                            onClick={() => handleSelectMonth(pt.month)}
                            onMouseEnter={() => setHoveredMonthIdx({ chart: 'upph', idx: i })}
                            onMouseLeave={() => setHoveredMonthIdx(null)}
                            className="cursor-pointer"
                          >
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={hoveredMonthIdx?.idx === i || pt.month === selectedMonthKey ? 5 : 3.5}
                              fill="#00b0f0"
                              stroke="#fff"
                              strokeWidth="1.5"
                            />
                            <text
                              x={pt.x}
                              y={lblY}
                              textAnchor="middle"
                              className="text-[9.5px] font-bold fill-slate-800"
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
                        className={`text-[9.5px] ${
                          m.month === selectedMonthKey
                            ? 'font-black fill-[#0070c0]'
                            : 'font-semibold fill-slate-700'
                        }`}
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
              TABLE 1 (TOP-RIGHT): DIRECT DAILY MANPOWER -> OUTPUT ÷ MANPOWER = UPPH MATRIX
             ================================================================= */}
          <div className="bg-white rounded-md border border-slate-300 shadow-xs overflow-hidden">
            <div className="bg-slate-100 px-3 py-2 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0070c0]" />
                <span className="text-xs font-bold text-slate-800">
                  {t(
                    'ตารางที่ 1: ใส่ยอด Manpower รายวัน → หาร Output รายวัน = UPPH (ตรงแม่นยำ)',
                    'Table 1: Daily Manpower Input → Output ÷ Manpower = UPPH',
                    '表 1: 每日人力 Manpower 录入 → 每日产量 ÷ 人力 = UPPH'
                  )}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                {/* Batch fill daily Manpower */}
                <div className="inline-flex items-center gap-1 bg-white border border-slate-300 rounded px-1.5 py-0.5">
                  <span className="font-semibold text-slate-600">
                    {t('ใส่ Manpower ทั้งเดือน:', 'Fill Manpower:', '批量填人力:')}
                  </span>
                  <select
                    value={batchManpowerLineId}
                    onChange={e => setBatchManpowerLineId(e.target.value)}
                    className="font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                  >
                    {data.lines.map(l => (
                      <option key={`mp-sel-${l.id}`} value={l.id}>{l.prodLine}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    placeholder="119"
                    value={batchManpowerVal}
                    onChange={e => setBatchManpowerVal(e.target.value)}
                    className="w-12 text-center border border-slate-300 rounded px-1 py-0 text-[11px] font-bold text-[#0070c0]"
                  />
                  <button
                    onClick={() => handleBatchFillManpower(true)}
                    className="px-1.5 py-0.5 bg-[#0070c0] hover:bg-[#005a9e] text-white font-semibold rounded cursor-pointer"
                    title={t('ใส่ค่า Manpower ในทุกวันที่มีการผลิต', 'Apply to all working days with output', '应用至所有生产日')}
                  >
                    {t('วันที่ผลิต', 'Work Days', '工作日')}
                  </button>
                  <button
                    onClick={() => handleBatchFillManpower(false)}
                    className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded cursor-pointer"
                    title={t('ใส่ค่า Manpower ทุกวันในตาราง', 'Apply to all days in table', '应用至全部日期')}
                  >
                    {t('ทุกวัน', 'All', '全部')}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-sky-50/80 px-3 py-1 border-b border-sky-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-sky-900">
              <span>
                {t(
                  'ใส่เฉพาะตัวเลขยอด Manpower รายวันลงในช่องสีฟ้า (รองรับวางจาก Excel / กด Enter-ลูกศร) → คำนวณ Output ÷ Manpower = UPPH ตรงแม่นยำ ไม่คิดจากปัจจัยอื่น',
                  'Enter only daily Manpower in the blue input cells (supports Excel paste & Enter/Arrow keys) → Direct UPPH = Daily Output ÷ Daily Manpower',
                  '在蓝色框仅输入每日人力 Manpower 数值（支持 Excel 整行粘贴）→ 直接按 每日产量 ÷ 每日人力 = UPPH 精确核算，不受其他因素影响'
                )}
              </span>
              <span className="font-bold text-[#0070c0]">
                {t('เดือนที่เลือก:', 'Month:', '当前月份:')} {selectedMonthKey}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[11px] select-none">
                <thead>
                  <tr className="bg-[#0070c0] text-white font-bold">
                    <th
                      rowSpan={2}
                      className="border border-blue-800 px-2 py-1 text-center sticky left-0 z-20 bg-[#0070c0] min-w-[74px]"
                    >
                      Plant
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-blue-800 px-2 py-1 text-center sticky left-[74px] z-20 bg-[#0070c0] min-w-[60px]"
                    >
                      Prod-line
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-blue-800 px-2 py-1 text-left sticky left-[134px] z-20 bg-[#0070c0] min-w-[152px]"
                    >
                      Category
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-blue-800 px-2 py-1 text-center sticky left-[286px] z-20 bg-[#005a9e] min-w-[72px]"
                    >
                      Total
                    </th>
                    {data.days.map(d => (
                      <th
                        key={`att-day-${d.day}`}
                        className="border border-blue-800 px-1.5 py-0.5 text-center min-w-[50px]"
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
                    const matchingOec = findMatchingOecLine(line);
                    const periodSum = calculateLinePeriodUpph(data.days, matchingOec, line);
                    const rowsPerLine = 3;
                    const totalPlantRows = filteredLines.length * rowsPerLine;

                    return (
                      <React.Fragment key={`att-${line.id}`}>
                        {/* ROW 1: Manpower (คน/วัน) — DIRECT NUMERIC INPUT */}
                        <tr className="bg-sky-50/40 hover:bg-sky-50/80 transition-colors">
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
                            rowSpan={rowsPerLine}
                            className="border border-slate-300 px-1.5 py-1 text-center font-bold text-slate-800 bg-white sticky left-[74px] z-10 align-middle"
                          >
                            {line.prodLine}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 font-bold text-[#005a9e] bg-sky-50 sticky left-[134px] z-10 whitespace-nowrap">
                            {t('Manpower (คน/วัน)', 'Manpower (Pax/Day)', 'Manpower (每日人力)')}
                          </td>

                          {/* Total Manpower */}
                          <td
                            onClick={() =>
                              handleStartEdit(line.id, 'attendance', 'TOTAL', periodSum.avgAttendance)
                            }
                            className="border border-slate-300 px-1.5 py-1 text-center font-black text-[#005a9e] bg-sky-100/80 sticky left-[286px] z-10 cursor-pointer hover:bg-sky-200 tabular-nums"
                            title={t(
                              `รวม Manpower: ${periodSum.totalManpower.toLocaleString()} คน (เฉลี่ย ${periodSum.avgAttendance} คน/วัน)`,
                              `Total Manpower: ${periodSum.totalManpower.toLocaleString()} (Avg ${periodSum.avgAttendance}/day)`,
                              `累计人力: ${periodSum.totalManpower.toLocaleString()} 人 (日均 ${periodSum.avgAttendance} 人)`
                            )}
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
                                className="w-14 text-center bg-white border border-[#0070c0] rounded px-0.5 py-0 text-[11px] font-bold focus:outline-none"
                              />
                            ) : (
                              periodSum.totalManpower.toLocaleString()
                            )}
                          </td>

                          {/* Direct inline numeric Manpower input per day */}
                          {data.days.map((d, dayIdx) => {
                            const val = line.attendance[d.day];
                            return (
                              <td
                                key={`att-${line.id}-${d.day}`}
                                className="border border-slate-300 p-0.5 text-center bg-sky-50/30"
                              >
                                <input
                                  type="number"
                                  min={0}
                                  data-mp-input={`${line.id}-${dayIdx}`}
                                  value={val !== null && val !== undefined ? val : ''}
                                  placeholder="-"
                                  onChange={e =>
                                    handleDirectManpowerChange(line.id, d.day, e.target.value)
                                  }
                                  onPaste={e => handlePasteManpowerRow(line.id, dayIdx, e)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter' || e.key === 'ArrowRight') {
                                      const nextEl = document.querySelector<HTMLInputElement>(
                                        `input[data-mp-input="${line.id}-${dayIdx + 1}"]`
                                      );
                                      if (nextEl) {
                                        e.preventDefault();
                                        nextEl.focus();
                                        nextEl.select();
                                      }
                                    } else if (e.key === 'ArrowLeft') {
                                      const prevEl = document.querySelector<HTMLInputElement>(
                                        `input[data-mp-input="${line.id}-${dayIdx - 1}"]`
                                      );
                                      if (prevEl) {
                                        e.preventDefault();
                                        prevEl.focus();
                                        prevEl.select();
                                      }
                                    }
                                  }}
                                  className="w-full min-w-[44px] text-center bg-white/90 hover:bg-white focus:bg-white border border-sky-300 focus:border-[#0070c0] focus:ring-1 focus:ring-[#0070c0] rounded px-0.5 py-0.5 text-[11px] font-bold text-slate-900 focus:outline-none tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </td>
                            );
                          })}
                        </tr>

                        {/* ROW 2: Output (Act · Daily OEC) */}
                        <tr className="bg-amber-50/35 hover:bg-amber-50/70 transition-colors">
                          <td className="border border-slate-300 px-2 py-1 font-semibold text-amber-950 bg-amber-50/90 sticky left-[134px] z-10 whitespace-nowrap">
                            {t('Output (Daily OEC)', 'Output (Daily OEC)', 'Output (日清实际产出)')}
                          </td>
                          <td className="border border-slate-300 px-1.5 py-1 text-center font-extrabold text-amber-950 bg-amber-100/80 sticky left-[286px] z-10 tabular-nums">
                            {periodSum.totalAct.toLocaleString()}
                          </td>
                          {data.days.map(d => {
                            const actVal = matchingOec?.act[d.day];
                            const isEditingOec =
                              editingOecCell?.lineId === line.id &&
                              editingOecCell?.category === 'act' &&
                              editingOecCell?.day === d.day;

                            return (
                              <td
                                key={`oec-act-${line.id}-${d.day}`}
                                onClick={() => {
                                  if (onUpdateDailyOecCell) {
                                    setEditingOecCell({
                                      lineId: line.id,
                                      category: 'act',
                                      day: d.day,
                                      val: actVal != null ? String(actVal) : '',
                                    });
                                  }
                                }}
                                className={`border border-slate-300 px-1 py-1 text-center font-semibold text-slate-800 tabular-nums ${
                                  onUpdateDailyOecCell ? 'cursor-pointer hover:bg-amber-100/60' : ''
                                }`}
                                title={t(
                                  'ยอดผลิตจริง (Output) จาก Daily OEC (คลิกเพื่อแก้ไขได้)',
                                  'Daily Output (Act) from Daily OEC (click to edit)',
                                  '来自 Daily OEC 的实际产量 (点击可修改)'
                                )}
                              >
                                {isEditingOec ? (
                                  <input
                                    autoFocus
                                    type="number"
                                    value={editingOecCell.val}
                                    onChange={e =>
                                      setEditingOecCell({ ...editingOecCell, val: e.target.value })
                                    }
                                    onBlur={handleCommitOecCellEdit}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleCommitOecCellEdit();
                                      else if (e.key === 'Escape') setEditingOecCell(null);
                                    }}
                                    className="w-12 text-center bg-white border border-amber-500 rounded px-0.5 py-0 text-[11px] font-bold focus:outline-none"
                                  />
                                ) : actVal != null ? (
                                  Number(actVal).toLocaleString()
                                ) : (
                                  ''
                                )}
                              </td>
                            );
                          })}
                        </tr>

                        {/* ROW 3: COMPUTED UPPH = Output ÷ Manpower */}
                        <tr className="bg-emerald-50/60 border-b-2 border-slate-400">
                          <td className="border border-slate-300 px-2 py-1.5 font-extrabold text-emerald-950 bg-emerald-100/90 sticky left-[134px] z-10 whitespace-nowrap">
                            {t('UPPH (Output ÷ คน)', 'UPPH (Output ÷ MP)', 'UPPH (产量 ÷ 人力)')}
                          </td>
                          <td
                            className={`border border-slate-300 px-1.5 py-1.5 text-center font-black bg-emerald-100 sticky left-[286px] z-10 tabular-nums ${
                              periodSum.totalActUpph >= periodSum.totalTargetUpph
                                ? 'text-emerald-700'
                                : 'text-rose-600'
                            }`}
                            title={`Period UPPH: ${periodSum.coveredAct.toLocaleString()} ÷ ${periodSum.coveredManpower.toLocaleString()} Manpower = ${periodSum.totalActUpph.toFixed(2)} (Target: ${periodSum.totalTargetUpph.toFixed(2)})`}
                          >
                            {periodSum.totalActUpph.toFixed(2)}
                          </td>
                          {data.days.map(d => {
                            const actVal = matchingOec?.act[d.day];
                            const mpVal = line.attendance[d.day];
                            const tgtVal =
                              line.targetUpph[d.day] ??
                              (line.prodLine.toLowerCase().includes('a')
                                ? UPPH_DEFAULT_TARGETS.lineA
                                : UPPH_DEFAULT_TARGETS.lineB);
                            const dayUpph = calculateDailyActUpph(actVal, mpVal);
                            const isMet = dayUpph !== null && dayUpph >= Number(tgtVal);

                            return (
                              <td
                                key={`upph-day-calc-${line.id}-${d.day}`}
                                className={`border border-slate-300 px-1 py-1.5 text-center font-black tabular-nums ${
                                  dayUpph === null
                                    ? 'text-slate-300 bg-slate-50/40'
                                    : isMet
                                    ? 'text-emerald-700 bg-emerald-50/80'
                                    : 'text-rose-600 bg-rose-50/70'
                                }`}
                                title={
                                  dayUpph !== null
                                    ? `Output ${Number(actVal).toLocaleString()} ÷ ${mpVal} Manpower = ${dayUpph.toFixed(2)} UPPH (Target: ${Number(tgtVal).toFixed(2)})`
                                    : t(
                                        'ใส่ยอด Manpower เพื่อคำนวณ UPPH',
                                        'Enter Manpower to calculate UPPH',
                                        '输入 Manpower 以计算 UPPH'
                                      )
                                }
                              >
                                {dayUpph !== null ? dayUpph.toFixed(2) : '-'}
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
                    'ตารางที่ 2: UPPH จริงเทียบเป้าหมาย (Output ÷ Manpower) — Target UPPH(目标) / Act UPPH(实际) / Gap(差异)',
                    'Table 2: Daily UPPH Target vs Actual (Output ÷ Manpower) — Target / Act / Gap',
                    '表 2: 每日 UPPH 目标与实际对比 (产量 ÷ 人力) — Target UPPH(目标) / Act UPPH(实际) / Gap(差异)'
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
                      className="border border-blue-800 px-2 py-1 text-center sticky left-0 z-20 bg-[#0070c0] min-w-[74px]"
                    >
                      Plant
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-blue-800 px-2 py-1 text-center sticky left-[74px] z-20 bg-[#0070c0] min-w-[60px]"
                    >
                      Prod-line
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-blue-800 px-2 py-1 text-left sticky left-[134px] z-20 bg-[#0070c0] min-w-[152px]"
                    >
                      Category
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-blue-800 px-2 py-1 text-center sticky left-[286px] z-20 bg-[#005a9e] min-w-[64px]"
                    >
                      Total
                    </th>
                    {data.days.map(d => (
                      <th
                        key={`upph-day-${d.day}`}
                        className="border border-blue-800 px-1.5 py-0.5 text-center min-w-[50px]"
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
                            className="border border-slate-300 px-1.5 py-1 text-center font-bold text-slate-800 bg-white sticky left-[74px] z-10 align-middle"
                          >
                            {line.prodLine}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 font-semibold text-slate-800 bg-slate-50 sticky left-[134px] z-10 whitespace-nowrap">
                            Target UPPH(目标)
                          </td>

                          {/* Total Target UPPH */}
                          <td
                            onClick={() =>
                              handleStartEdit(line.id, 'targetUpph', 'TOTAL', totalTarget)
                            }
                            className="border border-slate-300 px-1.5 py-1 text-center font-bold text-slate-900 bg-slate-100 sticky left-[286px] z-10 cursor-pointer hover:bg-blue-100 tabular-nums"
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
                                className="border border-slate-300 px-1 py-1 text-center text-slate-800 hover:bg-blue-50 cursor-pointer tabular-nums"
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
                          <td className="border border-slate-300 px-2 py-1 font-semibold text-slate-800 bg-slate-50 sticky left-[134px] z-10 whitespace-nowrap">
                            Act UPPH(实际)
                          </td>

                          {/* Total Act UPPH */}
                          <td
                            onClick={() =>
                              handleStartEdit(line.id, 'actUpph', 'TOTAL', totalAct)
                            }
                            className="border border-slate-300 px-1.5 py-1 text-center font-bold text-slate-900 bg-slate-100 sticky left-[286px] z-10 cursor-pointer hover:bg-blue-100 tabular-nums"
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
                                className="border border-slate-300 px-1 py-1 text-center text-slate-900 font-medium hover:bg-blue-50 cursor-pointer tabular-nums"
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
                          <td className="border border-slate-300 px-2 py-1 font-semibold text-slate-700 bg-slate-100 sticky left-[134px] z-10 whitespace-nowrap">
                            Gap(差异)
                          </td>
                          <td
                            className={`border border-slate-300 px-1.5 py-1 text-center font-bold bg-slate-100 sticky left-[286px] z-10 tabular-nums ${
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

      {/* =====================================================================
          ALL-MONTHS LINE UPPH CALCULATION TABLE (DIRECT OUTPUT ÷ MANPOWER)
         ===================================================================== */}
      <div className="bg-white rounded-md border border-slate-300 shadow-xs overflow-hidden">
        <div className="bg-slate-900 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs sm:text-sm font-bold">
              {t(
                'ตารางสรุปผลการคำนวณ UPPH แยกรายไลน์ทุกเดือน (สูตรตรง: ยอดผลิต Output ÷ ยอดคน Manpower)',
                'Monthly UPPH Matrix by Line (Direct Formula: Output ÷ Manpower)',
                '月度各产线 UPPH 核算汇总表（直接公式：实际产量 Output ÷ 人力 Manpower）'
              )}
            </h3>
          </div>
          <span className="text-[11px] text-sky-300 font-medium">
            {t(
              'คลิกแถวเดือนใดก็ได้เพื่อเปิดดู/กรอก Manpower รายวันของเดือนนั้นด้านบน',
              'Click any month row to load its daily Manpower & UPPH matrix above',
              '点击任意月份行即可在上方查看/录入该月每日 Manpower 与 UPPH'
            )}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                <th className="border-r border-slate-200 px-3 py-2 text-center">Month</th>
                <th className="border-r border-slate-200 px-2.5 py-2 text-right text-[#0091da]">Line A Output</th>
                <th className="border-r border-slate-200 px-2.5 py-2 text-center">Line A Manpower</th>
                <th className="border-r border-slate-200 px-2.5 py-2 text-center">Line A Avg/Day</th>
                <th className="border-r border-slate-200 px-2.5 py-2 text-center bg-sky-50 text-[#0091da]">Line A UPPH</th>
                <th className="border-r border-slate-200 px-2.5 py-2 text-right text-[#0070c0]">Line B Output</th>
                <th className="border-r border-slate-200 px-2.5 py-2 text-center">Line B Manpower</th>
                <th className="border-r border-slate-200 px-2.5 py-2 text-center">Line B Avg/Day</th>
                <th className="border-r border-slate-200 px-2.5 py-2 text-center bg-blue-50 text-[#0070c0]">Line B UPPH</th>
                <th className="border-r border-slate-200 px-2.5 py-2 text-center">Total Manpower</th>
                <th className="px-2.5 py-2 text-center bg-slate-900 text-white">Plant UPPH</th>
              </tr>
            </thead>
            <tbody>
              {data.monthlyData.map(m => {
                const oec = resolvedPeriodData[m.month];
                const eff = monthlyEfficiency.find(e => e.month === m.month);
                const mat = data.periodMatrices?.[m.month];
                const oecA = oec?.lines?.find(l => l.prodLine.toLowerCase().includes('a')) || oec?.lines?.[0];
                const oecB = oec?.lines?.find(l => l.prodLine.toLowerCase().includes('b')) || oec?.lines?.[1];
                const uA = mat?.lines?.find(l => l.prodLine.toLowerCase().includes('a')) || mat?.lines?.[0];
                const uB = mat?.lines?.find(l => l.prodLine.toLowerCase().includes('b')) || mat?.lines?.[1];

                const sA = uA && mat ? calculateLinePeriodUpph(mat.days, oecA, uA) : null;
                const sB = uB && mat ? calculateLinePeriodUpph(mat.days, oecB, uB) : null;

                const aAct = sA ? sA.totalAct : eff?.lineAAct || m.prodLineA;
                const aMp = sA ? sA.totalManpower : 0;
                const aAvg = sA ? sA.avgAttendance : 0;

                const bAct = sB ? sB.totalAct : eff?.lineBAct || m.prodLineB;
                const bMp = sB ? sB.totalManpower : 0;
                const bAvg = sB ? sB.avgAttendance : 0;

                const totMp = aMp + bMp;
                const totCoveredAct = (sA?.coveredAct || 0) + (sB?.coveredAct || 0);
                const totCoveredMp = (sA?.coveredManpower || 0) + (sB?.coveredManpower || 0);
                const plantUpph =
                  totCoveredMp > 0
                    ? Number((totCoveredAct / totCoveredMp).toFixed(2))
                    : Number(((m.upphLineA + m.upphLineB) / 2).toFixed(2));
                const isSelected = m.month === selectedMonthKey;

                return (
                  <tr
                    key={`summary-${m.month}`}
                    onClick={() => handleSelectMonth(m.month)}
                    className={`border-b border-slate-200 cursor-pointer transition-colors ${
                      isSelected ? 'bg-sky-50 font-semibold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="border-r border-slate-200 px-3 py-1.5 text-center font-bold text-slate-800">
                      <span className="inline-flex items-center gap-1.5">
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#0070c0]" />}
                        {m.month}
                      </span>
                    </td>
                    <td className="border-r border-slate-200 px-2.5 py-1.5 text-right tabular-nums">
                      {aAct.toLocaleString()}
                    </td>
                    <td className="border-r border-slate-200 px-2.5 py-1.5 text-center tabular-nums text-slate-700 font-semibold">
                      {aMp > 0 ? aMp.toLocaleString() : '-'}
                    </td>
                    <td className="border-r border-slate-200 px-2.5 py-1.5 text-center tabular-nums text-slate-600">
                      {aAvg || '-'}
                    </td>
                    <td
                      className={`border-r border-slate-200 px-2.5 py-1.5 text-center tabular-nums font-extrabold bg-sky-50/70 ${
                        m.upphLineA >= UPPH_DEFAULT_TARGETS.lineA ? 'text-emerald-700' : 'text-[#0091da]'
                      }`}
                    >
                      {m.upphLineA.toFixed(2)}
                    </td>
                    <td className="border-r border-slate-200 px-2.5 py-1.5 text-right tabular-nums">
                      {bAct.toLocaleString()}
                    </td>
                    <td className="border-r border-slate-200 px-2.5 py-1.5 text-center tabular-nums text-slate-700 font-semibold">
                      {bMp > 0 ? bMp.toLocaleString() : '-'}
                    </td>
                    <td className="border-r border-slate-200 px-2.5 py-1.5 text-center tabular-nums text-slate-600">
                      {bAvg || '-'}
                    </td>
                    <td
                      className={`border-r border-slate-200 px-2.5 py-1.5 text-center tabular-nums font-extrabold bg-blue-50/70 ${
                        m.upphLineB >= UPPH_DEFAULT_TARGETS.lineB ? 'text-emerald-700' : 'text-[#0070c0]'
                      }`}
                    >
                      {m.upphLineB.toFixed(2)}
                    </td>
                    <td className="border-r border-slate-200 px-2.5 py-1.5 text-center tabular-nums font-semibold text-slate-700">
                      {totMp > 0 ? totMp.toLocaleString() : '-'}
                    </td>
                    <td
                      className={`px-2.5 py-1.5 text-center tabular-nums font-black ${
                        plantUpph >= UPPH_DEFAULT_TARGETS.factory ? 'text-emerald-700 bg-emerald-50' : 'text-slate-900 bg-slate-50'
                      }`}
                    >
                      {plantUpph.toFixed(2)}
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

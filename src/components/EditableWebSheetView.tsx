import React, { useState, useMemo, useRef } from 'react';
import {
  EditableCustomSheet,
  EditableSheetRow,
  EditableSheetColumn,
  LineOECData,
  DayColumn,
} from '../types/oec';
import {
  Save,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  FileSpreadsheet,
  Upload,
  Download,
  TrendingUp,
  Zap,
  Target,
  Clock,
  Layers,
  ClipboardPaste,
  TableProperties,
  BarChart3,
  RefreshCw,
  Columns,
  Sparkles,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAppPreferences } from '../contexts/AppPreferencesContext';

interface EditableWebSheetViewProps {
  sheet: EditableCustomSheet;
  onUpdateSheet: (updatedSheet: EditableCustomSheet) => void;
  lines: LineOECData[];
  days: DayColumn[];
  onUpdateDailyCell: (
    lineId: string,
    category: 'planning' | 'act' | 'workTime',
    day: number,
    value: number | null
  ) => void;
  onAddDay: (day: number, weekday: string) => void;
  onSaveOnWeb: (customTitle?: string) => void;
  hasUnsavedChanges?: boolean;
  isSyncing?: boolean;
  plantName: string;
  activePeriodLabel: string;
}

export const EditableWebSheetView: React.FC<EditableWebSheetViewProps> = ({
  sheet,
  onUpdateSheet,
  lines,
  days,
  onUpdateDailyCell,
  onAddDay,
  onSaveOnWeb,
  hasUnsavedChanges = false,
  isSyncing = false,
  plantName,
  activePeriodLabel,
}) => {
  const { language, t } = useAppPreferences();

  // Sub-view mode: 'master' (Editable Monthly/Model OEC Table) | 'daily-line' (Editable Daily 1-31 Table for this Line)
  const [subViewMode, setSubViewMode] = useState<'master' | 'daily-line'>('master');

  // Inline cell editing state for master sheet
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    colKey: string;
    val: string;
  } | null>(null);

  // Inline editing for daily matrix of the linked line
  const [editingDailyCell, setEditingDailyCell] = useState<{
    lineId: string;
    category: 'planning' | 'act' | 'workTime';
    day: number;
    val: string;
  } | null>(null);

  // Rename sheet title / tab modal state
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [draftTabName, setDraftTabName] = useState(sheet.tabNameTh);
  const [draftTitle, setDraftTitle] = useState(sheet.titleTh);

  // Add Row Quick Form State
  const [showAddRowForm, setShowAddRowForm] = useState(false);
  const [newPeriod, setNewPeriod] = useState('2026-10');
  const [newSubLabel, setNewSubLabel] = useState('ต.ค. 2026');
  const [newModelName, setNewModelName] = useState('HRF New Series');
  const [newPlan, setNewPlan] = useState('50000');
  const [newAct, setNewAct] = useState('48500');
  const [newWorkHours, setNewWorkHours] = useState('420');
  const [newManpower, setNewManpower] = useState('150');
  const [newTargetUph, setNewTargetUph] = useState(String(sheet.defaultTargetUph || 110));
  const [newLossMins, setNewLossMins] = useState('60');
  const [newNotes, setNewNotes] = useState('');

  // Add Column Modal State
  const [showAddColModal, setShowAddColModal] = useState(false);
  const [newColLabel, setNewColLabel] = useState('');
  const [newColType, setNewColType] = useState<'text' | 'number'>('number');

  // Edit Column Header State
  const [editingColKey, setEditingColKey] = useState<string | null>(null);
  const [editingColLabelVal, setEditingColLabelVal] = useState('');

  // Paste from Excel / Import Excel Sheet Modal
  const [showExcelPasteModal, setShowExcelPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [excelWorkbookSheets, setExcelWorkbookSheets] = useState<{
    names: string[];
    wb: XLSX.WorkBook;
  } | null>(null);
  const [selectedExcelSheetName, setSelectedExcelSheetName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Associated production line (Line A for sheet-4, Line B for sheet-5)
  const linkedLine = useMemo(() => {
    if (sheet.id === 'sheet-4') {
      return lines.find(l => l.prodLine.toLowerCase().includes('a')) || lines[0] || null;
    }
    return (
      lines.find(l => l.prodLine.toLowerCase().includes('b')) ||
      (lines.length > 1 ? lines[1] : lines[0]) ||
      null
    );
  }, [lines, sheet.id]);

  // Compute summary stats for the sheet
  const summaryStats = useMemo(() => {
    let totalPlan = 0;
    let totalAct = 0;
    let totalWorkHours = 0;
    let totalLossMinutes = 0;
    let totalManpower = 0;
    let manpowerCount = 0;

    sheet.rows.forEach(r => {
      totalPlan += Number(r.plan || 0);
      totalAct += Number(r.act || 0);
      totalWorkHours += Number(r.workHours || 0);
      totalLossMinutes += Number(r.lossMinutes || 0);
      if (r.manpower && r.manpower > 0) {
        totalManpower += Number(r.manpower);
        manpowerCount++;
      }
    });

    const totalGap = totalAct - totalPlan;
    const avgUph =
      totalWorkHours > 0
        ? Math.round(totalAct / totalWorkHours)
        : sheet.rows.length > 0
        ? Math.round(sheet.rows.reduce((s, r) => s + Number(r.uph || 0), 0) / sheet.rows.length)
        : 0;
    const achieveRate = totalPlan > 0 ? (totalAct / totalPlan) * 100 : 0;
    const avgManpower = manpowerCount > 0 ? Math.round(totalManpower / manpowerCount) : 0;

    return {
      totalPlan,
      totalAct,
      totalGap,
      totalWorkHours,
      totalLossMinutes,
      avgUph,
      achieveRate,
      avgManpower,
      rowCount: sheet.rows.length,
    };
  }, [sheet.rows]);

  // Helper to get localized column label
  const getColLabel = (col: EditableSheetColumn) => {
    if (language === 'en') return col.labelEn || col.labelTh;
    if (language === 'zh') return col.labelZh || col.labelTh;
    return col.labelTh;
  };

  // Start editing a cell
  const handleStartCellEdit = (row: EditableSheetRow, col: EditableSheetColumn) => {
    let rawVal: string | number | undefined = '';
    if (col.key in row) {
      rawVal = (row as any)[col.key];
    } else if (row.customCells && col.key in row.customCells) {
      rawVal = row.customCells[col.key];
    }
    setEditingCell({
      rowId: row.id,
      colKey: col.key,
      val: rawVal !== undefined && rawVal !== null ? String(rawVal) : '',
    });
  };

  // Save edited cell and recalculate dependent fields
  const handleSaveCellEdit = () => {
    if (!editingCell) return;
    const { rowId, colKey, val } = editingCell;

    const updatedRows = sheet.rows.map(row => {
      if (row.id !== rowId) return row;

      const nextRow: EditableSheetRow = {
        ...row,
        customCells: { ...(row.customCells || {}) },
      };

      const targetCol = sheet.columns.find(c => c.key === colKey);
      const isNumericCol =
        targetCol?.type === 'number' ||
        targetCol?.type === 'gap' ||
        targetCol?.type === 'uph' ||
        ['plan', 'act', 'gap', 'workHours', 'manpower', 'uph', 'targetUph', 'lossMinutes'].includes(colKey);

      if (isNumericCol) {
        const numVal = val.trim() === '' ? 0 : Number(val.replace(/,/g, ''));
        const cleanNum = isNaN(numVal) ? 0 : numVal;

        if (colKey in nextRow) {
          (nextRow as any)[colKey] = cleanNum;
        } else {
          nextRow.customCells![colKey] = cleanNum;
        }

        // Auto-recalculate Gap and UPH when Plan, Act, or WorkHours change
        if (colKey === 'plan' || colKey === 'act') {
          nextRow.gap = Number(nextRow.act || 0) - Number(nextRow.plan || 0);
        }
        if (colKey === 'act' || colKey === 'workHours') {
          const hrs = Number(nextRow.workHours || 0);
          const act = Number(nextRow.act || 0);
          if (hrs > 0) {
            nextRow.uph = Math.round(act / hrs);
          }
        }
      } else {
        if (colKey in nextRow) {
          (nextRow as any)[colKey] = val;
        } else {
          nextRow.customCells![colKey] = val;
        }
      }

      return nextRow;
    });

    onUpdateSheet({
      ...sheet,
      rows: updatedRows,
      updatedAt: new Date().toISOString(),
    });
    setEditingCell(null);
  };

  // Add new row
  const handleAddRow = (e: React.FormEvent) => {
    e.preventDefault();
    const pNum = Number(newPlan) || 0;
    const aNum = Number(newAct) || 0;
    const hrsNum = Number(newWorkHours) || 0;
    const tUphNum = Number(newTargetUph) || sheet.defaultTargetUph || 110;
    const computedGap = aNum - pNum;
    const computedUph = hrsNum > 0 ? Math.round(aNum / hrsNum) : tUphNum;

    const newRow: EditableSheetRow = {
      id: `${sheet.id}-r-${Date.now()}`,
      period: newPeriod || `Row-${sheet.rows.length + 1}`,
      subLabel: newSubLabel,
      modelName: newModelName,
      plan: pNum,
      act: aNum,
      gap: computedGap,
      workHours: hrsNum,
      manpower: Number(newManpower) || 0,
      uph: computedUph,
      targetUph: tUphNum,
      lossMinutes: Number(newLossMins) || 0,
      notes: newNotes || t('บันทึกและอัพเดทบน Web', 'Updated on Web', '网页新增记录'),
      customCells: {},
    };

    onUpdateSheet({
      ...sheet,
      rows: [...sheet.rows, newRow],
      updatedAt: new Date().toISOString(),
    });
    setShowAddRowForm(false);
    setNewNotes('');
  };

  // Delete row
  const handleDeleteRow = (rowId: string) => {
    const updatedRows = sheet.rows.filter(r => r.id !== rowId);
    onUpdateSheet({
      ...sheet,
      rows: updatedRows,
      updatedAt: new Date().toISOString(),
    });
  };

  // Add new custom column
  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColLabel.trim()) return;
    const colKey = `custom_${Date.now()}`;
    const newCol: EditableSheetColumn = {
      key: colKey,
      labelTh: newColLabel.trim(),
      labelEn: newColLabel.trim(),
      labelZh: newColLabel.trim(),
      type: newColType,
      align: newColType === 'number' ? 'right' : 'left',
    };

    onUpdateSheet({
      ...sheet,
      columns: [...sheet.columns, newCol],
      updatedAt: new Date().toISOString(),
    });
    setNewColLabel('');
    setShowAddColModal(false);
  };

  // Save edited column header
  const handleSaveColHeader = (colKey: string) => {
    if (!editingColLabelVal.trim()) {
      setEditingColKey(null);
      return;
    }
    const updatedCols = sheet.columns.map(c => {
      if (c.key !== colKey) return c;
      return {
        ...c,
        labelTh: editingColLabelVal.trim(),
        labelEn: editingColLabelVal.trim(),
        labelZh: editingColLabelVal.trim(),
      };
    });
    onUpdateSheet({
      ...sheet,
      columns: updatedCols,
      updatedAt: new Date().toISOString(),
    });
    setEditingColKey(null);
  };

  // Save sheet title & tab name
  const handleSaveHeaderRename = () => {
    onUpdateSheet({
      ...sheet,
      tabNameTh: draftTabName.trim() || sheet.tabNameTh,
      tabNameEn: draftTabName.trim() || sheet.tabNameEn,
      tabNameZh: draftTabName.trim() || sheet.tabNameZh,
      titleTh: draftTitle.trim() || sheet.titleTh,
      titleEn: draftTitle.trim() || sheet.titleEn,
      titleZh: draftTitle.trim() || sheet.titleZh,
      updatedAt: new Date().toISOString(),
    });
    setIsEditingHeader(false);
  };

  // Parse pasted TSV/CSV text from Excel (Ctrl+V)
  const handleApplyPastedExcelData = () => {
    if (!pasteText.trim()) return;
    const rawLines = pasteText
      .trim()
      .split(/\r?\n/)
      .map(line => line.split('\t'))
      .filter(arr => arr.some(c => c.trim() !== ''));

    if (rawLines.length === 0) return;

    // Check if first row looks like a header
    const firstRow = rawLines[0];
    const firstRowHasNumbers = firstRow.some(cell => {
      const cleaned = cell.replace(/,/g, '').trim();
      return cleaned !== '' && !isNaN(Number(cleaned)) && Number(cleaned) > 10;
    });

    const dataStartIdx = firstRowHasNumbers ? 0 : 1;
    const parsedRows: EditableSheetRow[] = [];

    for (let i = dataStartIdx; i < rawLines.length; i++) {
      const cells = rawLines[i].map(c => c.trim());
      if (cells.length === 0 || cells.every(c => c === '')) continue;

      const parseNum = (val?: string) => {
        if (!val) return 0;
        const n = Number(val.replace(/[,%]/g, '').trim());
        return isNaN(n) ? 0 : n;
      };

      const period = cells[0] || `Row-${i + 1}`;
      const isSecondColText = cells[1] && isNaN(Number(cells[1].replace(/,/g, '')));
      const modelName = isSecondColText ? cells[1] : `${linkedLine?.prodLine || 'Line'} Standard`;
      const numOffset = isSecondColText ? 2 : 1;

      const plan = parseNum(cells[numOffset]);
      const act = parseNum(cells[numOffset + 1]);
      const gapRaw = cells[numOffset + 2];
      const workHours = parseNum(cells[numOffset + 3]) || 400;
      const uphRaw = parseNum(cells[numOffset + 4]);

      const gap = gapRaw !== undefined && gapRaw !== '' ? parseNum(gapRaw) : act - plan;
      const uph = uphRaw > 0 ? uphRaw : workHours > 0 ? Math.round(act / workHours) : sheet.defaultTargetUph;

      parsedRows.push({
        id: `${sheet.id}-paste-${Date.now()}-${i}`,
        period,
        modelName,
        plan,
        act,
        gap,
        workHours,
        manpower: parseNum(cells[numOffset + 5]) || 140,
        uph,
        targetUph: sheet.defaultTargetUph || 110,
        lossMinutes: parseNum(cells[numOffset + 6]) || 0,
        notes: cells[numOffset + 7] || 'นำเข้าด้วยการวางข้อมูลจาก Excel บน Web',
        customCells: {},
      });
    }

    if (parsedRows.length > 0) {
      onUpdateSheet({
        ...sheet,
        rows: parsedRows,
        updatedAt: new Date().toISOString(),
      });
      setPasteText('');
      setShowExcelPasteModal(false);
    }
  };

  // Handle uploading an Excel file to import a specific sheet into this Web Sheet
  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        if (wb.SheetNames.length > 0) {
          setExcelWorkbookSheets({ names: wb.SheetNames, wb });
          setSelectedExcelSheetName(wb.SheetNames[0]);
        }
      } catch (err) {
        console.error('Failed to read Excel file:', err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmExcelSheetImport = () => {
    if (!excelWorkbookSheets || !selectedExcelSheetName) return;
    const ws = excelWorkbookSheets.wb.Sheets[selectedExcelSheetName];
    if (!ws) return;

    const json: (string | number)[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (json.length < 2) return;

    const tsvString = json
      .filter(r => r.some(cell => String(cell).trim() !== ''))
      .map(r => r.map(c => String(c).trim()).join('\t'))
      .join('\n');

    setPasteText(tsvString);
  };

  // Export this sheet to Excel (.xlsx)
  const handleExportSheetExcel = () => {
    const headers = sheet.columns.map(c => getColLabel(c));
    const aoa: (string | number)[][] = [headers];

    sheet.rows.forEach(row => {
      const rArr: (string | number)[] = sheet.columns.map(col => {
        if (col.type === 'gap') return row.act - row.plan;
        if (col.type === 'uph') return row.workHours > 0 ? Math.round(row.act / row.workHours) : row.uph;
        if (col.type === 'achievePct') {
          return row.plan > 0 ? `${((row.act / row.plan) * 100).toFixed(1)}%` : '0%';
        }
        if (col.key in row) return (row as any)[col.key] ?? '';
        return row.customCells?.[col.key] ?? '';
      });
      aoa.push(rArr);
    });

    // Append Total Row
    const footerRow: (string | number)[] = sheet.columns.map((col, idx) => {
      if (idx === 0) return 'TOTAL / AVG';
      if (col.key === 'plan') return summaryStats.totalPlan;
      if (col.key === 'act') return summaryStats.totalAct;
      if (col.key === 'gap') return summaryStats.totalGap;
      if (col.key === 'workHours') return summaryStats.totalWorkHours;
      if (col.key === 'manpower') return summaryStats.avgManpower;
      if (col.key === 'uph') return summaryStats.avgUph;
      if (col.key === 'targetUph') return sheet.defaultTargetUph;
      if (col.key === 'achievePct') return `${summaryStats.achieveRate.toFixed(1)}%`;
      if (col.key === 'lossMinutes') return summaryStats.totalLossMinutes;
      return '';
    });
    aoa.push(footerRow);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheet.id.toUpperCase());
    XLSX.writeFile(wb, `${sheet.id}_OEC_Editable_Data_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const saveDailyInlineEdit = () => {
    if (!editingDailyCell) return;
    const num = editingDailyCell.val.trim() === '' ? null : Number(editingDailyCell.val);
    onUpdateDailyCell(
      editingDailyCell.lineId,
      editingDailyCell.category,
      editingDailyCell.day,
      isNaN(num as number) ? null : num
    );
    setEditingDailyCell(null);
  };

  const titleDisplay =
    language === 'en' ? sheet.titleEn : language === 'zh' ? sheet.titleZh : sheet.titleTh;
  const subtitleDisplay =
    language === 'en' ? sheet.subtitleEn : language === 'zh' ? sheet.subtitleZh : sheet.subtitleTh;

  return (
    <div className="space-y-6 pb-8">
      {/* Top Banner & Quick Actions */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-blue-100 text-[#0070c0] font-bold text-xs px-2.5 py-0.5 rounded">
              {sheet.badgeText}
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-xs font-semibold text-slate-600">
              Plant: {plantName} ({activePeriodLabel})
            </span>
            <button
              onClick={() => {
                setDraftTabName(sheet.tabNameTh);
                setDraftTitle(sheet.titleTh);
                setIsEditingHeader(!isEditingHeader);
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0070c0] hover:underline ml-1 cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
              <span>{t('แก้ไขชื่อ Sheet', 'Rename Sheet', '修改表名')}</span>
            </button>
          </div>

          {isEditingHeader ? (
            <div className="mt-2 bg-blue-50/70 border border-blue-200 rounded-lg p-3 flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700">{t('ชื่อแท็บ:', 'Tab Name:', '标签名:')}</span>
                <input
                  type="text"
                  value={draftTabName}
                  onChange={e => setDraftTabName(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2.5 py-1 font-semibold text-slate-800 w-56"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-1 min-w-[240px]">
                <span className="font-bold text-slate-700">{t('หัวข้อตาราง:', 'Sheet Title:', '表格标题:')}</span>
                <input
                  type="text"
                  value={draftTitle}
                  onChange={e => setDraftTitle(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2.5 py-1 font-semibold text-slate-800 flex-1"
                />
              </div>
              <button
                onClick={handleSaveHeaderRename}
                className="px-3 py-1 bg-[#0070c0] text-white font-bold rounded flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{t('บันทึกชื่อ', 'Save', '保存')}</span>
              </button>
              <button
                onClick={() => setIsEditingHeader(false)}
                className="px-2.5 py-1 bg-white border border-slate-300 text-slate-600 rounded cursor-pointer"
              >
                {t('ยกเลิก', 'Cancel', '取消')}
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mt-1">
                {titleDisplay}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{subtitleDisplay}</p>
            </>
          )}
        </div>

        {/* Right Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sub-view Switcher: Master Sheet vs Linked Daily 1-31 Matrix */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setSubViewMode('master')}
              className={`px-3 py-1.5 rounded-md font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                subViewMode === 'master'
                  ? 'bg-[#0070c0] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableProperties className="w-3.5 h-3.5" />
              <span>{t('ตารางข้อมูลหลัก (คลิกแก้ไขได้)', 'Master Editable Sheet', '主数据表 (可点击修改)')}</span>
            </button>
            <button
              onClick={() => setSubViewMode('daily-line')}
              className={`px-3 py-1.5 rounded-md font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                subViewMode === 'daily-line'
                  ? 'bg-[#0070c0] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>
                {t(
                  `ตารางรายวัน 1-31 (${linkedLine?.prodLine || 'Line'})`,
                  `Daily 1-31 (${linkedLine?.prodLine || 'Line'})`,
                  `每日 1-31 明细 (${linkedLine?.prodLine || 'Line'})`
                )}
              </span>
            </button>
          </div>

          <button
            onClick={() => setShowExcelPasteModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded border border-slate-300 transition-colors cursor-pointer"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-[#0070c0]" />
            <span>{t('วาง/นำเข้าจาก Excel', 'Paste / Import Excel', '粘贴/导入 Excel')}</span>
          </button>

          <button
            onClick={handleExportSheetExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded border border-slate-300 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('ส่งออก Excel', 'Export Excel', '导出 Excel')}</span>
          </button>

          <button
            onClick={() => onSaveOnWeb(`อัพเดทข้อมูล ${sheet.tabNameTh}`)}
            disabled={isSyncing}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-bold shadow-xs transition-all cursor-pointer ${
              hasUnsavedChanges
                ? 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-300'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>
              {isSyncing
                ? t('กำลังบันทึก...', 'Saving...', '保存中...')
                : t('บันทึกอัพเดทบน Web', 'Save & Update on Web', '保存更新至网页')}
            </span>
          </button>
        </div>
      </div>

      {/* 4 Live KPI Summary Cards for this Sheet */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0070c0] text-white rounded-lg p-4 shadow-xs border border-blue-600 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-100">
                {t('แผนการผลิตรวม (Total Plan)', 'Total Planned Output', '累计计划产量 (Total Plan)')}
              </span>
              <Target className="w-4 h-4 text-blue-200" />
            </div>
            <div className="text-3xl font-black tracking-tight">
              {summaryStats.totalPlan.toLocaleString()}
              <span className="text-xs font-normal text-blue-100 ml-1">{t('ตัว', 'units', '台')}</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-blue-400/30 flex items-center justify-between text-xs text-blue-100">
            <span>{t('จำนวนรายการบันทึก:', 'Total Records:', '记录条数:')}</span>
            <span className="font-bold text-white">{summaryStats.rowCount} {t('งวด/รายการ', 'rows', '行')}</span>
          </div>
        </div>

        <div className="bg-[#0070c0] text-white rounded-lg p-4 shadow-xs border border-blue-600 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-100">
                {t('ยอดผลิตจริงรวม (Total Actual)', 'Total Actual Output', '累计实际产量 (Total Actual)')}
              </span>
              <TrendingUp className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="text-3xl font-black tracking-tight">
              {summaryStats.totalAct.toLocaleString()}
              <span className="text-xs font-normal text-blue-100 ml-1">{t('ตัว', 'units', '台')}</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-blue-400/30 flex items-center justify-between text-xs text-blue-100">
            <span>{t('อัตราบรรลุแผน:', 'Achievement Rate:', '计划达成率:')}</span>
            <span className="font-bold text-emerald-300">{summaryStats.achieveRate.toFixed(1)}%</span>
          </div>
        </div>

        <div className="bg-[#0070c0] text-white rounded-lg p-4 shadow-xs border border-blue-600 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-100">
                {t('ส่วนต่างสะสม (Total Gap)', 'Total Net Gap', '累计差异 (Total Gap)')}
              </span>
              <Clock className="w-4 h-4 text-blue-200" />
            </div>
            <div
              className={`text-3xl font-black tracking-tight ${
                summaryStats.totalGap < 0 ? 'text-amber-300' : 'text-emerald-300'
              }`}
            >
              {summaryStats.totalGap > 0
                ? `+${summaryStats.totalGap.toLocaleString()}`
                : summaryStats.totalGap.toLocaleString()}
              <span className="text-xs font-normal text-blue-100 ml-1">{t('ตัว', 'units', '台')}</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-blue-400/30 flex items-center justify-between text-xs text-blue-100">
            <span>{t('ชั่วโมงทำงานรวม:', 'Total Work Hours:', '累计工作工时:')}</span>
            <span className="font-bold text-white">{summaryStats.totalWorkHours.toLocaleString()} {t('ชม.', 'hrs', '小时')}</span>
          </div>
        </div>

        <div className="bg-[#0070c0] text-white rounded-lg p-4 shadow-xs border border-blue-600 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-100">
                {t('ประสิทธิภาพเฉลี่ย (AVG UPH)', 'Average Efficiency (UPH)', '平均生产效率 (AVG UPH)')}
              </span>
              <Zap className="w-4 h-4 text-amber-300" />
            </div>
            <div className="text-3xl font-black tracking-tight flex items-baseline gap-2">
              <span>{summaryStats.avgUph}</span>
              <span className="text-xs font-normal text-blue-100">UPH</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-blue-400/30 flex items-center justify-between text-xs text-blue-100">
            <span>{t('เป้าหมายมาตรฐาน (Target):', 'Standard Target:', '标准目标:')}</span>
            <span className="font-bold text-amber-300">{sheet.defaultTargetUph} UPH</span>
          </div>
        </div>
      </div>

      {subViewMode === 'master' ? (
        <>
          {/* Interactive Visual Trend Bar Chart for this Sheet */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#0070c0]" />
                <h3 className="font-bold text-sm text-slate-800">
                  {t(
                    'กราฟเทรนด์ยอดผลิตจริงเทียบแผน & ประสิทธิภาพ UPH (อัพเดทอัตโนมัติตามตารางด้านล่าง)',
                    'Live Production vs Plan & UPH Trend Chart (Synced with Editable Table below)',
                    '实际产量与计划对比及 UPH 趋势图（与下方可编辑表格实时联动）'
                  )}
                </h3>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-[#0070c0] inline-block" />
                  <span>{t('ผลิตจริง (Actual)', 'Actual', '实际产量')}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-slate-300 inline-block" />
                  <span>{t('แผนผลิต (Plan)', 'Plan', '计划产量')}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                  <span>UPH</span>
                </span>
              </div>
            </div>

            <div className="overflow-x-auto pt-2 pb-1">
              <div className="min-w-[680px] h-52 flex items-end justify-between gap-3 px-6 border-b border-slate-200 relative">
                {sheet.rows.map(row => {
                  const maxVal = Math.max(...sheet.rows.map(r => Math.max(r.plan || 0, r.act || 0)), 1000) * 1.15;
                  const planPct = Math.min(100, ((row.plan || 0) / maxVal) * 100);
                  const actPct = Math.min(100, ((row.act || 0) / maxVal) * 100);

                  return (
                    <div key={row.id} className="flex-1 flex flex-col items-center group relative">
                      {/* UPH Badge */}
                      <div className="mb-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-800">
                        {row.uph} UPH
                      </div>
                      <div className="w-full flex items-end justify-center gap-1.5 h-36">
                        <div
                          style={{ height: `${Math.max(4, planPct)}%` }}
                          className="w-4 sm:w-5 bg-slate-300 rounded-t transition-all relative flex items-start justify-center"
                          title={`Plan: ${row.plan.toLocaleString()}`}
                        />
                        <div
                          style={{ height: `${Math.max(4, actPct)}%` }}
                          className="w-4 sm:w-5 bg-[#0070c0] hover:bg-[#005ba3] rounded-t transition-all relative flex items-start justify-center"
                          title={`Actual: ${row.act.toLocaleString()}`}
                        >
                          <span className="text-[9px] font-bold text-slate-700 -mt-4 whitespace-nowrap">
                            {row.act >= 1000 ? `${(row.act / 1000).toFixed(1)}k` : row.act}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1.5 text-[11px] font-bold text-slate-700 text-center truncate max-w-[90px]">
                        {row.period}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Editable Spreadsheet Table */}
          <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
            {/* Table Action Bar */}
            <div className="bg-slate-100 px-4 py-3 border-b border-slate-300 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm text-slate-800 uppercase tracking-wide">
                  {titleDisplay}
                </span>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {t('โหมดแก้ไขบน Web เปิดอยู่ (คลิกที่ช่องเพื่อแก้ไข)', 'Web Inline Edit Active (Click any cell)', '网页直接编辑已开启（点击单元格即可修改）')}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowAddRowForm(!showAddRowForm)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0070c0] hover:bg-[#005ba3] text-white text-xs font-bold rounded shadow-2xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('เพิ่มแถวข้อมูลใหม่', 'Add New Row', '新增数据行')}</span>
                </button>

                <button
                  onClick={() => setShowAddColModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded border border-slate-300 transition-colors cursor-pointer"
                >
                  <Columns className="w-3.5 h-3.5 text-[#0070c0]" />
                  <span>{t('เพิ่มคอลัมน์', 'Add Column', '新增列')}</span>
                </button>

                <button
                  onClick={() => onSaveOnWeb(`บันทึก ${sheet.tabNameTh}`)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded shadow-2xs transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{t('บันทึกตารางนี้บน Web', 'Save Sheet on Web', '保存此表到网页')}</span>
                </button>
              </div>
            </div>

            {/* Quick Add Row Form */}
            {showAddRowForm && (
              <form
                onSubmit={handleAddRow}
                className="bg-blue-50/80 px-4 py-3.5 border-b border-blue-200 text-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-[#0070c0]" />
                    <span>{t('เพิ่มแถวบันทึกข้อมูลใหม่ลงใน Sheet:', 'Add New Record Row to Sheet:', '在此表中新增记录行:')}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddRowForm(false)}
                    className="text-slate-500 hover:text-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">{t('งวด/วันที่', 'Period/Date', '月份/日期')}</label>
                    <input
                      type="text"
                      value={newPeriod}
                      onChange={e => setNewPeriod(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">{t('รุ่น/กะผลิต', 'Model/Shift', '型号/班次')}</label>
                    <input
                      type="text"
                      value={newModelName}
                      onChange={e => setNewModelName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">{t('แผนผลิต (Plan)', 'Plan', '计划产量')}</label>
                    <input
                      type="number"
                      value={newPlan}
                      onChange={e => setNewPlan(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-right font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">{t('ผลิตจริง (Actual)', 'Actual', '实际产量')}</label>
                    <input
                      type="number"
                      value={newAct}
                      onChange={e => setNewAct(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-right font-mono font-bold text-[#0070c0]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">{t('ชม.ทำงาน (Hrs)', 'Work Hrs', '工作工时')}</label>
                    <input
                      type="number"
                      value={newWorkHours}
                      onChange={e => setNewWorkHours(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-center font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">{t('กำลังคน', 'Manpower', '人数')}</label>
                    <input
                      type="number"
                      value={newManpower}
                      onChange={e => setNewManpower(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-center font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">{t('เป้า UPH', 'Target UPH', '目标 UPH')}</label>
                    <input
                      type="number"
                      value={newTargetUph}
                      onChange={e => setNewTargetUph(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-center font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">{t('หมายเหตุ', 'Remarks', '备注')}</label>
                    <input
                      type="text"
                      value={newNotes}
                      onChange={e => setNewNotes(e.target.value)}
                      placeholder={t('ระบุหมายเหตุ...', 'Remarks...', '输入备注...')}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddRowForm(false)}
                    className="px-3 py-1 bg-white border border-slate-300 rounded text-slate-600 cursor-pointer"
                  >
                    {t('ยกเลิก', 'Cancel', '取消')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1 bg-[#0070c0] hover:bg-[#005ba3] text-white font-bold rounded shadow-2xs cursor-pointer"
                  >
                    {t('บันทึกแถวใหม่', 'Add Row', '确认添加')}
                  </button>
                </div>
              </form>
            )}

            {/* Table Content */}
            <div className="overflow-x-auto max-h-[680px]">
              <table className="w-full text-xs text-left border-collapse border border-slate-300 min-w-[1250px]">
                <thead>
                  <tr className="bg-slate-200 text-slate-800 font-bold text-center border-b border-slate-300 divide-x divide-slate-300">
                    {sheet.columns.map(col => (
                      <th
                        key={col.key}
                        className={`py-2.5 px-2.5 whitespace-nowrap ${
                          col.highlight === 'sky'
                            ? 'bg-sky-100 text-sky-950'
                            : col.highlight === 'blue'
                            ? 'bg-blue-100 text-blue-950'
                            : ''
                        }`}
                      >
                        {editingColKey === col.key ? (
                          <div className="flex items-center gap-1 justify-center">
                            <input
                              autoFocus
                              type="text"
                              value={editingColLabelVal}
                              onChange={e => setEditingColLabelVal(e.target.value)}
                              onBlur={() => handleSaveColHeader(col.key)}
                              onKeyDown={e => e.key === 'Enter' && handleSaveColHeader(col.key)}
                              className="bg-white border border-blue-500 rounded px-1.5 py-0.5 text-xs text-slate-900 w-28"
                            />
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setEditingColKey(col.key);
                              setEditingColLabelVal(getColLabel(col));
                            }}
                            className="flex items-center justify-center gap-1 cursor-pointer hover:text-[#0070c0]"
                            title={t('คลิกเพื่อเปลี่ยนชื่อหัวตาราง', 'Click to rename column', '点击修改列名')}
                          >
                            <span>{getColLabel(col)}</span>
                            <Edit3 className="w-2.5 h-2.5 opacity-40" />
                          </div>
                        )}
                      </th>
                    ))}
                    <th className="py-2.5 px-2 w-10 text-center bg-slate-200">
                      {t('ลบ', 'Del', '删除')}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 text-slate-800 tabular-nums">
                  {sheet.rows.map(row => {
                    const rowGap = row.act - row.plan;
                    const rowAchievePct = row.plan > 0 ? (row.act / row.plan) * 100 : 0;

                    return (
                      <tr key={row.id} className="hover:bg-blue-50/40 transition-colors divide-x divide-slate-200">
                        {sheet.columns.map(col => {
                          const isEditing =
                            editingCell?.rowId === row.id && editingCell?.colKey === col.key;

                          // Handle calculated percentage column
                          if (col.type === 'achievePct') {
                            return (
                              <td
                                key={col.key}
                                className={`py-2 px-2.5 text-center font-bold ${
                                  rowAchievePct >= 100
                                    ? 'text-emerald-700 bg-emerald-50/40'
                                    : rowAchievePct >= 90
                                    ? 'text-[#0070c0]'
                                    : 'text-amber-700'
                                }`}
                              >
                                {row.plan > 0 ? `${rowAchievePct.toFixed(1)}%` : '-'}
                              </td>
                            );
                          }

                          const rawVal =
                            col.key in row
                              ? (row as any)[col.key]
                              : row.customCells?.[col.key] ?? '';

                          const isNumeric =
                            col.type === 'number' || col.type === 'gap' || col.type === 'uph';

                          return (
                            <td
                              key={col.key}
                              onClick={() => handleStartCellEdit(row, col)}
                              className={`py-2 px-2.5 cursor-pointer hover:bg-sky-50/80 transition-colors ${
                                col.align === 'right'
                                  ? 'text-right'
                                  : col.align === 'center'
                                  ? 'text-center'
                                  : 'text-left'
                              } ${
                                col.key === 'period'
                                  ? 'font-bold bg-slate-50 text-slate-900'
                                  : col.key === 'act'
                                  ? 'font-bold text-slate-900 bg-sky-50/30'
                                  : col.key === 'uph'
                                  ? 'font-black text-[#0070c0] bg-sky-50/60'
                                  : col.type === 'gap'
                                  ? rowGap < 0
                                    ? 'font-bold text-rose-600 bg-rose-50/30'
                                    : 'font-bold text-emerald-700 bg-emerald-50/30'
                                  : ''
                              }`}
                            >
                              {isEditing ? (
                                <input
                                  autoFocus
                                  type={isNumeric ? 'number' : 'text'}
                                  value={editingCell.val}
                                  onChange={e =>
                                    setEditingCell({ ...editingCell, val: e.target.value })
                                  }
                                  onBlur={handleSaveCellEdit}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleSaveCellEdit();
                                    if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                  className="w-full bg-white border-2 border-[#0070c0] rounded px-1.5 py-0.5 text-slate-900 font-bold outline-none"
                                />
                              ) : col.type === 'gap' ? (
                                <span>
                                  {rowGap > 0
                                    ? `+${rowGap.toLocaleString()}`
                                    : rowGap.toLocaleString()}
                                </span>
                              ) : isNumeric && typeof rawVal === 'number' ? (
                                <span>{rawVal.toLocaleString()}</span>
                              ) : (
                                <span>{rawVal || '-'}</span>
                              )}
                            </td>
                          );
                        })}

                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => handleDeleteRow(row.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                            title={t('ลบแถวนี้', 'Delete row', '删除此行')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Summary Footer */}
                <tfoot className="bg-slate-900 text-white font-bold border-t-2 border-slate-400 divide-y divide-slate-700 tabular-nums">
                  <tr className="divide-x divide-slate-700">
                    {sheet.columns.map((col, idx) => {
                      if (idx === 0) {
                        return (
                          <td key={col.key} className="py-2.5 px-3 text-center bg-slate-950 text-amber-300 font-black">
                            TOTAL / AVG
                          </td>
                        );
                      }
                      if (col.key === 'plan') {
                        return (
                          <td key={col.key} className="py-2.5 px-2.5 text-right text-sky-200">
                            {summaryStats.totalPlan.toLocaleString()}
                          </td>
                        );
                      }
                      if (col.key === 'act') {
                        return (
                          <td key={col.key} className="py-2.5 px-2.5 text-right text-white font-black text-[13px]">
                            {summaryStats.totalAct.toLocaleString()}
                          </td>
                        );
                      }
                      if (col.key === 'gap') {
                        return (
                          <td
                            key={col.key}
                            className={`py-2.5 px-2.5 text-right font-bold ${
                              summaryStats.totalGap < 0 ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {summaryStats.totalGap > 0
                              ? `+${summaryStats.totalGap.toLocaleString()}`
                              : summaryStats.totalGap.toLocaleString()}
                          </td>
                        );
                      }
                      if (col.key === 'workHours') {
                        return (
                          <td key={col.key} className="py-2.5 px-2.5 text-center text-slate-200">
                            {summaryStats.totalWorkHours.toLocaleString()}
                          </td>
                        );
                      }
                      if (col.key === 'manpower') {
                        return (
                          <td key={col.key} className="py-2.5 px-2.5 text-center text-slate-300">
                            {summaryStats.avgManpower}
                          </td>
                        );
                      }
                      if (col.key === 'uph') {
                        return (
                          <td key={col.key} className="py-2.5 px-2.5 text-center text-amber-300 font-black bg-slate-800 text-[13px]">
                            {summaryStats.avgUph} UPH
                          </td>
                        );
                      }
                      if (col.key === 'targetUph') {
                        return (
                          <td key={col.key} className="py-2.5 px-2.5 text-center text-slate-400">
                            {sheet.defaultTargetUph}
                          </td>
                        );
                      }
                      if (col.key === 'achievePct') {
                        return (
                          <td key={col.key} className="py-2.5 px-2.5 text-center text-emerald-300 font-black">
                            {summaryStats.achieveRate.toFixed(1)}%
                          </td>
                        );
                      }
                      if (col.key === 'lossMinutes') {
                        return (
                          <td key={col.key} className="py-2.5 px-2.5 text-center text-rose-300">
                            {summaryStats.totalLossMinutes.toLocaleString()}
                          </td>
                        );
                      }
                      return (
                        <td key={col.key} className="py-2.5 px-2.5 text-center text-slate-400">
                          -
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-2 bg-slate-950" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Sub-View Mode 2: Linked Daily 1-31 OEC Matrix for this Specific Line */
        <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
          <div className="bg-slate-100 px-4 py-3 border-b border-slate-300 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-800">
                {t(
                  `ตารางบันทึกและอัพเดทข้อมูลรายวัน (วันที่ 1-${days[days.length - 1]?.day || 31}) สำหรับ ${linkedLine?.prodLine || 'Line'}`,
                  `Daily OEC Record & Update Table (Days 1-${days[days.length - 1]?.day || 31}) for ${linkedLine?.prodLine || 'Line'}`,
                  `${linkedLine?.prodLine || 'Line'} 每日数据记录与更新表`
                )}
              </h3>
              <p className="text-xs text-slate-500">
                {t(
                  'คลิกที่ตัวเลขเพื่อแก้ไขยอด Planning, Act หรือ Work Time ของแต่ละวัน ระบบจะซิงค์กับตารางหลักและกราฟทั้งหมดบน Web ทันที',
                  'Click any number to edit daily Planning, Act, or Work Time. Automatically syncs with main OEC table & charts.',
                  '点击任意数字即可修改每日计划、实际产量或工时，自动与主表及所有图表同步。'
                )}
              </p>
            </div>
            <button
              onClick={() => onSaveOnWeb(`อัพเดทตารางรายวัน ${linkedLine?.prodLine || ''}`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded shadow-2xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{t('บันทึกอัพเดทรายวันบน Web', 'Save Daily Updates on Web', '保存每日更新到网页')}</span>
            </button>
          </div>

          {linkedLine ? (
            <div className="overflow-x-auto max-h-[620px]">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-200 text-slate-800 font-bold sticky top-0 z-10 border-b border-slate-300">
                  <tr className="divide-x divide-slate-300 text-center">
                    <th className="py-2.5 px-3">{t('วันที่ (Day)', 'Day', '日期')}</th>
                    <th className="py-2.5 px-3">{t('วันในสัปดาห์', 'Weekday', '星期')}</th>
                    <th className="py-2.5 px-3 bg-sky-100 text-sky-950">
                      {t('แผนผลิต (Planning) - คลิกแก้', 'Planning (Click to edit)', '计划产量 (点击修改)')}
                    </th>
                    <th className="py-2.5 px-3 bg-blue-100 text-blue-950">
                      {t('ผลิตจริง (Actual) - คลิกแก้', 'Actual (Click to edit)', '实际产量 (点击修改)')}
                    </th>
                    <th className="py-2.5 px-3">{t('ส่วนต่าง (Gap)', 'Gap', '差异 (Gap)')}</th>
                    <th className="py-2.5 px-3 bg-amber-100 text-amber-950">
                      {t('ชม.ทำงาน (Work Time) - คลิกแก้', 'Work Time Hrs (Click to edit)', '工作工时 (点击修改)')}
                    </th>
                    <th className="py-2.5 px-3 bg-emerald-100 text-emerald-950">
                      {t('ประสิทธิภาพ (UPH)', 'UPH', '生产效率 (UPH)')}
                    </th>
                    <th className="py-2.5 px-3">{t('% บรรลุแผน', 'Achieve %', '达成率 %')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 tabular-nums">
                  {days.map(d => {
                    const p = Number(linkedLine.planning[d.day] ?? 0);
                    const a = Number(linkedLine.act[d.day] ?? 0);
                    const wt = Number(linkedLine.workTime[d.day] ?? 0);
                    const gap = a - p;
                    const uph = wt > 0 ? Math.round(a / wt) : 0;
                    const pct = p > 0 ? (a / p) * 100 : 0;

                    const renderDailyCell = (
                      cat: 'planning' | 'act' | 'workTime',
                      val: number
                    ) => {
                      const isEdit =
                        editingDailyCell?.lineId === linkedLine.id &&
                        editingDailyCell?.category === cat &&
                        editingDailyCell?.day === d.day;

                      return (
                        <td
                          onClick={() =>
                            setEditingDailyCell({
                              lineId: linkedLine.id,
                              category: cat,
                              day: d.day,
                              val: val > 0 ? String(val) : '',
                            })
                          }
                          className="py-2 px-3 text-right font-mono cursor-pointer hover:bg-blue-50 transition-colors"
                        >
                          {isEdit ? (
                            <input
                              autoFocus
                              type="number"
                              value={editingDailyCell.val}
                              onChange={e =>
                                setEditingDailyCell({ ...editingDailyCell, val: e.target.value })
                              }
                              onBlur={saveDailyInlineEdit}
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveDailyInlineEdit();
                                if (e.key === 'Escape') setEditingDailyCell(null);
                              }}
                              className="w-24 text-right bg-white border-2 border-[#0070c0] rounded px-1.5 py-0.5 font-bold text-slate-900 outline-none"
                            />
                          ) : (
                            <span className={val > 0 ? 'font-bold text-slate-800' : 'text-slate-400'}>
                              {val > 0 ? val.toLocaleString() : '-'}
                            </span>
                          )}
                        </td>
                      );
                    };

                    return (
                      <tr key={d.day} className="hover:bg-slate-50 divide-x divide-slate-200">
                        <td className="py-2 px-3 text-center font-bold text-slate-900 bg-slate-50">
                          {d.day}
                        </td>
                        <td className="py-2 px-3 text-center font-semibold text-slate-600">
                          {d.weekday}
                        </td>
                        {renderDailyCell('planning', p)}
                        {renderDailyCell('act', a)}
                        <td
                          className={`py-2 px-3 text-right font-mono font-bold ${
                            gap < 0
                              ? 'text-rose-600 bg-rose-50/30'
                              : gap > 0
                              ? 'text-emerald-700 bg-emerald-50/30'
                              : 'text-slate-400'
                          }`}
                        >
                          {p > 0 || a > 0 ? (gap > 0 ? `+${gap.toLocaleString()}` : gap.toLocaleString()) : '-'}
                        </td>
                        {renderDailyCell('workTime', wt)}
                        <td className="py-2 px-3 text-center font-mono font-black text-[#0070c0] bg-sky-50/40">
                          {uph > 0 ? uph : '-'}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-semibold text-slate-700">
                          {p > 0 ? `${pct.toFixed(1)}%` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}

      {/* Add Custom Column Modal */}
      {showAddColModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden">
            <div className="bg-[#0070c0] text-white px-4 py-3 flex items-center justify-between">
              <h4 className="font-bold text-sm">{t('เพิ่มคอลัมน์ใหม่ในตาราง', 'Add New Column', '新增表格列')}</h4>
              <button onClick={() => setShowAddColModal(false)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddColumn} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t('ชื่อคอลัมน์:', 'Column Name:', '列名称:')}
                </label>
                <input
                  type="text"
                  required
                  value={newColLabel}
                  onChange={e => setNewColLabel(e.target.value)}
                  placeholder={t('เช่น OEE %, ของเสีย (NG), ผู้รับผิดชอบ', 'e.g. OEE %, Defect NG, Owner', '例如：OEE %、不良数、负责人')}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t('ประเภทข้อมูล:', 'Data Type:', '数据类型:')}
                </label>
                <select
                  value={newColType}
                  onChange={e => setNewColType(e.target.value as 'text' | 'number')}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800"
                >
                  <option value="number">{t('ตัวเลข (Number)', 'Number', '数字 (Number)')}</option>
                  <option value="text">{t('ข้อความ (Text)', 'Text', '文本 (Text)')}</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddColModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  {t('ยกเลิก', 'Cancel', '取消')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0070c0] text-white font-bold rounded"
                >
                  {t('เพิ่มคอลัมน์', 'Add Column', '添加列')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Paste from Excel / Import Excel Sheet Modal */}
      {showExcelPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden">
            <div className="bg-[#0070c0] text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5" />
                <h3 className="font-bold text-base">
                  {t(
                    `วางข้อมูลจาก Excel (Ctrl+V) หรือนำเข้าไฟล์เข้าสู่ ${sheet.tabNameTh}`,
                    `Paste from Excel (Ctrl+V) or Import File into ${sheet.tabNameEn}`,
                    `从 Excel 粘贴数据或导入文件至 ${sheet.tabNameZh}`
                  )}
                </h3>
              </div>
              <button onClick={() => setShowExcelPasteModal(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {/* Option 1: Select an Excel file and choose which sheet tab to load */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2.5">
                <div className="font-bold text-slate-800 flex items-center justify-between">
                  <span>
                    {t(
                      'วิธีที่ 1: เลือกไฟล์ Excel (.xlsx / .csv) แล้วเลือก Sheet ที่ต้องการนำมาแก้ไขบน Web',
                      'Method 1: Upload Excel (.xlsx / .csv) and pick the Sheet tab to edit on Web',
                      '方法 1：上传 Excel 文件并选择要导入编辑的工作表 (Sheet)'
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1 bg-[#0070c0] text-white rounded font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{t('เลือกไฟล์ Excel', 'Choose Excel File', '选择 Excel 文件')}</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleExcelFileUpload}
                  />
                </div>

                {excelWorkbookSheets && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                    <span className="font-semibold text-slate-700">
                      {t('เลือก Sheet ในไฟล์ Excel:', 'Select Sheet in Workbook:', '选择 Excel 中的工作表:')}
                    </span>
                    <select
                      value={selectedExcelSheetName}
                      onChange={e => setSelectedExcelSheetName(e.target.value)}
                      className="bg-white border border-slate-300 rounded px-2.5 py-1 font-bold text-[#0070c0]"
                    >
                      {excelWorkbookSheets.names.map(name => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleConfirmExcelSheetImport}
                      className="px-3 py-1 bg-emerald-600 text-white font-bold rounded cursor-pointer"
                    >
                      {t('ดึงข้อมูลจาก Sheet นี้', 'Load this Sheet', '读取此工作表')}
                    </button>
                  </div>
                )}
              </div>

              {/* Option 2: Copy & Paste directly from Excel */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  {t(
                    'วิธีที่ 2: คัดลอกตารางจาก Excel (Ctrl+C) แล้ววาง (Ctrl+V) ลงในช่องด้านล่างนี้:',
                    'Method 2: Copy cells from Excel (Ctrl+C) and Paste (Ctrl+V) below:',
                    '方法 2：从 Excel 复制表格区域 (Ctrl+C) 并粘贴 (Ctrl+V) 到下方文本框：'
                  )}
                </label>
                <textarea
                  rows={7}
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  placeholder={
                    '2026-01\tHRF-2D Series\t33000\t31322\t-1678\t373\t84\n2026-02\tHRF-2D Inverter\t40000\t38755\t-1245\t435\t89'
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0070c0]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowExcelPasteModal(false)}
                  className="px-4 py-1.5 text-slate-600 hover:bg-slate-100 rounded font-medium"
                >
                  {t('ยกเลิก', 'Cancel', '取消')}
                </button>
                <button
                  type="button"
                  disabled={!pasteText.trim()}
                  onClick={handleApplyPastedExcelData}
                  className="px-4 py-1.5 bg-[#0070c0] hover:bg-[#005ba3] disabled:bg-slate-300 text-white font-bold rounded shadow-xs cursor-pointer"
                >
                  {t('นำเข้าและอัพเดทตารางทันที', 'Apply & Update Table Now', '立即应用并更新表格')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

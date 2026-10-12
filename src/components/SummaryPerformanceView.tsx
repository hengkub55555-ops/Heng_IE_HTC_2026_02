import React, { useState, useMemo } from 'react';
import {
  SummaryPerformanceRow,
  MonthlyEfficiencyRow,
  UpphSheetData,
  LineIdleSheetData,
} from '../types/oec';
import {
  Save,
  Edit3,
  Plus,
  Trash2,
  Download,
  RefreshCw,
  RotateCcw,
  Gauge,
  Users,
  Clock,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { INITIAL_SUMMARY_PERFORMANCE_DATA } from '../data/initialData';

interface SummaryPerformanceViewProps {
  rows: SummaryPerformanceRow[];
  onUpdateRows: (newRows: SummaryPerformanceRow[]) => void;
  monthlyEfficiency: MonthlyEfficiencyRow[];
  upphSheet: UpphSheetData;
  lineIdleSheet: LineIdleSheetData;
  onSaveOnWeb?: (customTitle?: string) => void;
  hasUnsavedChanges?: boolean;
  isSyncing?: boolean;
  onNavigateToSheet?: (tab: 'daily-oec' | 'upph-oec' | 'line-idle' | 'summary-efficiency') => void;
}

export const SummaryPerformanceView: React.FC<SummaryPerformanceViewProps> = ({
  rows,
  onUpdateRows,
  monthlyEfficiency,
  upphSheet,
  lineIdleSheet,
  onSaveOnWeb,
  hasUnsavedChanges = false,
  isSyncing = false,
  onNavigateToSheet,
}) => {
  const { t } = useAppPreferences();

  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    field: keyof SummaryPerformanceRow;
    val: string;
  } | null>(null);

  const [showAddRowForm, setShowAddRowForm] = useState<boolean>(false);
  const [newPeriod, setNewPeriod] = useState<string>('2026-11');
  const [newPeriodLabel, setNewPeriodLabel] = useState<string>('พ.ย. 2026');

  // Compute YTD / Average summary across all rows
  const summaryStats = useMemo(() => {
    if (rows.length === 0) {
      return {
        totalPlan: 0,
        totalAct: 0,
        totalWorkHours: 0,
        avgLineAUph: 0,
        avgLineBUph: 0,
        avgUph: 0,
        targetUph: 105,
        avgLineAUpph: 0,
        avgLineBUpph: 0,
        avgUpph: 0,
        targetUpph: 1.09,
        avgAttendance: 0,
        totalIdleOver1MinHours: 0,
        avgIdleOver1MinRate: 0,
        totalIdle1To5MinHours: 0,
        avgIdle1To5MinRate: 0,
        totalIdleOver5MinHours: 0,
        avgIdleOver5MinRate: 0,
        latestRow: null as SummaryPerformanceRow | null,
      };
    }

    const n = rows.length;
    const totalPlan = rows.reduce((s, r) => s + Number(r.totalPlan || 0), 0);
    const totalAct = rows.reduce((s, r) => s + Number(r.totalAct || 0), 0);
    const totalWorkHours = rows.reduce((s, r) => s + Number(r.workHours || 0), 0);

    const avgLineAUph = Math.round(rows.reduce((s, r) => s + Number(r.lineAUph || 0), 0) / n);
    const avgLineBUph = Math.round(rows.reduce((s, r) => s + Number(r.lineBUph || 0), 0) / n);
    const avgUph = Math.round(rows.reduce((s, r) => s + Number(r.avgUph || 0), 0) / n);
    const targetUph = Math.round(rows.reduce((s, r) => s + Number(r.targetUph || 0), 0) / n);

    const avgLineAUpph = Number(
      (rows.reduce((s, r) => s + Number(r.lineAUpph || 0), 0) / n).toFixed(2)
    );
    const avgLineBUpph = Number(
      (rows.reduce((s, r) => s + Number(r.lineBUpph || 0), 0) / n).toFixed(2)
    );
    const avgUpph = Number(
      (rows.reduce((s, r) => s + Number(r.avgUpph || 0), 0) / n).toFixed(2)
    );
    const targetUpph = Number(
      (rows.reduce((s, r) => s + Number(r.targetUpph || 0), 0) / n).toFixed(2)
    );
    const avgAttendance = Math.round(rows.reduce((s, r) => s + Number(r.attendance || 0), 0) / n);

    const totalIdleOver1MinHours = Number(
      rows.reduce((s, r) => s + Number(r.idleOver1MinHours || 0), 0).toFixed(1)
    );
    const avgIdleOver1MinRate = Number(
      (rows.reduce((s, r) => s + Number(r.idleOver1MinRate || 0), 0) / n).toFixed(1)
    );
    const totalIdle1To5MinHours = Number(
      rows.reduce((s, r) => s + Number(r.idle1To5MinHours || 0), 0).toFixed(1)
    );
    const avgIdle1To5MinRate = Number(
      (rows.reduce((s, r) => s + Number(r.idle1To5MinRate || 0), 0) / n).toFixed(1)
    );
    const totalIdleOver5MinHours = Number(
      rows.reduce((s, r) => s + Number(r.idleOver5MinHours || 0), 0).toFixed(1)
    );
    const avgIdleOver5MinRate = Number(
      (rows.reduce((s, r) => s + Number(r.idleOver5MinRate || 0), 0) / n).toFixed(1)
    );

    return {
      totalPlan,
      totalAct,
      totalWorkHours: Number(totalWorkHours.toFixed(2)),
      avgLineAUph,
      avgLineBUph,
      avgUph,
      targetUph,
      avgLineAUpph,
      avgLineBUpph,
      avgUpph,
      targetUpph,
      avgAttendance,
      totalIdleOver1MinHours,
      avgIdleOver1MinRate,
      totalIdle1To5MinHours,
      avgIdle1To5MinRate,
      totalIdleOver5MinHours,
      avgIdleOver5MinRate,
      latestRow: rows[rows.length - 1],
    };
  }, [rows]);

  // Commit cell edit
  const handleCommitEdit = () => {
    if (!editingCell) return;
    const { rowId, field, val } = editingCell;

    const updated = rows.map(r => {
      if (r.id !== rowId) return r;
      if (field === 'period' || field === 'periodLabelTh' || field === 'notes') {
        return { ...r, [field]: val };
      }
      const num = Number(val);
      const validNum = isNaN(num) ? 0 : num;
      const nextRow: SummaryPerformanceRow = {
        ...r,
        [field]: validNum,
      };

      // Auto-recompute avgUph or avgUpph if Line A / Line B edited
      if (field === 'lineAUph' || field === 'lineBUph') {
        nextRow.avgUph = Math.round((Number(nextRow.lineAUph) + Number(nextRow.lineBUph)) / 2);
      }
      if (field === 'lineAUpph' || field === 'lineBUpph') {
        nextRow.avgUpph = Number(
          ((Number(nextRow.lineAUpph) + Number(nextRow.lineBUpph)) / 2).toFixed(2)
        );
      }
      return nextRow;
    });

    onUpdateRows(updated);
    setEditingCell(null);
  };

  // Sync live values from MonthlyEfficiency (UPH), UpphSheetData (UPPH), and LineIdleSheetData (Line Stop)
  const handleSyncFromAllSheets = () => {
    const synced = rows.map(row => {
      const effMatch = monthlyEfficiency.find(m => m.month === row.period);
      const upphMatch = upphSheet.monthlyData.find(m => m.month === row.period);
      const idleMatch = lineIdleSheet.monthlyTrends.find(m => m.month === row.period);

      const next = { ...row };
      if (effMatch) {
        next.totalPlan = Number(effMatch.lineAPlan || 0) + Number(effMatch.lineBPlan || 0);
        next.totalAct = Number(effMatch.lineAAct || 0) + Number(effMatch.lineBAct || 0);
        next.workHours = Number(effMatch.lineAWorkHours || 0) + Number(effMatch.lineBWorkHours || 0);
        next.lineAUph = effMatch.lineAUph;
        next.lineBUph = effMatch.lineBUph;
        next.avgUph =
          next.workHours > 0
            ? Math.round(next.totalAct / next.workHours)
            : Math.round((effMatch.lineAUph + effMatch.lineBUph) / 2);
      }
      if (upphMatch) {
        next.lineAUpph = upphMatch.upphLineA;
        next.lineBUpph = upphMatch.upphLineB;
        next.avgUpph = Number(((upphMatch.upphLineA + upphMatch.upphLineB) / 2).toFixed(2));
      }
      if (idleMatch) {
        next.idleOver1MinHours = idleMatch.over1MinTime;
        next.idleOver1MinRate = idleMatch.over1MinRate;
        next.idle1To5MinHours = idleMatch.oneTo5MinTime;
        next.idle1To5MinRate = idleMatch.oneTo5MinRate;
        next.idleOver5MinHours = idleMatch.over5MinTime;
        next.idleOver5MinRate = idleMatch.over5MinRate;
      }
      return next;
    });

    onUpdateRows(synced);
  };

  const handleAddRow = () => {
    const newRow: SummaryPerformanceRow = {
      id: `sp-${Date.now()}`,
      period: newPeriod,
      periodLabelTh: newPeriodLabel,
      totalPlan: 90000,
      totalAct: 88000,
      workHours: 800,
      lineAUph: 120,
      lineBUph: 102,
      avgUph: 110,
      targetUph: 105,
      lineAUpph: 0.98,
      lineBUpph: 1.08,
      avgUpph: 1.03,
      targetUpph: 1.09,
      attendance: 212,
      idleOver1MinHours: 130.0,
      idleOver1MinRate: 35.0,
      idle1To5MinHours: 120.0,
      idle1To5MinRate: 32.3,
      idleOver5MinHours: 10.0,
      idleOver5MinRate: 2.7,
      targetIdleRate: 7.0,
      notes: 'เพิ่มงวดข้อมูลใหม่บน Web',
    };
    onUpdateRows([...rows, newRow]);
    setShowAddRowForm(false);
  };

  const handleDeleteRow = (rowId: string) => {
    onUpdateRows(rows.filter(r => r.id !== rowId));
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const exportData = rows.map(r => ({
      Period: r.period,
      'ชื่อเดือน': r.periodLabelTh,
      'Total Plan': r.totalPlan,
      'Total Actual': r.totalAct,
      'Work Hours': r.workHours,
      'Line A UPH': r.lineAUph,
      'Line B UPH': r.lineBUph,
      'Avg UPH': r.avgUph,
      'Target UPH': r.targetUph,
      'Line A UPPH': r.lineAUpph,
      'Line B UPPH': r.lineBUpph,
      'Avg UPPH': r.avgUpph,
      'Target UPPH': r.targetUpph,
      Attendance: r.attendance,
      'Line Stop >1min (h)': r.idleOver1MinHours,
      'Line Stop >1min (%)': `${r.idleOver1MinRate}%`,
      'Line Stop 1-5min (h)': r.idle1To5MinHours,
      'Line Stop 1-5min (%)': `${r.idle1To5MinRate}%`,
      'Line Stop >5min (h)': r.idleOver5MinHours,
      'Line Stop >5min (%)': `${r.idleOver5MinRate}%`,
      Remarks: r.notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Summary_UPH_UPPH_LineStop');
    XLSX.writeFile(wb, `Summary_Performance_UPH_UPPH_LineStop_2026.xlsx`);
  };

  return (
    <div className="space-y-4 pb-8">
      {/* =====================================================================
          1. EXECUTIVE HEADER BANNER & TOOLBAR
         ===================================================================== */}
      <div className="bg-gradient-to-r from-[#005a9e] via-[#0070c0] to-[#0b65b8] text-white rounded-md shadow-md p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider bg-white/15 px-2.5 py-0.5 rounded border border-white/20">
                HTC Ref(泰国冰箱) · Integrated Master Summary
              </span>
              <span className="inline-flex items-center gap-1 text-xs bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded border border-amber-300/30 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                {t('คลิกแก้ไขตัวเลขได้ทุกช่องบน Web', 'All Cells Editable on Web', '所有数据可直接在网页点击修改')}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
              {t(
                'Summary Performance: UPH , UPPH & Line Stop (สรุปประสิทธิภาพรวม)',
                'Summary Performance: UPH , UPPH & Line Stop Dashboard',
                '综合绩效汇总表: UPH, UPPH 与产线停机 (Line Stop)'
              )}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={handleSyncFromAllSheets}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white font-semibold rounded border border-white/25 transition-colors cursor-pointer"
              title={t(
                'ดึงค่าล่าสุดจาก Sheet UPH, Sheet UPPH และ Sheet Line Stop มารวมอัตโนมัติ',
                'Sync latest values from UPH, UPPH, and Line Stop sheets',
                '从 UPH、UPPH 与停机表同步最新数据'
              )}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('ซิงค์ข้อมูลจากทุก Sheet', 'Sync All Sheets', '同步各表数据')}</span>
            </button>

            <button
              onClick={() => setShowAddRowForm(!showAddRowForm)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white font-semibold rounded border border-white/25 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('เพิ่มงวดเดือน', 'Add Period', '新增月份')}</span>
            </button>

            <button
              onClick={() => onUpdateRows(INITIAL_SUMMARY_PERFORMANCE_DATA)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white/90 rounded border border-white/20 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('ค่าเริ่มต้น', 'Reset', '重置')}</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-[#0070c0] hover:bg-blue-50 font-bold rounded shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            {onSaveOnWeb && (
              <button
                onClick={() =>
                  onSaveOnWeb('บันทึกอัปเดต Summary Performance (UPH, UPPH, Line Stop)')
                }
                disabled={isSyncing}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded font-bold shadow-sm transition-all cursor-pointer ${
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

      {/* Add Period Form */}
      {showAddRowForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-bold text-blue-950">
            {t('เพิ่มแถวงวดเดือนใหม่:', 'Add New Period Row:', '新增月份行:')}
          </span>
          <input
            type="text"
            placeholder="2026-11"
            value={newPeriod}
            onChange={e => setNewPeriod(e.target.value)}
            className="w-28 bg-white border border-slate-300 rounded px-2 py-1 font-semibold"
          />
          <input
            type="text"
            placeholder="พ.ย. 2026"
            value={newPeriodLabel}
            onChange={e => setNewPeriodLabel(e.target.value)}
            className="w-32 bg-white border border-slate-300 rounded px-2 py-1 font-semibold"
          />
          <button
            onClick={handleAddRow}
            className="px-3 py-1 bg-[#0070c0] text-white font-bold rounded cursor-pointer"
          >
            {t('เพิ่มลงตาราง', 'Add Row', '添加')}
          </button>
          <button
            onClick={() => setShowAddRowForm(false)}
            className="px-2 py-1 text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            {t('ยกเลิก', 'Cancel', '取消')}
          </button>
        </div>
      )}

      {/* =====================================================================
          2. 3-PILLAR EXECUTIVE SUMMARY KPI CARDS (UPH | UPPH | LINE STOP)
         ===================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pillar 1: UPH Performance */}
        <div className="bg-white rounded-md border-t-4 border-t-[#0070c0] border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded bg-blue-50 text-[#0070c0]">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">1. UPH Performance</h3>
                <p className="text-[11px] text-slate-500">Units Per Hour (Line A & Line B)</p>
              </div>
            </div>
            {onNavigateToSheet && (
              <button
                onClick={() => onNavigateToSheet('summary-efficiency')}
                className="text-[11px] text-[#0070c0] hover:underline font-semibold cursor-pointer"
              >
                {t('เปิด Sheet UPH →', 'Open UPH Sheet →', '打开 UPH 表 →')}
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
            <div className="bg-slate-50 p-2 rounded">
              <div className="text-[10px] text-slate-500 font-semibold">AVG UPH (YTD)</div>
              <div className="text-xl font-black text-[#0070c0]">{summaryStats.avgUph}</div>
              <div className="text-[10px] text-slate-500">Target: {summaryStats.targetUph}</div>
            </div>
            <div className="bg-sky-50/70 p-2 rounded">
              <div className="text-[10px] text-slate-600 font-semibold">Line A UPH</div>
              <div className="text-xl font-black text-[#0091da]">{summaryStats.avgLineAUph}</div>
              <div className="text-[10px] text-slate-500">
                Latest: {summaryStats.latestRow?.lineAUph ?? '-'}
              </div>
            </div>
            <div className="bg-indigo-50/70 p-2 rounded">
              <div className="text-[10px] text-slate-600 font-semibold">Line B UPH</div>
              <div className="text-xl font-black text-indigo-700">{summaryStats.avgLineBUph}</div>
              <div className="text-[10px] text-slate-500">
                Latest: {summaryStats.latestRow?.lineBUph ?? '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Pillar 2: UPPH Performance */}
        <div className="bg-white rounded-md border-t-4 border-t-emerald-600 border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded bg-emerald-50 text-emerald-600">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">2. UPPH Performance (人效)</h3>
                <p className="text-[11px] text-slate-500">Units Per Person Per Hour</p>
              </div>
            </div>
            {onNavigateToSheet && (
              <button
                onClick={() => onNavigateToSheet('upph-oec')}
                className="text-[11px] text-emerald-700 hover:underline font-semibold cursor-pointer"
              >
                {t('เปิด Sheet UPPH →', 'Open UPPH Sheet →', '打开 UPPH 表 →')}
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
            <div className="bg-emerald-50/60 p-2 rounded">
              <div className="text-[10px] text-slate-600 font-semibold">AVG UPPH (YTD)</div>
              <div className="text-xl font-black text-emerald-700">
                {summaryStats.avgUpph.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-500">
                Target: {summaryStats.targetUpph.toFixed(2)}
              </div>
            </div>
            <div className="bg-slate-50 p-2 rounded">
              <div className="text-[10px] text-slate-600 font-semibold">Line A UPPH</div>
              <div className="text-xl font-black text-slate-800">
                {summaryStats.avgLineAUpph.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-500">
                Latest: {summaryStats.latestRow?.lineAUpph.toFixed(2) ?? '-'}
              </div>
            </div>
            <div className="bg-slate-50 p-2 rounded">
              <div className="text-[10px] text-slate-600 font-semibold">Line B UPPH</div>
              <div className="text-xl font-black text-slate-800">
                {summaryStats.avgLineBUpph.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-500">
                Latest: {summaryStats.latestRow?.lineBUpph.toFixed(2) ?? '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Pillar 3: Line Stop / FA Line Idle Time */}
        <div className="bg-white rounded-md border-t-4 border-t-[#2b7a8b] border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded bg-teal-50 text-[#2b7a8b]">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  3. Line Stop / Idle Time (总装停机)
                </h3>
                <p className="text-[11px] text-slate-500">
                  {'>1min, 1-5min & >5min Line Stop Rates'}
                </p>
              </div>
            </div>
            {onNavigateToSheet && (
              <button
                onClick={() => onNavigateToSheet('line-idle')}
                className="text-[11px] text-[#2b7a8b] hover:underline font-semibold cursor-pointer"
              >
                {t('เปิด Sheet Line Stop →', 'Open Line Stop →', '打开停机表 →')}
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
            <div className="bg-blue-50/70 p-2 rounded">
              <div className="text-[10px] text-slate-600 font-semibold">{'>1min Rate (Latest)'}</div>
              <div className="text-xl font-black text-[#0b65b8]">
                {summaryStats.latestRow?.idleOver1MinRate.toFixed(1) ?? '36.9'}%
              </div>
              <div className="text-[10px] text-slate-500">
                YTD Avg: {summaryStats.avgIdleOver1MinRate}%
              </div>
            </div>
            <div className="bg-teal-50/70 p-2 rounded">
              <div className="text-[10px] text-slate-600 font-semibold">{'1-5min Rate (Latest)'}</div>
              <div className="text-xl font-black text-[#2b7a8b]">
                {summaryStats.latestRow?.idle1To5MinRate.toFixed(1) ?? '34.2'}%
              </div>
              <div className="text-[10px] text-slate-500">
                YTD Avg: {summaryStats.avgIdle1To5MinRate}%
              </div>
            </div>
            <div className="bg-slate-100 p-2 rounded">
              <div className="text-[10px] text-slate-600 font-semibold">{'>5min Rate (Latest)'}</div>
              <div className="text-xl font-black text-[#39608f]">
                {summaryStats.latestRow?.idleOver5MinRate.toFixed(1) ?? '2.7'}%
              </div>
              <div className="text-[10px] text-slate-500">
                YTD Avg: {summaryStats.avgIdleOver5MinRate}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          3. 3-IN-1 VISUAL TREND COMPARISON CHARTS (UPH | UPPH | LINE STOP)
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart 1: Monthly UPH Trend */}
        <div className="bg-white rounded-md border border-slate-200 p-3 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-[#0070c0]" />
              <span>UPH Monthly Trend (Line A vs Line B)</span>
            </h3>
            <div className="flex items-center gap-2 text-[10px] font-semibold">
              <span className="text-[#00b0f0]">● Line A</span>
              <span className="text-[#0070c0]">● Line B</span>
            </div>
          </div>
          <svg viewBox="0 0 420 175" className="w-full h-auto">
            {rows.map((r, i) => {
              const step = 370 / Math.max(1, rows.length);
              const cx = 30 + step * i + step / 2;
              const hA = Math.min(115, (r.lineAUph / 150) * 115);
              const hB = Math.min(115, (r.lineBUph / 150) * 115);
              return (
                <g key={r.id}>
                  <rect x={cx - 8} y={140 - hA} width={7} height={hA} fill="#00b0f0" rx="1" />
                  <rect x={cx + 1} y={140 - hB} width={7} height={hB} fill="#0070c0" rx="1" />
                  <text
                    x={cx}
                    y={140 - Math.max(hA, hB) - 4}
                    textAnchor="middle"
                    className="text-[8.5px] font-bold fill-slate-700"
                  >
                    {r.avgUph}
                  </text>
                  <text
                    x={cx}
                    y={160}
                    textAnchor="middle"
                    className="text-[8.5px] fill-slate-500 font-medium"
                  >
                    {r.period.slice(5)}月
                  </text>
                </g>
              );
            })}
            <line x1="25" y1="140" x2="405" y2="140" stroke="#cbd5e1" strokeWidth="1" />
          </svg>
        </div>

        {/* Chart 2: Monthly UPPH Trend */}
        <div className="bg-white rounded-md border border-slate-200 p-3 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>UPPH Monthly Trend (Line A vs Line B)</span>
            </h3>
            <div className="flex items-center gap-2 text-[10px] font-semibold">
              <span className="text-[#00b0f0]">● Line A</span>
              <span className="text-emerald-600">● Line B</span>
            </div>
          </div>
          <svg viewBox="0 0 420 175" className="w-full h-auto">
            {rows.map((r, i) => {
              const step = 370 / Math.max(1, rows.length);
              const cx = 30 + step * i + step / 2;
              const hA = Math.min(115, (r.lineAUpph / 1.4) * 115);
              const hB = Math.min(115, (r.lineBUpph / 1.4) * 115);
              return (
                <g key={r.id}>
                  <rect x={cx - 8} y={140 - hA} width={7} height={hA} fill="#00b0f0" rx="1" />
                  <rect x={cx + 1} y={140 - hB} width={7} height={hB} fill="#059669" rx="1" />
                  <text
                    x={cx}
                    y={140 - Math.max(hA, hB) - 4}
                    textAnchor="middle"
                    className="text-[8.5px] font-bold fill-slate-700"
                  >
                    {r.avgUpph.toFixed(2)}
                  </text>
                  <text
                    x={cx}
                    y={160}
                    textAnchor="middle"
                    className="text-[8.5px] fill-slate-500 font-medium"
                  >
                    {r.period.slice(5)}月
                  </text>
                </g>
              );
            })}
            <line x1="25" y1="140" x2="405" y2="140" stroke="#cbd5e1" strokeWidth="1" />
          </svg>
        </div>

        {/* Chart 3: Monthly Line Stop / Idle Rate % Trend */}
        <div className="bg-white rounded-md border border-slate-200 p-3 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#2b7a8b]" />
              <span>Line Stop Idle Rate % Trend</span>
            </h3>
            <div className="flex items-center gap-2 text-[10px] font-semibold">
              <span className="text-[#0b65b8]">{'● >1min%'}</span>
              <span className="text-[#2b7a8b]">{'● 1-5min%'}</span>
              <span className="text-[#eb7d3c]">{'● >5min%'}</span>
            </div>
          </div>
          <svg viewBox="0 0 420 175" className="w-full h-auto">
            {rows.map((r, i) => {
              const step = 370 / Math.max(1, rows.length);
              const cx = 30 + step * i + step / 2;
              const h1 = Math.min(115, (r.idleOver1MinRate / 70) * 115);
              const h15 = Math.min(115, (r.idle1To5MinRate / 70) * 115);
              const h5 = Math.min(115, (r.idleOver5MinRate / 70) * 115);
              return (
                <g key={r.id}>
                  <rect x={cx - 10} y={140 - h1} width={6} height={h1} fill="#0b65b8" rx="1" />
                  <rect x={cx - 3} y={140 - h15} width={6} height={h15} fill="#2b7a8b" rx="1" />
                  <rect x={cx + 4} y={140 - h5} width={6} height={h5} fill="#eb7d3c" rx="1" />
                  <text
                    x={cx}
                    y={140 - h1 - 4}
                    textAnchor="middle"
                    className="text-[8.5px] font-bold fill-slate-700"
                  >
                    {r.idleOver1MinRate.toFixed(0)}%
                  </text>
                  <text
                    x={cx}
                    y={160}
                    textAnchor="middle"
                    className="text-[8.5px] fill-slate-500 font-medium"
                  >
                    {r.period.slice(5)}月
                  </text>
                </g>
              );
            })}
            <line x1="25" y1="140" x2="405" y2="140" stroke="#cbd5e1" strokeWidth="1" />
          </svg>
        </div>
      </div>

      {/* =====================================================================
          4. MASTER EDITABLE SUMMARY PERFORMANCE TABLE (UPH + UPPH + LINE STOP)
         ===================================================================== */}
      <div className="bg-white rounded-md border border-slate-300 shadow-xs overflow-hidden">
        <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-[#0070c0]" />
            <span className="text-xs font-bold text-slate-800 uppercase">
              {t(
                'ตารางสรุปผลการดำเนินงานรวม: UPH , UPPH & Line Stop (คลิกแก้ไขตัวเลขได้ทุกช่อง)',
                'Master Editable Summary Performance Table: UPH, UPPH & Line Stop',
                '综合绩效主表: UPH, UPPH 与产线停机 (点击任意单元格可直接修改)'
              )}
            </span>
          </div>
          <span className="text-[11px] text-[#0070c0] font-semibold">
            {t(
              '* คลิกที่ตัวเลขในตารางเพื่อแก้ไขได้ทันที พร้อมกด "บันทึกอัพเดทบน Web"',
              '* Click any cell to edit directly and click "Save on Web"',
              '* 点击任意单元格即可修改并保存至网页'
            )}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              {/* Group Header Row */}
              <tr className="text-white font-bold text-[11px]">
                <th
                  colSpan={5}
                  className="bg-slate-800 border border-slate-700 px-2 py-1.5 text-center"
                >
                  Production & Work Time (ยอดผลิตรวม & ชม.ทำงาน)
                </th>
                <th
                  colSpan={4}
                  className="bg-[#0070c0] border border-blue-800 px-2 py-1.5 text-center"
                >
                  1. UPH Performance (ตัว/ชม.)
                </th>
                <th
                  colSpan={5}
                  className="bg-emerald-700 border border-emerald-800 px-2 py-1.5 text-center"
                >
                  2. UPPH & Manpower (人效 UPPH)
                </th>
                <th
                  colSpan={6}
                  className="bg-[#2b7a8b] border border-teal-900 px-2 py-1.5 text-center"
                >
                  3. Line Stop / FA Idle Time (总装停机时)
                </th>
                <th
                  colSpan={2}
                  className="bg-slate-700 border border-slate-600 px-2 py-1.5 text-center"
                >
                  Remarks & Action
                </th>
              </tr>

              {/* Sub-Column Header Row */}
              <tr className="bg-slate-100 text-slate-800 font-bold text-[11px] border-b border-slate-300">
                <th className="border border-slate-300 px-2 py-1.5 text-center">Period</th>
                <th className="border border-slate-300 px-2 py-1.5 text-left">งวดเดือน</th>
                <th className="border border-slate-300 px-2 py-1.5 text-right">Plan</th>
                <th className="border border-slate-300 px-2 py-1.5 text-right">Actual</th>
                <th className="border border-slate-300 px-2 py-1.5 text-right bg-red-50 text-red-900">
                  Work Hrs
                </th>

                {/* UPH */}
                <th className="border border-slate-300 px-2 py-1.5 text-center bg-blue-50/70 text-[#0070c0]">
                  Line A UPH
                </th>
                <th className="border border-slate-300 px-2 py-1.5 text-center bg-blue-50/70 text-[#0070c0]">
                  Line B UPH
                </th>
                <th className="border border-slate-300 px-2 py-1.5 text-center bg-blue-100/80 text-blue-950">
                  AVG UPH
                </th>
                <th className="border border-slate-300 px-2 py-1.5 text-center">Tgt UPH</th>

                {/* UPPH */}
                <th className="border border-slate-300 px-2 py-1.5 text-center">Attendance</th>
                <th className="border border-slate-300 px-2 py-1.5 text-center bg-emerald-50/70 text-emerald-800">
                  Line A UPPH
                </th>
                <th className="border border-slate-300 px-2 py-1.5 text-center bg-emerald-50/70 text-emerald-800">
                  Line B UPPH
                </th>
                <th className="border border-slate-300 px-2 py-1.5 text-center bg-emerald-100/80 text-emerald-950">
                  AVG UPPH
                </th>
                <th className="border border-slate-300 px-2 py-1.5 text-center">Tgt UPPH</th>

                {/* Line Stop */}
                <th className="border border-slate-300 px-2 py-1.5 text-right bg-blue-50/50">
                  {'>1m (h)'}
                </th>
                <th className="border border-slate-300 px-2 py-1.5 text-right bg-blue-50/50 text-[#0b65b8]">
                  {'>1m (%)'}
                </th>
                <th className="border border-slate-300 px-2 py-1.5 text-right bg-teal-50/50">
                  {'1-5m (h)'}
                </th>
                <th className="border border-slate-300 px-2 py-1.5 text-right bg-teal-50/50 text-[#2b7a8b]">
                  {'1-5m (%)'}
                </th>
                <th className="border border-slate-300 px-2 py-1.5 text-right bg-slate-100">
                  {'>5m (h)'}
                </th>
                <th className="border border-slate-300 px-2 py-1.5 text-right bg-slate-100 text-[#39608f]">
                  {'>5m (%)'}
                </th>

                <th className="border border-slate-300 px-2.5 py-1.5 text-left min-w-[180px]">
                  หมายเหตุ / แผนปรับปรุง
                </th>
                <th className="border border-slate-300 px-1.5 py-1.5 text-center w-8">#</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const renderCell = (
                  field: keyof SummaryPerformanceRow,
                  displayVal: string | number,
                  cellClass = ''
                ) => {
                  const isEditing =
                    editingCell?.rowId === row.id && editingCell?.field === field;
                  const isTextField =
                    field === 'period' || field === 'periodLabelTh' || field === 'notes';

                  return (
                    <td
                      onClick={() =>
                        setEditingCell({
                          rowId: row.id,
                          field,
                          val: String(row[field] ?? ''),
                        })
                      }
                      className={`border border-slate-200 px-2 py-1.5 cursor-pointer hover:bg-blue-50 transition-colors ${cellClass}`}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          type={isTextField ? 'text' : 'number'}
                          step="0.01"
                          value={editingCell.val}
                          onChange={e =>
                            setEditingCell({ ...editingCell, val: e.target.value })
                          }
                          onBlur={handleCommitEdit}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleCommitEdit();
                            if (e.key === 'Escape') setEditingCell(null);
                          }}
                          className={`${
                            isTextField ? 'w-full text-left' : 'w-16 text-right'
                          } bg-white border border-[#0070c0] rounded px-1 py-0.5 text-xs font-bold focus:outline-none`}
                        />
                      ) : (
                        displayVal
                      )}
                    </td>
                  );
                };

                return (
                  <tr key={row.id} className="even:bg-slate-50/60 hover:bg-blue-50/30">
                    {renderCell('period', row.period, 'text-center font-bold text-slate-800 whitespace-nowrap')}
                    {renderCell('periodLabelTh', row.periodLabelTh, 'text-left font-medium text-slate-700 whitespace-nowrap')}
                    {renderCell('totalPlan', row.totalPlan.toLocaleString(), 'text-right text-slate-700')}
                    {renderCell('totalAct', row.totalAct.toLocaleString(), 'text-right font-bold text-slate-900')}
                    {renderCell('workHours', row.workHours, 'text-right font-semibold text-red-700 bg-red-50/30')}

                    {/* UPH */}
                    {renderCell('lineAUph', row.lineAUph, 'text-center font-semibold text-[#0070c0] bg-blue-50/20')}
                    {renderCell('lineBUph', row.lineBUph, 'text-center font-semibold text-indigo-700 bg-blue-50/20')}
                    {renderCell(
                      'avgUph',
                      row.avgUph,
                      `text-center font-black ${
                        row.avgUph >= row.targetUph
                          ? 'text-emerald-700 bg-emerald-50/60'
                          : 'text-[#0070c0] bg-blue-50/50'
                      }`
                    )}
                    {renderCell('targetUph', row.targetUph, 'text-center text-slate-500')}

                    {/* UPPH */}
                    {renderCell('attendance', row.attendance, 'text-center text-slate-700')}
                    {renderCell('lineAUpph', row.lineAUpph.toFixed(2), 'text-center font-semibold text-emerald-700 bg-emerald-50/20')}
                    {renderCell('lineBUpph', row.lineBUpph.toFixed(2), 'text-center font-semibold text-emerald-700 bg-emerald-50/20')}
                    {renderCell(
                      'avgUpph',
                      row.avgUpph.toFixed(2),
                      'text-center font-black text-emerald-900 bg-emerald-50/60'
                    )}
                    {renderCell('targetUpph', row.targetUpph.toFixed(2), 'text-center text-slate-500')}

                    {/* Line Stop */}
                    {renderCell('idleOver1MinHours', row.idleOver1MinHours.toFixed(1), 'text-right text-slate-700')}
                    {renderCell('idleOver1MinRate', `${row.idleOver1MinRate.toFixed(1)}%`, 'text-right font-bold text-red-600')}
                    {renderCell('idle1To5MinHours', row.idle1To5MinHours.toFixed(1), 'text-right text-slate-700')}
                    {renderCell('idle1To5MinRate', `${row.idle1To5MinRate.toFixed(1)}%`, 'text-right font-semibold text-[#2b7a8b]')}
                    {renderCell('idleOver5MinHours', row.idleOver5MinHours.toFixed(1), 'text-right text-slate-700')}
                    {renderCell(
                      'idleOver5MinRate',
                      `${row.idleOver5MinRate.toFixed(1)}%`,
                      `text-right font-bold ${
                        row.idleOver5MinRate <= 3.0 ? 'text-emerald-600' : 'text-red-600'
                      }`
                    )}

                    {/* Remarks */}
                    {renderCell('notes', row.notes || '-', 'text-left text-slate-600')}
                    <td className="border border-slate-200 px-1 py-1.5 text-center">
                      <button
                        onClick={() => handleDeleteRow(row.id)}
                        className="text-slate-300 hover:text-red-500 cursor-pointer"
                        title={t('ลบแถว', 'Delete row', '删除')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {/* Summary Footer Row */}
              <tr className="bg-slate-800 text-white font-bold">
                <td colSpan={2} className="border border-slate-700 px-2.5 py-2 text-center">
                  AVG / Total YTD
                </td>
                <td className="border border-slate-700 px-2 py-2 text-right">
                  {summaryStats.totalPlan.toLocaleString()}
                </td>
                <td className="border border-slate-700 px-2 py-2 text-right text-sky-300">
                  {summaryStats.totalAct.toLocaleString()}
                </td>
                <td className="border border-slate-700 px-2 py-2 text-right text-rose-300">
                  {summaryStats.totalWorkHours.toLocaleString()}
                </td>

                {/* UPH */}
                <td className="border border-slate-700 px-2 py-2 text-center">
                  {summaryStats.avgLineAUph}
                </td>
                <td className="border border-slate-700 px-2 py-2 text-center">
                  {summaryStats.avgLineBUph}
                </td>
                <td className="border border-slate-700 px-2 py-2 text-center text-amber-300">
                  {summaryStats.avgUph}
                </td>
                <td className="border border-slate-700 px-2 py-2 text-center">
                  {summaryStats.targetUph}
                </td>

                {/* UPPH */}
                <td className="border border-slate-700 px-2 py-2 text-center">
                  {summaryStats.avgAttendance}
                </td>
                <td className="border border-slate-700 px-2 py-2 text-center">
                  {summaryStats.avgLineAUpph.toFixed(2)}
                </td>
                <td className="border border-slate-700 px-2 py-2 text-center">
                  {summaryStats.avgLineBUpph.toFixed(2)}
                </td>
                <td className="border border-slate-700 px-2 py-2 text-center text-emerald-300">
                  {summaryStats.avgUpph.toFixed(2)}
                </td>
                <td className="border border-slate-700 px-2 py-2 text-center">
                  {summaryStats.targetUpph.toFixed(2)}
                </td>

                {/* Line Stop */}
                <td className="border border-slate-700 px-2 py-2 text-right">
                  {summaryStats.totalIdleOver1MinHours.toFixed(1)}
                </td>
                <td className="border border-slate-700 px-2 py-2 text-right text-amber-300">
                  {summaryStats.avgIdleOver1MinRate.toFixed(1)}%
                </td>
                <td className="border border-slate-700 px-2 py-2 text-right">
                  {summaryStats.totalIdle1To5MinHours.toFixed(1)}
                </td>
                <td className="border border-slate-700 px-2 py-2 text-right">
                  {summaryStats.avgIdle1To5MinRate.toFixed(1)}%
                </td>
                <td className="border border-slate-700 px-2 py-2 text-right">
                  {summaryStats.totalIdleOver5MinHours.toFixed(1)}
                </td>
                <td className="border border-slate-700 px-2 py-2 text-right text-emerald-300">
                  {summaryStats.avgIdleOver5MinRate.toFixed(1)}%
                </td>

                <td colSpan={2} className="border border-slate-700 px-2.5 py-2 text-left text-[11px] text-slate-300">
                  {t(
                    'รวมข้อมูล UPH, UPPH และ Line Stop ทั้งปี',
                    'Consolidated YTD UPH, UPPH & Line Stop',
                    '年度累计 UPH、UPPH 与停机汇总'
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

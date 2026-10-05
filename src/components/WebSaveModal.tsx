/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Save,
  CheckCircle2,
  Clock,
  Database,
  Calendar,
  FolderOpen,
  Trash2,
  Sparkles,
  CloudCheck,
  History,
  Layers,
  AlertTriangle,
  FileCheck2
} from 'lucide-react';
import {
  LineOECData,
  DayColumn,
  MonthlyEfficiencyRow,
  ActionItem,
  OECFilterState,
  PeriodStorageState,
  WebSavedSnapshot
} from '../types/oec';
import { formatPeriodLabel } from '../utils/dateHelper';

interface WebSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: OECFilterState;
  currentLines: LineOECData[];
  currentDays: DayColumn[];
  currentMonthlyEfficiency: MonthlyEfficiencyRow[];
  currentActionItems: ActionItem[];
  periodData: PeriodStorageState;
  webSnapshots: WebSavedSnapshot[];
  lastSyncTime: Date | null;
  isSyncing: boolean;
  hasUnsavedChanges: boolean;
  onSaveOnWebNow: (customTitle?: string) => Promise<void>;
  onSelectSavedPeriod: (periodKey: string) => void;
  onRestoreWebSnapshot: (snapshot: WebSavedSnapshot) => void;
  onDeleteWebSnapshot: (snapshotId: string) => void;
}

export const WebSaveModal: React.FC<WebSaveModalProps> = ({
  isOpen,
  onClose,
  filters,
  currentLines,
  currentDays,
  periodData,
  webSnapshots,
  lastSyncTime,
  isSyncing,
  hasUnsavedChanges,
  onSaveOnWebNow,
  onSelectSavedPeriod,
  onRestoreWebSnapshot,
  onDeleteWebSnapshot,
}) => {
  const activePeriodKey = filters.month === 'All' ? `${filters.year}-09` : filters.month;
  const [saveTitle, setSaveTitle] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'periods' | 'snapshots'>('periods');
  const [justSaved, setJustSaved] = useState<boolean>(false);
  const [confirmRestore, setConfirmRestore] = useState<WebSavedSnapshot | null>(null);

  if (!isOpen) return null;

  // Calculate current totals for preview
  let totalPlan = 0;
  let totalAct = 0;
  let totalWorkHours = 0;

  currentLines.forEach(line => {
    currentDays.forEach(d => {
      const p = line.planning[d.day];
      const a = line.act[d.day];
      const wt = line.workTime[d.day];
      if (p !== null && p !== undefined) totalPlan += Number(p);
      if (a !== null && a !== undefined) totalAct += Number(a);
      if (wt !== null && wt !== undefined) totalWorkHours += Number(wt);
    });
  });

  const overallUph = totalWorkHours > 0 ? Math.round(totalAct / totalWorkHours) : 0;

  const handleSaveClick = async () => {
    const defaultLabel = saveTitle.trim() || `บันทึกข้อมูล ${formatPeriodLabel(filters.year, activePeriodKey)}`;
    await onSaveOnWebNow(defaultLabel);
    setSaveTitle('');
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 3500);
  };

  const savedPeriodEntries = Object.entries(periodData).sort(([keyA], [keyB]) =>
    keyB.localeCompare(keyA)
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-[#0070c0] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-lg backdrop-blur-xs">
              <Save className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <span>บันทึกข้อมูลบน Web (Web Database Save)</span>
                <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-normal">
                  Cloud & Browser Sync
                </span>
              </h3>
              <p className="text-xs text-emerald-50">
                บันทึกข้อมูลตารางรายวัน แยกตามวัน เดือน ปี และสรุปประสิทธิภาพไว้บนระบบเว็บโดยตรง
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Banner */}
        {justSaved && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>บันทึกข้อมูลลงบน Web Database เรียบร้อยแล้ว! ข้อมูลถูกเก็บทั้งรายเดือนและประวัติเวอร์ชัน</span>
          </div>
        )}

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Current Status & Save Action Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-600" />
                  <span>ข้อมูลชุดปัจจุบันที่กำลังเปิดใช้งาน:</span>
                </span>
                <span className="text-xs font-bold text-[#0070c0] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  {formatPeriodLabel(filters.year, activePeriodKey)}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px]">
                {hasUnsavedChanges ? (
                  <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                    มีข้อมูลที่แก้ไขใหม่พร้อมบันทึก
                  </span>
                ) : (
                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <CloudCheck className="w-3.5 h-3.5" />
                    <span>บันทึกบน Web ล่าสุด: {lastSyncTime ? lastSyncTime.toLocaleTimeString('th-TH') : 'พร้อมใช้งาน'}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Summary KPIs of current state */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block">จำนวนวันทำการ</span>
                <span className="font-bold text-slate-800">{currentDays.length} วัน ({currentLines.length} Line)</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block">แผนการผลิตรวม (Plan)</span>
                <span className="font-bold text-slate-800">{totalPlan.toLocaleString()}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block">ยอดผลิตจริง (Actual)</span>
                <span className="font-bold text-[#0070c0]">{totalAct.toLocaleString()}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block">ประสิทธิภาพเฉลี่ย (UPH)</span>
                <span className="font-bold text-emerald-700">{overallUph.toLocaleString()} UPH</span>
              </div>
            </div>

            {/* Note input & Save Button */}
            <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={saveTitle}
                onChange={e => setSaveTitle(e.target.value)}
                placeholder={`ตั้งชื่อการบันทึก (ไม่บังคับ) เช่น อัปเดตยอดผลิต ${activePeriodKey}...`}
                className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={handleSaveClick}
                disabled={isSyncing}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Save className="w-4 h-4" />
                <span>{isSyncing ? 'กำลังบันทึก...' : 'บันทึกบน Web ทันที (Save Now)'}</span>
              </button>
            </div>
          </div>

          {/* Sub-Tabs: Saved Periods vs Saved Snapshots */}
          <div className="border-b border-slate-200 flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('periods')}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'periods'
                  ? 'border-[#0070c0] text-[#0070c0]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>ข้อมูลแยกตาม เดือน/ปี บน Web ({savedPeriodEntries.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('snapshots')}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'snapshots'
                  ? 'border-[#0070c0] text-[#0070c0]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>ประวัติจุดบันทึกบน Web ({webSnapshots.length})</span>
            </button>
          </div>

          {/* Sub-Tab 1: Saved Periods on Web */}
          {activeSubTab === 'periods' ? (
            <div className="space-y-2.5">
              {savedPeriodEntries.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  ยังไม่มีข้อมูลแยกตามเดือนที่บันทึกไว้ กดปุ่ม "บันทึกบน Web ทันที" ด้านบนเพื่อบันทึกข้อมูลเดือนปัจจุบัน
                </div>
              ) : (
                savedPeriodEntries.map(([periodKey, pItem]) => {
                  let pPlan = 0;
                  let pAct = 0;
                  let pHours = 0;
                  pItem.lines.forEach(l => {
                    pItem.days.forEach(d => {
                      const pl = l.planning[d.day];
                      const ac = l.act[d.day];
                      const wt = l.workTime[d.day];
                      if (pl !== null && pl !== undefined) pPlan += Number(pl);
                      if (ac !== null && ac !== undefined) pAct += Number(ac);
                      if (wt !== null && wt !== undefined) pHours += Number(wt);
                    });
                  });
                  const pUph = pHours > 0 ? Math.round(pAct / pHours) : 0;
                  const isCurrent = activePeriodKey === periodKey;
                  const yearPart = parseInt(periodKey.split('-')[0] || '2026', 10);

                  return (
                    <div
                      key={periodKey}
                      className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        isCurrent
                          ? 'bg-blue-50/60 border-blue-300'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-xs">
                            {formatPeriodLabel(yearPart, periodKey)}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] bg-[#0070c0] text-white px-2 py-0.5 rounded-full font-semibold">
                              กำลังเปิดใช้งาน
                            </span>
                          )}
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            {pItem.days.length} วันทำการ
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                          <span>Plan: <strong>{pPlan.toLocaleString()}</strong></span>
                          <span>Actual: <strong className="text-[#0070c0]">{pAct.toLocaleString()}</strong></span>
                          <span>UPH: <strong className="text-emerald-700">{pUph}</strong></span>
                          {pItem.updatedAt && (
                            <span className="text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              อัปเดต: {new Date(pItem.updatedAt).toLocaleString('th-TH')}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          onSelectSavedPeriod(periodKey);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-blue-50 text-[#0070c0] border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-end sm:self-center shrink-0"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>{isCurrent ? 'ดูตารางเดือนนี้' : 'สลับไปเปิดข้อมูลเดือนนี้'}</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* Sub-Tab 2: Saved Web Snapshots */
            <div className="space-y-2.5">
              {webSnapshots.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  ยังไม่มีประวัติการกดบันทึกเวอร์ชันบน Web กดปุ่ม "บันทึกบน Web ทันที" เพื่อสร้างจุดบันทึกแรก
                </div>
              ) : (
                webSnapshots.map(snap => (
                  <div
                    key={snap.id}
                    className="p-3 bg-white border border-slate-200 hover:border-slate-300 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-bold text-slate-800 text-xs">{snap.title}</span>
                        <span className="text-[10px] bg-blue-50 text-[#0070c0] px-2 py-0.5 rounded border border-blue-200 font-semibold">
                          {snap.month}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                        <span>Plan: <strong className="text-slate-700">{snap.totalPlan.toLocaleString()}</strong></span>
                        <span>Actual: <strong className="text-[#0070c0]">{snap.totalAct.toLocaleString()}</strong></span>
                        <span>UPH: <strong className="text-emerald-700">{snap.overallUph}</strong></span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3" />
                          {new Date(snap.savedAt).toLocaleString('th-TH')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => setConfirmRestore(snap)}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>เรียกคืนข้อมูลนี้</span>
                      </button>
                      <button
                        onClick={() => onDeleteWebSnapshot(snap.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded border border-rose-200 transition-colors cursor-pointer"
                        title="ลบจุดบันทึกนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>เคล็ดลับ: สามารถกดปุ่มลัด <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-700 font-mono">Ctrl + S</kbd> เพื่อบันทึกบน Web ได้ทุกเมื่อ</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Restoring Web Snapshot */}
      {confirmRestore && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-amber-100 text-amber-700">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">ยืนยันการเรียกคืนข้อมูลที่บันทึกบน Web?</h4>
                <p className="text-xs text-slate-500">
                  ข้อมูลในตารางปัจจุบันจะถูกแทนที่ด้วยข้อมูลจากจุดบันทึกนี้
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <div className="font-bold text-slate-800">{confirmRestore.title}</div>
              <div className="text-slate-500">
                ช่วงเวลา: {confirmRestore.month} · บันทึกเมื่อ: {new Date(confirmRestore.savedAt).toLocaleString('th-TH')}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmRestore(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  onRestoreWebSnapshot(confirmRestore);
                  setConfirmRestore(null);
                  onClose();
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
              >
                ยืนยันเรียกคืนข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

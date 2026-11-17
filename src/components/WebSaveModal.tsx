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
  CloudCheck,
  History,
  AlertTriangle,
  FileCheck2,
} from 'lucide-react';
import {
  LineOECData,
  DayColumn,
  MonthlyEfficiencyRow,
  ActionItem,
  OECFilterState,
  PeriodStorageState,
  WebSavedSnapshot,
} from '../types/oec';
import { formatPeriodLabel } from '../utils/dateHelper';
import { useAppPreferences } from '../contexts/AppPreferencesContext';

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
  const { language, t } = useAppPreferences();
  const activePeriodKey = filters.month === 'All' ? `${filters.year}-01` : filters.month;
  const [saveTitle, setSaveTitle] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'periods' | 'snapshots'>('periods');
  const [justSaved, setJustSaved] = useState<boolean>(false);
  const [confirmRestore, setConfirmRestore] = useState<WebSavedSnapshot | null>(null);

  if (!isOpen) return null;

  const dateLocale = language === 'th' ? 'th-TH' : language === 'zh' ? 'zh-CN' : 'en-US';

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
    const periodTxt = formatPeriodLabel(filters.year, activePeriodKey, language);
    const defaultLabel =
      saveTitle.trim() ||
      t(`บันทึกข้อมูล ${periodTxt}`, `Saved ${periodTxt}`, `保存数据 ${periodTxt}`);
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
                <span>
                  {t(
                    'บันทึกข้อมูลบน Web (Web Database Save)',
                    'Web Database Save & History',
                    '网页数据库保存与历史记录'
                  )}
                </span>
              </h3>
              <p className="text-xs text-emerald-50">
                {t(
                  'บันทึกข้อมูลตารางรายวัน แยกตามวัน เดือน ปี และสรุปประสิทธิภาพไว้บนระบบเว็บโดยตรง',
                  'Save daily matrices, monthly archives, and efficiency snapshots directly on Web Cloud',
                  '按日、月、年直接保存每日日清表格与效率汇总快照至网页云端'
                )}
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
            <span>
              {t(
                'บันทึกข้อมูลลงบน Web Database เรียบร้อยแล้ว! ข้อมูลถูกเก็บทั้งรายเดือนและประวัติเวอร์ชัน',
                'Saved to Web Database! Both period archive and version snapshot have been stored.',
                '已保存至网页数据库！月度存档与版本快照均已更新。'
              )}
            </span>
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
                  <span>
                    {t(
                      'ข้อมูลชุดปัจจุบันที่กำลังเปิดใช้งาน:',
                      'Active Period Workspace:',
                      '当前正在编辑的周期数据:'
                    )}
                  </span>
                </span>
                <span className="text-xs font-bold text-[#0070c0] bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                  {formatPeriodLabel(filters.year, activePeriodKey, language)}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px]">
                {hasUnsavedChanges ? (
                  <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-semibold">
                    {t('มีข้อมูลที่แก้ไขใหม่พร้อมบันทึก', 'Unsaved edits ready', '有未保存的新修改')}
                  </span>
                ) : (
                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                    <CloudCheck className="w-3.5 h-3.5" />
                    <span>
                      {t('บันทึกล่าสุด:', 'Last saved:', '最近保存:')}{' '}
                      {lastSyncTime
                        ? lastSyncTime.toLocaleTimeString(dateLocale)
                        : t('พร้อมใช้งาน', 'Synced', '已同步')}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Summary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs tabular-nums">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block">
                  {t('จำนวนวันทำการ', 'Working Days', '工作日天数')}
                </span>
                <span className="font-bold text-slate-800">
                  {currentDays.length} {t('วัน', 'days', '天')} ({currentLines.length} Line)
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block">
                  {t('แผนการผลิตรวม (Plan)', 'Total Plan', '计划总量 (Plan)')}
                </span>
                <span className="font-bold text-slate-800">{totalPlan.toLocaleString()}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block">
                  {t('ยอดผลิตจริง (Actual)', 'Total Actual', '实际总产量 (Act)')}
                </span>
                <span className="font-bold text-[#0070c0]">{totalAct.toLocaleString()}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block">
                  {t('ประสิทธิภาพเฉลี่ย (UPH)', 'Overall UPH', '平均 UPH')}
                </span>
                <span className="font-bold text-emerald-700">{overallUph.toLocaleString()} UPH</span>
              </div>
            </div>

            {/* Note input & Save Button */}
            <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={saveTitle}
                onChange={e => setSaveTitle(e.target.value)}
                placeholder={t(
                  `ตั้งชื่อการบันทึก (ไม่บังคับ) เช่น อัปเดตยอดผลิต ${activePeriodKey}...`,
                  `Optional snapshot label, e.g. Update ${activePeriodKey}...`,
                  `可选快照备注名称，例如 更新 ${activePeriodKey}...`
                )}
                className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={handleSaveClick}
                disabled={isSyncing}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Save className="w-4 h-4" />
                <span>
                  {isSyncing
                    ? t('กำลังบันทึก...', 'Saving...', '保存中...')
                    : t('บันทึกบน Web ทันที (Save Now)', 'Save on Web Now', '立即保存至网页')}
                </span>
              </button>
            </div>
          </div>

          {/* Sub-Tabs */}
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
              <span>
                {t(
                  `ข้อมูลแยกตาม เดือน/ปี บน Web (${savedPeriodEntries.length})`,
                  `Saved Months (${savedPeriodEntries.length})`,
                  `已存月度档案 (${savedPeriodEntries.length})`
                )}
              </span>
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
              <span>
                {t(
                  `ประวัติจุดบันทึกบน Web (${webSnapshots.length})`,
                  `Saved Snapshots (${webSnapshots.length})`,
                  `历史保存快照 (${webSnapshots.length})`
                )}
              </span>
            </button>
          </div>

          {/* Sub-Tab 1 */}
          {activeSubTab === 'periods' ? (
            <div className="space-y-2.5">
              {savedPeriodEntries.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  {t(
                    'ยังไม่มีข้อมูลแยกตามเดือนที่บันทึกไว้ กดปุ่ม "บันทึกบน Web ทันที" ด้านบนเพื่อบันทึก',
                    'No monthly records saved yet. Click "Save on Web Now" above to save the active period.',
                    '暂无已存月度记录，请点击上方“立即保存至网页”按钮保存当前月份。'
                  )}
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
                            {formatPeriodLabel(yearPart, periodKey, language)}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] bg-[#0070c0] text-white px-2 py-0.5 rounded font-semibold">
                              {t('กำลังเปิดใช้งาน', 'Active', '当前打开')}
                            </span>
                          )}
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            {pItem.days.length} {t('วันทำการ', 'days', '天')}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 tabular-nums">
                          <span>
                            Plan: <strong>{pPlan.toLocaleString()}</strong>
                          </span>
                          <span>
                            Actual: <strong className="text-[#0070c0]">{pAct.toLocaleString()}</strong>
                          </span>
                          <span>
                            UPH: <strong className="text-emerald-700">{pUph}</strong>
                          </span>
                          {pItem.updatedAt && (
                            <span className="text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {t('อัปเดต:', 'Updated:', '更新:')}{' '}
                              {new Date(pItem.updatedAt).toLocaleString(dateLocale)}
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
                        <span>
                          {isCurrent
                            ? t('ดูตารางเดือนนี้', 'View Period', '查看本月')
                            : t('สลับไปเปิดเดือนนี้', 'Switch to Period', '切换打开')}
                        </span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {webSnapshots.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  {t(
                    'ยังไม่มีประวัติการกดบันทึกเวอร์ชันบน Web กดปุ่ม "บันทึกบน Web ทันที" เพื่อสร้างจุดบันทึกแรก',
                    'No snapshots saved yet. Click "Save on Web Now" to create your first snapshot.',
                    '暂无历史快照，请点击“立即保存至网页”创建首个保存记录。'
                  )}
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
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 tabular-nums">
                        <span>
                          Plan: <strong className="text-slate-700">{snap.totalPlan.toLocaleString()}</strong>
                        </span>
                        <span>
                          Actual: <strong className="text-[#0070c0]">{snap.totalAct.toLocaleString()}</strong>
                        </span>
                        <span>
                          UPH: <strong className="text-emerald-700">{snap.overallUph}</strong>
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3" />
                          {new Date(snap.savedAt).toLocaleString(dateLocale)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => setConfirmRestore(snap)}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>{t('เรียกคืนข้อมูลนี้', 'Restore Snapshot', '恢复此快照')}</span>
                      </button>
                      <button
                        onClick={() => onDeleteWebSnapshot(snap.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded border border-rose-200 transition-colors cursor-pointer"
                        title={t('ลบจุดบันทึกนี้', 'Delete snapshot', '删除此快照')}
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
          <span>
            {t('เคล็ดลับ: กดปุ่มลัด', 'Tip: Press', '提示: 按快捷键')}{' '}
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-700 font-mono">
              Ctrl + S
            </kbd>{' '}
            {t('เพื่อบันทึกบน Web ได้ทุกเมื่อ', 'to save on Web anytime', '随时保存至网页')}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            {t('ปิดหน้าต่าง', 'Close', '关闭窗口')}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmRestore && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-amber-100 text-amber-700">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  {t(
                    'ยืนยันการเรียกคืนข้อมูลที่บันทึกบน Web?',
                    'Confirm Snapshot Restore?',
                    '确认恢复网页快照数据？'
                  )}
                </h4>
                <p className="text-xs text-slate-500">
                  {t(
                    'ข้อมูลในตารางปัจจุบันจะถูกแทนที่ด้วยข้อมูลจากจุดบันทึกนี้',
                    'Current table values will be replaced with this snapshot.',
                    '当前表格数据将被此快照覆盖替换。'
                  )}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <div className="font-bold text-slate-800">{confirmRestore.title}</div>
              <div className="text-slate-500">
                {t('ช่วงเวลา:', 'Period:', '周期:')} {confirmRestore.month} ·{' '}
                {t('บันทึกเมื่อ:', 'Saved at:', '保存时间:')}{' '}
                {new Date(confirmRestore.savedAt).toLocaleString(dateLocale)}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmRestore(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                {t('ยกเลิก', 'Cancel', '取消')}
              </button>
              <button
                onClick={() => {
                  onRestoreWebSnapshot(confirmRestore);
                  setConfirmRestore(null);
                  onClose();
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
              >
                {t('ยืนยันเรียกคืนข้อมูล', 'Confirm Restore', '确认恢复')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

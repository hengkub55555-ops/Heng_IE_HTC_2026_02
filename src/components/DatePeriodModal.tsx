/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Calendar,
  Plus,
  Check,
  Clock,
  Sparkles,
  CalendarDays,
} from 'lucide-react';
import { DayColumn, OECFilterState } from '../types/oec';
import {
  THAI_MONTHS,
  formatPeriodLabel,
  generateMonthDayColumns,
  getWeekdayName,
} from '../utils/dateHelper';
import { useAppPreferences } from '../contexts/AppPreferencesContext';

interface DatePeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: OECFilterState;
  onFilterChange: (newFilters: OECFilterState) => void;
  currentDays: DayColumn[];
  onSetDays: (days: DayColumn[]) => void;
  onAddDay: (day: number, weekday: string) => void;
}

export const DatePeriodModal: React.FC<DatePeriodModalProps> = ({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  currentDays,
  onSetDays,
  onAddDay,
}) => {
  const { language, t } = useAppPreferences();
  const currentYear = filters.year;
  const currentMonthNum =
    filters.month === 'All' ? 9 : parseInt(filters.month.split('-')[1] || '9', 10);

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthNum);
  const [customDate, setCustomDate] = useState<string>(
    `${currentYear}-${String(currentMonthNum).padStart(2, '0')}-01`
  );
  const [notice, setNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedMonthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const selectedPeriodLabel = formatPeriodLabel(selectedYear, selectedMonthKey, language);

  const showTempNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const handleApplyPeriod = () => {
    onFilterChange({
      ...filters,
      year: selectedYear,
      month: selectedMonthKey,
    });
    showTempNotice(
      t(
        `สลับไปยังช่วงเวลา: ${selectedPeriodLabel} เรียบร้อยแล้ว`,
        `Switched period to: ${selectedPeriodLabel}`,
        `已切换至周期: ${selectedPeriodLabel}`
      )
    );
  };

  const handleGenerateFullMonth = () => {
    const newDays = generateMonthDayColumns(selectedYear, selectedMonth);

    onFilterChange({
      ...filters,
      year: selectedYear,
      month: selectedMonthKey,
    });
    onSetDays(newDays);
    showTempNotice(
      t(
        `สร้างคอลัมน์วันทำการทั้งเดือน (${newDays.length} วัน) เรียบร้อยแล้ว!`,
        `Generated full month calendar (${newDays.length} days)!`,
        `已生成整月工作日历列 (${newDays.length} 天)！`
      )
    );
  };

  const handleAddCalendarDate = () => {
    if (!customDate) return;
    const parts = customDate.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);

    const weekday = getWeekdayName(y, m, d);
    onAddDay(d, weekday);
    showTempNotice(
      t(
        `เพิ่มวันที่ ${d} (${weekday}) เข้าสู่ตารางเรียบร้อยแล้ว`,
        `Added day ${d} (${weekday}) to the matrix`,
        `已将 ${d}日 (${weekday}) 添加至表格`
      )
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#005a9c] to-[#0070c0] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-xs">
              <Calendar className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">
                {t(
                  'จัดการวัน เดือน ปี สำหรับใส่ข้อมูล',
                  'Date & Period Manager',
                  '日期 / 月份 / 年份周期管理'
                )}
              </h3>
              <p className="text-xs text-sky-100">
                {t(
                  'กำหนดช่วงเวลาและวันทำการสำหรับกรอกข้อมูลการผลิตและประสิทธิภาพ',
                  'Configure reporting periods and working days for production & efficiency entry',
                  '设置生产与效率数据录入周期及工作日历列'
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

        {/* Notice */}
        {notice && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 text-xs text-emerald-800 font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Section 1 */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-[#0070c0]" />
              <span>
                {t(
                  '1. เลือกปี และ เดือน ที่ต้องการบันทึกข้อมูล',
                  '1. Select Target Year & Month',
                  '1. 选择目标年份与月份'
                )}
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  {t('ปี (Year)', 'Year', '年份 (Year)')}
                </label>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs font-medium rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0070c0]"
                >
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                  <option value={2028}>2028</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  {t('เดือน (Month)', 'Month', '月份 (Month)')}
                </label>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs font-medium rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0070c0]"
                >
                  {THAI_MONTHS.map((m, idx) => (
                    <option key={m.value} value={idx + 1}>
                      {formatPeriodLabel(selectedYear, `${selectedYear}-${m.value}`, language)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-500">
                {t('ช่วงเวลาที่เลือก:', 'Selected Period:', '所选周期:')}{' '}
                <strong className="text-slate-800">{selectedPeriodLabel}</strong>
              </span>
              <button
                onClick={handleApplyPeriod}
                className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0070c0] font-semibold text-xs rounded-lg border border-blue-200 transition-colors cursor-pointer"
              >
                {t('สลับไปยังช่วงเวลานี้', 'Switch to Period', '切换至此周期')}
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-5 space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>
                {t(
                  '2. สร้างคอลัมน์วันทำการทั้งเดือนอัตโนมัติ (1-30/31 วัน)',
                  '2. Auto-Generate Full Month Columns (1–30/31 Days)',
                  '2. 自动生成整月工作日历列 (1–30/31 天)'
                )}
              </span>
            </label>
            <p className="text-xs text-slate-500">
              {t(
                'ระบบจะคำนวณวันในสัปดาห์ (จันทร์, อังคาร, พุธ...) ให้ตรงตามปฏิทินจริงของเดือนและปีที่เลือกทันที',
                'Automatically maps real calendar weekdays (MON, TUE, WEN...) for the selected month and year.',
                '系统将根据所选年月自动匹配真实星期（MON, TUE, WEN...）。'
              )}
            </p>

            <button
              onClick={handleGenerateFullMonth}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {t(
                  `สร้างตารางวันทำการทั้งเดือนสำหรับ ${selectedPeriodLabel}`,
                  `Generate Full Month Columns for ${selectedPeriodLabel}`,
                  `生成 ${selectedPeriodLabel} 整月工作日表`
                )}
              </span>
            </button>
          </div>

          <div className="border-t border-slate-200 pt-5 space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-blue-600" />
              <span>
                {t(
                  '3. เพิ่มวันเฉพาะจากปฏิทิน (Custom Date Picker)',
                  '3. Add Specific Day from Calendar',
                  '3. 从日历添加指定日期列'
                )}
              </span>
            </label>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customDate}
                onChange={e => setCustomDate(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-300 text-slate-800 text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0070c0]"
              />
              <button
                onClick={handleAddCalendarDate}
                className="px-4 py-2 bg-[#0070c0] hover:bg-[#005a9c] text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('เพิ่มวันลงในตาราง', 'Add Day Column', '添加日期列')}</span>
              </button>
            </div>
          </div>

          {/* Current Days Status */}
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs text-slate-600 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 shrink-0">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>
                {t(
                  'คอลัมน์วันทำการในตารางปัจจุบัน:',
                  'Active day columns in matrix:',
                  '当前表格工作日历列:'
                )}
              </span>
            </div>
            <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 truncate">
              {currentDays.length} {t('วัน', 'days', '天')} ({currentDays.map(d => d.day).join(', ')})
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            {t('เสร็จสิ้น', 'Done', '完成')}
          </button>
        </div>
      </div>
    </div>
  );
};

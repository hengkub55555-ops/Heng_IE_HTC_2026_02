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
  Layers, 
  ChevronRight, 
  Clock, 
  Sparkles, 
  Info,
  CalendarDays
} from 'lucide-react';
import { DayColumn, OECFilterState } from '../types/oec';
import { THAI_MONTHS, generateMonthDayColumns, getWeekdayName } from '../utils/dateHelper';

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
  const currentYear = filters.year;
  const currentMonthNum = filters.month === 'All' ? 9 : parseInt(filters.month.split('-')[1] || '9', 10);

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthNum);
  const [customDate, setCustomDate] = useState<string>(
    `${currentYear}-${String(currentMonthNum).padStart(2, '0')}-01`
  );
  const [notice, setNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const showTempNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  // Switch to selected Year and Month
  const handleApplyPeriod = () => {
    const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    onFilterChange({
      ...filters,
      year: selectedYear,
      month: monthKey,
    });
    showTempNotice(`สลับไปยังช่วงเวลา: ${THAI_MONTHS[selectedMonth - 1]?.label} ปี ${selectedYear} เรียบร้อยแล้ว`);
  };

  // Auto-generate full month day columns (1 to 28/29/30/31)
  const handleGenerateFullMonth = () => {
    const newDays = generateMonthDayColumns(selectedYear, selectedMonth);
    const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    
    onFilterChange({
      ...filters,
      year: selectedYear,
      month: monthKey,
    });
    onSetDays(newDays);
    showTempNotice(`สร้างคอลัมน์วันทำการทั้งเดือน (${newDays.length} วัน) เรียบร้อยแล้ว!`);
  };

  // Add specific single date from calendar picker
  const handleAddCalendarDate = () => {
    if (!customDate) return;
    const parts = customDate.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);

    const weekday = getWeekdayName(y, m, d);
    onAddDay(d, weekday);
    showTempNotice(`เพิ่มวันที่ ${d} (${weekday}) เข้าสู่ตารางเรียบร้อยแล้ว`);
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
              <h3 className="font-bold text-lg text-white">จัดการวัน เดือน ปี สำหรับใส่ข้อมูล</h3>
              <p className="text-xs text-sky-100">
                กำหนดช่วงเวลาและวันทำการสำหรับกรอกข้อมูลการผลิตและประสิทธิภาพ
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
          {/* Section 1: Select Year and Month */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-[#0070c0]" />
              <span>1. เลือกปี และ เดือน ที่ต้องการบันทึกข้อมูล</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">ปี (Year)</label>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs font-medium rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0070c0]"
                >
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
                  <option value={2026}>2026 (ปีปัจจุบันในรูป)</option>
                  <option value={2027}>2027</option>
                  <option value={2028}>2028</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">เดือน (Month)</label>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs font-medium rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0070c0]"
                >
                  {THAI_MONTHS.map((m, idx) => (
                    <option key={m.value} value={idx + 1}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-500">
                ช่วงเวลาที่เลือก: <strong className="text-slate-800">{THAI_MONTHS[selectedMonth - 1]?.label} {selectedYear}</strong>
              </span>
              <button
                onClick={handleApplyPeriod}
                className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0070c0] font-semibold text-xs rounded-lg border border-blue-200 transition-colors cursor-pointer"
              >
                สลับไปยังช่วงเวลานี้
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-5 space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>2. สร้างคอลัมน์วันทำการทั้งเดือนอัตโนมัติ (1-30/31 วัน)</span>
            </label>
            <p className="text-xs text-slate-500">
              ระบบจะคำนวณวันในสัปดาห์ (จันทร์, อังคาร, พุธ...) ให้ตรงตามปฏิทินจริงของเดือนและปีที่เลือกทันที
            </p>

            <button
              onClick={handleGenerateFullMonth}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>สร้างตารางวันทำการทั้งเดือนสำหรับ {THAI_MONTHS[selectedMonth - 1]?.label} {selectedYear}</span>
            </button>
          </div>

          <div className="border-t border-slate-200 pt-5 space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-blue-600" />
              <span>3. เพิ่มวันเฉพาะจากปฏิทิน (Custom Date Picker)</span>
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
                <span>เพิ่มวันลงในตาราง</span>
              </button>
            </div>
          </div>

          {/* Current Days Status */}
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>คอลัมน์วันทำการที่มีอยู่ในตารางปัจจุบัน:</span>
            </div>
            <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
              {currentDays.length} วัน ({currentDays.map(d => d.day).join(', ')})
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            เสร็จสิ้น
          </button>
        </div>
      </div>
    </div>
  );
};

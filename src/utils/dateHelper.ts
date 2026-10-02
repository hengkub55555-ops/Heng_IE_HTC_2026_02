/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DayColumn } from '../types/oec';

export const THAI_MONTHS = [
  { value: '01', label: 'มกราคม (Jan)' },
  { value: '02', label: 'กุมภาพันธ์ (Feb)' },
  { value: '03', label: 'มีนาคม (Mar)' },
  { value: '04', label: 'เมษายน (Apr)' },
  { value: '05', label: 'พฤษภาคม (May)' },
  { value: '06', label: 'มิถุนายน (Jun)' },
  { value: '07', label: 'กรกฎาคม (Jul)' },
  { value: '08', label: 'สิงหาคม (Aug)' },
  { value: '09', label: 'กันยายน (Sep)' },
  { value: '10', label: 'ตุลาคม (Oct)' },
  { value: '11', label: 'พฤศจิกายน (Nov)' },
  { value: '12', label: 'ธันวาคม (Dec)' },
];

export const WEEKDAYS_TH = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
export const WEEKDAYS_EN = ['SUN', 'MON', 'TUE', 'WEN', 'THU', 'FRI', 'SAT'];

/**
 * Get weekday string (e.g. 'TUE') for a specific date
 */
export function getWeekdayName(year: number, month: number, day: number): string {
  const d = new Date(year, month - 1, day);
  const dayIdx = d.getDay(); // 0 is Sunday, 1 is Monday ...
  return WEEKDAYS_EN[dayIdx];
}

/**
 * Get the total number of days in a given month of a year
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Generate full monthly day columns for a given year and month
 */
export function generateMonthDayColumns(year: number, month: number): DayColumn[] {
  const totalDays = getDaysInMonth(year, month);
  const result: DayColumn[] = [];

  for (let day = 1; day <= totalDays; day++) {
    const weekday = getWeekdayName(year, month, day);
    const mStr = String(month).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    result.push({
      day,
      weekday,
      dateStr: `${year}-${mStr}-${dStr}`,
    });
  }

  return result;
}

/**
 * Format Year-Month key to human-readable Thai label
 */
export function formatPeriodLabel(year: number, monthVal: string): string {
  if (monthVal === 'All') return `ทั้งปี ${year}`;
  const m = THAI_MONTHS.find(item => item.value === monthVal || `${year}-${item.value}` === monthVal);
  if (m) {
    return `${m.label} ${year}`;
  }
  return `${monthVal} ${year}`;
}

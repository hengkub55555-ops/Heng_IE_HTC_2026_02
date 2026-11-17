/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DayColumn } from '../types/oec';
import { AppLanguage } from '../contexts/AppPreferencesContext';

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

export const MONTHS_I18N: Record<
  string,
  { th: string; en: string; zh: string; shortTh: string; shortEn: string; shortZh: string }
> = {
  '01': { th: 'มกราคม', en: 'January', zh: '1月', shortTh: 'ม.ค.', shortEn: 'Jan', shortZh: '1月' },
  '02': { th: 'กุมภาพันธ์', en: 'February', zh: '2月', shortTh: 'ก.พ.', shortEn: 'Feb', shortZh: '2月' },
  '03': { th: 'มีนาคม', en: 'March', zh: '3月', shortTh: 'มี.ค.', shortEn: 'Mar', shortZh: '3月' },
  '04': { th: 'เมษายน', en: 'April', zh: '4月', shortTh: 'เม.ย.', shortEn: 'Apr', shortZh: '4月' },
  '05': { th: 'พฤษภาคม', en: 'May', zh: '5月', shortTh: 'พ.ค.', shortEn: 'May', shortZh: '5月' },
  '06': { th: 'มิถุนายน', en: 'June', zh: '6月', shortTh: 'มิ.ย.', shortEn: 'Jun', shortZh: '6月' },
  '07': { th: 'กรกฎาคม', en: 'July', zh: '7月', shortTh: 'ก.ค.', shortEn: 'Jul', shortZh: '7月' },
  '08': { th: 'สิงหาคม', en: 'August', zh: '8月', shortTh: 'ส.ค.', shortEn: 'Aug', shortZh: '8月' },
  '09': { th: 'กันยายน', en: 'September', zh: '9月', shortTh: 'ก.ย.', shortEn: 'Sep', shortZh: '9月' },
  '10': { th: 'ตุลาคม', en: 'October', zh: '10月', shortTh: 'ต.ค.', shortEn: 'Oct', shortZh: '10月' },
  '11': { th: 'พฤศจิกายน', en: 'November', zh: '11月', shortTh: 'พ.ย.', shortEn: 'Nov', shortZh: '11月' },
  '12': { th: 'ธันวาคม', en: 'December', zh: '12月', shortTh: 'ธ.ค.', shortEn: 'Dec', shortZh: '12月' },
};

export const WEEKDAYS_TH = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
export const WEEKDAYS_EN = ['SUN', 'MON', 'TUE', 'WEN', 'THU', 'FRI', 'SAT'];

/**
 * Get weekday string (e.g. 'TUE') for a specific date
 */
export function getWeekdayName(year: number, month: number, day: number): string {
  const d = new Date(year, month - 1, day);
  const dayIdx = d.getDay();
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
 * Format Year-Month key to human-readable localized label (th | en | zh)
 */
export function formatPeriodLabel(
  year: number,
  monthVal: string,
  language: AppLanguage = 'th'
): string {
  if (monthVal === 'All') {
    if (language === 'en') return `Full Year ${year}`;
    if (language === 'zh') return `${year}年 全年`;
    return `ทั้งปี ${year}`;
  }

  const parts = monthVal.includes('-') ? monthVal.split('-') : [String(year), monthVal];
  const resolvedYear = parts[0] || String(year);
  const monthCode = (parts[1] || monthVal).padStart(2, '0');
  const mInfo = MONTHS_I18N[monthCode];

  if (mInfo) {
    if (language === 'en') return `${mInfo.en} ${resolvedYear}`;
    if (language === 'zh') return `${resolvedYear}年 ${mInfo.zh}`;
    return `${mInfo.th} (${mInfo.shortEn}) ${resolvedYear}`;
  }

  return `${monthVal} ${year}`;
}

/**
 * Compact localized month label (e.g. 'ม.ค. 26', 'Jan 26', '26年1月')
 */
export function formatMonthShort(
  monthKey: string,
  language: AppLanguage = 'th',
  withYear = true
): string {
  const parts = monthKey.split('-');
  const y = parts[0] || '2026';
  const mCode = (parts[1] || monthKey).padStart(2, '0');
  const mInfo = MONTHS_I18N[mCode];
  if (!mInfo) return monthKey;

  if (language === 'en') return withYear ? `${mInfo.shortEn} ${y.slice(-2)}` : mInfo.shortEn;
  if (language === 'zh') return withYear ? `${y.slice(-2)}年${mInfo.shortZh}` : mInfo.shortZh;
  return withYear ? `${mInfo.shortTh} ${y}` : mInfo.shortTh;
}

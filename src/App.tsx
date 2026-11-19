/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Header } from './components/Header';
import { KpiCards } from './components/KpiCards';
import { OecCharts } from './components/OecCharts';
import { DailyMatrixTable } from './components/DailyMatrixTable';
import { DailyTrendView } from './components/DailyTrendView';
import { UphYtdSummarySection } from './components/UphYtdSummarySection';
import { ImportModal } from './components/ImportModal';
import { PresentationModal } from './components/PresentationModal';
import { AddLineModal } from './components/AddLineModal';
import { PublishModal } from './components/PublishModal';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { DatePeriodModal } from './components/DatePeriodModal';
import { WebSaveModal } from './components/WebSaveModal';
import { FullDatabaseBackupPayload } from './services/googleDrive';
import { generateMonthDayColumns, formatPeriodLabel, THAI_MONTHS } from './utils/dateHelper';
import {
  INITIAL_DAYS,
  INITIAL_LINE_DATA,
  INITIAL_JAN_2026_DAYS,
  INITIAL_JAN_2026_LINES,
  INITIAL_FEB_2026_DAYS,
  INITIAL_FEB_2026_LINES,
  INITIAL_MAR_2026_DAYS,
  INITIAL_MAR_2026_LINES,
  INITIAL_APR_2026_DAYS,
  INITIAL_APR_2026_LINES,
  INITIAL_MAY_2026_DAYS,
  INITIAL_MAY_2026_LINES,
  INITIAL_JUN_2026_DAYS,
  INITIAL_JUN_2026_LINES,
  INITIAL_JUL_2026_DAYS,
  INITIAL_JUL_2026_LINES,
  INITIAL_AUG_2026_DAYS,
  INITIAL_AUG_2026_LINES,
  INITIAL_OCT_2026_DAYS,
  INITIAL_OCT_2026_LINES,
  INITIAL_NOV_2026_DAYS,
  INITIAL_NOV_2026_LINES,
  INITIAL_PERIOD_DATA,
  INITIAL_ACTION_ITEMS,
  INITIAL_MONTHLY_EFFICIENCY,
  INITIAL_EXTRA_SHEETS,
  INITIAL_UPPH_SHEET_DATA,
  INITIAL_LINE_IDLE_SHEET_DATA,
  INITIAL_SUMMARY_PERFORMANCE_DATA,
} from './data/initialData';
import { 
  LineOECData, 
  DayColumn, 
  MonthlyTrendItem, 
  ActionItem, 
  OECFilterState,
  MonthlyEfficiencyRow,
  ActiveSheetTab,
  PeriodStorageState,
  WebSavedSnapshot,
  EditableCustomSheet,
  UpphSheetData,
  LineIdleSheetData,
  SummaryPerformanceRow
} from './types/oec';
import { SummaryEfficiencyView } from './components/SummaryEfficiencyView';
import { EditableWebSheetView } from './components/EditableWebSheetView';
import { UpphOecView } from './components/UpphOecView';
import { LineIdleTimeView } from './components/LineIdleTimeView';
import { SummaryPerformanceView } from './components/SummaryPerformanceView';
import { SummaryOnepageDashboardView } from './components/SummaryOnepageDashboardView';
import { SummaryDashboardPerformanceView } from './components/SummaryDashboardPerformanceView';
import { useAppPreferences } from './contexts/AppPreferencesContext';
import { downloadOECTemplate, exportToCSV } from './utils/excelHelper';
import {
  syncUpphSheetWithDailyOec,
  syncSummaryPerformanceWithOecAndUpph,
} from './utils/upphCalculator';
import { 
  testFirestoreConnection, 
  subscribeToOecDashboard, 
  saveOecDashboardOnline, 
  initOrSeedCloudData, 
  CloudDashboardPayload 
} from './services/firebase';
import * as XLSX from 'xlsx';
import { CheckCircle2, AlertCircle, Info, Sparkles, Cloud } from 'lucide-react';

export default function App() {
  const { language, t } = useAppPreferences();
  // Local storage keys
  const STORAGE_KEY_LINES = 'oec_production_lines_v1';
  const STORAGE_KEY_DAYS = 'oec_days_v1';
  const STORAGE_KEY_ACTIONS = 'oec_actions_v1';
  const STORAGE_KEY_EFFICIENCY = 'oec_monthly_efficiency_v1';
  const STORAGE_KEY_TAB = 'oec_active_tab_v1';
  const STORAGE_KEY_PERIODS = 'oec_period_data_v1';
  const STORAGE_KEY_SNAPSHOTS = 'oec_web_snapshots_v1';
  const STORAGE_KEY_EXTRA_SHEETS = 'oec_extra_sheets_v1';
  const STORAGE_KEY_UPPH_SHEET = 'oec_upph_sheet_v1';
  const STORAGE_KEY_LINE_IDLE = 'oec_line_idle_sheet_v1';
  const STORAGE_KEY_SUMMARY_PERF = 'oec_summary_perf_v1';
  const STORAGE_KEY_OCT_SEEDED = 'oec_oct_2026_seeded_v1';
  const STORAGE_KEY_NOV_SEEDED = 'oec_nov_2026_seeded_v4';
  const STORAGE_KEY_SEP_SEEDED = 'oec_sep_2026_full_v2';
  const STORAGE_KEY_AUG_SEEDED = 'oec_aug_2026_seeded_v1';
  const STORAGE_KEY_JUL_SEEDED = 'oec_jul_2026_seeded_v1';
  const STORAGE_KEY_JUN_SEEDED = 'oec_jun_2026_seeded_v1';
  const STORAGE_KEY_MAY_SEEDED = 'oec_may_2026_seeded_v1';
  const STORAGE_KEY_APR_SEEDED = 'oec_apr_2026_seeded_v1';
  const STORAGE_KEY_MAR_SEEDED = 'oec_mar_2026_seeded_v1';
  const STORAGE_KEY_FEB_SEEDED = 'oec_feb_2026_seeded_v1';
  const STORAGE_KEY_JAN_SEEDED = 'oec_jan_2026_seeded_v1';

  const hasPeriodActualData = (entry?: { lines?: LineOECData[] }) => {
    return Boolean(
      entry?.lines?.some(l =>
        Object.values(l.act || {}).some(v => v !== null && v !== undefined)
      )
    );
  };

  const hasFullJanuaryData = (entry?: { days?: DayColumn[]; lines?: LineOECData[] }) => {
    return Boolean(
      entry?.days?.some(d => d.day === 5) &&
      entry?.days?.some(d => d.day === 30) &&
      hasPeriodActualData(entry)
    );
  };

  const hasFullNovemberData = (entry?: { days?: DayColumn[]; lines?: LineOECData[] }) => {
    return Boolean(
      entry?.days?.some(d => d.day === 2) &&
      entry?.days?.some(d => d.day === 17) &&
      entry?.days?.some(d => d.day === 18) &&
      hasPeriodActualData(entry)
    );
  };

  const hasFullFebruaryData = (entry?: { days?: DayColumn[]; lines?: LineOECData[] }) => {
    return Boolean(
      entry?.days?.some(d => d.day === 2) &&
      entry?.days?.some(d => d.day === 27) &&
      hasPeriodActualData(entry)
    );
  };

  const hasFullMarchData = (entry?: { days?: DayColumn[]; lines?: LineOECData[] }) => {
    return Boolean(
      entry?.days?.some(d => d.day === 7) &&
      entry?.days?.some(d => d.day === 31) &&
      hasPeriodActualData(entry)
    );
  };

  const hasFullAprilData = (entry?: { days?: DayColumn[]; lines?: LineOECData[] }) => {
    return Boolean(
      entry?.days?.some(d => d.day === 1) &&
      entry?.days?.some(d => d.day === 30) &&
      hasPeriodActualData(entry)
    );
  };

  const hasFullMayData = (entry?: { days?: DayColumn[]; lines?: LineOECData[] }) => {
    return Boolean(
      entry?.days?.some(d => d.day === 4) &&
      entry?.days?.some(d => d.day === 31) &&
      hasPeriodActualData(entry)
    );
  };

  const hasFullJuneData = (entry?: { days?: DayColumn[]; lines?: LineOECData[] }) => {
    return Boolean(
      entry?.days?.some(d => d.day === 2) &&
      entry?.days?.some(d => d.day === 30) &&
      hasPeriodActualData(entry)
    );
  };

  const hasFullJulyData = (entry?: { days?: DayColumn[]; lines?: LineOECData[] }) => {
    return Boolean(
      entry?.days?.some(d => d.day === 1) &&
      entry?.days?.some(d => d.day === 31) &&
      hasPeriodActualData(entry)
    );
  };

  const hasFullAugustData = (entry?: { days?: DayColumn[]; lines?: LineOECData[] }) => {
    return Boolean(
      entry?.days?.some(d => d.day === 3) &&
      entry?.days?.some(d => d.day === 31) &&
      hasPeriodActualData(entry)
    );
  };

  const hasFullSeptemberData = (entry?: { days?: DayColumn[]; lines?: LineOECData[] }) => {
    const hasDay20 = Boolean(entry?.days?.some(d => d.day === 20));
    const hasDay28 = Boolean(entry?.days?.some(d => d.day === 28));
    const hasDay29 = Boolean(entry?.days?.some(d => d.day === 29));
    const lineA = entry?.lines?.[0];
    const hasOldSeededVal = Boolean(lineA?.act?.[14] === 2960 && !lineA?.act?.[28]);
    return !hasDay20 && hasDay28 && hasDay29 && !hasOldSeededVal && hasPeriodActualData(entry);
  };

  const mergeExtraSheetsWithSepDefaults = (sheets: EditableCustomSheet[]): EditableCustomSheet[] => {
    return sheets.map(sheet => {
      const initSheet = INITIAL_EXTRA_SHEETS.find(s => s.id === sheet.id);
      if (!initSheet) return sheet;
      return {
        ...sheet,
        rows: sheet.rows.map(row => {
          if (row.id === 's4-r1' && row.plan === 33000 && row.act === 31322) {
            return initSheet.rows.find(r => r.id === 's4-r1') || row;
          }
          if (row.id === 's5-r1' && row.plan === 22000 && row.act === 17165) {
            return initSheet.rows.find(r => r.id === 's5-r1') || row;
          }
          if (row.id === 's4-r2' && row.plan === 40000 && row.act === 38755) {
            return initSheet.rows.find(r => r.id === 's4-r2') || row;
          }
          if (row.id === 's5-r2' && row.plan === 24000 && row.act === 18429) {
            return initSheet.rows.find(r => r.id === 's5-r2') || row;
          }
          if (row.id === 's4-r3' && row.plan === 38000 && row.act === 36079) {
            return initSheet.rows.find(r => r.id === 's4-r3') || row;
          }
          if (row.id === 's5-r3' && row.plan === 30000 && row.act === 28534) {
            return initSheet.rows.find(r => r.id === 's5-r3') || row;
          }
          if (row.id === 's4-r4' && row.plan === 26000 && row.act === 25475) {
            return initSheet.rows.find(r => r.id === 's4-r4') || row;
          }
          if (row.id === 's5-r4' && row.plan === 27000 && row.act === 25475) {
            return initSheet.rows.find(r => r.id === 's5-r4') || row;
          }
          if (row.id === 's4-r5' && row.plan === 43000 && row.act === 41651) {
            return initSheet.rows.find(r => r.id === 's4-r5') || row;
          }
          if (row.id === 's5-r5' && row.plan === 30000 && row.act === 27899) {
            return initSheet.rows.find(r => r.id === 's5-r5') || row;
          }
          if (row.id === 's4-r6' && row.plan === 42000 && row.act === 40877) {
            return initSheet.rows.find(r => r.id === 's4-r6') || row;
          }
          if (row.id === 's5-r6' && row.plan === 42000 && row.act === 40877) {
            return initSheet.rows.find(r => r.id === 's5-r6') || row;
          }
          if (row.id === 's4-r7' && row.plan === 500 && row.act === 74) {
            return initSheet.rows.find(r => r.id === 's4-r7') || row;
          }
          if (row.id === 's5-r7' && row.plan === 54000 && row.act === 55434) {
            return initSheet.rows.find(r => r.id === 's5-r7') || row;
          }
          if (row.id === 's4-r8' && row.plan === 52000 && row.act === 50071) {
            return initSheet.rows.find(r => r.id === 's4-r8') || row;
          }
          if (row.id === 's5-r8' && row.plan === 42000 && row.act === 40339) {
            return initSheet.rows.find(r => r.id === 's5-r8') || row;
          }
          if (row.id === 's4-r9' && row.act === 58976) {
            return initSheet.rows.find(r => r.id === 's4-r9') || row;
          }
          if (row.id === 's5-r9' && row.act === 42803) {
            return initSheet.rows.find(r => r.id === 's5-r9') || row;
          }
          return row;
        }),
      };
    });
  };

  const isStaleUpphSheet = (sheet?: UpphSheetData): boolean => {
    if (!sheet || !sheet.monthlyData || sheet.monthlyData.length < 11 || !sheet.periodMatrices) {
      return true;
    }
    const m01 = sheet.monthlyData.find(m => m.month === '2026-01');
    const m07 = sheet.monthlyData.find(m => m.month === '2026-07');
    const m09 = sheet.monthlyData.find(m => m.month === '2026-09');
    const m11 = sheet.monthlyData.find(m => m.month === '2026-11');
    const novMatrix = sheet.periodMatrices['2026-11'];
    const hasOldTarget = Boolean(
      sheet.lines?.some(l =>
        Object.values(l.targetUpph || {}).some(v => v !== null && v !== undefined && v > 0 && v < 5)
      )
    );
    return Boolean(
      hasOldTarget ||
      (m01 && (m01.upphLineA < 5 || m01.upphLineB < 5)) ||
      (m07 && m07.upphLineB < 5) ||
      (m09 && (m09.prodLineA === 58976 || m09.upphLineA < 5 || m09.upphLineB < 5)) ||
      !novMatrix?.days?.some(d => d.day === 18) ||
      (m11 && (m11.prodLineA === 42340 || m11.prodLineA === 49536))
    );
  };

  const mergeUpphWithDefaults = (
    sheet: UpphSheetData,
    targetPeriodData: PeriodStorageState = INITIAL_PERIOD_DATA,
    targetMonthlyEff: MonthlyEfficiencyRow[] = INITIAL_MONTHLY_EFFICIENCY
  ): UpphSheetData => {
    const cleaned: UpphSheetData = {
      ...sheet,
      monthlyData: (sheet.monthlyData || []).map(item => {
        if (item.month === '2026-03' && item.prodLineA === 36079 && item.prodLineB === 28534) {
          return { ...item, prodLineA: 29243, prodLineB: 23047 };
        }
        if (item.month === '2026-04' && item.prodLineA === 25475 && item.prodLineB === 25475) {
          return { ...item, prodLineB: 25955 };
        }
        if (item.month === '2026-06' && item.prodLineA === 40877 && item.prodLineB === 40877) {
          return { ...item, prodLineB: 36675 };
        }
        if (item.month === '2026-08' && item.prodLineA === 50071 && item.prodLineB === 40339) {
          return { ...item, prodLineA: 40339, prodLineB: 50071 };
        }
        return item;
      }),
    };

    if (isStaleUpphSheet(cleaned)) {
      return syncUpphSheetWithDailyOec(
        {
          ...INITIAL_UPPH_SHEET_DATA,
          activeMonth: cleaned.activeMonth || INITIAL_UPPH_SHEET_DATA.activeMonth || '2026-09',
          days: cleaned.days?.length ? cleaned.days : INITIAL_UPPH_SHEET_DATA.days,
          lines: cleaned.lines?.length ? cleaned.lines : INITIAL_UPPH_SHEET_DATA.lines,
          periodMatrices: cleaned.periodMatrices || INITIAL_UPPH_SHEET_DATA.periodMatrices,
        },
        targetPeriodData,
        targetMonthlyEff,
        cleaned.activeMonth || '2026-09'
      );
    }

    return cleaned;
  };

  const isStaleSummaryUpph = (rows?: SummaryPerformanceRow[]): boolean => {
    if (!rows || rows.length < 11) return true;
    const r01 = rows.find(r => r.period === '2026-01');
    const r07 = rows.find(r => r.period === '2026-07');
    const r09 = rows.find(r => r.period === '2026-09');
    const r11 = rows.find(r => r.period === '2026-11');
    return Boolean(
      (r01 && (r01.lineAUpph < 5 || r01.targetUpph < 5)) ||
      (r07 && (r07.lineBUpph < 5 || r07.targetUpph < 5)) ||
      (r09 && (r09.lineAUpph < 5 || r09.targetUpph < 5 || r09.totalAct === 101779)) ||
      (r11 &&
        ((r11.totalPlan === 71984 && (r11.totalAct === 60920 || r11.totalAct === 69649)) ||
          (r11.totalPlan === 83627 && r11.totalAct === 81197)))
    );
  };

  const mergeSummaryWithUpphDefaults = (
    rows: SummaryPerformanceRow[],
    targetPeriodData: PeriodStorageState = INITIAL_PERIOD_DATA,
    targetMonthlyEff: MonthlyEfficiencyRow[] = INITIAL_MONTHLY_EFFICIENCY,
    targetUpphSheet: UpphSheetData = INITIAL_UPPH_SHEET_DATA
  ): SummaryPerformanceRow[] => {
    if (isStaleSummaryUpph(rows)) {
      return syncSummaryPerformanceWithOecAndUpph(
        rows.length >= 11 ? rows : INITIAL_SUMMARY_PERFORMANCE_DATA,
        targetPeriodData,
        targetMonthlyEff,
        targetUpphSheet
      );
    }
    return rows;
  };

  const mergeMonthlyWithRecentDefaults = (rows: MonthlyEfficiencyRow[]): MonthlyEfficiencyRow[] => {
    const map = new Map<string, MonthlyEfficiencyRow>();
    rows.forEach(r => map.set(r.month, r));
    ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'].forEach(mKey => {
      const initRow = INITIAL_MONTHLY_EFFICIENCY.find(r => r.month === mKey);
      const existing = map.get(mKey);
      if (
        initRow &&
        (!existing ||
          (mKey === '2026-01' && existing.lineAPlan === 33000 && existing.lineBPlan === 22000) ||
          (mKey === '2026-02' && existing.lineAPlan === 40000 && existing.lineBPlan === 24000) ||
          (mKey === '2026-03' && existing.lineAPlan === 38000 && existing.lineBPlan === 30000) ||
          (mKey === '2026-04' && existing.lineAPlan === 26000 && existing.lineBPlan === 27000) ||
          (mKey === '2026-05' && existing.lineAPlan === 43000 && existing.lineBPlan === 30000) ||
          (mKey === '2026-06' && existing.lineAPlan === 42000 && existing.lineBAct === 40877) ||
          (mKey === '2026-07' && existing.lineAPlan === 500 && existing.lineAAct === 74) ||
          (mKey === '2026-08' && existing.lineAPlan === 52000 && existing.lineAAct === 50071) ||
          (mKey === '2026-11' &&
            ((existing.lineAAct === 37296 && existing.lineBAct === 23624) ||
              (existing.lineAAct === 42340 &&
                existing.lineBAct === 27309 &&
                existing.lineAPlan === 44783) ||
              (existing.lineAAct === 49536 &&
                existing.lineBAct === 31661 &&
                existing.lineAPlan === 51493))))
      ) {
        map.set(mKey, initRow);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  };

  // Sheet Tab State
  const [activeTab, setActiveTab] = useState<ActiveSheetTab>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TAB);
      return (saved as ActiveSheetTab) || 'daily-oec';
    } catch {
      return 'daily-oec';
    }
  });

  // State
  const [lines, setLines] = useState<LineOECData[]>(() => {
    try {
      const isJanSeeded = localStorage.getItem(STORAGE_KEY_JAN_SEEDED) === '1';
      const savedPeriodsRaw = localStorage.getItem(STORAGE_KEY_PERIODS);
      if (isJanSeeded) {
        if (savedPeriodsRaw) {
          const parsedPeriods = JSON.parse(savedPeriodsRaw) as PeriodStorageState;
          if (hasFullJanuaryData(parsedPeriods['2026-01'])) {
            return parsedPeriods['2026-01'].lines;
          }
        }
      }
    } catch {
      // fall through to January 2026 default
    }
    return INITIAL_JAN_2026_LINES;
  });

  const [days, setDays] = useState<DayColumn[]>(() => {
    try {
      const isJanSeeded = localStorage.getItem(STORAGE_KEY_JAN_SEEDED) === '1';
      const savedPeriodsRaw = localStorage.getItem(STORAGE_KEY_PERIODS);
      if (isJanSeeded) {
        if (savedPeriodsRaw) {
          const parsedPeriods = JSON.parse(savedPeriodsRaw) as PeriodStorageState;
          if (hasFullJanuaryData(parsedPeriods['2026-01']) && parsedPeriods['2026-01'].days?.length) {
            return parsedPeriods['2026-01'].days;
          }
        }
      }
    } catch {
      // fall through to January 2026 default
    }
    return INITIAL_JAN_2026_DAYS;
  });

  const [monthlyEfficiency, setMonthlyEfficiency] = useState<MonthlyEfficiencyRow[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EFFICIENCY);
      if (saved) {
        const parsed = JSON.parse(saved) as MonthlyEfficiencyRow[];
        return mergeMonthlyWithRecentDefaults(parsed);
      }
    } catch {
      // ignore
    }
    return INITIAL_MONTHLY_EFFICIENCY;
  });

  const [periodData, setPeriodData] = useState<PeriodStorageState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PERIODS);
      if (saved) {
        const parsed = JSON.parse(saved) as PeriodStorageState;
        const next: PeriodStorageState = { ...parsed };
        if (!hasFullJanuaryData(next['2026-01'])) {
          next['2026-01'] = INITIAL_PERIOD_DATA['2026-01'];
        }
        if (!hasFullFebruaryData(next['2026-02'])) {
          next['2026-02'] = INITIAL_PERIOD_DATA['2026-02'];
        }
        if (!hasFullMarchData(next['2026-03'])) {
          next['2026-03'] = INITIAL_PERIOD_DATA['2026-03'];
        }
        if (!hasFullAprilData(next['2026-04'])) {
          next['2026-04'] = INITIAL_PERIOD_DATA['2026-04'];
        }
        if (!hasFullMayData(next['2026-05'])) {
          next['2026-05'] = INITIAL_PERIOD_DATA['2026-05'];
        }
        if (!hasFullJuneData(next['2026-06'])) {
          next['2026-06'] = INITIAL_PERIOD_DATA['2026-06'];
        }
        if (!hasFullJulyData(next['2026-07'])) {
          next['2026-07'] = INITIAL_PERIOD_DATA['2026-07'];
        }
        if (!hasFullAugustData(next['2026-08'])) {
          next['2026-08'] = INITIAL_PERIOD_DATA['2026-08'];
        }
        if (!hasFullSeptemberData(next['2026-09'])) {
          next['2026-09'] = INITIAL_PERIOD_DATA['2026-09'];
        }
        if (!hasPeriodActualData(next['2026-10'])) {
          next['2026-10'] = INITIAL_PERIOD_DATA['2026-10'];
        }
        if (!hasFullNovemberData(next['2026-11'])) {
          next['2026-11'] = INITIAL_PERIOD_DATA['2026-11'];
        }
        return next;
      }
    } catch {
      // ignore
    }
    return INITIAL_PERIOD_DATA;
  });

  const [webSnapshots, setWebSnapshots] = useState<WebSavedSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SNAPSHOTS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [extraSheets, setExtraSheets] = useState<EditableCustomSheet[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EXTRA_SHEETS);
      return saved ? mergeExtraSheetsWithSepDefaults(JSON.parse(saved)) : INITIAL_EXTRA_SHEETS;
    } catch {
      return INITIAL_EXTRA_SHEETS;
    }
  });

  const [upphSheet, setUpphSheet] = useState<UpphSheetData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_UPPH_SHEET);
      return saved
        ? mergeUpphWithDefaults(JSON.parse(saved), periodData, monthlyEfficiency)
        : INITIAL_UPPH_SHEET_DATA;
    } catch {
      return INITIAL_UPPH_SHEET_DATA;
    }
  });

  const [lineIdleSheet, setLineIdleSheet] = useState<LineIdleSheetData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LINE_IDLE);
      return saved ? JSON.parse(saved) : INITIAL_LINE_IDLE_SHEET_DATA;
    } catch {
      return INITIAL_LINE_IDLE_SHEET_DATA;
    }
  });

  const [summaryPerformance, setSummaryPerformance] = useState<SummaryPerformanceRow[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SUMMARY_PERF);
      if (saved) {
        let parsed = JSON.parse(saved) as SummaryPerformanceRow[];
        const initJan = INITIAL_SUMMARY_PERFORMANCE_DATA.find(r => r.period === '2026-01');
        if (initJan) {
          const idx = parsed.findIndex(r => r.period === '2026-01');
          if (idx === -1) {
            parsed = [...parsed, initJan];
          } else if (parsed[idx].totalPlan === 55000 && parsed[idx].totalAct === 48487) {
            parsed = parsed.map((r, i) => (i === idx ? initJan : r));
          }
        }
        const initFeb = INITIAL_SUMMARY_PERFORMANCE_DATA.find(r => r.period === '2026-02');
        if (initFeb) {
          const idx = parsed.findIndex(r => r.period === '2026-02');
          if (idx === -1) {
            parsed = [...parsed, initFeb];
          } else if (parsed[idx].totalPlan === 64000 && parsed[idx].totalAct === 57184) {
            parsed = parsed.map((r, i) => (i === idx ? initFeb : r));
          }
        }
        const initMar = INITIAL_SUMMARY_PERFORMANCE_DATA.find(r => r.period === '2026-03');
        if (initMar) {
          const idx = parsed.findIndex(r => r.period === '2026-03');
          if (idx === -1) {
            parsed = [...parsed, initMar];
          } else if (parsed[idx].totalPlan === 68000 && parsed[idx].totalAct === 64613) {
            parsed = parsed.map((r, i) => (i === idx ? initMar : r));
          }
        }
        const initApr = INITIAL_SUMMARY_PERFORMANCE_DATA.find(r => r.period === '2026-04');
        if (initApr) {
          const idx = parsed.findIndex(r => r.period === '2026-04');
          if (idx === -1) {
            parsed = [...parsed, initApr];
          } else if (parsed[idx].totalPlan === 53000 && parsed[idx].totalAct === 50950) {
            parsed = parsed.map((r, i) => (i === idx ? initApr : r));
          }
        }
        const initMay = INITIAL_SUMMARY_PERFORMANCE_DATA.find(r => r.period === '2026-05');
        if (initMay) {
          const idx = parsed.findIndex(r => r.period === '2026-05');
          if (idx === -1) {
            parsed = [...parsed, initMay];
          } else if (parsed[idx].totalPlan === 73000 && parsed[idx].totalAct === 69550) {
            parsed = parsed.map((r, i) => (i === idx ? initMay : r));
          }
        }
        const initJun = INITIAL_SUMMARY_PERFORMANCE_DATA.find(r => r.period === '2026-06');
        if (initJun) {
          const idx = parsed.findIndex(r => r.period === '2026-06');
          if (idx === -1) {
            parsed = [...parsed, initJun];
          } else if (parsed[idx].totalPlan === 84000 && parsed[idx].totalAct === 81754) {
            parsed = parsed.map((r, i) => (i === idx ? initJun : r));
          }
        }
        const initJul = INITIAL_SUMMARY_PERFORMANCE_DATA.find(r => r.period === '2026-07');
        if (initJul) {
          const idx = parsed.findIndex(r => r.period === '2026-07');
          if (idx === -1) {
            parsed = [...parsed, initJul];
          } else if (parsed[idx].totalPlan === 54500 && parsed[idx].totalAct === 55508) {
            parsed = parsed.map((r, i) => (i === idx ? initJul : r));
          }
        }
        const initAug = INITIAL_SUMMARY_PERFORMANCE_DATA.find(r => r.period === '2026-08');
        if (initAug) {
          const idx = parsed.findIndex(r => r.period === '2026-08');
          if (idx === -1) {
            parsed = [...parsed, initAug];
          } else if (parsed[idx].totalPlan === 94000 && parsed[idx].totalAct === 90410) {
            parsed = parsed.map((r, i) => (i === idx ? initAug : r));
          }
        }
        const initSep = INITIAL_SUMMARY_PERFORMANCE_DATA.find(r => r.period === '2026-09');
        if (initSep) {
          const idx = parsed.findIndex(r => r.period === '2026-09');
          if (idx === -1) {
            parsed = [...parsed, initSep];
          } else if (parsed[idx].totalAct === 101779) {
            parsed = parsed.map((r, i) => (i === idx ? initSep : r));
          }
        }
        const initOct = INITIAL_SUMMARY_PERFORMANCE_DATA.find(r => r.period === '2026-10');
        if (initOct) {
          const idx = parsed.findIndex(r => r.period === '2026-10');
          if (idx === -1) {
            parsed = [...parsed, initOct];
          } else if (parsed[idx].totalAct === 39850 && parsed[idx].totalPlan === 42000) {
            parsed = parsed.map((r, i) => (i === idx ? initOct : r));
          }
        }
        const initNov = INITIAL_SUMMARY_PERFORMANCE_DATA.find(r => r.period === '2026-11');
        if (initNov) {
          const idx = parsed.findIndex(r => r.period === '2026-11');
          if (idx === -1) {
            parsed = [...parsed, initNov];
          } else if (
            (parsed[idx].totalPlan === 71984 &&
              (parsed[idx].totalAct === 60920 || parsed[idx].totalAct === 69649)) ||
            (parsed[idx].totalPlan === 83627 && parsed[idx].totalAct === 81197)
          ) {
            parsed = parsed.map((r, i) => (i === idx ? initNov : r));
          }
        }
        return mergeSummaryWithUpphDefaults(parsed, periodData, monthlyEfficiency, upphSheet);
      }
    } catch {
      // ignore
    }
    return INITIAL_SUMMARY_PERFORMANCE_DATA;
  });

  const [filters, setFilters] = useState<OECFilterState>({
    plant: 'ทั้งหมด',
    year: 2026,
    month: '2026-01',
    prodLine: 'All',
  });

  const activePeriodKey = filters.month === 'All' ? `${filters.year}-01` : filters.month;
  const activePeriodKeyRef = useRef<string>(activePeriodKey);
  activePeriodKeyRef.current = activePeriodKey;

  // Dynamically compute monthly production linked directly to table edits
  const dynamicMonthlyProd = useMemo(() => {
    const lineA = lines.find(l => l.prodLine.toLowerCase().includes('a')) || lines[0];
    const lineB = lines.find(l => l.prodLine.toLowerCase().includes('b')) || lines[1];

    let liveLineAAct = 0;
    let liveLineBAct = 0;

    if (lineA) {
      days.forEach(d => {
        const a = lineA.act[d.day];
        if (a !== null && a !== undefined) liveLineAAct += Number(a);
      });
    }

    if (lineB) {
      days.forEach(d => {
        const b = lineB.act[d.day];
        if (b !== null && b !== undefined) liveLineBAct += Number(b);
      });
    }

    return monthlyEfficiency.map(item => {
      // Sync the active month with the live sum from the Daily Table unless manually overridden
      if (item.month === activePeriodKey && !item.manualOverride) {
        return {
          month: item.month,
          lineA: liveLineAAct > 0 ? liveLineAAct : item.lineAAct,
          lineB: liveLineBAct > 0 ? liveLineBAct : item.lineBAct,
        };
      }
      return {
        month: item.month,
        lineA: item.lineAAct,
        lineB: item.lineBAct,
      };
    });
  }, [monthlyEfficiency, lines, days, activePeriodKey]);

  // Dynamically compute monthly UPH linked directly to table edits
  const dynamicMonthlyUph = useMemo(() => {
    const lineA = lines.find(l => l.prodLine.toLowerCase().includes('a')) || lines[0];
    const lineB = lines.find(l => l.prodLine.toLowerCase().includes('b')) || lines[1];

    let liveLineAAct = 0;
    let liveLineAWorkHours = 0;
    let liveLineBAct = 0;
    let liveLineBWorkHours = 0;

    if (lineA) {
      days.forEach(d => {
        const a = lineA.act[d.day];
        const wt = lineA.workTime[d.day];
        if (a !== null && a !== undefined) liveLineAAct += Number(a);
        if (wt !== null && wt !== undefined) liveLineAWorkHours += Number(wt);
      });
    }

    if (lineB) {
      days.forEach(d => {
        const b = lineB.act[d.day];
        const wt = lineB.workTime[d.day];
        if (b !== null && b !== undefined) liveLineBAct += Number(b);
        if (wt !== null && wt !== undefined) liveLineBWorkHours += Number(wt);
      });
    }

    const liveLineAUph = liveLineAWorkHours > 0 ? Math.round(liveLineAAct / liveLineAWorkHours) : 0;
    const liveLineBUph = liveLineBWorkHours > 0 ? Math.round(liveLineBAct / liveLineBWorkHours) : 0;

    return monthlyEfficiency.map(item => {
      // Sync the active month with the live UPH from the Daily Table unless manually overridden
      if (item.month === activePeriodKey && !item.manualOverride) {
        return {
          month: item.month,
          lineA: liveLineAUph > 0 ? liveLineAUph : item.lineAUph,
          lineB: liveLineBUph > 0 ? liveLineBUph : item.lineBUph,
        };
      }
      return {
        month: item.month,
        lineA: item.lineAUph,
        lineB: item.lineBUph,
      };
    });
  }, [monthlyEfficiency, lines, days, activePeriodKey]);

  // Dynamically compute full monthly efficiency with live values from Daily Table
  const dynamicMonthlyEfficiency = useMemo(() => {
    const lineA = lines.find(l => l.prodLine.toLowerCase().includes('a')) || lines[0];
    const lineB = lines.find(l => l.prodLine.toLowerCase().includes('b')) || lines[1];

    let liveLineAPlan = 0;
    let liveLineAAct = 0;
    let liveLineAWorkHours = 0;
    let liveLineBPlan = 0;
    let liveLineBAct = 0;
    let liveLineBWorkHours = 0;

    if (lineA) {
      days.forEach(d => {
        const p = lineA.planning[d.day];
        const a = lineA.act[d.day];
        const wt = lineA.workTime[d.day];
        if (p !== null && p !== undefined) liveLineAPlan += Number(p);
        if (a !== null && a !== undefined) liveLineAAct += Number(a);
        if (wt !== null && wt !== undefined) liveLineAWorkHours += Number(wt);
      });
    }

    if (lineB) {
      days.forEach(d => {
        const p = lineB.planning[d.day];
        const a = lineB.act[d.day];
        const wt = lineB.workTime[d.day];
        if (p !== null && p !== undefined) liveLineBPlan += Number(p);
        if (a !== null && a !== undefined) liveLineBAct += Number(a);
        if (wt !== null && wt !== undefined) liveLineBWorkHours += Number(wt);
      });
    }

    const liveLineAUph = liveLineAWorkHours > 0 ? Math.round(liveLineAAct / liveLineAWorkHours) : 0;
    const liveLineBUph = liveLineBWorkHours > 0 ? Math.round(liveLineBAct / liveLineBWorkHours) : 0;

    return monthlyEfficiency.map(item => {
      if (item.month === activePeriodKey && !item.manualOverride) {
        const lineAPlan = liveLineAPlan > 0 ? liveLineAPlan : item.lineAPlan;
        const lineAAct = liveLineAAct > 0 ? liveLineAAct : item.lineAAct;
        const lineAUph = liveLineAUph > 0 ? liveLineAUph : item.lineAUph;
        const lineAWorkHours = liveLineAWorkHours > 0 ? liveLineAWorkHours : item.lineAWorkHours;

        const lineBPlan = liveLineBPlan > 0 ? liveLineBPlan : item.lineBPlan;
        const lineBAct = liveLineBAct > 0 ? liveLineBAct : item.lineBAct;
        const lineBUph = liveLineBUph > 0 ? liveLineBUph : item.lineBUph;
        const lineBWorkHours = liveLineBWorkHours > 0 ? liveLineBWorkHours : item.lineBWorkHours;

        return {
          ...item,
          lineAPlan,
          lineAAct,
          lineAUph,
          lineAWorkHours,
          lineBPlan,
          lineBAct,
          lineBUph,
          lineBWorkHours,
        };
      }
      return item;
    });
  }, [monthlyEfficiency, lines, days, activePeriodKey]);

  const [actionItems, setActionItems] = useState<ActionItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIONS);
      return saved ? JSON.parse(saved) : INITIAL_ACTION_ITEMS;
    } catch {
      return INITIAL_ACTION_ITEMS;
    }
  });

  const [isEditMode, setIsEditMode] = useState<boolean>(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [showPresentationModal, setShowPresentationModal] = useState<boolean>(false);
  const [showAddLineModal, setShowAddLineModal] = useState<boolean>(false);
  const [showPublishModal, setShowPublishModal] = useState<boolean>(false);
  const [showGoogleDriveModal, setShowGoogleDriveModal] = useState<boolean>(false);
  const [showDatePeriodModal, setShowDatePeriodModal] = useState<boolean>(false);
  const [showWebSaveModal, setShowWebSaveModal] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Cloud Firestore Online Sync States
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(new Date());
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  // Helper to persist to cloud
  const syncToCloud = async (override?: Partial<CloudDashboardPayload>) => {
    setIsSyncing(true);
    try {
      await saveOecDashboardOnline({
        lines: override?.lines ?? lines,
        days: override?.days ?? days,
        monthlyEfficiency: override?.monthlyEfficiency ?? monthlyEfficiency,
        actionItems: override?.actionItems ?? actionItems,
        periodData: override?.periodData ?? periodData,
        webSnapshots: override?.webSnapshots ?? webSnapshots,
        extraSheets: override?.extraSheets ?? extraSheets,
        upphSheet: override?.upphSheet ?? upphSheet,
        lineIdleSheet: override?.lineIdleSheet ?? lineIdleSheet,
        summaryPerformance: override?.summaryPerformance ?? summaryPerformance,
      });
      setLastSyncTime(new Date());
      setIsOnline(true);
    } catch (e) {
      console.warn('Could not save to cloud:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const debouncedCloudSave = (
    currentLines: LineOECData[],
    currentDays: DayColumn[],
    currentEff: MonthlyEfficiencyRow[],
    currentActions: ActionItem[],
    currentPeriods?: PeriodStorageState,
    currentUpphSheet?: UpphSheetData,
    currentSummaryPerf?: SummaryPerformanceRow[]
  ) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setIsSyncing(true);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveOecDashboardOnline({
          lines: currentLines,
          days: currentDays,
          monthlyEfficiency: currentEff,
          actionItems: currentActions,
          periodData: currentPeriods ?? periodData,
          webSnapshots,
          extraSheets,
          upphSheet: currentUpphSheet ?? upphSheet,
          lineIdleSheet,
          summaryPerformance: currentSummaryPerf ?? summaryPerformance,
        });
        setLastSyncTime(new Date());
        setIsOnline(true);
      } catch (e) {
        console.warn('Auto-save error:', e);
      } finally {
        setIsSyncing(false);
      }
    }, 600);
  };

  // Firestore connection test & initial real-time cloud subscription
  useEffect(() => {
    testFirestoreConnection().then(connected => {
      setIsOnline(connected);
    });

    try {
      localStorage.setItem(STORAGE_KEY_OCT_SEEDED, '1');
      localStorage.setItem(STORAGE_KEY_NOV_SEEDED, '1');
      localStorage.setItem(STORAGE_KEY_SEP_SEEDED, '1');
      localStorage.setItem(STORAGE_KEY_AUG_SEEDED, '1');
      localStorage.setItem(STORAGE_KEY_JUL_SEEDED, '1');
      localStorage.setItem(STORAGE_KEY_JUN_SEEDED, '1');
      localStorage.setItem(STORAGE_KEY_MAY_SEEDED, '1');
      localStorage.setItem(STORAGE_KEY_APR_SEEDED, '1');
      localStorage.setItem(STORAGE_KEY_MAR_SEEDED, '1');
      localStorage.setItem(STORAGE_KEY_FEB_SEEDED, '1');
      localStorage.setItem(STORAGE_KEY_JAN_SEEDED, '1');
    } catch {
      // ignore
    }

    // Seed initial data to cloud if new, or inject/upgrade Jan..Nov 2026 periods if cloud doc predates them
    initOrSeedCloudData({
      lines,
      days,
      monthlyEfficiency,
      actionItems,
      periodData,
      webSnapshots,
      extraSheets,
      upphSheet,
      lineIdleSheet,
      summaryPerformance,
    }).then(cloudData => {
      if (cloudData) {
        const cloudHasFullJan = hasFullJanuaryData(cloudData.periodData?.['2026-01']);
        const cloudHasFullFeb = hasFullFebruaryData(cloudData.periodData?.['2026-02']);
        const cloudHasFullMar = hasFullMarchData(cloudData.periodData?.['2026-03']);
        const cloudHasFullApr = hasFullAprilData(cloudData.periodData?.['2026-04']);
        const cloudHasFullMay = hasFullMayData(cloudData.periodData?.['2026-05']);
        const cloudHasFullJun = hasFullJuneData(cloudData.periodData?.['2026-06']);
        const cloudHasFullJul = hasFullJulyData(cloudData.periodData?.['2026-07']);
        const cloudHasFullAug = hasFullAugustData(cloudData.periodData?.['2026-08']);
        const cloudHasFullSep = hasFullSeptemberData(cloudData.periodData?.['2026-09']);
        const cloudHasOct = hasPeriodActualData(cloudData.periodData?.['2026-10']);
        const cloudHasNov = hasFullNovemberData(cloudData.periodData?.['2026-11']);
        const cloudHasStaleUpph =
          isStaleUpphSheet(cloudData.upphSheet) || isStaleSummaryUpph(cloudData.summaryPerformance);

        if (!cloudHasFullJan || !cloudHasFullFeb || !cloudHasFullMar || !cloudHasFullApr || !cloudHasFullMay || !cloudHasFullJun || !cloudHasFullJul || !cloudHasFullAug || !cloudHasFullSep || !cloudHasOct || !cloudHasNov || cloudHasStaleUpph) {
          const mergedPeriodData: PeriodStorageState = {
            ...(cloudData.periodData || {}),
            '2026-01': cloudHasFullJan
              ? cloudData.periodData!['2026-01']
              : INITIAL_PERIOD_DATA['2026-01'],
            '2026-02': cloudHasFullFeb
              ? cloudData.periodData!['2026-02']
              : INITIAL_PERIOD_DATA['2026-02'],
            '2026-03': cloudHasFullMar
              ? cloudData.periodData!['2026-03']
              : INITIAL_PERIOD_DATA['2026-03'],
            '2026-04': cloudHasFullApr
              ? cloudData.periodData!['2026-04']
              : INITIAL_PERIOD_DATA['2026-04'],
            '2026-05': cloudHasFullMay
              ? cloudData.periodData!['2026-05']
              : INITIAL_PERIOD_DATA['2026-05'],
            '2026-06': cloudHasFullJun
              ? cloudData.periodData!['2026-06']
              : INITIAL_PERIOD_DATA['2026-06'],
            '2026-07': cloudHasFullJul
              ? cloudData.periodData!['2026-07']
              : INITIAL_PERIOD_DATA['2026-07'],
            '2026-08': cloudHasFullAug
              ? cloudData.periodData!['2026-08']
              : INITIAL_PERIOD_DATA['2026-08'],
            '2026-09': cloudHasFullSep
              ? cloudData.periodData!['2026-09']
              : INITIAL_PERIOD_DATA['2026-09'],
            '2026-10': cloudHasOct
              ? cloudData.periodData!['2026-10']
              : INITIAL_PERIOD_DATA['2026-10'],
            '2026-11': cloudHasNov
              ? cloudData.periodData!['2026-11']
              : INITIAL_PERIOD_DATA['2026-11'],
          };

          const baseEff = cloudData.monthlyEfficiency?.length
            ? cloudData.monthlyEfficiency
            : INITIAL_MONTHLY_EFFICIENCY;
          const effMap = new Map<string, MonthlyEfficiencyRow>();
          baseEff.forEach(r => effMap.set(r.month, r));
          ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'].forEach(mKey => {
            const initRow = INITIAL_MONTHLY_EFFICIENCY.find(r => r.month === mKey);
            if (
              initRow &&
              ((mKey === '2026-01' && !cloudHasFullJan) ||
                (mKey === '2026-02' && !cloudHasFullFeb) ||
                (mKey === '2026-03' && !cloudHasFullMar) ||
                (mKey === '2026-04' && !cloudHasFullApr) ||
                (mKey === '2026-05' && !cloudHasFullMay) ||
                (mKey === '2026-06' && !cloudHasFullJun) ||
                (mKey === '2026-07' && !cloudHasFullJul) ||
                (mKey === '2026-08' && !cloudHasFullAug) ||
                (mKey === '2026-09' && !cloudHasFullSep) ||
                (mKey === '2026-10' && !cloudHasOct) ||
                (mKey === '2026-11' && !cloudHasNov) ||
                !effMap.has(mKey))
            ) {
              effMap.set(mKey, initRow);
            }
          });
          const mergedEff = Array.from(effMap.values()).sort((a, b) =>
            a.month.localeCompare(b.month)
          );

          const baseSummary = cloudData.summaryPerformance?.length
            ? cloudData.summaryPerformance
            : INITIAL_SUMMARY_PERFORMANCE_DATA;
          let mergedSummary = [...baseSummary];
          const initJanSummary = INITIAL_SUMMARY_PERFORMANCE_DATA.find(r => r.period === '2026-01');
          if (initJanSummary) {
            mergedSummary = mergedSummary.some(r => r.period === '2026-01')
              ? mergedSummary.map(r =>
                  r.period === '2026-01' && r.totalPlan === 55000 && r.totalAct === 48487
                    ? initJanSummary
                    : r
                )
              : [...mergedSummary, initJanSummary];
          }
          const initFebSummary = INITIAL_SUMMARY_PERFORMANCE_DATA.find(r => r.period === '2026-02');
          if (initFebSummary) {
            mergedSummary = mergedSummary.some(r => r.period === '2026-02')
              ? mergedSummary.map(r =>
                  r.period === '2026-02' && r.totalPlan === 64000 && r.totalAct === 57184
                    ? initFebSummary
                    : r
                )
              : [...mergedSummary, initFebSummary];
          }
          const initMarSummary = INITIAL_SUMMARY_PERFORMANCE_DATA.find(r => r.period === '2026-03');
          if (initMarSummary) {
            mergedSummary = mergedSummary.some(r => r.period === '2026-03')
              ? mergedSummary.map(r =>
                  r.period === '2026-03' && r.totalPlan === 68000 && r.totalAct === 64613
                    ? initMarSummary
                    : r
                )
              : [...mergedSummary, initMarSummary];
          }
          const initAprSummary = INITIAL_SUMMARY_PERFORMANCE_DATA.find(r => r.period === '2026-04');
          if (initAprSummary) {
            mergedSummary = mergedSummary.some(r => r.period === '2026-04')
              ? mergedSummary.map(r =>
                  r.period === '2026-04' && r.totalPlan === 53000 && r.totalAct === 50950
                    ? initAprSummary
                    : r
                )
              : [...mergedSummary, initAprSummary];
          }
          const initMaySummary = INITIAL_SUMMARY_PERFORMANCE_DATA.find(r => r.period === '2026-05');
          if (initMaySummary) {
            mergedSummary = mergedSummary.some(r => r.period === '2026-05')
              ? mergedSummary.map(r =>
                  r.period === '2026-05' && r.totalPlan === 73000 && r.totalAct === 69550
                    ? initMaySummary
                    : r
                )
              : [...mergedSummary, initMaySummary];
          }
          const initJunSummary = INITIAL_SUMMARY_PERFORMANCE_DATA.find(r => r.period === '2026-06');
          if (initJunSummary) {
            mergedSummary = mergedSummary.some(r => r.period === '2026-06')
              ? mergedSummary.map(r =>
                  r.period === '2026-06' && r.totalPlan === 84000 && r.totalAct === 81754
                    ? initJunSummary
                    : r
                )
              : [...mergedSummary, initJunSummary];
          }
          const initJulSummary = INITIAL_SUMMARY_PERFORMANCE_DATA.find(r => r.period === '2026-07');
          if (initJulSummary) {
            mergedSummary = mergedSummary.some(r => r.period === '2026-07')
              ? mergedSummary.map(r =>
                  r.period === '2026-07' && r.totalPlan === 54500 && r.totalAct === 55508
                    ? initJulSummary
                    : r
                )
              : [...mergedSummary, initJulSummary];
          }
          const initAugSummary = INITIAL_SUMMARY_PERFORMANCE_DATA.find(r => r.period === '2026-08');
          if (initAugSummary) {
            mergedSummary = mergedSummary.some(r => r.period === '2026-08')
              ? mergedSummary.map(r =>
                  r.period === '2026-08' && r.totalPlan === 94000 && r.totalAct === 90410
                    ? initAugSummary
                    : r
                )
              : [...mergedSummary, initAugSummary];
          }
          const initSepSummary = INITIAL_SUMMARY_PERFORMANCE_DATA.find(r => r.period === '2026-09');
          if (initSepSummary) {
            mergedSummary = mergedSummary.some(r => r.period === '2026-09')
              ? mergedSummary.map(r =>
                  r.period === '2026-09' && r.totalAct === 101779 ? initSepSummary : r
                )
              : [...mergedSummary, initSepSummary];
          }
          const initOctSummary = INITIAL_SUMMARY_PERFORMANCE_DATA.find(r => r.period === '2026-10');
          if (initOctSummary) {
            mergedSummary = mergedSummary.some(r => r.period === '2026-10')
              ? mergedSummary.map(r =>
                  r.period === '2026-10' && r.totalAct === 39850 ? initOctSummary : r
                )
              : [...mergedSummary, initOctSummary];
          }
          const initNovSummary = INITIAL_SUMMARY_PERFORMANCE_DATA.find(r => r.period === '2026-11');
          if (initNovSummary) {
            mergedSummary = mergedSummary.some(r => r.period === '2026-11')
              ? mergedSummary.map(r =>
                  r.period === '2026-11' &&
                  ((r.totalPlan === 71984 && (r.totalAct === 60920 || r.totalAct === 69649)) ||
                    (r.totalPlan === 83627 && r.totalAct === 81197))
                    ? initNovSummary
                    : r
                )
              : [...mergedSummary, initNovSummary];
          }

          const mergedExtraSheets =
            cloudData.extraSheets && cloudData.extraSheets.length > 0
              ? mergeExtraSheetsWithSepDefaults(cloudData.extraSheets)
              : extraSheets;
          const mergedUpphSheet =
            cloudData.upphSheet && cloudData.upphSheet.lines
              ? mergeUpphWithDefaults(cloudData.upphSheet, mergedPeriodData, mergedEff)
              : syncUpphSheetWithDailyOec(upphSheet, mergedPeriodData, mergedEff, upphSheet.activeMonth);
          mergedSummary = mergeSummaryWithUpphDefaults(
            mergedSummary,
            mergedPeriodData,
            mergedEff,
            mergedUpphSheet
          );

          const activeKey = activePeriodKeyRef.current;
          const activeEntry = mergedPeriodData[activeKey] || INITIAL_PERIOD_DATA['2026-01'];
          setLines(activeEntry.lines);
          setDays(activeEntry.days);
          setPeriodData(mergedPeriodData);
          setMonthlyEfficiency(mergedEff);
          setSummaryPerformance(mergedSummary);
          if (cloudData.actionItems && cloudData.actionItems.length > 0) {
            setActionItems(cloudData.actionItems);
          }
          if (cloudData.webSnapshots) setWebSnapshots(cloudData.webSnapshots);
          setExtraSheets(mergedExtraSheets);
          setUpphSheet(mergedUpphSheet);
          if (cloudData.lineIdleSheet && cloudData.lineIdleSheet.dailyRows) {
            setLineIdleSheet(cloudData.lineIdleSheet);
          }

          // Persist updated 2026-01 through 2026-11 seeded data to Cloud Firestore once
          saveOecDashboardOnline({
            lines: activeEntry.lines,
            days: activeEntry.days,
            periodData: mergedPeriodData,
            monthlyEfficiency: mergedEff,
            actionItems: cloudData.actionItems && cloudData.actionItems.length > 0 ? cloudData.actionItems : actionItems,
            webSnapshots: cloudData.webSnapshots ?? webSnapshots,
            extraSheets: mergedExtraSheets,
            upphSheet: mergedUpphSheet,
            lineIdleSheet: cloudData.lineIdleSheet && cloudData.lineIdleSheet.dailyRows ? cloudData.lineIdleSheet : lineIdleSheet,
            summaryPerformance: mergedSummary,
          }).catch(err => console.warn('January 2026 cloud migration skipped:', err));
          return;
        }

        const targetKey = activePeriodKeyRef.current;
        const cloudPeriodEntry = cloudData.periodData?.[targetKey];
        if (cloudPeriodEntry?.lines && cloudPeriodEntry.lines.length > 0) {
          setLines(cloudPeriodEntry.lines);
          if (cloudPeriodEntry.days && cloudPeriodEntry.days.length > 0) {
            setDays(cloudPeriodEntry.days);
          }
        } else {
          if (cloudData.lines && cloudData.lines.length > 0) setLines(cloudData.lines);
          if (cloudData.days && cloudData.days.length > 0) setDays(cloudData.days);
        }
        const cloudPeriods = cloudData.periodData || periodData;
        const cloudEff =
          cloudData.monthlyEfficiency && cloudData.monthlyEfficiency.length > 0
            ? mergeMonthlyWithRecentDefaults(cloudData.monthlyEfficiency)
            : monthlyEfficiency;
        if (cloudData.monthlyEfficiency && cloudData.monthlyEfficiency.length > 0) {
          setMonthlyEfficiency(cloudEff);
        }
        if (cloudData.actionItems && cloudData.actionItems.length > 0) setActionItems(cloudData.actionItems);
        if (cloudData.periodData) setPeriodData(cloudData.periodData);
        if (cloudData.webSnapshots) setWebSnapshots(cloudData.webSnapshots);
        if (cloudData.extraSheets && cloudData.extraSheets.length > 0) {
          setExtraSheets(mergeExtraSheetsWithSepDefaults(cloudData.extraSheets));
        }
        const mergedUpph =
          cloudData.upphSheet && cloudData.upphSheet.lines
            ? mergeUpphWithDefaults(cloudData.upphSheet, cloudPeriods, cloudEff)
            : upphSheet;
        if (cloudData.upphSheet && cloudData.upphSheet.lines) {
          setUpphSheet(mergedUpph);
        }
        if (cloudData.lineIdleSheet && cloudData.lineIdleSheet.dailyRows) setLineIdleSheet(cloudData.lineIdleSheet);
        if (cloudData.summaryPerformance && cloudData.summaryPerformance.length > 0) {
          setSummaryPerformance(
            mergeSummaryWithUpphDefaults(cloudData.summaryPerformance, cloudPeriods, cloudEff, mergedUpph)
          );
        }
      }
    });

    const unsubscribe = subscribeToOecDashboard(
      (cloudData) => {
        setIsOnline(true);
        setLastSyncTime(new Date());
        // Skip pre-migration snapshots that do not yet contain full 2026-01 through 2026-09 or full 2026-11
        if (
          !hasFullJanuaryData(cloudData.periodData?.['2026-01']) ||
          !hasFullFebruaryData(cloudData.periodData?.['2026-02']) ||
          !hasFullMarchData(cloudData.periodData?.['2026-03']) ||
          !hasFullAprilData(cloudData.periodData?.['2026-04']) ||
          !hasFullMayData(cloudData.periodData?.['2026-05']) ||
          !hasFullJuneData(cloudData.periodData?.['2026-06']) ||
          !hasFullJulyData(cloudData.periodData?.['2026-07']) ||
          !hasFullAugustData(cloudData.periodData?.['2026-08']) ||
          !hasFullSeptemberData(cloudData.periodData?.['2026-09']) ||
          !hasFullNovemberData(cloudData.periodData?.['2026-11']) ||
          isStaleUpphSheet(cloudData.upphSheet)
        ) {
          return;
        }
        const targetKey = activePeriodKeyRef.current;
        const cloudPeriodEntry = cloudData.periodData?.[targetKey];
        if (cloudPeriodEntry?.lines && cloudPeriodEntry.lines.length > 0) {
          setLines(cloudPeriodEntry.lines);
          if (cloudPeriodEntry.days && cloudPeriodEntry.days.length > 0) {
            setDays(cloudPeriodEntry.days);
          }
        } else {
          if (cloudData.lines && cloudData.lines.length > 0) {
            setLines(cloudData.lines);
          }
          if (cloudData.days && cloudData.days.length > 0) {
            setDays(cloudData.days);
          }
        }
        const nextCloudPeriods = cloudData.periodData || periodData;
        const nextCloudEff =
          cloudData.monthlyEfficiency && cloudData.monthlyEfficiency.length > 0
            ? mergeMonthlyWithRecentDefaults(cloudData.monthlyEfficiency)
            : monthlyEfficiency;
        if (cloudData.monthlyEfficiency && cloudData.monthlyEfficiency.length > 0) {
          setMonthlyEfficiency(nextCloudEff);
        }
        if (cloudData.actionItems) {
          setActionItems(cloudData.actionItems);
        }
        if (cloudData.periodData) {
          setPeriodData(cloudData.periodData);
        }
        if (cloudData.webSnapshots) {
          setWebSnapshots(cloudData.webSnapshots);
        }
        if (cloudData.extraSheets && cloudData.extraSheets.length > 0) {
          setExtraSheets(mergeExtraSheetsWithSepDefaults(cloudData.extraSheets));
        }
        const nextCloudUpph =
          cloudData.upphSheet && cloudData.upphSheet.lines
            ? mergeUpphWithDefaults(cloudData.upphSheet, nextCloudPeriods, nextCloudEff)
            : upphSheet;
        if (cloudData.upphSheet && cloudData.upphSheet.lines) {
          setUpphSheet(nextCloudUpph);
        }
        if (cloudData.lineIdleSheet && cloudData.lineIdleSheet.dailyRows) {
          setLineIdleSheet(cloudData.lineIdleSheet);
        }
        if (cloudData.summaryPerformance && cloudData.summaryPerformance.length > 0) {
          setSummaryPerformance(
            mergeSummaryWithUpphDefaults(
              cloudData.summaryPerformance,
              nextCloudPeriods,
              nextCloudEff,
              nextCloudUpph
            )
          );
        }
      },
      (err) => {
        console.warn('Real-time sync notice:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TAB, activeTab);
    } catch (e) {
      console.error('Error saving tab:', e);
    }
  }, [activeTab]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_EFFICIENCY, JSON.stringify(monthlyEfficiency));
    } catch (e) {
      console.error('Error saving monthly efficiency:', e);
    }
  }, [monthlyEfficiency]);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LINES, JSON.stringify(lines));
    } catch (e) {
      console.error('Error saving lines:', e);
    }
  }, [lines]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DAYS, JSON.stringify(days));
    } catch (e) {
      console.error('Error saving days:', e);
    }
  }, [days]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIONS, JSON.stringify(actionItems));
    } catch (e) {
      console.error('Error saving actions:', e);
    }
  }, [actionItems]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PERIODS, JSON.stringify(periodData));
    } catch (e) {
      console.error('Error saving periodData:', e);
    }
  }, [periodData]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SNAPSHOTS, JSON.stringify(webSnapshots));
    } catch (e) {
      console.error('Error saving webSnapshots:', e);
    }
  }, [webSnapshots]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_EXTRA_SHEETS, JSON.stringify(extraSheets));
    } catch (e) {
      console.error('Error saving extraSheets:', e);
    }
  }, [extraSheets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_UPPH_SHEET, JSON.stringify(upphSheet));
    } catch (e) {
      console.error('Error saving upphSheet:', e);
    }
  }, [upphSheet]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LINE_IDLE, JSON.stringify(lineIdleSheet));
    } catch (e) {
      console.error('Error saving lineIdleSheet:', e);
    }
  }, [lineIdleSheet]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SUMMARY_PERF, JSON.stringify(summaryPerformance));
    } catch (e) {
      console.error('Error saving summaryPerformance:', e);
    }
  }, [summaryPerformance]);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Switch period (Year / Month) and load or initialize that period's data on the Web
  const handleFilterChange = (newFilters: OECFilterState) => {
    const oldPeriodKey = filters.month === 'All' ? `${filters.year}-01` : filters.month;
    const newPeriodKey = newFilters.month === 'All' ? `${newFilters.year}-01` : newFilters.month;

    // Save current lines & days into periodData before switching
    const updatedPeriodData: PeriodStorageState = {
      ...periodData,
      [oldPeriodKey]: {
        lines,
        days,
        updatedAt: new Date().toISOString(),
      },
    };

    if (newPeriodKey !== oldPeriodKey) {
      if (updatedPeriodData[newPeriodKey]) {
        setLines(updatedPeriodData[newPeriodKey].lines);
        setDays(updatedPeriodData[newPeriodKey].days);
      } else if (newPeriodKey === '2026-11') {
        setLines(INITIAL_NOV_2026_LINES);
        setDays(INITIAL_NOV_2026_DAYS);
        updatedPeriodData[newPeriodKey] = INITIAL_PERIOD_DATA['2026-11'];
      } else if (newPeriodKey === '2026-10') {
        setLines(INITIAL_OCT_2026_LINES);
        setDays(INITIAL_OCT_2026_DAYS);
        updatedPeriodData[newPeriodKey] = INITIAL_PERIOD_DATA['2026-10'];
      } else if (newPeriodKey === '2026-09') {
        setLines(INITIAL_LINE_DATA);
        setDays(INITIAL_DAYS);
        updatedPeriodData[newPeriodKey] = INITIAL_PERIOD_DATA['2026-09'];
      } else if (newPeriodKey === '2026-08') {
        setLines(INITIAL_AUG_2026_LINES);
        setDays(INITIAL_AUG_2026_DAYS);
        updatedPeriodData[newPeriodKey] = INITIAL_PERIOD_DATA['2026-08'];
      } else if (newPeriodKey === '2026-07') {
        setLines(INITIAL_JUL_2026_LINES);
        setDays(INITIAL_JUL_2026_DAYS);
        updatedPeriodData[newPeriodKey] = INITIAL_PERIOD_DATA['2026-07'];
      } else if (newPeriodKey === '2026-06') {
        setLines(INITIAL_JUN_2026_LINES);
        setDays(INITIAL_JUN_2026_DAYS);
        updatedPeriodData[newPeriodKey] = INITIAL_PERIOD_DATA['2026-06'];
      } else if (newPeriodKey === '2026-05') {
        setLines(INITIAL_MAY_2026_LINES);
        setDays(INITIAL_MAY_2026_DAYS);
        updatedPeriodData[newPeriodKey] = INITIAL_PERIOD_DATA['2026-05'];
      } else if (newPeriodKey === '2026-04') {
        setLines(INITIAL_APR_2026_LINES);
        setDays(INITIAL_APR_2026_DAYS);
        updatedPeriodData[newPeriodKey] = INITIAL_PERIOD_DATA['2026-04'];
      } else if (newPeriodKey === '2026-03') {
        setLines(INITIAL_MAR_2026_LINES);
        setDays(INITIAL_MAR_2026_DAYS);
        updatedPeriodData[newPeriodKey] = INITIAL_PERIOD_DATA['2026-03'];
      } else if (newPeriodKey === '2026-02') {
        setLines(INITIAL_FEB_2026_LINES);
        setDays(INITIAL_FEB_2026_DAYS);
        updatedPeriodData[newPeriodKey] = INITIAL_PERIOD_DATA['2026-02'];
      } else if (newPeriodKey === '2026-01') {
        setLines(INITIAL_JAN_2026_LINES);
        setDays(INITIAL_JAN_2026_DAYS);
        updatedPeriodData[newPeriodKey] = INITIAL_PERIOD_DATA['2026-01'];
      } else {
        // Initialize clean lines and full calendar days for the newly selected Year-Month
        const [yStr, mStr] = newPeriodKey.split('-');
        const yNum = parseInt(yStr || String(newFilters.year), 10);
        const mNum = parseInt(mStr || '9', 10);
        const generatedDays = generateMonthDayColumns(yNum, mNum);
        const templateLines: LineOECData[] = lines.map(l => ({
          id: l.id,
          plant: l.plant,
          prodLine: l.prodLine,
          planning: {},
          act: {},
          workTime: {},
        }));
        setLines(templateLines);
        setDays(generatedDays);
        updatedPeriodData[newPeriodKey] = {
          lines: templateLines,
          days: generatedDays,
          updatedAt: new Date().toISOString(),
        };
      }
      setPeriodData(updatedPeriodData);
      showToast(
        t(
          `สลับไปยังข้อมูลช่วงเวลา ${formatPeriodLabel(newFilters.year, newPeriodKey, language)}`,
          `Switched period to ${formatPeriodLabel(newFilters.year, newPeriodKey, language)}`,
          `已切换至周期: ${formatPeriodLabel(newFilters.year, newPeriodKey, language)}`
        )
      );
    }

    setFilters(newFilters);
  };

  // Explicit "Save on Web" function (saves active period, updates monthly summary, creates snapshot, syncs to Cloud & LocalStorage)
  const handleSaveOnWebNow = async (customTitle?: string) => {
    const nowIso = new Date().toISOString();

    // 1. Update periodData for activePeriodKey
    const nextPeriodData: PeriodStorageState = {
      ...periodData,
      [activePeriodKey]: {
        lines,
        days,
        updatedAt: nowIso,
        note: customTitle,
      },
    };
    setPeriodData(nextPeriodData);

    // 2. Compute Line A and Line B totals to sync into monthlyEfficiency
    const lineA = lines.find(l => l.prodLine.toLowerCase().includes('a')) || lines[0];
    const lineB = lines.find(l => l.prodLine.toLowerCase().includes('b')) || lines[1];

    let aPlan = 0, aAct = 0, aHours = 0;
    let bPlan = 0, bAct = 0, bHours = 0;

    if (lineA) {
      days.forEach(d => {
        if (lineA.planning[d.day] != null) aPlan += Number(lineA.planning[d.day]);
        if (lineA.act[d.day] != null) aAct += Number(lineA.act[d.day]);
        if (lineA.workTime[d.day] != null) aHours += Number(lineA.workTime[d.day]);
      });
    }
    if (lineB) {
      days.forEach(d => {
        if (lineB.planning[d.day] != null) bPlan += Number(lineB.planning[d.day]);
        if (lineB.act[d.day] != null) bAct += Number(lineB.act[d.day]);
        if (lineB.workTime[d.day] != null) bHours += Number(lineB.workTime[d.day]);
      });
    }

    const aUph = aHours > 0 ? Math.round(aAct / aHours) : 0;
    const bUph = bHours > 0 ? Math.round(bAct / bHours) : 0;

    let nextMonthlyEfficiency = [...monthlyEfficiency];
    const existingMonthIdx = nextMonthlyEfficiency.findIndex(m => m.month === activePeriodKey);
    if (existingMonthIdx >= 0) {
      const existing = nextMonthlyEfficiency[existingMonthIdx];
      nextMonthlyEfficiency[existingMonthIdx] = {
        ...existing,
        lineAPlan: aPlan > 0 ? aPlan : existing.lineAPlan,
        lineAAct: aAct > 0 ? aAct : existing.lineAAct,
        lineAUph: aUph > 0 ? aUph : existing.lineAUph,
        lineAWorkHours: aHours > 0 ? aHours : existing.lineAWorkHours,
        lineBPlan: bPlan > 0 ? bPlan : existing.lineBPlan,
        lineBAct: bAct > 0 ? bAct : existing.lineBAct,
        lineBUph: bUph > 0 ? bUph : existing.lineBUph,
        lineBWorkHours: bHours > 0 ? bHours : existing.lineBWorkHours,
      };
    } else {
      const [yPart, mPart] = activePeriodKey.split('-');
      const mObj = THAI_MONTHS.find(m => m.value === mPart);
      nextMonthlyEfficiency.push({
        month: activePeriodKey,
        monthNameTh: `${mObj ? mObj.label.split(' ')[0] : mPart} ${yPart}`,
        lineAPlan: aPlan,
        lineAAct: aAct,
        lineAUph: aUph,
        lineATargetUph: 120,
        lineAWorkHours: aHours,
        lineBPlan: bPlan,
        lineBAct: bAct,
        lineBUph: bUph,
        lineBTargetUph: 112,
        lineBWorkHours: bHours,
        notes: customTitle || 'บันทึกจากตารางรายวันบน Web',
      });
      nextMonthlyEfficiency.sort((x, y) => x.month.localeCompare(y.month));
    }
    setMonthlyEfficiency(nextMonthlyEfficiency);

    // 3. Create a WebSavedSnapshot entry
    const totalPlan = aPlan + bPlan;
    const totalAct = aAct + bAct;
    const totalHours = aHours + bHours;
    const overallUph = totalHours > 0 ? Math.round(totalAct / totalHours) : 0;

    const nextUpphSheet = syncUpphSheetWithDailyOec(
      upphSheet,
      nextPeriodData,
      nextMonthlyEfficiency,
      upphSheet.activeMonth
    );
    setUpphSheet(nextUpphSheet);

    const nextSummaryPerf = syncSummaryPerformanceWithOecAndUpph(
      summaryPerformance,
      nextPeriodData,
      nextMonthlyEfficiency,
      nextUpphSheet
    );
    setSummaryPerformance(nextSummaryPerf);

    const newSnapshot: WebSavedSnapshot = {
      id: `snap_${Date.now()}`,
      title:
        customTitle ||
        t(
          `บันทึกข้อมูลบน Web (${formatPeriodLabel(filters.year, activePeriodKey, language)})`,
          `Saved on Web (${formatPeriodLabel(filters.year, activePeriodKey, language)})`,
          `网页保存记录 (${formatPeriodLabel(filters.year, activePeriodKey, language)})`
        ),
      savedAt: nowIso,
      year: filters.year,
      month: activePeriodKey,
      plant: filters.plant === 'ทั้งหมด' ? 'HTC Ref(泰国冰箱)' : filters.plant,
      totalPlan,
      totalAct,
      overallUph,
      lines,
      days,
      monthlyEfficiency: nextMonthlyEfficiency,
      actionItems,
      extraSheets,
      upphSheet: nextUpphSheet,
      lineIdleSheet,
      summaryPerformance: nextSummaryPerf,
    };

    const nextSnapshots = [newSnapshot, ...webSnapshots].slice(0, 15);
    setWebSnapshots(nextSnapshots);
    setHasUnsavedChanges(false);

    // 4. Persist to Cloud Firestore & LocalStorage
    await syncToCloud({
      lines,
      days,
      monthlyEfficiency: nextMonthlyEfficiency,
      actionItems,
      periodData: nextPeriodData,
      webSnapshots: nextSnapshots,
      extraSheets,
      upphSheet: nextUpphSheet,
      lineIdleSheet,
      summaryPerformance: nextSummaryPerf,
    });

    showToast(
      t(
        `บันทึกข้อมูลบน Web สำเร็จ! (${formatPeriodLabel(filters.year, activePeriodKey, language)})`,
        `Saved on Web! (${formatPeriodLabel(filters.year, activePeriodKey, language)})`,
        `网页数据保存成功！(${formatPeriodLabel(filters.year, activePeriodKey, language)})`
      )
    );
  };

  // Global keyboard shortcut Ctrl+S / Cmd+S to Save on Web
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveOnWebNow();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Available unique plants and lines
  const availablePlants = useMemo(() => {
    const set = new Set<string>();
    lines.forEach(l => set.add(l.plant));
    return Array.from(set);
  }, [lines]);

  const availableLines = useMemo(() => {
    const set = new Set<string>();
    lines.forEach(l => set.add(l.prodLine));
    return Array.from(set);
  }, [lines]);

  // Filtered lines for display
  const filteredLines = useMemo(() => {
    return lines.filter(l => {
      const matchPlant = filters.plant === 'ทั้งหมด' || l.plant === filters.plant;
      const matchLine = filters.prodLine === 'All' || l.prodLine === filters.prodLine;
      return matchPlant && matchLine;
    });
  }, [lines, filters]);

  // Calculate totals from filtered lines
  const totals = useMemo(() => {
    let plan = 0;
    let act = 0;
    let workHours = 0;

    filteredLines.forEach(line => {
      days.forEach(d => {
        const p = line.planning[d.day];
        const a = line.act[d.day];
        const wt = line.workTime[d.day];

        if (p !== null && p !== undefined) plan += Number(p);
        if (a !== null && a !== undefined) act += Number(a);
        if (wt !== null && wt !== undefined) workHours += Number(wt);
      });
    });

    // If initial dataset has empty days or screenshot showed total planning = 109207 and act = 101779:
    // In our initial data:
    // Line A plan sum: 8971+2290+3180+12763+12900+825+1821+6952+285+5009+1727+1514+5878+804 = 64919
    // Line B plan sum: 7540+3472+2479+7784+794+3261+1157+2536+4417+688+2509+1218+1538+4814+80+1 = 44288
    // Total planning = 64919 + 44288 = 109207! EXACT MATCH WITH SCREENSHOT!
    // Line A act sum = 54728
    // Line B act sum = 47051
    // Total act = 54728 + 47051 = 101779! EXACT MATCH WITH SCREENSHOT!
    // Gap = 101779 - 109207 = -7428! EXACT MATCH WITH SCREENSHOT!
    // Total workHours = Line A (481 hrs) + Line B (436 hrs) = 917 hrs
    // Overall UPH = 101779 / 917 = 111! EXACT MATCH WITH SCREENSHOT!

    const gap = act - plan;
    const uph = workHours > 0 ? Math.round(act / workHours) : 0;
    const rate = plan > 0 ? (act / plan) * 100 : 0;

    return {
      planning: plan,
      actual: act,
      gap,
      uph,
      achievementRate: rate,
      totalWorkHours: workHours,
    };
  }, [filteredLines, days]);

  // Handle cell edit in matrix table
  const handleUpdateCellValue = (
    lineId: string,
    category: 'planning' | 'act' | 'workTime',
    day: number,
    value: number | null
  ) => {
    const updatedLines = lines.map(l => {
      if (l.id !== lineId) return l;
      return {
        ...l,
        [category]: {
          ...l[category],
          [day]: value,
        },
      };
    });
    setLines(updatedLines);
    setHasUnsavedChanges(true);

    const nextPeriodData: PeriodStorageState = {
      ...periodData,
      [activePeriodKey]: {
        lines: updatedLines,
        days,
        updatedAt: new Date().toISOString(),
      },
    };
    setPeriodData(nextPeriodData);

    const nextUpph = syncUpphSheetWithDailyOec(
      upphSheet,
      nextPeriodData,
      monthlyEfficiency,
      upphSheet.activeMonth
    );
    setUpphSheet(nextUpph);

    const nextSummary = syncSummaryPerformanceWithOecAndUpph(
      summaryPerformance,
      nextPeriodData,
      monthlyEfficiency,
      nextUpph
    );
    setSummaryPerformance(nextSummary);

    debouncedCloudSave(
      updatedLines,
      days,
      monthlyEfficiency,
      actionItems,
      nextPeriodData,
      nextUpph,
      nextSummary
    );
  };

  // Add a new day column
  const handleAddDay = (day: number, weekday: string) => {
    if (days.some(d => d.day === day)) {
      showToast(
        t(`วันที่ ${day} มีอยู่ในตารางแล้ว`, `Day ${day} already exists`, `日期 ${day} 已存在`),
        'info'
      );
      return;
    }
    const updatedDays = [...days, { day, weekday }].sort((a, b) => a.day - b.day);
    setDays(updatedDays);
    setHasUnsavedChanges(true);
    const nextPeriodData: PeriodStorageState = {
      ...periodData,
      [activePeriodKey]: {
        lines,
        days: updatedDays,
        updatedAt: new Date().toISOString(),
      },
    };
    setPeriodData(nextPeriodData);

    const nextUpph = syncUpphSheetWithDailyOec(
      upphSheet,
      nextPeriodData,
      monthlyEfficiency,
      upphSheet.activeMonth
    );
    setUpphSheet(nextUpph);

    syncToCloud({ days: updatedDays, periodData: nextPeriodData, upphSheet: nextUpph });
    showToast(
      t(
        `เพิ่มคอลัมน์ วันที่ ${day} (${weekday}) เรียบร้อยแล้ว`,
        `Added day column ${day} (${weekday})`,
        `已添加日期列 ${day} (${weekday})`
      )
    );
  };

  // Delete a line
  const handleDeleteLine = (lineId: string) => {
    if (
      confirm(
        t(
          'คุณแน่ใจหรือไม่ว่าต้องการลบสายการผลิตนี้?',
          'Are you sure you want to delete this production line?',
          '确认删除该产线数据吗？'
        )
      )
    ) {
      const updatedLines = lines.filter(l => l.id !== lineId);
      setLines(updatedLines);
      setHasUnsavedChanges(true);
      syncToCloud({ lines: updatedLines });
      showToast(t('ลบสายการผลิตเรียบร้อย', 'Production line deleted', '产线已删除'));
    }
  };

  // Add line
  const handleAddLine = (newLine: LineOECData) => {
    const updatedLines = [...lines, newLine];
    setLines(updatedLines);
    setHasUnsavedChanges(true);
    syncToCloud({ lines: updatedLines });
    showToast(
      t(
        `เพิ่มสายการผลิต "${newLine.prodLine}" สำเร็จ`,
        `Added production line "${newLine.prodLine}"`,
        `已成功新增产线 "${newLine.prodLine}"`
      )
    );
  };

  // Handle file import
  const handleImportSuccess = (importedLines: LineOECData[], importedDays: DayColumn[]) => {
    setLines(importedLines);
    const newDays = importedDays && importedDays.length > 0 ? importedDays : days;
    if (importedDays && importedDays.length > 0) {
      setDays(importedDays);
    }
    const nextPeriodData: PeriodStorageState = {
      ...periodData,
      [activePeriodKey]: {
        lines: importedLines,
        days: newDays,
        updatedAt: new Date().toISOString(),
      },
    };
    setPeriodData(nextPeriodData);

    const nextUpph = syncUpphSheetWithDailyOec(
      upphSheet,
      nextPeriodData,
      monthlyEfficiency,
      upphSheet.activeMonth
    );
    setUpphSheet(nextUpph);

    const nextSummary = syncSummaryPerformanceWithOecAndUpph(
      summaryPerformance,
      nextPeriodData,
      monthlyEfficiency,
      nextUpph
    );
    setSummaryPerformance(nextSummary);

    syncToCloud({
      lines: importedLines,
      days: newDays,
      periodData: nextPeriodData,
      upphSheet: nextUpph,
      summaryPerformance: nextSummary,
    });
    showToast(
      t(
        'นำเข้าและบันทึกข้อมูล OEC บนเว็บสำเร็จเรียบร้อยแล้ว!',
        'Imported and saved OEC data to Web successfully!',
        'OEC 数据导入并保存成功！'
      )
    );
  };

  // Reset to initial data from screenshot
  const handleResetData = () => {
    if (
      confirm(
        t(
          'ยืนยันที่จะรีเซ็ตข้อมูลทั้งหมดกลับเป็นค่ามาตรฐานจากรูป?',
          'Reset all datasets back to default baseline?',
          '确认将所有数据重置为初始基准数据吗？'
        )
      )
    ) {
      setLines(INITIAL_JAN_2026_LINES);
      setDays(INITIAL_JAN_2026_DAYS);
      setPeriodData(INITIAL_PERIOD_DATA);
      setMonthlyEfficiency(INITIAL_MONTHLY_EFFICIENCY);
      setActionItems(INITIAL_ACTION_ITEMS);
      setExtraSheets(INITIAL_EXTRA_SHEETS);
      setUpphSheet(INITIAL_UPPH_SHEET_DATA);
      setLineIdleSheet(INITIAL_LINE_IDLE_SHEET_DATA);
      setSummaryPerformance(INITIAL_SUMMARY_PERFORMANCE_DATA);
      setFilters(prev => ({ ...prev, year: 2026, month: '2026-01' }));
      setHasUnsavedChanges(false);
      localStorage.removeItem(STORAGE_KEY_LINES);
      localStorage.removeItem(STORAGE_KEY_DAYS);
      localStorage.removeItem(STORAGE_KEY_PERIODS);
      localStorage.removeItem(STORAGE_KEY_ACTIONS);
      localStorage.removeItem(STORAGE_KEY_EFFICIENCY);
      localStorage.removeItem(STORAGE_KEY_EXTRA_SHEETS);
      localStorage.removeItem(STORAGE_KEY_UPPH_SHEET);
      localStorage.removeItem(STORAGE_KEY_LINE_IDLE);
      localStorage.removeItem(STORAGE_KEY_SUMMARY_PERF);
      localStorage.setItem(STORAGE_KEY_OCT_SEEDED, '1');
      localStorage.setItem(STORAGE_KEY_NOV_SEEDED, '1');
      localStorage.setItem(STORAGE_KEY_SEP_SEEDED, '1');
      localStorage.setItem(STORAGE_KEY_AUG_SEEDED, '1');
      localStorage.setItem(STORAGE_KEY_JUL_SEEDED, '1');
      localStorage.setItem(STORAGE_KEY_JUN_SEEDED, '1');
      localStorage.setItem(STORAGE_KEY_MAY_SEEDED, '1');
      localStorage.setItem(STORAGE_KEY_APR_SEEDED, '1');
      localStorage.setItem(STORAGE_KEY_MAR_SEEDED, '1');
      localStorage.setItem(STORAGE_KEY_FEB_SEEDED, '1');
      localStorage.setItem(STORAGE_KEY_JAN_SEEDED, '1');
      syncToCloud({
        lines: INITIAL_JAN_2026_LINES,
        days: INITIAL_JAN_2026_DAYS,
        periodData: INITIAL_PERIOD_DATA,
        monthlyEfficiency: INITIAL_MONTHLY_EFFICIENCY,
        actionItems: INITIAL_ACTION_ITEMS,
        extraSheets: INITIAL_EXTRA_SHEETS,
        upphSheet: INITIAL_UPPH_SHEET_DATA,
        lineIdleSheet: INITIAL_LINE_IDLE_SHEET_DATA,
        summaryPerformance: INITIAL_SUMMARY_PERFORMANCE_DATA,
      });
      showToast(
        t('รีเซ็ตข้อมูลกลับสู่ค่ามาตรฐานสำเร็จ', 'Reset to default baseline complete', '已恢复初始默认数据')
      );
    }
  };

  // Restore complete database snapshot from Google Drive
  const handleRestoreDatabase = (backup: FullDatabaseBackupPayload) => {
    if (backup.lines && backup.lines.length > 0) setLines(backup.lines);
    if (backup.days && backup.days.length > 0) setDays(backup.days);
    if (backup.monthlyEfficiency && backup.monthlyEfficiency.length > 0) {
      setMonthlyEfficiency(backup.monthlyEfficiency);
    }
    if (backup.actionItems && backup.actionItems.length > 0) {
      setActionItems(backup.actionItems);
    }
    if (backup.year) {
      setFilters(prev => ({
        ...prev,
        year: backup.year,
        month: backup.month || prev.month,
        plant: backup.plant || prev.plant,
      }));
    }

    syncToCloud({
      lines: backup.lines,
      days: backup.days,
      monthlyEfficiency: backup.monthlyEfficiency,
      actionItems: backup.actionItems,
    });

    showToast(
      t(
        'กู้คืนฐานข้อมูลจาก Google Drive เรียบร้อยแล้ว!',
        'Database restored from Google Drive!',
        '已从 Google Drive 成功恢复数据库！'
      )
    );
  };

  // Restore from Web Saved Snapshot
  const handleRestoreWebSnapshot = (snap: WebSavedSnapshot) => {
    setLines(snap.lines);
    setDays(snap.days);
    if (snap.monthlyEfficiency && snap.monthlyEfficiency.length > 0) {
      setMonthlyEfficiency(snap.monthlyEfficiency);
    }
    if (snap.actionItems) {
      setActionItems(snap.actionItems);
    }
    setFilters(prev => ({
      ...prev,
      year: snap.year,
      month: snap.month,
    }));
    const nextPeriodData: PeriodStorageState = {
      ...periodData,
      [snap.month]: {
        lines: snap.lines,
        days: snap.days,
        updatedAt: new Date().toISOString(),
        note: snap.title,
      },
    };
    setPeriodData(nextPeriodData);
    setHasUnsavedChanges(false);
    syncToCloud({
      lines: snap.lines,
      days: snap.days,
      monthlyEfficiency: snap.monthlyEfficiency,
      actionItems: snap.actionItems,
      periodData: nextPeriodData,
    });
    showToast(
      t(
        `เรียกคืนข้อมูล "${snap.title}" สำเร็จเรียบร้อยแล้ว!`,
        `Restored snapshot "${snap.title}"!`,
        `已成功恢复快照 "${snap.title}"！`
      )
    );
  };

  const handleDeleteWebSnapshot = (snapId: string) => {
    const nextSnapshots = webSnapshots.filter(s => s.id !== snapId);
    setWebSnapshots(nextSnapshots);
    syncToCloud({ webSnapshots: nextSnapshots });
    showToast(
      t('ลบจุดบันทึกบน Web เรียบร้อยแล้ว', 'Web snapshot deleted', '已删除网页保存快照')
    );
  };

  const handleUpdateMonthlyEfficiency = (newData: MonthlyEfficiencyRow[]) => {
    setMonthlyEfficiency(newData);
    setHasUnsavedChanges(true);
    syncToCloud({ monthlyEfficiency: newData });
  };

  const handleUpdateExtraSheet = (updatedSheet: EditableCustomSheet) => {
    const nextExtra = extraSheets.map(s => (s.id === updatedSheet.id ? updatedSheet : s));
    setExtraSheets(nextExtra);
    setHasUnsavedChanges(true);
    syncToCloud({ extraSheets: nextExtra });
  };

  const handleUpdateUpphSheet = (newUpphData: UpphSheetData) => {
    setUpphSheet(newUpphData);
    const syncedSummary = syncSummaryPerformanceWithOecAndUpph(
      summaryPerformance,
      periodData,
      monthlyEfficiency,
      newUpphData
    );
    setSummaryPerformance(syncedSummary);
    setHasUnsavedChanges(true);
    syncToCloud({ upphSheet: newUpphData, summaryPerformance: syncedSummary });
  };

  // Update Daily OEC (Act / WorkTime / Planning) for any month directly from UPPH OEC Output comparison matrix
  const handleUpdateOecCellForPeriod = (
    monthKey: string,
    lineId: string,
    category: 'planning' | 'act' | 'workTime',
    day: number,
    value: number | null
  ) => {
    const baseEntry =
      periodData[monthKey] ||
      (monthKey === activePeriodKey ? { lines, days } : undefined);
    if (!baseEntry) return;

    const updatedEntryLines = baseEntry.lines.map(l => {
      if (l.id !== lineId && l.prodLine.toLowerCase() !== lineId.toLowerCase()) {
        return l;
      }
      return {
        ...l,
        [category]: {
          ...l[category],
          [day]: value,
        },
      };
    });

    const nextActiveLines = monthKey === activePeriodKey ? updatedEntryLines : lines;
    if (monthKey === activePeriodKey) {
      setLines(updatedEntryLines);
    }

    const nextPeriodData: PeriodStorageState = {
      ...periodData,
      [monthKey]: {
        lines: updatedEntryLines,
        days: baseEntry.days,
        updatedAt: new Date().toISOString(),
      },
    };
    setPeriodData(nextPeriodData);

    // Recompute Line A & B monthlyEfficiency row for monthKey
    const lineA = updatedEntryLines.find(l => l.prodLine.toLowerCase().includes('a')) || updatedEntryLines[0];
    const lineB = updatedEntryLines.find(l => l.prodLine.toLowerCase().includes('b')) || updatedEntryLines[1];
    let aPlan = 0, aAct = 0, aHours = 0;
    let bPlan = 0, bAct = 0, bHours = 0;
    baseEntry.days.forEach(d => {
      if (lineA?.planning?.[d.day] != null) aPlan += Number(lineA.planning[d.day]);
      if (lineA?.act?.[d.day] != null) aAct += Number(lineA.act[d.day]);
      if (lineA?.workTime?.[d.day] != null) aHours += Number(lineA.workTime[d.day]);
      if (lineB?.planning?.[d.day] != null) bPlan += Number(lineB.planning[d.day]);
      if (lineB?.act?.[d.day] != null) bAct += Number(lineB.act[d.day]);
      if (lineB?.workTime?.[d.day] != null) bHours += Number(lineB.workTime[d.day]);
    });
    const nextMonthlyEfficiency = monthlyEfficiency.map(m => {
      if (m.month !== monthKey || m.manualOverride) return m;
      return {
        ...m,
        lineAPlan: aPlan,
        lineAAct: aAct,
        lineAWorkHours: aHours,
        lineAUph: aHours > 0 ? Math.round(aAct / aHours) : m.lineAUph,
        lineBPlan: bPlan,
        lineBAct: bAct,
        lineBWorkHours: bHours,
        lineBUph: bHours > 0 ? Math.round(bAct / bHours) : m.lineBUph,
      };
    });
    setMonthlyEfficiency(nextMonthlyEfficiency);

    const nextUpph = syncUpphSheetWithDailyOec(
      upphSheet,
      nextPeriodData,
      nextMonthlyEfficiency,
      upphSheet.activeMonth
    );
    setUpphSheet(nextUpph);

    const nextSummary = syncSummaryPerformanceWithOecAndUpph(
      summaryPerformance,
      nextPeriodData,
      nextMonthlyEfficiency,
      nextUpph
    );
    setSummaryPerformance(nextSummary);
    setHasUnsavedChanges(true);

    debouncedCloudSave(
      nextActiveLines,
      days,
      nextMonthlyEfficiency,
      actionItems,
      nextPeriodData,
      nextUpph,
      nextSummary
    );
  };

  const handleUpdateLineIdleSheet = (newIdleData: LineIdleSheetData) => {
    setLineIdleSheet(newIdleData);
    setHasUnsavedChanges(true);
    syncToCloud({ lineIdleSheet: newIdleData });
  };

  const handleUpdateSummaryPerformance = (newRows: SummaryPerformanceRow[]) => {
    setSummaryPerformance(newRows);
    setHasUnsavedChanges(true);
    syncToCloud({ summaryPerformance: newRows });
  };

  const handleUpdateActionItems = (newActions: ActionItem[]) => {
    setActionItems(newActions);
    syncToCloud({ actionItems: newActions });
  };

  // Export full Excel workbook
  const handleExportExcel = () => {
    downloadOECTemplate(days, filteredLines);
    showToast(t('ดาวน์โหลดไฟล์ Excel เรียบร้อยแล้ว', 'Excel file downloaded', 'Excel 文件已下载'));
  };

  // Export CSV
  const handleExportCSV = () => {
    exportToCSV(days, filteredLines);
    showToast(t('ดาวน์โหลดไฟล์ CSV เรียบร้อยแล้ว', 'CSV file downloaded', 'CSV 文件已下载'));
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased flex flex-col">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-lg shadow-xl border border-slate-700 flex items-center gap-2.5 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header with Title & Controls */}
      <Header
        filters={filters}
        onFilterChange={handleFilterChange}
        availablePlants={availablePlants}
        availableLines={availableLines}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenImport={() => setShowImportModal(true)}
        onDownloadTemplate={() => downloadOECTemplate(days, lines)}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        onOpenPresentation={() => setShowPresentationModal(true)}
        onResetData={handleResetData}
        onOpenAddLine={() => setShowAddLineModal(true)}
        isEditMode={isEditMode}
        onToggleEditMode={() => setIsEditMode(!isEditMode)}
        isOnline={isOnline}
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
        onManualSync={() => handleSaveOnWebNow()}
        onOpenPublish={() => setShowPublishModal(true)}
        onOpenGoogleDrive={() => setShowGoogleDriveModal(true)}
        onOpenDatePeriod={() => setShowDatePeriodModal(true)}
        onSaveOnWeb={() => handleSaveOnWebNow()}
        onOpenWebSaveModal={() => setShowWebSaveModal(true)}
        hasUnsavedChanges={hasUnsavedChanges}
        savedPeriodsCount={Object.keys(periodData).length}
        extraSheets={extraSheets}
      />

      {/* Main Dashboard Content */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 py-4">
        {activeTab === 'daily-oec' ? (
          <>
            {/* KPI Summary Cards matching image */}
            <KpiCards
              totalPlanning={totals.planning}
              totalActual={totals.actual}
              totalGap={totals.gap}
              overallUph={totals.uph}
              achievementRate={totals.achievementRate}
              totalWorkHours={totals.totalWorkHours}
            />

            {/* YTD UPH Efficiency Summary: Combined 2 Lines & Split Line A / Line B */}
            <UphYtdSummarySection
              monthlyEfficiency={dynamicMonthlyEfficiency}
              plantName={filters.plant === 'ทั้งหมด' ? 'HTC Ref(泰国冰箱)' : filters.plant}
              selectedProdLine={filters.prodLine}
              onOpenSummaryEfficiency={() => setActiveTab('summary-efficiency')}
            />

            {/* Production & UPH Trend Charts matching image */}
            <OecCharts
              monthlyProduction={dynamicMonthlyProd}
              monthlyUph={dynamicMonthlyUph}
              days={days}
              lines={filteredLines}
              selectedProdLine={filters.prodLine}
              monthlyEfficiency={dynamicMonthlyEfficiency}
              onUpdateMonthlyEfficiency={handleUpdateMonthlyEfficiency}
              onSaveOnWeb={() => handleSaveOnWebNow()}
            />

            {/* Daily OEC Matrix Table matching image */}
            <DailyMatrixTable
              days={days}
              lines={filteredLines}
              onUpdateCellValue={handleUpdateCellValue}
              onAddDay={handleAddDay}
              onDeleteLine={handleDeleteLine}
              isEditMode={isEditMode}
              onOpenDatePeriod={() => setShowDatePeriodModal(true)}
              onOpenDailyTrend={() => setActiveTab('daily-trend')}
              onSaveOnWeb={() => handleSaveOnWebNow()}
              onOpenWebSaveModal={() => setShowWebSaveModal(true)}
              hasUnsavedChanges={hasUnsavedChanges}
              isSyncing={isSyncing}
              activePeriodLabel={formatPeriodLabel(filters.year, activePeriodKey, language)}
            />
          </>
        ) : activeTab === 'summary-onepage' ? (
          /* Summary Onepage Dashboard: Unified Executive Single-Page Operations Overview */
          <SummaryOnepageDashboardView
            monthlyEfficiency={dynamicMonthlyEfficiency}
            summaryPerformance={summaryPerformance}
            upphSheet={upphSheet}
            lineIdleSheet={lineIdleSheet}
            periodData={periodData}
            activePeriodKey={activePeriodKey}
            activeLines={filteredLines}
            activeDays={days}
            actionItems={actionItems}
            plantName={filters.plant === 'ทั้งหมด' ? 'HTC Ref(泰国冰箱)' : filters.plant}
            year={filters.year}
            onSelectPeriod={(periodKey) => {
              const [yPart] = periodKey.split('-');
              handleFilterChange({
                ...filters,
                year: parseInt(yPart || String(filters.year), 10),
                month: periodKey,
              });
            }}
            onNavigateToSheet={(tab) => setActiveTab(tab)}
            onSaveOnWeb={() => handleSaveOnWebNow()}
            onOpenPresentation={() => setShowPresentationModal(true)}
            hasUnsavedChanges={hasUnsavedChanges}
            isSyncing={isSyncing}
          />
        ) : activeTab === 'summary-dashboard-performance' ? (
          /* Summary Dashboard Performance: Multi-Dimensional Interactive Pie & Donut Analytics */
          <SummaryDashboardPerformanceView
            monthlyEfficiency={dynamicMonthlyEfficiency}
            summaryPerformance={summaryPerformance}
            upphSheet={upphSheet}
            lineIdleSheet={lineIdleSheet}
            periodData={periodData}
            activePeriodKey={activePeriodKey}
            activeLines={filteredLines}
            activeDays={days}
            actionItems={actionItems}
            plantName={filters.plant === 'ทั้งหมด' ? 'HTC Ref(泰国冰箱)' : filters.plant}
            year={filters.year}
            onSelectPeriod={(periodKey) => {
              const [yPart] = periodKey.split('-');
              handleFilterChange({
                ...filters,
                year: parseInt(yPart || String(filters.year), 10),
                month: periodKey,
              });
            }}
            onNavigateToSheet={(tab) => setActiveTab(tab)}
            onSaveOnWeb={() => handleSaveOnWebNow()}
            hasUnsavedChanges={hasUnsavedChanges}
            isSyncing={isSyncing}
          />
        ) : activeTab === 'upph-oec' ? (
          /* Sheet UPPH: Original UPPH OEC (人效日清) with Editable Monthly Charts & Dual Matrices */
          <UpphOecView
            data={upphSheet}
            onUpdateData={handleUpdateUpphSheet}
            dailyOecLines={lines}
            dailyOecDays={days}
            periodData={periodData}
            monthlyEfficiency={dynamicMonthlyEfficiency}
            activePeriodKey={activePeriodKey}
            onUpdateDailyOecCell={handleUpdateOecCellForPeriod}
            onSaveOnWeb={(customTitle?: string) => handleSaveOnWebNow(customTitle)}
            hasUnsavedChanges={hasUnsavedChanges}
            isSyncing={isSyncing}
            plantName={filters.plant === 'ทั้งหมด' ? 'HTC Ref(泰国冰箱)' : filters.plant}
          />
        ) : activeTab === 'line-idle' ? (
          /* Sheet Line Stop: FA Line Idle Time (总装停机时) matching exact uploaded dashboard */
          <LineIdleTimeView
            data={lineIdleSheet}
            onUpdateData={handleUpdateLineIdleSheet}
            onSaveOnWeb={(customTitle?: string) => handleSaveOnWebNow(customTitle)}
            hasUnsavedChanges={hasUnsavedChanges}
            isSyncing={isSyncing}
          />
        ) : activeTab === 'summary-performance' ? (
          /* Sheet Summary Performance: UPH, UPPH & Line Stop Integrated Master Sheet */
          <SummaryPerformanceView
            rows={summaryPerformance}
            onUpdateRows={handleUpdateSummaryPerformance}
            monthlyEfficiency={dynamicMonthlyEfficiency}
            upphSheet={upphSheet}
            lineIdleSheet={lineIdleSheet}
            onSaveOnWeb={(customTitle?: string) => handleSaveOnWebNow(customTitle)}
            hasUnsavedChanges={hasUnsavedChanges}
            isSyncing={isSyncing}
            onNavigateToSheet={(tab) => setActiveTab(tab)}
          />
        ) : activeTab === 'daily-trend' ? (
          /* Sheet 2: Daily Trend Charts & Live Daily Data Recording Table */
          <DailyTrendView
            days={days}
            lines={filteredLines}
            periodLabel={formatPeriodLabel(filters.year, activePeriodKey, language)}
            plantName={filters.plant === 'ทั้งหมด' ? 'HTC Ref(泰国冰箱)' : filters.plant}
            onUpdateCellValue={handleUpdateCellValue}
            onAddDay={handleAddDay}
            onOpenDatePeriod={() => setShowDatePeriodModal(true)}
            onSaveOnWeb={() => handleSaveOnWebNow()}
            hasUnsavedChanges={hasUnsavedChanges}
            isSyncing={isSyncing}
          />
        ) : activeTab === 'summary-efficiency' ? (
          /* Sheet 3: Summary Efficiency Line A & Line B (AVG & Actual YTD) */
          <SummaryEfficiencyView
            data={dynamicMonthlyEfficiency}
            onUpdateData={handleUpdateMonthlyEfficiency}
            plantName={filters.plant === 'ทั้งหมด' ? 'HTC Ref(泰国冰箱)' : filters.plant}
            onSaveOnWeb={() => handleSaveOnWebNow()}
            hasUnsavedChanges={hasUnsavedChanges}
            isSyncing={isSyncing}
          />
        ) : (
          /* Sheet 4 & Sheet 5: Editable Custom / Line OEC Sheets on Web */
          (() => {
            const currentSheet =
              extraSheets.find(s => s.id === activeTab) || extraSheets[0];
            if (!currentSheet) return null;
            return (
              <EditableWebSheetView
                sheet={currentSheet}
                onUpdateSheet={handleUpdateExtraSheet}
                lines={lines}
                days={days}
                onUpdateDailyCell={handleUpdateCellValue}
                onAddDay={handleAddDay}
                onSaveOnWeb={(customTitle?: string) => handleSaveOnWebNow(customTitle)}
                hasUnsavedChanges={hasUnsavedChanges}
                isSyncing={isSyncing}
                plantName={filters.plant === 'ทั้งหมด' ? 'HTC Ref(泰国冰箱)' : filters.plant}
                activePeriodLabel={formatPeriodLabel(filters.year, activePeriodKey, language)}
              />
            );
          })()
        )}
      </main>

      {/* Modals */}

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={handleImportSuccess}
        currentDays={days}
        currentLines={lines}
      />

      <PresentationModal
        isOpen={showPresentationModal}
        onClose={() => setShowPresentationModal(false)}
        lines={filteredLines}
        days={days}
        totalPlanning={totals.planning}
        totalActual={totals.actual}
        totalGap={totals.gap}
        overallUph={totals.uph}
        achievementRate={totals.achievementRate}
        actionItems={actionItems}
        onUpdateActionItems={handleUpdateActionItems}
        plantName={filters.plant === 'ทั้งหมด' ? 'HTC Ref(泰国冰箱)' : filters.plant}
        year={filters.year}
        month={filters.month}
        monthlyEfficiency={dynamicMonthlyEfficiency}
      />

      <AddLineModal
        isOpen={showAddLineModal}
        onClose={() => setShowAddLineModal(false)}
        onAddLine={handleAddLine}
        days={days}
        existingPlants={availablePlants}
      />

      <PublishModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        isOnline={isOnline}
        lastSyncTime={lastSyncTime}
      />

      <GoogleDriveModal
        isOpen={showGoogleDriveModal}
        onClose={() => setShowGoogleDriveModal(false)}
        currentLines={lines}
        currentDays={days}
        currentMonthlyEfficiency={monthlyEfficiency}
        currentActionItems={actionItems}
        filters={filters}
        onRestoreDatabase={handleRestoreDatabase}
      />

      <DatePeriodModal
        isOpen={showDatePeriodModal}
        onClose={() => setShowDatePeriodModal(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
        currentDays={days}
        onSetDays={(newDays) => {
          setDays(newDays);
          setHasUnsavedChanges(true);
          syncToCloud({ days: newDays });
        }}
        onAddDay={handleAddDay}
      />

      <WebSaveModal
        isOpen={showWebSaveModal}
        onClose={() => setShowWebSaveModal(false)}
        filters={filters}
        currentLines={lines}
        currentDays={days}
        currentMonthlyEfficiency={monthlyEfficiency}
        currentActionItems={actionItems}
        periodData={periodData}
        webSnapshots={webSnapshots}
        lastSyncTime={lastSyncTime}
        isSyncing={isSyncing}
        hasUnsavedChanges={hasUnsavedChanges}
        onSaveOnWebNow={handleSaveOnWebNow}
        onSelectSavedPeriod={(periodKey) => {
          const [yStr] = periodKey.split('-');
          handleFilterChange({
            ...filters,
            year: parseInt(yStr || '2026', 10),
            month: periodKey,
          });
        }}
        onRestoreWebSnapshot={handleRestoreWebSnapshot}
        onDeleteWebSnapshot={handleDeleteWebSnapshot}
      />
    </div>
  );
}

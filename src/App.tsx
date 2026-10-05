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
  INITIAL_ACTION_ITEMS,
  INITIAL_MONTHLY_EFFICIENCY,
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
  WebSavedSnapshot
} from './types/oec';
import { SummaryEfficiencyView } from './components/SummaryEfficiencyView';
import { downloadOECTemplate, exportToCSV } from './utils/excelHelper';
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
  // Local storage keys
  const STORAGE_KEY_LINES = 'oec_production_lines_v1';
  const STORAGE_KEY_DAYS = 'oec_days_v1';
  const STORAGE_KEY_ACTIONS = 'oec_actions_v1';
  const STORAGE_KEY_EFFICIENCY = 'oec_monthly_efficiency_v1';
  const STORAGE_KEY_TAB = 'oec_active_tab_v1';
  const STORAGE_KEY_PERIODS = 'oec_period_data_v1';
  const STORAGE_KEY_SNAPSHOTS = 'oec_web_snapshots_v1';

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
      const saved = localStorage.getItem(STORAGE_KEY_LINES);
      return saved ? JSON.parse(saved) : INITIAL_LINE_DATA;
    } catch {
      return INITIAL_LINE_DATA;
    }
  });

  const [days, setDays] = useState<DayColumn[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DAYS);
      return saved ? JSON.parse(saved) : INITIAL_DAYS;
    } catch {
      return INITIAL_DAYS;
    }
  });

  const [monthlyEfficiency, setMonthlyEfficiency] = useState<MonthlyEfficiencyRow[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EFFICIENCY);
      return saved ? JSON.parse(saved) : INITIAL_MONTHLY_EFFICIENCY;
    } catch {
      return INITIAL_MONTHLY_EFFICIENCY;
    }
  });

  const [periodData, setPeriodData] = useState<PeriodStorageState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PERIODS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      '2026-09': {
        lines: INITIAL_LINE_DATA,
        days: INITIAL_DAYS,
        updatedAt: new Date().toISOString(),
      },
    };
  });

  const [webSnapshots, setWebSnapshots] = useState<WebSavedSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SNAPSHOTS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [filters, setFilters] = useState<OECFilterState>({
    plant: 'ทั้งหมด',
    year: 2026,
    month: 'All',
    prodLine: 'All',
  });

  const activePeriodKey = filters.month === 'All' ? `${filters.year}-09` : filters.month;

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
      // Sync the active month with the live sum from the Daily Table
      if (item.month === activePeriodKey) {
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
      // Sync the active month with the live UPH from the Daily Table
      if (item.month === activePeriodKey) {
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
      if (item.month === activePeriodKey) {
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
    currentPeriods?: PeriodStorageState
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

    // Seed initial data to cloud if new, then listen to changes
    initOrSeedCloudData({
      lines,
      days,
      monthlyEfficiency,
      actionItems,
      periodData,
      webSnapshots,
    }).then(cloudData => {
      if (cloudData) {
        if (cloudData.lines && cloudData.lines.length > 0) setLines(cloudData.lines);
        if (cloudData.days && cloudData.days.length > 0) setDays(cloudData.days);
        if (cloudData.monthlyEfficiency && cloudData.monthlyEfficiency.length > 0) setMonthlyEfficiency(cloudData.monthlyEfficiency);
        if (cloudData.actionItems && cloudData.actionItems.length > 0) setActionItems(cloudData.actionItems);
        if (cloudData.periodData) setPeriodData(cloudData.periodData);
        if (cloudData.webSnapshots) setWebSnapshots(cloudData.webSnapshots);
      }
    });

    const unsubscribe = subscribeToOecDashboard(
      (cloudData) => {
        setIsOnline(true);
        setLastSyncTime(new Date());
        if (cloudData.lines && cloudData.lines.length > 0) {
          setLines(cloudData.lines);
        }
        if (cloudData.days && cloudData.days.length > 0) {
          setDays(cloudData.days);
        }
        if (cloudData.monthlyEfficiency && cloudData.monthlyEfficiency.length > 0) {
          setMonthlyEfficiency(cloudData.monthlyEfficiency);
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

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Switch period (Year / Month) and load or initialize that period's data on the Web
  const handleFilterChange = (newFilters: OECFilterState) => {
    const oldPeriodKey = filters.month === 'All' ? `${filters.year}-09` : filters.month;
    const newPeriodKey = newFilters.month === 'All' ? `${newFilters.year}-09` : newFilters.month;

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
      } else if (newPeriodKey === '2026-09') {
        setLines(INITIAL_LINE_DATA);
        setDays(INITIAL_DAYS);
        updatedPeriodData[newPeriodKey] = {
          lines: INITIAL_LINE_DATA,
          days: INITIAL_DAYS,
          updatedAt: new Date().toISOString(),
        };
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
      showToast(`สลับไปยังข้อมูลช่วงเวลา ${formatPeriodLabel(newFilters.year, newPeriodKey)}`);
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

    const newSnapshot: WebSavedSnapshot = {
      id: `snap_${Date.now()}`,
      title: customTitle || `บันทึกข้อมูลบน Web (${formatPeriodLabel(filters.year, activePeriodKey)})`,
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
    });

    showToast(`บันทึกข้อมูลบน Web สำเร็จ! (${formatPeriodLabel(filters.year, activePeriodKey)})`);
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
    debouncedCloudSave(updatedLines, days, monthlyEfficiency, actionItems, nextPeriodData);
  };

  // Add a new day column
  const handleAddDay = (day: number, weekday: string) => {
    if (days.some(d => d.day === day)) {
      showToast(`วันที่ ${day} มีอยู่ในตารางแล้ว`, 'info');
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
    syncToCloud({ days: updatedDays, periodData: nextPeriodData });
    showToast(`เพิ่มคอลัมน์ วันที่ ${day} (${weekday}) เรียบร้อยแล้ว`);
  };

  // Delete a line
  const handleDeleteLine = (lineId: string) => {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบสายการผลิตนี้?')) {
      const updatedLines = lines.filter(l => l.id !== lineId);
      setLines(updatedLines);
      setHasUnsavedChanges(true);
      syncToCloud({ lines: updatedLines });
      showToast('ลบสายการผลิตเรียบร้อย');
    }
  };

  // Add line
  const handleAddLine = (newLine: LineOECData) => {
    const updatedLines = [...lines, newLine];
    setLines(updatedLines);
    setHasUnsavedChanges(true);
    syncToCloud({ lines: updatedLines });
    showToast(`เพิ่มสายการผลิต "${newLine.prodLine}" สำเร็จ`);
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
    syncToCloud({ lines: importedLines, days: newDays, periodData: nextPeriodData });
    showToast('นำเข้าและบันทึกข้อมูล OEC บนเว็บสำเร็จเรียบร้อยแล้ว!');
  };

  // Reset to initial data from screenshot
  const handleResetData = () => {
    if (confirm('ยืนยันที่จะรีเซ็ตข้อมูลทั้งหมดกลับเป็นค่ามาตรฐานจากรูป?')) {
      setLines(INITIAL_LINE_DATA);
      setDays(INITIAL_DAYS);
      setMonthlyEfficiency(INITIAL_MONTHLY_EFFICIENCY);
      setActionItems(INITIAL_ACTION_ITEMS);
      setHasUnsavedChanges(false);
      localStorage.removeItem(STORAGE_KEY_LINES);
      localStorage.removeItem(STORAGE_KEY_DAYS);
      localStorage.removeItem(STORAGE_KEY_ACTIONS);
      localStorage.removeItem(STORAGE_KEY_EFFICIENCY);
      syncToCloud({
        lines: INITIAL_LINE_DATA,
        days: INITIAL_DAYS,
        monthlyEfficiency: INITIAL_MONTHLY_EFFICIENCY,
        actionItems: INITIAL_ACTION_ITEMS,
      });
      showToast('รีเซ็ตข้อมูลกลับสู่ค่ามาตรฐานสำเร็จ');
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

    // Persist to Cloud Firestore immediately
    syncToCloud({
      lines: backup.lines,
      days: backup.days,
      monthlyEfficiency: backup.monthlyEfficiency,
      actionItems: backup.actionItems,
    });

    showToast('กู้คืนฐานข้อมูลจาก Google Drive เรียบร้อยแล้ว!');
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
    showToast(`เรียกคืนข้อมูล "${snap.title}" สำเร็จเรียบร้อยแล้ว!`);
  };

  const handleDeleteWebSnapshot = (snapId: string) => {
    const nextSnapshots = webSnapshots.filter(s => s.id !== snapId);
    setWebSnapshots(nextSnapshots);
    syncToCloud({ webSnapshots: nextSnapshots });
    showToast('ลบจุดบันทึกบน Web เรียบร้อยแล้ว');
  };

  const handleUpdateMonthlyEfficiency = (newData: MonthlyEfficiencyRow[]) => {
    setMonthlyEfficiency(newData);
    setHasUnsavedChanges(true);
    syncToCloud({ monthlyEfficiency: newData });
  };

  const handleUpdateActionItems = (newActions: ActionItem[]) => {
    setActionItems(newActions);
    syncToCloud({ actionItems: newActions });
  };

  // Export full Excel workbook
  const handleExportExcel = () => {
    downloadOECTemplate(days, filteredLines);
    showToast('ดาวน์โหลดไฟล์ Excel เรียบร้อยแล้ว');
  };

  // Export CSV
  const handleExportCSV = () => {
    exportToCSV(days, filteredLines);
    showToast('ดาวน์โหลดไฟล์ CSV เรียบร้อยแล้ว');
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

            {/* Production & UPH Trend Charts matching image */}
            <OecCharts
              monthlyProduction={dynamicMonthlyProd}
              monthlyUph={dynamicMonthlyUph}
              days={days}
              lines={filteredLines}
              selectedProdLine={filters.prodLine}
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
              activePeriodLabel={formatPeriodLabel(filters.year, activePeriodKey)}
            />
          </>
        ) : activeTab === 'daily-trend' ? (
          /* Sheet 2: Daily Trend Charts & Live Daily Data Recording Table */
          <DailyTrendView
            days={days}
            lines={filteredLines}
            periodLabel={formatPeriodLabel(filters.year, activePeriodKey)}
            plantName={filters.plant === 'ทั้งหมด' ? 'HTC Ref(泰国冰箱)' : filters.plant}
            onUpdateCellValue={handleUpdateCellValue}
            onAddDay={handleAddDay}
            onOpenDatePeriod={() => setShowDatePeriodModal(true)}
            onSaveOnWeb={() => handleSaveOnWebNow()}
            hasUnsavedChanges={hasUnsavedChanges}
            isSyncing={isSyncing}
          />
        ) : (
          /* Sheet 3: Summary Efficiency Line A & Line B (AVG & Actual YTD) */
          <SummaryEfficiencyView
            data={dynamicMonthlyEfficiency}
            onUpdateData={handleUpdateMonthlyEfficiency}
            plantName={filters.plant === 'ทั้งหมด' ? 'HTC Ref(泰国冰箱)' : filters.plant}
          />
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

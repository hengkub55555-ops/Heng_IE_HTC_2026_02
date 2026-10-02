/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Header } from './components/Header';
import { KpiCards } from './components/KpiCards';
import { OecCharts } from './components/OecCharts';
import { DailyMatrixTable } from './components/DailyMatrixTable';
import { ImportModal } from './components/ImportModal';
import { PresentationModal } from './components/PresentationModal';
import { AddLineModal } from './components/AddLineModal';
import { PublishModal } from './components/PublishModal';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { DatePeriodModal } from './components/DatePeriodModal';
import { FullDatabaseBackupPayload } from './services/googleDrive';
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
  ActiveSheetTab
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
      // Sync the active month (2026-09) with the live sum from the Daily Table
      if (item.month === '2026-09') {
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
  }, [monthlyEfficiency, lines, days]);

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
      // Sync the active month (2026-09) with the live UPH from the Daily Table
      if (item.month === '2026-09') {
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
  }, [monthlyEfficiency, lines, days]);

  // Dynamically compute full monthly efficiency with live September values from Daily Table
  const dynamicMonthlyEfficiency = useMemo(() => {
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
      if (item.month === '2026-09') {
        const lineAAct = liveLineAAct > 0 ? liveLineAAct : item.lineAAct;
        const lineAUph = liveLineAUph > 0 ? liveLineAUph : item.lineAUph;
        const lineAWorkHours = liveLineAWorkHours > 0 ? liveLineAWorkHours : item.lineAWorkHours;

        const lineBAct = liveLineBAct > 0 ? liveLineBAct : item.lineBAct;
        const lineBUph = liveLineBUph > 0 ? liveLineBUph : item.lineBUph;
        const lineBWorkHours = liveLineBWorkHours > 0 ? liveLineBWorkHours : item.lineBWorkHours;

        return {
          ...item,
          lineAAct,
          lineAUph,
          lineAWorkHours,
          lineBAct,
          lineBUph,
          lineBWorkHours,
        };
      }
      return item;
    });
  }, [monthlyEfficiency, lines, days]);

  const [actionItems, setActionItems] = useState<ActionItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIONS);
      return saved ? JSON.parse(saved) : INITIAL_ACTION_ITEMS;
    } catch {
      return INITIAL_ACTION_ITEMS;
    }
  });

  const [filters, setFilters] = useState<OECFilterState>({
    plant: 'ทั้งหมด',
    year: 2026,
    month: 'All',
    prodLine: 'All',
  });

  const [isEditMode, setIsEditMode] = useState<boolean>(true);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [showPresentationModal, setShowPresentationModal] = useState<boolean>(false);
  const [showAddLineModal, setShowAddLineModal] = useState<boolean>(false);
  const [showPublishModal, setShowPublishModal] = useState<boolean>(false);
  const [showGoogleDriveModal, setShowGoogleDriveModal] = useState<boolean>(false);
  const [showDatePeriodModal, setShowDatePeriodModal] = useState<boolean>(false);
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
    currentActions: ActionItem[]
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
    }).then(cloudData => {
      if (cloudData) {
        if (cloudData.lines && cloudData.lines.length > 0) setLines(cloudData.lines);
        if (cloudData.days && cloudData.days.length > 0) setDays(cloudData.days);
        if (cloudData.monthlyEfficiency && cloudData.monthlyEfficiency.length > 0) setMonthlyEfficiency(cloudData.monthlyEfficiency);
        if (cloudData.actionItems && cloudData.actionItems.length > 0) setActionItems(cloudData.actionItems);
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

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

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
    debouncedCloudSave(updatedLines, days, monthlyEfficiency, actionItems);
  };

  // Add a new day column
  const handleAddDay = (day: number, weekday: string) => {
    if (days.some(d => d.day === day)) {
      alert(`วันที่ ${day} มีอยู่ในตารางแล้ว`);
      return;
    }
    const updatedDays = [...days, { day, weekday }].sort((a, b) => a.day - b.day);
    setDays(updatedDays);
    syncToCloud({ days: updatedDays });
    showToast(`เพิ่มคอลัมน์ วันที่ ${day} (${weekday}) เรียบร้อยแล้ว`);
  };

  // Delete a line
  const handleDeleteLine = (lineId: string) => {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบสายการผลิตนี้?')) {
      const updatedLines = lines.filter(l => l.id !== lineId);
      setLines(updatedLines);
      syncToCloud({ lines: updatedLines });
      showToast('ลบสายการผลิตเรียบร้อย');
    }
  };

  // Add line
  const handleAddLine = (newLine: LineOECData) => {
    const updatedLines = [...lines, newLine];
    setLines(updatedLines);
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
    syncToCloud({ lines: importedLines, days: newDays });
    showToast('นำเข้าและซิงค์ข้อมูล OEC บนเว็บสำเร็จเรียบร้อยแล้ว!');
  };

  // Reset to initial data from screenshot
  const handleResetData = () => {
    if (confirm('ยืนยันที่จะรีเซ็ตข้อมูลทั้งหมดกลับเป็นค่ามาตรฐานจากรูป?')) {
      setLines(INITIAL_LINE_DATA);
      setDays(INITIAL_DAYS);
      setMonthlyEfficiency(INITIAL_MONTHLY_EFFICIENCY);
      setActionItems(INITIAL_ACTION_ITEMS);
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

  const handleUpdateMonthlyEfficiency = (newData: MonthlyEfficiencyRow[]) => {
    setMonthlyEfficiency(newData);
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
        onFilterChange={setFilters}
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
        onManualSync={() => syncToCloud()}
        onOpenPublish={() => setShowPublishModal(true)}
        onOpenGoogleDrive={() => setShowGoogleDriveModal(true)}
        onOpenDatePeriod={() => setShowDatePeriodModal(true)}
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
            />
          </>
        ) : (
          /* Sheet 2: Summary Efficiency Line A & Line B (AVG & Actual YTD) */
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
        onFilterChange={setFilters}
        currentDays={days}
        onSetDays={(newDays) => {
          setDays(newDays);
          syncToCloud({ days: newDays });
        }}
        onAddDay={handleAddDay}
      />
    </div>
  );
}

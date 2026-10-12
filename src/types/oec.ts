export type CategoryType = 'Planning' | 'Act' | 'Gap' | 'Work Time' | 'UPH';

export type ActiveSheetTab =
  | 'daily-oec'
  | 'upph-oec'
  | 'line-idle'
  | 'summary-performance'
  | 'daily-trend'
  | 'summary-efficiency'
  | 'sheet-4'
  | 'sheet-5';

export interface LineIdleDailyRow {
  id: string;
  date: string; // e.g. '2026/10/1'
  plantName: string; // 'HTC Ref(泰国冰箱)'
  workTime: number; // e.g. 31.41
  idleOver1MinTime: number; // e.g. 16.4
  idleOver1MinRate?: number; // auto or manual %
  idle1To5MinTime: number; // e.g. 13.51
  idle1To5MinRate?: number; // auto or manual %
  idleOver5MinTime: number; // e.g. 2.9
  idleOver5MinRate?: number; // auto or manual %
}

export interface LineIdleMonthlyItem {
  month: string; // '2026-01' .. '2026-10'
  over1MinTime: number;
  over1MinRate: number; // percentage e.g. 63.3
  oneTo5MinTime: number;
  oneTo5MinRate: number; // percentage e.g. 42.8
  over5MinTime: number;
  over5MinRate: number; // percentage e.g. 20.6
}

export interface LineIdleTargets {
  over1MinTgt: number; // 7
  over1Min2024Tgt: number; // 11.78
  oneTo5MinTgt: number; // 5
  oneTo5Min2024Tgt: number; // 9.15
  over5MinTgt: number; // 2
  over5Min2024Tgt: number; // 2.62
}

export interface LineIdleSheetData {
  plant: string;
  year: number;
  month: string; // '2026-10'
  updateTime: string; // '12/10/2026 7:00:47'
  dailyRows: LineIdleDailyRow[];
  monthlyTrends: LineIdleMonthlyItem[];
  targets: LineIdleTargets;
  // Optional manual overrides for top 6 KPI cards if user edits cards directly
  kpiOverrides?: {
    workTimeTotal?: number | null;
    over1MinTime?: number | null;
    over1MinRate?: number | null;
    oneTo5MinTime?: number | null;
    oneTo5MinRate?: number | null;
    over5MinTime?: number | null;
    over5MinRate?: number | null;
  };
  updatedAt?: string;
}

export interface SummaryPerformanceRow {
  id: string;
  period: string; // '2026-01' .. '2026-10'
  periodLabelTh: string;
  // Production & UPH
  totalPlan: number;
  totalAct: number;
  workHours: number;
  lineAUph: number;
  lineBUph: number;
  avgUph: number;
  targetUph: number;
  // UPPH
  lineAUpph: number;
  lineBUpph: number;
  avgUpph: number;
  targetUpph: number;
  attendance: number;
  // Line Stop / Idle Time
  idleOver1MinHours: number;
  idleOver1MinRate: number;
  idle1To5MinHours: number;
  idle1To5MinRate: number;
  idleOver5MinHours: number;
  idleOver5MinRate: number;
  targetIdleRate: number;
  notes?: string;
}

export interface UpphMonthlyItem {
  month: string; // '2026-01' .. '2026-09'
  prodLineA: number;
  prodLineB: number;
  upphLineA: number;
  upphLineB: number;
}

export interface UpphLineData {
  id: string; // 'line-a' | 'line-b'
  plant: string; // 'HTC Ref(泰国冰箱)'
  prodLine: string; // 'Line A' | 'Line B'
  onTheJob: DailyValues; // On-the-job(在册)
  attendance: DailyValues; // Attendance(出勤)
  targetUpph: DailyValues; // Target UPPH(目标)
  actUpph: DailyValues; // Act UPPH(实际)
  // Optional manual overrides for Total column if user edits Total directly
  totalOnTheJobOverride?: number | null;
  totalAttendanceOverride?: number | null;
  totalTargetUpphOverride?: number | null;
  totalActUpphOverride?: number | null;
}

export interface UpphSheetData {
  days: DayColumn[];
  lines: UpphLineData[];
  monthlyData: UpphMonthlyItem[];
  updatedAt?: string;
}

export interface EditableSheetColumn {
  key: string;
  labelTh: string;
  labelEn: string;
  labelZh: string;
  type: 'text' | 'number' | 'gap' | 'uph' | 'achievePct';
  width?: string;
  align?: 'left' | 'center' | 'right';
  highlight?: 'sky' | 'blue' | 'emerald' | 'amber' | 'rose' | 'none';
}

export interface EditableSheetRow {
  id: string;
  period: string;
  subLabel?: string;
  modelName?: string;
  plan: number;
  act: number;
  gap: number;
  workHours: number;
  manpower?: number;
  uph: number;
  targetUph: number;
  lossMinutes?: number;
  notes?: string;
  customCells?: Record<string, string | number>;
}

export interface EditableCustomSheet {
  id: string; // 'sheet-4' | 'sheet-5'
  tabNameTh: string;
  tabNameEn: string;
  tabNameZh: string;
  titleTh: string;
  titleEn: string;
  titleZh: string;
  subtitleTh: string;
  subtitleEn: string;
  subtitleZh: string;
  badgeText: string;
  accentColor: 'sky' | 'indigo' | 'emerald' | 'amber';
  defaultTargetUph: number;
  columns: EditableSheetColumn[];
  rows: EditableSheetRow[];
  updatedAt?: string;
}

export interface DayColumn {
  day: number;
  weekday: string; // TUE, WEN, THU, FRI, SAT, SUN, MON
  dateStr?: string;
}

export interface DailyValues {
  [day: number]: number | null | undefined;
}

export interface LineOECData {
  id: string;
  plant: string;
  prodLine: string;
  // Category maps to values per day
  planning: DailyValues;
  act: DailyValues;
  workTime: DailyValues;
  // gap and uph are computed dynamically or can have overrides
}

export interface MonthlyTrendItem {
  month: string; // '2026-01', '2026-02', etc.
  lineA: number;
  lineB: number;
  lineC?: number;
}

export interface MonthlyEfficiencyRow {
  month: string; // e.g. '2026-01'
  monthNameTh?: string; // e.g. 'ม.ค. 2026'
  // Line A
  lineAPlan: number;
  lineAAct: number;
  lineAUph: number;
  lineATargetUph: number;
  lineAWorkHours: number;
  // Line B
  lineBPlan: number;
  lineBAct: number;
  lineBUph: number;
  lineBTargetUph: number;
  lineBWorkHours: number;
  // Operational Notes / Remark
  notes?: string;
  manualOverride?: boolean;
}

export interface ActionItem {
  id: string;
  issue: string;
  rootCause: string;
  action: string;
  owner: string;
  dueDate: string;
  status: 'Open' | 'In Progress' | 'Resolved';
}

export interface OECFilterState {
  plant: string;
  year: number;
  month: string; // 'All' or '2026-09', '2026-10', etc.
  prodLine: string; // 'All' or specific line
  selectedDay?: number | 'All';
  selectedDate?: string; // YYYY-MM-DD
}

export interface PeriodStorageState {
  [periodKey: string]: {
    lines: LineOECData[];
    days: DayColumn[];
    updatedAt?: string;
    note?: string;
  };
}

export interface WebSavedSnapshot {
  id: string;
  title: string;
  savedAt: string;
  year: number;
  month: string;
  plant: string;
  totalPlan: number;
  totalAct: number;
  overallUph: number;
  lines: LineOECData[];
  days: DayColumn[];
  monthlyEfficiency: MonthlyEfficiencyRow[];
  actionItems: ActionItem[];
  extraSheets?: EditableCustomSheet[];
  upphSheet?: UpphSheetData;
  lineIdleSheet?: LineIdleSheetData;
  summaryPerformance?: SummaryPerformanceRow[];
}


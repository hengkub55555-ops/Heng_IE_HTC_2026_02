export type CategoryType = 'Planning' | 'Act' | 'Gap' | 'Work Time' | 'UPH';

export type ActiveSheetTab =
  | 'daily-oec'
  | 'upph-oec'
  | 'daily-trend'
  | 'summary-efficiency'
  | 'sheet-4'
  | 'sheet-5';

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
}


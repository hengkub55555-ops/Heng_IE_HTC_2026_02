export type CategoryType = 'Planning' | 'Act' | 'Gap' | 'Work Time' | 'UPH';

export type ActiveSheetTab = 'daily-oec' | 'summary-efficiency';

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
}


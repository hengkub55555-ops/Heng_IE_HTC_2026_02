import {
  DayColumn,
  DailyValues,
  LineOECData,
  MonthlyEfficiencyRow,
  PeriodStorageState,
  SummaryPerformanceRow,
  UpphLineData,
  UpphMonthlyItem,
  UpphPeriodMatrix,
  UpphSheetData,
} from '../types/oec';

export const UPPH_DEFAULT_TARGETS = {
  lineA: 18.0,
  lineB: 15.0,
  factory: 16.5,
};

/**
 * Baseline daily headcount (Manpower) per production line by month.
 * Total Attendance matches INITIAL_SUMMARY_PERFORMANCE_DATA (202-225),
 * and Sep 2026 matches the original UPPH sheet (Line A = 119, Line B = 93 -> Total 212).
 */
export const MONTH_LINE_HEADCOUNT_DEFAULTS: Record<
  string,
  {
    lineA: { onTheJob: number; attendance: number; targetUpph: number };
    lineB: { onTheJob: number; attendance: number; targetUpph: number };
  }
> = {
  '2026-01': {
    lineA: { onTheJob: 130, attendance: 121, targetUpph: 18.0 },
    lineB: { onTheJob: 99, attendance: 94, targetUpph: 15.0 },
  },
  '2026-02': {
    lineA: { onTheJob: 131, attendance: 122, targetUpph: 18.0 },
    lineB: { onTheJob: 101, attendance: 96, targetUpph: 15.0 },
  },
  '2026-03': {
    lineA: { onTheJob: 132, attendance: 123, targetUpph: 18.0 },
    lineB: { onTheJob: 102, attendance: 97, targetUpph: 15.0 },
  },
  '2026-04': {
    lineA: { onTheJob: 129, attendance: 120, targetUpph: 18.0 },
    lineB: { onTheJob: 99, attendance: 94, targetUpph: 15.0 },
  },
  '2026-05': {
    lineA: { onTheJob: 134, attendance: 125, targetUpph: 18.0 },
    lineB: { onTheJob: 102, attendance: 97, targetUpph: 15.0 },
  },
  '2026-06': {
    lineA: { onTheJob: 135, attendance: 126, targetUpph: 18.0 },
    lineB: { onTheJob: 104, attendance: 99, targetUpph: 15.0 },
  },
  '2026-07': {
    // July: Line A stopped after Day 1 for Retooling; Line B took full capacity
    lineA: { onTheJob: 108, attendance: 104, targetUpph: 18.0 },
    lineB: { onTheJob: 102, attendance: 98, targetUpph: 15.0 },
  },
  '2026-08': {
    lineA: { onTheJob: 130, attendance: 121, targetUpph: 18.0 },
    lineB: { onTheJob: 99, attendance: 94, targetUpph: 15.0 },
  },
  '2026-09': {
    lineA: { onTheJob: 129, attendance: 119, targetUpph: 18.0 },
    lineB: { onTheJob: 97, attendance: 93, targetUpph: 15.0 },
  },
  '2026-10': {
    lineA: { onTheJob: 128, attendance: 119, targetUpph: 18.0 },
    lineB: { onTheJob: 97, attendance: 93, targetUpph: 15.0 },
  },
  '2026-11': {
    lineA: { onTheJob: 128, attendance: 119, targetUpph: 18.0 },
    lineB: { onTheJob: 97, attendance: 93, targetUpph: 15.0 },
  },
};

export const getLineDefaultsForMonth = (monthKey: string, prodLine: string) => {
  const isLineA = prodLine.toLowerCase().includes('a');
  const monthCfg = MONTH_LINE_HEADCOUNT_DEFAULTS[monthKey];
  if (monthCfg) {
    return isLineA ? monthCfg.lineA : monthCfg.lineB;
  }
  return isLineA
    ? { onTheJob: 128, attendance: 119, targetUpph: UPPH_DEFAULT_TARGETS.lineA }
    : { onTheJob: 97, attendance: 93, targetUpph: UPPH_DEFAULT_TARGETS.lineB };
};

/**
 * Core direct daily UPPH formula: Daily Output ÷ Daily Manpower (no other factors)
 */
export const calculateDailyActUpph = (
  act: number | null | undefined,
  manpower: number | null | undefined
): number | null => {
  if (
    act === null ||
    act === undefined ||
    manpower === null ||
    manpower === undefined
  ) {
    return null;
  }
  const a = Number(act);
  const mp = Number(manpower);
  if (!isFinite(a) || !isFinite(mp) || a <= 0 || mp <= 0) {
    return null;
  }
  return Number((a / mp).toFixed(2));
};

export interface LinePeriodUpphSummary {
  totalAct: number;
  totalWorkHours: number;
  uph: number;
  avgOnTheJob: number;
  avgAttendance: number;
  totalManpower: number;
  coveredAct: number;
  coveredManpower: number;
  totalManHours: number;
  totalTargetUpph: number;
  totalActUpph: number;
  dailyActUpph: DailyValues;
}

/**
 * Calculate full period UPPH summary for a line strictly from Daily Output ÷ Daily Manpower.
 * Period UPPH = Sum(Daily Output where Manpower > 0) ÷ Sum(Daily Manpower where Output > 0).
 */
export const calculateLinePeriodUpph = (
  days: DayColumn[],
  oecLine: LineOECData | undefined,
  upphLine: UpphLineData
): LinePeriodUpphSummary => {
  const otjVals: number[] = [];
  const attVals: number[] = [];
  const tgtVals: number[] = [];
  const dailyActUpph: DailyValues = {};

  let totalAct = 0;
  let totalWorkHours = 0;
  let totalManpower = 0;
  let coveredAct = 0;
  let coveredManpower = 0;

  days.forEach(d => {
    const otj = upphLine.onTheJob?.[d.day];
    const att = upphLine.attendance?.[d.day];
    const tgt = upphLine.targetUpph?.[d.day];

    if (otj !== null && otj !== undefined && !isNaN(Number(otj))) {
      otjVals.push(Number(otj));
    }
    if (att !== null && att !== undefined && !isNaN(Number(att)) && Number(att) > 0) {
      attVals.push(Number(att));
      totalManpower += Number(att);
    }
    if (tgt !== null && tgt !== undefined && !isNaN(Number(tgt))) {
      tgtVals.push(Number(tgt));
    }

    const act = oecLine?.act?.[d.day];
    const wt = oecLine?.workTime?.[d.day];
    if (act !== null && act !== undefined && !isNaN(Number(act))) {
      totalAct += Number(act);
    }
    if (wt !== null && wt !== undefined && !isNaN(Number(wt)) && Number(wt) > 0) {
      totalWorkHours += Number(wt);
    }

    if (
      act !== null &&
      act !== undefined &&
      Number(act) > 0 &&
      att !== null &&
      att !== undefined &&
      Number(att) > 0
    ) {
      coveredAct += Number(act);
      coveredManpower += Number(att);
    }

    const dayUpph = calculateDailyActUpph(act, att);
    if (dayUpph !== null) {
      dailyActUpph[d.day] = dayUpph;
    } else if (!oecLine && upphLine.actUpph?.[d.day] != null) {
      dailyActUpph[d.day] = Number(Number(upphLine.actUpph[d.day]).toFixed(2));
    }
  });

  const avgOnTheJob =
    upphLine.totalOnTheJobOverride !== undefined && upphLine.totalOnTheJobOverride !== null
      ? upphLine.totalOnTheJobOverride
      : otjVals.length > 0
      ? Math.round(otjVals.reduce((a, b) => a + b, 0) / otjVals.length)
      : 0;

  const avgAttendance =
    upphLine.totalAttendanceOverride !== undefined && upphLine.totalAttendanceOverride !== null
      ? upphLine.totalAttendanceOverride
      : attVals.length > 0
      ? Math.round(attVals.reduce((a, b) => a + b, 0) / attVals.length)
      : 0;

  const totalTargetUpph =
    upphLine.totalTargetUpphOverride !== undefined &&
    upphLine.totalTargetUpphOverride !== null &&
    upphLine.totalTargetUpphOverride >= 5
      ? upphLine.totalTargetUpphOverride
      : tgtVals.length > 0
      ? Number((tgtVals.reduce((a, b) => a + b, 0) / tgtVals.length).toFixed(2))
      : upphLine.prodLine.toLowerCase().includes('a')
      ? UPPH_DEFAULT_TARGETS.lineA
      : UPPH_DEFAULT_TARGETS.lineB;

  const uph = totalWorkHours > 0 ? Math.round(totalAct / totalWorkHours) : 0;

  let totalActUpph = 0;
  if (upphLine.totalActUpphOverride !== undefined && upphLine.totalActUpphOverride !== null) {
    totalActUpph = Number(upphLine.totalActUpphOverride);
  } else if (coveredAct > 0 && coveredManpower > 0) {
    // Exact Sum(Daily Output) / Sum(Daily Manpower)
    totalActUpph = Number((coveredAct / coveredManpower).toFixed(2));
  } else if (totalAct > 0 && totalManpower > 0) {
    totalActUpph = Number((totalAct / totalManpower).toFixed(2));
  } else {
    const fallbackVals = Object.values(dailyActUpph).filter(
      (v): v is number => v !== null && v !== undefined && !isNaN(Number(v))
    );
    if (fallbackVals.length > 0) {
      totalActUpph = Number(
        (fallbackVals.reduce((a, b) => a + Number(b), 0) / fallbackVals.length).toFixed(2)
      );
    }
  }

  return {
    totalAct,
    totalWorkHours,
    uph,
    avgOnTheJob,
    avgAttendance,
    totalManpower,
    coveredAct,
    coveredManpower,
    totalManHours: totalManpower,
    totalTargetUpph,
    totalActUpph,
    dailyActUpph,
  };
};

/**
 * Synchronize or generate a UPPH matrix (days + lines) for a specific month from its Daily OEC data.
 * Preserves existing user Manpower edits per day while populating missing working days
 * and recalculating Act UPPH = Daily Output ÷ Daily Manpower.
 */
export const buildUpphMatrixForPeriod = (
  monthKey: string,
  oecDays: DayColumn[],
  oecLines: LineOECData[],
  existingMatrix?: UpphPeriodMatrix
): UpphPeriodMatrix => {
  const days = oecDays.length > 0 ? oecDays : existingMatrix?.days || [];
  const sourceLines = oecLines.length > 0 ? oecLines : [];

  const upphLines: UpphLineData[] = sourceLines.map(oecLine => {
    const existingLine = existingMatrix?.lines?.find(
      l => l.id === oecLine.id || l.prodLine.toLowerCase() === oecLine.prodLine.toLowerCase()
    );
    const defaults = getLineDefaultsForMonth(monthKey, oecLine.prodLine);

    const onTheJob: DailyValues = {};
    const attendance: DailyValues = {};
    const targetUpph: DailyValues = {};
    const actUpph: DailyValues = {};

    days.forEach(d => {
      const day = d.day;
      const actVal = oecLine.act?.[day];
      const hasProduction = actVal !== null && actVal !== undefined && Number(actVal) > 0;

      const prevOtj = existingLine?.onTheJob?.[day];
      const prevAtt = existingLine?.attendance?.[day];
      const prevTgt = existingLine?.targetUpph?.[day];

      if (prevOtj !== undefined) {
        onTheJob[day] = prevOtj;
      } else if (hasProduction) {
        onTheJob[day] = defaults.onTheJob;
      }

      if (prevAtt !== undefined) {
        attendance[day] = prevAtt;
      } else if (hasProduction) {
        attendance[day] = defaults.attendance;
      }

      // Upgrade stale old per-hour target (< 5) to direct Output/Manpower target
      targetUpph[day] =
        prevTgt !== undefined && prevTgt !== null && Number(prevTgt) >= 5
          ? prevTgt
          : defaults.targetUpph;

      const calcUpph = calculateDailyActUpph(actVal, attendance[day]);
      if (calcUpph !== null) {
        actUpph[day] = calcUpph;
      } else if (existingLine?.actUpph?.[day] !== undefined) {
        actUpph[day] = null;
      }
    });

    const prevTargetOverride = existingLine?.totalTargetUpphOverride;
    return {
      id: oecLine.id,
      plant: oecLine.plant,
      prodLine: oecLine.prodLine,
      onTheJob,
      attendance,
      targetUpph,
      actUpph,
      totalOnTheJobOverride: null,
      totalAttendanceOverride: null,
      totalTargetUpphOverride:
        prevTargetOverride !== undefined && prevTargetOverride !== null && prevTargetOverride >= 5
          ? prevTargetOverride
          : null,
      totalActUpphOverride: null,
    };
  });

  return {
    days,
    lines: upphLines,
    updatedAt: existingMatrix?.updatedAt || new Date().toISOString(),
  };
};

/**
 * Rebuild monthlyData (Line A/B Prod & UPPH) across all months strictly from Daily OEC Output ÷ Daily Manpower.
 */
export const computeAllMonthsUpph = (
  periodData: PeriodStorageState,
  monthlyEfficiency: MonthlyEfficiencyRow[],
  upphSheet?: UpphSheetData
): {
  monthlyData: UpphMonthlyItem[];
  periodMatrices: Record<string, UpphPeriodMatrix>;
} => {
  const monthKeys = new Set<string>();
  Object.keys(periodData || {}).forEach(k => monthKeys.add(k));
  (monthlyEfficiency || []).forEach(m => monthKeys.add(m.month));
  (upphSheet?.monthlyData || []).forEach(m => monthKeys.add(m.month));

  const sortedMonths = Array.from(monthKeys)
    .filter(m => /^\d{4}-\d{2}$/.test(m))
    .sort((a, b) => a.localeCompare(b));

  const periodMatrices: Record<string, UpphPeriodMatrix> = {};
  const monthlyData: UpphMonthlyItem[] = [];

  sortedMonths.forEach(monthKey => {
    const oecEntry = periodData[monthKey];
    const effRow = monthlyEfficiency.find(m => m.month === monthKey);
    const existingMatrix =
      upphSheet?.periodMatrices?.[monthKey] ||
      (upphSheet?.activeMonth === monthKey
        ? { days: upphSheet.days, lines: upphSheet.lines }
        : monthKey === '2026-09' && upphSheet?.lines?.length
        ? { days: upphSheet.days, lines: upphSheet.lines }
        : undefined);

    if (oecEntry && oecEntry.lines?.length > 0 && oecEntry.days?.length > 0) {
      const matrix = buildUpphMatrixForPeriod(
        monthKey,
        oecEntry.days,
        oecEntry.lines,
        existingMatrix
      );
      periodMatrices[monthKey] = matrix;

      const oecA =
        oecEntry.lines.find(l => l.prodLine.toLowerCase().includes('a')) || oecEntry.lines[0];
      const oecB =
        oecEntry.lines.find(l => l.prodLine.toLowerCase().includes('b')) || oecEntry.lines[1];
      const upphA =
        matrix.lines.find(l => l.prodLine.toLowerCase().includes('a')) || matrix.lines[0];
      const upphB =
        matrix.lines.find(l => l.prodLine.toLowerCase().includes('b')) || matrix.lines[1];

      const sumA = upphA ? calculateLinePeriodUpph(matrix.days, oecA, upphA) : null;
      const sumB = upphB ? calculateLinePeriodUpph(matrix.days, oecB, upphB) : null;

      monthlyData.push({
        month: monthKey,
        prodLineA: sumA ? sumA.totalAct : effRow?.lineAAct || 0,
        prodLineB: sumB ? sumB.totalAct : effRow?.lineBAct || 0,
        upphLineA: sumA ? sumA.totalActUpph : 0,
        upphLineB: sumB ? sumB.totalActUpph : 0,
      });
    } else if (effRow) {
      const defA = getLineDefaultsForMonth(monthKey, 'Line A');
      const defB = getLineDefaultsForMonth(monthKey, 'Line B');
      const upphA =
        defA.attendance > 0 ? Number((effRow.lineAAct / defA.attendance).toFixed(2)) : 0;
      const upphB =
        defB.attendance > 0 ? Number((effRow.lineBAct / defB.attendance).toFixed(2)) : 0;
      monthlyData.push({
        month: monthKey,
        prodLineA: effRow.lineAAct,
        prodLineB: effRow.lineBAct,
        upphLineA: upphA,
        upphLineB: upphB,
      });
    }
  });

  return { monthlyData, periodMatrices };
};

/**
 * Recalculate an entire UpphSheetData object from Daily OEC periodData + monthlyEfficiency,
 * keeping the currently selected month matrix synchronized cleanly.
 */
export const syncUpphSheetWithDailyOec = (
  currentSheet: UpphSheetData,
  periodData: PeriodStorageState,
  monthlyEfficiency: MonthlyEfficiencyRow[],
  targetMonthKey?: string
): UpphSheetData => {
  const activeMonth = targetMonthKey || currentSheet.activeMonth || '2026-09';
  const { monthlyData, periodMatrices } = computeAllMonthsUpph(
    periodData,
    monthlyEfficiency,
    currentSheet
  );

  const activeMatrix = periodMatrices[activeMonth] || {
    days: currentSheet.days,
    lines: currentSheet.lines,
  };

  return {
    ...currentSheet,
    activeMonth,
    days: activeMatrix.days,
    lines: activeMatrix.lines,
    monthlyData,
    periodMatrices,
    updatedAt: new Date().toISOString(),
  };
};

/**
 * Synchronize SummaryPerformanceRow[] UPPH fields & UPH fields with Daily OEC and UPPH Sheet.
 */
export const syncSummaryPerformanceWithOecAndUpph = (
  rows: SummaryPerformanceRow[],
  periodData: PeriodStorageState,
  monthlyEfficiency: MonthlyEfficiencyRow[],
  upphSheet: UpphSheetData
): SummaryPerformanceRow[] => {
  return rows.map(row => {
    const oecEntry = periodData[row.period];
    const effMatch = monthlyEfficiency.find(m => m.month === row.period);
    const upphMatch = upphSheet.monthlyData?.find(m => m.month === row.period);
    const matrix = upphSheet.periodMatrices?.[row.period];

    const next = { ...row };
    if (!next.targetUpph || next.targetUpph < 5) {
      next.targetUpph = UPPH_DEFAULT_TARGETS.factory;
    }

    if (oecEntry && oecEntry.lines?.length > 0 && oecEntry.days?.length > 0) {
      const oecA =
        oecEntry.lines.find(l => l.prodLine.toLowerCase().includes('a')) || oecEntry.lines[0];
      const oecB =
        oecEntry.lines.find(l => l.prodLine.toLowerCase().includes('b')) || oecEntry.lines[1];

      let aPlan = 0, aAct = 0, aHrs = 0;
      let bPlan = 0, bAct = 0, bHrs = 0;

      oecEntry.days.forEach(d => {
        if (oecA?.planning?.[d.day] != null) aPlan += Number(oecA.planning[d.day]);
        if (oecA?.act?.[d.day] != null) aAct += Number(oecA.act[d.day]);
        if (oecA?.workTime?.[d.day] != null) aHrs += Number(oecA.workTime[d.day]);

        if (oecB?.planning?.[d.day] != null) bPlan += Number(oecB.planning[d.day]);
        if (oecB?.act?.[d.day] != null) bAct += Number(oecB.act[d.day]);
        if (oecB?.workTime?.[d.day] != null) bHrs += Number(oecB.workTime[d.day]);
      });

      next.totalPlan = aPlan + bPlan;
      next.totalAct = aAct + bAct;
      next.workHours = aHrs + bHrs;
      next.lineAUph = aHrs > 0 ? Math.round(aAct / aHrs) : next.lineAUph;
      next.lineBUph = bHrs > 0 ? Math.round(bAct / bHrs) : next.lineBUph;
      next.avgUph =
        next.workHours > 0 ? Math.round(next.totalAct / next.workHours) : next.avgUph;
    } else if (effMatch) {
      next.totalPlan = Number(effMatch.lineAPlan || 0) + Number(effMatch.lineBPlan || 0);
      next.totalAct = Number(effMatch.lineAAct || 0) + Number(effMatch.lineBAct || 0);
      next.workHours =
        Number(effMatch.lineAWorkHours || 0) + Number(effMatch.lineBWorkHours || 0);
      next.lineAUph = effMatch.lineAUph;
      next.lineBUph = effMatch.lineBUph;
      next.avgUph =
        next.workHours > 0
          ? Math.round(next.totalAct / next.workHours)
          : Math.round((effMatch.lineAUph + effMatch.lineBUph) / 2);
    }

    if (upphMatch) {
      next.lineAUpph = upphMatch.upphLineA;
      next.lineBUpph = upphMatch.upphLineB;

      // Plant UPPH = Total Output / Total Manpower across Line A + Line B
      if (matrix && oecEntry) {
        const oecA =
          oecEntry.lines.find(l => l.prodLine.toLowerCase().includes('a')) || oecEntry.lines[0];
        const oecB =
          oecEntry.lines.find(l => l.prodLine.toLowerCase().includes('b')) || oecEntry.lines[1];
        const uA =
          matrix.lines.find(l => l.prodLine.toLowerCase().includes('a')) || matrix.lines[0];
        const uB =
          matrix.lines.find(l => l.prodLine.toLowerCase().includes('b')) || matrix.lines[1];
        const sumA = uA ? calculateLinePeriodUpph(matrix.days, oecA, uA) : null;
        const sumB = uB ? calculateLinePeriodUpph(matrix.days, oecB, uB) : null;
        const totCoveredMp =
          (sumA?.coveredManpower || sumA?.totalManpower || 0) +
          (sumB?.coveredManpower || sumB?.totalManpower || 0);
        const totCoveredAct =
          (sumA?.coveredAct || sumA?.totalAct || 0) +
          (sumB?.coveredAct || sumB?.totalAct || 0);
        if (totCoveredMp > 0) {
          next.avgUpph = Number((totCoveredAct / totCoveredMp).toFixed(2));
        } else {
          next.avgUpph = Number(((upphMatch.upphLineA + upphMatch.upphLineB) / 2).toFixed(2));
        }
        if (sumA && sumB) {
          next.attendance = sumA.avgAttendance + sumB.avgAttendance;
        }
      } else {
        next.avgUpph = Number(((upphMatch.upphLineA + upphMatch.upphLineB) / 2).toFixed(2));
      }
    }

    return next;
  });
};

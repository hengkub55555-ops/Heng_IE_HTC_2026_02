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
  lineA: 1.22,
  lineB: 0.96,
  factory: 1.09,
};

/**
 * Baseline headcount (On-the-job / Attendance) per production line by month.
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
    lineA: { onTheJob: 130, attendance: 121, targetUpph: 1.22 },
    lineB: { onTheJob: 99, attendance: 94, targetUpph: 0.96 },
  },
  '2026-02': {
    lineA: { onTheJob: 131, attendance: 122, targetUpph: 1.22 },
    lineB: { onTheJob: 101, attendance: 96, targetUpph: 0.96 },
  },
  '2026-03': {
    lineA: { onTheJob: 132, attendance: 123, targetUpph: 1.22 },
    lineB: { onTheJob: 102, attendance: 97, targetUpph: 0.96 },
  },
  '2026-04': {
    lineA: { onTheJob: 129, attendance: 120, targetUpph: 1.22 },
    lineB: { onTheJob: 99, attendance: 94, targetUpph: 0.96 },
  },
  '2026-05': {
    lineA: { onTheJob: 134, attendance: 125, targetUpph: 1.22 },
    lineB: { onTheJob: 102, attendance: 97, targetUpph: 0.96 },
  },
  '2026-06': {
    lineA: { onTheJob: 135, attendance: 126, targetUpph: 1.22 },
    lineB: { onTheJob: 104, attendance: 99, targetUpph: 0.96 },
  },
  '2026-07': {
    // July: Line A stopped after Day 1 for Retooling; Line B took full capacity
    lineA: { onTheJob: 108, attendance: 104, targetUpph: 1.22 },
    lineB: { onTheJob: 102, attendance: 98, targetUpph: 0.96 },
  },
  '2026-08': {
    lineA: { onTheJob: 130, attendance: 121, targetUpph: 1.22 },
    lineB: { onTheJob: 99, attendance: 94, targetUpph: 0.96 },
  },
  '2026-09': {
    lineA: { onTheJob: 129, attendance: 119, targetUpph: 1.22 },
    lineB: { onTheJob: 97, attendance: 93, targetUpph: 0.96 },
  },
  '2026-10': {
    lineA: { onTheJob: 128, attendance: 119, targetUpph: 1.22 },
    lineB: { onTheJob: 97, attendance: 93, targetUpph: 0.96 },
  },
  '2026-11': {
    lineA: { onTheJob: 128, attendance: 119, targetUpph: 1.22 },
    lineB: { onTheJob: 97, attendance: 93, targetUpph: 0.96 },
  },
};

export const getLineDefaultsForMonth = (monthKey: string, prodLine: string) => {
  const isLineA = prodLine.toLowerCase().includes('a');
  const monthCfg = MONTH_LINE_HEADCOUNT_DEFAULTS[monthKey];
  if (monthCfg) {
    return isLineA ? monthCfg.lineA : monthCfg.lineB;
  }
  return isLineA
    ? { onTheJob: 128, attendance: 119, targetUpph: 1.22 }
    : { onTheJob: 97, attendance: 93, targetUpph: 0.96 };
};

/**
 * Core daily UPPH formula: Act / (WorkTime * Attendance)
 */
export const calculateDailyActUpph = (
  act: number | null | undefined,
  workTime: number | null | undefined,
  attendance: number | null | undefined
): number | null => {
  if (
    act === null ||
    act === undefined ||
    workTime === null ||
    workTime === undefined ||
    attendance === null ||
    attendance === undefined
  ) {
    return null;
  }
  const a = Number(act);
  const wt = Number(workTime);
  const att = Number(attendance);
  if (!isFinite(a) || !isFinite(wt) || !isFinite(att) || wt <= 0 || att <= 0 || a <= 0) {
    return null;
  }
  return Number((a / (wt * att)).toFixed(2));
};

export interface LinePeriodUpphSummary {
  totalAct: number;
  totalWorkHours: number;
  uph: number;
  avgOnTheJob: number;
  avgAttendance: number;
  totalManHours: number;
  totalTargetUpph: number;
  totalActUpph: number;
  dailyActUpph: DailyValues;
}

/**
 * Calculate full period UPPH summary for a line strictly from its Daily OEC data & UPPH attendance.
 * Period UPPH = Total Act / Total Man-Hours (where Man-Hours = sum(WorkTime_d * Attendance_d)),
 * falling back to Total Act / (Total WorkHours * Avg Attendance) when daily attendance is uniform or partial.
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
  let totalManHours = 0;
  let hoursCoveredByAtt = 0;

  days.forEach(d => {
    const otj = upphLine.onTheJob?.[d.day];
    const att = upphLine.attendance?.[d.day];
    const tgt = upphLine.targetUpph?.[d.day];

    if (otj !== null && otj !== undefined && !isNaN(Number(otj))) {
      otjVals.push(Number(otj));
    }
    if (att !== null && att !== undefined && !isNaN(Number(att)) && Number(att) > 0) {
      attVals.push(Number(att));
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
      if (att !== null && att !== undefined && Number(att) > 0) {
        totalManHours += Number(wt) * Number(att);
        hoursCoveredByAtt += Number(wt);
      }
    }

    const dayUpph = calculateDailyActUpph(act, wt, att);
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
    upphLine.totalTargetUpphOverride !== undefined && upphLine.totalTargetUpphOverride !== null
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
  } else if (totalAct > 0 && hoursCoveredByAtt > 0 && hoursCoveredByAtt === totalWorkHours && totalManHours > 0) {
    // True Total Units / Total Direct Man-Hours
    totalActUpph = Number((totalAct / totalManHours).toFixed(2));
  } else if (totalAct > 0 && totalWorkHours > 0 && avgAttendance > 0) {
    totalActUpph = Number((totalAct / (totalWorkHours * avgAttendance)).toFixed(2));
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
    totalManHours: Number(totalManHours.toFixed(1)),
    totalTargetUpph,
    totalActUpph,
    dailyActUpph,
  };
};

/**
 * Synchronize or generate a UPPH matrix (days + lines) for a specific month from its Daily OEC data.
 * Preserves existing user attendance / targetUpph edits per day while populating missing working days
 * and recalculating Act UPPH(实际) = Daily Act / (WorkTime * Attendance).
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
      const wtVal = oecLine.workTime?.[day];
      const hasProduction =
        (actVal !== null && actVal !== undefined && Number(actVal) > 0) ||
        (wtVal !== null && wtVal !== undefined && Number(wtVal) > 0);

      const prevOtj = existingLine?.onTheJob?.[day];
      const prevAtt = existingLine?.attendance?.[day];
      const prevTgt = existingLine?.targetUpph?.[day];

      if (prevOtj !== undefined) {
        onTheJob[day] = prevOtj;
      } else if (hasProduction) {
        onTheJob[day] = defaults.onTheJob;
      }

      if (prevAtt !== undefined && prevAtt !== null) {
        attendance[day] = prevAtt;
      } else if (hasProduction) {
        attendance[day] = defaults.attendance;
      }

      targetUpph[day] =
        prevTgt !== undefined && prevTgt !== null ? prevTgt : defaults.targetUpph;

      const calcUpph = calculateDailyActUpph(actVal, wtVal, attendance[day]);
      if (calcUpph !== null) {
        actUpph[day] = calcUpph;
      } else if (existingLine?.actUpph?.[day] !== undefined && !hasProduction) {
        actUpph[day] = null;
      }
    });

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
      totalTargetUpphOverride: existingLine?.totalTargetUpphOverride ?? null,
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
 * Rebuild monthlyData (Line A/B Prod & UPPH) across all months strictly from Daily OEC periodData + monthlyEfficiency + per-month matrices.
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
        effRow.lineAWorkHours > 0 && defA.attendance > 0
          ? Number((effRow.lineAAct / (effRow.lineAWorkHours * defA.attendance)).toFixed(2))
          : 0;
      const upphB =
        effRow.lineBWorkHours > 0 && defB.attendance > 0
          ? Number((effRow.lineBAct / (effRow.lineBWorkHours * defB.attendance)).toFixed(2))
          : 0;
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

      // Compute weighted factory UPPH = Total Act / Total Man-Hours across Line A + Line B
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
        const totManHrs = (sumA?.totalManHours || 0) + (sumB?.totalManHours || 0);
        const totAct = (sumA?.totalAct || 0) + (sumB?.totalAct || 0);
        if (totManHrs > 0) {
          next.avgUpph = Number((totAct / totManHrs).toFixed(2));
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

import type {
  GasCylinderRecord,
  MonthlyBillData,
  MonthlySummary,
  ResidentMonthlyTotal,
  UtilityBill,
  UtilityResidentShare,
  UtilitySummary,
} from './types.js';

/**
 * Returns all ISO date strings (YYYY-MM-DD) in [start, end] inclusive.
 */
export function getUtilityDateRange(periodStart: string, periodEnd: string): string[] {
  const dates: string[] = [];
  const current = new Date(periodStart + 'T00:00:00Z');
  const end = new Date(periodEnd + 'T00:00:00Z');

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

/**
 * Sum of all resident weights for a specific day across the given residents.
 */
export function getDailyTotalWeight(
  date: string,
  residents: MonthlyBillData['residents'],
): number {
  return residents.reduce((sum, r) => {
    const w = r.days[date];
    return sum + (w != null ? w : 0);
  }, 0);
}

/**
 * Sum of a single resident's daily weights across the utility billing window.
 */
export function getResidentWeightedParts(
  resident: string,
  utility: UtilityBill,
  residents: MonthlyBillData['residents'],
): number {
  const dates = getUtilityDateRange(utility.periodStart, utility.periodEnd);
  const residentData = residents.find((r) => r.resident === resident);
  if (!residentData) return 0;

  return dates.reduce((sum, date) => {
    const w = residentData.days[date];
    return sum + (w != null ? w : 0);
  }, 0);
}

/**
 * Total weighted parts for a utility (sum of all resident weights across the billing window).
 */
export function getUtilityTotalParts(
  utility: UtilityBill,
  residents: MonthlyBillData['residents'],
): number {
  const dates = getUtilityDateRange(utility.periodStart, utility.periodEnd);
  return dates.reduce((sum, date) => sum + getDailyTotalWeight(date, residents), 0);
}

/**
 * Euro cost per weighted part for a utility.
 */
export function getUtilityEuroPerPart(
  utility: UtilityBill,
  residents: MonthlyBillData['residents'],
): number {
  const totalParts = getUtilityTotalParts(utility, residents);
  if (totalParts === 0) return 0;
  return utility.total / totalParts;
}

/**
 * A resident's share of a single utility bill in euros (weighted daily split).
 */
export function getResidentUtilityShare(
  resident: string,
  utility: UtilityBill,
  residents: MonthlyBillData['residents'],
): number {
  const euroPerPart = getUtilityEuroPerPart(utility, residents);
  const weightedParts = getResidentWeightedParts(resident, utility, residents);
  return weightedParts * euroPerPart;
}

/**
 * Full derived summary for a utility using weighted daily split (electricity, water, pipe-gas).
 */
export function buildUtilitySummary(
  utility: UtilityBill,
  residents: MonthlyBillData['residents'],
): UtilitySummary {
  const totalParts = getUtilityTotalParts(utility, residents);
  const euroPerPart = totalParts === 0 ? 0 : utility.total / totalParts;

  const residentShares: UtilityResidentShare[] = residents
    .filter((r) => r.resident !== 'null')
    .map((r) => {
      const weightedParts = getResidentWeightedParts(r.resident, utility, residents);
      return {
        resident: r.resident,
        weightedParts,
        share: weightedParts * euroPerPart,
      };
    });

  return { utility, totalParts, euroPerPart, residentShares, isCylinderSplit: false };
}

/**
 * Full derived summary for a cylinder-gas bill: equal split among all active residents.
 * weightedParts is set to 1 for every resident (each counts equally).
 */
export function buildCylinderGasSummary(
  utility: UtilityBill,
  residents: MonthlyBillData['residents'],
): UtilitySummary {
  const active = residents.filter((r) => r.resident !== 'null');
  const count = active.length;
  const share = count > 0 ? utility.total / count : 0;

  const residentShares: UtilityResidentShare[] = active.map((r) => ({
    resident: r.resident,
    weightedParts: 1,
    share,
  }));

  return {
    utility,
    totalParts: count,
    euroPerPart: share, // = share per person, since each has weight 1
    residentShares,
    isCylinderSplit: true,
  };
}

/**
 * Per-person monthly totals including internet split.
 */
export function getMonthlyResidentTotal(
  resident: string,
  data: MonthlyBillData,
  utilitySummaries: UtilitySummary[],
): ResidentMonthlyTotal {
  const activeResidents = data.residents.filter((r) => r.resident !== 'null');
  const residentCount = activeResidents.length;
  const internetShare =
    data.internetFixedCost != null && residentCount > 0
      ? data.internetFixedCost / residentCount
      : 0;

  const findShare = (type: UtilityBill['type']): number => {
    const summary = utilitySummaries.find((u) => u.utility.type === type);
    if (!summary) return 0;
    return summary.residentShares.find((r) => r.resident === resident)?.share ?? 0;
  };

  const electricityShare = findShare('electricity');
  const gasShare = findShare('gas');
  const waterShare = findShare('water');
  const total = electricityShare + gasShare + waterShare + internetShare;

  return { resident, electricityShare, gasShare, waterShare, internetShare, total };
}

/**
 * Full derived monthly summary including all utilities and per-person totals.
 * Automatically selects cylinder vs weighted split for gas based on gasType.
 */
export function buildMonthlySummary(data: MonthlyBillData): MonthlySummary {
  const isCylinder = (data.gasType ?? 'cylinder') === 'cylinder';

  const utilitySummaries = data.utilities.map((u) => {
    if (u.type === 'gas' && isCylinder) {
      return buildCylinderGasSummary(u, data.residents);
    }
    return buildUtilitySummary(u, data.residents);
  });

  const activeResidents = data.residents
    .filter((r) => r.resident !== 'null')
    .map((r) => r.resident);

  const residentTotals = activeResidents.map((resident) =>
    getMonthlyResidentTotal(resident, data, utilitySummaries),
  );

  const getUtilityTotal = (type: UtilityBill['type']): number =>
    data.utilities.find((u) => u.type === type)?.total ?? 0;

  const electricityTotal = getUtilityTotal('electricity');
  const gasTotal = getUtilityTotal('gas');
  const waterTotal = getUtilityTotal('water');
  const internetTotal = data.internetFixedCost ?? 0;
  const grandTotal = electricityTotal + gasTotal + waterTotal + internetTotal;

  return {
    monthId: data.monthId,
    monthLabel: data.monthLabel,
    electricityTotal,
    gasTotal,
    waterTotal,
    internetTotal,
    grandTotal,
    utilitySummaries,
    residentTotals,
  };
}

/**
 * Returns a flat list of all cylinder records across all months, sorted by installDate.
 * Only includes months with gasType 'cylinder' (default when absent) that have gasCylinders.
 * Duration = installDate(next record) − installDate(current record).
 * Months with multiple cylinders produce multiple records; labels become "Março·2", etc.
 */
export function getGasCylinderRecords(months: MonthlyBillData[]): GasCylinderRecord[] {
  // Flatten all cylinder entries across all cylinder-type months
  const flat: Array<{
    monthId: string;
    monthLabel: string;
    cylinderIndex: number;
    buyDate: string | null;
    installDate: string;
  }> = [];

  for (const m of months) {
    if ((m.gasType ?? 'cylinder') !== 'cylinder') continue;
    const cylinders = m.gasCylinders ?? [];
    const withDate = cylinders.filter((c) => c.installDate);
    for (let i = 0; i < withDate.length; i++) {
      const c = withDate[i]!;
      flat.push({
        monthId: m.monthId,
        monthLabel: m.monthLabel,
        cylinderIndex: i,
        buyDate: c.buyDate ?? null,
        installDate: c.installDate!,
      });
    }
  }

  // Sort globally by installDate so durations are always between consecutive installs
  flat.sort((a, b) => a.installDate.localeCompare(b.installDate));

  // Count how many cylinders each month has (to decide label suffix)
  const countPerMonth: Record<string, number> = {};
  for (const r of flat) countPerMonth[r.monthId] = (countPerMonth[r.monthId] ?? 0) + 1;

  // Track per-month occurrence index for labelling
  const seenPerMonth: Record<string, number> = {};

  return flat.map((r, i) => {
    seenPerMonth[r.monthId] = (seenPerMonth[r.monthId] ?? 0) + 1;
    const occurrence = seenPerMonth[r.monthId]!;
    const total = countPerMonth[r.monthId]!;
    const shortLabel = r.monthLabel.split(' ')[0]!;
    const chartLabel = total > 1 ? `${shortLabel}·${occurrence}` : shortLabel;

    const next = flat[i + 1];
    let durationDays: number | null = null;
    if (next) {
      const ms =
        new Date(next.installDate + 'T00:00:00Z').getTime() -
        new Date(r.installDate + 'T00:00:00Z').getTime();
      durationDays = Math.round(ms / (1000 * 60 * 60 * 24));
    }

    return {
      monthId: r.monthId,
      monthLabel: r.monthLabel,
      cylinderIndex: r.cylinderIndex,
      chartLabel,
      buyDate: r.buyDate,
      installDate: r.installDate,
      durationDays,
    };
  });
}

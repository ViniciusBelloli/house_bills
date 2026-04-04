import type {
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
 * A resident's share of a single utility bill in euros.
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
 * Full derived summary for a single utility, including per-resident shares.
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

  return { utility, totalParts, euroPerPart, residentShares };
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
 */
export function buildMonthlySummary(data: MonthlyBillData): MonthlySummary {
  const utilitySummaries = data.utilities.map((u) =>
    buildUtilitySummary(u, data.residents),
  );

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

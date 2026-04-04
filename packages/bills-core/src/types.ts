import { z } from 'zod';

export type ResidentName = string;
export type UtilityType = 'electricity' | 'gas' | 'water';
export type GasType = 'cylinder' | 'pipe';

export const UtilityBillSchema = z.object({
  type: z.enum(['electricity', 'gas', 'water']),
  label: z.string(),
  total: z.number(),
  periodStart: z.string(), // ISO date YYYY-MM-DD
  periodEnd: z.string(),   // ISO date YYYY-MM-DD
  notes: z.string().nullable().optional(),
});
export type UtilityBill = z.infer<typeof UtilityBillSchema>;

export const ResidentDailyWeightsSchema = z.object({
  resident: z.string(),
  days: z.record(z.string(), z.number().nullable()),
});
export type ResidentDailyWeights = z.infer<typeof ResidentDailyWeightsSchema>;

/**
 * One physical gas cylinder purchase within a month.
 * A month can have multiple (e.g. two cylinders bought in March).
 */
export const GasCylinderEntrySchema = z.object({
  total: z.number(),                             // cost of this cylinder
  buyDate: z.string().nullable().optional(),     // ISO date — when purchased at shop
  installDate: z.string().nullable().optional(), // ISO date — when connected at home
  notes: z.string().nullable().optional(),
});
export type GasCylinderEntry = z.infer<typeof GasCylinderEntrySchema>;

export const MonthlyBillDataSchema = z.object({
  monthId: z.string(),
  monthLabel: z.string(),
  utilities: z.array(UtilityBillSchema),
  residents: z.array(ResidentDailyWeightsSchema),
  internetFixedCost: z.number().nullable().optional(),

  // 'cylinder' → equal split; 'pipe' → weighted daily split.
  // Defaults to 'cylinder' when absent.
  gasType: z.enum(['cylinder', 'pipe']).optional(),

  // Cylinder purchases this month (cylinder type only).
  // The gas utility total should equal the sum of these totals.
  gasCylinders: z.array(GasCylinderEntrySchema).optional(),
});
export type MonthlyBillData = z.infer<typeof MonthlyBillDataSchema>;

// --- Derived types ---

export interface UtilityResidentShare {
  resident: ResidentName;
  weightedParts: number;
  share: number;
}

export interface UtilitySummary {
  utility: UtilityBill;
  totalParts: number;
  euroPerPart: number;
  residentShares: UtilityResidentShare[];
  isCylinderSplit: boolean;
}

export interface ResidentMonthlyTotal {
  resident: ResidentName;
  electricityShare: number;
  gasShare: number;
  waterShare: number;
  internetShare: number;
  total: number;
}

export interface MonthlySummary {
  monthId: string;
  monthLabel: string;
  electricityTotal: number;
  gasTotal: number;
  waterTotal: number;
  internetTotal: number;
  grandTotal: number;
  utilitySummaries: UtilitySummary[];
  residentTotals: ResidentMonthlyTotal[];
}

/**
 * One cylinder's record used in the duration chart.
 * Multiple records can share the same monthId when a month has >1 cylinder.
 */
export interface GasCylinderRecord {
  monthId: string;
  monthLabel: string;
  cylinderIndex: number;  // 0-based within the month
  chartLabel: string;     // e.g. "Março" or "Março·2"
  buyDate: string | null;
  installDate: string;
  durationDays: number | null;
}

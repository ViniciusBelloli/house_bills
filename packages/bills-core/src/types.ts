import { z } from 'zod';

export type ResidentName = string;

export type UtilityType = 'electricity' | 'gas' | 'water';

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
  // ISO date string -> weight (null = not present that day)
  days: z.record(z.string(), z.number().nullable()),
});
export type ResidentDailyWeights = z.infer<typeof ResidentDailyWeightsSchema>;

export const MonthlyBillDataSchema = z.object({
  monthId: z.string(),    // e.g. "2026-03"
  monthLabel: z.string(), // e.g. "Março 2026"
  utilities: z.array(UtilityBillSchema),
  residents: z.array(ResidentDailyWeightsSchema),
  internetFixedCost: z.number().nullable().optional(),
});
export type MonthlyBillData = z.infer<typeof MonthlyBillDataSchema>;

// --- Derived types ---

export interface UtilityResidentShare {
  resident: ResidentName;
  weightedParts: number;
  share: number; // euros
}

export interface UtilitySummary {
  utility: UtilityBill;
  totalParts: number;
  euroPerPart: number;
  residentShares: UtilityResidentShare[];
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

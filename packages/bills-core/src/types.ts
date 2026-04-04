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

  // Gas billing method for this month.
  // 'cylinder' → equal split among all residents, track cylinder dates.
  // 'pipe'     → weighted daily split (same logic as electricity/water).
  // Defaults to 'cylinder' when absent (backward-compatible with imported data).
  gasType: z.enum(['cylinder', 'pipe']).optional(),

  // Cylinder-only fields.
  // buyDate     = when the cylinder was purchased at the shop.
  // installDate = when it was connected/opened at home.
  // Duration of a cylinder = installDate(next) - installDate(current).
  gasCylinderBuyDate: z.string().nullable().optional(),     // ISO date
  gasCylinderInstallDate: z.string().nullable().optional(), // ISO date
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
  /** true when this is a cylinder-gas equal split (weightedParts = 1 for everyone) */
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

export interface GasCylinderRecord {
  monthId: string;
  monthLabel: string;
  buyDate: string | null;
  installDate: string;          // ISO date — used as the anchor for duration
  durationDays: number | null;  // null = next cylinder not yet recorded
}

import { MonthlyBillDataSchema, type MonthlyBillData } from '@house-bills/bills-core';

// Vite's import.meta.glob loads all JSON data files at build time.
// Path is relative from this file → apps/web/src/hooks → ../../../../data/months/
const monthFiles = import.meta.glob<{ default: unknown }>('../../../../data/months/*.json', {
  eager: true,
});

export function useAllMonthlyData(): MonthlyBillData[] {
  return Object.values(monthFiles)
    .map((mod) => MonthlyBillDataSchema.safeParse(mod.default))
    .filter((r) => r.success)
    .map((r) => r.data)
    .sort((a, b) => a.monthId.localeCompare(b.monthId));
}

export function useMonthlyData(monthId: string): MonthlyBillData | null {
  const all = useAllMonthlyData();
  return all.find((m) => m.monthId === monthId) ?? null;
}

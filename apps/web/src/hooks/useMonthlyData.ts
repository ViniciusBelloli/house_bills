import { useDataContext } from '@/context/DataContext';
import type { MonthlyBillData } from '@house-bills/bills-core';

export function useAllMonthlyData(): MonthlyBillData[] {
  return useDataContext().months;
}

export function useMonthlyData(monthId: string): MonthlyBillData | null {
  return useDataContext().months.find((m) => m.monthId === monthId) ?? null;
}

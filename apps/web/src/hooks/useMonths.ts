import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/db';
import type { MonthlyBillData } from '@house-bills/bills-core';

export const MONTHS_KEY = ['months'] as const;

export function useAllMonths() {
  return useQuery({
    queryKey: MONTHS_KEY,
    queryFn: () => db.months.orderBy('monthId').toArray(),
  });
}

export function useMonth(monthId: string) {
  return useQuery({
    queryKey: [...MONTHS_KEY, monthId],
    queryFn: () => db.months.get(monthId) ?? null,
    enabled: !!monthId,
  });
}

export function useSaveMonth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: MonthlyBillData) => db.months.put(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: MONTHS_KEY }),
  });
}

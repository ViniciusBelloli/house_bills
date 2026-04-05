import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { MonthlyBillDataSchema } from '@house-bills/bills-core';
import type { MonthlyBillData } from '@house-bills/bills-core';

export const MONTHS_KEY = ['months'] as const;

export function useAllMonths() {
  return useQuery({
    queryKey: MONTHS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('months')
        .select('data')
        .order('month_id');
      if (error) throw error;
      return data
        .map((row) => MonthlyBillDataSchema.safeParse(row.data))
        .filter((r): r is { success: true; data: MonthlyBillData } => r.success)
        .map((r) => r.data);
    },
  });
}

export function useMonth(monthId: string) {
  return useQuery({
    queryKey: [...MONTHS_KEY, monthId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('months')
        .select('data')
        .eq('month_id', monthId)
        .single();
      if (error) return null;
      const parsed = MonthlyBillDataSchema.safeParse(data.data);
      return parsed.success ? parsed.data : null;
    },
    enabled: !!monthId,
  });
}

export function useSaveMonth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (month: MonthlyBillData) => {
      const { error } = await supabase
        .from('months')
        .upsert({ month_id: month.monthId, data: month });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MONTHS_KEY }),
  });
}

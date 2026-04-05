import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ResidentRecord } from '@/db';

export const RESIDENTS_KEY = ['residents'] as const;

export function useResidents() {
  return useQuery({
    queryKey: RESIDENTS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('residents')
        .select('*')
        .order('name');
      if (error) throw error;
      return data.map((r) => ({
        id: r.id as number,
        name: r.name as string,
        joinDate: r.join_date as string,
        exitDate: (r.exit_date as string | null) ?? null,
        defaultWeight: Number(r.default_weight),
      })) as ResidentRecord[];
    },
  });
}

export function useSaveAllResidents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (records: ResidentRecord[]) => {
      // Delete all existing rows then re-insert
      const { error: delError } = await supabase
        .from('residents')
        .delete()
        .gt('id', 0);
      if (delError) throw delError;

      if (records.length > 0) {
        const rows = records.map(({ id: _id, ...r }) => ({
          name: r.name,
          join_date: r.joinDate,
          exit_date: r.exitDate,
          default_weight: r.defaultWeight,
        }));
        const { error } = await supabase.from('residents').insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: RESIDENTS_KEY }),
  });
}

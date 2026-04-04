import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, type ResidentRecord } from '@/db';

export const RESIDENTS_KEY = ['residents'] as const;

export function useResidents() {
  return useQuery({
    queryKey: RESIDENTS_KEY,
    queryFn: () => db.residents.orderBy('name').toArray(),
  });
}

export function useSaveResident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (r: ResidentRecord) => db.residents.put(r),
    onSuccess: () => qc.invalidateQueries({ queryKey: RESIDENTS_KEY }),
  });
}

export function useDeleteResident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => db.residents.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: RESIDENTS_KEY }),
  });
}

export function useSaveAllResidents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (records: ResidentRecord[]) => {
      await db.residents.clear();
      await db.residents.bulkAdd(records.map(({ id: _id, ...r }) => r));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: RESIDENTS_KEY }),
  });
}

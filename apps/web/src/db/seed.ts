import { supabase } from '@/lib/supabase';
import { MonthlyBillDataSchema } from '@house-bills/bills-core';

// Static files loaded at build time
const monthFiles = import.meta.glob<{ default: unknown }>(
  '../../../../data/months/*.json',
  { eager: true },
);

const residentsFile = import.meta.glob<{ default: unknown }>(
  '../../../../data/residents.json',
  { eager: true },
);

interface StaticResident {
  name: string;
  joinDate: string;
  exitDate?: string | null;
  defaultWeight?: number;
}

export async function seedIfEmpty(): Promise<true> {
  // Seed months if table is empty
  const { count: monthCount } = await supabase
    .from('months')
    .select('*', { count: 'exact', head: true });

  if (monthCount === 0) {
    const months = Object.values(monthFiles)
      .map((mod) => MonthlyBillDataSchema.safeParse(mod.default))
      .filter((r) => r.success)
      .map((r) => r.data);

    if (months.length > 0) {
      const rows = months.map((m) => ({ month_id: m.monthId, data: m }));
      const { error } = await supabase.from('months').insert(rows);
      if (error) throw error;
    }
  }

  // Seed residents if table is empty
  const { count: residentCount } = await supabase
    .from('residents')
    .select('*', { count: 'exact', head: true });

  if (residentCount === 0) {
    const raw = Object.values(residentsFile)[0]?.default;
    if (Array.isArray(raw)) {
      const rows = (raw as StaticResident[]).map((r) => ({
        name: r.name,
        join_date: r.joinDate,
        exit_date: r.exitDate ?? null,
        default_weight: r.defaultWeight ?? 1,
      }));
      const { error } = await supabase.from('residents').insert(rows);
      if (error) throw error;
    }
  }

  return true;
}

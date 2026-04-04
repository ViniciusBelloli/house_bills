import { db } from './index';
import { MonthlyBillDataSchema } from '@house-bills/bills-core';

// Static files loaded at build time — paths are relative from this file (apps/web/src/db/)
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

// TanStack Query requires queryFn to return a non-undefined value.
export async function seedIfEmpty(): Promise<true> {
  const monthCount = await db.months.count().catch(() => 0);

  if (monthCount === 0) {
    const months = Object.values(monthFiles)
      .map((mod) => MonthlyBillDataSchema.safeParse(mod.default))
      .filter((r) => r.success)
      .map((r) => r.data);
    if (months.length > 0) await db.months.bulkPut(months);
  }

  const residentCount = await db.residents.count().catch(() => 0);
  if (residentCount === 0) {
    const raw = Object.values(residentsFile)[0]?.default;
    if (Array.isArray(raw)) {
      const records = (raw as StaticResident[]).map((r) => ({
        name: r.name,
        joinDate: r.joinDate,
        exitDate: r.exitDate ?? null,
        defaultWeight: r.defaultWeight ?? 1,
      }));
      await db.residents.bulkAdd(records);
    }
  }

  return true;
}

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

export async function seedIfEmpty(): Promise<void> {
  // Use a meta key to avoid re-seeding on every load
  const seeded = await db.table('months').count().catch(() => 0);

  if (seeded === 0) {
    const months = Object.values(monthFiles)
      .map((mod) => MonthlyBillDataSchema.safeParse(mod.default))
      .filter((r) => r.success)
      .map((r) => r.data);
    if (months.length > 0) await db.months.bulkPut(months);
  }

  const residentCount = await db.residents.count();
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
}

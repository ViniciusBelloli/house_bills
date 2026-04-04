import Dexie, { type Table } from 'dexie';
import type { MonthlyBillData } from '@house-bills/bills-core';

export interface ResidentRecord {
  id?: number;          // auto-increment PK
  name: string;
  joinDate: string;     // ISO date
  exitDate: string | null;
  defaultWeight: number; // default daily weight (1 = normal, 1.2 = heavier usage)
}

class HouseBillsDB extends Dexie {
  months!: Table<MonthlyBillData, string>;
  residents!: Table<ResidentRecord, number>;

  constructor() {
    super('house-bills');
    this.version(1).stores({
      months: 'monthId',
      residents: '++id, name',
    });
  }
}

export const db = new HouseBillsDB();

/** Returns residents active during a given YYYY-MM month. */
export function getActiveResidents(residents: ResidentRecord[], monthId: string): ResidentRecord[] {
  const [y, m] = monthId.split('-').map(Number) as [number, number];
  const monthStart = monthId + '-01';
  const nextMonthStart =
    m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return residents.filter((r) => {
    if (r.joinDate >= nextMonthStart) return false;
    if (r.exitDate && r.exitDate < monthStart) return false;
    return true;
  });
}

/** Whether a resident is active today. */
export function isActiveToday(r: ResidentRecord): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return !r.exitDate || r.exitDate >= today;
}

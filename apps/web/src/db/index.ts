import { format } from 'date-fns';

export interface ResidentRecord {
  id?: number;
  name: string;
  joinDate: string;
  exitDate: string | null;
  defaultWeight: number;
}

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
  const today = format(new Date(), 'yyyy-MM-dd');
  return !r.exitDate || r.exitDate >= today;
}

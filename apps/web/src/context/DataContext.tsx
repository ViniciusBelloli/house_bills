import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { MonthlyBillDataSchema, type MonthlyBillData } from '@house-bills/bills-core';

// ─── types ────────────────────────────────────────────────────────────────────

export interface ResidentConfig {
  name: string;
  joinDate: string;        // ISO date
  exitDate?: string | null;
}

// ─── static data (loaded at build time via Vite glob) ─────────────────────────

const monthFiles = import.meta.glob<{ default: unknown }>(
  '../../../../data/months/*.json',
  { eager: true },
);

const residentsFiles = import.meta.glob<{ default: unknown }>(
  '../../../../data/residents.json',
  { eager: true },
);

const _staticMonths: MonthlyBillData[] = Object.values(monthFiles)
  .map((mod) => MonthlyBillDataSchema.safeParse(mod.default))
  .filter((r) => r.success)
  .map((r) => r.data);

const _staticResidents: ResidentConfig[] = (() => {
  const raw = Object.values(residentsFiles)[0]?.default;
  return Array.isArray(raw) ? (raw as ResidentConfig[]) : [];
})();

// ─── localStorage helpers ─────────────────────────────────────────────────────

const MONTH_PREFIX = 'house-bills-month-';
const RESIDENTS_KEY = 'house-bills-residents';

function readLocalMonths(): Map<string, MonthlyBillData> {
  const map = new Map<string, MonthlyBillData>();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(MONTH_PREFIX)) continue;
      const raw = JSON.parse(localStorage.getItem(key) ?? 'null');
      const r = MonthlyBillDataSchema.safeParse(raw);
      if (r.success) map.set(r.data.monthId, r.data);
    }
  } catch { /* storage unavailable */ }
  return map;
}

function mergeMonths(local: Map<string, MonthlyBillData>): MonthlyBillData[] {
  const merged = _staticMonths.map((m) => local.get(m.monthId) ?? m);
  for (const [, data] of local) {
    if (!merged.find((m) => m.monthId === data.monthId)) merged.push(data);
  }
  return merged.sort((a, b) => a.monthId.localeCompare(b.monthId));
}

function readLocalResidents(): ResidentConfig[] | null {
  try {
    const raw = localStorage.getItem(RESIDENTS_KEY);
    if (raw) return JSON.parse(raw) as ResidentConfig[];
  } catch { /* storage unavailable */ }
  return null;
}

// ─── context ─────────────────────────────────────────────────────────────────

export function isLocalMonth(monthId: string): boolean {
  try {
    return localStorage.getItem(MONTH_PREFIX + monthId) !== null;
  } catch {
    return false;
  }
}

interface DataContextValue {
  months: MonthlyBillData[];
  saveMonth: (data: MonthlyBillData) => void;
  residents: ResidentConfig[];
  saveResidents: (r: ResidentConfig[]) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [months, setMonths] = useState<MonthlyBillData[]>(() =>
    mergeMonths(readLocalMonths()),
  );
  const [residents, setResidents] = useState<ResidentConfig[]>(
    () => readLocalResidents() ?? _staticResidents,
  );

  const saveMonth = useCallback((data: MonthlyBillData) => {
    try {
      localStorage.setItem(MONTH_PREFIX + data.monthId, JSON.stringify(data));
    } catch { /* storage unavailable */ }
    setMonths((prev) => {
      const next = prev.filter((m) => m.monthId !== data.monthId);
      return [...next, data].sort((a, b) => a.monthId.localeCompare(b.monthId));
    });
  }, []);

  const saveResidents = useCallback((r: ResidentConfig[]) => {
    try {
      localStorage.setItem(RESIDENTS_KEY, JSON.stringify(r));
    } catch { /* storage unavailable */ }
    setResidents(r);
  }, []);

  return (
    <DataContext.Provider value={{ months, saveMonth, residents, saveResidents }}>
      {children}
    </DataContext.Provider>
  );
}

export function useDataContext(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useDataContext must be inside DataProvider');
  return ctx;
}

/** Returns residents active during a given month (YYYY-MM). */
export function getActiveResidents(
  residents: ResidentConfig[],
  monthId: string,
): ResidentConfig[] {
  const monthStart = monthId + '-01';
  // end of month: first day of next month as exclusive upper bound
  const [y, m] = monthId.split('-').map(Number) as [number, number];
  const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return residents.filter((r) => {
    if (r.joinDate >= nextMonth) return false;      // joined after month ended
    if (r.exitDate && r.exitDate < monthStart) return false; // left before month started
    return true;
  });
}

import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { buildMonthlySummary } from '@house-bills/bills-core';
import type { MonthlyBillData, UtilityBill, ResidentDailyWeights } from '@house-bills/bills-core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatEur } from '@/lib/utils';

// --- helpers ---

function getRange(start: string, end: string): string[] {
  if (!start || !end || start > end) return [];
  const dates: string[] = [];
  const cur = new Date(start + 'T00:00:00Z');
  const endDate = new Date(end + 'T00:00:00Z');
  while (cur <= endDate) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

const MONTH_LABELS: Record<string, string> = {
  '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
  '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
  '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
};

function buildMonthLabel(monthId: string): string {
  const [y, m] = monthId.split('-') as [string, string];
  return `${MONTH_LABELS[m] ?? m} ${y}`;
}

// --- types for form state ---

interface ResidentEntry {
  id: string;        // stable key for React
  name: string;
  defaultWeight: string; // '1.0' or '1.2'
}

interface UtilityForm {
  total: string;
  periodStart: string;
  periodEnd: string;
  notes: string;
  // gas-only
  gasCylinderBuyDate: string;
  gasCylinderInstallDate: string;
}

type UtilityKey = 'electricity' | 'gas' | 'water';

const UTILITY_LABELS: Record<UtilityKey, string> = {
  electricity: 'Luz',
  gas: 'Gás',
  water: 'Água',
};

function emptyUtility(): UtilityForm {
  return { total: '', periodStart: '', periodEnd: '', notes: '', gasCylinderBuyDate: '', gasCylinderInstallDate: '' };
}

let _id = 0;
function nextId() { return String(++_id); }

const DEFAULT_RESIDENTS: ResidentEntry[] = [
  { id: nextId(), name: 'Vinicius', defaultWeight: '1.2' },
  { id: nextId(), name: 'Julia',    defaultWeight: '1.2' },
  { id: nextId(), name: 'Henrique', defaultWeight: '1.0' },
];

// --- component ---

export function NewMonthPage() {
  const [monthId, setMonthId] = useState('');
  const [utilities, setUtilities] = useState<Record<UtilityKey, UtilityForm>>({
    electricity: emptyUtility(),
    gas: emptyUtility(),
    water: emptyUtility(),
  });
  const [internet, setInternet] = useState('');
  const [gasType, setGasType] = useState<'cylinder' | 'pipe'>('cylinder');
  const [residents, setResidents] = useState<ResidentEntry[]>(DEFAULT_RESIDENTS);

  // weights: residentId -> utilityKey -> date -> weight string
  const [weights, setWeights] = useState<Record<string, Record<UtilityKey, Record<string, string>>>>({});

  // --- resident management ---
  const addResident = () =>
    setResidents((prev) => [...prev, { id: nextId(), name: '', defaultWeight: '1.0' }]);

  const removeResident = (id: string) =>
    setResidents((prev) => prev.filter((r) => r.id !== id));

  const updateResident = (id: string, field: keyof ResidentEntry, value: string) =>
    setResidents((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  // When a resident's defaultWeight changes, reset all unset cells to that weight
  const applyDefaultWeight = (id: string, utilKey: UtilityKey, dates: string[], weight: string) => {
    setWeights((prev) => {
      const existing = prev[id]?.[utilKey] ?? {};
      const updated = { ...existing };
      for (const d of dates) {
        if (!(d in updated)) updated[d] = weight;
      }
      return { ...prev, [id]: { ...(prev[id] ?? {}), [utilKey]: updated } };
    });
  };

  const setUtilityField = useCallback(
    (key: UtilityKey, field: keyof UtilityForm, value: string) => {
      setUtilities((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
    },
    [],
  );

  const setWeight = (residentId: string, utilKey: UtilityKey, date: string, value: string) => {
    setWeights((prev) => ({
      ...prev,
      [residentId]: {
        ...(prev[residentId] ?? {}),
        [utilKey]: {
          ...(prev[residentId]?.[utilKey] ?? {}),
          [date]: value,
        },
      },
    }));
  };

  // Fill all empty cells for a resident+utility with their default weight
  const fillAll = (residentId: string, utilKey: UtilityKey, dates: string[], weight: string) => {
    setWeights((prev) => ({
      ...prev,
      [residentId]: {
        ...(prev[residentId] ?? {}),
        [utilKey]: Object.fromEntries(dates.map((d) => [d, weight])),
      },
    }));
  };

  const clearAll = (residentId: string, utilKey: UtilityKey, dates: string[]) => {
    setWeights((prev) => ({
      ...prev,
      [residentId]: {
        ...(prev[residentId] ?? {}),
        [utilKey]: Object.fromEntries(dates.map((d) => [d, ''])),
      },
    }));
  };

  // Build MonthlyBillData from form state
  const buildData = (): MonthlyBillData | null => {
    if (!monthId) return null;

    const activeResidents = residents.filter((r) => r.name.trim());

    const utilityBills: UtilityBill[] = (
      Object.entries(utilities) as [UtilityKey, UtilityForm][]
    )
      .filter(([, u]) => u.total && u.periodStart && u.periodEnd)
      .map(([type, u]) => ({
        type,
        label: UTILITY_LABELS[type],
        total: parseFloat(u.total) || 0,
        periodStart: u.periodStart,
        periodEnd: u.periodEnd,
        notes: u.notes || null,
      }));

    const residentData: ResidentDailyWeights[] = activeResidents.map((r) => {
      const days: Record<string, number | null> = {};
      for (const [utilKey, u] of Object.entries(utilities) as [UtilityKey, UtilityForm][]) {
        if (!u.periodStart || !u.periodEnd) continue;
        for (const date of getRange(u.periodStart, u.periodEnd)) {
          if (date in days) continue;
          const raw = weights[r.id]?.[utilKey]?.[date];
          days[date] = raw ? parseFloat(raw) || null : null;
        }
      }
      return { resident: r.name.trim(), days };
    });

    return {
      monthId,
      monthLabel: buildMonthLabel(monthId),
      utilities: utilityBills,
      residents: residentData,
      internetFixedCost: internet ? parseFloat(internet) || null : null,
      gasType,
      gasCylinderBuyDate: gasType === 'cylinder' ? (utilities.gas.gasCylinderBuyDate || null) : null,
      gasCylinderInstallDate: gasType === 'cylinder' ? (utilities.gas.gasCylinderInstallDate || null) : null,
    };
  };

  const data = buildData();
  const summary = data && data.utilities.length > 0 ? buildMonthlySummary(data) : null;

  const handleDownload = () => {
    if (!data) return;
    const json = JSON.stringify(data, null, 2) + '\n';
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.monthId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">← Back</Link>
        <h1 className="text-2xl font-semibold">New month</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Fill in the bill details, set daily weights, then download the JSON and add it to{' '}
        <code className="text-xs bg-muted px-1 py-0.5 rounded">data/months/</code> in the repo.
      </p>

      {/* Month */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Month</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Month (YYYY-MM)</span>
            <input
              type="month"
              className="w-full border rounded-md px-3 py-1.5 text-sm"
              value={monthId}
              onChange={(e) => setMonthId(e.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Internet / MEO fixed cost (€)</span>
            <input
              type="number" step="0.01"
              className="w-full border rounded-md px-3 py-1.5 text-sm"
              value={internet}
              onChange={(e) => setInternet(e.target.value)}
              placeholder="0.00"
            />
          </label>
        </CardContent>
      </Card>

      {/* Residents */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Residents</CardTitle>
            <button
              onClick={addResident}
              className="text-xs px-2 py-1 rounded border hover:bg-muted transition-colors"
            >
              + Add resident
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {residents.map((r) => (
              <div key={r.id} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Name"
                  className="flex-1 border rounded-md px-3 py-1.5 text-sm"
                  value={r.name}
                  onChange={(e) => updateResident(r.id, 'name', e.target.value)}
                />
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Default weight</span>
                  <select
                    className="border rounded-md px-2 py-1.5 text-sm"
                    value={r.defaultWeight}
                    onChange={(e) => updateResident(r.id, 'defaultWeight', e.target.value)}
                  >
                    <option value="1.0">1.0</option>
                    <option value="1.2">1.2</option>
                    <option value="0.8">0.8</option>
                    <option value="0.5">0.5</option>
                  </select>
                </div>
                <button
                  onClick={() => removeResident(r.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors px-1"
                  title="Remove resident"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Utility cards */}
      {(Object.keys(utilities) as UtilityKey[]).map((utilKey) => {
        const u = utilities[utilKey];
        const dates = getRange(u.periodStart, u.periodEnd);
        return (
          <Card key={utilKey}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{UTILITY_LABELS[utilKey]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">Total (€)</span>
                  <input type="number" step="0.01"
                    className="w-full border rounded-md px-3 py-1.5 text-sm"
                    value={u.total}
                    onChange={(e) => setUtilityField(utilKey, 'total', e.target.value)}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">Period start</span>
                  <input type="date"
                    className="w-full border rounded-md px-3 py-1.5 text-sm"
                    value={u.periodStart}
                    onChange={(e) => setUtilityField(utilKey, 'periodStart', e.target.value)}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">Period end</span>
                  <input type="date"
                    className="w-full border rounded-md px-3 py-1.5 text-sm"
                    value={u.periodEnd}
                    onChange={(e) => setUtilityField(utilKey, 'periodEnd', e.target.value)}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">Notes</span>
                  <input type="text"
                    className="w-full border rounded-md px-3 py-1.5 text-sm"
                    value={u.notes}
                    onChange={(e) => setUtilityField(utilKey, 'notes', e.target.value)}
                    placeholder="e.g. Novo gás"
                  />
                </label>
              </div>

              {/* Gas type selector + cylinder-specific fields */}
              {utilKey === 'gas' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-medium">Gas type</span>
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input type="radio" name="gasType" value="cylinder"
                        checked={gasType === 'cylinder'}
                        onChange={() => setGasType('cylinder')}
                      />
                      Cylinder (botija) — equal split
                    </label>
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input type="radio" name="gasType" value="pipe"
                        checked={gasType === 'pipe'}
                        onChange={() => setGasType('pipe')}
                      />
                      Pipe (canalizado) — weighted daily split
                    </label>
                  </div>
                  {gasType === 'cylinder' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="space-y-1">
                        <span className="text-xs text-muted-foreground">Buy date (when purchased)</span>
                        <input type="date"
                          className="w-full border rounded-md px-3 py-1.5 text-sm"
                          value={u.gasCylinderBuyDate}
                          onChange={(e) => setUtilityField('gas', 'gasCylinderBuyDate', e.target.value)}
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs text-muted-foreground">Install date (when connected at home)</span>
                        <input type="date"
                          className="w-full border rounded-md px-3 py-1.5 text-sm"
                          value={u.gasCylinderInstallDate}
                          onChange={(e) => setUtilityField('gas', 'gasCylinderInstallDate', e.target.value)}
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Daily weights grid — hidden for cylinder gas (equal split, no daily tracking needed) */}
              {!(utilKey === 'gas' && gasType === 'cylinder') && dates.length > 0 && residents.filter((r) => r.name.trim()).length > 0 && (
                <div className="overflow-x-auto">
                  <table className="text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left pr-2 py-1 font-medium text-muted-foreground w-24">Resident</th>
                        <th className="pr-2 py-1 font-normal text-muted-foreground text-left">Actions</th>
                        {dates.map((d) => (
                          <th key={d} className="px-0.5 py-1 font-normal text-muted-foreground" style={{ minWidth: 38 }}>
                            {d.slice(5)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {residents.filter((r) => r.name.trim()).map((r) => (
                        <tr key={r.id}>
                          <td className="pr-2 py-0.5 font-medium">{r.name}</td>
                          <td className="pr-2 py-0.5">
                            <div className="flex gap-1">
                              <button
                                className="text-[10px] px-1.5 py-0.5 rounded border hover:bg-blue-50 text-blue-600 border-blue-200"
                                onClick={() => fillAll(r.id, utilKey, dates, r.defaultWeight)}
                                title="Fill all days with default weight"
                              >all</button>
                              <button
                                className="text-[10px] px-1.5 py-0.5 rounded border hover:bg-gray-50 text-muted-foreground"
                                onClick={() => clearAll(r.id, utilKey, dates)}
                                title="Clear all (absent)"
                              >none</button>
                            </div>
                          </td>
                          {dates.map((date) => (
                            <td key={date} className="px-0.5 py-0.5">
                              <input
                                type="number" step="0.1" min="0"
                                className="w-9 border rounded px-0.5 py-0.5 text-center text-xs"
                                value={weights[r.id]?.[utilKey]?.[date] ?? ''}
                                onChange={(e) => setWeight(r.id, utilKey, date, e.target.value)}
                                onFocus={() => applyDefaultWeight(r.id, utilKey, dates, r.defaultWeight)}
                                placeholder="–"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Live preview */}
      {summary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Preview — {summary.monthLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-left border-b">
                  <th className="pb-2 font-medium">Resident</th>
                  <th className="pb-2 font-medium text-right">Luz</th>
                  <th className="pb-2 font-medium text-right">Gás</th>
                  <th className="pb-2 font-medium text-right">Água</th>
                  {summary.internetTotal > 0 && (
                    <th className="pb-2 font-medium text-right">Internet</th>
                  )}
                  <th className="pb-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {summary.residentTotals.map((rt) => (
                  <tr key={rt.resident} className="border-b last:border-0">
                    <td className="py-1.5 font-medium">{rt.resident}</td>
                    <td className="py-1.5 text-right">{formatEur(rt.electricityShare)}</td>
                    <td className="py-1.5 text-right">{formatEur(rt.gasShare)}</td>
                    <td className="py-1.5 text-right">{formatEur(rt.waterShare)}</td>
                    {summary.internetTotal > 0 && (
                      <td className="py-1.5 text-right">{formatEur(rt.internetShare)}</td>
                    )}
                    <td className="py-1.5 text-right font-semibold">{formatEur(rt.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-right text-sm font-bold">
              Grand total: {formatEur(summary.grandTotal)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Download */}
      <div className="flex justify-end gap-3">
        <Link to="/" className="text-sm px-4 py-2 rounded-md border hover:bg-muted transition-colors">
          Cancel
        </Link>
        <button
          onClick={handleDownload}
          disabled={!data || !monthId}
          className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          Download {monthId ? `${monthId}.json` : 'JSON'}
        </button>
      </div>
    </div>
  );
}

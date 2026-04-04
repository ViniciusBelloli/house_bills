import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildMonthlySummary } from '@house-bills/bills-core';
import type { MonthlyBillData, UtilityBill, ResidentDailyWeights } from '@house-bills/bills-core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatEur } from '@/lib/utils';

// ─── helpers ──────────────────────────────────────────────────────────────────

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

let _seq = Date.now();
function uid() { return String(++_seq); }

// ─── form state types ─────────────────────────────────────────────────────────

interface ResidentEntry { id: string; name: string; defaultWeight: string }

interface UtilityForm {
  total: string; periodStart: string; periodEnd: string; notes: string;
}

interface CylinderEntry {
  id: string; total: string; buyDate: string; installDate: string; notes: string;
}

type UtilityKey = 'electricity' | 'gas' | 'water';
const UTILITY_LABELS: Record<UtilityKey, string> = { electricity: 'Luz', gas: 'Gás', water: 'Água' };

type WeightState = Record<string, Record<UtilityKey, Record<string, string>>>;

function emptyUtility(): UtilityForm {
  return { total: '', periodStart: '', periodEnd: '', notes: '' };
}
function emptyCylinder(): CylinderEntry {
  return { id: uid(), total: '', buyDate: '', installDate: '', notes: '' };
}

// ─── converter: MonthlyBillData → form state ──────────────────────────────────

function initFromData(data: MonthlyBillData) {
  const residents: ResidentEntry[] = data.residents
    .filter((r) => r.resident !== 'null')
    .map((r) => {
      // Detect most-common non-null weight as default
      const ws = Object.values(r.days).filter((w): w is number => w != null);
      const freq: Record<string, number> = {};
      for (const w of ws) freq[String(w)] = (freq[String(w)] ?? 0) + 1;
      const best = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '1.0';
      return { id: uid(), name: r.resident, defaultWeight: best };
    });

  const nameToId = new Map(residents.map((r) => [r.name, r.id]));

  const utilitiesForm: Record<UtilityKey, UtilityForm> = {
    electricity: emptyUtility(),
    gas: emptyUtility(),
    water: emptyUtility(),
  };
  for (const u of data.utilities) {
    const key = u.type as UtilityKey;
    utilitiesForm[key] = {
      total: String(u.total),
      periodStart: u.periodStart,
      periodEnd: u.periodEnd,
      notes: u.notes ?? '',
    };
  }

  const weights: WeightState = {};
  for (const r of data.residents.filter((r) => r.resident !== 'null')) {
    const id = nameToId.get(r.resident);
    if (!id) continue;
    for (const utilKey of (['electricity', 'gas', 'water'] as UtilityKey[])) {
      const u = utilitiesForm[utilKey];
      if (!u.periodStart || !u.periodEnd) continue;
      const utilWeights: Record<string, string> = {};
      for (const date of getRange(u.periodStart, u.periodEnd)) {
        const w = r.days[date];
        utilWeights[date] = w != null ? String(w) : '';
      }
      weights[id] = { ...(weights[id] ?? {}), [utilKey]: utilWeights };
    }
  }

  const gasType = data.gasType ?? 'cylinder';
  const cylinders: CylinderEntry[] = (data.gasCylinders ?? []).map((c) => ({
    id: uid(),
    total: String(c.total),
    buyDate: c.buyDate ?? '',
    installDate: c.installDate ?? '',
    notes: c.notes ?? '',
  }));

  return {
    residents,
    utilitiesForm,
    weights,
    gasType: gasType as 'cylinder' | 'pipe',
    cylinders: cylinders.length ? cylinders : [emptyCylinder()],
    internet: data.internetFixedCost != null ? String(data.internetFixedCost) : '',
  };
}

// ─── component ────────────────────────────────────────────────────────────────

interface Props {
  initialData?: MonthlyBillData;
}

export function MonthFormPage({ initialData }: Props) {
  const navigate = useNavigate();
  const isEdit = !!initialData;

  const init = initialData ? initFromData(initialData) : null;

  const [monthId, setMonthId] = useState(initialData?.monthId ?? '');
  const [utilities, setUtilities] = useState<Record<UtilityKey, UtilityForm>>(
    init?.utilitiesForm ?? { electricity: emptyUtility(), gas: emptyUtility(), water: emptyUtility() },
  );
  const [internet, setInternet] = useState(init?.internet ?? '');
  const [gasType, setGasType] = useState<'cylinder' | 'pipe'>(init?.gasType ?? 'cylinder');
  const [cylinders, setCylinders] = useState<CylinderEntry[]>(init?.cylinders ?? [emptyCylinder()]);
  const [residents, setResidents] = useState<ResidentEntry[]>(
    init?.residents ?? [
      { id: uid(), name: 'Vinicius', defaultWeight: '1.2' },
      { id: uid(), name: 'Julia', defaultWeight: '1.2' },
      { id: uid(), name: 'Henrique', defaultWeight: '1.0' },
    ],
  );
  const [weights, setWeights] = useState<WeightState>(init?.weights ?? {});

  // ── resident management ────────────────────────────────────────────────────

  const addResident = () =>
    setResidents((p) => [...p, { id: uid(), name: '', defaultWeight: '1.0' }]);
  const removeResident = (id: string) => setResidents((p) => p.filter((r) => r.id !== id));
  const updateResident = (id: string, field: keyof ResidentEntry, value: string) =>
    setResidents((p) => p.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  // ── utility fields ─────────────────────────────────────────────────────────

  const setUtilityField = useCallback(
    (key: UtilityKey, field: keyof UtilityForm, value: string) =>
      setUtilities((p) => ({ ...p, [key]: { ...p[key], [field]: value } })),
    [],
  );

  // ── cylinder management ────────────────────────────────────────────────────

  const addCylinder = () => setCylinders((p) => [...p, emptyCylinder()]);
  const removeCylinder = (id: string) =>
    setCylinders((p) => (p.length > 1 ? p.filter((c) => c.id !== id) : p));
  const updateCylinder = (id: string, field: keyof CylinderEntry, value: string) =>
    setCylinders((p) => p.map((c) => (c.id === id ? { ...c, [field]: value } : c)));

  // Auto-sync gas utility total from cylinder totals
  const cylinderTotal = cylinders.reduce((s, c) => s + (parseFloat(c.total) || 0), 0);

  // ── weight editing ─────────────────────────────────────────────────────────

  const setWeight = (resId: string, utilKey: UtilityKey, date: string, value: string) =>
    setWeights((p) => ({
      ...p,
      [resId]: { ...(p[resId] ?? {}), [utilKey]: { ...(p[resId]?.[utilKey] ?? {}), [date]: value } },
    }));

  const fillAll = (resId: string, utilKey: UtilityKey, dates: string[], weight: string) =>
    setWeights((p) => ({
      ...p,
      [resId]: { ...(p[resId] ?? {}), [utilKey]: Object.fromEntries(dates.map((d) => [d, weight])) },
    }));

  const clearAll = (resId: string, utilKey: UtilityKey, dates: string[]) =>
    setWeights((p) => ({
      ...p,
      [resId]: { ...(p[resId] ?? {}), [utilKey]: Object.fromEntries(dates.map((d) => [d, ''])) },
    }));

  // ── build output data ──────────────────────────────────────────────────────

  const buildData = (): MonthlyBillData | null => {
    if (!monthId) return null;
    const active = residents.filter((r) => r.name.trim());

    const gasTotal = gasType === 'cylinder' ? cylinderTotal : parseFloat(utilities.gas.total) || 0;

    const utilityBills: UtilityBill[] = (
      Object.entries(utilities) as [UtilityKey, UtilityForm][]
    )
      .filter(([k, u]) => {
        const total = k === 'gas' && gasType === 'cylinder' ? gasTotal : parseFloat(u.total) || 0;
        return total > 0 && u.periodStart && u.periodEnd;
      })
      .map(([type, u]) => ({
        type,
        label: UTILITY_LABELS[type],
        total: type === 'gas' && gasType === 'cylinder' ? gasTotal : parseFloat(u.total) || 0,
        periodStart: u.periodStart,
        periodEnd: u.periodEnd,
        notes: u.notes || null,
      }));

    const residentData: ResidentDailyWeights[] = active.map((r) => {
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

    const gasCylindersData =
      gasType === 'cylinder'
        ? cylinders
            .filter((c) => c.total || c.installDate || c.buyDate)
            .map((c) => ({
              total: parseFloat(c.total) || 0,
              buyDate: c.buyDate || null,
              installDate: c.installDate || null,
              notes: c.notes || null,
            }))
        : undefined;

    return {
      monthId,
      monthLabel: buildMonthLabel(monthId),
      utilities: utilityBills,
      residents: residentData,
      internetFixedCost: internet ? parseFloat(internet) || null : null,
      gasType,
      gasCylinders: gasCylindersData,
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

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(isEdit ? `/month/${initialData!.monthId}` : '/')}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-semibold">
          {isEdit ? `Edit — ${initialData!.monthLabel}` : 'New month'}
        </h1>
      </div>

      {!isEdit && (
        <p className="text-sm text-muted-foreground">
          Fill in details, set daily weights, download the JSON and drop it into{' '}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">data/months/</code>.
        </p>
      )}
      {isEdit && (
        <p className="text-sm text-muted-foreground">
          Edit the month data below. Download the updated JSON and replace the file in{' '}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">data/months/{initialData!.monthId}.json</code>.
        </p>
      )}

      {/* ── Month + internet ── */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Month</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Month (YYYY-MM)</span>
            <input type="month" className="w-full border rounded-md px-3 py-1.5 text-sm"
              value={monthId} onChange={(e) => setMonthId(e.target.value)}
              disabled={isEdit}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Internet / MEO fixed cost (€)</span>
            <input type="number" step="0.01" className="w-full border rounded-md px-3 py-1.5 text-sm"
              value={internet} onChange={(e) => setInternet(e.target.value)} placeholder="0.00"
            />
          </label>
        </CardContent>
      </Card>

      {/* ── Residents ── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Residents</CardTitle>
            <button onClick={addResident}
              className="text-xs px-2 py-1 rounded border hover:bg-muted transition-colors">
              + Add
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {residents.map((r) => (
              <div key={r.id} className="flex items-center gap-2">
                <input type="text" placeholder="Name"
                  className="flex-1 border rounded-md px-3 py-1.5 text-sm"
                  value={r.name} onChange={(e) => updateResident(r.id, 'name', e.target.value)}
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">Default weight</span>
                <select className="border rounded-md px-2 py-1.5 text-sm"
                  value={r.defaultWeight}
                  onChange={(e) => updateResident(r.id, 'defaultWeight', e.target.value)}>
                  <option value="1.2">1.2</option>
                  <option value="1.0">1.0</option>
                  <option value="0.8">0.8</option>
                  <option value="0.5">0.5</option>
                </select>
                <button onClick={() => removeResident(r.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors w-6 text-center"
                  title="Remove">×</button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Utilities ── */}
      {(Object.keys(utilities) as UtilityKey[]).map((utilKey) => {
        const u = utilities[utilKey];
        const isCylinderGas = utilKey === 'gas' && gasType === 'cylinder';
        const dates = isCylinderGas ? [] : getRange(u.periodStart, u.periodEnd);
        const activeResidents = residents.filter((r) => r.name.trim());

        return (
          <Card key={utilKey}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{UTILITY_LABELS[utilKey]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Gas type selector */}
              {utilKey === 'gas' && (
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-xs text-muted-foreground font-medium">Type</span>
                  {(['cylinder', 'pipe'] as const).map((t) => (
                    <label key={t} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input type="radio" name="gasType" value={t}
                        checked={gasType === t} onChange={() => setGasType(t)} />
                      {t === 'cylinder' ? 'Cylinder (botija) — equal split' : 'Pipe (canalizado) — weighted split'}
                    </label>
                  ))}
                </div>
              )}

              {/* Utility totals / dates — pipe gas and non-gas utilities */}
              {!isCylinderGas && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <label className="space-y-1">
                    <span className="text-xs text-muted-foreground">Total (€)</span>
                    <input type="number" step="0.01"
                      className="w-full border rounded-md px-3 py-1.5 text-sm"
                      value={u.total} onChange={(e) => setUtilityField(utilKey, 'total', e.target.value)}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-muted-foreground">Period start</span>
                    <input type="date" className="w-full border rounded-md px-3 py-1.5 text-sm"
                      value={u.periodStart} onChange={(e) => setUtilityField(utilKey, 'periodStart', e.target.value)}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-muted-foreground">Period end</span>
                    <input type="date" className="w-full border rounded-md px-3 py-1.5 text-sm"
                      value={u.periodEnd} onChange={(e) => setUtilityField(utilKey, 'periodEnd', e.target.value)}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-muted-foreground">Notes</span>
                    <input type="text" className="w-full border rounded-md px-3 py-1.5 text-sm"
                      value={u.notes} onChange={(e) => setUtilityField(utilKey, 'notes', e.target.value)}
                      placeholder="optional"
                    />
                  </label>
                </div>
              )}

              {/* Cylinder gas: billing period + cylinders list */}
              {isCylinderGas && (
                <div className="space-y-4">
                  {/* Billing period (used for display, not calculation) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <label className="space-y-1">
                      <span className="text-xs text-muted-foreground">Billing start</span>
                      <input type="date" className="w-full border rounded-md px-3 py-1.5 text-sm"
                        value={u.periodStart} onChange={(e) => setUtilityField('gas', 'periodStart', e.target.value)}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-muted-foreground">Billing end</span>
                      <input type="date" className="w-full border rounded-md px-3 py-1.5 text-sm"
                        value={u.periodEnd} onChange={(e) => setUtilityField('gas', 'periodEnd', e.target.value)}
                      />
                    </label>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Total (auto-sum)</span>
                      <div className="border rounded-md px-3 py-1.5 text-sm bg-muted text-muted-foreground">
                        {cylinderTotal > 0 ? `€ ${cylinderTotal.toFixed(2)}` : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Cylinder entries */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Cylinders ({cylinders.length})
                      </span>
                      <button onClick={addCylinder}
                        className="text-xs px-2 py-1 rounded border hover:bg-muted transition-colors">
                        + Add cylinder
                      </button>
                    </div>
                    {cylinders.map((c, idx) => (
                      <div key={c.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">Cylinder {idx + 1}</span>
                          <button onClick={() => removeCylinder(c.id)}
                            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                            title="Remove cylinder">× Remove</button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <label className="space-y-1">
                            <span className="text-xs text-muted-foreground">Cost (€)</span>
                            <input type="number" step="0.01"
                              className="w-full border rounded-md px-3 py-1.5 text-sm"
                              value={c.total}
                              onChange={(e) => updateCylinder(c.id, 'total', e.target.value)}
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs text-muted-foreground">Buy date</span>
                            <input type="date" className="w-full border rounded-md px-3 py-1.5 text-sm"
                              value={c.buyDate}
                              onChange={(e) => updateCylinder(c.id, 'buyDate', e.target.value)}
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs text-muted-foreground">Install date</span>
                            <input type="date" className="w-full border rounded-md px-3 py-1.5 text-sm"
                              value={c.installDate}
                              onChange={(e) => updateCylinder(c.id, 'installDate', e.target.value)}
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs text-muted-foreground">Notes</span>
                            <input type="text" className="w-full border rounded-md px-3 py-1.5 text-sm"
                              value={c.notes}
                              onChange={(e) => updateCylinder(c.id, 'notes', e.target.value)}
                              placeholder="optional"
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Daily weights grid (pipe gas + electricity + water) */}
              {!isCylinderGas && dates.length > 0 && activeResidents.length > 0 && (
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
                      {activeResidents.map((r) => (
                        <tr key={r.id}>
                          <td className="pr-2 py-0.5 font-medium">{r.name}</td>
                          <td className="pr-2 py-0.5">
                            <div className="flex gap-1">
                              <button
                                className="text-[10px] px-1.5 py-0.5 rounded border hover:bg-blue-50 text-blue-600 border-blue-200"
                                onClick={() => fillAll(r.id, utilKey, dates, r.defaultWeight)}
                                title="Fill all with default weight">all</button>
                              <button
                                className="text-[10px] px-1.5 py-0.5 rounded border hover:bg-gray-50 text-muted-foreground"
                                onClick={() => clearAll(r.id, utilKey, dates)}
                                title="Clear all (absent)">none</button>
                            </div>
                          </td>
                          {dates.map((date) => (
                            <td key={date} className="px-0.5 py-0.5">
                              <input type="number" step="0.1" min="0"
                                className="w-9 border rounded px-0.5 py-0.5 text-center text-xs"
                                value={weights[r.id]?.[utilKey]?.[date] ?? ''}
                                onChange={(e) => setWeight(r.id, utilKey, date, e.target.value)}
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

      {/* ── Live preview ── */}
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
                  {summary.internetTotal > 0 && <th className="pb-2 font-medium text-right">Internet</th>}
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
                    {summary.internetTotal > 0 && <td className="py-1.5 text-right">{formatEur(rt.internetShare)}</td>}
                    <td className="py-1.5 text-right font-semibold">{formatEur(rt.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-right text-sm font-bold">Grand total: {formatEur(summary.grandTotal)}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Actions ── */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => navigate(isEdit ? `/month/${initialData!.monthId}` : '/')}
          className="text-sm px-4 py-2 rounded-md border hover:bg-muted transition-colors">
          Cancel
        </button>
        <button onClick={handleDownload} disabled={!data || !monthId}
          className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40">
          {isEdit ? `Download updated ${monthId}.json` : `Download ${monthId ? `${monthId}.json` : 'JSON'}`}
        </button>
      </div>
    </div>
  );
}

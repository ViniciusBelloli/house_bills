import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useDataContext, type ResidentConfig } from '@/context/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

let _seq = Date.now();
function uid() { return String(++_seq); }

interface Row extends ResidentConfig { id: string }

function toRows(residents: ResidentConfig[]): Row[] {
  return residents.map((r) => ({ ...r, id: uid() }));
}

function fromRows(rows: Row[]): ResidentConfig[] {
  return rows
    .filter((r) => r.name.trim())
    .map(({ id: _id, ...r }) => ({
      name: r.name.trim(),
      joinDate: r.joinDate,
      exitDate: r.exitDate ?? null,
    }));
}

function isActive(r: ResidentConfig): boolean {
  if (!r.exitDate) return true;
  return r.exitDate >= new Date().toISOString().slice(0, 10);
}

export function ResidentsPage() {
  const { residents, saveResidents } = useDataContext();
  const [rows, setRows] = useState<Row[]>(() => toRows(residents));
  const [saved, setSaved] = useState(false);

  const update = useCallback((id: string, field: keyof Row, value: string) => {
    setSaved(false);
    setRows((p) => p.map((r) => (r.id === id ? { ...r, [field]: value || null } : r)));
  }, []);

  const add = () => {
    setSaved(false);
    setRows((p) => [
      ...p,
      { id: uid(), name: '', joinDate: new Date().toISOString().slice(0, 10), exitDate: null },
    ]);
  };

  const remove = (id: string) => {
    setSaved(false);
    setRows((p) => p.filter((r) => r.id !== id));
  };

  const handleSave = () => {
    saveResidents(fromRows(rows));
    setSaved(true);
  };

  const handleDownload = () => {
    const data = fromRows(rows);
    const json = JSON.stringify(data, null, 2) + '\n';
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'residents.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">← All months</Link>
        <h1 className="text-2xl font-semibold">Household members</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Members without an exit date are considered active. Members with an exit date are inactive
        after that date and won't be pre-filled in new months.
        Changes are saved locally in your browser — download{' '}
        <code className="text-xs bg-muted px-1 py-0.5 rounded">residents.json</code>{' '}
        to commit them to the repo.
      </p>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Members ({rows.filter((r) => r.name.trim()).length})</CardTitle>
            <button
              onClick={add}
              className="text-xs px-2 py-1 rounded border hover:bg-muted transition-colors"
            >
              + Add member
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No members yet.</p>
          )}
          <div className="space-y-2">
            {rows.map((r) => {
              const active = r.name ? isActive(r) : true;
              return (
                <div
                  key={r.id}
                  className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center p-2 rounded-lg border ${
                    active ? '' : 'opacity-60 bg-muted/40'
                  }`}
                >
                  {/* Name */}
                  <input
                    type="text"
                    placeholder="Name"
                    className="border rounded-md px-3 py-1.5 text-sm w-full"
                    value={r.name}
                    onChange={(e) => update(r.id, 'name', e.target.value)}
                  />

                  {/* Join date */}
                  <label className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">Joined</span>
                    <input
                      type="date"
                      className="border rounded-md px-2 py-1 text-xs"
                      value={r.joinDate}
                      onChange={(e) => update(r.id, 'joinDate', e.target.value)}
                    />
                  </label>

                  {/* Exit date */}
                  <label className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">Left (optional)</span>
                    <input
                      type="date"
                      className="border rounded-md px-2 py-1 text-xs"
                      value={r.exitDate ?? ''}
                      onChange={(e) => update(r.id, 'exitDate', e.target.value)}
                    />
                  </label>

                  {/* Status badge */}
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
                      active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {active ? 'Active' : 'Inactive'}
                  </span>

                  {/* Remove */}
                  <button
                    onClick={() => remove(r.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors w-6 text-center text-base"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <button
          onClick={handleDownload}
          className="text-sm px-4 py-2 rounded-md border hover:bg-muted transition-colors"
        >
          Download residents.json
        </button>
        <button
          onClick={handleSave}
          className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          {saved ? '✓ Saved' : 'Save'}
        </button>
      </div>
    </div>
  );
}

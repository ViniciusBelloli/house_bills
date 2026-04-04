import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useImmer } from 'use-immer';
import { format } from 'date-fns';
import { useResidents, useSaveAllResidents } from '@/hooks/useResidents';
import { isActiveToday, type ResidentRecord } from '@/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from '@/components/ui/dialog';

let _seq = Date.now();
function uid() { return String(++_seq); }

// Local form row includes a string id for React keys (DB rows may not have one yet)
interface Row extends ResidentRecord { _key: string }

function toRows(records: ResidentRecord[]): Row[] {
  return records.map((r) => ({ ...r, _key: uid() }));
}

function fromRows(rows: Row[]): ResidentRecord[] {
  return rows
    .filter((r) => r.name.trim())
    .map(({ _key: _k, ...r }) => r);
}

// ─── Resident edit dialog ────────────────────────────────────────────────────

interface EditDialogProps {
  row: Row;
  onSave: (updated: Row) => void;
  children: React.ReactNode;
}

function EditDialog({ row, onSave, children }: EditDialogProps) {
  const [draft, setDraft] = useState<Row>(row);
  const [open, setOpen] = useState(false);

  const handleOpen = (v: boolean) => {
    if (v) setDraft(row); // reset draft to current row on open
    setOpen(v);
  };

  const save = () => {
    onSave(draft);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{draft.name || 'New member'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Name</span>
            <input
              type="text"
              className="border rounded-md px-3 py-1.5 text-sm w-full"
              value={draft.name}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Default weight</span>
            <input
              type="number"
              step="0.1"
              min="0.1"
              className="border rounded-md px-3 py-1.5 text-sm w-full"
              value={draft.defaultWeight}
              onChange={(e) => setDraft((p) => ({ ...p, defaultWeight: parseFloat(e.target.value) || 1 }))}
            />
            <span className="text-[10px] text-muted-foreground">
              Used as default when filling daily weights (1 = normal, 1.2 = heavy usage)
            </span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Joined</span>
            <input
              type="date"
              className="border rounded-md px-3 py-1.5 text-sm w-full"
              value={draft.joinDate}
              onChange={(e) => setDraft((p) => ({ ...p, joinDate: e.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Left (leave empty if still here)</span>
            <input
              type="date"
              className="border rounded-md px-3 py-1.5 text-sm w-full"
              value={draft.exitDate ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, exitDate: e.target.value || null }))}
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <DialogClose asChild>
            <button className="text-sm px-4 py-2 rounded-md border hover:bg-muted transition-colors">
              Cancel
            </button>
          </DialogClose>
          <button
            onClick={save}
            disabled={!draft.name.trim()}
            className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            Save member
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ResidentsPage() {
  const { data: dbResidents = [], isLoading } = useResidents();
  const saveAll = useSaveAllResidents();

  const [rows, updateRows] = useImmer<Row[]>(() => toRows(dbResidents));
  const [dirty, setDirty] = useState(false);

  // Sync rows when DB loads (first render may be empty)
  const [synced, setSynced] = useState(false);
  if (!synced && dbResidents.length > 0) {
    setSynced(true);
    updateRows(() => toRows(dbResidents));
  }

  const addRow = () => {
    setDirty(true);
    updateRows((draft) => {
      draft.push({
        _key: uid(),
        name: '',
        joinDate: format(new Date(), 'yyyy-MM-dd'),
        exitDate: null,
        defaultWeight: 1,
      });
    });
  };

  const updateRow = (key: string, updated: Row) => {
    setDirty(true);
    updateRows((draft) => {
      const i = draft.findIndex((r) => r._key === key);
      if (i >= 0) draft[i] = updated;
    });
  };

  const removeRow = (key: string) => {
    setDirty(true);
    updateRows((draft) => {
      const i = draft.findIndex((r) => r._key === key);
      if (i >= 0) draft.splice(i, 1);
    });
  };

  const handleSave = async () => {
    await saveAll.mutateAsync(fromRows(rows));
    setDirty(false);
  };

  const handleDownload = () => {
    const data = fromRows(rows).map(({ id: _id, ...r }) => r);
    const json = JSON.stringify(data, null, 2) + '\n';
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'residents.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>;
  }

  const active = rows.filter((r) => r.name.trim() && isActiveToday(r));
  const inactive = rows.filter((r) => r.name.trim() && !isActiveToday(r));

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">← All months</Link>
        <h1 className="text-2xl font-semibold">Household members</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Members without an exit date are active and will be pre-filled in new months.
        The default weight is used when clicking "all" in the daily weight grid.
      </p>

      {/* Active members */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">
              Active ({active.length})
            </CardTitle>
            <button
              onClick={addRow}
              className="text-xs px-2 py-1 rounded border hover:bg-muted transition-colors"
            >
              + Add member
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {active.length === 0 && (
            <p className="text-sm text-muted-foreground py-2 text-center">
              No active members. Add one above.
            </p>
          )}
          {active.map((r) => (
            <MemberRow key={r._key} row={r} onUpdate={updateRow} onRemove={removeRow} />
          ))}
        </CardContent>
      </Card>

      {/* Inactive members */}
      {inactive.length > 0 && (
        <Card className="opacity-70">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Inactive ({inactive.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {inactive.map((r) => (
              <MemberRow key={r._key} row={r} onUpdate={updateRow} onRemove={removeRow} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {rows.filter((r) => r.name.trim()).length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-8">
          No members yet — click "+ Add member" to start.
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-3">
        <button
          onClick={handleDownload}
          className="text-sm px-4 py-2 rounded-md border hover:bg-muted transition-colors"
        >
          Download residents.json
        </button>
        <button
          onClick={handleSave}
          disabled={saveAll.isPending || !dirty}
          className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {saveAll.isPending ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
        </button>
      </div>
    </div>
  );
}

// ─── Member row card ───────────────────────────────────────────────────────────

function MemberRow({
  row,
  onUpdate,
  onRemove,
}: {
  row: Row;
  onUpdate: (key: string, updated: Row) => void;
  onRemove: (key: string) => void;
}) {
  const active = isActiveToday(row);

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${active ? '' : 'bg-muted/30'}`}>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{row.name || <span className="text-muted-foreground italic">unnamed</span>}</span>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
            active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3">
          <span>Joined {row.joinDate}</span>
          {row.exitDate && <span>Left {row.exitDate}</span>}
          <span>Weight {row.defaultWeight}</span>
        </div>
      </div>

      {/* Edit */}
      <EditDialog row={row} onSave={(updated) => onUpdate(row._key, updated)}>
        <button className="text-xs px-2 py-1 rounded border hover:bg-muted transition-colors shrink-0">
          Edit
        </button>
      </EditDialog>

      {/* Remove */}
      <button
        onClick={() => onRemove(row._key)}
        className="text-muted-foreground hover:text-destructive transition-colors w-6 text-center text-base shrink-0"
        title="Remove"
      >
        ×
      </button>
    </div>
  );
}

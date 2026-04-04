import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import type { GasCylinderRecord } from '@house-bills/bills-core';
import { formatDate } from '@/lib/utils';

interface Props {
  records: GasCylinderRecord[];
}

export function GasDurationChart({ records }: Props) {
  const known = records.filter((r) => r.durationDays != null);
  if (known.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">Not enough data yet — need at least two cylinder install dates.</p>;
  }

  const avg = known.reduce((s, r) => s + r.durationDays!, 0) / known.length;

  const data = records.map((r) => ({
    label: r.chartLabel,
    days: r.durationDays,
    installDate: r.installDate,
    buyDate: r.buyDate,
  }));

  return (
    <div className="space-y-2">
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>Avg duration: <strong className="text-foreground">{avg.toFixed(1)} days</strong></span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-emerald-500" /> ≥ avg</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-amber-400" /> &lt; avg</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-gray-200" /> unknown</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis unit=" d" tick={{ fontSize: 11 }} width={44} domain={[0, 'auto']} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]!.payload as typeof data[number];
              return (
                <div className="rounded-lg border bg-white shadow-sm p-3 text-xs space-y-1">
                  <p className="font-semibold">{d.label}</p>
                  <p>Installed: {d.installDate ? formatDate(d.installDate) : '—'}</p>
                  {d.buyDate && <p>Bought: {formatDate(d.buyDate)}</p>}
                  <p className="font-medium">
                    Duration: {d.days != null ? `${d.days} days` : 'unknown'}
                  </p>
                </div>
              );
            }}
          />
          <ReferenceLine
            y={avg}
            stroke="#9ca3af"
            strokeDasharray="4 4"
            label={{ value: `avg ${avg.toFixed(0)}d`, position: 'insideTopRight', fontSize: 10, fill: '#6b7280' }}
          />
          <Bar dataKey="days" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.days == null
                    ? '#e5e7eb'
                    : entry.days >= avg
                    ? '#10b981'
                    : '#f59e0b'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

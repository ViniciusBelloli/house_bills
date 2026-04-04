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

const GOOD_COLOR = '#10b981';   // green — longer than average
const SHORT_COLOR = '#f59e0b';  // amber — shorter than average

export function GasDurationChart({ records }: Props) {
  const known = records.filter((r) => r.durationDays != null);
  if (known.length === 0) return <p className="text-sm text-muted-foreground">No duration data yet.</p>;

  const avg = known.reduce((s, r) => s + r.durationDays!, 0) / known.length;

  const data = records.map((r) => ({
    label: r.monthLabel.split(' ')[0],
    days: r.durationDays,
    openedDate: r.openedDate,
  }));

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">
        Avg: <strong>{avg.toFixed(1)} days</strong>
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis unit=" d" tick={{ fontSize: 11 }} width={44} />
          <Tooltip
            formatter={(value) =>
              value != null ? [`${value} days`, 'Duration'] : ['?', 'Duration']
            }
            labelFormatter={(_, payload) => {
              const item = payload?.[0]?.payload as { openedDate: string } | undefined;
              return item ? `Cylinder opened ${formatDate(item.openedDate)}` : '';
            }}
          />
          <ReferenceLine y={avg} stroke="#6b7280" strokeDasharray="4 4" label={{ value: 'avg', position: 'insideTopRight', fontSize: 10 }} />
          <Bar dataKey="days" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.days == null ? '#e5e7eb' : entry.days >= avg ? GOOD_COLOR : SHORT_COLOR}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

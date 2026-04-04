import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { MonthlySummary } from '@house-bills/bills-core';
import { formatEur } from '@/lib/utils';

interface Props {
  summaries: MonthlySummary[];
}

const RESIDENT_COLORS = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'];

export function ResidentTrendChart({ summaries }: Props) {
  // Collect all resident names across all months
  const residentSet = new Set<string>();
  for (const s of summaries) {
    for (const rt of s.residentTotals) residentSet.add(rt.resident);
  }
  const residents = Array.from(residentSet);

  const data = summaries.map((s) => {
    const row: Record<string, string | number> = {
      month: s.monthLabel.split(' ')[0] ?? s.monthId,
    };
    for (const resident of residents) {
      const rt = s.residentTotals.find((r) => r.resident === resident);
      row[resident] = +(rt?.total ?? 0).toFixed(2);
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v: number) => `${v}€`} tick={{ fontSize: 11 }} width={48} />
        <Tooltip formatter={(value: number) => formatEur(value)} />
        <Legend />
        {residents.map((name, i) => (
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            stroke={RESIDENT_COLORS[i % RESIDENT_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

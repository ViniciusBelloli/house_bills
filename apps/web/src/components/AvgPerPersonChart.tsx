import {
  BarChart,
  Bar,
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

export function AvgPerPersonChart({ summaries }: Props) {
  const data = summaries.map((s) => {
    const count = s.residentTotals.length;
    if (count === 0) return { month: s.monthLabel.split(' ')[0], Luz: 0, Gás: 0, Água: 0, Internet: 0 };
    return {
      month: s.monthLabel.split(' ')[0],
      Luz: +(s.electricityTotal / count).toFixed(2),
      Gás: +(s.gasTotal / count).toFixed(2),
      Água: +(s.waterTotal / count).toFixed(2),
      Internet: +(s.internetTotal / count).toFixed(2),
    };
  });

  const hasInternet = summaries.some((s) => s.internetTotal > 0);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v: number) => `${v}€`} tick={{ fontSize: 11 }} width={48} />
        <Tooltip formatter={(value: number) => formatEur(value)} />
        <Legend />
        <Bar dataKey="Luz" stackId="a" fill="#3b82f6" />
        <Bar dataKey="Gás" stackId="a" fill="#f59e0b" />
        <Bar dataKey="Água" stackId="a" fill="#06b6d4" />
        {hasInternet && (
          <Bar dataKey="Internet" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

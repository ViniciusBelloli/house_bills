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

const COLORS = {
  electricity: '#3b82f6',
  gas: '#f59e0b',
  water: '#06b6d4',
  internet: '#8b5cf6',
};

export function UtilityTrendChart({ summaries }: Props) {
  const data = summaries.map((s) => ({
    month: s.monthLabel.split(' ')[0], // e.g. "Março"
    Luz: +s.electricityTotal.toFixed(2),
    Gás: +s.gasTotal.toFixed(2),
    Água: +s.waterTotal.toFixed(2),
    ...(s.internetTotal > 0 ? { Internet: +s.internetTotal.toFixed(2) } : {}),
  }));

  const hasInternet = summaries.some((s) => s.internetTotal > 0);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v: number) => `${v}€`} tick={{ fontSize: 11 }} width={48} />
        <Tooltip formatter={(value: number) => formatEur(value)} />
        <Legend />
        <Bar dataKey="Luz" stackId="a" fill={COLORS.electricity} radius={[0, 0, 0, 0]} />
        <Bar dataKey="Gás" stackId="a" fill={COLORS.gas} />
        <Bar dataKey="Água" stackId="a" fill={COLORS.water} />
        {hasInternet && <Bar dataKey="Internet" stackId="a" fill={COLORS.internet} radius={[4, 4, 0, 0]} />}
      </BarChart>
    </ResponsiveContainer>
  );
}

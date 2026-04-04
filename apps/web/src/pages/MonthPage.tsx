import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { buildMonthlySummary } from '@house-bills/bills-core';
import { useMonthlyData } from '@/hooks/useMonthlyData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AttendanceGrid } from '@/components/AttendanceGrid';
import { formatEur, formatDate } from '@/lib/utils';

const UTILITY_LABELS: Record<string, string> = {
  electricity: 'Luz',
  gas: 'Gás',
  water: 'Água',
};

export function MonthPage() {
  const { monthId } = useParams<{ monthId: string }>();
  const data = useMonthlyData(monthId ?? '');
  const [openAttendance, setOpenAttendance] = useState<string | null>(null);

  if (!data) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Month not found.{' '}
        <Link to="/" className="underline">Back to summary</Link>
      </div>
    );
  }

  const summary = buildMonthlySummary(data);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">← All months</Link>
        <h1 className="text-2xl font-semibold">{data.monthLabel}</h1>
        <span className="ml-auto text-xl font-bold">{formatEur(summary.grandTotal)}</span>
      </div>

      {/* Utility cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summary.utilitySummaries.map(({ utility, totalParts, euroPerPart, residentShares }) => (
          <Card key={utility.type}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {UTILITY_LABELS[utility.type] ?? utility.type}
              </CardTitle>
              <p className="text-xl font-bold">{formatEur(utility.total)}</p>
            </CardHeader>
            <CardContent className="text-xs space-y-1">
              <div>{formatDate(utility.periodStart)} → {formatDate(utility.periodEnd)}</div>
              <div>{totalParts.toFixed(2)} partes · {formatEur(euroPerPart)}/parte</div>
              {utility.notes && (
                <div className="text-muted-foreground italic">{utility.notes}</div>
              )}
              {utility.type === 'gas' && (
                <div className="pt-1 space-y-0.5">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    (data.gasType ?? 'cylinder') === 'cylinder'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {(data.gasType ?? 'cylinder') === 'cylinder' ? 'Cylinder' : 'Pipe'}
                  </span>
                  {data.gasCylinderInstallDate && (
                    <div className="text-amber-600">Installed: {formatDate(data.gasCylinderInstallDate)}</div>
                  )}
                  {data.gasCylinderBuyDate && (
                    <div className="text-muted-foreground">Bought: {formatDate(data.gasCylinderBuyDate)}</div>
                  )}
                </div>
              )}
              <div className="pt-2 space-y-0.5">
                {residentShares.map((rs) => (
                  <div key={rs.resident} className="flex justify-between">
                    <span>{rs.resident}</span>
                    <span>{formatEur(rs.share)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Per-person totals */}
      <Card>
        <CardHeader>
          <CardTitle>Per person</CardTitle>
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
                  <td className="py-2 font-medium">{rt.resident}</td>
                  <td className="py-2 text-right">{formatEur(rt.electricityShare)}</td>
                  <td className="py-2 text-right">{formatEur(rt.gasShare)}</td>
                  <td className="py-2 text-right">{formatEur(rt.waterShare)}</td>
                  {summary.internetTotal > 0 && (
                    <td className="py-2 text-right">{formatEur(rt.internetShare)}</td>
                  )}
                  <td className="py-2 text-right font-semibold">{formatEur(rt.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Attendance grids per utility — cylinder gas is an equal split so no grid needed */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Days at home</h2>
        {data.utilities.filter((u) => !(u.type === 'gas' && (data.gasType ?? 'cylinder') === 'cylinder')).map((utility) => {
          const isOpen = openAttendance === utility.type;
          return (
            <Card key={utility.type}>
              <CardHeader
                className="pb-2 cursor-pointer select-none"
                onClick={() => setOpenAttendance(isOpen ? null : utility.type)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    {UTILITY_LABELS[utility.type]} &mdash;{' '}
                    <span className="font-normal text-muted-foreground">
                      {formatDate(utility.periodStart)} → {formatDate(utility.periodEnd)}
                    </span>
                  </CardTitle>
                  <span className="text-muted-foreground text-xs">{isOpen ? '▲' : '▼'}</span>
                </div>
              </CardHeader>
              {isOpen && (
                <CardContent>
                  <AttendanceGrid utility={utility} residents={data.residents} />
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

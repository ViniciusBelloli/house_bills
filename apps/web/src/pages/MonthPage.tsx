import { useParams, Link } from 'react-router-dom';
import { buildMonthlySummary } from '@house-bills/bills-core';
import { useMonthlyData } from '@/hooks/useMonthlyData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatEur, formatDate } from '@/lib/utils';

const UTILITY_LABELS: Record<string, string> = {
  electricity: 'Luz',
  gas: 'Gás',
  water: 'Água',
};

export function MonthPage() {
  const { monthId } = useParams<{ monthId: string }>();
  const data = useMonthlyData(monthId ?? '');

  if (!data) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Month not found.{' '}
        <Link to="/" className="underline">
          Back to summary
        </Link>
      </div>
    );
  }

  const summary = buildMonthlySummary(data);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← All months
        </Link>
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
              <div>
                {formatDate(utility.periodStart)} → {formatDate(utility.periodEnd)}
              </div>
              <div>{totalParts.toFixed(2)} partes · {formatEur(euroPerPart)}/parte</div>
              {utility.notes && <div className="text-muted-foreground italic">{utility.notes}</div>}
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
    </div>
  );
}

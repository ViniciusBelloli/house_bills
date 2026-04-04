import { Link } from 'react-router-dom';
import { buildMonthlySummary } from '@house-bills/bills-core';
import { useAllMonthlyData } from '@/hooks/useMonthlyData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatEur } from '@/lib/utils';

export function SummaryPage() {
  const months = useAllMonthlyData();

  if (months.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No data found. Run <code>pnpm import</code> to generate month data.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">House Bills</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {months.map((data) => {
          const summary = buildMonthlySummary(data);
          return (
            <Link key={data.monthId} to={`/month/${data.monthId}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{data.monthLabel}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatEur(summary.grandTotal)}</p>
                  <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                    <div>Luz: {formatEur(summary.electricityTotal)}</div>
                    <div>Gás: {formatEur(summary.gasTotal)}</div>
                    <div>Água: {formatEur(summary.waterTotal)}</div>
                    {summary.internetTotal > 0 && (
                      <div>Internet: {formatEur(summary.internetTotal)}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

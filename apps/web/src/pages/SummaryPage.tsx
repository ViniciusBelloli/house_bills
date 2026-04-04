import { Link } from 'react-router-dom';
import { buildMonthlySummary } from '@house-bills/bills-core';
import { useAllMonthlyData } from '@/hooks/useMonthlyData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UtilityTrendChart } from '@/components/UtilityTrendChart';
import { ResidentTrendChart } from '@/components/ResidentTrendChart';
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

  const summaries = months.map(buildMonthlySummary);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">House Bills</h1>

      {/* Monthly cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaries.map((summary) => (
          <Link key={summary.monthId} to={`/month/${summary.monthId}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {summary.monthLabel}
                </CardTitle>
                <p className="text-xl font-bold">{formatEur(summary.grandTotal)}</p>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-0.5">
                <div className="flex justify-between">
                  <span>Luz</span>
                  <span>{formatEur(summary.electricityTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gás</span>
                  <span>{formatEur(summary.gasTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Água</span>
                  <span>{formatEur(summary.waterTotal)}</span>
                </div>
                {summary.internetTotal > 0 && (
                  <div className="flex justify-between">
                    <span>Internet</span>
                    <span>{formatEur(summary.internetTotal)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Utility costs by month</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <UtilityTrendChart summaries={summaries} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Per-person total by month</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResidentTrendChart summaries={summaries} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

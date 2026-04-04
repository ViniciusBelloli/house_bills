import { Link } from 'react-router-dom';
import { buildMonthlySummary, getGasCylinderRecords } from '@house-bills/bills-core';
import { useAllMonthlyData } from '@/hooks/useMonthlyData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UtilityTrendChart } from '@/components/UtilityTrendChart';
import { ResidentTrendChart } from '@/components/ResidentTrendChart';
import { AvgPerPersonChart } from '@/components/AvgPerPersonChart';
import { GasDurationChart } from '@/components/GasDurationChart';
import { formatEur } from '@/lib/utils';

export function SummaryPage() {
  const { data: months = [] } = useAllMonthlyData();
  const summaries = months.map(buildMonthlySummary);
  const cylinderRecords = getGasCylinderRecords(months);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold tracking-tight">House Bills</h1>
        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/residents"
            className="text-sm px-3 py-1.5 rounded-md border hover:bg-muted transition-colors"
          >
            Members
          </Link>
          <Link
            to="/new"
            className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            + New month
          </Link>
        </div>
      </div>

      {summaries.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">
          No data found. Run <code className="text-xs bg-muted px-1 py-0.5 rounded">pnpm import</code> to generate month data.
        </div>
      ) : (
        <>
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

          {/* Charts */}
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
                <CardTitle className="text-sm font-medium">Average per person by month</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <AvgPerPersonChart summaries={summaries} />
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Per-person total by month</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ResidentTrendChart summaries={summaries} />
              </CardContent>
            </Card>

            {cylinderRecords.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Gas cylinder duration (days)</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <GasDurationChart records={cylinderRecords} />
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}

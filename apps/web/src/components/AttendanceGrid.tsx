import { eachDayOfInterval, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { MonthlyBillData, UtilityBill } from '@house-bills/bills-core';

interface Props {
  utility: UtilityBill;
  residents: MonthlyBillData['residents'];
}

const WEIGHT_COLORS: Record<string, string> = {
  absent: 'bg-gray-100 text-gray-300',
  '1':    'bg-blue-100 text-blue-700',
  '1.2':  'bg-indigo-200 text-indigo-700',
};

function weightColor(w: number | null | undefined): string {
  if (w == null) return WEIGHT_COLORS.absent!;
  return WEIGHT_COLORS[String(w)] ?? 'bg-blue-100 text-blue-700';
}

export function AttendanceGrid({ utility, residents }: Props) {
  const days = eachDayOfInterval({
    start: parseISO(utility.periodStart),
    end: parseISO(utility.periodEnd),
  });
  const dates = days.map((d) => format(d, 'yyyy-MM-dd'));
  const activeResidents = residents.filter((r) => r.resident !== 'null');

  // Group dates by month for the header
  const months: Map<string, string[]> = new Map();
  for (const d of dates) {
    const ym = d.slice(0, 7);
    if (!months.has(ym)) months.set(ym, []);
    months.get(ym)!.push(d);
  }

  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse w-full">
        <thead>
          <tr>
            <th className="text-left pr-3 py-1 font-medium text-muted-foreground w-24 sticky left-0 bg-white">
              Resident
            </th>
            {Array.from(months.entries()).map(([ym, ds]) => (
              <th key={ym} colSpan={ds.length} className="text-center px-1 pb-1 font-normal text-muted-foreground border-b">
                {format(parseISO(ym + '-01'), 'MMM yy', { locale: ptBR })}
              </th>
            ))}
          </tr>
          <tr>
            <th className="sticky left-0 bg-white" />
            {days.map((d) => (
              <th key={d.toISOString()} className="px-0.5 pb-1 font-normal text-muted-foreground" style={{ minWidth: 22 }}>
                {format(d, 'd')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {activeResidents.map((r) => (
            <tr key={r.resident}>
              <td className="pr-3 py-1 font-medium sticky left-0 bg-white">{r.resident}</td>
              {dates.map((d) => {
                const w = r.days[d];
                return (
                  <td key={d} className="px-0.5 py-0.5 text-center">
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-medium ${weightColor(w)}`}
                      title={w != null ? `weight ${w}` : 'absent'}
                    >
                      {w != null ? w : '·'}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-4 rounded bg-blue-100" /> weight 1.0
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-4 rounded bg-indigo-200" /> weight 1.2
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-4 rounded bg-gray-100" /> absent
        </span>
      </div>
    </div>
  );
}

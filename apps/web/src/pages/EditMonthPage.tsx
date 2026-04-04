import { useParams, Navigate } from 'react-router-dom';
import { useMonthlyData } from '@/hooks/useMonthlyData';
import { MonthFormPage } from './MonthFormPage';

export function EditMonthPage() {
  const { monthId } = useParams<{ monthId: string }>();
  const { data, isLoading } = useMonthlyData(monthId ?? '');
  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>;
  }
  if (!data) return <Navigate to="/" replace />;
  return <MonthFormPage initialData={data} />;
}

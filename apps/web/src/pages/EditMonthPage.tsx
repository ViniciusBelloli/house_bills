import { useParams, Navigate } from 'react-router-dom';
import { useMonthlyData } from '@/hooks/useMonthlyData';
import { MonthFormPage } from './MonthFormPage';

export function EditMonthPage() {
  const { monthId } = useParams<{ monthId: string }>();
  const data = useMonthlyData(monthId ?? '');
  if (!data) return <Navigate to="/" replace />;
  return <MonthFormPage initialData={data} />;
}

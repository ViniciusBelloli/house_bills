import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { seedIfEmpty } from '@/db/seed';
import { SummaryPage } from '@/pages/SummaryPage';
import { MonthPage } from '@/pages/MonthPage';
import { NewMonthPage } from '@/pages/NewMonthPage';
import { EditMonthPage } from '@/pages/EditMonthPage';
import { ResidentsPage } from '@/pages/ResidentsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60, retry: false },
  },
});

function AppRoutes() {
  // Seed IndexedDB from static JSON files on first run (runs once per session)
  const { isPending, isError } = useQuery({
    queryKey: ['db-seed'],
    queryFn: seedIfEmpty,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-screen text-sm text-destructive">
        Failed to initialize local database. Please refresh.
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<SummaryPage />} />
        <Route path="/month/:monthId" element={<MonthPage />} />
        <Route path="/month/:monthId/edit" element={<EditMonthPage />} />
        <Route path="/new" element={<NewMonthPage />} />
        <Route path="/residents" element={<ResidentsPage />} />
      </Routes>
    </HashRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRoutes />
    </QueryClientProvider>
  );
}

export default App;

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { SummaryPage } from '@/pages/SummaryPage';
import { MonthPage } from '@/pages/MonthPage';
import { NewMonthPage } from '@/pages/NewMonthPage';
import { EditMonthPage } from '@/pages/EditMonthPage';
import { ResidentsPage } from '@/pages/ResidentsPage';
import { LoginPage } from '@/pages/LoginPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60, retry: false },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<SummaryPage />} />
          <Route path="/month/:monthId" element={<MonthPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/month/:monthId/edit" element={<ProtectedRoute><EditMonthPage /></ProtectedRoute>} />
          <Route path="/new" element={<ProtectedRoute><NewMonthPage /></ProtectedRoute>} />
          <Route path="/residents" element={<ProtectedRoute><ResidentsPage /></ProtectedRoute>} />
        </Routes>
      </HashRouter>
    </QueryClientProvider>
  );
}

export default App;

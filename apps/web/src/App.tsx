import { HashRouter, Routes, Route } from 'react-router-dom';
import { DataProvider } from '@/context/DataContext';
import { SummaryPage } from '@/pages/SummaryPage';
import { MonthPage } from '@/pages/MonthPage';
import { NewMonthPage } from '@/pages/NewMonthPage';
import { EditMonthPage } from '@/pages/EditMonthPage';
import { ResidentsPage } from '@/pages/ResidentsPage';

function App() {
  return (
    <DataProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<SummaryPage />} />
          <Route path="/month/:monthId" element={<MonthPage />} />
          <Route path="/month/:monthId/edit" element={<EditMonthPage />} />
          <Route path="/new" element={<NewMonthPage />} />
          <Route path="/residents" element={<ResidentsPage />} />
        </Routes>
      </HashRouter>
    </DataProvider>
  );
}

export default App;

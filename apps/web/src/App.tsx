import { HashRouter, Routes, Route } from 'react-router-dom';
import { SummaryPage } from '@/pages/SummaryPage';
import { MonthPage } from '@/pages/MonthPage';
import { NewMonthPage } from '@/pages/NewMonthPage';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<SummaryPage />} />
        <Route path="/month/:monthId" element={<MonthPage />} />
        <Route path="/new" element={<NewMonthPage />} />
      </Routes>
    </HashRouter>
  );
}

export default App;

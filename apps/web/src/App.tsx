import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SummaryPage } from '@/pages/SummaryPage';
import { MonthPage } from '@/pages/MonthPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SummaryPage />} />
        <Route path="/month/:monthId" element={<MonthPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

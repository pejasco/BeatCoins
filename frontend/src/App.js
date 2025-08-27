import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import RealTimePage from './RealTimePage';
import HistoricalPage from './HistoricalPage';

function App() {
  return (
    <Router>
      <nav>
        <Link to="/">Real-Time</Link> | <Link to="/historical">Historical</Link>
      </nav>
      <Routes>
        <Route path="/" element={<RealTimePage />} />
        <Route path="/historical" element={<HistoricalPage />} />
      </Routes>
    </Router>
  );
}

export default App;
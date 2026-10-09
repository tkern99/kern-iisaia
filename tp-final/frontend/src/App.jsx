import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Editor from './pages/Editor';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/editor/demo" replace />} />
        <Route path="/editor/:id" element={<Editor />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

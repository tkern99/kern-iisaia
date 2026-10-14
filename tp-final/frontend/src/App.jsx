import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Editor from './pages/Editor';
import LoginModal from './components/auth/LoginModal';
import { useAuthStore } from './store/useAuthStore';
import './index.css';

function App() {
  const { user } = useAuthStore();

  return (
    <BrowserRouter>
      {!user && <LoginModal />}
      <Routes>
        <Route path="/" element={<Navigate to="/editor/demo" replace />} />
        <Route path="/editor/:id" element={<Editor />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

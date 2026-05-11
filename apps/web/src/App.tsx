import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import { useAuth } from './hooks/useAuth';
import { AdminGuard } from './router';
import Repos from './pages/admin/Repos';
import Settings from './pages/admin/Settings';

function App() {
  const { data: user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Home />} />
      <Route path="/feed" element={<div>Feed page (TODO)</div>} />

      {/* Protected admin routes */}
      <Route
        path="/admin/*"
        element={
          <AdminGuard>
            <Routes>
              <Route path="repos" element={<Repos />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/admin/repos" replace />} />
            </Routes>
          </AdminGuard>
        }
      />

      {/* Redirect to home if not logged in and trying to access admin */}
      <Route
        path="/admin/*"
        element={
          !user ? <Navigate to="/login" state={{ from: location }} replace /> : null
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

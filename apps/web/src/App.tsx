import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layouts/MainLayout';
import Home from './pages/Home';
import Login from './pages/Login';
import { ProtectedRoute } from './router';
import Repos from './pages/admin/Repos';
import Settings from './pages/admin/Settings';
import { AuthProvider } from './hooks/useAuth';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* 公开路由 */}
        <Route path="/login" element={<Login />} />

        {/* 受保护的路由 - 带 Layout 导航 */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/feed" element={<div>Feed page (TODO)</div>} />
            <Route path="/admin" element={<Repos />} />
            <Route path="/admin/settings" element={<Settings />} />
          </Route>
        </Route>

        {/* 兜底 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
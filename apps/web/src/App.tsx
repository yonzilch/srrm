import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import { AdminGuard } from './router';
import Repos from './pages/admin/Repos';
import Settings from './pages/admin/Settings';

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Home />} />
      <Route path="/feed" element={<div>Feed page (TODO)</div>} />

      {/* Protected admin routes */}
      <Route element={<AdminGuard />}>
        <Route path="/admin" element={<Repos />} />
        <Route path="/admin/settings" element={<Settings />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
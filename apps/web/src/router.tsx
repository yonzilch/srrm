import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // ProtectedRoute 只检查登录态，不检查角色
  // 角色检查由各页面组件自行处理
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
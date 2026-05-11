import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

export const AdminGuard = () => {
  const { data: user, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!user || user.role !== 'admin') return <Navigate to="/login" replace />;
  return <Outlet />;
};
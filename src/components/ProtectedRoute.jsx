import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

const Carregando = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
  </div>
);

export default function ProtectedRoute() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const { pathname, search } = useLocation();

  if (isLoadingAuth) return <Carregando />;

  if (!isAuthenticated) {
    const destino = pathname + search;
    const query = destino !== '/' ? `?returnTo=${encodeURIComponent(destino)}` : '';
    return <Navigate to={`/login${query}`} replace />;
  }

  return <Outlet />;
}

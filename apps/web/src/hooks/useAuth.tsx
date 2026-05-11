import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@srrm/shared';

interface AuthContextValue {
  user: User | undefined;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function useAuthInternal(): AuthContextValue {
  const [user, setUser] = useState<User | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const data = await res.json();
        if (cancelled) return;
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          setUser(undefined);
        }
      } catch {
        if (cancelled) return;
        setUser(undefined);
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };

    checkAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(undefined);
    navigate('/login');
  };

  return { user, loading, logout };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const value = useAuthInternal();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
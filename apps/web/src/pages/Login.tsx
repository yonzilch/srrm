import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = () => {
    setLoading(true);
    setError(null);
    window.location.href = '/api/auth/login';
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const data = await res.json();
        if (data.authenticated) navigate('/', { replace: true });
      } catch { /* not authenticated, stay on login */ }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-ctp-base">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-ctp-text">Serverless Release Monitor</h2>
          <p className="text-ctp-subtext1 mt-2">Sign in to manage your repository releases</p>
        </div>
        {error && (
          <div className="bg-ctp-red/10 border border-ctp-red/20 text-ctp-red px-4 py-3 rounded-xl text-sm">{error}</div>
        )}
        <button onClick={handleLogin} disabled={loading}
          className="w-full flex items-center justify-center px-4 py-3 bg-ctp-blue text-ctp-base font-medium rounded-xl hover:bg-ctp-blue/90 transition-colors disabled:opacity-50">
          {loading ? 'Signing in...' : 'Sign in with SSO'}
        </button>
        <p className="text-xs text-ctp-overlay1 text-center">
          This demo uses a simulated SSO flow. In production, this would redirect to your identity provider.
        </p>
      </div>
    </div>
  );
}

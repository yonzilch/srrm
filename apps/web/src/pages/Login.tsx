import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';

export default function Login() {
  const { t } = useI18n();
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
      } catch {
        /* not authenticated, stay on login */
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-ctp-crust flex items-center justify-center text-ctp-text">
      <div className="w-full max-w-md space-y-6 px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight">{t('login.title')}</h2>
          <p className="text-ctp-subtext1 mt-2">{t('login.subtitle')}</p>
        </div>
        {error && (
          <div className="bg-ctp-red/10 border border-ctp-red/20 text-ctp-red px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-ctp-blue text-ctp-base font-medium rounded-lg hover:bg-ctp-blue/90 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-ctp-text" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span>{t('login.signingIn')}</span>
            </>
          ) : (
            t('login.signInWithSSO')
          )}
        </button>
        <p className="text-xs text-ctp-overlay1 text-center">
          {t('login.demoNote')}
        </p>
      </div>
    </div>
  );
}
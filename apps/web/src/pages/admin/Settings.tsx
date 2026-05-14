import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../contexts/I18nContext';

interface NotifyStatus {
  name: string;
  configured: boolean;
}

interface TestResult {
  notifier: string;
  success: boolean;
  error?: string;
}

export default function Settings() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [notifyStatus, setNotifyStatus] = useState<NotifyStatus[] | null>(null);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [showTestSuccess, setShowTestSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/admin/notify/status')
      .then(res => res.json())
      .then(data => setNotifyStatus(data))
      .catch(err => console.error('[Settings] Failed to load notify status:', err));
  }, []);

  const handleTestNotify = async () => {
    setTesting(true);
    setTestError(null);
    setShowTestSuccess(false);
    setTestResults(null);
    try {
      const res = await fetch('/api/admin/notify/test', { method: 'POST' });
      const data = await res.json();
      setTestResults(data.results || []);
      if (!data.ok) {
        setTestError(data.message || t('settings.testFailure', { error: '' }));
      } else {
        setShowTestSuccess(true);
        setTimeout(() => setShowTestSuccess(false), 3000);
      }
    } catch (err: unknown) {
      setTestError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setTesting(false);
    }
  };

  const notifierHints: Record<string, string> = {
    Gotify: t('settings.hintGotify'),
    Apprise: t('settings.hintApprise'),
    Webhook: t('settings.hintWebhook'),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ctp-text">{t('settings.title')}</h1>
        <p className="text-ctp-subtext1 mt-1">{t('settings.accountInfo')}</p>
      </div>

      <div className="rounded-xl border border-ctp-surface1 bg-ctp-surface0/40 p-6">
        <h2 className="text-xl font-semibold mb-4 text-ctp-text">{t('settings.accountInfo')}</h2>
        <div className="space-y-2">
          <p className="text-sm text-ctp-subtext1">
            {t('settings.email')}: <span className="text-ctp-text font-medium">{user?.email || 'Unknown'}</span>
          </p>
          <p className="text-sm text-ctp-subtext1">
            {t('settings.role')}: <span className="text-ctp-subtext1 font-medium capitalize">{user?.role || 'Unknown'}</span>
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-ctp-surface1 bg-ctp-surface0/40 p-6">
        <h2 className="text-xl font-semibold mb-4 text-ctp-text">{t('settings.notifications')}</h2>

        {notifyStatus === null ? (
          <p className="text-sm text-ctp-subtext1">{t('common.loading')}...</p>
        ) : (
          <div className="space-y-3">
            {notifyStatus.map((item) => {
              const hint = notifierHints[item.name] || '';
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-lg border border-ctp-surface1 bg-ctp-surface0/60 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-ctp-text text-sm font-medium">
                      {item.configured ? '●' : '○'} {item.name}
                    </span>
                    {!item.configured && (
                      <span className="text-xs text-ctp-subtext1">{hint}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {item.configured ? (
                      <span className="text-xs text-ctp-green">{t('settings.configured')}</span>
                    ) : (
                      <span className="text-xs text-ctp-red">{t('settings.notConfigured')}</span>
                    )}
                  </div>
                </div>
              );
            })}

            <button
              onClick={handleTestNotify}
              disabled={testing || !notifyStatus.some(n => n.configured)}
              className="mt-4 rounded-lg bg-ctp-peach px-4 py-2 text-sm font-medium text-ctp-crust transition-colors hover:bg-ctp-peach/80 disabled:opacity-50"
            >
              {testing ? t('settings.testing') : t('settings.testNotify')}
            </button>

            {showTestSuccess && (
              <p className="text-sm text-ctp-green mt-2">✓ {t('settings.testSuccess')}</p>
            )}

            {testError && (
              <p className="text-sm text-ctp-red mt-2">✗ {testError}</p>
            )}

            {testResults && testResults.length > 0 && (
              <div className="mt-3 space-y-1">
                {testResults.map((r, i) => (
                  <p
                    key={i}
                    className={`text-xs ${r.success ? 'text-ctp-green' : 'text-ctp-red'}`}
                  >
                    {r.success ? '✓' : '✗'} {r.notifier}
                    {r.error && `: ${r.error}`}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-ctp-surface1 bg-ctp-surface0/40 p-6">
        <h2 className="text-xl font-semibold mb-4 text-ctp-text">{t('settings.about')}</h2>
        <div className="space-y-1">
          <p className="text-sm text-ctp-subtext1">{t('settings.version')}</p>
          <p className="text-sm text-ctp-overlay0">{t('settings.aboutDesc')}</p>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { detectPlatform } from '../utils/platform';

// Platform icon SVG (16x16 inline)
function PlatformIcon({ platform, size = 16 }: { platform: string; size?: number }) {
  const s = size;
  switch (platform) {
    case 'github':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
        </svg>
      );
    case 'gitlab':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor">
          <path d="M14.97 8.49L14.19 6.1l-1.54-4.66a.41.41 0 00-.78 0L10.33 6.1H5.67L4.13 1.44a.41.41 0 00-.78 0L1.81 6.1.03 8.49a.83.83 0 00.3 1.13L8 15l7.67-5.38a.83.83 0 00.3-1.13z"/>
        </svg>
      );
    case 'forgejo':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 2h4v4H2V2zm8 0h4v4h-4V2zM6 6h4v4H6V6zm-4 4h4v4H2v-4zm8 0h4v4h-4v-4z"/>
        </svg>
      );
    case 'gitea':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0L0 8l8 8 8-8-8-8zm0 2.5l5.5 5.5L8 13.5 2.5 8 8 2.5z"/>
        </svg>
      );
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 14.5a6.5 6.5 0 110-13 6.5 6.5 0 010 13z"/>
        </svg>
      );
  }
}

interface AddRepoFormProps {
  onSuccess?: () => void;
}

export default function AddRepoForm({ onSuccess }: AddRepoFormProps) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const detected = url.trim() ? detectPlatform(url.trim()) : null;

  const validate = useCallback((input: string): string | null => {
    if (!input.trim()) return '请输入仓库地址';
    if (input.trim().indexOf('://') !== -1) {
      try { new URL(input.trim()); } catch { return 'URL 格式不正确'; }
    }
    if (!detectPlatform(input.trim())) return '无法识别仓库地址，请使用完整 URL 或 owner/repo 格式';
    return null;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validate(url);
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      await api.admin.repos.add({ url: url.trim() });
      setSuccess('✓ 仓库已添加，正在后台抓取最新 releases...');
      setUrl('');
      queryClient.invalidateQueries({ queryKey: ['admin-repos'] });
      queryClient.invalidateQueries({ queryKey: ['releases'] });
      onSuccess?.();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || '添加仓库失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-ctp-surface0/50 rounded-xl border border-ctp-surface1 p-5 space-y-4">
      <h2 className="text-lg font-semibold text-ctp-text">Add Repository</h2>
      <p className="text-sm text-ctp-subtext1">
        支持 GitHub / GitLab / Forgejo / Gitea（含 Codeberg 等自托管实例）
      </p>

      {error && (
        <div className="bg-ctp-red/10 border border-ctp-red/20 text-ctp-red px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-ctp-green/10 border border-ctp-green/20 text-ctp-green px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium text-ctp-subtext1">仓库地址</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="如 https://codeberg.org/owner/repo 或 owner/repo（默认 GitHub）"
            className="flex-1 px-3 py-2 bg-ctp-surface1 text-ctp-text rounded-lg border border-ctp-surface2 focus:outline-none focus:ring-1 focus:ring-ctp-blue focus:border-ctp-blue text-sm"
            disabled={loading}
          />
          {detected && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-ctp-surface1 rounded-lg border border-ctp-surface2" title={detected.platform + ' — ' + detected.baseUrl}>
              <span className="text-ctp-blue"><PlatformIcon platform={detected.platform} size={16} /></span>
              <span className="text-xs text-ctp-subtext1 capitalize">{detected.platform}</span>
            </div>
          )}
        </div>
        {detected && (
          <p className="text-xs text-ctp-subtext1">
            识别为 <span className="text-ctp-blue font-medium capitalize">{detected.platform}</span>
            {' '}· {detected.baseUrl}/{detected.owner}/{detected.repo}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || !url.trim()}
        className="inline-flex items-center gap-2 px-4 py-2 bg-ctp-blue text-ctp-base font-medium rounded-lg hover:bg-ctp-blue/90 transition-colors disabled:opacity-50 text-sm"
      >
        {loading ? '添加中...' : 'Add Repository'}
      </button>
    </form>
  );
}

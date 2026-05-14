import React, { useState, useCallback } from 'react';
import AddRepoForm from '../../components/AddRepoForm';
import { useAuth } from '../../hooks/useAuth';
import { useAdminRepos } from '../../hooks/useReleases';
import { api } from '../../api/client';
import { useQueryClient } from '@tanstack/react-query';

// Platform icon (inline SVG)
function PlatformIcon({ platform, size = 16 }: { platform: string; size?: number }) {
  const s = size;
  switch (platform) {
    case 'github':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
      );
    case 'gitlab':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor">
          <path d="M14.97 8.49L14.19 6.1l-1.54-4.66a.41.41 0 00-.78 0L10.33 6.1H5.67L4.13 1.44a.41.41 0 00-.78 0L1.81 6.1.03 8.49a.83.83 0 00.3 1.13L8 15l7.67-5.38a.83.83 0 00.3-1.13z" />
        </svg>
      );
    case 'forgejo':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 2h4v4H2V2zm8 0h4v4h-4V2zM6 6h4v4H6V6zm-4 4h4v4H2v-4zm8 0h4v4h-4v-4z" />
        </svg>
      );
    case 'gitea':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0L0 8l8 8 8-8-8-8zm0 2.5l5.5 5.5L8 13.5 2.5 8 8 2.5z" />
        </svg>
      );
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 14.5a6.5 6.5 0 110-13 6.5 6.5 0 010 13z" />
        </svg>
      );
  }
}

// Relative time helper
function relativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

// Repo Card component with remove confirmation
function RepoCard({
  repo,
  onRemoveConfirm,
}: {
  repo: { id: string; fullName: string; repoUrl: string; platform: string; addedAt: string };
  onRemoveConfirm: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  let timeoutRef: ReturnType<typeof setTimeout> | null = null;

  const startConfirm = () => {
    setConfirming(true);
    timeoutRef = setTimeout(() => setConfirming(false), 3000);
  };

  const cancelConfirm = () => {
    setConfirming(false);
    if (timeoutRef) clearTimeout(timeoutRef);
  };

  const confirmRemove = () => {
    if (timeoutRef) clearTimeout(timeoutRef);
    onRemoveConfirm(repo.id);
    setConfirming(false);
  };

  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg border border-ctp-surface1/50 hover:bg-white/[0.02] transition-colors group">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Platform icon */}
        <span className="text-ctp-overlay1 shrink-0">
          <PlatformIcon platform={repo.platform || 'github'} size={18} />
        </span>

        {/* Repo name */}
        <div className="min-w-0 flex-1">
          <a
            href={repo.repoUrl || 'https://github.com/' + repo.fullName}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-ctp-text truncate hover:text-ctp-blue hover:underline transition-colors text-sm"
          >
            {repo.fullName}
          </a>
          <div className="flex items-center gap-1.5 mt-0.5">
            <a
              href={repo.repoUrl || 'https://github.com/' + repo.fullName}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-ctp-overlay0 hover:text-ctp-subtext1 truncate max-w-[200px]"
            >
              {repo.repoUrl || 'github.com/' + repo.fullName}
            </a>
            <span className="text-[11px] text-ctp-overlay0">·</span>
            <span className="text-[11px] text-ctp-overlay0">{relativeTime(repo.addedAt)}</span>
          </div>
        </div>
      </div>

      {/* Remove button */}
      {!confirming ? (
        <button
          onClick={startConfirm}
          className="text-[12px] text-ctp-overlay1 hover:text-ctp-red hover:bg-ctp-red/10 rounded-lg px-3 py-1.5 transition-colors shrink-0 ml-2"
        >
          Remove
        </button>
      ) : (
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <button
            onClick={confirmRemove}
            className="text-[12px] bg-ctp-red text-ctp-base font-medium rounded-lg px-3 py-1.5 hover:bg-ctp-red/90 transition-colors"
          >
            Yes
          </button>
          <button
            onClick={cancelConfirm}
            className="text-[12px] text-ctp-subtext1 hover:text-ctp-text rounded-lg px-2.5 py-1.5 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default function Repos() {
  const { user } = useAuth();
  const { data: repos = [], isLoading, error, refetch } = useAdminRepos();
  const queryClient = useQueryClient();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemoveConfirm = async (id: string) => {
    setRemovingId(id);
    try {
      await api.admin.repos.remove(id);
      queryClient.invalidateQueries({ queryKey: ['admin-repos'] });
      queryClient.invalidateQueries({ queryKey: ['releases'] });
    } catch (e: any) {
      console.error('Remove repo failed:', e.message);
    } finally {
      setRemovingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-ctp-surface0/60 rounded-xl border border-ctp-surface1 p-5 animate-pulse">
            <div className="h-5 w-48 bg-ctp-surface2 rounded-lg mb-3" />
            <div className="h-4 w-full bg-ctp-surface2/60 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-ctp-red text-lg">Error: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Repositories</h1>
      </div>

      <AddRepoForm onSuccess={() => refetch()} />

      <div>
        <h2 className="text-lg font-semibold text-ctp-text mb-4">
          Monitoring {repos.length} repositories
        </h2>

        {repos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">📡</div>
            <h3 className="text-lg font-semibold text-ctp-subtext1 mb-2">No repositories yet</h3>
            <p className="text-sm text-ctp-overlay0 mb-6">
              Add your first repository above to start monitoring releases.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {repos.map((repo: any) => (
              <RepoCard
                key={repo.id}
                repo={repo}
                onRemoveConfirm={handleRemoveConfirm}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
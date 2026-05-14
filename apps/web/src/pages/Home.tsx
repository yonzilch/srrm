import React from 'react';
import { useReleases, useAdminRepos, useTriggerScrape } from '../hooks/useReleases';
import ReleaseTimeline from '../components/ReleaseTimeline';
import RepoFilterBar from '../components/RepoFilterBar';
import FeedSubscribeButton from '../components/FeedSubscribeButton';
import type { Repo } from '@srrm/shared';
import { useI18n } from '../contexts/I18nContext';

// Spinner SVG
function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-ctp-text" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// 格式化日期时间
function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Home() {
  const { t } = useI18n();
  const { data: releases, isLoading, error } = useReleases();
  const { data: repos = [], isLoading: reposLoading, refetch } = useAdminRepos();
  const triggerScrape = useTriggerScrape();
  const [filter, setFilter] = React.useState<string>('');

  const filteredReleases = releases
    ? releases.filter((r) => {
        if (!filter) return true;
        return r.repoFullName.toLowerCase().includes(filter.toLowerCase());
      })
    : [];

  // 最后更新时间
  const lastRunText = React.useMemo(() => {
    if (releases && releases.length > 0) {
      const sorted = [...releases].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
      return formatDateTime(sorted[0].publishedAt);
    }
    return '—';
  }, [releases]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <HomeHeaderSkeleton />
        <div className="mt-4 space-y-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-ctp-surface1 rounded-lg h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-ctp-red text-lg">
          {t('common.error')}: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* 标题行 */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ctp-text tracking-tight">
              {t('releases.title')}
            </h1>
            <p className="text-sm text-ctp-subtext2 mt-1">
              {t('releases.subtitle', {
                count: String(repos.length),
                time: lastRunText,
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <FeedSubscribeButton />
            <ScrapeButton triggerScrape={triggerScrape} reposLoading={reposLoading} />
          </div>
        </div>
      </div>

      {/* 仓库筛选 */}
      <RepoFilterBar
        options={repos.map((r: Repo) => ({ label: r.fullName, value: r.fullName }))}
        value={filter}
        onChange={setFilter}
      />

      {/* 发布时间线 */}
      {filteredReleases.length > 0 ? (
        <ReleaseTimeline releases={filteredReleases} filter={filter} />
      ) : (
        <EmptyState onAddRepo={() => {}} />
      )}
    </div>
  );
}

// 独立的 Check for Updates 按钮
function ScrapeButton({
  triggerScrape,
  reposLoading,
}: {
  triggerScrape: () => Promise<void>;
  reposLoading: boolean;
}) {
  const { t } = useI18n();
  const [state, setState] = React.useState<'idle' | 'loading' | 'done'>('idle');

  const handleClick = async () => {
    setState('loading');
    try {
      await triggerScrape();
      setState('done');
      setTimeout(() => setState('idle'), 2000);
    } catch {
      setState('idle');
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={state === 'loading' || reposLoading}
      className="inline-flex items-center gap-2 px-4 py-2 bg-ctp-surface1 text-ctp-subtext1 rounded-lg border border-ctp-surface2 hover:bg-ctp-surface2 hover:text-ctp-text transition-colors disabled:opacity-50 text-sm font-medium"
    >
      {state === 'loading' ? (
        <>
          <Spinner />
          <span>{t('releases.checking')}</span>
        </>
      ) : state === 'done' ? (
        <>
          <svg className="h-4 w-4 text-ctp-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{t('releases.updated')}</span>
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{t('releases.checkForUpdates')}</span>
        </>
      )}
    </button>
  );
}

// 加载骨架屏
function HomeHeaderSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="h-7 w-64 bg-ctp-surface1 rounded-lg animate-pulse" />
        <div className="h-4 w-80 bg-ctp-surface1/60 rounded-lg animate-pulse" />
      </div>
      <div className="flex gap-3">
        <div className="h-9 w-32 bg-ctp-surface1 rounded-lg animate-pulse" />
        <div className="h-9 w-40 bg-ctp-surface1 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

// 空状态
function EmptyState({ onAddRepo }: { onAddRepo: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4">📡</div>
      <h3 className="text-lg font-semibold text-ctp-subtext1 mb-2">
        {t('releases.empty')}
      </h3>
      <p className="text-sm text-ctp-overlay0 max-w-md mb-6">
        {t('releases.emptyDesc')}
      </p>
      <a
        href="/admin"
        className="inline-flex items-center gap-2 px-4 py-2 bg-ctp-surface1 text-ctp-subtext1 rounded-lg border border-ctp-surface2 hover:bg-ctp-surface2 hover:text-ctp-text transition-colors text-sm font-medium"
      >
        {t('releases.goToRepos')}
      </a>
    </div>
  );
}
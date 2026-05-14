import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Release } from '@srrm/shared';
import DOMPurify from 'dompurify';
import { useI18n } from '../contexts/I18nContext';

interface ReleaseTimelineProps {
  releases: Release[];
  filter?: string;
  onScrollToDate?: (date: string) => void;
}

// 日期格式化
function formatDateFriendly(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// 相对时间
function relativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDateFriendly(dateStr);
}

// 发布类型图标颜色
function statusColor(release: Release): string {
  if (release.isDraft) return 'text-ctp-overlay0';
  if (release.isPrerelease) return 'text-ctp-orange';
  return 'text-ctp-green';
}

// 日期分组 Chip
function DateChip({
  date,
  count,
  isActive,
  onClick,
}: {
  date: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
        isActive
          ? 'bg-ctp-blue/20 text-ctp-blue border border-ctp-blue/50'
          : 'bg-ctp-surface1 text-ctp-subtext2 border border-transparent hover:bg-ctp-surface2 hover:text-ctp-subtext1'
      }`}
    >
      <span>{date}</span>
      <span className={`text-[10px] px-1.5 rounded-full ${
        isActive
          ? 'bg-ctp-blue/40 text-ctp-text'
          : 'bg-ctp-surface2 text-ctp-overlay0'
      }`}>
        {count}
      </span>
    </button>
  );
}

// Release 卡片
function ReleaseCard({ release, isOpen, onToggle }: {
  release: Release;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { t } = useI18n();
  const bodyRef = useRef<HTMLDivElement>(null);

  const handleTagClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  useEffect(() => {
    if (!bodyRef.current) return;
    bodyRef.current.querySelectorAll('a[href^="http"]').forEach((a) => {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });
  }, [release.bodyHtml, release.body, isOpen]);

  const renderBody = () => {
    const html = release.bodyHtml || release.body;
    const hasHtml = !!release.bodyHtml;

    if (!html) {
      return (
        <p className="text-ctp-overlay1 text-sm italic">
          {t('feed.noNotes')}
        </p>
      );
    }

    if (hasHtml) {
      const clean = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'br', 'hr',
          'ul', 'ol', 'li',
          'blockquote', 'pre', 'code',
          'strong', 'em', 'del', 's',
          'a', 'img',
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'details', 'summary',
        ],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel'],
        FORCE_BODY: false,
      });

      return (
        <div
          ref={bodyRef}
          className="release-notes prose prose-invert prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: clean }}
        />
      );
    }

    return (
      <pre className="text-ctp-text text-sm whitespace-pre-wrap font-sans leading-relaxed">
        {html}
      </pre>
    );
  };

  return (
    <div className="border-b border-white/[0.05]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 py-3 px-4 text-left hover:bg-white/[0.03] transition-colors group rounded-lg mx-[-4px] px-4"
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${statusColor(release)}`} />

        <span className="font-medium text-ctp-subtext1 truncate text-sm">
          {release.repoFullName}
        </span>

        <a
          href={release.htmlUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleTagClick}
          onMouseDown={(e) => e.preventDefault()}
          className="inline-flex items-center shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium bg-ctp-blue/15 text-ctp-blue border border-ctp-blue/25 hover:underline cursor-pointer transition-colors"
        >
          {release.tagName}
        </a>

        {!!release.isPrerelease ? (
          <span className="inline-flex items-center shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-ctp-orange/15 text-ctp-orange border border-ctp-orange/25">
            {t('feed.prerelease')}
          </span>
        ) : null}

        {release.name && release.name !== release.tagName && (
          <span className="text-ctp-overlay0 text-sm truncate flex-1">
            {release.name}
          </span>
        )}

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <span className="text-[11px] text-ctp-overlay0">
            {relativeTime(release.publishedAt)}
          </span>
          <span
            className={`text-[10px] text-ctp-overlay0 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          >
            ▾
          </span>
        </div>
      </button>

      <div
        className={`overflow-hidden transition-[max-height,opacity] duration-200 ease-in-out ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className={isOpen ? 'overflow-y-auto max-h-96' : ''}>
          <div className="pb-4 px-4 pl-8">
            <div className="h-px bg-white/[0.06] mb-3" />

            <div className="space-y-2">
              <span className="text-[11px] font-medium text-ctp-overlay0 uppercase tracking-wider">
                {t('feed.notes')}
              </span>
              <div className="bg-ctp-surface0/50 rounded-lg p-3 border border-ctp-surface1/50">
                {renderBody()}
              </div>
            </div>
            {/* View Full 已由 Read full notes 替代，移除 */}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReleaseTimeline({
  releases,
  filter = '',
  onScrollToDate,
}: ReleaseTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const grouped = releases.reduce(
    (acc: Record<string, Release[]>, release) => {
      if (filter && !release.repoFullName.toLowerCase().includes(filter.toLowerCase())) {
        return acc;
      }
      const date = release.publishedAt.split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(release);
      return acc;
    },
    {}
  );

  const dates = Object.keys(grouped).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  const toggleRelease = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleDateChipClick = useCallback(
    (date: string) => {
      setActiveDate(date);
      const el = document.getElementById(`date-${date}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      onScrollToDate?.(date);
      setTimeout(() => setActiveDate(null), 1500);
    },
    [onScrollToDate]
  );

  if (dates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-5xl mb-4">📡</div>
        <h3 className="text-lg font-semibold text-ctp-subtext1 mb-2">
          {/* Reuse same empty text as Home */}
          No releases yet
        </h3>
        <p className="text-sm text-ctp-overlay0 mb-6">
          Add repositories in the Repos tab and click <em>Check for Updates</em> to start monitoring releases.
        </p>
        <a
          href="/admin"
          className="inline-flex items-center gap-2 px-4 py-2 bg-ctp-surface1 text-ctp-subtext1 rounded-lg border border-ctp-surface2 hover:bg-ctp-surface2 hover:text-ctp-text transition-colors text-sm font-medium"
        >
          Go to Repos →
        </a>
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      <div className="flex flex-wrap gap-2 mb-6">
        {dates.map((date) => (
          <DateChip
            key={date}
            date={formatDateFriendly(date)}
            count={grouped[date].length}
            isActive={activeDate === date}
            onClick={() => handleDateChipClick(date)}
          />
        ))}
      </div>

      <div className="rounded-xl border border-white/[0.05] bg-ctp-base/40 overflow-hidden">
        {dates.map((date, dateIndex) => (
          <div key={date}>
            <div
              id={`date-${date}`}
              className={`flex items-center gap-3 py-3 px-4 ${dateIndex === 0 ? 'border-b border-white/[0.05]' : 'border-t border-white/[0.05]'}`}
            >
              <div className="w-px h-5 bg-ctp-blue/40 rounded-full shrink-0" />
              <span className="text-sm font-medium text-ctp-text">
                {formatDateFriendly(date)}
              </span>
            </div>

            {grouped[date].map((release) => (
              <ReleaseCard
                key={release.id}
                release={release}
                isOpen={expandedId === release.id}
                onToggle={() => toggleRelease(release.id)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
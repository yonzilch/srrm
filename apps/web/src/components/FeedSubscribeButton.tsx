import React, { useState } from 'react';
import { useI18n } from '../contexts/I18nContext';

// RSS SVG 图标
function RssIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 11a9 9 0 0 1 9 9" />
      <path d="M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1" />
    </svg>
  );
}

export default function FeedSubscribeButton() {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + '/feed.xml');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Failed to copy link');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ctp-surface1 text-ctp-subtext1 text-sm rounded-lg border border-ctp-surface2 hover:bg-ctp-surface2 hover:text-ctp-text transition-colors"
      >
        <RssIcon className="h-4 w-4" />
        {copied ? 'Copied!' : 'RSS'}
      </button>
      <a
        href="/feed.xml"
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-ctp-overlay0 hover:text-ctp-blue transition-colors"
      >
        {t('feed.previewFeed')}
      </a>
    </div>
  );
}
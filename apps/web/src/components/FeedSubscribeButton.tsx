import { useState } from 'react';

export default function FeedSubscribeButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + '/feed.xml');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert('Failed to copy link');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCopy}
        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
      >
        {copied ? 'Copied!' : 'Copy RSS Link'}
      </button>
      <a
        href="/feed.xml"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-600 hover:text-blue-800"
      >
        Preview
      </a>
    </div>
  );
}

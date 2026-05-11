import { useReleases } from '../hooks/useReleases';
import { useAdminRepos } from '../hooks/useAdminRepos';
import { useTriggerScrape } from '../hooks/useTriggerScrape';
import ReleaseTimeline from '../components/ReleaseTimeline';
import RepoFilterBar from '../components/RepoFilterBar';
import FeedSubscribeButton from '../components/FeedSubscribeButton';
import { useState } from 'react';

export default function Home() {
  const { data: releases, isLoading, error } = useReleases();
  const { data: repos = [], isLoading: reposLoading } = useAdminRepos();
  const triggerScrape = useTriggerScrape();
  const [filter, setFilter] = useState<string>('');

  if (isLoading) return <div>Loading releases...</div>;
  if (error) return <div>Error loading releases: {error.message}</div>;

  const repoOptions = repos.map(r => ({
    label: r.fullName,
    value: r.fullName,
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Serverless Release Monitor</h1>
        <div className="flex gap-3">
          <FeedSubscribeButton />
          <button
            onClick={triggerScrape}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? 'Updating...' : 'Check for Updates'}
          </button>
        </div>
      </header>

      <main>
        <RepoFilterBar
          options={repoOptions}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />

        {releases.length > 0 ? (
          <ReleaseTimeline releases={releases} filter={filter} />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No releases found. Add some repositories in the admin panel.</p>
          </div>
        )}
      </main>
    </div>
  );
}

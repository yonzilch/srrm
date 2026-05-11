import React, { useState } from 'react';
import { useReleases, useAdminRepos, useTriggerScrape } from '../hooks/useReleases';
import ReleaseTimeline from '../components/ReleaseTimeline';
import RepoFilterBar from '../components/RepoFilterBar';
import FeedSubscribeButton from '../components/FeedSubscribeButton';
import type { Repo } from '@srrm/shared';

export default function Home() {
  const { data: releases, isLoading, error } = useReleases();
  const { data: repos = [], isLoading: reposLoading } = useAdminRepos();
  const triggerScrape = useTriggerScrape();
  const [filter, setFilter] = useState<string>('');

  if (isLoading) return <div>Loading releases...</div>;
  if (error) return <div>Error loading releases: {error.message}</div>;

  const repoOptions: { label: string; value: string }[] = repos.map((r: Repo) => ({
    label: r.fullName,
    value: r.fullName,
  }));

  const filteredReleases = releases
    ? releases.filter((r) => {
        if (!filter) return true;
        return r.repoFullName.toLowerCase().includes(filter.toLowerCase());
      })
    : [];

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
          onChange={setFilter}
        />

        {filteredReleases.length > 0 ? (
          <ReleaseTimeline releases={filteredReleases} filter={filter} />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No releases found. Add some repositories in the admin panel.</p>
          </div>
        )}
      </main>
    </div>
  );
}
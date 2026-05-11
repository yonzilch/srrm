import { useState } from 'react';
import { useAdminRepos } from '../../hooks/useRepos';
import { useAuth } from '../../hooks/useAuth';
import { AddRepoForm } from '../../components/AddRepoForm';
import { RepoTable } from '../../components/RepoTable';
import { ScrapeStatus } from '../../components/ScrapeStatus';

export default function Repos() {
  const { data: user } = useAuth();
  const { data: repos = [], isLoading, error, refetch } = useAdminRepos();

  if (isLoading) return <div>Loading repositories...</div>;
  if (error) return <div>Error loading repositories: {error.message}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Repository Management</h1>
      <p className="text-gray-600">
        Manage the repositories to monitor for releases.
      </p>

      <AddRepoForm onSuccess={() => refetch()} />

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Monitored Repositories ({repos.length})</h2>
        <ScrapeStatus onTrigger={() => {
          // Trigger scrape and then refetch releases
          // We would need a separate hook for triggering scrape
          console.log('Trigger scrape');
        }} />
      </div>

      <RepoTable repos={repos} onRemove={(id) => {
        console.log('Remove repo with id:', id);
        // In a real app, we would call the delete API and then refetch
      }} />
    </div>
  );
}

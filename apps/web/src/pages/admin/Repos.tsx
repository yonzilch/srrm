import React, { useState } from 'react';
import AddRepoForm from '../../components/AddRepoForm';
import RepoTable from '../../components/RepoTable';
import { useAuth } from '../../hooks/useAuth';
import { useAdminRepos } from '../../hooks/useReleases';
import type { Repo } from '@srrm/shared';

export default function Repos() {
  const { user } = useAuth();
  const { data: repos = [], isLoading, error, refetch } = useAdminRepos();

  if (isLoading) return <div>Loading repositories...</div>;
  if (error) return <div>Error loading repositories: {error.message}</div>;

  const handleRemove = (id: string) => {
    // TODO: implement remove
    console.log('Remove repo with id:', id);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Repository Management</h1>
      <p className="text-gray-600">
        Manage the repositories to monitor for releases.
      </p>

      <AddRepoForm onSuccess={() => refetch()} />

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Monitored Repositories ({repos.length})</h2>
      </div>

      <RepoTable repos={repos} onRemove={handleRemove} />
    </div>
  );
}
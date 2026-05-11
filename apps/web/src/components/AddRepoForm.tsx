import { useState } from 'react';
import { api } from '../api/client';

interface AddRepoFormProps {
  onSuccess?: () => void;
}

export default function AddRepoForm({ onSuccess }: AddRepoFormProps) {
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.admin.repos.add({ owner, repo });
      setSuccess('Repository added successfully!');
      setOwner('');
      setRepo('');
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to add repository');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
      <h2 className="text-xl font-bold">Add Repository</h2>
      <p className="text-gray-600">
        Add a GitHub repository to monitor for releases (format: owner/repo)
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
          {success}
        </div>
      )}

      <div className="space-y-3">
        <label className="block text-sm font-medium mb-1">
          Owner
        </label>
        <input
          type="text"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          placeholder="e.g., facebook"
          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium mb-1">
          Repository Name
        </label>
        <input
          type="text"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          placeholder="e.g., react"
          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
      </div>

      <button
        type="submit"
        disabled={loading || !owner || !repo}
        className="w-flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {loading ? 'Adding...' : 'Add Repository'}
      </button>
    </form>
  );
}

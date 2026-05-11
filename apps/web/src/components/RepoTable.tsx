import { Repo } from '@srrm/shared';

interface RepoTableProps {
  repos: Repo[];
  onRemove: (id: string) => void;
}

export default function RepoTable({ repos, onRemove }: RepoTableProps) {
  if (repos.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No repositories added yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left rtl:text-right border-collapse">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-900">Repository</th>
            <th className="px-4 py-3">Added At</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {repos.map(repo => (
            <tr key={repo.id} className="bg-white hover:bg-gray-50">
              <td className="px-4 py-3 font-medium">{repo.fullName}</td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {new Date(repo.addedAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right text-sm font-medium">
                <button
                  onClick={() => onRemove(repo.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

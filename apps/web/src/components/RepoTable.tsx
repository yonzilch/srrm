import React from 'react';
import type { Repo } from '@srrm/shared';

interface RepoTableProps {
  repos: Repo[];
  onRemove: (id: string) => void;
}

function PlatformIcon({ platform, size = 14 }: { platform: string; size?: number }) {
  const s = size;
  switch (platform) {
    case 'github':
      return (<svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>);
    case 'gitlab':
      return (<svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor"><path d="M14.97 8.49L14.19 6.1l-1.54-4.66a.41.41 0 00-.78 0L10.33 6.1H5.67L4.13 1.44a.41.41 0 00-.78 0L1.81 6.1.03 8.49a.83.83 0 00.3 1.13L8 15l7.67-5.38a.83.83 0 00.3-1.13z"/></svg>);
    case 'forgejo':
      return (<svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h4v4H2V2zm8 0h4v4h-4V2zM6 6h4v4H6V6zm-4 4h4v4H2v-4zm8 0h4v4h-4v-4z"/></svg>);
    case 'gitea':
      return (<svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor"><path d="M8 0L0 8l8 8 8-8-8-8zm0 2.5l5.5 5.5L8 13.5 2.5 8 8 2.5z"/></svg>);
    default:
      return (<svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 14.5a6.5 6.5 0 110-13 6.5 6.5 0 010 13z"/></svg>);
  }
}

const platformLabel: Record<string, string> = { github: 'GitHub', gitlab: 'GitLab', forgejo: 'Forgejo', gitea: 'Gitea' };

export default function RepoTable({ repos, onRemove }: RepoTableProps) {
  if (repos.length === 0) {
    return (<div className="text-center py-8"><p className="text-ctp-subtext1">No repositories added yet.</p></div>);
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="border-b border-ctp-surface1">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-ctp-subtext1">Repository</th>
            <th className="px-4 py-3 text-left font-medium text-ctp-subtext1">Platform</th>
            <th className="px-4 py-3 text-left font-medium text-ctp-subtext1">Added</th>
            <th className="px-4 py-3 text-right font-medium text-ctp-subtext1">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ctp-surface0">
          {repos.map(repo => (
            <tr key={repo.id} className="hover:bg-ctp-surface0/50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-ctp-subtext1 shrink-0"><PlatformIcon platform={repo.platform || 'github'} /></span>
                  <a href={repo.repoUrl || 'https://github.com/' + repo.fullName} target="_blank" rel="noopener noreferrer"
                    className="font-medium text-ctp-text hover:text-ctp-blue hover:underline transition-colors" title={repo.repoUrl}>
                    {repo.fullName}
                  </a>
                </div>
              </td>
              <td className="px-4 py-3"><span className="text-xs text-ctp-subtext1 capitalize" title={repo.baseUrl}>{platformLabel[repo.platform] || repo.platform || 'GitHub'}</span></td>
              <td className="px-4 py-3 text-xs text-ctp-subtext1">{new Date(repo.addedAt).toLocaleDateString()}</td>
              <td className="px-4 py-3 text-right">
                <button onClick={() => onRemove(repo.id)} className="text-xs text-ctp-red hover:text-ctp-red/80 font-medium transition-colors">Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

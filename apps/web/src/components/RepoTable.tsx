import React from 'react';
import type { Repo } from '@srrm/shared';
import PlatformIcon from './PlatformIcon';
import { useI18n } from '../contexts/I18nContext';

const platformLabel: Record<string, string> = {
  github: 'GitHub',
  gitlab: 'GitLab',
  forgejo: 'Forgejo',
  gitea: 'Gitea',
};

interface RepoTableProps {
  repos: Repo[];
  onRemove: (id: string) => void;
}

export default function RepoTable({ repos, onRemove }: RepoTableProps) {
  const { t } = useI18n();

  if (repos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-ctp-subtext1 text-lg">📭 {t('repos.noRepos')}</p>
        <p className="text-ctp-overlay0 text-sm mt-2">
          {t('repos.noReposDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-ctp-surface1">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-ctp-surface1">
            <th className="px-4 py-3 text-left font-medium text-ctp-subtext2 uppercase text-xs tracking-wider">
              {t('repos.fullName')}
            </th>
            <th className="px-4 py-3 text-left font-medium text-ctp-subtext2 uppercase text-xs tracking-wider">
              Platform
            </th>
            <th className="px-4 py-3 text-left font-medium text-ctp-subtext2 uppercase text-xs tracking-wider">
              {t('repos.addedAt')}
            </th>
            <th className="px-4 py-3 text-right font-medium text-ctp-subtext2 uppercase text-xs tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ctp-surface1/50">
          {repos.map(repo => (
            <tr
              key={repo.id}
              className="hover:bg-white/[0.03] transition-colors"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-ctp-blue shrink-0">
                    <PlatformIcon platform={repo.platform || 'github'} />
                  </span>
                  <a
                    href={repo.repoUrl || 'https://github.com/' + repo.fullName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-ctp-subtext1 hover:text-ctp-blue hover:underline transition-colors"
                    title={repo.repoUrl}
                  >
                    {repo.fullName}
                  </a>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="text-xs text-ctp-overlay0 capitalize">
                  {platformLabel[repo.platform] || repo.platform || 'GitHub'}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-ctp-overlay0">
                {new Date(repo.addedAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => onRemove(repo.id)}
                  className="text-xs text-ctp-red hover:text-ctp-red/80 font-medium transition-colors"
                >
                  {t('repos.remove')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
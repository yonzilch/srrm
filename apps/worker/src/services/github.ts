// GitHub API 封装
import type { Env } from '@srrm/shared';
import type { Release } from '@srrm/shared';
import type { KVNamespace } from '@cloudflare/workers-types';

const GITHUB_API = 'https://api.github.com';

export interface GitHubRelease {
  id: string;
  node_id: string;
  tag_name: string;
  name: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string | null;
  html_url: string;
  assets: any[];
  url: string;
}

export async function fetchReleases(
  owner: string,
  repo: string,
  token: string
): Promise<GitHubRelease[]> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/releases?per_page=10`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'github-release-monitor/1.0', // GitHub 要求必须有 UA
      },
    }
  );

  if (res.status === 404) {
    console.warn(`Repository ${owner}/${repo} not found (404)`);
    return [];
  }
  if (res.status === 403) {
    throw new Error('GitHub API Rate Limit exceeded');
  }
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
  }

  return res.json<GitHubRelease[]>();
}

// 将 GitHub Release 转换为内部 Release 格式
export function toInternalRelease(
  ghRelease: GitHubRelease,
  repoFullName: string
): Release {
  return {
    id: ghRelease.node_id,
    repoFullName,
    tagName: ghRelease.tag_name,
    name: ghRelease.name ?? ghRelease.tag_name,
    body: ghRelease.body ?? '',
    publishedAt: ghRelease.published_at ?? ghRelease.created_at,
    htmlUrl: ghRelease.html_url,
    isPrerelease: ghRelease.prerelease,
    isDraft: ghRelease.draft,
  };
}
import type { Platform, Repo } from '@srrm/shared';

/**
 * 已知 GitLab 实例域名（可扩展）
 * 注意：web 侧 utils/platform 需同步维护相同列表
 */
const KNOWN_GITLAB_INSTANCES: string[] = [
  'salsa.debian.org',
  'invent.kde.org',
  'gitlab.gnome.org',
  'gitlab.freedesktop.org',
  'source.puri.sm',
];

function hasSubstring(haystack: string, needle: string): boolean {
  return haystack.indexOf(needle) !== -1;
}

/**
 * 根据用户输入的 URL 自动识别平台和解析仓库信息
 */
export function detectPlatform(input: string): {
  platform: Platform;
  baseUrl: string;
  owner: string;
  repo: string;
} | null {
  // 不含 '//' → 当作 owner/repo 格式，默认 GitHub
  if (!hasSubstring(input, '//')) {
    const parts = input.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, '');
    if (!owner || !repo) return null;
    return { platform: 'github', baseUrl: 'https://github.com', owner, repo };
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  const pathParts = url.pathname.split('/').filter(Boolean);
  if (pathParts.length < 2) return null;

  const owner = pathParts[0];
  const repo = pathParts[1].replace(/\.git$/, '');
  if (!owner || !repo) return null;

  const baseUrl = url.protocol + '//' + host;

  // 1. github.com
  if (host === 'github.com') {
    return { platform: 'github', baseUrl, owner, repo };
  }

  // 2. GitLab：gitlab.com / *.gitlab.* / 已知实例
  //    自建 GitLab 通常有 gitlab. 子域名或在已知列表中
  if (
    host === 'gitlab.com' ||
    host.indexOf('.gitlab.') !== -1 ||
    host.indexOf('gitlab.') === 0 ||
    KNOWN_GITLAB_INSTANCES.indexOf(host) !== -1
  ) {
    return { platform: 'gitlab', baseUrl, owner, repo };
  }

  // 3. Codeberg / Forgejo
  if (host === 'codeberg.org' || host.indexOf('codeberg') !== -1) {
    return { platform: 'forgejo', baseUrl, owner, repo };
  }

  // 4. 其他 → 通用 gitea/forgejo
  return { platform: 'gitea', baseUrl, owner, repo };
}

/**
 * 根据平台构建 Feed URL（Atom 1.0 或 RSS 2.0）
 */
export function buildFeedUrl(repo: Pick<Repo, 'platform' | 'baseUrl' | 'owner' | 'repo'>): string {
  const base = repo.baseUrl.replace(/\/$/, '');
  const path = `${repo.owner}/${repo.repo}`;

  switch (repo.platform) {
    case 'github':
      return `${base}/${path}/releases.atom`;
    case 'gitlab':
      return `${base}/${path}/-/releases.atom`;
    case 'forgejo':
    case 'gitea':
      return `${base}/${path}/releases.rss`;
    default:
      return `${base}/${path}/releases.rss`;
  }
}

/**
 * 构建 release 页面 URL（htmlUrl）
 */
export function buildReleaseUrl(repo: Pick<Repo, 'platform' | 'baseUrl' | 'owner' | 'repo'>, tagName: string): string {
  const base = repo.baseUrl + '/' + repo.owner + '/' + repo.repo;
  const encodedTag = encodeURIComponent(tagName);
  if (repo.platform === 'gitlab') {
    return base + '/-/releases/' + encodedTag;
  }
  return base + '/releases/tag/' + encodedTag;
}

/**
 * 构建仓库页面 URL
 */
export function buildRepoUrl(repo: Pick<Repo, 'baseUrl' | 'owner' | 'repo'>): string {
  return repo.baseUrl + '/' + repo.owner + '/' + repo.repo;
}

/**
 * 构建各平台认证 Header
 * 所有 token 均为可选，不配置时不加对应 header
 */
export function buildAuthHeaders(
  platform: Platform,
  env: Record<string, string | undefined>
): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': 'srrm/1.0',
  };

  switch (platform) {
    case 'github': {
      const token = env['GITHUB_TOKEN'];
      if (token) headers['Authorization'] = 'Bearer ' + token;
      break;
    }
    case 'gitlab': {
      const token = env['GITLAB_TOKEN'];
      if (token) headers['PRIVATE-TOKEN'] = token;
      break;
    }
    case 'forgejo': {
      const token = env['FORGEJO_TOKEN'];
      if (token) headers['Authorization'] = 'token ' + token;
      break;
    }
    case 'gitea': {
      const token = env['GITEA_TOKEN'];
      if (token) headers['Authorization'] = 'token ' + token;
      break;
    }
  }

  return headers;
}

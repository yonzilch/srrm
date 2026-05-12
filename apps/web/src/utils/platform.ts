/**
 * 前端平台检测工具 — 与 worker/services/platform.ts 逻辑一致
 */

export type Platform = 'github' | 'gitlab' | 'forgejo' | 'gitea';

export interface DetectedPlatform {
  platform: Platform;
  baseUrl: string;
  owner: string;
  repo: string;
}

/**
 * 已知 GitLab 实例域名（可扩展）
 * 注意：需与 worker/src/services/platform.ts 中的列表同步
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

export function detectPlatform(input: string): DetectedPlatform | null {
  if (!input) return null;

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

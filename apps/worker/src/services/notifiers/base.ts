// 通知器基类与共享工具
import type { Release, Env } from '@srrm/shared';

export interface NotifyResult {
  notifier: string;
  success: boolean;
  error?: string;
}

export interface Notifier {
  readonly name: string;
  isConfigured(env: Env): boolean;
  send(release: Release, env: Env): Promise<void>;
}

/** 格式化 release 为人类可读的通知标题和正文 */
export function formatNotification(release: Release): {
  title: string;
  message: string;
} {
  const platform = release.platform === 'github' ? 'GitHub'
    : release.platform === 'gitlab' ? 'GitLab'
    : release.platform === 'forgejo' ? 'Forgejo'
    : 'Gitea';

  const prerelease = release.isPrerelease ? ' [Pre-release]' : '';

  return {
    title: `${release.repoFullName} ${release.tagName}${prerelease}`,
    message: [
      release.name || release.tagName,
      '',
      release.body
        ? release.body.slice(0, 300) + (release.body.length > 300 ? '...' : '')
        : '（无 Release Notes）',
      '',
      `🔗 ${release.htmlUrl}`,
      `📦 ${platform}`,
    ].join('\n'),
  };
}
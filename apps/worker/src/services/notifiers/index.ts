// 通知器注册与分发入口
import type { Env, Release } from '@srrm/shared';
import type { Notifier, NotifyResult } from './base';
import { GotifyNotifier } from './gotify';
import { AppriseNotifier } from './apprise';
import { WebhookNotifier } from './webhook';

/** 根据环境变量按需实例化已配置的通知器 */
export function buildNotifiers(env: Env): Notifier[] {
  const all: Notifier[] = [
    new GotifyNotifier(),
    new AppriseNotifier(),
    new WebhookNotifier(),
  ];
  return all.filter(n => n.isConfigured(env));
}

/**
 * 向所有已配置的通知器发送通知
 * 各通知器独立执行，互不影响（一个失败不阻断其他）
 */
export async function dispatchNotifications(
  releases: Release[],
  env: Env,
): Promise<NotifyResult[]> {
  const notifiers = buildNotifiers(env);
  if (notifiers.length === 0 || releases.length === 0) return [];

  const results: NotifyResult[] = [];

  for (const release of releases) {
    for (const notifier of notifiers) {
      try {
        await notifier.send(release, env);
        results.push({ notifier: notifier.name, success: true });
        console.log(`[Notify] ✓ ${notifier.name} → ${release.repoFullName} ${release.tagName}`);
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        results.push({ notifier: notifier.name, success: false, error });
        console.error(`[Notify] ✗ ${notifier.name} → ${release.repoFullName} ${release.tagName}: ${error}`);
      }
    }
  }

  return results;
}

// 重新导出，方便外部引用
export type { Notifier, NotifyResult } from './base';
export { GotifyNotifier } from './gotify';
export { AppriseNotifier } from './apprise';
export { WebhookNotifier } from './webhook';
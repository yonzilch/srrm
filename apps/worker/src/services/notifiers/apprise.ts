// Apprise HTTP API 通知器
import type { Release, Env } from '@srrm/shared';
import type { Notifier } from './base';
import { formatNotification } from './base';

export class AppriseNotifier implements Notifier {
  readonly name = 'Apprise';

  isConfigured(env: Env): boolean {
    return !!env.APPRISE_API_URL;
  }

  async send(release: Release, env: Env): Promise<void> {
    const { title, message } = formatNotification(release);
    const url = env.APPRISE_API_URL!.replace(/\/$/, '');

    // 构建请求体
    const body: Record<string, unknown> = { title, body: message };

    // 如果提供了 APPRISE_URLS，传入 urls 字段（Apprise API 支持动态指定目标）
    if (env.APPRISE_URLS) {
      body.urls = env.APPRISE_URLS.split(',').map(s => s.trim()).filter(Boolean);
    }

    // 如果提供了 APPRISE_TAG，传入 tag 字段
    if (env.APPRISE_TAG) {
      body.tag = env.APPRISE_TAG;
    }

    const res = await fetch(`${url}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Apprise ${res.status}: ${text}`);
    }
  }
}
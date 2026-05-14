// 通用 Webhook 通知器
import type { Release, Env } from '@srrm/shared';
import type { Notifier } from './base';

/** HMAC-SHA256 签名，使用 Web Crypto API（Workers 兼容） */
async function hmacSign(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  // 转为 hex string
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export class WebhookNotifier implements Notifier {
  readonly name = 'Webhook';

  isConfigured(env: Env): boolean {
    return !!env.WEBHOOK_URL;
  }

  async send(release: Release, env: Env): Promise<void> {
    const payload = JSON.stringify({
      event: 'new_release',
      release: {
        id:            release.id,
        platform:      release.platform,
        repo:          release.repoFullName,
        repo_url:      release.repoUrl,
        tag:           release.tagName,
        name:          release.name,
        url:           release.htmlUrl,
        published_at:  release.publishedAt,
        is_prerelease: release.isPrerelease,
        body:          release.body,
      },
      timestamp: new Date().toISOString(),
    });

    const method = env.WEBHOOK_METHOD ?? 'POST';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'srrm-webhook/1.0',
    };

    // 仅当配置了 WEBHOOK_SECRET 时才添加签名
    if (env.WEBHOOK_SECRET) {
      const sig = await hmacSign(env.WEBHOOK_SECRET, payload);
      headers['X-Hub-Signature-256'] = `sha256=${sig}`;
      headers['X-SRRM-Signature'] = sig;
    }

    const res = await fetch(env.WEBHOOK_URL!, { method, headers, body: payload });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Webhook ${res.status}: ${text}`);
    }
  }
}
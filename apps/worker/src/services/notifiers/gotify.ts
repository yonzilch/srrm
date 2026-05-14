// Gotify 通知器
import type { Release, Env } from '@srrm/shared';
import type { Notifier } from './base';
import { formatNotification } from './base';

export class GotifyNotifier implements Notifier {
  readonly name = 'Gotify';

  isConfigured(env: Env): boolean {
    return !!(env.GOTIFY_URL && env.GOTIFY_TOKEN);
  }

  async send(release: Release, env: Env): Promise<void> {
    const { title, message } = formatNotification(release);
    const priority = parseInt(env.GOTIFY_PRIORITY ?? '5', 10);
    const url = env.GOTIFY_URL!.replace(/\/$/, '');

    const res = await fetch(`${url}/message`, {
      method: 'POST',
      headers: {
        'X-Gotify-Key': env.GOTIFY_TOKEN!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, message, priority }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gotify ${res.status}: ${text}`);
    }
  }
}
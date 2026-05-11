// Hono App 入口
import { Hono } from 'hono';
import { authRoutes } from './routes/auth';
import { releasesRoutes } from './routes/releases';
import { adminRoutes } from './routes/admin';
import { feedRoute } from './routes/feed';
import { authMiddleware } from './middleware/auth';
import { validateEnv } from './env';
import type { Env } from '@srrm/shared';

// 启动时验证环境变量
function validateEnvOnStartup(env: Env): void {
  const missing = validateEnv(env);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}

const app = new Hono<{ Bindings: Env }>();

// 路由挂载顺序：公开路由在前，受保护路由在后
app.route('/api/auth', authRoutes);
app.route('/feed.xml', feedRoute);
app.route('/api/releases', releasesRoutes);

// Admin 受保护路由
app.use('/api/admin/*', authMiddleware);
app.route('/api/admin', adminRoutes);

// 全局错误处理
app.onError((err, c) => {
  console.error('[App Error]', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

export default app;

// Scheduled handler - runs every 5 minutes (configured in wrangler.toml)
// Uses logical frequency gating to avoid redundant scrapes
export async function scheduled(
  controller: ScheduledController,
  env: Env
): Promise<void> {
  validateEnvOnStartup(env);

  const lastRun = Number(await env.KV.get('config:scrape_last_run') ?? 0);
  const interval = Number(env.SCRAPE_INTERVAL_MINUTES || '60') * 60 * 1000;

  if (Date.now() - lastRun < interval) {
    console.log('[Cron] Skipping: not yet time for next scrape');
    return;
  }

  console.log('[Cron] Triggering scheduled scrape...');
  const { runScraper } = await import('./services/scraper');
  await runScraper(env);
}
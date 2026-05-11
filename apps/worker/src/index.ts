// Hono App 入口
import { Hono } from 'hono';
import { authRoutes } from './routes/auth';
import { releasesRoutes } from './routes/releases';
import { adminRoutes } from './routes/admin';
import { feedRoute } from './routes/feed';
import { authMiddleware } from './middleware/auth';
import { validateEnv } from './env';
import type { Env } from '@srrm/shared';

function getCorsHeaders(request: Request): Record<string, string> {
  // credentials: 'include' 要求 Allow-Origin 不能为 '*'，必须回显具体 origin
  const origin = request.headers.get('Origin') ?? '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
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

// 模块 Worker 模式：手动路由分发
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // --- CORS preflight ---
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: getCorsHeaders(request) });
    }

    const url = new URL(request.url);
    let response: Response;

    if (url.pathname.startsWith('/api') || url.pathname === '/feed.xml') {
      response = await app.fetch(request, env, ctx);
    } else {
      // SPA 前端路由：未匹配 API 的请求交给 Workers Assets 返回静态文件
      response = await (env.ASSETS?.fetch(request) ?? new Response('Not Found', { status: 404 }));
    }

    // 添加 CORS headers
    const newResponse = new Response(response.body, response);
    const headers = getCorsHeaders(request);
    Object.entries(headers).forEach(([key, value]) => {
      newResponse.headers.set(key, value);
    });
    return newResponse;
  },
};

// Scheduled handler - runs every 5 minutes (configured in wrangler.toml)
export async function scheduled(
  controller: ScheduledController,
  env: Env
): Promise<void> {
  const missing = validateEnv(env);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }

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
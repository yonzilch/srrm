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
app.use('/api/admin/*', authMiddleware); // 中间件先注册
app.route('/api/admin', adminRoutes);

// 全局错误处理
app.onError((err, c) => {
  console.error('[App Error]', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

export default app;
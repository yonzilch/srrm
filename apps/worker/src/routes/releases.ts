import { Hono } from 'hono';
import { getRepos, getReleases } from './services/kv';
import type { Env } from '@srrm/shared';
import type { Release } from '@srrm/shared';

export const releasesRoutes = new Hono<{ Bindings: Env }>();

// 获取 releases 列表（支持分页和日期过滤）
releasesRoutes.get('/', async (c) => {
  try {
    const { date, page = '1', limit = '20' } = c.req.query();
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // 限制最大 100
    
    const releases = await getReleases(c.env.KV);
    
    // 日期过滤
    let filtered = releases;
    if (date) {
      filtered = releases.filter(r => r.publishedAt.startsWith(date));
    }
    
    // 按发布时间降序排序
    filtered.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    
    // 分页
    const start = (pageNum - 1) * limitNum;
    const paginated = filtered.slice(start, start + limitNum);
    
    return c.json({
      releases: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filtered.length,
        pages: Math.ceil(filtered.length / limitNum)
      }
    });
  } catch (err) {
    console.error('[Releases Route Error]', err);
    return c.json({ error: 'Failed to fetch releases' }, 500);
  }
});

// 获取单个 release（通过 ID）
releasesRoutes.get('/:id', async (c) => {
  const { id } = c.req.param();
  try {
    const releases = await getReleases(c.env.KV);
    const release = releases.find(r => r.id === id);
    
    if (!release) {
      return c.json({ error: 'Release not found' }, 404);
    }
    
    return c.json({ release });
  } catch (err) {
    console.error('[Release By ID Error]', err);
    return c.json({ error: 'Failed to fetch release' }, 500);
  }
});

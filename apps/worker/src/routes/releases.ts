import { Hono } from 'hono';
import {
  getReleasesByDate,
  getReleases,
  getReleasesIndex,
} from '../services/db';
import type { Env } from '@srrm/shared';
import type { Release } from '@srrm/shared';

export const releasesRoutes = new Hono<{ Bindings: Env }>();

// GET /api/releases — 默认返回最近 releases
// GET /api/releases?date=YYYY-MM-DD — 返回某日 releases
// GET /api/releases?page=x&limit=y — 分页
releasesRoutes.get('/', async (c) => {
  try {
    const { date, page = '1', limit = '20' } = c.req.query();

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    let releases: Release[];
    let total: number;

    if (date) {
      // 按日期查询
      const result = await getReleases(c.env.DB as any, { date, limit: limitNum, offset });
      releases = result.releases as Release[];
      total = result.total;
    } else {
      // 默认查询最近 releases
      const result = await getReleases(c.env.DB as any, { limit: limitNum, offset });
      releases = result.releases as Release[];
      total = result.total;
    }

    return c.json({
      releases,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('[Releases Route Error]', err);
    return c.json({ error: 'Failed to fetch releases' }, 500);
  }
});

// GET /api/releases/:id — 按 ID 查找
releasesRoutes.get('/:id', async (c) => {
  const { id } = c.req.param();
  try {
    const result = await getReleases(c.env.DB as any, { limit: 100, offset: 0 });
    const release = result.releases.filter((r: Release) => r.id === id)[0] ?? null;

    if (!release) {
      return c.json({ error: 'Release not found' }, 404);
    }

    return c.json({ release });
  } catch (err) {
    console.error('[Release By ID Error]', err);
    return c.json({ error: 'Failed to fetch release' }, 500);
  }
});

// GET /api/releases/index — 日期索引
releasesRoutes.get('/index', async (c) => {
  try {
    const dates = await getReleasesIndex(c.env.DB as any);
    return c.json({ dates });
  } catch (err) {
    console.error('[Releases Index Error]', err);
    return c.json({ error: 'Failed to fetch releases index' }, 500);
  }
});
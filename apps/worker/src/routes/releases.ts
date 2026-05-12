import { Hono } from 'hono';
import {
  getReleasesByDate,
  getLatestReleases,
  getReleasesIndex,
} from '../services/kv';
import type { Env } from '@srrm/shared';
import type { Release } from '@srrm/shared';

export const releasesRoutes = new Hono<{ Bindings: Env }>();

// GET /api/releases — 默认返回最近 100 条（releases:latest）
// GET /api/releases?date=YYYY-MM-DD — 返回某日 releases
// GET /api/releases?page=x&limit=y — 分页兼容（读取 latest）
releasesRoutes.get('/', async (c) => {
  try {
    const { date, page = '1', limit = '20' } = c.req.query();

    let releases: Release[];

    if (date) {
      // 按日期查询
      releases = (await getReleasesByDate(c.env.KV as any, date)) as Release[];
    } else {
      // 默认查询最近 releases
      releases = (await getLatestReleases(c.env.KV as any)) as Release[];
    }

    // 分页
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const start = (pageNum - 1) * limitNum;
    const paginated = releases.slice(start, start + limitNum);

    return c.json({
      releases: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: releases.length,
        pages: Math.ceil(releases.length / limitNum),
      },
    });
  } catch (err) {
    console.error('[Releases Route Error]', err);
    return c.json({ error: 'Failed to fetch releases' }, 500);
  }
});

// GET /api/releases/:id — 按 ID 查找（遍历 latest）
releasesRoutes.get('/:id', async (c) => {
  const { id } = c.req.param();
  try {
    const releases: Release[] = (await getLatestReleases(c.env.KV as any)) as Release[];
    const releaseArr: Release[] = releases.filter((r: Release) => r.id === id);
    const release = releaseArr.length > 0 ? releaseArr[0] : null;

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
    const dates = await getReleasesIndex(c.env.KV as any);
    return c.json({ dates });
  } catch (err) {
    console.error('[Releases Index Error]', err);
    return c.json({ error: 'Failed to fetch releases index' }, 500);
  }
});
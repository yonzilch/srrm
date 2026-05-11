import { Hono } from 'hono';
import { getReleases } from '../services/kv';
import type { Env } from '@srrm/shared';
import type { Release } from '@srrm/shared';

export const releasesRoutes = new Hono<{ Bindings: Env }>();

releasesRoutes.get('/', async (c) => {
  try {
    const { date, page = '1', limit = '20' } = c.req.query();
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const releases: Release[] = await getReleases(c.env.KV);

    let filtered: Release[] = releases;
    if (date) {
      filtered = releases.filter((r: Release) => r.publishedAt.startsWith(date));
    }

    filtered.sort((a: Release, b: Release) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    const start = (pageNum - 1) * limitNum;
    const paginated = filtered.slice(start, start + limitNum);

    return c.json({
      releases: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filtered.length,
        pages: Math.ceil(filtered.length / limitNum),
      },
    });
  } catch (err) {
    console.error('[Releases Route Error]', err);
    return c.json({ error: 'Failed to fetch releases' }, 500);
  }
});

releasesRoutes.get('/:id', async (c) => {
  const { id } = c.req.param();
  try {
    const releases: Release[] = await getReleases(c.env.KV);

    const release = releases.find((r: Release) => r.id === id);

    if (!release) {
      return c.json({ error: 'Release not found' }, 404);
    }

    return c.json({ release });
  } catch (err) {
    console.error('[Release By ID Error]', err);
    return c.json({ error: 'Failed to fetch release' }, 500);
  }
});
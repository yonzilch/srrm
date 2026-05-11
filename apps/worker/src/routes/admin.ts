import { Hono } from 'hono';
import { getRepos, saveRepos } from '../services/kv';
import type { Env } from '@srrm/shared';
import type { Repo } from '@srrm/shared';
import { nanoid } from 'nanoid';

export const adminRoutes = new Hono<{ Bindings: Env }>();

adminRoutes.get('/repos', async (c) => {
  try {
    const repos = await getRepos(c.env.KV);
    return c.json({ repos });
  } catch (err) {
    console.error('[Admin Repos Get Error]', err);
    return c.json({ error: 'Failed to fetch repos' }, 500);
  }
});

adminRoutes.post('/repos', async (c) => {
  try {
    const { owner, repo } = await c.req.json<{ owner: string; repo: string }>();

    if (!owner || !repo) {
      return c.json({ error: 'Owner and repo are required' }, 400);
    }

    const repos: Repo[] = await getRepos(c.env.KV);
    const exists = repos.some((r: Repo) => r.owner.toLowerCase() === owner.toLowerCase() && r.repo.toLowerCase() === repo.toLowerCase());

    if (exists) {
      return c.json({ error: 'Repository already exists' }, 409);
    }

    const newRepo: Repo = {
      id: nanoid(),
      owner,
      repo,
      fullName: `${owner}/${repo}`,
      addedAt: new Date().toISOString(),
      addedBy: 'system',
    };

    repos.push(newRepo);
    await saveRepos(c.env.KV, repos);

    return c.json(newRepo, 201);
  } catch (err) {
    console.error('[Admin Repos Add Error]', err);
    return c.json({ error: 'Failed to add repo' }, 500);
  }
});

adminRoutes.delete('/repos/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const repos: Repo[] = await getRepos(c.env.KV);

    const filtered = repos.filter((r: Repo) => r.id !== id);

    if (filtered.length === repos.length) {
      return c.json({ error: 'Repo not found' }, 404);
    }

    await saveRepos(c.env.KV, filtered);
    return c.status(204);
  } catch (err) {
    console.error('[Admin Repos Delete Error]', err);
    return c.json({ error: 'Failed to delete repo' }, 500);
  }
});

adminRoutes.get('/config', async (c) => {
  try {
    const config = {
      scrapeIntervalMinutes: c.env.SCRAPE_INTERVAL_MINUTES,
      rssPublic: c.env.RSS_PUBLIC,
    };
    return c.json({ config });
  } catch (err) {
    console.error('[Admin Config Get Error]', err);
    return c.json({ error: 'Failed to fetch config' }, 500);
  }
});

adminRoutes.post('/scrape/trigger', async (c) => {
  try {
    const { runScraper } = await import('../services/scraper');
    await runScraper(c.env);
    return c.json({ success: true, message: 'Scrape triggered' });
  } catch (err) {
    console.error('[Admin Scrape Trigger Error]', err);
    return c.json({ error: 'Failed to trigger scrape' }, 500);
  }
});
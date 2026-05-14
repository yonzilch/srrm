import { Hono } from 'hono';
import { getRepos, addRepo, deleteRepo, getLatestReleases, deleteReleasesForRepo } from '../services/db';
import { detectPlatform, buildRepoUrl } from '../services/platform';
import type { Env, Repo, User } from '@srrm/shared';
import { nanoid } from 'nanoid';

export const adminRoutes = new Hono<{ Bindings: Env }>();

// GET /api/admin/repos — 获取所有仓库
adminRoutes.get('/repos', async (c) => {
  try {
    const repos: Repo[] = await getRepos(c.env.DB);
    return c.json({ repos });
  } catch (err) {
    console.error('[Admin Repos Get Error]', err);
    return c.json({ error: '获取仓库列表失败' }, 500);
  }
});

// POST /api/admin/repos — 添加新仓库
adminRoutes.post('/repos', async (c) => {
  try {
    const body = await c.req.json<{ url?: string; owner?: string; repo?: string }>();

    let detected: { platform: Repo['platform']; baseUrl: string; owner: string; repo: string } | null = null;

    if (body.url) {
      detected = detectPlatform(body.url);
    } else if (body.owner && body.repo) {
      detected = {
        platform: 'github',
        baseUrl: 'https://github.com',
        owner: body.owner,
        repo: body.repo,
      };
    }

    if (!detected) {
      return c.json({ error: '无法识别仓库地址，请检查格式。支持：完整 URL 或 owner/repo' }, 400);
    }

    const repos: Repo[] = await getRepos(c.env.DB);

    // 检查重复
    const duplicate = repos.find(
      (r: Repo) =>
        r.baseUrl === detected!.baseUrl &&
        r.owner === detected!.owner &&
        r.repo === detected!.repo
    );
    if (duplicate) {
      return c.json({ error: '该仓库已在监控列表中' }, 409);
    }

    const user = c.get('jwtPayload') as User | undefined;

    const newRepo: Repo = {
      id: nanoid(),
      platform: detected.platform,
      baseUrl: detected.baseUrl,
      owner: detected.owner,
      repo: detected.repo,
      fullName: detected.owner + '/' + detected.repo,
      repoUrl: buildRepoUrl({ baseUrl: detected.baseUrl, owner: detected.owner, repo: detected.repo }),
      addedAt: new Date().toISOString(),
      addedBy: user?.email ?? 'system',
    };

    await addRepo(c.env.DB, newRepo);

    // 异步触发单仓库抓取（不阻塞响应）
    try {
      const { scrapeRepo } = await import('../services/scraper');
      const promise = scrapeRepo(newRepo, c.env);
      // 模块 Worker 模式下用 waitUntil 延长执行时间
      if (c.executionCtx) {
        c.executionCtx.waitUntil(promise);
      }
      // 如果没有 executionCtx，直接 fire-and-forget（可能因请求结束而被终止，但不影响响应）
    } catch (scrapeErr) {
      console.error('[Admin Repos Add] scrapeRepo failed:', scrapeErr);
    }

    return c.json(newRepo, 201);
  } catch (err) {
    console.error('[Admin Repos Add Error]', err);
    return c.json({ error: '添加仓库失败: ' + (err instanceof Error ? err.message : String(err)) }, 500);
  }
});

// DELETE /api/admin/repos/:id — 删除仓库
adminRoutes.delete('/repos/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const repos: Repo[] = await getRepos(c.env.DB);

    const targetRepo = repos.find((r: Repo) => r.id === id);
    if (!targetRepo) {
      return c.json({ error: '仓库不存在' }, 404);
    }

    // 从 D1 中删除仓库及其所有 releases
    await deleteRepo(c.env.DB, id);
    await deleteReleasesForRepo(c.env.DB, targetRepo.fullName);

    return c.json({ success: true });
  } catch (err) {
    console.error('[Admin Repos Delete Error]', err);
    return c.json({ error: '删除仓库失败: ' + (err instanceof Error ? err.message : String(err)) }, 500);
  }
});

// GET /api/admin/config — 获取配置
adminRoutes.get('/config', async (c) => {
  try {
    const config = {
      scrapeIntervalMinutes: c.env.SCRAPE_INTERVAL_MINUTES,
      rssPublic: c.env.RSS_PUBLIC,
    };
    return c.json({ config });
  } catch (err) {
    console.error('[Admin Config Get Error]', err);
    return c.json({ error: '获取配置失败' }, 500);
  }
});

// POST /api/admin/scrape/trigger — 手动触发抓取
adminRoutes.post('/scrape/trigger', async (c) => {
  try {
    const { runScraper } = await import('../services/scraper');
    await runScraper(c.env);
    return c.json({ success: true, message: 'Scrape triggered' });
  } catch (err) {
    console.error('[Admin Scrape Trigger Error]', err);
    return c.json({ error: '触发抓取失败' }, 500);
  }
});

// 抓取核心逻辑 — 使用 Atom Feed 替代 GitHub API
import {
  getRepos,
  upsertReleases,
  getLastRun,
  saveLastRun,
} from './db';
import { buildFeedUrl, buildAuthHeaders, buildReleaseUrl } from './platform';
import { parseFeed, isPrerelease, stripHtmlToText, sanitizeHtmlForStorage } from './feed';
import type { Env, Repo, Release, Platform } from '@srrm/shared';

/** 按 publishedAt 日期分组 */
function groupByDate(releases: Release[]): Record<string, Release[]> {
  const groups: Record<string, Release[]> = {};
  for (let i = 0; i < releases.length; i++) {
    const r = releases[i];
    const date = r.publishedAt.slice(0, 10);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(r);
  }
  return groups;
}

/** 从 Atom entry 中提取 tag name */
function extractTagName(entry: { link: string; id: string }, repo: Repo): string {
  try {
    const url = new URL(entry.link);
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length > 0) {
      return decodeURIComponent(parts[parts.length - 1]);
    }
  } catch {
    // ignore
  }
  const parts = entry.id.split('/');
  return parts[parts.length - 1] || entry.id;
}

/** 抓取单个仓库的 releases（通过 Atom feed） */
async function fetchRepoReleases(repo: Repo, env: Env): Promise<Release[]> {
  const feedUrl = buildFeedUrl(repo);
  const headers = buildAuthHeaders(repo.platform as Platform, env as unknown as Record<string, string | undefined>);

  const res = await fetch(feedUrl, { headers });

  if (res.status === 404) {
    console.warn('[Scraper] Feed not found for ' + repo.fullName + ' (' + repo.platform + '): ' + feedUrl);
    return [];
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error('Authentication failed for ' + repo.fullName + ' (' + repo.platform + '): ' + res.status);
  }
  if (!res.ok) {
    throw new Error('Feed fetch error for ' + repo.fullName + ': ' + res.status);
  }

  const xml = await res.text();
  const entries = parseFeed(xml);

  const releases: Release[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const tagName = extractTagName(entry, repo);
    const bodyMd = entry.contentHtml;

    releases.push({
      id: entry.id || entry.link,
      repoFullName: repo.fullName,
      repoUrl: repo.repoUrl,
      platform: repo.platform,
      tagName,
      name: entry.title || tagName,
      body: stripHtmlToText(bodyMd),
      bodyHtml: sanitizeHtmlForStorage(bodyMd),
      publishedAt: entry.publishedAt,
      htmlUrl: entry.link || buildReleaseUrl(repo, tagName),
      isPrerelease: isPrerelease(entry),
      isDraft: false,
    });
  }

  return releases;
}

export async function runScraper(env: Env): Promise<void> {
  console.log('[Scraper] Starting release scrape...');

  const repos: Repo[] = await getRepos(env.DB as any);
  if (repos.length === 0) {
    console.log('[Scraper] No repos configured, skipping');
    return;
  }

  console.log('[Scraper] Scraping ' + repos.length + ' repositories...');

  // 并发获取所有仓库的 releases
  const promises = repos.map((repo: Repo) =>
    fetchRepoReleases(repo, env)
      .catch((err: unknown) => {
        console.error('[Scraper] Failed to fetch ' + repo.fullName + ' (' + repo.platform + '):', err);
        return [] as Release[];
      }),
  );

  const repoResults = await Promise.all(promises);

  // 展开
  const newReleases = repoResults.flat();

  if (newReleases.length === 0) {
    console.log('[Scraper] No new releases found');
    return;
  }

  console.log('[Scraper] Found ' + newReleases.length + ' new releases');

  // 批量写入 D1（使用 upsertReleases 替代旧 KV 分片逻辑）
  const byDate = groupByDate(newReleases);
  const dates = Object.keys(byDate);
  let allNewReleases: Release[] = [];
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const batchReleases = byDate[date];
    // 每批最多 100 条写入
    for (let j = 0; j < batchReleases.length; j += 100) {
      const chunk = batchReleases.slice(j, j + 100);
      const result = await upsertReleases(env.DB as any, chunk);
      allNewReleases = allNewReleases.concat(result.newReleases);
    }
  }

  // 触发通知（仅对新插入的 release）
  if (allNewReleases.length > 0) {
    console.log(`[Scraper] ${allNewReleases.length} new releases, dispatching notifications...`);
    const { dispatchNotifications } = await import('./notifiers/index');
    await dispatchNotifications(allNewReleases, env);
  }

  // 更新最后抓取时间
  await saveLastRun(env.DB as any, Date.now());
  console.log('[Scraper] Scrape completed');
}

/**
 * 抓取单个仓库的 releases（添加仓库后自动触发）
 * 只抓取这一个仓库，完成后更新 D1
 */
export async function scrapeRepo(repo: Repo, env: Env): Promise<void> {
  console.log('[ScrapeRepo] Scraping single repo: ' + repo.fullName + ' (' + repo.platform + ')');

  try {
    const releases = await fetchRepoReleases(repo, env);
    if (releases.length === 0) {
      console.log('[ScrapeRepo] No releases found for ' + repo.fullName);
      return;
    }

    console.log('[ScrapeRepo] Found ' + releases.length + ' releases for ' + repo.fullName);

    // 批量写入 D1
    await upsertReleases(env.DB as any, releases);

    console.log('[ScrapeRepo] Completed for ' + repo.fullName);
  } catch (err) {
    console.error('[ScrapeRepo] Failed for ' + repo.fullName + ':', err);
  }
}
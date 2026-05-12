// 抓取核心逻辑 — 使用 Atom Feed 替代 GitHub API
import {
  getRepos,
  getReleasesByDate,
  saveReleasesByDate,
  getLatestReleases,
  updateLatestReleases,
  getReleasesIndex,
  updateReleasesIndex,
} from './kv';
import { saveLastRun } from './kv';
import { buildFeedUrl, buildAuthHeaders, buildReleaseUrl } from './platform';
import { parseFeed, isPrerelease } from './atom';
import { markdownToHtml } from '@srrm/shared';
import type { Env, Repo, Release } from '@srrm/shared';

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
  // 从 link 末段提取 tag name
  try {
    const url = new URL(entry.link);
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length > 0) {
      return decodeURIComponent(parts[parts.length - 1]);
    }
  } catch {
    // ignore
  }
  // fallback: 从 id 提取
  const parts = entry.id.split('/');
  return parts[parts.length - 1] || entry.id;
}

/** 抓取单个仓库的 releases（通过 Atom feed） */
async function fetchRepoReleases(repo: Repo, env: Env): Promise<Release[]> {
  const feedUrl = buildFeedUrl(repo);
  const headers = buildAuthHeaders(repo.platform, env as unknown as Record<string, string | undefined>);

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
    const bodyMd = entry.content;

    releases.push({
      id: entry.id || entry.link,
      repoFullName: repo.fullName,
      repoUrl: repo.repoUrl,
      platform: repo.platform,
      tagName,
      name: entry.title || tagName,
      body: bodyMd,
      bodyHtml: markdownToHtml(bodyMd),
      publishedAt: entry.updated,
      htmlUrl: entry.link || buildReleaseUrl(repo, tagName),
      isPrerelease: isPrerelease(entry),
      isDraft: false,
    });
  }

  return releases;
}

export async function runScraper(env: Env): Promise<void> {
  console.log('[Scraper] Starting release scrape...');

  const repos: Repo[] = await getRepos(env.KV as any);
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
      })
  );

  const repoResults = await Promise.all(promises);

  // 展开
  const newReleases = repoResults.flat();

  if (newReleases.length === 0) {
    console.log('[Scraper] No new releases found');
    await updateLatestReleases(env.KV as any, []);
    return;
  }

  console.log('[Scraper] Found ' + newReleases.length + ' new releases');

  // 按日期分组写入
  const byDate = groupByDate(newReleases);
  const dates = Object.keys(byDate);
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    await saveReleasesByDate(env.KV as any, date, byDate[date]);
    await updateReleasesIndex(env.KV as any, date);
  }

  // 更新 releases:latest
  await updateLatestReleases(env.KV as any, newReleases);

  // 更新最后抓取时间
  await saveLastRun(env.KV as any, Date.now());
  console.log('[Scraper] Scrape completed');
}

/**
 * 抓取单个仓库的 releases（添加仓库后自动触发）
 * 只抓取这一个仓库，完成后更新 releases:latest 和对应日期分片
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

    // 按日期分组写入
    const byDate = groupByDate(releases);
    const dates = Object.keys(byDate);
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      await saveReleasesByDate(env.KV as any, date, byDate[date]);
      await updateReleasesIndex(env.KV as any, date);
    }

    // 更新 releases:latest
    await updateLatestReleases(env.KV as any, releases);

    console.log('[ScrapeRepo] Completed for ' + repo.fullName);
  } catch (err) {
    console.error('[ScrapeRepo] Failed for ' + repo.fullName + ':', err);
  }
}

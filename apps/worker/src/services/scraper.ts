// 抓取核心逻辑
import { getRepos, getReleases, saveReleases, saveLastRun } from './kv';
import { fetchReleases, toInternalRelease } from './github';
import type { Env } from '@srrm/shared';

export async function runScraper(env: Env): Promise<void> {
  console.log('[Scraper] Starting release scrape...');

  const repos: any[] = await getRepos(env.KV as any);
  if (repos.length === 0) {
    console.log('[Scraper] No repos configured, skipping');
    return;
  }

  console.log(`[Scraper] Scraping ${repos.length} repositories...`);

  // 并发获取所有仓库的 releases
  const promises = repos.map((repo: any) =>
    fetchReleases(repo.owner, repo.repo, env.GITHUB_TOKEN ?? '')
      .then((ghReleases: any[]) =>
        ghReleases.map((ghRelease: any) => ({
          ...toInternalRelease(ghRelease, repo.fullName),
          isNew: true,
        }))
      )
      .catch((err: unknown) => {
        console.error(`[Scraper] Failed to fetch ${repo.owner}/${repo.repo}:`, err);
        return [] as any[];
      })
  );

  const repoResults = await Promise.all(promises);

  // 展开并过滤
  const allReleases = repoResults.flat();

  // 获取已存储的 releases 进行去重
  const storedReleases: any[] = await getReleases(env.KV as any);
  const storedIds = new Set(storedReleases.map((r: any) => r.id));

  // 只保存新的 releases
  const newReleases = allReleases.filter((release: any) => !storedIds.has(release.id));

  if (newReleases.length > 0) {
    console.log(`[Scraper] Found ${newReleases.length} new releases`);

    // 合并并保存（新的在前）
    const combined = [...newReleases, ...storedReleases];
    await saveReleases(env.KV as any, combined);
  } else {
    console.log('[Scraper] No new releases found');
  }

  // 更新最后抓取时间
  await saveLastRun(env.KV as any, Date.now());
  console.log('[Scraper] Scrape completed');
}
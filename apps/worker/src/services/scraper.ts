// 抓取核心逻辑
import type { Env } from '@srrm/shared';
import type { Repo, Release } from '@srrm/shared';
import { getRepos, getReleases, saveReleases, getLastRun, saveLastRun } from './kv';
import { fetchReleases, toInternalRelease } from './github';
import type { KVNamespace } from '@cloudflare/workers-types';

export async function runScraper(env: Env): Promise<void> {
  console.log('[Scraper] Starting release scrape...');

  const repos = await getRepos(env.KV);
  if (repos.length === 0) {
    console.log('[Scraper] No repos configured, skipping');
    return;
  }

  console.log(`[Scraper] Scraping ${repos.length} repositories...`);

  // 并发获取所有仓库的 releases
  const promises = repos.map((repo: Repo) =>
    fetchReleases(repo.owner, repo.repo, env.GITHUB_TOKEN)
      .then((ghReleases) =>
        ghReleases.map((ghRelease) => ({
          ...toInternalRelease(ghRelease, repo.fullName),
          // 标记是否为新 release（相比上次抓取时间）
          isNew: true, // 实际比较将在下面处理
        }))
      )
      .catch((err: unknown) => {
        console.error(`[Scraper] Failed to fetch ${repo.owner}/${repo.repo}:`, err);
        return [] as Release[]; // 继续处理其他仓库
      })
  );

  const repoResults = await Promise.all(promises);

  // 展开并过滤
  const allReleases = repoResults.flat();

  // 获取已存储的 releases 进行去重
  const storedReleases = await getReleases(env.KV);
  const storedIds = new Set(storedReleases.map((r: Release) => r.id));

  // 只保存新的 releases
  const newReleases = allReleases.filter((release: Release) => !storedIds.has(release.id));

  if (newReleases.length > 0) {
    console.log(`[Scraper] Found ${newReleases.length} new releases`);

    // 合并并保存（新的在前）
    const combined = [...newReleases, ...storedReleases];
    await saveReleases(env.KV, combined);

    // TODO: 触发通知分发
    // await notifyNewReleases(newReleases, env);
  } else {
    console.log('[Scraper] No new releases found');
  }

  // 更新最后抓取时间
  await saveLastRun(env.KV, Date.now());
  console.log('[Scraper] Scrape completed');
}
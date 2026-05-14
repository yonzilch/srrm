// KV 操作封装 — 所有 KV 读写必须通过此文件
// 使用 any 避免 @cloudflare/workers-types 版本冲突
type KVNamespace = any;

export const KVKeys = {
  REPOS: 'config:repos',
  LAST_RUN: 'config:scrape_last_run',
  // 按日期分片: releases:date:YYYY-MM-DD
  releasesByDate(date: string): string {
    return `releases:date:${date}`;
  },
  RELEASES_LATEST: 'releases:latest',
  RELEASES_INDEX: 'releases:index',
} as const;

export async function getRepos(kv: KVNamespace): Promise<any[]> {
  const raw = await kv.get(KVKeys.REPOS);
  if (!raw) return [];
  const repos = JSON.parse(raw);
  // 迁移兼容：旧数据缺少 platform/baseUrl/repoUrl 字段时自动补全
  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    if (!repo.platform) repo.platform = 'github';
    if (!repo.baseUrl) repo.baseUrl = 'https://github.com';
    if (!repo.repoUrl) repo.repoUrl = 'https://github.com/' + repo.fullName;
  }
  return repos;
}

export async function saveRepos(kv: KVNamespace, repos: any[]): Promise<void> {
  await kv.put(KVKeys.REPOS, JSON.stringify(repos));
}

export async function getLastRun(kv: KVNamespace): Promise<number> {
  const raw = await kv.get(KVKeys.LAST_RUN);
  return raw ? Number(raw) : 0;
}

export async function saveLastRun(kv: KVNamespace, timestamp: number): Promise<void> {
  await kv.put(KVKeys.LAST_RUN, String(timestamp));
}

// ———— 新：按日期分片存储 ————

/** 读取某日的 releases */
export async function getReleasesByDate(kv: KVNamespace, date: string): Promise<any[]> {
  const raw = await kv.get(KVKeys.releasesByDate(date));
  return raw ? JSON.parse(raw) : [];
}

/**
 * 写入某日的 releases（合并去重，按 publishedAt 降序）
 * TTL: 90 天 (7,776,000 秒)
 */
export async function saveReleasesByDate(
  kv: KVNamespace,
  date: string,
  releases: any[],
): Promise<void> {
  const existing = await getReleasesByDate(kv, date);
  const merged = (existing as any[]).concat(releases);
  const unique = deduplicate(merged);
  unique.sort((a: any, b: any) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  await kv.put(KVKeys.releasesByDate(date), JSON.stringify(unique), {
    expirationTtl: 7_776_000, // 90 天
  });
}

/** 读取 releases:latest（最近 100 条，跨日期） */
export async function getLatestReleases(kv: KVNamespace): Promise<any[]> {
  const raw = await kv.get(KVKeys.RELEASES_LATEST);
  if (!raw) return [];
  const releases = JSON.parse(raw);
  // read-time 去重：防止旧数据中因 id 格式不同导致的重复
  const deduped = deduplicate(releases);
  // 如果去重后数量有变化，异步写回 KV（不阻塞读取）
  if (deduped.length !== releases.length) {
    const trimmed = deduped
      .sort((a: any, b: any) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 100);
    kv.put(KVKeys.RELEASES_LATEST, JSON.stringify(trimmed)).catch(() => {});
  }
  return deduped
    .sort((a: any, b: any) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 100);
}

/**
 * 更新 releases:latest
 * 合并、去重、按 publishedAt 降序、保留最多 100 条，无 TTL
 */
export async function updateLatestReleases(kv: KVNamespace, newReleases: any[]): Promise<void> {
  const existing = await getLatestReleases(kv);
  const merged = (existing as any[]).concat(newReleases);
  const unique = deduplicate(merged);
  unique.sort((a: any, b: any) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  const trimmed = unique.slice(0, 100);
  await kv.put(KVKeys.RELEASES_LATEST, JSON.stringify(trimmed));
}

/** 读取日期索引 releases:index */
export async function getReleasesIndex(kv: KVNamespace): Promise<string[]> {
  const raw = await kv.get(KVKeys.RELEASES_INDEX);
  return raw ? JSON.parse(raw) : [];
}

/**
 * 更新日期索引
 * 保留最近 90 个日期，降序排列
 */
export async function updateReleasesIndex(kv: KVNamespace, date: string): Promise<void> {
  const index = await getReleasesIndex(kv);
  if (index.indexOf(date) === -1) {
    index.push(date);
  }
  // 降序排序
  index.sort((a: string, b: string) => (a < b ? 1 : a > b ? -1 : 0));
  // 保留最多 90 个
  const trimmed = index.slice(0, 90);
  await kv.put(KVKeys.RELEASES_INDEX, JSON.stringify(trimmed));
}

/**
 * 删除指定仓库的所有 releases（日期分片 + latest）
 */
export async function deleteReleasesByRepo(kv: KVNamespace, repoFullName: string): Promise<void> {
  const dates = await getReleasesIndex(kv);
  const newDates: string[] = [];

  for (const date of dates) {
    const releases = await getReleasesByDate(kv, date);
    const filtered = releases.filter((r: any) => r.repoFullName !== repoFullName);

    if (filtered.length === 0) {
      // 该日期已无 releases，尝试删除整个分片（忽略删除失败）
      try {
        await kv.delete(KVKeys.releasesByDate(date));
      } catch (e) {
        console.warn('[KV] delete failed for date shard ' + date + ':', e);
      }
    } else {
      await kv.put(KVKeys.releasesByDate(date), JSON.stringify(filtered), {
        expirationTtl: 7_776_000,
      });
      newDates.push(date);
    }
  }

  // 更新日期索引
  await kv.put(KVKeys.RELEASES_INDEX, JSON.stringify(newDates));

  // 清理 releases:latest
  const latest = await getLatestReleases(kv);
  const remaining = latest.filter((r: any) => r.repoFullName !== repoFullName);
  await kv.put(KVKeys.RELEASES_LATEST, JSON.stringify(remaining));
}

/** 按 repoFullName::tagName 去重（保留 publishedAt 较大者） */
function deduplicate(releases: any[]): any[] {
  const seen: Record<string, any> = {};
  for (let i = 0; i < releases.length; i++) {
    const r = releases[i];
    const key = (r.repoFullName || '') + '::' + (r.tagName || '');
    const current = seen[key];
    if (!current || (r.publishedAt || '') > (current.publishedAt || '')) {
      seen[key] = r;
    }
  }
  const result: any[] = [];
  const keys = Object.keys(seen);
  for (let i = 0; i < keys.length; i++) {
    result.push(seen[keys[i]]);
  }
  return result;
}
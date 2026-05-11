// KV 操作封装 — 所有 KV 读写必须通过此文件
// 使用 any 避免 @cloudflare/workers-types 版本冲突
type KVNamespace = any;

export const KVKeys = {
  REPOS: 'config:repos',
  LAST_RUN: 'config:scrape_last_run',
  RELEASES: 'data:releases',
} as const;

export async function getRepos(kv: KVNamespace): Promise<any[]> {
  const raw = await kv.get(KVKeys.REPOS);
  return raw ? JSON.parse(raw) : [];
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

export async function getReleases(kv: KVNamespace): Promise<any[]> {
  const raw = await kv.get(KVKeys.RELEASES);
  return raw ? JSON.parse(raw) : [];
}

export async function saveReleases(kv: KVNamespace, releases: any[]): Promise<void> {
  // 只保留最近 500 条
  const trimmed = releases.slice(0, 500);
  await kv.put(KVKeys.RELEASES, JSON.stringify(trimmed));
}

export async function addRelease(kv: KVNamespace, release: any): Promise<void> {
  const releases = await getReleases(kv);
  const exists = releases.some((r: any) => r.id === release.id);
  if (!exists) {
    releases.unshift(release); // 添加到最前面
    await saveReleases(kv, releases);
  }
}

export async function removeOldReleases(kv: KVNamespace, cutoffDate: string): Promise<void> {
  const releases = await getReleases(kv);
  const filtered = releases.filter((r: any) => r.publishedAt >= cutoffDate);
  await saveReleases(kv, filtered);
}
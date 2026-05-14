// D1 数据访问层 — 替代旧 kv.ts
// 所有数据库操作通过此文件封装，禁止在路由中直接调用 env.DB

import type { Repo, Release } from '@srrm/shared';

// 使用 any 避免 @cloudflare/workers-types 版本冲突（与旧 kv.ts 策略一致）
type D1Database = any;

// ── Repos ───────────────────────────────────────────────

export async function getRepos(db: D1Database): Promise<Repo[]> {
  const { results } = await db
    .prepare('SELECT * FROM repos ORDER BY added_at DESC')
    .all();
  return _castRows<Repo>(results);
}

export async function addRepo(db: D1Database, repo: Repo): Promise<void> {
  const existing = await getRepoByFullNameAndBase(db, repo.fullName, repo.baseUrl);
  if (existing) {
    throw new Error('DUPLICATE');
  }

  const ret = await db
    .prepare(
      'INSERT INTO repos (id, platform, base_url, owner, repo, full_name, repo_url, added_at, added_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(
      repo.id, repo.platform, repo.baseUrl, repo.owner,
      repo.repo, repo.fullName, repo.repoUrl, repo.addedAt, repo.addedBy
    )
    .run();

  if (!(ret as any).success) {
    throw new Error('Failed to insert repo');
  }
}

export async function deleteRepo(db: D1Database, id: string): Promise<boolean> {
  const ret = await db.prepare('DELETE FROM repos WHERE id = ?').bind(id).run();
  return ((ret as any).changes as number) > 0;
}

export async function getRepoByFullNameAndBase(
  db: D1Database,
  fullName: string,
  baseUrl: string
): Promise<Repo | null> {
  const { results } = await db
    .prepare('SELECT * FROM repos WHERE full_name = ? AND base_url = ?')
    .bind(fullName, baseUrl)
    .all();
  const rows = _castRows<Repo>(results);
  return rows.length > 0 ? rows[0] : null;
}

// ── Releases ─────────────────────────────────────────────

/**
 * 批量 upsert releases
 * D1 batch 每次最多 100 条 statement
 * PRIMARY KEY (repo_full_name, tag_name) 天然去重
 */
export async function upsertReleases(
  db: D1Database,
  releases: Release[]
): Promise<{ inserted: number; updated: number }> {
  if (releases.length === 0) {
    return { inserted: 0, updated: 0 };
  }

  let inserted = 0;

  for (let i = 0; i < releases.length; i += 100) {
    const batch = releases.slice(i, i + 100);
    const statements = batch.map((r) =>
      db
        .prepare(
          'INSERT OR REPLACE INTO releases (id, repo_full_name, repo_url, platform, tag_name, name, body, body_html, published_at, html_url, is_prerelease, is_draft) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(
          r.id, r.repoFullName, r.repoUrl, r.platform,
          r.tagName, r.name, r.body, r.bodyHtml ?? '',
          r.publishedAt, r.htmlUrl,
          r.isPrerelease ? 1 : 0, r.isDraft ? 1 : 0
        )
    );

    const results = await db.batch(statements);
    for (const r of results as any[]) {
      if (r.success) inserted++;
    }
  }

  return { inserted, updated: 0 };
}

/**
 * 获取 releases，支持按日期、仓库、平台过滤
 */
export async function getReleases(
  db: D1Database,
  opts?: {
    date?: string;
    repoFullName?: string;
    platform?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ releases: Release[]; total: number }> {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (opts?.date) {
    conditions.push('date(published_at) = ?');
    params.push(opts.date);
  }
  if (opts?.repoFullName) {
    conditions.push('repo_full_name = ?');
    params.push(opts.repoFullName);
  }
  if (opts?.platform) {
    conditions.push('platform = ?');
    params.push(opts.platform);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const limitNum = opts?.limit ?? 100;
  const offsetNum = opts?.offset ?? 0;

  const totalRow = await db
    .prepare(`SELECT COUNT(*) as cnt FROM releases ${where}`)
    .bind(...params)
    .first() as any;
  const total = (totalRow?.cnt as number) ?? 0;

  const sql = `SELECT * FROM releases ${where} ORDER BY published_at DESC LIMIT ? OFFSET ?`;
  const { results } = await db.prepare(sql).bind(...params, limitNum, offsetNum).all();

  return {
    releases: _castRows<Release>(results),
    total,
  };
}

/**
 * 获取所有有 release 的日期列表
 */
export async function getReleaseDates(
  db: D1Database,
  limit?: number
): Promise<string[]> {
  const lim = limit ?? 90;
  const { results } = await db
    .prepare('SELECT DISTINCT date(published_at) as d FROM releases ORDER BY d DESC LIMIT ?')
    .bind(lim)
    .all();
  const rows = _castRows<{ d: string }>(results);
  return rows.map((r) => r.d);
}

/**
 * 删除指定仓库的所有 releases
 */
export async function deleteReleasesForRepo(
  db: D1Database,
  repoFullName: string
): Promise<void> {
  await db.prepare('DELETE FROM releases WHERE repo_full_name = ?').bind(repoFullName).run();
}

// ── Config ──────────────────────────────────────────────

export async function getConfig(db: D1Database, key: string): Promise<string | null> {
  const row = await db.prepare('SELECT value FROM config WHERE key = ?').bind(key).first() as any;
  return (row?.value as string) ?? null;
}

export async function setConfig(db: D1Database, key: string, value: string): Promise<void> {
  await db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').bind(key, value).run();
}

// ── 兼容旧接口别名 ──────────────────────────────────────

export async function getLatestReleases(db: D1Database, lim = 100): Promise<Release[]> {
  const { results } = await db
    .prepare('SELECT * FROM releases ORDER BY published_at DESC LIMIT ?')
    .bind(lim)
    .all();
  return _castRows<Release>(results);
}

export const getReleasesByDate = (db: D1Database, date: string): Promise<Release[]> =>
  getReleases(db, { date }).then((r) => r.releases);

export const getReleasesIndex = (db: D1Database): Promise<string[]> => getReleaseDates(db);

export const saveReleasesByDate = (db: D1Database, _date: string, releases: Release[]): Promise<void> =>
  upsertReleases(db, releases).then(() => undefined);

export const updateLatestReleases = (db: D1Database, newReleases: Release[]): Promise<void> =>
  upsertReleases(db, newReleases).then(() => undefined);

export async function updateReleasesIndex(_db: D1Database, _date: string): Promise<void> {
  // D1 中日期索引由 SQL 聚合自动维护，此处留空以兼容调用方
}

export async function getLastRun(db: D1Database): Promise<number> {
  const v = await getConfig(db, 'scrape_last_run');
  return v ? Number(v) : 0;
}

export async function saveLastRun(db: D1Database, timestamp: number): Promise<void> {
  await setConfig(db, 'scrape_last_run', String(timestamp));
}

// ── 内部工具 ─────────────────────────────────────────────

/** 将 snake_case 键转换为 camelCase */
function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase());
}

/** 递归转换对象的所有键为 camelCase */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function camelizeKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((v: any) => camelizeKeys(v));
  const result: Record<string, unknown> = {};
  // 使用 Object.keys 避免 Workers 环境下 Object.entries 缺失
  for (const k of Object.keys(obj)) {
    result[snakeToCamel(k)] = camelizeKeys(obj[k]);
  }
  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _castRows<T>(rows: any[]): T[] {
  return rows.map((row) => camelizeKeys(row) as T);
}
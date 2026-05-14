-- Repo 表：存储监控的仓库
CREATE TABLE IF NOT EXISTS repos (
  id          TEXT PRIMARY KEY,
  platform    TEXT NOT NULL DEFAULT 'github',
  base_url    TEXT NOT NULL DEFAULT 'https://github.com',
  owner       TEXT NOT NULL,
  repo        TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  repo_url    TEXT NOT NULL,
  added_at    TEXT NOT NULL,
  added_by    TEXT NOT NULL
);

-- Release 表：PRIMARY KEY (repo_full_name, tag_name) 天然去重
CREATE TABLE IF NOT EXISTS releases (
  id              TEXT NOT NULL,
  repo_full_name  TEXT NOT NULL,
  repo_url        TEXT NOT NULL,
  platform        TEXT NOT NULL DEFAULT 'github',
  tag_name        TEXT NOT NULL,
  name            TEXT NOT NULL DEFAULT '',
  body            TEXT NOT NULL DEFAULT '',
  body_html       TEXT NOT NULL DEFAULT '',
  published_at    TEXT NOT NULL,
  html_url        TEXT NOT NULL,
  is_prerelease   INTEGER NOT NULL DEFAULT 0,
  is_draft        INTEGER NOT NULL DEFAULT 0,
  scraped_at      TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (repo_full_name, tag_name)
);

-- 配置表（替代 KV 中的 config:* keys）
CREATE TABLE IF NOT EXISTS config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_releases_published_at ON releases(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_releases_repo         ON releases(repo_full_name);
CREATE INDEX IF NOT EXISTS idx_releases_date          ON releases(date(published_at));
CREATE INDEX IF NOT EXISTS idx_releases_platform      ON releases(platform);
CREATE INDEX IF NOT EXISTS idx_releases_id            ON releases(id);
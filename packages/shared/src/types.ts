// packages/shared/src/types.ts
// 共享 TypeScript 类型定义 — Worker 和 Web 端复用
// 不引用任何平台特定的 API（如 @cloudflare/workers-types）

/**
 * 支持的平台标识
 */
export type Platform = 'github' | 'gitlab' | 'forgejo' | 'gitea';

/**
 * 应用环境变量（Hono Bindings）
 * 所有字段均为运行时注入，不硬编码
 */
export type Env = {
  GITHUB_TOKEN?: string;
  SSO_PROVIDER?: string;
  SSO_ISSUER_URL?: string;
  SSO_CLIENT_ID?: string;
  SSO_CLIENT_SECRET?: string;
  SSO_CALLBACK_URL?: string;
  ADMIN_EMAILS?: string;
  JWT_SECRET: string;
  SCRAPE_INTERVAL_MINUTES?: string;
  APP_BASE_URL?: string;
  RSS_PUBLIC?: string;

  // ── 通知配置 ────────────────────────────────────
  // Gotify
  GOTIFY_URL?: string;
  GOTIFY_TOKEN?: string;
  GOTIFY_PRIORITY?: string;
  // Apprise HTTP API
  APPRISE_API_URL?: string;
  APPRISE_URLS?: string;
  APPRISE_TAG?: string;
  // 通用 Webhook
  WEBHOOK_URL?: string;
  WEBHOOK_SECRET?: string;
  WEBHOOK_METHOD?: string;

  // Favicon URL (可选，自定义站点图标)
  FAVICON_URL?: string;
};

/**
 * 监控的 Git 仓库
 */
export interface Repo {
  id: string;           // nanoid 生成
  platform: string;     // 'github' | 'gitlab' | 'forgejo' | 'gitea'
  baseUrl: string;      // 如 https://github.com
  owner: string;
  repo: string;
  fullName: string;     // "{owner}/{repo}"
  repoUrl: string;      // 仓库访问 URL
  addedAt: string;      // ISO 8601
  addedBy: string;      // 添加者邮箱
}

/**
 * Git Release 条目
 */
export interface Release {
  id: string;                   // GitHub release node_id
  repoFullName: string;         // "{owner}/{repo}"
  tagName: string;
  name: string;
  body: string;                 // Markdown 格式的 Release Notes
  bodyHtml?: string;            // 已渲染的 HTML（可选）
  publishedAt: string;          // ISO 8601
  htmlUrl: string;
  repoUrl?: string;             // 仓库页面 URL（可选）
  isPrerelease: boolean;
  isDraft: boolean;
  platform?: string;            // 平台标识（可选，默认 github）
}

/**
 * 认证用户信息（JWT payload）
 */
export interface User {
  email: string;
  role: 'admin' | 'viewer';
  exp: number;                  // Unix 时间戳（秒）
}

/**
 * API 错误响应
 */
export interface ApiError {
  error: string;
  code?: string;
}
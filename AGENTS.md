# 🤖 AGENTS.md — AI Agent 协作指南

> 本文件是为 AI Coding Agent（Cursor、Claude Code、Copilot Workspace、opencode 等）准备的上下文指南。
> 在开始任何编码任务前，Agent 必须完整阅读本文件。

---

## 0. 项目速览

**项目名称：** Serverless Repository Release Monitor
**一句话描述：** 聚合 Git 仓库 Release 动态，提供统一 RSS 订阅 + Web 浏览，运行于 Cloudflare Edge。

**Monorepo 结构：**
```
apps/worker/    → Cloudflare Workers + Hono（API + Cron）
apps/web/       → Cloudflare Pages + React/Vite（SPA 前端）
packages/shared → 共享 TypeScript 类型
```

---

## 1. 通用原则（所有任务必须遵守）

### 1.1 TypeScript 严格模式

- 所有文件必须是 `.ts` 或 `.tsx`，禁止使用 `.js`
- `tsconfig.json` 必须开启 `"strict": true`
- 禁止使用 `any`，使用 `unknown` + 类型收窄代替
- 所有函数参数和返回值必须有明确类型标注

### 1.2 Edge Runtime 约束（重要！）

Agent 在 `apps/worker/` 中编写代码时，必须牢记以下限制：

```
❌ 禁止使用：
  - Node.js 内置模块（fs, path, crypto → 使用 Web Crypto API）
  - 任何需要文件系统的操作
  - 长时间同步阻塞操作
  - 超过 1MB 的 npm 包（会超出 Workers bundle 限制）

✅ 应当使用：
  - Web 标准 API（fetch, Response, Request, URL, Headers）
  - Web Crypto API（crypto.subtle.*）
  - Hono 框架提供的工具函数
  - Workers 原生绑定（D1, env）
```

### 1.3 错误处理规范

```typescript
// ✅ 正确：所有 async 操作必须有错误处理
try {
  const data = await env.DB.prepare('SELECT * FROM releases WHERE id = ?').bind('xxx').first();
} catch (e) {
  console.error('[D1 Error]', e);
  return c.json({ error: 'Database error' }, 500);
}

// ❌ 错误：裸 await 无 try/catch
const data = await env.DB.prepare('SELECT * FROM releases WHERE id = ?').bind('xxx').first();
```

### 1.4 代码风格

- 使用 `pnpm` 作为包管理器（禁止使用 npm / yarn）
- 缩进：2 空格
- 引号：单引号（TypeScript/JavaScript）
- 尾随逗号：`"trailingComma": "all"`
- 每个文件顶部必须有简短的功能注释

---

## 2. Worker 端开发规范（`apps/worker/`）

### 2.1 Hono App 结构

```typescript
// src/index.ts — 标准结构
import { Hono } from 'hono';
import { authRoutes } from './routes/auth';
import { releasesRoutes } from './routes/releases';
import { adminRoutes } from './routes/admin';
import { feedRoute } from './routes/feed';
import { authMiddleware } from './middleware/auth';

export type Env = {
  DB: D1Database;
  GITHUB_TOKEN: string;
  SSO_PROVIDER: string;
  SSO_ISSUER_URL: string;
  SSO_CLIENT_ID: string;
  SSO_CLIENT_SECRET: string;
  SSO_CALLBACK_URL: string;
  ADMIN_EMAILS: string;
  JWT_SECRET: string;
  SCRAPE_INTERVAL_MINUTES: string;
  APP_BASE_URL: string;
};

const app = new Hono<{ Bindings: Env }>();

// 路由挂载顺序：公开路由在前，受保护路由在后
app.route('/api/auth', authRoutes);
app.route('/feed.xml', feedRoute);
app.route('/api/releases', releasesRoutes);
app.use('/api/admin/*', authMiddleware); // 中间件先注册
app.route('/api/admin', adminRoutes);

export default app;
```

### 2.2 D1 操作规范

所有 D1 读写必须通过 `services/db.ts` 封装，禁止在路由文件中直接调用 `env.DB`：

```typescript
// services/db.ts — D1 操作唯一入口
import type { D1Database } from '@cloudflare/workers-types';

// 获取所有仓库
export async function getRepos(db: D1Database): Promise<Repo[]> { ... }

// 添加仓库
export async function addRepo(db: D1Database, repo: Repo): Promise<void> { ... }

// 删除仓库及其所有 releases
export async function deleteRepo(db: D1Database, id: string): Promise<boolean> { ... }

// 批量 upsert releases，返回新增条目
export async function upsertReleases(
  db: D1Database, releases: Release[]
): Promise<{ inserted: number; updated: number; newReleases: Release[] }> { ... }

// 获取 releases，支持按日期、仓库、平台过滤
export async function getReleases(
  db: D1Database, opts?: { date?: string; repoFullName?: string; platform?: string; limit?: number; offset?: number }
): Promise<{ releases: Release[]; total: number }> { ... }

// 获取有 release 的日期列表
export async function getReleaseDates(db: D1Database, limit?: number): Promise<string[]> { ... }
```

### 2.3 JWT 处理规范

使用 Web Crypto API 实现 JWT，禁止引入 `jsonwebtoken`（Node.js 专用）：

```typescript
// 推荐使用 hono/jwt 或手写 Web Crypto 实现
import { sign, verify } from 'hono/jwt';

export type JWTPayload = {
  email: string;
  role: 'admin' | 'viewer';
  exp: number;
};

// JWT 有效期：24 小时
const JWT_EXPIRES_IN = 60 * 60 * 24;
```

### 2.4 Cron Handler 规范

```typescript
// scheduled.ts — 必须处理所有异常，不能让 Cron 静默失败
export async function scheduled(
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  ctx.waitUntil(runWithErrorBoundary(env));
}

async function runWithErrorBoundary(env: Env): Promise<void> {
  try {
    await runScraper(env);
  } catch (e) {
    // Workers 中用 console.error，日志可在 Dashboard 查看
    console.error('[Cron Error]', e instanceof Error ? e.message : e);
  }
}
```

### 2.5 GitHub API 调用规范

```typescript
// services/github.ts
const GITHUB_API = 'https://api.github.com';

export async function fetchReleases(
  owner: string,
  repo: string,
  token: string
): Promise<GitHubRelease[]> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/releases?per_page=10`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'github-release-monitor/1.0', // GitHub 要求必须有 UA
      },
    }
  );

  if (res.status === 404) return []; // 仓库不存在，静默返回空
  if (res.status === 403) throw new Error('GitHub API Rate Limit exceeded');
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

  return res.json<GitHubRelease[]>();
}
```

---

## 3. Web 端开发规范（`apps/web/`）

### 3.1 API 客户端规范

所有 API 调用通过 `api/client.ts` 统一封装，禁止在组件中直接使用 `fetch`：

```typescript
// api/client.ts
const BASE = import.meta.env.VITE_API_BASE ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include', // 携带 HttpOnly Cookie
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json<T>();
}

export const api = {
  releases: {
    list: (params?: { date?: string; repo?: string }) =>
      request<Release[]>(`/api/releases?${new URLSearchParams(params as any)}`),
  },
  admin: {
    repos: {
      list: () => request<Repo[]>('/api/admin/repos'),
      add: (body: { owner: string; repo: string }) =>
        request<Repo>('/api/admin/repos', { method: 'POST', body: JSON.stringify(body) }),
      remove: (id: string) =>
        request<void>(`/api/admin/repos/${id}`, { method: 'DELETE' }),
    },
    scrape: {
      trigger: () => request<void>('/api/admin/scrape/trigger', { method: 'POST' }),
    },
  },
};
```

### 3.2 路由守卫规范

```typescript
// router.tsx
const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user || user.role !== 'admin') return <Navigate to="/login" replace />;
  return <>{children}</>;
};
```

### 3.3 组件规范

- 所有组件使用函数式组件 + Hooks，禁止 Class 组件
- Props 接口必须以 `Props` 后缀命名：`interface ReleaseCardProps`
- 服务端状态（API 数据）使用 React Query 管理
- 客户端状态（UI 状态）使用 `useState`，跨组件共享用 Zustand
- 禁止在 `useEffect` 中直接调用 API，统一走 React Query

---

## 4. 共享类型规范（`packages/shared/`）

所有在 Worker 和 Web 之间共享的类型必须定义在 `packages/shared/types.ts`：

```typescript
// packages/shared/types.ts

export interface Repo {
  id: string;           // nanoid 生成
  owner: string;
  repo: string;
  fullName: string;     // "{owner}/{repo}"
  addedAt: string;      // ISO 8601
  addedBy: string;      // 添加者邮箱
}

export interface Release {
  id: string;           // GitHub release node_id
  repoFullName: string; // "{owner}/{repo}"
  tagName: string;
  name: string;
  body: string;         // Markdown 格式的 Release Notes
  publishedAt: string;  // ISO 8601
  htmlUrl: string;
  isPrerelease: boolean;
  isDraft: boolean;
}

export interface User {
  email: string;
  role: 'admin' | 'viewer';
  exp: number;
}

export interface ApiError {
  error: string;
  code?: string;
}
```

---

## 5. Agent 任务执行协议

### 5.1 接到任务时，必须按以下顺序执行：

```
1. READ   → 阅读 ROADMAP.md 确认任务属于哪个 Phase
2. LOCATE → 确认要修改的文件路径（严格按目录结构）
3. CHECK  → 检查 packages/shared/types.ts 是否已有所需类型
4. CODE   → 编写代码（遵守第 1-4 节规范）
5. VERIFY → 自查 Edge Runtime 约束（是否用了 Node.js 专用 API？）
6. TEST   → 提供对应的手动验证步骤或测试思路
```

### 5.2 禁止行为清单

```
❌ 不要自作主张引入未在 ROADMAP.md 中提及的新依赖
❌ 不要在 routes/ 文件中写业务逻辑（放到 services/）
❌ 不要在组件中直接调用 fetch（走 api/client.ts）
❌ 不要在 KV 中存储超过 25MB 的 Value（KV 单值限制）
❌ 不要使用 localStorage/sessionStorage 存储认证信息
❌ 不要将 JWT_SECRET 等 Secrets 硬编码在代码中
❌ 不要在 scheduled handler 中使用同步阻塞操作
❌ 不要跳过错误处理，任何 await 都需要 try/catch 或 .catch()
```

### 5.3 依赖引入审批流程

如果任务需要引入新 npm 包，必须在代码注释中说明：

```typescript
// DEPENDENCY: hono/jwt
// REASON: Workers 环境下 JWT 签名/验证，使用 Web Crypto API 实现，无 Node.js 依赖
// BUNDLE_SIZE: ~2KB gzipped
// ALTERNATIVE_CONSIDERED: jsonwebtoken (rejected: Node.js only)
import { sign, verify } from 'hono/jwt';
```

---

## 6. 环境变量使用规范

### 在 Worker 中访问

```typescript
// ✅ 正确：通过 Hono context 的 env 访问
app.get('/api/example', (c) => {
  const token = c.env.GITHUB_TOKEN;
  return c.json({ ok: true });
});

// ✅ 正确：在 services 函数中通过参数传入 env
async function scrape(env: Env) {
  const token = env.GITHUB_TOKEN;
}

// ❌ 错误：通过 process.env 访问（Workers 不支持）
const token = process.env.GITHUB_TOKEN;
```

### 在 Web 中访问

```typescript
// ✅ 正确：Vite 环境变量（必须以 VITE_ 开头）
const apiBase = import.meta.env.VITE_API_BASE;

// ❌ 错误：process.env（Vite SPA 不适用）
const apiBase = process.env.API_BASE;
```

### 必要的环境变量检查

在 Worker 启动时验证关键环境变量：

```typescript
// src/index.ts — 启动检查
function validateEnv(env: Env): void {
  const required = ['GITHUB_TOKEN', 'JWT_SECRET', 'SSO_ISSUER_URL' 'SSO_CLIENT_ID', 'SSO_CLIENT_SECRET'];
  const missing = required.filter((k) => !env[k as keyof Env]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}
```

---

## 7. 测试与验证指南

### 本地开发启动

```bash
# Worker 本地开发
cd apps/worker
pnpm dev          # 启动 wrangler dev（热重载）

# Web 本地开发
cd apps/web
pnpm dev          # 启动 Vite dev server

# 本地模拟 Cron 触发
curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"
```

### D1 本地调试

```bash
# 查看本地 D1 数据
wrangler d1 execute <database-name> --local --command "SELECT * FROM repos;"
wrangler d1 execute <database-name> --local --command "SELECT * FROM releases ORDER BY published_at DESC LIMIT 10;"
wrangler d1 execute <database-name> --local --command "SELECT * FROM config;"
```

### 关键接口验证 Checklist

```
认证流程：
  □ GET /api/auth/login  → 302 重定向至 SSO Provider
  □ GET /api/auth/callback?code=xxx  → Cookie 写入 + 重定向首页
  □ 访问 /api/admin/repos（无 Cookie）→ 401
  □ 访问 /api/admin/repos（有有效 Cookie，非 admin 邮箱）→ 403
  □ POST /api/auth/logout  → Cookie 清除

数据流：
  □ POST /api/admin/repos { owner: "facebook", repo: "react" } → 201
  □ GET /api/admin/repos → 返回包含 react 的列表
  □ 手动触发 Cron → GET /api/releases → 有数据
  □ GET /feed.xml → 合法 XML，包含 <channel> 和 <item>
  □ DELETE /api/admin/repos/:id → 204，列表中消失
```

---

## 8. 后继扩展任务指南

当开始实现通知模块时，必须遵守以下约定：

### 通知器接口契约

```typescript
// services/notifiers/base.ts — 所有通知器必须实现此接口
export interface Notifier {
  readonly name: string;
  isConfigured(env: Env): boolean;  // 检查所需环境变量是否配置
  send(release: Release, env: Env): Promise<void>;
}
```

### 通知器注册机制

```typescript
// services/notifiers/index.ts
import { GotifyNotifier } from './gotify';
import { WebhookNotifier } from './webhook';
import { AppriseNotifier } from './apprise';

export function buildNotifiers(env: Env): Notifier[] {
  const all: Notifier[] = [
    new GotifyNotifier(),
    new WebhookNotifier(),
    new AppriseNotifier(),
  ];
  // 仅返回已配置的通知器
  return all.filter((n) => n.isConfigured(env));
}
```

### 新增通知器所需环境变量命名规范

```
GOTIFY_URL              → Gotify 服务地址
GOTIFY_TOKEN            → Gotify 应用 Token
GOTIFY_PRIORITY         → 消息优先级（默认 5）

WEBHOOK_URL             → Webhook 目标地址
WEBHOOK_SECRET          → HMAC-SHA256 签名密钥（可选）
WEBHOOK_METHOD          → 请求方法（默认 POST）

APPRISE_API_URL         → Apprise HTTP API 地址
APPRISE_TAG             → Apprise 通知标签（可选）
```

---

## 9. Git 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
feat(worker): add GitHub releases scraper with rate limit handling
fix(web): correct JWT expiry check in auth hook
chore(deps): upgrade hono to 4.x
docs: update ROADMAP Phase 2 status
refactor(worker): extract KV operations to dedicated service
test: add scraper unit tests for release deduplication
```

**类型说明：**
- `feat` — 新功能
- `fix` — Bug 修复
- `refactor` — 重构（不改变功能）
- `chore` — 构建/依赖/工具变更
- `docs` — 文档更新
- `test` — 测试相关

---

## 10. 快速参考卡

```
┌─────────────────────────────────────────────────────────────────┐
│                        QUICK REFERENCE                          │
├──────────────────────┬──────────────────────────────────────────┤
│ 添加仓库             │ POST /api/admin/repos                    │
│ 删除仓库             │ DELETE /api/admin/repos/:id              │
│ 手动触发抓取         │ POST /api/admin/scrape/trigger           │
│ 获取 Release 列表    │ GET /api/releases?date=YYYY-MM-DD        │
│ RSS 订阅链接         │ GET /feed.xml                            │
│ 登录入口             │ GET /api/auth/login                      │
│ 登出                 │ POST /api/auth/logout                    │
├──────────────────────┬──────────────────────────────────────────┤
│ D1: 仓库列表表       │ repos                                    │
│ D1: Release 表      │ releases (按 published_at 降序索引)       │
│ D1: 配置表          │ config (key-value)                        │
├──────────────────────┼──────────────────────────────────────────┤
│ Worker 本地调试      │ cd apps/worker && pnpm dev               │
│ Web 本地调试         │ cd apps/web && pnpm dev                  │
│ 部署 Worker          │ cd apps/worker && pnpm deploy            │
│ 部署 Web             │ git push → Pages CI 自动触发             │
└──────────────────────┴──────────────────────────────────────────┘
```

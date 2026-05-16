# 🗺️ ROADMAP — Serverless Repository Release Monitor

> 一个运行在 Cloudflare Edge 上的 Git Release 聚合与订阅系统。
> 无传统服务器，无数据库，无邮件依赖。纯 Edge-Native 架构。

---

## 📐 项目概览

| 维度 | 内容 |
|------|------|
| **定位** | 聚合多个 Git 仓库的 Release 动态，提供统一 RSS + Web 浏览界面 |
| **运行环境** | Cloudflare Workers (API + Cron) + Cloudflare Pages (SPA) |
| **存储方案** | Cloudflare D1 (SQLite) |
| **认证方案** | OAuth2 SSO → JWT → HttpOnly Cookie（无服务端 Session） |
| **通知方案** | RSS + Gotify / Webhook / Apprise |
| **当前版本** | v1.3.7 |

---

## 🏗️ 技术选型

### 后端 · Cloudflare Workers + Hono

| 技术 | 选型 | 理由 |
|------|------|------|
| **Web 框架** | [Hono](https://hono.dev/) | 专为 Edge 设计，体积极小，TypeScript 原生支持 |
| **定时任务** | Cloudflare Cron Triggers | Workers 原生能力，无需额外基础设施 |
| **存储方案** | Cloudflare D1 (SQLite) | 关系型存储，支持复杂查询和 JOIN |
| **认证** | OAuth2 (Generic OIDC) + JWT | 无状态；无需数据库存 Session |
| **RSS 生成** | 手写 XML 拼接 | Workers 环境下依赖越少越好 |
| **通知** | Gotify / Apprise / Webhook | 可扩展通知器接口 |

### 前端 · Cloudflare Pages + React

| 技术 | 选型 | 理由 |
|------|------|------|
| **构建工具** | Vite | 极速 HMR，原生 ESM |
| **UI 框架** | React 18 | 生态成熟，SPA 路由简单 |
| **路由** | React Router v6 | `/` content 面板 + `/admin` admin 面板 |
| **样式** | Tailwind CSS (Catppuccin Mocha) | 无运行时，编译裁剪，暗色主题 |
| **状态管理** | Zustand / React Query | 轻量，无需 Redux |
| **i18n** | 自定义 I18nContext | 支持 en/zh 双语 |

### 环境变量清单（完整）

```toml
# wrangler.toml / Cloudflare Dashboard Secrets

# === Required ===
JWT_SECRET              = "..."                     # ≥32 字节随机字符串，JWT 签名密钥
SSO_ISSUER_URL          = "..."                     # OIDC Provider issuer URL
SSO_CLIENT_ID           = "..."                     # OIDC Client ID
SSO_CLIENT_SECRET       = "..."                     # OIDC Client Secret
SSO_CALLBACK_URL        = "https://your-worker.dev/api/auth/callback"
ADMIN_EMAILS            = "a@x.com,b@x.com"         # 逗号分隔，授权管理员邮箱

# === Optional ===
GITHUB_TOKEN            = "ghp_..."                 # GitHub PAT，防止 API 限流
GITLAB_TOKEN            = "..."                     # GitLab PAT（可选）
FORGEJO_TOKEN           = "..."                     # Forgejo PAT（可选）
GITEA_TOKEN             = "..."                     # Gitea PAT（可选）
SCRAPE_INTERVAL_MINUTES = "60"                      # 抓取间隔（分钟），默认 60
JWT_EXPIRES_IN          = "2592000"                 # JWT 过期时间（秒），默认 30 天，0=永不过期
APP_BASE_URL            = "https://your-pages.dev"  # 前端公共 URL
RSS_PUBLIC              = "true"                    # feed.xml 是否公开，默认 true
FAVICON_URL             = "..."                     # 自定义 favicon URL（可选）

# === Notification: Gotify ===
GOTIFY_URL              = "..."                     # Gotify 服务地址
GOTIFY_TOKEN            = "..."                     # Gotify 应用 Token
GOTIFY_PRIORITY         = "5"                       # 消息优先级 1-10，默认 5

# === Notification: Apprise ===
APPRISE_API_URL         = "..."                     # Apprise HTTP API 地址
APPRISE_URLS            = "..."                     # 通知目标（逗号分隔）
APPRISE_TAG             = "..."                     # 通知标签（可选）

# === Notification: Webhook ===
WEBHOOK_URL             = "..."                     # Webhook 目标 URL
WEBHOOK_SECRET          = "..."                     # HMAC-SHA256 签名密钥
WEBHOOK_METHOD          = "POST"                    # HTTP 方法，默认 POST
```

---

## 🧩 功能模块详解

### Module 1 · 认证（Auth）

```
用户点击登录
  → 重定向至 SSO Provider
  → 回调 /api/auth/callback
  → Hono 验证 state + code，换取 access_token
  → 调用 Provider userinfo endpoint 获取用户邮箱
  → 检查邮箱是否在 ADMIN_EMAILS 中
  → 签发 JWT（payload: { email, role: 'admin'|'viewer', exp? }）
  → 写入 HttpOnly + SameSite=Lax Cookie（expiry 由 JWT_EXPIRES_IN 控制）
  → 重定向回前端
```

**中间件**：`authMiddleware` 解析 Cookie → 验证 JWT → 注入 `c.set('user', payload)`

**路由保护**：所有 `/api/admin/*` 路由必须通过 `adminMiddleware`（role === 'admin'）

**Cookie 过期策略**：由 `JWT_EXPIRES_IN` 环境变量控制（默认 30 天，设为 0 则永不过期）

---

### Module 2 · 数据抓取（Scraper）

**D1 数据结构设计：**

```
表名                  用途
─────────────────────────────────────────────────────
repos                 仓库列表
  id, platform, base_url, owner, repo, full_name, repo_url, added_at, added_by

releases              Release 条目（按 published_at 降序索引）
  id, repo_full_name, repo_url, platform, tag_name, name, body, body_html,
  published_at, html_url, is_prerelease, is_draft, scraped_at

config                配置表（key-value）
  key, value
```

**Cron 频率控制策略：**

```toml
# wrangler.toml —— 固定高频触发
[triggers]
crons = ["*/5 * * * *"]
```

```typescript
// scheduled handler —— 逻辑频率门控
export async function scheduled(controller, env) {
  const lastRun = await getLastRun(env.DB);
  const interval = Number(env.SCRAPE_INTERVAL_MINUTES) * 60 * 1000;
  if (Date.now() - lastRun < interval) return; // 未到间隔，跳过
  await runScraper(env);
}
```

**抓取流程：**
1. 从 D1 查询 `repos` 表获取仓库列表
2. 并发调用各平台 Releases API（携带对应 token）
3. 与已存储 `releases` 表对比，提取 `newReleases`
4. 批量 upsert 写入 D1
5. 触发通知分发器（Gotify / Apprise / Webhook）

**支持平台**：GitHub / GitLab / Forgejo / Gitea

---

### Module 3 · RSS 输出（Feed）

- 路由：`GET /feed.xml`（根据 `RSS_PUBLIC` 决定是否需认证）
- 从 D1 读取 releases，按 `publishedAt` 降序排列
- 生成标准 RSS 2.0 XML
- 响应头：`Content-Type: application/xml; charset=utf-8`
- 支持 Query 参数过滤：`?repo=owner/repo`

---

### Module 4 · API 层（Hono Routes）

```
Public（无需认证）
  GET  /feed.xml                       → RSS 输出（根据 RSS_PUBLIC 决定是否需认证）
  GET  /api/releases                   → 所有 releases（分页，每页 50）
  GET  /api/releases?date=YYYY-MM-DD   → 按日期过滤
  GET  /api/auth/login                 → 重定向至 SSO
  GET  /api/auth/callback              → SSO 回调处理
  POST /api/auth/logout                → 清除 Cookie
  GET  /api/auth/me                    → 检查认证状态

Protected（需 JWT Cookie）
  GET  /api/admin/repos                → 获取仓库列表
  POST /api/admin/repos                → 添加仓库 { owner, repo } 或 { url }
  DELETE /api/admin/repos/:id          → 删除仓库
  POST /api/admin/scrape/trigger       → 手动触发一次抓取
  GET  /api/admin/notify/status        → 通知器配置状态
  POST /api/admin/notify/test          → 发送测试通知
```

---

### Module 5 · 前端 SPA

**路由结构：**

```
/                    → Content 面板（公开）
  /                  → 首页：今日 & 近期 Release 时间线
  /feed              → RSS 订阅引导页

/admin               → Admin 面板（需登录）
  /admin             → 仓库管理（增删列表）
  /admin/settings    → 配置查看（抓取间隔、通知状态）

/login               → 登录页（展示 SSO 入口）
```

**Content 面板核心组件：**
- `ReleaseTimeline` — 按日期分组的 Release 卡片列表（Markdown 渲染）
- `RepoFilterBar` — 按仓库名过滤
- `FeedSubscribeButton` — 复制/跳转 RSS 链接

**Admin 面板核心组件：**
- `RepoTable` — 仓库列表 + 删除操作
- `AddRepoForm` — 输入 URL 自动检测平台
- `ScrapeStatus` — 显示上次抓取时间，支持手动触发
- `NotificationSettings` — 通知器状态 + 测试按钮

**通知分发架构：**

```typescript
// 新 Release 抓取完成后
const notifiers: Notifier[] = buildNotifiers(env);
for (const release of newReleases) {
  for (const notifier of notifiers) {
    ctx.waitUntil(notifier.send(release, env));
  }
}
```

**已实现通知器：**
- `GotifyNotifier` — Gotify 推送
- `AppriseNotifier` — Apprise HTTP API
- `WebhookNotifier` — 通用 HTTP Webhook（HMAC-SHA256 签名）

---

## 📅 里程碑计划

### Phase 0 · 基础脚手架 ✅

- [x] Monorepo 目录结构（packages/shared, apps/worker, apps/web）
- [x] `wrangler.toml` 配置：D1 绑定、Cron、环境变量
- [x] Cloudflare Pages 项目初始化（Vite + React + Tailwind）
- [x] TypeScript 严格模式 + 共享类型

### Phase 1 · 认证模块 ✅

- [x] Generic OIDC Provider 支持
- [x] `GET /api/auth/login` 重定向逻辑
- [x] `GET /api/auth/callback` 完整流程
- [x] `authMiddleware` + `adminMiddleware`
- [x] `POST /api/auth/logout`
- [x] 前端登录页 + 路由守卫
- [x] JWT 过期时间可配置（`JWT_EXPIRES_IN`，默认 30 天）

### Phase 2 · 数据抓取 ✅

- [x] D1 数据表初始化
- [x] 多平台 Releases API 封装（GitHub / GitLab / Forgejo / Gitea）
- [x] Cron `scheduled` handler + 逻辑频率门控
- [x] 新 Release 检测逻辑（diff 对比）
- [x] `POST /api/admin/scrape/trigger` 手动触发
- [x] 分页支持（每页 50 条）

### Phase 3 · RSS + 公开 API ✅

- [x] `GET /feed.xml` 路由 + RSS 2.0 XML 生成
- [x] `GET /api/releases` 分页 + 日期过滤
- [x] `RSS_PUBLIC` 环境变量控制认证

### Phase 4 · Admin 面板 ✅

- [x] `/api/admin/repos` CRUD
- [x] 前端 `RepoTable` + `AddRepoForm`（URL 输入 + 平台自动检测）
- [x] 手动触发抓取 + 状态反馈
- [x] 通知器状态查看 + 测试按钮

### Phase 5 · Content 面板 ✅

- [x] `ReleaseTimeline` 按日期分组展示
- [x] Markdown 渲染（body → HTML，XSS 防护）
- [x] `RepoFilterBar` 客户端过滤
- [x] `FeedSubscribeButton` + RSS 订阅引导
- [x] 响应式布局（移动端适配）
- [x] 暗色主题（Catppuccin Mocha）
- [x] i18n 双语支持（en/zh）

### Phase 6 · 通知系统 ✅

- [x] Gotify 通知器
- [x] Apprise HTTP API 通知器
- [x] 通用 Webhook 通知器（HMAC-SHA256 签名）
- [x] 通知器统一接口（Notifier base）
- [x] 前端通知状态查看 + 测试

### Phase 7 · 打磨与上线 ✅

- [x] 环境变量全量文档化
- [x] 错误边界处理
- [x] D1 存储迁移（从 KV 迁移）
- [x] `compatibility_date = "2026-05-14"` + `compatibility_flags`
- [x] README 部署文档（英文）

---

## 🚀 后继扩展路线（Post-v1）

### v1.4 · 多平台增强
- [ ] GitLab Releases 完整支持
- [ ] Forgejo / Gitea 实例支持
- [ ] 平台自动检测优化

### v1.5 · 用户体验
- [ ] 抓取日志查看页面
- [ ] Release 搜索功能
- [ ] 键盘快捷键

### v2.0 · 架构升级
- [ ] WebSocket 实时推送
- [ ] 多用户支持（viewer 角色完善）
- [ ] 仓库分组/标签

---

## 📁 目录结构

```
srrm/
├── apps/
│   ├── worker/                    # Cloudflare Workers (Hono)
│   │   ├── src/
│   │   │   ├── index.ts           # Hono app 入口 + 路由注册
│   │   │   ├── env.ts             # 环境变量校验
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts        # authMiddleware / adminMiddleware
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts        # /api/auth/*
│   │   │   │   ├── releases.ts    # /api/releases
│   │   │   │   ├── admin.ts       # /api/admin/*
│   │   │   │   └── feed.ts        # /feed.xml
│   │   │   ├── services/
│   │   │   │   ├── db.ts          # D1 读写封装
│   │   │   │   ├── scraper.ts     # 抓取核心逻辑
│   │   │   │   ├── jwt.ts         # JWT 签名/验证
│   │   │   │   ├── oidc.ts        # OIDC Discovery
│   │   │   │   └── notifiers/     # 通知模块
│   │   │   │       ├── base.ts
│   │   │   │       ├── gotify.ts
│   │   │   │       ├── apprise.ts
│   │   │   │       └── webhook.ts
│   │   │   └── types.ts           # 共享类型定义
│   │   └── wrangler.toml
│   │
│   └── web/                       # Cloudflare Pages (React/Vite)
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── router.tsx
│       │   ├── pages/
│       │   │   ├── Home.tsx
│       │   │   ├── Login.tsx
│       │   │   └── admin/
│       │   │       ├── Repos.tsx
│       │   │       └── Settings.tsx
│       │   ├── components/
│       │   │   ├── ReleaseTimeline.tsx
│       │   │   ├── RepoFilterBar.tsx
│       │   │   └── AddRepoForm.tsx
│       │   ├── hooks/
│       │   │   ├── useAuth.ts
│       │   │   └── useReleases.ts
│       │   ├── contexts/
│       │   │   ├── I18nContext.tsx
│       │   │   └── ThemeContext.tsx
│       │   └── api/
│       │       └── client.ts
│       └── vite.config.ts
│
├── packages/
│   └── shared/                    # 共享类型（worker + web 复用）
│       └── src/
│           ├── types.ts           # Env, Repo, Release, User, ApiError
│           ├── env.ts             # Env interface（完整版）
│           └── index.ts           # 统一导出
│
├── ROADMAP.md
├── AGENTS.md
└── README.md
```

---

## ⚠️ 已知限制与注意事项

| 问题 | 说明 | 应对方案 |
|------|------|---------|
| D1 查询性能 | 复杂查询可能较慢 | 使用索引字段（published_at, repo_full_name）优化 |
| Cron 最小间隔 | Cloudflare 免费版 Cron 最小 1 分钟 | 已通过逻辑门控绕过硬编码限制 |
| GitHub API Rate Limit | 未认证 60 req/h，Token 认证 5000 req/h | 必须配置 `GITHUB_TOKEN` |
| D1 免费额度 | 免费版每天 1000 次读 + 100 次写 | 仓库数量 < 100 时绰绰有余 |
| Workers CPU 时间 | 免费版单次请求 10ms CPU 时间 | 抓取逻辑用 `ctx.waitUntil` 突破限制 |
| SPA 导航拦截 | `assets_navigation_prefers_asset_serving`（2025-04-01 默认启用）会拦截 API 路由的导航请求 | `compatibility_flags = ["assets_navigation_has_no_effect"]` |
| Cookie 安全 | `SameSite=Lax` 不适用于跨域场景 | 当前为同站部署，无需调整 |
| JWT 过期 | 默认 30 天，可通过 `JWT_EXPIRES_IN` 调整 | 设为 0 永不过期 |

---

## 🔧 运维备忘

### 本地开发

```bash
# Worker
cd apps/worker
pnpm dev          # wrangler dev（热重载）

# Web
cd apps/web
pnpm dev          # Vite dev server
```

### 部署

```bash
# Worker
cd apps/worker
pnpm deploy       # wrangler deploy

# Web（git push 自动触发 Pages CI）
git push
```

### D1 调试

```bash
wrangler d1 execute srrm-db --local --command "SELECT * FROM repos;"
wrangler d1 execute srrm-db --local --command "SELECT * FROM releases ORDER BY published_at DESC LIMIT 10;"
```

### 版本发布

```bash
git tag v1.x.x
git push --tags
```

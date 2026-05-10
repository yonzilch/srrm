# 🗺️ ROADMAP — Serverless Repository Release Monitor

> 一个运行在 Cloudflare Edge 上的 Re Release 聚合与订阅系统。
> 无传统服务器，无数据库，无邮件依赖。纯 Edge-Native 架构。

---

## 📐 项目概览

| 维度 | 内容 |
|------|------|
| **定位** | 聚合多个 Git 仓库的 Release 动态，提供统一 RSS + Web 浏览界面 |
| **运行环境** | Cloudflare Workers (API + Cron) + Cloudflare Pages (SPA) |
| **存储方案** | Cloudflare KV（无关系型数据库依赖） |
| **认证方案** | OAuth2 SSO → JWT → HttpOnly Cookie（无服务端 Session） |
| **通知方案** | RSS（v1）→ Gotify / Webhook / Apprise（后继扩展） |

---

## 🏗️ 技术选型

### 后端 · Cloudflare Workers + Hono

| 技术 | 选型 | 理由 |
|------|------|------|
| **Web 框架** | [Hono](https://hono.dev/) | 专为 Edge 设计，体积极小，TypeScript 原生支持 |
| **定时任务** | Cloudflare Cron Triggers | Workers 原生能力，无需额外基础设施 |
| **数据存储** | Cloudflare KV | KV 读多写少特性完美匹配本场景；无冷启动 |
| **认证** | OAuth2 (GitHub / Google) + JWT | 无状态；无需数据库存 Session |
| **RSS 生成** | 手写 XML 拼接 / `feed` 库 | Workers 环境下依赖越少越好 |

### 前端 · Cloudflare Pages + React

| 技术 | 选型 | 理由 |
|------|------|------|
| **构建工具** | Vite | 极速 HMR，原生 ESM |
| **UI 框架** | React 18 | 生态成熟，SPA 路由简单 |
| **路由** | React Router v6 | `/` content 面板 + `/admin` admin 面板 |
| **样式** | Tailwind CSS | 无运行时，编译裁剪，轻量 |
| **状态管理** | Zustand / React Query | 轻量，无需 Redux |

### 环境变量清单（完整）

```toml
# wrangler.toml / Cloudflare Dashboard Secrets
GITHUB_TOKEN            = "ghp_..."                 # GitHub PAT，防止 API 限流（必填）
SSO_PROVIDER            = ""                        # 支持 Generic OIDC Provider (authentik, authlia, keycloak etc.)
SSO_ISSUER_URL          = "..."                     # 
SSO_CLIENT_ID           = "..."
SSO_CLIENT_SECRET       = "..."
SSO_CALLBACK_URL        = "https://your-worker.dev/api/auth/callback"
ADMIN_EMAILS            = "a@x.com,b@x.com"         # 逗号分隔，授权管理员
JWT_SECRET              = "..."                     # 至少 32 字节随机字符串
SCRAPE_INTERVAL_MINUTES = "60"                      # 实际抓取间隔（分钟）
APP_BASE_URL            = "https://your-pages.dev"
RSS_PUBLIC              = "true"             # 默认启用
```

---

## 🧩 功能模块详解

### Module 1 · 认证（Auth）

```
用户点击登录
  → 重定向至 SSO Provider
  → 回调 /api/auth/callback
  → Hono 验证 code，换取 access_token
  → 调用 Provider API 获取用户邮箱
  → 检查邮箱是否在 ADMIN_EMAILS 中
  → 签发 JWT（payload: { email, role: 'admin'|'viewer', exp }）
  → 写入 HttpOnly + Secure + SameSite=Lax Cookie
  → 重定向回前端
```

**中间件**：`authMiddleware` 解析 Cookie → 验证 JWT → 注入 `c.set('user', payload)`

**路由保护**：所有 `/api/admin/*` 路由必须通过 `adminMiddleware`（role === 'admin'）

---

### Module 2 · 数据抓取（Scraper）

**KV 数据结构设计：**

```
KV Key                        Value
─────────────────────────────────────────────────────
config:repos                  JSON[]  仓库列表
  [{ id, owner, repo, addedAt, addedBy }]

config:scrape_last_run        number  上次抓取时间戳（ms）

data:releases                 JSON[]  所有抓取到的 Release 条目
  [{ id, repo, tagName, name, body, publishedAt, htmlUrl, isNew }]

data:releases:YYYY-MM-DD      JSON[]  按日期索引的快照（可选优化）
```

**Cron 频率控制策略：**

```toml
# wrangler.toml —— 固定高频触发
[triggers]
crons = ["*/5 * * * *"]
```

```typescript
// scheduled handler —— 逻辑频率门控
export async function scheduled(event: ScheduledEvent, env: Env) {
  const lastRun = Number(await env.KV.get('config:scrape_last_run') ?? 0);
  const interval = Number(env.SCRAPE_INTERVAL_MINUTES) * 60 * 1000;

  if (Date.now() - lastRun < interval) return; // 未到间隔，跳过

  await runScraper(env);
  await env.KV.put('config:scrape_last_run', String(Date.now()));
}
```

**抓取流程：**
1. 从 KV 读取 `config:repos`
2. 并发调用 `GET /repos/{owner}/{repo}/releases?per_page=10`（携带 `GITHUB_TOKEN`）
3. 与已存储 `data:releases` 对比，提取 `newReleases`
4. 合并写回 KV（滚动保留最近 500 条）
5. （后继）触发通知分发器

---

### Module 3 · RSS 输出（Feed）

- 路由：`GET /feed.xml`（**可选无需认证 / 需要认证** - 通过 `RSS_PUBLIC` 环境变量）
- 从 KV 读取 `data:releases`，按 `publishedAt` 降序排列
- 生成标准 Atom/RSS 2.0 XML
- 响应头：`Content-Type: application/xml; charset=utf-8`
- 支持 Query 参数过滤：`?repo=owner/repo`

---

### Module 4 · API 层（Hono Routes）

```
Public（无需认证）
  GET  /feed.xml                 → RSS 输出 （ 根据 `RSS_PUBLIC` 环境变量变动）
  GET  /api/releases             → 所有 releases（分页）
  GET  /api/releases?date=YYYY-MM-DD  → 按日期过滤
  GET  /api/auth/login           → 重定向至 SSO
  GET  /api/auth/callback        → SSO 回调处理
  POST /api/auth/logout          → 清除 Cookie

Protected（需 JWT Cookie）
  GET  /api/admin/repos          → 获取仓库列表
  POST /api/admin/repos          → 添加仓库 { owner, repo }
  DELETE /api/admin/repos/:id    → 删除仓库
  GET  /api/admin/config         → 获取当前配置（抓取间隔等）
  POST /api/admin/scrape/trigger → 手动触发一次抓取
```

---

### Module 5 · 前端 SPA

**路由结构：**

```
/                    → Content 面板（公开）
  /                  → 首页：今日 & 近期 Release 时间线
  /feed              → RSS 订阅引导页

/admin               → Admin 面板（需登录）
  /admin/repos       → 仓库管理（增删列表）
  /admin/settings    → 配置查看（抓取间隔、SSO 状态）
  /admin/logs        → 抓取日志查看（可选）

/login               → 登录页（展示 SSO 入口）
```

**Content 面板核心组件：**
- `ReleaseTimeline` — 按日期分组的 Release 卡片列表
- `RepoFilterBar` — 按仓库名过滤
- `FeedSubscribeButton` — 复制/跳转 RSS 链接

**Admin 面板核心组件：**
- `RepoTable` — 仓库列表 + 删除操作
- `AddRepoForm` — 输入 `owner/repo` 格式，提交添加
- `ScrapeStatus` — 显示上次抓取时间，支持手动触发

**通知分发架构（统一入口）：**

```typescript
// 新 Release 抓取完成后
const notifiers: Notifier[] = buildNotifiers(env); // 按环境变量按需实例化
for (const release of newReleases) {
  for (const notifier of notifiers) {
    ctx.waitUntil(notifier.send(release)); // 异步，不阻塞 Cron
  }
}
```

---

## 📅 里程碑计划

### Phase 0 · 基础脚手架

- [ ] `pnpm create hono` 初始化 Workers 项目
- [ ] 配置 `wrangler.toml`：KV 绑定、Cron、环境变量占位
- [ ] Cloudflare Pages 项目初始化（Vite + React + Tailwind）
- [ ] 建立 monorepo 目录结构（见下方）
- [ ] CI/CD：GitHub Actions → `wrangler deploy` + Pages 自动部署

### Phase 1 · 认证模块

- [ ] GitHub OAuth2 App 创建与配置
- [ ] `GET /api/auth/login` 重定向逻辑
- [ ] `GET /api/auth/callback` 完整流程（code → token → user → JWT → Cookie）
- [ ] `authMiddleware` + `adminMiddleware` 实现
- [ ] `POST /api/auth/logout` 清除 Cookie
- [ ] 前端登录页 + 路由守卫（未登录跳 `/login`）

### Phase 2 · 数据抓取

- [ ] KV 数据结构初始化工具函数
- [ ] GitHub Releases API 封装（带分页 + Rate Limit 处理）
- [ ] Cron `scheduled` handler + 逻辑频率门控
- [ ] 新 Release 检测逻辑（diff 对比）
- [ ] `POST /api/admin/scrape/trigger` 手动触发接口
- [ ] 抓取日志写入 KV

### Phase 3 · RSS + 公开 API

- [ ] `GET /feed.xml` 路由 + Atom XML 生成
- [ ] `GET /api/releases` 分页 + 日期过滤接口
- [ ] RSS 合法性验证（W3C Feed Validator）

### Phase 4 · Admin 面板

- [ ] `GET/POST/DELETE /api/admin/repos` CRUD
- [ ] 前端 `RepoTable` + `AddRepoForm` 组件
- [ ] 手动触发抓取按钮 + 状态反馈

### Phase 5 · Content 面板

- [ ] `ReleaseTimeline` 按日期分组展示
- [ ] `RepoFilterBar` 客户端过滤
- [ ] `FeedSubscribeButton` + RSS 订阅引导
- [ ] 响应式布局（移动端适配）
- [ ] 空状态 / 加载状态 / 错误状态处理

### Phase 6 · 打磨与上线

- [ ] 环境变量全量文档化
- [ ] 错误边界处理（API 失败、KV 异常）
- [ ] 生产环境 Secrets 配置
- [ ] 端到端冒烟测试
- [ ] `README.md` 部署文档

**总计预估：~5.5 天**

---

## 🚀 后继扩展路线（Post-v1）

### v1.1 · 支持 Gitea/Forgejo

### v1.1.5 · 支持 GitLab

### v1.2 · Gotify 通知

```typescript
// env: GOTIFY_URL, GOTIFY_TOKEN
class GotifyNotifier {
  async send(release: Release) {
    await fetch(`${env.GOTIFY_URL}/message`, {
      method: 'POST',
      headers: { 'X-Gotify-Key': env.GOTIFY_TOKEN },
      body: JSON.stringify({ title: release.repo, message: release.name, priority: 5 })
    });
  }
}
```

### v1.2.5 · Apprise HTTP API

```typescript
// env: APPRISE_API_URL（指向自托管 Apprise API 服务）
class AppriseNotifier {
  async send(release: Release) {
    await fetch(`${env.APPRISE_API_URL}/notify`, {
      method: 'POST',
      body: JSON.stringify({ title: release.repo, body: release.name })
    });
  }
}
```

### v1.3 · 通用 HTTP Webhook

```typescript
// env: WEBHOOK_URL, WEBHOOK_SECRET（用于签名验证）
class WebhookNotifier {
  async send(release: Release) {
    const payload = JSON.stringify(release);
    const sig = await hmacSign(env.WEBHOOK_SECRET, payload);
    await fetch(env.WEBHOOK_URL, {
      method: 'POST',
      headers: { 'X-Hub-Signature-256': sig, 'Content-Type': 'application/json' },
      body: payload
    });
  }
}

---

## 📁 推荐目录结构

```
github-release-monitor/
├── apps/
│   ├── worker/                    # Cloudflare Workers (Hono)
│   │   ├── src/
│   │   │   ├── index.ts           # Hono app 入口 + 路由注册
│   │   │   ├── scheduled.ts       # Cron handler
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts        # authMiddleware / adminMiddleware
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts        # /api/auth/*
│   │   │   │   ├── releases.ts    # /api/releases
│   │   │   │   ├── admin.ts       # /api/admin/*
│   │   │   │   └── feed.ts        # /feed.xml
│   │   │   ├── services/
│   │   │   │   ├── github.ts      # GitHub API 封装
│   │   │   │   ├── kv.ts          # KV 读写封装
│   │   │   │   ├── scraper.ts     # 抓取核心逻辑
│   │   │   │   └── notifiers/     # 通知模块（后继扩展）
│   │   │   │       ├── base.ts
│   │   │   │       ├── gotify.ts
│   │   │   │       └── webhook.ts
│   │   │   └── types.ts           # 共享类型定义
│   │   └── wrangler.toml
│   │
│   └── web/                       # Cloudflare Pages (React/Vite)
│       ├── src/
│       │   ├── main.tsx
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
│       │   └── api/               # API 客户端封装
│       │       └── client.ts
│       └── vite.config.ts
│
├── packages/
│   └── shared/                    # 共享类型（worker + web 复用）
│       └── types.ts
│
├── ROADMAP.md
├── AGENTS.md
└── README.md
```

---

## ⚠️ 已知限制与注意事项

| 问题 | 说明 | 应对方案 |
|------|------|---------|
| KV 最终一致性 | KV 写入后全球同步有延迟（通常 < 60s） | 对本场景无影响，Release 数据非实时 |
| Cron 最小间隔 | Cloudflare 免费版 Cron 最小 1 分钟 | 已通过逻辑门控绕过硬编码限制 |
| GitHub API Rate Limit | 未认证 60 req/h，Token 认证 5000 req/h | 必须配置 `GITHUB_TOKEN` |
| KV 免费额度 | 免费版每天 10 万次读 + 1000 次写 | 仓库数量 < 100 时绰绰有余 |
| Workers CPU 时间 | 免费版单次请求 10ms CPU 时间 | 抓取逻辑用 `ctx.waitUntil` 突破限制 |

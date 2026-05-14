# SRRM — 无服务器仓库发布监控

> 在一个地方追踪多个 Git 仓库的发布动态。  
> 提供统一的 RSS 订阅源和简洁的 Web UI — 完全由 Cloudflare Workers、Pages 和 D1 驱动，无需管理服务器。

[![LICENSE](https://img.shields.io/badge/License-MIT-Green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen)](https://nodejs.org)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)

[English Documentation](README.md)

---

## 目录

- [工作原理](#工作原理)
- [技术栈](#技术栈)
- [前置条件](#前置条件)
- [本地开发](#本地开发)
- [部署](#部署)
- [环境变量](#环境变量)
- [API 参考](#api-参考)
- [通知渠道](#通知渠道)
- [项目结构](#项目结构)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

---

## 工作原理

```
┌──────────────┐     ┌──────────────────────┐     ┌──────────────┐
│  Cloudflare  │     │  Cloudflare Workers  │     │  Cloudflare  │
│    Pages     │────▶│  (Hono API + 定时任务)│────▶│  D1 (SQLite) │
│  React SPA   │     │                      │     │              │
└──────────────┘     └──────────┬───────────┘     └──────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   GitHub Releases API │
                    └───────────────────────┘
```

**数据流：**

1. Cloudflare Cron Trigger 按配置的间隔触发（默认：60 分钟）。
2. Worker 从 GitHub 获取每个追踪仓库的最新发布。
3. 新发布存储到 D1 并推送到已配置的通知渠道（Gotify / Apprise / Webhook）。
4. React SPA 通过 Worker API 读取发布信息并渲染时间线。
5. 提供公开的 RSS 订阅源供外部阅读器使用。

---

## 技术栈

| 层级 | 技术 |
|---|---|
| **API / 后端** | [Hono](https://hono.dev) on Cloudflare Workers |
| **前端** | React 18 + Vite + Tailwind CSS |
| **路由** | React Router v6 |
| **数据请求** | TanStack React Query |
| **状态管理** | Zustand |
| **认证** | OAuth2 / OIDC SSO + JWT（HttpOnly Cookie） |
| **定时任务** | Cloudflare Cron Triggers |
| **存储** | Cloudflare D1（SQLite） |
| **通知** | RSS 2.0 · Gotify · Apprise · Webhook |

---

## 前置条件

- **Node.js** ≥ 18 且 **pnpm** ≥ 8
- 一个启用了 Workers、D1 和 Pages 的 **Cloudflare 账户**
- 已安装并认证 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)（`wrangler login`）
- 一个 **兼容 OIDC 的 SSO 提供商**

---

## 本地开发

```bash
# 1. 安装依赖
pnpm install

# 2. 复制示例环境变量文件并填入你的值
cp apps/worker/.dev.vars.example apps/worker/.dev.vars

# 3. 启动 Worker（Wrangler 开发服务器）
pnpm --filter @srrm/worker dev

# 4. 在另一个终端中，启动前端
pnpm --filter @srrm/web dev
```

Worker 运行在 `http://localhost:8787`，Web UI 运行在 `http://localhost:5173`。

**跨所有包进行类型检查：**

```bash
pnpm -r exec tsc --noEmit
```

---

## 部署

### 1. 创建 D1 数据库

```bash
wrangler d1 create srrm-db
# 从输出中复制 database_id 并添加到 apps/worker/wrangler.toml
```

运行迁移：

```bash
wrangler d1 execute srrm-db --file=apps/worker/src/db/schema.sql
```

### 2. 设置密钥

通过 Wrangler 设置每个必需的密钥，确保它们不以明文存储：

```bash
wrangler secret put GITHUB_TOKEN
wrangler secret put JWT_SECRET          # 生成方式：openssl rand -hex 32
wrangler secret put SSO_CLIENT_SECRET
```

### 3. 部署

srrm 采用**单 Worker + Static Assets**架构。Cloudflare Workers 原生支持托管静态资源（GA），无需 Cloudflare Pages。

一次部署，同一域名完成所有事情：

```
srrm.example.com
    ├── /api/*     → Hono 处理（Worker 逻辑）
    ├── /feed.xml  → Hono 处理（Worker 逻辑）
    └── /*         → 自动 serve React SPA 静态文件
```

只需一条命令：

```bash
pnpm run deploy
```

该命令会自动：先构建 React SPA → 再部署 Worker（连带静态资源一起上传），Cron 也在同一个 Worker 里一并生效。

如需预览环境部署：

```bash
pnpm run deploy:preview

---

## 环境变量

在生产环境中通过 `wrangler secret put` 注入变量，在本地开发时通过 `.dev.vars` 文件配置。

### 必需变量

| 变量 | 说明 |
|---|---|
| `JWT_SECRET` | 用于签发会话 JWT 的随机字符串（≥ 32 字节） |
| `SSO_ISSUER_URL` | OIDC 提供商的签发 URL（如 `https://sso.example.com`） |
| `SSO_CLIENT_ID` | OIDC 客户端 ID |
| `SSO_CLIENT_SECRET` | OIDC 客户端密钥 |
| `SSO_CALLBACK_URL` | OAuth 回调 URL（如 `https://srrm.example.com/api/auth/callback`） |
| `ADMIN_EMAILS` | 授予管理员权限的邮箱列表，以逗号分隔 |
| `APP_BASE_URL` | 前端的公开 URL（如 `https://srrm.example.com`） |

### 可选变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `GITHUB_TOKEN` | GitHub PAT — 防止速率限制并启用私有仓库访问 |
| `SCRAPE_INTERVAL_MINUTES` | `60` | 轮询新版本发布的时间间隔（分钟） |
| `RSS_PUBLIC` | `true` | `/feed.xml` 端点是否需要认证 |
| `GOTIFY_URL` | — | Gotify 服务器基础 URL |
| `GOTIFY_TOKEN` | — | Gotify 应用令牌 |
| `GOTIFY_PRIORITY` | `5` | Gotify 消息优先级（1–10） |
| `APPRISE_API_URL` | — | Apprise HTTP API 基础 URL |
| `APPRISE_URLS` | — | 以逗号分隔的 Apprise 通知目标 |
| `APPRISE_TAG` | — | 用于筛选通知目标的 Apprise 标签 |
| `WEBHOOK_URL` | — | Webhook 目标 URL |
| `WEBHOOK_SECRET` | — | Webhook 负载的 HMAC-SHA256 签名密钥 |
| `WEBHOOK_METHOD` | `POST` | Webhook 投递使用的 HTTP 方法 |

---

## API 参考

### 公开端点

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/releases` | 分页发布列表，支持日期筛选 |
| `GET` | `/feed.xml` | RSS 2.0 订阅源 |
| `GET` | `/api/auth/login` | 重定向到 SSO 提供商 |
| `GET` | `/api/auth/callback` | SSO 回调处理 |
| `POST` | `/api/auth/logout` | 注销会话 |
| `GET` | `/api/auth/me` | 返回当前用户信息 |

### 管理端点（需要认证）

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/admin/repos` | 列出追踪的仓库 |
| `POST` | `/api/admin/repos` | 添加要追踪的仓库 |
| `DELETE` | `/api/admin/repos/:id` | 移除追踪的仓库 |
| `GET` | `/api/admin/config` | 查看当前配置 |
| `POST` | `/api/admin/scrape/trigger` | 立即触发一次抓取 |
| `GET` | `/api/admin/notify/status` | 显示通知器配置状态 |
| `POST` | `/api/admin/notify/test` | 发送测试通知 |

### 页面路由

| 路径 | 说明 |
|---|---|
| `/` | 发布时间线（首页） |
| `/feed` | RSS 订阅指南 |
| `/login` | 登录页面 |
| `/admin` | 仓库管理 |
| `/admin/settings` | 配置和通知设置 |

---

## 通知渠道

SRRM 根据环境变量的存在自动检测哪些通知器处于激活状态。每个渠道独立运行 — 一个渠道的失败不会影响其他渠道。

| 渠道 | 必需变量 | 备注 |
|---|---|---|
| **Gotify** | `GOTIFY_URL`, `GOTIFY_TOKEN` | 自托管推送通知 |
| **Apprise** | `APPRISE_API_URL` | 通过 [Apprise](https://github.com/caronc/apprise) 支持 50+ 种服务 |
| **Webhook** | `WEBHOOK_URL` | 通用 HTTP POST；可选使用 HMAC-SHA256 签名 |

### 添加自定义通知器

1. 在 `apps/worker/src/services/notifiers/<name>.ts` 中创建实现 `Notifier` 接口的文件：

   ```typescript
   interface Notifier {
     readonly name: string;
     isConfigured(env: Env): boolean;
     send(release: Release, env: Env): Promise<void>;
   }
   ```

2. 在 `apps/worker/src/services/notifiers/index.ts` 中注册新的通知器。

---

## 项目结构

```
srrm/
├── apps/
│   ├── worker/          # Cloudflare Worker — Hono API、定时任务、通知器
│   │   ├── src/
│   │   │   ├── index.ts         # 入口文件 & 路由注册
│   │   │   ├── scheduled.ts     # Cron 处理器（抓取 + 通知）
│   │   │   ├── middleware/      # 认证中间件
│   │   │   ├── routes/          # auth · releases · admin · feed
│   │   │   └── services/
│   │   │       ├── db.ts        # D1 查询层
│   │   │       ├── github.ts    # GitHub API 客户端
│   │   │       ├── scraper.ts   # 抓取编排
│   │   │       └── notifiers/   # gotify · apprise · webhook
│   │   └── wrangler.toml
│   │
│   └── web/             # Cloudflare Pages — React SPA
│       └── src/
│           ├── pages/           # Home · Login · Feed · Admin
│           ├── components/      # 时间线、筛选器、表单
│           ├── hooks/           # useAuth, useReleases
│           └── api/             # 类型化 API 客户端
│
└── packages/
    └── shared/          # Worker 和 Web 共享的类型与工具
        └── src/
            ├── types.ts
            ├── env.ts
            └── markdown.ts
```

---

## 许可证

本项目采用 **MIT 许可证** - 详情请参阅 [LICENSE](LICENSE) 文件。

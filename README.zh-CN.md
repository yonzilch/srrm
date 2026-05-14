# SRRM — Serverless Repository Release Monitor

> 聚合多个 Git 仓库的 Release 动态，提供统一 RSS + Web 浏览界面。
> 运行在 Cloudflare Workers (Edge) + Cloudflare Pages (SPA) 上，无需传统服务器。

## 架构概览

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Cloudflare  │     │  Cloudflare  │     │  Cloudflare  │
│   Pages      │────▶│   Workers    │────▶│     KV      │
│  (SPA)       │     │  (API+Cron)  │     │  (Storage)  │
└─────────────┘     └──────────────┘     └─────────────┘
                            │
                            ▼
                    GitHub Releases API
```

## 技术栈

| 模块 | 技术 |
|------|------|
| **Worker API** | Hono + Cloudflare Workers |
| **前端 SPA** | React 18 + Vite + Tailwind CSS |
| **路由** | React Router v6 |
| **状态管理** | TanStack React Query |
| **认证** | OAuth2 (SSO) + JWT (HttpOnly Cookie) |
| **数据抓取** | Cloudflare Cron Triggers |
| **通知** | RSS 2.0 / Atom Feed |

## 快速开始

### 前置条件

- Node.js 18+
- pnpm 8+
- Cloudflare 账号（Workers + KV + Pages）

### 安装

```bash
# 安装依赖
pnpm install

# 复制环境变量模板
cp .env.example .env

# 编辑 .env 填入必要配置
```

### 本地开发

```bash
# 启动 Worker (wrangler dev)
pnpm --filter @srrm/worker dev

# 启动 Web 开发服务器 (Vite)
pnpm --filter @srrm/web dev
```

### 类型检查

```bash
# 检查所有包
pnpm -r exec tsc --noEmit

# 或单独检查
pnpm --filter @srrm/shared build
pnpm --filter @srrm/web exec tsc --noEmit
pnpm --filter @srrm/worker exec tsc --noEmit
```

## 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| `GITHUB_TOKEN` | GitHub PAT，防止 API 限流 | 是 |
| `JWT_SECRET` | JWT 签名密钥（至少 32 字节随机串） | 是 |
| `KV` | Cloudflare KV 命名空间 ID | 是 |
| `SSO_ISSUER_URL` | OIDC Provider 发行地址 | 是 |
| `SSO_CLIENT_ID` | OIDC Client ID | 是 |
| `SSO_CLIENT_SECRET` | OIDC Client Secret | 是 |
| `SSO_CALLBACK_URL` | 回调地址 `https://xxx/workers.dev/api/auth/callback` | 是 |
| `ADMIN_EMAILS` | 管理员邮箱（逗号分隔） | 是 |
| `APP_BASE_URL` | 前端根地址（如 `https://xxx.pages.dev`） | 是 |
| `SCRAPE_INTERVAL_MINUTES` | 抓取间隔（默认 60） | 否 |
| `RSS_PUBLIC` | RSS 是否公开（默认 true） | 否 |

## 路由

### Worker API

```
GET  /api/releases              → 所有 releases（分页/日期过滤）
GET  /feed.xml                  → RSS/Atom Feed
GET  /api/auth/login            → 重定向到 SSO
GET  /api/auth/callback         → SSO 回调
POST /api/auth/logout           → 登出
GET  /api/auth/me               → 检查认证状态
GET  /api/admin/repos           → 获取仓库列表（需认证）
POST /api/admin/repos           → 添加仓库（需认证）
DELETE /api/admin/repos/:id     → 删除仓库（需认证）
GET  /api/admin/config          → 获取配置（需认证）
POST /api/admin/scrape/trigger  → 手动触发抓取（需认证）
```

### Web SPA

```
/          → 首页（Release 时间线）
/feed      → RSS 订阅引导页
/login     → 登录页
/admin     → 仓库管理
/admin/settings → 配置查看
```

## 许可证

ISC
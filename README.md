# SRRM — Serverless Repository Release Monitor

> Aggregate release feeds from multiple Git repositories into a unified RSS + web interface.
> Runs on Cloudflare Workers (Edge) + Cloudflare Pages (SPA) — no traditional server required.

[中文文档](README.zh-CN.md)

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Cloudflare  │     │  Cloudflare  │     │  Cloudflare  │
│   Pages      │────▶│   Workers    │────▶│   D1 / KV   │
│  (SPA)       │     │  (API+Cron)  │     │  (Storage)  │
└─────────────┘     └──────────────┘     └─────────────┘
                            │
                            ▼
                    GitHub Releases API
```

## Tech Stack

| Module | Technology |
|--------|-----------|
| **Worker API** | Hono + Cloudflare Workers |
| **Frontend SPA** | React 18 + Vite + Tailwind CSS |
| **Routing** | React Router v6 |
| **State Management** | TanStack React Query + Zustand |
| **Auth** | OAuth2 (SSO) + JWT (HttpOnly Cookie) |
| **Data Fetching** | Cloudflare Cron Triggers |
| **Notifications** | RSS 2.0 / Gotify / Apprise / Webhook |
| **Storage** | Cloudflare D1 (SQLite) |

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Cloudflare account (Workers + D1 + Pages)

### Installation

```bash
pnpm install
```

### Local Development

```bash
# Start Worker (wrangler dev)
pnpm --filter @srrm/worker dev

# Start Web dev server (Vite)
pnpm --filter @srrm/web dev
```

### Type Checking

```bash
# Check all packages
pnpm -r exec tsc --noEmit
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GITHUB_TOKEN` | GitHub PAT to avoid rate limiting | Yes |
| `JWT_SECRET` | JWT signing key (min 32 bytes random) | Yes |
| `SSO_ISSUER_URL` | OIDC Provider issuer URL | Yes |
| `SSO_CLIENT_ID` | OIDC Client ID | Yes |
| `SSO_CLIENT_SECRET` | OIDC Client Secret | Yes |
| `SSO_CALLBACK_URL` | Callback URL | Yes |
| `ADMIN_EMAILS` | Admin emails (comma-separated) | Yes |
| `APP_BASE_URL` | Frontend base URL | Yes |
| `SCRAPE_INTERVAL_MINUTES` | Scrape interval in minutes (default 60) | No |
| `RSS_PUBLIC` | Whether RSS is public (default true) | No |
| `GOTIFY_URL` | Gotify server URL | No |
| `GOTIFY_TOKEN` | Gotify app token | No |
| `GOTIFY_PRIORITY` | Message priority (default 5) | No |
| `APPRISE_API_URL` | Apprise HTTP API URL | No |
| `APPRISE_URLS` | Apprise notification targets (comma-separated) | No |
| `APPRISE_TAG` | Apprise notification tag | No |
| `WEBHOOK_URL` | Webhook target URL | No |
| `WEBHOOK_SECRET` | HMAC-SHA256 signing secret | No |
| `WEBHOOK_METHOD` | HTTP method (default POST) | No |

## API Routes

### Worker API

```
GET  /api/releases              → All releases (paginated / date-filtered)
GET  /feed.xml                  → RSS/Atom Feed
GET  /api/auth/login            → Redirect to SSO
GET  /api/auth/callback         → SSO callback
POST /api/auth/logout           → Logout
GET  /api/auth/me               → Check auth status
GET  /api/admin/repos           → List tracked repos (auth required)
POST /api/admin/repos           → Add a repo (auth required)
DELETE /api/admin/repos/:id     → Remove a repo (auth required)
GET  /api/admin/config          → Get config (auth required)
POST /api/admin/scrape/trigger  → Trigger scrape manually (auth required)
GET  /api/admin/notify/status   → List notifier configuration status (auth required)
POST /api/admin/notify/test     → Send test notification (auth required)
```

### Web SPA

```
/                  → Home (Release timeline)
/feed              → RSS subscription guide
/login             → Login page
/admin             → Repo management
/admin/settings    → Config & notification settings
```

## Notification System

SRRM supports multiple notification channels. Each notifier is auto-detected based on environment variables:

| Notifier | Env Vars | Description |
|----------|----------|-------------|
| **Gotify** | `GOTIFY_URL`, `GOTIFY_TOKEN` | Push notifications via Gotify server |
| **Apprise** | `APPRISE_API_URL` | Multi-channel via Apprise HTTP API |
| **Webhook** | `WEBHOOK_URL` | Generic HTTP webhook with optional HMAC-SHA256 signing |

Notifiers are triggered automatically when new releases are detected during a scrape cycle. Each notifier runs independently — one failure does not block others.

### Notifier Interface

All notifiers implement the following contract:

```typescript
interface Notifier {
  readonly name: string;
  isConfigured(env: Env): boolean;
  send(release: Release, env: Env): Promise<void>;
}
```

### Adding a Custom Notifier

1. Create a new file in `apps/worker/src/services/notifiers/`
2. Implement the `Notifier` interface
3. Register it in `apps/worker/src/services/notifiers/index.ts`

## Project Structure

```
srrm/
├── apps/
│   ├── worker/                    # Cloudflare Workers (Hono)
│   │   ├── src/
│   │   │   ├── index.ts           # App entry + route registration
│   │   │   ├── scheduled.ts       # Cron handler
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts        # Auth middleware
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts        # /api/auth/*
│   │   │   │   ├── releases.ts    # /api/releases
│   │   │   │   ├── admin.ts       # /api/admin/*
│   │   │   │   └── feed.ts        # /feed.xml
│   │   │   └── services/
│   │   │       ├── db.ts          # D1 database operations
│   │   │       ├── github.ts      # GitHub API client
│   │   │       ├── scraper.ts     # Scrape logic
│   │   │       ├── platform.ts    # Multi-platform support
│   │   │       └── notifiers/     # Notification dispatchers
│   │   │           ├── base.ts
│   │   │           ├── gotify.ts
│   │   │           ├── apprise.ts
│   │   │           ├── webhook.ts
│   │   │           └── index.ts
│   │   └── wrangler.toml
│   │
│   └── web/                       # Cloudflare Pages (React/Vite)
│       ├── src/
│       │   ├── main.tsx
│       │   ├── router.tsx
│       │   ├── pages/
│       │   │   ├── Home.tsx
│       │   │   ├── Login.tsx
│       │   │   ├── Feed.tsx
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
│       │   └── api/
│       │       └── client.ts
│       └── vite.config.ts
│
├── packages/
│   └── shared/                    # Shared types (worker + web)
│       └── src/
│           ├── types.ts
│           ├── env.ts
│           └── markdown.ts
│
├── ROADMAP.md
├── AGENTS.md
├── README.md
└── README.zh-CN.md
```

## License

ISC

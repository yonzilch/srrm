# SRRM — Serverless Repository Release Monitor

> Track releases across multiple Git repositories in one place.  
> Delivers a unified RSS feed and a clean web UI — powered entirely by Cloudflare Workers, Pages, and D1. No server to manage.

[![LICENSE](https://img.shields.io/badge/License-MIT-Green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen)](https://nodejs.org)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)

[中文 README](README.zh-CN.md)

---

## How It Works

```
┌──────────────┐     ┌──────────────────────┐     ┌──────────────┐
│  Cloudflare  │     │   Cloudflare Workers │     │  Cloudflare  │
│    Pages     │────▶│   (Hono API + Cron)  │────▶│  D1 (SQLite) │
│  React SPA   │     │                      │     │              │
└──────────────┘     └──────────┬───────────┘     └──────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   GitHub Releases API │
                    └───────────────────────┘
```

**Data flow:**

1. A Cloudflare Cron Trigger fires at a configured interval (default: 60 min).
2. The Worker fetches new releases from GitHub for every tracked repository.
3. New releases are stored in D1 and dispatched to configured notification channels (Gotify / Apprise / Webhook).
4. The React SPA reads releases via the Worker API and renders a timeline.
5. A public RSS feed is available for external readers.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **API / Backend** | [Hono](https://hono.dev) on Cloudflare Workers |
| **Frontend** | React 18 + Vite + Tailwind CSS |
| **Routing** | React Router v6 |
| **Data Fetching** | TanStack React Query |
| **State** | Zustand |
| **Auth** | OAuth2 / OIDC SSO + JWT (HttpOnly Cookie) |
| **Scheduling** | Cloudflare Cron Triggers |
| **Storage** | Cloudflare D1 (SQLite) |
| **Notifications** | RSS 2.0 · Gotify · Apprise · Webhook |

---

## Prerequisites

- **Node.js** ≥ 18 and **pnpm** ≥ 8
- A **Cloudflare account** with Workers, D1, and Pages enabled
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed and authenticated (`wrangler login`)
- A **GitHub Personal Access Token** (PAT) with `public_repo` scope (or `repo` for private repos)
- An **OIDC-compatible SSO provider**

---

## Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Copy the example env file and fill in your values
cp apps/worker/.dev.vars.example apps/worker/.dev.vars

# 3. Start the Worker (Wrangler dev server)
pnpm --filter @srrm/worker dev

# 4. In a separate terminal, start the frontend
pnpm --filter @srrm/web dev
```

The Worker runs at `http://localhost:8787` and the web UI at `http://localhost:5173`.

**Type checking across all packages:**

```bash
pnpm -r exec tsc --noEmit
```

---

## Deployment

### 1. Create the D1 database

```bash
wrangler d1 create srrm-db
# Copy the database_id from the output and add it to apps/worker/wrangler.toml
```

Run migrations:

```bash
wrangler d1 execute srrm-db --file=apps/worker/src/db/schema.sql
```

### 2. Set secrets

Set each required secret via Wrangler so they are never stored in plain text:

```bash
wrangler secret put GITHUB_TOKEN
wrangler secret put JWT_SECRET          # generate with: openssl rand -hex 32
wrangler secret put SSO_CLIENT_SECRET
```

### 3. Deploy the Worker

```bash
pnpm --filter @srrm/worker deploy
```

### 4. Deploy the frontend to Cloudflare Pages

```bash
pnpm --filter @srrm/web build
wrangler pages deploy apps/web/dist --project-name srrm-web
```

Or connect the repository to Cloudflare Pages in the dashboard and set the build command to `pnpm --filter @srrm/web build` with output directory `apps/web/dist`.

---

## Environment Variables

Variables are injected via `wrangler secret put` in production, or a `.dev.vars` file during local development.

### Required

| Variable | Description |
|---|---|
| `JWT_SECRET` | Random string ≥ 32 bytes used to sign session JWTs |
| `SSO_ISSUER_URL` | OIDC Provider issuer URL (e.g. `https://sso.example.com`) |
| `SSO_CLIENT_ID` | OIDC Client ID |
| `SSO_CLIENT_SECRET` | OIDC Client Secret |
| `SSO_CALLBACK_URL` | OAuth callback URL (e.g. `https://srrm.example.com/api/auth/callback`) |
| `ADMIN_EMAILS` | Comma-separated list of emails granted admin access |
| `APP_BASE_URL` | Public URL of the frontend (e.g. `https://srrm.example.com`) |

### Optional

| Variable | Default | Description |
|---|---|---|
| `GITHUB_TOKEN` | GitHub PAT — prevents rate limiting and enables private repo access |
| `SCRAPE_INTERVAL_MINUTES` | `60` | How often to poll for new releases |
| `RSS_PUBLIC` | `true` | Whether the `/feed.xml` endpoint requires authentication |
| `GOTIFY_URL` | — | Gotify server base URL |
| `GOTIFY_TOKEN` | — | Gotify application token |
| `GOTIFY_PRIORITY` | `5` | Gotify message priority (1–10) |
| `APPRISE_API_URL` | — | Apprise HTTP API base URL |
| `APPRISE_URLS` | — | Comma-separated Apprise notification targets |
| `APPRISE_TAG` | — | Apprise tag to filter notification targets |
| `WEBHOOK_URL` | — | Webhook target URL |
| `WEBHOOK_SECRET` | — | HMAC-SHA256 signing secret for webhook payloads |
| `WEBHOOK_METHOD` | `POST` | HTTP method used for webhook delivery |

---

## API Reference

### Public endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/releases` | Paginated release list, supports date filtering |
| `GET` | `/feed.xml` | RSS 2.0 feed |
| `GET` | `/api/auth/login` | Redirect to SSO provider |
| `GET` | `/api/auth/callback` | SSO callback handler |
| `POST` | `/api/auth/logout` | Invalidate session |
| `GET` | `/api/auth/me` | Returns current user info |

### Admin endpoints (authentication required)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/repos` | List tracked repositories |
| `POST` | `/api/admin/repos` | Add a repository to track |
| `DELETE` | `/api/admin/repos/:id` | Remove a tracked repository |
| `GET` | `/api/admin/config` | View current configuration |
| `POST` | `/api/admin/scrape/trigger` | Trigger a scrape cycle immediately |
| `GET` | `/api/admin/notify/status` | Show notifier configuration status |
| `POST` | `/api/admin/notify/test` | Send a test notification |

### Web routes

| Path | Description |
|---|---|
| `/` | Release timeline (home) |
| `/feed` | RSS subscription guide |
| `/login` | Login page |
| `/admin` | Repository management |
| `/admin/settings` | Config and notification settings |

---

## Notification Channels

SRRM auto-detects which notifiers are active based on the presence of their environment variables. Each channel operates independently — a failure in one does not affect others.

| Channel | Required variables | Notes |
|---|---|---|
| **Gotify** | `GOTIFY_URL`, `GOTIFY_TOKEN` | Self-hosted push notifications |
| **Apprise** | `APPRISE_API_URL` | 50+ services via [Apprise](https://github.com/caronc/apprise) |
| **Webhook** | `WEBHOOK_URL` | Generic HTTP POST; optionally signed with HMAC-SHA256 |

### Adding a custom notifier

1. Create `apps/worker/src/services/notifiers/<name>.ts` implementing the `Notifier` interface:

   ```typescript
   interface Notifier {
     readonly name: string;
     isConfigured(env: Env): boolean;
     send(release: Release, env: Env): Promise<void>;
   }
   ```

2. Register the new notifier in `apps/worker/src/services/notifiers/index.ts`.

---

## Project Structure

```
srrm/
├── apps/
│   ├── worker/          # Cloudflare Worker — Hono API, cron, notifiers
│   │   ├── src/
│   │   │   ├── index.ts         # Entry point & route registration
│   │   │   ├── scheduled.ts     # Cron handler (scrape + notify)
│   │   │   ├── middleware/      # Auth middleware
│   │   │   ├── routes/          # auth · releases · admin · feed
│   │   │   └── services/
│   │   │       ├── db.ts        # D1 query layer
│   │   │       ├── github.ts    # GitHub API client
│   │   │       ├── scraper.ts   # Scrape orchestration
│   │   │       └── notifiers/   # gotify · apprise · webhook
│   │   └── wrangler.toml
│   │
│   └── web/             # Cloudflare Pages — React SPA
│       └── src/
│           ├── pages/           # Home · Login · Feed · Admin
│           ├── components/      # Timeline, filters, forms
│           ├── hooks/           # useAuth, useReleases
│           └── api/             # Typed API client
│
└── packages/
    └── shared/          # Types and utilities shared between worker and web
        └── src/
            ├── types.ts
            ├── env.ts
            └── markdown.ts
```

---

## License

This project is licensed under the **MIT license**.
See [LICENSE](LICENSE) for more information.

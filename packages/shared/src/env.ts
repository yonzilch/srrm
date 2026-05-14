export interface Env {
  // Cloudflare D1 Database
  DB?: any;

  // Auth - JWT Secret
  JWT_SECRET: string;

  // Platform Tokens（均为可选，公开仓库不需要）
  GITHUB_TOKEN?: string;
  GITLAB_TOKEN?: string;
  FORGEJO_TOKEN?: string;
  GITEA_TOKEN?: string;

  // SSO / OIDC Configuration
  SSO_ISSUER_URL?: string;
  SSO_CLIENT_ID?: string;
  SSO_CLIENT_SECRET?: string;
  SSO_CALLBACK_URL?: string;

  // Admin - comma-separated admin emails
  ADMIN_EMAILS?: string;

  // App Configuration
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

  // Workers Assets (static files served by Cloudflare)
  ASSETS?: any;

  // Favicon URL (可选，自定义站点图标)
  FAVICON_URL?: string;
}
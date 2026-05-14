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

  // Workers Assets (static files served by Cloudflare)
  ASSETS?: any;
}
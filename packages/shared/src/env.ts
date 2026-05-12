export interface Env {
  // Cloudflare Workers Runtime Bindings
  KV?: any;

  // Auth - JWT Secret
  JWT_SECRET: string;

  // Platform Tokens（均为可选，公开仓库不需要）
  GITHUB_TOKEN?: string;   // GitHub 仓库（建议填写防限流）
  GITLAB_TOKEN?: string;   // GitLab 实例 token
  FORGEJO_TOKEN?: string;  // Forgejo/Codeberg token
  GITEA_TOKEN?: string;    // 通用 Gitea token

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

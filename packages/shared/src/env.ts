export interface Env {
  // Cloudflare Workers Runtime Bindings
  KV?: any;

  // Auth - JWT Secret
  JWT_SECRET: string;

  // GitHub
  GITHUB_TOKEN?: string;

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
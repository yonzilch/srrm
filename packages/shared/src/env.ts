// Worker 环境变量绑定
import type { KVNamespace } from '@cloudflare/workers-types';

export interface Env {
  KV: KVNamespace;
  GITHUB_TOKEN: string;
  SSO_PROVIDER: string;
  SSO_ISSUER_URL: string;
  SSO_CLIENT_ID: string;
  SSO_CLIENT_SECRET: string;
  SSO_CALLBACK_URL: string;
  ADMIN_EMAILS: string;
  JWT_SECRET: string;
  SCRAPE_INTERVAL_MINUTES: string;
  APP_BASE_URL: string;
  RSS_PUBLIC: string;
}
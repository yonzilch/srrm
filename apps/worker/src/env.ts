// 启动环境配置检查 — 非 secret 变量（如 SCRAPE_INTERVAL_MINUTES、APP_BASE_URL 等）
// 仅在启动时校验可安全暴露的变量，secret 类变量在用到时再检查
import type { Env } from '@srrm/shared';

export function validateEnv(env: Env): string[] {
  const missing: string[] = [];
  if (!env.GITHUB_TOKEN) missing.push('GITHUB_TOKEN');
  if (!env.JWT_SECRET) missing.push('JWT_SECRET');
  if (!env.KV) missing.push('KV');
  return missing;
}
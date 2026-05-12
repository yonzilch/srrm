// 启动环境配置检查
// GITHUB_TOKEN 已改为可选（公开仓库不需要）
import type { Env } from '@srrm/shared';

export function validateEnv(env: Env): string[] {
  const missing: string[] = [];
  if (!env.JWT_SECRET) missing.push('JWT_SECRET');
  if (!env.KV) missing.push('KV');
  return missing;
}

// services/oidc.ts — OIDC Discovery 服务
// 通过 /.well-known/openid-configuration 自动发现 OIDC Provider 端点
// 结果在模块级变量中缓存，每个 Worker 实例只请求一次

interface OIDCConfig {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
}

let cachedConfig: OIDCConfig | null = null;

export async function getOIDCConfig(issuerUrl: string): Promise<OIDCConfig> {
  if (cachedConfig) return cachedConfig;

  const discoveryUrl = `${issuerUrl}/.well-known/openid-configuration`;
  const res = await fetch(discoveryUrl);

  if (!res.ok) {
    throw new Error(`OIDC discovery failed: ${res.status} ${res.statusText} (${discoveryUrl})`);
  }

  const data = (await res.json()) as {
    authorization_endpoint: string;
    token_endpoint: string;
    userinfo_endpoint: string;
  };

  if (!data.authorization_endpoint || !data.token_endpoint || !data.userinfo_endpoint) {
    throw new Error(`OIDC discovery incomplete at ${discoveryUrl}`);
  }

  cachedConfig = {
    authorization_endpoint: data.authorization_endpoint,
    token_endpoint: data.token_endpoint,
    userinfo_endpoint: data.userinfo_endpoint,
  };

  return cachedConfig;
}
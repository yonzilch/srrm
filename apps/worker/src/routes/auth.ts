import { Hono } from 'hono';
import { createToken, verifyToken } from '../services/jwt';
import type { Env } from '@srrm/shared';

function getTokenFromCookie(c: any): string | null {
  const cookieHeader = c.req.header('Cookie');
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(';')
    .map((pair: string) => pair.trim())
    .find((pair: string) => pair.startsWith('srrm_token='));
  return match ? match.split('=')[1] : null;
}

export const authRoutes = new Hono<{ Bindings: Env }>();

// 登录 - 重定向到 SSO 提供商
authRoutes.get('/login', (c) => {
  const { SSO_ISSUER_URL, SSO_CLIENT_ID, SSO_CALLBACK_URL } = c.env;

  if (!SSO_ISSUER_URL || !SSO_CLIENT_ID || !SSO_CALLBACK_URL) {
    return c.json({ error: 'SSO not configured' }, 500);
  }

  const scope = 'openid email profile';
  const state = Math.random().toString(36).substring(2, 15);
  const urlParams = new URLSearchParams({
    response_type: 'code',
    client_id: SSO_CLIENT_ID,
    redirect_uri: SSO_CALLBACK_URL,
    scope,
    state,
  });
  const redirectUri = `${SSO_ISSUER_URL}/protocol/openid-connect/auth?${urlParams.toString()}`;

  c.header('Set-Cookie', `oauth_state=${state}; HttpOnly; Path=/; MaxAge=600`);
  return c.redirect(redirectUri);
});

// SSO 回调处理
authRoutes.get('/callback', async (c) => {
  const { SSO_ISSUER_URL, SSO_CLIENT_ID, SSO_CLIENT_SECRET, SSO_CALLBACK_URL, ADMIN_EMAILS, JWT_SECRET } = c.env;
  const { code, state } = c.req.query();

  const cookies = c.req.header('Cookie') || '';
  const stateMatch = cookies.match(/oauth_state=([^;]+)/);
  if (!state || !stateMatch || stateMatch[1] !== state) {
    return c.json({ error: 'Invalid state' }, 400);
  }

  if (!code) {
    return c.json({ error: 'Missing code' }, 400);
  }

  if (!SSO_ISSUER_URL || !SSO_CLIENT_ID || !SSO_CLIENT_SECRET || !SSO_CALLBACK_URL || !ADMIN_EMAILS || !JWT_SECRET) {
    return c.json({ error: 'SSO not configured properly' }, 500);
  }

  try {
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: SSO_CLIENT_ID,
      client_secret: SSO_CLIENT_SECRET,
      code,
      redirect_uri: SSO_CALLBACK_URL,
    });

    const tokenResponse = await fetch(`${SSO_ISSUER_URL}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams,
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to fetch token: ${tokenResponse.status}`);
    }

    const tokenData = (await tokenResponse.json()) as { access_token: string };
    const accessToken = tokenData.access_token;

    const userResponse = await fetch(`${SSO_ISSUER_URL}/protocol/openid-connect/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userResponse.ok) {
      throw new Error(`Failed to fetch user info: ${userResponse.status}`);
    }

    const userInfo = (await userResponse.json()) as { email: string };
    const email = userInfo.email;

    const adminEmails = ADMIN_EMAILS.split(',').map((e: string) => e.trim());
    const role: 'admin' | 'viewer' = adminEmails.includes(email) ? 'admin' : 'viewer';

    const user = { email, role, exp: 0 };
    const jwt = await createToken(user, JWT_SECRET);

    c.header('Set-Cookie', `srrm_token=${jwt}; HttpOnly; Path=/; SameSite=Lax; MaxAge=${60 * 60 * 24}`);

    const redirectTo = c.req.query('redirect_to') || '/';
    return c.redirect(redirectTo);
  } catch (err: unknown) {
    console.error('[Auth Callback Error]', err instanceof Error ? err.message : err);
    return c.json({ error: 'Authentication failed' }, 500);
  }
});

// 登出
authRoutes.post('/logout', (c) => {
  c.header('Set-Cookie', 'srrm_token=; HttpOnly; Path=/; MaxAge=0');
  return c.json({ success: true });
});

// 检查认证状态
authRoutes.get('/me', async (c) => {
  const token = getTokenFromCookie(c);
  if (!token) {
    return c.json({ authenticated: false });
  }

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    if (!payload) {
      return c.json({ authenticated: false });
    }
    return c.json({ authenticated: true, user: payload });
  } catch {
    return c.json({ authenticated: false });
  }
});
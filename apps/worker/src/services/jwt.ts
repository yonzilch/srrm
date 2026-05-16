import { sign, verify } from 'hono/jwt';
import type { User } from '@srrm/shared';

export function getJwtExpiresIn(env: { JWT_EXPIRES_IN?: string }): number {
  const raw = env.JWT_EXPIRES_IN;
  if (!raw) return 0;
  const parsed = Number(raw);
  return isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export async function createToken(user: User, secret: string, env: { JWT_EXPIRES_IN?: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = getJwtExpiresIn(env);
  const payload: Record<string, unknown> = {
    email: user.email,
    role: user.role,
  };
  if (expiresIn > 0) {
    payload.exp = now + expiresIn;
  }
  return await sign(payload, secret);
}

export async function verifyToken(token: string, secret: string): Promise<User | null> {
  try {
    const decoded = await verify(token, secret, 'HS256');
    return {
      email: (decoded as Record<string, unknown>).email as string,
      role: (decoded as Record<string, unknown>).role as 'admin' | 'viewer',
      exp: (decoded as Record<string, unknown>).exp as number,
    };
  } catch {
    return null;
  }
}
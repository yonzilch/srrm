import { sign, verify } from 'hono/jwt';
import type { User } from '@srrm/shared';

const JWT_EXPIRES_IN = 60 * 60 * 24; // 24 小时

export async function createToken(user: User, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return await sign(
    {
      email: user.email,
      role: user.role,
      exp: now + JWT_EXPIRES_IN,
    },
    secret,
  );
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
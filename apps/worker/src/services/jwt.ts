import { sign, verify } from 'hono/jwt';
import type { User } from '@srrm/shared';
import type { Env } from '@srrm/shared';

const JWT_EXPIRES_IN = 60 * 60 * 24; // 24 小时

export async function createToken(user: User, env: Env): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return await sign(
    {
      email: user.email,
      role: user.role,
      exp: now + JWT_EXPIRES_IN,
    },
    env.JWT_SECRET,
  );
}

export async function verifyToken(token: string, env: Env): Promise<User | null> {
  try {
    const decoded = await verify(token, env.JWT_SECRET, 'HS256');
    return {
      email: decoded.email as string,
      role: decoded.role as 'admin' | 'viewer',
      exp: decoded.exp as number,
    };
  } catch {
    return null;
  }
}
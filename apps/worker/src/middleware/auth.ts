import { Hono } from 'hono';
import { verifyToken } from '../services/jwt';
import type { Env } from '@srrm/shared';
import type { User } from '@srrm/shared';

function getTokenFromCookie(c: any): string | null {
  const cookieHeader = c.req.header('Cookie');
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(';')
    .map((pair: string) => pair.trim())
    .find((pair: string) => pair.startsWith('srrm_token='));
  return match ? match.split('=')[1] : null;
}

// authMiddleware: validates JWT and attaches user to context
export const authMiddleware = async (c: any, next: () => Promise<void>) => {
  const token = getTokenFromCookie(c);
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    if (!payload) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    c.set('jwtPayload', payload);
    await next();
  } catch (err) {
    console.error('[Auth Middleware Error]', err);
    return c.json({ error: 'Unauthorized' }, 401);
  }
};

// adminMiddleware: requires role === 'admin'
export const adminMiddleware = async (c: any, next: () => Promise<void>) => {
  const user = c.get('user') as User | undefined;
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Forbidden: Admin required' }, 403);
  }
  await next();
};
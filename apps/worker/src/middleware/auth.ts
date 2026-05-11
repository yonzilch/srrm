import { Hono } from 'hono';
import { verifyToken } from '../services/jwt';
import type { Env } from '@srrm/shared';
import type { User } from '@srrm/shared';

// authMiddleware: validates JWT and attaches user to context
export const authMiddleware = async (c, next) => {
  const token = c.req.cookie('srrm_token');
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    if (!payload) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    // Attach user to context
    c.set('user', payload as User);
    await next();
  } catch (err) {
    console.error('[Auth Middleware Error]', err);
    return c.json({ error: 'Unauthorized' }, 401);
  }
};

// adminMiddleware: requires role === 'admin'
export const adminMiddleware = async (c, next) => {
  const user = c.get('user');
  if (!user || (user as User).role !== 'admin') {
    return c.json({ error: 'Forbidden: Admin required' }, 403);
  }
  await next();
};
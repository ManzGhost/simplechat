import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from './db';
import { DbUser } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'simplechat_jwt_secret_key_production_safe_2026';
const JWT_EXPIRATION = (process.env.JWT_EXPIRATION || '7d') as any;

export interface AuthenticatedRequest extends Request {
  user?: DbUser;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId, id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
}

export function verifyToken(token: string): { sub?: string; id?: string } | null {
  if (!token || token === 'null' || token === 'undefined') {
    return null;
  }
  try {
    return jwt.verify(token, JWT_SECRET) as { sub?: string; id?: string };
  } catch {
    return null;
  }
}

export function sanitizeUser(user: DbUser): Omit<DbUser, 'password'> {
  const { password, ...safeUser } = user;
  return safeUser;
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  // Also check HTTP cookie for token if authorization header is not provided
  if (!token && req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)token=([^;]+)/);
    if (match) {
      token = decodeURIComponent(match[1]).trim();
    }
  }

  if (!token || token === 'null' || token === 'undefined') {
    res.status(401).json({ success: false, error: 'Unauthorized', message: 'Missing or invalid authentication token' });
    return;
  }

  const decoded = verifyToken(token);
  const userId = decoded?.sub || decoded?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized', message: 'Invalid or expired token' });
    return;
  }

  try {
    const user = await db.users.findById(userId);
    if (!user) {
      res.status(401).json({ success: false, error: 'Unauthorized', message: 'User not found' });
      return;
    }

    req.user = user;
    next();
  } catch (err: any) {
    console.error('[Auth] Error fetching user from MongoDB Atlas:', err?.message || err);
    res.status(500).json({ success: false, error: 'Database Error', message: err?.message || 'Authentication verification failed' });
  }
}

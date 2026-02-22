import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDb } from '../services/database';

const JWT_SECRET = process.env.JWT_SECRET || 'genesis-dev-secret-change-in-production';

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    username: string;
    email: string;
    securityLevel: string;
  };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; sessionId: string };

    // Verify session exists
    const db = getDb();
    const session = db.prepare(`
      SELECT s.*, u.username, u.email, u.security_level
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ? AND s.user_id = ? AND datetime(s.expires_at) > datetime('now')
    `).get(decoded.sessionId, decoded.userId) as any;

    if (!session) {
      res.status(401).json({ error: 'Session expired' });
      return;
    }

    req.userId = decoded.userId;
    req.user = {
      id: session.user_id,
      username: session.username,
      email: session.email,
      securityLevel: session.security_level,
    };

    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function generateToken(userId: string, sessionId: string): string {
  return jwt.sign({ userId, sessionId }, JWT_SECRET, { expiresIn: '24h' });
}

export function generateRefreshToken(userId: string, sessionId: string): string {
  return jwt.sign({ userId, sessionId, type: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });
}

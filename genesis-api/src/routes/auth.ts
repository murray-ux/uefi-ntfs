import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../services/database';
import { authenticate, AuthRequest, generateToken, generateRefreshToken } from '../middleware/auth';
import { addHours } from 'date-fns';

export const authRoutes = Router();

// Login
authRoutes.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password required' });
      return;
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username) as any;

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (user.locked) {
      res.status(403).json({ error: 'Account locked' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Create session
    const sessionId = uuidv4();
    const token = generateToken(user.id, sessionId);
    const refreshToken = generateRefreshToken(user.id, sessionId);
    const expiresAt = addHours(new Date(), 24).toISOString();

    db.prepare(`
      INSERT INTO sessions (id, user_id, token, refresh_token, expires_at, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(sessionId, user.id, token, refreshToken, expiresAt, req.ip, req.get('user-agent'));

    db.prepare('UPDATE users SET last_login = datetime("now") WHERE id = ?').run(user.id);

    res.json({
      token,
      refreshToken,
      expiresAt,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        securityLevel: user.security_level,
        mfaEnabled: !!user.mfa_enabled,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout
authRoutes.post('/logout', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.userId);
  res.json({ success: true });
});

// Refresh token
authRoutes.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    const db = getDb();
    const session = db.prepare(`
      SELECT s.*, u.id as user_id, u.username, u.email, u.security_level
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.refresh_token = ?
    `).get(refreshToken) as any;

    if (!session) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const newSessionId = uuidv4();
    const newToken = generateToken(session.user_id, newSessionId);
    const newRefreshToken = generateRefreshToken(session.user_id, newSessionId);
    const expiresAt = addHours(new Date(), 24).toISOString();

    // Delete old session, create new
    db.prepare('DELETE FROM sessions WHERE id = ?').run(session.id);
    db.prepare(`
      INSERT INTO sessions (id, user_id, token, refresh_token, expires_at, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(newSessionId, session.user_id, newToken, newRefreshToken, expiresAt, req.ip, req.get('user-agent'));

    res.json({
      token: newToken,
      refreshToken: newRefreshToken,
      expiresAt,
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// Get session
authRoutes.get('/session', authenticate, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

// MFA verify
authRoutes.post('/mfa/verify', authenticate, (req: AuthRequest, res: Response) => {
  const { code } = req.body;

  // Simplified MFA - in production, verify TOTP
  if (code === '000000' || code?.length === 6) {
    res.json({ verified: true });
  } else {
    res.status(401).json({ error: 'Invalid MFA code' });
  }
});

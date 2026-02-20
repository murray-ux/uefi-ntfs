import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { getDb } from '../services/database';
import { authenticate, AuthRequest } from '../middleware/auth';

export const auditRoutes = Router();

// Get audit log
auditRoutes.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { limit = 100, offset = 0, action } = req.query;

  let query = 'SELECT * FROM audit_log WHERE 1=1';
  const params: any[] = [];

  if (action) {
    query += ' AND action = ?';
    params.push(action);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const logs = db.prepare(query).all(...params);
  const total = db.prepare('SELECT COUNT(*) as count FROM audit_log').get() as { count: number };

  res.json({
    logs,
    total: total.count,
    limit: Number(limit),
    offset: Number(offset),
  });
});

// Verify audit chain
auditRoutes.get('/chain/verify', authenticate, (_req: AuthRequest, res: Response) => {
  const db = getDb();
  const logs = db.prepare('SELECT * FROM audit_log ORDER BY created_at ASC').all() as any[];

  let valid = true;
  let brokenAt: string | null = null;

  for (let i = 1; i < logs.length; i++) {
    const current = logs[i];
    const previous = logs[i - 1];

    if (current.previous_hash !== previous.hash) {
      valid = false;
      brokenAt = current.id;
      break;
    }
  }

  res.json({
    valid,
    totalEntries: logs.length,
    brokenAt,
    lastVerified: new Date().toISOString(),
  });
});

// Add audit entry
auditRoutes.post('/', authenticate, (req: AuthRequest, res: Response) => {
  const { action, targetType, targetId, details } = req.body;

  if (!action) {
    res.status(400).json({ error: 'Action required' });
    return;
  }

  const db = getDb();
  const id = uuidv4();

  // Get previous hash
  const lastEntry = db.prepare('SELECT hash FROM audit_log ORDER BY created_at DESC LIMIT 1').get() as { hash: string } | undefined;
  const previousHash = lastEntry?.hash || '0'.repeat(64);

  // Calculate hash
  const timestamp = new Date().toISOString();
  const hashInput = `${id}:${action}:${req.userId}:${targetType || ''}:${targetId || ''}:${JSON.stringify(details || {})}:${timestamp}:${previousHash}`;
  const hash = crypto.createHash('sha256').update(hashInput).digest('hex');

  db.prepare(`
    INSERT INTO audit_log (id, action, actor_id, target_type, target_id, details, ip_address, hash, previous_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, action, req.userId, targetType, targetId, JSON.stringify(details || {}), req.ip, hash, previousHash, timestamp);

  const entry = db.prepare('SELECT * FROM audit_log WHERE id = ?').get(id);
  res.status(201).json({ entry });
});

// Get audit statistics
auditRoutes.get('/stats', authenticate, (_req: AuthRequest, res: Response) => {
  const db = getDb();

  const byAction = db.prepare(`
    SELECT action, COUNT(*) as count
    FROM audit_log
    WHERE created_at > datetime('now', '-7 days')
    GROUP BY action
    ORDER BY count DESC
  `).all();

  const byActor = db.prepare(`
    SELECT actor_id, COUNT(*) as count
    FROM audit_log
    WHERE created_at > datetime('now', '-7 days') AND actor_id IS NOT NULL
    GROUP BY actor_id
    ORDER BY count DESC
    LIMIT 10
  `).all();

  const timeline = db.prepare(`
    SELECT date(created_at) as date, COUNT(*) as count
    FROM audit_log
    WHERE created_at > datetime('now', '-30 days')
    GROUP BY date(created_at)
    ORDER BY date DESC
  `).all();

  res.json({ byAction, byActor, timeline });
});

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../services/database';
import { authenticate, AuthRequest } from '../middleware/auth';

export const alertRoutes = Router();

// Get all alerts
alertRoutes.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { severity, resolved, limit = 50 } = req.query;

  let query = 'SELECT * FROM alerts WHERE 1=1';
  const params: any[] = [];

  if (severity) {
    query += ' AND severity = ?';
    params.push(severity);
  }

  if (resolved !== undefined) {
    query += ' AND resolved = ?';
    params.push(resolved === 'true' ? 1 : 0);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(Number(limit));

  const alerts = db.prepare(query).all(...params);
  res.json({ alerts });
});

// Get alert by ID
alertRoutes.get('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(req.params.id);

  if (!alert) {
    res.status(404).json({ error: 'Alert not found' });
    return;
  }

  res.json({ alert });
});

// Create alert
alertRoutes.post('/', authenticate, (req: AuthRequest, res: Response) => {
  const { title, message, severity, category, source, deviceId } = req.body;

  if (!title || !message || !severity || !category) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const db = getDb();
  const id = uuidv4();

  db.prepare(`
    INSERT INTO alerts (id, title, message, severity, category, source, device_id, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, message, severity, category, source || null, deviceId || null, req.userId);

  const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);
  res.status(201).json({ alert });
});

// Acknowledge alert
alertRoutes.post('/:id/acknowledge', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(req.params.id);

  if (!alert) {
    res.status(404).json({ error: 'Alert not found' });
    return;
  }

  db.prepare('UPDATE alerts SET acknowledged = 1 WHERE id = ?').run(req.params.id);
  const updated = db.prepare('SELECT * FROM alerts WHERE id = ?').get(req.params.id);

  res.json({ alert: updated });
});

// Resolve alert
alertRoutes.post('/:id/resolve', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(req.params.id);

  if (!alert) {
    res.status(404).json({ error: 'Alert not found' });
    return;
  }

  db.prepare(`
    UPDATE alerts SET resolved = 1, resolved_at = datetime('now') WHERE id = ?
  `).run(req.params.id);

  const updated = db.prepare('SELECT * FROM alerts WHERE id = ?').get(req.params.id);
  res.json({ alert: updated });
});

// Delete alert
alertRoutes.delete('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM alerts WHERE id = ?').run(req.params.id);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Alert not found' });
    return;
  }

  res.json({ success: true });
});

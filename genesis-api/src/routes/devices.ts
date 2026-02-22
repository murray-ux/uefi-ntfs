import { Router, Response } from 'express';
import { getDb } from '../services/database';
import { authenticate, AuthRequest } from '../middleware/auth';

export const deviceRoutes = Router();

// Get all devices
deviceRoutes.get('/', authenticate, (_req: AuthRequest, res: Response) => {
  const db = getDb();
  const devices = db.prepare(`
    SELECT id, name, type, status, ip_address, mac_address, os, os_version,
           last_seen, cis_score, vulnerabilities, patches_pending, certificates_expiring
    FROM devices
    ORDER BY last_seen DESC
  `).all();

  res.json({ devices });
});

// Legacy endpoint for mobile
deviceRoutes.get('/devices', authenticate, (_req: AuthRequest, res: Response) => {
  const db = getDb();
  const devices = db.prepare(`
    SELECT id, name, type, status, ip_address as ipAddress, os, os_version as osVersion,
           last_seen as lastSeen, cis_score as cisScore, vulnerabilities,
           patches_pending as patchesPending, certificates_expiring as certificatesExpiring
    FROM devices
    ORDER BY last_seen DESC
  `).all();

  res.json({ devices });
});

// Get device by ID
deviceRoutes.get('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id);

  if (!device) {
    res.status(404).json({ error: 'Device not found' });
    return;
  }

  res.json({ device });
});

// Get device health details
deviceRoutes.get('/:id/health', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id) as any;

  if (!device) {
    res.status(404).json({ error: 'Device not found' });
    return;
  }

  res.json({
    device: {
      id: device.id,
      name: device.name,
      type: device.type,
      status: device.status,
    },
    health: {
      cisScore: device.cis_score,
      vulnerabilities: device.vulnerabilities,
      patchesPending: device.patches_pending,
      certificatesExpiring: device.certificates_expiring,
      lastScan: device.last_seen,
    },
    compliance: {
      cisLevel: device.cis_score >= 90 ? 'Level 2' : 'Level 1',
      passed: device.cis_score >= 80,
      controls: {
        total: 150,
        passed: Math.floor(150 * device.cis_score / 100),
        failed: 150 - Math.floor(150 * device.cis_score / 100),
      },
    },
    vulnerabilityDetails: device.vulnerabilities > 0 ? [
      { id: 'CVE-2024-1234', severity: 'high', title: 'Remote Code Execution' },
      { id: 'CVE-2024-5678', severity: 'medium', title: 'Privilege Escalation' },
    ].slice(0, device.vulnerabilities) : [],
  });
});

// Update device status
deviceRoutes.patch('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { status, name } = req.body;
  const db = getDb();

  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id);
  if (!device) {
    res.status(404).json({ error: 'Device not found' });
    return;
  }

  if (status) {
    db.prepare('UPDATE devices SET status = ? WHERE id = ?').run(status, req.params.id);
  }
  if (name) {
    db.prepare('UPDATE devices SET name = ? WHERE id = ?').run(name, req.params.id);
  }

  const updated = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id);
  res.json({ device: updated });
});

// Run device scan
deviceRoutes.post('/:id/scan', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id);

  if (!device) {
    res.status(404).json({ error: 'Device not found' });
    return;
  }

  // Update last_seen
  db.prepare('UPDATE devices SET last_seen = datetime("now") WHERE id = ?').run(req.params.id);

  res.json({
    scanId: `scan-${req.params.id}-${Date.now()}`,
    status: 'initiated',
    message: 'Device scan initiated',
  });
});

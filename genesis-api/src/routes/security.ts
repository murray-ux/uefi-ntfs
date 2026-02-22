import { Router, Response } from 'express';
import { getDb } from '../services/database';
import { authenticate, AuthRequest } from '../middleware/auth';

export const securityRoutes = Router();

// Get security overview / shield health
securityRoutes.get('/health', authenticate, (_req: AuthRequest, res: Response) => {
  const db = getDb();

  const deviceStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'healthy' THEN 1 ELSE 0 END) as healthy,
      SUM(CASE WHEN status = 'warning' THEN 1 ELSE 0 END) as warning,
      SUM(CASE WHEN status = 'critical' THEN 1 ELSE 0 END) as critical,
      AVG(cis_score) as avgCisScore,
      SUM(vulnerabilities) as totalVulnerabilities,
      SUM(patches_pending) as totalPatches
    FROM devices
  `).get() as any;

  const alertStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical,
      SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high,
      SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) as medium,
      SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END) as low,
      SUM(CASE WHEN resolved = 0 THEN 1 ELSE 0 END) as unresolved
    FROM alerts
  `).get() as any;

  const pentagonStats = db.prepare(`
    SELECT
      COUNT(*) as totalRooms,
      SUM(CASE WHEN status = 'secure' THEN 1 ELSE 0 END) as secureRooms,
      SUM(controls_active) as activeControls,
      SUM(controls_total) as totalControls,
      AVG(threat_level) as avgThreatLevel
    FROM pentagon_rooms
  `).get() as any;

  // Calculate threat level
  let threatLevel: 'secure' | 'low' | 'medium' | 'high' | 'critical' = 'secure';
  if (alertStats.critical > 0) threatLevel = 'critical';
  else if (alertStats.high > 2 || deviceStats.critical > 0) threatLevel = 'high';
  else if (alertStats.high > 0 || alertStats.medium > 3) threatLevel = 'medium';
  else if (alertStats.medium > 0 || deviceStats.warning > 0) threatLevel = 'low';

  res.json({
    threatLevel,
    overallScore: Math.round(deviceStats.avgCisScore || 100),
    devices: {
      total: deviceStats.total || 0,
      healthy: deviceStats.healthy || 0,
      warning: deviceStats.warning || 0,
      critical: deviceStats.critical || 0,
    },
    alerts: {
      total: alertStats.total || 0,
      critical: alertStats.critical || 0,
      high: alertStats.high || 0,
      medium: alertStats.medium || 0,
      low: alertStats.low || 0,
      unresolved: alertStats.unresolved || 0,
    },
    vulnerabilities: deviceStats.totalVulnerabilities || 0,
    patchesPending: deviceStats.totalPatches || 0,
    pentagon: {
      totalRooms: pentagonStats.totalRooms || 40,
      secureRooms: pentagonStats.secureRooms || 40,
      activeControls: pentagonStats.activeControls || 0,
      totalControls: pentagonStats.totalControls || 0,
      avgThreatLevel: Math.round(pentagonStats.avgThreatLevel || 0),
    },
    lastScan: new Date().toISOString(),
    networkStats: {
      bytesIn: Math.floor(Math.random() * 1000000000),
      bytesOut: Math.floor(Math.random() * 500000000),
      activeConnections: Math.floor(Math.random() * 100) + 20,
      blockedConnections: Math.floor(Math.random() * 50),
    },
  });
});

// Run security scan
securityRoutes.post('/scan', authenticate, (_req: AuthRequest, res: Response) => {
  // Simulate scan
  res.json({
    scanId: `scan-${Date.now()}`,
    status: 'initiated',
    estimatedTime: 30,
    message: 'Security scan initiated',
  });
});

// Get threat intelligence
securityRoutes.get('/threats', authenticate, (_req: AuthRequest, res: Response) => {
  res.json({
    activeThreatActors: 3,
    knownVulnerabilities: 12,
    blockedIPs: 147,
    lastUpdate: new Date().toISOString(),
    threats: [
      { id: 1, name: 'APT-29', severity: 'high', lastSeen: '2024-01-15' },
      { id: 2, name: 'Ransomware-X', severity: 'critical', lastSeen: '2024-01-14' },
      { id: 3, name: 'Phishing Campaign', severity: 'medium', lastSeen: '2024-01-13' },
    ],
  });
});

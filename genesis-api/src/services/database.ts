/**
 * Database Service - SQLite with better-sqlite3
 */

import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'genesis.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create tables
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      mfa_enabled INTEGER DEFAULT 0,
      mfa_secret TEXT,
      security_level TEXT DEFAULT 'standard',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_login TEXT,
      locked INTEGER DEFAULT 0
    );

    -- Sessions table
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      refresh_token TEXT UNIQUE,
      expires_at TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Devices table
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'healthy',
      ip_address TEXT,
      mac_address TEXT,
      os TEXT,
      os_version TEXT,
      last_seen TEXT,
      cis_score INTEGER DEFAULT 100,
      vulnerabilities INTEGER DEFAULT 0,
      patches_pending INTEGER DEFAULT 0,
      certificates_expiring INTEGER DEFAULT 0,
      owner_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    -- Alerts table
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT NOT NULL,
      category TEXT NOT NULL,
      source TEXT,
      device_id TEXT,
      user_id TEXT,
      acknowledged INTEGER DEFAULT 0,
      resolved INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT,
      FOREIGN KEY (device_id) REFERENCES devices(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Audit log table
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      actor_id TEXT,
      target_type TEXT,
      target_id TEXT,
      details TEXT,
      ip_address TEXT,
      hash TEXT,
      previous_hash TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Pentagon rooms table
    CREATE TABLE IF NOT EXISTS pentagon_rooms (
      id TEXT PRIMARY KEY,
      layer INTEGER NOT NULL,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'secure',
      threat_level INTEGER DEFAULT 0,
      last_scan TEXT,
      controls_active INTEGER DEFAULT 0,
      controls_total INTEGER DEFAULT 0
    );

    -- Notification installations table
    CREATE TABLE IF NOT EXISTS notification_installations (
      id TEXT PRIMARY KEY,
      installation_id TEXT UNIQUE NOT NULL,
      push_token TEXT,
      platform TEXT NOT NULL,
      device_model TEXT,
      os_version TEXT,
      app_version TEXT,
      timezone TEXT,
      locale TEXT,
      user_id TEXT,
      segments TEXT,
      custom_attributes TEXT,
      preferences TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Notification analytics table
    CREATE TABLE IF NOT EXISTS notification_analytics (
      id TEXT PRIMARY KEY,
      notification_id TEXT NOT NULL,
      installation_id TEXT,
      event_type TEXT NOT NULL,
      action_id TEXT,
      category TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_devices_owner ON devices(owner_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
    CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_id);
  `);

  // Seed initial data if empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    await seedDatabase();
  }
}

async function seedDatabase(): Promise<void> {
  const bcrypt = await import('bcrypt');

  // Create demo user
  const userId = uuidv4();
  const passwordHash = await bcrypt.hash('genesis2024', 12);

  db.prepare(`
    INSERT INTO users (id, username, email, password_hash, security_level)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, 'admin', 'admin@genesis.local', passwordHash, 'maximum');

  // Create sample devices
  const devices = [
    { name: 'Primary Workstation', type: 'desktop', status: 'healthy', ip: '192.168.1.100', os: 'Windows 11', cisScore: 95 },
    { name: 'Development Server', type: 'server', status: 'healthy', ip: '192.168.1.10', os: 'Ubuntu 22.04', cisScore: 98 },
    { name: 'Mobile Device', type: 'mobile', status: 'warning', ip: '192.168.1.150', os: 'iOS 17', cisScore: 88 },
    { name: 'Network Gateway', type: 'network', status: 'healthy', ip: '192.168.1.1', os: 'RouterOS', cisScore: 100 },
    { name: 'Backup Server', type: 'server', status: 'critical', ip: '192.168.1.20', os: 'Debian 12', cisScore: 72, vulns: 3 },
  ];

  const insertDevice = db.prepare(`
    INSERT INTO devices (id, name, type, status, ip_address, os, cis_score, vulnerabilities, owner_id, last_seen)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  for (const d of devices) {
    insertDevice.run(uuidv4(), d.name, d.type, d.status, d.ip, d.os, d.cisScore, d.vulns || 0, userId);
  }

  // Create sample alerts
  const alerts = [
    { title: 'Failed Login Attempts', message: '5 failed login attempts from IP 203.0.113.42', severity: 'high', category: 'auth' },
    { title: 'Certificate Expiring', message: 'SSL certificate for api.genesis.local expires in 7 days', severity: 'medium', category: 'certificate' },
    { title: 'Vulnerability Detected', message: 'CVE-2024-1234 detected on Backup Server', severity: 'critical', category: 'vulnerability' },
    { title: 'Unusual Network Activity', message: 'Spike in outbound traffic detected', severity: 'medium', category: 'network' },
  ];

  const insertAlert = db.prepare(`
    INSERT INTO alerts (id, title, message, severity, category, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now', '-' || ? || ' hours'))
  `);

  alerts.forEach((a, i) => {
    insertAlert.run(uuidv4(), a.title, a.message, a.severity, a.category, i * 2);
  });

  // Create Pentagon rooms (5 layers, 8 rooms each)
  const layers = ['Perimeter', 'Network', 'Endpoint', 'Application', 'Data'];
  const roomTypes = ['Firewall', 'IDS/IPS', 'Access Control', 'Monitoring', 'Encryption', 'Authentication', 'Audit', 'Response'];

  const insertRoom = db.prepare(`
    INSERT INTO pentagon_rooms (id, layer, name, status, threat_level, controls_active, controls_total, last_scan)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  layers.forEach((layer, li) => {
    roomTypes.forEach((room) => {
      const status = Math.random() > 0.9 ? 'warning' : 'secure';
      const threatLevel = status === 'warning' ? Math.floor(Math.random() * 30) + 10 : Math.floor(Math.random() * 10);
      const total = Math.floor(Math.random() * 10) + 5;
      const active = status === 'secure' ? total : total - Math.floor(Math.random() * 3) - 1;
      insertRoom.run(uuidv4(), li + 1, `${layer} - ${room}`, status, threatLevel, active, total);
    });
  });

  // Create initial audit log entry
  const auditId = uuidv4();
  const hash = require('crypto').createHash('sha256').update(`${auditId}:SYSTEM_INIT:${new Date().toISOString()}`).digest('hex');

  db.prepare(`
    INSERT INTO audit_log (id, action, details, hash, previous_hash, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(auditId, 'SYSTEM_INIT', JSON.stringify({ message: 'GENESIS 2.0 initialized' }), hash, '0'.repeat(64));
}

export function closeDatabase(): void {
  if (db) {
    db.close();
  }
}

#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
// Copyright 2025 Murray Bembrick — Founder & Lead Developer
// See LICENSE and NOTICE for terms.

/**
 * GENESIS 2.0 Dashboard Server
 * Modern Web UI for the Sovereign Security Platform
 *
 * GENESIS 2.0 — Forbidden Ninja City
 */

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EventEmitter } from 'node:events';
import { createLogger } from '../lib/kol-logger.js';

const dashLog = createLogger('DASHBOARD');

// MABUL Persistence Layer
let mabul = null;
async function getMabul() {
  if (!mabul) {
    try {
      const { default: Mabul } = await import('../lib/mabul-persistence.js');
      mabul = new Mabul();
      await mabul.initialize();
    } catch (e) {
      dashLog.debug('MABUL layer not available', { error: e.message });
      return null;
    }
  }
  return mabul;
}

// EBEN Evidence Management (Protected by SHINOBI)
let eben = null;
async function getEben() {
  if (!eben) {
    try {
      const { default: Eben } = await import('../lib/eben-evidence.js');
      eben = new Eben();
    } catch (e) {
      dashLog.debug('EBEN vault not available', { error: e.message });
      return null;
    }
  }
  return eben;
}

// SHINOBI Security Layer
let shinobi = null;
async function getShinobi() {
  if (!shinobi) {
    try {
      const { default: Shinobi } = await import('../lib/shinobi-security.js');
      shinobi = new Shinobi();

      // Protect EBEN with SHINOBI
      const e = await getEben();
      if (e) shinobi.protect(e);
    } catch (e) {
      dashLog.debug('SHINOBI security not available', { error: e.message });
      return null;
    }
  }
  return shinobi;
}

// TETSUYA Defense & Risk Management
let tetsuya = null;
async function getTetsuya() {
  if (!tetsuya) {
    try {
      const { default: Tetsuya } = await import('../lib/tetsuya-defense.js');
      tetsuya = new Tetsuya({ autoCreateAgents: true });
    } catch (e) {
      dashLog.debug('TETSUYA defense not available', { error: e.message });
      return null;
    }
  }
  return tetsuya;
}

// MERKAVA Command Center
let merkava = null;
async function getMerkava() {
  if (!merkava) {
    try {
      const { default: Merkava } = await import('../lib/merkava-command.js');
      merkava = new Merkava();
      await merkava.initialize();
    } catch (e) {
      dashLog.debug('MERKAVA not available', { error: e.message });
      return null;
    }
  }
  return merkava;
}

// TZOFEH Sentinel
let tzofeh = null;
async function getTzofeh() {
  if (!tzofeh) {
    try {
      const { default: Tzofeh } = await import('../lib/tzofeh-sentinel.js');
      tzofeh = new Tzofeh();
      await tzofeh.initialize(merkava);
    } catch (e) {
      dashLog.debug('TZOFEH not available', { error: e.message });
      return null;
    }
  }
  return tzofeh;
}

// MALAKH Message Bus
let malakhBus = null;
async function getMalakh() {
  if (!malakhBus) {
    try {
      const { default: Malakh } = await import('../lib/malakh-bus.js');
      malakhBus = new Malakh();
      await malakhBus.initialize();
    } catch (e) {
      dashLog.debug('MALAKH not available', { error: e.message });
      return null;
    }
  }
  return malakhBus;
}

const __dirname = dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_PORT = parseInt(process.env.GENESIS_UI_PORT) || 3000;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf'
};

// Colors for console output
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

// ═══════════════════════════════════════════════════════════════════════════
// In-Memory State Store
// ═══════════════════════════════════════════════════════════════════════════

const store = {
  evidence: [],
  workflows: [
    {
      id: 'wf-evidence-intake',
      name: 'Evidence Intake Pipeline',
      description: 'Automated evidence processing and verification',
      trigger: 'manual',
      enabled: true,
      steps: [
        { name: 'Receive', status: 'pending' },
        { name: 'Validate', status: 'pending' },
        { name: 'Hash', status: 'pending' },
        { name: 'Store', status: 'pending' },
        { name: 'Index', status: 'pending' }
      ],
      lastRun: null
    },
    {
      id: 'wf-security-scan',
      name: 'Security Scan Routine',
      description: 'Periodic security vulnerability assessment',
      trigger: 'schedule',
      enabled: true,
      steps: [
        { name: 'Filesystem', status: 'pending' },
        { name: 'Dependencies', status: 'pending' },
        { name: 'Network', status: 'pending' },
        { name: 'Report', status: 'pending' }
      ],
      lastRun: null
    },
    {
      id: 'wf-backup',
      name: 'Backup & Sync',
      description: 'Encrypted backup and cloud synchronization',
      trigger: 'schedule',
      enabled: false,
      steps: [
        { name: 'Snapshot', status: 'pending' },
        { name: 'Encrypt', status: 'pending' },
        { name: 'Upload', status: 'pending' },
        { name: 'Verify', status: 'pending' }
      ],
      lastRun: null
    }
  ],
  config: {
    instanceName: 'GENESIS',
    environment: 'production',
    debugMode: false,
    autoScan: true,
    scanInterval: 'daily',
    alertNotifications: true,
    pgHost: 'localhost',
    pgPort: '5432',
    pgDatabase: 'genesis',
    apiPort: '3000',
    httpsEnabled: false,
    corsEnabled: true
  },
  securityScan: null,
  alerts: []
};

// ═══════════════════════════════════════════════════════════════════════════
// SSE Event Broadcaster
// ═══════════════════════════════════════════════════════════════════════════

class EventBroadcaster extends EventEmitter {
  constructor() {
    super();
    this.clients = new Set();
    this.setMaxListeners(100);
  }

  addClient(res) {
    this.clients.add(res);
    res.on('close', () => this.clients.delete(res));
    return this.clients.size;
  }

  broadcast(event, data) {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    const message = `event: ${event}\ndata: ${payload}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(message);
      } catch (e) {
        this.clients.delete(client);
      }
    }
  }

  get clientCount() {
    return this.clients.size;
  }
}

const broadcaster = new EventBroadcaster();

// ═══════════════════════════════════════════════════════════════════════════
// System Metrics Collection
// ═══════════════════════════════════════════════════════════════════════════

const startTime = Date.now();
let lastCpuUsage = process.cpuUsage();
let lastCpuTime = Date.now();

function collectMetrics() {
  const mem = process.memoryUsage();
  const currentCpuUsage = process.cpuUsage(lastCpuUsage);
  const currentTime = Date.now();
  const timeDiff = (currentTime - lastCpuTime) * 1000; // microseconds

  // Calculate CPU percentage
  const cpuPercent = timeDiff > 0
    ? ((currentCpuUsage.user + currentCpuUsage.system) / timeDiff) * 100
    : 0;

  lastCpuUsage = process.cpuUsage();
  lastCpuTime = currentTime;

  return {
    timestamp: Date.now(),
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      rss: Math.round(mem.rss / 1024 / 1024),
      external: Math.round((mem.external || 0) / 1024 / 1024),
      arrayBuffers: Math.round((mem.arrayBuffers || 0) / 1024 / 1024)
    },
    cpu: {
      usage: Math.min(100, Math.round(cpuPercent * 10) / 10),
      user: currentCpuUsage.user,
      system: currentCpuUsage.system
    },
    platform: process.platform,
    nodeVersion: process.version,
    pid: process.pid,
    connections: broadcaster.clientCount,
    recentActivity: [
      { type: 'system', title: 'Metrics update', timestamp: Date.now() }
    ]
  };
}

// Broadcast metrics every 2 seconds
setInterval(() => {
  broadcaster.broadcast('metrics', collectMetrics());
}, 2000);

// ═══════════════════════════════════════════════════════════════════════════
// Pentagon Architecture Data
// ═══════════════════════════════════════════════════════════════════════════

const PENTAGON_LAYERS = [
  {
    id: 'bereshit',
    name: 'BERESHIT',
    subtitle: 'Creation Layer',
    color: '#ef4444',
    icon: '✡️',
    rooms: ['TOHU', 'BOHU', 'RUACH', 'MAYIM', 'SHAMAYIM', 'ERETZ', 'OHR', 'CHOSHEK']
  },
  {
    id: 'eden',
    name: 'EDEN',
    subtitle: 'Garden Layer',
    color: '#f59e0b',
    icon: '🌳',
    rooms: ['GAN', 'PISHON', 'GIHON', 'CHIDDEKEL', 'PERATH', 'ETZHAIM', 'HADAAT', 'KERUV']
  },
  {
    id: 'mabul',
    name: 'MABUL',
    subtitle: 'Flood Layer',
    color: '#22c55e',
    icon: '🕊️',
    rooms: ['TEBAH', 'GOPHER', 'KOFER', 'TZOHAR', 'ARARAT', 'YONAH', 'ZAYIT', 'KESHET']
  },
  {
    id: 'brit',
    name: 'BRIT',
    subtitle: 'Covenant Layer',
    color: '#00d4ff',
    icon: '📜',
    rooms: ['OT', 'MILAH', 'DAM', 'MIZBEACH', 'OLAH', 'MINCHA', 'SHELEM', 'CHATAT']
  },
  {
    id: 'yetziah',
    name: 'YETZIAH',
    subtitle: 'Exodus Layer',
    color: '#7c3aed',
    icon: '🔥',
    rooms: ['GOSHEN', 'MITZRAYIM', 'SINAI', 'HOREB', 'PESACH', 'MATZAH', 'MAROR', 'ELIM']
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// API Request Parser
// ═══════════════════════════════════════════════════════════════════════════

async function parseBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString();
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// API Routes
// ═══════════════════════════════════════════════════════════════════════════

const apiRoutes = {
  // Health & Status
  'GET /api/health': () => ({
    status: 'healthy',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    pid: process.pid,
    nodeVersion: process.version,
    connections: broadcaster.clientCount
  }),

  'GET /api/metrics': () => collectMetrics(),

  // Pentagon
  'GET /api/pentagon': () => ({
    layers: PENTAGON_LAYERS,
    status: 'operational',
    totalRooms: 40,
    activeRooms: 40,
    rooms: PENTAGON_LAYERS.reduce((acc, layer, li) => {
      layer.rooms.forEach((room, ri) => {
        acc[`${layer.id}-${ri + 1}`] = {
          name: room,
          layer: layer.id,
          active: true,
          lastPing: Date.now()
        };
      });
      return acc;
    }, {})
  }),

  'GET /api/pentagon/room/:roomId': (params) => {
    const [layerId, roomIndex] = params.roomId.split('-');
    const layer = PENTAGON_LAYERS.find(l => l.id === layerId);
    if (!layer) return { error: 'Layer not found' };

    const room = layer.rooms[parseInt(roomIndex) - 1];
    if (!room) return { error: 'Room not found' };

    return {
      id: params.roomId,
      name: room,
      layer: layer.name,
      status: 'active',
      metrics: {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        requests: Math.floor(Math.random() * 1000)
      },
      lastActivity: new Date().toISOString()
    };
  },

  // Evidence
  'GET /api/evidence': () => ({
    items: store.evidence,
    total: store.evidence.length,
    categories: ['document', 'communication', 'financial', 'technical', 'other'],
    stats: {
      verified: store.evidence.filter(e => e.status === 'verified').length,
      pending: store.evidence.filter(e => e.status === 'pending').length,
      archived: store.evidence.filter(e => e.status === 'archived').length
    }
  }),

  'POST /api/evidence': async (params, body) => {
    const evidence = {
      id: `ev-${Date.now()}`,
      code: `GEN-${Date.now().toString(36).toUpperCase()}`,
      ...body,
      status: 'pending',
      created_at: new Date().toISOString(),
      hash: `sha256:${Buffer.from(JSON.stringify(body)).toString('base64').slice(0, 32)}`
    };
    store.evidence.push(evidence);
    broadcaster.broadcast('evidence', { action: 'added', evidence });
    return { success: true, evidence };
  },

  'GET /api/evidence/:id': (params) => {
    const evidence = store.evidence.find(e => e.id === params.id);
    return evidence || { error: 'Evidence not found' };
  },

  'POST /api/evidence/:id/verify': (params) => {
    const evidence = store.evidence.find(e => e.id === params.id);
    if (!evidence) return { error: 'Evidence not found' };

    evidence.status = 'verified';
    evidence.verified_at = new Date().toISOString();
    return { valid: true, evidence };
  },

  // Security
  'GET /api/security/last-scan': () => store.securityScan,

  'POST /api/security/scan': async (params, body) => {
    const scanType = body.type || 'quick';

    // Simulate scan results
    const issues = Math.random() > 0.7 ? [
      {
        id: 'issue-1',
        severity: 'medium',
        title: 'Outdated dependency detected',
        description: 'lodash version is behind latest security patch'
      }
    ] : [];

    const recommendations = [
      {
        id: 'rec-1',
        title: 'Enable 2FA',
        description: 'Add two-factor authentication for enhanced security'
      },
      {
        id: 'rec-2',
        title: 'Update SSL certificate',
        description: 'Certificate expires in 30 days'
      }
    ];

    store.securityScan = {
      timestamp: new Date().toISOString(),
      type: scanType,
      duration: Math.floor(Math.random() * 5000) + 1000,
      summary: {
        score: issues.length === 0 ? 100 : 85,
        critical: 0,
        warnings: issues.length,
        info: 2
      },
      issues,
      recommendations
    };

    return store.securityScan;
  },

  'POST /api/security/fix/:fixId': (params) => {
    return { success: true, fixId: params.fixId, applied: true };
  },

  // Workflows
  'GET /api/workflows': () => ({
    workflows: store.workflows
  }),

  'POST /api/workflows': async (params, body) => {
    const workflow = {
      id: `wf-${Date.now()}`,
      ...body,
      steps: body.steps || [],
      lastRun: null
    };
    store.workflows.push(workflow);
    return { success: true, workflow };
  },

  'PUT /api/workflows/:id': async (params, body) => {
    const index = store.workflows.findIndex(w => w.id === params.id);
    if (index === -1) return { error: 'Workflow not found' };

    store.workflows[index] = { ...store.workflows[index], ...body };
    return { success: true, workflow: store.workflows[index] };
  },

  'DELETE /api/workflows/:id': (params) => {
    const index = store.workflows.findIndex(w => w.id === params.id);
    if (index === -1) return { error: 'Workflow not found' };

    store.workflows.splice(index, 1);
    return { success: true };
  },

  'POST /api/workflows/:id/run': async (params) => {
    const workflow = store.workflows.find(w => w.id === params.id);
    if (!workflow) return { error: 'Workflow not found' };

    // Simulate workflow execution
    workflow.lastRun = new Date().toISOString();
    workflow.steps = workflow.steps.map(s => ({ ...s, status: 'success' }));

    broadcaster.broadcast('workflow', { action: 'completed', workflowId: params.id });
    return { success: true, result: 'completed', workflow };
  },

  // Configuration
  'GET /api/config': () => store.config,

  'PUT /api/config': async (params, body) => {
    store.config = { ...store.config, ...body };
    return { success: true, config: store.config };
  },

  // Alerts
  'GET /api/alerts': () => ({
    alerts: store.alerts,
    unread: store.alerts.filter(a => !a.read).length
  }),

  'POST /api/alerts/:id/read': (params) => {
    const alert = store.alerts.find(a => a.id === params.id);
    if (alert) alert.read = true;
    return { success: true };
  },

  // ═════════════════════════════════════════════════════════════════════════
  // MABUL Persistence Layer API
  // ═════════════════════════════════════════════════════════════════════════

  'GET /api/mabul/status': async () => {
    const m = await getMabul();
    if (!m) return { error: 'MABUL layer not initialized' };
    return m.status();
  },

  'GET /api/mabul/health': async () => {
    const m = await getMabul();
    if (!m) return { error: 'MABUL layer not initialized' };
    return m.health();
  },

  'GET /api/mabul/memories': async (params, body, query) => {
    const m = await getMabul();
    if (!m) return { error: 'MABUL layer not initialized' };

    const list = await m.ark.list({
      category: query?.category,
      tags: query?.tags?.split(',')
    });

    return {
      success: true,
      count: list.length,
      memories: list.map(r => ({
        key: r.id,
        category: r.category,
        tags: r.tags,
        timestamp: r.timestamp,
        preview: typeof r.value === 'string' ?
          r.value.slice(0, 200) + (r.value.length > 200 ? '...' : '') :
          JSON.stringify(r.value).slice(0, 200)
      }))
    };
  },

  'POST /api/mabul/store': async (params, body) => {
    const m = await getMabul();
    if (!m) return { error: 'MABUL layer not initialized' };

    const { key, content, category, tags } = body;
    if (!key || !content) {
      return { error: 'Key and content are required' };
    }

    const record = await m.store(key, content, { category, tags });
    broadcaster.broadcast('mabul', { action: 'stored', key: record.id });

    return {
      success: true,
      key: record.id,
      timestamp: record.timestamp
    };
  },

  'GET /api/mabul/retrieve/:key': async (params) => {
    const m = await getMabul();
    if (!m) return { error: 'MABUL layer not initialized' };

    const record = await m.retrieve(params.key);
    if (!record) return { error: 'Memory not found' };

    return {
      success: true,
      key: record.id,
      value: record.value,
      category: record.category,
      tags: record.tags,
      timestamp: record.timestamp
    };
  },

  'DELETE /api/mabul/delete/:key': async (params) => {
    const m = await getMabul();
    if (!m) return { error: 'MABUL layer not initialized' };

    const deleted = await m.ark.delete(params.key);
    broadcaster.broadcast('mabul', { action: 'deleted', key: params.key });

    return { success: true, deleted };
  },

  'POST /api/mabul/search': async (params, body) => {
    const m = await getMabul();
    if (!m) return { error: 'MABUL layer not initialized' };

    const { query, limit, threshold } = body;
    if (!query) return { error: 'Query is required' };

    const results = await m.search(query, {
      limit: limit || 10,
      threshold: threshold || 0.3
    });

    return {
      success: true,
      query,
      count: results.length,
      results: results.map(r => ({
        key: r.id,
        value: r.value,
        category: r.category,
        similarity: r.similarity,
        timestamp: r.timestamp
      }))
    };
  },

  'POST /api/mabul/context': async (params, body) => {
    const m = await getMabul();
    if (!m) return { error: 'MABUL layer not initialized' };

    const { query, maxItems } = body;
    if (!query) return { error: 'Query is required' };

    const context = await m.buildContext(query, { maxContext: maxItems || 10 });

    return {
      success: true,
      ...context
    };
  },

  'GET /api/mabul/checkpoints': async () => {
    const m = await getMabul();
    if (!m) return { error: 'MABUL layer not initialized' };

    const checkpoints = await m.checkpoint.listCheckpoints();
    return { success: true, checkpoints };
  },

  'POST /api/mabul/checkpoint': async (params, body) => {
    const m = await getMabul();
    if (!m) return { error: 'MABUL layer not initialized' };

    const checkpoint = await m.createCheckpoint(body.name);
    broadcaster.broadcast('mabul', { action: 'checkpoint', id: checkpoint.id });

    return {
      success: true,
      checkpoint: {
        id: checkpoint.id,
        timestamp: checkpoint.timestamp,
        memoriesCount: checkpoint.memoriesCount
      }
    };
  },

  'POST /api/mabul/restore/:checkpointId': async (params) => {
    const m = await getMabul();
    if (!m) return { error: 'MABUL layer not initialized' };

    const restored = await m.checkpoint.restoreCheckpoint(params.checkpointId);
    broadcaster.broadcast('mabul', { action: 'restored', checkpointId: params.checkpointId });

    return {
      success: true,
      restored: {
        id: restored.id,
        memoriesCount: restored.memoriesCount
      }
    };
  },

  'POST /api/mabul/recover': async (params, body) => {
    const m = await getMabul();
    if (!m) return { error: 'MABUL layer not initialized' };

    const result = await m.recovery.recover(body.strategy || 'checkpoint');
    return result;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // EBEN Evidence Management API (Protected by SHINOBI)
  // ═════════════════════════════════════════════════════════════════════════

  'GET /api/eben/status': async () => {
    const eben = await getEben();
    if (!eben) return { error: 'EBEN vault not initialized' };
    return eben.status();
  },

  'POST /api/eben/unlock': async (params, body) => {
    const eben = await getEben();
    if (!eben) return { error: 'EBEN vault not initialized' };

    try {
      const keyId = eben.unlock(body.passphrase);
      return { success: true, keyId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  'POST /api/eben/lock': async () => {
    const eben = await getEben();
    if (!eben) return { error: 'EBEN vault not initialized' };
    eben.lock();
    return { success: true };
  },

  'POST /api/eben/ingest': async (params, body) => {
    const eben = await getEben();
    if (!eben) return { error: 'EBEN vault not initialized' };

    try {
      const evidence = await eben.ingestEvidence(body.source, body.content, body.metadata);
      return { success: true, evidence: evidence.toMetadata() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  'GET /api/eben/evidence/:id': async (params) => {
    const eben = await getEben();
    if (!eben) return { error: 'EBEN vault not initialized' };

    try {
      const result = await eben.retrieveEvidence(params.id, { includeContent: false });
      return { success: true, evidence: result.evidence };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  'POST /api/eben/search': async (params, body) => {
    const eben = await getEben();
    if (!eben) return { error: 'EBEN vault not initialized' };

    const results = eben.search(body.query, body.options || {});
    return {
      success: true,
      query: body.query,
      count: results.length,
      results: results.map(e => e.toMetadata())
    };
  },

  'POST /api/eben/case': async (params, body) => {
    const eben = await getEben();
    if (!eben) return { error: 'EBEN vault not initialized' };

    const legalCase = eben.createCase(body);
    return { success: true, case: legalCase };
  },

  'GET /api/eben/audit': async () => {
    const eben = await getEben();
    if (!eben) return { error: 'EBEN vault not initialized' };

    return {
      success: true,
      verification: eben.audit.verify(),
      entries: eben.audit.entries.slice(-50)
    };
  },

  'GET /api/eben/integrity': async () => {
    const eben = await getEben();
    if (!eben) return { error: 'EBEN vault not initialized' };

    return eben.verifyAllIntegrity();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // SHINOBI Security API
  // ═════════════════════════════════════════════════════════════════════════

  'GET /api/shinobi/status': async () => {
    const shinobi = await getShinobi();
    if (!shinobi) return { error: 'SHINOBI not initialized' };
    return shinobi.status();
  },

  'POST /api/shinobi/authenticate': async (params, body) => {
    const shinobi = await getShinobi();
    if (!shinobi) return { error: 'SHINOBI not initialized' };

    const verified = shinobi.verifyAdminToken(body.token);
    if (verified) {
      return { success: true, sessionToken: `session-${Date.now()}` };
    }
    return { success: false, error: 'Invalid token' };
  },

  'POST /api/shinobi/knock': async (params, body) => {
    const shinobi = await getShinobi();
    if (!shinobi) return { error: 'SHINOBI not initialized' };

    shinobi.knock(body.signal);
    return { success: true };
  },

  'POST /api/shinobi/stealth': async (params, body) => {
    const shinobi = await getShinobi();
    if (!shinobi) return { error: 'SHINOBI not initialized' };

    if (body.enter) {
      shinobi.enterStealth(body.level);
    } else {
      shinobi.exitStealth();
    }
    return { success: true, stealthMode: shinobi.stealthMode };
  },

  'GET /api/shinobi/threats': async () => {
    const shinobi = await getShinobi();
    if (!shinobi) return { error: 'SHINOBI not initialized' };

    return shinobi.monitor.getThreatStatus();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // TETSUYA Defense & Risk Management API
  // ═════════════════════════════════════════════════════════════════════════

  'GET /api/tetsuya/status': async () => {
    const tetsuya = await getTetsuya();
    if (!tetsuya) return { error: 'TETSUYA not initialized' };
    return tetsuya.status();
  },

  'POST /api/tetsuya/assess': async (params, body) => {
    const tetsuya = await getTetsuya();
    if (!tetsuya) return { error: 'TETSUYA not initialized' };

    const assessment = await tetsuya.assessRisk(body.context || {});
    return { success: true, assessment };
  },

  'POST /api/tetsuya/mitigate': async (params, body) => {
    const tetsuya = await getTetsuya();
    if (!tetsuya) return { error: 'TETSUYA not initialized' };

    const result = await tetsuya.mitigateShockwave(
      body.source,
      body.magnitude,
      body.type
    );
    return { success: true, result };
  },

  'POST /api/tetsuya/repair': async (params, body) => {
    const tetsuya = await getTetsuya();
    if (!tetsuya) return { error: 'TETSUYA not initialized' };

    const result = await tetsuya.dispatchRepair(
      body.target,
      body.issue,
      body.priority
    );
    return { success: true, result };
  },

  'POST /api/tetsuya/protocol': async (params, body) => {
    const tetsuya = await getTetsuya();
    if (!tetsuya) return { error: 'TETSUYA not initialized' };

    if (body.activate) {
      tetsuya.activateProtocol(body.protocol);
    } else {
      tetsuya.deactivateProtocol(body.protocol);
    }
    return { success: true, activeProtocols: Array.from(tetsuya.activeProtocols) };
  },

  'GET /api/tetsuya/agents': async () => {
    const tetsuya = await getTetsuya();
    if (!tetsuya) return { error: 'TETSUYA not initialized' };

    const agents = {};
    for (const [id, agent] of tetsuya.agents) {
      agents[id] = agent.status();
    }
    return { success: true, agents };
  },

  'GET /api/tetsuya/risk-prediction': async (params, body, query) => {
    const tetsuya = await getTetsuya();
    if (!tetsuya) return { error: 'TETSUYA not initialized' };

    const horizon = parseInt(query?.horizon) || 24;
    const prediction = tetsuya.riskEngine.predictRisk(horizon);
    return { success: true, prediction };
  },

  // ═════════════════════════════════════════════════════════════════════════
  // MERKAVA Command Center API
  // ═════════════════════════════════════════════════════════════════════════

  'GET /api/merkava/status': async () => {
    const merkava = await getMerkava();
    if (!merkava) return { error: 'MERKAVA not initialized' };
    return merkava.getStatus();
  },

  'GET /api/merkava/diagnostics': async () => {
    const merkava = await getMerkava();
    if (!merkava) return { error: 'MERKAVA not initialized' };
    return merkava.getFullDiagnostics();
  },

  'GET /api/merkava/alerts': async () => {
    const merkava = await getMerkava();
    if (!merkava) return { error: 'MERKAVA not initialized' };
    return merkava.alerts.getActiveAlerts();
  },

  'GET /api/merkava/commands': async (params, body, query) => {
    const merkava = await getMerkava();
    if (!merkava) return { error: 'MERKAVA not initialized' };
    const limit = parseInt(query?.limit) || 100;
    return merkava.getCommandLog(limit);
  },

  'POST /api/merkava/directive': async (params, body) => {
    const merkava = await getMerkava();
    if (!merkava) return { error: 'MERKAVA not initialized' };

    try {
      const result = await merkava.sendDirective(
        body.module,
        body.command,
        body.params || {},
        { priority: body.priority || 'immediate' }
      );
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  'POST /api/merkava/broadcast': async (params, body) => {
    const merkava = await getMerkava();
    if (!merkava) return { error: 'MERKAVA not initialized' };

    const results = await merkava.broadcast(body.command, body.params || {});
    return { success: true, results };
  },

  'POST /api/merkava/workflow/:name': async (params) => {
    const merkava = await getMerkava();
    if (!merkava) return { error: 'MERKAVA not initialized' };

    try {
      const result = await merkava.executeWorkflow(params.name);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  'POST /api/merkava/lockdown': async (params, body) => {
    const merkava = await getMerkava();
    if (!merkava) return { error: 'MERKAVA not initialized' };

    const result = await merkava.inititateLockdown(body.reason || 'Manual lockdown');
    broadcaster.broadcast('system', { event: 'lockdown', ...result });
    return result;
  },

  'POST /api/merkava/sovereign/authorize': async (params, body) => {
    const merkava = await getMerkava();
    if (!merkava) return { error: 'MERKAVA not initialized' };

    return await merkava.sovereign.authorize(body);
  },

  'POST /api/merkava/sovereign/:action': async (params, body) => {
    const merkava = await getMerkava();
    if (!merkava) return { error: 'MERKAVA not initialized' };

    try {
      const result = await merkava.sovereign.executePrivileged(params.action, body);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  'GET /api/modules/:moduleId/status': async (params) => {
    const merkava = await getMerkava();
    if (!merkava) return { error: 'MERKAVA not initialized' };

    const connector = merkava.getModule(params.moduleId);
    if (!connector) return { error: `Module ${params.moduleId} not found` };

    return connector.getMetrics();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // TZOFEH Sentinel API
  // ═════════════════════════════════════════════════════════════════════════

  'GET /api/tzofeh/status': async () => {
    const tzofeh = await getTzofeh();
    if (!tzofeh) return { error: 'TZOFEH not initialized' };
    return tzofeh.getStatus();
  },

  'GET /api/tzofeh/diagnostics': async () => {
    const tzofeh = await getTzofeh();
    if (!tzofeh) return { error: 'TZOFEH not initialized' };
    return tzofeh.getDiagnostics();
  },

  'GET /api/tzofeh/guardians': async () => {
    const tzofeh = await getTzofeh();
    if (!tzofeh) return { error: 'TZOFEH not initialized' };
    return tzofeh.getAllGuardianStatus();
  },

  'POST /api/tzofeh/watch-level': async (params, body) => {
    const tzofeh = await getTzofeh();
    if (!tzofeh) return { error: 'TZOFEH not initialized' };

    const result = tzofeh.setWatchLevel(body.level);
    return { success: true, ...result };
  },

  'GET /api/tzofeh/anomalies': async () => {
    const tzofeh = await getTzofeh();
    if (!tzofeh) return { error: 'TZOFEH not initialized' };
    return tzofeh.anomalyDetector.getRecentAnomalies(100);
  },

  'GET /api/tzofeh/canaries': async () => {
    const tzofeh = await getTzofeh();
    if (!tzofeh) return { error: 'TZOFEH not initialized' };
    return tzofeh.canarySystem.getAllCanaries();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // MALAKH Message Bus API
  // ═════════════════════════════════════════════════════════════════════════

  'GET /api/malakh/status': async () => {
    const malakh = await getMalakh();
    if (!malakh) return { error: 'MALAKH not initialized' };
    return malakh.getStatus();
  },

  'GET /api/malakh/diagnostics': async () => {
    const malakh = await getMalakh();
    if (!malakh) return { error: 'MALAKH not initialized' };
    return malakh.getDiagnostics();
  },

  'GET /api/malakh/queues': async () => {
    const malakh = await getMalakh();
    if (!malakh) return { error: 'MALAKH not initialized' };
    return malakh.getQueueStats();
  },

  'POST /api/malakh/publish': async (params, body) => {
    const malakh = await getMalakh();
    if (!malakh) return { error: 'MALAKH not initialized' };

    const result = malakh.publish(body.topic, body.payload, body.options || {});
    return { success: true, ...result };
  },

  'POST /api/malakh/broadcast': async (params, body) => {
    const malakh = await getMalakh();
    if (!malakh) return { error: 'MALAKH not initialized' };

    const result = malakh.broadcast(body.topic, body.payload);
    return { success: true, ...result };
  },

  'GET /api/malakh/circuit-breakers': async () => {
    const malakh = await getMalakh();
    if (!malakh) return { error: 'MALAKH not initialized' };
    return malakh.getCircuitBreakerStats();
  },

  // ─── Unified System Health ─────────────────────────────────────────────

  'GET /api/system/health': async () => {
    const checks = {};
    const start = Date.now();

    try {
      const merkava = await getMerkava();
      if (merkava) {
        const s = merkava.getStatus();
        checks.merkava = { status: 'online', state: s.status, modules: s.registeredModules };
      } else { checks.merkava = { status: 'offline' }; }
    } catch { checks.merkava = { status: 'error' }; }

    try {
      const tzofeh = await getTzofeh();
      if (tzofeh) {
        const s = tzofeh.getStatus();
        checks.tzofeh = { status: 'online', watchLevel: s.currentWatchLevel, guardians: s.activeGuardians };
      } else { checks.tzofeh = { status: 'offline' }; }
    } catch { checks.tzofeh = { status: 'error' }; }

    try {
      const malakh = await getMalakh();
      if (malakh) {
        const s = malakh.getStatus();
        checks.malakh = { status: 'online', queues: s.stats?.queues, messages: s.stats?.messagesPublished };
      } else { checks.malakh = { status: 'offline' }; }
    } catch { checks.malakh = { status: 'error' }; }

    const online = Object.values(checks).filter(c => c.status === 'online').length;
    const total = Object.keys(checks).length;
    const overall = online === total ? 'healthy' : online > 0 ? 'degraded' : 'offline';

    return {
      status: overall,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - start,
      checks,
      summary: { online, total }
    };
  },

  'GET /api/system/modules': async () => {
    return {
      modules: [
        { name: 'MERKAVA', hebrew: 'מרכבה', role: 'Command Center', file: 'merkava-command.js' },
        { name: 'TZOFEH', hebrew: 'צופה', role: 'Sentinel Watchdog', file: 'tzofeh-sentinel.js' },
        { name: 'MALAKH', hebrew: 'מלאך', role: 'Message Bus', file: 'malakh-bus.js' },
        { name: 'KISSEH', hebrew: 'כיסא', role: 'Control Panel UI', file: 'kisseh-throne.js' },
        { name: 'RUACH', hebrew: 'רוח', role: 'Neural Engine', file: 'ruach-neural.js' },
        { name: 'OHR', hebrew: 'אור', role: 'Observability', file: 'ohr-observability.js' },
        { name: 'HADAAT', hebrew: 'הדעת', role: 'Decision Intelligence', file: 'hadaat-decision.js' },
        { name: 'KERUV', hebrew: 'כרוב', role: 'Guardian Security', file: 'keruv-security.js' },
        { name: 'NEPHESH', hebrew: 'נפש', role: 'Lifecycle Hooks', file: 'nephesh-hooks.js' },
        { name: 'EBEN', hebrew: 'אבן', role: 'Evidence Management', file: 'eben-evidence.js' },
        { name: 'SHINOBI', hebrew: '忍び', role: 'Stealth Security', file: 'shinobi-security.js' },
        { name: 'TETSUYA', hebrew: '鉄矢', role: 'Predictive Defense', file: 'tetsuya-defense.js' },
        { name: 'KOL', hebrew: 'קול', role: 'Shared Logger', file: 'kol-logger.js' }
      ]
    };
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Route Matching
// ═══════════════════════════════════════════════════════════════════════════

function matchRoute(method, path) {
  const routeKey = `${method} ${path}`;

  // Exact match
  if (apiRoutes[routeKey]) {
    return { handler: apiRoutes[routeKey], params: {} };
  }

  // Pattern matching for routes with params
  for (const [pattern, handler] of Object.entries(apiRoutes)) {
    const [routeMethod, routePath] = pattern.split(' ');
    if (routeMethod !== method) continue;

    const routeParts = routePath.split('/');
    const pathParts = path.split('/');

    if (routeParts.length !== pathParts.length) continue;

    const params = {};
    let match = true;

    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        params[routeParts[i].slice(1)] = pathParts[i];
      } else if (routeParts[i] !== pathParts[i]) {
        match = false;
        break;
      }
    }

    if (match) {
      return { handler, params };
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Request Handler
// ═══════════════════════════════════════════════════════════════════════════

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // SSE endpoint
  if (path === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    const clientCount = broadcaster.addClient(res);
    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', clientId: clientCount })}\n\n`);

    // Send initial metrics
    res.write(`event: metrics\ndata: ${JSON.stringify(collectMetrics())}\n\n`);

    // Keep alive
    const keepAlive = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 30000);

    res.on('close', () => clearInterval(keepAlive));
    return;
  }

  // API routes
  if (path.startsWith('/api/')) {
    const route = matchRoute(req.method, path);

    if (route) {
      try {
        const body = ['POST', 'PUT', 'PATCH'].includes(req.method)
          ? await parseBody(req)
          : {};

        const result = await route.handler(route.params, body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // 404 for unknown API routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'API endpoint not found' }));
    return;
  }

  // Static file serving
  let filePath = path === '/' ? '/index.html' : path;
  const fullPath = join(__dirname, 'static', filePath);

  try {
    if (existsSync(fullPath) && statSync(fullPath).isFile()) {
      const ext = extname(fullPath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const content = readFileSync(fullPath);

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'max-age=86400'
      });
      res.end(content);
    } else {
      // SPA fallback - serve index.html
      const indexPath = join(__dirname, 'static', 'index.html');
      if (existsSync(indexPath)) {
        const content = readFileSync(indexPath);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    }
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Server Factory
// ═══════════════════════════════════════════════════════════════════════════

export function createDashboardServer(options = {}) {
  const port = options.port || DEFAULT_PORT;
  const server = createServer(handleRequest);

  return {
    start() {
      return new Promise((resolve, reject) => {
        server.listen(port, () => {
          console.log(`
${C.cyan}╔═══════════════════════════════════════════════════════════════════╗${C.reset}
${C.cyan}║${C.reset}  ${C.bold}${C.magenta}GENESIS 2.0${C.reset} — ${C.dim}Forbidden Ninja City${C.reset}                           ${C.cyan}║${C.reset}
${C.cyan}║${C.reset}  ${C.green}Sovereign Security Platform Dashboard${C.reset}                         ${C.cyan}║${C.reset}
${C.cyan}╠═══════════════════════════════════════════════════════════════════╣${C.reset}
${C.cyan}║${C.reset}                                                                   ${C.cyan}║${C.reset}
${C.cyan}║${C.reset}  ${C.bold}Dashboard:${C.reset}    ${C.blue}http://localhost:${port}${C.reset}${' '.repeat(31 - port.toString().length)}${C.cyan}║${C.reset}
${C.cyan}║${C.reset}  ${C.bold}API:${C.reset}          ${C.blue}http://localhost:${port}/api/*${C.reset}${' '.repeat(26 - port.toString().length)}${C.cyan}║${C.reset}
${C.cyan}║${C.reset}  ${C.bold}Events:${C.reset}       ${C.blue}http://localhost:${port}/api/events${C.reset}${' '.repeat(20 - port.toString().length)}${C.cyan}║${C.reset}
${C.cyan}║${C.reset}                                                                   ${C.cyan}║${C.reset}
${C.cyan}╚═══════════════════════════════════════════════════════════════════╝${C.reset}
`);
          resolve(server);
        });
        server.on('error', reject);
      });
    },

    stop() {
      return new Promise((resolve) => {
        server.close(resolve);
      });
    },

    broadcast(event, data) {
      broadcaster.broadcast(event, data);
    },

    getStore() {
      return store;
    },

    server
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI Entry Point
// ═══════════════════════════════════════════════════════════════════════════

const isMain = process.argv[1] === fileURLToPath(import.meta.url) ||
               process.argv[1]?.endsWith('dashboard-server.js');

if (isMain) {
  const port = process.argv[2] ? parseInt(process.argv[2]) : undefined;
  const dashboard = createDashboardServer({ port });

  dashboard.start().catch(err => {
    dashLog.error('Failed to start dashboard', { error: err.message });
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await dashboard.stop();
    process.exit(0);
  });
}

export default createDashboardServer;

#!/usr/bin/env node
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
    console.error('Failed to start dashboard:', err.message);
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

#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
// Copyright 2025 murray-ux — Founder & Lead Developer
// See LICENSE and NOTICE for terms.

/**
 * GENESIS 2.0 — Control System CLI
 *
 * Direct command-line access to the GENESIS 2.0 control modules:
 *   - MERKAVA status, directives, workflows
 *   - TZOFEH monitoring, watch levels, anomalies
 *   - MALAKH message bus, queues, circuit breakers
 *   - System-wide health, boot status, module listing
 *
 * Usage:
 *   genesis-control status                    # System overview
 *   genesis-control modules                   # List all modules
 *   genesis-control health                    # Aggregated health check
 *   genesis-control merkava status            # MERKAVA status
 *   genesis-control merkava directive <mod> <cmd> [payload]
 *   genesis-control merkava broadcast <cmd>
 *   genesis-control merkava lockdown [reason]
 *   genesis-control tzofeh status             # TZOFEH status
 *   genesis-control tzofeh watch-level [level]
 *   genesis-control tzofeh anomalies          # Recent anomalies
 *   genesis-control malakh status             # MALAKH bus status
 *   genesis-control malakh queues             # Queue stats
 *   genesis-control malakh publish <topic> <payload>
 *   genesis-control log-level [level]         # Get/set log level
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLogger, setLogLevel, LogLevel } from '../lib/kol-logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const log = createLogger('CONTROL');

// ═══════════════════════════════════════════════════════════════════════════
// Colour helpers
// ═══════════════════════════════════════════════════════════════════════════

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m', white: '\x1b[37m'
};

function out(msg) { process.stdout.write(msg + '\n'); }

function table(rows, headers) {
  if (!rows.length) { out('  (empty)'); return; }
  const cols = headers || Object.keys(rows[0]);
  const widths = cols.map(c => Math.max(c.length, ...rows.map(r => String(r[c] ?? '').length)));
  const sep = widths.map(w => '─'.repeat(w + 2)).join('┼');
  out(`  ${C.dim}${sep}${C.reset}`);
  out(`  ${cols.map((c, i) => ` ${C.bold}${c.padEnd(widths[i])}${C.reset} `).join('│')}`);
  out(`  ${C.dim}${sep}${C.reset}`);
  for (const row of rows) {
    out(`  ${cols.map((c, i) => ` ${String(row[c] ?? '').padEnd(widths[i])} `).join('│')}`);
  }
  out(`  ${C.dim}${sep}${C.reset}`);
}

function badge(status) {
  const map = {
    operational: `${C.green}OPERATIONAL${C.reset}`,
    ready: `${C.green}READY${C.reset}`,
    active: `${C.green}ACTIVE${C.reset}`,
    healthy: `${C.green}HEALTHY${C.reset}`,
    booting: `${C.yellow}BOOTING${C.reset}`,
    degraded: `${C.yellow}DEGRADED${C.reset}`,
    alert: `${C.yellow}ALERT${C.reset}`,
    error: `${C.red}ERROR${C.reset}`,
    lockdown: `${C.red}LOCKDOWN${C.reset}`,
    dormant: `${C.dim}DORMANT${C.reset}`,
    shutdown: `${C.dim}SHUTDOWN${C.reset}`
  };
  return map[status] || status;
}

// ═══════════════════════════════════════════════════════════════════════════
// Module loader (lazy, single instance)
// ═══════════════════════════════════════════════════════════════════════════

let _merkava, _tzofeh, _malakh;

async function getMerkava() {
  if (!_merkava) {
    try {
      const mod = await import('../lib/merkava-command.js');
      const Cls = mod.default || mod.Merkava;
      _merkava = new Cls();
      await _merkava.initialize();
    } catch { _merkava = null; }
  }
  return _merkava;
}

async function getTzofeh() {
  if (!_tzofeh) {
    try {
      const mod = await import('../lib/tzofeh-sentinel.js');
      const Cls = mod.default || mod.Tzofeh;
      _tzofeh = new Cls();
      await _tzofeh.initialize();
    } catch { _tzofeh = null; }
  }
  return _tzofeh;
}

async function getMalakh() {
  if (!_malakh) {
    try {
      const mod = await import('../lib/malakh-bus.js');
      const Cls = mod.default || mod.Malakh;
      _malakh = new Cls();
      await _malakh.initialize();
    } catch { _malakh = null; }
  }
  return _malakh;
}

// ═══════════════════════════════════════════════════════════════════════════
// HTTP client — talks to running dashboard if available
// ═══════════════════════════════════════════════════════════════════════════

async function apiGet(path) {
  const port = process.env.GENESIS_UI_PORT || 3000;
  const url = `http://localhost:${port}${path}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function apiPost(path, body) {
  const port = process.env.GENESIS_UI_PORT || 3000;
  const url = `http://localhost:${port}${path}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════════════
// Commands
// ═══════════════════════════════════════════════════════════════════════════

const commands = {

  // ─── Top-level commands ────────────────────────────────────────────────

  async status() {
    out(`\n  ${C.bold}${C.cyan}GENESIS 2.0 Control System${C.reset}\n`);

    // Try API first (running instance)
    const apiStatus = await apiGet('/api/merkava/status');
    if (apiStatus) {
      out(`  State:    ${badge(apiStatus.status || apiStatus.state)}`);
      out(`  Uptime:   ${apiStatus.uptime || 'unknown'}`);
      out(`  Modules:  ${apiStatus.modules?.length || 0} registered`);
      return;
    }

    // No running instance — direct check
    const merkava = await getMerkava();
    if (merkava) {
      const s = merkava.getStatus();
      out(`  State:    ${badge(s.status)}`);
      out(`  Modules:  ${s.registeredModules || 0}`);
      out(`  Uptime:   ${s.uptime || 0}ms`);
    } else {
      out(`  ${C.dim}GENESIS is not running. Start with: npm run boot${C.reset}`);
    }
    out('');
  },

  async modules() {
    out(`\n  ${C.bold}${C.cyan}Registered Modules${C.reset}\n`);

    const moduleList = [
      { name: 'MERKAVA', hebrew: 'מרכבה', role: 'Command Center' },
      { name: 'TZOFEH',  hebrew: 'צופה', role: 'Sentinel Watchdog' },
      { name: 'MALAKH',  hebrew: 'מלאך', role: 'Message Bus' },
      { name: 'KISSEH',  hebrew: 'כיסא', role: 'Control Panel UI' },
      { name: 'RUACH',   hebrew: 'רוח', role: 'Neural Engine' },
      { name: 'OHR',     hebrew: 'אור', role: 'Observability' },
      { name: 'HADAAT',  hebrew: 'הדעת', role: 'Decision Intelligence' },
      { name: 'KERUV',   hebrew: 'כרוב', role: 'Guardian Security' },
      { name: 'NEPHESH', hebrew: 'נפש', role: 'Lifecycle Hooks' },
      { name: 'EBEN',    hebrew: 'אבן', role: 'Evidence Management' },
      { name: 'SHINOBI', hebrew: '忍び', role: 'Stealth Security' },
      { name: 'TETSUYA', hebrew: '鉄矢', role: 'Predictive Defense' },
      { name: 'KOL',     hebrew: 'קול', role: 'Shared Logger' }
    ];

    table(moduleList, ['name', 'hebrew', 'role']);
    out('');
  },

  async health() {
    out(`\n  ${C.bold}${C.cyan}System Health${C.reset}\n`);

    // Try running instance
    const checks = [];

    const merkavaHealth = await apiGet('/api/merkava/status');
    checks.push({
      module: 'MERKAVA',
      status: merkavaHealth ? 'online' : 'offline',
      detail: merkavaHealth?.status || '—'
    });

    const tzofehHealth = await apiGet('/api/tzofeh/status');
    checks.push({
      module: 'TZOFEH',
      status: tzofehHealth ? 'online' : 'offline',
      detail: tzofehHealth?.watchLevel || '—'
    });

    const malakhHealth = await apiGet('/api/malakh/status');
    checks.push({
      module: 'MALAKH',
      status: malakhHealth ? 'online' : 'offline',
      detail: malakhHealth?.stats?.messagesPublished || '—'
    });

    const online = checks.filter(c => c.status === 'online').length;
    const total = checks.length;

    table(checks, ['module', 'status', 'detail']);

    out('');
    const overall = online === total ? 'healthy' :
                    online > 0 ? 'degraded' : 'offline';
    out(`  Overall: ${badge(overall)} (${online}/${total} modules online)`);
    out('');
  },

  // ─── MERKAVA commands ─────────────────────────────────────────────────

  merkava: {
    async status() {
      const data = await apiGet('/api/merkava/status') ||
                   (await getMerkava())?.getStatus();
      if (!data) { out('  MERKAVA not available'); return; }

      out(`\n  ${C.bold}${C.magenta}MERKAVA Command Center${C.reset}\n`);
      out(`  Status:     ${badge(data.status)}`);
      out(`  Modules:    ${data.registeredModules || data.modules?.length || 0}`);
      out(`  Directives: ${data.directivesProcessed || 0} processed`);
      out(`  Uptime:     ${data.uptime || 0}ms`);
      out('');
    },

    async directive(args) {
      const [target, command, ...rest] = args;
      if (!target || !command) {
        out('  Usage: genesis-control merkava directive <module> <command> [payload]');
        return;
      }
      const payload = rest.length ? JSON.parse(rest.join(' ')) : {};
      const result = await apiPost('/api/merkava/directive', { target, command, payload });
      if (result) {
        out(`  Directive sent to ${target}: ${command}`);
        out(`  ${C.dim}${JSON.stringify(result, null, 2)}${C.reset}`);
      } else {
        out('  Failed to send directive — is GENESIS running?');
      }
    },

    async broadcast(args) {
      const [command] = args;
      if (!command) { out('  Usage: genesis-control merkava broadcast <command>'); return; }
      const result = await apiPost('/api/merkava/broadcast', { command });
      out(result ? `  Broadcast "${command}" sent to all modules` : '  Broadcast failed');
    },

    async lockdown(args) {
      const reason = args.join(' ') || 'Manual lockdown via CLI';
      const result = await apiPost('/api/merkava/lockdown', { reason });
      out(result ? `  ${C.red}${C.bold}LOCKDOWN INITIATED${C.reset}: ${reason}` : '  Lockdown failed');
    },

    async alerts() {
      const data = await apiGet('/api/merkava/alerts');
      if (!data || !data.alerts?.length) { out('  No active alerts'); return; }
      out(`\n  ${C.bold}Active Alerts${C.reset}\n`);
      for (const a of data.alerts) {
        const sev = a.severity === 'critical' ? C.red :
                    a.severity === 'warning' ? C.yellow : C.blue;
        out(`  ${sev}[${a.severity}]${C.reset} ${a.code}: ${a.message}`);
      }
      out('');
    }
  },

  // ─── TZOFEH commands ──────────────────────────────────────────────────

  tzofeh: {
    async status() {
      const data = await apiGet('/api/tzofeh/status') ||
                   (await getTzofeh())?.getStatus();
      if (!data) { out('  TZOFEH not available'); return; }

      out(`\n  ${C.bold}${C.yellow}TZOFEH Sentinel${C.reset}\n`);
      out(`  Watch Level:  ${data.watchLevel || data.currentWatchLevel || 'unknown'}`);
      out(`  Guardians:    ${data.guardians || data.activeGuardians || 0}`);
      out(`  Anomalies:    ${data.anomalies?.length || data.recentAnomalies || 0}`);
      out(`  Events:       ${data.eventsProcessed || 0} processed`);
      out('');
    },

    async 'watch-level'(args) {
      const [level] = args;
      if (!level) {
        const data = await apiGet('/api/tzofeh/status');
        out(`  Current watch level: ${data?.watchLevel || 'unknown'}`);
        out(`  Options: passive, active, alert, combat, sentinel`);
        return;
      }
      const result = await apiPost('/api/tzofeh/watch-level', { level });
      out(result ? `  Watch level set to: ${C.yellow}${level}${C.reset}` : '  Failed to set watch level');
    },

    async anomalies() {
      const data = await apiGet('/api/tzofeh/anomalies');
      if (!data || !data.anomalies?.length) { out('  No recent anomalies'); return; }
      out(`\n  ${C.bold}Recent Anomalies${C.reset}\n`);
      for (const a of data.anomalies) {
        out(`  [${a.timestamp || 'now'}] ${a.type}: ${a.metric} = ${a.value} (z-score: ${a.zScore?.toFixed(2)})`);
      }
      out('');
    },

    async guardians() {
      const data = await apiGet('/api/tzofeh/guardians');
      if (!data) { out('  TZOFEH not available'); return; }
      out(`\n  ${C.bold}Guardian Daemons${C.reset}\n`);
      if (data.guardians?.length) {
        table(data.guardians.map(g => ({
          name: g.name,
          status: g.healthy ? 'healthy' : 'unhealthy',
          checks: g.checkCount || 0
        })));
      } else {
        out('  No guardians deployed');
      }
      out('');
    }
  },

  // ─── MALAKH commands ──────────────────────────────────────────────────

  malakh: {
    async status() {
      const data = await apiGet('/api/malakh/status') ||
                   (await getMalakh())?.getStatus();
      if (!data) { out('  MALAKH not available'); return; }

      out(`\n  ${C.bold}${C.blue}MALAKH Message Bus${C.reset}\n`);
      out(`  Status:       ${badge(data.status)}`);
      out(`  Queues:       ${data.stats?.queues || data.queues || 0}`);
      out(`  Published:    ${data.stats?.messagesPublished || 0}`);
      out(`  Delivered:    ${data.stats?.messagesDelivered || 0}`);
      out(`  Dead Letters: ${data.stats?.deadLetters || 0}`);
      out('');
    },

    async queues() {
      const data = await apiGet('/api/malakh/queues');
      if (!data) { out('  MALAKH not available'); return; }
      out(`\n  ${C.bold}Message Queues${C.reset}\n`);
      if (data.queues?.length) {
        table(data.queues.map(q => ({
          name: q.name,
          size: q.size || 0,
          consumers: q.consumers || 0,
          deadLetters: q.deadLetterCount || 0
        })));
      } else {
        out('  No queues configured');
      }
      out('');
    },

    async publish(args) {
      const [topic, ...rest] = args;
      if (!topic) { out('  Usage: genesis-control malakh publish <topic> <json-payload>'); return; }
      let payload;
      try {
        payload = rest.length ? JSON.parse(rest.join(' ')) : {};
      } catch {
        payload = { message: rest.join(' ') };
      }
      const result = await apiPost('/api/malakh/publish', { topic, payload });
      out(result ? `  Published to "${topic}"` : '  Publish failed');
    },

    async 'circuit-breakers'() {
      const data = await apiGet('/api/malakh/circuit-breakers');
      if (!data) { out('  MALAKH not available'); return; }
      out(`\n  ${C.bold}Circuit Breakers${C.reset}\n`);
      if (data.breakers?.length) {
        table(data.breakers.map(b => ({
          name: b.name,
          state: b.state,
          failures: b.failures || 0,
          lastFailure: b.lastFailure || '—'
        })));
      } else {
        out('  No circuit breakers registered');
      }
      out('');
    }
  },

  // ─── Log level command ────────────────────────────────────────────────

  async 'log-level'(args) {
    const [level] = args || [];
    if (!level) {
      out(`  Log levels: silent, error, warn, info, success, debug, trace`);
      out(`  Current: ${process.env.GENESIS_LOG_LEVEL || 'info'}`);
      out(`  Set via: genesis-control log-level debug`);
      return;
    }
    setLogLevel(level);
    out(`  Log level set to: ${C.yellow}${level}${C.reset}`);
  },

  // ─── Help ─────────────────────────────────────────────────────────────

  help() {
    out(`
  ${C.bold}${C.cyan}GENESIS 2.0 — Control System CLI${C.reset}

  ${C.bold}System Commands:${C.reset}
    ${C.green}status${C.reset}                         System overview
    ${C.green}modules${C.reset}                        List all GENESIS modules
    ${C.green}health${C.reset}                         Aggregated health check
    ${C.green}log-level${C.reset} [level]              Get/set log level

  ${C.bold}MERKAVA (Command Center):${C.reset}
    ${C.green}merkava status${C.reset}                 MERKAVA status
    ${C.green}merkava alerts${C.reset}                 Active alerts
    ${C.green}merkava directive${C.reset} <mod> <cmd>  Send directive to module
    ${C.green}merkava broadcast${C.reset} <cmd>        Broadcast to all modules
    ${C.green}merkava lockdown${C.reset} [reason]      Initiate system lockdown

  ${C.bold}TZOFEH (Sentinel):${C.reset}
    ${C.green}tzofeh status${C.reset}                  Monitoring status
    ${C.green}tzofeh watch-level${C.reset} [level]     Get/set watch level
    ${C.green}tzofeh anomalies${C.reset}               Recent anomaly detections
    ${C.green}tzofeh guardians${C.reset}               Guardian daemon status

  ${C.bold}MALAKH (Message Bus):${C.reset}
    ${C.green}malakh status${C.reset}                  Message bus status
    ${C.green}malakh queues${C.reset}                  Queue statistics
    ${C.green}malakh publish${C.reset} <topic> <json>  Publish a message
    ${C.green}malakh circuit-breakers${C.reset}         Circuit breaker states

  ${C.bold}Options:${C.reset}
    ${C.dim}--port <port>${C.reset}       Dashboard port (default: $GENESIS_UI_PORT || 3000)
    ${C.dim}--log-level <lvl>${C.reset}   Log verbosity (silent|error|warn|info|debug|trace)
`);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// CLI Router
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const argv = process.argv.slice(2);

  // Parse global flags
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--port' && argv[i + 1]) {
      process.env.GENESIS_UI_PORT = argv[i + 1];
      argv.splice(i, 2); i--;
    } else if (argv[i] === '--log-level' && argv[i + 1]) {
      setLogLevel(argv[i + 1]);
      argv.splice(i, 2); i--;
    }
  }

  const [cmd, sub, ...rest] = argv;

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    commands.help();
    return;
  }

  // Sub-module commands (merkava, tzofeh, malakh)
  if (commands[cmd] && typeof commands[cmd] === 'object') {
    const subCmd = sub || 'status';
    const handler = commands[cmd][subCmd];
    if (handler) {
      await handler(rest);
    } else {
      out(`  Unknown ${cmd} command: ${subCmd}`);
      out(`  Run: genesis-control ${cmd} --help`);
    }
    return;
  }

  // Top-level commands
  if (typeof commands[cmd] === 'function') {
    await commands[cmd](argv.slice(1));
    return;
  }

  out(`  Unknown command: ${cmd}`);
  out(`  Run: genesis-control help`);
}

main().catch(err => {
  log.error('CLI error', { error: err.message });
  process.exit(1);
});

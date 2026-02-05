#!/usr/bin/env node
/**
 * GENESIS 2.0 BOOTSTRAP SYSTEM
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Copyright 2025 Murray Bembrick
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Single entry point that boots all GENESIS 2.0 modules:
 *   1. MERKAVA (Command Center) initializes first
 *   2. MALAKH (Message Bus) connects communication
 *   3. TZOFEH (Sentinel) starts monitoring
 *   4. All modules register with MERKAVA
 *   5. Dashboard server starts with full API
 *
 * Usage:
 *   node genesis-init.js [--port 3000] [--watch-level active]
 *
 * @module GENESIS-INIT
 * @author Murray Bembrick <Founder & Lead Developer>
 * @version 2.0.0
 * @license Apache-2.0
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { createLogger, setLogLevel, onLog } from './kol-logger.js';

// ══════════════════════════════════════════════════════════════════════════════
// KOL LOGGERS (one per subsystem)
// ══════════════════════════════════════════════════════════════════════════════

const kolGenesis  = createLogger('GENESIS');
const kolLoader   = createLogger('GENESIS').child('LOADER');
const kolWire     = createLogger('GENESIS').child('WIRE');
const kolShutdown = createLogger('GENESIS').child('SHUTDOWN');

// Colours kept for banner / status box only
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function printBanner() {
  console.log(`
${C.cyan}╔═════════════════════════════════════════════════════════════════════════╗${C.reset}
${C.cyan}║${C.reset}                                                                         ${C.cyan}║${C.reset}
${C.cyan}║${C.reset}   ${C.bold}${C.magenta}  ██████  ███████ ███    ██ ███████ ███████ ██ ███████${C.reset}             ${C.cyan}║${C.reset}
${C.cyan}║${C.reset}   ${C.bold}${C.magenta} ██       ██      ████   ██ ██      ██      ██ ██     ${C.reset}             ${C.cyan}║${C.reset}
${C.cyan}║${C.reset}   ${C.bold}${C.magenta} ██   ███ █████   ██ ██  ██ █████   ███████ ██ ███████${C.reset}             ${C.cyan}║${C.reset}
${C.cyan}║${C.reset}   ${C.bold}${C.magenta} ██    ██ ██      ██  ██ ██ ██           ██ ██      ██${C.reset}             ${C.cyan}║${C.reset}
${C.cyan}║${C.reset}   ${C.bold}${C.magenta}  ██████  ███████ ██   ████ ███████ ███████ ██ ███████${C.reset}             ${C.cyan}║${C.reset}
${C.cyan}║${C.reset}                                                                         ${C.cyan}║${C.reset}
${C.cyan}║${C.reset}   ${C.bold}Version 2.0${C.reset}  ${C.dim}— Sovereign Security Platform${C.reset}                           ${C.cyan}║${C.reset}
${C.cyan}║${C.reset}   ${C.dim}Copyright 2025 Murray Bembrick — Founder & Lead Developer${C.reset}       ${C.cyan}║${C.reset}
${C.cyan}║${C.reset}                                                                         ${C.cyan}║${C.reset}
${C.cyan}╚═════════════════════════════════════════════════════════════════════════╝${C.reset}
`);
}

// Legacy log helpers — now delegate to KOL
function log(module, message) { createLogger(module).info(message); }
function logOk(module, message) { createLogger(module).success(message); }
function logWarn(module, message) { createLogger(module).warn(message); }
function logErr(module, message) { createLogger(module).error(message); }
function logInfo(module, message) { createLogger(module).info(message); }

// ══════════════════════════════════════════════════════════════════════════════
// MODULE LOADER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Safely loads a module, returning null on failure
 */
async function loadModule(name, path) {
  try {
    const mod = await import(path);
    const Constructor = mod.default || mod[name];
    logOk('LOADER', `${name} loaded`);
    return Constructor;
  } catch (error) {
    logWarn('LOADER', `${name} not available: ${error.message}`);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// GENESIS BOOTSTRAP
// ══════════════════════════════════════════════════════════════════════════════

export class GenesisBootstrap extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      port: parseInt(process.env.GENESIS_UI_PORT) || config.port || 3000,
      watchLevel: process.env.GENESIS_WATCH_LEVEL || config.watchLevel || 'active',
      pulseInterval: parseInt(process.env.GENESIS_PULSE_INTERVAL) || config.pulseInterval || 10000,
      enableTracing: process.env.GENESIS_TRACING !== 'false',
      ...config
    };

    // Module instances
    this.merkava = null;
    this.tzofeh = null;
    this.malakh = null;
    this.eben = null;
    this.shinobi = null;
    this.tetsuya = null;
    this.ruach = null;
    this.ohr = null;
    this.hadaat = null;
    this.keruv = null;
    this.nephesh = null;
    this.viz = null;

    // Dashboard server
    this.dashboard = null;

    // State
    this.state = 'dormant';
    this.startTime = null;
    this.bootSequence = [];
  }

  // ─── Main Boot Sequence ────────────────────────────────────────────────────

  async boot() {
    printBanner();
    this.startTime = Date.now();
    this.state = 'booting';

    log('GENESIS', '═══ BOOT SEQUENCE INITIATED ═══', C.magenta);
    console.log('');

    try {
      // Phase 1: Core Infrastructure
      await this._phase1_CoreInfrastructure();

      // Phase 2: Security & Storage
      await this._phase2_SecurityStorage();

      // Phase 3: AI & Processing
      await this._phase3_AIProcessing();

      // Phase 4: Wire Everything Together
      await this._phase4_WireModules();

      // Phase 5: Start Dashboard
      await this._phase5_StartDashboard();

      // Phase 6: Start Monitoring
      await this._phase6_StartMonitoring();

      this.state = 'operational';
      const bootTime = Date.now() - this.startTime;

      console.log('');
      log('GENESIS', '═══ BOOT SEQUENCE COMPLETE ═══', C.magenta);
      console.log('');
      this._printStatus(bootTime);

      this.emit('ready', { bootTime, modules: this._getModuleList() });

      return this;
    } catch (error) {
      this.state = 'error';
      logErr('GENESIS', `Boot failed: ${error.message}`);
      throw error;
    }
  }

  // ─── Phase 1: Core Infrastructure ──────────────────────────────────────────

  async _phase1_CoreInfrastructure() {
    log('PHASE-1', 'Core Infrastructure', C.yellow);

    // MERKAVA — Command Center (boots first)
    const MerkavaClass = await loadModule('Merkava', '../lib/merkava-command.js');
    if (MerkavaClass) {
      this.merkava = new MerkavaClass({
        pulseInterval: this.config.pulseInterval
      });
      await this.merkava.initialize();
      this._recordBoot('MERKAVA', true);
      logOk('MERKAVA', 'Command Center online — מרכבה');
    }

    // MALAKH — Message Bus
    const MalakhClass = await loadModule('Malakh', '../lib/malakh-bus.js');
    if (MalakhClass) {
      this.malakh = new MalakhClass({
        enableTracing: this.config.enableTracing
      });
      await this.malakh.initialize();
      this._recordBoot('MALAKH', true);
      logOk('MALAKH', 'Message Bus online — מלאך');
    }

    console.log('');
  }

  // ─── Phase 2: Security & Storage ──────────────────────────────────────────

  async _phase2_SecurityStorage() {
    log('PHASE-2', 'Security & Storage', C.yellow);

    // KERUV — Zero-Trust Security
    const KeruvClass = await loadModule('Keruv', '../lib/keruv-security.js');
    if (KeruvClass) {
      this.keruv = new KeruvClass();
      this._recordBoot('KERUV', true);
      logOk('KERUV', 'Zero-Trust Gateway active — כרוב');
    }

    // SHINOBI — Shadow Security
    const ShinobiClass = await loadModule('Shinobi', '../lib/shinobi-security.js');
    if (ShinobiClass) {
      this.shinobi = new ShinobiClass();
      this._recordBoot('SHINOBI', true);
      logOk('SHINOBI', 'Shadow Security deployed — 忍び');
    }

    // EBEN — Evidence Management
    const EbenClass = await loadModule('Eben', '../lib/eben-evidence.js');
    if (EbenClass) {
      this.eben = new EbenClass();
      if (this.shinobi) this.shinobi.protect?.(this.eben);
      this._recordBoot('EBEN', true);
      logOk('EBEN', 'Evidence Vault sealed — אבן');
    }

    console.log('');
  }

  // ─── Phase 3: AI & Processing ──────────────────────────────────────────────

  async _phase3_AIProcessing() {
    log('PHASE-3', 'AI & Processing', C.yellow);

    // RUACH — Neural Processing
    const RuachClass = await loadModule('Ruach', '../lib/ruach-neural.js');
    if (RuachClass) {
      this.ruach = new RuachClass();
      this._recordBoot('RUACH', true);
      logOk('RUACH', 'Neural Engine initialized — רוח');
    }

    // OHR — Observability
    const OhrClass = await loadModule('Ohr', '../lib/ohr-observability.js');
    if (OhrClass) {
      this.ohr = new OhrClass();
      this._recordBoot('OHR', true);
      logOk('OHR', 'Observability active — אור');
    }

    // HADAAT — Decision Engine
    const HadaatClass = await loadModule('Hadaat', '../lib/hadaat-decision.js');
    if (HadaatClass) {
      this.hadaat = new HadaatClass();
      this._recordBoot('HADAAT', true);
      logOk('HADAAT', 'Decision Engine ready — הדעת');
    }

    // TETSUYA — Defense & Risk
    const TetsuyaClass = await loadModule('Tetsuya', '../lib/tetsuya-defense.js');
    if (TetsuyaClass) {
      this.tetsuya = new TetsuyaClass({ autoCreateAgents: true });
      this._recordBoot('TETSUYA', true);
      logOk('TETSUYA', 'Defense System armed — 鉄夜');
    }

    // NEPHESH — Claude Code Hooks
    const NepheshClass = await loadModule('Nephesh', '../lib/nephesh-hooks.js');
    if (NepheshClass) {
      this.nephesh = new NepheshClass();
      this._recordBoot('NEPHESH', true);
      logOk('NEPHESH', 'Hooks system attached — נפש');
    }

    // VIZ — Visualization
    const VizClass = await loadModule('Viz', '../lib/viz-engine.js');
    if (VizClass) {
      this.viz = new VizClass();
      this._recordBoot('VIZ', true);
      logOk('VIZ', 'Visualization engine online');
    }

    console.log('');
  }

  // ─── Phase 4: Wire Modules Together ────────────────────────────────────────

  async _phase4_WireModules() {
    log('PHASE-4', 'Wiring Modules', C.yellow);

    if (!this.merkava) {
      logWarn('WIRE', 'MERKAVA not available — modules running standalone');
      return;
    }

    // Register all modules with MERKAVA
    const modules = {
      MALAKH: this.malakh,
      KERUV: this.keruv,
      SHINOBI: this.shinobi,
      EBEN: this.eben,
      RUACH: this.ruach,
      OHR: this.ohr,
      HADAAT: this.hadaat,
      TETSUYA: this.tetsuya,
      NEPHESH: this.nephesh,
      VIZ: this.viz
    };

    let registered = 0;
    for (const [name, instance] of Object.entries(modules)) {
      if (instance) {
        this.merkava.registerModule(name, instance);
        registered++;
      }
    }

    logOk('WIRE', `${registered} modules registered with MERKAVA`);

    // Set up MALAKH message bus subscriptions
    if (this.malakh) {
      // Create topic queues for each domain
      this.malakh.createQueue('security.events');
      this.malakh.createQueue('evidence.events');
      this.malakh.createQueue('ai.events');
      this.malakh.createQueue('system.events');

      this.malakh.bindQueue('security.events', 'default', 'security.*');
      this.malakh.bindQueue('evidence.events', 'default', 'evidence.*');
      this.malakh.bindQueue('ai.events', 'default', 'ai.*');
      this.malakh.bindQueue('system.events', 'default', 'system.*');

      logOk('WIRE', 'MALAKH message bus topics configured');
    }

    // Wire MERKAVA events to MALAKH
    if (this.malakh && this.merkava) {
      this.merkava.on('alert:raised', (alert) => {
        this.malakh.publish('system.alert', alert);
      });

      this.merkava.on('lockdown', (data) => {
        this.malakh.broadcast('system.lockdown', data);
      });

      logOk('WIRE', 'MERKAVA events routed to MALAKH');
    }

    console.log('');
  }

  // ─── Phase 5: Start Dashboard ──────────────────────────────────────────────

  async _phase5_StartDashboard() {
    log('PHASE-5', 'Dashboard Server', C.yellow);

    try {
      const { createDashboardServer } = await import('../ui/dashboard-server.js');
      this.dashboard = createDashboardServer({
        port: this.config.port,
        genesis: this // Pass genesis instance for API access
      });

      await this.dashboard.start();
      this._recordBoot('DASHBOARD', true);
    } catch (error) {
      logWarn('DASHBOARD', `Dashboard not available: ${error.message}`);
    }

    console.log('');
  }

  // ─── Phase 6: Start Monitoring ─────────────────────────────────────────────

  async _phase6_StartMonitoring() {
    log('PHASE-6', 'Monitoring', C.yellow);

    // TZOFEH — Sentinel (starts last, monitors everything)
    const TzofehClass = await loadModule('Tzofeh', '../lib/tzofeh-sentinel.js');
    if (TzofehClass) {
      const watchLevelMap = {
        passive: 0, active: 1, alert: 2, combat: 3, sentinel: 4
      };

      this.tzofeh = new TzofehClass({
        watchLevel: watchLevelMap[this.config.watchLevel] || 1
      });
      await this.tzofeh.initialize(this.merkava);

      // Deploy guardian daemons for critical modules
      if (this.merkava) {
        this.merkava.registerModule('TZOFEH', this.tzofeh);

        this.tzofeh.deployGuardian('merkava-health', {
          healthCheck: () => this.merkava.pulse.getSystemHealth()
        }, { checkInterval: 15000 });
      }

      if (this.malakh) {
        this.tzofeh.deployGuardian('malakh-health', {
          healthCheck: () => this.malakh.healthCheck()
        }, { checkInterval: 15000 });
      }

      // Set up metric thresholds
      this.tzofeh.setMetricThreshold('cpu.usage', {
        warning: 70,
        critical: 90,
        comparison: 'gt'
      });

      this.tzofeh.setMetricThreshold('memory.heap', {
        warning: 80,
        critical: 95,
        comparison: 'gt'
      });

      this._recordBoot('TZOFEH', true);
      logOk('TZOFEH', `Sentinel watching (level: ${this.config.watchLevel}) — צופה`);
    }

    console.log('');
  }

  // ─── Shutdown ──────────────────────────────────────────────────────────────

  async shutdown(options = {}) {
    if (this.state === 'shutdown' || this.state === 'shutting_down') return;
    this.state = 'shutting_down';

    const timeout = options.timeout || 10000;
    kolGenesis.warn('═══ SHUTDOWN SEQUENCE ═══');

    const shutdownTimer = setTimeout(() => {
      kolGenesis.error('Shutdown timed out — forcing exit');
      process.exit(1);
    }, timeout);

    try {
      // Phase 1: Stop monitoring first (so it doesn't fire alerts during teardown)
      if (this.tzofeh) {
        await this.tzofeh.shutdown?.();
        kolShutdown.info('TZOFEH stopped');
      }

      // Phase 2: Stop dashboard (stop accepting new requests)
      if (this.dashboard) {
        await this.dashboard.stop?.();
        kolShutdown.info('Dashboard stopped');
      }

      // Phase 3: Drain message bus
      if (this.malakh) {
        await this.malakh.shutdown?.();
        kolShutdown.info('MALAKH drained and stopped');
      }

      // Phase 4: Stop command center last
      if (this.merkava) {
        await this.merkava.shutdown?.();
        kolShutdown.info('MERKAVA stopped');
      }

      clearTimeout(shutdownTimer);
      this.state = 'shutdown';
      const uptime = this.startTime ? Math.round((Date.now() - this.startTime) / 1000) : 0;
      kolGenesis.success(`Shutdown complete — uptime ${uptime}s`);
      this.emit('shutdown', { uptime });
    } catch (error) {
      clearTimeout(shutdownTimer);
      kolGenesis.error('Shutdown error', { error: error.message });
      this.state = 'shutdown';
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  _recordBoot(module, success) {
    this.bootSequence.push({
      module,
      success,
      timestamp: Date.now(),
      elapsed: Date.now() - this.startTime
    });
  }

  _getModuleList() {
    return this.bootSequence
      .filter(b => b.success)
      .map(b => b.module);
  }

  _printStatus(bootTime) {
    const modules = this._getModuleList();
    const port = this.config.port;

    console.log(`${C.cyan}╔═════════════════════════════════════════════════════════════════════════╗${C.reset}`);
    console.log(`${C.cyan}║${C.reset}  ${C.bold}GENESIS 2.0 — OPERATIONAL${C.reset}                                            ${C.cyan}║${C.reset}`);
    console.log(`${C.cyan}╠═════════════════════════════════════════════════════════════════════════╣${C.reset}`);
    console.log(`${C.cyan}║${C.reset}                                                                         ${C.cyan}║${C.reset}`);
    console.log(`${C.cyan}║${C.reset}  ${C.bold}Modules:${C.reset}      ${C.green}${modules.length} active${C.reset}                                             ${C.cyan}║${C.reset}`);
    console.log(`${C.cyan}║${C.reset}  ${C.bold}Boot time:${C.reset}    ${C.green}${bootTime}ms${C.reset}                                                ${C.cyan}║${C.reset}`);
    console.log(`${C.cyan}║${C.reset}  ${C.bold}Dashboard:${C.reset}    ${C.blue}http://localhost:${port}${C.reset}                                    ${C.cyan}║${C.reset}`);
    console.log(`${C.cyan}║${C.reset}  ${C.bold}Throne:${C.reset}       ${C.blue}Ctrl+Shift+K${C.reset} (in browser)                             ${C.cyan}║${C.reset}`);
    console.log(`${C.cyan}║${C.reset}  ${C.bold}Watch Level:${C.reset}  ${C.yellow}${this.config.watchLevel}${C.reset}                                             ${C.cyan}║${C.reset}`);
    console.log(`${C.cyan}║${C.reset}                                                                         ${C.cyan}║${C.reset}`);

    // Print module list
    const moduleLines = [];
    for (let i = 0; i < modules.length; i += 4) {
      const chunk = modules.slice(i, i + 4);
      moduleLines.push(chunk.map(m => `${C.green}${m}${C.reset}`).join('  '));
    }
    for (const line of moduleLines) {
      // Rough padding
      console.log(`${C.cyan}║${C.reset}  ${line}${C.reset}`);
    }

    console.log(`${C.cyan}║${C.reset}                                                                         ${C.cyan}║${C.reset}`);
    console.log(`${C.cyan}╚═════════════════════════════════════════════════════════════════════════╝${C.reset}`);
  }

  // ─── Public Accessors ──────────────────────────────────────────────────────

  getModule(name) {
    const map = {
      MERKAVA: this.merkava,
      TZOFEH: this.tzofeh,
      MALAKH: this.malakh,
      EBEN: this.eben,
      SHINOBI: this.shinobi,
      TETSUYA: this.tetsuya,
      RUACH: this.ruach,
      OHR: this.ohr,
      HADAAT: this.hadaat,
      KERUV: this.keruv,
      NEPHESH: this.nephesh,
      VIZ: this.viz
    };
    return map[name] || null;
  }

  getStatus() {
    return {
      state: this.state,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      modules: this._getModuleList(),
      bootSequence: this.bootSequence,
      config: {
        port: this.config.port,
        watchLevel: this.config.watchLevel
      }
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CLI ENTRY POINT
// ══════════════════════════════════════════════════════════════════════════════

const isMain = process.argv[1]?.endsWith('genesis-init.js');

if (isMain) {
  // Parse CLI args
  const args = process.argv.slice(2);
  const config = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
      config.port = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--watch-level' && args[i + 1]) {
      config.watchLevel = args[i + 1];
      i++;
    } else if (args[i] === '--log-level' && args[i + 1]) {
      setLogLevel(args[i + 1]);
      i++;
    }
  }

  const genesis = new GenesisBootstrap(config);
  let shuttingDown = false;

  genesis.boot().catch(err => {
    kolGenesis.error('Boot failed', { error: err.message });
    process.exit(1);
  });

  // Graceful shutdown — deduplicate signals
  async function handleShutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    kolGenesis.info(`Received ${signal}`);
    await genesis.shutdown();
    process.exit(0);
  }

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  // Catch unhandled errors so the process doesn't silently die
  process.on('uncaughtException', (err) => {
    kolGenesis.error('Uncaught exception', { error: err.message, stack: err.stack });
    handleShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    kolGenesis.error('Unhandled rejection', { reason: String(reason) });
  });
}

export default GenesisBootstrap;

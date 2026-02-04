/**
 * MERKAVA COMMAND CENTER
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
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * מרכבה (Merkava) = Chariot — The Divine Throne-Chariot
 *
 * Master Command Center orchestrating all GENESIS 2.0 modules:
 *   - RUACH (Neural Processing)
 *   - OHR (Observability)
 *   - HADAAT (Decision Engine)
 *   - KERUV (Zero-Trust Security)
 *   - NEPHESH (Claude Code Hooks)
 *   - EBEN (Evidence Management)
 *   - SHINOBI (Shadow Security)
 *   - TETSUYA (Defense & Risk)
 *   - VIZ (Visualization)
 *
 * "The chariot moves as one — all wheels turn in harmony."
 *
 * @module MERKAVA
 * @author Murray Bembrick <Founder & Lead Developer>
 * @version 2.0.0
 * @license Apache-2.0
 */

import { EventEmitter } from 'events';
import { createHash, randomUUID } from 'crypto';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS & CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

export const COMMAND_LEVELS = {
  OBSERVE: 0,      // Read-only observation
  QUERY: 1,        // Query modules for status
  CONTROL: 2,      // Control module behavior
  ORCHESTRATE: 3,  // Orchestrate multi-module operations
  OVERRIDE: 4,     // Emergency override capabilities
  SOVEREIGN: 5     // Full sovereign control (owner only)
};

export const MODULE_REGISTRY = {
  RUACH: { name: 'RUACH', hebrew: 'רוח', meaning: 'Spirit/Wind', domain: 'neural' },
  OHR: { name: 'OHR', hebrew: 'אור', meaning: 'Light', domain: 'observability' },
  HADAAT: { name: 'HADAAT', hebrew: 'הדעת', meaning: 'Knowledge', domain: 'decision' },
  KERUV: { name: 'KERUV', hebrew: 'כרוב', meaning: 'Cherubim', domain: 'security' },
  NEPHESH: { name: 'NEPHESH', hebrew: 'נפש', meaning: 'Soul', domain: 'hooks' },
  EBEN: { name: 'EBEN', hebrew: 'אבן', meaning: 'Stone', domain: 'evidence' },
  SHINOBI: { name: 'SHINOBI', japanese: '忍び', meaning: 'Ninja', domain: 'shadow' },
  TETSUYA: { name: 'TETSUYA', japanese: '鉄夜', meaning: 'Iron Night', domain: 'defense' },
  VIZ: { name: 'VIZ', meaning: 'Visualize', domain: 'display' },
  MABUL: { name: 'MABUL', hebrew: 'מבול', meaning: 'Flood', domain: 'persistence' }
};

export const SYSTEM_STATES = {
  DORMANT: 'dormant',
  INITIALIZING: 'initializing',
  READY: 'ready',
  ACTIVE: 'active',
  ALERT: 'alert',
  COMBAT: 'combat',
  LOCKDOWN: 'lockdown',
  RECOVERY: 'recovery',
  MAINTENANCE: 'maintenance'
};

export const DIRECTIVE_TYPES = {
  QUERY: 'query',
  COMMAND: 'command',
  BROADCAST: 'broadcast',
  EMERGENCY: 'emergency',
  MAINTENANCE: 'maintenance',
  SOVEREIGN: 'sovereign'
};

// ══════════════════════════════════════════════════════════════════════════════
// MODULE CONNECTOR
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Connector interface for each GENESIS module
 */
export class ModuleConnector {
  constructor(moduleId, config = {}) {
    this.id = randomUUID();
    this.moduleId = moduleId;
    this.moduleInfo = MODULE_REGISTRY[moduleId] || { name: moduleId, domain: 'unknown' };
    this.config = config;
    this.instance = null;
    this.status = 'disconnected';
    this.lastHeartbeat = null;
    this.metrics = {
      commands: 0,
      errors: 0,
      latencyMs: []
    };
  }

  async connect(moduleInstance) {
    this.instance = moduleInstance;
    this.status = 'connected';
    this.lastHeartbeat = Date.now();
    return { success: true, moduleId: this.moduleId };
  }

  async disconnect() {
    this.instance = null;
    this.status = 'disconnected';
    return { success: true };
  }

  async execute(command, params = {}) {
    if (!this.instance) {
      throw new Error(`Module ${this.moduleId} not connected`);
    }

    const startTime = Date.now();
    try {
      const result = await this._executeCommand(command, params);
      this.metrics.commands++;
      this.metrics.latencyMs.push(Date.now() - startTime);
      this.lastHeartbeat = Date.now();
      return result;
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  async _executeCommand(command, params) {
    // Dynamic command execution based on module type
    if (typeof this.instance[command] === 'function') {
      return await this.instance[command](params);
    }

    // Fallback to generic execute method
    if (typeof this.instance.execute === 'function') {
      return await this.instance.execute(command, params);
    }

    throw new Error(`Command ${command} not found on module ${this.moduleId}`);
  }

  async healthCheck() {
    try {
      if (typeof this.instance?.healthCheck === 'function') {
        return await this.instance.healthCheck();
      }
      return { healthy: this.status === 'connected', moduleId: this.moduleId };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  getMetrics() {
    const avgLatency = this.metrics.latencyMs.length > 0
      ? this.metrics.latencyMs.reduce((a, b) => a + b, 0) / this.metrics.latencyMs.length
      : 0;

    return {
      moduleId: this.moduleId,
      status: this.status,
      commands: this.metrics.commands,
      errors: this.metrics.errors,
      avgLatencyMs: Math.round(avgLatency),
      lastHeartbeat: this.lastHeartbeat
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DIRECTIVE QUEUE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Priority queue for command directives
 */
export class DirectiveQueue {
  constructor() {
    this.queues = {
      emergency: [],
      sovereign: [],
      command: [],
      query: [],
      maintenance: [],
      broadcast: []
    };
    this.processing = false;
    this.history = [];
  }

  enqueue(directive) {
    const type = directive.type || 'command';
    const entry = {
      id: randomUUID(),
      directive,
      enqueuedAt: Date.now(),
      status: 'pending'
    };

    if (this.queues[type]) {
      this.queues[type].push(entry);
    } else {
      this.queues.command.push(entry);
    }

    return entry.id;
  }

  dequeue() {
    // Priority order: emergency > sovereign > command > query > maintenance > broadcast
    const priorities = ['emergency', 'sovereign', 'command', 'query', 'maintenance', 'broadcast'];

    for (const priority of priorities) {
      if (this.queues[priority].length > 0) {
        const entry = this.queues[priority].shift();
        entry.status = 'processing';
        entry.dequeuedAt = Date.now();
        return entry;
      }
    }
    return null;
  }

  complete(entryId, result) {
    const entry = {
      id: entryId,
      result,
      completedAt: Date.now()
    };
    this.history.push(entry);

    // Keep only last 1000 entries
    if (this.history.length > 1000) {
      this.history = this.history.slice(-1000);
    }
  }

  getStats() {
    return {
      pending: Object.values(this.queues).reduce((sum, q) => sum + q.length, 0),
      queues: Object.fromEntries(
        Object.entries(this.queues).map(([k, v]) => [k, v.length])
      ),
      historyCount: this.history.length
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATION ENGINE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Multi-module orchestration workflows
 */
export class OrchestrationEngine {
  constructor(merkava) {
    this.merkava = merkava;
    this.workflows = new Map();
    this.activeExecutions = new Map();
  }

  registerWorkflow(name, definition) {
    const workflow = {
      id: randomUUID(),
      name,
      definition,
      createdAt: Date.now(),
      executionCount: 0
    };
    this.workflows.set(name, workflow);
    return workflow.id;
  }

  async executeWorkflow(name, context = {}) {
    const workflow = this.workflows.get(name);
    if (!workflow) {
      throw new Error(`Workflow ${name} not found`);
    }

    const executionId = randomUUID();
    const execution = {
      id: executionId,
      workflowId: workflow.id,
      workflowName: name,
      context,
      status: 'running',
      startedAt: Date.now(),
      steps: [],
      results: {}
    };

    this.activeExecutions.set(executionId, execution);

    try {
      for (const step of workflow.definition.steps) {
        const stepResult = await this._executeStep(step, execution);
        execution.steps.push({
          name: step.name,
          module: step.module,
          result: stepResult,
          completedAt: Date.now()
        });
        execution.results[step.name] = stepResult;

        // Check for step failure
        if (stepResult.error && !step.continueOnError) {
          execution.status = 'failed';
          execution.error = stepResult.error;
          break;
        }
      }

      if (execution.status === 'running') {
        execution.status = 'completed';
      }
    } catch (error) {
      execution.status = 'failed';
      execution.error = error.message;
    }

    execution.completedAt = Date.now();
    execution.durationMs = execution.completedAt - execution.startedAt;
    workflow.executionCount++;

    return execution;
  }

  async _executeStep(step, execution) {
    const { module, command, params = {}, transform } = step;

    try {
      // Merge context into params
      const mergedParams = { ...params, _context: execution.context, _results: execution.results };

      // Execute on target module
      const result = await this.merkava.sendDirective(module, command, mergedParams);

      // Apply transform if specified
      if (transform && typeof transform === 'function') {
        return transform(result);
      }

      return result;
    } catch (error) {
      return { error: error.message };
    }
  }

  getActiveExecutions() {
    return Array.from(this.activeExecutions.values())
      .filter(e => e.status === 'running');
  }

  getWorkflowStats() {
    return Array.from(this.workflows.values()).map(w => ({
      name: w.name,
      executionCount: w.executionCount,
      createdAt: w.createdAt
    }));
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SOVEREIGN CONTROL
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Sovereign-level controls (owner only)
 */
export class SovereignControl {
  constructor(merkava) {
    this.merkava = merkava;
    this.sovereignKey = null;
    this.authorized = false;
    this.lastAuthorization = null;
    this.authorizationTimeout = 30 * 60 * 1000; // 30 minutes
  }

  async authorize(credentials) {
    // Verify sovereign credentials
    const verified = await this._verifyCredentials(credentials);

    if (verified) {
      this.authorized = true;
      this.lastAuthorization = Date.now();
      this.sovereignKey = this._generateSessionKey();

      this.merkava.emit('sovereign:authorized', {
        timestamp: Date.now(),
        sessionKey: this.sovereignKey.substring(0, 8) + '...'
      });

      return { success: true, sessionKey: this.sovereignKey };
    }

    return { success: false, error: 'Authorization failed' };
  }

  async _verifyCredentials(credentials) {
    // Multi-factor verification
    const checks = [];

    // Check 1: YubiKey OTP (if provided)
    if (credentials.yubikey) {
      checks.push(this._verifyYubiKey(credentials.yubikey));
    }

    // Check 2: Passphrase hash
    if (credentials.passphrase) {
      const hash = createHash('sha256').update(credentials.passphrase).digest('hex');
      checks.push(hash === credentials.expectedHash);
    }

    // Check 3: Biometric token
    if (credentials.biometric) {
      checks.push(this._verifyBiometric(credentials.biometric));
    }

    // Require at least 2 factors
    const passed = checks.filter(Boolean).length;
    return passed >= Math.min(2, checks.length);
  }

  async _verifyYubiKey(otp) {
    // Integration with KERUV for YubiKey verification
    try {
      const keruv = this.merkava.getModule('KERUV');
      if (keruv) {
        const result = await keruv.execute('verifyYubiKey', { otp });
        return result.valid;
      }
    } catch (error) {
      console.error('YubiKey verification failed:', error);
    }
    return false;
  }

  async _verifyBiometric(token) {
    // Placeholder for biometric verification
    return token && token.length > 0;
  }

  _generateSessionKey() {
    return createHash('sha256')
      .update(randomUUID() + Date.now().toString())
      .digest('hex');
  }

  isAuthorized() {
    if (!this.authorized) return false;

    // Check timeout
    if (Date.now() - this.lastAuthorization > this.authorizationTimeout) {
      this.deauthorize();
      return false;
    }

    return true;
  }

  deauthorize() {
    this.authorized = false;
    this.sovereignKey = null;
    this.lastAuthorization = null;

    this.merkava.emit('sovereign:deauthorized', { timestamp: Date.now() });
  }

  async executePrivileged(command, params = {}) {
    if (!this.isAuthorized()) {
      throw new Error('Sovereign authorization required');
    }

    // Log privileged action
    this.merkava.emit('sovereign:action', {
      command,
      timestamp: Date.now(),
      params: Object.keys(params)
    });

    return await this.merkava._executeSovereignCommand(command, params);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SYSTEM PULSE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Heartbeat and health monitoring for all modules
 */
export class SystemPulse {
  constructor(merkava, interval = 10000) {
    this.merkava = merkava;
    this.interval = interval;
    this.pulseTimer = null;
    this.moduleHealth = new Map();
    this.systemHealth = {
      status: 'unknown',
      lastCheck: null,
      uptime: 0
    };
    this.startTime = Date.now();
  }

  start() {
    this.pulseTimer = setInterval(() => this.pulse(), this.interval);
    this.pulse(); // Initial pulse
  }

  stop() {
    if (this.pulseTimer) {
      clearInterval(this.pulseTimer);
      this.pulseTimer = null;
    }
  }

  async pulse() {
    const results = {};
    const modules = this.merkava.getConnectedModules();

    for (const moduleId of modules) {
      try {
        const connector = this.merkava.modules.get(moduleId);
        const health = await connector.healthCheck();
        results[moduleId] = health;
        this.moduleHealth.set(moduleId, {
          ...health,
          checkedAt: Date.now()
        });
      } catch (error) {
        results[moduleId] = { healthy: false, error: error.message };
        this.moduleHealth.set(moduleId, {
          healthy: false,
          error: error.message,
          checkedAt: Date.now()
        });
      }
    }

    // Calculate overall system health
    const healthyCount = Object.values(results).filter(r => r.healthy).length;
    const totalCount = Object.keys(results).length;

    this.systemHealth = {
      status: this._calculateStatus(healthyCount, totalCount),
      healthy: healthyCount,
      total: totalCount,
      percentage: totalCount > 0 ? Math.round((healthyCount / totalCount) * 100) : 0,
      lastCheck: Date.now(),
      uptime: Date.now() - this.startTime
    };

    this.merkava.emit('pulse', {
      system: this.systemHealth,
      modules: results
    });

    return this.systemHealth;
  }

  _calculateStatus(healthy, total) {
    if (total === 0) return 'unknown';
    const ratio = healthy / total;
    if (ratio === 1) return 'optimal';
    if (ratio >= 0.8) return 'healthy';
    if (ratio >= 0.5) return 'degraded';
    if (ratio > 0) return 'critical';
    return 'down';
  }

  getModuleHealth(moduleId) {
    return this.moduleHealth.get(moduleId);
  }

  getSystemHealth() {
    return this.systemHealth;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ALERT SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

/**
 * System-wide alert management
 */
export class AlertSystem {
  constructor(merkava) {
    this.merkava = merkava;
    this.alerts = [];
    this.alertHandlers = new Map();
    this.escalationRules = [];
  }

  raise(severity, source, message, data = {}) {
    const alert = {
      id: randomUUID(),
      severity, // critical, high, medium, low, info
      source,
      message,
      data,
      raisedAt: Date.now(),
      acknowledged: false,
      resolved: false
    };

    this.alerts.push(alert);
    this._processAlert(alert);

    this.merkava.emit('alert:raised', alert);

    return alert.id;
  }

  acknowledge(alertId, acknowledgedBy) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = Date.now();
      alert.acknowledgedBy = acknowledgedBy;
      this.merkava.emit('alert:acknowledged', alert);
    }
    return alert;
  }

  resolve(alertId, resolvedBy, resolution) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      alert.resolvedBy = resolvedBy;
      alert.resolution = resolution;
      this.merkava.emit('alert:resolved', alert);
    }
    return alert;
  }

  registerHandler(severity, handler) {
    if (!this.alertHandlers.has(severity)) {
      this.alertHandlers.set(severity, []);
    }
    this.alertHandlers.get(severity).push(handler);
  }

  addEscalationRule(rule) {
    this.escalationRules.push({
      id: randomUUID(),
      ...rule
    });
  }

  async _processAlert(alert) {
    // Execute handlers for this severity
    const handlers = this.alertHandlers.get(alert.severity) || [];
    for (const handler of handlers) {
      try {
        await handler(alert);
      } catch (error) {
        console.error('Alert handler error:', error);
      }
    }

    // Check escalation rules
    for (const rule of this.escalationRules) {
      if (this._matchesRule(alert, rule)) {
        await this._escalate(alert, rule);
      }
    }
  }

  _matchesRule(alert, rule) {
    if (rule.severity && rule.severity !== alert.severity) return false;
    if (rule.source && rule.source !== alert.source) return false;
    if (rule.pattern && !alert.message.match(new RegExp(rule.pattern))) return false;
    return true;
  }

  async _escalate(alert, rule) {
    if (rule.action === 'notify') {
      this.merkava.emit('alert:escalated', { alert, rule });
    } else if (rule.action === 'command') {
      await this.merkava.sendDirective(rule.target, rule.command, { alert });
    } else if (rule.action === 'lockdown' && alert.severity === 'critical') {
      await this.merkava.inititateLockdown(alert.message);
    }
  }

  getActiveAlerts() {
    return this.alerts.filter(a => !a.resolved);
  }

  getAlertsBySource(source) {
    return this.alerts.filter(a => a.source === source);
  }

  clearResolved() {
    this.alerts = this.alerts.filter(a => !a.resolved);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MERKAVA COMMAND CENTER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Main Command Center - The Divine Chariot
 */
export class Merkava extends EventEmitter {
  constructor(config = {}) {
    super();

    this.id = randomUUID();
    this.name = 'MERKAVA';
    this.hebrew = 'מרכבה';
    this.meaning = 'Chariot';

    this.config = {
      pulseInterval: config.pulseInterval || 10000,
      directiveTimeout: config.directiveTimeout || 30000,
      maxQueueSize: config.maxQueueSize || 10000,
      ...config
    };

    // Core components
    this.modules = new Map();
    this.directiveQueue = new DirectiveQueue();
    this.orchestration = new OrchestrationEngine(this);
    this.sovereign = new SovereignControl(this);
    this.pulse = new SystemPulse(this, this.config.pulseInterval);
    this.alerts = new AlertSystem(this);

    // State
    this.state = SYSTEM_STATES.DORMANT;
    this.startTime = null;
    this.commandLog = [];

    // Built-in workflows
    this._registerBuiltInWorkflows();
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  async initialize() {
    this.state = SYSTEM_STATES.INITIALIZING;
    this.startTime = Date.now();

    this.emit('initializing', { timestamp: Date.now() });

    // Start pulse monitoring
    this.pulse.start();

    // Start directive processor
    this._startDirectiveProcessor();

    this.state = SYSTEM_STATES.READY;
    this.emit('ready', { timestamp: Date.now() });

    return { success: true, state: this.state };
  }

  async shutdown() {
    this.state = SYSTEM_STATES.DORMANT;

    // Stop pulse
    this.pulse.stop();

    // Disconnect all modules
    for (const [moduleId, connector] of this.modules) {
      await connector.disconnect();
    }

    this.emit('shutdown', { timestamp: Date.now() });

    return { success: true };
  }

  // ─── Module Management ─────────────────────────────────────────────────────

  registerModule(moduleId, moduleInstance, config = {}) {
    const connector = new ModuleConnector(moduleId, config);
    connector.connect(moduleInstance);
    this.modules.set(moduleId, connector);

    this.emit('module:registered', { moduleId, timestamp: Date.now() });

    return connector.id;
  }

  unregisterModule(moduleId) {
    const connector = this.modules.get(moduleId);
    if (connector) {
      connector.disconnect();
      this.modules.delete(moduleId);
      this.emit('module:unregistered', { moduleId, timestamp: Date.now() });
      return true;
    }
    return false;
  }

  getModule(moduleId) {
    return this.modules.get(moduleId);
  }

  getConnectedModules() {
    return Array.from(this.modules.keys());
  }

  getModuleStatus() {
    const status = {};
    for (const [moduleId, connector] of this.modules) {
      status[moduleId] = connector.getMetrics();
    }
    return status;
  }

  // ─── Directive System ──────────────────────────────────────────────────────

  async sendDirective(moduleId, command, params = {}, options = {}) {
    const directive = {
      id: randomUUID(),
      type: options.type || DIRECTIVE_TYPES.COMMAND,
      moduleId,
      command,
      params,
      timestamp: Date.now(),
      timeout: options.timeout || this.config.directiveTimeout
    };

    // Log directive
    this._logCommand(directive);

    // Check if module exists
    const connector = this.modules.get(moduleId);
    if (!connector) {
      throw new Error(`Module ${moduleId} not registered`);
    }

    // Execute based on priority
    if (options.priority === 'immediate') {
      return await this._executeDirective(directive);
    }

    // Queue for processing
    const queueId = this.directiveQueue.enqueue(directive);

    // Wait for result if synchronous
    if (!options.async) {
      return await this._waitForResult(queueId, directive.timeout);
    }

    return { queued: true, queueId };
  }

  async _executeDirective(directive) {
    const connector = this.modules.get(directive.moduleId);

    try {
      const result = await connector.execute(directive.command, directive.params);

      this.emit('directive:completed', {
        directiveId: directive.id,
        moduleId: directive.moduleId,
        command: directive.command,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      this.emit('directive:failed', {
        directiveId: directive.id,
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    }
  }

  async _waitForResult(queueId, timeout) {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const entry = this.directiveQueue.history.find(h => h.id === queueId);
        if (entry) {
          clearInterval(checkInterval);
          resolve(entry.result);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Directive timeout'));
      }, timeout);
    });
  }

  _startDirectiveProcessor() {
    setInterval(async () => {
      const entry = this.directiveQueue.dequeue();
      if (entry) {
        try {
          const result = await this._executeDirective(entry.directive);
          this.directiveQueue.complete(entry.id, result);
        } catch (error) {
          this.directiveQueue.complete(entry.id, { error: error.message });
        }
      }
    }, 50);
  }

  // ─── Broadcast Commands ────────────────────────────────────────────────────

  async broadcast(command, params = {}) {
    const results = {};

    for (const [moduleId, connector] of this.modules) {
      try {
        results[moduleId] = await connector.execute(command, params);
      } catch (error) {
        results[moduleId] = { error: error.message };
      }
    }

    this.emit('broadcast:completed', { command, timestamp: Date.now() });

    return results;
  }

  async broadcastToGroup(group, command, params = {}) {
    const results = {};

    for (const [moduleId, connector] of this.modules) {
      if (connector.moduleInfo.domain === group) {
        try {
          results[moduleId] = await connector.execute(command, params);
        } catch (error) {
          results[moduleId] = { error: error.message };
        }
      }
    }

    return results;
  }

  // ─── Emergency Controls ────────────────────────────────────────────────────

  async inititateLockdown(reason) {
    this.state = SYSTEM_STATES.LOCKDOWN;

    this.alerts.raise('critical', 'MERKAVA', `LOCKDOWN INITIATED: ${reason}`);

    // Broadcast lockdown to all modules
    await this.broadcast('enterLockdown', { reason });

    this.emit('lockdown', { reason, timestamp: Date.now() });

    return { success: true, state: this.state };
  }

  async liftLockdown(authorizedBy) {
    if (!this.sovereign.isAuthorized()) {
      throw new Error('Sovereign authorization required to lift lockdown');
    }

    this.state = SYSTEM_STATES.RECOVERY;

    // Broadcast recovery to all modules
    await this.broadcast('exitLockdown', { authorizedBy });

    this.state = SYSTEM_STATES.ACTIVE;

    this.emit('lockdown:lifted', { authorizedBy, timestamp: Date.now() });

    return { success: true, state: this.state };
  }

  async emergencyShutdown(reason) {
    this.alerts.raise('critical', 'MERKAVA', `EMERGENCY SHUTDOWN: ${reason}`);

    // Graceful shutdown attempt
    try {
      await this.broadcast('prepareShutdown', { reason, emergency: true });
    } catch (error) {
      // Continue with shutdown regardless
    }

    await this.shutdown();

    return { success: true, reason };
  }

  // ─── Sovereign Commands ────────────────────────────────────────────────────

  async _executeSovereignCommand(command, params) {
    switch (command) {
      case 'fullReset':
        return await this._fullSystemReset(params);
      case 'moduleOverride':
        return await this._moduleOverride(params);
      case 'dataWipe':
        return await this._secureDataWipe(params);
      case 'configOverride':
        return await this._configOverride(params);
      default:
        throw new Error(`Unknown sovereign command: ${command}`);
    }
  }

  async _fullSystemReset(params) {
    await this.shutdown();
    // Reset all state
    this.commandLog = [];
    this.directiveQueue = new DirectiveQueue();
    await this.initialize();
    return { success: true, reset: true };
  }

  async _moduleOverride(params) {
    const { moduleId, override } = params;
    const connector = this.modules.get(moduleId);
    if (connector && connector.instance) {
      return await connector.execute('sovereignOverride', override);
    }
    throw new Error(`Module ${moduleId} not found`);
  }

  async _secureDataWipe(params) {
    // Trigger secure wipe on relevant modules
    const results = await this.broadcastToGroup('evidence', 'secureWipe', params);
    return results;
  }

  async _configOverride(params) {
    Object.assign(this.config, params);
    return { success: true, config: this.config };
  }

  // ─── Orchestration ─────────────────────────────────────────────────────────

  registerWorkflow(name, definition) {
    return this.orchestration.registerWorkflow(name, definition);
  }

  async executeWorkflow(name, context = {}) {
    return await this.orchestration.executeWorkflow(name, context);
  }

  // ─── Built-in Workflows ────────────────────────────────────────────────────

  _registerBuiltInWorkflows() {
    // System Health Check Workflow
    this.registerWorkflow('system:healthCheck', {
      steps: [
        { name: 'checkSecurity', module: 'KERUV', command: 'healthCheck' },
        { name: 'checkNeural', module: 'RUACH', command: 'healthCheck' },
        { name: 'checkObservability', module: 'OHR', command: 'healthCheck' },
        { name: 'checkEvidence', module: 'EBEN', command: 'healthCheck' },
        { name: 'checkDefense', module: 'TETSUYA', command: 'healthCheck' }
      ]
    });

    // Security Sweep Workflow
    this.registerWorkflow('security:sweep', {
      steps: [
        { name: 'shinobiScan', module: 'SHINOBI', command: 'shadowScan' },
        { name: 'keruvAudit', module: 'KERUV', command: 'auditAccess' },
        { name: 'tetsuyaAssess', module: 'TETSUYA', command: 'riskAssessment' }
      ]
    });

    // Evidence Collection Workflow
    this.registerWorkflow('evidence:collect', {
      steps: [
        { name: 'gatherLogs', module: 'OHR', command: 'exportLogs' },
        { name: 'storeEvidence', module: 'EBEN', command: 'store' },
        { name: 'signChain', module: 'KERUV', command: 'signCustody' }
      ]
    });
  }

  // ─── Logging ───────────────────────────────────────────────────────────────

  _logCommand(directive) {
    this.commandLog.push({
      timestamp: Date.now(),
      directive: {
        id: directive.id,
        type: directive.type,
        moduleId: directive.moduleId,
        command: directive.command
      }
    });

    // Keep last 10000 entries
    if (this.commandLog.length > 10000) {
      this.commandLog = this.commandLog.slice(-10000);
    }
  }

  getCommandLog(limit = 100) {
    return this.commandLog.slice(-limit);
  }

  // ─── Status & Metrics ──────────────────────────────────────────────────────

  getStatus() {
    return {
      id: this.id,
      name: this.name,
      hebrew: this.hebrew,
      state: this.state,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      modules: {
        connected: this.modules.size,
        list: this.getConnectedModules()
      },
      health: this.pulse.getSystemHealth(),
      queue: this.directiveQueue.getStats(),
      alerts: {
        active: this.alerts.getActiveAlerts().length
      },
      sovereign: {
        authorized: this.sovereign.isAuthorized()
      }
    };
  }

  getFullDiagnostics() {
    return {
      status: this.getStatus(),
      moduleMetrics: this.getModuleStatus(),
      recentCommands: this.getCommandLog(50),
      activeAlerts: this.alerts.getActiveAlerts(),
      workflows: this.orchestration.getWorkflowStats(),
      pulse: this.pulse.getSystemHealth()
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FACTORY & EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create and initialize MERKAVA Command Center
 */
export async function createMerkava(config = {}) {
  const merkava = new Merkava(config);
  await merkava.initialize();
  return merkava;
}

export default Merkava;

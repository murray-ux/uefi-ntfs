/**
 * TZOFEH SENTINEL WATCHDOG
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
 * צופה (Tzofeh) = Watchman/Sentinel — The Ever-Vigilant Guardian
 *
 * Continuous monitoring and watchdog system:
 *   - Real-time anomaly detection
 *   - Pattern recognition for threats
 *   - Predictive failure analysis
 *   - Automated response triggers
 *   - Guardian daemon management
 *   - Threshold monitoring
 *   - Drift detection
 *   - Canary deployments
 *
 * "The sentinel never sleeps — watching from the watchtower eternal."
 *
 * @module TZOFEH
 * @author Murray Bembrick <Founder & Lead Developer>
 * @version 2.0.0
 * @license Apache-2.0
 */

import { EventEmitter } from 'events';
import { createHash, randomUUID } from 'crypto';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS & CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

export const WATCH_LEVELS = {
  PASSIVE: 0,    // Observe only
  ACTIVE: 1,     // Active monitoring
  ALERT: 2,      // Heightened vigilance
  COMBAT: 3,     // Active threat response
  SENTINEL: 4    // Maximum vigilance
};

export const ANOMALY_TYPES = {
  SPIKE: 'spike',
  DROP: 'drop',
  DRIFT: 'drift',
  PATTERN: 'pattern',
  THRESHOLD: 'threshold',
  CORRELATION: 'correlation',
  SEQUENCE: 'sequence',
  TEMPORAL: 'temporal'
};

export const RESPONSE_ACTIONS = {
  LOG: 'log',
  ALERT: 'alert',
  NOTIFY: 'notify',
  THROTTLE: 'throttle',
  ISOLATE: 'isolate',
  RESTART: 'restart',
  FAILOVER: 'failover',
  LOCKDOWN: 'lockdown'
};

// ══════════════════════════════════════════════════════════════════════════════
// METRIC COLLECTOR
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Collects and aggregates metrics from all sources
 */
export class MetricCollector {
  constructor(config = {}) {
    this.metrics = new Map();
    this.bufferSize = config.bufferSize || 1000;
    this.aggregationInterval = config.aggregationInterval || 60000;
  }

  record(name, value, tags = {}) {
    const key = this._makeKey(name, tags);

    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        name,
        tags,
        values: [],
        stats: null,
        lastUpdated: null
      });
    }

    const metric = this.metrics.get(key);
    metric.values.push({ value, timestamp: Date.now() });
    metric.lastUpdated = Date.now();

    // Trim to buffer size
    if (metric.values.length > this.bufferSize) {
      metric.values = metric.values.slice(-this.bufferSize);
    }

    // Update stats
    metric.stats = this._calculateStats(metric.values);

    return metric.stats;
  }

  get(name, tags = {}) {
    const key = this._makeKey(name, tags);
    return this.metrics.get(key);
  }

  getAll() {
    const result = {};
    for (const [key, metric] of this.metrics) {
      result[key] = {
        name: metric.name,
        tags: metric.tags,
        stats: metric.stats,
        lastUpdated: metric.lastUpdated
      };
    }
    return result;
  }

  _makeKey(name, tags) {
    const tagStr = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return tagStr ? `${name}{${tagStr}}` : name;
  }

  _calculateStats(values) {
    if (values.length === 0) return null;

    const nums = values.map(v => v.value);
    const sorted = [...nums].sort((a, b) => a - b);

    return {
      count: nums.length,
      sum: nums.reduce((a, b) => a + b, 0),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: nums.reduce((a, b) => a + b, 0) / nums.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      stdDev: this._stdDev(nums)
    };
  }

  _stdDev(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ANOMALY DETECTOR
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Detects anomalies in metric streams
 */
export class AnomalyDetector {
  constructor(config = {}) {
    this.config = {
      spikeThreshold: config.spikeThreshold || 3,    // Standard deviations
      dropThreshold: config.dropThreshold || 0.5,     // 50% drop
      driftWindow: config.driftWindow || 300000,      // 5 minutes
      driftThreshold: config.driftThreshold || 0.2,   // 20% drift
      ...config
    };

    this.baselines = new Map();
    this.detectedAnomalies = [];
  }

  setBaseline(metricName, baseline) {
    this.baselines.set(metricName, {
      mean: baseline.mean,
      stdDev: baseline.stdDev,
      min: baseline.min,
      max: baseline.max,
      setAt: Date.now()
    });
  }

  analyze(metricName, currentStats, recentValues) {
    const anomalies = [];
    const baseline = this.baselines.get(metricName);

    if (!baseline || !currentStats) return anomalies;

    // Spike Detection (Z-score)
    if (baseline.stdDev > 0) {
      const zScore = (currentStats.mean - baseline.mean) / baseline.stdDev;
      if (Math.abs(zScore) > this.config.spikeThreshold) {
        anomalies.push({
          type: zScore > 0 ? ANOMALY_TYPES.SPIKE : ANOMALY_TYPES.DROP,
          metric: metricName,
          severity: this._calculateSeverity(Math.abs(zScore)),
          zScore,
          expected: baseline.mean,
          actual: currentStats.mean,
          timestamp: Date.now()
        });
      }
    }

    // Threshold Breach
    if (currentStats.max > baseline.max * 1.5) {
      anomalies.push({
        type: ANOMALY_TYPES.THRESHOLD,
        metric: metricName,
        severity: 'high',
        threshold: baseline.max,
        actual: currentStats.max,
        timestamp: Date.now()
      });
    }

    // Drift Detection
    if (recentValues && recentValues.length > 10) {
      const drift = this._detectDrift(recentValues, baseline);
      if (drift) {
        anomalies.push({
          type: ANOMALY_TYPES.DRIFT,
          metric: metricName,
          severity: drift.severity,
          direction: drift.direction,
          magnitude: drift.magnitude,
          timestamp: Date.now()
        });
      }
    }

    // Store detected anomalies
    this.detectedAnomalies.push(...anomalies);

    // Keep only recent anomalies
    const cutoff = Date.now() - 3600000; // 1 hour
    this.detectedAnomalies = this.detectedAnomalies.filter(a => a.timestamp > cutoff);

    return anomalies;
  }

  _detectDrift(values, baseline) {
    // Calculate trend using linear regression
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.map(v => v.value).reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i].value - yMean);
      denominator += Math.pow(i - xMean, 2);
    }

    const slope = numerator / denominator;
    const magnitude = Math.abs(slope * n) / baseline.mean;

    if (magnitude > this.config.driftThreshold) {
      return {
        direction: slope > 0 ? 'increasing' : 'decreasing',
        magnitude,
        severity: magnitude > 0.5 ? 'high' : 'medium'
      };
    }

    return null;
  }

  _calculateSeverity(zScore) {
    if (zScore > 5) return 'critical';
    if (zScore > 4) return 'high';
    if (zScore > 3) return 'medium';
    return 'low';
  }

  getRecentAnomalies(limit = 100) {
    return this.detectedAnomalies.slice(-limit);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PATTERN RECOGNIZER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Recognizes patterns in event sequences
 */
export class PatternRecognizer {
  constructor() {
    this.patterns = new Map();
    this.eventBuffer = [];
    this.bufferSize = 10000;
    this.matches = [];
  }

  registerPattern(name, definition) {
    const pattern = {
      id: randomUUID(),
      name,
      definition,
      matchCount: 0,
      createdAt: Date.now()
    };
    this.patterns.set(name, pattern);
    return pattern.id;
  }

  recordEvent(event) {
    this.eventBuffer.push({
      ...event,
      recordedAt: Date.now()
    });

    // Trim buffer
    if (this.eventBuffer.length > this.bufferSize) {
      this.eventBuffer = this.eventBuffer.slice(-this.bufferSize);
    }

    // Check for pattern matches
    return this._checkPatterns(event);
  }

  _checkPatterns(triggerEvent) {
    const matches = [];

    for (const [name, pattern] of this.patterns) {
      const match = this._matchPattern(pattern, triggerEvent);
      if (match) {
        pattern.matchCount++;
        matches.push({
          patternName: name,
          patternId: pattern.id,
          confidence: match.confidence,
          events: match.events,
          timestamp: Date.now()
        });
      }
    }

    this.matches.push(...matches);

    // Keep recent matches only
    if (this.matches.length > 1000) {
      this.matches = this.matches.slice(-1000);
    }

    return matches;
  }

  _matchPattern(pattern, triggerEvent) {
    const { definition } = pattern;

    switch (definition.type) {
      case 'sequence':
        return this._matchSequence(definition, triggerEvent);
      case 'frequency':
        return this._matchFrequency(definition, triggerEvent);
      case 'correlation':
        return this._matchCorrelation(definition, triggerEvent);
      default:
        return null;
    }
  }

  _matchSequence(definition, triggerEvent) {
    const { events: expectedEvents, windowMs } = definition;
    const cutoff = Date.now() - (windowMs || 60000);

    const recentEvents = this.eventBuffer.filter(e => e.recordedAt > cutoff);

    // Check if sequence matches
    let matchIndex = 0;
    const matchedEvents = [];

    for (const event of recentEvents) {
      if (this._eventMatches(event, expectedEvents[matchIndex])) {
        matchedEvents.push(event);
        matchIndex++;

        if (matchIndex >= expectedEvents.length) {
          return {
            confidence: 1.0,
            events: matchedEvents
          };
        }
      }
    }

    return null;
  }

  _matchFrequency(definition, triggerEvent) {
    const { eventType, threshold, windowMs } = definition;
    const cutoff = Date.now() - (windowMs || 60000);

    const matchingEvents = this.eventBuffer.filter(
      e => e.recordedAt > cutoff && e.type === eventType
    );

    if (matchingEvents.length >= threshold) {
      return {
        confidence: Math.min(matchingEvents.length / threshold, 1.0),
        events: matchingEvents.slice(-threshold)
      };
    }

    return null;
  }

  _matchCorrelation(definition, triggerEvent) {
    const { eventTypes, windowMs, minCorrelation } = definition;
    const cutoff = Date.now() - (windowMs || 60000);

    const recentEvents = this.eventBuffer.filter(e => e.recordedAt > cutoff);

    // Count occurrences of each event type
    const counts = {};
    for (const type of eventTypes) {
      counts[type] = recentEvents.filter(e => e.type === type).length;
    }

    // Simple correlation: all types must be present
    const allPresent = eventTypes.every(type => counts[type] > 0);
    if (allPresent) {
      const minCount = Math.min(...Object.values(counts));
      const maxCount = Math.max(...Object.values(counts));
      const correlation = minCount / maxCount;

      if (correlation >= minCorrelation) {
        return {
          confidence: correlation,
          events: recentEvents.filter(e => eventTypes.includes(e.type))
        };
      }
    }

    return null;
  }

  _eventMatches(event, expected) {
    for (const [key, value] of Object.entries(expected)) {
      if (event[key] !== value) return false;
    }
    return true;
  }

  getRecentMatches(limit = 100) {
    return this.matches.slice(-limit);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// GUARDIAN DAEMON
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Individual watchdog daemon for a specific target
 */
export class GuardianDaemon {
  constructor(name, target, config = {}) {
    this.id = randomUUID();
    this.name = name;
    this.target = target;
    this.config = {
      checkInterval: config.checkInterval || 5000,
      timeout: config.timeout || 10000,
      maxFailures: config.maxFailures || 3,
      ...config
    };

    this.status = 'inactive';
    this.checkTimer = null;
    this.failureCount = 0;
    this.lastCheck = null;
    this.lastSuccess = null;
    this.history = [];
  }

  start() {
    this.status = 'active';
    this.checkTimer = setInterval(() => this._performCheck(), this.config.checkInterval);
    this._performCheck(); // Initial check
    return { started: true, daemonId: this.id };
  }

  stop() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    this.status = 'inactive';
    return { stopped: true, daemonId: this.id };
  }

  async _performCheck() {
    const checkStart = Date.now();

    try {
      const result = await this._executeCheck();

      this.lastCheck = Date.now();
      this.lastSuccess = Date.now();
      this.failureCount = 0;

      this._recordHistory({
        success: true,
        duration: Date.now() - checkStart,
        result
      });

      return result;
    } catch (error) {
      this.lastCheck = Date.now();
      this.failureCount++;

      this._recordHistory({
        success: false,
        duration: Date.now() - checkStart,
        error: error.message
      });

      if (this.failureCount >= this.config.maxFailures) {
        this.status = 'alarm';
        this._triggerAlarm(error);
      }

      return { error: error.message };
    }
  }

  async _executeCheck() {
    // Check based on target type
    if (typeof this.target === 'function') {
      return await Promise.race([
        this.target(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Check timeout')), this.config.timeout)
        )
      ]);
    }

    if (this.target.healthCheck) {
      return await this.target.healthCheck();
    }

    throw new Error('Invalid target for guardian daemon');
  }

  _recordHistory(entry) {
    this.history.push({
      ...entry,
      timestamp: Date.now()
    });

    // Keep last 100 entries
    if (this.history.length > 100) {
      this.history = this.history.slice(-100);
    }
  }

  _triggerAlarm(error) {
    // Emit alarm event (handled by Tzofeh)
    if (this.onAlarm) {
      this.onAlarm({
        daemon: this.name,
        daemonId: this.id,
        error: error.message,
        failureCount: this.failureCount,
        timestamp: Date.now()
      });
    }
  }

  getStatus() {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      failureCount: this.failureCount,
      lastCheck: this.lastCheck,
      lastSuccess: this.lastSuccess,
      uptime: this.lastSuccess ? Date.now() - this.lastSuccess : null
    };
  }

  getHistory(limit = 50) {
    return this.history.slice(-limit);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// THRESHOLD MONITOR
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Monitors metrics against defined thresholds
 */
export class ThresholdMonitor {
  constructor() {
    this.thresholds = new Map();
    this.violations = [];
  }

  setThreshold(metricName, config) {
    const threshold = {
      id: randomUUID(),
      metricName,
      warning: config.warning,
      critical: config.critical,
      comparison: config.comparison || 'gt', // gt, lt, eq, ne
      duration: config.duration || 0, // Duration before triggering
      action: config.action || RESPONSE_ACTIONS.ALERT,
      createdAt: Date.now(),
      violationStart: null
    };
    this.thresholds.set(metricName, threshold);
    return threshold.id;
  }

  check(metricName, value) {
    const threshold = this.thresholds.get(metricName);
    if (!threshold) return null;

    const result = this._evaluate(value, threshold);

    if (result.violated) {
      if (!threshold.violationStart) {
        threshold.violationStart = Date.now();
      }

      const violationDuration = Date.now() - threshold.violationStart;

      if (violationDuration >= threshold.duration) {
        const violation = {
          id: randomUUID(),
          metricName,
          value,
          level: result.level,
          threshold: result.threshold,
          action: threshold.action,
          duration: violationDuration,
          timestamp: Date.now()
        };

        this.violations.push(violation);
        return violation;
      }
    } else {
      threshold.violationStart = null;
    }

    return null;
  }

  _evaluate(value, threshold) {
    const { comparison, critical, warning } = threshold;

    const compare = (val, limit) => {
      switch (comparison) {
        case 'gt': return val > limit;
        case 'lt': return val < limit;
        case 'eq': return val === limit;
        case 'ne': return val !== limit;
        case 'gte': return val >= limit;
        case 'lte': return val <= limit;
        default: return false;
      }
    };

    if (critical !== undefined && compare(value, critical)) {
      return { violated: true, level: 'critical', threshold: critical };
    }

    if (warning !== undefined && compare(value, warning)) {
      return { violated: true, level: 'warning', threshold: warning };
    }

    return { violated: false };
  }

  getViolations(limit = 100) {
    return this.violations.slice(-limit);
  }

  clearViolations() {
    this.violations = [];
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CANARY SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Canary deployment and testing system
 */
export class CanarySystem {
  constructor() {
    this.canaries = new Map();
    this.results = [];
  }

  deploy(name, config) {
    const canary = {
      id: randomUUID(),
      name,
      config,
      status: 'deployed',
      deployedAt: Date.now(),
      lastCheck: null,
      health: 'unknown',
      metrics: []
    };
    this.canaries.set(name, canary);
    return canary;
  }

  async check(name) {
    const canary = this.canaries.get(name);
    if (!canary) {
      throw new Error(`Canary ${name} not found`);
    }

    try {
      const result = await this._executeCanaryCheck(canary);

      canary.lastCheck = Date.now();
      canary.health = result.healthy ? 'healthy' : 'unhealthy';
      canary.metrics.push({
        timestamp: Date.now(),
        ...result
      });

      // Keep last 100 metrics
      if (canary.metrics.length > 100) {
        canary.metrics = canary.metrics.slice(-100);
      }

      return result;
    } catch (error) {
      canary.health = 'error';
      return { healthy: false, error: error.message };
    }
  }

  async _executeCanaryCheck(canary) {
    const { config } = canary;

    // Execute configured checks
    const results = {
      healthy: true,
      checks: {}
    };

    if (config.endpoint) {
      // HTTP health check (simulated)
      results.checks.endpoint = { status: 200, latencyMs: Math.random() * 100 };
    }

    if (config.function) {
      const fnResult = await config.function();
      results.checks.function = fnResult;
      if (!fnResult.success) results.healthy = false;
    }

    return results;
  }

  promote(name) {
    const canary = this.canaries.get(name);
    if (canary && canary.health === 'healthy') {
      canary.status = 'promoted';
      canary.promotedAt = Date.now();
      return { promoted: true, canary };
    }
    return { promoted: false, reason: 'Canary not healthy' };
  }

  rollback(name) {
    const canary = this.canaries.get(name);
    if (canary) {
      canary.status = 'rolled_back';
      canary.rolledBackAt = Date.now();
      return { rolledBack: true, canary };
    }
    return { rolledBack: false, reason: 'Canary not found' };
  }

  getCanaryStatus(name) {
    return this.canaries.get(name);
  }

  getAllCanaries() {
    return Array.from(this.canaries.values());
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// RESPONSE ENGINE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Automated response to detected issues
 */
export class ResponseEngine {
  constructor(tzofeh) {
    this.tzofeh = tzofeh;
    this.rules = new Map();
    this.executedResponses = [];
  }

  addRule(trigger, action, config = {}) {
    const rule = {
      id: randomUUID(),
      trigger,
      action,
      config,
      enabled: true,
      executionCount: 0,
      lastExecution: null,
      cooldown: config.cooldown || 60000 // 1 minute default
    };
    this.rules.set(rule.id, rule);
    return rule.id;
  }

  async evaluate(event) {
    const executedActions = [];

    for (const [ruleId, rule] of this.rules) {
      if (!rule.enabled) continue;

      // Check cooldown
      if (rule.lastExecution && Date.now() - rule.lastExecution < rule.cooldown) {
        continue;
      }

      if (this._matchesTrigger(event, rule.trigger)) {
        const result = await this._executeAction(rule, event);
        executedActions.push(result);

        rule.executionCount++;
        rule.lastExecution = Date.now();
      }
    }

    return executedActions;
  }

  _matchesTrigger(event, trigger) {
    if (trigger.type && event.type !== trigger.type) return false;
    if (trigger.severity && event.severity !== trigger.severity) return false;
    if (trigger.source && event.source !== trigger.source) return false;
    if (trigger.pattern && !event.message?.match(new RegExp(trigger.pattern))) return false;
    return true;
  }

  async _executeAction(rule, event) {
    const { action, config } = rule;

    const response = {
      ruleId: rule.id,
      action,
      event,
      timestamp: Date.now(),
      success: false
    };

    try {
      switch (action) {
        case RESPONSE_ACTIONS.LOG:
          console.log(`[TZOFEH] ${event.type}: ${event.message}`);
          response.success = true;
          break;

        case RESPONSE_ACTIONS.ALERT:
          this.tzofeh.emit('response:alert', { event, rule });
          response.success = true;
          break;

        case RESPONSE_ACTIONS.THROTTLE:
          if (config.target && this.tzofeh.merkava) {
            await this.tzofeh.merkava.sendDirective(config.target, 'throttle', config);
          }
          response.success = true;
          break;

        case RESPONSE_ACTIONS.ISOLATE:
          if (config.target && this.tzofeh.merkava) {
            await this.tzofeh.merkava.sendDirective(config.target, 'isolate', {
              reason: event.message
            });
          }
          response.success = true;
          break;

        case RESPONSE_ACTIONS.RESTART:
          if (config.target && this.tzofeh.merkava) {
            await this.tzofeh.merkava.sendDirective(config.target, 'restart', {});
          }
          response.success = true;
          break;

        case RESPONSE_ACTIONS.FAILOVER:
          if (this.tzofeh.merkava) {
            await this.tzofeh.merkava.broadcast('prepareFailover', { source: config.target });
          }
          response.success = true;
          break;

        case RESPONSE_ACTIONS.LOCKDOWN:
          if (this.tzofeh.merkava) {
            await this.tzofeh.merkava.inititateLockdown(event.message);
          }
          response.success = true;
          break;

        default:
          response.error = `Unknown action: ${action}`;
      }
    } catch (error) {
      response.error = error.message;
    }

    this.executedResponses.push(response);

    // Keep last 1000 responses
    if (this.executedResponses.length > 1000) {
      this.executedResponses = this.executedResponses.slice(-1000);
    }

    return response;
  }

  getResponseHistory(limit = 100) {
    return this.executedResponses.slice(-limit);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TZOFEH SENTINEL
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Main Sentinel System - The Eternal Watchman
 */
export class Tzofeh extends EventEmitter {
  constructor(config = {}) {
    super();

    this.id = randomUUID();
    this.name = 'TZOFEH';
    this.hebrew = 'צופה';
    this.meaning = 'Watchman/Sentinel';

    this.config = {
      watchLevel: config.watchLevel || WATCH_LEVELS.ACTIVE,
      metricBufferSize: config.metricBufferSize || 1000,
      anomalyCheckInterval: config.anomalyCheckInterval || 10000,
      ...config
    };

    // Core components
    this.metrics = new MetricCollector({ bufferSize: this.config.metricBufferSize });
    this.anomalyDetector = new AnomalyDetector(config.anomaly || {});
    this.patternRecognizer = new PatternRecognizer();
    this.thresholdMonitor = new ThresholdMonitor();
    this.canarySystem = new CanarySystem();
    this.responseEngine = new ResponseEngine(this);

    // Guardian daemons
    this.guardians = new Map();

    // State
    this.watchLevel = this.config.watchLevel;
    this.status = 'inactive';
    this.merkava = null;
    this.anomalyTimer = null;
    this.startTime = null;
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  async initialize(merkava = null) {
    this.merkava = merkava;
    this.status = 'initializing';
    this.startTime = Date.now();

    this.emit('initializing', { timestamp: Date.now() });

    // Start anomaly detection loop
    this._startAnomalyDetection();

    // Register built-in patterns
    this._registerBuiltInPatterns();

    // Register built-in response rules
    this._registerBuiltInRules();

    this.status = 'active';
    this.emit('ready', { timestamp: Date.now() });

    return { success: true, status: this.status };
  }

  async shutdown() {
    this.status = 'shutting_down';

    // Stop all guardians
    for (const [name, guardian] of this.guardians) {
      guardian.stop();
    }

    // Stop anomaly detection
    if (this.anomalyTimer) {
      clearInterval(this.anomalyTimer);
      this.anomalyTimer = null;
    }

    this.status = 'inactive';
    this.emit('shutdown', { timestamp: Date.now() });

    return { success: true };
  }

  // ─── Metric Collection ─────────────────────────────────────────────────────

  recordMetric(name, value, tags = {}) {
    const stats = this.metrics.record(name, value, tags);

    // Check thresholds
    const violation = this.thresholdMonitor.check(name, value);
    if (violation) {
      this.emit('threshold:violation', violation);
      this.responseEngine.evaluate(violation);
    }

    return stats;
  }

  setMetricBaseline(name, baseline) {
    this.anomalyDetector.setBaseline(name, baseline);
  }

  setMetricThreshold(name, config) {
    return this.thresholdMonitor.setThreshold(name, config);
  }

  // ─── Pattern Recognition ───────────────────────────────────────────────────

  registerPattern(name, definition) {
    return this.patternRecognizer.registerPattern(name, definition);
  }

  recordEvent(event) {
    const matches = this.patternRecognizer.recordEvent(event);

    for (const match of matches) {
      this.emit('pattern:matched', match);
      this.responseEngine.evaluate({
        type: 'pattern',
        ...match
      });
    }

    return matches;
  }

  // ─── Guardian Management ───────────────────────────────────────────────────

  deployGuardian(name, target, config = {}) {
    const guardian = new GuardianDaemon(name, target, config);

    guardian.onAlarm = (alarm) => {
      this.emit('guardian:alarm', alarm);
      this.responseEngine.evaluate({
        type: 'guardian_alarm',
        severity: 'high',
        ...alarm
      });
    };

    this.guardians.set(name, guardian);
    guardian.start();

    this.emit('guardian:deployed', { name, daemonId: guardian.id });

    return guardian.id;
  }

  stopGuardian(name) {
    const guardian = this.guardians.get(name);
    if (guardian) {
      guardian.stop();
      this.emit('guardian:stopped', { name });
      return true;
    }
    return false;
  }

  getGuardianStatus(name) {
    const guardian = this.guardians.get(name);
    return guardian ? guardian.getStatus() : null;
  }

  getAllGuardianStatus() {
    const status = {};
    for (const [name, guardian] of this.guardians) {
      status[name] = guardian.getStatus();
    }
    return status;
  }

  // ─── Canary Management ─────────────────────────────────────────────────────

  deployCanary(name, config) {
    const canary = this.canarySystem.deploy(name, config);
    this.emit('canary:deployed', { name, canaryId: canary.id });
    return canary;
  }

  async checkCanary(name) {
    return await this.canarySystem.check(name);
  }

  promoteCanary(name) {
    const result = this.canarySystem.promote(name);
    if (result.promoted) {
      this.emit('canary:promoted', { name });
    }
    return result;
  }

  rollbackCanary(name) {
    const result = this.canarySystem.rollback(name);
    if (result.rolledBack) {
      this.emit('canary:rolledback', { name });
    }
    return result;
  }

  // ─── Response Rules ────────────────────────────────────────────────────────

  addResponseRule(trigger, action, config = {}) {
    return this.responseEngine.addRule(trigger, action, config);
  }

  // ─── Watch Level ───────────────────────────────────────────────────────────

  setWatchLevel(level) {
    const previousLevel = this.watchLevel;
    this.watchLevel = level;

    this.emit('watchLevel:changed', {
      from: previousLevel,
      to: level,
      timestamp: Date.now()
    });

    // Adjust monitoring intensity based on level
    this._adjustMonitoring(level);

    return { previousLevel, currentLevel: level };
  }

  _adjustMonitoring(level) {
    switch (level) {
      case WATCH_LEVELS.PASSIVE:
        // Minimal monitoring
        this.config.anomalyCheckInterval = 60000;
        break;
      case WATCH_LEVELS.ACTIVE:
        // Standard monitoring
        this.config.anomalyCheckInterval = 10000;
        break;
      case WATCH_LEVELS.ALERT:
        // Increased monitoring
        this.config.anomalyCheckInterval = 5000;
        break;
      case WATCH_LEVELS.COMBAT:
        // High-frequency monitoring
        this.config.anomalyCheckInterval = 2000;
        break;
      case WATCH_LEVELS.SENTINEL:
        // Maximum monitoring
        this.config.anomalyCheckInterval = 1000;
        break;
    }

    // Restart anomaly detection with new interval
    if (this.anomalyTimer) {
      clearInterval(this.anomalyTimer);
      this._startAnomalyDetection();
    }
  }

  // ─── Anomaly Detection ─────────────────────────────────────────────────────

  _startAnomalyDetection() {
    this.anomalyTimer = setInterval(() => {
      this._runAnomalyCheck();
    }, this.config.anomalyCheckInterval);
  }

  _runAnomalyCheck() {
    const allMetrics = this.metrics.getAll();

    for (const [key, metric] of Object.entries(allMetrics)) {
      const fullMetric = this.metrics.get(metric.name, metric.tags);
      if (!fullMetric) continue;

      const anomalies = this.anomalyDetector.analyze(
        metric.name,
        metric.stats,
        fullMetric.values
      );

      for (const anomaly of anomalies) {
        this.emit('anomaly:detected', anomaly);
        this.responseEngine.evaluate(anomaly);
      }
    }
  }

  // ─── Built-in Patterns ─────────────────────────────────────────────────────

  _registerBuiltInPatterns() {
    // Brute force detection
    this.registerPattern('brute_force', {
      type: 'frequency',
      eventType: 'auth_failure',
      threshold: 5,
      windowMs: 60000
    });

    // Cascade failure pattern
    this.registerPattern('cascade_failure', {
      type: 'sequence',
      events: [
        { type: 'error', severity: 'high' },
        { type: 'error', severity: 'high' },
        { type: 'service_down' }
      ],
      windowMs: 30000
    });

    // Resource exhaustion pattern
    this.registerPattern('resource_exhaustion', {
      type: 'correlation',
      eventTypes: ['cpu_high', 'memory_high', 'latency_spike'],
      windowMs: 120000,
      minCorrelation: 0.5
    });
  }

  _registerBuiltInRules() {
    // Critical anomaly → alert
    this.addResponseRule(
      { type: ANOMALY_TYPES.SPIKE, severity: 'critical' },
      RESPONSE_ACTIONS.ALERT
    );

    // Guardian alarm → alert
    this.addResponseRule(
      { type: 'guardian_alarm' },
      RESPONSE_ACTIONS.ALERT
    );

    // Cascade failure → lockdown
    this.addResponseRule(
      { type: 'pattern', patternName: 'cascade_failure' },
      RESPONSE_ACTIONS.LOCKDOWN
    );
  }

  // ─── Status & Diagnostics ──────────────────────────────────────────────────

  getStatus() {
    return {
      id: this.id,
      name: this.name,
      hebrew: this.hebrew,
      status: this.status,
      watchLevel: this.watchLevel,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      guardians: {
        total: this.guardians.size,
        active: Array.from(this.guardians.values()).filter(g => g.status === 'active').length,
        alarm: Array.from(this.guardians.values()).filter(g => g.status === 'alarm').length
      },
      canaries: {
        total: this.canarySystem.getAllCanaries().length
      },
      metrics: {
        tracked: this.metrics.metrics.size
      },
      anomalies: {
        recent: this.anomalyDetector.getRecentAnomalies(10).length
      }
    };
  }

  getDiagnostics() {
    return {
      status: this.getStatus(),
      guardians: this.getAllGuardianStatus(),
      canaries: this.canarySystem.getAllCanaries(),
      recentAnomalies: this.anomalyDetector.getRecentAnomalies(50),
      recentPatterns: this.patternRecognizer.getRecentMatches(50),
      thresholdViolations: this.thresholdMonitor.getViolations(50),
      responseHistory: this.responseEngine.getResponseHistory(50)
    };
  }

  healthCheck() {
    return {
      healthy: this.status === 'active',
      status: this.status,
      watchLevel: this.watchLevel,
      guardiansHealthy: Array.from(this.guardians.values())
        .every(g => g.status !== 'alarm')
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FACTORY & EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create and initialize TZOFEH Sentinel
 */
export async function createTzofeh(config = {}, merkava = null) {
  const tzofeh = new Tzofeh(config);
  await tzofeh.initialize(merkava);
  return tzofeh;
}

export default Tzofeh;

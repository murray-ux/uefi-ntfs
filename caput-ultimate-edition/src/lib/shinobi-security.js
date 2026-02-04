/**
 * SHINOBI SECURITY LAYER
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
 * 忍 (Shinobi) = Ninja — The silent guardian protecting EBEN
 *
 * Military-grade stealth security with:
 *   - Hidden admin panel (invisible to unauthorized users)
 *   - Multi-factor ninja authentication
 *   - Decoy systems and honeypots
 *   - Intrusion detection with shadow monitoring
 *   - Self-destruct protocols
 *   - Stealth mode operations
 *   - Smoke screen diversions
 *
 * "Like shadow, the ninja moves unseen. Like stone, they stand unshaken."
 *
 * @module SHINOBI
 * @author Murray Bembrick <Founder & Lead Developer>
 * @version 2.0.0
 * @license Apache-2.0
 */

import { EventEmitter } from 'events';
import { createHash, randomUUID, randomBytes, timingSafeEqual, createHmac } from 'crypto';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

export const THREAT_LEVELS = {
  SAFE: 0,
  GUARDED: 1,
  ELEVATED: 2,
  HIGH: 3,
  SEVERE: 4,
  CRITICAL: 5
};

export const ACCESS_LEVELS = {
  NONE: 0,
  GUEST: 1,
  USER: 2,
  TRUSTED: 3,
  OPERATOR: 4,
  ADMIN: 5,
  SHADOW_ADMIN: 6,  // Hidden super-admin
  SHOGUN: 7         // Ultimate authority
};

export const STEALTH_MODES = {
  VISIBLE: 'visible',       // Normal operation
  LOW_PROFILE: 'low',       // Reduced logging
  GHOST: 'ghost',           // Minimal footprint
  SHADOW: 'shadow',         // Near invisible
  PHANTOM: 'phantom'        // Complete stealth
};

// Secret access patterns (Konami-style sequences)
const SECRET_SEQUENCES = {
  ADMIN_REVEAL: ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'b', 'a'],
  SHADOW_MODE: ['shadow', 'smoke', 'vanish'],
  EMERGENCY_LOCK: ['lock', 'seal', 'protect'],
  SELF_DESTRUCT: ['burn', 'after', 'reading']
};

// ══════════════════════════════════════════════════════════════════════════════
// NINJA IDENTITY
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Ninja identity with stealth capabilities
 */
export class NinjaIdentity {
  constructor(options = {}) {
    this.id = options.id || `ninja-${randomUUID().slice(0, 8)}`;
    this.codename = options.codename || this._generateCodename();
    this.accessLevel = options.accessLevel || ACCESS_LEVELS.NONE;
    this.clan = options.clan || 'ronin';  // Clan affiliation

    // Authentication factors
    this.factors = {
      knowledge: null,    // Password/passphrase
      possession: null,   // Token/device
      inherence: null,    // Biometric hash
      location: null,     // Geo-fence
      time: null          // Time-based window
    };

    // Session state
    this.authenticated = false;
    this.sessionId = null;
    this.sessionStart = null;
    this.lastActivity = null;

    // Stealth state
    this.stealthMode = STEALTH_MODES.VISIBLE;
    this.shadowActive = false;

    // Activity tracking
    this.activityLog = [];
    this.suspiciousActivities = 0;
  }

  _generateCodename() {
    const prefixes = ['Shadow', 'Silent', 'Swift', 'Storm', 'Steel', 'Stone', 'Smoke'];
    const suffixes = ['Dragon', 'Tiger', 'Crane', 'Viper', 'Wolf', 'Hawk', 'Phoenix'];
    return `${prefixes[Math.floor(Math.random() * prefixes.length)]}${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
  }

  /**
   * Set authentication factor
   */
  setFactor(type, value) {
    if (this.factors.hasOwnProperty(type)) {
      // Hash sensitive values
      this.factors[type] = createHash('sha256').update(value).digest('hex');
    }
  }

  /**
   * Verify authentication factor
   */
  verifyFactor(type, value) {
    if (!this.factors[type]) return false;

    const hash = createHash('sha256').update(value).digest('hex');
    return timingSafeEqual(
      Buffer.from(this.factors[type]),
      Buffer.from(hash)
    );
  }

  /**
   * Start authenticated session
   */
  startSession() {
    this.authenticated = true;
    this.sessionId = randomUUID();
    this.sessionStart = Date.now();
    this.lastActivity = Date.now();
    return this.sessionId;
  }

  /**
   * End session
   */
  endSession() {
    this.authenticated = false;
    this.sessionId = null;
    this.sessionStart = null;
    this.shadowActive = false;
  }

  /**
   * Enter shadow mode (invisible operations)
   */
  enterShadow() {
    if (this.accessLevel >= ACCESS_LEVELS.SHADOW_ADMIN) {
      this.shadowActive = true;
      this.stealthMode = STEALTH_MODES.SHADOW;
      return true;
    }
    return false;
  }

  /**
   * Log activity
   */
  logActivity(action, details = {}) {
    if (this.stealthMode === STEALTH_MODES.PHANTOM) {
      return; // No logging in phantom mode
    }

    this.activityLog.push({
      timestamp: Date.now(),
      action,
      details,
      stealth: this.stealthMode !== STEALTH_MODES.VISIBLE
    });

    this.lastActivity = Date.now();

    // Keep only recent activities
    if (this.activityLog.length > 1000) {
      this.activityLog = this.activityLog.slice(-500);
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HIDDEN GATEWAY
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Hidden entry point to admin systems
 * Appears as normal 404 or mundane endpoint
 */
export class HiddenGateway {
  constructor(options = {}) {
    this.secretPaths = new Map();
    this.decoyPaths = new Map();
    this.accessLog = [];
    this.trapTriggers = [];

    // Secret knock pattern
    this.knockSequence = [];
    this.knockTimeout = null;
    this.knockWindow = options.knockWindow || 5000;

    // Camouflage responses
    this.camouflage = options.camouflage || {
      type: '404',
      message: 'Not Found'
    };

    this._setupDefaultDecoys();
  }

  _setupDefaultDecoys() {
    // Decoy admin paths that trigger alerts
    const decoyEndpoints = [
      '/admin',
      '/administrator',
      '/wp-admin',
      '/admin.php',
      '/login',
      '/dashboard',
      '/control-panel',
      '/cpanel',
      '/manager',
      '/phpmyadmin',
      '/.env',
      '/config.php',
      '/backup',
      '/db',
      '/database'
    ];

    decoyEndpoints.forEach(path => {
      this.decoyPaths.set(path, {
        type: 'honeypot',
        alertLevel: THREAT_LEVELS.ELEVATED,
        response: this._generateDecoyResponse(path)
      });
    });
  }

  _generateDecoyResponse(path) {
    // Believable fake responses to waste attacker time
    if (path.includes('admin') || path.includes('login')) {
      return {
        status: 200,
        contentType: 'text/html',
        body: `<!DOCTYPE html><html><head><title>Login</title></head><body>
          <form method="post"><input name="user" placeholder="Username">
          <input name="pass" type="password" placeholder="Password">
          <button>Login</button></form></body></html>`
      };
    }
    return { status: 404, body: 'Not Found' };
  }

  /**
   * Register secret path
   */
  registerSecretPath(path, handler, options = {}) {
    const secretPath = {
      handler,
      requiredLevel: options.requiredLevel || ACCESS_LEVELS.ADMIN,
      requiresKnock: options.requiresKnock || false,
      timeWindow: options.timeWindow,  // Only accessible during certain times
      maxAttempts: options.maxAttempts || 3,
      attempts: 0
    };

    // Hash the path so it can't be discovered via code inspection
    const pathHash = createHash('sha256').update(path).digest('hex').slice(0, 16);
    this.secretPaths.set(pathHash, secretPath);

    return pathHash;
  }

  /**
   * Process incoming request
   */
  async processRequest(path, context = {}) {
    const pathHash = createHash('sha256').update(path).digest('hex').slice(0, 16);

    // Check for decoy (honeypot)
    if (this.decoyPaths.has(path)) {
      const decoy = this.decoyPaths.get(path);

      this._logAccess(path, context, 'honeypot_triggered');
      this._triggerAlert(decoy.alertLevel, {
        type: 'honeypot_access',
        path,
        context
      });

      return decoy.response;
    }

    // Check for secret path
    if (this.secretPaths.has(pathHash)) {
      const secret = this.secretPaths.get(pathHash);

      // Verify access level
      if (!context.identity || context.identity.accessLevel < secret.requiredLevel) {
        secret.attempts++;

        if (secret.attempts >= secret.maxAttempts) {
          this._triggerAlert(THREAT_LEVELS.HIGH, {
            type: 'secret_path_brute_force',
            path,
            attempts: secret.attempts
          });
        }

        return this.camouflage;
      }

      // Verify time window if specified
      if (secret.timeWindow) {
        const hour = new Date().getHours();
        if (hour < secret.timeWindow.start || hour > secret.timeWindow.end) {
          return this.camouflage;
        }
      }

      // Check knock sequence if required
      if (secret.requiresKnock && !this._verifyKnock()) {
        return this.camouflage;
      }

      // Access granted
      this._logAccess(path, context, 'secret_access_granted');
      return await secret.handler(context);
    }

    // Unknown path - return camouflage
    this._logAccess(path, context, 'unknown_path');
    return this.camouflage;
  }

  /**
   * Record knock (part of secret sequence)
   */
  knock(signal) {
    this.knockSequence.push({ signal, time: Date.now() });

    // Clear old knocks
    clearTimeout(this.knockTimeout);
    this.knockTimeout = setTimeout(() => {
      this.knockSequence = [];
    }, this.knockWindow);
  }

  /**
   * Verify knock sequence
   */
  _verifyKnock() {
    const signals = this.knockSequence.map(k => k.signal);

    // Check against secret sequences
    for (const [name, sequence] of Object.entries(SECRET_SEQUENCES)) {
      if (signals.length >= sequence.length) {
        const recent = signals.slice(-sequence.length);
        if (JSON.stringify(recent) === JSON.stringify(sequence)) {
          this.knockSequence = [];
          return name;
        }
      }
    }

    return false;
  }

  _logAccess(path, context, type) {
    this.accessLog.push({
      timestamp: Date.now(),
      path,
      type,
      ip: context.ip,
      userAgent: context.userAgent,
      identity: context.identity?.codename
    });

    // Trim log
    if (this.accessLog.length > 10000) {
      this.accessLog = this.accessLog.slice(-5000);
    }
  }

  _triggerAlert(level, data) {
    this.trapTriggers.push({
      timestamp: Date.now(),
      level,
      data
    });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SHADOW MONITOR
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Invisible monitoring system
 * Watches without being detected
 */
export class ShadowMonitor {
  constructor(options = {}) {
    this.watchers = new Map();
    this.anomalyBaseline = new Map();
    this.alerts = [];
    this.threatLevel = THREAT_LEVELS.SAFE;

    // Behavioral analysis
    this.behaviorProfiles = new Map();
    this.suspiciousPatterns = [];

    // Stealth settings
    this.invisible = options.invisible ?? true;
    this.silentAlerts = options.silentAlerts ?? true;
  }

  /**
   * Add behavior watcher
   */
  watch(subject, patterns = {}) {
    this.watchers.set(subject, {
      patterns,
      observations: [],
      anomalyScore: 0,
      startTime: Date.now()
    });
  }

  /**
   * Record observation
   */
  observe(subject, event, data = {}) {
    const watcher = this.watchers.get(subject);
    if (!watcher) return;

    const observation = {
      timestamp: Date.now(),
      event,
      data,
      anomalyContribution: 0
    };

    // Check against patterns
    if (watcher.patterns[event]) {
      const pattern = watcher.patterns[event];

      // Rate check
      if (pattern.maxRate) {
        const recentCount = watcher.observations
          .filter(o => o.event === event && o.timestamp > Date.now() - 60000)
          .length;

        if (recentCount > pattern.maxRate) {
          observation.anomalyContribution = 0.5;
          this._recordAnomaly(subject, event, 'rate_exceeded', { rate: recentCount });
        }
      }

      // Value check
      if (pattern.expectedValues && data.value !== undefined) {
        if (!pattern.expectedValues.includes(data.value)) {
          observation.anomalyContribution = 0.3;
          this._recordAnomaly(subject, event, 'unexpected_value', data);
        }
      }
    }

    watcher.observations.push(observation);
    watcher.anomalyScore += observation.anomalyContribution;

    // Update threat level
    this._updateThreatLevel();

    // Trim observations
    if (watcher.observations.length > 1000) {
      watcher.observations = watcher.observations.slice(-500);
    }
  }

  /**
   * Analyze behavior for anomalies
   */
  analyzeBehavior(subject) {
    const watcher = this.watchers.get(subject);
    if (!watcher) return null;

    const observations = watcher.observations;
    if (observations.length < 10) return { status: 'insufficient_data' };

    // Time-based analysis
    const hourlyDistribution = new Array(24).fill(0);
    observations.forEach(o => {
      const hour = new Date(o.timestamp).getHours();
      hourlyDistribution[hour]++;
    });

    // Event frequency analysis
    const eventCounts = {};
    observations.forEach(o => {
      eventCounts[o.event] = (eventCounts[o.event] || 0) + 1;
    });

    // Sequence analysis (look for unusual patterns)
    const sequences = [];
    for (let i = 0; i < observations.length - 2; i++) {
      sequences.push([
        observations[i].event,
        observations[i + 1].event,
        observations[i + 2].event
      ].join('→'));
    }

    const sequenceCounts = {};
    sequences.forEach(s => {
      sequenceCounts[s] = (sequenceCounts[s] || 0) + 1;
    });

    // Find anomalous sequences (appeared only once = unusual)
    const unusualSequences = Object.entries(sequenceCounts)
      .filter(([_, count]) => count === 1)
      .map(([seq]) => seq);

    return {
      subject,
      observationCount: observations.length,
      anomalyScore: watcher.anomalyScore,
      hourlyActivity: hourlyDistribution,
      eventDistribution: eventCounts,
      unusualPatterns: unusualSequences.slice(0, 10),
      riskAssessment: this._assessRisk(watcher.anomalyScore)
    };
  }

  _recordAnomaly(subject, event, type, data) {
    const anomaly = {
      timestamp: Date.now(),
      subject,
      event,
      type,
      data
    };

    this.suspiciousPatterns.push(anomaly);

    if (!this.silentAlerts) {
      this.alerts.push({
        ...anomaly,
        level: THREAT_LEVELS.ELEVATED
      });
    }
  }

  _updateThreatLevel() {
    const recentAnomalies = this.suspiciousPatterns
      .filter(a => a.timestamp > Date.now() - 300000); // Last 5 minutes

    if (recentAnomalies.length >= 20) {
      this.threatLevel = THREAT_LEVELS.CRITICAL;
    } else if (recentAnomalies.length >= 10) {
      this.threatLevel = THREAT_LEVELS.HIGH;
    } else if (recentAnomalies.length >= 5) {
      this.threatLevel = THREAT_LEVELS.ELEVATED;
    } else if (recentAnomalies.length >= 2) {
      this.threatLevel = THREAT_LEVELS.GUARDED;
    } else {
      this.threatLevel = THREAT_LEVELS.SAFE;
    }
  }

  _assessRisk(anomalyScore) {
    if (anomalyScore >= 5) return 'critical';
    if (anomalyScore >= 3) return 'high';
    if (anomalyScore >= 1) return 'medium';
    if (anomalyScore >= 0.5) return 'low';
    return 'minimal';
  }

  /**
   * Get threat status
   */
  getThreatStatus() {
    return {
      level: this.threatLevel,
      levelName: Object.keys(THREAT_LEVELS).find(k => THREAT_LEVELS[k] === this.threatLevel),
      activeWatchers: this.watchers.size,
      recentAnomalies: this.suspiciousPatterns.filter(a => a.timestamp > Date.now() - 300000).length,
      alerts: this.silentAlerts ? 0 : this.alerts.length
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SMOKE SCREEN
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Diversion and misdirection system
 */
export class SmokeScreen {
  constructor() {
    this.active = false;
    this.screens = new Map();
    this.diversions = [];
  }

  /**
   * Create smoke screen (fake data)
   */
  createScreen(name, generator) {
    this.screens.set(name, {
      generator,
      accessCount: 0,
      lastAccess: null
    });
  }

  /**
   * Deploy smoke screen
   */
  deploy(name) {
    const screen = this.screens.get(name);
    if (!screen) return null;

    screen.accessCount++;
    screen.lastAccess = Date.now();

    return screen.generator();
  }

  /**
   * Generate fake admin panel
   */
  static fakeAdminPanel() {
    return {
      type: 'html',
      content: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>System Administration</title>
          <style>
            body { font-family: Arial, sans-serif; background: #1a1a2e; color: #eee; padding: 20px; }
            .panel { background: #16213e; border-radius: 8px; padding: 20px; margin: 10px 0; }
            .stat { font-size: 24px; color: #0f3460; }
            input, button { padding: 10px; margin: 5px; border-radius: 4px; border: 1px solid #333; }
            button { background: #e94560; color: white; cursor: pointer; }
            .warning { color: #e94560; }
          </style>
        </head>
        <body>
          <h1>System Administration Panel</h1>
          <div class="panel">
            <h3>System Status</h3>
            <p>CPU: <span class="stat">23%</span> | Memory: <span class="stat">4.2GB</span> | Disk: <span class="stat">67%</span></p>
          </div>
          <div class="panel">
            <h3>Quick Actions</h3>
            <button onclick="alert('Access Denied')">Restart Services</button>
            <button onclick="alert('Access Denied')">Clear Logs</button>
            <button onclick="alert('Access Denied')">Backup Database</button>
          </div>
          <div class="panel">
            <h3>Recent Logins</h3>
            <p class="warning">Warning: 3 failed login attempts detected</p>
            <ul>
              <li>admin - 192.168.1.100 - 2 minutes ago</li>
              <li>root - 10.0.0.1 - 15 minutes ago</li>
            </ul>
          </div>
          <form>
            <h3>Command Console</h3>
            <input type="text" placeholder="Enter command..." style="width: 300px;">
            <button type="submit">Execute</button>
          </form>
        </body>
        </html>
      `
    };
  }

  /**
   * Generate fake evidence
   */
  static fakeEvidence() {
    const fakeItems = [];
    for (let i = 0; i < 10; i++) {
      fakeItems.push({
        id: `FAKE-${randomUUID().slice(0, 8)}`,
        title: `Document ${i + 1}`,
        type: 'document',
        date: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
        status: 'classified'
      });
    }
    return fakeItems;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SELF-DESTRUCT PROTOCOL
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Emergency data protection
 */
export class SelfDestructProtocol {
  constructor(options = {}) {
    this.armed = false;
    this.countdown = null;
    this.countdownSeconds = options.countdownSeconds || 30;
    this.targets = [];
    this.abortCode = options.abortCode || randomBytes(16).toString('hex');
    this.triggered = false;
    this.onDestruct = options.onDestruct || (() => {});
  }

  /**
   * Register target for destruction
   */
  registerTarget(target) {
    this.targets.push(target);
  }

  /**
   * Arm the self-destruct
   */
  arm(authCode) {
    // Verify authorization
    const expectedHash = createHash('sha256').update(authCode).digest('hex');
    if (!this.authHash) {
      this.authHash = expectedHash;
    } else if (expectedHash !== this.authHash) {
      return { success: false, error: 'Invalid authorization' };
    }

    this.armed = true;
    return { success: true, abortCode: this.abortCode };
  }

  /**
   * Initiate countdown
   */
  initiate(confirmCode) {
    if (!this.armed) {
      return { success: false, error: 'System not armed' };
    }

    const expectedHash = createHash('sha256').update(confirmCode).digest('hex');
    if (expectedHash !== this.authHash) {
      return { success: false, error: 'Invalid confirmation' };
    }

    this.countdown = this.countdownSeconds;
    this.triggered = true;

    const tick = () => {
      if (this.countdown <= 0) {
        this._executeDestruct();
        return;
      }

      if (!this.triggered) {
        return; // Aborted
      }

      this.countdown--;
      setTimeout(tick, 1000);
    };

    tick();

    return {
      success: true,
      countdown: this.countdown,
      message: `Self-destruct initiated. ${this.countdown} seconds remaining.`
    };
  }

  /**
   * Abort self-destruct
   */
  abort(abortCode) {
    if (abortCode !== this.abortCode) {
      return { success: false, error: 'Invalid abort code' };
    }

    this.triggered = false;
    this.armed = false;
    this.countdown = null;

    return { success: true, message: 'Self-destruct aborted' };
  }

  _executeDestruct() {
    // Secure wipe all targets
    this.targets.forEach(target => {
      if (typeof target.secureWipe === 'function') {
        target.secureWipe();
      } else if (typeof target.lock === 'function') {
        target.lock();
      }
    });

    this.onDestruct();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN SHINOBI CLASS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * SHINOBI - Ninja Security Layer
 * Protects EBEN evidence vault with stealth and shadow
 */
export class Shinobi extends EventEmitter {
  constructor(options = {}) {
    super();

    // Core components
    this.gateway = new HiddenGateway(options.gateway);
    this.monitor = new ShadowMonitor(options.monitor);
    this.smokeScreen = new SmokeScreen();
    this.destruct = new SelfDestructProtocol(options.destruct);

    // Identity management
    this.identities = new Map();
    this.sessions = new Map();

    // Secret token for admin access
    this.adminToken = options.adminToken || randomBytes(32).toString('hex');
    this.adminTokenHash = createHash('sha256').update(this.adminToken).digest('hex');

    // Stealth state
    this.stealthMode = STEALTH_MODES.VISIBLE;
    this.cloaked = false;

    // Protected resource (EBEN)
    this.protectedResource = null;

    // Setup smoke screens
    this._setupSmokeScreens();

    // Setup admin paths
    this._setupAdminPaths();
  }

  _setupSmokeScreens() {
    this.smokeScreen.createScreen('admin', SmokeScreen.fakeAdminPanel);
    this.smokeScreen.createScreen('evidence', SmokeScreen.fakeEvidence);
  }

  _setupAdminPaths() {
    // The real admin panel - accessible only via secret path
    // Path is hashed, so even code inspection won't reveal it
    const secretAdminPath = `/api/v1/${this.adminTokenHash.slice(0, 8)}/shadow-control`;

    this.gateway.registerSecretPath(secretAdminPath, async (context) => {
      return {
        status: 200,
        type: 'json',
        body: {
          access: 'granted',
          level: 'SHADOW_ADMIN',
          capabilities: [
            'evidence_management',
            'audit_access',
            'system_control',
            'stealth_operations'
          ]
        }
      };
    }, {
      requiredLevel: ACCESS_LEVELS.SHADOW_ADMIN,
      requiresKnock: true
    });
  }

  /**
   * Protect a resource (EBEN)
   */
  protect(resource) {
    this.protectedResource = resource;
    this.destruct.registerTarget(resource);

    // Setup monitoring
    this.monitor.watch('eben', {
      'access': { maxRate: 100 },
      'export': { maxRate: 10 },
      'delete': { maxRate: 5 }
    });
  }

  /**
   * Create ninja identity
   */
  createIdentity(options = {}) {
    const identity = new NinjaIdentity(options);
    this.identities.set(identity.id, identity);

    this.monitor.observe('system', 'identity_created', {
      id: identity.id,
      codename: identity.codename
    });

    return identity;
  }

  /**
   * Authenticate identity
   */
  async authenticate(identityId, factors = {}) {
    const identity = this.identities.get(identityId);
    if (!identity) {
      return { success: false, error: 'Identity not found' };
    }

    // Verify all provided factors
    const verifiedFactors = [];
    for (const [type, value] of Object.entries(factors)) {
      if (identity.verifyFactor(type, value)) {
        verifiedFactors.push(type);
      }
    }

    // Require at least one factor
    if (verifiedFactors.length === 0) {
      this.monitor.observe(identityId, 'auth_failed', { factors: Object.keys(factors) });
      return { success: false, error: 'Authentication failed' };
    }

    // Higher access requires more factors
    const requiredFactors = identity.accessLevel >= ACCESS_LEVELS.ADMIN ? 2 : 1;
    if (verifiedFactors.length < requiredFactors) {
      return {
        success: false,
        error: `Access level requires ${requiredFactors} factors, ${verifiedFactors.length} provided`
      };
    }

    // Start session
    const sessionId = identity.startSession();
    this.sessions.set(sessionId, identity);

    this.monitor.observe(identityId, 'auth_success', {
      sessionId,
      factors: verifiedFactors
    });

    return {
      success: true,
      sessionId,
      codename: identity.codename,
      accessLevel: identity.accessLevel
    };
  }

  /**
   * Verify admin token
   */
  verifyAdminToken(token) {
    const hash = createHash('sha256').update(token).digest('hex');
    return timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(this.adminTokenHash)
    );
  }

  /**
   * Grant admin access (requires token)
   */
  grantAdminAccess(identityId, token) {
    if (!this.verifyAdminToken(token)) {
      this.monitor.observe('system', 'admin_access_denied', { identityId });
      return false;
    }

    const identity = this.identities.get(identityId);
    if (!identity) return false;

    identity.accessLevel = ACCESS_LEVELS.SHADOW_ADMIN;

    this.monitor.observe(identityId, 'admin_access_granted', {
      level: 'SHADOW_ADMIN'
    });

    // Verify admin on protected resource
    if (this.protectedResource?.verifyAdmin) {
      this.protectedResource.verifyAdmin(token);
    }

    return true;
  }

  /**
   * Process secret knock
   */
  knock(signal) {
    this.gateway.knock(signal);
  }

  /**
   * Handle request (checks for secret paths, honeypots, etc.)
   */
  async handleRequest(path, context = {}) {
    // Add identity if session exists
    if (context.sessionId) {
      context.identity = this.sessions.get(context.sessionId);
    }

    // Monitor the request
    this.monitor.observe(
      context.identity?.id || 'anonymous',
      'request',
      { path, method: context.method }
    );

    // Process through gateway
    return this.gateway.processRequest(path, context);
  }

  /**
   * Enter stealth mode
   */
  enterStealth(level = STEALTH_MODES.SHADOW) {
    this.stealthMode = level;
    this.cloaked = true;

    if (level === STEALTH_MODES.PHANTOM) {
      this.monitor.invisible = true;
      this.monitor.silentAlerts = true;
    }

    this.emit('stealth:enter', { level });
  }

  /**
   * Exit stealth mode
   */
  exitStealth() {
    this.stealthMode = STEALTH_MODES.VISIBLE;
    this.cloaked = false;
    this.monitor.invisible = false;

    this.emit('stealth:exit');
  }

  /**
   * Arm self-destruct
   */
  armDestruct(authCode) {
    return this.destruct.arm(authCode);
  }

  /**
   * Get system status
   */
  status() {
    return {
      stealthMode: this.stealthMode,
      cloaked: this.cloaked,
      threatLevel: this.monitor.getThreatStatus(),
      activeSessions: this.sessions.size,
      identityCount: this.identities.size,
      destructArmed: this.destruct.armed,
      protectedResource: this.protectedResource ? 'EBEN' : null
    };
  }

  /**
   * Get admin token (only shown once, for setup)
   */
  getSetupToken() {
    const token = this.adminToken;
    // Clear after first access for security
    this.adminToken = '[REDACTED]';
    return token;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export default Shinobi;
export {
  NinjaIdentity,
  HiddenGateway,
  ShadowMonitor,
  SmokeScreen,
  SelfDestructProtocol,
  THREAT_LEVELS,
  ACCESS_LEVELS,
  STEALTH_MODES,
  SECRET_SEQUENCES
};

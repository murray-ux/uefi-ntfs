/**
 * KERUV ZERO-TRUST SECURITY GATEWAY
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Cherubim — Guardian and access control
 * Named for כרוב (Keruv) — the angelic guardians of Eden
 *
 * Features:
 *   - Zero-Trust architecture (never trust, always verify)
 *   - SPIFFE/SPIRE-compatible identity
 *   - mTLS certificate management
 *   - Policy-as-Code engine (OPA-compatible)
 *   - Rate limiting with token bucket
 *   - Anomaly-based threat detection
 *   - JWT/PASETO token handling
 *   - RBAC/ABAC hybrid authorization
 *   - Audit logging with tamper detection
 *
 * @module KERUV
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import {
  createHash,
  randomBytes,
  createHmac,
  createCipheriv,
  createDecipheriv,
  generateKeyPairSync,
  createSign,
  createVerify
} from 'crypto';

// ══════════════════════════════════════════════════════════════════════════════
// SPIFFE IDENTITY
// ══════════════════════════════════════════════════════════════════════════════

/**
 * SPIFFE-compatible identity management
 */
export class SPIFFEIdentity {
  constructor(options = {}) {
    this.trustDomain = options.trustDomain || 'genesis.local';
    this.identities = new Map();
    this.svids = new Map(); // SPIFFE Verifiable Identity Documents
  }

  /**
   * Generate SPIFFE ID
   */
  generateSpiffeId(workload) {
    return `spiffe://${this.trustDomain}/${workload}`;
  }

  /**
   * Create workload identity
   */
  async createIdentity(workload, options = {}) {
    const spiffeId = this.generateSpiffeId(workload);

    // Generate key pair
    const { publicKey, privateKey } = generateKeyPairSync('ec', {
      namedCurve: 'P-256'
    });

    // Create SVID
    const svid = {
      spiffeId,
      workload,
      publicKey: publicKey.export({ type: 'spki', format: 'pem' }),
      privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }),
      notBefore: Date.now(),
      notAfter: Date.now() + (options.ttl || 86400000), // 24h default
      serial: randomBytes(16).toString('hex'),
      issuer: `spiffe://${this.trustDomain}/ca`
    };

    // Sign the SVID
    svid.signature = this._signSvid(svid, privateKey);

    this.identities.set(spiffeId, svid);
    this.svids.set(svid.serial, svid);

    return {
      spiffeId,
      svid: {
        ...svid,
        privateKey: '[REDACTED]' // Don't return private key in normal response
      }
    };
  }

  _signSvid(svid, privateKey) {
    const sign = createSign('SHA256');
    sign.update(JSON.stringify({
      spiffeId: svid.spiffeId,
      publicKey: svid.publicKey,
      notBefore: svid.notBefore,
      notAfter: svid.notAfter,
      serial: svid.serial
    }));
    return sign.sign(privateKey, 'hex');
  }

  /**
   * Verify SVID
   */
  verifySvid(spiffeId) {
    const svid = this.identities.get(spiffeId);
    if (!svid) return { valid: false, reason: 'Identity not found' };

    const now = Date.now();
    if (now < svid.notBefore) {
      return { valid: false, reason: 'SVID not yet valid' };
    }
    if (now > svid.notAfter) {
      return { valid: false, reason: 'SVID expired' };
    }

    return { valid: true, svid };
  }

  /**
   * Rotate identity
   */
  async rotateIdentity(spiffeId) {
    const existing = this.identities.get(spiffeId);
    if (!existing) {
      throw new Error('Identity not found');
    }

    // Create new identity with same workload
    return this.createIdentity(existing.workload, {
      ttl: existing.notAfter - existing.notBefore
    });
  }

  /**
   * Revoke identity
   */
  revokeIdentity(spiffeId) {
    const svid = this.identities.get(spiffeId);
    if (svid) {
      this.svids.delete(svid.serial);
      this.identities.delete(spiffeId);
      return true;
    }
    return false;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// POLICY ENGINE (OPA-compatible)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Policy-as-Code engine
 */
export class PolicyEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.policies = new Map();
    this.defaultDecision = options.defaultDecision || 'deny';
    this.cache = new Map();
    this.cacheMaxSize = options.cacheMaxSize || 1000;
  }

  /**
   * Register policy
   */
  addPolicy(name, policy) {
    this.policies.set(name, {
      name,
      rules: policy.rules || [],
      default: policy.default || this.defaultDecision,
      priority: policy.priority || 0,
      enabled: policy.enabled !== false
    });
    this.cache.clear(); // Invalidate cache on policy change
    return this;
  }

  /**
   * Evaluate input against policies
   */
  async evaluate(input, options = {}) {
    const cacheKey = createHash('md5').update(JSON.stringify(input)).digest('hex');

    // Check cache
    if (!options.skipCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < 60000) { // 1 minute cache
        return { ...cached.result, cached: true };
      }
    }

    const results = [];

    // Sort policies by priority
    const sortedPolicies = Array.from(this.policies.values())
      .filter(p => p.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const policy of sortedPolicies) {
      const policyResult = this._evaluatePolicy(policy, input);
      results.push({
        policy: policy.name,
        ...policyResult
      });

      // Short-circuit on explicit deny
      if (policyResult.decision === 'deny' && policyResult.explicit) {
        break;
      }
    }

    // Determine final decision
    const denied = results.find(r => r.decision === 'deny');
    const allowed = results.find(r => r.decision === 'allow' && r.explicit);

    const finalDecision = denied ? 'deny' : (allowed ? 'allow' : this.defaultDecision);

    const result = {
      decision: finalDecision,
      input,
      policyResults: results,
      timestamp: Date.now()
    };

    // Cache result
    if (this.cache.size >= this.cacheMaxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(cacheKey, { result, timestamp: Date.now() });

    this.emit('decision', result);
    return result;
  }

  _evaluatePolicy(policy, input) {
    for (const rule of policy.rules) {
      const match = this._evaluateRule(rule, input);
      if (match) {
        return {
          decision: rule.effect || 'allow',
          rule: rule.name || 'unnamed',
          explicit: true
        };
      }
    }

    return {
      decision: policy.default,
      rule: 'default',
      explicit: false
    };
  }

  _evaluateRule(rule, input) {
    if (!rule.conditions) return true;

    for (const condition of rule.conditions) {
      const value = this._getNestedValue(input, condition.field);

      switch (condition.operator) {
        case 'eq':
        case '==':
          if (value !== condition.value) return false;
          break;
        case 'ne':
        case '!=':
          if (value === condition.value) return false;
          break;
        case 'gt':
        case '>':
          if (!(value > condition.value)) return false;
          break;
        case 'gte':
        case '>=':
          if (!(value >= condition.value)) return false;
          break;
        case 'lt':
        case '<':
          if (!(value < condition.value)) return false;
          break;
        case 'lte':
        case '<=':
          if (!(value <= condition.value)) return false;
          break;
        case 'in':
          if (!condition.value.includes(value)) return false;
          break;
        case 'contains':
          if (!value?.includes?.(condition.value)) return false;
          break;
        case 'matches':
          if (!new RegExp(condition.value).test(value)) return false;
          break;
        case 'exists':
          if ((value === undefined) === condition.value) return false;
          break;
      }
    }

    return true;
  }

  _getNestedValue(obj, path) {
    return path.split('.').reduce((curr, key) => curr?.[key], obj);
  }

  /**
   * Export policies
   */
  exportPolicies() {
    return Array.from(this.policies.values());
  }

  /**
   * Import policies
   */
  importPolicies(policies) {
    for (const policy of policies) {
      this.addPolicy(policy.name, policy);
    }
    return this;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// RATE LIMITER (Token Bucket)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Token bucket rate limiter
 */
export class TokenBucketRateLimiter {
  constructor(options = {}) {
    this.capacity = options.capacity || 100;
    this.refillRate = options.refillRate || 10; // tokens per second
    this.buckets = new Map();
  }

  /**
   * Get or create bucket for key
   */
  _getBucket(key) {
    if (!this.buckets.has(key)) {
      this.buckets.set(key, {
        tokens: this.capacity,
        lastRefill: Date.now()
      });
    }
    return this.buckets.get(key);
  }

  /**
   * Refill bucket
   */
  _refill(bucket) {
    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;

    bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  /**
   * Try to consume tokens
   */
  consume(key, tokens = 1) {
    const bucket = this._getBucket(key);
    this._refill(bucket);

    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        resetIn: Math.ceil((this.capacity - bucket.tokens) / this.refillRate)
      };
    }

    return {
      allowed: false,
      remaining: 0,
      resetIn: Math.ceil((tokens - bucket.tokens) / this.refillRate),
      retryAfter: Math.ceil((tokens - bucket.tokens) / this.refillRate)
    };
  }

  /**
   * Get bucket status
   */
  status(key) {
    const bucket = this._getBucket(key);
    this._refill(bucket);

    return {
      tokens: Math.floor(bucket.tokens),
      capacity: this.capacity,
      refillRate: this.refillRate
    };
  }

  /**
   * Reset bucket
   */
  reset(key) {
    this.buckets.delete(key);
    return this;
  }

  /**
   * Cleanup old buckets
   */
  cleanup(maxAge = 3600000) {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.lastRefill > maxAge) {
        this.buckets.delete(key);
      }
    }
    return this.buckets.size;
  }
}

/**
 * Sliding window rate limiter
 */
export class SlidingWindowRateLimiter {
  constructor(options = {}) {
    this.windowSize = options.windowSize || 60000; // 1 minute
    this.maxRequests = options.maxRequests || 100;
    this.windows = new Map();
  }

  consume(key) {
    const now = Date.now();
    const windowStart = now - this.windowSize;

    if (!this.windows.has(key)) {
      this.windows.set(key, []);
    }

    const requests = this.windows.get(key);

    // Remove old requests
    while (requests.length > 0 && requests[0] < windowStart) {
      requests.shift();
    }

    if (requests.length >= this.maxRequests) {
      const oldestInWindow = requests[0];
      const retryAfter = Math.ceil((oldestInWindow + this.windowSize - now) / 1000);

      return {
        allowed: false,
        remaining: 0,
        retryAfter,
        windowResetIn: retryAfter
      };
    }

    requests.push(now);

    return {
      allowed: true,
      remaining: this.maxRequests - requests.length,
      windowResetIn: Math.ceil(this.windowSize / 1000)
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// JWT/PASETO TOKEN HANDLING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Secure token handler (PASETO-inspired)
 */
export class SecureTokenHandler {
  constructor(options = {}) {
    this.secretKey = options.secretKey || randomBytes(32);
    this.algorithm = 'aes-256-gcm';
    this.issuer = options.issuer || 'genesis';
    this.defaultTtl = options.defaultTtl || 3600000; // 1 hour
  }

  /**
   * Create token
   */
  create(payload, options = {}) {
    const header = {
      alg: 'v2.local',
      typ: 'paseto'
    };

    const claims = {
      iss: this.issuer,
      iat: Date.now(),
      exp: Date.now() + (options.ttl || this.defaultTtl),
      jti: randomBytes(16).toString('hex'),
      ...payload
    };

    // Encrypt payload
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.algorithm, this.secretKey, iv);

    const plaintext = JSON.stringify(claims);
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const tag = cipher.getAuthTag();

    const token = [
      'v2',
      'local',
      Buffer.concat([iv, Buffer.from(encrypted, 'base64'), tag]).toString('base64url')
    ].join('.');

    return { token, claims };
  }

  /**
   * Verify and decrypt token
   */
  verify(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3 || parts[0] !== 'v2' || parts[1] !== 'local') {
        return { valid: false, reason: 'Invalid token format' };
      }

      const data = Buffer.from(parts[2], 'base64url');
      const iv = data.subarray(0, 12);
      const tag = data.subarray(-16);
      const ciphertext = data.subarray(12, -16);

      const decipher = createDecipheriv(this.algorithm, this.secretKey, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(ciphertext, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      const claims = JSON.parse(decrypted);

      // Verify claims
      const now = Date.now();
      if (claims.exp && claims.exp < now) {
        return { valid: false, reason: 'Token expired' };
      }
      if (claims.nbf && claims.nbf > now) {
        return { valid: false, reason: 'Token not yet valid' };
      }
      if (claims.iss !== this.issuer) {
        return { valid: false, reason: 'Invalid issuer' };
      }

      return { valid: true, claims };

    } catch (error) {
      return { valid: false, reason: 'Token verification failed', error: error.message };
    }
  }

  /**
   * Refresh token
   */
  refresh(token, options = {}) {
    const verified = this.verify(token);
    if (!verified.valid) {
      return { success: false, reason: verified.reason };
    }

    // Create new token with same payload but new timestamps
    const { iat, exp, jti, ...payload } = verified.claims;
    return this.create(payload, options);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// RBAC/ABAC AUTHORIZATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Hybrid RBAC/ABAC authorization system
 */
export class HybridAuthorizer {
  constructor() {
    this.roles = new Map();
    this.permissions = new Map();
    this.userRoles = new Map();
    this.attributePolicies = [];
  }

  /**
   * Define role
   */
  defineRole(role, config) {
    this.roles.set(role, {
      name: role,
      permissions: config.permissions || [],
      inherits: config.inherits || [],
      description: config.description || ''
    });
    return this;
  }

  /**
   * Define permission
   */
  definePermission(permission, config = {}) {
    this.permissions.set(permission, {
      name: permission,
      description: config.description || '',
      resource: config.resource || '*',
      actions: config.actions || ['*']
    });
    return this;
  }

  /**
   * Assign role to user
   */
  assignRole(userId, role) {
    if (!this.userRoles.has(userId)) {
      this.userRoles.set(userId, new Set());
    }
    this.userRoles.get(userId).add(role);
    return this;
  }

  /**
   * Remove role from user
   */
  removeRole(userId, role) {
    if (this.userRoles.has(userId)) {
      this.userRoles.get(userId).delete(role);
    }
    return this;
  }

  /**
   * Add attribute-based policy
   */
  addAttributePolicy(policy) {
    this.attributePolicies.push({
      name: policy.name,
      condition: policy.condition, // Function (subject, resource, action, context) => boolean
      effect: policy.effect || 'allow',
      priority: policy.priority || 0
    });

    // Sort by priority
    this.attributePolicies.sort((a, b) => b.priority - a.priority);
    return this;
  }

  /**
   * Get all permissions for user (including inherited)
   */
  getUserPermissions(userId) {
    const permissions = new Set();
    const roles = this.userRoles.get(userId) || new Set();

    const collectPermissions = (role, visited = new Set()) => {
      if (visited.has(role)) return;
      visited.add(role);

      const roleConfig = this.roles.get(role);
      if (!roleConfig) return;

      for (const perm of roleConfig.permissions) {
        permissions.add(perm);
      }

      for (const inherited of roleConfig.inherits) {
        collectPermissions(inherited, visited);
      }
    };

    for (const role of roles) {
      collectPermissions(role);
    }

    return permissions;
  }

  /**
   * Check authorization
   */
  authorize(subject, resource, action, context = {}) {
    const result = {
      allowed: false,
      reason: 'No matching policy',
      evaluations: []
    };

    // Check RBAC
    const permissions = this.getUserPermissions(subject.userId);
    const requiredPermission = `${resource}:${action}`;

    for (const perm of permissions) {
      if (perm === '*' || perm === requiredPermission ||
          perm === `${resource}:*` || perm === `*:${action}`) {
        result.evaluations.push({
          type: 'rbac',
          permission: perm,
          decision: 'allow'
        });
        result.allowed = true;
        result.reason = `RBAC permission: ${perm}`;
      }
    }

    // Check ABAC (can override RBAC)
    for (const policy of this.attributePolicies) {
      try {
        const match = policy.condition(subject, resource, action, context);
        if (match) {
          result.evaluations.push({
            type: 'abac',
            policy: policy.name,
            decision: policy.effect
          });

          if (policy.effect === 'deny') {
            result.allowed = false;
            result.reason = `ABAC deny: ${policy.name}`;
            break;
          } else if (policy.effect === 'allow') {
            result.allowed = true;
            result.reason = `ABAC allow: ${policy.name}`;
          }
        }
      } catch (error) {
        result.evaluations.push({
          type: 'abac',
          policy: policy.name,
          error: error.message
        });
      }
    }

    return result;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// AUDIT LOGGER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Tamper-evident audit logger
 */
export class AuditLogger extends EventEmitter {
  constructor(options = {}) {
    super();
    this.entries = [];
    this.maxEntries = options.maxEntries || 100000;
    this.hashAlgorithm = 'sha256';
    this.previousHash = null;
  }

  /**
   * Log audit event
   */
  log(event) {
    const entry = {
      id: randomBytes(16).toString('hex'),
      timestamp: Date.now(),
      ...event,
      previousHash: this.previousHash
    };

    // Calculate hash chain
    entry.hash = this._calculateHash(entry);
    this.previousHash = entry.hash;

    this.entries.push(entry);

    // Enforce max entries
    while (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    this.emit('entry', entry);
    return entry;
  }

  _calculateHash(entry) {
    const data = JSON.stringify({
      id: entry.id,
      timestamp: entry.timestamp,
      type: entry.type,
      action: entry.action,
      subject: entry.subject,
      resource: entry.resource,
      result: entry.result,
      previousHash: entry.previousHash
    });

    return createHash(this.hashAlgorithm).update(data).digest('hex');
  }

  /**
   * Verify log integrity
   */
  verifyIntegrity(startIndex = 0, endIndex = this.entries.length) {
    const violations = [];

    for (let i = startIndex; i < endIndex; i++) {
      const entry = this.entries[i];
      const calculatedHash = this._calculateHash(entry);

      if (calculatedHash !== entry.hash) {
        violations.push({
          index: i,
          entryId: entry.id,
          type: 'hash_mismatch',
          expected: calculatedHash,
          actual: entry.hash
        });
      }

      if (i > 0) {
        const prevEntry = this.entries[i - 1];
        if (entry.previousHash !== prevEntry.hash) {
          violations.push({
            index: i,
            entryId: entry.id,
            type: 'chain_broken',
            expected: prevEntry.hash,
            actual: entry.previousHash
          });
        }
      }
    }

    return {
      valid: violations.length === 0,
      entriesChecked: endIndex - startIndex,
      violations
    };
  }

  /**
   * Query logs
   */
  query(filter = {}) {
    return this.entries.filter(entry => {
      if (filter.type && entry.type !== filter.type) return false;
      if (filter.subject && entry.subject !== filter.subject) return false;
      if (filter.resource && entry.resource !== filter.resource) return false;
      if (filter.action && entry.action !== filter.action) return false;
      if (filter.since && entry.timestamp < filter.since) return false;
      if (filter.until && entry.timestamp > filter.until) return false;
      if (filter.result && entry.result !== filter.result) return false;
      return true;
    });
  }

  /**
   * Export logs
   */
  export(format = 'json') {
    if (format === 'json') {
      return JSON.stringify(this.entries, null, 2);
    }

    // CSV format
    const headers = ['id', 'timestamp', 'type', 'action', 'subject', 'resource', 'result', 'hash'];
    const rows = this.entries.map(e =>
      headers.map(h => JSON.stringify(e[h] || '')).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// THREAT DETECTOR
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Anomaly-based threat detection
 */
export class ThreatDetector extends EventEmitter {
  constructor(options = {}) {
    super();
    this.patterns = new Map();
    this.alerts = [];
    this.thresholds = options.thresholds || {};

    this._initDefaultPatterns();
  }

  _initDefaultPatterns() {
    // Brute force detection
    this.addPattern('brute_force', {
      description: 'Multiple failed authentication attempts',
      window: 300000, // 5 minutes
      threshold: 5,
      field: 'subject',
      condition: (events) => events.filter(e =>
        e.type === 'auth' && e.result === 'failure'
      ).length
    });

    // Privilege escalation
    this.addPattern('privilege_escalation', {
      description: 'Unusual permission changes',
      window: 3600000, // 1 hour
      threshold: 3,
      field: 'subject',
      condition: (events) => events.filter(e =>
        e.type === 'authorization' && e.action === 'role_change'
      ).length
    });

    // Data exfiltration
    this.addPattern('data_exfiltration', {
      description: 'Large data access volume',
      window: 3600000,
      threshold: 1000000, // bytes
      field: 'subject',
      condition: (events) => events
        .filter(e => e.type === 'data_access')
        .reduce((sum, e) => sum + (e.metadata?.bytes || 0), 0)
    });

    // Lateral movement
    this.addPattern('lateral_movement', {
      description: 'Access to multiple resources',
      window: 600000, // 10 minutes
      threshold: 10,
      field: 'subject',
      condition: (events) => new Set(
        events.filter(e => e.type === 'access').map(e => e.resource)
      ).size
    });
  }

  /**
   * Add detection pattern
   */
  addPattern(name, pattern) {
    this.patterns.set(name, {
      name,
      ...pattern,
      events: new Map() // Keyed by field value
    });
    return this;
  }

  /**
   * Analyze event
   */
  analyze(event) {
    const alerts = [];
    const now = Date.now();

    for (const [name, pattern] of this.patterns) {
      const key = event[pattern.field];
      if (!key) continue;

      // Get events for this key
      if (!pattern.events.has(key)) {
        pattern.events.set(key, []);
      }
      const keyEvents = pattern.events.get(key);

      // Add current event
      keyEvents.push({ ...event, timestamp: now });

      // Remove old events
      const windowStart = now - pattern.window;
      while (keyEvents.length > 0 && keyEvents[0].timestamp < windowStart) {
        keyEvents.shift();
      }

      // Check condition
      const value = pattern.condition(keyEvents);
      const threshold = this.thresholds[name] || pattern.threshold;

      if (value >= threshold) {
        const alert = {
          id: randomBytes(8).toString('hex'),
          pattern: name,
          description: pattern.description,
          subject: key,
          value,
          threshold,
          severity: this._calculateSeverity(value, threshold),
          timestamp: now,
          events: keyEvents.slice(-10) // Last 10 events
        };

        alerts.push(alert);
        this.alerts.push(alert);
        this.emit('alert', alert);
      }
    }

    return alerts;
  }

  _calculateSeverity(value, threshold) {
    const ratio = value / threshold;
    if (ratio >= 3) return 'critical';
    if (ratio >= 2) return 'high';
    if (ratio >= 1.5) return 'medium';
    return 'low';
  }

  /**
   * Get recent alerts
   */
  getAlerts(filter = {}) {
    return this.alerts.filter(alert => {
      if (filter.pattern && alert.pattern !== filter.pattern) return false;
      if (filter.severity && alert.severity !== filter.severity) return false;
      if (filter.since && alert.timestamp < filter.since) return false;
      return true;
    });
  }

  /**
   * Clear old alerts
   */
  clearOldAlerts(maxAge = 86400000) {
    const cutoff = Date.now() - maxAge;
    this.alerts = this.alerts.filter(a => a.timestamp >= cutoff);
    return this.alerts.length;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// KERUV — Main Export
// ══════════════════════════════════════════════════════════════════════════════

/**
 * KERUV — The Cherubim
 * Complete zero-trust security gateway
 */
export class Keruv extends EventEmitter {
  constructor(options = {}) {
    super();

    this.identity = new SPIFFEIdentity(options.identity);
    this.policy = new PolicyEngine(options.policy);
    this.rateLimiter = new TokenBucketRateLimiter(options.rateLimit);
    this.slidingLimiter = new SlidingWindowRateLimiter(options.slidingLimit);
    this.tokenHandler = new SecureTokenHandler(options.token);
    this.authorizer = new HybridAuthorizer();
    this.auditLog = new AuditLogger(options.audit);
    this.threatDetector = new ThreatDetector(options.threats);

    // Forward events
    this.auditLog.on('entry', e => this.emit('audit', e));
    this.threatDetector.on('alert', a => this.emit('threat', a));
    this.policy.on('decision', d => this.emit('policy-decision', d));
  }

  /**
   * Authenticate request
   */
  async authenticate(credentials) {
    const result = {
      authenticated: false,
      subject: null,
      token: null
    };

    // Verify token if provided
    if (credentials.token) {
      const verified = this.tokenHandler.verify(credentials.token);
      if (verified.valid) {
        result.authenticated = true;
        result.subject = verified.claims;
        result.method = 'token';
      }
    }

    // Verify SPIFFE identity if provided
    if (credentials.spiffeId) {
      const verified = this.identity.verifySvid(credentials.spiffeId);
      if (verified.valid) {
        result.authenticated = true;
        result.subject = { spiffeId: credentials.spiffeId };
        result.method = 'spiffe';
      }
    }

    // Log authentication attempt
    this.auditLog.log({
      type: 'auth',
      action: 'authenticate',
      subject: credentials.userId || credentials.spiffeId || 'unknown',
      result: result.authenticated ? 'success' : 'failure',
      method: result.method || 'unknown'
    });

    // Analyze for threats
    this.threatDetector.analyze({
      type: 'auth',
      subject: credentials.userId || credentials.spiffeId,
      result: result.authenticated ? 'success' : 'failure'
    });

    return result;
  }

  /**
   * Authorize request
   */
  async authorize(subject, resource, action, context = {}) {
    // Check rate limit
    const rateLimitKey = subject.userId || subject.spiffeId || 'anonymous';
    const rateLimit = this.rateLimiter.consume(rateLimitKey);

    if (!rateLimit.allowed) {
      this.auditLog.log({
        type: 'rate_limit',
        action: 'blocked',
        subject: rateLimitKey,
        resource,
        result: 'denied'
      });

      return {
        authorized: false,
        reason: 'Rate limit exceeded',
        retryAfter: rateLimit.retryAfter
      };
    }

    // Policy evaluation
    const policyResult = await this.policy.evaluate({
      subject,
      resource,
      action,
      context
    });

    // RBAC/ABAC authorization
    const authzResult = this.authorizer.authorize(subject, resource, action, context);

    // Combined decision
    const authorized = policyResult.decision === 'allow' && authzResult.allowed;

    // Log authorization
    this.auditLog.log({
      type: 'authorization',
      action,
      subject: subject.userId || subject.spiffeId,
      resource,
      result: authorized ? 'allowed' : 'denied',
      metadata: {
        policy: policyResult.decision,
        authz: authzResult.allowed
      }
    });

    // Analyze for threats
    this.threatDetector.analyze({
      type: 'access',
      subject: subject.userId || subject.spiffeId,
      resource,
      action,
      result: authorized ? 'success' : 'failure'
    });

    return {
      authorized,
      policy: policyResult,
      authorization: authzResult,
      rateLimit: rateLimit
    };
  }

  /**
   * Create access token
   */
  createToken(payload, options = {}) {
    const { token } = this.tokenHandler.create(payload, options);

    this.auditLog.log({
      type: 'token',
      action: 'create',
      subject: payload.sub || payload.userId,
      result: 'success'
    });

    return token;
  }

  /**
   * Verify access token
   */
  verifyToken(token) {
    return this.tokenHandler.verify(token);
  }

  /**
   * Get security status
   */
  status() {
    return {
      identities: this.identity.identities.size,
      policies: this.policy.policies.size,
      auditEntries: this.auditLog.entries.length,
      recentAlerts: this.threatDetector.alerts.slice(-10),
      rateLimitBuckets: this.rateLimiter.buckets.size,
      auditIntegrity: this.auditLog.verifyIntegrity(
        Math.max(0, this.auditLog.entries.length - 100)
      )
    };
  }
}

// Default export
export default Keruv;

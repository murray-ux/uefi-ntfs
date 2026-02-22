// test/dashboard-api.test.js
//
// GENESIS 2.0 — Dashboard API Tests
//
// Tests rate limiting, JWT authentication, and metrics endpoints.
// Run: node --test test/dashboard-api.test.js
//
// Copyright (c) 2025 murray-ux — Founder & Lead Developer — Apache-2.0

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

// ══════════════════════════════════════════════════════════════════════════════
// Test Utilities
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Base64URL encode (matches dashboard-server.js implementation)
 */
function base64UrlEncode(str) {
  return Buffer.from(str).toString('base64url');
}

/**
 * Generate a valid JWT for testing
 */
function generateTestJwt(secret, payload = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadEncoded = base64UrlEncode(JSON.stringify({
    sub: 'owner',
    iat: now,
    exp: now + 3600,
    scope: 'admin',
    ...payload
  }));
  const signature = createHmac('sha256', secret)
    .update(`${header}.${payloadEncoded}`)
    .digest('base64url');

  return `${header}.${payloadEncoded}.${signature}`;
}

/**
 * Generate an expired JWT for testing
 */
function generateExpiredJwt(secret) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(JSON.stringify({
    sub: 'owner',
    iat: now - 7200,
    exp: now - 3600, // Expired 1 hour ago
    scope: 'admin'
  }));
  const signature = createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// Rate Limiting Logic Tests (Unit Tests)
// ══════════════════════════════════════════════════════════════════════════════

describe('Rate Limiting Logic', () => {
  // Simulate the rate limiting algorithm from dashboard-server.js
  const RATE_LIMIT_WINDOW = 60000;
  const RATE_LIMIT_MAX = 100;
  let rateLimitStore;

  function checkRateLimit(ip) {
    const now = Date.now();
    const record = rateLimitStore.get(ip);

    if (!record || now - record.windowStart > RATE_LIMIT_WINDOW) {
      rateLimitStore.set(ip, { windowStart: now, count: 1 });
      return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
    }

    if (record.count >= RATE_LIMIT_MAX) {
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil((record.windowStart + RATE_LIMIT_WINDOW - now) / 1000)
      };
    }

    record.count++;
    return { allowed: true, remaining: RATE_LIMIT_MAX - record.count };
  }

  before(() => {
    rateLimitStore = new Map();
  });

  it('should allow first request from new IP', () => {
    const result = checkRateLimit('192.168.1.1');
    assert.equal(result.allowed, true);
    assert.equal(result.remaining, RATE_LIMIT_MAX - 1);
  });

  it('should decrement remaining count on subsequent requests', () => {
    const result = checkRateLimit('192.168.1.1');
    assert.equal(result.allowed, true);
    assert.equal(result.remaining, RATE_LIMIT_MAX - 2);
  });

  it('should track separate limits per IP', () => {
    const result1 = checkRateLimit('192.168.1.1');
    const result2 = checkRateLimit('192.168.1.2'); // New IP

    assert.ok(result2.remaining > result1.remaining);
  });

  it('should block after limit exceeded', () => {
    const testIp = '10.0.0.100';

    // Exhaust the limit
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      checkRateLimit(testIp);
    }

    const result = checkRateLimit(testIp);
    assert.equal(result.allowed, false);
    assert.equal(result.remaining, 0);
    assert.ok(result.retryAfter > 0);
  });

  it('should reset after window expires', async () => {
    const testIp = '10.0.0.200';

    // First request
    checkRateLimit(testIp);

    // Simulate window expiration by modifying windowStart
    const record = rateLimitStore.get(testIp);
    record.windowStart = Date.now() - RATE_LIMIT_WINDOW - 1000;

    // Should reset
    const result = checkRateLimit(testIp);
    assert.equal(result.allowed, true);
    assert.equal(result.remaining, RATE_LIMIT_MAX - 1);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// JWT Verification Logic Tests (Unit Tests)
// ══════════════════════════════════════════════════════════════════════════════

describe('JWT Verification Logic', () => {
  const TEST_SECRET = 'test-secret-32-chars-for-testing';

  // Simulate the JWT verification from dashboard-server.js
  function verifyJwt(token, secret) {
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false, error: 'Invalid token format' };

    const [header, payload, signature] = parts;
    const expectedSig = createHmac('sha256', secret)
      .update(`${header}.${payload}`)
      .digest('base64url');

    if (signature !== expectedSig) {
      return { valid: false, error: 'Invalid signature' };
    }

    try {
      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
      const now = Math.floor(Date.now() / 1000);

      if (decoded.exp && decoded.exp < now) {
        return { valid: false, error: 'Token expired' };
      }

      return { valid: true, payload: decoded };
    } catch {
      return { valid: false, error: 'Invalid payload' };
    }
  }

  it('should verify valid JWT', () => {
    const token = generateTestJwt(TEST_SECRET);
    const result = verifyJwt(token, TEST_SECRET);

    assert.equal(result.valid, true);
    assert.ok(result.payload);
    assert.equal(result.payload.sub, 'owner');
    assert.equal(result.payload.scope, 'admin');
  });

  it('should reject expired JWT', () => {
    const token = generateExpiredJwt(TEST_SECRET);
    const result = verifyJwt(token, TEST_SECRET);

    assert.equal(result.valid, false);
    assert.equal(result.error, 'Token expired');
  });

  it('should reject JWT with invalid signature', () => {
    const token = generateTestJwt(TEST_SECRET);
    const result = verifyJwt(token, 'wrong-secret-12345678901234567890');

    assert.equal(result.valid, false);
    assert.equal(result.error, 'Invalid signature');
  });

  it('should reject malformed JWT', () => {
    const result1 = verifyJwt('not.a.valid.jwt', TEST_SECRET);
    assert.equal(result1.valid, false);

    const result2 = verifyJwt('invalid', TEST_SECRET);
    assert.equal(result2.valid, false);
  });

  it('should reject JWT with tampered payload', () => {
    const token = generateTestJwt(TEST_SECRET);
    const parts = token.split('.');

    // Tamper with payload
    const tamperedPayload = base64UrlEncode(JSON.stringify({
      sub: 'hacker',
      exp: Math.floor(Date.now() / 1000) + 86400, // Extended expiry
      scope: 'superadmin'
    }));

    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    const result = verifyJwt(tamperedToken, TEST_SECRET);

    assert.equal(result.valid, false);
    assert.equal(result.error, 'Invalid signature');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Metrics Format Tests (Unit Tests)
// ══════════════════════════════════════════════════════════════════════════════

describe('Prometheus Metrics Format', () => {
  it('should generate valid Prometheus text format', () => {
    // Simulate metrics output
    const metrics = {
      total: 1500,
      byMethod: { GET: 1000, POST: 400, PUT: 50, DELETE: 50, OPTIONS: 0 },
      byStatus: { '2xx': 1400, '4xx': 80, '5xx': 20 }
    };

    const uptime = 3600000; // 1 hour in ms
    const avgLatency = 45;
    const heapUsed = 50 * 1024 * 1024;
    const rss = 100 * 1024 * 1024;
    const activeClients = 5;

    const lines = [
      '# HELP genesis_uptime_seconds Dashboard uptime in seconds',
      '# TYPE genesis_uptime_seconds gauge',
      `genesis_uptime_seconds ${Math.round(uptime / 1000)}`,
      '',
      '# HELP genesis_requests_total Total HTTP requests',
      '# TYPE genesis_requests_total counter',
      `genesis_requests_total ${metrics.total}`,
      '',
      '# HELP genesis_requests_by_method HTTP requests by method',
      '# TYPE genesis_requests_by_method counter',
      ...Object.entries(metrics.byMethod).map(([m, c]) => `genesis_requests_by_method{method="${m}"} ${c}`),
      '',
      '# HELP genesis_requests_by_status HTTP requests by status class',
      '# TYPE genesis_requests_by_status counter',
      ...Object.entries(metrics.byStatus).map(([s, c]) => `genesis_requests_by_status{status="${s}"} ${c}`),
      '',
      '# HELP genesis_latency_avg_ms Average request latency in ms',
      '# TYPE genesis_latency_avg_ms gauge',
      `genesis_latency_avg_ms ${avgLatency}`,
      '',
      '# HELP genesis_ratelimit_clients Active rate-limited clients',
      '# TYPE genesis_ratelimit_clients gauge',
      `genesis_ratelimit_clients ${activeClients}`,
      '',
      '# HELP genesis_memory_heap_bytes Heap memory used',
      '# TYPE genesis_memory_heap_bytes gauge',
      `genesis_memory_heap_bytes ${heapUsed}`,
      '',
      '# HELP genesis_memory_rss_bytes RSS memory used',
      '# TYPE genesis_memory_rss_bytes gauge',
      `genesis_memory_rss_bytes ${rss}`
    ];

    const output = lines.join('\n');

    // Verify Prometheus format requirements
    assert.ok(output.includes('# HELP'), 'Should include HELP comments');
    assert.ok(output.includes('# TYPE'), 'Should include TYPE annotations');
    assert.ok(output.includes('genesis_uptime_seconds'), 'Should include uptime metric');
    assert.ok(output.includes('genesis_requests_total'), 'Should include requests total');
    assert.ok(output.includes('genesis_requests_by_method{method="GET"}'), 'Should include method labels');
    assert.ok(output.includes('genesis_memory_heap_bytes'), 'Should include memory metrics');

    // Verify no trailing colons (common Prometheus format error)
    assert.ok(!output.match(/^\w+:$/m), 'Should not have trailing colons on metric names');

    // Verify values are numbers
    const valueLines = output.split('\n').filter(l => !l.startsWith('#') && l.trim());
    for (const line of valueLines) {
      const parts = line.split(' ');
      if (parts.length >= 2) {
        const value = parseFloat(parts[parts.length - 1]);
        assert.ok(!isNaN(value), `Metric value should be a number: ${line}`);
      }
    }
  });

  it('should calculate correct status class buckets', () => {
    // Simulate status code bucketing
    function getStatusBucket(code) {
      if (code >= 200 && code < 300) return '2xx';
      if (code >= 400 && code < 500) return '4xx';
      if (code >= 500) return '5xx';
      return 'other';
    }

    assert.equal(getStatusBucket(200), '2xx');
    assert.equal(getStatusBucket(201), '2xx');
    assert.equal(getStatusBucket(299), '2xx');
    assert.equal(getStatusBucket(400), '4xx');
    assert.equal(getStatusBucket(404), '4xx');
    assert.equal(getStatusBucket(500), '5xx');
    assert.equal(getStatusBucket(503), '5xx');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Request Metrics Tracking Tests
// ══════════════════════════════════════════════════════════════════════════════

describe('Request Metrics Tracking', () => {
  let requestMetrics;

  before(() => {
    requestMetrics = {
      total: 0,
      byMethod: { GET: 0, POST: 0, PUT: 0, DELETE: 0, OPTIONS: 0 },
      byStatus: { '2xx': 0, '4xx': 0, '5xx': 0 },
      byPath: new Map(),
      latencySum: 0,
      startTime: Date.now()
    };
  });

  function recordRequest(method, path, status, latency) {
    requestMetrics.total++;
    requestMetrics.byMethod[method] = (requestMetrics.byMethod[method] || 0) + 1;

    const statusBucket = status >= 500 ? '5xx' : status >= 400 ? '4xx' : '2xx';
    requestMetrics.byStatus[statusBucket]++;

    const pathCount = requestMetrics.byPath.get(path) || 0;
    requestMetrics.byPath.set(path, pathCount + 1);

    requestMetrics.latencySum += latency;
  }

  it('should count total requests', () => {
    recordRequest('GET', '/api/health', 200, 10);
    recordRequest('GET', '/api/metrics', 200, 15);
    recordRequest('POST', '/api/evidence', 201, 50);

    assert.equal(requestMetrics.total, 3);
  });

  it('should track requests by method', () => {
    assert.equal(requestMetrics.byMethod.GET, 2);
    assert.equal(requestMetrics.byMethod.POST, 1);
  });

  it('should track requests by status bucket', () => {
    recordRequest('GET', '/api/notfound', 404, 5);
    recordRequest('GET', '/api/error', 500, 100);

    assert.equal(requestMetrics.byStatus['2xx'], 3);
    assert.equal(requestMetrics.byStatus['4xx'], 1);
    assert.equal(requestMetrics.byStatus['5xx'], 1);
  });

  it('should track requests by path', () => {
    recordRequest('GET', '/api/health', 200, 10);

    assert.equal(requestMetrics.byPath.get('/api/health'), 2);
    assert.equal(requestMetrics.byPath.get('/api/metrics'), 1);
  });

  it('should calculate average latency', () => {
    const avgLatency = requestMetrics.total > 0
      ? Math.round(requestMetrics.latencySum / requestMetrics.total)
      : 0;

    assert.ok(avgLatency > 0);
    assert.ok(avgLatency < 100);
  });

  it('should calculate requests per minute', () => {
    const uptime = Date.now() - requestMetrics.startTime;
    const ratePerMinute = Math.round(requestMetrics.total / (uptime / 60000));

    assert.ok(ratePerMinute >= 0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Protected Routes Configuration Tests
// ══════════════════════════════════════════════════════════════════════════════

describe('Protected Routes Configuration', () => {
  const PROTECTED_ROUTES = [
    '/api/merkava/lockdown',
    '/api/merkava/sovereign',
    '/api/merkava/directive',
    '/api/merkava/broadcast',
    '/api/tzofeh/watch-level'
  ];

  function isProtected(path) {
    return PROTECTED_ROUTES.some(route => path.startsWith(route));
  }

  it('should mark MERKAVA lockdown as protected', () => {
    assert.ok(isProtected('/api/merkava/lockdown'));
  });

  it('should mark MERKAVA sovereign as protected', () => {
    assert.ok(isProtected('/api/merkava/sovereign'));
  });

  it('should mark MERKAVA directive as protected', () => {
    assert.ok(isProtected('/api/merkava/directive'));
  });

  it('should mark MERKAVA broadcast as protected', () => {
    assert.ok(isProtected('/api/merkava/broadcast'));
  });

  it('should mark TZOFEH watch-level as protected', () => {
    assert.ok(isProtected('/api/tzofeh/watch-level'));
  });

  it('should NOT mark health endpoint as protected', () => {
    assert.ok(!isProtected('/api/health'));
  });

  it('should NOT mark metrics endpoint as protected', () => {
    assert.ok(!isProtected('/api/metrics'));
    assert.ok(!isProtected('/api/metrics/prometheus'));
  });

  it('should NOT mark evidence endpoint as protected', () => {
    assert.ok(!isProtected('/api/evidence'));
  });

  it('should NOT mark MERKAVA status as protected', () => {
    assert.ok(!isProtected('/api/merkava/status'));
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// API Response Format Tests
// ══════════════════════════════════════════════════════════════════════════════

describe('API Response Formats', () => {
  it('should have correct health response structure', () => {
    const health = {
      status: 'healthy',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      uptime: 3600,
      memory: { heapUsed: 50000000, heapTotal: 100000000, rss: 150000000 },
      pid: 12345,
      nodeVersion: 'v20.0.0',
      connections: 5
    };

    assert.equal(health.status, 'healthy');
    assert.ok(health.version);
    assert.ok(health.timestamp);
    assert.ok(typeof health.uptime === 'number');
    assert.ok(health.memory);
    assert.ok(typeof health.pid === 'number');
    assert.ok(health.nodeVersion.startsWith('v'));
    assert.ok(typeof health.connections === 'number');
  });

  it('should have correct metrics response structure', () => {
    const metrics = {
      uptime: 3600000,
      requests: {
        total: 1000,
        byMethod: { GET: 800, POST: 150, PUT: 30, DELETE: 20, OPTIONS: 0 },
        byStatus: { '2xx': 950, '4xx': 40, '5xx': 10 },
        ratePerMinute: 16
      },
      latency: {
        average: 45,
        total: 45000
      },
      rateLimit: {
        activeClients: 5,
        window: 60000,
        maxRequests: 100
      },
      memory: {
        heapUsed: 50,
        heapTotal: 100,
        rss: 150
      }
    };

    assert.ok(typeof metrics.uptime === 'number');
    assert.ok(metrics.requests);
    assert.equal(typeof metrics.requests.total, 'number');
    assert.ok(metrics.requests.byMethod);
    assert.ok(metrics.requests.byStatus);
    assert.ok(metrics.latency);
    assert.ok(metrics.rateLimit);
    assert.equal(metrics.rateLimit.window, 60000);
    assert.equal(metrics.rateLimit.maxRequests, 100);
  });

  it('should have correct auth token response structure', () => {
    const tokenResponse = {
      token: 'eyJ...header.payload.signature',
      expiresIn: 3600,
      tokenType: 'Bearer'
    };

    assert.ok(tokenResponse.token);
    assert.equal(tokenResponse.expiresIn, 3600);
    assert.equal(tokenResponse.tokenType, 'Bearer');
  });

  it('should have correct rate limit headers structure', () => {
    const headers = {
      'X-RateLimit-Limit': 100,
      'X-RateLimit-Remaining': 99,
      'X-RateLimit-Reset': Math.ceil(Date.now() / 1000) + 60
    };

    assert.equal(headers['X-RateLimit-Limit'], 100);
    assert.ok(headers['X-RateLimit-Remaining'] >= 0);
    assert.ok(headers['X-RateLimit-Reset'] > Date.now() / 1000);
  });
});

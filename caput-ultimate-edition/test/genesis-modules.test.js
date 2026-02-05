// test/genesis-modules.test.js
//
// GENESIS 2.0 — Module Integration Tests
//
// Tests all 13 GENESIS modules for basic functionality.
// Run: node --test test/genesis-modules.test.js
//
// Copyright (c) 2025 Murray Bembrick — Founder & Lead Developer — Apache-2.0

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

// ══════════════════════════════════════════════════════════════════════════════
// MERKAVA Command Center
// ══════════════════════════════════════════════════════════════════════════════

describe('MERKAVA — Command Center', async () => {
  let Merkava, merkava;

  before(async () => {
    const mod = await import('../src/lib/merkava-command.js');
    Merkava = mod.default || mod.Merkava;
  });

  it('should create instance', () => {
    merkava = new Merkava({ pulseInterval: 60000 });
    assert.ok(merkava);
    assert.equal(merkava.name, 'MERKAVA');
    assert.equal(merkava.hebrew, 'מרכבה');
  });

  it('should initialize', async () => {
    const result = await merkava.initialize();
    assert.equal(result.success, true);
    assert.equal(result.state, 'ready');
  });

  it('should register a module', () => {
    const mockModule = { healthCheck: () => ({ healthy: true }) };
    const connectorId = merkava.registerModule('TEST_MODULE', mockModule);
    assert.ok(connectorId);
    assert.ok(merkava.getConnectedModules().includes('TEST_MODULE'));
  });

  it('should send directive to registered module', async () => {
    const mockModule = {
      ping: (params) => ({ pong: true, received: params })
    };
    merkava.registerModule('PING_MODULE', mockModule);

    const result = await merkava.sendDirective('PING_MODULE', 'ping', { test: true }, { priority: 'immediate' });
    assert.equal(result.pong, true);
  });

  it('should broadcast to all modules', async () => {
    const results = await merkava.broadcast('healthCheck');
    assert.ok(typeof results === 'object');
  });

  it('should return status', () => {
    const status = merkava.getStatus();
    assert.equal(status.name, 'MERKAVA');
    assert.ok(status.modules.connected > 0);
    assert.ok(status.uptime >= 0);
  });

  it('should return full diagnostics', () => {
    const diag = merkava.getFullDiagnostics();
    assert.ok(diag.status);
    assert.ok(diag.moduleMetrics);
    assert.ok(Array.isArray(diag.recentCommands));
  });

  it('should unregister a module', () => {
    const removed = merkava.unregisterModule('TEST_MODULE');
    assert.equal(removed, true);
    assert.ok(!merkava.getConnectedModules().includes('TEST_MODULE'));
  });

  it('should raise alerts', () => {
    const alertId = merkava.alerts.raise('high', 'TEST', 'Test alert');
    assert.ok(alertId);

    const active = merkava.alerts.getActiveAlerts();
    assert.ok(active.length > 0);
  });

  after(async () => {
    if (merkava) await merkava.shutdown();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TZOFEH Sentinel
// ══════════════════════════════════════════════════════════════════════════════

describe('TZOFEH — Sentinel Watchdog', async () => {
  let Tzofeh, tzofeh;

  before(async () => {
    const mod = await import('../src/lib/tzofeh-sentinel.js');
    Tzofeh = mod.default || mod.Tzofeh;
  });

  it('should create instance', () => {
    tzofeh = new Tzofeh({ anomalyCheckInterval: 60000 });
    assert.ok(tzofeh);
    assert.equal(tzofeh.name, 'TZOFEH');
    assert.equal(tzofeh.hebrew, 'צופה');
  });

  it('should initialize', async () => {
    const result = await tzofeh.initialize();
    assert.equal(result.success, true);
    assert.equal(result.status, 'active');
  });

  it('should record metrics', () => {
    const stats = tzofeh.recordMetric('cpu.usage', 45);
    assert.ok(stats);
    assert.ok(stats.count > 0);
    assert.equal(stats.mean, 45);
  });

  it('should set metric thresholds', () => {
    const id = tzofeh.setMetricThreshold('test.metric', {
      warning: 80,
      critical: 95,
      comparison: 'gt'
    });
    assert.ok(id);
  });

  it('should register patterns', () => {
    const id = tzofeh.registerPattern('test_pattern', {
      type: 'frequency',
      eventType: 'test_event',
      threshold: 3,
      windowMs: 60000
    });
    assert.ok(id);
  });

  it('should record events', () => {
    const matches = tzofeh.recordEvent({ type: 'test_event', message: 'test' });
    assert.ok(Array.isArray(matches));
  });

  it('should deploy guardian daemons', () => {
    const id = tzofeh.deployGuardian('test-guardian', {
      healthCheck: () => ({ healthy: true })
    }, { checkInterval: 60000 });
    assert.ok(id);
  });

  it('should return guardian status', () => {
    const status = tzofeh.getGuardianStatus('test-guardian');
    assert.ok(status);
    assert.equal(status.name, 'test-guardian');
    assert.equal(status.status, 'active');
  });

  it('should set watch level', () => {
    const result = tzofeh.setWatchLevel(3); // COMBAT
    assert.equal(result.currentLevel, 3);
  });

  it('should deploy canaries', () => {
    const canary = tzofeh.deployCanary('test-canary', {
      function: async () => ({ success: true })
    });
    assert.ok(canary);
    assert.equal(canary.name, 'test-canary');
  });

  it('should return status', () => {
    const status = tzofeh.getStatus();
    assert.equal(status.name, 'TZOFEH');
    assert.equal(status.status, 'active');
    assert.ok(status.guardians.total > 0);
  });

  it('should provide health check', () => {
    const health = tzofeh.healthCheck();
    assert.equal(health.healthy, true);
  });

  after(async () => {
    if (tzofeh) await tzofeh.shutdown();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// MALAKH Message Bus
// ══════════════════════════════════════════════════════════════════════════════

describe('MALAKH — Message Bus', async () => {
  let Malakh, malakh;

  before(async () => {
    const mod = await import('../src/lib/malakh-bus.js');
    Malakh = mod.default || mod.Malakh;
  });

  it('should create instance', () => {
    malakh = new Malakh({ processInterval: 60000 });
    assert.ok(malakh);
    assert.equal(malakh.name, 'MALAKH');
    assert.equal(malakh.hebrew, 'מלאך');
  });

  it('should initialize with default exchanges', async () => {
    const result = await malakh.initialize();
    assert.equal(result.success, true);
    assert.ok(malakh.getExchange('default'));
    assert.ok(malakh.getExchange('direct'));
    assert.ok(malakh.getExchange('fanout'));
  });

  it('should create queues', () => {
    const queue = malakh.createQueue('test-queue');
    assert.ok(queue);
    assert.equal(queue.name, 'test-queue');
  });

  it('should bind queues to exchanges', () => {
    const result = malakh.bindQueue('test-queue', 'default', 'test.*');
    assert.equal(result, true);
  });

  it('should publish messages', () => {
    const result = malakh.publish('test.event', { data: 'hello' });
    assert.equal(result.routed, true);
    assert.ok(result.messageId);
  });

  it('should subscribe to topics', () => {
    let received = false;
    const subId = malakh.subscribe('test.*', async (message) => {
      received = true;
    });
    assert.ok(subId);
  });

  it('should create Message objects', async () => {
    const { Message } = await import('../src/lib/malakh-bus.js');
    const msg = new Message('event', 'test.topic', { key: 'value' });
    assert.ok(msg.id);
    assert.equal(msg.type, 'event');
    assert.equal(msg.topic, 'test.topic');
    assert.ok(msg.hash);
  });

  it('should track circuit breakers', () => {
    const stats = malakh.getCircuitBreakerStats();
    assert.ok(typeof stats === 'object');
  });

  it('should return status', () => {
    const status = malakh.getStatus();
    assert.equal(status.name, 'MALAKH');
    assert.equal(status.status, 'active');
    assert.ok(status.exchanges > 0);
    assert.ok(status.queues > 0);
  });

  it('should provide health check', () => {
    const health = malakh.healthCheck();
    assert.equal(health.healthy, true);
  });

  after(async () => {
    if (malakh) await malakh.shutdown();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// MODULE_REGISTRY and SYSTEM_STATES Constants
// ══════════════════════════════════════════════════════════════════════════════

describe('MERKAVA Constants', async () => {
  it('should export MODULE_REGISTRY with all modules', async () => {
    const { MODULE_REGISTRY } = await import('../src/lib/merkava-command.js');
    assert.ok(MODULE_REGISTRY.RUACH);
    assert.ok(MODULE_REGISTRY.OHR);
    assert.ok(MODULE_REGISTRY.HADAAT);
    assert.ok(MODULE_REGISTRY.KERUV);
    assert.ok(MODULE_REGISTRY.NEPHESH);
    assert.ok(MODULE_REGISTRY.EBEN);
    assert.ok(MODULE_REGISTRY.SHINOBI);
    assert.ok(MODULE_REGISTRY.TETSUYA);
    assert.ok(MODULE_REGISTRY.VIZ);
    assert.ok(MODULE_REGISTRY.MABUL);
  });

  it('should export SYSTEM_STATES', async () => {
    const { SYSTEM_STATES } = await import('../src/lib/merkava-command.js');
    assert.ok(SYSTEM_STATES.DORMANT);
    assert.ok(SYSTEM_STATES.READY);
    assert.ok(SYSTEM_STATES.ACTIVE);
    assert.ok(SYSTEM_STATES.LOCKDOWN);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TZOFEH Sub-Components
// ══════════════════════════════════════════════════════════════════════════════

describe('TZOFEH Sub-Components', async () => {
  it('should create MetricCollector and compute stats', async () => {
    const { MetricCollector } = await import('../src/lib/tzofeh-sentinel.js');
    const collector = new MetricCollector();

    collector.record('test', 10);
    collector.record('test', 20);
    collector.record('test', 30);

    const metric = collector.get('test');
    assert.ok(metric);
    assert.equal(metric.stats.count, 3);
    assert.equal(metric.stats.mean, 20);
    assert.equal(metric.stats.min, 10);
    assert.equal(metric.stats.max, 30);
  });

  it('should detect anomalies via AnomalyDetector', async () => {
    const { AnomalyDetector } = await import('../src/lib/tzofeh-sentinel.js');
    const detector = new AnomalyDetector({ spikeThreshold: 2 });

    detector.setBaseline('cpu', { mean: 50, stdDev: 5, min: 40, max: 60 });

    // Normal value — no anomalies
    const normal = detector.analyze('cpu', { mean: 52 }, []);
    assert.equal(normal.length, 0);

    // Spike — should detect
    const spike = detector.analyze('cpu', { mean: 70, max: 100 }, []);
    assert.ok(spike.length > 0);
  });

  it('should create ThresholdMonitor and detect violations', async () => {
    const { ThresholdMonitor } = await import('../src/lib/tzofeh-sentinel.js');
    const monitor = new ThresholdMonitor();

    monitor.setThreshold('memory', {
      warning: 80,
      critical: 95,
      comparison: 'gt'
    });

    // Under threshold
    const ok = monitor.check('memory', 50);
    assert.equal(ok, null);

    // Over warning
    const warn = monitor.check('memory', 85);
    assert.ok(warn);
    assert.equal(warn.level, 'warning');

    // Over critical
    const crit = monitor.check('memory', 98);
    assert.ok(crit);
    assert.equal(crit.level, 'critical');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// MALAKH Sub-Components
// ══════════════════════════════════════════════════════════════════════════════

describe('MALAKH Sub-Components', async () => {
  it('should create Message with correct properties', async () => {
    const { Message, MESSAGE_TYPES } = await import('../src/lib/malakh-bus.js');
    const msg = new Message(MESSAGE_TYPES.COMMAND, 'security.scan', { target: 'all' });

    assert.ok(msg.id);
    assert.equal(msg.type, 'command');
    assert.equal(msg.topic, 'security.scan');
    assert.deepEqual(msg.payload, { target: 'all' });
    assert.ok(msg.hash);
    assert.ok(Object.isFrozen(msg));
  });

  it('should create reply messages', async () => {
    const { Message } = await import('../src/lib/malakh-bus.js');
    const original = new Message('query', 'test', { q: 'hello' }, { source: 'sender' });
    const reply = original.reply({ answer: 'world' });

    assert.equal(reply.correlationId, original.id);
    assert.equal(reply.destination, 'sender');
  });

  it('should handle message expiry', async () => {
    const { Message } = await import('../src/lib/malakh-bus.js');
    const expired = new Message('event', 'test', {}, { ttl: 1, timestamp: Date.now() - 100 });
    assert.equal(expired.isExpired(), true);

    const fresh = new Message('event', 'test', {}, { ttl: 60000 });
    assert.equal(fresh.isExpired(), false);
  });

  it('should manage MessageQueue with priorities', async () => {
    const { MessageQueue, Message } = await import('../src/lib/malakh-bus.js');
    const queue = new MessageQueue('test');

    const low = new Message('event', 'test', { order: 'low' }, { priority: 9 });
    const high = new Message('event', 'test', { order: 'high' }, { priority: 1 });
    const mid = new Message('event', 'test', { order: 'mid' }, { priority: 5 });

    queue.enqueue(low);
    queue.enqueue(high);
    queue.enqueue(mid);

    const first = queue.dequeue();
    assert.equal(first.payload.order, 'high');

    const second = queue.dequeue();
    assert.equal(second.payload.order, 'mid');
  });

  it('should handle CircuitBreaker states', async () => {
    const { CircuitBreaker } = await import('../src/lib/malakh-bus.js');
    const breaker = new CircuitBreaker('test', { failureThreshold: 2, timeout: 100 });

    assert.equal(breaker.state, 'closed');

    // Simulate failures
    try { await breaker.execute(() => { throw new Error('fail'); }); } catch {}
    try { await breaker.execute(() => { throw new Error('fail'); }); } catch {}

    assert.equal(breaker.state, 'open');

    // Should reject while open
    try {
      await breaker.execute(() => 'ok');
      assert.fail('Should have thrown');
    } catch (e) {
      assert.ok(e.message.includes('open'));
    }

    // Reset
    breaker.reset();
    assert.equal(breaker.state, 'closed');
  });

  it('should support Exchange topic routing', async () => {
    const { Exchange, MessageQueue, Message, ROUTING_STRATEGIES } = await import('../src/lib/malakh-bus.js');
    const exchange = new Exchange('test', ROUTING_STRATEGIES.TOPIC);
    const securityQueue = new MessageQueue('security');
    const aiQueue = new MessageQueue('ai');

    exchange.bind('security.*', securityQueue);
    exchange.bind('ai.*', aiQueue);

    const secMsg = new Message('event', 'security.alert', {});
    const destinations = exchange.route(secMsg);

    assert.ok(destinations.length > 0);
    assert.ok(destinations.includes(securityQueue));
    assert.ok(!destinations.includes(aiQueue));
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GENESIS Bootstrap
// ══════════════════════════════════════════════════════════════════════════════

describe('GENESIS Bootstrap', async () => {
  it('should create bootstrap instance', async () => {
    const { default: GenesisBootstrap } = await import('../src/lib/genesis-init.js');
    const genesis = new GenesisBootstrap({ port: 0 }); // port 0 = don't actually bind
    assert.ok(genesis);
    assert.equal(genesis.state, 'dormant');
  });

  it('should export getStatus before boot', async () => {
    const { default: GenesisBootstrap } = await import('../src/lib/genesis-init.js');
    const genesis = new GenesisBootstrap({ port: 0 });
    const status = genesis.getStatus();
    assert.equal(status.state, 'dormant');
    assert.ok(Array.isArray(status.modules));
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// KOL — Shared Logger
// ══════════════════════════════════════════════════════════════════════════════

describe('KOL — Shared Logger', async () => {
  let createLogger, setLogLevel, setJsonMode, onLog, LogLevel, genesisLog;

  before(async () => {
    const mod = await import('../src/lib/kol-logger.js');
    createLogger = mod.createLogger;
    setLogLevel = mod.setLogLevel;
    setJsonMode = mod.setJsonMode;
    onLog = mod.onLog;
    LogLevel = mod.LogLevel;
    genesisLog = mod.genesisLog;
  });

  it('should export createLogger function', () => {
    assert.equal(typeof createLogger, 'function');
  });

  it('should export LogLevel constants', () => {
    assert.equal(LogLevel.SILENT, 0);
    assert.equal(LogLevel.ERROR, 1);
    assert.equal(LogLevel.WARN, 2);
    assert.equal(LogLevel.INFO, 3);
    assert.equal(LogLevel.SUCCESS, 4);
    assert.equal(LogLevel.DEBUG, 5);
    assert.equal(LogLevel.TRACE, 6);
  });

  it('should create a logger with all methods', () => {
    const log = createLogger('TEST');
    assert.equal(typeof log.info, 'function');
    assert.equal(typeof log.warn, 'function');
    assert.equal(typeof log.error, 'function');
    assert.equal(typeof log.debug, 'function');
    assert.equal(typeof log.success, 'function');
    assert.equal(typeof log.trace, 'function');
    assert.equal(typeof log.child, 'function');
    assert.equal(typeof log.setLevel, 'function');
  });

  it('should create child loggers', () => {
    const parent = createLogger('MERKAVA');
    const child = parent.child('PULSE');
    assert.ok(child);
    assert.equal(typeof child.info, 'function');
  });

  it('should capture logs via onLog listener', () => {
    const captured = [];
    const unsub = onLog((entry) => captured.push(entry));

    // Ensure level is high enough
    setLogLevel('trace');
    const log = createLogger('LISTENER_TEST');
    log.info('test message', { key: 'value' });

    unsub();
    setLogLevel('info'); // reset

    assert.ok(captured.length >= 1);
    const entry = captured.find(e => e.module === 'LISTENER_TEST');
    assert.ok(entry);
    assert.equal(entry.message, 'test message');
    assert.equal(entry.level, 'INF');
    assert.deepEqual(entry.meta, { key: 'value' });
  });

  it('should respect log level filtering', () => {
    const captured = [];
    const unsub = onLog((entry) => captured.push(entry));

    setLogLevel('error'); // Only errors
    const log = createLogger('LEVEL_TEST');
    log.debug('should not appear');
    log.info('should not appear');
    log.error('should appear');

    unsub();
    setLogLevel('info'); // reset

    const entries = captured.filter(e => e.module === 'LEVEL_TEST');
    assert.equal(entries.length, 1);
    assert.equal(entries[0].level, 'ERR');
  });

  it('should unsubscribe listeners correctly', () => {
    const captured = [];
    const unsub = onLog((entry) => captured.push(entry));

    setLogLevel('trace');
    const log = createLogger('UNSUB_TEST');
    log.info('before unsub');
    unsub();
    log.info('after unsub');
    setLogLevel('info');

    const entries = captured.filter(e => e.module === 'UNSUB_TEST');
    assert.equal(entries.length, 1);
  });

  it('should export pre-built genesisLog', () => {
    assert.ok(genesisLog);
    assert.equal(typeof genesisLog.info, 'function');
  });

  it('should handle setLogLevel with string input', () => {
    // Should not throw
    setLogLevel('debug');
    setLogLevel('WARN');
    setLogLevel('silent');
    setLogLevel('info'); // reset
  });

  it('should handle setLogLevel with numeric input', () => {
    setLogLevel(LogLevel.DEBUG);
    setLogLevel(LogLevel.INFO); // reset
  });

  it('should allow per-logger level override', () => {
    const captured = [];
    const unsub = onLog((entry) => captured.push(entry));

    setLogLevel('info'); // global = info
    const log = createLogger('OVERRIDE_TEST');
    log.setLevel('trace'); // this logger = trace
    log.trace('should appear');
    log.debug('should appear');

    unsub();

    const entries = captured.filter(e => e.module === 'OVERRIDE_TEST');
    assert.equal(entries.length, 2);
  });

  it('should include ISO timestamp in log entries', () => {
    const captured = [];
    const unsub = onLog((entry) => captured.push(entry));

    setLogLevel('info');
    const log = createLogger('TIME_TEST');
    log.info('timestamp check');

    unsub();

    const entry = captured.find(e => e.module === 'TIME_TEST');
    assert.ok(entry);
    assert.ok(entry.time);
    // Should be valid ISO date
    assert.ok(!isNaN(new Date(entry.time).getTime()));
  });
});

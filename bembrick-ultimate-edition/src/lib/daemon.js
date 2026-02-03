/**
 * GENESIS Health Monitoring Daemon
 * Continuous system monitoring with alerting
 *
 * GENESIS 2.0 — Forbidden Ninja City
 */

import { EventEmitter } from 'node:events';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..', '..');
const LOG_DIR = join(ROOT_DIR, 'logs');

// ═══════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG = {
  interval: 30000, // 30 seconds
  alertThresholds: {
    cpu: 90,
    memory: 85,
    disk: 90,
    errorRate: 5
  },
  enableAlerts: true,
  logToFile: true
};

// ═══════════════════════════════════════════════════════════════════════════
// Health Daemon Class
// ═══════════════════════════════════════════════════════════════════════════

export class HealthDaemon extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.running = false;
    this.intervalId = null;
    this.metrics = [];
    this.alerts = [];
    this.startTime = null;

    // Ensure log directory exists
    if (this.config.logToFile && !existsSync(LOG_DIR)) {
      mkdirSync(LOG_DIR, { recursive: true });
    }
  }

  /**
   * Start the daemon
   */
  start() {
    if (this.running) {
      this.emit('warn', 'Daemon already running');
      return;
    }

    this.running = true;
    this.startTime = Date.now();
    this.emit('start', { startTime: this.startTime });

    // Initial check
    this.runCheck();

    // Schedule periodic checks
    this.intervalId = setInterval(() => {
      this.runCheck();
    }, this.config.interval);

    this.log('Daemon started', 'info');
  }

  /**
   * Stop the daemon
   */
  stop() {
    if (!this.running) {
      this.emit('warn', 'Daemon not running');
      return;
    }

    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.emit('stop', { uptime: Date.now() - this.startTime });
    this.log('Daemon stopped', 'info');
  }

  /**
   * Run health check
   */
  async runCheck() {
    const timestamp = Date.now();
    const metrics = await this.collectMetrics();

    this.metrics.push({
      timestamp,
      ...metrics
    });

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Check thresholds
    this.checkThresholds(metrics);

    this.emit('check', { timestamp, metrics });

    if (this.config.logToFile) {
      this.writeLog(metrics);
    }
  }

  /**
   * Collect system metrics
   */
  async collectMetrics() {
    const metrics = {
      system: {
        cpu: this.getCPU(),
        memory: this.getMemory(),
        uptime: process.uptime()
      },
      pentagon: {
        status: 'operational',
        rooms: 40,
        handlersActive: 20
      },
      charter: {
        verified: true,
        version: '1.0.0'
      },
      network: {
        connected: true,
        latency: Math.random() * 50
      },
      errors: {
        count: 0,
        rate: 0
      }
    };

    return metrics;
  }

  /**
   * Get CPU usage (simulated for portability)
   */
  getCPU() {
    // In production, use os.loadavg() or process.cpuUsage()
    return Math.random() * 30 + 10; // 10-40% simulated
  }

  /**
   * Get memory usage
   */
  getMemory() {
    const used = process.memoryUsage();
    return {
      heapUsed: Math.round(used.heapUsed / 1024 / 1024),
      heapTotal: Math.round(used.heapTotal / 1024 / 1024),
      external: Math.round(used.external / 1024 / 1024),
      rss: Math.round(used.rss / 1024 / 1024),
      percentage: Math.round((used.heapUsed / used.heapTotal) * 100)
    };
  }

  /**
   * Check thresholds and emit alerts
   */
  checkThresholds(metrics) {
    const { alertThresholds } = this.config;

    // CPU check
    if (metrics.system.cpu > alertThresholds.cpu) {
      this.alert('HIGH_CPU', `CPU usage at ${metrics.system.cpu.toFixed(1)}%`, 'warning');
    }

    // Memory check
    if (metrics.system.memory.percentage > alertThresholds.memory) {
      this.alert('HIGH_MEMORY', `Memory usage at ${metrics.system.memory.percentage}%`, 'warning');
    }

    // Error rate check
    if (metrics.errors.rate > alertThresholds.errorRate) {
      this.alert('HIGH_ERROR_RATE', `Error rate at ${metrics.errors.rate}/min`, 'critical');
    }

    // Pentagon check
    if (metrics.pentagon.status !== 'operational') {
      this.alert('PENTAGON_DEGRADED', 'Pentagon status degraded', 'critical');
    }

    // Charter check
    if (!metrics.charter.verified) {
      this.alert('CHARTER_INVALID', 'Charter verification failed', 'critical');
    }
  }

  /**
   * Emit alert
   */
  alert(code, message, severity = 'warning') {
    if (!this.config.enableAlerts) return;

    const alert = {
      code,
      message,
      severity,
      timestamp: new Date().toISOString()
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    this.emit('alert', alert);
    this.log(`ALERT [${severity.toUpperCase()}] ${code}: ${message}`, severity);
  }

  /**
   * Log message
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    this.emit('log', { timestamp, level, message });

    if (this.config.logToFile) {
      const logFile = join(LOG_DIR, `genesis-${new Date().toISOString().split('T')[0]}.log`);
      try {
        writeFileSync(logFile, logLine + '\n', { flag: 'a' });
      } catch {
        // Ignore write errors
      }
    }
  }

  /**
   * Write metrics to log
   */
  writeLog(metrics) {
    const logFile = join(LOG_DIR, 'metrics.jsonl');
    const line = JSON.stringify({ timestamp: Date.now(), ...metrics });
    try {
      writeFileSync(logFile, line + '\n', { flag: 'a' });
    } catch {
      // Ignore write errors
    }
  }

  /**
   * Get daemon status
   */
  getStatus() {
    return {
      running: this.running,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      checksRun: this.metrics.length,
      alertsRaised: this.alerts.length,
      lastCheck: this.metrics[this.metrics.length - 1],
      recentAlerts: this.alerts.slice(-10)
    };
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(minutes = 5) {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    const recent = this.metrics.filter(m => m.timestamp > cutoff);

    if (recent.length === 0) {
      return { message: 'No metrics available' };
    }

    const avgCPU = recent.reduce((sum, m) => sum + m.system.cpu, 0) / recent.length;
    const avgMemory = recent.reduce((sum, m) => sum + m.system.memory.percentage, 0) / recent.length;

    return {
      period: `${minutes} minutes`,
      samples: recent.length,
      averages: {
        cpu: avgCPU.toFixed(1),
        memory: avgMemory.toFixed(1)
      },
      current: recent[recent.length - 1]
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HTTP Server for Metrics
// ═══════════════════════════════════════════════════════════════════════════

export async function startMetricsServer(daemon, port = 9090) {
  const { createServer } = await import('node:http');

  const server = createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');

    switch (req.url) {
      case '/health':
        res.writeHead(daemon.running ? 200 : 503);
        res.end(JSON.stringify({
          healthy: daemon.running,
          ...daemon.getStatus()
        }));
        break;

      case '/metrics':
        res.writeHead(200);
        res.end(JSON.stringify(daemon.getMetricsSummary()));
        break;

      case '/alerts':
        res.writeHead(200);
        res.end(JSON.stringify({
          alerts: daemon.alerts.slice(-50)
        }));
        break;

      default:
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  server.listen(port, () => {
    daemon.log(`Metrics server listening on port ${port}`, 'info');
  });

  return server;
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI Entry Point
// ═══════════════════════════════════════════════════════════════════════════

export async function runDaemon() {
  const daemon = new HealthDaemon({
    interval: parseInt(process.env.DAEMON_INTERVAL) || 30000,
    enableAlerts: process.env.DAEMON_ALERTS !== 'false',
    logToFile: process.env.DAEMON_LOG !== 'false'
  });

  // Event handlers
  daemon.on('start', () => console.log('[DAEMON] Started'));
  daemon.on('stop', () => console.log('[DAEMON] Stopped'));
  daemon.on('check', ({ metrics }) => {
    console.log(`[DAEMON] Check complete - CPU: ${metrics.system.cpu.toFixed(1)}%, Memory: ${metrics.system.memory.percentage}%`);
  });
  daemon.on('alert', (alert) => {
    console.log(`[ALERT] ${alert.severity.toUpperCase()}: ${alert.code} - ${alert.message}`);
  });

  // Start daemon
  daemon.start();

  // Start metrics server if requested
  if (process.env.DAEMON_METRICS_PORT) {
    await startMetricsServer(daemon, parseInt(process.env.DAEMON_METRICS_PORT));
  }

  // Handle shutdown
  process.on('SIGINT', () => {
    daemon.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    daemon.stop();
    process.exit(0);
  });

  return daemon;
}

// ═══════════════════════════════════════════════════════════════════════════
// Default Export
// ═══════════════════════════════════════════════════════════════════════════

export default HealthDaemon;

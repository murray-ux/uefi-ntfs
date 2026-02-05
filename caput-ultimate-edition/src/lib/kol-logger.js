// SPDX-License-Identifier: Apache-2.0
// Copyright 2025 Murray Bembrick — Founder & Lead Developer
// See LICENSE and NOTICE for terms.

/**
 * KOL (קול — Voice) — Shared Logging Utility for GENESIS 2.0
 *
 * Provides consistent, structured, colour-coded log output across all modules.
 * Zero dependencies — uses only Node.js built-ins.
 *
 * Usage:
 *   import { createLogger, LogLevel } from './kol-logger.js';
 *   const log = createLogger('MERKAVA');
 *   log.info('System initialised');
 *   log.warn('High memory usage detected');
 *   log.error('Connection failed', { host: '10.0.0.1', code: 'ECONNREFUSED' });
 *   log.debug('Directive queue drained');
 *   log.success('All modules registered');
 */

// ─── Colour codes (ANSI 256) ────────────────────────────────────────────────

const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  grey:    '\x1b[90m',
};

// ─── Module colour assignments ──────────────────────────────────────────────

const MODULE_COLOURS = {
  GENESIS:  C.cyan,
  MERKAVA:  C.magenta,
  TZOFEH:   C.yellow,
  MALAKH:   C.blue,
  KISSEH:   C.cyan,
  RUACH:    C.green,
  OHR:      C.yellow,
  HADAAT:   C.magenta,
  KERUV:    C.red,
  NEPHESH:  C.green,
  EBEN:     C.white,
  SHINOBI:  C.grey,
  TETSUYA:  C.red,
  MABUL:    C.blue,
  VIZ:      C.cyan,
  DAEMON:   C.yellow,
  DASHBOARD: C.blue,
};

// ─── Log levels ─────────────────────────────────────────────────────────────

export const LogLevel = Object.freeze({
  SILENT:  0,
  ERROR:   1,
  WARN:    2,
  INFO:    3,
  SUCCESS: 4,
  DEBUG:   5,
  TRACE:   6,
});

const LEVEL_LABELS = {
  [LogLevel.ERROR]:   { text: 'ERR', colour: C.red },
  [LogLevel.WARN]:    { text: 'WRN', colour: C.yellow },
  [LogLevel.INFO]:    { text: 'INF', colour: C.blue },
  [LogLevel.SUCCESS]: { text: ' OK', colour: C.green },
  [LogLevel.DEBUG]:   { text: 'DBG', colour: C.grey },
  [LogLevel.TRACE]:   { text: 'TRC', colour: C.dim },
};

// ─── Global config ──────────────────────────────────────────────────────────

let globalLevel = LogLevel.INFO;
let globalJsonMode = false;
const listeners = [];

/**
 * Set the minimum log level for all loggers.
 */
export function setLogLevel(level) {
  if (typeof level === 'string') {
    const key = level.toUpperCase();
    globalLevel = LogLevel[key] ?? LogLevel.INFO;
  } else {
    globalLevel = level;
  }
}

/**
 * Enable/disable structured JSON output (for piping to log aggregators).
 */
export function setJsonMode(enabled) {
  globalJsonMode = !!enabled;
}

/**
 * Register a listener that receives every log entry as a structured object.
 * Returns an unsubscribe function.
 */
export function onLog(fn) {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

// ─── Timestamp ──────────────────────────────────────────────────────────────

function timestamp() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

function isoTimestamp() {
  return new Date().toISOString();
}

// ─── Formatter ──────────────────────────────────────────────────────────────

function formatMeta(meta) {
  if (!meta || typeof meta !== 'object') return '';
  const parts = [];
  for (const [k, v] of Object.entries(meta)) {
    parts.push(`${C.dim}${k}=${C.reset}${typeof v === 'string' ? v : JSON.stringify(v)}`);
  }
  return parts.length ? ` ${C.dim}|${C.reset} ${parts.join(' ')}` : '';
}

// ─── Logger factory ─────────────────────────────────────────────────────────

/**
 * Create a logger scoped to a module name.
 *
 * @param {string} moduleName - Module identifier (e.g., 'MERKAVA', 'TZOFEH')
 * @param {object} [opts] - Override options
 * @param {number} [opts.level] - Override minimum level for this logger
 * @returns {object} Logger with info/warn/error/debug/success/trace methods
 */
export function createLogger(moduleName, opts = {}) {
  const moduleColour = MODULE_COLOURS[moduleName.toUpperCase()] || C.white;
  const tag = moduleName.toUpperCase().padEnd(9);

  function emit(level, message, meta) {
    const effectiveLevel = opts.level ?? globalLevel;
    if (level > effectiveLevel) return;

    const entry = {
      time: isoTimestamp(),
      level: LEVEL_LABELS[level]?.text.trim() || 'UNK',
      module: moduleName,
      message,
      ...(meta ? { meta } : {}),
    };

    // Notify listeners
    for (const fn of listeners) {
      try { fn(entry); } catch { /* swallow listener errors */ }
    }

    // JSON mode — structured output
    if (globalJsonMode) {
      const stream = level <= LogLevel.WARN ? process.stderr : process.stdout;
      stream.write(JSON.stringify(entry) + '\n');
      return;
    }

    // Pretty mode — coloured terminal output
    const { text: lvlText, colour: lvlColour } = LEVEL_LABELS[level] || { text: '???', colour: C.white };
    const ts = timestamp();
    const metaStr = formatMeta(meta);
    const line = `${C.dim}${ts}${C.reset} ${lvlColour}${lvlText}${C.reset} ${moduleColour}[${tag}]${C.reset} ${message}${metaStr}`;

    if (level <= LogLevel.WARN) {
      process.stderr.write(line + '\n');
    } else {
      process.stdout.write(line + '\n');
    }
  }

  return {
    error:   (msg, meta) => emit(LogLevel.ERROR, msg, meta),
    warn:    (msg, meta) => emit(LogLevel.WARN, msg, meta),
    info:    (msg, meta) => emit(LogLevel.INFO, msg, meta),
    success: (msg, meta) => emit(LogLevel.SUCCESS, msg, meta),
    debug:   (msg, meta) => emit(LogLevel.DEBUG, msg, meta),
    trace:   (msg, meta) => emit(LogLevel.TRACE, msg, meta),

    /** Create a child logger with a sub-label. */
    child(subName) {
      return createLogger(`${moduleName}:${subName}`, opts);
    },

    /** Override level for this logger only. */
    setLevel(level) {
      opts.level = typeof level === 'string' ? LogLevel[level.toUpperCase()] : level;
    },
  };
}

// ─── Convenience: pre-built loggers ─────────────────────────────────────────

export const genesisLog = createLogger('GENESIS');

// ─── Init from environment ──────────────────────────────────────────────────

if (typeof process !== 'undefined' && process.env) {
  if (process.env.GENESIS_LOG_LEVEL) {
    setLogLevel(process.env.GENESIS_LOG_LEVEL);
  }
  if (process.env.GENESIS_LOG_JSON === 'true' || process.env.GENESIS_LOG_JSON === '1') {
    setJsonMode(true);
  }
}

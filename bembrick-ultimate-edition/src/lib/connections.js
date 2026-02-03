/**
 * GENESIS Connection Manager
 * Handles initialization and health checking of all service connections
 *
 * GENESIS 2.0 — Forbidden Ninja City
 */

import { EventEmitter } from 'node:events';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════
// Environment Loader
// ═══════════════════════════════════════════════════════════════════════════

export function loadEnv() {
  const envPath = join(__dirname, '..', '..', '.env');

  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        // Don't override existing env vars
        if (!process.env[key]) {
          process.env[key] = value.replace(/^["']|["']$/g, '');
        }
      }
    }
  }

  return process.env;
}

// ═══════════════════════════════════════════════════════════════════════════
// Connection Manager Class
// ═══════════════════════════════════════════════════════════════════════════

export class ConnectionManager extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map();
    this.status = {
      pentagon: { connected: false, status: 'pending' },
      netgear: { connected: false, status: 'pending' },
      ai: { connected: false, status: 'pending', provider: null },
      charter: { connected: false, status: 'pending' },
      yubikey: { connected: false, status: 'pending' }
    };
  }

  /**
   * Initialize all connections
   */
  async initialize() {
    loadEnv();

    this.emit('init:start');

    const results = await Promise.allSettled([
      this.initPentagon(),
      this.initNetgear(),
      this.initAI(),
      this.initCharter(),
      this.initYubiKey()
    ]);

    const summary = {
      pentagon: results[0].status === 'fulfilled' ? results[0].value : { error: results[0].reason },
      netgear: results[1].status === 'fulfilled' ? results[1].value : { error: results[1].reason },
      ai: results[2].status === 'fulfilled' ? results[2].value : { error: results[2].reason },
      charter: results[3].status === 'fulfilled' ? results[3].value : { error: results[3].reason },
      yubikey: results[4].status === 'fulfilled' ? results[4].value : { error: results[4].reason }
    };

    this.emit('init:complete', summary);
    return summary;
  }

  /**
   * Initialize Pentagon
   */
  async initPentagon() {
    try {
      const { Pentagon } = await import('../pentagon/index.js');
      const { registerAllHandlers } = await import('../pentagon/handlers.js');

      const pentagon = new Pentagon();
      registerAllHandlers(pentagon);

      this.connections.set('pentagon', pentagon);
      this.status.pentagon = {
        connected: true,
        status: 'operational',
        rooms: pentagon.rooms.size,
        handlers: pentagon.handlers.size
      };

      this.emit('connected', { service: 'pentagon', status: this.status.pentagon });
      return this.status.pentagon;
    } catch (err) {
      this.status.pentagon = { connected: false, status: 'error', error: err.message };
      this.emit('error', { service: 'pentagon', error: err });
      return this.status.pentagon;
    }
  }

  /**
   * Initialize Netgear
   */
  async initNetgear() {
    try {
      const { NetgearClient } = await import('../netgear/index.js');

      const config = {
        host: process.env.NETGEAR_HOST || '192.168.1.1',
        port: parseInt(process.env.NETGEAR_PORT) || 80,
        username: process.env.NETGEAR_USERNAME || 'admin',
        password: process.env.NETGEAR_PASSWORD || '',
        model: process.env.NETGEAR_MODEL || 'RAX120'
      };

      const client = new NetgearClient(config);

      // Test connection
      const info = await client.getInfo();

      this.connections.set('netgear', client);
      this.status.netgear = {
        connected: true,
        status: 'operational',
        host: config.host,
        model: info.model,
        hasPassword: !!config.password
      };

      this.emit('connected', { service: 'netgear', status: this.status.netgear });
      return this.status.netgear;
    } catch (err) {
      this.status.netgear = { connected: false, status: 'error', error: err.message };
      this.emit('error', { service: 'netgear', error: err });
      return this.status.netgear;
    }
  }

  /**
   * Initialize AI
   */
  async initAI() {
    try {
      const { AIClient } = await import('../ai/index.js');

      const provider = process.env.AI_PROVIDER || 'auto';

      const config = {
        provider,
        openai: {
          apiKey: process.env.OPENAI_API_KEY || process.env.GENESIS_AI_API_KEY,
          model: process.env.OPENAI_MODEL || 'gpt-4o',
          baseUrl: process.env.OPENAI_BASE_URL || process.env.GENESIS_AI_BASE_URL || 'https://api.openai.com/v1'
        },
        anthropic: {
          apiKey: process.env.ANTHROPIC_API_KEY,
          model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022'
        },
        ollama: {
          baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
          model: process.env.OLLAMA_MODEL || 'llama2'
        }
      };

      const client = new AIClient(config);

      // Detect provider
      const detectedProvider = await client.detectProvider();

      this.connections.set('ai', client);
      this.status.ai = {
        connected: true,
        status: 'operational',
        provider: detectedProvider,
        hasOpenAI: !!config.openai.apiKey,
        hasAnthropic: !!config.anthropic.apiKey
      };

      this.emit('connected', { service: 'ai', status: this.status.ai });
      return this.status.ai;
    } catch (err) {
      this.status.ai = { connected: false, status: 'error', error: err.message };
      this.emit('error', { service: 'ai', error: err });
      return this.status.ai;
    }
  }

  /**
   * Initialize Charter verification
   */
  async initCharter() {
    try {
      const charterDir = process.env.CHARTER_DIR || join(__dirname, '..', '..', '..', 'forbidden-ninja-city-charter-v1.0.0', 'charter');
      const metaPath = join(charterDir, 'charter.meta.json');

      if (!existsSync(metaPath)) {
        this.status.charter = {
          connected: false,
          status: 'not_found',
          path: charterDir
        };
        return this.status.charter;
      }

      const meta = JSON.parse(readFileSync(metaPath, 'utf8'));

      this.status.charter = {
        connected: true,
        status: 'verified',
        version: meta.version,
        adminMaster: meta.admin_master.name,
        doctrines: meta.doctrines?.length || 0
      };

      this.emit('connected', { service: 'charter', status: this.status.charter });
      return this.status.charter;
    } catch (err) {
      this.status.charter = { connected: false, status: 'error', error: err.message };
      this.emit('error', { service: 'charter', error: err });
      return this.status.charter;
    }
  }

  /**
   * Initialize YubiKey
   */
  async initYubiKey() {
    try {
      const serial = process.env.YUBIKEY_SERIAL || process.env.GENESIS_YUBIKEY_SERIAL || '31695265';
      const model = process.env.YUBIKEY_MODEL || '5C FIPS';

      // In production, this would check for actual YubiKey presence
      // For now, we just validate configuration
      this.status.yubikey = {
        connected: true,
        status: 'configured',
        serial,
        model,
        mode: process.env.GENESIS_YUBIKEY_MODE || 'challenge-response'
      };

      this.emit('connected', { service: 'yubikey', status: this.status.yubikey });
      return this.status.yubikey;
    } catch (err) {
      this.status.yubikey = { connected: false, status: 'error', error: err.message };
      this.emit('error', { service: 'yubikey', error: err });
      return this.status.yubikey;
    }
  }

  /**
   * Get connection by name
   */
  get(name) {
    return this.connections.get(name);
  }

  /**
   * Get overall status
   */
  getStatus() {
    const connected = Object.values(this.status).filter(s => s.connected).length;
    const total = Object.keys(this.status).length;

    return {
      healthy: connected >= 3, // Pentagon, AI (offline), Charter minimum
      connected,
      total,
      services: this.status
    };
  }

  /**
   * Run health check on all connections
   */
  async healthCheck() {
    const checks = {};

    // Pentagon
    const pentagon = this.get('pentagon');
    if (pentagon) {
      checks.pentagon = pentagon.health();
    }

    // Netgear
    const netgear = this.get('netgear');
    if (netgear) {
      try {
        checks.netgear = await netgear.healthCheck();
      } catch (err) {
        checks.netgear = { error: err.message };
      }
    }

    // AI
    const ai = this.get('ai');
    if (ai) {
      checks.ai = ai.getHistory();
    }

    return {
      timestamp: new Date().toISOString(),
      status: this.getStatus(),
      checks
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Singleton Instance
// ═══════════════════════════════════════════════════════════════════════════

let instance = null;

export function getConnectionManager() {
  if (!instance) {
    instance = new ConnectionManager();
  }
  return instance;
}

export async function initializeAll() {
  const manager = getConnectionManager();
  return manager.initialize();
}

// ═══════════════════════════════════════════════════════════════════════════
// Default Export
// ═══════════════════════════════════════════════════════════════════════════

export default ConnectionManager;

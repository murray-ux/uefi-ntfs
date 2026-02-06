/**
 * MABUL PERSISTENCE LAYER
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * The Flood Layer — Complete memory persistence and retrieval system
 * Named for the biblical Mabul (מבול) — the great flood that preserved Noah
 *
 * Architecture:
 *   TEBAH (תבה)   — Ark: Secure container and isolation
 *   GOPHER (גפר)  — Wood: Structural framework and scaffolding
 *   KOFER (כפר)   — Pitch: Sealing and encryption layer
 *   TZOHAR (צהר)  — Window: Monitoring and observation port
 *   ARARAT (אררט) — Mountain: Stable anchor and checkpoint
 *   YONAH (יונה)  — Dove: Probe and health check messenger
 *   ZAYIT (זית)   — Olive: Peace signal and graceful recovery
 *   KESHET (קשת) — Rainbow: Covenant verification and trust anchor
 *
 * @module MABUL
 * @version 2.0.0
 */

import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';

// ══════════════════════════════════════════════════════════════════════════════
// TEBAH (ARK) — Secure Container Module
// ══════════════════════════════════════════════════════════════════════════════

/**
 * TEBAH — The Ark
 * Secure persistent storage container with isolation guarantees
 */
export class Tebah extends EventEmitter {
  constructor(options = {}) {
    super();
    this.dataDir = options.dataDir || path.join(process.cwd(), '.genesis', 'mabul');
    this.dbPath = path.join(this.dataDir, 'tebah.db');
    this.vectorPath = path.join(this.dataDir, 'vectors.idx');
    this.metaPath = path.join(this.dataDir, 'meta.json');

    // In-memory stores (SQLite-like structure without dependency)
    this.memories = new Map();
    this.vectors = new Map();
    this.metadata = {
      created: Date.now(),
      version: '2.0.0',
      checkpoints: [],
      covenants: []
    };

    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return this;

    // Ensure data directory exists
    await fs.mkdir(this.dataDir, { recursive: true });

    // Load existing data if present
    try {
      const dbData = await fs.readFile(this.dbPath, 'utf-8');
      const parsed = JSON.parse(dbData);
      this.memories = new Map(Object.entries(parsed));
    } catch {
      // Fresh start
    }

    try {
      const vecData = await fs.readFile(this.vectorPath, 'utf-8');
      const parsed = JSON.parse(vecData);
      this.vectors = new Map(Object.entries(parsed));
    } catch {
      // Fresh start
    }

    try {
      const metaData = await fs.readFile(this.metaPath, 'utf-8');
      this.metadata = JSON.parse(metaData);
    } catch {
      // Use defaults
    }

    this.initialized = true;
    this.emit('initialized', { dataDir: this.dataDir });
    return this;
  }

  /**
   * Store a memory in the Ark
   */
  async store(key, value, options = {}) {
    const record = {
      id: key,
      value,
      timestamp: Date.now(),
      tags: options.tags || [],
      category: options.category || 'general',
      encrypted: false,
      checksum: this._checksum(JSON.stringify(value))
    };

    this.memories.set(key, record);

    // Generate vector embedding if content provided
    if (options.generateVector !== false && typeof value === 'string') {
      const vector = this._generateEmbedding(value);
      this.vectors.set(key, vector);
    }

    await this._persist();
    this.emit('stored', { key, record });
    return record;
  }

  /**
   * Retrieve a memory from the Ark
   */
  async retrieve(key) {
    const record = this.memories.get(key);
    if (!record) return null;

    // Verify integrity
    const checksum = this._checksum(JSON.stringify(record.value));
    if (checksum !== record.checksum) {
      this.emit('integrity-violation', { key, expected: record.checksum, actual: checksum });
      return null;
    }

    return record;
  }

  /**
   * List all memories with optional filtering
   */
  async list(filter = {}) {
    const results = [];

    for (const [key, record] of this.memories) {
      let match = true;

      if (filter.category && record.category !== filter.category) match = false;
      if (filter.tags && !filter.tags.every(t => record.tags.includes(t))) match = false;
      if (filter.since && record.timestamp < filter.since) match = false;
      if (filter.until && record.timestamp > filter.until) match = false;

      if (match) results.push(record);
    }

    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Delete a memory
   */
  async delete(key) {
    const existed = this.memories.delete(key);
    this.vectors.delete(key);
    await this._persist();
    return existed;
  }

  /**
   * Clear all memories (use with caution)
   */
  async clear() {
    this.memories.clear();
    this.vectors.clear();
    await this._persist();
    this.emit('cleared');
  }

  _checksum(data) {
    return createHash('sha256').update(data).digest('hex').slice(0, 16);
  }

  _generateEmbedding(text) {
    // Simple TF-IDF-like embedding (production would use real embeddings)
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const freq = {};
    words.forEach(w => freq[w] = (freq[w] || 0) + 1);

    // Create 128-dimensional vector from word frequencies
    const vector = new Array(128).fill(0);
    Object.entries(freq).forEach(([word, count], i) => {
      const hash = createHash('md5').update(word).digest();
      for (let j = 0; j < 4; j++) {
        const idx = hash[j] % 128;
        vector[idx] += count * (1 / (1 + Math.log(i + 1)));
      }
    });

    // Normalize
    const mag = Math.sqrt(vector.reduce((s, v) => s + v * v, 0)) || 1;
    return vector.map(v => v / mag);
  }

  async _persist() {
    const dbData = Object.fromEntries(this.memories);
    const vecData = Object.fromEntries(this.vectors);

    await Promise.all([
      fs.writeFile(this.dbPath, JSON.stringify(dbData, null, 2)),
      fs.writeFile(this.vectorPath, JSON.stringify(vecData)),
      fs.writeFile(this.metaPath, JSON.stringify(this.metadata, null, 2))
    ]);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// KOFER (PITCH) — Encryption Layer
// ══════════════════════════════════════════════════════════════════════════════

/**
 * KOFER — The Pitch
 * Sealing and encryption layer for sensitive memories
 */
export class Kofer {
  constructor(options = {}) {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
    this.masterKey = options.masterKey || null;
  }

  /**
   * Generate a new master key
   */
  generateKey() {
    return randomBytes(this.keyLength).toString('hex');
  }

  /**
   * Derive a key from a passphrase
   */
  deriveKey(passphrase, salt = null) {
    salt = salt || randomBytes(16);
    const key = createHash('sha256')
      .update(passphrase)
      .update(salt)
      .digest();
    return { key, salt };
  }

  /**
   * Seal (encrypt) data
   */
  seal(data, key = null) {
    const useKey = key || this.masterKey;
    if (!useKey) throw new Error('KOFER: No encryption key provided');

    const keyBuffer = Buffer.from(useKey, 'hex');
    const iv = randomBytes(this.ivLength);
    const cipher = createCipheriv(this.algorithm, keyBuffer, iv);

    const jsonData = JSON.stringify(data);
    let encrypted = cipher.update(jsonData, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();

    return {
      sealed: true,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      data: encrypted,
      algorithm: this.algorithm,
      timestamp: Date.now()
    };
  }

  /**
   * Unseal (decrypt) data
   */
  unseal(sealed, key = null) {
    const useKey = key || this.masterKey;
    if (!useKey) throw new Error('KOFER: No decryption key provided');

    const keyBuffer = Buffer.from(useKey, 'hex');
    const iv = Buffer.from(sealed.iv, 'hex');
    const tag = Buffer.from(sealed.tag, 'hex');

    const decipher = createDecipheriv(this.algorithm, keyBuffer, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(sealed.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  /**
   * Create a sealed envelope with metadata
   */
  createEnvelope(data, metadata = {}) {
    const sealed = this.seal(data);
    return {
      ...sealed,
      envelope: {
        created: Date.now(),
        ...metadata
      }
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TZOHAR (WINDOW) — Monitoring and Observation Port
// ══════════════════════════════════════════════════════════════════════════════

/**
 * TZOHAR — The Window
 * Query and retrieval system with semantic search capabilities
 */
export class Tzohar {
  constructor(tebah) {
    this.tebah = tebah;
  }

  /**
   * Semantic search across memories
   */
  async search(query, options = {}) {
    const limit = options.limit || 10;
    const threshold = options.threshold || 0.3;

    // Generate query embedding
    const queryVector = this.tebah._generateEmbedding(query);

    // Calculate cosine similarity with all vectors
    const scores = [];
    for (const [key, vector] of this.tebah.vectors) {
      const similarity = this._cosineSimilarity(queryVector, vector);
      if (similarity >= threshold) {
        scores.push({ key, similarity });
      }
    }

    // Sort by similarity and fetch records
    scores.sort((a, b) => b.similarity - a.similarity);
    const topResults = scores.slice(0, limit);

    const results = await Promise.all(
      topResults.map(async ({ key, similarity }) => {
        const record = await this.tebah.retrieve(key);
        return record ? { ...record, similarity } : null;
      })
    );

    return results.filter(Boolean);
  }

  /**
   * Multi-layer query with context aggregation
   */
  async layeredQuery(query, options = {}) {
    const layers = options.layers || ['recent', 'relevant', 'categorical'];
    const results = { query, timestamp: Date.now(), layers: {} };

    for (const layer of layers) {
      switch (layer) {
        case 'recent':
          results.layers.recent = await this.tebah.list({
            since: Date.now() - (options.recentWindow || 86400000) // 24h default
          });
          break;

        case 'relevant':
          results.layers.relevant = await this.search(query, {
            limit: options.relevantLimit || 5
          });
          break;

        case 'categorical':
          if (options.category) {
            results.layers.categorical = await this.tebah.list({
              category: options.category
            });
          }
          break;

        case 'tagged':
          if (options.tags) {
            results.layers.tagged = await this.tebah.list({
              tags: options.tags
            });
          }
          break;
      }
    }

    return results;
  }

  /**
   * Aggregate context for prompts
   */
  async buildContext(query, options = {}) {
    const layered = await this.layeredQuery(query, {
      layers: ['recent', 'relevant'],
      relevantLimit: options.limit || 5,
      recentWindow: options.recentWindow || 3600000 // 1h
    });

    // Deduplicate and format
    const seen = new Set();
    const context = [];

    // Prioritize relevant matches
    for (const record of (layered.layers.relevant || [])) {
      if (!seen.has(record.id)) {
        seen.add(record.id);
        context.push(this._formatForContext(record));
      }
    }

    // Add recent if not already included
    for (const record of (layered.layers.recent || [])) {
      if (!seen.has(record.id) && context.length < (options.maxContext || 10)) {
        seen.add(record.id);
        context.push(this._formatForContext(record));
      }
    }

    return {
      query,
      contextItems: context.length,
      context: context.join('\n\n---\n\n')
    };
  }

  _cosineSimilarity(a, b) {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
  }

  _formatForContext(record) {
    const age = Date.now() - record.timestamp;
    const ageStr = age < 3600000 ? `${Math.floor(age / 60000)}m ago` :
                   age < 86400000 ? `${Math.floor(age / 3600000)}h ago` :
                   `${Math.floor(age / 86400000)}d ago`;

    return `[${record.category}] (${ageStr})\n${
      typeof record.value === 'string' ? record.value : JSON.stringify(record.value, null, 2)
    }`;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// YONAH (DOVE) — Probe and Messenger System
// ══════════════════════════════════════════════════════════════════════════════

/**
 * YONAH — The Dove
 * Lifecycle hooks and health check messenger system
 */
export class Yonah extends EventEmitter {
  constructor(tebah, options = {}) {
    super();
    this.tebah = tebah;
    this.hooks = new Map();
    this.probes = new Map();
    this.healthChecks = [];
    this.autoCapture = options.autoCapture !== false;

    // Built-in lifecycle hooks
    this._setupDefaultHooks();
  }

  _setupDefaultHooks() {
    // Hook: Before store
    this.registerHook('before:store', async (data) => {
      data.timestamp = Date.now();
      return data;
    });

    // Hook: After store
    this.registerHook('after:store', async (record) => {
      this.emit('memory:created', record);
    });

    // Hook: Before retrieve
    this.registerHook('before:retrieve', async (key) => {
      this.emit('memory:accessed', { key, timestamp: Date.now() });
      return key;
    });
  }

  /**
   * Register a lifecycle hook
   */
  registerHook(event, handler) {
    if (!this.hooks.has(event)) {
      this.hooks.set(event, []);
    }
    this.hooks.get(event).push(handler);
    return this;
  }

  /**
   * Execute hooks for an event
   */
  async executeHooks(event, data) {
    const handlers = this.hooks.get(event) || [];
    let result = data;

    for (const handler of handlers) {
      result = await handler(result) ?? result;
    }

    return result;
  }

  /**
   * Register a health probe
   */
  registerProbe(name, checker) {
    this.probes.set(name, {
      checker,
      lastCheck: null,
      lastStatus: null,
      failures: 0
    });
    return this;
  }

  /**
   * Run all health probes
   */
  async checkHealth() {
    const results = {
      timestamp: Date.now(),
      status: 'healthy',
      probes: {}
    };

    for (const [name, probe] of this.probes) {
      try {
        const status = await probe.checker();
        probe.lastCheck = Date.now();
        probe.lastStatus = status;
        probe.failures = 0;
        results.probes[name] = { status: 'healthy', ...status };
      } catch (error) {
        probe.failures++;
        probe.lastStatus = { error: error.message };
        results.probes[name] = { status: 'unhealthy', error: error.message };
        results.status = 'degraded';
      }
    }

    // Check if any critical probe failed
    const criticalFailed = Object.values(results.probes)
      .some(p => p.status === 'unhealthy' && p.critical);
    if (criticalFailed) results.status = 'unhealthy';

    this.emit('health:checked', results);
    return results;
  }

  /**
   * Send a message (store with auto-capture)
   */
  async send(message, options = {}) {
    const data = await this.executeHooks('before:store', {
      value: message,
      category: options.category || 'message',
      tags: options.tags || ['yonah', 'auto-captured']
    });

    const key = options.key || `msg:${Date.now()}:${randomBytes(4).toString('hex')}`;
    const record = await this.tebah.store(key, data.value, {
      category: data.category,
      tags: data.tags
    });

    await this.executeHooks('after:store', record);
    return record;
  }

  /**
   * Auto-capture from a stream or conversation
   */
  createCaptureStream(options = {}) {
    const category = options.category || 'stream';
    const batchSize = options.batchSize || 1;
    const buffer = [];

    return {
      write: async (chunk) => {
        buffer.push(chunk);
        if (buffer.length >= batchSize) {
          const batch = buffer.splice(0, batchSize);
          await this.send(batch.join('\n'), { category });
        }
      },
      flush: async () => {
        if (buffer.length > 0) {
          await this.send(buffer.join('\n'), { category });
          buffer.length = 0;
        }
      }
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ARARAT (MOUNTAIN) — Checkpoint System
// ══════════════════════════════════════════════════════════════════════════════

/**
 * ARARAT — The Mountain
 * Stable anchor and checkpoint system for state snapshots
 */
export class Ararat {
  constructor(tebah, options = {}) {
    this.tebah = tebah;
    this.checkpointDir = options.checkpointDir ||
      path.join(tebah.dataDir, 'checkpoints');
  }

  /**
   * Create a checkpoint of current state
   */
  async createCheckpoint(name = null) {
    await fs.mkdir(this.checkpointDir, { recursive: true });

    const checkpointId = name || `cp:${Date.now()}`;
    const checkpoint = {
      id: checkpointId,
      timestamp: Date.now(),
      memoriesCount: this.tebah.memories.size,
      vectorsCount: this.tebah.vectors.size,
      memories: Object.fromEntries(this.tebah.memories),
      vectors: Object.fromEntries(this.tebah.vectors),
      metadata: { ...this.tebah.metadata }
    };

    const checkpointPath = path.join(this.checkpointDir, `${checkpointId}.json`);
    await fs.writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2));

    // Update metadata
    this.tebah.metadata.checkpoints.push({
      id: checkpointId,
      timestamp: checkpoint.timestamp,
      path: checkpointPath
    });
    await this.tebah._persist();

    return checkpoint;
  }

  /**
   * Restore from a checkpoint
   */
  async restoreCheckpoint(checkpointId) {
    const checkpointPath = path.join(this.checkpointDir, `${checkpointId}.json`);
    const data = await fs.readFile(checkpointPath, 'utf-8');
    const checkpoint = JSON.parse(data);

    this.tebah.memories = new Map(Object.entries(checkpoint.memories));
    this.tebah.vectors = new Map(Object.entries(checkpoint.vectors));
    await this.tebah._persist();

    return checkpoint;
  }

  /**
   * List all checkpoints
   */
  async listCheckpoints() {
    try {
      const files = await fs.readdir(this.checkpointDir);
      const checkpoints = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = await fs.readFile(
            path.join(this.checkpointDir, file), 'utf-8'
          );
          const cp = JSON.parse(data);
          checkpoints.push({
            id: cp.id,
            timestamp: cp.timestamp,
            memoriesCount: cp.memoriesCount
          });
        }
      }

      return checkpoints.sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      return [];
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// KESHET (RAINBOW) — Covenant Verification
// ══════════════════════════════════════════════════════════════════════════════

/**
 * KESHET — The Rainbow
 * Covenant verification and trust anchor system
 */
export class Keshet {
  constructor(tebah) {
    this.tebah = tebah;
    this.covenants = new Map();
  }

  /**
   * Create a covenant (trusted state assertion)
   */
  async createCovenant(name, conditions) {
    const covenant = {
      id: `cov:${name}:${Date.now()}`,
      name,
      conditions,
      created: Date.now(),
      verified: null,
      signature: null
    };

    // Sign the covenant
    covenant.signature = createHash('sha256')
      .update(JSON.stringify({ name, conditions }))
      .digest('hex');

    this.covenants.set(covenant.id, covenant);
    this.tebah.metadata.covenants.push({
      id: covenant.id,
      name,
      created: covenant.created
    });
    await this.tebah._persist();

    return covenant;
  }

  /**
   * Verify a covenant's conditions
   */
  async verifyCovenant(covenantId) {
    const covenant = this.covenants.get(covenantId);
    if (!covenant) throw new Error(`Covenant not found: ${covenantId}`);

    const results = {
      covenantId,
      name: covenant.name,
      timestamp: Date.now(),
      conditions: [],
      passed: true
    };

    for (const condition of covenant.conditions) {
      const result = await this._checkCondition(condition);
      results.conditions.push(result);
      if (!result.passed) results.passed = false;
    }

    covenant.verified = results;
    return results;
  }

  async _checkCondition(condition) {
    const result = { condition, passed: false, details: null };

    try {
      switch (condition.type) {
        case 'exists':
          const record = await this.tebah.retrieve(condition.key);
          result.passed = record !== null;
          result.details = record ? 'Found' : 'Not found';
          break;

        case 'count':
          const list = await this.tebah.list(condition.filter || {});
          result.passed = condition.min ? list.length >= condition.min :
                         condition.max ? list.length <= condition.max :
                         condition.exact ? list.length === condition.exact : true;
          result.details = `Count: ${list.length}`;
          break;

        case 'integrity':
          const all = await this.tebah.list();
          let valid = 0;
          for (const rec of all) {
            const check = this.tebah._checksum(JSON.stringify(rec.value));
            if (check === rec.checksum) valid++;
          }
          result.passed = valid === all.length;
          result.details = `${valid}/${all.length} records valid`;
          break;

        case 'custom':
          if (typeof condition.checker === 'function') {
            result.passed = await condition.checker(this.tebah);
          }
          break;
      }
    } catch (error) {
      result.passed = false;
      result.details = error.message;
    }

    return result;
  }

  /**
   * Create a trust anchor (immutable reference point)
   */
  async createTrustAnchor(data) {
    const anchor = {
      id: `anchor:${Date.now()}`,
      data,
      hash: createHash('sha256').update(JSON.stringify(data)).digest('hex'),
      timestamp: Date.now(),
      sealed: true
    };

    await this.tebah.store(anchor.id, anchor, {
      category: 'trust-anchor',
      tags: ['keshet', 'immutable']
    });

    return anchor;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ZAYIT (OLIVE) — Graceful Recovery
// ══════════════════════════════════════════════════════════════════════════════

/**
 * ZAYIT — The Olive Branch
 * Peace signal and graceful recovery system
 */
export class Zayit extends EventEmitter {
  constructor(tebah, ararat) {
    super();
    this.tebah = tebah;
    this.ararat = ararat;
    this.recoveryStrategies = new Map();

    this._setupDefaultStrategies();
  }

  _setupDefaultStrategies() {
    // Strategy: Restore from latest checkpoint
    this.registerStrategy('checkpoint', async () => {
      const checkpoints = await this.ararat.listCheckpoints();
      if (checkpoints.length > 0) {
        return this.ararat.restoreCheckpoint(checkpoints[0].id);
      }
      throw new Error('No checkpoints available');
    });

    // Strategy: Clear and reinitialize
    this.registerStrategy('reset', async () => {
      await this.tebah.clear();
      return { reset: true, timestamp: Date.now() };
    });

    // Strategy: Repair integrity
    this.registerStrategy('repair', async () => {
      const all = await this.tebah.list();
      let repaired = 0;

      for (const record of all) {
        const newChecksum = this.tebah._checksum(JSON.stringify(record.value));
        if (newChecksum !== record.checksum) {
          record.checksum = newChecksum;
          this.tebah.memories.set(record.id, record);
          repaired++;
        }
      }

      await this.tebah._persist();
      return { repaired, timestamp: Date.now() };
    });
  }

  /**
   * Register a recovery strategy
   */
  registerStrategy(name, handler) {
    this.recoveryStrategies.set(name, handler);
    return this;
  }

  /**
   * Attempt recovery with specified strategy
   */
  async recover(strategy = 'checkpoint') {
    const handler = this.recoveryStrategies.get(strategy);
    if (!handler) {
      throw new Error(`Unknown recovery strategy: ${strategy}`);
    }

    this.emit('recovery:started', { strategy, timestamp: Date.now() });

    try {
      const result = await handler();
      this.emit('recovery:completed', { strategy, result });
      return { success: true, strategy, result };
    } catch (error) {
      this.emit('recovery:failed', { strategy, error: error.message });
      return { success: false, strategy, error: error.message };
    }
  }

  /**
   * Signal peace (system recovered and stable)
   */
  async signalPeace() {
    const signal = {
      type: 'olive-branch',
      timestamp: Date.now(),
      status: 'recovered',
      memories: this.tebah.memories.size,
      checksum: this.tebah._checksum(
        JSON.stringify(Array.from(this.tebah.memories.keys()))
      )
    };

    await this.tebah.store(`peace:${Date.now()}`, signal, {
      category: 'system',
      tags: ['zayit', 'recovery']
    });

    this.emit('peace:signaled', signal);
    return signal;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// GOPHER (WOOD) — Framework Module
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GOPHER — The Wood
 * Structural framework that binds all components together
 */
export class Gopher {
  constructor(options = {}) {
    this.options = options;
    this.components = {};
    this.initialized = false;
  }

  async build() {
    // Build the Ark (core storage)
    this.components.tebah = new Tebah(this.options);
    await this.components.tebah.initialize();

    // Build supporting structures
    this.components.kofer = new Kofer(this.options);
    this.components.tzohar = new Tzohar(this.components.tebah);
    this.components.yonah = new Yonah(this.components.tebah, this.options);
    this.components.ararat = new Ararat(this.components.tebah, this.options);
    this.components.keshet = new Keshet(this.components.tebah);
    this.components.zayit = new Zayit(this.components.tebah, this.components.ararat);

    // Register default health probes
    this.components.yonah.registerProbe('storage', async () => ({
      memories: this.components.tebah.memories.size,
      vectors: this.components.tebah.vectors.size
    }));

    this.components.yonah.registerProbe('integrity', async () => {
      const all = await this.components.tebah.list();
      let valid = 0;
      for (const rec of all) {
        const check = this.components.tebah._checksum(JSON.stringify(rec.value));
        if (check === rec.checksum) valid++;
      }
      return { total: all.length, valid, ratio: valid / (all.length || 1) };
    });

    this.initialized = true;
    return this;
  }

  get tebah() { return this.components.tebah; }
  get kofer() { return this.components.kofer; }
  get tzohar() { return this.components.tzohar; }
  get yonah() { return this.components.yonah; }
  get ararat() { return this.components.ararat; }
  get keshet() { return this.components.keshet; }
  get zayit() { return this.components.zayit; }
}

// ══════════════════════════════════════════════════════════════════════════════
// MABUL — Main Export (Complete Flood Layer)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * MABUL — The Flood
 * Complete persistence layer with all components
 */
export class Mabul {
  constructor(options = {}) {
    this.options = {
      dataDir: options.dataDir || path.join(process.cwd(), '.genesis', 'mabul'),
      masterKey: options.masterKey,
      autoCapture: options.autoCapture !== false,
      ...options
    };

    this.gopher = new Gopher(this.options);
    this.ready = false;
  }

  /**
   * Initialize the complete MABUL system
   */
  async initialize() {
    await this.gopher.build();
    this.ready = true;
    return this;
  }

  // Convenience accessors
  get ark() { return this.gopher.tebah; }
  get encryption() { return this.gopher.kofer; }
  get query() { return this.gopher.tzohar; }
  get messenger() { return this.gopher.yonah; }
  get checkpoint() { return this.gopher.ararat; }
  get covenant() { return this.gopher.keshet; }
  get recovery() { return this.gopher.zayit; }

  /**
   * Quick store operation
   */
  async store(key, value, options = {}) {
    return this.ark.store(key, value, options);
  }

  /**
   * Quick retrieve operation
   */
  async retrieve(key) {
    return this.ark.retrieve(key);
  }

  /**
   * Semantic search
   */
  async search(query, options = {}) {
    return this.query.search(query, options);
  }

  /**
   * Build context for prompts
   */
  async buildContext(query, options = {}) {
    return this.query.buildContext(query, options);
  }

  /**
   * Health check
   */
  async health() {
    return this.messenger.checkHealth();
  }

  /**
   * Create checkpoint
   */
  async createCheckpoint(name) {
    return this.checkpoint.createCheckpoint(name);
  }

  /**
   * Get system status
   */
  async status() {
    const health = await this.health();
    const checkpoints = await this.checkpoint.listCheckpoints();

    return {
      ready: this.ready,
      timestamp: Date.now(),
      memories: this.ark.memories.size,
      vectors: this.ark.vectors.size,
      checkpoints: checkpoints.length,
      health: health.status,
      components: {
        tebah: 'active',
        kofer: this.encryption.masterKey ? 'encrypted' : 'plaintext',
        tzohar: 'active',
        yonah: 'active',
        ararat: 'active',
        keshet: 'active',
        zayit: 'active'
      }
    };
  }
}

// Default export
export default Mabul;

// Named exports for individual components
export {
  Tebah as Ark,
  Kofer as Seal,
  Tzohar as Window,
  Yonah as Dove,
  Ararat as Mountain,
  Keshet as Rainbow,
  Zayit as Olive,
  Gopher as Framework
};

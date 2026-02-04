/**
 * GENESIS FMHY-Inspired Integrations
 * Cutting-edge tools and concepts from FreeMediaHeckYeah
 *
 * GENESIS 2.0 — Forbidden Ninja City
 * Inspired by: https://fmhy.net/
 */

import { EventEmitter } from 'node:events';
import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..', '..');

// ═══════════════════════════════════════════════════════════════════════════
// Vector Database Abstraction (Qdrant/pgvector compatible)
// Inspired by: https://qdrant.tech/ and pgvector
// ═══════════════════════════════════════════════════════════════════════════

export class VectorStore extends EventEmitter {
  constructor(options = {}) {
    super();
    this.backend = options.backend || 'memory'; // 'memory', 'pgvector', 'qdrant'
    this.dimensions = options.dimensions || 1536;
    this.collections = new Map();
    this.qdrantUrl = options.qdrantUrl || process.env.QDRANT_URL;
    this.pgClient = options.pgClient;
  }

  /**
   * Create a collection
   */
  async createCollection(name, schema = {}) {
    if (this.backend === 'qdrant' && this.qdrantUrl) {
      return this._qdrantRequest('PUT', `/collections/${name}`, {
        vectors: {
          size: schema.dimensions || this.dimensions,
          distance: schema.distance || 'Cosine'
        }
      });
    }

    if (this.backend === 'pgvector' && this.pgClient) {
      await this.pgClient.query(`
        CREATE TABLE IF NOT EXISTS ${name} (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          embedding vector(${schema.dimensions || this.dimensions}),
          metadata JSONB,
          content TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      await this.pgClient.query(`
        CREATE INDEX IF NOT EXISTS ${name}_embedding_idx
        ON ${name} USING ivfflat (embedding vector_cosine_ops)
      `);
      return { success: true, collection: name };
    }

    // Memory backend
    this.collections.set(name, {
      schema,
      vectors: [],
      index: new Map()
    });
    return { success: true, collection: name };
  }

  /**
   * Insert vectors
   */
  async upsert(collection, points) {
    if (this.backend === 'qdrant' && this.qdrantUrl) {
      return this._qdrantRequest('PUT', `/collections/${collection}/points`, {
        points: points.map(p => ({
          id: p.id,
          vector: p.vector,
          payload: p.metadata
        }))
      });
    }

    if (this.backend === 'pgvector' && this.pgClient) {
      for (const point of points) {
        await this.pgClient.query(`
          INSERT INTO ${collection} (id, embedding, metadata, content)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id) DO UPDATE SET
            embedding = EXCLUDED.embedding,
            metadata = EXCLUDED.metadata,
            content = EXCLUDED.content
        `, [point.id, `[${point.vector.join(',')}]`, point.metadata, point.content]);
      }
      return { success: true, count: points.length };
    }

    // Memory backend
    const col = this.collections.get(collection);
    if (!col) throw new Error(`Collection ${collection} not found`);

    for (const point of points) {
      col.index.set(point.id, col.vectors.length);
      col.vectors.push(point);
    }
    return { success: true, count: points.length };
  }

  /**
   * Search for similar vectors
   */
  async search(collection, queryVector, options = {}) {
    const limit = options.limit || 10;
    const threshold = options.threshold || 0.7;

    if (this.backend === 'qdrant' && this.qdrantUrl) {
      const result = await this._qdrantRequest('POST', `/collections/${collection}/points/search`, {
        vector: queryVector,
        limit,
        score_threshold: threshold,
        with_payload: true
      });
      return result.result || [];
    }

    if (this.backend === 'pgvector' && this.pgClient) {
      const result = await this.pgClient.query(`
        SELECT
          id, content, metadata,
          1 - (embedding <=> $1::vector) as similarity
        FROM ${collection}
        WHERE 1 - (embedding <=> $1::vector) >= $2
        ORDER BY embedding <=> $1::vector
        LIMIT $3
      `, [`[${queryVector.join(',')}]`, threshold, limit]);
      return result.rows;
    }

    // Memory backend - cosine similarity
    const col = this.collections.get(collection);
    if (!col) throw new Error(`Collection ${collection} not found`);

    const results = col.vectors
      .map(point => ({
        ...point,
        score: this._cosineSimilarity(queryVector, point.vector)
      }))
      .filter(r => r.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return results;
  }

  /**
   * Cosine similarity calculation
   */
  _cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Qdrant HTTP request helper
   */
  async _qdrantRequest(method, path, body) {
    const response = await fetch(`${this.qdrantUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000)
    });
    return response.json();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Workflow Automation (N8N-style)
// Inspired by: https://n8n.io/
// ═══════════════════════════════════════════════════════════════════════════

export class WorkflowEngine extends EventEmitter {
  constructor() {
    super();
    this.workflows = new Map();
    this.nodes = new Map();
    this.triggers = new Map();
    this.running = new Set();
  }

  /**
   * Register a node type
   */
  registerNode(type, handler) {
    this.nodes.set(type, handler);
    return this;
  }

  /**
   * Create a workflow
   */
  createWorkflow(id, definition) {
    const workflow = {
      id,
      name: definition.name || id,
      nodes: definition.nodes || [],
      connections: definition.connections || [],
      triggers: definition.triggers || [],
      enabled: definition.enabled !== false,
      created: Date.now()
    };
    this.workflows.set(id, workflow);
    this.emit('workflow:created', workflow);
    return workflow;
  }

  /**
   * Execute a workflow
   */
  async execute(workflowId, inputData = {}) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);
    if (!workflow.enabled) throw new Error(`Workflow ${workflowId} is disabled`);

    const executionId = `exec_${Date.now()}_${randomBytes(4).toString('hex')}`;
    this.running.add(executionId);

    const context = {
      executionId,
      workflowId,
      startTime: Date.now(),
      data: { ...inputData },
      nodeResults: new Map(),
      errors: []
    };

    this.emit('workflow:start', { executionId, workflowId });

    try {
      // Build execution order (topological sort)
      const order = this._topologicalSort(workflow);

      // Execute nodes in order
      for (const nodeId of order) {
        const node = workflow.nodes.find(n => n.id === nodeId);
        if (!node) continue;

        const handler = this.nodes.get(node.type);
        if (!handler) {
          context.errors.push({ node: nodeId, error: `Unknown node type: ${node.type}` });
          continue;
        }

        try {
          // Get input from connected nodes
          const inputs = this._getNodeInputs(workflow, nodeId, context);
          const result = await handler(node.config || {}, inputs, context);
          context.nodeResults.set(nodeId, result);
          context.data = { ...context.data, [nodeId]: result };
          this.emit('node:complete', { executionId, nodeId, result });
        } catch (err) {
          context.errors.push({ node: nodeId, error: err.message });
          this.emit('node:error', { executionId, nodeId, error: err.message });
          if (node.stopOnError !== false) break;
        }
      }

      context.endTime = Date.now();
      context.duration = context.endTime - context.startTime;
      context.success = context.errors.length === 0;

      this.emit('workflow:complete', context);
      return context;
    } finally {
      this.running.delete(executionId);
    }
  }

  /**
   * Topological sort for execution order
   */
  _topologicalSort(workflow) {
    const visited = new Set();
    const order = [];
    const graph = new Map();

    // Build adjacency list
    for (const node of workflow.nodes) {
      graph.set(node.id, []);
    }
    for (const conn of workflow.connections) {
      const deps = graph.get(conn.target) || [];
      deps.push(conn.source);
      graph.set(conn.target, deps);
    }

    const visit = (nodeId) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      for (const dep of graph.get(nodeId) || []) {
        visit(dep);
      }
      order.push(nodeId);
    };

    for (const node of workflow.nodes) {
      visit(node.id);
    }

    return order;
  }

  /**
   * Get inputs for a node from connected nodes
   */
  _getNodeInputs(workflow, nodeId, context) {
    const inputs = {};
    for (const conn of workflow.connections) {
      if (conn.target === nodeId) {
        inputs[conn.sourcePort || 'default'] = context.nodeResults.get(conn.source);
      }
    }
    return inputs;
  }

  /**
   * Register built-in nodes
   */
  registerBuiltins() {
    // HTTP Request node
    this.registerNode('http', async (config, inputs) => {
      const response = await fetch(config.url, {
        method: config.method || 'GET',
        headers: config.headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: AbortSignal.timeout(config.timeout || 30000)
      });
      return response.json();
    });

    // Transform node
    this.registerNode('transform', async (config, inputs) => {
      const fn = new Function('data', 'inputs', config.code);
      return fn(inputs.default, inputs);
    });

    // Filter node
    this.registerNode('filter', async (config, inputs) => {
      const fn = new Function('item', config.condition);
      return Array.isArray(inputs.default)
        ? inputs.default.filter(fn)
        : fn(inputs.default) ? inputs.default : null;
    });

    // Merge node
    this.registerNode('merge', async (config, inputs) => {
      return Object.values(inputs).reduce((acc, val) => ({ ...acc, ...val }), {});
    });

    // Database query node
    this.registerNode('database', async (config, inputs, context) => {
      if (!context.db) throw new Error('Database not available in context');
      return context.db.query(config.query, config.params);
    });

    // Webhook trigger node
    this.registerNode('webhook', async (config, inputs) => {
      return inputs.default || config.defaultData;
    });

    // Schedule trigger node
    this.registerNode('schedule', async (config, inputs) => {
      return { triggered: true, time: new Date().toISOString(), schedule: config.cron };
    });

    return this;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Self-Destructing Messages (PrivNote-style)
// Inspired by: https://privnote.com/
// ═══════════════════════════════════════════════════════════════════════════

export class SecureNotes {
  constructor(options = {}) {
    this.store = options.store || new Map();
    this.algorithm = 'aes-256-gcm';
    this.defaultTTL = options.defaultTTL || 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Create a self-destructing note
   */
  create(content, options = {}) {
    const id = randomBytes(16).toString('hex');
    const key = randomBytes(32);
    const iv = randomBytes(16);

    // Encrypt content
    const cipher = createCipheriv(this.algorithm, key, iv);
    let encrypted = cipher.update(content, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    const note = {
      id,
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      createdAt: Date.now(),
      expiresAt: Date.now() + (options.ttl || this.defaultTTL),
      maxViews: options.maxViews || 1,
      views: 0,
      destroyOnView: options.destroyOnView !== false,
      password: options.password ? this._hashPassword(options.password) : null
    };

    this.store.set(id, note);

    // Return ID and key separately (key should be in URL fragment)
    return {
      id,
      key: key.toString('hex'),
      url: `#note/${id}#${key.toString('hex')}`,
      expiresAt: new Date(note.expiresAt).toISOString()
    };
  }

  /**
   * Read and optionally destroy a note
   */
  read(id, key, password = null) {
    const note = this.store.get(id);

    if (!note) {
      return { error: 'Note not found or already destroyed' };
    }

    // Check expiration
    if (Date.now() > note.expiresAt) {
      this.store.delete(id);
      return { error: 'Note has expired' };
    }

    // Check password
    if (note.password && !this._verifyPassword(password, note.password)) {
      return { error: 'Invalid password' };
    }

    // Check view limit
    if (note.views >= note.maxViews) {
      this.store.delete(id);
      return { error: 'Note view limit reached' };
    }

    try {
      // Decrypt content
      const decipher = createDecipheriv(
        this.algorithm,
        Buffer.from(key, 'hex'),
        Buffer.from(note.iv, 'hex')
      );
      decipher.setAuthTag(Buffer.from(note.authTag, 'hex'));
      let decrypted = decipher.update(note.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      // Increment views
      note.views++;

      // Destroy if configured
      if (note.destroyOnView && note.views >= note.maxViews) {
        this.store.delete(id);
      }

      return {
        content: decrypted,
        destroyed: note.views >= note.maxViews,
        viewsRemaining: note.maxViews - note.views
      };
    } catch (err) {
      return { error: 'Decryption failed - invalid key' };
    }
  }

  /**
   * Hash password
   */
  _hashPassword(password) {
    return createHash('sha256').update(password).digest('hex');
  }

  /**
   * Verify password
   */
  _verifyPassword(password, hash) {
    if (!password) return false;
    return this._hashPassword(password) === hash;
  }

  /**
   * Cleanup expired notes
   */
  cleanup() {
    const now = Date.now();
    let deleted = 0;
    for (const [id, note] of this.store) {
      if (now > note.expiresAt) {
        this.store.delete(id);
        deleted++;
      }
    }
    return deleted;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Security Camera / Monitoring Integration
// Inspired by: Frigate, ZoneMinder, go2rtc
// ═══════════════════════════════════════════════════════════════════════════

export class SecurityMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.cameras = new Map();
    this.alerts = [];
    this.recordings = new Map();
    this.motionThreshold = options.motionThreshold || 0.05;
    this.retentionDays = options.retentionDays || 30;
  }

  /**
   * Register a camera
   */
  addCamera(id, config) {
    const camera = {
      id,
      name: config.name || id,
      url: config.url,
      type: config.type || 'rtsp', // rtsp, http, onvif
      enabled: config.enabled !== false,
      motionDetection: config.motionDetection !== false,
      recording: config.recording || 'motion', // 'continuous', 'motion', 'off'
      zones: config.zones || [],
      lastFrame: null,
      lastMotion: null,
      status: 'disconnected'
    };
    this.cameras.set(id, camera);
    this.emit('camera:added', camera);
    return camera;
  }

  /**
   * Process a frame (motion detection)
   */
  async processFrame(cameraId, frameData) {
    const camera = this.cameras.get(cameraId);
    if (!camera || !camera.enabled) return null;

    const now = Date.now();
    const result = {
      cameraId,
      timestamp: now,
      motion: false,
      motionScore: 0,
      zones: []
    };

    if (camera.motionDetection && camera.lastFrame) {
      // Simple motion detection via frame difference
      const diff = this._calculateFrameDiff(camera.lastFrame, frameData);
      result.motionScore = diff;
      result.motion = diff > this.motionThreshold;

      if (result.motion) {
        camera.lastMotion = now;
        this.emit('motion:detected', {
          cameraId,
          score: diff,
          timestamp: now
        });

        // Create alert
        this._createAlert(cameraId, 'motion', {
          score: diff,
          zones: result.zones
        });
      }
    }

    camera.lastFrame = frameData;
    camera.status = 'connected';

    return result;
  }

  /**
   * Calculate frame difference (simplified)
   */
  _calculateFrameDiff(frame1, frame2) {
    // In real implementation, use actual image processing
    // This is a placeholder that returns random motion for demo
    if (!frame1 || !frame2) return 0;
    if (typeof frame1 === 'string' && typeof frame2 === 'string') {
      // Simple string hash comparison for demo
      const hash1 = createHash('md5').update(frame1).digest('hex');
      const hash2 = createHash('md5').update(frame2).digest('hex');
      let diff = 0;
      for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] !== hash2[i]) diff++;
      }
      return diff / hash1.length;
    }
    return Math.random() * 0.1; // Demo value
  }

  /**
   * Create an alert
   */
  _createAlert(cameraId, type, data) {
    const alert = {
      id: `alert_${Date.now()}_${randomBytes(4).toString('hex')}`,
      cameraId,
      type,
      data,
      timestamp: Date.now(),
      acknowledged: false
    };
    this.alerts.push(alert);

    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }

    this.emit('alert', alert);
    return alert;
  }

  /**
   * Get camera status
   */
  getStatus() {
    const cameras = [];
    for (const [id, camera] of this.cameras) {
      cameras.push({
        id,
        name: camera.name,
        status: camera.status,
        motionDetection: camera.motionDetection,
        lastMotion: camera.lastMotion,
        recording: camera.recording
      });
    }
    return {
      cameras,
      alerts: this.alerts.slice(-50),
      totalAlerts: this.alerts.length
    };
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = Date.now();
      this.emit('alert:acknowledged', alert);
    }
    return alert;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Malware Scanning Interface (YARA-style)
// Inspired by: https://virustotal.github.io/yara/
// ═══════════════════════════════════════════════════════════════════════════

export class ThreatScanner {
  constructor() {
    this.rules = new Map();
    this.signatures = new Map();
    this.scanHistory = [];
  }

  /**
   * Add a detection rule
   */
  addRule(name, rule) {
    this.rules.set(name, {
      name,
      description: rule.description || '',
      severity: rule.severity || 'medium',
      patterns: rule.patterns || [],
      conditions: rule.conditions || [],
      metadata: rule.metadata || {}
    });
    return this;
  }

  /**
   * Add a signature
   */
  addSignature(name, signature) {
    this.signatures.set(name, {
      name,
      type: signature.type || 'hash', // 'hash', 'pattern', 'behavior'
      value: signature.value,
      severity: signature.severity || 'high',
      description: signature.description || ''
    });
    return this;
  }

  /**
   * Scan content
   */
  scan(content, options = {}) {
    const startTime = Date.now();
    const matches = [];
    const contentStr = typeof content === 'string' ? content : content.toString();
    const contentHash = createHash('sha256').update(contentStr).digest('hex');

    // Check signatures
    for (const [name, sig] of this.signatures) {
      if (sig.type === 'hash') {
        if (contentHash === sig.value ||
            createHash('md5').update(contentStr).digest('hex') === sig.value) {
          matches.push({
            type: 'signature',
            name,
            severity: sig.severity,
            description: sig.description
          });
        }
      } else if (sig.type === 'pattern') {
        const regex = new RegExp(sig.value, 'gi');
        if (regex.test(contentStr)) {
          matches.push({
            type: 'signature',
            name,
            severity: sig.severity,
            description: sig.description
          });
        }
      }
    }

    // Check rules
    for (const [name, rule] of this.rules) {
      let matched = false;
      const patternMatches = [];

      for (const pattern of rule.patterns) {
        const regex = new RegExp(pattern, 'gi');
        const found = contentStr.match(regex);
        if (found) {
          patternMatches.push({ pattern, count: found.length });
          matched = true;
        }
      }

      // Evaluate conditions
      if (matched && rule.conditions.length > 0) {
        matched = this._evaluateConditions(rule.conditions, patternMatches, contentStr);
      }

      if (matched) {
        matches.push({
          type: 'rule',
          name,
          severity: rule.severity,
          description: rule.description,
          patterns: patternMatches
        });
      }
    }

    const result = {
      scanned: true,
      hash: contentHash,
      size: contentStr.length,
      matches,
      threatLevel: this._calculateThreatLevel(matches),
      scanTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };

    this.scanHistory.push(result);
    if (this.scanHistory.length > 100) {
      this.scanHistory = this.scanHistory.slice(-100);
    }

    return result;
  }

  /**
   * Evaluate rule conditions
   */
  _evaluateConditions(conditions, patternMatches, content) {
    for (const condition of conditions) {
      if (condition.type === 'count') {
        const totalMatches = patternMatches.reduce((sum, p) => sum + p.count, 0);
        if (totalMatches < (condition.min || 0)) return false;
        if (condition.max && totalMatches > condition.max) return false;
      } else if (condition.type === 'size') {
        if (condition.min && content.length < condition.min) return false;
        if (condition.max && content.length > condition.max) return false;
      }
    }
    return true;
  }

  /**
   * Calculate threat level
   */
  _calculateThreatLevel(matches) {
    if (matches.length === 0) return 'clean';
    const severities = { critical: 4, high: 3, medium: 2, low: 1 };
    const maxSeverity = Math.max(...matches.map(m => severities[m.severity] || 1));
    if (maxSeverity >= 4) return 'critical';
    if (maxSeverity >= 3) return 'high';
    if (maxSeverity >= 2) return 'medium';
    return 'low';
  }

  /**
   * Load common threat signatures
   */
  loadDefaults() {
    // Common malicious patterns
    this.addRule('suspicious_script', {
      description: 'Suspicious script patterns detected',
      severity: 'medium',
      patterns: [
        'eval\\s*\\(',
        'document\\.write\\s*\\(',
        'unescape\\s*\\(',
        'fromCharCode',
        'atob\\s*\\('
      ],
      conditions: [{ type: 'count', min: 2 }]
    });

    this.addRule('data_exfil', {
      description: 'Potential data exfiltration patterns',
      severity: 'high',
      patterns: [
        'navigator\\.sendBeacon',
        'fetch\\s*\\(["\']https?:\\/\\/[^"\']+["\'\\)]',
        'XMLHttpRequest'
      ]
    });

    this.addRule('credential_harvest', {
      description: 'Potential credential harvesting',
      severity: 'critical',
      patterns: [
        'password[\\s:=]',
        'credit.?card',
        'ssn[\\s:=]',
        'social.?security'
      ],
      conditions: [{ type: 'count', min: 1 }]
    });

    this.addRule('shell_commands', {
      description: 'Shell command execution patterns',
      severity: 'high',
      patterns: [
        'exec\\s*\\(',
        'system\\s*\\(',
        'spawn\\s*\\(',
        '\\$\\(.*\\)',
        'subprocess'
      ]
    });

    return this;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Process Manager (PM2-style)
// Inspired by: https://pm2.keymetrics.io/
// ═══════════════════════════════════════════════════════════════════════════

export class ProcessManager extends EventEmitter {
  constructor() {
    super();
    this.processes = new Map();
    this.logs = new Map();
  }

  /**
   * Register a process
   */
  register(id, config) {
    const proc = {
      id,
      name: config.name || id,
      script: config.script,
      args: config.args || [],
      cwd: config.cwd || process.cwd(),
      env: config.env || {},
      instances: config.instances || 1,
      maxRestarts: config.maxRestarts || 10,
      restartDelay: config.restartDelay || 1000,
      status: 'stopped',
      restarts: 0,
      uptime: 0,
      startTime: null,
      pid: null,
      memory: 0,
      cpu: 0
    };
    this.processes.set(id, proc);
    this.logs.set(id, []);
    return proc;
  }

  /**
   * Start a process (simulated for demo)
   */
  async start(id) {
    const proc = this.processes.get(id);
    if (!proc) throw new Error(`Process ${id} not found`);

    proc.status = 'online';
    proc.startTime = Date.now();
    proc.pid = process.pid + Math.floor(Math.random() * 1000);

    this.emit('process:start', proc);
    this._log(id, 'info', `Process started with PID ${proc.pid}`);

    return proc;
  }

  /**
   * Stop a process
   */
  async stop(id) {
    const proc = this.processes.get(id);
    if (!proc) throw new Error(`Process ${id} not found`);

    proc.status = 'stopped';
    proc.uptime = proc.startTime ? Date.now() - proc.startTime : 0;
    proc.startTime = null;
    proc.pid = null;

    this.emit('process:stop', proc);
    this._log(id, 'info', 'Process stopped');

    return proc;
  }

  /**
   * Restart a process
   */
  async restart(id) {
    await this.stop(id);
    await new Promise(r => setTimeout(r, 100));
    const proc = await this.start(id);
    proc.restarts++;
    this.emit('process:restart', proc);
    return proc;
  }

  /**
   * Get process status
   */
  list() {
    const result = [];
    for (const [id, proc] of this.processes) {
      result.push({
        id,
        name: proc.name,
        status: proc.status,
        pid: proc.pid,
        uptime: proc.startTime ? Date.now() - proc.startTime : 0,
        restarts: proc.restarts,
        memory: proc.memory,
        cpu: proc.cpu
      });
    }
    return result;
  }

  /**
   * Log a message
   */
  _log(id, level, message) {
    const logs = this.logs.get(id) || [];
    logs.push({
      timestamp: new Date().toISOString(),
      level,
      message
    });
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000);
    }
    this.logs.set(id, logs);
  }

  /**
   * Get logs
   */
  getLogs(id, limit = 100) {
    const logs = this.logs.get(id) || [];
    return logs.slice(-limit);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Dashboard Metrics (Grafana/Beszel-style)
// Inspired by: https://grafana.com/ and https://beszel.dev/
// ═══════════════════════════════════════════════════════════════════════════

export class MetricsDashboard extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.panels = new Map();
    this.alerts = [];
    this.retention = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Record a metric
   */
  record(name, value, tags = {}) {
    const key = this._metricKey(name, tags);
    const series = this.metrics.get(key) || [];

    series.push({
      timestamp: Date.now(),
      value,
      tags
    });

    // Cleanup old data
    const cutoff = Date.now() - this.retention;
    const filtered = series.filter(p => p.timestamp > cutoff);
    this.metrics.set(key, filtered);

    this.emit('metric', { name, value, tags });
    return this;
  }

  /**
   * Query metrics
   */
  query(name, options = {}) {
    const results = [];
    const start = options.start || Date.now() - 3600000; // Last hour
    const end = options.end || Date.now();

    for (const [key, series] of this.metrics) {
      if (!key.startsWith(name)) continue;

      const points = series.filter(p =>
        p.timestamp >= start && p.timestamp <= end
      );

      if (points.length > 0) {
        results.push({
          key,
          points,
          stats: this._calculateStats(points)
        });
      }
    }

    return results;
  }

  /**
   * Calculate statistics
   */
  _calculateStats(points) {
    if (points.length === 0) return null;
    const values = points.map(p => p.value);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      last: values[values.length - 1],
      count: values.length
    };
  }

  /**
   * Create metric key
   */
  _metricKey(name, tags) {
    const tagStr = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return tagStr ? `${name}{${tagStr}}` : name;
  }

  /**
   * Create a dashboard panel
   */
  createPanel(id, config) {
    this.panels.set(id, {
      id,
      title: config.title || id,
      type: config.type || 'timeseries', // 'timeseries', 'gauge', 'stat', 'table'
      metrics: config.metrics || [],
      thresholds: config.thresholds || [],
      refreshInterval: config.refreshInterval || 30000
    });
    return this.panels.get(id);
  }

  /**
   * Get dashboard data
   */
  getDashboard() {
    const panels = [];
    for (const [id, panel] of this.panels) {
      const data = [];
      for (const metric of panel.metrics) {
        const results = this.query(metric.name, metric.options);
        data.push({ metric: metric.name, results });
      }
      panels.push({ ...panel, data });
    }
    return { panels, alerts: this.alerts.slice(-20) };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Export All Integrations
// ═══════════════════════════════════════════════════════════════════════════

export default {
  VectorStore,
  WorkflowEngine,
  SecureNotes,
  SecurityMonitor,
  ThreatScanner,
  ProcessManager,
  MetricsDashboard
};

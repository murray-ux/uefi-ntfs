/**
 * GENESIS PostgreSQL Advanced Client
 * Cutting-edge database operations with vector embeddings,
 * event sourcing, and temporal queries
 *
 * GENESIS 2.0 — Forbidden Ninja City
 */

import { createHash, randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';

// ═══════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG = {
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || 'genesis',
  user: process.env.PGUSER || 'genesis',
  password: process.env.PGPASSWORD,
  ssl: process.env.PGSSLMODE === 'require',
  poolSize: 10,
  idleTimeout: 30000,

  // Embedding configuration
  embeddingProvider: process.env.EMBEDDING_PROVIDER || 'openai',
  embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-ada-002',
  embeddingDimensions: 1536,

  // API keys for embeddings
  openaiKey: process.env.OPENAI_API_KEY,
  anthropicKey: process.env.ANTHROPIC_API_KEY
};

// ═══════════════════════════════════════════════════════════════════════════
// Embedding Provider Interface
// ═══════════════════════════════════════════════════════════════════════════

class EmbeddingProvider {
  constructor(config) {
    this.config = config;
  }

  /**
   * Generate embedding vector for text
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} Embedding vector
   */
  async embed(text) {
    switch (this.config.embeddingProvider) {
      case 'openai':
        return this.embedOpenAI(text);
      case 'local':
        return this.embedLocal(text);
      default:
        return this.embedFallback(text);
    }
  }

  async embedOpenAI(text) {
    if (!this.config.openaiKey) {
      return this.embedFallback(text);
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.openaiKey}`
        },
        body: JSON.stringify({
          model: this.config.embeddingModel,
          input: text.substring(0, 8000) // Token limit
        }),
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (err) {
      console.warn(`[Embedding] OpenAI failed: ${err.message}, using fallback`);
      return this.embedFallback(text);
    }
  }

  async embedLocal(text) {
    // Placeholder for local embedding model (e.g., sentence-transformers)
    // Would typically call a local API endpoint
    return this.embedFallback(text);
  }

  /**
   * Fallback: Generate deterministic pseudo-embedding from text hash
   * Not semantically meaningful but ensures consistency
   */
  embedFallback(text) {
    const hash = createHash('sha512').update(text).digest();
    const embedding = new Array(this.config.embeddingDimensions);

    for (let i = 0; i < embedding.length; i++) {
      // Use hash bytes to generate normalized floats
      const byteIndex = i % hash.length;
      embedding[i] = (hash[byteIndex] / 255) * 2 - 1; // Range [-1, 1]
    }

    return embedding;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(a, b) {
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
}

// ═══════════════════════════════════════════════════════════════════════════
// Event Sourcing
// ═══════════════════════════════════════════════════════════════════════════

class EventStore extends EventEmitter {
  constructor(db) {
    super();
    this.db = db;
    this.projections = new Map();
  }

  /**
   * Append event to stream
   */
  async appendEvent(streamId, streamType, eventType, payload, metadata = {}) {
    const event = {
      id: randomUUID(),
      streamId,
      streamType,
      eventType,
      payload,
      actorId: metadata.actorId,
      correlationId: metadata.correlationId,
      causationId: metadata.causationId,
      occurredAt: new Date().toISOString()
    };

    // Store event
    const result = await this.db.query(`
      SELECT append_event($1, $2, $3, $4, $5, $6, $7) AS event_id
    `, [
      streamId, streamType, eventType,
      JSON.stringify(payload),
      metadata.actorId, metadata.correlationId, metadata.causationId
    ]);

    event.id = result.rows[0].event_id;

    // Emit for subscribers
    this.emit('event', event);
    this.emit(`event:${eventType}`, event);

    // Update projections
    await this.updateProjections(event);

    return event;
  }

  /**
   * Get events for a stream
   */
  async getStream(streamId, fromVersion = 0) {
    const result = await this.db.query(`
      SELECT * FROM get_event_stream($1, $2)
    `, [streamId, fromVersion]);

    return result.rows;
  }

  /**
   * Replay events to rebuild state
   */
  async replay(streamId, reducer, initialState = {}) {
    const events = await this.getStream(streamId);
    return events.reduce((state, event) => {
      return reducer(state, event);
    }, initialState);
  }

  /**
   * Register a projection
   */
  registerProjection(name, eventTypes, handler) {
    this.projections.set(name, { eventTypes, handler });
  }

  /**
   * Update all relevant projections
   */
  async updateProjections(event) {
    for (const [name, projection] of this.projections) {
      if (projection.eventTypes.includes(event.eventType) ||
          projection.eventTypes.includes('*')) {
        try {
          await projection.handler(event);
        } catch (err) {
          console.error(`[EventStore] Projection ${name} failed:`, err.message);
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Temporal Queries
// ═══════════════════════════════════════════════════════════════════════════

class TemporalQueries {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get evidence as it existed at a specific point in time
   */
  async getEvidenceAsOf(evidenceId, asOf) {
    const result = await this.db.query(`
      SELECT * FROM get_evidence_as_of($1, $2)
    `, [evidenceId, asOf]);

    return result.rows[0] || null;
  }

  /**
   * Get complete history of an evidence item
   */
  async getEvidenceHistory(evidenceId) {
    const result = await this.db.query(`
      SELECT * FROM get_evidence_history($1)
    `, [evidenceId]);

    return result.rows;
  }

  /**
   * Time-travel query: get all evidence at a point in time
   */
  async getAllEvidenceAsOf(asOf, caseReference = null) {
    let query = `
      SELECT * FROM evidence
      WHERE valid_from <= $1 AND valid_to > $1
    `;
    const params = [asOf];

    if (caseReference) {
      query += ` AND case_reference = $2`;
      params.push(caseReference);
    }

    const result = await this.db.query(query, params);
    return result.rows;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Ledger Operations
// ═══════════════════════════════════════════════════════════════════════════

class LedgerOperations {
  constructor(db) {
    this.db = db;
  }

  /**
   * Append entry to ledger
   */
  async append(entryType, entryData, signedBy = null, signature = null) {
    const result = await this.db.query(`
      SELECT append_to_ledger($1, $2, $3, $4) AS sequence_id
    `, [entryType, JSON.stringify(entryData), signedBy, signature]);

    return result.rows[0].sequence_id;
  }

  /**
   * Verify ledger integrity
   */
  async verifyIntegrity() {
    const result = await this.db.query(`
      SELECT * FROM verify_ledger_integrity()
    `);

    const issues = result.rows.filter(r => !r.is_valid);

    return {
      valid: issues.length === 0,
      totalEntries: result.rows.length,
      issues
    };
  }

  /**
   * Get ledger entries by type
   */
  async getByType(entryType, limit = 100) {
    const result = await this.db.query(`
      SELECT * FROM ledger
      WHERE entry_type = $1
      ORDER BY sequence_id DESC
      LIMIT $2
    `, [entryType, limit]);

    return result.rows;
  }

  /**
   * Get recent ledger entries
   */
  async getRecent(limit = 50) {
    const result = await this.db.query(`
      SELECT * FROM ledger
      ORDER BY sequence_id DESC
      LIMIT $1
    `, [limit]);

    return result.rows;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Vector Search
// ═══════════════════════════════════════════════════════════════════════════

class VectorSearch {
  constructor(db, embeddingProvider) {
    this.db = db;
    this.embedder = embeddingProvider;
  }

  /**
   * Find similar evidence by text
   */
  async findSimilar(text, options = {}) {
    const {
      limit = 10,
      threshold = 0.7,
      caseReference = null
    } = options;

    // Generate embedding
    const embedding = await this.embedder.embed(text);

    // Search
    let query = `
      SELECT * FROM find_similar_evidence($1::vector, $2, $3)
    `;
    const params = [`[${embedding.join(',')}]`, limit, threshold];

    if (caseReference) {
      query = `
        SELECT e.id AS evidence_id, e.evidence_id AS evidence_code,
               e.title, 1 - (e.embedding <=> $1::vector) AS similarity
        FROM evidence e
        WHERE e.case_reference = $4
          AND e.embedding IS NOT NULL
          AND e.valid_to = 'infinity'
          AND 1 - (e.embedding <=> $1::vector) >= $3
        ORDER BY e.embedding <=> $1::vector
        LIMIT $2
      `;
      params.push(caseReference);
    }

    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Hybrid search (FTS + vector)
   */
  async hybridSearch(query, options = {}) {
    const { limit = 20, includeEmbedding = true } = options;

    let embedding = null;
    if (includeEmbedding) {
      embedding = await this.embedder.embed(query);
    }

    const result = await this.db.query(`
      SELECT * FROM search_evidence_hybrid($1, $2::vector, $3)
    `, [
      query,
      embedding ? `[${embedding.join(',')}]` : null,
      limit
    ]);

    return result.rows;
  }

  /**
   * Update embedding for evidence
   */
  async updateEmbedding(evidenceId, text) {
    const embedding = await this.embedder.embed(text);

    await this.db.query(`
      UPDATE evidence
      SET embedding = $2::vector, updated_at = NOW()
      WHERE id = $1
    `, [evidenceId, `[${embedding.join(',')}]`]);

    return embedding;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Graph Operations
// ═══════════════════════════════════════════════════════════════════════════

class GraphOperations {
  constructor(db) {
    this.db = db;
  }

  /**
   * Add relationship between evidence
   */
  async addRelationship(sourceId, targetId, relationshipType, metadata = {}) {
    const result = await this.db.query(`
      INSERT INTO evidence_relationships (source_id, target_id, relationship_type, strength, metadata)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (source_id, target_id, relationship_type)
      DO UPDATE SET strength = $4, metadata = $5
      RETURNING id
    `, [sourceId, targetId, relationshipType, metadata.strength || 1.0, JSON.stringify(metadata)]);

    return result.rows[0].id;
  }

  /**
   * Find related evidence (graph traversal)
   */
  async findRelated(evidenceId, maxDepth = 3) {
    const result = await this.db.query(`
      SELECT * FROM find_related_evidence($1, $2)
    `, [evidenceId, maxDepth]);

    return result.rows;
  }

  /**
   * Get relationship graph for visualization
   */
  async getGraph(caseReference) {
    const nodes = await this.db.query(`
      SELECT id, evidence_id AS label, category, severity
      FROM evidence
      WHERE case_reference = $1 AND valid_to = 'infinity'
    `, [caseReference]);

    const edges = await this.db.query(`
      SELECT er.source_id, er.target_id, er.relationship_type, er.strength
      FROM evidence_relationships er
      JOIN evidence e1 ON e1.id = er.source_id
      JOIN evidence e2 ON e2.id = er.target_id
      WHERE e1.case_reference = $1 AND e2.case_reference = $1
    `, [caseReference]);

    return {
      nodes: nodes.rows,
      edges: edges.rows
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Client
// ═══════════════════════════════════════════════════════════════════════════

export class GenesisPostgres extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.pool = null;
    this.connected = false;

    // Initialize sub-modules
    this.embedder = new EmbeddingProvider(this.config);
  }

  /**
   * Connect to database
   */
  async connect() {
    if (this.connected) return;

    try {
      // Dynamic import of pg
      const pg = await import('pg');
      const { Pool } = pg.default || pg;

      this.pool = new Pool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        ssl: this.config.ssl,
        max: this.config.poolSize,
        idleTimeoutMillis: this.config.idleTimeout
      });

      // Test connection
      const client = await this.pool.connect();
      client.release();

      // Initialize sub-modules with database
      this.events = new EventStore(this);
      this.temporal = new TemporalQueries(this);
      this.ledger = new LedgerOperations(this);
      this.vector = new VectorSearch(this, this.embedder);
      this.graph = new GraphOperations(this);

      this.connected = true;
      this.emit('connected');

      console.log(`[GenesisDB] Connected to ${this.config.host}:${this.config.port}/${this.config.database}`);
    } catch (err) {
      console.error('[GenesisDB] Connection failed:', err.message);
      throw err;
    }
  }

  /**
   * Execute query
   */
  async query(text, params = []) {
    if (!this.connected) {
      await this.connect();
    }

    const start = Date.now();
    const result = await this.pool.query(text, params);
    const duration = Date.now() - start;

    this.emit('query', { text, params, duration, rows: result.rowCount });

    return result;
  }

  /**
   * Execute transaction
   */
  async transaction(callback) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Close connection
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.connected = false;
      this.emit('disconnected');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Evidence Operations
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Store evidence with embedding
   */
  async storeEvidence(evidence) {
    const {
      evidenceId,
      caseReference,
      title,
      category,
      severity,
      description,
      sourceDevice,
      sourceLocation,
      discoveredBy,
      discoveredAt,
      metadata = {},
      tags = []
    } = evidence;

    // Calculate content hash
    const contentHash = createHash('sha256')
      .update(JSON.stringify(evidence))
      .digest('hex');

    // Generate embedding from title + description
    const embeddingText = `${title} ${description || ''}`;
    const embedding = await this.embedder.embed(embeddingText);

    // Store with event
    return this.transaction(async (client) => {
      // Insert evidence
      const result = await client.query(`
        INSERT INTO evidence (
          evidence_id, case_reference, title, category, severity,
          description, source_device, source_location, discovered_by,
          discovered_at, content_hash, embedding, metadata, tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::vector, $13, $14)
        RETURNING id
      `, [
        evidenceId, caseReference, title, category, severity,
        description, sourceDevice, sourceLocation, discoveredBy,
        discoveredAt, contentHash, `[${embedding.join(',')}]`,
        JSON.stringify(metadata), tags
      ]);

      const id = result.rows[0].id;

      // Record event
      await this.events.appendEvent(
        id.toString(),
        'evidence',
        'EvidenceCreated',
        { evidenceId, title, category, severity }
      );

      // Record chain of custody
      await client.query(`
        INSERT INTO chain_of_custody (evidence_id, custodian_name, action, notes)
        VALUES ($1, $2, 'created', 'Initial documentation')
      `, [id, discoveredBy]);

      return { id, contentHash };
    });
  }

  /**
   * Update evidence (creates new version)
   */
  async updateEvidence(evidenceId, updates) {
    return this.transaction(async (client) => {
      // Get current version
      const current = await client.query(`
        SELECT * FROM evidence WHERE evidence_id = $1 AND valid_to = 'infinity'
      `, [evidenceId]);

      if (current.rows.length === 0) {
        throw new Error(`Evidence not found: ${evidenceId}`);
      }

      const old = current.rows[0];

      // Close old version
      await client.query(`
        UPDATE evidence SET valid_to = NOW() WHERE id = $1
      `, [old.id]);

      // Create new version
      const merged = { ...old, ...updates };
      const contentHash = createHash('sha256')
        .update(JSON.stringify(merged))
        .digest('hex');

      // Regenerate embedding if content changed
      let embedding = old.embedding;
      if (updates.title || updates.description) {
        const text = `${merged.title} ${merged.description || ''}`;
        embedding = await this.embedder.embed(text);
      }

      const result = await client.query(`
        INSERT INTO evidence (
          evidence_id, case_reference, title, category, severity,
          description, source_device, source_location, discovered_by,
          discovered_at, content_hash, embedding, metadata, tags, version
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::vector, $13, $14, $15)
        RETURNING id
      `, [
        merged.evidence_id, merged.case_reference, merged.title,
        merged.category, merged.severity, merged.description,
        merged.source_device, merged.source_location, merged.discovered_by,
        merged.discovered_at, contentHash,
        Array.isArray(embedding) ? `[${embedding.join(',')}]` : embedding,
        JSON.stringify(merged.metadata), merged.tags,
        old.version + 1
      ]);

      // Record event
      await this.events.appendEvent(
        result.rows[0].id.toString(),
        'evidence',
        'EvidenceUpdated',
        { evidenceId, version: old.version + 1, changes: Object.keys(updates) }
      );

      return { id: result.rows[0].id, version: old.version + 1 };
    });
  }

  /**
   * Get evidence by ID
   */
  async getEvidence(evidenceId) {
    const result = await this.query(`
      SELECT * FROM evidence
      WHERE evidence_id = $1 AND valid_to = 'infinity'
    `, [evidenceId]);

    return result.rows[0] || null;
  }

  /**
   * Search evidence
   */
  async searchEvidence(query, options = {}) {
    return this.vector.hybridSearch(query, options);
  }

  /**
   * Get case statistics
   */
  async getCaseStats(caseReference) {
    const result = await this.query(`
      SELECT * FROM case_statistics WHERE case_reference = $1
    `, [caseReference]);

    return result.rows[0] || null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Health Check
  // ═══════════════════════════════════════════════════════════════════════════

  async healthCheck() {
    try {
      const result = await this.query('SELECT NOW() as time, version() as version');
      const ledgerIntegrity = await this.ledger.verifyIntegrity();

      return {
        connected: true,
        serverTime: result.rows[0].time,
        version: result.rows[0].version,
        ledgerIntegrity: ledgerIntegrity.valid,
        ledgerEntries: ledgerIntegrity.totalEntries
      };
    } catch (err) {
      return {
        connected: false,
        error: err.message
      };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════════════════════════════

export function createGenesisDB(config = {}) {
  return new GenesisPostgres(config);
}

// ═══════════════════════════════════════════════════════════════════════════
// Default Export
// ═══════════════════════════════════════════════════════════════════════════

export default GenesisPostgres;

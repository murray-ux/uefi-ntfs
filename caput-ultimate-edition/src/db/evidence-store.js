/**
 * Evidence Store - Persistent Evidence Database
 * File-based storage with optional PostgreSQL upgrade path
 *
 * Implements the EvidenceStore interface for LegalAutomation
 *
 * GENESIS 2.0 — Forbidden Ninja City
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';

// ═══════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG = {
  dataDir: process.env.EVIDENCE_DIR || './data/evidence',
  indexFile: 'index.json',
  chainFile: 'chain.jsonl',
  backupInterval: 3600000, // 1 hour
  maxItems: 10000
};

// ═══════════════════════════════════════════════════════════════════════════
// Evidence Entry Types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} EvidenceEntry
 * @property {number} id - Sequential ID
 * @property {string} uuid - Unique identifier
 * @property {string} subjectId - Case/subject reference
 * @property {string} docType - Document type
 * @property {string} docHash - SHA-256 hash (hex)
 * @property {string} sigEd25519 - Ed25519 signature (hex)
 * @property {string} publicKey - Public key (PEM)
 * @property {Object} meta - Metadata
 * @property {string} createdBy - Creator identifier
 * @property {string} createdAt - ISO timestamp
 * @property {string} chainHash - Hash linking to previous entry
 */

// ═══════════════════════════════════════════════════════════════════════════
// Evidence Store Class
// ═══════════════════════════════════════════════════════════════════════════

export class EvidenceStore extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.index = { entries: [], nextId: 1, lastHash: null };
    this.initialized = false;
  }

  /**
   * Initialize the store
   */
  async initialize() {
    if (this.initialized) return;

    // Create data directory
    if (!existsSync(this.config.dataDir)) {
      mkdirSync(this.config.dataDir, { recursive: true });
    }

    // Create subdirectories
    const dirs = ['items', 'attachments', 'backups'];
    for (const dir of dirs) {
      const path = join(this.config.dataDir, dir);
      if (!existsSync(path)) {
        mkdirSync(path, { recursive: true });
      }
    }

    // Load existing index
    await this.loadIndex();

    this.initialized = true;
    this.emit('initialized', { itemCount: this.index.entries.length });
  }

  /**
   * Load index from disk
   */
  async loadIndex() {
    const indexPath = join(this.config.dataDir, this.config.indexFile);

    if (existsSync(indexPath)) {
      try {
        const data = readFileSync(indexPath, 'utf-8');
        this.index = JSON.parse(data);
      } catch (err) {
        console.error('[EvidenceStore] Failed to load index, starting fresh:', err.message);
        this.index = { entries: [], nextId: 1, lastHash: null };
      }
    }
  }

  /**
   * Save index to disk
   */
  async saveIndex() {
    const indexPath = join(this.config.dataDir, this.config.indexFile);
    writeFileSync(indexPath, JSON.stringify(this.index, null, 2));
  }

  /**
   * Compute chain hash for integrity
   */
  computeChainHash(entry, previousHash) {
    const data = JSON.stringify({
      id: entry.id,
      uuid: entry.uuid,
      docHash: entry.docHash,
      createdAt: entry.createdAt,
      previousHash: previousHash || 'GENESIS'
    });
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Insert evidence entry (implements EvidenceStore interface)
   * @param {Object} entry - Evidence entry
   * @returns {Promise<number>} Evidence ID
   */
  async insertEvidence(entry) {
    await this.initialize();

    const id = this.index.nextId++;
    const uuid = randomUUID();
    const createdAt = new Date().toISOString();

    // Convert buffers to hex strings for storage
    const storedEntry = {
      id,
      uuid,
      subjectId: entry.subjectId,
      docType: entry.docType,
      docHash: Buffer.isBuffer(entry.docHash)
        ? entry.docHash.toString('hex')
        : entry.docHash,
      sigEd25519: Buffer.isBuffer(entry.sigEd25519)
        ? entry.sigEd25519.toString('hex')
        : entry.sigEd25519,
      publicKey: Buffer.isBuffer(entry.publicKey)
        ? entry.publicKey.toString('utf-8')
        : entry.publicKey,
      meta: entry.meta || {},
      createdBy: entry.createdBy || 'genesis',
      createdAt,
      chainHash: null
    };

    // Compute chain hash
    storedEntry.chainHash = this.computeChainHash(storedEntry, this.index.lastHash);
    this.index.lastHash = storedEntry.chainHash;

    // Add to index
    this.index.entries.push(storedEntry);

    // Save individual item file
    const itemPath = join(this.config.dataDir, 'items', `${uuid}.json`);
    writeFileSync(itemPath, JSON.stringify(storedEntry, null, 2));

    // Append to chain log
    const chainPath = join(this.config.dataDir, this.config.chainFile);
    const chainEntry = JSON.stringify({
      id,
      uuid,
      docHash: storedEntry.docHash,
      chainHash: storedEntry.chainHash,
      createdAt
    }) + '\n';
    const appendFlag = existsSync(chainPath) ? { flag: 'a' } : {};
    writeFileSync(chainPath, chainEntry, appendFlag);

    // Save updated index
    await this.saveIndex();

    this.emit('inserted', storedEntry);
    return id;
  }

  /**
   * Get evidence by ID
   * @param {number} id - Evidence ID
   * @returns {Promise<Object|null>} Evidence entry or null
   */
  async getById(id) {
    await this.initialize();
    return this.index.entries.find(e => e.id === id) || null;
  }

  /**
   * Get evidence by UUID
   * @param {string} uuid - Evidence UUID
   * @returns {Promise<Object|null>} Evidence entry or null
   */
  async getByUuid(uuid) {
    await this.initialize();
    return this.index.entries.find(e => e.uuid === uuid) || null;
  }

  /**
   * Get all evidence for a subject
   * @param {string} subjectId - Subject/case ID
   * @returns {Promise<Array>} List of evidence entries
   */
  async getBySubject(subjectId) {
    await this.initialize();
    return this.index.entries.filter(e => e.subjectId === subjectId);
  }

  /**
   * Get all evidence by doc type
   * @param {string} docType - Document type
   * @returns {Promise<Array>} List of evidence entries
   */
  async getByDocType(docType) {
    await this.initialize();
    return this.index.entries.filter(e => e.docType === docType);
  }

  /**
   * Search evidence by metadata
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Array>} Matching entries
   */
  async search(criteria) {
    await this.initialize();

    return this.index.entries.filter(entry => {
      for (const [key, value] of Object.entries(criteria)) {
        if (key === 'meta') {
          // Search within meta
          for (const [metaKey, metaValue] of Object.entries(value)) {
            if (entry.meta[metaKey] !== metaValue) return false;
          }
        } else if (entry[key] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Get recent evidence entries
   * @param {number} limit - Maximum entries
   * @returns {Promise<Array>} Recent entries
   */
  async getRecent(limit = 10) {
    await this.initialize();
    return this.index.entries.slice(-limit).reverse();
  }

  /**
   * Verify chain integrity
   * @returns {Promise<Object>} Verification result
   */
  async verifyChain() {
    await this.initialize();

    let previousHash = null;
    let valid = true;
    const errors = [];

    for (const entry of this.index.entries) {
      const expectedHash = this.computeChainHash(entry, previousHash);

      if (entry.chainHash !== expectedHash) {
        valid = false;
        errors.push({
          id: entry.id,
          uuid: entry.uuid,
          expected: expectedHash,
          actual: entry.chainHash
        });
      }

      previousHash = entry.chainHash;
    }

    return {
      valid,
      totalEntries: this.index.entries.length,
      errors
    };
  }

  /**
   * Get store statistics
   * @returns {Promise<Object>} Store statistics
   */
  async getStats() {
    await this.initialize();

    const docTypes = {};
    const subjects = {};

    for (const entry of this.index.entries) {
      docTypes[entry.docType] = (docTypes[entry.docType] || 0) + 1;
      subjects[entry.subjectId] = (subjects[entry.subjectId] || 0) + 1;
    }

    return {
      totalEntries: this.index.entries.length,
      lastId: this.index.nextId - 1,
      docTypes,
      subjects,
      chainIntact: (await this.verifyChain()).valid
    };
  }

  /**
   * Export all evidence as JSON
   * @returns {Promise<Object>} Exported data
   */
  async exportAll() {
    await this.initialize();

    return {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      entries: this.index.entries,
      chainIntegrity: await this.verifyChain()
    };
  }

  /**
   * Create backup
   * @returns {Promise<string>} Backup file path
   */
  async backup() {
    await this.initialize();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(this.config.dataDir, 'backups', `backup-${timestamp}.json`);

    const data = await this.exportAll();
    writeFileSync(backupPath, JSON.stringify(data, null, 2));

    this.emit('backup', { path: backupPath, entries: data.entries.length });
    return backupPath;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// In-Memory Store (for testing)
// ═══════════════════════════════════════════════════════════════════════════

export class InMemoryEvidenceStore extends EventEmitter {
  constructor() {
    super();
    this.entries = [];
    this.nextId = 1;
  }

  async insertEvidence(entry) {
    const id = this.nextId++;
    const storedEntry = {
      id,
      uuid: randomUUID(),
      ...entry,
      docHash: Buffer.isBuffer(entry.docHash) ? entry.docHash.toString('hex') : entry.docHash,
      sigEd25519: Buffer.isBuffer(entry.sigEd25519) ? entry.sigEd25519.toString('hex') : entry.sigEd25519,
      publicKey: Buffer.isBuffer(entry.publicKey) ? entry.publicKey.toString('utf-8') : entry.publicKey,
      createdAt: new Date().toISOString()
    };
    this.entries.push(storedEntry);
    return id;
  }

  async getById(id) {
    return this.entries.find(e => e.id === id) || null;
  }

  async getBySubject(subjectId) {
    return this.entries.filter(e => e.subjectId === subjectId);
  }

  async getRecent(limit = 10) {
    return this.entries.slice(-limit).reverse();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════════════════════════════

export function createEvidenceStore(config = {}) {
  if (config.inMemory) {
    return new InMemoryEvidenceStore();
  }
  return new EvidenceStore(config);
}

// ═══════════════════════════════════════════════════════════════════════════
// Default Export
// ═══════════════════════════════════════════════════════════════════════════

export default EvidenceStore;

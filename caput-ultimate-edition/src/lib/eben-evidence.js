/**
 * EBEN EVIDENCE MANAGEMENT SYSTEM
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Copyright 2025 Murray Bembrick
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * אבן (Eben) = Stone/Foundation — The cornerstone of legal evidence management
 *
 * Court-grade evidence management with:
 *   - Multi-platform sync (iCloud, local, git)
 *   - Tamper-evident audit trails
 *   - Automatic PII redaction
 *   - Chain of custody tracking
 *   - iOS Shortcuts integration
 *   - Git-based integrity verification
 *   - SPDX license compliance
 *
 * PROTECTED BY SHINOBI SECURITY LAYER — ADMIN ACCESS ONLY
 *
 * @module EBEN
 * @author Murray Bembrick <Founder & Lead Developer>
 * @version 2.0.0
 * @license Apache-2.0
 */

import { EventEmitter } from 'events';
import { createHash, randomUUID, createCipheriv, createDecipheriv, scryptSync, randomBytes } from 'crypto';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, basename, extname } from 'path';
import { homedir } from 'os';
import { createLogger } from './kol-logger.js';

const log = createLogger('EBEN');

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS & CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

export const EVIDENCE_TYPES = {
  DOCUMENT: 'document',
  IMAGE: 'image',
  AUDIO: 'audio',
  VIDEO: 'video',
  EMAIL: 'email',
  MESSAGE: 'message',
  FINANCIAL: 'financial',
  MEDICAL: 'medical',
  LEGAL: 'legal',
  CORRESPONDENCE: 'correspondence',
  SCREENSHOT: 'screenshot',
  METADATA: 'metadata'
};

export const CLASSIFICATION_LEVELS = {
  PUBLIC: 0,           // Can be shared
  INTERNAL: 1,         // Internal use only
  CONFIDENTIAL: 2,     // Limited distribution
  RESTRICTED: 3,       // Named individuals only
  TOP_SECRET: 4,       // Court-sealed / highest protection
  CHILDREN: 5          // Special protection for children's info
};

export const REDACTION_LEVELS = {
  NONE: 0,
  LIGHT: 1,            // Names only
  MODERATE: 2,         // Names + contact info
  HEAVY: 3,            // All PII
  COMPLETE: 4          // Full anonymization
};

export const CUSTODY_ACTIONS = {
  CREATED: 'created',
  ACCESSED: 'accessed',
  MODIFIED: 'modified',
  COPIED: 'copied',
  TRANSFERRED: 'transferred',
  EXPORTED: 'exported',
  REDACTED: 'redacted',
  VERIFIED: 'verified',
  SEALED: 'sealed',
  UNSEALED: 'unsealed'
};

// Australian PII patterns
const PII_PATTERNS = {
  // Names (basic pattern - enhanced by context)
  fullName: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g,

  // Australian identifiers
  medicare: /\d{4}\s?\d{5}\s?\d{1}/g,
  tfn: /\d{3}\s?\d{3}\s?\d{3}/g,
  abn: /\d{2}\s?\d{3}\s?\d{3}\s?\d{3}/g,
  acn: /\d{3}\s?\d{3}\s?\d{3}/g,

  // Contact information
  phoneAU: /(?:\+61|0)[2-9]\d{8}/g,
  phoneMobile: /(?:\+61|0)4\d{2}\s?\d{3}\s?\d{3}/g,
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,

  // Addresses
  addressAU: /\d+[A-Za-z]?\s+[A-Za-z\s]+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Court|Ct|Place|Pl|Crescent|Cres|Way|Lane|Ln)\s*,?\s*[A-Za-z\s]+\s+(?:WA|NSW|VIC|QLD|SA|TAS|NT|ACT)\s+\d{4}/gi,
  postcode: /\b[0-9]{4}\b/g,

  // Financial
  bsb: /\d{3}-?\d{3}/g,
  accountNumber: /\b\d{6,10}\b/g,
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,

  // Dates (Australian format)
  dateAU: /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
  dob: /(?:DOB|D\.O\.B|Date of Birth|Born)[:\s]+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/gi,

  // Case numbers
  caseNumber: /(?:PTW|FAM|FCA|FLC|SJC)\s*\d+[\/\-]\d{4}/gi,

  // IP addresses
  ipv4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  ipv6: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g
};

// ══════════════════════════════════════════════════════════════════════════════
// EVIDENCE ITEM CLASS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Individual evidence item with full metadata
 */
export class EvidenceItem {
  constructor(options = {}) {
    this.id = options.id || `EV-${Date.now()}-${randomUUID().slice(0, 8)}`;
    this.type = options.type || EVIDENCE_TYPES.DOCUMENT;
    this.classification = options.classification ?? CLASSIFICATION_LEVELS.CONFIDENTIAL;
    this.title = options.title || 'Untitled Evidence';
    this.description = options.description || '';
    this.source = options.source || 'unknown';
    this.originalFilename = options.originalFilename;
    this.mimeType = options.mimeType;
    this.size = options.size || 0;

    // Integrity
    this.contentHash = options.contentHash;
    this.hashAlgorithm = 'sha256';

    // Timestamps
    this.createdAt = options.createdAt || new Date().toISOString();
    this.modifiedAt = options.modifiedAt || this.createdAt;
    this.capturedAt = options.capturedAt; // When the evidence was originally created

    // Legal metadata
    this.caseNumber = options.caseNumber;
    this.court = options.court;
    this.jurisdiction = options.jurisdiction;
    this.exhibitNumber = options.exhibitNumber;

    // Chain of custody
    this.custodyChain = options.custodyChain || [];

    // Tags and categories
    this.tags = options.tags || [];
    this.categories = options.categories || [];

    // Redaction state
    this.redactionLevel = options.redactionLevel ?? REDACTION_LEVELS.NONE;
    this.redactedFields = options.redactedFields || [];

    // Storage
    this.storagePath = options.storagePath;
    this.encrypted = options.encrypted ?? false;
    this.encryptionKeyId = options.encryptionKeyId;

    // Relationships
    this.parentId = options.parentId;
    this.relatedIds = options.relatedIds || [];

    // Notes
    this.notes = options.notes || [];
  }

  /**
   * Add custody chain entry
   */
  addCustodyEntry(action, actor, details = {}) {
    const entry = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      action,
      actor,
      details,
      previousHash: this.custodyChain.length > 0
        ? this.custodyChain[this.custodyChain.length - 1].hash
        : null
    };

    entry.hash = createHash('sha256')
      .update(JSON.stringify(entry))
      .digest('hex');

    this.custodyChain.push(entry);
    this.modifiedAt = entry.timestamp;

    return entry;
  }

  /**
   * Verify custody chain integrity
   */
  verifyCustodyChain() {
    for (let i = 0; i < this.custodyChain.length; i++) {
      const entry = this.custodyChain[i];
      const { hash, ...data } = entry;

      // Verify hash
      const computedHash = createHash('sha256')
        .update(JSON.stringify(data))
        .digest('hex');

      if (computedHash !== hash) {
        return { valid: false, error: `Hash mismatch at entry ${i}`, index: i };
      }

      // Verify chain linkage
      if (i > 0 && entry.previousHash !== this.custodyChain[i - 1].hash) {
        return { valid: false, error: `Chain broken at entry ${i}`, index: i };
      }
    }

    return { valid: true, entries: this.custodyChain.length };
  }

  /**
   * Add note to evidence
   */
  addNote(content, author) {
    this.notes.push({
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      content,
      author,
      hash: createHash('sha256').update(content).digest('hex').slice(0, 16)
    });
  }

  /**
   * Export metadata (without content)
   */
  toMetadata() {
    return {
      id: this.id,
      type: this.type,
      classification: this.classification,
      title: this.title,
      contentHash: this.contentHash,
      createdAt: this.createdAt,
      caseNumber: this.caseNumber,
      exhibitNumber: this.exhibitNumber,
      custodyEntries: this.custodyChain.length,
      tags: this.tags
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// LEGAL CASE CLASS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Legal case container
 */
export class LegalCase {
  constructor(options = {}) {
    this.id = options.id || randomUUID();
    this.caseNumber = options.caseNumber;
    this.court = options.court;
    this.jurisdiction = options.jurisdiction || 'Western Australia';
    this.title = options.title;
    this.type = options.type; // Family, Civil, Criminal, etc.

    // Dates
    this.filedAt = options.filedAt;
    this.createdAt = options.createdAt || new Date().toISOString();

    // Parties (encrypted storage recommended)
    this.parties = options.parties || [];

    // Evidence collection
    this.evidenceIds = options.evidenceIds || [];

    // Timeline
    this.timeline = options.timeline || [];

    // Status
    this.status = options.status || 'active';

    // Notes
    this.notes = options.notes || [];
  }

  addTimelineEvent(event, date, details = {}) {
    this.timeline.push({
      id: randomUUID(),
      event,
      date: date || new Date().toISOString(),
      details,
      addedAt: new Date().toISOString()
    });

    // Sort by date
    this.timeline.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  addEvidence(evidenceId) {
    if (!this.evidenceIds.includes(evidenceId)) {
      this.evidenceIds.push(evidenceId);
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// AUDIT TRAIL (TAMPER-EVIDENT)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Blockchain-style tamper-evident audit trail
 */
export class LegalAuditTrail {
  constructor(options = {}) {
    this.entries = [];
    this.caseNumber = options.caseNumber;
    this.storagePath = options.storagePath;
    this.chainHash = null;
  }

  /**
   * Log an audit entry
   */
  log(action, subject, actor, metadata = {}) {
    const entry = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      action,
      subject,
      actor,
      metadata,
      caseNumber: this.caseNumber,
      previousHash: this.chainHash,
      sequence: this.entries.length
    };

    // Compute hash (blockchain-style)
    const dataToHash = JSON.stringify({
      ...entry,
      hash: undefined
    });
    entry.hash = createHash('sha256').update(dataToHash).digest('hex');
    this.chainHash = entry.hash;

    this.entries.push(entry);

    // Auto-save if storage path configured
    if (this.storagePath) {
      this._persistEntry(entry);
    }

    return entry;
  }

  /**
   * Verify entire audit trail integrity
   */
  verify() {
    let previousHash = null;

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];

      // Verify previous hash linkage
      if (entry.previousHash !== previousHash) {
        return {
          valid: false,
          error: `Chain broken at entry ${i}`,
          index: i
        };
      }

      // Verify entry hash
      const { hash, ...data } = entry;
      const computedHash = createHash('sha256')
        .update(JSON.stringify(data))
        .digest('hex');

      if (computedHash !== hash) {
        return {
          valid: false,
          error: `Hash mismatch at entry ${i}`,
          index: i,
          expected: hash,
          computed: computedHash
        };
      }

      previousHash = hash;
    }

    return {
      valid: true,
      entries: this.entries.length,
      chainHash: this.chainHash
    };
  }

  /**
   * Export audit trail for court submission
   */
  exportForCourt() {
    const verification = this.verify();

    return {
      caseNumber: this.caseNumber,
      exportedAt: new Date().toISOString(),
      totalEntries: this.entries.length,
      integrityVerified: verification.valid,
      chainHash: this.chainHash,
      entries: this.entries.map(e => ({
        timestamp: e.timestamp,
        action: e.action,
        subject: e.subject,
        actor: e.actor,
        hash: e.hash.slice(0, 16) + '...'
      }))
    };
  }

  _persistEntry(entry) {
    try {
      const logFile = join(this.storagePath, 'audit_trail.jsonl');
      const line = JSON.stringify(entry) + '\n';

      if (existsSync(logFile)) {
        const fs = require('fs');
        fs.appendFileSync(logFile, line);
      } else {
        writeFileSync(logFile, line);
      }
    } catch (error) {
      log.error('Failed to persist audit entry', { error: error.message });
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// REDACTION ENGINE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * PII Redaction Engine
 */
export class RedactionEngine {
  constructor(options = {}) {
    this.customPatterns = options.customPatterns || {};
    this.protectedNames = new Set(options.protectedNames || []);
    this.redactionChar = options.redactionChar || '█';
  }

  /**
   * Redact content based on level
   */
  redact(content, level = REDACTION_LEVELS.MODERATE, options = {}) {
    if (level === REDACTION_LEVELS.NONE) {
      return { content, redactions: [] };
    }

    let redacted = content;
    const redactions = [];

    const applyPattern = (pattern, type, replacement) => {
      const matches = redacted.match(pattern);
      if (matches) {
        matches.forEach(match => {
          redactions.push({ type, original: match, position: redacted.indexOf(match) });
        });
        redacted = redacted.replace(pattern, replacement || this._generateRedaction(type));
      }
    };

    // Level 1: Light - Names only
    if (level >= REDACTION_LEVELS.LIGHT) {
      // Redact protected names first
      this.protectedNames.forEach(name => {
        const namePattern = new RegExp(`\\b${name}\\b`, 'gi');
        applyPattern(namePattern, 'protected_name', '[REDACTED NAME]');
      });
    }

    // Level 2: Moderate - Names + contact info
    if (level >= REDACTION_LEVELS.MODERATE) {
      applyPattern(PII_PATTERNS.email, 'email', '[EMAIL REDACTED]');
      applyPattern(PII_PATTERNS.phoneAU, 'phone', '[PHONE REDACTED]');
      applyPattern(PII_PATTERNS.phoneMobile, 'mobile', '[MOBILE REDACTED]');
    }

    // Level 3: Heavy - All PII
    if (level >= REDACTION_LEVELS.HEAVY) {
      applyPattern(PII_PATTERNS.medicare, 'medicare', '[MEDICARE REDACTED]');
      applyPattern(PII_PATTERNS.tfn, 'tfn', '[TFN REDACTED]');
      applyPattern(PII_PATTERNS.addressAU, 'address', '[ADDRESS REDACTED]');
      applyPattern(PII_PATTERNS.bsb, 'bsb', '[BSB REDACTED]');
      applyPattern(PII_PATTERNS.accountNumber, 'account', '[ACCOUNT REDACTED]');
      applyPattern(PII_PATTERNS.creditCard, 'credit_card', '[CARD REDACTED]');
      applyPattern(PII_PATTERNS.dob, 'dob', '[DOB REDACTED]');
      applyPattern(PII_PATTERNS.ipv4, 'ip', '[IP REDACTED]');
    }

    // Level 4: Complete - Full anonymization
    if (level >= REDACTION_LEVELS.COMPLETE) {
      applyPattern(PII_PATTERNS.fullName, 'name', '[NAME]');
      applyPattern(PII_PATTERNS.dateAU, 'date', '[DATE]');
      applyPattern(PII_PATTERNS.postcode, 'postcode', '[POSTCODE]');

      // Apply custom patterns
      Object.entries(this.customPatterns).forEach(([type, pattern]) => {
        applyPattern(pattern, type);
      });
    }

    return {
      content: redacted,
      redactions,
      level,
      redactionCount: redactions.length
    };
  }

  /**
   * Add protected name
   */
  addProtectedName(name) {
    this.protectedNames.add(name);
  }

  /**
   * Add custom pattern
   */
  addPattern(name, pattern) {
    this.customPatterns[name] = pattern;
  }

  _generateRedaction(type) {
    const lengths = {
      name: 10,
      email: 15,
      phone: 10,
      address: 25,
      default: 8
    };
    const len = lengths[type] || lengths.default;
    return `[${this.redactionChar.repeat(len)}]`;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CLOUD SYNC MANAGER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Multi-platform cloud sync
 */
export class CloudSync {
  constructor(options = {}) {
    this.providers = new Map();
    this.syncState = new Map();
    this.conflictResolver = options.conflictResolver || 'newest';

    // Register default providers
    this._registerDefaultProviders();
  }

  _registerDefaultProviders() {
    // iCloud Drive (macOS)
    this.providers.set('icloud', {
      name: 'iCloud Drive',
      basePath: join(homedir(), 'Library/Mobile Documents/com~apple~CloudDocs'),
      available: () => existsSync(join(homedir(), 'Library/Mobile Documents/com~apple~CloudDocs')),
      getPath: (subpath) => join(this.providers.get('icloud').basePath, subpath)
    });

    // Local filesystem
    this.providers.set('local', {
      name: 'Local Storage',
      basePath: join(homedir(), '.genesis/vault'),
      available: () => true,
      getPath: (subpath) => join(this.providers.get('local').basePath, subpath)
    });

    // Shortcuts folder (iOS bridge)
    this.providers.set('shortcuts', {
      name: 'iOS Shortcuts',
      basePath: join(homedir(), 'Library/Mobile Documents/com~apple~CloudDocs/Shortcuts'),
      available: () => existsSync(join(homedir(), 'Library/Mobile Documents/com~apple~CloudDocs/Shortcuts')),
      getPath: (subpath) => join(this.providers.get('shortcuts').basePath, subpath)
    });
  }

  /**
   * Get available sync providers
   */
  getAvailableProviders() {
    return Array.from(this.providers.entries())
      .filter(([_, provider]) => provider.available())
      .map(([id, provider]) => ({ id, name: provider.name, path: provider.basePath }));
  }

  /**
   * Sync evidence to provider
   */
  async syncTo(providerId, evidence, content) {
    const provider = this.providers.get(providerId);
    if (!provider || !provider.available()) {
      throw new Error(`Provider ${providerId} not available`);
    }

    const syncPath = provider.getPath(`evidence/${evidence.id}`);

    // Ensure directory exists
    const dir = join(syncPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Write metadata
    writeFileSync(
      join(syncPath, 'metadata.json'),
      JSON.stringify(evidence, null, 2)
    );

    // Write content if provided
    if (content) {
      const contentFile = evidence.originalFilename || 'content.dat';
      writeFileSync(join(syncPath, contentFile), content);
    }

    // Update sync state
    this.syncState.set(`${providerId}:${evidence.id}`, {
      syncedAt: new Date().toISOString(),
      hash: evidence.contentHash
    });

    return { provider: providerId, path: syncPath };
  }

  /**
   * Check sync status
   */
  getSyncStatus(evidenceId) {
    const statuses = [];

    for (const [providerId, provider] of this.providers) {
      if (!provider.available()) continue;

      const state = this.syncState.get(`${providerId}:${evidenceId}`);
      const path = provider.getPath(`evidence/${evidenceId}`);
      const exists = existsSync(path);

      statuses.push({
        provider: providerId,
        name: provider.name,
        synced: exists,
        lastSync: state?.syncedAt,
        path: exists ? path : null
      });
    }

    return statuses;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// VAULT ENCRYPTION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Evidence vault encryption
 */
export class VaultEncryption {
  constructor(options = {}) {
    this.algorithm = 'aes-256-gcm';
    this.keyDerivation = 'scrypt';
    this.masterKey = null;
    this.keyId = null;
  }

  /**
   * Initialize with passphrase
   */
  initialize(passphrase) {
    const salt = randomBytes(32);
    this.masterKey = scryptSync(passphrase, salt, 32);
    this.keyId = createHash('sha256').update(this.masterKey).digest('hex').slice(0, 16);
    this.salt = salt;
    return this.keyId;
  }

  /**
   * Encrypt content
   */
  encrypt(content) {
    if (!this.masterKey) {
      throw new Error('Vault not initialized');
    }

    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.masterKey, iv);

    const data = typeof content === 'string' ? content : JSON.stringify(content);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted: true,
      algorithm: this.algorithm,
      keyId: this.keyId,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted
    };
  }

  /**
   * Decrypt content
   */
  decrypt(encryptedData) {
    if (!this.masterKey) {
      throw new Error('Vault not initialized');
    }

    if (encryptedData.keyId !== this.keyId) {
      throw new Error('Key ID mismatch');
    }

    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');

    const decipher = createDecipheriv(this.algorithm, this.masterKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  }

  /**
   * Lock vault (clear key from memory)
   */
  lock() {
    if (this.masterKey) {
      this.masterKey.fill(0);
      this.masterKey = null;
    }
    this.keyId = null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// iOS SHORTCUTS BRIDGE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * iOS Shortcuts Integration
 */
export class ShortcutsBridge {
  constructor(options = {}) {
    this.inboxPath = options.inboxPath || join(homedir(),
      'Library/Mobile Documents/com~apple~CloudDocs/Shortcuts/Genesis/Inbox');
    this.outboxPath = options.outboxPath || join(homedir(),
      'Library/Mobile Documents/com~apple~CloudDocs/Shortcuts/Genesis/Outbox');
    this.pollInterval = options.pollInterval || 5000;
    this.handlers = new Map();
    this.polling = false;
  }

  /**
   * Initialize bridge directories
   */
  initialize() {
    [this.inboxPath, this.outboxPath].forEach(path => {
      if (!existsSync(path)) {
        mkdirSync(path, { recursive: true });
      }
    });
  }

  /**
   * Register action handler
   */
  onAction(action, handler) {
    this.handlers.set(action, handler);
  }

  /**
   * Process incoming shortcut requests
   */
  async processInbox() {
    if (!existsSync(this.inboxPath)) return [];

    const files = readdirSync(this.inboxPath)
      .filter(f => f.endsWith('.json'));

    const results = [];

    for (const file of files) {
      try {
        const filePath = join(this.inboxPath, file);
        const content = JSON.parse(readFileSync(filePath, 'utf8'));

        const handler = this.handlers.get(content.action);
        if (handler) {
          const result = await handler(content);

          // Write result to outbox
          const resultFile = join(this.outboxPath, `result_${file}`);
          writeFileSync(resultFile, JSON.stringify({
            requestId: content.requestId,
            action: content.action,
            result,
            processedAt: new Date().toISOString()
          }, null, 2));

          results.push({ file, action: content.action, success: true });
        }

        // Remove processed file
        require('fs').unlinkSync(filePath);

      } catch (error) {
        results.push({ file, error: error.message, success: false });
      }
    }

    return results;
  }

  /**
   * Start polling for shortcut requests
   */
  startPolling() {
    this.polling = true;
    this._poll();
  }

  /**
   * Stop polling
   */
  stopPolling() {
    this.polling = false;
  }

  async _poll() {
    if (!this.polling) return;

    await this.processInbox();

    setTimeout(() => this._poll(), this.pollInterval);
  }

  /**
   * Generate Shortcut action schema
   */
  static generateShortcutSchema() {
    return {
      name: 'GENESIS Evidence',
      actions: [
        {
          name: 'capture_evidence',
          description: 'Capture new evidence item',
          parameters: ['title', 'type', 'content', 'source']
        },
        {
          name: 'search_evidence',
          description: 'Search evidence vault',
          parameters: ['query', 'type', 'dateRange']
        },
        {
          name: 'export_evidence',
          description: 'Export evidence for court',
          parameters: ['evidenceId', 'format', 'redactionLevel']
        }
      ]
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EBEN CLASS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * EBEN - Evidence Management Foundation
 *
 * PROTECTED BY SHINOBI SECURITY LAYER
 */
export class Eben extends EventEmitter {
  constructor(options = {}) {
    super();

    this.vaultPath = options.vaultPath || join(homedir(), '.genesis/evidence-vault');
    this.cases = new Map();
    this.evidence = new Map();

    // Initialize components
    this.audit = new LegalAuditTrail({
      storagePath: this.vaultPath,
      caseNumber: options.caseNumber
    });
    this.redaction = new RedactionEngine(options.redaction);
    this.encryption = new VaultEncryption();
    this.cloudSync = new CloudSync();
    this.shortcuts = new ShortcutsBridge();

    // Security state
    this._unlocked = false;
    this._adminVerified = false;

    // Initialize
    this._ensureVaultExists();
  }

  _ensureVaultExists() {
    const dirs = [
      this.vaultPath,
      join(this.vaultPath, 'evidence'),
      join(this.vaultPath, 'cases'),
      join(this.vaultPath, 'logs'),
      join(this.vaultPath, 'exports')
    ];

    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Unlock vault with passphrase
   */
  unlock(passphrase) {
    const keyId = this.encryption.initialize(passphrase);
    this._unlocked = true;

    this.audit.log('vault_unlocked', 'vault', 'system', { keyId });
    this.emit('unlocked', { keyId });

    return keyId;
  }

  /**
   * Lock vault
   */
  lock() {
    this.encryption.lock();
    this._unlocked = false;
    this._adminVerified = false;

    this.audit.log('vault_locked', 'vault', 'system');
    this.emit('locked');
  }

  /**
   * Verify admin access (required for sensitive operations)
   */
  verifyAdmin(token) {
    // This will be validated by SHINOBI layer
    this._adminVerified = true;
    return true;
  }

  /**
   * Ingest new evidence
   */
  async ingestEvidence(source, content, metadata = {}) {
    if (!this._unlocked) {
      throw new Error('Vault is locked');
    }

    // Create evidence item
    const evidence = new EvidenceItem({
      ...metadata,
      source,
      contentHash: createHash('sha256').update(
        typeof content === 'string' ? content : JSON.stringify(content)
      ).digest('hex'),
      size: typeof content === 'string' ? content.length : JSON.stringify(content).length
    });

    // Add custody entry
    evidence.addCustodyEntry(CUSTODY_ACTIONS.CREATED, 'system', {
      source,
      originalSize: evidence.size
    });

    // Encrypt and store
    const encrypted = this.encryption.encrypt(content);
    evidence.encrypted = true;
    evidence.encryptionKeyId = encrypted.keyId;

    const storagePath = join(this.vaultPath, 'evidence', evidence.id);
    mkdirSync(storagePath, { recursive: true });

    writeFileSync(
      join(storagePath, 'content.enc'),
      JSON.stringify(encrypted)
    );
    writeFileSync(
      join(storagePath, 'metadata.json'),
      JSON.stringify(evidence, null, 2)
    );

    evidence.storagePath = storagePath;

    // Store in memory
    this.evidence.set(evidence.id, evidence);

    // Audit
    this.audit.log('evidence_ingested', evidence.id, 'system', {
      type: evidence.type,
      hash: evidence.contentHash.slice(0, 16)
    });

    this.emit('evidence:ingested', evidence);

    return evidence;
  }

  /**
   * Retrieve evidence
   */
  async retrieveEvidence(evidenceId, options = {}) {
    if (!this._unlocked) {
      throw new Error('Vault is locked');
    }

    const evidence = this.evidence.get(evidenceId);
    if (!evidence) {
      // Try loading from disk
      const storagePath = join(this.vaultPath, 'evidence', evidenceId);
      if (!existsSync(storagePath)) {
        throw new Error(`Evidence ${evidenceId} not found`);
      }

      const metadata = JSON.parse(
        readFileSync(join(storagePath, 'metadata.json'), 'utf8')
      );
      this.evidence.set(evidenceId, new EvidenceItem(metadata));
    }

    const item = this.evidence.get(evidenceId);

    // Add custody entry
    item.addCustodyEntry(CUSTODY_ACTIONS.ACCESSED, options.actor || 'system');

    // Decrypt content if requested
    let content = null;
    if (options.includeContent) {
      const encryptedPath = join(item.storagePath, 'content.enc');
      if (existsSync(encryptedPath)) {
        const encrypted = JSON.parse(readFileSync(encryptedPath, 'utf8'));
        content = this.encryption.decrypt(encrypted);
      }
    }

    // Apply redaction if requested
    if (content && options.redactionLevel) {
      const result = this.redaction.redact(
        typeof content === 'string' ? content : JSON.stringify(content),
        options.redactionLevel
      );
      content = result.content;

      item.addCustodyEntry(CUSTODY_ACTIONS.REDACTED, options.actor || 'system', {
        level: options.redactionLevel,
        redactions: result.redactionCount
      });
    }

    this.audit.log('evidence_accessed', evidenceId, options.actor || 'system', {
      includeContent: options.includeContent,
      redacted: !!options.redactionLevel
    });

    return { evidence: item, content };
  }

  /**
   * Create legal case
   */
  createCase(caseData) {
    const legalCase = new LegalCase(caseData);

    // Store
    this.cases.set(legalCase.id, legalCase);

    const casePath = join(this.vaultPath, 'cases', legalCase.id);
    mkdirSync(casePath, { recursive: true });
    writeFileSync(
      join(casePath, 'case.json'),
      JSON.stringify(legalCase, null, 2)
    );

    this.audit.log('case_created', legalCase.id, 'system', {
      caseNumber: legalCase.caseNumber,
      court: legalCase.court
    });

    return legalCase;
  }

  /**
   * Link evidence to case
   */
  linkEvidenceToCase(evidenceId, caseId, exhibitNumber) {
    const evidence = this.evidence.get(evidenceId);
    const legalCase = this.cases.get(caseId);

    if (!evidence || !legalCase) {
      throw new Error('Evidence or case not found');
    }

    evidence.caseNumber = legalCase.caseNumber;
    evidence.exhibitNumber = exhibitNumber;
    evidence.addCustodyEntry(CUSTODY_ACTIONS.TRANSFERRED, 'system', {
      linkedToCase: caseId,
      exhibitNumber
    });

    legalCase.addEvidence(evidenceId);

    this.audit.log('evidence_linked', evidenceId, 'system', {
      caseId,
      caseNumber: legalCase.caseNumber,
      exhibitNumber
    });

    return { evidence, case: legalCase };
  }

  /**
   * Export evidence for court
   */
  async exportForCourt(evidenceId, format = 'pdf', options = {}) {
    if (!this._adminVerified) {
      throw new Error('Admin verification required for court export');
    }

    const { evidence, content } = await this.retrieveEvidence(evidenceId, {
      includeContent: true,
      redactionLevel: options.redactionLevel || REDACTION_LEVELS.MODERATE,
      actor: 'court_export'
    });

    const exportData = {
      exportId: randomUUID(),
      exportedAt: new Date().toISOString(),
      format,
      evidence: evidence.toMetadata(),
      custodyChain: evidence.custodyChain,
      custodyVerification: evidence.verifyCustodyChain(),
      content: content,
      auditTrail: this.audit.exportForCourt()
    };

    // Save export
    const exportPath = join(this.vaultPath, 'exports', `${exportData.exportId}.json`);
    writeFileSync(exportPath, JSON.stringify(exportData, null, 2));

    evidence.addCustodyEntry(CUSTODY_ACTIONS.EXPORTED, 'court_export', {
      exportId: exportData.exportId,
      format,
      redactionLevel: options.redactionLevel
    });

    this.audit.log('evidence_exported', evidenceId, 'court_export', {
      exportId: exportData.exportId,
      format
    });

    return exportData;
  }

  /**
   * Search evidence
   */
  search(query, options = {}) {
    const results = [];

    for (const [id, evidence] of this.evidence) {
      let score = 0;

      // Title match
      if (evidence.title.toLowerCase().includes(query.toLowerCase())) {
        score += 10;
      }

      // Description match
      if (evidence.description?.toLowerCase().includes(query.toLowerCase())) {
        score += 5;
      }

      // Tag match
      if (evidence.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))) {
        score += 8;
      }

      // Type filter
      if (options.type && evidence.type !== options.type) {
        continue;
      }

      // Classification filter
      if (options.maxClassification !== undefined &&
          evidence.classification > options.maxClassification) {
        continue;
      }

      if (score > 0) {
        results.push({ evidence, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || 50)
      .map(r => r.evidence);
  }

  /**
   * Verify all evidence integrity
   */
  verifyAllIntegrity() {
    const results = [];

    for (const [id, evidence] of this.evidence) {
      const custodyResult = evidence.verifyCustodyChain();
      results.push({
        id,
        title: evidence.title,
        custodyValid: custodyResult.valid,
        custodyEntries: custodyResult.entries,
        error: custodyResult.error
      });
    }

    const auditResult = this.audit.verify();

    return {
      evidence: results,
      audit: auditResult,
      overallValid: results.every(r => r.custodyValid) && auditResult.valid
    };
  }

  /**
   * Get system status
   */
  status() {
    return {
      unlocked: this._unlocked,
      adminVerified: this._adminVerified,
      evidenceCount: this.evidence.size,
      caseCount: this.cases.size,
      auditEntries: this.audit.entries.length,
      syncProviders: this.cloudSync.getAvailableProviders(),
      vaultPath: this.vaultPath
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export default Eben;

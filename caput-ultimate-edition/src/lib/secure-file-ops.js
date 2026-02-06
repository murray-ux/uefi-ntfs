/**
 * GENESIS Secure File Operations
 * Encryption, Backup, Transfer, and Sync utilities
 *
 * GENESIS 2.0 — Forbidden Ninja City
 * Inspired by FMHY tools: Cryptomator, VeraCrypt, restic, croc, SyncThing
 */

import { EventEmitter } from 'node:events';
import {
  createCipheriv, createDecipheriv, randomBytes,
  createHash, scrypt, createHmac
} from 'node:crypto';
import {
  createReadStream, createWriteStream, statSync,
  readdirSync, existsSync, mkdirSync, unlinkSync,
  readFileSync, writeFileSync
} from 'node:fs';
import { join, basename, dirname, relative } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';
import { createGzip, createGunzip } from 'node:zlib';

const scryptAsync = promisify(scrypt);

// ═══════════════════════════════════════════════════════════════════════════
// Encrypted Vault (Cryptomator/VeraCrypt-style)
// ═══════════════════════════════════════════════════════════════════════════

export class EncryptedVault extends EventEmitter {
  constructor(vaultPath, options = {}) {
    super();
    this.vaultPath = vaultPath;
    this.algorithm = options.algorithm || 'aes-256-gcm';
    this.keyDerivation = options.keyDerivation || 'scrypt';
    this.chunkSize = options.chunkSize || 64 * 1024; // 64KB chunks
    this.unlocked = false;
    this.key = null;
    this.masterKey = null;
  }

  /**
   * Initialize a new vault
   */
  async initialize(password) {
    if (existsSync(this.vaultPath)) {
      throw new Error('Vault already exists');
    }

    mkdirSync(this.vaultPath, { recursive: true });
    mkdirSync(join(this.vaultPath, 'd'), { recursive: true }); // Data directory

    // Generate master key
    this.masterKey = randomBytes(32);
    const salt = randomBytes(32);
    const kek = await this._deriveKey(password, salt);

    // Encrypt master key with KEK
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, kek, iv);
    let encryptedMasterKey = cipher.update(this.masterKey);
    encryptedMasterKey = Buffer.concat([encryptedMasterKey, cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Write vault config
    const config = {
      version: 2,
      algorithm: this.algorithm,
      keyDerivation: this.keyDerivation,
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      encryptedMasterKey: encryptedMasterKey.toString('base64'),
      created: new Date().toISOString()
    };

    writeFileSync(
      join(this.vaultPath, 'vault.json'),
      JSON.stringify(config, null, 2)
    );

    this.emit('initialized', { path: this.vaultPath });
    return true;
  }

  /**
   * Unlock the vault
   */
  async unlock(password) {
    const configPath = join(this.vaultPath, 'vault.json');
    if (!existsSync(configPath)) {
      throw new Error('Invalid vault - config not found');
    }

    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    const salt = Buffer.from(config.salt, 'base64');
    const kek = await this._deriveKey(password, salt);

    try {
      // Decrypt master key
      const iv = Buffer.from(config.iv, 'base64');
      const authTag = Buffer.from(config.authTag, 'base64');
      const encryptedMasterKey = Buffer.from(config.encryptedMasterKey, 'base64');

      const decipher = createDecipheriv(this.algorithm, kek, iv);
      decipher.setAuthTag(authTag);
      let masterKey = decipher.update(encryptedMasterKey);
      masterKey = Buffer.concat([masterKey, decipher.final()]);

      this.masterKey = masterKey;
      this.key = masterKey;
      this.unlocked = true;

      this.emit('unlocked', { path: this.vaultPath });
      return true;
    } catch (err) {
      throw new Error('Invalid password');
    }
  }

  /**
   * Lock the vault
   */
  lock() {
    this.masterKey = null;
    this.key = null;
    this.unlocked = false;
    this.emit('locked', { path: this.vaultPath });
  }

  /**
   * Encrypt and store a file
   */
  async store(sourcePath, destName = null) {
    if (!this.unlocked) throw new Error('Vault is locked');

    const filename = destName || basename(sourcePath);
    const encryptedName = this._encryptFilename(filename);
    const destPath = join(this.vaultPath, 'd', encryptedName);

    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);

    // Write IV at the beginning
    writeFileSync(destPath, iv);

    // Encrypt file content
    const input = createReadStream(sourcePath);
    const output = createWriteStream(destPath, { flags: 'a' });

    await new Promise((resolve, reject) => {
      input
        .pipe(createGzip())
        .pipe(cipher)
        .pipe(output)
        .on('finish', resolve)
        .on('error', reject);
    });

    // Append auth tag
    const authTag = cipher.getAuthTag();
    const fd = require('fs').openSync(destPath, 'a');
    require('fs').writeSync(fd, authTag);
    require('fs').closeSync(fd);

    const stats = statSync(destPath);
    this.emit('stored', { filename, size: stats.size });

    return { filename, encryptedName, size: stats.size };
  }

  /**
   * Decrypt and retrieve a file
   */
  async retrieve(filename, destPath) {
    if (!this.unlocked) throw new Error('Vault is locked');

    const encryptedName = this._encryptFilename(filename);
    const sourcePath = join(this.vaultPath, 'd', encryptedName);

    if (!existsSync(sourcePath)) {
      throw new Error('File not found in vault');
    }

    const stats = statSync(sourcePath);
    const content = readFileSync(sourcePath);

    // Extract IV (first 16 bytes) and auth tag (last 16 bytes)
    const iv = content.subarray(0, 16);
    const authTag = content.subarray(content.length - 16);
    const encrypted = content.subarray(16, content.length - 16);

    const decipher = createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    // Decompress
    const { gunzipSync } = require('node:zlib');
    const decompressed = gunzipSync(decrypted);

    writeFileSync(destPath, decompressed);
    this.emit('retrieved', { filename, destPath });

    return { filename, size: decompressed.length };
  }

  /**
   * List files in vault
   */
  list() {
    if (!this.unlocked) throw new Error('Vault is locked');

    const dataDir = join(this.vaultPath, 'd');
    if (!existsSync(dataDir)) return [];

    const files = readdirSync(dataDir);
    return files.map(encName => {
      try {
        return {
          name: this._decryptFilename(encName),
          encryptedName: encName,
          size: statSync(join(dataDir, encName)).size
        };
      } catch {
        return { name: '[corrupted]', encryptedName: encName, corrupted: true };
      }
    });
  }

  /**
   * Delete a file from vault
   */
  delete(filename) {
    if (!this.unlocked) throw new Error('Vault is locked');

    const encryptedName = this._encryptFilename(filename);
    const filePath = join(this.vaultPath, 'd', encryptedName);

    if (existsSync(filePath)) {
      // Secure delete - overwrite with random data first
      const stats = statSync(filePath);
      const randomData = randomBytes(stats.size);
      writeFileSync(filePath, randomData);
      unlinkSync(filePath);
      this.emit('deleted', { filename });
      return true;
    }
    return false;
  }

  /**
   * Derive encryption key from password
   */
  async _deriveKey(password, salt) {
    return scryptAsync(password, salt, 32, { N: 16384, r: 8, p: 1 });
  }

  /**
   * Encrypt filename
   */
  _encryptFilename(filename) {
    const iv = createHash('md5').update(filename).digest();
    const cipher = createCipheriv('aes-256-cbc', this.key, iv);
    let encrypted = cipher.update(filename, 'utf8', 'base64url');
    encrypted += cipher.final('base64url');
    return encrypted;
  }

  /**
   * Decrypt filename
   */
  _decryptFilename(encrypted) {
    // For deterministic filenames, we need to try decryption
    // This is a simplified version
    const parts = encrypted.split('.');
    const base = parts[0];
    const iv = createHash('md5').update(base).digest().subarray(0, 16);
    const decipher = createDecipheriv('aes-256-cbc', this.key, iv);
    let decrypted = decipher.update(base, 'base64url', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Incremental Backup System (restic/Kopia-style)
// ═══════════════════════════════════════════════════════════════════════════

export class BackupEngine extends EventEmitter {
  constructor(repositoryPath, options = {}) {
    super();
    this.repositoryPath = repositoryPath;
    this.chunkSize = options.chunkSize || 1024 * 1024; // 1MB
    this.compression = options.compression !== false;
    this.encryption = options.encryption !== false;
    this.key = null;
  }

  /**
   * Initialize backup repository
   */
  async initialize(password) {
    if (existsSync(this.repositoryPath)) {
      const configPath = join(this.repositoryPath, 'config.json');
      if (existsSync(configPath)) {
        throw new Error('Repository already initialized');
      }
    }

    mkdirSync(this.repositoryPath, { recursive: true });
    mkdirSync(join(this.repositoryPath, 'data'), { recursive: true });
    mkdirSync(join(this.repositoryPath, 'snapshots'), { recursive: true });
    mkdirSync(join(this.repositoryPath, 'index'), { recursive: true });

    const salt = randomBytes(32);
    this.key = await scryptAsync(password, salt, 32);

    const config = {
      version: 1,
      created: new Date().toISOString(),
      salt: salt.toString('base64'),
      chunker: 'fixed',
      chunkSize: this.chunkSize,
      compression: this.compression,
      encryption: this.encryption
    };

    writeFileSync(
      join(this.repositoryPath, 'config.json'),
      JSON.stringify(config, null, 2)
    );

    this.emit('initialized', { path: this.repositoryPath });
    return true;
  }

  /**
   * Unlock repository
   */
  async unlock(password) {
    const configPath = join(this.repositoryPath, 'config.json');
    if (!existsSync(configPath)) {
      throw new Error('Repository not initialized');
    }

    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    const salt = Buffer.from(config.salt, 'base64');
    this.key = await scryptAsync(password, salt, 32);

    this.emit('unlocked');
    return true;
  }

  /**
   * Create a backup snapshot
   */
  async backup(sourcePaths, tags = []) {
    if (!this.key) throw new Error('Repository is locked');

    const snapshotId = randomBytes(16).toString('hex');
    const snapshot = {
      id: snapshotId,
      time: new Date().toISOString(),
      tags,
      paths: Array.isArray(sourcePaths) ? sourcePaths : [sourcePaths],
      tree: [],
      stats: { files: 0, size: 0, chunks: 0 }
    };

    for (const sourcePath of snapshot.paths) {
      await this._backupPath(sourcePath, snapshot);
    }

    // Save snapshot
    const snapshotPath = join(this.repositoryPath, 'snapshots', `${snapshotId}.json`);
    writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));

    this.emit('backup:complete', snapshot);
    return snapshot;
  }

  /**
   * Backup a path recursively
   */
  async _backupPath(sourcePath, snapshot, basePath = null) {
    const stats = statSync(sourcePath);
    const relativePath = basePath ? relative(basePath, sourcePath) : basename(sourcePath);

    if (stats.isDirectory()) {
      const entries = readdirSync(sourcePath);
      for (const entry of entries) {
        await this._backupPath(
          join(sourcePath, entry),
          snapshot,
          basePath || sourcePath
        );
      }
    } else if (stats.isFile()) {
      const chunks = await this._chunkFile(sourcePath);
      snapshot.tree.push({
        path: relativePath,
        size: stats.size,
        mtime: stats.mtime.toISOString(),
        mode: stats.mode,
        chunks: chunks.map(c => c.id)
      });
      snapshot.stats.files++;
      snapshot.stats.size += stats.size;
      snapshot.stats.chunks += chunks.length;

      this.emit('backup:file', { path: relativePath, size: stats.size });
    }
  }

  /**
   * Chunk and deduplicate file
   */
  async _chunkFile(filePath) {
    const content = readFileSync(filePath);
    const chunks = [];

    for (let i = 0; i < content.length; i += this.chunkSize) {
      const chunk = content.subarray(i, i + this.chunkSize);
      const hash = createHash('sha256').update(chunk).digest('hex');
      const chunkPath = join(this.repositoryPath, 'data', hash.substring(0, 2), hash);

      // Deduplicate - only store if not exists
      if (!existsSync(chunkPath)) {
        mkdirSync(dirname(chunkPath), { recursive: true });

        let data = chunk;

        // Compress
        if (this.compression) {
          const { gzipSync } = require('node:zlib');
          data = gzipSync(data);
        }

        // Encrypt
        if (this.encryption) {
          const iv = randomBytes(16);
          const cipher = createCipheriv('aes-256-gcm', this.key, iv);
          let encrypted = cipher.update(data);
          encrypted = Buffer.concat([encrypted, cipher.final()]);
          const authTag = cipher.getAuthTag();
          data = Buffer.concat([iv, encrypted, authTag]);
        }

        writeFileSync(chunkPath, data);
      }

      chunks.push({ id: hash, size: chunk.length });
    }

    return chunks;
  }

  /**
   * Restore from snapshot
   */
  async restore(snapshotId, destPath) {
    if (!this.key) throw new Error('Repository is locked');

    const snapshotPath = join(this.repositoryPath, 'snapshots', `${snapshotId}.json`);
    if (!existsSync(snapshotPath)) {
      throw new Error('Snapshot not found');
    }

    const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf-8'));
    mkdirSync(destPath, { recursive: true });

    for (const file of snapshot.tree) {
      const filePath = join(destPath, file.path);
      mkdirSync(dirname(filePath), { recursive: true });

      const chunks = [];
      for (const chunkId of file.chunks) {
        const chunkPath = join(this.repositoryPath, 'data', chunkId.substring(0, 2), chunkId);
        let data = readFileSync(chunkPath);

        // Decrypt
        if (this.encryption) {
          const iv = data.subarray(0, 16);
          const authTag = data.subarray(data.length - 16);
          const encrypted = data.subarray(16, data.length - 16);

          const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
          decipher.setAuthTag(authTag);
          data = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        }

        // Decompress
        if (this.compression) {
          const { gunzipSync } = require('node:zlib');
          data = gunzipSync(data);
        }

        chunks.push(data);
      }

      writeFileSync(filePath, Buffer.concat(chunks));
      this.emit('restore:file', { path: file.path, size: file.size });
    }

    this.emit('restore:complete', { snapshotId, files: snapshot.tree.length });
    return snapshot;
  }

  /**
   * List snapshots
   */
  listSnapshots() {
    const snapshotsDir = join(this.repositoryPath, 'snapshots');
    if (!existsSync(snapshotsDir)) return [];

    return readdirSync(snapshotsDir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const content = readFileSync(join(snapshotsDir, f), 'utf-8');
        return JSON.parse(content);
      })
      .sort((a, b) => new Date(b.time) - new Date(a.time));
  }

  /**
   * Prune old snapshots
   */
  prune(keepLast = 5) {
    const snapshots = this.listSnapshots();
    const toDelete = snapshots.slice(keepLast);

    for (const snapshot of toDelete) {
      const snapshotPath = join(this.repositoryPath, 'snapshots', `${snapshot.id}.json`);
      unlinkSync(snapshotPath);
      this.emit('prune:snapshot', { id: snapshot.id });
    }

    return { deleted: toDelete.length, kept: Math.min(snapshots.length, keepLast) };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Secure File Transfer (croc/Magic Wormhole-style)
// ═══════════════════════════════════════════════════════════════════════════

export class SecureTransfer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.relayUrl = options.relayUrl || 'wss://relay.genesis.local';
    this.chunkSize = options.chunkSize || 64 * 1024;
  }

  /**
   * Generate transfer code
   */
  generateCode() {
    // Generate a human-readable transfer code
    const words = [
      'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot',
      'golf', 'hotel', 'india', 'juliet', 'kilo', 'lima',
      'mike', 'november', 'oscar', 'papa', 'quebec', 'romeo',
      'sierra', 'tango', 'uniform', 'victor', 'whiskey', 'xray',
      'yankee', 'zulu'
    ];

    const code = [];
    for (let i = 0; i < 4; i++) {
      code.push(words[Math.floor(Math.random() * words.length)]);
    }
    return code.join('-');
  }

  /**
   * Prepare file for transfer
   */
  prepareTransfer(filePath) {
    const code = this.generateCode();
    const stats = statSync(filePath);
    const content = readFileSync(filePath);

    // Generate encryption key from code
    const key = createHash('sha256').update(code).digest();
    const iv = randomBytes(16);

    // Encrypt
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(content);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    const transfer = {
      code,
      key: key.toString('hex'),
      filename: basename(filePath),
      size: stats.size,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      encrypted,
      chunks: this._splitIntoChunks(encrypted),
      hash: createHash('sha256').update(content).digest('hex')
    };

    this.emit('transfer:prepared', {
      code,
      filename: transfer.filename,
      size: transfer.size,
      chunks: transfer.chunks.length
    });

    return transfer;
  }

  /**
   * Receive and decrypt transfer
   */
  receiveTransfer(transfer, destPath) {
    const key = createHash('sha256').update(transfer.code).digest();
    const iv = Buffer.from(transfer.iv, 'hex');
    const authTag = Buffer.from(transfer.authTag, 'hex');
    const encrypted = Buffer.concat(transfer.chunks);

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    // Verify hash
    const hash = createHash('sha256').update(decrypted).digest('hex');
    if (hash !== transfer.hash) {
      throw new Error('File integrity check failed');
    }

    writeFileSync(destPath, decrypted);

    this.emit('transfer:complete', {
      filename: transfer.filename,
      size: decrypted.length,
      hash
    });

    return { filename: transfer.filename, size: decrypted.length, hash };
  }

  /**
   * Split data into chunks
   */
  _splitIntoChunks(data) {
    const chunks = [];
    for (let i = 0; i < data.length; i += this.chunkSize) {
      chunks.push(data.subarray(i, i + this.chunkSize));
    }
    return chunks;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// File Sync Engine (SyncThing-style)
// ═══════════════════════════════════════════════════════════════════════════

export class SyncEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.folders = new Map();
    this.peers = new Map();
    this.deviceId = options.deviceId || randomBytes(16).toString('hex');
    this.scanInterval = options.scanInterval || 60000; // 1 minute
    this.ignorePatterns = options.ignorePatterns || [
      '.git', 'node_modules', '.DS_Store', 'Thumbs.db'
    ];
  }

  /**
   * Add a folder to sync
   */
  addFolder(id, path, options = {}) {
    const folder = {
      id,
      path,
      label: options.label || id,
      type: options.type || 'sendreceive', // 'sendreceive', 'sendonly', 'receiveonly'
      peers: options.peers || [],
      rescanInterval: options.rescanInterval || this.scanInterval,
      versioning: options.versioning || null,
      index: new Map(),
      lastScan: null
    };

    this.folders.set(id, folder);
    this.emit('folder:added', folder);

    // Initial scan
    this._scanFolder(folder);

    return folder;
  }

  /**
   * Scan folder for changes
   */
  _scanFolder(folder) {
    const now = Date.now();
    const changes = [];

    const scan = (dirPath, relativePath = '') => {
      const entries = readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (this._shouldIgnore(entry.name)) continue;

        const fullPath = join(dirPath, entry.name);
        const relPath = join(relativePath, entry.name);

        if (entry.isDirectory()) {
          scan(fullPath, relPath);
        } else if (entry.isFile()) {
          const stats = statSync(fullPath);
          const existing = folder.index.get(relPath);
          const hash = this._quickHash(fullPath);

          if (!existing || existing.hash !== hash || existing.mtime !== stats.mtime.getTime()) {
            folder.index.set(relPath, {
              path: relPath,
              size: stats.size,
              mtime: stats.mtime.getTime(),
              hash,
              scanned: now
            });

            changes.push({
              type: existing ? 'modified' : 'added',
              path: relPath,
              size: stats.size
            });
          }
        }
      }
    };

    scan(folder.path);

    // Detect deletions
    for (const [path, info] of folder.index) {
      if (info.scanned !== now) {
        changes.push({ type: 'deleted', path });
        folder.index.delete(path);
      }
    }

    folder.lastScan = now;

    if (changes.length > 0) {
      this.emit('folder:changes', { folderId: folder.id, changes });
    }

    return changes;
  }

  /**
   * Quick hash for change detection
   */
  _quickHash(filePath) {
    const content = readFileSync(filePath);
    return createHash('xxhash64')
      ? createHash('xxhash64').update(content).digest('hex')
      : createHash('md5').update(content).digest('hex');
  }

  /**
   * Check if path should be ignored
   */
  _shouldIgnore(name) {
    return this.ignorePatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(name);
      }
      return name === pattern;
    });
  }

  /**
   * Get sync status
   */
  getStatus() {
    const folders = [];
    for (const [id, folder] of this.folders) {
      folders.push({
        id,
        path: folder.path,
        label: folder.label,
        type: folder.type,
        files: folder.index.size,
        lastScan: folder.lastScan ? new Date(folder.lastScan).toISOString() : null
      });
    }
    return {
      deviceId: this.deviceId,
      folders,
      peers: Array.from(this.peers.values())
    };
  }

  /**
   * Add a peer device
   */
  addPeer(deviceId, options = {}) {
    const peer = {
      deviceId,
      name: options.name || deviceId.substring(0, 8),
      addresses: options.addresses || [],
      connected: false,
      lastSeen: null
    };
    this.peers.set(deviceId, peer);
    this.emit('peer:added', peer);
    return peer;
  }

  /**
   * Start continuous sync
   */
  start() {
    for (const [id, folder] of this.folders) {
      folder.intervalId = setInterval(() => {
        this._scanFolder(folder);
      }, folder.rescanInterval);
    }
    this.emit('started');
  }

  /**
   * Stop sync
   */
  stop() {
    for (const [id, folder] of this.folders) {
      if (folder.intervalId) {
        clearInterval(folder.intervalId);
        folder.intervalId = null;
      }
    }
    this.emit('stopped');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Secure Delete (SDelete-style)
// ═══════════════════════════════════════════════════════════════════════════

export class SecureDelete {
  constructor(options = {}) {
    this.passes = options.passes || 3; // DoD 5220.22-M standard
    this.patterns = options.patterns || [
      () => Buffer.alloc(1, 0x00), // All zeros
      () => Buffer.alloc(1, 0xFF), // All ones
      () => randomBytes(1)          // Random
    ];
  }

  /**
   * Securely delete a file
   */
  async deleteFile(filePath) {
    if (!existsSync(filePath)) {
      throw new Error('File not found');
    }

    const stats = statSync(filePath);
    const size = stats.size;

    // Multiple overwrite passes
    for (let pass = 0; pass < this.passes; pass++) {
      const pattern = this.patterns[pass % this.patterns.length];
      const fd = require('fs').openSync(filePath, 'r+');

      for (let i = 0; i < size; i++) {
        require('fs').writeSync(fd, pattern(), 0, 1, i);
      }

      require('fs').closeSync(fd);
    }

    // Final delete
    unlinkSync(filePath);

    return { path: filePath, size, passes: this.passes };
  }

  /**
   * Securely delete a directory
   */
  async deleteDirectory(dirPath) {
    if (!existsSync(dirPath)) {
      throw new Error('Directory not found');
    }

    const stats = { files: 0, directories: 0, size: 0 };

    const processDir = async (path) => {
      const entries = readdirSync(path, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(path, entry.name);

        if (entry.isDirectory()) {
          await processDir(fullPath);
          require('fs').rmdirSync(fullPath);
          stats.directories++;
        } else {
          const result = await this.deleteFile(fullPath);
          stats.files++;
          stats.size += result.size;
        }
      }
    };

    await processDir(dirPath);
    require('fs').rmdirSync(dirPath);
    stats.directories++;

    return stats;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Export All
// ═══════════════════════════════════════════════════════════════════════════

export default {
  EncryptedVault,
  BackupEngine,
  SecureTransfer,
  SyncEngine,
  SecureDelete
};

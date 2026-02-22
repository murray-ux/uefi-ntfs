/**
 * CHUNK MANAGER
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Copyright 2025 murray-ux
 * SPDX-License-Identifier: Apache-2.0
 *
 * Master Generation Skeleton Ecosystem - Chunk I/O, caching, and management
 *
 * Features:
 *   - Deterministic cache key generation
 *   - LRU cache eviction
 *   - Disk persistence
 *   - Chunk boundary handling
 *   - Neighbor coordination
 *
 * GENESIS 2.0 — Forbidden Ninja City
 *
 * @module CHUNK_MANAGER
 * @author murray-ux <Founder & Lead Developer>
 * @version 1.0.0
 * @license Apache-2.0
 */

import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';

// ══════════════════════════════════════════════════════════════════════════════
// LRU CACHE
// ══════════════════════════════════════════════════════════════════════════════

class LRUCache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return undefined;

    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);

    return value;
  }

  set(key, value) {
    // Remove if exists (to update position)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest if at capacity
    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, value);
  }

  has(key) {
    return this.cache.has(key);
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }

  keys() {
    return Array.from(this.cache.keys());
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CHUNK DATA
// ══════════════════════════════════════════════════════════════════════════════

class ChunkData {
  constructor(coords, data = {}) {
    this.coords = { x: coords.x, y: coords.y, z: coords.z || 0 };
    this.cacheKey = data.cacheKey || null;
    this.generatedAt = data.generatedAt || Date.now();
    this.version = data.version || '1.0.0';

    // Layer outputs
    this.layers = {
      0: data.layers?.[0] || null, // Config
      1: data.layers?.[1] || null, // Spatial
      2: data.layers?.[2] || null, // Topology
      3: data.layers?.[3] || null, // Mesh
      4: data.layers?.[4] || null, // Assets
      5: data.layers?.[5] || null  // World
    };

    // Boundary data for seamless generation
    this.boundaries = {
      left: data.boundaries?.left || [],
      right: data.boundaries?.right || [],
      top: data.boundaries?.top || [],
      bottom: data.boundaries?.bottom || []
    };

    // Metadata
    this.metadata = data.metadata || {};
  }

  setLayerOutput(layerId, output) {
    this.layers[layerId] = output;
    return this;
  }

  getLayerOutput(layerId) {
    return this.layers[layerId];
  }

  setBoundary(side, data) {
    this.boundaries[side] = data;
    return this;
  }

  getBoundary(side) {
    return this.boundaries[side];
  }

  isComplete() {
    return Object.values(this.layers).every(l => l !== null);
  }

  toJSON() {
    return {
      coords: this.coords,
      cacheKey: this.cacheKey,
      generatedAt: this.generatedAt,
      version: this.version,
      layers: this.layers,
      boundaries: this.boundaries,
      metadata: this.metadata
    };
  }

  static fromJSON(json) {
    return new ChunkData(json.coords, json);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CHUNK MANAGER
// ══════════════════════════════════════════════════════════════════════════════

class ChunkManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.cacheDir = options.cacheDir || './level_creator/cache';
    this.maxMemoryChunks = options.maxMemoryChunks || 50;
    this.maxDiskChunks = options.maxDiskChunks || 500;
    this.version = options.version || '1.0.0';

    // In-memory cache
    this.memoryCache = new LRUCache(this.maxMemoryChunks);

    // Track disk cache
    this.diskIndex = new Map(); // cacheKey -> filename

    // Initialize
    this._ensureCacheDir();
    this._loadDiskIndex();

    this.statistics = {
      memoryHits: 0,
      diskHits: 0,
      misses: 0,
      writes: 0
    };
  }

  _ensureCacheDir() {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  _loadDiskIndex() {
    try {
      const files = readdirSync(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.chunk.json')) {
          const cacheKey = file.replace('.chunk.json', '');
          this.diskIndex.set(cacheKey, file);
        }
      }
    } catch (e) {
      // Directory might not exist yet
    }
  }

  _getFilePath(cacheKey) {
    return join(this.cacheDir, `${cacheKey}.chunk.json`);
  }

  generateCacheKey(masterSeed, coords, contentType, configHash) {
    const input = JSON.stringify({
      masterSeed,
      coords,
      contentType,
      configHash,
      version: this.version
    });
    return createHash('sha256').update(input).digest('hex').substring(0, 32);
  }

  async get(cacheKey) {
    // Check memory cache first
    if (this.memoryCache.has(cacheKey)) {
      this.statistics.memoryHits++;
      this.emit('cache:hit', { type: 'memory', cacheKey });
      return this.memoryCache.get(cacheKey);
    }

    // Check disk cache
    if (this.diskIndex.has(cacheKey)) {
      try {
        const filePath = this._getFilePath(cacheKey);
        const data = JSON.parse(readFileSync(filePath, 'utf-8'));
        const chunk = ChunkData.fromJSON(data);

        // Promote to memory cache
        this.memoryCache.set(cacheKey, chunk);

        this.statistics.diskHits++;
        this.emit('cache:hit', { type: 'disk', cacheKey });
        return chunk;
      } catch (e) {
        // File corrupted or missing, remove from index
        this.diskIndex.delete(cacheKey);
      }
    }

    this.statistics.misses++;
    this.emit('cache:miss', { cacheKey });
    return null;
  }

  async set(cacheKey, chunk) {
    // Store in memory
    this.memoryCache.set(cacheKey, chunk);

    // Store on disk
    try {
      const filePath = this._getFilePath(cacheKey);
      writeFileSync(filePath, JSON.stringify(chunk.toJSON(), null, 2));
      this.diskIndex.set(cacheKey, `${cacheKey}.chunk.json`);

      // Evict old disk chunks if needed
      this._evictDiskChunks();

      this.statistics.writes++;
      this.emit('cache:write', { cacheKey });
    } catch (e) {
      this.emit('error', { error: e.message, cacheKey });
    }

    return chunk;
  }

  async has(cacheKey) {
    return this.memoryCache.has(cacheKey) || this.diskIndex.has(cacheKey);
  }

  async delete(cacheKey) {
    this.memoryCache.delete(cacheKey);

    if (this.diskIndex.has(cacheKey)) {
      try {
        unlinkSync(this._getFilePath(cacheKey));
      } catch (e) {
        // Ignore
      }
      this.diskIndex.delete(cacheKey);
    }
  }

  async clear() {
    this.memoryCache.clear();

    for (const [cacheKey] of this.diskIndex) {
      try {
        unlinkSync(this._getFilePath(cacheKey));
      } catch (e) {
        // Ignore
      }
    }
    this.diskIndex.clear();

    this.statistics = {
      memoryHits: 0,
      diskHits: 0,
      misses: 0,
      writes: 0
    };
  }

  _evictDiskChunks() {
    if (this.diskIndex.size <= this.maxDiskChunks) return;

    // Get file stats and sort by mtime
    const files = [];
    for (const [cacheKey, filename] of this.diskIndex) {
      try {
        const filePath = this._getFilePath(cacheKey);
        const stats = statSync(filePath);
        files.push({ cacheKey, mtime: stats.mtime.getTime() });
      } catch (e) {
        // File might not exist
        this.diskIndex.delete(cacheKey);
      }
    }

    // Sort oldest first
    files.sort((a, b) => a.mtime - b.mtime);

    // Delete oldest until under limit
    const toDelete = files.slice(0, this.diskIndex.size - this.maxDiskChunks);
    for (const { cacheKey } of toDelete) {
      try {
        unlinkSync(this._getFilePath(cacheKey));
      } catch (e) {
        // Ignore
      }
      this.diskIndex.delete(cacheKey);
    }
  }

  getStatistics() {
    return {
      ...this.statistics,
      memorySize: this.memoryCache.size(),
      diskSize: this.diskIndex.size
    };
  }

  // Get neighbor chunk coordinates
  getNeighborCoords(coords) {
    return {
      left: { x: coords.x - 1, y: coords.y, z: coords.z },
      right: { x: coords.x + 1, y: coords.y, z: coords.z },
      top: { x: coords.x, y: coords.y - 1, z: coords.z },
      bottom: { x: coords.x, y: coords.y + 1, z: coords.z }
    };
  }

  // Get boundary data from neighbor chunks
  async getNeighborBoundaries(coords, generateCacheKey) {
    const neighbors = this.getNeighborCoords(coords);
    const boundaries = {};

    for (const [side, neighborCoords] of Object.entries(neighbors)) {
      const cacheKey = generateCacheKey(neighborCoords);
      const chunk = await this.get(cacheKey);

      if (chunk) {
        // Get opposite boundary
        const oppositeSide = {
          left: 'right',
          right: 'left',
          top: 'bottom',
          bottom: 'top'
        }[side];

        boundaries[side] = chunk.getBoundary(oppositeSide);
      }
    }

    return boundaries;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export {
  LRUCache,
  ChunkData,
  ChunkManager
};

export default ChunkManager;

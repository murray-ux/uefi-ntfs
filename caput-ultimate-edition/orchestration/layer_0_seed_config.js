/**
 * LAYER 0: SEED & CONFIGURATION
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Copyright 2025 murray-ux
 * SPDX-License-Identifier: Apache-2.0
 *
 * Master Generation Skeleton Ecosystem - Deterministic randomness and global constraints
 *
 * GENESIS 2.0 — Forbidden Ninja City
 *
 * @module LAYER_0_SEED_CONFIG
 * @author murray-ux <Founder & Lead Developer>
 * @version 1.0.0
 * @license Apache-2.0
 */

import { createHash, randomBytes } from 'crypto';
import { EventEmitter } from 'events';

// ══════════════════════════════════════════════════════════════════════════════
// PRNG - Seeded Pseudo-Random Number Generator
// ══════════════════════════════════════════════════════════════════════════════

class SeededPRNG {
  constructor(seed) {
    this.seed = typeof seed === 'string' ? this._hashString(seed) : seed;
    this.state = this.seed;
  }

  _hashString(str) {
    const hash = createHash('sha256').update(str).digest();
    return hash.readUInt32BE(0);
  }

  // Mulberry32 PRNG - fast, good distribution
  next() {
    let t = this.state += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  // Random integer in range [min, max]
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  // Random float in range [min, max]
  nextFloat(min, max) {
    return this.next() * (max - min) + min;
  }

  // Random boolean with probability
  nextBool(probability = 0.5) {
    return this.next() < probability;
  }

  // Random element from array
  nextElement(array) {
    return array[this.nextInt(0, array.length - 1)];
  }

  // Shuffle array in place
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Gaussian distribution (Box-Muller transform)
  nextGaussian(mean = 0, stdDev = 1) {
    const u1 = this.next();
    const u2 = this.next();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  // Clone with derived seed
  derive(modifier) {
    const derivedSeed = this._hashString(`${this.seed}:${modifier}`);
    return new SeededPRNG(derivedSeed);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SEED MANAGER - Layer seed derivation
// ══════════════════════════════════════════════════════════════════════════════

class SeedManager extends EventEmitter {
  constructor(masterSeed = null) {
    super();
    this.masterSeed = masterSeed || this._generateMasterSeed();
    this.layerSeeds = new Map();
    this.chunkSeeds = new Map();
    this._initializeLayerSeeds();
  }

  _generateMasterSeed() {
    return randomBytes(8).readBigUInt64BE().toString();
  }

  _hashSeed(input) {
    return createHash('sha256').update(String(input)).digest('hex').substring(0, 16);
  }

  _initializeLayerSeeds() {
    for (let layer = 0; layer <= 5; layer++) {
      const layerSeed = this._hashSeed(`${this.masterSeed}:layer:${layer}`);
      this.layerSeeds.set(layer, layerSeed);
    }
    this.emit('initialized', { masterSeed: this.masterSeed, layers: 6 });
  }

  getLayerSeed(layerId) {
    if (!this.layerSeeds.has(layerId)) {
      throw new Error(`Invalid layer ID: ${layerId}`);
    }
    return this.layerSeeds.get(layerId);
  }

  getChunkSeed(layerId, chunkX, chunkY, chunkZ = 0) {
    const key = `${layerId}:${chunkX}:${chunkY}:${chunkZ}`;
    if (!this.chunkSeeds.has(key)) {
      const layerSeed = this.getLayerSeed(layerId);
      const chunkSeed = this._hashSeed(`${layerSeed}:chunk:${chunkX}:${chunkY}:${chunkZ}`);
      this.chunkSeeds.set(key, chunkSeed);
    }
    return this.chunkSeeds.get(key);
  }

  getPRNG(layerId, chunkX = 0, chunkY = 0, chunkZ = 0) {
    const seed = this.getChunkSeed(layerId, chunkX, chunkY, chunkZ);
    return new SeededPRNG(seed);
  }

  exportState() {
    return {
      masterSeed: this.masterSeed,
      layerSeeds: Object.fromEntries(this.layerSeeds),
      version: '1.0.0'
    };
  }

  static fromState(state) {
    const manager = new SeedManager(state.masterSeed);
    return manager;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG = {
  // Global parameters
  density: 0.5,
  scale: 1.0,
  variety: 0.7,
  qualityLevel: 'medium', // low, medium, high, ultra

  // Chunk settings
  chunkSize: 64,
  chunkHeight: 32,
  boundaryOverlap: 2,

  // Content types
  contentType: 'generic', // creature, structure, terrain, vegetation

  // Layer-specific defaults
  layers: {
    0: { enabled: true },
    1: {
      enabled: true,
      samplingMethod: 'poisson', // poisson, grid, noise
      minSpacing: 2.0,
      maxPoints: 1000
    },
    2: {
      enabled: true,
      connectionMethod: 'mst', // mst, delaunay, proximity
      maxConnections: 6,
      hierarchyDepth: 5
    },
    3: {
      enabled: true,
      meshMethod: 'marching_cubes', // marching_cubes, convex_hull, implicit
      lodLevels: 3,
      targetTriangles: 10000
    },
    4: {
      enabled: true,
      textureResolution: 1024,
      animationFPS: 30,
      audioEnabled: true
    },
    5: {
      enabled: true,
      placementMethod: 'raycast', // raycast, grid, random
      groupingEnabled: true,
      interactionGraph: true
    }
  },

  // Constraints
  constraints: {
    forbiddenZones: [],
    slopeLimit: 45, // degrees
    minHeight: 0,
    maxHeight: 100,
    exclusionRadius: 1.0
  }
};

class ConfigManager extends EventEmitter {
  constructor(userConfig = {}) {
    super();
    this.config = this._mergeConfig(DEFAULT_CONFIG, userConfig);
    this.validators = new Map();
    this._registerValidators();
  }

  _mergeConfig(base, override) {
    const result = { ...base };
    for (const [key, value] of Object.entries(override)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this._mergeConfig(base[key] || {}, value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  _registerValidators() {
    this.validators.set('density', (v) => v >= 0 && v <= 1);
    this.validators.set('scale', (v) => v > 0 && v <= 100);
    this.validators.set('variety', (v) => v >= 0 && v <= 1);
    this.validators.set('qualityLevel', (v) => ['low', 'medium', 'high', 'ultra'].includes(v));
    this.validators.set('chunkSize', (v) => v >= 16 && v <= 256 && Number.isInteger(v));
    this.validators.set('contentType', (v) => ['generic', 'creature', 'structure', 'terrain', 'vegetation'].includes(v));
  }

  get(path) {
    const keys = path.split('.');
    let value = this.config;
    for (const key of keys) {
      if (value === undefined) return undefined;
      value = value[key];
    }
    return value;
  }

  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this.config;

    for (const key of keys) {
      if (!(key in target)) target[key] = {};
      target = target[key];
    }

    // Validate if validator exists
    if (this.validators.has(lastKey)) {
      if (!this.validators.get(lastKey)(value)) {
        throw new Error(`Invalid value for ${path}: ${value}`);
      }
    }

    const oldValue = target[lastKey];
    target[lastKey] = value;
    this.emit('change', { path, oldValue, newValue: value });
    return this;
  }

  getLayerConfig(layerId) {
    return this.config.layers[layerId] || {};
  }

  validate() {
    const errors = [];

    for (const [key, validator] of this.validators) {
      const value = this.get(key);
      if (value !== undefined && !validator(value)) {
        errors.push(`Invalid ${key}: ${value}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  exportConfig() {
    return JSON.parse(JSON.stringify(this.config));
  }

  static fromJSON(json) {
    const config = typeof json === 'string' ? JSON.parse(json) : json;
    return new ConfigManager(config);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTRAINTS GRAPH
// ══════════════════════════════════════════════════════════════════════════════

class ConstraintsGraph {
  constructor() {
    this.rules = [];
    this.forbiddenZones = [];
    this.dependencies = new Map();
  }

  addRule(rule) {
    this.rules.push({
      id: rule.id || `rule_${this.rules.length}`,
      type: rule.type, // 'spacing', 'height', 'slope', 'exclusion', 'dependency'
      params: rule.params,
      priority: rule.priority || 0
    });
    return this;
  }

  addForbiddenZone(zone) {
    this.forbiddenZones.push({
      type: zone.type || 'sphere', // sphere, box, cylinder
      position: zone.position,
      size: zone.size,
      reason: zone.reason
    });
    return this;
  }

  addDependency(sourceType, targetType, relationship) {
    if (!this.dependencies.has(sourceType)) {
      this.dependencies.set(sourceType, []);
    }
    this.dependencies.get(sourceType).push({
      target: targetType,
      relationship, // 'near', 'far', 'above', 'below', 'connected'
      params: relationship.params || {}
    });
    return this;
  }

  checkPoint(point, type = null) {
    // Check forbidden zones
    for (const zone of this.forbiddenZones) {
      if (this._isInZone(point, zone)) {
        return { valid: false, reason: `In forbidden zone: ${zone.reason}` };
      }
    }

    // Check rules
    for (const rule of this.rules.sort((a, b) => b.priority - a.priority)) {
      const result = this._checkRule(point, rule, type);
      if (!result.valid) return result;
    }

    return { valid: true };
  }

  _isInZone(point, zone) {
    const dx = point.x - zone.position.x;
    const dy = point.y - zone.position.y;
    const dz = (point.z || 0) - (zone.position.z || 0);

    switch (zone.type) {
      case 'sphere':
        return Math.sqrt(dx*dx + dy*dy + dz*dz) <= zone.size;
      case 'box':
        return Math.abs(dx) <= zone.size.x/2 &&
               Math.abs(dy) <= zone.size.y/2 &&
               Math.abs(dz) <= (zone.size.z || zone.size.y)/2;
      case 'cylinder':
        return Math.sqrt(dx*dx + dy*dy) <= zone.size.radius &&
               Math.abs(dz) <= zone.size.height/2;
      default:
        return false;
    }
  }

  _checkRule(point, rule, type) {
    switch (rule.type) {
      case 'height':
        if (point.z < rule.params.min || point.z > rule.params.max) {
          return { valid: false, reason: `Height ${point.z} outside range [${rule.params.min}, ${rule.params.max}]` };
        }
        break;
      case 'slope':
        if (point.slope && point.slope > rule.params.maxSlope) {
          return { valid: false, reason: `Slope ${point.slope} exceeds max ${rule.params.maxSlope}` };
        }
        break;
    }
    return { valid: true };
  }

  exportGraph() {
    return {
      rules: this.rules,
      forbiddenZones: this.forbiddenZones,
      dependencies: Object.fromEntries(this.dependencies)
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION PACKET - Per-chunk generation context
// ══════════════════════════════════════════════════════════════════════════════

class ConfigPacket {
  constructor(seedManager, configManager, chunkCoords) {
    this.timestamp = Date.now();
    this.version = '1.0.0';

    // Chunk identification
    this.chunk = {
      x: chunkCoords.x,
      y: chunkCoords.y,
      z: chunkCoords.z || 0
    };

    // Seeds for each layer
    this.seeds = {};
    for (let layer = 0; layer <= 5; layer++) {
      this.seeds[layer] = seedManager.getChunkSeed(layer, this.chunk.x, this.chunk.y, this.chunk.z);
    }

    // Bounds
    const chunkSize = configManager.get('chunkSize');
    this.bounds = {
      minX: this.chunk.x * chunkSize,
      maxX: (this.chunk.x + 1) * chunkSize,
      minY: this.chunk.y * chunkSize,
      maxY: (this.chunk.y + 1) * chunkSize,
      minZ: this.chunk.z * (configManager.get('chunkHeight') || chunkSize),
      maxZ: (this.chunk.z + 1) * (configManager.get('chunkHeight') || chunkSize)
    };

    // Configuration snapshot
    this.config = configManager.exportConfig();

    // Constraints
    this.constraints = configManager.get('constraints');
  }

  getPRNG(layerId) {
    return new SeededPRNG(this.seeds[layerId]);
  }

  getCacheKey() {
    return createHash('sha256')
      .update(JSON.stringify({
        seeds: this.seeds[0], // Master seed derivative
        chunk: this.chunk,
        version: this.version,
        contentType: this.config.contentType,
        configHash: createHash('md5').update(JSON.stringify(this.config)).digest('hex')
      }))
      .digest('hex');
  }

  toJSON() {
    return {
      timestamp: this.timestamp,
      version: this.version,
      chunk: this.chunk,
      seeds: this.seeds,
      bounds: this.bounds,
      config: this.config,
      constraints: this.constraints,
      cacheKey: this.getCacheKey()
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export {
  SeededPRNG,
  SeedManager,
  ConfigManager,
  ConstraintsGraph,
  ConfigPacket,
  DEFAULT_CONFIG
};

export default {
  SeededPRNG,
  SeedManager,
  ConfigManager,
  ConstraintsGraph,
  ConfigPacket,
  DEFAULT_CONFIG
};

/**
 * LAYER 1: SPATIAL DISTRIBUTION
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Copyright 2025 murray-ux
 * SPDX-License-Identifier: Apache-2.0
 *
 * Master Generation Skeleton Ecosystem - Point clouds, density maps, spatial sampling
 *
 * Techniques:
 *   - Poisson Disk Sampling (even distribution with minimum spacing)
 *   - Perlin/Simplex Noise (smooth, organic density variation)
 *   - Grid + Jitter (structured placement with randomness)
 *   - Voronoi Regions (territory-based allocation)
 *
 * GENESIS 2.0 — Forbidden Ninja City
 *
 * @module LAYER_1_SPATIAL_DIST
 * @author murray-ux <Founder & Lead Developer>
 * @version 1.0.0
 * @license Apache-2.0
 */

import { EventEmitter } from 'events';

// ══════════════════════════════════════════════════════════════════════════════
// NOISE GENERATORS
// ══════════════════════════════════════════════════════════════════════════════

class PerlinNoise {
  constructor(prng) {
    this.prng = prng;
    this.permutation = this._generatePermutation();
    this.gradients = this._generateGradients();
  }

  _generatePermutation() {
    const p = Array.from({ length: 256 }, (_, i) => i);
    this.prng.shuffle(p);
    return [...p, ...p]; // Duplicate for wrapping
  }

  _generateGradients() {
    const grads = [];
    for (let i = 0; i < 256; i++) {
      const angle = this.prng.next() * Math.PI * 2;
      grads.push({ x: Math.cos(angle), y: Math.sin(angle) });
    }
    return grads;
  }

  _fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  _lerp(a, b, t) {
    return a + t * (b - a);
  }

  _dot(grad, x, y) {
    return grad.x * x + grad.y * y;
  }

  noise2D(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this._fade(xf);
    const v = this._fade(yf);

    const aa = this.permutation[this.permutation[X] + Y];
    const ab = this.permutation[this.permutation[X] + Y + 1];
    const ba = this.permutation[this.permutation[X + 1] + Y];
    const bb = this.permutation[this.permutation[X + 1] + Y + 1];

    const x1 = this._lerp(
      this._dot(this.gradients[aa % 256], xf, yf),
      this._dot(this.gradients[ba % 256], xf - 1, yf),
      u
    );
    const x2 = this._lerp(
      this._dot(this.gradients[ab % 256], xf, yf - 1),
      this._dot(this.gradients[bb % 256], xf - 1, yf - 1),
      u
    );

    return this._lerp(x1, x2, v);
  }

  // Fractal Brownian Motion for more natural noise
  fbm(x, y, octaves = 4, persistence = 0.5, lacunarity = 2.0) {
    let total = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }
}

class SimplexNoise {
  constructor(prng) {
    this.prng = prng;
    this.perm = this._generatePermutation();
    this.F2 = 0.5 * (Math.sqrt(3) - 1);
    this.G2 = (3 - Math.sqrt(3)) / 6;
  }

  _generatePermutation() {
    const p = Array.from({ length: 256 }, (_, i) => i);
    this.prng.shuffle(p);
    return [...p, ...p];
  }

  _grad(hash, x, y) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
  }

  noise2D(x, y) {
    const s = (x + y) * this.F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);

    const t = (i + j) * this.G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;

    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }

    const x1 = x0 - i1 + this.G2;
    const y1 = y0 - j1 + this.G2;
    const x2 = x0 - 1 + 2 * this.G2;
    const y2 = y0 - 1 + 2 * this.G2;

    const ii = i & 255;
    const jj = j & 255;

    let n0 = 0, n1 = 0, n2 = 0;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * this._grad(this.perm[ii + this.perm[jj]], x0, y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * this._grad(this.perm[ii + i1 + this.perm[jj + j1]], x1, y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * this._grad(this.perm[ii + 1 + this.perm[jj + 1]], x2, y2);
    }

    return 70 * (n0 + n1 + n2);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// POISSON DISK SAMPLING
// ══════════════════════════════════════════════════════════════════════════════

class PoissonDiskSampler {
  constructor(prng, bounds, minDistance, maxAttempts = 30) {
    this.prng = prng;
    this.bounds = bounds;
    this.minDistance = minDistance;
    this.maxAttempts = maxAttempts;
    this.cellSize = minDistance / Math.sqrt(2);
    this.gridWidth = Math.ceil((bounds.maxX - bounds.minX) / this.cellSize);
    this.gridHeight = Math.ceil((bounds.maxY - bounds.minY) / this.cellSize);
    this.grid = new Array(this.gridWidth * this.gridHeight).fill(null);
    this.points = [];
    this.activeList = [];
  }

  _gridIndex(x, y) {
    const gx = Math.floor((x - this.bounds.minX) / this.cellSize);
    const gy = Math.floor((y - this.bounds.minY) / this.cellSize);
    return gy * this.gridWidth + gx;
  }

  _isValid(x, y) {
    if (x < this.bounds.minX || x >= this.bounds.maxX ||
        y < this.bounds.minY || y >= this.bounds.maxY) {
      return false;
    }

    const gx = Math.floor((x - this.bounds.minX) / this.cellSize);
    const gy = Math.floor((y - this.bounds.minY) / this.cellSize);

    // Check neighboring cells
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = gx + dx;
        const ny = gy + dy;
        if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
          const idx = ny * this.gridWidth + nx;
          const neighbor = this.grid[idx];
          if (neighbor !== null) {
            const dist = Math.sqrt((x - neighbor.x) ** 2 + (y - neighbor.y) ** 2);
            if (dist < this.minDistance) return false;
          }
        }
      }
    }
    return true;
  }

  _addPoint(x, y, metadata = {}) {
    const point = { x, y, ...metadata };
    this.points.push(point);
    this.activeList.push(point);
    this.grid[this._gridIndex(x, y)] = point;
    return point;
  }

  generate(densityMap = null, maxPoints = Infinity) {
    // Initial point
    const startX = this.prng.nextFloat(this.bounds.minX, this.bounds.maxX);
    const startY = this.prng.nextFloat(this.bounds.minY, this.bounds.maxY);
    this._addPoint(startX, startY);

    while (this.activeList.length > 0 && this.points.length < maxPoints) {
      const idx = this.prng.nextInt(0, this.activeList.length - 1);
      const point = this.activeList[idx];
      let found = false;

      for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
        const angle = this.prng.next() * Math.PI * 2;
        const radius = this.minDistance * (1 + this.prng.next());
        const nx = point.x + Math.cos(angle) * radius;
        const ny = point.y + Math.sin(angle) * radius;

        // Check density map
        if (densityMap) {
          const density = densityMap(nx, ny);
          if (this.prng.next() > density) continue;
        }

        if (this._isValid(nx, ny)) {
          this._addPoint(nx, ny);
          found = true;
          break;
        }
      }

      if (!found) {
        this.activeList.splice(idx, 1);
      }
    }

    return this.points;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// VORONOI REGIONS
// ══════════════════════════════════════════════════════════════════════════════

class VoronoiGenerator {
  constructor(prng, bounds) {
    this.prng = prng;
    this.bounds = bounds;
    this.sites = [];
  }

  generateSites(count) {
    this.sites = [];
    for (let i = 0; i < count; i++) {
      this.sites.push({
        x: this.prng.nextFloat(this.bounds.minX, this.bounds.maxX),
        y: this.prng.nextFloat(this.bounds.minY, this.bounds.maxY),
        id: i,
        type: this.prng.nextElement(['primary', 'secondary', 'tertiary'])
      });
    }
    return this.sites;
  }

  findNearestSite(x, y) {
    let nearest = null;
    let minDist = Infinity;

    for (const site of this.sites) {
      const dist = Math.sqrt((x - site.x) ** 2 + (y - site.y) ** 2);
      if (dist < minDist) {
        minDist = dist;
        nearest = site;
      }
    }

    return { site: nearest, distance: minDist };
  }

  getRegionMap(resolution = 1) {
    const width = Math.ceil((this.bounds.maxX - this.bounds.minX) / resolution);
    const height = Math.ceil((this.bounds.maxY - this.bounds.minY) / resolution);
    const map = new Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const worldX = this.bounds.minX + x * resolution;
        const worldY = this.bounds.minY + y * resolution;
        const { site, distance } = this.findNearestSite(worldX, worldY);
        map[y * width + x] = { siteId: site.id, distance };
      }
    }

    return { map, width, height, resolution };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DENSITY MAP
// ══════════════════════════════════════════════════════════════════════════════

class DensityMap {
  constructor(prng, bounds, config = {}) {
    this.prng = prng;
    this.bounds = bounds;
    this.noise = new PerlinNoise(prng);
    this.config = {
      baseFrequency: config.baseFrequency || 0.05,
      octaves: config.octaves || 4,
      persistence: config.persistence || 0.5,
      baseDensity: config.baseDensity || 0.5,
      ...config
    };
    this.modifiers = [];
  }

  addModifier(type, params) {
    this.modifiers.push({ type, params });
    return this;
  }

  sample(x, y) {
    // Base noise density
    let density = this.noise.fbm(
      x * this.config.baseFrequency,
      y * this.config.baseFrequency,
      this.config.octaves,
      this.config.persistence
    );

    // Normalize to 0-1
    density = (density + 1) / 2;

    // Apply base density
    density *= this.config.baseDensity;

    // Apply modifiers
    for (const mod of this.modifiers) {
      switch (mod.type) {
        case 'radial':
          const dx = x - mod.params.centerX;
          const dy = y - mod.params.centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const factor = Math.max(0, 1 - dist / mod.params.radius);
          density *= (mod.params.invert ? (1 - factor) : factor) * mod.params.strength + (1 - mod.params.strength);
          break;

        case 'gradient':
          const t = (mod.params.axis === 'x' ? x : y) - mod.params.start;
          const range = mod.params.end - mod.params.start;
          const grad = Math.max(0, Math.min(1, t / range));
          density *= mod.params.invert ? (1 - grad) : grad;
          break;

        case 'threshold':
          density = density > mod.params.value ? 1 : 0;
          break;
      }
    }

    return Math.max(0, Math.min(1, density));
  }

  generateHeatmap(resolution = 1) {
    const width = Math.ceil((this.bounds.maxX - this.bounds.minX) / resolution);
    const height = Math.ceil((this.bounds.maxY - this.bounds.minY) / resolution);
    const data = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const worldX = this.bounds.minX + x * resolution;
        const worldY = this.bounds.minY + y * resolution;
        data[y * width + x] = this.sample(worldX, worldY);
      }
    }

    return { data, width, height, resolution };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SPATIAL DISTRIBUTION ENGINE
// ══════════════════════════════════════════════════════════════════════════════

class SpatialDistributor extends EventEmitter {
  constructor(configPacket) {
    super();
    this.packet = configPacket;
    this.prng = configPacket.getPRNG(1);
    this.points = [];
    this.densityMap = null;
    this.statistics = {
      totalPoints: 0,
      acceptedPoints: 0,
      rejectedPoints: 0,
      generationTime: 0
    };
  }

  createDensityMap(config = {}) {
    this.densityMap = new DensityMap(this.prng.derive('density'), this.packet.bounds, config);
    return this.densityMap;
  }

  generate(method = 'poisson') {
    const startTime = Date.now();
    const layerConfig = this.packet.config.layers[1];
    const bounds = this.packet.bounds;

    this.emit('start', { method, bounds });

    switch (method) {
      case 'poisson':
        this._generatePoisson(layerConfig);
        break;
      case 'grid':
        this._generateGrid(layerConfig);
        break;
      case 'noise':
        this._generateNoise(layerConfig);
        break;
      default:
        throw new Error(`Unknown sampling method: ${method}`);
    }

    // Apply constraints
    this._applyConstraints();

    // Compute metadata
    this._computeMetadata();

    this.statistics.generationTime = Date.now() - startTime;
    this.statistics.totalPoints = this.points.length;

    this.emit('complete', {
      points: this.points.length,
      time: this.statistics.generationTime
    });

    return this.getOutput();
  }

  _generatePoisson(config) {
    const sampler = new PoissonDiskSampler(
      this.prng,
      this.packet.bounds,
      config.minSpacing || 2.0
    );

    const densityFn = this.densityMap
      ? (x, y) => this.densityMap.sample(x, y)
      : null;

    this.points = sampler.generate(densityFn, config.maxPoints || 1000);
  }

  _generateGrid(config) {
    const spacing = config.minSpacing || 2.0;
    const jitter = config.jitter || 0.3;
    const bounds = this.packet.bounds;

    for (let y = bounds.minY; y < bounds.maxY; y += spacing) {
      for (let x = bounds.minX; x < bounds.maxX; x += spacing) {
        // Apply jitter
        const jx = x + (this.prng.next() - 0.5) * spacing * jitter;
        const jy = y + (this.prng.next() - 0.5) * spacing * jitter;

        // Check density
        if (this.densityMap && this.prng.next() > this.densityMap.sample(jx, jy)) {
          continue;
        }

        this.points.push({ x: jx, y: jy });
      }
    }
  }

  _generateNoise(config) {
    const noise = new SimplexNoise(this.prng);
    const threshold = config.threshold || 0.3;
    const resolution = config.resolution || 1.0;
    const bounds = this.packet.bounds;

    for (let y = bounds.minY; y < bounds.maxY; y += resolution) {
      for (let x = bounds.minX; x < bounds.maxX; x += resolution) {
        const value = (noise.noise2D(x * 0.1, y * 0.1) + 1) / 2;
        if (value > threshold) {
          this.points.push({ x, y, noiseValue: value });
        }
      }
    }
  }

  _applyConstraints() {
    const constraints = this.packet.constraints;
    if (!constraints) return;

    this.points = this.points.filter(point => {
      // Height constraint
      if (point.z !== undefined) {
        if (point.z < constraints.minHeight || point.z > constraints.maxHeight) {
          this.statistics.rejectedPoints++;
          return false;
        }
      }

      // Forbidden zones (simplified check)
      for (const zone of constraints.forbiddenZones || []) {
        const dx = point.x - zone.x;
        const dy = point.y - zone.y;
        if (Math.sqrt(dx * dx + dy * dy) < zone.radius) {
          this.statistics.rejectedPoints++;
          return false;
        }
      }

      this.statistics.acceptedPoints++;
      return true;
    });
  }

  _computeMetadata() {
    // Add height, type, weight to each point
    for (const point of this.points) {
      // Default height from noise
      if (point.z === undefined) {
        const heightNoise = new PerlinNoise(this.prng.derive('height'));
        point.z = heightNoise.fbm(point.x * 0.02, point.y * 0.02) * 10;
      }

      // Assign type based on position/noise
      point.type = this.prng.nextElement(['primary', 'secondary', 'tertiary', 'detail']);

      // Assign weight (importance)
      point.weight = this.prng.nextFloat(0.5, 1.0);
      if (point.type === 'primary') point.weight *= 1.5;
    }
  }

  getOutput() {
    return {
      points: this.points,
      densityHeatmap: this.densityMap ? this.densityMap.generateHeatmap(2) : null,
      statistics: this.statistics,
      bounds: this.packet.bounds,
      cacheKey: this.packet.getCacheKey()
    };
  }

  // Boundary handling for seamless generation
  getBoundaryPoints(side, overlap = 2) {
    const bounds = this.packet.bounds;
    const margin = overlap * (this.packet.config.layers[1].minSpacing || 2);

    return this.points.filter(p => {
      switch (side) {
        case 'left': return p.x < bounds.minX + margin;
        case 'right': return p.x > bounds.maxX - margin;
        case 'top': return p.y < bounds.minY + margin;
        case 'bottom': return p.y > bounds.maxY - margin;
        default: return false;
      }
    });
  }

  injectBoundaryPoints(boundaryPoints) {
    // Used for seamless generation across chunks
    for (const p of boundaryPoints) {
      this.points.push({ ...p, fromNeighbor: true });
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export {
  PerlinNoise,
  SimplexNoise,
  PoissonDiskSampler,
  VoronoiGenerator,
  DensityMap,
  SpatialDistributor
};

export default SpatialDistributor;

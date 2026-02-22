#!/usr/bin/env node
/**
 * GENERATION MASTER
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Copyright 2025 murray-ux
 * SPDX-License-Identifier: Apache-2.0
 *
 * Master Generation Skeleton Ecosystem - Main orchestrator
 *
 * Orchestrates the full generation pipeline:
 *   Layer 0: Seed & Configuration
 *   Layer 1: Spatial Distribution
 *   Layer 2: Skeleton Topology
 *   Layer 3: Mesh & Geometry
 *   Layer 4: Asset & Animation
 *   Layer 5: World Integration
 *
 * GENESIS 2.0 — Forbidden Ninja City
 *
 * @module GENERATION_MASTER
 * @author murray-ux <Founder & Lead Developer>
 * @version 1.0.0
 * @license Apache-2.0
 */

import { EventEmitter } from 'events';
import { SeedManager, ConfigManager, ConfigPacket } from './layer_0_seed_config.js';
import SpatialDistributor from './layer_1_spatial_dist.js';
import TopologyBuilder from './layer_2_topology.js';
import MeshGenerator from './layer_3_mesh_geom.js';
import AssetGenerator from './layer_4_assets_anim.js';
import WorldIntegrator from './layer_5_world_integ.js';
import ChunkManager, { ChunkData } from './chunk_manager.js';

// ══════════════════════════════════════════════════════════════════════════════
// GENERATION PIPELINE
// ══════════════════════════════════════════════════════════════════════════════

class GenerationPipeline extends EventEmitter {
  constructor(options = {}) {
    super();

    this.seedManager = new SeedManager(options.masterSeed);
    this.configManager = new ConfigManager(options.config);
    this.chunkManager = new ChunkManager({
      cacheDir: options.cacheDir || './level_creator/cache',
      maxMemoryChunks: options.maxMemoryChunks || 50,
      maxDiskChunks: options.maxDiskChunks || 500
    });

    this.currentChunk = null;
    this.layerOutputs = {};

    this.statistics = {
      chunksGenerated: 0,
      cacheHits: 0,
      totalTime: 0,
      layerTimes: {}
    };
  }

  // Generate a single chunk
  async generateChunk(coords) {
    const startTime = Date.now();

    this.emit('chunk:start', { coords });

    // Create config packet for this chunk
    const packet = new ConfigPacket(
      this.seedManager,
      this.configManager,
      coords
    );

    const cacheKey = packet.getCacheKey();

    // Check cache
    const cached = await this.chunkManager.get(cacheKey);
    if (cached && cached.isComplete()) {
      this.statistics.cacheHits++;
      this.emit('chunk:cached', { coords, cacheKey });
      return cached;
    }

    // Create new chunk data
    const chunk = new ChunkData(coords, { cacheKey });

    // Get neighbor boundaries for seamless generation
    const neighborBoundaries = await this.chunkManager.getNeighborBoundaries(
      coords,
      (c) => new ConfigPacket(this.seedManager, this.configManager, c).getCacheKey()
    );

    // Run pipeline
    const outputs = await this._runPipeline(packet, neighborBoundaries);

    // Store outputs in chunk
    for (const [layerId, output] of Object.entries(outputs)) {
      chunk.setLayerOutput(parseInt(layerId), output);
    }

    // Extract and store boundaries
    if (outputs[1]) {
      chunk.setBoundary('left', outputs[1].points?.filter(p => p.x < packet.bounds.minX + 5) || []);
      chunk.setBoundary('right', outputs[1].points?.filter(p => p.x > packet.bounds.maxX - 5) || []);
      chunk.setBoundary('top', outputs[1].points?.filter(p => p.y < packet.bounds.minY + 5) || []);
      chunk.setBoundary('bottom', outputs[1].points?.filter(p => p.y > packet.bounds.maxY - 5) || []);
    }

    // Cache the chunk
    await this.chunkManager.set(cacheKey, chunk);

    const totalTime = Date.now() - startTime;
    this.statistics.chunksGenerated++;
    this.statistics.totalTime += totalTime;

    this.emit('chunk:complete', {
      coords,
      cacheKey,
      time: totalTime,
      outputs: Object.keys(outputs)
    });

    return chunk;
  }

  async _runPipeline(packet, neighborBoundaries = {}) {
    const outputs = {};

    // Layer 0: Configuration (already in packet)
    outputs[0] = packet.toJSON();
    this.emit('layer:complete', { layer: 0 });

    // Layer 1: Spatial Distribution
    const layer1Start = Date.now();
    const spatialDistributor = new SpatialDistributor(packet);

    // Inject neighbor boundary points
    for (const [side, points] of Object.entries(neighborBoundaries)) {
      if (points && points.length > 0) {
        spatialDistributor.injectBoundaryPoints(points);
      }
    }

    // Create density map based on config
    const densityConfig = packet.config.layers?.[1] || {};
    spatialDistributor.createDensityMap({
      baseDensity: packet.config.density || 0.5
    });

    outputs[1] = spatialDistributor.generate(densityConfig.samplingMethod || 'poisson');
    this.statistics.layerTimes[1] = Date.now() - layer1Start;
    this.emit('layer:complete', { layer: 1, time: this.statistics.layerTimes[1] });

    // Layer 2: Skeleton Topology
    const layer2Start = Date.now();
    const topologyBuilder = new TopologyBuilder(packet);
    const topologyConfig = packet.config.layers?.[2] || {};
    outputs[2] = topologyBuilder.build(outputs[1], topologyConfig.connectionMethod || 'mst');
    this.statistics.layerTimes[2] = Date.now() - layer2Start;
    this.emit('layer:complete', { layer: 2, time: this.statistics.layerTimes[2] });

    // Layer 3: Mesh & Geometry
    const layer3Start = Date.now();
    const meshGenerator = new MeshGenerator(packet);
    const meshConfig = packet.config.layers?.[3] || {};
    outputs[3] = meshGenerator.generate(outputs[2], meshConfig.meshMethod || 'implicit');
    this.statistics.layerTimes[3] = Date.now() - layer3Start;
    this.emit('layer:complete', { layer: 3, time: this.statistics.layerTimes[3] });

    // Layer 4: Asset & Animation
    const layer4Start = Date.now();
    const assetGenerator = new AssetGenerator(packet);
    outputs[4] = assetGenerator.generate(outputs[3], outputs[2]);
    this.statistics.layerTimes[4] = Date.now() - layer4Start;
    this.emit('layer:complete', { layer: 4, time: this.statistics.layerTimes[4] });

    // Layer 5: World Integration
    const layer5Start = Date.now();
    const worldIntegrator = new WorldIntegrator(packet);
    outputs[5] = worldIntegrator.integrate(outputs[4], outputs[3], outputs[2], outputs[1]);
    this.statistics.layerTimes[5] = Date.now() - layer5Start;
    this.emit('layer:complete', { layer: 5, time: this.statistics.layerTimes[5] });

    return outputs;
  }

  // Generate multiple chunks
  async generateRegion(startCoords, endCoords) {
    const chunks = [];

    for (let z = startCoords.z || 0; z <= (endCoords.z || 0); z++) {
      for (let y = startCoords.y; y <= endCoords.y; y++) {
        for (let x = startCoords.x; x <= endCoords.x; x++) {
          const chunk = await this.generateChunk({ x, y, z });
          chunks.push(chunk);
        }
      }
    }

    return chunks;
  }

  // Get statistics
  getStatistics() {
    return {
      ...this.statistics,
      cache: this.chunkManager.getStatistics(),
      config: this.configManager.exportConfig()
    };
  }

  // Export configuration
  exportConfig() {
    return {
      masterSeed: this.seedManager.masterSeed,
      config: this.configManager.exportConfig(),
      version: '1.0.0'
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CLI INTERFACE
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const options = {
    masterSeed: null,
    contentType: 'generic',
    density: 0.5,
    chunkX: 0,
    chunkY: 0,
    chunkZ: 0,
    outputFormat: 'json',
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--master_seed':
      case '-s':
        options.masterSeed = args[++i];
        break;
      case '--content_type':
      case '-t':
        options.contentType = args[++i];
        break;
      case '--density':
      case '-d':
        options.density = parseFloat(args[++i]);
        break;
      case '--chunk_coords':
      case '-c':
        const coords = args[++i].split(',').map(Number);
        options.chunkX = coords[0] || 0;
        options.chunkY = coords[1] || 0;
        options.chunkZ = coords[2] || 0;
        break;
      case '--output_format':
      case '-o':
        options.outputFormat = args[++i];
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        console.log(`
GENESIS 2.0 — Master Generation Skeleton Ecosystem

Usage: node generation_master.js [options]

Options:
  -s, --master_seed <seed>       Master seed for deterministic generation
  -t, --content_type <type>      Content type: generic, creature, structure, terrain
  -d, --density <value>          Generation density (0-1)
  -c, --chunk_coords <x,y,z>     Chunk coordinates to generate
  -o, --output_format <format>   Output format: json, gltf, fbx
  -v, --verbose                  Enable verbose output
  -h, --help                     Show this help message

Examples:
  node generation_master.js --master_seed 42 --content_type creature
  node generation_master.js -s 12345 -t structure -d 0.8 -c 0,0,0
        `);
        process.exit(0);
    }
  }

  // Create pipeline
  const pipeline = new GenerationPipeline({
    masterSeed: options.masterSeed,
    config: {
      contentType: options.contentType,
      density: options.density
    }
  });

  // Set up event listeners
  if (options.verbose) {
    pipeline.on('chunk:start', ({ coords }) => {
      console.log(`\n🔄 Starting chunk (${coords.x}, ${coords.y}, ${coords.z})...`);
    });

    pipeline.on('layer:complete', ({ layer, time }) => {
      console.log(`  ✓ Layer ${layer} complete${time ? ` (${time}ms)` : ''}`);
    });

    pipeline.on('chunk:complete', ({ coords, time }) => {
      console.log(`✅ Chunk complete in ${time}ms`);
    });

    pipeline.on('chunk:cached', ({ coords }) => {
      console.log(`📦 Chunk loaded from cache`);
    });
  }

  // Generate
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║  GENESIS 2.0 — Master Generation Skeleton Ecosystem               ║
║  Copyright 2025 murray-ux — Apache-2.0                           ║
╚═══════════════════════════════════════════════════════════════════╝
`);

  console.log(`Configuration:`);
  console.log(`  Master Seed: ${options.masterSeed || '(auto-generated)'}`);
  console.log(`  Content Type: ${options.contentType}`);
  console.log(`  Density: ${options.density}`);
  console.log(`  Chunk: (${options.chunkX}, ${options.chunkY}, ${options.chunkZ})`);
  console.log(`  Output: ${options.outputFormat}`);
  console.log('');

  try {
    const chunk = await pipeline.generateChunk({
      x: options.chunkX,
      y: options.chunkY,
      z: options.chunkZ
    });

    // Output based on format
    switch (options.outputFormat) {
      case 'gltf':
        const gltf = chunk.getLayerOutput(5)?.exports?.gltf;
        console.log(JSON.stringify(gltf, null, 2));
        break;

      case 'fbx':
        const fbx = chunk.getLayerOutput(5)?.exports?.fbx;
        console.log(JSON.stringify(fbx, null, 2));
        break;

      case 'json':
      default:
        console.log(JSON.stringify(chunk.toJSON(), null, 2));
    }

    // Print statistics
    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('Generation Statistics:');
    const stats = pipeline.getStatistics();
    console.log(`  Chunks Generated: ${stats.chunksGenerated}`);
    console.log(`  Cache Hits: ${stats.cacheHits}`);
    console.log(`  Total Time: ${stats.totalTime}ms`);
    console.log(`  Layer Times:`);
    for (const [layer, time] of Object.entries(stats.layerTimes)) {
      console.log(`    Layer ${layer}: ${time}ms`);
    }

  } catch (error) {
    console.error('❌ Generation failed:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if executed directly
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch(console.error);
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export {
  GenerationPipeline
};

export default GenerationPipeline;

/**
 * ORCHESTRATION PIPELINE TESTS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Copyright 2025 murray-ux
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comprehensive test suite for the Master Generation Skeleton Ecosystem
 *
 * Run: node --test test/orchestration.test.js
 *
 * GENESIS 2.0 — Forbidden Ninja City
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// ══════════════════════════════════════════════════════════════════════════════
// LAYER 0: SEED & CONFIGURATION TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Layer 0: Seed & Configuration', () => {
  let SeedManager, ConfigManager, SeededPRNG, ConfigPacket, ConstraintsGraph;

  before(async () => {
    const module = await import('../orchestration/layer_0_seed_config.js');
    SeedManager = module.SeedManager;
    ConfigManager = module.ConfigManager;
    SeededPRNG = module.SeededPRNG;
    ConfigPacket = module.ConfigPacket;
    ConstraintsGraph = module.ConstraintsGraph;
  });

  describe('SeededPRNG', () => {
    it('should produce deterministic output for same seed', () => {
      const prng1 = new SeededPRNG('test-seed');
      const prng2 = new SeededPRNG('test-seed');

      const values1 = Array.from({ length: 10 }, () => prng1.next());
      const values2 = Array.from({ length: 10 }, () => prng2.next());

      assert.deepEqual(values1, values2);
    });

    it('should produce different output for different seeds', () => {
      const prng1 = new SeededPRNG('seed-a');
      const prng2 = new SeededPRNG('seed-b');

      const value1 = prng1.next();
      const value2 = prng2.next();

      assert.notEqual(value1, value2);
    });

    it('should produce values in range [0, 1)', () => {
      const prng = new SeededPRNG('range-test');

      for (let i = 0; i < 1000; i++) {
        const value = prng.next();
        assert.ok(value >= 0 && value < 1, `Value ${value} out of range`);
      }
    });

    it('should generate integers in specified range', () => {
      const prng = new SeededPRNG('int-test');

      for (let i = 0; i < 100; i++) {
        const value = prng.nextInt(5, 10);
        assert.ok(value >= 5 && value <= 10, `Value ${value} out of range [5, 10]`);
        assert.ok(Number.isInteger(value), `Value ${value} is not an integer`);
      }
    });

    it('should generate floats in specified range', () => {
      const prng = new SeededPRNG('float-test');

      for (let i = 0; i < 100; i++) {
        const value = prng.nextFloat(-5, 5);
        assert.ok(value >= -5 && value <= 5, `Value ${value} out of range [-5, 5]`);
      }
    });

    it('should shuffle arrays deterministically', () => {
      const prng1 = new SeededPRNG('shuffle');
      const prng2 = new SeededPRNG('shuffle');

      const arr1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const arr2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      prng1.shuffle(arr1);
      prng2.shuffle(arr2);

      assert.deepEqual(arr1, arr2);
    });

    it('should derive new PRNG with different sequence', () => {
      const prng = new SeededPRNG('parent');
      const derived = prng.derive('child');

      const parentValue = prng.next();
      const derivedValue = derived.next();

      assert.notEqual(parentValue, derivedValue);
    });

    it('should generate gaussian distribution', () => {
      const prng = new SeededPRNG('gaussian');
      const values = Array.from({ length: 1000 }, () => prng.nextGaussian(0, 1));

      const mean = values.reduce((a, b) => a + b) / values.length;
      const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
      const stdDev = Math.sqrt(variance);

      // Mean should be close to 0, stdDev close to 1
      assert.ok(Math.abs(mean) < 0.1, `Mean ${mean} too far from 0`);
      assert.ok(Math.abs(stdDev - 1) < 0.2, `StdDev ${stdDev} too far from 1`);
    });
  });

  describe('SeedManager', () => {
    it('should generate deterministic layer seeds', () => {
      const manager1 = new SeedManager('master-seed');
      const manager2 = new SeedManager('master-seed');

      for (let i = 0; i <= 5; i++) {
        assert.equal(manager1.getLayerSeed(i), manager2.getLayerSeed(i));
      }
    });

    it('should generate different seeds per layer', () => {
      const manager = new SeedManager('unique-layers');
      const seeds = new Set();

      for (let i = 0; i <= 5; i++) {
        seeds.add(manager.getLayerSeed(i));
      }

      assert.equal(seeds.size, 6, 'All layer seeds should be unique');
    });

    it('should generate deterministic chunk seeds', () => {
      const manager1 = new SeedManager('chunk-test');
      const manager2 = new SeedManager('chunk-test');

      const seed1 = manager1.getChunkSeed(1, 5, 10, 0);
      const seed2 = manager2.getChunkSeed(1, 5, 10, 0);

      assert.equal(seed1, seed2);
    });

    it('should generate different seeds for different chunks', () => {
      const manager = new SeedManager('diff-chunks');

      const seed1 = manager.getChunkSeed(1, 0, 0, 0);
      const seed2 = manager.getChunkSeed(1, 1, 0, 0);
      const seed3 = manager.getChunkSeed(1, 0, 1, 0);

      assert.notEqual(seed1, seed2);
      assert.notEqual(seed1, seed3);
      assert.notEqual(seed2, seed3);
    });

    it('should export and restore state', () => {
      const manager1 = new SeedManager('export-test');
      const state = manager1.exportState();

      const manager2 = SeedManager.fromState(state);

      assert.equal(manager1.masterSeed, manager2.masterSeed);
    });

    it('should throw for invalid layer ID', () => {
      const manager = new SeedManager('invalid');

      assert.throws(() => manager.getLayerSeed(10), /Invalid layer ID/);
    });
  });

  describe('ConfigManager', () => {
    it('should merge user config with defaults', () => {
      const manager = new ConfigManager({ density: 0.8 });

      assert.equal(manager.get('density'), 0.8);
      assert.equal(manager.get('scale'), 1.0); // Default value
    });

    it('should get nested config values', () => {
      const manager = new ConfigManager();

      assert.equal(manager.get('layers.1.samplingMethod'), 'poisson');
    });

    it('should set config values', () => {
      const manager = new ConfigManager();

      manager.set('density', 0.9);
      assert.equal(manager.get('density'), 0.9);
    });

    it('should validate config values', () => {
      const manager = new ConfigManager();

      assert.throws(() => manager.set('density', 1.5), /Invalid value/);
      assert.throws(() => manager.set('qualityLevel', 'invalid'), /Invalid value/);
    });

    it('should emit change events', () => {
      const manager = new ConfigManager();
      let eventFired = false;

      manager.on('change', ({ path, oldValue, newValue }) => {
        assert.equal(path, 'density');
        assert.equal(oldValue, 0.5);
        assert.equal(newValue, 0.7);
        eventFired = true;
      });

      manager.set('density', 0.7);
      assert.ok(eventFired);
    });

    it('should validate complete configuration', () => {
      const manager = new ConfigManager();
      const result = manager.validate();

      assert.ok(result.valid);
      assert.equal(result.errors.length, 0);
    });

    it('should export and restore from JSON', () => {
      const manager1 = new ConfigManager({ density: 0.8, variety: 0.6 });
      const json = JSON.stringify(manager1.exportConfig());

      const manager2 = ConfigManager.fromJSON(json);

      assert.equal(manager2.get('density'), 0.8);
      assert.equal(manager2.get('variety'), 0.6);
    });
  });

  describe('ConstraintsGraph', () => {
    it('should add and check rules', () => {
      const graph = new ConstraintsGraph();

      graph.addRule({
        type: 'height',
        params: { min: 0, max: 100 }
      });

      const validPoint = { x: 0, y: 0, z: 50 };
      const invalidPoint = { x: 0, y: 0, z: 150 };

      assert.ok(graph.checkPoint(validPoint).valid);
      assert.ok(!graph.checkPoint(invalidPoint).valid);
    });

    it('should check forbidden zones', () => {
      const graph = new ConstraintsGraph();

      graph.addForbiddenZone({
        type: 'sphere',
        position: { x: 0, y: 0, z: 0 },
        size: 5,
        reason: 'test zone'
      });

      const insidePoint = { x: 2, y: 2, z: 0 };
      const outsidePoint = { x: 10, y: 10, z: 0 };

      const insideResult = graph.checkPoint(insidePoint);
      const outsideResult = graph.checkPoint(outsidePoint);

      assert.ok(!insideResult.valid);
      assert.ok(insideResult.reason.includes('forbidden zone'));
      assert.ok(outsideResult.valid);
    });

    it('should export graph data', () => {
      const graph = new ConstraintsGraph();

      graph.addRule({ type: 'height', params: { min: 0, max: 50 } });
      graph.addForbiddenZone({ type: 'sphere', position: { x: 0, y: 0 }, size: 5 });
      graph.addDependency('tree', 'water', { relationship: 'near' });

      const exported = graph.exportGraph();

      assert.equal(exported.rules.length, 1);
      assert.equal(exported.forbiddenZones.length, 1);
      assert.ok(exported.dependencies.tree);
    });
  });

  describe('ConfigPacket', () => {
    it('should create packet with correct bounds', () => {
      const seedManager = new SeedManager('packet-test');
      const configManager = new ConfigManager({ chunkSize: 64 });

      const packet = new ConfigPacket(seedManager, configManager, { x: 1, y: 2, z: 0 });

      assert.equal(packet.bounds.minX, 64);
      assert.equal(packet.bounds.maxX, 128);
      assert.equal(packet.bounds.minY, 128);
      assert.equal(packet.bounds.maxY, 192);
    });

    it('should include seeds for all layers', () => {
      const seedManager = new SeedManager('seeds-test');
      const configManager = new ConfigManager();

      const packet = new ConfigPacket(seedManager, configManager, { x: 0, y: 0, z: 0 });

      for (let i = 0; i <= 5; i++) {
        assert.ok(packet.seeds[i], `Missing seed for layer ${i}`);
      }
    });

    it('should generate consistent cache keys', () => {
      const seedManager = new SeedManager('cache-key');
      const configManager = new ConfigManager();

      const packet1 = new ConfigPacket(seedManager, configManager, { x: 0, y: 0, z: 0 });
      const packet2 = new ConfigPacket(seedManager, configManager, { x: 0, y: 0, z: 0 });

      assert.equal(packet1.getCacheKey(), packet2.getCacheKey());
    });

    it('should generate different cache keys for different chunks', () => {
      const seedManager = new SeedManager('diff-cache');
      const configManager = new ConfigManager();

      const packet1 = new ConfigPacket(seedManager, configManager, { x: 0, y: 0, z: 0 });
      const packet2 = new ConfigPacket(seedManager, configManager, { x: 1, y: 0, z: 0 });

      assert.notEqual(packet1.getCacheKey(), packet2.getCacheKey());
    });

    it('should provide PRNG for each layer', () => {
      const seedManager = new SeedManager('prng-test');
      const configManager = new ConfigManager();

      const packet = new ConfigPacket(seedManager, configManager, { x: 0, y: 0, z: 0 });

      const prng1 = packet.getPRNG(1);
      const prng2 = packet.getPRNG(2);

      assert.notEqual(prng1.next(), prng2.next());
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// LAYER 1: SPATIAL DISTRIBUTION TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Layer 1: Spatial Distribution', () => {
  let SpatialDistributor, PoissonDiskSampler, PerlinNoise, DensityMap;
  let SeedManager, ConfigManager, ConfigPacket;

  before(async () => {
    const layer1 = await import('../orchestration/layer_1_spatial_dist.js');
    SpatialDistributor = layer1.SpatialDistributor;
    PoissonDiskSampler = layer1.PoissonDiskSampler;
    PerlinNoise = layer1.PerlinNoise;
    DensityMap = layer1.DensityMap;

    const layer0 = await import('../orchestration/layer_0_seed_config.js');
    SeedManager = layer0.SeedManager;
    ConfigManager = layer0.ConfigManager;
    ConfigPacket = layer0.ConfigPacket;
  });

  describe('PerlinNoise', () => {
    it('should generate deterministic noise', () => {
      const { SeededPRNG } = await import('../orchestration/layer_0_seed_config.js');
      const prng1 = new SeededPRNG('perlin-test');
      const prng2 = new SeededPRNG('perlin-test');

      const noise1 = new PerlinNoise(prng1);
      const noise2 = new PerlinNoise(prng2);

      assert.equal(noise1.noise2D(0.5, 0.5), noise2.noise2D(0.5, 0.5));
    });

    it('should generate values in range [-1, 1]', () => {
      const { SeededPRNG } = await import('../orchestration/layer_0_seed_config.js');
      const noise = new PerlinNoise(new SeededPRNG('range'));

      for (let i = 0; i < 100; i++) {
        const value = noise.noise2D(i * 0.1, i * 0.1);
        assert.ok(value >= -1 && value <= 1, `Value ${value} out of range`);
      }
    });

    it('should generate smooth transitions', () => {
      const { SeededPRNG } = await import('../orchestration/layer_0_seed_config.js');
      const noise = new PerlinNoise(new SeededPRNG('smooth'));

      const v1 = noise.noise2D(0, 0);
      const v2 = noise.noise2D(0.01, 0);

      assert.ok(Math.abs(v1 - v2) < 0.1, 'Adjacent values should be similar');
    });
  });

  describe('PoissonDiskSampler', () => {
    it('should generate points with minimum spacing', () => {
      const { SeededPRNG } = await import('../orchestration/layer_0_seed_config.js');
      const prng = new SeededPRNG('poisson');
      const bounds = { minX: 0, maxX: 50, minY: 0, maxY: 50 };
      const minDistance = 5;

      const sampler = new PoissonDiskSampler(prng, bounds, minDistance);
      const points = sampler.generate();

      // Check all pairs have minimum spacing
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          assert.ok(dist >= minDistance * 0.99, `Points too close: ${dist} < ${minDistance}`);
        }
      }
    });

    it('should respect bounds', () => {
      const { SeededPRNG } = await import('../orchestration/layer_0_seed_config.js');
      const prng = new SeededPRNG('bounds');
      const bounds = { minX: 10, maxX: 20, minY: 30, maxY: 40 };

      const sampler = new PoissonDiskSampler(prng, bounds, 2);
      const points = sampler.generate();

      for (const p of points) {
        assert.ok(p.x >= bounds.minX && p.x < bounds.maxX);
        assert.ok(p.y >= bounds.minY && p.y < bounds.maxY);
      }
    });

    it('should respect maxPoints limit', () => {
      const { SeededPRNG } = await import('../orchestration/layer_0_seed_config.js');
      const prng = new SeededPRNG('maxpoints');
      const bounds = { minX: 0, maxX: 100, minY: 0, maxY: 100 };

      const sampler = new PoissonDiskSampler(prng, bounds, 2);
      const points = sampler.generate(null, 50);

      assert.ok(points.length <= 50);
    });
  });

  describe('DensityMap', () => {
    it('should sample density values', () => {
      const { SeededPRNG } = await import('../orchestration/layer_0_seed_config.js');
      const prng = new SeededPRNG('density');
      const bounds = { minX: 0, maxX: 100, minY: 0, maxY: 100 };

      const densityMap = new DensityMap(prng, bounds, { baseDensity: 0.5 });

      const value = densityMap.sample(50, 50);
      assert.ok(value >= 0 && value <= 1);
    });

    it('should apply modifiers', () => {
      const { SeededPRNG } = await import('../orchestration/layer_0_seed_config.js');
      const prng = new SeededPRNG('modifier');
      const bounds = { minX: 0, maxX: 100, minY: 0, maxY: 100 };

      const densityMap = new DensityMap(prng, bounds, { baseDensity: 1.0 });
      densityMap.addModifier('radial', {
        centerX: 50,
        centerY: 50,
        radius: 30,
        strength: 1.0,
        invert: false
      });

      const centerValue = densityMap.sample(50, 50);
      const edgeValue = densityMap.sample(0, 0);

      assert.ok(centerValue > edgeValue, 'Center should have higher density');
    });
  });

  describe('SpatialDistributor', () => {
    it('should generate points using poisson method', () => {
      const seedManager = new SeedManager('spatial');
      const configManager = new ConfigManager({
        layers: { 1: { maxPoints: 100, minSpacing: 3 } }
      });
      const packet = new ConfigPacket(seedManager, configManager, { x: 0, y: 0, z: 0 });

      const distributor = new SpatialDistributor(packet);
      const output = distributor.generate('poisson');

      assert.ok(output.points.length > 0);
      assert.ok(output.statistics.totalPoints > 0);
    });

    it('should add metadata to points', () => {
      const seedManager = new SeedManager('metadata');
      const configManager = new ConfigManager();
      const packet = new ConfigPacket(seedManager, configManager, { x: 0, y: 0, z: 0 });

      const distributor = new SpatialDistributor(packet);
      const output = distributor.generate('poisson');

      for (const point of output.points) {
        assert.ok(point.type !== undefined);
        assert.ok(point.weight !== undefined);
        assert.ok(point.z !== undefined);
      }
    });

    it('should extract boundary points', () => {
      const seedManager = new SeedManager('boundary');
      const configManager = new ConfigManager();
      const packet = new ConfigPacket(seedManager, configManager, { x: 0, y: 0, z: 0 });

      const distributor = new SpatialDistributor(packet);
      distributor.generate('poisson');

      const leftBoundary = distributor.getBoundaryPoints('left');
      const rightBoundary = distributor.getBoundaryPoints('right');

      // Boundaries should exist (may be empty for small chunks)
      assert.ok(Array.isArray(leftBoundary));
      assert.ok(Array.isArray(rightBoundary));
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// LAYER 2: SKELETON TOPOLOGY TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Layer 2: Skeleton Topology', () => {
  let TopologyBuilder, Joint, Bone, SkeletonGraph, JOINT_TYPES;
  let SeedManager, ConfigManager, ConfigPacket;

  before(async () => {
    const layer2 = await import('../orchestration/layer_2_topology.js');
    TopologyBuilder = layer2.TopologyBuilder;
    Joint = layer2.Joint;
    Bone = layer2.Bone;
    SkeletonGraph = layer2.SkeletonGraph;
    JOINT_TYPES = layer2.JOINT_TYPES;

    const layer0 = await import('../orchestration/layer_0_seed_config.js');
    SeedManager = layer0.SeedManager;
    ConfigManager = layer0.ConfigManager;
    ConfigPacket = layer0.ConfigPacket;
  });

  describe('Joint', () => {
    it('should create joint with default values', () => {
      const joint = new Joint(0, { x: 1, y: 2, z: 3 });

      assert.equal(joint.id, 0);
      assert.deepEqual(joint.position, { x: 1, y: 2, z: 3 });
      assert.equal(joint.type, JOINT_TYPES.BALL);
    });

    it('should calculate distance to other joint', () => {
      const joint1 = new Joint(0, { x: 0, y: 0, z: 0 });
      const joint2 = new Joint(1, { x: 3, y: 4, z: 0 });

      assert.equal(joint1.distanceTo(joint2), 5);
    });

    it('should set parent and update depth', () => {
      const parent = new Joint(0, { x: 0, y: 0, z: 0 });
      const child = new Joint(1, { x: 1, y: 0, z: 0 });

      child.setParent(parent);

      assert.equal(child.parent, parent);
      assert.equal(child.depth, 1);
      assert.ok(parent.children.includes(child));
    });

    it('should serialize to JSON', () => {
      const joint = new Joint(0, { x: 1, y: 2, z: 3 }, {
        type: JOINT_TYPES.HINGE,
        boneType: 'limb'
      });

      const json = joint.toJSON();

      assert.equal(json.id, 0);
      assert.deepEqual(json.position, { x: 1, y: 2, z: 3 });
      assert.equal(json.type, 'hinge');
      assert.equal(json.boneType, 'limb');
    });
  });

  describe('Bone', () => {
    it('should calculate length between joints', () => {
      const start = new Joint(0, { x: 0, y: 0, z: 0 });
      const end = new Joint(1, { x: 3, y: 4, z: 0 });

      const bone = new Bone(start, end);

      assert.equal(bone.length, 5);
    });

    it('should calculate midpoint', () => {
      const start = new Joint(0, { x: 0, y: 0, z: 0 });
      const end = new Joint(1, { x: 10, y: 10, z: 10 });

      const bone = new Bone(start, end);
      const mid = bone.getMidpoint();

      assert.deepEqual(mid, { x: 5, y: 5, z: 5 });
    });

    it('should calculate direction', () => {
      const start = new Joint(0, { x: 0, y: 0, z: 0 });
      const end = new Joint(1, { x: 5, y: 0, z: 0 });

      const bone = new Bone(start, end);
      const dir = bone.getDirection();

      assert.equal(dir.x, 1);
      assert.equal(dir.y, 0);
      assert.equal(dir.z, 0);
    });
  });

  describe('SkeletonGraph', () => {
    it('should add joints and bones', () => {
      const graph = new SkeletonGraph();

      const j0 = graph.addJoint(new Joint(0, { x: 0, y: 0, z: 0 }));
      const j1 = graph.addJoint(new Joint(1, { x: 1, y: 0, z: 0 }));

      graph.addBone(new Bone(j0, j1));

      assert.equal(graph.joints.size, 2);
      assert.equal(graph.bones.length, 1);
    });

    it('should validate acyclic structure', () => {
      const graph = new SkeletonGraph();

      const j0 = graph.addJoint(new Joint(0, { x: 0, y: 0, z: 0 }));
      const j1 = graph.addJoint(new Joint(1, { x: 1, y: 0, z: 0 }));
      const j2 = graph.addJoint(new Joint(2, { x: 2, y: 0, z: 0 }));

      j1.setParent(j0);
      j2.setParent(j1);

      graph.setRoot(j0);

      const result = graph.validateAcyclic();
      assert.ok(result.valid);
    });

    it('should serialize and deserialize', () => {
      const graph = new SkeletonGraph();

      const j0 = graph.addJoint(new Joint(0, { x: 0, y: 0, z: 0 }));
      const j1 = graph.addJoint(new Joint(1, { x: 5, y: 0, z: 0 }));

      j1.setParent(j0);
      graph.setRoot(j0);
      graph.addBone(new Bone(j0, j1));

      const json = graph.toJSON();
      const restored = SkeletonGraph.fromJSON(json);

      assert.equal(restored.joints.size, 2);
      assert.equal(restored.bones.length, 1);
      assert.equal(restored.root.id, 0);
    });
  });

  describe('TopologyBuilder', () => {
    it('should build skeleton from spatial output', () => {
      const seedManager = new SeedManager('topology');
      const configManager = new ConfigManager();
      const packet = new ConfigPacket(seedManager, configManager, { x: 0, y: 0, z: 0 });

      const spatialOutput = {
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 5, y: 0, z: 0 },
          { x: 10, y: 0, z: 0 },
          { x: 5, y: 5, z: 0 },
          { x: 5, y: -5, z: 0 }
        ]
      };

      const builder = new TopologyBuilder(packet);
      const output = builder.build(spatialOutput, 'mst');

      assert.ok(output.graph.joints.length > 0);
      assert.ok(output.graph.bones.length > 0);
      assert.ok(output.skinningIndices.length > 0);
    });

    it('should assign bone types based on depth', () => {
      const seedManager = new SeedManager('bone-types');
      const configManager = new ConfigManager({
        layers: { 2: { hierarchyDepth: 3 } }
      });
      const packet = new ConfigPacket(seedManager, configManager, { x: 0, y: 0, z: 0 });

      const spatialOutput = {
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 2, y: 0, z: 1 },
          { x: 4, y: 0, z: 2 },
          { x: 6, y: 0, z: 3 }
        ]
      };

      const builder = new TopologyBuilder(packet);
      const output = builder.build(spatialOutput, 'mst');

      // Root should have depth 0
      const rootJoint = output.graph.joints.find(j => j.parentId === null);
      assert.ok(rootJoint, 'Should have a root joint');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// CHUNK MANAGER TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Chunk Manager', () => {
  let ChunkManager, ChunkData, LRUCache;

  before(async () => {
    const module = await import('../orchestration/chunk_manager.js');
    ChunkManager = module.ChunkManager;
    ChunkData = module.ChunkData;
    LRUCache = module.LRUCache;
  });

  describe('LRUCache', () => {
    it('should store and retrieve values', () => {
      const cache = new LRUCache(10);

      cache.set('key1', 'value1');
      assert.equal(cache.get('key1'), 'value1');
    });

    it('should evict oldest entries', () => {
      const cache = new LRUCache(3);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.set('d', 4); // Should evict 'a'

      assert.equal(cache.get('a'), undefined);
      assert.equal(cache.get('b'), 2);
      assert.equal(cache.get('d'), 4);
    });

    it('should update position on access', () => {
      const cache = new LRUCache(3);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      cache.get('a'); // Move 'a' to end

      cache.set('d', 4); // Should evict 'b', not 'a'

      assert.equal(cache.get('a'), 1);
      assert.equal(cache.get('b'), undefined);
    });
  });

  describe('ChunkData', () => {
    it('should create chunk with coordinates', () => {
      const chunk = new ChunkData({ x: 1, y: 2, z: 3 });

      assert.deepEqual(chunk.coords, { x: 1, y: 2, z: 3 });
    });

    it('should store layer outputs', () => {
      const chunk = new ChunkData({ x: 0, y: 0, z: 0 });

      chunk.setLayerOutput(1, { points: [] });
      chunk.setLayerOutput(2, { graph: {} });

      assert.deepEqual(chunk.getLayerOutput(1), { points: [] });
      assert.deepEqual(chunk.getLayerOutput(2), { graph: {} });
    });

    it('should track completion status', () => {
      const chunk = new ChunkData({ x: 0, y: 0, z: 0 });

      assert.ok(!chunk.isComplete());

      for (let i = 0; i <= 5; i++) {
        chunk.setLayerOutput(i, {});
      }

      assert.ok(chunk.isComplete());
    });

    it('should serialize and deserialize', () => {
      const chunk = new ChunkData({ x: 1, y: 2, z: 0 }, {
        cacheKey: 'test-key'
      });

      chunk.setLayerOutput(1, { test: true });

      const json = chunk.toJSON();
      const restored = ChunkData.fromJSON(json);

      assert.deepEqual(restored.coords, { x: 1, y: 2, z: 0 });
      assert.equal(restored.cacheKey, 'test-key');
      assert.deepEqual(restored.getLayerOutput(1), { test: true });
    });
  });

  describe('ChunkManager', () => {
    it('should generate deterministic cache keys', () => {
      const manager = new ChunkManager({ cacheDir: '/tmp/test-cache' });

      const key1 = manager.generateCacheKey('seed', { x: 0, y: 0 }, 'creature', 'config-hash');
      const key2 = manager.generateCacheKey('seed', { x: 0, y: 0 }, 'creature', 'config-hash');

      assert.equal(key1, key2);
    });

    it('should generate different keys for different inputs', () => {
      const manager = new ChunkManager({ cacheDir: '/tmp/test-cache' });

      const key1 = manager.generateCacheKey('seed1', { x: 0, y: 0 }, 'creature', 'config');
      const key2 = manager.generateCacheKey('seed2', { x: 0, y: 0 }, 'creature', 'config');

      assert.notEqual(key1, key2);
    });

    it('should calculate neighbor coordinates', () => {
      const manager = new ChunkManager({ cacheDir: '/tmp/test-cache' });

      const neighbors = manager.getNeighborCoords({ x: 5, y: 10, z: 0 });

      assert.deepEqual(neighbors.left, { x: 4, y: 10, z: 0 });
      assert.deepEqual(neighbors.right, { x: 6, y: 10, z: 0 });
      assert.deepEqual(neighbors.top, { x: 5, y: 9, z: 0 });
      assert.deepEqual(neighbors.bottom, { x: 5, y: 11, z: 0 });
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Integration Tests', () => {
  it('should run complete pipeline for a chunk', async () => {
    const { GenerationPipeline } = await import('../orchestration/generation_master.js');

    const pipeline = new GenerationPipeline({
      masterSeed: 'integration-test',
      config: {
        contentType: 'creature',
        density: 0.5,
        layers: {
          1: { maxPoints: 20, minSpacing: 5 }
        }
      }
    });

    const chunk = await pipeline.generateChunk({ x: 0, y: 0, z: 0 });

    assert.ok(chunk.isComplete(), 'Chunk should be complete');
    assert.ok(chunk.getLayerOutput(1)?.points?.length > 0, 'Should have spatial points');
    assert.ok(chunk.getLayerOutput(2)?.graph?.joints?.length > 0, 'Should have skeleton joints');
    assert.ok(chunk.getLayerOutput(5)?.scene, 'Should have scene data');
  });

  it('should produce identical results for same seed', async () => {
    const { GenerationPipeline } = await import('../orchestration/generation_master.js');

    const pipeline1 = new GenerationPipeline({
      masterSeed: 'determinism-test',
      config: { layers: { 1: { maxPoints: 10 } } }
    });

    const pipeline2 = new GenerationPipeline({
      masterSeed: 'determinism-test',
      config: { layers: { 1: { maxPoints: 10 } } }
    });

    const chunk1 = await pipeline1.generateChunk({ x: 0, y: 0, z: 0 });
    const chunk2 = await pipeline2.generateChunk({ x: 0, y: 0, z: 0 });

    const points1 = chunk1.getLayerOutput(1)?.points || [];
    const points2 = chunk2.getLayerOutput(1)?.points || [];

    assert.equal(points1.length, points2.length, 'Should have same number of points');

    for (let i = 0; i < points1.length; i++) {
      assert.equal(points1[i].x, points2[i].x, `Point ${i} x should match`);
      assert.equal(points1[i].y, points2[i].y, `Point ${i} y should match`);
    }
  });
});

console.log('Running Orchestration Pipeline Tests...\n');

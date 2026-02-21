/**
 * LAYER 5: WORLD INTEGRATION
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Copyright 2025 murray-ux
 * SPDX-License-Identifier: Apache-2.0
 *
 * Master Generation Skeleton Ecosystem - Placement, scenes, interactions, export
 *
 * Operations:
 *   - Placement: Position entities respecting terrain, obstacles
 *   - Grouping: Crowd simulation, formation logic
 *   - Interaction Graph: Dependencies between entities
 *   - Scene Composition: Lighting, particles, ambient
 *   - Export: Serialize to FBX, GLTF, engine formats
 *
 * GENESIS 2.0 — Forbidden Ninja City
 *
 * @module LAYER_5_WORLD_INTEG
 * @author murray-ux <Founder & Lead Developer>
 * @version 1.0.0
 * @license Apache-2.0
 */

import { EventEmitter } from 'events';

// ══════════════════════════════════════════════════════════════════════════════
// TRANSFORM & ENTITY SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

class Transform {
  constructor(options = {}) {
    this.position = options.position || { x: 0, y: 0, z: 0 };
    this.rotation = options.rotation || { x: 0, y: 0, z: 0, w: 1 }; // Quaternion
    this.scale = options.scale || { x: 1, y: 1, z: 1 };
  }

  setPosition(x, y, z) {
    this.position = { x, y, z };
    return this;
  }

  setRotationEuler(pitch, yaw, roll) {
    // Convert Euler to Quaternion (simplified)
    const cy = Math.cos(yaw * 0.5 * Math.PI / 180);
    const sy = Math.sin(yaw * 0.5 * Math.PI / 180);
    const cp = Math.cos(pitch * 0.5 * Math.PI / 180);
    const sp = Math.sin(pitch * 0.5 * Math.PI / 180);
    const cr = Math.cos(roll * 0.5 * Math.PI / 180);
    const sr = Math.sin(roll * 0.5 * Math.PI / 180);

    this.rotation = {
      w: cr * cp * cy + sr * sp * sy,
      x: sr * cp * cy - cr * sp * sy,
      y: cr * sp * cy + sr * cp * sy,
      z: cr * cp * sy - sr * sp * cy
    };
    return this;
  }

  setScale(x, y = x, z = x) {
    this.scale = { x, y, z };
    return this;
  }

  getMatrix() {
    // Returns 4x4 transformation matrix (column-major)
    const { x: px, y: py, z: pz } = this.position;
    const { x: qx, y: qy, z: qz, w: qw } = this.rotation;
    const { x: sx, y: sy, z: sz } = this.scale;

    // Rotation matrix from quaternion
    const xx = qx * qx, xy = qx * qy, xz = qx * qz, xw = qx * qw;
    const yy = qy * qy, yz = qy * qz, yw = qy * qw;
    const zz = qz * qz, zw = qz * qw;

    return [
      sx * (1 - 2 * (yy + zz)), sx * 2 * (xy + zw), sx * 2 * (xz - yw), 0,
      sy * 2 * (xy - zw), sy * (1 - 2 * (xx + zz)), sy * 2 * (yz + xw), 0,
      sz * 2 * (xz + yw), sz * 2 * (yz - xw), sz * (1 - 2 * (xx + yy)), 0,
      px, py, pz, 1
    ];
  }

  clone() {
    return new Transform({
      position: { ...this.position },
      rotation: { ...this.rotation },
      scale: { ...this.scale }
    });
  }

  toJSON() {
    return {
      position: this.position,
      rotation: this.rotation,
      scale: this.scale,
      matrix: this.getMatrix()
    };
  }
}

class Entity {
  constructor(id, options = {}) {
    this.id = id;
    this.name = options.name || `entity_${id}`;
    this.type = options.type || 'generic';
    this.transform = options.transform || new Transform();
    this.parent = null;
    this.children = [];
    this.components = new Map();
    this.tags = new Set(options.tags || []);
    this.metadata = options.metadata || {};
    this.enabled = true;
  }

  setParent(parent) {
    if (this.parent) {
      this.parent.children = this.parent.children.filter(c => c.id !== this.id);
    }
    this.parent = parent;
    if (parent) {
      parent.children.push(this);
    }
    return this;
  }

  addChild(child) {
    child.setParent(this);
    return this;
  }

  addComponent(name, data) {
    this.components.set(name, data);
    return this;
  }

  getComponent(name) {
    return this.components.get(name);
  }

  hasTag(tag) {
    return this.tags.has(tag);
  }

  addTag(tag) {
    this.tags.add(tag);
    return this;
  }

  getWorldTransform() {
    if (!this.parent) return this.transform;

    // Combine with parent transform (simplified - just adds positions)
    const parentWorld = this.parent.getWorldTransform();
    const result = this.transform.clone();
    result.position.x += parentWorld.position.x;
    result.position.y += parentWorld.position.y;
    result.position.z += parentWorld.position.z;
    return result;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      transform: this.transform.toJSON(),
      parentId: this.parent ? this.parent.id : null,
      childrenIds: this.children.map(c => c.id),
      components: Object.fromEntries(this.components),
      tags: Array.from(this.tags),
      metadata: this.metadata,
      enabled: this.enabled
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SCENE GRAPH
// ══════════════════════════════════════════════════════════════════════════════

class SceneGraph {
  constructor(name = 'Scene') {
    this.name = name;
    this.root = new Entity('root', { name: 'Root' });
    this.entities = new Map();
    this.entities.set('root', this.root);
    this.nextId = 1;
  }

  createEntity(options = {}) {
    const id = options.id || `entity_${this.nextId++}`;
    const entity = new Entity(id, options);
    this.entities.set(id, entity);
    entity.setParent(this.root);
    return entity;
  }

  getEntity(id) {
    return this.entities.get(id);
  }

  findByTag(tag) {
    return Array.from(this.entities.values()).filter(e => e.hasTag(tag));
  }

  findByType(type) {
    return Array.from(this.entities.values()).filter(e => e.type === type);
  }

  traverse(callback, entity = this.root) {
    callback(entity);
    for (const child of entity.children) {
      this.traverse(callback, child);
    }
  }

  toJSON() {
    return {
      name: this.name,
      rootId: this.root.id,
      entities: Array.from(this.entities.values()).map(e => e.toJSON())
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PLACEMENT SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

class TerrainSampler {
  constructor(heightmap = null) {
    this.heightmap = heightmap;
    this.defaultHeight = 0;
  }

  getHeight(x, y) {
    if (!this.heightmap) return this.defaultHeight;

    // Sample heightmap (simplified)
    const u = Math.abs(x % 100) / 100;
    const v = Math.abs(y % 100) / 100;
    const idx = Math.floor(v * this.heightmap.height) * this.heightmap.width +
                Math.floor(u * this.heightmap.width);

    return this.heightmap.data ? this.heightmap.data[idx] || 0 : 0;
  }

  getNormal(x, y) {
    const h = this.getHeight(x, y);
    const hx = this.getHeight(x + 0.1, y);
    const hy = this.getHeight(x, y + 0.1);

    const dx = hx - h;
    const dy = hy - h;

    const len = Math.sqrt(dx * dx + dy * dy + 1);
    return { x: -dx / len, y: -dy / len, z: 1 / len };
  }

  getSlope(x, y) {
    const normal = this.getNormal(x, y);
    return Math.acos(normal.z) * 180 / Math.PI;
  }
}

class PlacementEngine {
  constructor(prng, terrain = null) {
    this.prng = prng;
    this.terrain = terrain || new TerrainSampler();
    this.obstacles = [];
    this.placedEntities = [];
  }

  addObstacle(position, radius) {
    this.obstacles.push({ position, radius });
    return this;
  }

  checkCollision(position, radius = 1) {
    // Check terrain obstacles
    for (const obs of this.obstacles) {
      const dx = position.x - obs.position.x;
      const dy = position.y - obs.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius + obs.radius) return true;
    }

    // Check placed entities
    for (const entity of this.placedEntities) {
      const dx = position.x - entity.position.x;
      const dy = position.y - entity.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius + (entity.radius || 1)) return true;
    }

    return false;
  }

  place(options = {}) {
    const {
      position = { x: 0, y: 0 },
      radius = 1,
      alignToTerrain = true,
      slopeLimit = 45,
      attempts = 10,
      jitter = 0
    } = options;

    for (let i = 0; i < attempts; i++) {
      // Apply jitter
      const jx = position.x + (this.prng.next() - 0.5) * jitter * 2;
      const jy = position.y + (this.prng.next() - 0.5) * jitter * 2;

      // Check slope
      const slope = this.terrain.getSlope(jx, jy);
      if (slope > slopeLimit) continue;

      // Check collision
      if (this.checkCollision({ x: jx, y: jy }, radius)) continue;

      // Success - compute final position
      const height = alignToTerrain ? this.terrain.getHeight(jx, jy) : 0;
      const finalPosition = { x: jx, y: jy, z: height };

      // Compute rotation to align with terrain
      let rotation = { x: 0, y: 0, z: 0, w: 1 };
      if (alignToTerrain) {
        const normal = this.terrain.getNormal(jx, jy);
        // Simplified: just rotate to face up the slope
        rotation = { x: normal.x * 0.5, y: normal.y * 0.5, z: 0, w: 1 };
      }

      // Record placement
      this.placedEntities.push({ position: finalPosition, radius });

      return { position: finalPosition, rotation, success: true };
    }

    return { success: false };
  }

  placeGroup(count, centerPosition, spreadRadius, options = {}) {
    const placements = [];

    for (let i = 0; i < count; i++) {
      const angle = this.prng.next() * Math.PI * 2;
      const dist = this.prng.next() * spreadRadius;

      const position = {
        x: centerPosition.x + Math.cos(angle) * dist,
        y: centerPosition.y + Math.sin(angle) * dist
      };

      const result = this.place({ ...options, position });
      if (result.success) {
        placements.push(result);
      }
    }

    return placements;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// INTERACTION SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

class InteractionGraph {
  constructor() {
    this.nodes = new Map(); // entityId -> node data
    this.edges = []; // { source, target, type, params }
  }

  addNode(entityId, data = {}) {
    this.nodes.set(entityId, {
      entityId,
      interactionType: data.type || 'passive',
      radius: data.radius || 1,
      priority: data.priority || 0,
      triggers: data.triggers || [],
      responses: data.responses || []
    });
    return this;
  }

  addEdge(sourceId, targetId, type, params = {}) {
    this.edges.push({
      source: sourceId,
      target: targetId,
      type, // 'near', 'far', 'triggers', 'blocked_by', 'requires'
      params
    });
    return this;
  }

  getInteractors(entityId, type = null) {
    return this.edges
      .filter(e => e.source === entityId || e.target === entityId)
      .filter(e => !type || e.type === type)
      .map(e => e.source === entityId ? e.target : e.source);
  }

  evaluate(positions) {
    const events = [];

    for (const edge of this.edges) {
      const sourcePos = positions[edge.source];
      const targetPos = positions[edge.target];

      if (!sourcePos || !targetPos) continue;

      const dx = sourcePos.x - targetPos.x;
      const dy = sourcePos.y - targetPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      switch (edge.type) {
        case 'near':
          if (dist < (edge.params.distance || 5)) {
            events.push({
              type: 'proximity',
              source: edge.source,
              target: edge.target,
              distance: dist
            });
          }
          break;
        case 'triggers':
          if (dist < (edge.params.radius || 2)) {
            events.push({
              type: 'trigger',
              source: edge.source,
              target: edge.target,
              action: edge.params.action
            });
          }
          break;
      }
    }

    return events;
  }

  toJSON() {
    return {
      nodes: Object.fromEntries(this.nodes),
      edges: this.edges
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SCENE COMPOSER
// ══════════════════════════════════════════════════════════════════════════════

class SceneComposer {
  constructor(scene) {
    this.scene = scene;
    this.lights = [];
    this.cameras = [];
    this.particleSystems = [];
    this.environment = {};
  }

  addLight(type, options = {}) {
    const light = {
      id: `light_${this.lights.length}`,
      type, // 'directional', 'point', 'spot', 'ambient'
      color: options.color || { r: 1, g: 1, b: 1 },
      intensity: options.intensity || 1,
      position: options.position || { x: 0, y: 10, z: 0 },
      direction: options.direction || { x: 0, y: -1, z: 0 },
      castShadows: options.castShadows || false,
      shadowBias: options.shadowBias || 0.001
    };

    this.lights.push(light);
    return light;
  }

  addCamera(options = {}) {
    const camera = {
      id: `camera_${this.cameras.length}`,
      type: options.type || 'perspective',
      position: options.position || { x: 0, y: 5, z: 10 },
      target: options.target || { x: 0, y: 0, z: 0 },
      fov: options.fov || 60,
      near: options.near || 0.1,
      far: options.far || 1000,
      main: options.main || this.cameras.length === 0
    };

    this.cameras.push(camera);
    return camera;
  }

  addParticleSystem(options = {}) {
    const system = {
      id: `particles_${this.particleSystems.length}`,
      type: options.type || 'dust',
      position: options.position || { x: 0, y: 0, z: 0 },
      emissionRate: options.emissionRate || 10,
      lifetime: options.lifetime || 5,
      startSize: options.startSize || 0.1,
      endSize: options.endSize || 0.05,
      startColor: options.startColor || { r: 1, g: 1, b: 1, a: 1 },
      endColor: options.endColor || { r: 1, g: 1, b: 1, a: 0 },
      velocity: options.velocity || { x: 0, y: 1, z: 0 },
      gravity: options.gravity || -0.5
    };

    this.particleSystems.push(system);
    return system;
  }

  setEnvironment(options = {}) {
    this.environment = {
      skybox: options.skybox || null,
      ambientColor: options.ambientColor || { r: 0.2, g: 0.2, b: 0.3 },
      fogEnabled: options.fogEnabled || false,
      fogColor: options.fogColor || { r: 0.5, g: 0.5, b: 0.5 },
      fogStart: options.fogStart || 50,
      fogEnd: options.fogEnd || 200
    };
    return this;
  }

  toJSON() {
    return {
      lights: this.lights,
      cameras: this.cameras,
      particleSystems: this.particleSystems,
      environment: this.environment
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT FORMATS
// ══════════════════════════════════════════════════════════════════════════════

class SceneExporter {
  constructor(scene, composer) {
    this.scene = scene;
    this.composer = composer;
  }

  toGLTF() {
    // Generate GLTF 2.0 structure
    const gltf = {
      asset: {
        version: '2.0',
        generator: 'GENESIS 2.0 Master Generation Skeleton Ecosystem'
      },
      scene: 0,
      scenes: [{
        name: this.scene.name,
        nodes: [0]
      }],
      nodes: [],
      meshes: [],
      materials: [],
      textures: [],
      images: [],
      buffers: [],
      bufferViews: [],
      accessors: []
    };

    // Convert entities to nodes
    this.scene.traverse((entity) => {
      const node = {
        name: entity.name,
        translation: [
          entity.transform.position.x,
          entity.transform.position.y,
          entity.transform.position.z
        ],
        rotation: [
          entity.transform.rotation.x,
          entity.transform.rotation.y,
          entity.transform.rotation.z,
          entity.transform.rotation.w
        ],
        scale: [
          entity.transform.scale.x,
          entity.transform.scale.y,
          entity.transform.scale.z
        ],
        children: entity.children.map((_, i) => gltf.nodes.length + i + 1)
      };

      // Add mesh reference if entity has mesh component
      const meshComponent = entity.getComponent('mesh');
      if (meshComponent) {
        node.mesh = gltf.meshes.length;
        gltf.meshes.push({
          name: `${entity.name}_mesh`,
          primitives: [{
            attributes: {},
            mode: 4 // TRIANGLES
          }]
        });
      }

      gltf.nodes.push(node);
    });

    return gltf;
  }

  toFBX() {
    // FBX is binary, return a descriptor for now
    return {
      format: 'FBX',
      version: '2020',
      scene: this.scene.toJSON(),
      composition: this.composer.toJSON(),
      exportSettings: {
        embedTextures: true,
        binaryFormat: true,
        axis: 'Y_UP'
      }
    };
  }

  toJSON() {
    return {
      scene: this.scene.toJSON(),
      composition: this.composer.toJSON(),
      format: 'genesis_native',
      version: '1.0.0'
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// WORLD INTEGRATOR (MAIN)
// ══════════════════════════════════════════════════════════════════════════════

class WorldIntegrator extends EventEmitter {
  constructor(configPacket) {
    super();
    this.packet = configPacket;
    this.prng = configPacket.getPRNG(5);

    this.scene = new SceneGraph();
    this.placement = new PlacementEngine(this.prng);
    this.interactions = new InteractionGraph();
    this.composer = new SceneComposer(this.scene);

    this.statistics = {
      entitiesPlaced: 0,
      interactionsCreated: 0,
      buildTime: 0
    };
  }

  integrate(assetOutput, meshOutput, topologyOutput, spatialOutput) {
    const startTime = Date.now();
    const config = this.packet.config.layers[5];

    this.emit('start', {});

    // Create entities from generated content
    this._createEntities(assetOutput, meshOutput, topologyOutput);

    // Place entities in world
    this._placeEntities(spatialOutput, config);

    // Create interaction graph
    if (config.interactionGraph) {
      this._createInteractions(config);
    }

    // Compose scene (lighting, cameras, etc.)
    this._composeScene(config);

    this.statistics.buildTime = Date.now() - startTime;
    this.statistics.entitiesPlaced = this.scene.entities.size - 1; // Exclude root
    this.statistics.interactionsCreated = this.interactions.edges.length;

    this.emit('complete', {
      entities: this.statistics.entitiesPlaced,
      interactions: this.statistics.interactionsCreated,
      time: this.statistics.buildTime
    });

    return this.getOutput();
  }

  _createEntities(assetOutput, meshOutput, topologyOutput) {
    // Create main entity from mesh
    const mainEntity = this.scene.createEntity({
      name: 'GeneratedContent',
      type: 'generated',
      tags: ['main', 'generated']
    });

    // Add mesh component
    if (meshOutput && meshOutput.mesh) {
      mainEntity.addComponent('mesh', {
        vertices: meshOutput.mesh.vertices?.length || 0,
        triangles: meshOutput.mesh.triangles?.length || 0,
        boundingBox: meshOutput.boundingBox,
        boundingSphere: meshOutput.boundingSphere
      });
    }

    // Add skeleton component
    if (topologyOutput && topologyOutput.graph) {
      mainEntity.addComponent('skeleton', {
        joints: topologyOutput.graph.joints?.length || 0,
        bones: topologyOutput.graph.bones?.length || 0
      });
    }

    // Add rig component
    if (assetOutput && assetOutput.rig) {
      mainEntity.addComponent('rig', assetOutput.rig);
    }

    // Add animations component
    if (assetOutput && assetOutput.animations) {
      mainEntity.addComponent('animations', {
        clips: assetOutput.animations.map(a => a.name)
      });
    }

    // Add materials component
    if (assetOutput && assetOutput.materials) {
      mainEntity.addComponent('materials', assetOutput.materials);
    }
  }

  _placeEntities(spatialOutput, config) {
    const method = config.placementMethod || 'raycast';

    // Place main entity at center
    const mainEntity = this.scene.findByTag('main')[0];
    if (mainEntity) {
      const placement = this.placement.place({
        position: { x: 0, y: 0 },
        alignToTerrain: method === 'raycast',
        radius: 2
      });

      if (placement.success) {
        mainEntity.transform.setPosition(
          placement.position.x,
          placement.position.y,
          placement.position.z
        );
      }
    }

    // If grouping is enabled, create additional instances
    if (config.groupingEnabled && spatialOutput && spatialOutput.points) {
      const groupSize = Math.min(10, spatialOutput.points.length);

      for (let i = 0; i < groupSize; i++) {
        const point = spatialOutput.points[i];
        const placement = this.placement.place({
          position: { x: point.x, y: point.y },
          alignToTerrain: true,
          jitter: 2
        });

        if (placement.success) {
          const instanceEntity = this.scene.createEntity({
            name: `Instance_${i}`,
            type: 'instance',
            tags: ['instance', 'generated']
          });

          instanceEntity.transform.setPosition(
            placement.position.x,
            placement.position.y,
            placement.position.z
          );

          // Random rotation
          instanceEntity.transform.setRotationEuler(0, this.prng.next() * 360, 0);

          // Slight scale variation
          const scale = 0.8 + this.prng.next() * 0.4;
          instanceEntity.transform.setScale(scale);
        }
      }
    }
  }

  _createInteractions(config) {
    const entities = this.scene.findByTag('generated');

    // Add interaction nodes for all entities
    for (const entity of entities) {
      this.interactions.addNode(entity.id, {
        type: entity.hasTag('main') ? 'active' : 'passive',
        radius: 2,
        priority: entity.hasTag('main') ? 10 : 1
      });
    }

    // Create proximity interactions between nearby entities
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const ei = entities[i];
        const ej = entities[j];

        const dx = ei.transform.position.x - ej.transform.position.x;
        const dy = ei.transform.position.y - ej.transform.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 10) {
          this.interactions.addEdge(ei.id, ej.id, 'near', { distance: 5 });
        }
      }
    }
  }

  _composeScene(config) {
    // Add default lighting
    this.composer.addLight('directional', {
      color: { r: 1, g: 0.95, b: 0.9 },
      intensity: 1.5,
      position: { x: 10, y: 20, z: 10 },
      direction: { x: -0.5, y: -1, z: -0.5 },
      castShadows: true
    });

    this.composer.addLight('ambient', {
      color: { r: 0.3, g: 0.35, b: 0.4 },
      intensity: 0.5
    });

    // Add main camera
    const bounds = this.packet.bounds;
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    this.composer.addCamera({
      type: 'perspective',
      position: { x: centerX, y: 20, z: centerY + 30 },
      target: { x: centerX, y: 0, z: centerY },
      fov: 60,
      main: true
    });

    // Add ambient particles
    this.composer.addParticleSystem({
      type: 'dust',
      position: { x: centerX, y: 10, z: centerY },
      emissionRate: 5,
      lifetime: 10,
      startSize: 0.1,
      velocity: { x: 0.5, y: 0.2, z: 0 }
    });

    // Set environment
    this.composer.setEnvironment({
      ambientColor: { r: 0.2, g: 0.25, b: 0.3 },
      fogEnabled: true,
      fogColor: { r: 0.6, g: 0.65, b: 0.7 },
      fogStart: 50,
      fogEnd: 200
    });
  }

  getOutput() {
    const exporter = new SceneExporter(this.scene, this.composer);

    return {
      scene: this.scene.toJSON(),
      composition: this.composer.toJSON(),
      interactions: this.interactions.toJSON(),
      exports: {
        gltf: exporter.toGLTF(),
        fbx: exporter.toFBX(),
        native: exporter.toJSON()
      },
      statistics: this.statistics,
      cacheKey: this.packet.getCacheKey()
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export {
  Transform,
  Entity,
  SceneGraph,
  TerrainSampler,
  PlacementEngine,
  InteractionGraph,
  SceneComposer,
  SceneExporter,
  WorldIntegrator
};

export default WorldIntegrator;

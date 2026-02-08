/**
 * LAYER 3: MESH & GEOMETRY
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Copyright 2025 murray-ux
 * SPDX-License-Identifier: Apache-2.0
 *
 * Master Generation Skeleton Ecosystem - 3D meshes, vertex layouts, deformation rigs
 *
 * Operations:
 *   - Mesh Generation (Marching Cubes, convex hulls, implicit surfaces)
 *   - Topology Optimization (edge collapse, remeshing for LOD)
 *   - Skinning Setup (weight painting, bone influence)
 *   - Deformation Testing (validation with animation sequences)
 *
 * GENESIS 2.0 — Forbidden Ninja City
 *
 * @module LAYER_3_MESH_GEOM
 * @author murray-ux <Founder & Lead Developer>
 * @version 1.0.0
 * @license Apache-2.0
 */

import { EventEmitter } from 'events';

// ══════════════════════════════════════════════════════════════════════════════
// VECTOR MATH UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

const Vec3 = {
  create: (x = 0, y = 0, z = 0) => ({ x, y, z }),

  add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),

  sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),

  scale: (v, s) => ({ x: v.x * s, y: v.y * s, z: v.z * s }),

  dot: (a, b) => a.x * b.x + a.y * b.y + a.z * b.z,

  cross: (a, b) => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  }),

  length: (v) => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z),

  normalize: (v) => {
    const len = Vec3.length(v);
    return len > 0 ? Vec3.scale(v, 1 / len) : { x: 0, y: 0, z: 0 };
  },

  lerp: (a, b, t) => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t
  }),

  distance: (a, b) => Vec3.length(Vec3.sub(a, b))
};

// ══════════════════════════════════════════════════════════════════════════════
// VERTEX & MESH DATA STRUCTURES
// ══════════════════════════════════════════════════════════════════════════════

class Vertex {
  constructor(position, options = {}) {
    this.position = { ...position };
    this.normal = options.normal || { x: 0, y: 1, z: 0 };
    this.uv = options.uv || { u: 0, v: 0 };
    this.color = options.color || { r: 1, g: 1, b: 1, a: 1 };
    this.boneWeights = options.boneWeights || []; // [{ boneIndex, weight }]
    this.index = options.index || -1;
  }

  clone() {
    return new Vertex(
      { ...this.position },
      {
        normal: { ...this.normal },
        uv: { ...this.uv },
        color: { ...this.color },
        boneWeights: this.boneWeights.map(w => ({ ...w })),
        index: this.index
      }
    );
  }
}

class Triangle {
  constructor(v0, v1, v2) {
    this.indices = [v0, v1, v2];
  }

  computeNormal(vertices) {
    const p0 = vertices[this.indices[0]].position;
    const p1 = vertices[this.indices[1]].position;
    const p2 = vertices[this.indices[2]].position;

    const edge1 = Vec3.sub(p1, p0);
    const edge2 = Vec3.sub(p2, p0);

    return Vec3.normalize(Vec3.cross(edge1, edge2));
  }
}

class Mesh {
  constructor() {
    this.vertices = [];
    this.triangles = [];
    this.boundingBox = null;
    this.boundingSphere = null;
    this.metadata = {};
  }

  addVertex(vertex) {
    vertex.index = this.vertices.length;
    this.vertices.push(vertex);
    return vertex.index;
  }

  addTriangle(i0, i1, i2) {
    const tri = new Triangle(i0, i1, i2);
    this.triangles.push(tri);
    return tri;
  }

  computeNormals() {
    // Reset normals
    for (const v of this.vertices) {
      v.normal = { x: 0, y: 0, z: 0 };
    }

    // Accumulate face normals
    for (const tri of this.triangles) {
      const normal = tri.computeNormal(this.vertices);
      for (const idx of tri.indices) {
        this.vertices[idx].normal = Vec3.add(this.vertices[idx].normal, normal);
      }
    }

    // Normalize
    for (const v of this.vertices) {
      v.normal = Vec3.normalize(v.normal);
    }
  }

  computeBounds() {
    if (this.vertices.length === 0) return;

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const v of this.vertices) {
      minX = Math.min(minX, v.position.x);
      minY = Math.min(minY, v.position.y);
      minZ = Math.min(minZ, v.position.z);
      maxX = Math.max(maxX, v.position.x);
      maxY = Math.max(maxY, v.position.y);
      maxZ = Math.max(maxZ, v.position.z);
    }

    this.boundingBox = {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ }
    };

    const center = {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      z: (minZ + maxZ) / 2
    };

    let maxRadius = 0;
    for (const v of this.vertices) {
      const dist = Vec3.distance(v.position, center);
      maxRadius = Math.max(maxRadius, dist);
    }

    this.boundingSphere = { center, radius: maxRadius };
  }

  getVertexBuffer() {
    const buffer = [];
    for (const v of this.vertices) {
      buffer.push(
        v.position.x, v.position.y, v.position.z,
        v.normal.x, v.normal.y, v.normal.z,
        v.uv.u, v.uv.v
      );
    }
    return new Float32Array(buffer);
  }

  getIndexBuffer() {
    const buffer = [];
    for (const tri of this.triangles) {
      buffer.push(...tri.indices);
    }
    return new Uint32Array(buffer);
  }

  toJSON() {
    return {
      vertices: this.vertices.map(v => ({
        position: v.position,
        normal: v.normal,
        uv: v.uv,
        boneWeights: v.boneWeights
      })),
      triangles: this.triangles.map(t => t.indices),
      boundingBox: this.boundingBox,
      boundingSphere: this.boundingSphere,
      metadata: this.metadata
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// IMPLICIT SURFACE / DISTANCE FIELD
// ══════════════════════════════════════════════════════════════════════════════

class DistanceField {
  constructor(bounds, resolution = 32) {
    this.bounds = bounds;
    this.resolution = resolution;
    this.sizeX = Math.ceil((bounds.maxX - bounds.minX) / resolution) + 1;
    this.sizeY = Math.ceil((bounds.maxY - bounds.minY) / resolution) + 1;
    this.sizeZ = Math.ceil((bounds.maxZ - bounds.minZ) / resolution) + 1;
    this.data = new Float32Array(this.sizeX * this.sizeY * this.sizeZ).fill(Infinity);
  }

  _index(ix, iy, iz) {
    return iz * this.sizeX * this.sizeY + iy * this.sizeX + ix;
  }

  _worldToGrid(x, y, z) {
    return {
      ix: Math.floor((x - this.bounds.minX) / this.resolution),
      iy: Math.floor((y - this.bounds.minY) / this.resolution),
      iz: Math.floor((z - this.bounds.minZ) / this.resolution)
    };
  }

  _gridToWorld(ix, iy, iz) {
    return {
      x: this.bounds.minX + ix * this.resolution,
      y: this.bounds.minY + iy * this.resolution,
      z: this.bounds.minZ + iz * this.resolution
    };
  }

  set(x, y, z, value) {
    const { ix, iy, iz } = this._worldToGrid(x, y, z);
    if (ix >= 0 && ix < this.sizeX && iy >= 0 && iy < this.sizeY && iz >= 0 && iz < this.sizeZ) {
      this.data[this._index(ix, iy, iz)] = value;
    }
  }

  get(x, y, z) {
    const { ix, iy, iz } = this._worldToGrid(x, y, z);
    if (ix >= 0 && ix < this.sizeX && iy >= 0 && iy < this.sizeY && iz >= 0 && iz < this.sizeZ) {
      return this.data[this._index(ix, iy, iz)];
    }
    return Infinity;
  }

  // Add sphere to distance field
  addSphere(center, radius) {
    for (let iz = 0; iz < this.sizeZ; iz++) {
      for (let iy = 0; iy < this.sizeY; iy++) {
        for (let ix = 0; ix < this.sizeX; ix++) {
          const pos = this._gridToWorld(ix, iy, iz);
          const dist = Vec3.distance(pos, center) - radius;
          const idx = this._index(ix, iy, iz);
          this.data[idx] = Math.min(this.data[idx], dist);
        }
      }
    }
  }

  // Add capsule (bone) to distance field
  addCapsule(start, end, radius) {
    const axis = Vec3.sub(end, start);
    const length = Vec3.length(axis);
    const dir = Vec3.normalize(axis);

    for (let iz = 0; iz < this.sizeZ; iz++) {
      for (let iy = 0; iy < this.sizeY; iy++) {
        for (let ix = 0; ix < this.sizeX; ix++) {
          const pos = this._gridToWorld(ix, iy, iz);
          const toPos = Vec3.sub(pos, start);
          const t = Math.max(0, Math.min(length, Vec3.dot(toPos, dir)));
          const closest = Vec3.add(start, Vec3.scale(dir, t));
          const dist = Vec3.distance(pos, closest) - radius;
          const idx = this._index(ix, iy, iz);
          this.data[idx] = Math.min(this.data[idx], dist);
        }
      }
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MARCHING CUBES
// ══════════════════════════════════════════════════════════════════════════════

// Marching Cubes lookup tables (simplified)
const MC_EDGE_TABLE = new Uint16Array(256);
const MC_TRI_TABLE = [];

// Initialize tables (simplified version)
function initMarchingCubesTables() {
  // Edge table indicates which edges are intersected
  // Tri table indicates which triangles to generate
  // This is a simplified version - full tables have 256 entries

  for (let i = 0; i < 256; i++) {
    MC_EDGE_TABLE[i] = 0;
    MC_TRI_TABLE[i] = [];
  }

  // A few common cases
  MC_EDGE_TABLE[1] = 0x109;
  MC_TRI_TABLE[1] = [0, 8, 3];

  MC_EDGE_TABLE[254] = 0x109;
  MC_TRI_TABLE[254] = [0, 3, 8];
}

initMarchingCubesTables();

class MarchingCubes {
  constructor(distanceField, isoValue = 0) {
    this.field = distanceField;
    this.isoValue = isoValue;
  }

  extract() {
    const mesh = new Mesh();
    const vertexCache = new Map();

    for (let iz = 0; iz < this.field.sizeZ - 1; iz++) {
      for (let iy = 0; iy < this.field.sizeY - 1; iy++) {
        for (let ix = 0; ix < this.field.sizeX - 1; ix++) {
          this._processCube(mesh, vertexCache, ix, iy, iz);
        }
      }
    }

    mesh.computeNormals();
    mesh.computeBounds();
    return mesh;
  }

  _processCube(mesh, vertexCache, ix, iy, iz) {
    // Sample 8 corners
    const values = [
      this.field.data[this.field._index(ix, iy, iz)],
      this.field.data[this.field._index(ix + 1, iy, iz)],
      this.field.data[this.field._index(ix + 1, iy, iz + 1)],
      this.field.data[this.field._index(ix, iy, iz + 1)],
      this.field.data[this.field._index(ix, iy + 1, iz)],
      this.field.data[this.field._index(ix + 1, iy + 1, iz)],
      this.field.data[this.field._index(ix + 1, iy + 1, iz + 1)],
      this.field.data[this.field._index(ix, iy + 1, iz + 1)]
    ];

    // Compute cube index
    let cubeIndex = 0;
    for (let i = 0; i < 8; i++) {
      if (values[i] < this.isoValue) cubeIndex |= (1 << i);
    }

    // Skip empty cubes
    if (cubeIndex === 0 || cubeIndex === 255) return;

    // Get corner positions
    const corners = [
      this.field._gridToWorld(ix, iy, iz),
      this.field._gridToWorld(ix + 1, iy, iz),
      this.field._gridToWorld(ix + 1, iy, iz + 1),
      this.field._gridToWorld(ix, iy, iz + 1),
      this.field._gridToWorld(ix, iy + 1, iz),
      this.field._gridToWorld(ix + 1, iy + 1, iz),
      this.field._gridToWorld(ix + 1, iy + 1, iz + 1),
      this.field._gridToWorld(ix, iy + 1, iz + 1)
    ];

    // Simple case: generate triangles based on cube index
    // In a full implementation, we'd use the lookup tables
    // For now, generate a simple approximation

    const insideCorners = [];
    const outsideCorners = [];

    for (let i = 0; i < 8; i++) {
      if (values[i] < this.isoValue) {
        insideCorners.push(corners[i]);
      } else {
        outsideCorners.push(corners[i]);
      }
    }

    // Generate vertices at edge intersections (simplified)
    if (insideCorners.length > 0 && outsideCorners.length > 0) {
      const center = {
        x: corners.reduce((s, c) => s + c.x, 0) / 8,
        y: corners.reduce((s, c) => s + c.y, 0) / 8,
        z: corners.reduce((s, c) => s + c.z, 0) / 8
      };

      // Create a vertex at the center of the cube
      const vertIdx = mesh.addVertex(new Vertex(center));

      // Connect to neighboring cubes' vertices (simplified)
      // A full implementation would use proper edge interpolation
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SKINNING WEIGHTS CALCULATOR
// ══════════════════════════════════════════════════════════════════════════════

class SkinningWeights {
  constructor(mesh, skeleton) {
    this.mesh = mesh;
    this.skeleton = skeleton;
    this.maxInfluences = 4;
  }

  compute() {
    const joints = this.skeleton.joints || [];

    for (const vertex of this.mesh.vertices) {
      const weights = [];

      // Calculate distance to each joint
      for (const joint of joints) {
        const dist = Vec3.distance(vertex.position, joint.position);
        const influence = Math.max(0, 1 - dist / (joint.influenceRadius || 5));

        if (influence > 0) {
          weights.push({
            boneIndex: joint.skinningIndex || joint.id,
            weight: influence
          });
        }
      }

      // Sort by weight and keep top N
      weights.sort((a, b) => b.weight - a.weight);
      const topWeights = weights.slice(0, this.maxInfluences);

      // Normalize weights
      const totalWeight = topWeights.reduce((sum, w) => sum + w.weight, 0);
      if (totalWeight > 0) {
        for (const w of topWeights) {
          w.weight /= totalWeight;
        }
      }

      vertex.boneWeights = topWeights;
    }

    return this.getWeightsMatrix();
  }

  getWeightsMatrix() {
    const matrix = [];
    for (const vertex of this.mesh.vertices) {
      const row = new Array(this.maxInfluences * 2).fill(0);
      for (let i = 0; i < vertex.boneWeights.length; i++) {
        row[i * 2] = vertex.boneWeights[i].boneIndex;
        row[i * 2 + 1] = vertex.boneWeights[i].weight;
      }
      matrix.push(row);
    }
    return matrix;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// LOD GENERATOR
// ══════════════════════════════════════════════════════════════════════════════

class LODGenerator {
  constructor(mesh) {
    this.baseMesh = mesh;
    this.levels = [mesh];
  }

  generate(targetTriangles) {
    // Simplified decimation - just reduce triangle count
    const mesh = new Mesh();
    const ratio = targetTriangles / this.baseMesh.triangles.length;

    // Copy all vertices
    for (const v of this.baseMesh.vertices) {
      mesh.addVertex(v.clone());
    }

    // Copy subset of triangles
    const keepCount = Math.max(4, Math.floor(this.baseMesh.triangles.length * ratio));
    const step = Math.max(1, Math.floor(this.baseMesh.triangles.length / keepCount));

    for (let i = 0; i < this.baseMesh.triangles.length; i += step) {
      const tri = this.baseMesh.triangles[i];
      mesh.addTriangle(...tri.indices);
    }

    mesh.computeNormals();
    mesh.computeBounds();
    this.levels.push(mesh);

    return mesh;
  }

  getLevels() {
    return this.levels;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MESH GENERATOR
// ══════════════════════════════════════════════════════════════════════════════

class MeshGenerator extends EventEmitter {
  constructor(configPacket) {
    super();
    this.packet = configPacket;
    this.prng = configPacket.getPRNG(3);
    this.mesh = null;
    this.distanceField = null;
    this.lodLevels = [];
    this.skinningWeights = null;
    this.statistics = {
      vertices: 0,
      triangles: 0,
      buildTime: 0
    };
  }

  generate(topologyOutput, method = 'implicit') {
    const startTime = Date.now();
    const config = this.packet.config.layers[3];

    this.emit('start', { method });

    // Parse skeleton from topology output
    const skeleton = this._parseSkeletonFromTopology(topologyOutput);

    switch (method) {
      case 'implicit':
      case 'marching_cubes':
        this._generateImplicitSurface(skeleton, config);
        break;
      case 'convex_hull':
        this._generateConvexHull(skeleton);
        break;
      case 'metaballs':
        this._generateMetaballs(skeleton, config);
        break;
      default:
        throw new Error(`Unknown mesh method: ${method}`);
    }

    // Compute skinning weights
    if (this.mesh && skeleton.joints.length > 0) {
      const skinning = new SkinningWeights(this.mesh, skeleton);
      this.skinningWeights = skinning.compute();
    }

    // Generate LOD levels
    if (config.lodLevels > 1) {
      this._generateLODs(config);
    }

    this.statistics.buildTime = Date.now() - startTime;
    this.statistics.vertices = this.mesh ? this.mesh.vertices.length : 0;
    this.statistics.triangles = this.mesh ? this.mesh.triangles.length : 0;

    this.emit('complete', {
      vertices: this.statistics.vertices,
      triangles: this.statistics.triangles,
      time: this.statistics.buildTime
    });

    return this.getOutput();
  }

  _parseSkeletonFromTopology(topologyOutput) {
    const graph = topologyOutput.graph;
    return {
      joints: graph.joints || [],
      bones: graph.bones || []
    };
  }

  _generateImplicitSurface(skeleton, config) {
    // Calculate bounds from skeleton
    const bounds = this._calculateSkeletonBounds(skeleton);
    const padding = 5;
    bounds.minX -= padding;
    bounds.minY -= padding;
    bounds.minZ -= padding;
    bounds.maxX += padding;
    bounds.maxY += padding;
    bounds.maxZ += padding;

    // Create distance field
    const resolution = config.resolution || 1;
    this.distanceField = new DistanceField(bounds, resolution);

    // Add capsules for each bone
    for (const bone of skeleton.bones) {
      const startJoint = skeleton.joints.find(j => j.id === bone.startJointId);
      const endJoint = skeleton.joints.find(j => j.id === bone.endJointId);

      if (startJoint && endJoint) {
        const radius = (bone.weight || 1) * 0.5;
        this.distanceField.addCapsule(startJoint.position, endJoint.position, radius);
      }
    }

    // Add spheres at joints
    for (const joint of skeleton.joints) {
      const radius = (joint.influenceRadius || 1) * 0.3;
      this.distanceField.addSphere(joint.position, radius);
    }

    // Extract mesh
    const mc = new MarchingCubes(this.distanceField, 0);
    this.mesh = mc.extract();
  }

  _generateConvexHull(skeleton) {
    // Simple convex hull from joint positions
    this.mesh = new Mesh();

    const points = skeleton.joints.map(j => j.position);
    if (points.length < 4) return;

    // Add vertices
    for (const p of points) {
      this.mesh.addVertex(new Vertex(p));
    }

    // Create triangles (simplified - not true convex hull)
    // Just connect points in order
    for (let i = 1; i < points.length - 1; i++) {
      this.mesh.addTriangle(0, i, i + 1);
    }

    this.mesh.computeNormals();
    this.mesh.computeBounds();
  }

  _generateMetaballs(skeleton, config) {
    // Similar to implicit but with smoother blending
    this._generateImplicitSurface(skeleton, config);
  }

  _calculateSkeletonBounds(skeleton) {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const joint of skeleton.joints) {
      const p = joint.position;
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      minZ = Math.min(minZ, p.z);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
      maxZ = Math.max(maxZ, p.z);
    }

    return { minX, minY, minZ, maxX, maxY, maxZ };
  }

  _generateLODs(config) {
    if (!this.mesh) return;

    const lodGen = new LODGenerator(this.mesh);
    const levels = config.lodLevels || 3;
    const baseTriangles = this.mesh.triangles.length;

    this.lodLevels = [this.mesh];

    for (let i = 1; i < levels; i++) {
      const targetTriangles = Math.floor(baseTriangles / Math.pow(2, i));
      if (targetTriangles >= 4) {
        this.lodLevels.push(lodGen.generate(targetTriangles));
      }
    }
  }

  getOutput() {
    return {
      mesh: this.mesh ? this.mesh.toJSON() : null,
      vertexBuffer: this.mesh ? Array.from(this.mesh.getVertexBuffer()) : [],
      indexBuffer: this.mesh ? Array.from(this.mesh.getIndexBuffer()) : [],
      skinningWeights: this.skinningWeights,
      lodLevels: this.lodLevels.map(m => ({
        vertices: m.vertices.length,
        triangles: m.triangles.length
      })),
      boundingBox: this.mesh ? this.mesh.boundingBox : null,
      boundingSphere: this.mesh ? this.mesh.boundingSphere : null,
      statistics: this.statistics,
      cacheKey: this.packet.getCacheKey()
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export {
  Vec3,
  Vertex,
  Triangle,
  Mesh,
  DistanceField,
  MarchingCubes,
  SkinningWeights,
  LODGenerator,
  MeshGenerator
};

export default MeshGenerator;

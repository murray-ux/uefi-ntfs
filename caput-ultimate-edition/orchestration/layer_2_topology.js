/**
 * LAYER 2: SKELETON TOPOLOGY
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Copyright 2025 murray-ux
 * SPDX-License-Identifier: Apache-2.0
 *
 * Master Generation Skeleton Ecosystem - Connectivity graphs, hierarchies, bones
 *
 * Operations:
 *   - Graph Construction (MST, Delaunay, proximity)
 *   - Hierarchy Inference (parent-child relationships)
 *   - Joint Parameterization (DOF, rotation limits)
 *   - Validation (cyclic detection, symmetry)
 *
 * GENESIS 2.0 — Forbidden Ninja City
 *
 * @module LAYER_2_TOPOLOGY
 * @author murray-ux <Founder & Lead Developer>
 * @version 1.0.0
 * @license Apache-2.0
 */

import { EventEmitter } from 'events';

// ══════════════════════════════════════════════════════════════════════════════
// JOINT TYPES & DEGREES OF FREEDOM
// ══════════════════════════════════════════════════════════════════════════════

const JOINT_TYPES = {
  FIXED: {
    name: 'fixed',
    dof: 0,
    defaultLimits: {}
  },
  HINGE: {
    name: 'hinge',
    dof: 1,
    defaultLimits: { minAngle: -90, maxAngle: 90 }
  },
  PIVOT: {
    name: 'pivot',
    dof: 1,
    defaultLimits: { minAngle: -180, maxAngle: 180 }
  },
  BALL: {
    name: 'ball',
    dof: 3,
    defaultLimits: {
      minPitch: -45, maxPitch: 45,
      minYaw: -45, maxYaw: 45,
      minRoll: -30, maxRoll: 30
    }
  },
  SADDLE: {
    name: 'saddle',
    dof: 2,
    defaultLimits: {
      minAngle1: -60, maxAngle1: 60,
      minAngle2: -30, maxAngle2: 30
    }
  }
};

const BONE_TYPES = {
  ROOT: 'root',
  SPINE: 'spine',
  LIMB: 'limb',
  EXTREMITY: 'extremity',
  DETAIL: 'detail'
};

// ══════════════════════════════════════════════════════════════════════════════
// GRAPH DATA STRUCTURES
// ══════════════════════════════════════════════════════════════════════════════

class Joint {
  constructor(id, position, options = {}) {
    this.id = id;
    this.position = { x: position.x, y: position.y, z: position.z || 0 };
    this.type = options.type || JOINT_TYPES.BALL;
    this.parent = options.parent || null;
    this.children = [];
    this.depth = options.depth || 0;
    this.boneType = options.boneType || BONE_TYPES.DETAIL;

    // Degrees of freedom and limits
    this.dof = this.type.dof;
    this.limits = { ...this.type.defaultLimits, ...options.limits };

    // Skinning data
    this.skinningIndex = options.skinningIndex || id;
    this.influenceRadius = options.influenceRadius || 1.0;

    // Metadata
    this.metadata = options.metadata || {};
  }

  setParent(parent) {
    this.parent = parent;
    if (parent && !parent.children.includes(this)) {
      parent.children.push(this);
    }
    this.depth = parent ? parent.depth + 1 : 0;
  }

  distanceTo(other) {
    const dx = this.position.x - other.position.x;
    const dy = this.position.y - other.position.y;
    const dz = this.position.z - other.position.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  toJSON() {
    return {
      id: this.id,
      position: this.position,
      type: this.type.name,
      parentId: this.parent ? this.parent.id : null,
      childrenIds: this.children.map(c => c.id),
      depth: this.depth,
      boneType: this.boneType,
      dof: this.dof,
      limits: this.limits,
      skinningIndex: this.skinningIndex,
      influenceRadius: this.influenceRadius,
      metadata: this.metadata
    };
  }
}

class Bone {
  constructor(startJoint, endJoint, options = {}) {
    this.id = options.id || `${startJoint.id}_${endJoint.id}`;
    this.start = startJoint;
    this.end = endJoint;
    this.length = startJoint.distanceTo(endJoint);
    this.type = options.type || BONE_TYPES.DETAIL;
    this.weight = options.weight || 1.0;
    this.metadata = options.metadata || {};
  }

  getMidpoint() {
    return {
      x: (this.start.position.x + this.end.position.x) / 2,
      y: (this.start.position.y + this.end.position.y) / 2,
      z: (this.start.position.z + this.end.position.z) / 2
    };
  }

  getDirection() {
    const dx = this.end.position.x - this.start.position.x;
    const dy = this.end.position.y - this.start.position.y;
    const dz = this.end.position.z - this.start.position.z;
    const len = this.length || 1;
    return { x: dx / len, y: dy / len, z: dz / len };
  }

  toJSON() {
    return {
      id: this.id,
      startJointId: this.start.id,
      endJointId: this.end.id,
      length: this.length,
      type: this.type,
      weight: this.weight,
      metadata: this.metadata
    };
  }
}

class SkeletonGraph {
  constructor() {
    this.joints = new Map();
    this.bones = [];
    this.root = null;
    this.adjacencyList = new Map();
  }

  addJoint(joint) {
    this.joints.set(joint.id, joint);
    this.adjacencyList.set(joint.id, []);
    return joint;
  }

  addBone(bone) {
    this.bones.push(bone);
    this.adjacencyList.get(bone.start.id).push(bone);
    this.adjacencyList.get(bone.end.id).push(bone);
    return bone;
  }

  setRoot(joint) {
    this.root = joint;
    joint.boneType = BONE_TYPES.ROOT;
  }

  getJoint(id) {
    return this.joints.get(id);
  }

  getBones(jointId) {
    return this.adjacencyList.get(jointId) || [];
  }

  getDescendants(joint) {
    const descendants = [];
    const queue = [...joint.children];
    while (queue.length > 0) {
      const current = queue.shift();
      descendants.push(current);
      queue.push(...current.children);
    }
    return descendants;
  }

  getAncestors(joint) {
    const ancestors = [];
    let current = joint.parent;
    while (current) {
      ancestors.push(current);
      current = current.parent;
    }
    return ancestors;
  }

  validateAcyclic() {
    const visited = new Set();
    const recursionStack = new Set();

    const dfs = (joint) => {
      visited.add(joint.id);
      recursionStack.add(joint.id);

      for (const child of joint.children) {
        if (!visited.has(child.id)) {
          if (dfs(child)) return true;
        } else if (recursionStack.has(child.id)) {
          return true; // Cycle detected
        }
      }

      recursionStack.delete(joint.id);
      return false;
    };

    if (this.root && dfs(this.root)) {
      return { valid: false, error: 'Cycle detected in skeleton hierarchy' };
    }

    return { valid: true };
  }

  toJSON() {
    return {
      joints: Array.from(this.joints.values()).map(j => j.toJSON()),
      bones: this.bones.map(b => b.toJSON()),
      rootId: this.root ? this.root.id : null
    };
  }

  static fromJSON(data) {
    const graph = new SkeletonGraph();

    // Create joints
    for (const jData of data.joints) {
      const joint = new Joint(jData.id, jData.position, {
        type: JOINT_TYPES[jData.type.toUpperCase()] || JOINT_TYPES.BALL,
        depth: jData.depth,
        boneType: jData.boneType,
        limits: jData.limits,
        skinningIndex: jData.skinningIndex,
        influenceRadius: jData.influenceRadius,
        metadata: jData.metadata
      });
      graph.addJoint(joint);
    }

    // Set parent relationships
    for (const jData of data.joints) {
      if (jData.parentId !== null) {
        const joint = graph.getJoint(jData.id);
        const parent = graph.getJoint(jData.parentId);
        joint.setParent(parent);
      }
    }

    // Create bones
    for (const bData of data.bones) {
      const bone = new Bone(
        graph.getJoint(bData.startJointId),
        graph.getJoint(bData.endJointId),
        {
          id: bData.id,
          type: bData.type,
          weight: bData.weight,
          metadata: bData.metadata
        }
      );
      graph.addBone(bone);
    }

    // Set root
    if (data.rootId !== null) {
      graph.setRoot(graph.getJoint(data.rootId));
    }

    return graph;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// UNION-FIND (for MST)
// ══════════════════════════════════════════════════════════════════════════════

class UnionFind {
  constructor(size) {
    this.parent = Array.from({ length: size }, (_, i) => i);
    this.rank = new Array(size).fill(0);
  }

  find(x) {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // Path compression
    }
    return this.parent[x];
  }

  union(x, y) {
    const rootX = this.find(x);
    const rootY = this.find(y);

    if (rootX === rootY) return false;

    // Union by rank
    if (this.rank[rootX] < this.rank[rootY]) {
      this.parent[rootX] = rootY;
    } else if (this.rank[rootX] > this.rank[rootY]) {
      this.parent[rootY] = rootX;
    } else {
      this.parent[rootY] = rootX;
      this.rank[rootX]++;
    }

    return true;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TOPOLOGY BUILDER
// ══════════════════════════════════════════════════════════════════════════════

class TopologyBuilder extends EventEmitter {
  constructor(configPacket) {
    super();
    this.packet = configPacket;
    this.prng = configPacket.getPRNG(2);
    this.graph = new SkeletonGraph();
    this.statistics = {
      totalJoints: 0,
      totalBones: 0,
      maxDepth: 0,
      buildTime: 0
    };
  }

  build(spatialOutput, method = 'mst') {
    const startTime = Date.now();
    const config = this.packet.config.layers[2];

    this.emit('start', { method, points: spatialOutput.points.length });

    // Create joints from points
    this._createJoints(spatialOutput.points);

    // Build connectivity
    switch (method) {
      case 'mst':
        this._buildMST(config);
        break;
      case 'delaunay':
        this._buildDelaunay(config);
        break;
      case 'proximity':
        this._buildProximity(config);
        break;
      default:
        throw new Error(`Unknown connection method: ${method}`);
    }

    // Infer hierarchy
    this._inferHierarchy(config);

    // Parameterize joints
    this._parameterizeJoints();

    // Validate
    const validation = this.graph.validateAcyclic();
    if (!validation.valid) {
      this.emit('error', validation.error);
    }

    this.statistics.buildTime = Date.now() - startTime;
    this.statistics.totalJoints = this.graph.joints.size;
    this.statistics.totalBones = this.graph.bones.length;

    this.emit('complete', {
      joints: this.statistics.totalJoints,
      bones: this.statistics.totalBones,
      time: this.statistics.buildTime
    });

    return this.getOutput();
  }

  _createJoints(points) {
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const joint = new Joint(i, { x: p.x, y: p.y, z: p.z || 0 }, {
        metadata: { originalPoint: p }
      });
      this.graph.addJoint(joint);
    }
  }

  _buildMST(config) {
    const joints = Array.from(this.graph.joints.values());
    const n = joints.length;
    if (n < 2) return;

    // Create all edges with distances
    const edges = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dist = joints[i].distanceTo(joints[j]);
        edges.push({ i, j, dist });
      }
    }

    // Sort edges by distance
    edges.sort((a, b) => a.dist - b.dist);

    // Kruskal's algorithm
    const uf = new UnionFind(n);
    for (const edge of edges) {
      if (uf.union(edge.i, edge.j)) {
        const bone = new Bone(joints[edge.i], joints[edge.j], {
          type: BONE_TYPES.DETAIL
        });
        this.graph.addBone(bone);

        if (this.graph.bones.length >= n - 1) break;
      }
    }
  }

  _buildDelaunay(config) {
    // Simplified Delaunay approximation using nearest neighbors
    const joints = Array.from(this.graph.joints.values());
    const maxConnections = config.maxConnections || 6;

    for (const joint of joints) {
      // Find nearest neighbors
      const distances = joints
        .filter(j => j.id !== joint.id)
        .map(j => ({ joint: j, dist: joint.distanceTo(j) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, maxConnections);

      for (const { joint: neighbor } of distances) {
        // Check if bone already exists
        const exists = this.graph.bones.some(b =>
          (b.start.id === joint.id && b.end.id === neighbor.id) ||
          (b.start.id === neighbor.id && b.end.id === joint.id)
        );

        if (!exists) {
          const bone = new Bone(joint, neighbor);
          this.graph.addBone(bone);
        }
      }
    }
  }

  _buildProximity(config) {
    const joints = Array.from(this.graph.joints.values());
    const maxDistance = config.maxDistance || 10;
    const maxConnections = config.maxConnections || 4;

    for (const joint of joints) {
      let connections = 0;
      for (const other of joints) {
        if (joint.id === other.id) continue;
        if (connections >= maxConnections) break;

        const dist = joint.distanceTo(other);
        if (dist <= maxDistance) {
          // Check if bone already exists
          const exists = this.graph.bones.some(b =>
            (b.start.id === joint.id && b.end.id === other.id) ||
            (b.start.id === other.id && b.end.id === joint.id)
          );

          if (!exists) {
            const bone = new Bone(joint, other);
            this.graph.addBone(bone);
            connections++;
          }
        }
      }
    }
  }

  _inferHierarchy(config) {
    const joints = Array.from(this.graph.joints.values());
    if (joints.length === 0) return;

    // Find root (lowest or most central point)
    let root = joints[0];
    for (const joint of joints) {
      if (joint.position.z < root.position.z) {
        root = joint;
      }
    }
    this.graph.setRoot(root);
    root.depth = 0;

    // BFS to assign hierarchy
    const visited = new Set([root.id]);
    const queue = [root];

    while (queue.length > 0) {
      const current = queue.shift();

      // Find connected joints through bones
      for (const bone of this.graph.getBones(current.id)) {
        const neighbor = bone.start.id === current.id ? bone.end : bone.start;

        if (!visited.has(neighbor.id)) {
          visited.add(neighbor.id);
          neighbor.setParent(current);
          neighbor.depth = current.depth + 1;
          this.statistics.maxDepth = Math.max(this.statistics.maxDepth, neighbor.depth);

          // Assign bone types based on depth
          this._assignBoneType(neighbor, bone, config);

          queue.push(neighbor);
        }
      }
    }
  }

  _assignBoneType(joint, bone, config) {
    const hierarchyDepth = config.hierarchyDepth || 5;
    const depthRatio = joint.depth / hierarchyDepth;

    if (depthRatio < 0.2) {
      joint.boneType = BONE_TYPES.SPINE;
      bone.type = BONE_TYPES.SPINE;
    } else if (depthRatio < 0.5) {
      joint.boneType = BONE_TYPES.LIMB;
      bone.type = BONE_TYPES.LIMB;
    } else if (depthRatio < 0.8) {
      joint.boneType = BONE_TYPES.EXTREMITY;
      bone.type = BONE_TYPES.EXTREMITY;
    } else {
      joint.boneType = BONE_TYPES.DETAIL;
      bone.type = BONE_TYPES.DETAIL;
    }
  }

  _parameterizeJoints() {
    for (const joint of this.graph.joints.values()) {
      // Assign joint type based on bone type and connections
      const connectionCount = joint.children.length + (joint.parent ? 1 : 0);

      if (joint.boneType === BONE_TYPES.ROOT) {
        joint.type = JOINT_TYPES.FIXED;
      } else if (joint.boneType === BONE_TYPES.SPINE) {
        joint.type = JOINT_TYPES.BALL;
        joint.limits = { ...JOINT_TYPES.BALL.defaultLimits };
        // Reduce range for spine
        joint.limits.minPitch *= 0.5;
        joint.limits.maxPitch *= 0.5;
      } else if (connectionCount === 1) {
        joint.type = JOINT_TYPES.HINGE;
      } else if (connectionCount === 2) {
        joint.type = JOINT_TYPES.SADDLE;
      } else {
        joint.type = JOINT_TYPES.BALL;
      }

      joint.dof = joint.type.dof;
      if (!joint.limits || Object.keys(joint.limits).length === 0) {
        joint.limits = { ...joint.type.defaultLimits };
      }

      // Calculate influence radius based on bone lengths
      const bones = this.graph.getBones(joint.id);
      if (bones.length > 0) {
        const avgLength = bones.reduce((sum, b) => sum + b.length, 0) / bones.length;
        joint.influenceRadius = avgLength * 0.5;
      }
    }
  }

  getOutput() {
    // Generate skinning indices matrix
    const skinningIndices = [];
    for (const joint of this.graph.joints.values()) {
      skinningIndices.push({
        jointId: joint.id,
        index: joint.skinningIndex,
        influenceRadius: joint.influenceRadius
      });
    }

    return {
      graph: this.graph.toJSON(),
      skinningIndices,
      statistics: this.statistics,
      cacheKey: this.packet.getCacheKey()
    };
  }

  // Mirror skeleton for symmetry
  mirrorSkeleton(axis = 'x') {
    const joints = Array.from(this.graph.joints.values());
    const mirroredJoints = [];

    for (const joint of joints) {
      const mirroredPos = { ...joint.position };
      mirroredPos[axis] = -mirroredPos[axis];

      const mirroredJoint = new Joint(
        `${joint.id}_mirror`,
        mirroredPos,
        {
          type: joint.type,
          depth: joint.depth,
          boneType: joint.boneType,
          limits: joint.limits,
          metadata: { ...joint.metadata, mirrored: true }
        }
      );
      mirroredJoints.push(mirroredJoint);
      this.graph.addJoint(mirroredJoint);
    }

    // Mirror bones
    for (const bone of [...this.graph.bones]) {
      const mirrorStart = this.graph.getJoint(`${bone.start.id}_mirror`);
      const mirrorEnd = this.graph.getJoint(`${bone.end.id}_mirror`);

      if (mirrorStart && mirrorEnd) {
        const mirroredBone = new Bone(mirrorStart, mirrorEnd, {
          id: `${bone.id}_mirror`,
          type: bone.type,
          weight: bone.weight
        });
        this.graph.addBone(mirroredBone);
      }
    }

    return mirroredJoints;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export {
  JOINT_TYPES,
  BONE_TYPES,
  Joint,
  Bone,
  SkeletonGraph,
  TopologyBuilder
};

export default TopologyBuilder;

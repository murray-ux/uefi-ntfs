/**
 * VALIDATION & ERROR HANDLING
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Copyright 2025 murray-ux
 * SPDX-License-Identifier: Apache-2.0
 *
 * Master Generation Skeleton Ecosystem - Robust validation and error handling
 *
 * Features:
 *   - Schema validation for all layer inputs/outputs
 *   - Custom error types with context
 *   - Recovery strategies for common failures
 *   - Validation decorators for pipeline stages
 *
 * GENESIS 2.0 — Forbidden Ninja City
 *
 * @module VALIDATION
 * @author murray-ux <Founder & Lead Developer>
 * @version 1.0.0
 * @license Apache-2.0
 */

// ══════════════════════════════════════════════════════════════════════════════
// CUSTOM ERROR TYPES
// ══════════════════════════════════════════════════════════════════════════════

class GenerationError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = 'GenerationError';
    this.context = context;
    this.timestamp = new Date().toISOString();

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GenerationError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

class ValidationError extends GenerationError {
  constructor(message, field, value, expected) {
    super(message, { field, value, expected });
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
    this.expected = expected;
  }
}

class LayerError extends GenerationError {
  constructor(message, layerId, phase, cause = null) {
    super(message, { layerId, phase, cause: cause?.message });
    this.name = 'LayerError';
    this.layerId = layerId;
    this.phase = phase;
    this.cause = cause;
  }
}

class ConfigurationError extends GenerationError {
  constructor(message, configPath, invalidValue) {
    super(message, { configPath, invalidValue });
    this.name = 'ConfigurationError';
    this.configPath = configPath;
    this.invalidValue = invalidValue;
  }
}

class CacheError extends GenerationError {
  constructor(message, operation, cacheKey) {
    super(message, { operation, cacheKey });
    this.name = 'CacheError';
    this.operation = operation;
    this.cacheKey = cacheKey;
  }
}

class BoundaryError extends GenerationError {
  constructor(message, chunkCoords, side) {
    super(message, { chunkCoords, side });
    this.name = 'BoundaryError';
    this.chunkCoords = chunkCoords;
    this.side = side;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMA DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

const Schemas = {
  // Chunk coordinates
  coords: {
    type: 'object',
    required: ['x', 'y'],
    properties: {
      x: { type: 'integer' },
      y: { type: 'integer' },
      z: { type: 'integer', default: 0 }
    }
  },

  // Vector3
  vector3: {
    type: 'object',
    required: ['x', 'y', 'z'],
    properties: {
      x: { type: 'number' },
      y: { type: 'number' },
      z: { type: 'number' }
    }
  },

  // Point (spatial distribution)
  point: {
    type: 'object',
    required: ['x', 'y'],
    properties: {
      x: { type: 'number' },
      y: { type: 'number' },
      z: { type: 'number' },
      type: { type: 'string' },
      weight: { type: 'number', min: 0, max: 10 }
    }
  },

  // Joint (skeleton)
  joint: {
    type: 'object',
    required: ['id', 'position'],
    properties: {
      id: { type: ['string', 'number'] },
      position: { $ref: 'vector3' },
      type: { type: 'string', enum: ['fixed', 'hinge', 'pivot', 'ball', 'saddle'] },
      parentId: { type: ['string', 'number', 'null'] },
      depth: { type: 'integer', min: 0 },
      boneType: { type: 'string', enum: ['root', 'spine', 'limb', 'extremity', 'detail'] }
    }
  },

  // Bone (skeleton)
  bone: {
    type: 'object',
    required: ['startJointId', 'endJointId'],
    properties: {
      id: { type: 'string' },
      startJointId: { type: ['string', 'number'] },
      endJointId: { type: ['string', 'number'] },
      length: { type: 'number', min: 0 },
      type: { type: 'string' },
      weight: { type: 'number', min: 0 }
    }
  },

  // Mesh vertex
  vertex: {
    type: 'object',
    required: ['position'],
    properties: {
      position: { $ref: 'vector3' },
      normal: { $ref: 'vector3' },
      uv: {
        type: 'object',
        properties: {
          u: { type: 'number', min: 0, max: 1 },
          v: { type: 'number', min: 0, max: 1 }
        }
      },
      boneWeights: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            boneIndex: { type: 'integer', min: 0 },
            weight: { type: 'number', min: 0, max: 1 }
          }
        }
      }
    }
  },

  // Layer 1 output
  spatialOutput: {
    type: 'object',
    required: ['points', 'statistics'],
    properties: {
      points: { type: 'array', items: { $ref: 'point' } },
      densityHeatmap: { type: ['object', 'null'] },
      statistics: {
        type: 'object',
        properties: {
          totalPoints: { type: 'integer', min: 0 },
          acceptedPoints: { type: 'integer', min: 0 },
          rejectedPoints: { type: 'integer', min: 0 },
          generationTime: { type: 'number', min: 0 }
        }
      }
    }
  },

  // Layer 2 output
  topologyOutput: {
    type: 'object',
    required: ['graph', 'skinningIndices'],
    properties: {
      graph: {
        type: 'object',
        required: ['joints', 'bones'],
        properties: {
          joints: { type: 'array', items: { $ref: 'joint' } },
          bones: { type: 'array', items: { $ref: 'bone' } },
          rootId: { type: ['string', 'number', 'null'] }
        }
      },
      skinningIndices: { type: 'array' },
      statistics: { type: 'object' }
    }
  },

  // Configuration
  config: {
    type: 'object',
    properties: {
      density: { type: 'number', min: 0, max: 1 },
      scale: { type: 'number', min: 0.01, max: 100 },
      variety: { type: 'number', min: 0, max: 1 },
      qualityLevel: { type: 'string', enum: ['low', 'medium', 'high', 'ultra'] },
      contentType: { type: 'string', enum: ['generic', 'creature', 'structure', 'terrain', 'vegetation'] },
      chunkSize: { type: 'integer', min: 8, max: 512 },
      chunkHeight: { type: 'integer', min: 8, max: 512 }
    }
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMA VALIDATOR
// ══════════════════════════════════════════════════════════════════════════════

class SchemaValidator {
  constructor() {
    this.schemas = { ...Schemas };
  }

  addSchema(name, schema) {
    this.schemas[name] = schema;
  }

  validate(data, schemaNameOrDef, path = '') {
    const schema = typeof schemaNameOrDef === 'string'
      ? this.schemas[schemaNameOrDef]
      : schemaNameOrDef;

    if (!schema) {
      throw new ValidationError(
        `Unknown schema: ${schemaNameOrDef}`,
        path,
        data,
        'valid schema name'
      );
    }

    const errors = [];
    this._validateValue(data, schema, path, errors);

    return {
      valid: errors.length === 0,
      errors
    };
  }

  _validateValue(data, schema, path, errors) {
    // Handle $ref
    if (schema.$ref) {
      return this._validateValue(data, this.schemas[schema.$ref], path, errors);
    }

    // Handle null
    if (data === null || data === undefined) {
      if (schema.required !== false && !schema.default) {
        errors.push({
          path,
          message: `Required value is missing`,
          expected: schema.type,
          actual: data
        });
      }
      return;
    }

    // Type validation
    if (schema.type) {
      const types = Array.isArray(schema.type) ? schema.type : [schema.type];
      const actualType = this._getType(data);

      if (!types.includes(actualType) && !types.includes('null')) {
        errors.push({
          path,
          message: `Invalid type`,
          expected: types.join(' | '),
          actual: actualType
        });
        return; // Don't continue validation if type is wrong
      }
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(data)) {
      errors.push({
        path,
        message: `Value not in allowed values`,
        expected: schema.enum,
        actual: data
      });
    }

    // Number validations
    if (typeof data === 'number') {
      if (schema.min !== undefined && data < schema.min) {
        errors.push({
          path,
          message: `Value below minimum`,
          expected: `>= ${schema.min}`,
          actual: data
        });
      }
      if (schema.max !== undefined && data > schema.max) {
        errors.push({
          path,
          message: `Value above maximum`,
          expected: `<= ${schema.max}`,
          actual: data
        });
      }
    }

    // String validations
    if (typeof data === 'string') {
      if (schema.minLength !== undefined && data.length < schema.minLength) {
        errors.push({
          path,
          message: `String too short`,
          expected: `length >= ${schema.minLength}`,
          actual: data.length
        });
      }
      if (schema.maxLength !== undefined && data.length > schema.maxLength) {
        errors.push({
          path,
          message: `String too long`,
          expected: `length <= ${schema.maxLength}`,
          actual: data.length
        });
      }
      if (schema.pattern && !new RegExp(schema.pattern).test(data)) {
        errors.push({
          path,
          message: `String does not match pattern`,
          expected: schema.pattern,
          actual: data
        });
      }
    }

    // Object validations
    if (typeof data === 'object' && !Array.isArray(data)) {
      // Required properties
      if (schema.required) {
        for (const prop of schema.required) {
          if (!(prop in data)) {
            errors.push({
              path: path ? `${path}.${prop}` : prop,
              message: `Required property missing`,
              expected: prop,
              actual: undefined
            });
          }
        }
      }

      // Property validations
      if (schema.properties) {
        for (const [prop, propSchema] of Object.entries(schema.properties)) {
          if (prop in data) {
            this._validateValue(
              data[prop],
              propSchema,
              path ? `${path}.${prop}` : prop,
              errors
            );
          }
        }
      }
    }

    // Array validations
    if (Array.isArray(data)) {
      if (schema.minItems !== undefined && data.length < schema.minItems) {
        errors.push({
          path,
          message: `Array too short`,
          expected: `length >= ${schema.minItems}`,
          actual: data.length
        });
      }
      if (schema.maxItems !== undefined && data.length > schema.maxItems) {
        errors.push({
          path,
          message: `Array too long`,
          expected: `length <= ${schema.maxItems}`,
          actual: data.length
        });
      }
      if (schema.items) {
        data.forEach((item, index) => {
          this._validateValue(item, schema.items, `${path}[${index}]`, errors);
        });
      }
    }
  }

  _getType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (Number.isInteger(value)) return 'integer';
    return typeof value;
  }

  assertValid(data, schemaNameOrDef, context = '') {
    const result = this.validate(data, schemaNameOrDef);

    if (!result.valid) {
      const errorMessages = result.errors
        .map(e => `  - ${e.path}: ${e.message} (expected: ${e.expected}, got: ${e.actual})`)
        .join('\n');

      throw new ValidationError(
        `Validation failed${context ? ` for ${context}` : ''}:\n${errorMessages}`,
        result.errors[0]?.path,
        data,
        schemaNameOrDef
      );
    }

    return true;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// LAYER VALIDATORS
// ══════════════════════════════════════════════════════════════════════════════

class LayerValidator {
  constructor() {
    this.validator = new SchemaValidator();
  }

  validateLayer0Input(config) {
    return this.validator.validate(config, 'config');
  }

  validateLayer1Input(packet) {
    const errors = [];

    if (!packet) {
      errors.push({ path: 'packet', message: 'Config packet is required' });
      return { valid: false, errors };
    }

    if (!packet.bounds) {
      errors.push({ path: 'packet.bounds', message: 'Bounds are required' });
    } else {
      if (packet.bounds.maxX <= packet.bounds.minX) {
        errors.push({ path: 'packet.bounds', message: 'maxX must be greater than minX' });
      }
      if (packet.bounds.maxY <= packet.bounds.minY) {
        errors.push({ path: 'packet.bounds', message: 'maxY must be greater than minY' });
      }
    }

    if (!packet.seeds || typeof packet.seeds !== 'object') {
      errors.push({ path: 'packet.seeds', message: 'Layer seeds are required' });
    }

    return { valid: errors.length === 0, errors };
  }

  validateLayer1Output(output) {
    return this.validator.validate(output, 'spatialOutput');
  }

  validateLayer2Input(spatialOutput) {
    const result = this.validator.validate(spatialOutput, 'spatialOutput');

    if (result.valid && spatialOutput.points.length < 2) {
      result.valid = false;
      result.errors.push({
        path: 'points',
        message: 'At least 2 points required for skeleton generation',
        expected: '>= 2',
        actual: spatialOutput.points.length
      });
    }

    return result;
  }

  validateLayer2Output(output) {
    return this.validator.validate(output, 'topologyOutput');
  }

  validateLayer3Input(topologyOutput) {
    const result = this.validateLayer2Output(topologyOutput);

    if (result.valid && topologyOutput.graph.joints.length === 0) {
      result.valid = false;
      result.errors.push({
        path: 'graph.joints',
        message: 'At least 1 joint required for mesh generation',
        expected: '>= 1',
        actual: 0
      });
    }

    return result;
  }

  validateMesh(mesh) {
    const errors = [];

    if (!mesh) {
      errors.push({ path: 'mesh', message: 'Mesh is required' });
      return { valid: false, errors };
    }

    if (!mesh.vertices || mesh.vertices.length === 0) {
      errors.push({ path: 'mesh.vertices', message: 'Mesh must have vertices' });
    }

    if (!mesh.triangles || mesh.triangles.length === 0) {
      errors.push({ path: 'mesh.triangles', message: 'Mesh must have triangles' });
    }

    // Validate triangle indices
    if (mesh.vertices && mesh.triangles) {
      const maxIndex = mesh.vertices.length - 1;
      mesh.triangles.forEach((tri, i) => {
        const indices = tri.indices || tri;
        if (Array.isArray(indices)) {
          indices.forEach((idx, j) => {
            if (idx < 0 || idx > maxIndex) {
              errors.push({
                path: `mesh.triangles[${i}][${j}]`,
                message: 'Invalid vertex index',
                expected: `0-${maxIndex}`,
                actual: idx
              });
            }
          });
        }
      });
    }

    return { valid: errors.length === 0, errors };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ERROR RECOVERY STRATEGIES
// ══════════════════════════════════════════════════════════════════════════════

class RecoveryStrategies {
  // Spatial distribution recovery
  static recoverEmptyPoints(spatialOutput, config) {
    if (!spatialOutput.points || spatialOutput.points.length === 0) {
      // Generate minimum viable points
      const bounds = config.bounds || { minX: 0, maxX: 10, minY: 0, maxY: 10 };
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;

      return {
        ...spatialOutput,
        points: [
          { x: centerX, y: centerY, z: 0, type: 'primary', weight: 1.0 }
        ],
        recovered: true,
        recoveryReason: 'Generated fallback center point'
      };
    }
    return spatialOutput;
  }

  // Skeleton topology recovery
  static recoverDisconnectedGraph(topologyOutput) {
    const { graph } = topologyOutput;

    if (!graph.joints || graph.joints.length === 0) {
      return {
        ...topologyOutput,
        recovered: true,
        recoveryReason: 'No joints to recover'
      };
    }

    // Find disconnected components
    const visited = new Set();
    const components = [];

    const dfs = (jointId, component) => {
      visited.add(jointId);
      component.push(jointId);

      for (const bone of graph.bones) {
        const neighborId = bone.startJointId === jointId ? bone.endJointId :
                          bone.endJointId === jointId ? bone.startJointId : null;

        if (neighborId && !visited.has(neighborId)) {
          dfs(neighborId, component);
        }
      }
    };

    for (const joint of graph.joints) {
      if (!visited.has(joint.id)) {
        const component = [];
        dfs(joint.id, component);
        components.push(component);
      }
    }

    // If multiple components, connect them
    if (components.length > 1) {
      const newBones = [...graph.bones];

      for (let i = 1; i < components.length; i++) {
        // Connect first joint of each component to main component
        newBones.push({
          id: `recovery_bone_${i}`,
          startJointId: components[0][0],
          endJointId: components[i][0],
          type: 'detail',
          weight: 0.5
        });
      }

      return {
        ...topologyOutput,
        graph: {
          ...graph,
          bones: newBones
        },
        recovered: true,
        recoveryReason: `Connected ${components.length} disconnected components`
      };
    }

    return topologyOutput;
  }

  // Mesh recovery
  static recoverInvalidMesh(meshOutput) {
    if (!meshOutput.mesh) {
      return {
        ...meshOutput,
        mesh: {
          vertices: [],
          triangles: [],
          boundingBox: null,
          boundingSphere: null
        },
        recovered: true,
        recoveryReason: 'Created empty mesh placeholder'
      };
    }

    // Remove degenerate triangles
    if (meshOutput.mesh.triangles) {
      const validTriangles = meshOutput.mesh.triangles.filter(tri => {
        const indices = tri.indices || tri;
        if (!Array.isArray(indices) || indices.length !== 3) return false;

        // Check for duplicate indices (degenerate triangle)
        return indices[0] !== indices[1] &&
               indices[1] !== indices[2] &&
               indices[0] !== indices[2];
      });

      if (validTriangles.length !== meshOutput.mesh.triangles.length) {
        return {
          ...meshOutput,
          mesh: {
            ...meshOutput.mesh,
            triangles: validTriangles
          },
          recovered: true,
          recoveryReason: `Removed ${meshOutput.mesh.triangles.length - validTriangles.length} degenerate triangles`
        };
      }
    }

    return meshOutput;
  }

  // Cache recovery
  static recoverCorruptedCache(cacheError, regenerate) {
    console.warn(`Cache recovery: ${cacheError.message}`);

    // Delete corrupted entry and regenerate
    return regenerate();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SAFE EXECUTION WRAPPER
// ══════════════════════════════════════════════════════════════════════════════

class SafeExecutor {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 100;
    this.onError = options.onError || console.error;
    this.onRecovery = options.onRecovery || console.warn;
  }

  async execute(fn, context = {}) {
    let lastError = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Add context to error
        if (error instanceof GenerationError) {
          error.context = { ...error.context, ...context, attempt };
        }

        this.onError(`Attempt ${attempt + 1} failed:`, error.message);

        // Delay before retry
        if (attempt < this.maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * (attempt + 1)));
        }
      }
    }

    throw lastError;
  }

  async executeWithRecovery(fn, recoveryFn, context = {}) {
    try {
      return await this.execute(fn, context);
    } catch (error) {
      this.onRecovery(`Attempting recovery for: ${error.message}`);

      try {
        const recovered = await recoveryFn(error);
        return { ...recovered, recovered: true };
      } catch (recoveryError) {
        throw new GenerationError(
          `Recovery failed: ${recoveryError.message}`,
          {
            originalError: error.message,
            recoveryError: recoveryError.message,
            ...context
          }
        );
      }
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export {
  // Error types
  GenerationError,
  ValidationError,
  LayerError,
  ConfigurationError,
  CacheError,
  BoundaryError,

  // Validation
  Schemas,
  SchemaValidator,
  LayerValidator,

  // Recovery
  RecoveryStrategies,
  SafeExecutor
};

export default {
  GenerationError,
  ValidationError,
  LayerError,
  ConfigurationError,
  CacheError,
  BoundaryError,
  Schemas,
  SchemaValidator,
  LayerValidator,
  RecoveryStrategies,
  SafeExecutor
};

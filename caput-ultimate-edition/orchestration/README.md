# Master Generation Skeleton Ecosystem

**Copyright 2025 murray-ux — Apache-2.0**

A layered, multi-stage procedural generation framework for creating complex content—from skeletal structures through full asset pipelines—using deterministic, context-aware generation across modular stages.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                 Master Generation Ecosystem                     │
├─────────────────────────────────────────────────────────────────┤
│  Layer 0: Seed & Configuration                                  │
│  └── PRNG, parameters, constraints                              │
│                         ↓                                       │
│  Layer 1: Spatial Distribution                                  │
│  └── Point clouds, density maps, grids                          │
│                         ↓                                       │
│  Layer 2: Skeleton Topology                                     │
│  └── Connectivity, hierarchies, bones                           │
│                         ↓                                       │
│  Layer 3: Mesh & Geometry                                       │
│  └── 3D models, skinning, deformation                           │
│                         ↓                                       │
│  Layer 4: Asset & Animation                                     │
│  └── Textures, rigs, motion sequences                           │
│                         ↓                                       │
│  Layer 5: World Integration                                     │
│  └── Placement, scenes, interactions                            │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Generate a creature
node orchestration/generation_master.js \
  --master_seed 42 \
  --content_type creature \
  --density 0.7 \
  --chunk_coords 0,0,0 \
  --output_format json

# Generate a structure
node orchestration/generation_master.js \
  --content_type structure \
  --density 0.4 \
  --quality high

# Show help
node orchestration/generation_master.js --help
```

## CLI Options

| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--master_seed` | `-s` | auto | Deterministic generation seed |
| `--content_type` | `-t` | generic | creature, structure, terrain, vegetation |
| `--density` | `-d` | 0.5 | Generation density (0-1) |
| `--chunk_coords` | `-c` | 0,0,0 | Chunk coordinates (x,y,z) |
| `--output_format` | `-o` | json | json, gltf, fbx |
| `--verbose` | `-v` | false | Enable detailed logging |

## Layer Details

### Layer 0: Seed & Configuration

**Module:** `layer_0_seed_config.js`

Establishes deterministic randomness and global constraints.

```javascript
import { SeedManager, ConfigManager, ConfigPacket } from './layer_0_seed_config.js';

const seedManager = new SeedManager('my-seed');
const configManager = new ConfigManager({ density: 0.8 });
const packet = new ConfigPacket(seedManager, configManager, { x: 0, y: 0, z: 0 });
```

**Key Classes:**
- `SeededPRNG` — Mulberry32 PRNG with deterministic output
- `SeedManager` — Layer and chunk seed derivation
- `ConfigManager` — Configuration with validation
- `ConstraintsGraph` — Rule-based constraint system
- `ConfigPacket` — Per-chunk generation context

### Layer 1: Spatial Distribution

**Module:** `layer_1_spatial_dist.js`

Generates point clouds and density maps.

```javascript
import SpatialDistributor from './layer_1_spatial_dist.js';

const distributor = new SpatialDistributor(configPacket);
distributor.createDensityMap({ baseDensity: 0.6 });
const output = distributor.generate('poisson');
// output.points, output.densityHeatmap, output.statistics
```

**Sampling Methods:**
- `poisson` — Even distribution with minimum spacing
- `grid` — Regular grid with jitter
- `noise` — Noise-threshold based sampling

### Layer 2: Skeleton Topology

**Module:** `layer_2_topology.js`

Builds connectivity graphs with joints and bones.

```javascript
import TopologyBuilder from './layer_2_topology.js';

const builder = new TopologyBuilder(configPacket);
const output = builder.build(spatialOutput, 'mst');
// output.graph.joints, output.graph.bones, output.skinningIndices
```

**Connection Methods:**
- `mst` — Minimum Spanning Tree
- `delaunay` — Delaunay triangulation
- `proximity` — Distance-based connections

**Joint Types:**
- `fixed` — 0 DOF (root anchors)
- `hinge` — 1 DOF (elbows, knees)
- `pivot` — 1 DOF with full rotation
- `ball` — 3 DOF (shoulders, hips)
- `saddle` — 2 DOF (thumbs, ankles)

### Layer 3: Mesh & Geometry

**Module:** `layer_3_mesh_geom.js`

Generates 3D meshes and skinning weights.

```javascript
import MeshGenerator from './layer_3_mesh_geom.js';

const generator = new MeshGenerator(configPacket);
const output = generator.generate(topologyOutput, 'marching_cubes');
// output.mesh, output.vertexBuffer, output.skinningWeights
```

**Mesh Methods:**
- `marching_cubes` — Isosurface extraction
- `convex_hull` — Convex wrapping
- `implicit` — Distance field based

### Layer 4: Asset & Animation

**Module:** `layer_4_assets_anim.js`

Creates textures, rigs, and animations.

```javascript
import AssetGenerator from './layer_4_assets_anim.js';

const generator = new AssetGenerator(configPacket);
const output = generator.generate(meshOutput, topologyOutput);
// output.textures, output.rig, output.animations, output.audioCues
```

**Generated Assets:**
- **Textures:** Diffuse, Normal, Roughness (procedural)
- **Rig:** Auto-generated IK chains and FK controls
- **Animations:** Idle, Walk, Procedural clips
- **Audio:** Footstep, Ambient cues

### Layer 5: World Integration

**Module:** `layer_5_world_integ.js`

Places content in scenes with interactions.

```javascript
import WorldIntegrator from './layer_5_world_integ.js';

const integrator = new WorldIntegrator(configPacket);
const output = integrator.integrate(assetOutput, meshOutput, topologyOutput, spatialOutput);
// output.scene, output.composition, output.interactions, output.exports
```

**Export Formats:**
- GLTF 2.0
- FBX (descriptor)
- Native JSON

## Chunk Management

**Module:** `chunk_manager.js`

Handles caching and seamless generation.

```javascript
import ChunkManager from './chunk_manager.js';

const manager = new ChunkManager({ cacheDir: './cache' });

// Generate cache key
const key = manager.generateCacheKey(seed, coords, type, configHash);

// Check cache
const cached = await manager.get(key);
if (!cached) {
  // Generate and cache
  await manager.set(key, generatedChunk);
}
```

**Features:**
- LRU memory cache
- Disk persistence
- Deterministic cache keys
- Neighbor boundary coordination

## Validation

**Module:** `validation.js`

Error handling and recovery.

```javascript
import { LayerValidator, RecoveryStrategies, SafeExecutor } from './validation.js';

const validator = new LayerValidator();
const result = validator.validateLayer1Output(output);

if (!result.valid) {
  const recovered = RecoveryStrategies.recoverEmptyPoints(output, config);
}
```

**Error Types:**
- `GenerationError` — Base error with context
- `ValidationError` — Schema validation failures
- `LayerError` — Layer-specific failures
- `CacheError` — Caching issues
- `BoundaryError` — Chunk boundary problems

## Configuration

### Content Type Presets

**Creature:**
```json
{
  "contentType": "creature",
  "layers": {
    "2": { "connectionMethod": "mst", "hierarchyDepth": 7 },
    "3": { "meshMethod": "marching_cubes" }
  }
}
```

**Structure:**
```json
{
  "contentType": "structure",
  "layers": {
    "2": { "connectionMethod": "proximity", "hierarchyDepth": 3 },
    "3": { "meshMethod": "convex_hull" }
  }
}
```

### Quality Levels

| Level | Points | Triangles | Textures |
|-------|--------|-----------|----------|
| low | 100 | 1000 | 256px |
| medium | 500 | 10000 | 1024px |
| high | 2000 | 50000 | 2048px |
| ultra | 5000 | 100000 | 4096px |

## Determinism

The ecosystem guarantees identical outputs for identical inputs:

```javascript
// These will produce identical results
const result1 = await generate({ seed: 'test', coords: { x: 0, y: 0, z: 0 } });
const result2 = await generate({ seed: 'test', coords: { x: 0, y: 0, z: 0 } });

assert.deepEqual(result1, result2); // ✓
```

## Seamless Chunks

Chunks tile seamlessly through boundary sharing:

```
┌─────────┬─────────┐
│ Chunk   │ Chunk   │
│ (0,0)   │ (1,0)   │
│    ←────┼────→    │  ← Shared boundary points
└─────────┴─────────┘
```

Boundary points are computed using deterministic seed derivatives.

## Testing

```bash
# Run all orchestration tests
npm run test:orchestration

# Run specific test file
node --test test/orchestration.test.js
```

## API Reference

### GenerationPipeline

Main orchestrator class.

```javascript
class GenerationPipeline {
  constructor(options: {
    masterSeed?: string;
    config?: object;
    cacheDir?: string;
  });

  async generateChunk(coords: { x: number; y: number; z?: number }): Promise<ChunkData>;
  async generateRegion(start: Coords, end: Coords): Promise<ChunkData[]>;
  getStatistics(): Statistics;
  exportConfig(): ConfigExport;
}
```

### ChunkData

Per-chunk generation result.

```javascript
class ChunkData {
  coords: { x: number; y: number; z: number };
  cacheKey: string;
  layers: { [layerId: number]: LayerOutput };
  boundaries: { left: Point[]; right: Point[]; top: Point[]; bottom: Point[] };

  setLayerOutput(layerId: number, output: object): this;
  getLayerOutput(layerId: number): object;
  isComplete(): boolean;
  toJSON(): object;
}
```

## Performance

Typical generation times (medium quality, single chunk):

| Layer | Time |
|-------|------|
| L0: Seed | <1ms |
| L1: Spatial | 10-50ms |
| L2: Topology | 5-20ms |
| L3: Mesh | 50-200ms |
| L4: Assets | 100-500ms |
| L5: World | 10-50ms |
| **Total** | **~200-800ms** |

## License

Apache License 2.0 — See [LICENSE](../LICENSE)

---

GENESIS 2.0 — Forbidden Ninja City

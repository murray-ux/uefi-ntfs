# Generation Parameters Reference

**Copyright 2025 murray-ux — Apache-2.0**

## Global Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `masterSeed` | string/number | auto | any | Deterministic generation seed |
| `density` | float | 0.5 | 0-1 | Overall content density |
| `scale` | float | 1.0 | 0.1-100 | Global scale multiplier |
| `variety` | float | 0.7 | 0-1 | Variation in generated content |
| `qualityLevel` | string | "medium" | low/medium/high/ultra | Detail level |
| `contentType` | string | "generic" | see below | Type of content to generate |

## Content Types

### Generic
Default type with balanced parameters for any content.

### Creature
Organic living entities with skeletal systems.
- Higher joint count
- Bilateral symmetry enabled
- Animation-ready rig

### Structure
Architectural or mechanical constructs.
- Rigid connections
- Grid-aligned placement
- LOD optimization

### Terrain
Landscape features and environmental geometry.
- High vertex count
- Heightmap integration
- Large scale

### Vegetation
Plants, trees, foliage.
- Branching hierarchy
- Wind animation support
- Billboarding for LOD

## Chunk Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `chunkSize` | int | 64 | Width/depth of chunk in units |
| `chunkHeight` | int | 32 | Vertical extent of chunk |
| `boundaryOverlap` | int | 2 | Units of overlap for seamless tiling |

## Layer 1: Spatial Distribution

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `samplingMethod` | string | "poisson" | poisson/grid/noise |
| `minSpacing` | float | 2.0 | Minimum distance between points |
| `maxPoints` | int | 1000 | Maximum points per chunk |
| `jitter` | float | 0.3 | Grid jitter amount (grid mode) |
| `threshold` | float | 0.3 | Noise threshold (noise mode) |

### Sampling Methods

**Poisson Disk**
- Even distribution with minimum spacing
- Best for organic/natural placement
- Higher computation cost

**Grid + Jitter**
- Regular grid with random offset
- Best for structured placement
- Lower computation cost

**Noise-based**
- Points where noise exceeds threshold
- Best for clustered/organic patterns
- Variable density

## Layer 2: Skeleton Topology

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `connectionMethod` | string | "mst" | mst/delaunay/proximity |
| `maxConnections` | int | 6 | Maximum edges per joint |
| `hierarchyDepth` | int | 5 | Maximum hierarchy levels |
| `maxDistance` | float | 10 | Max connection distance (proximity) |

### Connection Methods

**MST (Minimum Spanning Tree)**
- Guaranteed connected graph
- Minimal total edge weight
- Tree structure (no cycles)

**Delaunay**
- Dense connectivity
- Triangle-based
- Good for mesh generation

**Proximity**
- Connect within radius
- May create disconnected components
- Flexible topology

## Layer 3: Mesh & Geometry

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `meshMethod` | string | "marching_cubes" | marching_cubes/convex_hull/implicit |
| `lodLevels` | int | 3 | Number of LOD meshes |
| `targetTriangles` | int | 10000 | Base mesh triangle count |
| `resolution` | float | 1.0 | Voxel/grid resolution |

### Mesh Methods

**Marching Cubes**
- Isosurface extraction
- Smooth organic shapes
- Good for creatures

**Convex Hull**
- Wrapping geometry
- Fast computation
- Good for structures

**Implicit Surface**
- Distance field based
- High quality
- Slower computation

## Layer 4: Asset & Animation

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `textureResolution` | int | 1024 | Texture size (power of 2) |
| `animationFPS` | int | 30 | Animation frame rate |
| `audioEnabled` | bool | true | Generate audio cues |

### Texture Types Generated
- Diffuse/Albedo (procedural color)
- Normal map (from height)
- Roughness/Metallic (procedural noise)

### Animation Clips Generated
- Idle (subtle movement)
- Walk/Move (locomotion)
- Procedural (random variation)

## Layer 5: World Integration

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `placementMethod` | string | "raycast" | raycast/grid/random |
| `groupingEnabled` | bool | true | Create entity groups |
| `interactionGraph` | bool | true | Build interaction system |

### Placement Methods

**Raycast**
- Terrain-aligned placement
- Respects slope limits
- Realistic positioning

**Grid**
- Regular spacing
- Ignore terrain
- Fast placement

**Random**
- Uniform distribution
- Basic collision check
- Fastest method

## Constraints

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `forbiddenZones` | array | [] | Areas to exclude |
| `slopeLimit` | float | 45 | Maximum terrain slope (degrees) |
| `minHeight` | float | 0 | Minimum placement height |
| `maxHeight` | float | 100 | Maximum placement height |
| `exclusionRadius` | float | 1.0 | Minimum entity spacing |

## Presets

### Quick Generation
```json
{
  "qualityLevel": "low",
  "density": 0.3,
  "layers": {
    "1": { "maxPoints": 100 },
    "3": { "targetTriangles": 1000, "lodLevels": 1 },
    "4": { "textureResolution": 256 }
  }
}
```

### High Quality
```json
{
  "qualityLevel": "ultra",
  "density": 0.8,
  "layers": {
    "1": { "maxPoints": 5000 },
    "3": { "targetTriangles": 50000, "lodLevels": 5 },
    "4": { "textureResolution": 2048 }
  }
}
```

### Creature Default
```json
{
  "contentType": "creature",
  "density": 0.6,
  "layers": {
    "2": { "connectionMethod": "mst", "hierarchyDepth": 7 },
    "3": { "meshMethod": "marching_cubes" },
    "4": { "animationFPS": 60 }
  }
}
```

### Structure Default
```json
{
  "contentType": "structure",
  "density": 0.4,
  "layers": {
    "2": { "connectionMethod": "proximity", "hierarchyDepth": 3 },
    "3": { "meshMethod": "convex_hull" },
    "5": { "placementMethod": "grid" }
  }
}
```

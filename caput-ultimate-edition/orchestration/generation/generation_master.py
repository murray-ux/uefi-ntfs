#!/usr/bin/env python3
"""
generation_master.py — Master Generation Skeleton Ecosystem orchestrator.

Copyright (c) 2025 MuzzL3d Dictionary Contributors
Licensed under the Apache License, Version 2.0

Layered procedural generation framework:
  Layer 0: Seed & Configuration
  Layer 1: Spatial Distribution
  Layer 2: Skeleton Topology
  Layer 3: Mesh & Geometry
  Layer 4: Asset & Animation
  Layer 5: World Integration
"""

import argparse
import hashlib
import json
import math
import struct
import sys
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Layer 0: Seed & Configuration
# ---------------------------------------------------------------------------


def derive_layer_seed(master_seed: int, layer_id: int, chunk_x: int = 0,
                      chunk_y: int = 0, chunk_z: int = 0) -> int:
    """Deterministic seed derivation. Same inputs always produce same seed."""
    raw = f"{master_seed}:{layer_id}:{chunk_x}:{chunk_y}:{chunk_z}"
    h = hashlib.sha256(raw.encode()).hexdigest()
    return int(h[:16], 16)


def compute_cache_key(master_seed: int, chunk_coords: tuple,
                      generation_version: str, content_type: str,
                      params_hash: str) -> str:
    """Deterministic cache key for chunk-based generation."""
    raw = f"{master_seed}:{chunk_coords}:{generation_version}:{content_type}:{params_hash}"
    return hashlib.sha256(raw.encode()).hexdigest()


class GenerationConfig:
    """Layer 0 output: per-chunk configuration packet."""

    def __init__(self, master_seed: int, content_type: str, density: float,
                 chunk_coords: tuple = (0, 0, 0)):
        self.master_seed = master_seed
        self.content_type = content_type
        self.density = density
        self.chunk_coords = chunk_coords
        self.layer_seeds = {
            i: derive_layer_seed(master_seed, i, *chunk_coords)
            for i in range(6)
        }

    def to_dict(self) -> dict:
        return {
            "master_seed": self.master_seed,
            "content_type": self.content_type,
            "density": self.density,
            "chunk_coords": list(self.chunk_coords),
            "layer_seeds": self.layer_seeds,
        }


# ---------------------------------------------------------------------------
# Seeded RNG — deterministic, portable
# ---------------------------------------------------------------------------


class SeededRNG:
    """xorshift64 PRNG for deterministic generation."""

    def __init__(self, seed: int):
        self.state = seed if seed != 0 else 1

    def next_u64(self) -> int:
        x = self.state & 0xFFFFFFFFFFFFFFFF
        x ^= (x << 13) & 0xFFFFFFFFFFFFFFFF
        x ^= (x >> 7) & 0xFFFFFFFFFFFFFFFF
        x ^= (x << 17) & 0xFFFFFFFFFFFFFFFF
        self.state = x
        return x

    def next_float(self) -> float:
        return (self.next_u64() & 0xFFFFFFFF) / 0xFFFFFFFF

    def next_range(self, lo: float, hi: float) -> float:
        return lo + self.next_float() * (hi - lo)


# ---------------------------------------------------------------------------
# Layer 1: Spatial Distribution
# ---------------------------------------------------------------------------


def layer_1_spatial_distribution(config: GenerationConfig) -> list[dict]:
    """Generate point cloud using seeded Poisson-disk-like sampling."""
    seed = config.layer_seeds[1]
    rng = SeededRNG(seed)
    print(f"[Layer 1] Spatial distribution (seed={seed}, density={config.density})")

    # Grid-jittered sampling — approximate Poisson disk
    chunk_size = 64.0
    cell_size = max(1.0, chunk_size / max(1, int(config.density * 16)))
    cols = int(chunk_size / cell_size)
    rows = int(chunk_size / cell_size)
    cx, cy, cz = config.chunk_coords

    points: list[dict] = []
    for row in range(rows):
        for col in range(cols):
            if rng.next_float() > config.density:
                continue
            x = (col + rng.next_float()) * cell_size + cx * chunk_size
            y = (row + rng.next_float()) * cell_size + cy * chunk_size
            z = rng.next_range(-2.0, 2.0) + cz * chunk_size
            scale = rng.next_range(0.5, 2.0)
            rotation = rng.next_range(0, 2 * math.pi)
            points.append({
                "x": round(x, 4),
                "y": round(y, 4),
                "z": round(z, 4),
                "scale": round(scale, 4),
                "rotation": round(rotation, 4),
                "type": config.content_type,
            })

    print(f"[Layer 1] Generated {len(points)} distribution points")
    return points


# ---------------------------------------------------------------------------
# Layer 2: Skeleton Topology
# ---------------------------------------------------------------------------


def _distance(a: dict, b: dict) -> float:
    return math.sqrt((a["x"]-b["x"])**2 + (a["y"]-b["y"])**2 + (a["z"]-b["z"])**2)


def layer_2_skeleton_topology(config: GenerationConfig,
                               points: list[dict]) -> dict:
    """Build connectivity graph from point set using MST approximation."""
    seed = config.layer_seeds[2]
    rng = SeededRNG(seed)
    print(f"[Layer 2] Skeleton topology (seed={seed}, points={len(points)})")

    if len(points) < 2:
        return {"joints": points, "bones": []}

    # Greedy MST via Prim's algorithm (on first 256 points for performance)
    subset = points[:256]
    n = len(subset)
    in_tree = [False] * n
    in_tree[0] = True
    bones: list[dict] = []

    for _ in range(n - 1):
        best_dist = float("inf")
        best_i = 0
        best_j = 0
        for i in range(n):
            if not in_tree[i]:
                continue
            for j in range(n):
                if in_tree[j]:
                    continue
                d = _distance(subset[i], subset[j])
                if d < best_dist:
                    best_dist = d
                    best_i = i
                    best_j = j
        if best_dist < float("inf"):
            in_tree[best_j] = True
            bones.append({
                "from": best_i,
                "to": best_j,
                "length": round(best_dist, 4),
                "stiffness": round(rng.next_range(0.3, 1.0), 4),
            })

    # Assign joint types based on connectivity
    connectivity = [0] * n
    for bone in bones:
        connectivity[bone["from"]] += 1
        connectivity[bone["to"]] += 1

    joints = []
    for i, pt in enumerate(subset):
        joint_type = "leaf" if connectivity[i] <= 1 else "branch" if connectivity[i] <= 3 else "hub"
        joints.append({**pt, "joint_type": joint_type, "connectivity": connectivity[i]})

    print(f"[Layer 2] Built {len(bones)} bones, {len(joints)} joints")
    return {"joints": joints, "bones": bones}


# ---------------------------------------------------------------------------
# Layer 3: Mesh & Geometry
# ---------------------------------------------------------------------------


def layer_3_mesh_geometry(config: GenerationConfig,
                           skeleton: dict) -> dict:
    """Generate 3D mesh from skeleton topology via tube extrusion."""
    seed = config.layer_seeds[3]
    rng = SeededRNG(seed)
    print(f"[Layer 3] Mesh generation (seed={seed})")

    joints = skeleton.get("joints", [])
    bones = skeleton.get("bones", [])

    vertices: list[dict] = []
    indices: list[int] = []
    skinning_weights: list[dict] = []

    segments_per_bone = 6
    radial_divisions = 8

    for bone_idx, bone in enumerate(bones):
        if bone["from"] >= len(joints) or bone["to"] >= len(joints):
            continue
        j_from = joints[bone["from"]]
        j_to = joints[bone["to"]]

        # Direction vector
        dx = j_to["x"] - j_from["x"]
        dy = j_to["y"] - j_from["y"]
        dz = j_to["z"] - j_from["z"]
        length = max(0.001, math.sqrt(dx*dx + dy*dy + dz*dz))

        base_radius = rng.next_range(0.1, 0.5)

        for seg in range(segments_per_bone + 1):
            t = seg / segments_per_bone
            # Interpolated position along bone
            px = j_from["x"] + dx * t
            py = j_from["y"] + dy * t
            pz = j_from["z"] + dz * t
            # Taper radius
            radius = base_radius * (1.0 - 0.3 * t)

            for rad in range(radial_divisions):
                angle = 2 * math.pi * rad / radial_divisions
                # Simplified — offset in XZ plane (ignoring bone orientation for mock)
                vx = px + radius * math.cos(angle)
                vy = py
                vz = pz + radius * math.sin(angle)

                vertices.append({
                    "x": round(vx, 4), "y": round(vy, 4), "z": round(vz, 4),
                })
                skinning_weights.append({
                    "bone": bone_idx,
                    "weight_from": round(1.0 - t, 4),
                    "weight_to": round(t, 4),
                })

            # Generate triangle indices for this ring
            if seg < segments_per_bone:
                base_v = len(vertices) - radial_divisions
                next_base = base_v + radial_divisions
                for rad in range(radial_divisions):
                    r_next = (rad + 1) % radial_divisions
                    # Two triangles per quad
                    indices.extend([
                        base_v + rad, next_base + rad, next_base + r_next,
                        base_v + rad, next_base + r_next, base_v + r_next,
                    ])

    print(f"[Layer 3] Generated {len(vertices)} vertices, {len(indices)//3} triangles")
    return {
        "vertices": vertices,
        "indices": indices,
        "skinning_weights": skinning_weights,
        "triangle_count": len(indices) // 3,
    }


# ---------------------------------------------------------------------------
# Layer 4: Asset & Animation
# ---------------------------------------------------------------------------


def layer_4_assets_animation(config: GenerationConfig,
                              mesh: dict, skeleton: dict) -> dict:
    """Generate procedural textures, auto-rig, and animation clips."""
    seed = config.layer_seeds[4]
    rng = SeededRNG(seed)
    print(f"[Layer 4] Asset generation (seed={seed})")

    bones = skeleton.get("bones", [])

    # Procedural texture — color palette per content type
    palettes = {
        "creature": [(0.6, 0.4, 0.3), (0.5, 0.35, 0.25), (0.7, 0.5, 0.4)],
        "vegetation": [(0.2, 0.6, 0.2), (0.15, 0.5, 0.15), (0.3, 0.7, 0.1)],
        "mineral": [(0.5, 0.5, 0.55), (0.6, 0.58, 0.55), (0.4, 0.4, 0.45)],
    }
    palette = palettes.get(config.content_type, palettes["creature"])

    tex_size = 64
    texels: list[dict] = []
    for y in range(tex_size):
        for x in range(tex_size):
            base = palette[int(rng.next_float() * len(palette)) % len(palette)]
            noise = rng.next_range(-0.05, 0.05)
            texels.append({
                "r": round(min(1, max(0, base[0] + noise)), 4),
                "g": round(min(1, max(0, base[1] + noise)), 4),
                "b": round(min(1, max(0, base[2] + noise)), 4),
            })

    textures = [{
        "name": f"{config.content_type}_diffuse",
        "width": tex_size,
        "height": tex_size,
        "pixel_count": len(texels),
        "sample": texels[:4],  # Just first 4 for output brevity
    }]

    # Auto-rig: map bones to rig joints
    rig_joints = []
    for i, bone in enumerate(bones):
        rig_joints.append({
            "id": i,
            "name": f"bone_{i:03d}",
            "length": bone.get("length", 1.0),
            "stiffness": bone.get("stiffness", 0.5),
        })

    # Animation: procedural idle + walk cycles
    animations = []
    for clip_name in ["idle", "walk"]:
        frames = 30 if clip_name == "idle" else 60
        keyframes = []
        for f in range(0, frames, 5):
            t = f / frames
            bone_transforms = []
            for j in range(min(len(rig_joints), 16)):
                amplitude = 0.05 if clip_name == "idle" else 0.3
                rx = round(amplitude * math.sin(2 * math.pi * t + j * 0.5), 4)
                ry = round(amplitude * math.cos(2 * math.pi * t + j * 0.3), 4)
                bone_transforms.append({"joint": j, "rx": rx, "ry": ry, "rz": 0})
            keyframes.append({"frame": f, "transforms": bone_transforms})
        animations.append({
            "name": clip_name,
            "fps": 30,
            "total_frames": frames,
            "keyframe_count": len(keyframes),
            "keyframes": keyframes,
        })

    print(f"[Layer 4] Generated {len(textures)} textures, {len(rig_joints)} rig joints, {len(animations)} animations")
    return {
        "textures": textures,
        "rig": {"joint_count": len(rig_joints), "joints": rig_joints},
        "animations": animations,
    }


# ---------------------------------------------------------------------------
# Layer 5: World Integration
# ---------------------------------------------------------------------------


def layer_5_world_integration(config: GenerationConfig,
                               mesh: dict, assets: dict) -> dict:
    """Place generated content into scene graph with LOD and interaction zones."""
    seed = config.layer_seeds[5]
    rng = SeededRNG(seed)
    print(f"[Layer 5] World integration (seed={seed})")

    cx, cy, cz = config.chunk_coords

    # Scene graph nodes
    scene_nodes: list[dict] = []

    # Root node for this chunk
    chunk_node = {
        "id": f"chunk_{cx}_{cy}_{cz}",
        "type": "chunk_root",
        "transform": {"tx": cx * 64, "ty": cy * 64, "tz": cz * 64},
        "children": [],
    }

    # Place generated content
    vertex_count = len(mesh.get("vertices", []))
    tri_count = mesh.get("triangle_count", 0)

    # LOD levels based on triangle count
    lods = []
    for lod_level in range(3):
        reduction = 1.0 / (2 ** lod_level)
        lods.append({
            "level": lod_level,
            "distance": lod_level * 50.0,
            "triangle_count": max(1, int(tri_count * reduction)),
            "vertex_count": max(1, int(vertex_count * reduction)),
        })

    content_node = {
        "id": f"content_{config.content_type}_{cx}_{cy}_{cz}",
        "type": config.content_type,
        "lods": lods,
        "bounding_sphere": {
            "cx": cx * 64 + 32,
            "cy": cy * 64 + 32,
            "cz": cz * 64,
            "radius": 45.0,
        },
        "has_animation": len(assets.get("animations", [])) > 0,
        "has_physics": config.content_type == "creature",
    }

    chunk_node["children"].append(content_node["id"])
    scene_nodes.append(chunk_node)
    scene_nodes.append(content_node)

    # Interaction zones
    interaction_zones = []
    if config.content_type == "creature":
        interaction_zones.append({
            "type": "awareness",
            "radius": rng.next_range(10, 30),
            "trigger": "proximity",
        })
        interaction_zones.append({
            "type": "combat",
            "radius": rng.next_range(3, 8),
            "trigger": "aggression",
        })

    # Export manifest
    export_manifest = {
        "format": "fbx",
        "meshes": 1,
        "materials": len(assets.get("textures", [])),
        "animations": len(assets.get("animations", [])),
        "lod_levels": len(lods),
        "total_vertices": vertex_count,
        "total_triangles": tri_count,
    }

    print(f"[Layer 5] Scene: {len(scene_nodes)} nodes, {len(lods)} LODs, {len(interaction_zones)} interaction zones")
    return {
        "scene_graph": scene_nodes,
        "interaction_zones": interaction_zones,
        "export_manifest": export_manifest,
        "export_format": "fbx",
    }


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------


def run_pipeline(master_seed: int, content_type: str, density: float,
                 chunk_coords: tuple, output_format: str = "fbx") -> dict:
    """Execute the full generation pipeline."""
    print(f"=== GENESIS Generation Pipeline ===")
    print(f"  Seed: {master_seed}")
    print(f"  Type: {content_type}")
    print(f"  Chunk: {chunk_coords}")
    print()

    # Layer 0
    config = GenerationConfig(master_seed, content_type, density, chunk_coords)
    print(f"[Layer 0] Configuration: {json.dumps(config.to_dict(), indent=2)}")

    # Layer 1
    points = layer_1_spatial_distribution(config)

    # Layer 2
    skeleton = layer_2_skeleton_topology(config, points)

    # Layer 3
    mesh = layer_3_mesh_geometry(config, skeleton)

    # Layer 4
    assets = layer_4_assets_animation(config, mesh, skeleton)

    # Layer 5
    scene = layer_5_world_integration(config, mesh, assets)

    result = {
        "config": config.to_dict(),
        "points": len(points),
        "skeleton": {
            "joints": len(skeleton.get("joints", [])),
            "bones": len(skeleton.get("bones", [])),
        },
        "mesh": {
            "vertices": len(mesh.get("vertices", [])),
            "triangles": mesh.get("triangle_count", 0),
        },
        "assets": {
            "textures": len(assets.get("textures", [])),
            "rig_joints": assets.get("rig", {}).get("joint_count", 0),
            "animations": len(assets.get("animations", [])),
        },
        "scene": {
            "nodes": len(scene.get("scene_graph", [])),
            "interaction_zones": len(scene.get("interaction_zones", [])),
            "export_format": scene.get("export_format", output_format),
        },
        "output_format": output_format,
    }

    print()
    print("=== Pipeline Complete ===")
    return result


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="GENESIS Master Generation Ecosystem"
    )
    parser.add_argument("--content_type", default="creature")
    parser.add_argument("--master_seed", type=int, default=42)
    parser.add_argument("--density", type=float, default=0.75)
    parser.add_argument("--chunk_coords", default="0,0,0")
    parser.add_argument("--output_format", default="fbx")

    args = parser.parse_args()
    coords = tuple(int(x) for x in args.chunk_coords.split(","))

    result = run_pipeline(
        master_seed=args.master_seed,
        content_type=args.content_type,
        density=args.density,
        chunk_coords=coords,
        output_format=args.output_format,
    )

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()

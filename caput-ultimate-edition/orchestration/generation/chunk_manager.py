#!/usr/bin/env python3
"""
chunk_manager.py — Deterministic chunk I/O and caching.

Copyright (c) 2025 MuzzL3d Dictionary Contributors
Licensed under the Apache License, Version 2.0

Cache key: hash(master_seed, chunk_x, chunk_y, chunk_z,
                generation_version, content_type, parameters_hash)

Identical inputs -> identical outputs. No runtime randomness.
"""

import hashlib
import json
from pathlib import Path
from typing import Any

CACHE_DIR = Path(__file__).parent.parent.parent / "level_creator" / "cache"
GENERATION_VERSION = "1.0.0-alpha"


def compute_cache_key(master_seed: int, chunk_coords: tuple,
                      content_type: str, params_hash: str) -> str:
    raw = (f"{master_seed}:{chunk_coords[0]},{chunk_coords[1]},{chunk_coords[2]}"
           f":{GENERATION_VERSION}:{content_type}:{params_hash}")
    return hashlib.sha256(raw.encode()).hexdigest()


def params_hash(params: dict) -> str:
    """Deterministic hash of generation parameters."""
    canonical = json.dumps(params, sort_keys=True, ensure_ascii=True)
    return hashlib.sha256(canonical.encode()).hexdigest()[:16]


def cache_get(key: str) -> dict | None:
    """Load cached chunk data. Returns None on miss."""
    path = CACHE_DIR / f"{key}.json"
    if path.exists():
        return json.loads(path.read_text())
    return None


def cache_put(key: str, data: dict) -> None:
    """Store chunk data in cache."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = CACHE_DIR / f"{key}.json"
    path.write_text(json.dumps(data, indent=2))


def cache_clear() -> int:
    """Remove all cached chunks. Returns count removed."""
    if not CACHE_DIR.exists():
        return 0
    count = 0
    for f in CACHE_DIR.glob("*.json"):
        f.unlink()
        count += 1
    return count

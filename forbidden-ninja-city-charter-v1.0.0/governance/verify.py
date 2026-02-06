#!/usr/bin/env python3
"""Forbidden Ninja City Charter - Integrity Verification (Python)"""

import sys
import json
import hashlib
from pathlib import Path

CHARTER_DIR = Path(__file__).parent.parent / "charter"


class Colors:
    RED = "\033[0;31m"
    GREEN = "\033[0;32m"
    YELLOW = "\033[1;33m"
    NC = "\033[0m"


def error(msg: str) -> None:
    print(f"{Colors.RED}ERROR:{Colors.NC} {msg}", file=sys.stderr)
    sys.exit(1)


def info(msg: str) -> None:
    print(f"{Colors.GREEN}INFO:{Colors.NC} {msg}")


def main() -> None:
    meta_path = CHARTER_DIR / "charter.meta.json"
    if not meta_path.exists():
        error(f"Charter metadata not found: {meta_path}")

    with meta_path.open("r", encoding="utf-8") as f:
        meta = json.load(f)

    info("Charter metadata loaded")

    charter_path = CHARTER_DIR / meta["charter_filename"]
    if not charter_path.exists():
        error(f"Charter file not found: {charter_path}")

    charter_bytes = charter_path.read_bytes()
    computed_hash = hashlib.sha256(charter_bytes).hexdigest()

    if computed_hash != meta["charter_sha256"]:
        error(
            "Charter hash mismatch!\n"
            f"  Expected: {meta['charter_sha256']}\n"
            f"  Computed: {computed_hash}"
        )

    info("Charter integrity verified: hash matches")

    required = ["document_type", "name", "version", "admin_master", "supremacy"]
    for field in required:
        if field not in meta:
            error(f"Missing required metadata field: {field}")

    info("Charter governance verification: PASSED")


if __name__ == "__main__":
    main()

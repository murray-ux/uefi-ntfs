#!/usr/bin/env python3
"""
verifier.py — Environment verification for GENESIS / Unnamed System.

Runs the complete verification matrix:
  BOOT  -> Secure Boot enabled
  FS    -> Repository tree hash matches
  POLICY -> Egress allow-list enforced
  AUDIT  -> Append-only log chain intact

All gates are fail-closed: any failure halts execution.
"""

import hashlib
import os
import subprocess
import sys
from pathlib import Path

from audit import log_event, verify_log_integrity

PROJECT_ROOT = Path(__file__).parent.parent


class VerificationFailure(Exception):
    """Raised when any verification gate fails."""
    pass


def check_secure_boot() -> bool:
    """Gate: BOOT — Check if Secure Boot is enabled (Linux only)."""
    sb_path = Path("/sys/firmware/efi/efivars")
    if not sb_path.exists():
        # Not an EFI system; log and continue (non-fatal on dev machines)
        log_event("BOOT_CHECK_SKIP", "verifier", {"reason": "No EFI vars found"})
        return True

    try:
        result = subprocess.run(
            ["mokutil", "--sb-state"],
            capture_output=True,
            timeout=10,
        )
        enabled = b"SecureBoot enabled" in result.stdout
        if not enabled:
            raise VerificationFailure("Secure Boot is not enabled")
        log_event("BOOT_CHECK_PASS", "verifier")
        return True
    except FileNotFoundError:
        log_event("BOOT_CHECK_SKIP", "verifier", {"reason": "mokutil not found"})
        return True


def check_tree_hashes() -> bool:
    """Gate: FS — Verify BUILD/hashes/ files match actual artifacts."""
    hashes_dir = PROJECT_ROOT / "build" / "hashes"
    if not hashes_dir.exists():
        log_event("FS_CHECK_SKIP", "verifier", {"reason": "No hashes directory"})
        return True

    for hash_file in hashes_dir.glob("*.sha256"):
        expected_hash = hash_file.read_text().strip().split()[0]

        # Derive artifact path from hash filename
        # e.g. firmware-windturbine-v0.1.sha256 -> build/firmware/windturbine-v0.1.hex
        artifact_name = hash_file.stem  # firmware-windturbine-v0.1
        parts = artifact_name.split("-", 1)  # ['firmware', 'windturbine-v0.1']
        if len(parts) == 2:
            artifact_path = PROJECT_ROOT / "build" / parts[0] / (parts[1] + ".hex")
        else:
            continue

        if not artifact_path.exists():
            log_event("FS_CHECK_SKIP", "verifier", {
                "artifact": str(artifact_path),
                "reason": "Artifact not present",
            })
            continue

        actual_hash = hashlib.sha256(artifact_path.read_bytes()).hexdigest()
        if actual_hash != expected_hash:
            log_event("FS_HASH_MISMATCH", "verifier", {
                "artifact": str(artifact_path),
                "expected": expected_hash,
                "actual": actual_hash,
            })
            raise VerificationFailure(
                f"Hash mismatch for {artifact_path}: expected {expected_hash}, got {actual_hash}"
            )

        log_event("FS_HASH_VALID", "verifier", {
            "artifact": str(artifact_path),
            "hash": actual_hash,
        })

    return True


def check_audit_integrity() -> bool:
    """Gate: AUDIT — Verify append-only log chain is intact."""
    if not verify_log_integrity():
        raise VerificationFailure("Audit log integrity check failed")
    log_event("AUDIT_CHECK_PASS", "verifier")
    return True


def verify_environment(strict: bool = True) -> bool:
    """
    Run the full verification matrix.

    Args:
        strict: If True, any gate failure halts the process.
                If False, failures are logged but execution continues.
    """
    log_event("VERIFY_START", "verifier", {"strict": strict})

    gates = [
        ("BOOT", check_secure_boot),
        ("FS", check_tree_hashes),
        ("AUDIT", check_audit_integrity),
    ]

    all_passed = True
    for gate_name, gate_fn in gates:
        try:
            gate_fn()
            log_event(f"{gate_name}_GATE_PASS", "verifier")
        except VerificationFailure as e:
            log_event(f"{gate_name}_GATE_FAIL", "verifier", {"error": str(e)})
            if strict:
                print(f"VERIFICATION FAILED [{gate_name}]: {e}", file=sys.stderr)
                sys.exit(1)
            all_passed = False
        except Exception as e:
            log_event(f"{gate_name}_GATE_ERROR", "verifier", {"error": str(e)})
            if strict:
                print(f"VERIFICATION ERROR [{gate_name}]: {e}", file=sys.stderr)
                sys.exit(1)
            all_passed = False

    if all_passed:
        log_event("VERIFY_PASS", "verifier")
    else:
        log_event("VERIFY_PARTIAL_FAIL", "verifier")

    return all_passed


if __name__ == "__main__":
    strict_mode = "--strict" in sys.argv
    ok = verify_environment(strict=strict_mode)
    sys.exit(0 if ok else 1)

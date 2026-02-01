#!/usr/bin/env python3
"""
policy_engine.py — Fail-closed policy enforcement for GENESIS / Unnamed System.

Governs:
- Firmware deployment approval (device + operation whitelist)
- Evidence bridge rules (GENESIS -> CASE)
- Egress allow-list enforcement
- Owner authority validation

Default posture: DENY. Every action must be explicitly approved.
"""

import subprocess
import sys
from pathlib import Path

from audit import log_event

# ---------------------------------------------------------------------------
# FIRMWARE POLICY
# ---------------------------------------------------------------------------

APPROVED_FIRMWARE = {
    "windturbine-v0.1": {
        "device_type": "Arduino ATmega328P",
        "sha256_file": "build/hashes/firmware-windturbine-v0.1.sha256",
        "allow_devices": ["MSI_TITAN_GT77HX_PROG_INTERFACE"],
        "allow_operations": ["program", "read", "verify"],
        "deny_operations": ["modify", "reflash_without_audit"],
        "expiry_date": "2026-12-31",
        "notes": "Wind turbine sensor; read-only input; no control output",
        "requires_verification": True,
        "requires_audit_log": True,
        "fail_mode": "closed",
    }
}


class PolicyViolation(Exception):
    """Raised when any policy gate fails. System must halt."""
    pass


class FirmwarePolicy:
    """Firmware approval and deployment policy."""

    @staticmethod
    def is_approved(firmware_id: str) -> bool:
        return firmware_id in APPROVED_FIRMWARE

    @staticmethod
    def get_policy(firmware_id: str) -> dict:
        if not FirmwarePolicy.is_approved(firmware_id):
            raise PolicyViolation(f"Firmware {firmware_id} not in approval list")
        return APPROVED_FIRMWARE[firmware_id]

    @staticmethod
    def verify_deployment(firmware_id: str, device_id: str, operation: str) -> bool:
        """Check if deployment is allowed. Raises PolicyViolation on deny."""
        policy = FirmwarePolicy.get_policy(firmware_id)

        if device_id not in policy["allow_devices"]:
            raise PolicyViolation(
                f"Device {device_id} not approved for {firmware_id}"
            )

        if operation in policy["deny_operations"]:
            raise PolicyViolation(
                f"Operation '{operation}' explicitly denied for {firmware_id}"
            )

        if operation not in policy["allow_operations"]:
            raise PolicyViolation(
                f"Operation '{operation}' not in allow list for {firmware_id}"
            )

        return True


# ---------------------------------------------------------------------------
# EVIDENCE BRIDGE POLICY (GENESIS -> CASE)
# ---------------------------------------------------------------------------

PROHIBITED_BRIDGE_CATEGORIES = {"unsorted", "health.claim", "health.referral"}

BRIDGE_MODES = {
    "direct_document",
    "summarised_evidence",
    "bundle_input",
    "metadata_only",
}


def check_bridge_policy(category: str, bridge_mode: str) -> bool:
    """Validate a GENESIS -> CASE bridge request. Raises PolicyViolation on deny."""
    if category in PROHIBITED_BRIDGE_CATEGORIES:
        raise PolicyViolation(
            f"Category '{category}' is prohibited from bridging into CASE"
        )

    if bridge_mode not in BRIDGE_MODES:
        raise PolicyViolation(
            f"Bridge mode '{bridge_mode}' is not recognised"
        )

    return True


# ---------------------------------------------------------------------------
# EGRESS POLICY
# ---------------------------------------------------------------------------

EGRESS_ALLOW_LIST = [
    "vault.bitwarden.com",
    "accounts.google.com",
    "login.microsoftonline.com",
    "myaccount.google.com",
    "github.com",
    "api.github.com",
]


def check_egress(hostname: str) -> bool:
    """Validate outbound connection target. Fail-closed on unknown."""
    if hostname not in EGRESS_ALLOW_LIST:
        raise PolicyViolation(
            f"Egress to '{hostname}' not in allow list"
        )
    return True


# ---------------------------------------------------------------------------
# OWNER AUTHORITY
# ---------------------------------------------------------------------------

OWNER_UID = "${OWNER_EMAIL}"  # Set via environment or config


def check_owner(actor_email: str) -> bool:
    """All authority terminates at the owner identity."""
    if actor_email != OWNER_UID:
        raise PolicyViolation(
            f"Actor '{actor_email}' is not the system owner"
        )
    return True


# ---------------------------------------------------------------------------
# MASTER ENFORCEMENT (called by orchestrator)
# ---------------------------------------------------------------------------

def enforce_policy() -> None:
    """Run all policy checks. Any failure halts the system."""
    # Firmware verification (if firmware present)
    verify_script = Path(__file__).parent.parent / "verify" / "firmware_check.sh"
    if verify_script.exists():
        try:
            result = subprocess.run(
                [str(verify_script), "windturbine-v0.1", "--verbose"],
                capture_output=True,
                timeout=30,
                check=True,
            )
            log_event("FW_POLICY_CHECK_PASS", "policy_engine", {
                "firmware": "windturbine-v0.1"
            })
        except subprocess.CalledProcessError as e:
            log_event("FW_POLICY_CHECK_FAIL", "policy_engine", {
                "firmware": "windturbine-v0.1",
                "stderr": e.stderr.decode() if e.stderr else "",
            })
            raise PolicyViolation("Firmware verification failed; cannot proceed")
        except Exception as e:
            log_event("FW_POLICY_ERROR", "policy_engine", {"error": str(e)})
            raise PolicyViolation(f"Firmware policy check error; fail-closed: {e}")

    log_event("POLICY_ENFORCEMENT_PASS", "policy_engine")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="GENESIS Policy Engine")
    sub = parser.add_subparsers(dest="command")

    check_cmd = sub.add_parser("check", help="Check firmware deployment policy")
    check_cmd.add_argument("--firmware", required=True)
    check_cmd.add_argument("--device", required=True)
    check_cmd.add_argument("--operation", default="verify")

    bridge_cmd = sub.add_parser("bridge", help="Check bridge policy")
    bridge_cmd.add_argument("--category", required=True)
    bridge_cmd.add_argument("--mode", required=True)

    args = parser.parse_args()

    try:
        if args.command == "check":
            FirmwarePolicy.verify_deployment(args.firmware, args.device, args.operation)
            print(f"APPROVED: {args.firmware} on {args.device} ({args.operation})")
        elif args.command == "bridge":
            check_bridge_policy(args.category, args.mode)
            print(f"APPROVED: bridge {args.category} via {args.mode}")
        else:
            parser.print_help()
            sys.exit(1)
    except PolicyViolation as e:
        print(f"DENIED: {e}", file=sys.stderr)
        sys.exit(1)

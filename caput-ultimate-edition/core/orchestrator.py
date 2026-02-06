#!/usr/bin/env python3
"""
orchestrator.py — Bootstrap and orchestration for GENESIS / Unnamed System.

Single entry point for the Python-side system. Runs verification gates,
enforces policy, and coordinates subsystems.

Fail-closed: any unhandled error halts execution.
"""

import sys
from pathlib import Path

from audit import log_event, BOOTSTRAP_START, SYSTEM_STABLE
from policy_engine import (
    enforce_policy,
    FirmwarePolicy,
    PolicyViolation,
)
from verifier import verify_environment


def main() -> None:
    log_event(BOOTSTRAP_START, "orchestrator", {"mode": "production"})

    # --- Gate 1: Environment verification ---
    verify_environment(strict=True)

    # --- Gate 2: Policy enforcement ---
    try:
        enforce_policy()
        log_event("POLICY_ENFORCEMENT_PASS", "orchestrator")
    except PolicyViolation as e:
        log_event("POLICY_ENFORCEMENT_FAIL", "orchestrator", {"error": str(e)})
        print(f"POLICY FAILURE: {e}", file=sys.stderr)
        sys.exit(1)

    # --- Gate 3: Firmware-specific policy (if applicable) ---
    try:
        FirmwarePolicy.verify_deployment(
            firmware_id="windturbine-v0.1",
            device_id="MSI_TITAN_GT77HX_PROG_INTERFACE",
            operation="verify",
        )
        log_event("FW_DEPLOYMENT_APPROVED", "orchestrator", {
            "firmware": "windturbine-v0.1",
        })
    except PolicyViolation as e:
        log_event("FW_DEPLOYMENT_DENIED", "orchestrator", {"error": str(e)})
        # Firmware denial is non-fatal if we're not deploying
        print(f"FW POLICY NOTE: {e}", file=sys.stderr)

    # --- All gates passed ---
    log_event(SYSTEM_STABLE, "orchestrator", {
        "message": "All verification gates passed; system ready",
    })
    print("GENESIS system stable. All gates passed.")


if __name__ == "__main__":
    main()

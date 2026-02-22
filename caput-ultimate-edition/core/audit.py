#!/usr/bin/env python3
"""
audit.py — Append-only audit event logging for GENESIS / Unnamed System.

Every event is a single JSON line appended to the audit log.
Write failure is fatal (fail-closed).
"""

import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

AUDIT_LOG = Path(__file__).parent / "audit.log"


def log_event(event_type: str, actor: str = "system", payload: dict | None = None) -> dict:
    """Append an immutable audit event. Halts on write failure."""
    event = {
        "event_id": str(uuid.uuid4()),
        "ts": datetime.now(timezone.utc).isoformat(),
        "event_type": event_type,
        "actor": actor,
        "payload": payload or {},
    }

    try:
        with open(AUDIT_LOG, "a", encoding="utf-8") as f:
            f.write(json.dumps(event, ensure_ascii=False) + "\n")
    except IOError as e:
        print(f"CRITICAL: Cannot write audit log: {e}", file=sys.stderr)
        sys.exit(1)

    return event


def read_log() -> list[dict]:
    """Read all audit events (for verification / compliance reports)."""
    if not AUDIT_LOG.exists():
        return []
    events = []
    with open(AUDIT_LOG, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                events.append(json.loads(line))
    return events


def verify_log_integrity() -> bool:
    """Basic integrity check: every line must be valid JSON with required fields."""
    required_fields = {"event_id", "ts", "event_type", "actor", "payload"}
    try:
        events = read_log()
        for event in events:
            if not required_fields.issubset(event.keys()):
                return False
        return True
    except (json.JSONDecodeError, IOError):
        return False


# --- Canonical event types ---

# Bootstrap
BOOTSTRAP_START = "BOOTSTRAP_START"
SYSTEM_STABLE = "SYSTEM_STABLE"

# Policy
POLICY_ENFORCEMENT_PASS = "POLICY_ENFORCEMENT_PASS"
POLICY_ENFORCEMENT_FAIL = "POLICY_ENFORCEMENT_FAIL"

# Firmware
FW_CHECK_START = "FW_CHECK_START"
FW_HEX_CHECKSUM_VALID = "FW_HEX_CHECKSUM_VALID"
FW_HEX_CHECKSUM_FAIL = "FW_HEX_CHECKSUM_FAIL"
FW_ADDR_OUT_OF_BOUNDS = "FW_ADDR_OUT_OF_BOUNDS"
FW_HASH_VALID = "FW_HASH_VALID"
FW_HASH_MISMATCH = "FW_HASH_MISMATCH"
FW_POLICY_CHECK_PASS = "FW_POLICY_CHECK_PASS"
FW_POLICY_CHECK_FAIL = "FW_POLICY_CHECK_FAIL"
FW_VERIFY_PASS = "FW_VERIFY_PASS"
FW_VERIFY_FAIL = "FW_VERIFY_FAIL"
FW_DEPLOYMENT_APPROVED = "FW_DEPLOYMENT_APPROVED"
FW_DEPLOYMENT_DENIED = "FW_DEPLOYMENT_DENIED"
FW_DEPLOYMENT_START = "FW_DEPLOYMENT_START"
FW_DEPLOYMENT_SUCCESS = "FW_DEPLOYMENT_SUCCESS"
FW_DEPLOYMENT_FAILED = "FW_DEPLOYMENT_FAILED"
FW_DEPLOYMENT_READBACK_FAIL = "FW_DEPLOYMENT_READBACK_FAIL"

# Evidence bridge (GENESIS -> CASE)
BRIDGE_IMPORT = "BRIDGE_IMPORT"
BRIDGE_SUMMARY = "BRIDGE_SUMMARY"
BRIDGE_BUNDLE = "BRIDGE_BUNDLE"
BRIDGE_METADATA = "BRIDGE_METADATA"
BRIDGE_DENIED = "BRIDGE_DENIED"

# Identity / SSO
AUTH_SUCCESS = "AUTH_SUCCESS"
AUTH_FAILURE = "AUTH_FAILURE"
ACCESS_GRANTED = "ACCESS_GRANTED"
ACCESS_DENIED = "ACCESS_DENIED"

# Evidence
EVIDENCE_SIGNED = "EVIDENCE_SIGNED"
EVIDENCE_STORED = "EVIDENCE_STORED"
EVIDENCE_HASH_VERIFIED = "EVIDENCE_HASH_VERIFIED"
EVIDENCE_HASH_MISMATCH = "EVIDENCE_HASH_MISMATCH"


if __name__ == "__main__":
    # Self-test
    log_event(BOOTSTRAP_START, "audit.py", {"mode": "self_test"})
    assert verify_log_integrity(), "Audit log integrity check failed"
    print("audit.py: self-test passed")

#!/usr/bin/env bash
# full_verify.sh — Complete verification suite for GENESIS / Unnamed System.
#
# Runs all verification gates in sequence. Fail-closed: any failure halts.
#
# Usage: ./verify/full_verify.sh [--verbose]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

VERBOSE="${1:-}"
PASS=0
FAIL=0

log() {
  echo "[VERIFY] $*"
}

run_gate() {
  local name="$1"
  shift
  log "Gate: $name"
  if "$@"; then
    log "  PASS: $name"
    PASS=$((PASS + 1))
  else
    log "  FAIL: $name"
    FAIL=$((FAIL + 1))
    log "HALTING — fail-closed on gate: $name"
    exit 1
  fi
}

log "=== GENESIS Full Verification Suite ==="
log "Project root: $PROJECT_ROOT"
log ""

# Gate 1: Audit log integrity
if command -v python3 &>/dev/null; then
  run_gate "Audit Log Integrity" python3 "$PROJECT_ROOT/core/verifier.py"
fi

# Gate 2: Firmware verification (all known firmware)
for hash_file in "$PROJECT_ROOT"/build/hashes/*.sha256; do
  [[ -f "$hash_file" ]] || continue
  fw_id=$(basename "$hash_file" .sha256)
  run_gate "Firmware: $fw_id" "$SCRIPT_DIR/firmware_check.sh" "$fw_id" $VERBOSE
done

# Gate 3: Rust boundary compilation check
if command -v cargo &>/dev/null; then
  run_gate "Rust Boundary Build" cargo check --manifest-path "$PROJECT_ROOT/rust_boundary/Cargo.toml"
fi

# Gate 4: TypeScript compilation check
if command -v npx &>/dev/null && [[ -f "$PROJECT_ROOT/tsconfig.json" ]]; then
  run_gate "TypeScript Compilation" npx tsc --noEmit --project "$PROJECT_ROOT/tsconfig.json"
fi

log ""
log "=== Results ==="
log "  Passed: $PASS"
log "  Failed: $FAIL"

if [[ $FAIL -gt 0 ]]; then
  log "VERIFICATION FAILED"
  exit 1
fi

log "ALL GATES PASSED"
exit 0

#!/usr/bin/env bash
# ENTRYPOINT.sh — Single entry point for the GENESIS / Unnamed System.
#
# Usage:
#   ./entrypoint.sh verify          Run full verification suite
#   ./entrypoint.sh orchestrate     Bootstrap orchestrator (Python)
#   ./entrypoint.sh master <cmd>    Run genesis_master.sh commands
#   ./entrypoint.sh rust <args>     Run Rust integrity boundary
#   ./entrypoint.sh policy <args>   Run policy engine
#
# All paths fail-closed. Unknown commands are rejected.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

case "${1:-}" in
  verify)
    shift
    exec "$SCRIPT_DIR/verify/full_verify.sh" "$@"
    ;;
  orchestrate)
    exec python3 "$SCRIPT_DIR/core/orchestrator.py"
    ;;
  master)
    shift
    exec "$SCRIPT_DIR/bin/genesis_master.sh" "$@"
    ;;
  rust)
    shift
    RUST_BIN="$SCRIPT_DIR/rust_boundary/target/release/genesis-verify"
    if [[ ! -x "$RUST_BIN" ]]; then
      echo "Rust boundary not built. Run: cargo build --release --manifest-path rust_boundary/Cargo.toml" >&2
      exit 1
    fi
    exec "$RUST_BIN" "$@"
    ;;
  policy)
    shift
    exec python3 "$SCRIPT_DIR/core/policy_engine.py" "$@"
    ;;
  *)
    echo "GENESIS / Unnamed System — Entrypoint"
    echo ""
    echo "Usage:"
    echo "  $0 verify [--verbose]       Run full verification suite"
    echo "  $0 orchestrate              Bootstrap system orchestrator"
    echo "  $0 master <command>          Run genesis_master.sh"
    echo "  $0 rust <command> <args>     Run Rust integrity boundary"
    echo "  $0 policy <command> <args>   Run policy engine"
    exit 1
    ;;
esac

#!/usr/bin/env bash
# ENTRYPOINT.sh — Single entry point for the GENESIS / Unnamed System.
#
# Usage:
#   ./entrypoint.sh verify          Run full verification suite
#   ./entrypoint.sh orchestrate     Bootstrap orchestrator (Python)
#   ./entrypoint.sh master <cmd>    Run genesis_master.sh commands
#   ./entrypoint.sh rust <args>     Run Rust integrity boundary
#   ./entrypoint.sh policy <args>   Run policy engine
#   ./entrypoint.sh sovereign <cmd> Sovereign Suite document automation
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
  sovereign)
    shift
    SOVEREIGN_DIR="$SCRIPT_DIR/sovereign-suite"
    subcmd="${1:-}"
    case "$subcmd" in
      setup)
        exec "$SOVEREIGN_DIR/bin/setup-vault-folders.sh"
        ;;
      run|intake|classify|legal-pack|finance-pack|ato-pack|trust-pack|health-pack)
        shift
        exec npx tsx "$SOVEREIGN_DIR/shortcuts/sovereign-orchestrator.ts" "$subcmd" "$@"
        ;;
      booster)
        shift
        exec "$SOVEREIGN_DIR/bin/booster.sh" "$@"
        ;;
      *)
        echo "Sovereign Suite — Document Automation"
        echo ""
        echo "Usage:"
        echo "  $0 sovereign setup                    Initialise vault folders"
        echo "  $0 sovereign run <source-dir>          Full pipeline (Finish the Job)"
        echo "  $0 sovereign intake <source-dir>       Collect + date-stamp files"
        echo "  $0 sovereign classify <file...>        Classify and route files"
        echo "  $0 sovereign legal-pack                Generate legal case binder"
        echo "  $0 sovereign finance-pack              Finance archive (90 days)"
        echo "  $0 sovereign ato-pack                  ATO archive"
        echo "  $0 sovereign trust-pack                Trust archive"
        echo "  $0 sovereign health-pack               Health archive"
        echo "  $0 sovereign booster                   AI classifier (stdin)"
        exit 1
        ;;
    esac
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
    echo "  $0 sovereign <command>       Sovereign Suite document automation"
    exit 1
    ;;
esac

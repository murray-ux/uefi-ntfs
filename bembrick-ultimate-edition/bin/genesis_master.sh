#!/usr/bin/env bash
# genesis_master.sh
# Role: Single entrypoint on MSI to run any thread/master.

set -euo pipefail

ROOT="${ROOT:-$HOME/genesis-ultimate-edition}"

case "${1:-}" in
  health)
    node "$ROOT/orchestration/grandmaster_orchestrator.js" health-check
    ;;
  harden)
    node "$ROOT/orchestration/grandmaster_orchestrator.js" onboard-device "$2" "$3"
    ;;
  legal-batch)
    node "$ROOT/orchestration/grandmaster_orchestrator.js" legal-batch "$2"
    ;;
  cert-batch)
    node "$ROOT/orchestration/grandmaster_orchestrator.js" cert-batch "$2"
    ;;
  compliance)
    node "$ROOT/orchestration/grandmaster_orchestrator.js" compliance-report
    ;;
  *)
    echo "Usage:"
    echo "  $0 health"
    echo "  $0 harden <hostname> <ownerEmail>"
    echo "  $0 legal-batch <court_csv>"
    echo "  $0 cert-batch <exam_csv>"
    echo "  $0 compliance"
    exit 1
    ;;
esac

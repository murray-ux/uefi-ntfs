#!/usr/bin/env sh
# CERT-MASTER hardened runner with Charter + Silver_Bullet gates

set -eu

ROOT_DIR="${FORBIDDEN_NINJA_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"

echo "=== CERT-MASTER Charter Gate ==="

"$ROOT_DIR/governance/verify.sh"

CLI_PATH="$ROOT_DIR/src/cli/main_cli.js"
if [ -f "$CLI_PATH" ]; then
  CLI_HASH="$(sha256sum "$CLI_PATH" 2>/dev/null | cut -d ' ' -f1 || shasum -a 256 "$CLI_PATH" | cut -d ' ' -f1)"
  "$ROOT_DIR/governance/tombs_check.sh" "$CLI_HASH"
else
  echo "WARNING: CLI not found at $CLI_PATH, skipping Silver_Bullet check" >&2
fi

echo "=== Gates passed, running CERT-MASTER ==="

node "$CLI_PATH" "$@"

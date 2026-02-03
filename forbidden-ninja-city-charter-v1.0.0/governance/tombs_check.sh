#!/usr/bin/env sh
# Check artifact hash against Tombs Register; fail if exiled

set -eu

ROOT_DIR="${FORBIDDEN_NINJA_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
TOMBS_FILE="$ROOT_DIR/governance/tombs.log"

HASH="$1"

[ -f "$TOMBS_FILE" ] || exit 0

if grep -q " $HASH " "$TOMBS_FILE"; then
  echo "EXILED_REVENGE_ATTEMPT: artifact hash $HASH is in Tombs Register" >&2
  exit 1
fi

exit 0

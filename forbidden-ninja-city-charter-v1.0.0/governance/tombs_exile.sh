#!/usr/bin/env sh
# Append an entry to the Tombs Register (append-only)

set -eu

ROOT_DIR="${FORBIDDEN_NINJA_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
TOMBS_FILE="$ROOT_DIR/governance/tombs.log"

[ -f "$TOMBS_FILE" ] || touch "$TOMBS_FILE"

SHA="$1"
ARTIFACT_ID="$2"
OWNER="$3"
REASON="$4"

case "$SHA" in
  [0-9a-f][0-9a-f]*)
    [ ${#SHA} -eq 64 ] || { echo "Invalid SHA length" >&2; exit 1; }
    ;;
  *)
    echo "Invalid SHA format" >&2
    exit 1
    ;;
esac

if command -v date >/dev/null 2>&1; then
  TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date '+%Y-%m-%dT%H:%M:%SZ')"
else
  TS="$(python3 -c 'from datetime import datetime, timezone; print(datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))')"
fi

printf "%s %s %s %s %s\n" "$TS" "$SHA" "$ARTIFACT_ID" "$OWNER" "$REASON" >> "$TOMBS_FILE"

echo "Exiled: $ARTIFACT_ID ($SHA)"

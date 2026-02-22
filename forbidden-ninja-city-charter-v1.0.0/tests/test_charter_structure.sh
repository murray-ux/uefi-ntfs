#!/usr/bin/env sh
# Forbidden Ninja City - Charter Structure Test

set -eu

ROOT_DIR="${FORBIDDEN_NINJA_ROOT:-$(pwd)}"
CHARTER_DIR="$ROOT_DIR/charter"

fail() {
  echo "STRUCTURE-ERROR: $1" >&2
  exit 1
}

[ -d "$CHARTER_DIR" ] || fail "Missing charter directory"
[ -f "$CHARTER_DIR/charter.md" ] || fail "Missing charter.md"
[ -f "$CHARTER_DIR/charter.meta.json" ] || fail "Missing charter.meta.json"
[ -f "$CHARTER_DIR/charter.sha256" ] || fail "Missing charter.sha256"

HASH_LINE="$(head -n 1 "$CHARTER_DIR/charter.sha256")"
case "$HASH_LINE" in
  [0-9a-f][0-9a-f][0-9a-f][0-9a-f]*"  charter.md")
    ;;
  *)
    fail "charter.sha256 line does not match '<hex>  charter.md': $HASH_LINE"
    ;;
esac

if command -v python3 >/dev/null 2>&1; then
  python3 - "$CHARTER_DIR/charter.meta.json" << 'PY'
import json, sys
meta_path = sys.argv[1]
meta = json.load(open(meta_path, encoding="utf-8"))

required = ["document_type", "name", "space", "version",
            "status", "admin_master", "supremacy",
            "charter_filename", "hash_filename", "charter_sha256"]

missing = [k for k in required if k not in meta]
if missing:
    print("STRUCTURE-ERROR: Missing metadata keys:", ", ".join(missing), file=sys.stderr)
    sys.exit(1)

if meta["charter_filename"] != "charter.md":
    print("STRUCTURE-ERROR: charter_filename must be 'charter.md'", file=sys.stderr)
    sys.exit(1)

if meta["hash_filename"] != "charter.sha256":
    print("STRUCTURE-ERROR: hash_filename must be 'charter.sha256'", file=sys.stderr)
    sys.exit(1)
PY
fi

echo "STRUCTURE-OK: charter folder passes structural checks"

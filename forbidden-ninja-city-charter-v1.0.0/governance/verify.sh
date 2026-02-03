#!/usr/bin/env sh
# Forbidden Ninja City Charter - Integrity Verification (POSIX sh)
# Production-grade implementation

set -eu

CHARTER_DIR="${FORBIDDEN_NINJA_CHARTER_DIR:-charter}"
META_FILE="${CHARTER_DIR}/charter.meta.json"
HASH_FILE="${CHARTER_DIR}/charter.sha256"

if [ -t 1 ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    NC=''
fi

error() {
    printf "${RED}ERROR:${NC} %s\n" "$1" >&2
    exit 1
}

warn() {
    printf "${YELLOW}WARN:${NC} %s\n" "$1" >&2
}

info() {
    printf "${GREEN}INFO:${NC} %s\n" "$1"
}

[ -d "$CHARTER_DIR" ] || error "Charter directory not found: $CHARTER_DIR"
[ -f "$META_FILE" ] || error "Charter metadata not found: $META_FILE"
[ -f "$HASH_FILE" ] || error "Charter hash file not found: $HASH_FILE"

info "Charter directory structure verified"

(
    cd "$CHARTER_DIR"
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum -c charter.sha256 || error "Charter hash verification failed"
    elif command -v shasum >/dev/null 2>&1; then
        shasum -a 256 -c charter.sha256 || error "Charter hash verification failed"
    else
        error "No sha256 verification tool found (need sha256sum or shasum)"
    fi
) || exit 1

info "Charter integrity verified: hash matches"

if command -v python3 >/dev/null 2>&1; then
    python3 -c "import json; json.load(open('$META_FILE'))" 2>/dev/null || \
        warn "Charter metadata JSON may be malformed"
elif command -v node >/dev/null 2>&1; then
    node -e "require('$META_FILE')" 2>/dev/null || \
        warn "Charter metadata JSON may be malformed"
fi

info "Charter governance verification: PASSED"
exit 0

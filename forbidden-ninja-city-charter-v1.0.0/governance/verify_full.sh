#!/usr/bin/env sh
# Forbidden Ninja City - Full Governance Verification
# Verifies Charter, Doctrines, and Tombs Register integrity

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CHARTER_DIR="${ROOT_DIR}/charter"
GOV_DIR="${ROOT_DIR}/governance"

if [ -t 1 ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    CYAN='\033[0;36m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    CYAN=''
    NC=''
fi

error() { printf "${RED}ERROR:${NC} %s\n" "$1" >&2; exit 1; }
warn() { printf "${YELLOW}WARN:${NC} %s\n" "$1" >&2; }
info() { printf "${GREEN}INFO:${NC} %s\n" "$1"; }
header() { printf "\n${CYAN}=== %s ===${NC}\n\n" "$1"; }

PASS=0
FAIL=0
WARN=0

check_pass() { PASS=$((PASS + 1)); info "✓ $1"; }
check_fail() { FAIL=$((FAIL + 1)); printf "${RED}✗ %s${NC}\n" "$1" >&2; }
check_warn() { WARN=$((WARN + 1)); warn "⚠ $1"; }

# ═══════════════════════════════════════════════════════════════════════════
header "FORBIDDEN NINJA CITY - FULL GOVERNANCE VERIFICATION"
# ═══════════════════════════════════════════════════════════════════════════

# ─── Charter Structure ─────────────────────────────────────────────────────
header "Charter Structure"

[ -d "$CHARTER_DIR" ] && check_pass "Charter directory exists" || check_fail "Charter directory missing"
[ -f "$CHARTER_DIR/charter.md" ] && check_pass "charter.md exists" || check_fail "charter.md missing"
[ -f "$CHARTER_DIR/charter.meta.json" ] && check_pass "charter.meta.json exists" || check_fail "charter.meta.json missing"
[ -f "$CHARTER_DIR/charter.sha256" ] && check_pass "charter.sha256 exists" || check_fail "charter.sha256 missing"
[ -f "$CHARTER_DIR/CHANGELOG.md" ] && check_pass "CHANGELOG.md exists" || check_warn "CHANGELOG.md missing (recommended per Doctrine Article VI)"

# ─── Charter Integrity ─────────────────────────────────────────────────────
header "Charter Cryptographic Integrity"

(
    cd "$CHARTER_DIR"
    if command -v sha256sum >/dev/null 2>&1; then
        if sha256sum -c charter.sha256 >/dev/null 2>&1; then
            check_pass "Charter hash verification passed (sha256sum)"
        else
            check_fail "Charter hash mismatch - UNSIGNED LAW"
        fi
    elif command -v shasum >/dev/null 2>&1; then
        if shasum -a 256 -c charter.sha256 >/dev/null 2>&1; then
            check_pass "Charter hash verification passed (shasum)"
        else
            check_fail "Charter hash mismatch - UNSIGNED LAW"
        fi
    else
        check_warn "No sha256 tool available for verification"
    fi
)

# ─── Metadata Validation ───────────────────────────────────────────────────
header "Metadata Validation"

if command -v python3 >/dev/null 2>&1; then
    python3 - "$CHARTER_DIR/charter.meta.json" << 'PY'
import json, sys

meta_path = sys.argv[1]
try:
    meta = json.load(open(meta_path, encoding="utf-8"))
except Exception as e:
    print(f"✗ Metadata JSON parse error: {e}", file=sys.stderr)
    sys.exit(1)

required = ["document_type", "name", "version", "status", "admin_master", "charter_sha256"]
missing = [k for k in required if k not in meta]

if missing:
    print(f"✗ Missing metadata fields: {', '.join(missing)}", file=sys.stderr)
    sys.exit(1)

print(f"✓ Metadata valid - Charter v{meta['version']} ({meta['status']})")
print(f"✓ ADMIN_MASTER: {meta['admin_master']['name']}")

if "doctrines" in meta:
    print(f"✓ Doctrines registered: {len(meta['doctrines'])}")
    for d in meta['doctrines']:
        print(f"  - {d['name']} v{d['version']} ({d['status']})")
PY
    check_pass "Metadata structure valid"
else
    check_warn "Python3 not available for metadata validation"
fi

# ─── Doctrines ─────────────────────────────────────────────────────────────
header "Doctrine Verification"

DOCTRINE_COUNT=0
for doctrine in "$CHARTER_DIR"/doctrine-*.md; do
    [ -f "$doctrine" ] || continue
    DOCTRINE_COUNT=$((DOCTRINE_COUNT + 1))
    DOCTRINE_NAME=$(basename "$doctrine")
    check_pass "Doctrine found: $DOCTRINE_NAME"
done

if [ $DOCTRINE_COUNT -eq 0 ]; then
    check_warn "No doctrines found (expected doctrine-*.md files)"
else
    info "Total doctrines: $DOCTRINE_COUNT"
fi

# ─── Tombs Register ────────────────────────────────────────────────────────
header "Silver_Bullet / Tombs Register"

[ -f "$GOV_DIR/tombs.log" ] && check_pass "Tombs Register exists" || check_fail "Tombs Register missing"
[ -f "$GOV_DIR/tombs.meta.json" ] && check_pass "Tombs metadata exists" || check_warn "Tombs metadata missing"
[ -x "$GOV_DIR/tombs_exile.sh" ] && check_pass "tombs_exile.sh executable" || check_warn "tombs_exile.sh not executable"
[ -x "$GOV_DIR/tombs_check.sh" ] && check_pass "tombs_check.sh executable" || check_warn "tombs_check.sh not executable"

EXILE_COUNT=$(grep -c '^[0-9]' "$GOV_DIR/tombs.log" 2>/dev/null || echo 0)
info "Exiled artifacts: $EXILE_COUNT"

# ─── Governance Tools ──────────────────────────────────────────────────────
header "Governance Tools"

[ -x "$GOV_DIR/verify.sh" ] && check_pass "verify.sh executable" || check_fail "verify.sh not executable"
[ -f "$GOV_DIR/verify.js" ] && check_pass "verify.js exists" || check_warn "verify.js missing"
[ -f "$GOV_DIR/verify.py" ] && check_pass "verify.py exists" || check_warn "verify.py missing"

# ─── CI/CD Workflows ───────────────────────────────────────────────────────
header "CI/CD Enforcement"

WORKFLOWS_DIR="$ROOT_DIR/.github/workflows"
[ -f "$WORKFLOWS_DIR/charter-check.yml" ] && check_pass "charter-check.yml exists" || check_warn "charter-check.yml missing"
[ -f "$WORKFLOWS_DIR/cert-master.yml" ] && check_pass "cert-master.yml exists" || check_warn "cert-master.yml missing"

# ─── Summary ───────────────────────────────────────────────────────────────
header "VERIFICATION SUMMARY"

printf "${GREEN}Passed:${NC}   %d\n" "$PASS"
printf "${YELLOW}Warnings:${NC} %d\n" "$WARN"
printf "${RED}Failed:${NC}   %d\n" "$FAIL"

if [ $FAIL -gt 0 ]; then
    printf "\n${RED}GOVERNANCE VERIFICATION: FAILED${NC}\n"
    printf "The Charter has unsigned law or missing critical components.\n"
    exit 1
elif [ $WARN -gt 0 ]; then
    printf "\n${YELLOW}GOVERNANCE VERIFICATION: PASSED WITH WARNINGS${NC}\n"
    printf "Review warnings above for recommended improvements.\n"
    exit 0
else
    printf "\n${GREEN}GOVERNANCE VERIFICATION: PASSED${NC}\n"
    printf "All systems nominal. The City stands.\n"
    exit 0
fi

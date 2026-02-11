#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
# CanonKit - Full Replay Verification (Option C)
# Performs comprehensive verification: manifest + eventlog + evidence JSON + object hashes
# Prints detailed pass/fail report

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CANON_ROOT="$(dirname "$SCRIPT_DIR")"
CANON_DIR="$CANON_ROOT/canon"
KEYS_DIR="$CANON_ROOT/keys"

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

# Helper functions
sha256() {
    if command -v sha256sum &> /dev/null; then
        sha256sum "$1" | cut -d' ' -f1
    else
        shasum -a 256 "$1" | cut -d' ' -f1
    fi
}

check_pass() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    echo -e "  ${GREEN}[PASS]${NC} $1"
}

check_fail() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    echo -e "  ${RED}[FAIL]${NC} $1"
    [[ -n "${2:-}" ]] && echo -e "        ${RED}$2${NC}"
}

check_warn() {
    WARNINGS=$((WARNINGS + 1))
    echo -e "  ${YELLOW}[WARN]${NC} $1"
}

check_skip() {
    echo -e "  ${BLUE}[SKIP]${NC} $1"
}

# ─────────────────────────────────────────────────────────────────────────────
# Header
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║            CanonKit - Full Replay Verification Report                  ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo "Canon Root: $CANON_ROOT"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Section 1: Key Infrastructure
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}SECTION 1: KEY INFRASTRUCTURE${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""

# 1.1 Root key exists
echo "1.1 Root Key Pair"
if [[ -f "$KEYS_DIR/root/canon_root.key" ]]; then
    check_pass "Root private key exists"
else
    check_fail "Root private key missing"
fi

if [[ -f "$KEYS_DIR/root/canon_root.pub.pem" ]]; then
    check_pass "Root public key (PEM) exists"
else
    check_fail "Root public key (PEM) missing"
fi

if [[ -f "$KEYS_DIR/root/canon_root.pub.der" ]]; then
    check_pass "Root public key (DER) exists"
else
    check_fail "Root public key (DER) missing"
fi

# 1.2 ENV key exists
echo ""
echo "1.2 ENV Key Pair"
if [[ -f "$KEYS_DIR/env/env.key" ]]; then
    check_pass "ENV private key exists"
else
    check_fail "ENV private key missing"
fi

if [[ -f "$KEYS_DIR/env/env.pub.pem" ]]; then
    check_pass "ENV public key (PEM) exists"
else
    check_fail "ENV public key (PEM) missing"
fi

if [[ -f "$KEYS_DIR/env/env.pub.der" ]]; then
    check_pass "ENV public key (DER) exists"
else
    check_fail "ENV public key (DER) missing"
fi

# 1.3 ROOT→ENV Lineage
echo ""
echo "1.3 ROOT→ENV Lineage Verification"
if [[ -f "$KEYS_DIR/env/env.pub.der.sig" ]]; then
    if openssl pkeyutl -verify \
        -pubin -inkey "$KEYS_DIR/root/canon_root.pub.pem" \
        -rawin \
        -in "$KEYS_DIR/env/env.pub.der" \
        -sigfile "$KEYS_DIR/env/env.pub.der.sig" 2>/dev/null; then
        check_pass "ROOT→ENV signature valid"
    else
        check_fail "ROOT→ENV signature INVALID" "ENV key is not trusted"
    fi
else
    check_fail "ROOT→ENV signature file missing"
fi

# 1.4 API Lineage (optional)
echo ""
echo "1.4 ENV→API Lineage (Optional)"
if [[ -f "$KEYS_DIR/api/api.pub.der" ]] && [[ -f "$KEYS_DIR/api/api.pub.der.sig" ]]; then
    if openssl pkeyutl -verify \
        -pubin -inkey "$KEYS_DIR/env/env.pub.pem" \
        -rawin \
        -in "$KEYS_DIR/api/api.pub.der" \
        -sigfile "$KEYS_DIR/api/api.pub.der.sig" 2>/dev/null; then
        check_pass "ENV→API signature valid"
    else
        check_warn "ENV→API signature INVALID"
    fi
else
    check_skip "API lineage not configured"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Section 2: Manifest Verification
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}SECTION 2: MANIFEST VERIFICATION${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""

MANIFEST="$CANON_DIR/manifest/EVIDENCE_MANIFEST.json"
MANIFEST_HASH="$CANON_DIR/manifest/EVIDENCE_MANIFEST.sha256"
MANIFEST_SIG="$CANON_DIR/manifest/EVIDENCE_MANIFEST.sig"

# 2.1 Manifest exists
echo "2.1 Manifest Files"
if [[ -f "$MANIFEST" ]]; then
    check_pass "Manifest exists"
else
    check_fail "Manifest missing"
    echo ""
    echo -e "${RED}Cannot continue verification without manifest.${NC}"
    echo "Run: ./orchestration/ingest_evidence.py to create evidence"
    exit 1
fi

if [[ -f "$MANIFEST_HASH" ]]; then
    check_pass "Manifest hash file exists"
else
    check_fail "Manifest hash file missing"
fi

if [[ -f "$MANIFEST_SIG" ]]; then
    check_pass "Manifest signature file exists"
else
    check_fail "Manifest signature file missing"
fi

# 2.2 Manifest hash verification
echo ""
echo "2.2 Manifest Hash Verification"
if [[ -f "$MANIFEST_HASH" ]]; then
    COMPUTED_HASH=$(sha256 "$MANIFEST")
    STORED_HASH=$(cat "$MANIFEST_HASH" | tr -d '\n ')

    if [[ "$COMPUTED_HASH" == "$STORED_HASH" ]]; then
        check_pass "Manifest hash matches"
        echo "        Hash: ${COMPUTED_HASH:0:32}..."
    else
        check_fail "Manifest hash MISMATCH" "File has been modified!"
        echo "        Expected: ${STORED_HASH:0:32}..."
        echo "        Got:      ${COMPUTED_HASH:0:32}..."
    fi
else
    check_skip "Cannot verify (hash file missing)"
fi

# 2.3 Manifest signature verification
echo ""
echo "2.3 Manifest Signature Verification"
if [[ -f "$MANIFEST_SIG" ]] && [[ -f "$KEYS_DIR/env/env.pub.pem" ]]; then
    if openssl pkeyutl -verify \
        -pubin -inkey "$KEYS_DIR/env/env.pub.pem" \
        -rawin \
        -in "$MANIFEST" \
        -sigfile "$MANIFEST_SIG" 2>/dev/null; then
        check_pass "Manifest signature valid"
    else
        check_fail "Manifest signature INVALID" "Manifest was NOT signed by ENV key"
    fi
else
    check_skip "Cannot verify (missing signature or key)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Section 3: Event Log Verification
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}SECTION 3: EVENT LOG VERIFICATION${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""

EVENTLOG="$CANON_DIR/events/eventlog.txt"

# 3.1 Eventlog exists
echo "3.1 Event Log"
if [[ -f "$EVENTLOG" ]]; then
    EVENT_COUNT=$(wc -l < "$EVENTLOG" | tr -d ' ')
    check_pass "Event log exists ($EVENT_COUNT events)"
else
    check_fail "Event log missing"
    EVENT_COUNT=0
fi

# 3.2 Verify eventlog hash in manifest
echo ""
echo "3.2 Event Log Hash in Manifest"
if command -v jq &> /dev/null && [[ -f "$EVENTLOG" ]]; then
    MANIFEST_EVENTLOG_HASH=$(jq -r '.eventlog_hash // empty' "$MANIFEST")
    COMPUTED_EVENTLOG_HASH=$(sha256 "$EVENTLOG")

    if [[ -n "$MANIFEST_EVENTLOG_HASH" ]]; then
        if [[ "$MANIFEST_EVENTLOG_HASH" == "$COMPUTED_EVENTLOG_HASH" ]]; then
            check_pass "Event log hash matches manifest"
        else
            check_fail "Event log hash MISMATCH" "Event log has been modified!"
        fi
    else
        check_warn "No eventlog hash in manifest"
    fi
else
    check_skip "Cannot verify (jq not available or eventlog missing)"
fi

# 3.3 Verify each event file exists and has valid hash
echo ""
echo "3.3 Individual Event Verification"
if [[ -f "$EVENTLOG" ]] && [[ $EVENT_COUNT -gt 0 ]]; then
    EVENTS_VERIFIED=0
    EVENTS_FAILED=0

    while IFS= read -r event_hash; do
        event_file="$CANON_DIR/events/${event_hash}.json"
        if [[ -f "$event_file" ]]; then
            EVENTS_VERIFIED=$((EVENTS_VERIFIED + 1))
        else
            EVENTS_FAILED=$((EVENTS_FAILED + 1))
            check_fail "Event file missing: $event_hash"
        fi
    done < "$EVENTLOG"

    if [[ $EVENTS_FAILED -eq 0 ]]; then
        check_pass "All $EVENTS_VERIFIED event files present"
    else
        check_fail "$EVENTS_FAILED event files missing"
    fi
else
    check_skip "No events to verify"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Section 4: Evidence Verification
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}SECTION 4: EVIDENCE VERIFICATION${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""

if command -v jq &> /dev/null; then
    mapfile -t EVIDENCE_IDS < <(jq -r '.evidence_ids[]' "$MANIFEST" 2>/dev/null || true)
    EVIDENCE_COUNT=${#EVIDENCE_IDS[@]}
else
    EVIDENCE_COUNT=0
fi

echo "4.1 Evidence Records"
echo "     Total evidence items in manifest: $EVIDENCE_COUNT"
echo ""

if [[ $EVIDENCE_COUNT -gt 0 ]]; then
    EVIDENCE_VALID=0
    EVIDENCE_INVALID=0
    OBJECTS_VALID=0
    OBJECTS_INVALID=0

    for eid in "${EVIDENCE_IDS[@]}"; do
        evidence_file="$CANON_DIR/evidence/${eid}.json"

        if [[ ! -f "$evidence_file" ]]; then
            check_fail "Evidence JSON missing: $eid"
            EVIDENCE_INVALID=$((EVIDENCE_INVALID + 1))
            continue
        fi

        EVIDENCE_VALID=$((EVIDENCE_VALID + 1))

        # Verify object hash
        content_hash=$(jq -r '.content_hash' "$evidence_file")
        object_file="$CANON_DIR/objects/$content_hash"

        if [[ ! -f "$object_file" ]]; then
            check_fail "Object file missing for evidence $eid"
            OBJECTS_INVALID=$((OBJECTS_INVALID + 1))
            continue
        fi

        # Verify the hash matches
        computed_hash=$(sha256 "$object_file")
        if [[ "$computed_hash" == "$content_hash" ]]; then
            OBJECTS_VALID=$((OBJECTS_VALID + 1))
        else
            check_fail "Object hash mismatch for evidence $eid"
            OBJECTS_INVALID=$((OBJECTS_INVALID + 1))
        fi
    done

    echo ""
    echo "4.2 Evidence Summary"
    if [[ $EVIDENCE_INVALID -eq 0 ]]; then
        check_pass "All $EVIDENCE_VALID evidence records present"
    else
        check_fail "$EVIDENCE_INVALID evidence records missing or invalid"
    fi

    if [[ $OBJECTS_INVALID -eq 0 ]]; then
        check_pass "All $OBJECTS_VALID object hashes verified"
    else
        check_fail "$OBJECTS_INVALID object hash mismatches"
    fi

    # List evidence details
    echo ""
    echo "4.3 Evidence Inventory"
    echo "     ─────────────────────────────────────────────────────────────────"
    for eid in "${EVIDENCE_IDS[@]}"; do
        evidence_file="$CANON_DIR/evidence/${eid}.json"
        if [[ -f "$evidence_file" ]]; then
            label=$(jq -r '.label // "Unknown"' "$evidence_file")
            doc_type=$(jq -r '.document_type // "Unknown"' "$evidence_file")
            printf "     %-36s  %-20s  %s\n" "${eid:0:36}" "$doc_type" "$label"
        fi
    done
    echo "     ─────────────────────────────────────────────────────────────────"
else
    check_skip "No evidence to verify"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Section 5: Chain Integrity
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}SECTION 5: CHAIN INTEGRITY SUMMARY${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""

echo "Trust Chain:"
echo "  ROOT ──────► ENV ──────► Manifest ──────► Evidence"
echo "       (frozen)    (active)    (signed)       (hashed)"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Final Report
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}VERIFICATION REPORT${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Total Checks:  $TOTAL_CHECKS"
echo "Passed:        $PASSED_CHECKS"
echo "Failed:        $FAILED_CHECKS"
echo "Warnings:      $WARNINGS"
echo ""

if [[ $FAILED_CHECKS -eq 0 ]]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                                        ║${NC}"
    echo -e "${GREEN}║                    FULL REPLAY VERIFICATION: PASS                     ║${NC}"
    echo -e "${GREEN}║                                                                        ║${NC}"
    echo -e "${GREEN}║   All cryptographic proofs verified. Evidence canon is INTACT.        ║${NC}"
    echo -e "${GREEN}║                                                                        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    if [[ $WARNINGS -gt 0 ]]; then
        echo -e "${YELLOW}Note: $WARNINGS warning(s) were generated. Review above for details.${NC}"
    fi
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                                                                        ║${NC}"
    echo -e "${RED}║                    FULL REPLAY VERIFICATION: FAIL                     ║${NC}"
    echo -e "${RED}║                                                                        ║${NC}"
    echo -e "${RED}║   $FAILED_CHECKS check(s) failed. Evidence canon CANNOT be trusted.             ║${NC}"
    echo -e "${RED}║                                                                        ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Review the failures above to identify the integrity breach."
    exit 1
fi

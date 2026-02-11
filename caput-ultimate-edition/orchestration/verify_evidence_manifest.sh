#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
# CanonKit - Verify Evidence Manifest Integrity
# Verifies: ROOT→ENV lineage, manifest hash, manifest signature, optionally API lineage

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CANON_ROOT="$(dirname "$SCRIPT_DIR")"
KEYS_DIR="$CANON_ROOT/keys"
CANON_DIR="$CANON_ROOT/canon"

# Key paths
ROOT_PUB="$KEYS_DIR/root/canon_root.pub.pem"
ENV_PUB="$KEYS_DIR/env/env.pub.pem"
ENV_DER="$KEYS_DIR/env/env.pub.der"
ENV_SIG="$KEYS_DIR/env/env.pub.der.sig"
API_PUB="$KEYS_DIR/api/api.pub.pem"
API_DER="$KEYS_DIR/api/api.pub.der"
API_SIG="$KEYS_DIR/api/api.pub.der.sig"

# Manifest paths
MANIFEST="$CANON_DIR/manifest/EVIDENCE_MANIFEST.json"
MANIFEST_HASH="$CANON_DIR/manifest/EVIDENCE_MANIFEST.sha256"
MANIFEST_SIG="$CANON_DIR/manifest/EVIDENCE_MANIFEST.sig"

echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║          CanonKit - Evidence Manifest Verification             ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

ERRORS=0
WARNINGS=0

# ─────────────────────────────────────────────────────────────────────────────
# Helper function to compute SHA256
# ─────────────────────────────────────────────────────────────────────────────
sha256() {
    if command -v sha256sum &> /dev/null; then
        sha256sum "$1" | cut -d' ' -f1
    else
        shasum -a 256 "$1" | cut -d' ' -f1
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# 1. Verify ROOT→ENV lineage
# ─────────────────────────────────────────────────────────────────────────────
echo -n "[1/5] Verifying ROOT→ENV lineage... "

if [[ ! -f "$ROOT_PUB" ]]; then
    echo -e "${RED}FAILED${NC}"
    echo "      ERROR: Root public key not found: $ROOT_PUB"
    ERRORS=$((ERRORS + 1))
elif [[ ! -f "$ENV_DER" ]]; then
    echo -e "${RED}FAILED${NC}"
    echo "      ERROR: ENV public DER not found: $ENV_DER"
    ERRORS=$((ERRORS + 1))
elif [[ ! -f "$ENV_SIG" ]]; then
    echo -e "${RED}FAILED${NC}"
    echo "      ERROR: ENV signature not found: $ENV_SIG"
    ERRORS=$((ERRORS + 1))
else
    if openssl pkeyutl -verify \
        -pubin -inkey "$ROOT_PUB" \
        -rawin \
        -in "$ENV_DER" \
        -sigfile "$ENV_SIG" 2>/dev/null; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}FAILED${NC}"
        echo "      ERROR: ROOT→ENV lineage invalid (cannot trust env key)"
        echo "      The ENV public key was NOT signed by the ROOT private key."
        ERRORS=$((ERRORS + 1))
    fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# 2. Verify API lineage (optional)
# ─────────────────────────────────────────────────────────────────────────────
echo -n "[2/5] Verifying ENV→API lineage... "

if [[ "${REQUIRE_API_LINEAGE:-0}" == "1" ]]; then
    if [[ ! -f "$API_DER" ]] || [[ ! -f "$API_SIG" ]]; then
        echo -e "${RED}FAILED${NC}"
        echo "      ERROR: API lineage required but files missing"
        ERRORS=$((ERRORS + 1))
    elif openssl pkeyutl -verify \
        -pubin -inkey "$ENV_PUB" \
        -rawin \
        -in "$API_DER" \
        -sigfile "$API_SIG" 2>/dev/null; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}FAILED${NC}"
        echo "      ERROR: ENV→API lineage invalid"
        ERRORS=$((ERRORS + 1))
    fi
else
    if [[ -f "$API_DER" ]] && [[ -f "$API_SIG" ]]; then
        if openssl pkeyutl -verify \
            -pubin -inkey "$ENV_PUB" \
            -rawin \
            -in "$API_DER" \
            -sigfile "$API_SIG" 2>/dev/null; then
            echo -e "${GREEN}OK${NC} (optional)"
        else
            echo -e "${YELLOW}WARNING${NC}"
            echo "      API lineage exists but is invalid"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo -e "${YELLOW}SKIPPED${NC} (not configured)"
    fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# 3. Verify manifest exists
# ─────────────────────────────────────────────────────────────────────────────
echo -n "[3/5] Checking manifest exists... "

if [[ ! -f "$MANIFEST" ]]; then
    echo -e "${YELLOW}NO MANIFEST${NC}"
    echo "      No evidence has been ingested yet."
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}NO EVIDENCE TO VERIFY${NC}"
    echo "Run: ./orchestration/ingest_evidence.py /path/to/file --label \"Description\""
    exit 0
fi
echo -e "${GREEN}OK${NC}"

# ─────────────────────────────────────────────────────────────────────────────
# 4. Verify manifest hash
# ─────────────────────────────────────────────────────────────────────────────
echo -n "[4/5] Verifying manifest hash... "

if [[ ! -f "$MANIFEST_HASH" ]]; then
    echo -e "${RED}FAILED${NC}"
    echo "      ERROR: Manifest hash file not found: $MANIFEST_HASH"
    ERRORS=$((ERRORS + 1))
else
    COMPUTED_HASH=$(sha256 "$MANIFEST")
    STORED_HASH=$(cat "$MANIFEST_HASH" | tr -d '\n ')

    if [[ "$COMPUTED_HASH" == "$STORED_HASH" ]]; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}FAILED${NC}"
        echo "      ERROR: Manifest hash mismatch"
        echo "      Expected: $STORED_HASH"
        echo "      Got:      $COMPUTED_HASH"
        echo "      The manifest file has been modified!"
        ERRORS=$((ERRORS + 1))
    fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# 5. Verify manifest signature
# ─────────────────────────────────────────────────────────────────────────────
echo -n "[5/5] Verifying manifest signature... "

if [[ ! -f "$MANIFEST_SIG" ]]; then
    echo -e "${RED}FAILED${NC}"
    echo "      ERROR: Manifest signature not found: $MANIFEST_SIG"
    ERRORS=$((ERRORS + 1))
elif [[ ! -f "$ENV_PUB" ]]; then
    echo -e "${RED}FAILED${NC}"
    echo "      ERROR: ENV public key not found: $ENV_PUB"
    ERRORS=$((ERRORS + 1))
else
    if openssl pkeyutl -verify \
        -pubin -inkey "$ENV_PUB" \
        -rawin \
        -in "$MANIFEST" \
        -sigfile "$MANIFEST_SIG" 2>/dev/null; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}FAILED${NC}"
        echo "      ERROR: Manifest signature invalid"
        echo "      The manifest was NOT signed by the ENV key."
        ERRORS=$((ERRORS + 1))
    fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

if [[ $ERRORS -eq 0 ]]; then
    if [[ $WARNINGS -eq 0 ]]; then
        echo -e "${GREEN}INTEGRITY_OK${NC}"
        echo ""
        echo "All verification checks passed:"
        echo "  - ROOT→ENV lineage: Valid"
        echo "  - Manifest hash: Matches"
        echo "  - Manifest signature: Valid under ENV key"
        echo ""

        # Show manifest stats
        if command -v jq &> /dev/null; then
            EVIDENCE_COUNT=$(jq -r '.evidence_count // 0' "$MANIFEST")
            LAST_UPDATED=$(jq -r '.last_updated // "unknown"' "$MANIFEST")
            echo "Manifest stats:"
            echo "  Evidence count: $EVIDENCE_COUNT"
            echo "  Last updated:   $LAST_UPDATED"
        fi
        exit 0
    else
        echo -e "${YELLOW}INTEGRITY_OK (with warnings)${NC}"
        echo "All critical checks passed, but there were $WARNINGS warning(s)."
        exit 0
    fi
else
    echo -e "${RED}INTEGRITY_FAILED${NC}"
    echo ""
    echo "$ERRORS error(s) found. The evidence canon CANNOT be trusted."
    echo ""
    echo "Possible causes:"
    echo "  - Keys were tampered with"
    echo "  - Manifest was modified after signing"
    echo "  - Lineage chain was broken"
    echo "  - Files were corrupted or moved"
    exit 1
fi

#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
# CanonKit Doctor - Sanity gate for cryptographic evidence system
# Confirms all hard dependencies are present before operations

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║          CanonKit Doctor - Dependency Verification             ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

ERRORS=0

# ─────────────────────────────────────────────────────────────────────────────
# Check Python 3
# ─────────────────────────────────────────────────────────────────────────────
echo -n "Checking Python 3... "
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1)
    echo -e "${GREEN}OK${NC} - ${PYTHON_VERSION}"
else
    echo -e "${RED}MISSING${NC}"
    echo "  Install Python 3: https://www.python.org/downloads/"
    ERRORS=$((ERRORS + 1))
fi

# ─────────────────────────────────────────────────────────────────────────────
# Check OpenSSL
# ─────────────────────────────────────────────────────────────────────────────
echo -n "Checking OpenSSL... "
if command -v openssl &> /dev/null; then
    OPENSSL_VERSION=$(openssl version 2>&1)
    echo -e "${GREEN}OK${NC} - ${OPENSSL_VERSION}"

    # Check for Ed25519 support (OpenSSL 1.1.1+)
    echo -n "  Checking Ed25519 support... "
    if openssl genpkey -algorithm ed25519 -out /dev/null 2>/dev/null; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}MISSING${NC}"
        echo "    Ed25519 requires OpenSSL 1.1.1 or later"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}MISSING${NC}"
    echo "  Install OpenSSL: https://www.openssl.org/"
    ERRORS=$((ERRORS + 1))
fi

# ─────────────────────────────────────────────────────────────────────────────
# Check sha256sum or shasum
# ─────────────────────────────────────────────────────────────────────────────
echo -n "Checking SHA256 utility... "
if command -v sha256sum &> /dev/null; then
    echo -e "${GREEN}OK${NC} - sha256sum"
elif command -v shasum &> /dev/null; then
    echo -e "${GREEN}OK${NC} - shasum (macOS)"
else
    echo -e "${RED}MISSING${NC}"
    echo "  Install coreutils for sha256sum"
    ERRORS=$((ERRORS + 1))
fi

# ─────────────────────────────────────────────────────────────────────────────
# Check jq (optional but recommended)
# ─────────────────────────────────────────────────────────────────────────────
echo -n "Checking jq (optional)... "
if command -v jq &> /dev/null; then
    JQ_VERSION=$(jq --version 2>&1)
    echo -e "${GREEN}OK${NC} - ${JQ_VERSION}"
else
    echo -e "${YELLOW}MISSING${NC} (optional, but recommended for JSON processing)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Check uuidgen
# ─────────────────────────────────────────────────────────────────────────────
echo -n "Checking UUID generator... "
if command -v uuidgen &> /dev/null; then
    echo -e "${GREEN}OK${NC} - uuidgen"
elif python3 -c "import uuid" 2>/dev/null; then
    echo -e "${GREEN}OK${NC} - Python uuid module"
else
    echo -e "${YELLOW}WARNING${NC} - Will use Python fallback"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Check directory structure
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CANON_ROOT="$(dirname "$SCRIPT_DIR")"

echo ""
echo -e "${CYAN}Directory Structure:${NC}"
echo -n "  Canon root ($CANON_ROOT)... "
if [[ -d "$CANON_ROOT" ]]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}MISSING${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo -n "  keys/ directory... "
if [[ -d "$CANON_ROOT/keys" ]]; then
    echo -e "${GREEN}EXISTS${NC}"
else
    echo -e "${YELLOW}NOT INITIALIZED${NC} (run init_canon_root.sh)"
fi

echo -n "  canon/ directory... "
if [[ -d "$CANON_ROOT/canon" ]]; then
    echo -e "${GREEN}EXISTS${NC}"
else
    echo -e "${YELLOW}NOT INITIALIZED${NC} (will be created on first ingest)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

if [[ $ERRORS -eq 0 ]]; then
    echo -e "${GREEN}Dependencies OK${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. ./orchestration/init_canon_root.sh    # Initialize root keypair"
    echo "  2. ./orchestration/seal-lineage-max.sh   # Seal trust chain"
    echo "  3. ./orchestration/ingest_evidence.py    # Ingest evidence"
    exit 0
else
    echo -e "${RED}FAILED - $ERRORS error(s) found${NC}"
    echo "Please install missing dependencies before proceeding."
    exit 1
fi

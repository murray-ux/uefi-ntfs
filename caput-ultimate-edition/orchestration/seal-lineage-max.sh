#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
# CanonKit - Seal DER-canonical lineage ROOT → ENV → API
# Creates cryptographic proof chain for trust delegation

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CANON_ROOT="$(dirname "$SCRIPT_DIR")"
KEYS_DIR="$CANON_ROOT/keys"
ROOT_DIR="$KEYS_DIR/root"
ENV_DIR="$KEYS_DIR/env"
API_DIR="$KEYS_DIR/api"

echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       CanonKit - Seal DER-Canonical Lineage (ROOT→ENV→API)     ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Verify root keypair exists
# ─────────────────────────────────────────────────────────────────────────────
if [[ ! -f "$ROOT_DIR/canon_root.key" ]]; then
    echo -e "${RED}ERROR: Canon root keypair not found!${NC}"
    echo "Run ./orchestration/init_canon_root.sh first"
    exit 1
fi

echo -e "${GREEN}[1/6]${NC} Root keypair verified"

# ─────────────────────────────────────────────────────────────────────────────
# Generate or verify ENV keypair
# ─────────────────────────────────────────────────────────────────────────────
mkdir -p "$ENV_DIR"

if [[ ! -f "$ENV_DIR/env.key" ]]; then
    echo -e "${CYAN}[2/6]${NC} Generating ENV signing keypair..."
    openssl genpkey -algorithm ed25519 -out "$ENV_DIR/env.key"
    chmod 600 "$ENV_DIR/env.key"
else
    echo -e "${GREEN}[2/6]${NC} ENV keypair exists"
fi

# Export ENV public key in PEM and DER formats
openssl pkey -in "$ENV_DIR/env.key" -pubout -out "$ENV_DIR/env.pub.pem"
openssl pkey -in "$ENV_DIR/env.key" -pubout -outform DER -out "$ENV_DIR/env.pub.der"
chmod 644 "$ENV_DIR/env.pub.pem" "$ENV_DIR/env.pub.der"

# ─────────────────────────────────────────────────────────────────────────────
# Generate or verify API keypair
# ─────────────────────────────────────────────────────────────────────────────
mkdir -p "$API_DIR"

if [[ ! -f "$API_DIR/api.key" ]]; then
    echo -e "${CYAN}[3/6]${NC} Generating API signing keypair..."
    openssl genpkey -algorithm ed25519 -out "$API_DIR/api.key"
    chmod 600 "$API_DIR/api.key"
else
    echo -e "${GREEN}[3/6]${NC} API keypair exists"
fi

# Export API public key in PEM and DER formats
openssl pkey -in "$API_DIR/api.key" -pubout -out "$API_DIR/api.pub.pem"
openssl pkey -in "$API_DIR/api.key" -pubout -outform DER -out "$API_DIR/api.pub.der"
chmod 644 "$API_DIR/api.pub.pem" "$API_DIR/api.pub.der"

# ─────────────────────────────────────────────────────────────────────────────
# Sign ENV public DER with ROOT private key (ROOT → ENV delegation)
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${CYAN}[4/6]${NC} Signing ENV public key with ROOT..."

openssl pkeyutl -sign \
    -inkey "$ROOT_DIR/canon_root.key" \
    -rawin \
    -in "$ENV_DIR/env.pub.der" \
    -out "$ENV_DIR/env.pub.der.sig"

chmod 644 "$ENV_DIR/env.pub.der.sig"

# Verify the signature immediately
if openssl pkeyutl -verify \
    -pubin -inkey "$ROOT_DIR/canon_root.pub.pem" \
    -rawin \
    -in "$ENV_DIR/env.pub.der" \
    -sigfile "$ENV_DIR/env.pub.der.sig" 2>/dev/null; then
    echo -e "  ${GREEN}ROOT→ENV signature verified${NC}"
else
    echo -e "  ${RED}ROOT→ENV signature FAILED${NC}"
    exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# Sign API public DER with ENV private key (ENV → API delegation)
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${CYAN}[5/6]${NC} Signing API public key with ENV..."

openssl pkeyutl -sign \
    -inkey "$ENV_DIR/env.key" \
    -rawin \
    -in "$API_DIR/api.pub.der" \
    -out "$API_DIR/api.pub.der.sig"

chmod 644 "$API_DIR/api.pub.der.sig"

# Verify the signature immediately
if openssl pkeyutl -verify \
    -pubin -inkey "$ENV_DIR/env.pub.pem" \
    -rawin \
    -in "$API_DIR/api.pub.der" \
    -sigfile "$API_DIR/api.pub.der.sig" 2>/dev/null; then
    echo -e "  ${GREEN}ENV→API signature verified${NC}"
else
    echo -e "  ${RED}ENV→API signature FAILED${NC}"
    exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# Generate lineage metadata
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${CYAN}[6/6]${NC} Generating lineage metadata..."

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Compute fingerprints
if command -v sha256sum &> /dev/null; then
    ROOT_FP=$(sha256sum "$ROOT_DIR/canon_root.pub.der" | cut -d' ' -f1)
    ENV_FP=$(sha256sum "$ENV_DIR/env.pub.der" | cut -d' ' -f1)
    API_FP=$(sha256sum "$API_DIR/api.pub.der" | cut -d' ' -f1)
    ENV_SIG_SIZE=$(wc -c < "$ENV_DIR/env.pub.der.sig" | tr -d ' ')
    API_SIG_SIZE=$(wc -c < "$API_DIR/api.pub.der.sig" | tr -d ' ')
else
    ROOT_FP=$(shasum -a 256 "$ROOT_DIR/canon_root.pub.der" | cut -d' ' -f1)
    ENV_FP=$(shasum -a 256 "$ENV_DIR/env.pub.der" | cut -d' ' -f1)
    API_FP=$(shasum -a 256 "$API_DIR/api.pub.der" | cut -d' ' -f1)
    ENV_SIG_SIZE=$(wc -c < "$ENV_DIR/env.pub.der.sig" | tr -d ' ')
    API_SIG_SIZE=$(wc -c < "$API_DIR/api.pub.der.sig" | tr -d ' ')
fi

cat > "$KEYS_DIR/lineage.json" << EOF
{
  "type": "CANONKIT_LINEAGE",
  "sealed_at": "$TIMESTAMP",
  "algorithm": "Ed25519",
  "chain": [
    {
      "level": 0,
      "name": "ROOT",
      "fingerprint": "$ROOT_FP",
      "role": "Frozen Canon Root (offline)"
    },
    {
      "level": 1,
      "name": "ENV",
      "fingerprint": "$ENV_FP",
      "signed_by": "ROOT",
      "signature_file": "env/env.pub.der.sig",
      "signature_bytes": $ENV_SIG_SIZE,
      "role": "Environment signing key (manifest signing)"
    },
    {
      "level": 2,
      "name": "API",
      "fingerprint": "$API_FP",
      "signed_by": "ENV",
      "signature_file": "api/api.pub.der.sig",
      "signature_bytes": $API_SIG_SIZE,
      "role": "API signing key (optional lineage)"
    }
  ],
  "verification_command": "./orchestration/verify_evidence_manifest.sh"
}
EOF

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║            LINEAGE SEALED (DER-canonical)                      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Trust Chain:${NC}"
echo "  ROOT ─┬─► ENV ─┬─► API"
echo "        │        │"
echo "        │        └── api.pub.der.sig ($API_SIG_SIZE bytes)"
echo "        │"
echo "        └── env.pub.der.sig ($ENV_SIG_SIZE bytes)"
echo ""
echo -e "${CYAN}Fingerprints:${NC}"
echo "  ROOT: ${ROOT_FP:0:16}..."
echo "  ENV:  ${ENV_FP:0:16}..."
echo "  API:  ${API_FP:0:16}..."
echo ""
echo -e "${CYAN}Files created:${NC}"
echo "  $ENV_DIR/env.key             [PRIVATE]"
echo "  $ENV_DIR/env.pub.pem         [PUBLIC]"
echo "  $ENV_DIR/env.pub.der         [PUBLIC - Canonical]"
echo "  $ENV_DIR/env.pub.der.sig     [ROOT→ENV Signature]"
echo "  $API_DIR/api.key             [PRIVATE]"
echo "  $API_DIR/api.pub.pem         [PUBLIC]"
echo "  $API_DIR/api.pub.der         [PUBLIC - Canonical]"
echo "  $API_DIR/api.pub.der.sig     [ENV→API Signature]"
echo "  $KEYS_DIR/lineage.json       [Lineage Metadata]"
echo ""
echo -e "${YELLOW}IMPORTANT:${NC}"
echo "  Now move $ROOT_DIR/canon_root.key to secure offline storage."
echo "  The ENV key is used for day-to-day manifest signing."
echo ""
echo -e "${CYAN}Next step:${NC}"
echo "  ./orchestration/ingest_evidence.py /path/to/file --label \"Description\""

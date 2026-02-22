#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
# CanonKit - Initialize frozen Canon Root Ed25519 keypair
# This is a ONE-TIME operation. Treat the root key as offline/locked away.

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

echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        CanonKit - Initialize Frozen Canon Root Keypair         ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Safety check - prevent accidental overwrite
# ─────────────────────────────────────────────────────────────────────────────
if [[ -f "$ROOT_DIR/canon_root.key" ]]; then
    echo -e "${RED}ERROR: Canon root keypair already exists!${NC}"
    echo ""
    echo "Location: $ROOT_DIR/canon_root.key"
    echo ""
    echo "The Canon Root is designed to be generated ONCE and never replaced."
    echo "If you need to regenerate, you must:"
    echo "  1. Backup and archive the existing keys/ directory"
    echo "  2. Manually delete $ROOT_DIR"
    echo "  3. Re-run this script"
    echo "  4. Re-seal all lineage chains"
    echo ""
    echo -e "${YELLOW}WARNING: Regenerating the root invalidates ALL existing signatures!${NC}"
    exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# Create directory structure
# ─────────────────────────────────────────────────────────────────────────────
echo "Creating key directory structure..."
mkdir -p "$ROOT_DIR"
mkdir -p "$KEYS_DIR/env"
mkdir -p "$KEYS_DIR/api"

# Set restrictive permissions on keys directory
chmod 700 "$KEYS_DIR"
chmod 700 "$ROOT_DIR"

# ─────────────────────────────────────────────────────────────────────────────
# Generate Ed25519 root keypair
# ─────────────────────────────────────────────────────────────────────────────
echo "Generating Ed25519 Canon Root keypair..."

# Generate private key
openssl genpkey -algorithm ed25519 -out "$ROOT_DIR/canon_root.key"
chmod 600 "$ROOT_DIR/canon_root.key"

# Extract public key (PEM format)
openssl pkey -in "$ROOT_DIR/canon_root.key" -pubout -out "$ROOT_DIR/canon_root.pub.pem"
chmod 644 "$ROOT_DIR/canon_root.pub.pem"

# Export public key (DER format for canonical bytes)
openssl pkey -in "$ROOT_DIR/canon_root.key" -pubout -outform DER -out "$ROOT_DIR/canon_root.pub.der"
chmod 644 "$ROOT_DIR/canon_root.pub.der"

# ─────────────────────────────────────────────────────────────────────────────
# Generate fingerprint
# ─────────────────────────────────────────────────────────────────────────────
echo "Computing fingerprint..."

# SHA256 of the DER-encoded public key
if command -v sha256sum &> /dev/null; then
    FINGERPRINT=$(sha256sum "$ROOT_DIR/canon_root.pub.der" | cut -d' ' -f1)
else
    FINGERPRINT=$(shasum -a 256 "$ROOT_DIR/canon_root.pub.der" | cut -d' ' -f1)
fi

echo "$FINGERPRINT" > "$ROOT_DIR/canon_root.fingerprint.txt"

# ─────────────────────────────────────────────────────────────────────────────
# Generate creation metadata
# ─────────────────────────────────────────────────────────────────────────────
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
HOSTNAME=$(hostname 2>/dev/null || echo "unknown")

cat > "$ROOT_DIR/canon_root.meta.json" << EOF
{
  "type": "CANON_ROOT",
  "algorithm": "Ed25519",
  "created_at": "$TIMESTAMP",
  "created_on": "$HOSTNAME",
  "fingerprint": "$FINGERPRINT",
  "public_key_pem": "canon_root.pub.pem",
  "public_key_der": "canon_root.pub.der",
  "private_key": "canon_root.key",
  "note": "CRITICAL: Keep canon_root.key offline and secure. This is the root of trust."
}
EOF

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║               CANON ROOT KEYPAIR INITIALIZED                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Files created:${NC}"
echo "  $ROOT_DIR/canon_root.key           [PRIVATE - HIGH SENSITIVITY]"
echo "  $ROOT_DIR/canon_root.pub.pem       [PUBLIC - Safe to share]"
echo "  $ROOT_DIR/canon_root.pub.der       [PUBLIC - Canonical bytes]"
echo "  $ROOT_DIR/canon_root.fingerprint.txt"
echo "  $ROOT_DIR/canon_root.meta.json"
echo ""
echo -e "${CYAN}Fingerprint (SHA256 of public DER):${NC}"
echo "  $FINGERPRINT"
echo ""
echo -e "${YELLOW}IMPORTANT SECURITY RULES:${NC}"
echo "  1. Move canon_root.key to offline storage after sealing lineage"
echo "  2. Never commit canon_root.key to version control"
echo "  3. Keep at least 2 backups of the private key"
echo "  4. Document the fingerprint in multiple locations"
echo ""
echo -e "${CYAN}Next step:${NC}"
echo "  ./orchestration/seal-lineage-max.sh"

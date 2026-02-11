#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
# CanonKit - Export Court Pack (Option B)
# Creates a ZIP containing manifest, selected evidence, and replay instructions

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CANON_ROOT="$(dirname "$SCRIPT_DIR")"
CANON_DIR="$CANON_ROOT/canon"
KEYS_DIR="$CANON_ROOT/keys"

usage() {
    echo "Usage: $0 [options] [evidence-id...]"
    echo ""
    echo "Options:"
    echo "  --all, -a          Include all evidence (default if no IDs specified)"
    echo "  --output, -o       Output filename (default: court_pack_<timestamp>.zip)"
    echo "  --case, -c         Case reference for the pack"
    echo "  --note, -n         Note to include in the pack"
    echo "  --help, -h         Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 --all --case 'Case 6183-2025'"
    echo "  $0 abc123 def456 --output evidence_bundle.zip"
    exit 1
}

# ─────────────────────────────────────────────────────────────────────────────
# Parse arguments
# ─────────────────────────────────────────────────────────────────────────────
INCLUDE_ALL=false
OUTPUT=""
CASE_REF=""
NOTE=""
EVIDENCE_IDS=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        --all|-a)
            INCLUDE_ALL=true
            shift
            ;;
        --output|-o)
            OUTPUT="$2"
            shift 2
            ;;
        --case|-c)
            CASE_REF="$2"
            shift 2
            ;;
        --note|-n)
            NOTE="$2"
            shift 2
            ;;
        --help|-h)
            usage
            ;;
        -*)
            echo "Unknown option: $1"
            usage
            ;;
        *)
            EVIDENCE_IDS+=("$1")
            shift
            ;;
    esac
done

# Default to --all if no IDs specified
if [[ ${#EVIDENCE_IDS[@]} -eq 0 ]]; then
    INCLUDE_ALL=true
fi

# ─────────────────────────────────────────────────────────────────────────────
# Verify manifest exists
# ─────────────────────────────────────────────────────────────────────────────
MANIFEST="$CANON_DIR/manifest/EVIDENCE_MANIFEST.json"

if [[ ! -f "$MANIFEST" ]]; then
    echo -e "${RED}Error: No evidence manifest found${NC}"
    echo "Ingest evidence first: ./orchestration/ingest_evidence.py"
    exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# Verify integrity before export
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║              CanonKit - Export Court Pack                      ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Verifying canon integrity before export...${NC}"
echo ""

if ! "$SCRIPT_DIR/verify_evidence_manifest.sh"; then
    echo ""
    echo -e "${RED}ERROR: Canon integrity check failed. Cannot export.${NC}"
    exit 1
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Gather evidence IDs
# ─────────────────────────────────────────────────────────────────────────────
if [[ "$INCLUDE_ALL" == "true" ]]; then
    if command -v jq &> /dev/null; then
        mapfile -t EVIDENCE_IDS < <(jq -r '.evidence_ids[]' "$MANIFEST")
    else
        echo -e "${RED}Error: jq required for --all option${NC}"
        exit 1
    fi
fi

EVIDENCE_COUNT=${#EVIDENCE_IDS[@]}
echo "Evidence items to export: $EVIDENCE_COUNT"

if [[ $EVIDENCE_COUNT -eq 0 ]]; then
    echo -e "${YELLOW}No evidence to export${NC}"
    exit 0
fi

# ─────────────────────────────────────────────────────────────────────────────
# Create temporary directory
# ─────────────────────────────────────────────────────────────────────────────
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TEMP_DIR=$(mktemp -d)
PACK_DIR="$TEMP_DIR/court_pack_$TIMESTAMP"

mkdir -p "$PACK_DIR/evidence"
mkdir -p "$PACK_DIR/objects"
mkdir -p "$PACK_DIR/events"
mkdir -p "$PACK_DIR/keys"
mkdir -p "$PACK_DIR/manifest"

# ─────────────────────────────────────────────────────────────────────────────
# Copy manifest and signatures
# ─────────────────────────────────────────────────────────────────────────────
echo "Copying manifest and signatures..."

cp "$CANON_DIR/manifest/EVIDENCE_MANIFEST.json" "$PACK_DIR/manifest/"
cp "$CANON_DIR/manifest/EVIDENCE_MANIFEST.sha256" "$PACK_DIR/manifest/"
cp "$CANON_DIR/manifest/EVIDENCE_MANIFEST.sig" "$PACK_DIR/manifest/"

# Copy eventlog
if [[ -f "$CANON_DIR/events/eventlog.txt" ]]; then
    cp "$CANON_DIR/events/eventlog.txt" "$PACK_DIR/events/"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Copy public keys (for verification)
# ─────────────────────────────────────────────────────────────────────────────
echo "Copying public keys..."

# Copy public keys only (never private keys!)
cp "$KEYS_DIR/root/canon_root.pub.pem" "$PACK_DIR/keys/"
cp "$KEYS_DIR/root/canon_root.pub.der" "$PACK_DIR/keys/"
cp "$KEYS_DIR/root/canon_root.fingerprint.txt" "$PACK_DIR/keys/"
cp "$KEYS_DIR/env/env.pub.pem" "$PACK_DIR/keys/"
cp "$KEYS_DIR/env/env.pub.der" "$PACK_DIR/keys/"
cp "$KEYS_DIR/env/env.pub.der.sig" "$PACK_DIR/keys/"

if [[ -f "$KEYS_DIR/lineage.json" ]]; then
    cp "$KEYS_DIR/lineage.json" "$PACK_DIR/keys/"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Copy evidence and objects
# ─────────────────────────────────────────────────────────────────────────────
echo "Copying evidence items..."

for eid in "${EVIDENCE_IDS[@]}"; do
    evidence_file="$CANON_DIR/evidence/${eid}.json"

    if [[ ! -f "$evidence_file" ]]; then
        echo -e "  ${YELLOW}Warning: Evidence not found: $eid${NC}"
        continue
    fi

    # Copy evidence JSON
    cp "$evidence_file" "$PACK_DIR/evidence/"

    # Extract content hash and copy object
    if command -v jq &> /dev/null; then
        content_hash=$(jq -r '.content_hash' "$evidence_file")
        object_file="$CANON_DIR/objects/$content_hash"

        if [[ -f "$object_file" ]]; then
            cp "$object_file" "$PACK_DIR/objects/"
        fi
    fi

    echo "  - $eid"
done

# ─────────────────────────────────────────────────────────────────────────────
# Copy events
# ─────────────────────────────────────────────────────────────────────────────
echo "Copying events..."

if command -v jq &> /dev/null; then
    mapfile -t EVENT_HASHES < <(jq -r '.event_hashes[]' "$MANIFEST")
    for ehash in "${EVENT_HASHES[@]}"; do
        event_file="$CANON_DIR/events/${ehash}.json"
        if [[ -f "$event_file" ]]; then
            cp "$event_file" "$PACK_DIR/events/"
        fi
    done
fi

# ─────────────────────────────────────────────────────────────────────────────
# Generate README
# ─────────────────────────────────────────────────────────────────────────────
echo "Generating README..."

cat > "$PACK_DIR/README.txt" << EOF
╔════════════════════════════════════════════════════════════════════════════╗
║                     CANONKIT EVIDENCE COURT PACK                           ║
╚════════════════════════════════════════════════════════════════════════════╝

Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Evidence Count: $EVIDENCE_COUNT
EOF

[[ -n "$CASE_REF" ]] && echo "Case Reference: $CASE_REF" >> "$PACK_DIR/README.txt"
[[ -n "$NOTE" ]] && echo "Note: $NOTE" >> "$PACK_DIR/README.txt"

cat >> "$PACK_DIR/README.txt" << 'EOF'

────────────────────────────────────────────────────────────────────────────────
CONTENTS
────────────────────────────────────────────────────────────────────────────────

  manifest/           Signed evidence manifest
    EVIDENCE_MANIFEST.json      Master manifest of all evidence
    EVIDENCE_MANIFEST.sha256    SHA256 hash of manifest
    EVIDENCE_MANIFEST.sig       Ed25519 signature (ENV key)

  evidence/           Evidence metadata (JSON)
    <uuid>.json       One file per evidence item

  objects/            Raw evidence files (content-addressed)
    <sha256>          Files named by their SHA256 hash

  events/             Audit trail events
    <hash>.json       One file per event
    eventlog.txt      Ordered list of event hashes

  keys/               Public keys for verification
    canon_root.pub.pem        Root public key (PEM)
    canon_root.pub.der        Root public key (DER)
    env.pub.pem               ENV public key (PEM)
    env.pub.der               ENV public key (DER)
    env.pub.der.sig           ROOT→ENV delegation signature
    lineage.json              Trust chain metadata

────────────────────────────────────────────────────────────────────────────────
VERIFICATION INSTRUCTIONS
────────────────────────────────────────────────────────────────────────────────

To verify this evidence pack is authentic and unmodified:

1. VERIFY ROOT→ENV LINEAGE
   The ENV key must be signed by the ROOT key:

   openssl pkeyutl -verify \
     -pubin -inkey keys/canon_root.pub.pem \
     -rawin \
     -in keys/env.pub.der \
     -sigfile keys/env.pub.der.sig

   Expected output: "Signature Verified Successfully"

2. VERIFY MANIFEST HASH
   Compute the SHA256 of the manifest and compare:

   sha256sum manifest/EVIDENCE_MANIFEST.json
   cat manifest/EVIDENCE_MANIFEST.sha256

   The hashes must match exactly.

3. VERIFY MANIFEST SIGNATURE
   The manifest must be signed by the ENV key:

   openssl pkeyutl -verify \
     -pubin -inkey keys/env.pub.pem \
     -rawin \
     -in manifest/EVIDENCE_MANIFEST.json \
     -sigfile manifest/EVIDENCE_MANIFEST.sig

   Expected output: "Signature Verified Successfully"

4. VERIFY INDIVIDUAL EVIDENCE
   For each evidence file, verify the content hash:

   sha256sum objects/<hash>

   Compare to the "content_hash" field in the evidence JSON.

────────────────────────────────────────────────────────────────────────────────
CRYPTOGRAPHIC PROPERTIES
────────────────────────────────────────────────────────────────────────────────

Algorithm:        Ed25519 (RFC 8032)
Hash Function:    SHA-256
Key Format:       DER-canonical for signatures, PEM for display
Signature Size:   64 bytes

This evidence pack provides:
  - Non-repudiation: Signatures prove origin
  - Integrity: Any modification invalidates signatures
  - Chain of custody: Event log tracks all actions
  - Verifiability: All proofs are self-contained

────────────────────────────────────────────────────────────────────────────────
LEGAL NOTE
────────────────────────────────────────────────────────────────────────────────

This pack contains cryptographically-verified evidence with an unbroken
chain of custody. Each file's integrity can be independently verified
using standard cryptographic tools (OpenSSL, sha256sum).

The ROOT key fingerprint should be verified against an independent source
before trusting this evidence pack.

ROOT KEY FINGERPRINT:
EOF

if [[ -f "$KEYS_DIR/root/canon_root.fingerprint.txt" ]]; then
    cat "$KEYS_DIR/root/canon_root.fingerprint.txt" >> "$PACK_DIR/README.txt"
fi

cat >> "$PACK_DIR/README.txt" << 'EOF'

────────────────────────────────────────────────────────────────────────────────
Generated by CanonKit - https://github.com/murray-ux/genesis
EOF

# ─────────────────────────────────────────────────────────────────────────────
# Generate verification script
# ─────────────────────────────────────────────────────────────────────────────
cat > "$PACK_DIR/verify.sh" << 'EOF'
#!/usr/bin/env bash
# Auto-generated verification script for this court pack
set -euo pipefail

echo "Verifying Court Pack Integrity..."
echo ""

ERRORS=0

# 1. Verify ROOT→ENV lineage
echo -n "[1/3] ROOT→ENV lineage... "
if openssl pkeyutl -verify \
    -pubin -inkey keys/canon_root.pub.pem \
    -rawin \
    -in keys/env.pub.der \
    -sigfile keys/env.pub.der.sig 2>/dev/null; then
    echo "OK"
else
    echo "FAILED"
    ERRORS=$((ERRORS + 1))
fi

# 2. Verify manifest hash
echo -n "[2/3] Manifest hash... "
if command -v sha256sum &> /dev/null; then
    COMPUTED=$(sha256sum manifest/EVIDENCE_MANIFEST.json | cut -d' ' -f1)
else
    COMPUTED=$(shasum -a 256 manifest/EVIDENCE_MANIFEST.json | cut -d' ' -f1)
fi
STORED=$(cat manifest/EVIDENCE_MANIFEST.sha256 | tr -d '\n ')

if [[ "$COMPUTED" == "$STORED" ]]; then
    echo "OK"
else
    echo "FAILED"
    ERRORS=$((ERRORS + 1))
fi

# 3. Verify manifest signature
echo -n "[3/3] Manifest signature... "
if openssl pkeyutl -verify \
    -pubin -inkey keys/env.pub.pem \
    -rawin \
    -in manifest/EVIDENCE_MANIFEST.json \
    -sigfile manifest/EVIDENCE_MANIFEST.sig 2>/dev/null; then
    echo "OK"
else
    echo "FAILED"
    ERRORS=$((ERRORS + 1))
fi

echo ""
if [[ $ERRORS -eq 0 ]]; then
    echo "INTEGRITY VERIFIED"
    exit 0
else
    echo "INTEGRITY FAILED ($ERRORS errors)"
    exit 1
fi
EOF
chmod +x "$PACK_DIR/verify.sh"

# ─────────────────────────────────────────────────────────────────────────────
# Create ZIP
# ─────────────────────────────────────────────────────────────────────────────
if [[ -z "$OUTPUT" ]]; then
    OUTPUT="court_pack_${TIMESTAMP}.zip"
fi

# Ensure output has .zip extension
[[ "$OUTPUT" != *.zip ]] && OUTPUT="${OUTPUT}.zip"

echo ""
echo "Creating ZIP archive..."

cd "$TEMP_DIR"
zip -r "$OUTPUT" "court_pack_$TIMESTAMP" -x "*.DS_Store"
mv "$OUTPUT" "$CANON_ROOT/"

# Cleanup
rm -rf "$TEMP_DIR"

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
FINAL_PATH="$CANON_ROOT/$OUTPUT"
PACK_SIZE=$(du -h "$FINAL_PATH" | cut -f1)

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                  COURT PACK EXPORTED                           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Output:         $FINAL_PATH"
echo "Size:           $PACK_SIZE"
echo "Evidence items: $EVIDENCE_COUNT"
[[ -n "$CASE_REF" ]] && echo "Case reference: $CASE_REF"
echo ""
echo "The pack includes:"
echo "  - Signed manifest with integrity proofs"
echo "  - All evidence files and metadata"
echo "  - Complete event/audit trail"
echo "  - Public keys for verification"
echo "  - Verification instructions (README.txt)"
echo "  - Verification script (verify.sh)"
echo ""
echo "To verify the pack:"
echo "  unzip $OUTPUT && cd court_pack_$TIMESTAMP && ./verify.sh"

#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
# CanonKit - Batch Evidence Ingestion (Option A)
# Ingests every file in a folder with automatic labeling, then verifies

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
    echo "Usage: $0 <folder> [--source <source>] [--prefix <label-prefix>] [--dry-run]"
    echo ""
    echo "Options:"
    echo "  <folder>           Directory containing files to ingest"
    echo "  --source, -s       Source identifier (default: 'Batch Import')"
    echo "  --prefix, -p       Label prefix (default: filename)"
    echo "  --court, -c        Court case relevance"
    echo "  --recursive, -r    Process subdirectories"
    echo "  --dry-run          Show what would be ingested without doing it"
    echo "  --help, -h         Show this help"
    echo ""
    echo "Example:"
    echo "  $0 /path/to/evidence --source 'Email Export' --court 'Case 6183-2025'"
    exit 1
}

# ─────────────────────────────────────────────────────────────────────────────
# Parse arguments
# ─────────────────────────────────────────────────────────────────────────────
FOLDER=""
SOURCE="Batch Import"
PREFIX=""
COURT=""
RECURSIVE=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --source|-s)
            SOURCE="$2"
            shift 2
            ;;
        --prefix|-p)
            PREFIX="$2"
            shift 2
            ;;
        --court|-c)
            COURT="$2"
            shift 2
            ;;
        --recursive|-r)
            RECURSIVE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help|-h)
            usage
            ;;
        -*)
            echo "Unknown option: $1"
            usage
            ;;
        *)
            if [[ -z "$FOLDER" ]]; then
                FOLDER="$1"
            else
                echo "Unexpected argument: $1"
                usage
            fi
            shift
            ;;
    esac
done

if [[ -z "$FOLDER" ]]; then
    echo "Error: No folder specified"
    usage
fi

if [[ ! -d "$FOLDER" ]]; then
    echo "Error: Not a directory: $FOLDER"
    exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# Gather files
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║              CanonKit - Batch Evidence Ingestion               ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Folder:    $FOLDER"
echo "Source:    $SOURCE"
echo "Recursive: $RECURSIVE"
[[ -n "$PREFIX" ]] && echo "Prefix:    $PREFIX"
[[ -n "$COURT" ]] && echo "Court:     $COURT"
echo ""

# Find files
if [[ "$RECURSIVE" == "true" ]]; then
    mapfile -t FILES < <(find "$FOLDER" -type f ! -name ".*" | sort)
else
    mapfile -t FILES < <(find "$FOLDER" -maxdepth 1 -type f ! -name ".*" | sort)
fi

FILE_COUNT=${#FILES[@]}

if [[ $FILE_COUNT -eq 0 ]]; then
    echo -e "${YELLOW}No files found in $FOLDER${NC}"
    exit 0
fi

echo "Found $FILE_COUNT file(s) to ingest:"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Preview files
# ─────────────────────────────────────────────────────────────────────────────
for file in "${FILES[@]}"; do
    filename=$(basename "$file")
    if [[ -n "$PREFIX" ]]; then
        label="$PREFIX - $filename"
    else
        # Auto-generate label from filename
        label=$(echo "$filename" | sed 's/[_-]/ /g' | sed 's/\.[^.]*$//')
    fi
    echo "  - $filename"
    echo "    Label: $label"
done

echo ""

if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "${YELLOW}DRY RUN - No files were ingested${NC}"
    exit 0
fi

# ─────────────────────────────────────────────────────────────────────────────
# Ingest files
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${CYAN}Starting ingestion...${NC}"
echo ""

SUCCESS=0
FAILED=0
RESULTS=()

for file in "${FILES[@]}"; do
    filename=$(basename "$file")
    if [[ -n "$PREFIX" ]]; then
        label="$PREFIX - $filename"
    else
        label=$(echo "$filename" | sed 's/[_-]/ /g' | sed 's/\.[^.]*$//')
    fi

    echo -n "  [$((SUCCESS + FAILED + 1))/$FILE_COUNT] $filename... "

    # Build ingest command
    CMD=("python3" "$SCRIPT_DIR/ingest_evidence.py" "$file" "--label" "$label" "--source" "$SOURCE" "--json")
    [[ -n "$COURT" ]] && CMD+=("--court-relevance" "$COURT")

    # Run ingest
    if OUTPUT=$("${CMD[@]}" 2>&1); then
        echo -e "${GREEN}OK${NC}"
        SUCCESS=$((SUCCESS + 1))
        RESULTS+=("$OUTPUT")
    else
        echo -e "${RED}FAILED${NC}"
        echo "    Error: $OUTPUT"
        FAILED=$((FAILED + 1))
    fi
done

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Verify manifest
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${CYAN}Verifying manifest integrity...${NC}"
echo ""

if "$SCRIPT_DIR/verify_evidence_manifest.sh"; then
    VERIFY_STATUS="PASSED"
else
    VERIFY_STATUS="FAILED"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    BATCH INGESTION COMPLETE                    ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Results:"
echo "  Total files:     $FILE_COUNT"
echo "  Successful:      $SUCCESS"
echo "  Failed:          $FAILED"
echo "  Verification:    $VERIFY_STATUS"
echo ""

if [[ $FAILED -gt 0 ]]; then
    echo -e "${YELLOW}Warning: $FAILED file(s) failed to ingest${NC}"
    exit 1
fi

echo -e "${GREEN}All files ingested and verified successfully${NC}"

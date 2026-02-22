#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# GENESIS 2.0 — Evidence Documentation CLI
# ═══════════════════════════════════════════════════════════════════════════
# Owner: CAPUT Admin (admin@caput.system)
# Case: WA Magistrates Court 122458751
# YubiKey: 5C FIPS (Serial: 31695265)
# ═══════════════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EVIDENCE_DIR="${SCRIPT_DIR}/items"
EVIDENCE_LOG="${SCRIPT_DIR}/evidence-log.json"
CASE_REF="122458751"

# Initialize
mkdir -p "${EVIDENCE_DIR}"
[ ! -f "${EVIDENCE_LOG}" ] && echo '{"case":"'${CASE_REF}'","owner":"admin@caput.system","items":[]}' > "${EVIDENCE_LOG}"

# Banner
show_banner() {
    echo -e "${CYAN}"
    cat << 'BANNER'
═══════════════════════════════════════════════════════════════
   GENESIS 2.0 — Evidence Documentation Module
═══════════════════════════════════════════════════════════════
BANNER
    echo -e "${NC}"
    echo -e "  ${GREEN}Case:${NC}  WA Magistrates Court ${CASE_REF}"
    echo -e "  ${GREEN}Owner:${NC} CAPUT Admin"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo
}

# Generate evidence ID
gen_id() {
    echo "EVD-$(date +%Y%m%d)-$(openssl rand -hex 4 | tr '[:lower:]' '[:upper:]')"
}

# Calculate file hash
hash_file() {
    local file="$1"
    if [ -f "$file" ]; then
        if command -v shasum &> /dev/null; then
            shasum -a 256 "$file" | awk '{print $1}'
        elif command -v sha256sum &> /dev/null; then
            sha256sum "$file" | awk '{print $1}'
        else
            echo "HASH_UNAVAILABLE"
        fi
    else
        echo "FILE_NOT_FOUND"
    fi
}

# Get file metadata
get_metadata() {
    local file="$1"
    if [ -f "$file" ]; then
        echo "{"
        echo "  \"size\": $(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo 0),"
        echo "  \"created\": \"$(stat -f%SB -t '%Y-%m-%dT%H:%M:%S' "$file" 2>/dev/null || stat -c%W "$file" 2>/dev/null || echo 'unknown')\","
        echo "  \"modified\": \"$(stat -f%Sm -t '%Y-%m-%dT%H:%M:%S' "$file" 2>/dev/null || stat -c%y "$file" 2>/dev/null || echo 'unknown')\","
        echo "  \"type\": \"$(file -b "$file" 2>/dev/null || echo 'unknown')\""
        echo "}"
    fi
}

# Add evidence item
add_evidence() {
    local type=""
    local description=""
    local location=""
    local file_path=""
    local concern=""
    local device=""
    local action_taken=""

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --type) type="$2"; shift 2 ;;
            --description) description="$2"; shift 2 ;;
            --location) location="$2"; shift 2 ;;
            --file-path) file_path="$2"; shift 2 ;;
            --concern) concern="$2"; shift 2 ;;
            --device) device="$2"; shift 2 ;;
            --action-taken) action_taken="$2"; shift 2 ;;
            *) shift ;;
        esac
    done

    # Generate ID
    local evd_id=$(gen_id)
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    echo -e "${YELLOW}[EVIDENCE]${NC} Creating evidence record: ${evd_id}"

    # Calculate hash if file provided
    local file_hash=""
    local metadata=""
    if [ -n "$file_path" ] && [ -f "$file_path" ]; then
        echo -e "${YELLOW}[EVIDENCE]${NC} Calculating SHA-256 hash..."
        file_hash=$(hash_file "$file_path")
        metadata=$(get_metadata "$file_path")

        # Copy file to evidence folder
        local ext="${file_path##*.}"
        local dest="${EVIDENCE_DIR}/${evd_id}.${ext}"
        cp "$file_path" "$dest"
        echo -e "${GREEN}[EVIDENCE]${NC} File preserved: ${dest}"
    fi

    # Create evidence record
    local record_file="${EVIDENCE_DIR}/${evd_id}.json"
    cat > "$record_file" << EOF
{
  "id": "${evd_id}",
  "case": "${CASE_REF}",
  "timestamp": "${timestamp}",
  "type": "${type}",
  "description": "${description}",
  "location": "${location}",
  "device": "${device}",
  "concern": "${concern}",
  "actionTaken": "${action_taken}",
  "file": {
    "originalPath": "${file_path}",
    "sha256": "${file_hash}",
    "metadata": ${metadata:-null}
  },
  "chainOfCustody": [
    {
      "timestamp": "${timestamp}",
      "action": "Created",
      "by": "admin@caput.system",
      "notes": "Initial documentation via GENESIS CLI"
    }
  ],
  "status": "documented"
}
EOF

    echo -e "${GREEN}[EVIDENCE]${NC} Record created: ${record_file}"
    echo
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "  ${GREEN}Evidence ID:${NC}   ${evd_id}"
    echo -e "  ${GREEN}Type:${NC}          ${type}"
    echo -e "  ${GREEN}Timestamp:${NC}     ${timestamp}"
    [ -n "$file_hash" ] && echo -e "  ${GREEN}SHA-256:${NC}       ${file_hash:0:16}..."
    echo -e "  ${GREEN}Status:${NC}        Documented"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
}

# List evidence
list_evidence() {
    echo -e "${YELLOW}[EVIDENCE]${NC} Documented items:"
    echo

    local count=0
    for f in "${EVIDENCE_DIR}"/*.json; do
        [ -f "$f" ] || continue
        local id=$(grep -o '"id": "[^"]*"' "$f" | cut -d'"' -f4)
        local type=$(grep -o '"type": "[^"]*"' "$f" | cut -d'"' -f4)
        local desc=$(grep -o '"description": "[^"]*"' "$f" | cut -d'"' -f4)
        local ts=$(grep -o '"timestamp": "[^"]*"' "$f" | cut -d'"' -f4)

        echo -e "  ${CYAN}${id}${NC}"
        echo -e "    Type: ${type}"
        echo -e "    Desc: ${desc:0:50}..."
        echo -e "    Time: ${ts}"
        echo
        ((count++))
    done

    echo -e "${GREEN}[EVIDENCE]${NC} Total items: ${count}"
}

# Export evidence for legal
export_evidence() {
    local export_dir="${SCRIPT_DIR}/export-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$export_dir"

    echo -e "${YELLOW}[EVIDENCE]${NC} Exporting evidence for legal proceedings..."

    # Create summary
    cat > "${export_dir}/EVIDENCE-SUMMARY.md" << EOF
# Evidence Summary

**Case:** WA Magistrates Court ${CASE_REF}
**Owner:** CAPUT Admin (admin@caput.system)
**Export Date:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Exported By:** GENESIS 2.0 Evidence Module

---

## Items

EOF

    # Copy all items
    for f in "${EVIDENCE_DIR}"/*.json; do
        [ -f "$f" ] || continue
        cp "$f" "$export_dir/"

        local id=$(grep -o '"id": "[^"]*"' "$f" | cut -d'"' -f4)
        local type=$(grep -o '"type": "[^"]*"' "$f" | cut -d'"' -f4)
        local desc=$(grep -o '"description": "[^"]*"' "$f" | cut -d'"' -f4)

        echo "### ${id}" >> "${export_dir}/EVIDENCE-SUMMARY.md"
        echo "- **Type:** ${type}" >> "${export_dir}/EVIDENCE-SUMMARY.md"
        echo "- **Description:** ${desc}" >> "${export_dir}/EVIDENCE-SUMMARY.md"
        echo >> "${export_dir}/EVIDENCE-SUMMARY.md"

        # Copy associated files
        local base="${f%.json}"
        for ext in png jpg jpeg gif pdf; do
            [ -f "${base}.${ext}" ] && cp "${base}.${ext}" "$export_dir/"
        done
    done

    # Create manifest with hashes
    echo -e "${YELLOW}[EVIDENCE]${NC} Creating manifest..."
    (cd "$export_dir" && find . -type f -exec shasum -a 256 {} \; > MANIFEST.sha256)

    echo -e "${GREEN}[EVIDENCE]${NC} Export complete: ${export_dir}"
}

# Device security scan guide
security_scan() {
    show_banner
    echo -e "${YELLOW}Device Security Scan Guide${NC}"
    echo
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}iPhone/iPad Security Checks:${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo
    echo "1. Check for MDM/Configuration Profiles:"
    echo "   Settings > General > VPN & Device Management"
    echo "   ${YELLOW}⚠ Any profiles you didn't install = CONCERN${NC}"
    echo
    echo "2. Check App Privacy Report:"
    echo "   Settings > Privacy & Security > App Privacy Report"
    echo "   ${YELLOW}⚠ Apps accessing location/camera/mic unexpectedly${NC}"
    echo
    echo "3. Check Screen Time (can reveal hidden apps):"
    echo "   Settings > Screen Time > See All Activity"
    echo "   ${YELLOW}⚠ Apps you don't recognize${NC}"
    echo
    echo "4. Check Background App Refresh:"
    echo "   Settings > General > Background App Refresh"
    echo "   ${YELLOW}⚠ Unknown apps with background access${NC}"
    echo
    echo "5. Check Location Services:"
    echo "   Settings > Privacy > Location Services"
    echo "   ${YELLOW}⚠ Apps with 'Always' access you didn't authorize${NC}"
    echo
    echo "6. Check for Hidden Photos:"
    echo "   Photos > Albums > Hidden"
    echo "   ${YELLOW}⚠ Files you didn't hide yourself${NC}"
    echo
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}Android Security Checks:${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo
    echo "1. Check Device Admin Apps:"
    echo "   Settings > Security > Device Admin Apps"
    echo "   ${YELLOW}⚠ Any admins you didn't authorize = MAJOR CONCERN${NC}"
    echo
    echo "2. Check All Apps (including system):"
    echo "   Settings > Apps > See All Apps > Show System"
    echo "   ${YELLOW}⚠ Look for: mSpy, FlexiSpy, Cocospy, Spyic, etc.${NC}"
    echo
    echo "3. Check Battery Usage:"
    echo "   Settings > Battery > Battery Usage"
    echo "   ${YELLOW}⚠ High usage from unknown apps${NC}"
    echo
    echo "4. Check Data Usage:"
    echo "   Settings > Network > Data Usage"
    echo "   ${YELLOW}⚠ Unknown apps using mobile data${NC}"
    echo
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}Known Monitoring Software Names:${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo
    echo "  Commercial Spyware:"
    echo "  - mSpy, FlexiSpy, Cocospy, Spyic, XNSPY"
    echo "  - Hoverwatch, iKeyMonitor, Spyzie, KidsGuard"
    echo "  - TheTruthSpy, Highster Mobile, SpyFone"
    echo
    echo "  Hidden App Names (Android):"
    echo "  - System Service, Update Service, Sync Services"
    echo "  - WiFi Service, Phone Manager, Battery Optimizer"
    echo
    echo "  ${YELLOW}If found: Document with GENESIS, consult legal counsel${NC}"
    echo
}

# Interactive mode
interactive() {
    show_banner

    echo -e "${GREEN}What would you like to document?${NC}"
    echo
    echo "  1) Suspicious file found"
    echo "  2) Device security concern"
    echo "  3) Network anomaly"
    echo "  4) App behavior"
    echo "  5) Call/message records"
    echo "  6) Screenshot/photo evidence"
    echo "  7) Other"
    echo
    read -p "Select (1-7): " choice

    local type=""
    case $choice in
        1) type="suspicious-file" ;;
        2) type="device-security" ;;
        3) type="network-anomaly" ;;
        4) type="app-behavior" ;;
        5) type="call-records" ;;
        6) type="screenshot" ;;
        7) type="other" ;;
        *) echo "Invalid choice"; exit 1 ;;
    esac

    echo
    read -p "Description: " description
    read -p "Where was this found? " location
    read -p "What device? " device
    read -p "Why is this concerning? " concern
    read -p "What action have you taken? " action
    read -p "File path (or press Enter to skip): " file_path

    add_evidence \
        --type "$type" \
        --description "$description" \
        --location "$location" \
        --device "$device" \
        --concern "$concern" \
        --action-taken "$action" \
        ${file_path:+--file-path "$file_path"}
}

# Help
show_help() {
    show_banner
    echo "Usage: genesis-evidence.sh <command> [options]"
    echo
    echo "Commands:"
    echo "  add         Add evidence item"
    echo "  list        List all evidence"
    echo "  export      Export for legal proceedings"
    echo "  scan        Show device security scan guide"
    echo "  interactive Interactive evidence entry"
    echo "  help        Show this help"
    echo
    echo "Add Options:"
    echo "  --type          Evidence type (suspicious-file, device-security, etc.)"
    echo "  --description   Description of the evidence"
    echo "  --location      Where it was found"
    echo "  --file-path     Path to file (will be hashed and copied)"
    echo "  --device        Device name"
    echo "  --concern       Why this is concerning"
    echo "  --action-taken  Actions already taken"
    echo
    echo "Examples:"
    echo "  ./genesis-evidence.sh interactive"
    echo "  ./genesis-evidence.sh add --type suspicious-file --description 'Unknown image'"
    echo "  ./genesis-evidence.sh list"
    echo "  ./genesis-evidence.sh export"
    echo "  ./genesis-evidence.sh scan"
}

# Main
case "${1:-interactive}" in
    add) shift; add_evidence "$@" ;;
    list) list_evidence ;;
    export) export_evidence ;;
    scan) security_scan ;;
    interactive) interactive ;;
    help|--help|-h) show_help ;;
    *) show_help ;;
esac

#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# GENESIS 2.0 — USB Portable Launcher (Linux/Mac)
# ═══════════════════════════════════════════════════════════════════════════
# Owner: Murray Bembrick (murray@bembrick.org)
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

# Get script directory (USB root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GENESIS_ROOT="${SCRIPT_DIR}/.."

clear
echo -e "${CYAN}"
cat << 'BANNER'
═══════════════════════════════════════════════════════════════
   ██████╗ ███████╗███╗   ██╗███████╗███████╗██╗███████╗
  ██╔════╝ ██╔════╝████╗  ██║██╔════╝██╔════╝██║██╔════╝
  ██║  ███╗█████╗  ██╔██╗ ██║█████╗  ███████╗██║███████╗
  ██║   ██║██╔══╝  ██║╚██╗██║██╔══╝  ╚════██║██║╚════██║
  ╚██████╔╝███████╗██║ ╚████║███████╗███████║██║███████║
   ╚═════╝ ╚══════╝╚═╝  ╚═══╝╚══════╝╚══════╝╚═╝╚══════╝
              Version 2.0 — USB Portable Mode
═══════════════════════════════════════════════════════════════
BANNER
echo -e "${NC}"

echo -e "${GREEN}  Owner: Murray Bembrick (murray@bembrick.org)${NC}"
echo -e "${GREEN}  Mode:  USB Portable${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo

# Think Different Manifesto
echo -e "${YELLOW}"
cat << 'MANIFESTO'
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│  Here's to the crazy ones.                                    │
│  The rebels. The troublemakers. The round pegs.               │
│  The ones who see things differently.                         │
│                                                               │
│  They invent. They imagine. They heal.                        │
│  They explore. They create. They inspire.                     │
│                                                               │
│  We make tools for these kinds of people.                     │
│                                                               │
└───────────────────────────────────────────────────────────────┘
MANIFESTO
echo -e "${NC}"
sleep 2

echo -e "${YELLOW}[GENESIS]${NC} USB Root: ${SCRIPT_DIR}"
echo

# ── Check YubiKey ─────────────────────────────────────────────────────────────
echo -e "${YELLOW}[GENESIS]${NC} Checking for YubiKey 5C FIPS (31695265)..."

if command -v ykman &> /dev/null; then
    YUBIKEY_SERIAL=$(ykman info 2>/dev/null | grep "Serial" | awk '{print $2}' || echo "")
    if [ "$YUBIKEY_SERIAL" == "31695265" ]; then
        echo -e "${GREEN}[GENESIS]${NC} ✓ YubiKey verified: 5C FIPS (31695265)"
        export YUBIKEY_VERIFIED=true
    elif [ -n "$YUBIKEY_SERIAL" ]; then
        echo -e "${RED}[GENESIS]${NC} ✗ Wrong YubiKey: $YUBIKEY_SERIAL (expected: 31695265)"
        export YUBIKEY_VERIFIED=false
    else
        echo -e "${YELLOW}[GENESIS]${NC} No YubiKey detected"
        export YUBIKEY_VERIFIED=false
    fi
else
    echo -e "${YELLOW}[GENESIS]${NC} ykman not installed. Skipping YubiKey verification."
fi
echo

# ── Set environment ───────────────────────────────────────────────────────────
export GENESIS_OWNER_ID="murray@bembrick.org"
export GENESIS_OWNER_NAME="Murray Bembrick"
export GENESIS_JURISDICTION="AU"
export GENESIS_OWNER_ROLE="ADMIN"
export GENESIS_ADMIN_EXCLUSIVE="true"
export GENESIS_YUBIKEY_SERIAL="31695265"
export GENESIS_YUBIKEY_MODE="otp"
export GENESIS_PDP_PORT="8080"

# Data directories on USB (portable)
export GENESIS_KEY_DIR="${GENESIS_ROOT}/bembrick-ultimate-edition/data/keys"
export GENESIS_AUDIT_DIR="${GENESIS_ROOT}/bembrick-ultimate-edition/data/audit"
export GENESIS_EVIDENCE_DIR="${GENESIS_ROOT}/bembrick-ultimate-edition/data/evidence"

# Create directories
mkdir -p "${GENESIS_KEY_DIR}" "${GENESIS_AUDIT_DIR}" "${GENESIS_EVIDENCE_DIR}"
chmod 700 "${GENESIS_KEY_DIR}"

echo -e "${GREEN}[GENESIS]${NC} ✓ Data directories configured"

# Generate JWT secret
export GENESIS_JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | xxd -p | tr -d '\n')

# ── Check Node.js ─────────────────────────────────────────────────────────────
echo -e "${YELLOW}[GENESIS]${NC} Checking for Node.js..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}[GENESIS]${NC} Node.js not found!"
    echo
    echo -e "${YELLOW}[GENESIS]${NC} Install Node.js:"
    echo "  macOS:  brew install node"
    echo "  Ubuntu: sudo apt install nodejs npm"
    echo "  Fedora: sudo dnf install nodejs"
    echo
    echo -e "${YELLOW}[GENESIS]${NC} Opening static dashboard..."

    # Try to open browser with static HTML
    if command -v xdg-open &> /dev/null; then
        xdg-open "${GENESIS_ROOT}/bembrick-ultimate-edition/static/index.html" 2>/dev/null || true
    elif command -v open &> /dev/null; then
        open "${GENESIS_ROOT}/bembrick-ultimate-edition/static/index.html" 2>/dev/null || true
    fi
    exit 1
fi

echo -e "${GREEN}[GENESIS]${NC} ✓ Node.js found: $(node --version)"
echo

# ── Start server ──────────────────────────────────────────────────────────────
cd "${GENESIS_ROOT}/bembrick-ultimate-edition"

# Install deps if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[GENESIS]${NC} Installing dependencies..."
    npm install --production
    echo
fi

echo -e "${YELLOW}[GENESIS]${NC} Starting GENESIS server..."
echo

# Start server in background
npm start &
SERVER_PID=$!
echo $SERVER_PID > /tmp/genesis-usb.pid

# Wait for server
sleep 3

# Open browser
echo -e "${GREEN}[GENESIS]${NC} Opening dashboard..."
if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:8080" 2>/dev/null || true
elif command -v open &> /dev/null; then
    open "http://localhost:8080" 2>/dev/null || true
fi

echo
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  GENESIS 2.0 — Running${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "  Dashboard:  ${CYAN}http://localhost:8080${NC}"
echo -e "  Owner:      ${GREEN}Murray Bembrick${NC}"
echo -e "  YubiKey:    ${GREEN}31695265${NC}"
echo -e "  PID:        ${YELLOW}${SERVER_PID}${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo
echo -e "Press ${YELLOW}Ctrl+C${NC} to stop the server..."

# Trap Ctrl+C
cleanup() {
    echo
    echo -e "${YELLOW}[GENESIS]${NC} Shutting down..."
    kill $SERVER_PID 2>/dev/null || true
    rm -f /tmp/genesis-usb.pid
    echo -e "${GREEN}[GENESIS]${NC} Goodbye."
    exit 0
}
trap cleanup INT TERM

# Wait for server
wait $SERVER_PID

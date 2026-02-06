#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# GENESIS 2.0 — Live Boot Initialization Script
# ═══════════════════════════════════════════════════════════════════════════
# Owner: CAPUT Admin (admin@caput.system)
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

# Banner
echo -e "${CYAN}"
cat << 'BANNER'
 ██████╗ ███████╗███╗   ██╗███████╗███████╗██╗███████╗
██╔════╝ ██╔════╝████╗  ██║██╔════╝██╔════╝██║██╔════╝
██║  ███╗█████╗  ██╔██╗ ██║█████╗  ███████╗██║███████╗
██║   ██║██╔══╝  ██║╚██╗██║██╔══╝  ╚════██║██║╚════██║
╚██████╔╝███████╗██║ ╚████║███████╗███████║██║███████║
 ╚═════╝ ╚══════╝╚═╝  ╚═══╝╚══════╝╚══════╝╚═╝╚══════╝
                    Version 2.0 — Live Boot
BANNER
echo -e "${NC}"

# Think Different Manifesto
echo -e "${YELLOW}"
cat << 'MANIFESTO'
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║  Here's to the crazy ones.                                                ║
║  The rebels. The troublemakers. The round pegs in the square holes.       ║
║  The ones who see things differently.                                     ║
║                                                                           ║
║  They invent. They imagine. They heal. They explore.                      ║
║  They create. They inspire. They push the human race forward.             ║
║                                                                           ║
║  We make tools for these kinds of people.                                 ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
MANIFESTO
echo -e "${NC}"
sleep 2

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Owner: CAPUT Admin (admin@caput.system)${NC}"
echo -e "${GREEN}  Mode: ${GENESIS_MODE:-live}${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo

# Determine boot device
BOOT_DEV=$(findmnt -n -o SOURCE /)
GENESIS_ROOT=$(dirname $(dirname $(readlink -f "$0")))

echo -e "${YELLOW}[GENESIS]${NC} Initializing from: ${GENESIS_ROOT}"

# ── Step 1: Verify YubiKey ────────────────────────────────────────────────────
echo -e "${YELLOW}[GENESIS]${NC} Checking for YubiKey 5C FIPS (31695265)..."

if command -v ykman &> /dev/null; then
    YUBIKEY_SERIAL=$(ykman info 2>/dev/null | grep "Serial" | awk '{print $2}')
    if [ "$YUBIKEY_SERIAL" == "31695265" ]; then
        echo -e "${GREEN}[GENESIS]${NC} ✓ YubiKey verified: 5C FIPS (31695265)"
    elif [ -n "$YUBIKEY_SERIAL" ]; then
        echo -e "${RED}[GENESIS]${NC} ✗ Wrong YubiKey detected: $YUBIKEY_SERIAL"
        echo -e "${RED}[GENESIS]${NC} Expected: 31695265"
        echo -e "${YELLOW}[GENESIS]${NC} Continuing in LIMITED mode..."
        export GENESIS_LIMITED_MODE=true
    else
        echo -e "${YELLOW}[GENESIS]${NC} No YubiKey detected. Insert YubiKey to unlock full features."
        export GENESIS_LIMITED_MODE=true
    fi
else
    echo -e "${YELLOW}[GENESIS]${NC} ykman not available. Skipping YubiKey verification."
fi

# ── Step 2: Create runtime directories ────────────────────────────────────────
echo -e "${YELLOW}[GENESIS]${NC} Creating runtime directories..."

mkdir -p /tmp/genesis/data/keys
mkdir -p /tmp/genesis/data/audit
mkdir -p /tmp/genesis/data/evidence
mkdir -p /tmp/genesis/logs

# Set secure permissions
chmod 700 /tmp/genesis/data/keys
chmod 750 /tmp/genesis/data

echo -e "${GREEN}[GENESIS]${NC} ✓ Runtime directories created"

# ── Step 3: Load configuration ────────────────────────────────────────────────
echo -e "${YELLOW}[GENESIS]${NC} Loading configuration..."

if [ -f "${GENESIS_ROOT}/genesis/genesis-boot.conf" ]; then
    source <(grep -E '^[a-z_]+=' "${GENESIS_ROOT}/genesis/genesis-boot.conf" 2>/dev/null || true)
    echo -e "${GREEN}[GENESIS]${NC} ✓ Configuration loaded"
else
    echo -e "${YELLOW}[GENESIS]${NC} Using default configuration"
fi

# ── Step 4: Setup environment ─────────────────────────────────────────────────
echo -e "${YELLOW}[GENESIS]${NC} Setting up environment..."

export GENESIS_OWNER_ID="admin@caput.system"
export GENESIS_OWNER_NAME="CAPUT Admin"
export GENESIS_JURISDICTION="AU"
export GENESIS_OWNER_ROLE="ADMIN"
export GENESIS_ADMIN_EXCLUSIVE="true"
export GENESIS_YUBIKEY_SERIAL="31695265"
export GENESIS_YUBIKEY_MODE="otp"
export GENESIS_KEY_DIR="/tmp/genesis/data/keys"
export GENESIS_AUDIT_DIR="/tmp/genesis/data/audit"
export GENESIS_EVIDENCE_DIR="/tmp/genesis/data/evidence"
export GENESIS_PDP_PORT="8080"

# Generate session JWT secret
export GENESIS_JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | xxd -p | tr -d '\n')

echo -e "${GREEN}[GENESIS]${NC} ✓ Environment configured"

# ── Step 5: Network setup (if not forensic mode) ──────────────────────────────
if [ "${GENESIS_MODE}" != "forensic" ]; then
    echo -e "${YELLOW}[GENESIS]${NC} Configuring network..."

    # Disable IPv6 for security
    if [ -w /proc/sys/net/ipv6/conf/all/disable_ipv6 ]; then
        echo 1 > /proc/sys/net/ipv6/conf/all/disable_ipv6 2>/dev/null || true
    fi

    # Enable firewall if available
    if command -v ufw &> /dev/null; then
        ufw default deny incoming 2>/dev/null || true
        ufw allow 8080/tcp 2>/dev/null || true
        ufw --force enable 2>/dev/null || true
        echo -e "${GREEN}[GENESIS]${NC} ✓ Firewall configured"
    fi
else
    echo -e "${YELLOW}[GENESIS]${NC} Forensic mode: Network disabled"
fi

# ── Step 6: Start GENESIS server ──────────────────────────────────────────────
echo -e "${YELLOW}[GENESIS]${NC} Starting GENESIS server..."

if [ -d "${GENESIS_ROOT}/caput-ultimate-edition" ]; then
    cd "${GENESIS_ROOT}/caput-ultimate-edition"

    if command -v node &> /dev/null; then
        # Check if dependencies exist
        if [ -d "node_modules" ]; then
            nohup npm start > /tmp/genesis/logs/server.log 2>&1 &
            GENESIS_PID=$!
            echo $GENESIS_PID > /tmp/genesis/genesis.pid
            echo -e "${GREEN}[GENESIS]${NC} ✓ Server started (PID: $GENESIS_PID)"
            echo -e "${GREEN}[GENESIS]${NC} ✓ Dashboard: http://localhost:8080"
        else
            echo -e "${YELLOW}[GENESIS]${NC} Installing dependencies..."
            npm install --production 2>/dev/null || true
            nohup npm start > /tmp/genesis/logs/server.log 2>&1 &
            GENESIS_PID=$!
            echo $GENESIS_PID > /tmp/genesis/genesis.pid
            echo -e "${GREEN}[GENESIS]${NC} ✓ Server started (PID: $GENESIS_PID)"
        fi
    else
        echo -e "${YELLOW}[GENESIS]${NC} Node.js not available. Server not started."
        echo -e "${YELLOW}[GENESIS]${NC} Static dashboard available at: ${GENESIS_ROOT}/caput-ultimate-edition/static/index.html"
    fi
fi

# ── Complete ──────────────────────────────────────────────────────────────────
echo
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  GENESIS 2.0 — Ready${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "  Dashboard:  ${CYAN}http://localhost:8080${NC}"
echo -e "  Owner:      ${GREEN}CAPUT Admin${NC}"
echo -e "  Mode:       ${YELLOW}${GENESIS_MODE:-live}${NC}"
echo -e "  YubiKey:    ${GREEN}31695265${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo

# Keep alive for live boot
if [ "${1}" == "--interactive" ]; then
    exec /bin/bash
fi

#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
#  GENESIS 2.0 — Quick Launch (Linux/macOS)
# ═══════════════════════════════════════════════════════════════════════════
#  Run:  chmod +x go.sh && ./go.sh
# ═══════════════════════════════════════════════════════════════════════════

set -e
cd "$(dirname "$0")"

echo ""
echo " ╔═══════════════════════════════════════╗"
echo " ║       G E N E S I S   2 . 0          ║"
echo " ║       Developer Pro — Starting        ║"
echo " ╚═══════════════════════════════════════╝"
echo ""

# Check Node
if ! command -v node &>/dev/null; then
  echo "[ERROR] Node.js not found. Install from https://nodejs.org/"
  exit 1
fi
echo "[1/4] Node $(node --version)"

# Install deps
if [ ! -d "node_modules" ]; then
  echo "[2/4] Installing dependencies..."
  npm install
else
  echo "[2/4] Dependencies installed"
fi

# Setup
echo "[3/4] Running first-time setup..."
node scripts/setup.js

# Load .env
if [ -f ".env" ]; then
  set -a
  source .env
  set +a
fi

# Start
echo "[4/4] Starting GENESIS server..."
echo ""
echo "  Dashboard:  http://localhost:${GENESIS_PDP_PORT:-8080}/"
echo "  Press Ctrl+C to stop"
echo ""

npx tsx src/server.ts

#!/bin/bash

# GENESIS 2.0 - Start All Services
# Usage: ./start.sh

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║               GENESIS 2.0 - STARTING                      ║"
echo "╚═══════════════════════════════════════════════════════════╝"

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if node_modules exist
check_deps() {
    local dir=$1
    if [ ! -d "$dir/node_modules" ]; then
        echo -e "${YELLOW}Installing dependencies for $dir...${NC}"
        cd $dir && npm install && cd ..
    fi
}

# Kill existing processes on ports
cleanup() {
    echo -e "${YELLOW}Cleaning up existing processes...${NC}"
    lsof -ti:8080 | xargs kill -9 2>/dev/null || true
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
}

cleanup

# Install dependencies
check_deps "genesis-api"
check_deps "auth-portal"
check_deps "dashboard"

# Start services
echo -e "${CYAN}Starting GENESIS API (port 8080)...${NC}"
cd genesis-api && npm run dev &
API_PID=$!

sleep 2

echo -e "${CYAN}Starting Auth Portal (port 3000)...${NC}"
cd ../auth-portal && npm run dev &
AUTH_PID=$!

sleep 2

echo -e "${CYAN}Starting Dashboard (port 3001)...${NC}"
cd ../dashboard && npm run dev &
DASH_PID=$!

cd ..

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║               GENESIS 2.0 - RUNNING                       ║${NC}"
echo -e "${GREEN}╠═══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  API:        http://localhost:8080                        ║${NC}"
echo -e "${GREEN}║  Auth:       http://localhost:3000                        ║${NC}"
echo -e "${GREEN}║  Dashboard:  http://localhost:3001                        ║${NC}"
echo -e "${GREEN}╠═══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Login: admin / genesis2024                               ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for any process to exit
wait

# Cleanup on exit
trap "kill $API_PID $AUTH_PID $DASH_PID 2>/dev/null" EXIT

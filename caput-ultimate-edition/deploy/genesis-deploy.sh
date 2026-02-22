#!/usr/bin/env bash
# deploy/genesis-deploy.sh
#
# GENESIS 2.0 Bootstrap Deployment Script
#
# Prepares a fresh Linux host for running GENESIS:
#   1. Creates directory structure and non-root user
#   2. Generates Ed25519 signing keys
#   3. Sets file permissions (600 keys, 755 dirs)
#   4. Optionally builds Docker image and starts services
#   5. Runs initial health check
#
# Usage:
#   chmod +x deploy/genesis-deploy.sh
#   sudo ./deploy/genesis-deploy.sh [--docker]
#
# Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0
set -euo pipefail

# ---------------------------------------------------------------------------
# Config (override via environment)
# ---------------------------------------------------------------------------
GENESIS_USER="${GENESIS_USER:-genesis}"
GENESIS_HOME="${GENESIS_HOME:-/opt/genesis}"
GENESIS_DATA="${GENESIS_DATA:-${GENESIS_HOME}/data}"
GENESIS_KEY_DIR="${GENESIS_KEY_DIR:-${GENESIS_DATA}/keys}"
GENESIS_AUDIT_DIR="${GENESIS_AUDIT_DIR:-${GENESIS_DATA}/audit}"
GENESIS_EVIDENCE_DIR="${GENESIS_EVIDENCE_DIR:-${GENESIS_DATA}/evidence}"
GENESIS_OUTPUT_DIR="${GENESIS_OUTPUT_DIR:-${GENESIS_DATA}/output}"
GENESIS_PORT="${GENESIS_PDP_PORT:-8080}"
USE_DOCKER=false

for arg in "$@"; do
  case "$arg" in
    --docker) USE_DOCKER=true ;;
    --help|-h)
      echo "Usage: sudo $0 [--docker]"
      echo ""
      echo "Options:"
      echo "  --docker   Build and run via Docker Compose"
      echo ""
      echo "Environment variables:"
      echo "  GENESIS_USER         Service user (default: genesis)"
      echo "  GENESIS_HOME         Install directory (default: /opt/genesis)"
      echo "  GENESIS_JWT_SECRET   JWT signing secret (REQUIRED for production)"
      echo "  GENESIS_PDP_PORT     HTTP port (default: 8080)"
      exit 0
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log()  { echo "[GENESIS] $(date +%T) $*"; }
fail() { echo "[GENESIS] FATAL: $*" >&2; exit 1; }

check_root() {
  if [[ $EUID -ne 0 ]]; then
    fail "This script must be run as root (use sudo)"
  fi
}

# ---------------------------------------------------------------------------
# Step 1: Create user and directories
# ---------------------------------------------------------------------------
create_user_and_dirs() {
  log "Creating service user: ${GENESIS_USER}"
  if ! id "${GENESIS_USER}" &>/dev/null; then
    useradd --system --shell /usr/sbin/nologin --home-dir "${GENESIS_HOME}" "${GENESIS_USER}"
  fi

  log "Creating directory structure"
  mkdir -p "${GENESIS_HOME}"
  mkdir -p "${GENESIS_DATA}"
  mkdir -p "${GENESIS_KEY_DIR}"
  mkdir -p "${GENESIS_AUDIT_DIR}"
  mkdir -p "${GENESIS_EVIDENCE_DIR}"
  mkdir -p "${GENESIS_OUTPUT_DIR}"
  mkdir -p "${GENESIS_OUTPUT_DIR}/legal"
  mkdir -p "${GENESIS_OUTPUT_DIR}/certs"

  chown -R "${GENESIS_USER}:${GENESIS_USER}" "${GENESIS_HOME}"
  chmod 750 "${GENESIS_HOME}"
  chmod 700 "${GENESIS_KEY_DIR}"
  chmod 750 "${GENESIS_DATA}"
}

# ---------------------------------------------------------------------------
# Step 2: Generate Ed25519 keys (if not present)
# ---------------------------------------------------------------------------
generate_keys() {
  local priv="${GENESIS_KEY_DIR}/genesis.key"
  local pub="${GENESIS_KEY_DIR}/genesis.pub"

  if [[ -f "$priv" && -f "$pub" ]]; then
    log "Ed25519 keys already exist — skipping generation"
    return
  fi

  log "Generating Ed25519 signing keypair"
  if command -v openssl &>/dev/null; then
    openssl genpkey -algorithm ed25519 -out "$priv" 2>/dev/null
    openssl pkey -in "$priv" -pubout -out "$pub" 2>/dev/null
  else
    # Fallback: use Node.js to generate
    node -e "
      const crypto = require('crypto');
      const fs = require('fs');
      const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
      fs.writeFileSync('${priv}', privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
      fs.writeFileSync('${pub}', publicKey.export({ type: 'spki', format: 'pem' }), { mode: 0o644 });
    "
  fi

  chmod 600 "$priv"
  chmod 644 "$pub"
  chown "${GENESIS_USER}:${GENESIS_USER}" "$priv" "$pub"

  log "Keys generated:"
  log "  Private: ${priv}"
  log "  Public:  ${pub}"
}

# ---------------------------------------------------------------------------
# Step 3: Set permissions
# ---------------------------------------------------------------------------
set_permissions() {
  log "Setting file permissions"
  find "${GENESIS_HOME}" -type d -exec chmod 750 {} \;
  find "${GENESIS_HOME}" -type f -name "*.key" -exec chmod 600 {} \;
  find "${GENESIS_HOME}" -type f -name "*.pub" -exec chmod 644 {} \;
  chmod 700 "${GENESIS_KEY_DIR}"
  chown -R "${GENESIS_USER}:${GENESIS_USER}" "${GENESIS_DATA}"
}

# ---------------------------------------------------------------------------
# Step 4: Docker build + start (optional)
# ---------------------------------------------------------------------------
docker_deploy() {
  if [[ "$USE_DOCKER" != "true" ]]; then
    log "Skipping Docker (use --docker to enable)"
    return
  fi

  if ! command -v docker &>/dev/null; then
    fail "Docker not found. Install Docker first."
  fi

  if ! command -v docker-compose &>/dev/null && ! docker compose version &>/dev/null 2>&1; then
    fail "Docker Compose not found."
  fi

  local compose_file="${GENESIS_HOME}/docker-compose.yml"
  if [[ ! -f "$compose_file" ]]; then
    # Copy from source if running from repo
    local script_dir
    script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
    if [[ -f "${script_dir}/docker-compose.yml" ]]; then
      cp -r "${script_dir}/." "${GENESIS_HOME}/"
      chown -R "${GENESIS_USER}:${GENESIS_USER}" "${GENESIS_HOME}"
    else
      fail "docker-compose.yml not found at ${compose_file}"
    fi
  fi

  log "Building Docker image"
  cd "${GENESIS_HOME}"
  docker compose build

  log "Starting GENESIS services"
  docker compose up -d

  log "Waiting for health check..."
  sleep 3
  if curl -sf "http://localhost:${GENESIS_PORT}/health" > /dev/null 2>&1; then
    log "Health check PASSED"
  else
    log "WARNING: Health check did not respond yet (service may still be starting)"
  fi
}

# ---------------------------------------------------------------------------
# Step 5: Standalone health check (non-Docker)
# ---------------------------------------------------------------------------
standalone_check() {
  if [[ "$USE_DOCKER" == "true" ]]; then
    return
  fi

  log "Verifying installation"
  echo ""
  echo "  User:       ${GENESIS_USER}"
  echo "  Home:       ${GENESIS_HOME}"
  echo "  Data:       ${GENESIS_DATA}"
  echo "  Keys:       ${GENESIS_KEY_DIR}"
  echo "  Audit:      ${GENESIS_AUDIT_DIR}"
  echo "  Evidence:   ${GENESIS_EVIDENCE_DIR}"
  echo "  Output:     ${GENESIS_OUTPUT_DIR}"
  echo ""

  # Verify key files exist
  if [[ -f "${GENESIS_KEY_DIR}/genesis.key" ]]; then
    local key_perms
    key_perms=$(stat -c '%a' "${GENESIS_KEY_DIR}/genesis.key" 2>/dev/null || stat -f '%A' "${GENESIS_KEY_DIR}/genesis.key" 2>/dev/null)
    if [[ "$key_perms" == "600" ]]; then
      log "Key permissions OK (600)"
    else
      log "WARNING: Key permissions are ${key_perms}, should be 600"
    fi
  fi

  log ""
  log "To start GENESIS manually:"
  log "  cd ${GENESIS_HOME}"
  log "  sudo -u ${GENESIS_USER} GENESIS_KEY_DIR=${GENESIS_KEY_DIR} \\"
  log "    GENESIS_AUDIT_DIR=${GENESIS_AUDIT_DIR} \\"
  log "    GENESIS_EVIDENCE_DIR=${GENESIS_EVIDENCE_DIR} \\"
  log "    GENESIS_JWT_SECRET=<your-secret> \\"
  log "    node dist/server.js"
  log ""
  log "Or with Docker:"
  log "  sudo $0 --docker"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  log "========================================="
  log "GENESIS 2.0 — Bootstrap Deployment"
  log "========================================="

  check_root
  create_user_and_dirs
  generate_keys
  set_permissions
  docker_deploy
  standalone_check

  log "========================================="
  log "Deployment complete."
  log "========================================="
}

main

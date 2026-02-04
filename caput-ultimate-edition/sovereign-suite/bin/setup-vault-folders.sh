#!/usr/bin/env bash
# sovereign-suite/bin/setup-vault-folders.sh
#
# Vault Folder Structure Initialiser — creates the complete folder
# hierarchy in iCloud Drive for the document automation subsystem.
#
# Usage:
#   VAULT_ROOT="$HOME/Library/Mobile Documents/com~apple~CloudDocs/Shortcuts/Vault" \
#     ./setup-vault-folders.sh
#
# Or override with env:
#   VAULT_ROOT="/path/to/vault" ./setup-vault-folders.sh
#
# Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

set -euo pipefail

VAULT="${VAULT_ROOT:-${HOME}/Library/Mobile Documents/com~apple~CloudDocs/Shortcuts/Vault}"

echo "=== Sovereign Suite — Vault Folder Setup ==="
echo "  Root: ${VAULT}"
echo

# ── Top-level folders ───────────────────────────────────────────────────
TOPLEVEL=(
  "Finance/Bank-Statements"
  "Finance/Invoices"
  "Finance/Superannuation"
  "Finance/Tax-Returns"
  "ATO/Notices"
  "ATO/BAS"
  "ATO/IAS"
  "Legal/General"
  "Legal/Correspondence"
  "Health/Referrals"
  "Health/Results"
  "Health/Claims"
  "Trust/Deeds"
  "Trust/Distributions"
  "Trust/Minutes"
  "Business/Primary"
  "Business/Contracts"
  "Business/ASIC"
  "Intake/From-iPhone"
  "Intake/From-Desktop"
  "Intake/Unsorted"
  "Logs"
)

# ── Legal case sub-folders (parameterised) ──────────────────────────────
CASE_FOLDER="${GENESIS_CASE_FOLDER:-Family-Case}"
CASE_SUBS=(
  "Affidavits"
  "Court-Orders"
  "Financial-Statements"
  "Correspondence"
  "Subpoenas"
  "Evidence"
)

# ── Create folders ──────────────────────────────────────────────────────
created=0

for folder in "${TOPLEVEL[@]}"; do
  target="${VAULT}/${folder}"
  if [[ ! -d "${target}" ]]; then
    mkdir -p "${target}"
    echo "  [+] ${folder}"
    ((created++))
  else
    echo "  [=] ${folder} (exists)"
  fi
done

for sub in "${CASE_SUBS[@]}"; do
  target="${VAULT}/Legal/${CASE_FOLDER}/${sub}"
  if [[ ! -d "${target}" ]]; then
    mkdir -p "${target}"
    echo "  [+] Legal/${CASE_FOLDER}/${sub}"
    ((created++))
  else
    echo "  [=] Legal/${CASE_FOLDER}/${sub} (exists)"
  fi
done

# ── Config directory ────────────────────────────────────────────────────
CONFIG_DIR="${HOME}/Library/Mobile Documents/com~apple~CloudDocs/Shortcuts/Config"
if [[ ! -d "${CONFIG_DIR}" ]]; then
  mkdir -p "${CONFIG_DIR}"
  echo "  [+] Shortcuts/Config"
  ((created++))
fi

echo
echo "=== Done. ${created} folders created. ==="

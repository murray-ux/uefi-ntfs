#!/usr/bin/env bash
# sovereign-suite/bin/booster.sh
#
# AI Classification Booster — invoked via SSH from iOS Shortcuts when
# local keyword matching fails. Sends truncated document text to the
# Anthropic API for classification.
#
# Usage:
#   echo "<document text>" | ./booster.sh
#   ./booster.sh < /path/to/extracted-text.txt
#
# Requires:
#   ANTHROPIC_API_KEY — set in environment or ~/.genesis/env
#
# Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────────
MAX_CHARS=4000
MODEL="claude-sonnet-4-20250514"
API_URL="https://api.anthropic.com/v1/messages"

# Load env if available
if [[ -f "${HOME}/.genesis/env" ]]; then
  # shellcheck source=/dev/null
  source "${HOME}/.genesis/env"
fi

if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
  echo '{"error": "ANTHROPIC_API_KEY not set"}' >&2
  exit 1
fi

# ── Read stdin, truncate ────────────────────────────────────────────────
INPUT=$(cat)
TRUNCATED="${INPUT:0:${MAX_CHARS}}"

# Escape for JSON
ESCAPED=$(printf '%s' "${TRUNCATED}" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')

# ── Categories ──────────────────────────────────────────────────────────
CATEGORIES="finance.invoice, finance.bank, finance.superannuation, legal.family, legal.general, ato.notice, ato.bas, ato.ias, health.referral, health.results, health.claims, trust.deed, trust.distribution, business.general"

# ── API call ────────────────────────────────────────────────────────────
PAYLOAD=$(cat <<ENDJSON
{
  "model": "${MODEL}",
  "max_tokens": 256,
  "messages": [
    {
      "role": "user",
      "content": "Classify this document into exactly one category. Valid categories: ${CATEGORIES}. Respond with ONLY a JSON object: {\"category\": \"...\", \"confidence\": 0.0-1.0, \"reason\": \"brief reason\"}.\n\nDocument text:\n${ESCAPED}"
    }
  ]
}
ENDJSON
)

RESPONSE=$(curl -sS "${API_URL}" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${ANTHROPIC_API_KEY}" \
  -H "anthropic-version: 2023-06-01" \
  -d "${PAYLOAD}")

# ── Extract classification from response ────────────────────────────────
# The model returns JSON inside content[0].text
CLASSIFICATION=$(echo "${RESPONSE}" | python3 -c '
import json, sys
try:
    resp = json.load(sys.stdin)
    text = resp["content"][0]["text"]
    # Parse the JSON from the model response
    result = json.loads(text)
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({"category": "unknown", "confidence": 0.0, "reason": str(e)}))
')

echo "${CLASSIFICATION}"

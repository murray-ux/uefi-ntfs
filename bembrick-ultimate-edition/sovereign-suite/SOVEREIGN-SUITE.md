# Sovereign Suite — Document Automation Subsystem

Sovereign extension to the GENESIS Enterprise Infrastructure Framework.

## Architecture

```
Intake (Mobile) → Classifier (Keywords) → Router (Rules + AI) → VAULT (iCloud Drive)
```

## Pipeline

| # | Shortcut | Description |
|---|----------|-------------|
| 1 | Finish the Job | Master orchestrator — runs intake, classify, pack |
| 2 | Intake - Collect | Gather + date-stamp + stage files |
| 3 | Classifier - Route (Pro) | OCR → Rules → Keywords → AI Booster → Route |
| 4 | Binder - Legal Pack | Assemble legal case binder with TOC |
| 5 | Finance Pack | Bank statements + invoices (90 days) |
| 6 | ATO Pack | Notices + BAS + IAS |
| 7 | Trust Pack | Deeds + distributions |
| 8 | Health Pack | Referrals + results + claims |

## Classification Priority

1. **Explicit rules** (`routes.json`) — pattern match, highest priority
2. **Keyword matching** (`keywords.json`) — OCR text against category keywords
3. **AI Booster** (`booster.sh`) — Anthropic API fallback (max 4000 chars sent)
4. **Unsorted** — `Intake/Unsorted` if all else fails

## Config Files

| File | Location | Purpose |
|------|----------|---------|
| `config/keywords.json` | Category-keyword mappings | Local OCR classification |
| `config/routes.json` | Rule-based routing | Pattern → folder mapping |
| `bin/booster.sh` | AI classification | Anthropic API fallback |
| `bin/setup-vault-folders.sh` | Vault init | Create folder hierarchy |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VAULT_ROOT` | No | Override vault folder path |
| `GENESIS_CASE_NUMBER` | No | Court case number for rule matching |
| `GENESIS_CASE_FOLDER` | No | Legal case folder name (default: Family-Case) |
| `GENESIS_BUSINESS_NAME` | No | Business name for rule matching |
| `GENESIS_TRUST_NAME` | No | Trust name for rule matching |
| `ANTHROPIC_API_KEY` | For AI | AI booster classification |

## Security

- All processing is local or within iCloud Drive
- Only truncated text (max 4000 chars) sent to Anthropic API
- Every classification logged to `Vault/Logs/Classifier-YYYY-MM-DD.log`
- Legal case documents preserve original filenames
- No personal identifiers in code — all parameterised via env vars

## Deployment

```bash
# 1. Create vault folders
./sovereign-suite/bin/setup-vault-folders.sh

# 2. Run full pipeline
npx ts-node sovereign-suite/shortcuts/sovereign-orchestrator.ts run /path/to/source
```

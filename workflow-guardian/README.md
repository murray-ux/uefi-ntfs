# Workflow Guardian

**Self-Adaptive CI/CD Security Engine**

A MAPE-K powered workflow risk scanner that combines insights from academic research on workflow completion (GH-WCOM) and self-adaptive systems (SEAByTE) into a practical, deterministic security enforcement tool.

## Key Features

- **Risk Token Extraction**: Inverts the GH-WCOM abstraction process to detect security-sensitive patterns (URLs, paths, versions, action refs)
- **MAPE-K Feedback Loop**: Monitor → Analyze → Plan → Execute cycle for adaptive enforcement
- **Confidence-Gated Decisions**: Statistical thresholds prevent false positives (inspired by SEAByTE)
- **Zero Dependencies at Runtime**: Pure TypeScript, no heavy ML models required

## Quick Start

```bash
# Install
npm install workflow-guardian

# Scan workflows
npx workflow-guardian scan .github/workflows/

# Scan with JSON output
npx workflow-guardian scan ci.yml --json

# Strict mode (fail on warnings)
npx workflow-guardian scan . --strict
```

## GitHub Action

```yaml
- name: Scan Workflows
  uses: ./workflow-guardian
  with:
    path: .github/workflows
    confidence-threshold: '0.75'
    block-threshold: '80'
    strict: 'false'
```

## Risk Detection Rules

| Pattern | Risk Level | Description |
|---------|------------|-------------|
| `curl \| bash` | CRITICAL | Remote code execution |
| `@main` / `@master` | CRITICAL | Unpinned action ref |
| `pull_request_target` | CRITICAL | Secrets exposure to PRs |
| `@v2` (floating) | HIGH | Version not pinned |
| `sudo` usage | HIGH | Elevated privileges |
| `permissions: write-all` | HIGH | Overly permissive |
| `http://` URLs | MEDIUM | Insecure transport |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MAPE-K Feedback Loop                     │
├──────────┬──────────┬──────────┬──────────┬────────────────┤
│ MONITOR  │ ANALYZE  │   PLAN   │ EXECUTE  │   KNOWLEDGE    │
├──────────┼──────────┼──────────┼──────────┼────────────────┤
│ Parse    │ Score    │ Decide   │ Enforce  │ Risk rules     │
│ workflow │ patterns │ verdict  │ action   │ History        │
│ Extract  │ Compute  │ Apply    │ Report   │ Thresholds     │
│ tokens   │ confid.  │ rules    │ results  │ Statistics     │
└──────────┴──────────┴──────────┴──────────┴────────────────┘
```

## Confidence Thresholds

From SEAByTE research: confidence correlates with prediction accuracy.

- **≥ 0.90**: 89% accuracy → Auto-enforce
- **0.75-0.90**: High confidence → Enforce with logging
- **< 0.75**: Low confidence → Require manual review

## Comparison

| Approach | Accuracy | Speed | Practical |
|----------|----------|-------|-----------|
| GH-WCOM (T5) | ~34% | Slow | No |
| Copilot/ChatGPT | Variable | Medium | Partial |
| **Workflow Guardian** | Deterministic | Fast | Yes |

## Environment Variables

```bash
GUARDIAN_CONFIDENCE=0.75      # Confidence threshold
GUARDIAN_BLOCK_THRESHOLD=80   # Risk score to block
GUARDIAN_WARN_THRESHOLD=30    # Risk score to warn
```

## Dashboard

Open `dashboard/index.html` in a browser. Drop workflow files to scan them instantly.

## Exit Codes

- `0`: All workflows passed
- `1`: Warnings detected (with `--strict`)
- `2`: Critical issues detected (blocked)

## License

MIT

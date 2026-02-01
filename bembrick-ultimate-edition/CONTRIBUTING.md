# Contributing to GENESIS 2.0

## Getting Started

```bash
git clone <repo-url>
cd bembrick-ultimate-edition
npm install
cp .env.example .env
# Edit .env with your GENESIS_JWT_SECRET
```

## Development

```bash
# Run server with hot reload
npx tsx watch src/server.ts

# Run tests
npm test

# Type check
npx tsc --noEmit
```

## Architecture Rules

1. **Wheel governs everything.** Every operation goes through the Wheel state machine. No shortcuts.
2. **Fail-closed.** Default is DENY. Unknown state = compromise state.
3. **Layers reach down, never up.** Pentagon L4 can call L3/L2/L1/L0. L0 calls nothing.
4. **No PII in code.** Use environment variables for all personal identifiers.
5. **No secrets in code.** Keys, tokens, and credentials come from environment or generated at runtime.
6. **AI outputs are drafts.** Always flagged as requiring human review.
7. **Zero external HTTP deps.** Use Node 20 built-in `http` and `fetch`.

## Commit Messages

Use imperative mood. Be specific about what changed and why.

```
Add circuit breaker to FleetDM client for network resilience
Fix Wheel timeout enforcement when deadline is exactly zero
Update Sovereign Suite keyword map with new ATO document types
```

## Testing

Tests live in `test/`. Run with:

```bash
npm test                          # all tests
node --import tsx --test test/wheel.test.ts   # single file
```

Every Pentagon room should be queryable via `pentagon.command("roomName")`.

## Pull Requests

- Branch from `main`
- One feature or fix per PR
- Include test coverage for new functionality
- Ensure `npx tsc --noEmit` passes
- Ensure `npm test` passes

## Security

If you find a security vulnerability, do not open a public issue. Contact the maintainers directly.

## License

By contributing, you agree that your contributions will be licensed under Apache 2.0.

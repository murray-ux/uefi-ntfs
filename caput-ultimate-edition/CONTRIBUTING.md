# Contributing to GENESIS 2.0

## Getting Started

```bash
git clone <repo-url>
cd caput-ultimate-edition
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
npm test                          # TypeScript tests
npm run test:modules              # GENESIS 2.0 control system tests
npm run test:all                  # Everything
node --import tsx --test test/wheel.test.ts   # single TS file
node --test test/genesis-modules.test.js      # single JS file
```

Every Pentagon room should be queryable via `pentagon.command("roomName")`.

## GENESIS 2.0 Module Development

### Biblical Naming Convention

All control system modules use Hebrew/biblical names that reflect their purpose.
New modules **must** follow this convention.

| Name | Meaning | Purpose Pattern |
|------|---------|-----------------|
| MERKAVA | Chariot | Command & orchestration |
| TZOFEH | Watchman | Monitoring & alerting |
| MALAKH | Messenger | Communication & routing |
| KISSEH | Throne | UI & control panel |
| KERUV | Cherub | Security & guarding |
| EBEN | Stone | Storage & evidence |
| RUACH | Spirit | AI & neural processing |
| OHR | Light | Observability & metrics |
| HADAAT | Knowledge | Decision intelligence |
| NEPHESH | Soul | Lifecycle & hooks |

### Module Structure

Every module must export a class with at minimum:

```js
export class MyModule {
  constructor(config = {}) { /* ... */ }
  async initialize()       { /* return this */ }
  getStatus()              { /* return { status, health, uptime, ... } */ }
  getHealth()              { /* return { healthy: bool, checks: [...] } */ }
}
```

### Registration with MERKAVA

Modules register via `ModuleConnector`:

```js
import { ModuleConnector } from './merkava-command.js';

const connector = new ModuleConnector('myModule', myInstance, {
  capabilities: ['query', 'command'],
  priority: 5,
});
merkava.registerModule(connector);
```

### Message Bus (MALAKH)

Modules communicate via the MALAKH pub/sub bus:

```js
// Subscribe
malakh.subscribe('security.*', (message) => {
  console.log('Security event:', message.payload);
});

// Publish
malakh.publish('security.alert', {
  severity: 'high',
  module: 'keruv',
  detail: 'Unauthorized access attempt',
});
```

### Bootstrap Integration

To add a module to the boot sequence, update `genesis-init.js`:

1. Add the module path to the appropriate boot phase
2. Register it with MERKAVA in the wiring phase
3. Subscribe to relevant MALAKH topics

### File Naming

- Module files: `<hebrew-name>-<english-role>.js` (e.g., `keruv-security.js`)
- All modules live in `src/lib/`
- UI modules live in `src/ui/static/js/`
- Tests go in `test/genesis-modules.test.js` (append to existing suite)

### Apache 2.0 Header

Every new source file must include the SPDX header:

```js
// SPDX-License-Identifier: Apache-2.0
// Copyright 2025 Murray Bembrick — Founder & Lead Developer
// See LICENSE and NOTICE for terms.
```

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

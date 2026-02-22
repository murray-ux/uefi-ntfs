# Developer Hub

Developer documentation for Auth Portal.

## Contents

- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Extending](#extending)
- [Writing Maintenance Scripts](#writing-maintenance-scripts)
- [Contributing](#contributing)
- [Testing](#testing)

---

## Architecture

### Directory Structure

```
auth-portal/
├── public/                 # Static frontend
│   └── index.html          # Single-page application
├── src/
│   ├── auth.ts             # Core authentication logic
│   ├── types.ts            # TypeScript definitions
│   └── db/
│       └── schema.sql      # Database schema
├── maintenance/
│   ├── run.ts              # Script runner
│   └── scripts/            # Maintenance scripts
├── docs/                   # Documentation
├── dist/                   # Compiled output
├── package.json
└── tsconfig.json
```

### Core Components

| Component | File | Responsibility |
|-----------|------|----------------|
| Auth Engine | `src/auth.ts` | Login, password reset, sessions |
| Types | `src/types.ts` | TypeScript interfaces |
| Schema | `src/db/schema.sql` | Database structure |
| Runner | `maintenance/run.ts` | Script execution |
| Frontend | `public/index.html` | User interface |

### Data Flow

```
User Request
    ↓
Frontend (SPA)
    ↓
Auth Engine
    ↓
Database
    ↓
Response
```

---

## API Reference

### Authentication

#### `createAccount(username, password, email?)`

Create a new user account.

```typescript
const result = await createAccount('newuser', 'password123', 'user@example.com');
// Returns: AuthResult
```

#### `login(username, password)`

Authenticate a user.

```typescript
const result = await login('username', 'password');
if (result.success) {
  console.log('Token:', result.token);
}
```

#### `logout(token)`

Invalidate a session.

```typescript
logout(sessionToken);
```

### Password Reset

#### `requestPasswordReset(username?, email?)`

Request a password reset. Always returns success for privacy.

```typescript
const result = await requestPasswordReset('username', 'user@example.com');
// Always returns success to prevent account enumeration
```

#### `completePasswordReset(token, newPassword)`

Complete password reset with token.

```typescript
const result = await completePasswordReset(resetToken, 'newPassword123');
```

### Sessions

#### `validateSession(token)`

Validate a session token.

```typescript
const user = validateSession(token);
if (user) {
  console.log('Logged in as:', user.username);
}
```

### Preferences

#### `updatePreferences(userId, preferences)`

Update user preferences.

```typescript
updatePreferences(userId, {
  theme: 'dark',
  language: 'es',
  enhancedPasswordReset: true,
});
```

---

## Types

### User

```typescript
interface User {
  id: string;
  username: string;
  email?: string;
  emailConfirmed: boolean;
  createdAt: Date;
  preferences: UserPreferences;
}
```

### UserPreferences

```typescript
interface UserPreferences {
  language: string;
  theme: 'light' | 'dark' | 'auto';
  textSize: 'standard' | 'medium' | 'large';
  expandSections: boolean;
  enhancedPasswordReset: boolean;
  emailNotifications: boolean;
}
```

### AuthResult

```typescript
interface AuthResult {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
  requiresEmailConfirmation?: boolean;
}
```

---

## Extending

### Adding New Preferences

1. Update `UserPreferences` interface in `types.ts`
2. Add to `DEFAULT_PREFERENCES`
3. Add UI controls in `index.html`
4. Handle in settings JavaScript

```typescript
// types.ts
interface UserPreferences {
  // ... existing
  myNewPreference: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  // ... existing
  myNewPreference: false,
};
```

### Adding New Languages

1. Add to `SUPPORTED_LANGUAGES` in `types.ts`
2. Create translation file (optional)
3. Update frontend language selector

```typescript
// types.ts
export const SUPPORTED_LANGUAGES: Language[] = [
  // ... existing
  { code: 'fi', name: 'Finnish', nativeName: 'suomi' },
];
```

### Custom Authentication Providers

Implement the auth interface:

```typescript
interface AuthProvider {
  authenticate(username: string, password: string): Promise<AuthResult>;
  createAccount(username: string, password: string, email?: string): Promise<AuthResult>;
  resetPassword(token: string, newPassword: string): Promise<AuthResult>;
}
```

---

## Writing Maintenance Scripts

### Basic Script Structure

```typescript
#!/usr/bin/env npx ts-node
/**
 * myScript.ts - Description of what this script does
 *
 * Usage:
 *   maintenance/run myScript [options]
 */

interface MyOptions {
  help: boolean;
  // ... your options
}

function parseArgs(): MyOptions {
  const args = process.argv.slice(2);
  // ... parse arguments
  return options;
}

function printHelp() {
  console.log(`
myScript - Description

USAGE:
  maintenance/run myScript [options]

OPTIONS:
  --help, -h    Show this help
  // ... your options
`);
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  // Your script logic here
}

main();

// MediaWiki 1.40+ pattern: return class name
export default 'MyScript';
```

### Registering Your Script

Add to `maintenance/run.ts`:

```typescript
const SCRIPTS: ScriptInfo[] = [
  // ... existing scripts
  {
    name: 'myScript',
    path: './scripts/myScript.ts',
    description: 'Description of my script',
  },
];
```

---

## Contributing

### Code Style

- TypeScript strict mode
- 2-space indentation
- Single quotes for strings
- Trailing commas
- No semicolons (optional)

### Pull Request Process

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Make changes
4. Run tests: `npm test`
5. Commit with clear message
6. Push and create PR

### Commit Messages

Follow conventional commits:

```
feat: Add new authentication provider
fix: Correct password reset email template
docs: Update API reference
refactor: Simplify session management
test: Add unit tests for EPR
```

---

## Testing

### Running Tests

```bash
# Build first
npm run build

# Run all tests
npm test

# Run specific test
npm test -- --filter="auth"
```

### Test Structure

```
tests/
├── auth.test.ts        # Authentication tests
├── session.test.ts     # Session management tests
├── password.test.ts    # Password hashing tests
└── maintenance.test.ts # Maintenance script tests
```

### Writing Tests

```typescript
import { test } from 'node:test';
import assert from 'node:assert';
import { hashPassword, verifyPassword } from '../src/auth';

test('password hashing', async (t) => {
  await t.test('creates valid hash', () => {
    const hash = hashPassword('password123');
    assert.match(hash, /^:B:[a-f0-9]+:[a-f0-9]+$/);
  });

  await t.test('verifies correct password', () => {
    const hash = hashPassword('password123');
    assert.ok(verifyPassword('password123', hash));
  });

  await t.test('rejects incorrect password', () => {
    const hash = hashPassword('password123');
    assert.ok(!verifyPassword('wrongpassword', hash));
  });
});
```

---

## See Also

- [Sysadmin Hub](sysadmin-hub.md) - Installation and configuration
- [User Hub](user-hub.md) - End user documentation
- [Translator Hub](translator-hub.md) - Translation workflow

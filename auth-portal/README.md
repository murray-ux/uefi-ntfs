# Auth Portal

**Wikimedia-style Authentication System**

A complete authentication portal mirroring MediaWiki/Wikimedia Commons patterns, including Enhanced Password Reset (EPR), multi-language support, and accessibility features.

## Features

### User-Facing
- **Login** - Username/password authentication
- **Create Account** - Registration with optional email
- **Password Reset** - Email-based recovery with privacy protection
- **Enhanced Password Reset (EPR)** - Require BOTH username AND email to prevent spam
- **Email Confirmation** - Verify email address ownership
- **Multi-Language** - 14+ language selector
- **Theme Toggle** - Light/Dark/Auto modes
- **Text Size** - Standard/Medium/Large accessibility options
- **Collapsible Sections** - Optional expand-all setting

### Admin Tools
- **changePassword.ts** - CLI for password management
- **User Locking** - Disable accounts with reason
- **Audit Logging** - Track security-sensitive actions

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

## Architecture

```
auth-portal/
├── public/
│   └── index.html      # Single-page application
├── src/
│   ├── types.ts        # TypeScript definitions
│   ├── auth.ts         # Core authentication logic
│   ├── cli/
│   │   └── changePassword.ts  # Admin password tool
│   └── db/
│       └── schema.sql  # Database schema
├── package.json
├── tsconfig.json
└── README.md
```

## Database Schema

Based on MediaWiki's `user` table structure:

| Table | Purpose |
|-------|---------|
| `user` | User accounts with preferences |
| `password_reset` | Reset tokens with expiry |
| `session` | Active login sessions |
| `rate_limit` | Request throttling |
| `audit_log` | Security event tracking |

### Password Format

MediaWiki-compatible salted hash:
```
:B:salt:hash
```

Where `hash = MD5(salt + '-' + MD5(password))`

### SQL Examples

```sql
-- Set password (MySQL)
UPDATE user SET user_password = CONCAT(':B:1234:', MD5(CONCAT('1234-', MD5('newpassword'))))
WHERE user_name = 'username';

-- Find users by email
SELECT user_name FROM user WHERE user_email = 'user@example.com';

-- Lock account
UPDATE user SET user_locked = TRUE, user_locked_reason = 'Reason'
WHERE user_name = 'username';
```

## Admin CLI

```bash
# Set password
npm run cli:password -- --user=example --password=newpassword

# List users by email
npm run cli:password -- --email=user@example.com --list

# Lock account
npm run cli:password -- --user=badactor --lock --reason="Policy violation"

# Unlock account
npm run cli:password -- --user=example --unlock
```

## Enhanced Password Reset (EPR)

EPR requires BOTH username AND email to trigger a password reset:

| User Provides | EPR Disabled | EPR Enabled |
|---------------|--------------|-------------|
| Username only | ✅ Sends email | ❌ Silent fail |
| Email only | ✅ Sends email | ❌ Silent fail |
| Both matching | ✅ Sends email | ✅ Sends email |

**Privacy**: The system always reports success to prevent account enumeration.

## Settings

### Display
- **Text Size**: Standard, Medium, Large
- **Theme**: Light, Dark, Automatic
- **Expand Sections**: Always show collapsible content

### Email
- **Email Address**: For password recovery
- **Notifications**: Account activity alerts

### Security
- **EPR**: Enhanced Password Reset toggle
- **Password Change**: Link to reset flow

## Accessibility

- Semantic HTML structure
- ARIA attributes where needed
- Keyboard navigation support
- Screen reader friendly
- High contrast support via dark mode
- Configurable text sizing

## Languages

| Code | Language |
|------|----------|
| en | English |
| es | español |
| fr | français |
| de | Deutsch |
| zh | 中文 |
| ja | 日本語 |
| pt | português |
| ru | русский |
| ar | العربية |
| it | italiano |
| ko | 한국어 |
| vi | Tiếng Việt |
| tr | Türkçe |
| id | Bahasa Indonesia |

## Security Considerations

1. **Privacy-First Reset** - Never reveal if accounts exist
2. **Rate Limiting** - Max 5 reset requests per 15 minutes
3. **Token Expiry** - Reset links expire in 1 hour
4. **Salted Hashes** - MediaWiki-compatible password storage
5. **Session Management** - 24-hour expiry, secure tokens
6. **Audit Logging** - Track all security events
7. **Account Locking** - Disable compromised accounts

## License

Content is available under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

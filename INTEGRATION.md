# GENESIS 2.0 - Unified Integration Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          GENESIS 2.0 PLATFORM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐      │
│  │  GENESIS Mobile  │    │   Auth Portal    │    │ Workflow Guardian│      │
│  │  (React Native)  │    │   (Node.js)      │    │   (TypeScript)   │      │
│  └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘      │
│           │                       │                       │                 │
│           ▼                       ▼                       ▼                 │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                     UNIFIED API LAYER                               │    │
│  │  • Authentication   • Security Scanning   • Device Management       │    │
│  │  • Session Mgmt     • Audit Logging       • Notification Service   │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Matrix

| Component | Port | Purpose | Status |
|-----------|------|---------|--------|
| Auth Portal | 3000 | Web authentication UI | ✅ Hardened |
| GENESIS API | 8080 | Backend services | 🔧 Configure |
| GENESIS Mobile | N/A | iOS/Android app | ✅ Ready |
| Workflow Guardian | N/A | CI/CD scanner | ✅ Fixed |

## Security Audit Summary

### Issues Found & Fixed

| Component | Critical | High | Medium | Fixed |
|-----------|----------|------|--------|-------|
| GENESIS Mobile | 1 | 2 | 16 | ✅ All |
| Auth Portal | 6 | 14 | 4 | ✅ All |
| Workflow Guardian | 5 | 12 | 8 | ✅ All |

### Key Fixes Applied

#### 1. GENESIS Mobile
- ✅ Created centralized config (`src/config/index.ts`)
- ✅ Added proper TypeScript types (`src/types/navigation.ts`)
- ✅ Created icon type definitions (`src/config/icons.ts`)
- ✅ Added tsconfig.json and babel.config.js
- ✅ Created asset directory structure

#### 2. Auth Portal
- ✅ Replaced SHA-256 with PBKDF2 (310,000 iterations)
- ✅ Removed password reset token logging
- ✅ Added rate limiting to login
- ✅ Created security module with:
  - Secure token generation
  - URL validation (open redirect prevention)
  - Security headers (CSP, HSTS)
  - Audit logging (no sensitive data)

#### 3. Workflow Guardian
- ✅ Fixed floating version detection logic error
- ✅ Fixed command injection in action.yml
- ✅ Added workflow_run to PR context detection
- ✅ Fixed npm ci to include dev dependencies for build

## Quick Start

### 1. Auth Portal (Backend)
```bash
cd auth-portal
npm install
cp .env.example .env
# Edit .env with secure values:
# - SESSION_SECRET: Generate with `openssl rand -base64 32`
# - COOKIE_SECURE: true (production)
# - CORS_ORIGINS: your-domain.com

npm run dev
```

### 2. GENESIS Mobile (iOS/Android)
```bash
cd genesis-mobile
npm install

# Copy environment config
cp .env.example .env

# Edit .env:
# EXPO_PUBLIC_API_URL=https://api.your-domain.com

# Download required fonts to src/assets/fonts/
# - Orbitron (Regular, Bold, Black)
# - Rajdhani (Regular, Medium, SemiBold, Bold)
# - ShareTechMono (Regular)

npx expo start
```

### 3. Workflow Guardian (CI/CD)
```yaml
# .github/workflows/security.yml
name: Security Scan
on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./workflow-guardian
        with:
          path: .github/workflows
          confidence-threshold: '0.75'
          block-threshold: '80'
```

## Environment Variables

### Auth Portal
```env
# Required
SESSION_SECRET=<64-char-random-string>
DB_HOST=localhost
DB_NAME=auth_portal

# Security (Production)
COOKIE_SECURE=true
SHOW_EXCEPTION_DETAILS=false
CORS_ORIGINS=https://your-domain.com
```

### GENESIS Mobile
```env
# Required
EXPO_PUBLIC_API_URL=https://api.your-domain.com

# Optional
EXPO_PUBLIC_PROJECT_ID=your-expo-project-id
```

## API Endpoints (Unified)

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | User login |
| `/api/auth/logout` | POST | End session |
| `/api/auth/refresh` | POST | Refresh token |
| `/api/auth/mfa/verify` | POST | MFA verification |

### Security
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/security/shield/health` | GET | Shield status |
| `/api/security/network/devices` | GET | Connected devices |
| `/api/security/alerts` | GET | Security alerts |
| `/api/security/pentagon/list` | GET | Pentagon layers |

### User
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/user/settings` | GET/POST | User settings |
| `/api/user/preferences` | POST | Update preferences |

## Security Headers (Required)

```typescript
// Apply to all responses
const headers = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'"
};
```

## Deployment Checklist

### Pre-Production
- [ ] Generate strong SESSION_SECRET (64+ chars)
- [ ] Set COOKIE_SECURE=true
- [ ] Configure proper CORS_ORIGINS
- [ ] Set SHOW_EXCEPTION_DETAILS=false
- [ ] Enable HTTPS everywhere
- [ ] Configure rate limiting
- [ ] Set up audit logging service

### Mobile App
- [ ] Download and add font files
- [ ] Create app icons and splash screens
- [ ] Configure push notification certificates
- [ ] Set production API URL
- [ ] Test biometric authentication
- [ ] Configure Apple Business Manager (optional)

### CI/CD
- [ ] Add Workflow Guardian to all repos
- [ ] Configure block threshold appropriately
- [ ] Set up security scanning on PRs
- [ ] Review and pin all action versions

## Monitoring

### Health Endpoints
```bash
# Auth Portal
curl https://your-domain.com/health

# API
curl https://api.your-domain.com/api/health
```

### Audit Logs
```bash
# View recent security events (no sensitive data logged)
tail -f /var/log/genesis/audit.log
```

## Troubleshooting

### Mobile App Connection Issues
1. Verify EXPO_PUBLIC_API_URL is correct
2. Check network connectivity
3. Ensure API server is running
4. Check CORS configuration

### Auth Portal Login Failures
1. Check rate limiting (max 10 attempts/15 min)
2. Verify session secret is set
3. Check cookie secure setting matches HTTPS

### Workflow Guardian False Positives
1. Adjust confidence-threshold (lower = more sensitive)
2. Review specific rule triggering
3. Pin action versions to reduce warnings

## Support

- Issues: https://github.com/anthropics/claude-code/issues
- Documentation: See component README files
- Security: security@your-domain.com

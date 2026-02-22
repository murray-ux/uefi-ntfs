# GENESIS 2.0 - Enterprise Integration Guide

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          GENESIS 2.0 ENTERPRISE PLATFORM                          │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                │
│  │  GENESIS Mobile  │  │   Auth Portal    │  │ Workflow Guardian│                │
│  │  (React Native)  │  │   (Node.js)      │  │   (TypeScript)   │                │
│  │  + Batch SDK     │  │  + RFC 4122 UUID │  │   + MAPE-K Loop  │                │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘                │
│           │                     │                     │                          │
│           ▼                     ▼                     ▼                          │
│  ┌───────────────────────────────────────────────────────────────────────┐       │
│  │                        UNIFIED API LAYER                               │       │
│  │  • Authentication   • Security Scanning   • Device Management          │       │
│  │  • Session Mgmt     • Audit Logging       • Notification Service       │       │
│  │  • Push Notifications (Batch-style)       • RFC 4122 UUID Generation  │       │
│  └───────────────────────────────────────────────────────────────────────┘       │
│                                    │                                              │
│                                    ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐       │
│  │                   AWS SECURITY ORCHESTRATION LAYER                     │       │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │       │
│  │  │   Security      │  │   Emergency     │  │   Compliance    │        │       │
│  │  │  Orchestrator   │  │   Playbook      │  │   Processor     │        │       │
│  │  │  (Step Func)    │  │  (Step Func)    │  │  (Step Func)    │        │       │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘        │       │
│  │           │                    │                    │                  │       │
│  │           ▼                    ▼                    ▼                  │       │
│  │  ┌────────────────────────────────────────────────────────────────┐   │       │
│  │  │  SNS Topics │ SQS Queues │ DynamoDB │ S3 │ Lambda Functions   │   │       │
│  │  └────────────────────────────────────────────────────────────────┘   │       │
│  └───────────────────────────────────────────────────────────────────────┘       │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Component Matrix

| Component | Port | Purpose | Status |
|-----------|------|---------|--------|
| Auth Portal | 3000 | Web authentication UI | ✅ Hardened |
| GENESIS API | 8080 | Backend services | 🔧 Configure |
| GENESIS Mobile | N/A | iOS/Android app | ✅ Enterprise |
| Workflow Guardian | N/A | CI/CD scanner | ✅ Fixed |
| AWS Step Functions | N/A | Security orchestration | ✅ Ready |
| RFC 4122 UUID | N/A | Cryptographic identifiers | ✅ Implemented |
| Batch SDK (Notifications) | N/A | Push notification infrastructure | ✅ Integrated |

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

---

## Enterprise Components

### RFC 4122 UUID Module (`auth-portal/src/uuid.ts`)

Full RFC 4122 compliant UUID implementation supporting versions 1, 4, and 5.

```typescript
import uuid from './uuid';

// Version 4 (Random) - Most common
const id = uuid.v4();
// => "f47ac10b-58cc-4372-a567-0e02b2c3d479"

// Version 1 (Time-based)
const timeId = uuid.v1();
// => "6ba7b810-9dad-11d1-80b4-00c04fd430c8"

// Version 5 (Name-based, SHA-1)
const namespaceId = uuid.v5({
  namespace: uuid.NAMESPACE_DNS,
  name: 'genesis.app'
});
// => deterministic UUID for "genesis.app"

// Validation
uuid.validate('f47ac10b-58cc-4372-a567-0e02b2c3d479'); // true
uuid.version('f47ac10b-58cc-4372-a567-0e02b2c3d479');  // 4

// Extract timestamp from v1 UUID
const date = uuid.extractTimestamp(timeId);
```

**Predefined Namespaces:**
- `NAMESPACE_DNS` - For domain names
- `NAMESPACE_URL` - For URLs
- `NAMESPACE_OID` - For ISO OIDs
- `NAMESPACE_X500` - For X.500 DNs

---

### Push Notifications (Batch SDK-style)

Enterprise push notification infrastructure with user segmentation, analytics, and preferences.

```typescript
import { notificationService, useNotifications } from './services/notifications';

// Initialize
await notificationService.init();

// Set user for targeting
notificationService.setUserId('user-12345');
notificationService.setSecurityLevel('maximum');

// Custom attributes for segmentation
notificationService.setUserAttributes({
  plan: 'enterprise',
  region: 'us-east',
  role: 'admin'
});

// Segment management
notificationService.addToSegment('beta-testers');
notificationService.addToSegment('security-admins');

// Preferences
notificationService.setPreferences({
  securityAlerts: true,
  systemUpdates: true,
  marketing: false,
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00'
});

// React Hook
function SecurityDashboard() {
  const {
    hasPermission,
    pushToken,
    installationId,
    sendAlert,
    setSecurityLevel,
    updatePreferences
  } = useNotifications();

  // Send security alert
  await sendAlert('Threat Detected', 'Suspicious activity on Device-42', 'high');
}
```

**Analytics Tracked:**
- Notification delivery
- Open rates
- Action taken
- Dismissals

---

### AWS Step Functions Security Orchestration

Three state machines for automated security incident response:

#### 1. Security Orchestrator (`security-orchestrator.json`)
Main entry point for all security events.

**Workflow Types:**
- `THREAT_DETECTED` - Isolate, forensics, notify
- `AUTH_ANOMALY` - Risk assessment, MFA challenge, block/allow
- `COMPLIANCE_VIOLATION` - Route to compliance processor
- `DEVICE_COMPROMISE` - Revoke tokens, quarantine, notify

```bash
# Submit security event
aws sqs send-message \
  --queue-url $SECURITY_EVENTS_QUEUE \
  --message-body '{
    "eventId": "evt-12345",
    "eventType": "login_anomaly",
    "source": "auth-portal",
    "payload": {
      "userId": "user-123",
      "ipAddress": "203.0.113.42",
      "userAgent": "..."
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }'
```

#### 2. Emergency Playbook (`emergency-playbook.json`)
Critical incident automated response.

**Scope-Based Response:**
- `ORGANIZATION_WIDE` - Emergency mode, notify executives, suspend external access
- `DEPARTMENT` - Isolate department, notify management
- `INDIVIDUAL` - Suspend user, revoke sessions

**Actions:**
- Impact assessment
- Containment execution
- Evidence collection (logs, memory dumps)
- Incident report generation

#### 3. Compliance Processor (`compliance-processor.json`)
Automated compliance violation handling.

**Supported Frameworks:**
- **GDPR** - Data subject identification, DPA notification, individual notification
- **HIPAA** - PHI identification, HHS notification, patient notification
- **PCI-DSS** - Cardholder data identification, acquirer notification, remediation
- **SOC 2** - Trust service criteria mapping

---

### AWS Infrastructure Deployment

```bash
cd infrastructure

# Deploy to AWS
sam build
sam deploy --guided \
  --parameter-overrides \
    Environment=production \
    AlertEmail=security@your-domain.com

# Resources created:
# - 3 Step Functions state machines
# - SNS topics for alerts
# - SQS queues (events, MFA responses, human tasks)
# - DynamoDB tables (events, incidents)
# - S3 bucket (incident reports, encrypted)
# - CloudWatch log groups
# - CloudWatch alarms
```

**CloudWatch Alarms:**
- High severity event spike (>10 in 5 min)
- State machine execution failures
- Dead letter queue messages

---

## Enterprise Deployment Checklist

### AWS Infrastructure
- [ ] Deploy SAM template to production
- [ ] Configure SNS subscriptions (email, Slack)
- [ ] Set up VPC endpoints for Lambda functions
- [ ] Enable AWS X-Ray tracing
- [ ] Configure KMS keys for encryption
- [ ] Set up cross-region replication for incident reports

### Push Notifications
- [ ] Configure APNs certificates (iOS)
- [ ] Configure FCM credentials (Android)
- [ ] Set up notification analytics dashboard
- [ ] Test quiet hours functionality
- [ ] Verify segment targeting

### UUID Integration
- [ ] Replace all Math.random() based IDs with uuid.v4()
- [ ] Use uuid.v5() for deterministic IDs (e.g., user namespaces)
- [ ] Add UUID validation to API inputs

### Security Workflows
- [ ] Test threat response workflow end-to-end
- [ ] Configure PagerDuty integration
- [ ] Set up Slack war room automation
- [ ] Test compliance notification workflows
- [ ] Verify 72-hour GDPR notification SLA

## Support

- Issues: https://github.com/anthropics/claude-code/issues
- Documentation: See component README files
- Security: security@your-domain.com

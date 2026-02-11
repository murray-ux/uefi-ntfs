# Sysadmin Hub

System administration guide for Auth Portal.

## Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Maintenance Scripts](#maintenance-scripts)
- [Security](#security)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Installation

### Requirements

- Node.js 18.0.0 or higher
- SQLite3 (or PostgreSQL/MySQL for production)
- SMTP server (for email features)

### Quick Start

```bash
# Clone repository
git clone https://github.com/example/auth-portal.git
cd auth-portal

# Install dependencies
npm install

# Initialize database
npm run db:init

# Start development server
npm run dev
```

### Production Deployment

```bash
# Build TypeScript
npm run build

# Set environment variables
export NODE_ENV=production
export DATABASE_URL=sqlite:./data/auth.db
export SMTP_HOST=smtp.example.com
export SMTP_PORT=587
export SESSION_SECRET=$(openssl rand -hex 32)

# Start production server
npm start
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | development | Environment mode |
| `PORT` | 3000 | Server port |
| `DATABASE_URL` | sqlite:./data/auth.db | Database connection |
| `SESSION_SECRET` | (random) | Session encryption key |
| `SMTP_HOST` | localhost | Email server host |
| `SMTP_PORT` | 25 | Email server port |
| `SMTP_USER` | (none) | Email authentication |
| `SMTP_PASS` | (none) | Email password |
| `PASSWORD_RESET_EXPIRY` | 3600 | Reset link expiry (seconds) |
| `SESSION_EXPIRY` | 86400 | Session length (seconds) |
| `RATE_LIMIT_WINDOW` | 900 | Rate limit window (seconds) |
| `RATE_LIMIT_MAX` | 5 | Max requests per window |

### Feature Flags

```bash
# Enable Enhanced Password Reset globally
export EPR_ENABLED_DEFAULT=true

# Require email confirmation for new accounts
export REQUIRE_EMAIL_CONFIRM=true

# Enable audit logging
export AUDIT_LOG_ENABLED=true
```

---

## Database Setup

### SQLite (Development)

```bash
# Initialize database
npm run db:init

# Database location
ls -la data/auth.db
```

### PostgreSQL (Production)

```sql
-- Create database
CREATE DATABASE auth_portal;
CREATE USER auth_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE auth_portal TO auth_user;

-- Run schema
psql -U auth_user -d auth_portal -f src/db/schema.sql
```

### MySQL (Production)

```sql
-- Create database
CREATE DATABASE auth_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'auth_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON auth_portal.* TO 'auth_user'@'localhost';

-- Run schema
mysql -u auth_user -p auth_portal < src/db/schema.sql
```

---

## Maintenance Scripts

Since Auth Portal 1.0, maintenance scripts should be invoked through the runner:

```bash
npm run maintenance <script> [options]
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `version` | Display version information |
| `changePassword` | Change user passwords, lock/unlock accounts |
| `createUser` | Create new user accounts |
| `cleanupSessions` | Remove expired sessions |
| `auditLog` | View or export audit log |

### Examples

```bash
# Check version
npm run maintenance version

# Create admin user
npm run maintenance createUser -- \
  --user=admin \
  --password=SecurePass123 \
  --email=admin@example.com \
  --admin

# Reset user password
npm run maintenance changePassword -- \
  --user=johndoe \
  --password=NewPassword123

# Lock compromised account
npm run maintenance changePassword -- \
  --user=badactor \
  --lock \
  --reason="Suspicious activity detected"

# Cleanup old sessions
npm run maintenance cleanupSessions -- --older-than=7d

# Export audit log
npm run maintenance auditLog -- \
  --since=2024-01-01 \
  --export=json > audit-backup.json
```

### Cron Jobs

```bash
# Daily session cleanup (3 AM)
0 3 * * * cd /opt/auth-portal && npm run maintenance cleanupSessions -- --older-than=7d

# Weekly audit log backup (Sunday 2 AM)
0 2 * * 0 cd /opt/auth-portal && npm run maintenance auditLog -- --export=json > /backup/audit-$(date +\%Y\%m\%d).json
```

---

## Security

### Password Hashing

Auth Portal uses salted MD5 hashing (MediaWiki-compatible):

```
Format: :B:salt:hash
Hash = MD5(salt + '-' + MD5(password))
```

For production, consider upgrading to bcrypt or Argon2.

### Rate Limiting

Default limits:
- **Password Reset**: 5 requests per 15 minutes
- **Login Attempts**: 10 attempts per 15 minutes
- **Account Creation**: 3 accounts per hour per IP

### Security Checklist

- [ ] Set strong `SESSION_SECRET`
- [ ] Enable HTTPS in production
- [ ] Configure SMTP with TLS
- [ ] Enable EPR globally
- [ ] Set up audit log backups
- [ ] Configure firewall rules
- [ ] Regular security updates

---

## Monitoring

### Health Check

```bash
# Check if server is running
curl http://localhost:3000/health

# Expected response
{"status":"ok","version":"1.0.0","uptime":12345}
```

### Metrics

```bash
# Session statistics
npm run maintenance cleanupSessions -- --dry-run

# Recent activity
npm run maintenance auditLog -- --limit=20
```

### Alerts

Configure monitoring for:
- High login failure rate
- Unusual password reset volume
- Session cleanup failures
- Database connection errors

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Password reset emails not sent | SMTP misconfigured | Check SMTP settings |
| Sessions expiring early | Clock drift | Sync server time with NTP |
| Database locked | SQLite concurrent access | Use PostgreSQL for production |
| Rate limit triggered | Too many requests | Wait or adjust limits |

### Logs

```bash
# Application logs
tail -f logs/app.log

# Audit log
npm run maintenance auditLog -- --action=login --limit=50
```

### Recovery

```bash
# Unlock all accounts (emergency)
sqlite3 data/auth.db "UPDATE user SET user_locked = 0;"

# Reset admin password
npm run maintenance changePassword -- \
  --user=admin \
  --password=TemporaryPassword123

# Clear all sessions (force re-login)
sqlite3 data/auth.db "DELETE FROM session;"
```

---

## See Also

- [Developer Hub](developer-hub.md) - API and extending
- [User Hub](user-hub.md) - End user documentation

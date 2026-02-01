# Enterprise Mail Domain Setup Runbook

**Classification:** Administrative
**Version:** 1.0.0
**License:** Apache 2.0 (MuzzL3d Dictionary Framework)

---

## Overview

Procedural checklist for configuring a custom mail domain with iCloud Mail,
including DNS migration from Google Workspace. All personal details, domain
names, and credentials are parameterised.

**Variables** (set in environment or substitute before execution):

| Variable | Description |
|---|---|
| `${DOMAIN}` | Primary domain (e.g. example.org) |
| `${ADMIN_EMAIL}` | Primary admin email |
| `${SECONDARY_EMAILS}` | Comma-separated list of additional addresses |
| `${OWNER_NAME}` | Domain owner display name |
| `${ORG_NAME}` | Organisation / trust name |
| `${REGISTRAR}` | Domain registrar name |
| `${VPN_PROVIDER}` | VPN service (e.g. Cloudflare WARP+) |

---

## Pre-Flight Checklist

- [ ] VPN active (`${VPN_PROVIDER}` connected)
- [ ] DNS leak test passed (all resolvers match VPN provider)
- [ ] IP leak test passed (WebRTC, DNS, IP all show VPN endpoint)
- [ ] Browser HTTPS-Only mode enabled
- [ ] Certificate store audited (no unexpected root CAs)
- [ ] Security extensions active (ad blocker, tracker blocker)
- [ ] Diagnostic tools bookmarked (dnschecker.org, mxtoolbox.com, etc.)

---

## Phase 1: Email Address Verification

1. Document current verification status for all addresses
2. Resend verification emails if any are pending
3. For each verification email:
   - Verify sender domain (must be `@apple.com` or `@icloud.com`)
   - Hover-check all links before clicking
   - Verify SPF/DKIM/DMARC pass on the email headers
4. Confirm all addresses show "Verified" before proceeding

---

## Phase 2: DNS Requirements

1. Retrieve required DNS records from iCloud Mail setup screen
2. Document all records: MX, TXT (SPF), TXT (verification), CNAME (DKIM)
3. Note exact values, priorities, and TTLs

---

## Phase 3: Registrar Access

1. WHOIS lookup via `lookup.icann.org`
2. Document: registrar, creation/expiry dates, nameservers, DNSSEC status
3. **CHECKPOINT**: Obtain explicit authorisation before accessing registrar

---

## Phase 4: DNS Backup

1. Document every existing DNS record before any changes
2. Export zone file if registrar supports it
3. Specifically identify existing Google Workspace MX records
4. Specifically identify existing SPF record (for merge, not replace)
5. **CHECKPOINT**: Present backup, obtain authorisation to modify

---

## Phase 5: DNS Configuration

1. Add new MX records (keep existing Google MX temporarily)
2. Merge SPF records (include both Google and iCloud authorisations)
3. Add DKIM CNAME records
4. Add verification TXT records
5. **CHECKPOINT**: Review all additions before saving
6. Save and verify each record appears correctly

---

## Phase 6: Conflicting Record Removal

1. **CHECKPOINT**: Obtain per-record authorisation for removal
2. Remove each conflicting Google MX record individually
3. Document final DNS state

---

## Phase 7: Verification

1. Trigger iCloud DNS verification ("Finish set up")
2. If propagation delay: check dnschecker.org, retry after propagation
3. Post-setup: test deliverability via mail-tester.com
4. Verify DMARC/SPF/DKIM via learndmarc.com

---

## Emergency Procedures

| Situation | Action |
|---|---|
| Suspected phishing | Stop, document URL, close tab, report |
| Accidental record deletion | Stop, reference backup, report |
| VPN connection loss | Halt all admin actions, reconnect, verify, report |
| Session timeout | Do not re-auth without instruction |
| Unrecognised account activity | Stop primary task, document, report immediately |

---

## Integration Discovery

During execution, note any discovered:
- API endpoints for DNS management
- Webhook configuration options
- Programmatic zone file management
- Cross-platform SSO or audit log aggregation opportunities

---

*This runbook is a template. Replace all `${VARIABLE}` placeholders with
actual values before execution. Never commit credentials or personal
information to version control.*

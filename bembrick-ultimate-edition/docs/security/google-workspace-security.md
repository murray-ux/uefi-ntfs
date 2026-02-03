# Google Workspace Security Configuration

> GENESIS Security System | Murray Bembrick
> Account: murray@bembrick.org

---

## PHASE 1: IMMEDIATE SECURITY ACTIONS

### 1.1 Security Checkup

**Navigate to:** https://myaccount.google.com/security-checkup

Complete all recommended actions before proceeding.

---

### 1.2 Review Recent Security Activity

**Navigate to:** https://myaccount.google.com/notifications

**ACTION:** Review every security event from the past 90 days. For any event you do not recognise, click "No, secure account" and follow the prompts.

---

### 1.3 Review Connected Devices

**Navigate to:** https://myaccount.google.com/device-activity

**FOR EACH DEVICE:**
1. Verify you recognise the device
2. Verify the location makes sense
3. Verify the last active time makes sense

**FOR ANY SUSPICIOUS DEVICE:**
1. Click the device
2. Click "Sign out"
3. Document: Device name, last seen time, location

---

## PHASE 2: TWO-FACTOR AUTHENTICATION

### 2.1 Configure 2-Step Verification

**Navigate to:** https://myaccount.google.com/signinoptions/two-step-verification

**SECURITY HIERARCHY (strongest to weakest):**

| Priority | Method | Security Level |
|----------|--------|----------------|
| 1 | **Security Key** | Highest - Cannot be phished |
| 2 | **Google Authenticator** | High - Time-based codes |
| 3 | **Google Prompts** | Medium - Push notifications |
| 4 | **SMS Codes** | Low - Vulnerable to SIM swap |

**RECOMMENDED:** Purchase YubiKey 5 NFC or Google Titan. Add at least TWO keys (primary + backup).

---

### 2.2 Generate Backup Codes

**Navigate to:** https://myaccount.google.com/signinoptions/two-step-verification

1. Scroll to "Backup codes"
2. Click "Show codes" or "Get backup codes"
3. **PRINT these codes on paper**
4. Store in a secure physical location (safe, lockbox)
5. Do NOT store digitally

---

### 2.3 Consider Advanced Protection Program

**Navigate to:** https://landing.google.com/advancedprotection/

**REQUIREMENTS:**
- Two physical security keys
- Limits third-party app access
- Enhanced account recovery procedures

**BENEFITS:**
- Strongest protection against phishing
- Extra verification for sensitive actions
- Blocks most third-party app access

---

## PHASE 3: THIRD-PARTY ACCESS AUDIT

### 3.1 Review Apps with Account Access

**Navigate to:** https://myaccount.google.com/permissions

**REMOVE IF:**
- You do not recognise the application
- You no longer use the application
- The application has broad permissions you did not explicitly grant
- The application is from an unknown developer

**PAY SPECIAL ATTENTION TO APPS WITH:**
- Gmail access (can read all emails)
- Drive access (can read all files)
- Calendar access (can see your schedule)
- Contacts access (can see your contacts)

---

### 3.2 Review Sign-In Methods

**Navigate to:** https://myaccount.google.com/signinoptions/passkeys

**REVIEW:** All passkeys and security methods. Remove any you do not recognise.

---

### 3.3 Review OAuth Tokens

**Navigate to:** https://myaccount.google.com/connections

**REVIEW:** All connected accounts and services. Remove connections to services you no longer use.

---

## PHASE 4: GMAIL SECURITY

### 4.1 Check Email Forwarding

**Navigate to:** Gmail > Settings (gear icon) > See all settings > Forwarding and POP/IMAP

**VERIFY:**
- "Forwarding" is either disabled OR forwards only to addresses you control
- If forwarding is enabled to an address you don't recognise, this indicates compromise

**ACTION:** If suspicious forwarding exists, disable immediately and change password.

---

### 4.2 Check Filters

**Navigate to:** Gmail > Settings > See all settings > Filters and Blocked Addresses

**REVIEW EVERY FILTER:**

**RED FLAGS:**
- Filters that delete emails automatically
- Filters that forward emails to unknown addresses
- Filters that mark emails as read automatically
- Filters that skip the inbox
- Any filter you did not create

**ACTION:** Delete any suspicious filters immediately.

---

### 4.3 Check Delegation

**Navigate to:** Gmail > Settings > See all settings > Accounts and Import

**REVIEW "Grant access to your account":**

**EXPECTED:** Empty, or only accounts you explicitly granted access.

**ACTION:** Remove any delegated access you did not authorise.

---

### 4.4 Check Send Mail As

**Navigate to:** Gmail > Settings > See all settings > Accounts and Import

**REVIEW "Send mail as":**

**EXPECTED:** Only your email addresses.

**ACTION:** Remove any addresses you do not control.

---

## PHASE 5: GOOGLE DRIVE SECURITY

### 5.1 Review Shared Files and Folders

**Navigate to:** https://drive.google.com/drive/shared-with-me

**REVIEW:** Files shared with you. Consider removing access to sensitive files you no longer need.

---

### 5.2 Review Your Sharing

**Navigate to:** https://drive.google.com/drive/my-drive

For important files and folders, right-click > Share > Manage Access

**REVIEW:** Who has access to each important file.

**ACTION:** Remove access for anyone who should no longer have it.

---

### 5.3 Review Link Sharing

For any file you've shared via link:
1. Right-click the file
2. Click "Share"
3. Review link sharing settings
4. Consider restricting to "Restricted" (specific people only)

---

## PHASE 6: GOOGLE CALENDAR SECURITY

### 6.1 Review Calendar Sharing

**Navigate to:** https://calendar.google.com/calendar/r/settings

For each calendar, click it and review "Share with specific people or groups"

**ACTION:** Remove anyone who should not have access.

---

### 6.2 Check for Suspicious Calendars

In Google Calendar, look at the left sidebar under "Other calendars"

**ACTION:** Remove any calendars you did not subscribe to.

---

## PHASE 7: GOOGLE WORKSPACE ADMIN (If Applicable)

### 7.1 Domain Security

If you have admin access to bembrick.org:

**Navigate to:** https://admin.google.com

**CHECK:**
1. Security > Basic settings
2. Security > Password management
3. Security > 2-step verification
4. Apps > Google Workspace > Gmail > Safety

---

### 7.2 Review Domain Users

**Navigate to:** Admin console > Users

**VERIFY:** Only authorised users exist for your domain.

---

### 7.3 Review Domain Apps

**Navigate to:** Admin console > Apps > Google Workspace Marketplace apps

**REVIEW:** Only approved applications should be listed.

---

## PHASE 8: PASSWORD SECURITY

### 8.1 Password Requirements

Your Google account password must meet these standards:

**MINIMUM REQUIREMENTS:**
- 20+ characters
- Mix of uppercase and lowercase
- Include numbers
- Include symbols (!@#$%^&*)
- NOT based on personal information
- NOT used anywhere else

**EXAMPLE FORMAT:** `Correct-Horse-Battery-Staple-42!`
(Use random words, not this exact example)

---

### 8.2 Change Password

**Navigate to:** https://myaccount.google.com/signinoptions/password

1. Generate a new password using a password manager
2. Update the password
3. Sign out of all other sessions when prompted

---

### 8.3 Password Manager Recommendation

**RECOMMENDED:** Use a dedicated password manager for all accounts.

**Options:**
- 1Password (recommended)
- Bitwarden (open source)

**DO NOT:** Use browser-based password storage as your primary method.

---

## PHASE 9: ENHANCED SAFE BROWSING

### 9.1 Enable Enhanced Safe Browsing

**Navigate to:** https://myaccount.google.com/security

1. Scroll to "Enhanced Safe Browsing"
2. Click "Manage Enhanced Safe Browsing"
3. Toggle ON

**BENEFIT:** Google will check URLs in real-time against known threats.

---

## PHASE 10: RECOVERY OPTIONS

### 10.1 Configure Recovery Email

**Navigate to:** https://myaccount.google.com/signinoptions/rescueemail

**SET:** A recovery email you control that is NOT your primary email.

**WARNING:** Do not use an email that others might have access to.

---

### 10.2 Configure Recovery Phone

**Navigate to:** https://myaccount.google.com/signinoptions/rescuephone

**SET:** A phone number you exclusively control.

**WARNING:** If others have access to this phone number, they could recover your account.

---

## VERIFICATION CHECKLIST

| Item | Status | Date |
|------|--------|------|
| Security checkup completed | [ ] | _____ |
| Recent activity reviewed | [ ] | _____ |
| Connected devices audited | [ ] | _____ |
| 2FA configured (hardware key preferred) | [ ] | _____ |
| Backup codes generated and stored | [ ] | _____ |
| Third-party apps audited | [ ] | _____ |
| Email forwarding checked | [ ] | _____ |
| Email filters reviewed | [ ] | _____ |
| Email delegation reviewed | [ ] | _____ |
| Drive sharing reviewed | [ ] | _____ |
| Calendar sharing reviewed | [ ] | _____ |
| Password updated (20+ characters) | [ ] | _____ |
| Enhanced Safe Browsing enabled | [ ] | _____ |
| Recovery options configured | [ ] | _____ |

---

## CRITICAL URLs FOR REFERENCE

| Purpose | URL |
|---------|-----|
| Security Dashboard | https://myaccount.google.com/security |
| Device Activity | https://myaccount.google.com/device-activity |
| Third-Party Apps | https://myaccount.google.com/permissions |
| 2-Step Verification | https://myaccount.google.com/signinoptions/two-step-verification |
| Gmail Settings | https://mail.google.com/mail/u/0/#settings/general |
| Security Notifications | https://myaccount.google.com/notifications |
| Advanced Protection | https://landing.google.com/advancedprotection/ |

---

**Document Version:** 1.0
**Last Updated:** 2026-01-25
**Classification:** PERSONAL - CONFIDENTIAL

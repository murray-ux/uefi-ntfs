# iOS Security Hardening Configuration

> GENESIS Security System | CAPUT Admin
> Device: iPhone | Platform: iOS 18+

---

## PHASE 1: IMMEDIATE LOCKDOWN (Execute Now)

### 1.1 Check for Surveillance Profiles

**This is the most critical check. Configuration profiles can grant deep access to your device.**

```
Settings > General > VPN & Device Management
```

**EXPECTED RESULT:** This section should either not exist OR show only profiles YOU installed (work email, school, VPN you chose).

**RED FLAGS - DELETE IMMEDIATELY:**
- Any profile you do not recognise
- Profiles with generic names like "Management Profile" or "Device Configuration"
- Profiles from organisations you are not affiliated with
- Any profile you did not explicitly install yourself

**TO REMOVE A SUSPICIOUS PROFILE:**
1. Tap the profile
2. Tap "Remove Profile"
3. Enter your passcode
4. If it cannot be removed, this indicates MDM enrollment - FACTORY RESET REQUIRED

---

### 1.2 Review Location Sharing

```
Settings > Privacy & Security > Location Services > Share My Location
```

**ACTION:** Ensure only people YOU trust are listed. Remove anyone suspicious.

```
Settings > Privacy & Security > Location Services > System Services > Significant Locations
```

**ACTION:** Review history. Clear if concerned. Consider disabling.

```
Settings > [Your Name] > Find My > Share My Location
```

**ACTION:** Review who can see your location. Remove untrusted individuals.

---

### 1.3 Check for AirTag Tracking

If you have Find My enabled:
1. Open the **Find My** app
2. Go to **Items** tab
3. Look for ANY items you do not own

**ALSO:** If you receive alerts about "AirTag Found Moving With You" - take this seriously. An unknown AirTag may be tracking you.

---

## PHASE 2: AUTHENTICATION HARDENING

### 2.1 Passcode Upgrade

```
Settings > Face ID & Passcode
```

**REQUIREMENTS:**
- Minimum 6-digit numeric passcode (8+ recommended)
- Better: Alphanumeric passcode (tap "Passcode Options")
- DO NOT use birthdays, addresses, or predictable patterns

**ENABLE:**
- [x] Require Passcode: Immediately
- [x] Stolen Device Protection: ON (set to "Always")
- [x] Erase Data after 10 failed attempts: ON (if you have backups)

---

### 2.2 Face ID / Touch ID Security

```
Settings > Face ID & Passcode
```

**REVIEW "USE FACE ID FOR":**
- [x] iPhone Unlock
- [x] iTunes & App Store
- [x] Wallet & Apple Pay
- [x] Password AutoFill

**SET UP ALTERNATE APPEARANCE:** Only if YOU need it. Remove if someone else set it up.

---

### 2.3 Apple Account Security

```
Settings > [Your Name] > Sign-In & Security
```

**VERIFY:**
1. **Two-Factor Authentication:** MUST be ON
2. **Trusted Phone Numbers:** Remove any numbers you do not control
3. **Recovery Key:** Consider setting up (store securely offline)

```
Settings > [Your Name] > Devices
```

**REVIEW:** Every device listed. Tap and "Remove from Account" for any you do not recognise.

---

## PHASE 3: COMMUNICATION SECURITY

### 3.1 iMessage Settings

```
Settings > Messages
```

**CONFIGURE:**
- [x] iMessage: ON
- [x] Send as SMS: Your choice (SMS is not encrypted)
- [x] Filter Unknown Senders: ON
- [x] Keep Messages: 1 Year or 30 Days (reduces data exposure)

**CRITICAL:**
```
Settings > Messages > Text Message Forwarding
```
**REVIEW:** Remove any devices you do not own or recognise.

---

### 3.2 Mail Security

```
Settings > Mail > Privacy Protection
```

**ENABLE:**
- [x] Protect Mail Activity: ON

This prevents senders from knowing when you open emails and hides your IP address.

---

### 3.3 Phone Call Security

```
Settings > Phone > Silence Unknown Callers
```

**CONSIDER:** Enabling to reduce phishing calls.

```
Settings > Phone > Call Blocking & Identification
```

**REVIEW:** Any third-party apps with call identification access.

---

## PHASE 4: APP PERMISSIONS AUDIT

### 4.1 Location Access

```
Settings > Privacy & Security > Location Services
```

**FOR EACH APP, SET TO:**
- "Never" - for apps that don't need location
- "While Using" - for apps that need it temporarily
- "Always" - ONLY for critical apps (Find My, Maps)

**DELETE:** Any apps you don't recognise.

---

### 4.2 Camera & Microphone Access

```
Settings > Privacy & Security > Camera
Settings > Privacy & Security > Microphone
```

**REVIEW EVERY APP.** Remove access from apps that should not need it.

---

### 4.3 Contacts, Calendars, Reminders

```
Settings > Privacy & Security > Contacts
Settings > Privacy & Security > Calendars
Settings > Privacy & Security > Reminders
```

**REVIEW:** Only apps that legitimately need access should have it.

---

### 4.4 Background App Refresh

```
Settings > General > Background App Refresh
```

**DISABLE** for apps that don't need to update in the background. This also prevents data collection when apps aren't in use.

---

## PHASE 5: ADVANCED DATA PROTECTION

### 5.1 Enable Advanced Data Protection for iCloud

**THIS IS CRITICAL.** Enables end-to-end encryption for most iCloud data.

```
Settings > [Your Name] > iCloud > Advanced Data Protection
```

1. Tap "Turn On Advanced Data Protection"
2. Set up a recovery method (recovery contact or recovery key)
3. Complete enrollment

**AFTER ENABLING:** Even Apple cannot access your encrypted data.

---

### 5.2 Private Relay (if you have iCloud+)

```
Settings > [Your Name] > iCloud > Private Relay
```

**ENABLE:** This masks your IP address when browsing in Safari.

---

### 5.3 Hide My Email (if you have iCloud+)

```
Settings > [Your Name] > iCloud > Hide My Email
```

**USE:** Generate random email addresses for sign-ups to protect your real email.

---

## PHASE 6: SAFARI & BROWSING SECURITY

### 6.1 Safari Settings

```
Settings > Safari
```

**CONFIGURE:**
- [x] Prevent Cross-Site Tracking: ON
- [x] Hide IP Address: From Trackers (or "Trackers and Websites")
- [x] Fraudulent Website Warning: ON
- [x] Privacy Preserving Ad Measurement: Your choice (OFF for maximum privacy)

---

### 6.2 Clear Browsing Data

```
Settings > Safari > Clear History and Website Data
```

**ACTION:** Clear periodically, especially if concerned about surveillance.

---

### 6.3 AutoFill Security

```
Settings > Safari > AutoFill
```

**REVIEW:** What data Safari stores and can autofill.

---

## PHASE 7: NETWORK SECURITY

### 7.1 Wi-Fi Security

```
Settings > Wi-Fi
```

**FOR EACH SAVED NETWORK (tap the (i) icon):**
- [x] Private Wi-Fi Address: ON
- [x] Limit IP Address Tracking: ON

**ALSO:**
- Delete networks you no longer use
- Never connect to unknown/open Wi-Fi networks

---

### 7.2 VPN Configuration

```
Settings > General > VPN & Device Management > VPN
```

**REVIEW:** Only VPN configurations YOU created should exist here.

**REMOVE** any VPN configs you did not set up.

---

### 7.3 DNS Configuration

For secure DNS on your Wi-Fi network:

```
Settings > Wi-Fi > [Your Network] > Configure DNS
```

Change to "Manual" and add:
- 1.1.1.1 (Cloudflare - private)
- 1.0.0.1 (Cloudflare - backup)

---

## PHASE 8: KEYBOARD & INPUT SECURITY

### 8.1 Keyboard Audit

```
Settings > General > Keyboard > Keyboards
```

**REVIEW:** Only Apple keyboards should be listed unless you specifically installed and trust a third-party keyboard.

**THIRD-PARTY KEYBOARDS CAN LOG KEYSTROKES.** Remove any you do not trust.

---

### 8.2 Predictive Text & Dictation

```
Settings > General > Keyboard
```

**CONSIDER:**
- Disable "Predictive" if concerned about data collection
- Review "Dictation" settings - audio may be processed by Apple

---

## PHASE 9: LOCKDOWN MODE (Maximum Security)

**For situations requiring the highest level of security:**

```
Settings > Privacy & Security > Lockdown Mode
```

**WHAT IT DOES:**
- Blocks most message attachment types
- Disables link previews
- Blocks FaceTime from unknown callers
- Disables shared albums
- Blocks unknown device connections
- Blocks configuration profiles

**TRADE-OFF:** Some features won't work normally. Enable if you believe you are being actively targeted.

---

## VERIFICATION CHECKLIST

Complete each item and record date:

| Item | Status | Date |
|------|--------|------|
| Configuration profiles reviewed | [ ] | _____ |
| Location sharing reviewed | [ ] | _____ |
| AirTag check completed | [ ] | _____ |
| Passcode upgraded | [ ] | _____ |
| Stolen Device Protection enabled | [ ] | _____ |
| Apple Account 2FA verified | [ ] | _____ |
| Trusted devices reviewed | [ ] | _____ |
| Text forwarding reviewed | [ ] | _____ |
| App permissions audited | [ ] | _____ |
| Advanced Data Protection enabled | [ ] | _____ |
| Safari privacy configured | [ ] | _____ |
| VPN configurations reviewed | [ ] | _____ |
| Keyboards reviewed | [ ] | _____ |

---

## Quick Reference: Settings Paths

| Check | Path |
|-------|------|
| Profiles | Settings > General > VPN & Device Management |
| Location Sharing | Settings > Privacy & Security > Location Services > Share My Location |
| Passcode | Settings > Face ID & Passcode |
| Apple ID Devices | Settings > [Your Name] > Devices |
| Text Forwarding | Settings > Messages > Text Message Forwarding |
| App Permissions | Settings > Privacy & Security > [Category] |
| Advanced Data Protection | Settings > [Your Name] > iCloud > Advanced Data Protection |
| Lockdown Mode | Settings > Privacy & Security > Lockdown Mode |

---

**Document Version:** 1.0
**Platform:** iOS 18+
**Classification:** PERSONAL - CONFIDENTIAL

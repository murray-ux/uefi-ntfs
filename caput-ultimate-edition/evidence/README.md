# GENESIS Evidence Documentation Module

> **Case Reference:** WA Magistrates Court 122458751
> **Owner:** CAPUT Admin (admin@caput.system)
> **YubiKey:** 5C FIPS (Serial: 31695265)

---

## Purpose

This module provides legally-defensible evidence documentation for:
- Suspicious files found on devices
- Device security concerns
- Potential monitoring/surveillance software
- Digital forensics preservation

---

## Evidence Chain of Custody

All evidence documented through GENESIS maintains:
1. **Timestamp** - UTC with timezone
2. **Hash** - SHA-256 of original file
3. **Metadata** - File properties, EXIF, etc.
4. **Context** - Where/how found
5. **Screenshots** - Visual documentation
6. **Signature** - YubiKey signed (if available)

---

## Quick Start

### Document a Suspicious File

```bash
# Using GENESIS CLI
./genesis-evidence.sh add \
  --type "suspicious-file" \
  --description "Small dark image found in hidden folder" \
  --location "iPhone > Photos > Hidden" \
  --file-path "/path/to/file" \
  --concern "Possible monitoring software indicator"
```

### Document Device Concern

```bash
./genesis-evidence.sh add \
  --type "device-security" \
  --device "iPhone 15 Pro" \
  --concern "Unknown image in hidden files" \
  --action-taken "Documented, preserved original"
```

---

## Evidence Types

| Type | Code | Description |
|------|------|-------------|
| Suspicious File | `suspicious-file` | Unknown/concerning files |
| Device Security | `device-security` | Device tampering concerns |
| Network Anomaly | `network-anomaly` | Unusual network activity |
| App Behavior | `app-behavior` | Suspicious app activity |
| Call Records | `call-records` | CDR evidence |
| Screenshots | `screenshot` | Visual documentation |
| Correspondence | `correspondence` | Emails, messages |
| Witness Statement | `witness` | Documented statements |

---

## File Preservation Protocol

### Step 1: Do NOT Modify
- Don't open the file in apps that might modify it
- Don't move or rename until documented
- Don't delete anything

### Step 2: Document Location
- Full path to file
- Folder it was found in
- How you discovered it
- Date/time of discovery

### Step 3: Capture Metadata
```bash
# On Mac/Linux
stat /path/to/file
file /path/to/file
md5 /path/to/file
shasum -a 256 /path/to/file

# On Windows
certutil -hashfile C:\path\to\file SHA256
```

### Step 4: Preserve Original
- Copy (don't move) to evidence folder
- Take screenshots showing file location
- Document chain of custody

---

## Device Security Checklist

### iPhone
- [ ] Settings > Privacy > App Privacy Report (review)
- [ ] Settings > General > Profiles (check for MDM)
- [ ] Settings > General > VPN & Device Management
- [ ] Settings > Screen Time > See All Activity
- [ ] Settings > Passwords > Security Recommendations
- [ ] Check for unknown apps with Location access
- [ ] Check for apps with "Always" background access

### Android
- [ ] Settings > Apps > See all apps > Show system
- [ ] Settings > Security > Device Admin Apps
- [ ] Settings > Security > Trust Agents
- [ ] Settings > Privacy > Permission Manager
- [ ] Settings > Battery > Battery Usage (unusual drain)
- [ ] Settings > Network > Data Usage (suspicious apps)

### Signs of Monitoring Software
- [ ] Unusual battery drain
- [ ] Phone runs hot when idle
- [ ] Unexpected data usage
- [ ] Strange background noises on calls
- [ ] Apps you didn't install
- [ ] Device admin apps you don't recognize
- [ ] MDM/Configuration profiles present
- [ ] Camera/microphone activating unexpectedly

---

## Legal Notes

### Admissibility Requirements (Australia)
1. **Authenticity** - Prove the evidence is what it claims to be
2. **Relevance** - Must relate to matters in dispute
3. **Best Evidence** - Original or verified copy preferred
4. **Chain of Custody** - Document who handled evidence when

### Evidence Act 1995 (Cth) / Evidence Act 2011 (WA)
- Section 146: Documents produced by computers
- Section 147: Business records
- Section 48: Proof of contents of documents

### Recommended Actions
1. Preserve all original files
2. Document discovery circumstances
3. Create cryptographic hashes
4. Store securely (GENESIS evidence folder)
5. Consider professional forensic examination
6. Consult with legal counsel

---

## Contact

**CAPUT Admin**
- Primary: admin@caput.system
- GitHub: @murray-ux

---

*GENESIS 2.0 — Evidence Documentation Module*
*For WA Magistrates Court Case 122458751*

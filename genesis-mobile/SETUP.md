# GENESIS 2.0 Mobile - Complete Setup & Enterprise Deployment Guide

## Table of Contents
1. [Quick Start](#quick-start)
2. [Development Setup](#development-setup)
3. [Environment Configuration](#environment-configuration)
4. [Apple Enterprise Deployment](#apple-enterprise-deployment)
5. [MDM Integration](#mdm-integration)
6. [Configuration Profiles](#configuration-profiles)
7. [App Distribution Methods](#app-distribution-methods)
8. [Security & Certificates](#security--certificates)
9. [Troubleshooting](#troubleshooting)

---

## Quick Start

```bash
# 1. Navigate to project
cd genesis-mobile

# 2. Install dependencies
npm install

# 3. Start development server
npx expo start
```

Then press **`i`** for iOS Simulator or scan QR code with iPhone Camera.

---

## Development Setup

### Prerequisites

```bash
# Node.js 20+ required
node -v  # Should show v20.x.x or higher

# Install via nvm if needed:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Install Expo CLI globally
npm install -g expo-cli eas-cli

# For iOS development (macOS only):
# - Xcode 15+ from App Store
# - Command Line Tools: xcode-select --install
# - CocoaPods: sudo gem install cocoapods
```

### Installation

```bash
cd genesis-mobile

# Install all dependencies
npm install

# If peer dependency warnings occur:
npm install --legacy-peer-deps

# Start the development server
npx expo start

# Alternative start commands:
npx expo start --clear    # Clear cache
npx expo start --ios      # Open iOS simulator directly
npx expo start --tunnel   # Use tunnel for physical device (bypasses network issues)
```

### Running on Devices

| Platform | Command |
|----------|---------|
| iOS Simulator | Press `i` in terminal or `npx expo run:ios` |
| Physical iPhone | Scan QR with Camera app (requires Expo Go) |
| Android Emulator | Press `a` in terminal |
| Physical Android | Scan QR with Expo Go app |

---

## Environment Configuration

### EXPO_PUBLIC_API_URL

This environment variable tells the mobile app where to find the GENESIS backend server.

#### Create Environment File

```bash
cd genesis-mobile

# Copy the example file
cp .env.example .env

# Edit with your configuration
nano .env
```

#### Configuration Options

```bash
# .env file contents

# ==========================================
# SCENARIO 1: iOS Simulator (localhost works)
# ==========================================
EXPO_PUBLIC_API_URL=http://localhost:8080

# ==========================================
# SCENARIO 2: Physical iPhone (same WiFi network)
# ==========================================
# Find your computer's IP:
#   macOS: ifconfig | grep "inet " | grep -v 127.0.0.1
#   Linux: ip addr show | grep "inet " | grep -v 127.0.0.1
#
# Example: Your IP is 192.168.1.42
EXPO_PUBLIC_API_URL=http://192.168.1.42:8080

# ==========================================
# SCENARIO 3: Production deployment
# ==========================================
EXPO_PUBLIC_API_URL=https://api.genesis.your-domain.com

# ==========================================
# Optional: Feature flags
# ==========================================
EXPO_PUBLIC_ENABLE_BIOMETRICS=true
EXPO_PUBLIC_ENABLE_NFC=true
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
EXPO_PUBLIC_ENABLE_AI_CHAT=true
```

#### Environment Summary

| Environment | EXPO_PUBLIC_API_URL | Notes |
|-------------|---------------------|-------|
| Simulator | `http://localhost:8080` | Default, works out of box |
| Physical Device | `http://192.168.1.XXX:8080` | Use your computer's LAN IP |
| Tunnel Mode | `http://localhost:8080` | Expo handles routing |
| Production | `https://api.your-domain.com` | Must be HTTPS |

---

## Apple Enterprise Deployment

### Deployment Methods Overview

Apple provides three methods for deploying custom apps to devices:

| Method | Best For | Requirements | User Trust |
|--------|----------|--------------|------------|
| **MDM (Recommended)** | Enterprise deployment | MDM server, ABM | Automatic |
| **Apple Business Manager** | Custom Apps | ABM account, App Store Connect | Automatic |
| **Enterprise Distribution** | In-house apps | ADEP membership ($299/year) | Manual |

### Apple Business Manager (ABM)

**Reference:** [Apple Business Manager](https://support.apple.com/guide/apple-business-manager/welcome/web)

ABM consolidates device enrollment, app distribution, and user management:

1. **Setup Requirements:**
   - Supported country/region
   - Domain verification (DNS TXT record)
   - Initial administrator account
   - D-U-N-S Number for organization

2. **Domain Verification:**
   ```
   Add DNS TXT record:
   Host: @
   Value: apple-domain-verification=XXXXXXXX
   ```

3. **Device Assignment:**
   - Devices purchased from Apple/authorized resellers automatically appear
   - Manually add devices via Apple Configurator

### Automated Device Enrollment (ADE)

**Reference:** [Automated Device Enrollment](https://support.apple.com/en-us/102300)

Zero-touch deployment for organization-owned devices:

| Feature | Description |
|---------|-------------|
| Automatic Supervision | Devices supervised during activation |
| MDM Lock | Enrollment cannot be removed by user |
| Skip Setup Steps | Bypass iCloud, Apple ID, Diagnostics screens |
| Zero-Touch | No physical device handling required |

**Eligibility:**
- Devices must be purchased from Apple, authorized reseller, or carrier
- Organization must be in supported country/region
- User-owned devices NOT eligible

### Enrollment Types Comparison

| Feature | User Enrollment | Device Enrollment | Automated (ADE) |
|---------|-----------------|-------------------|-----------------|
| Privacy Level | Highest (BYOD) | Medium | Lowest (Corporate) |
| Supervision | No | Optional | Yes (automatic) |
| MDM Removable | Yes | Yes | No |
| Silent App Install | No | Supervised only | Yes |
| Data Separation | Cryptographic | None | None |
| Apple ID Required | Managed Apple Account | Optional | Optional |

---

## MDM Integration

### MDM Security Capabilities

**Reference:** [Device Management Security](https://support.apple.com/guide/security/sec013b5d35d/web)

| Capability | Supervised Only | Description |
|------------|-----------------|-------------|
| Silent App Install | Yes | Install apps without user interaction |
| Prevent MDM Removal | Yes | Lock MDM profile |
| Single App Mode | Yes | Kiosk mode |
| Web Content Filter | Yes | Block/allow websites |
| Disable AirDrop | Yes | Prevent file sharing |
| Remote Reboot | Yes | Restart device remotely |
| App Restrictions | Yes | Block specific apps |
| Passcode Requirements | No | Enforce complexity |
| Wi-Fi Configuration | No | Push network settings |
| VPN Configuration | No | Configure per-app VPN |

### MDM Profile Installation

**Reference:** [Device Management Profiles](https://support.apple.com/guide/deployment/depc0aadd3fe/web)

```
Profile Removal Rules:
├── Manually Installed Profile
│   └── User can remove with passcode (unsupervised)
│
├── MDM-Installed Profile
│   └── Only MDM can remove (iOS 13+, macOS 10.15+)
│
└── Supervised Device
    └── Profile can be made non-removable
```

### Managed Apps

**Reference:** [Distribute Managed Apps](https://support.apple.com/guide/deployment/dep575bfed86/web)

Apps installed via MDM receive special capabilities:

| Feature | iOS Version | Description |
|---------|-------------|-------------|
| Automatic Trust | All | No manual trust establishment |
| Managed Open-In | iOS 7+ | Prevent data leakage |
| Per-App VPN | iOS 7+ | App-specific VPN tunnel |
| Non-Removable | iOS 14+ | Prevent app deletion |
| Silent Install | Supervised | No user interaction |
| Hide/Lock Prevention | iOS 18+ | Prevent hiding managed apps |
| Declarative Management | iOS 17.2+ | Modern management protocol |

---

## Configuration Profiles

### Profile Structure

**Reference:** [Configuration Profiles](https://support.apple.com/guide/deployment/dep9a318a393/web)

Configuration profiles are XML files (`.mobileconfig`) containing payloads:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "...">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <!-- Payload items here -->
    </array>
    <key>PayloadDisplayName</key>
    <string>GENESIS Security Profile</string>
    <key>PayloadIdentifier</key>
    <string>com.genesis.security.profile</string>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>
```

### Creating Profiles with Apple Configurator

**Reference:** [Apple Configurator Guide](https://support.apple.com/guide/apple-configurator-mac/pmd85719196/mac)

1. **Create Profile:**
   ```
   File > New Profile
   ```

2. **Configure General Settings:**
   - Name (required)
   - Identifier (required, e.g., `com.genesis.profile.security`)
   - Description
   - Organization

3. **Add Payloads:**
   - Select payload type from left panel
   - Click "Configure"
   - Fill required fields (marked with icon)

4. **Sign Profile (Optional but Recommended):**
   ```
   File > Sign Profile
   Select signing certificate
   ```

### Common Payloads for GENESIS App

| Payload | Purpose | Supervised Required |
|---------|---------|---------------------|
| Wi-Fi | Configure network access | No |
| VPN | Per-app VPN for GENESIS | No |
| Passcode | Enforce device security | No |
| Restrictions | Disable features | Some options |
| Web Content Filter | Allow GENESIS domains | Yes |
| Certificates | Install CA certificates | No |
| Single App Mode | Lock to GENESIS | Yes |

---

## App Distribution Methods

### Method 1: TestFlight (Recommended for Testing)

```bash
# Build for TestFlight
eas build --profile preview --platform ios

# Submit to TestFlight
eas submit --platform ios
```

### Method 2: Apple Business Manager Custom Apps

**Reference:** [Custom Apps](https://support.apple.com/guide/apple-business-manager/axm58ba3112a/web)

1. **Submit App:**
   ```bash
   # Build production version
   eas build --profile production --platform ios

   # Submit to App Store Connect
   eas submit --platform ios
   ```

2. **Configure in App Store Connect:**
   - Set distribution to "Private"
   - Add Organization IDs (from ABM)

3. **Find Organization ID:**
   ```
   Apple Business Manager > Preferences > Enrollment Information
   ```

4. **Advantages:**
   - No certificate expiration concerns
   - App Store infrastructure
   - App Review (1-2 days)
   - Device-based assignment (no Apple ID needed)

### Method 3: Enterprise Distribution (In-House)

**Reference:** [Enterprise App Distribution](https://support.apple.com/en-us/118254)

For Apple Developer Enterprise Program ($299/year):

1. **Build with Enterprise Certificate:**
   ```bash
   eas build --profile production --platform ios
   ```

2. **Host IPA and Manifest:**
   ```
   https://your-server.com/
   ├── genesis.ipa
   └── manifest.plist
   ```

3. **Install via HTTPS Link:**
   ```
   itms-services://?action=download-manifest&url=https://your-server.com/manifest.plist
   ```

4. **Trust Establishment:**
   - **MDM Installation:** Trust automatic
   - **Manual Installation:**
     - iOS 18+: Settings > General > VPN & Device Management > Trust > Allow & Restart
     - Earlier: Settings > General > Device Management > Trust

### Volume Purchase Program (VPP)

**Reference:** [Apps and Books](https://support.apple.com/guide/apple-business-manager/)

| License Type | Assignment | Best For |
|--------------|------------|----------|
| Device-Based | Serial number | Shared devices, kiosks |
| User-Based | Apple ID | Personal devices |

---

## Security & Certificates

### Trusted Root Certificates

**Reference:** [Root Certificates](https://support.apple.com/en-us/103272)

Apple platforms include preinstalled trusted root certificates. For iOS 18/iPadOS 18:

| Category | Description |
|----------|-------------|
| Trusted | Automatically trusted for all purposes |
| Always Ask | User prompted before trusting |
| Blocked | Never trusted (compromised) |

**Enterprise Certificates:**
- Custom CA certificates can be deployed via Configuration Profiles
- No need to include Apple's preinstalled roots in profiles
- HTTPS required for wireless enterprise app installation

### Code Signing Requirements

**Reference:** [App Code Signing](https://support.apple.com/guide/deployment/)

| Component | Requirement |
|-----------|-------------|
| Certificate | Apple-issued (Developer/Enterprise) |
| Provisioning Profile | Links certificate to devices/apps |
| App Signature | All executable code must be signed |
| Notarization | Required for macOS distribution |

### Network Requirements

For enterprise app installation and certificate verification:

| Service | URL | Purpose |
|---------|-----|---------|
| Certificate Verification | `https://ppq.apple.com` | Verify developer certificates |
| Push Notifications | `*.push.apple.com` | APNs |
| App Store | `*.itunes.apple.com` | App downloads |
| Software Updates | `*.apple.com` | OS updates |

**Firewall Configuration:**
```
Allow outbound HTTPS (443) to:
- ppq.apple.com
- *.push.apple.com
- *.apple.com
- *.mzstatic.com
```

---

## iOS/iPadOS Restrictions

### Common Restrictions for GENESIS Deployment

**Reference:** [Restrictions for iPhone and iPad](https://support.apple.com/guide/deployment/dep0f7dd3d8/web)

| Restriction | Default | Supervised Required | GENESIS Recommendation |
|-------------|---------|---------------------|------------------------|
| Allow App Installation | On | No | On (for updates) |
| Allow App Removal | On | No | Off (for managed apps) |
| Allow AirDrop | On | Yes | Off (data protection) |
| Allow Screen Capture | On | No | Consider Off |
| Force Encrypted Backups | Off | No | On |
| Allow Managed to Unmanaged | On | No | Off (data separation) |
| Allow Unmanaged to Managed | On | No | Off |
| Require Passcode | Off | No | On |

### Supervised-Only Restrictions

| Restriction | Purpose |
|-------------|---------|
| Prevent MDM Removal | Lock management |
| Single App Mode | Kiosk deployment |
| Web Content Filter | Allow only GENESIS URLs |
| Block App Store | Prevent unauthorized installs |
| Disable AirDrop | Prevent data exfiltration |
| Global HTTP Proxy | Route all traffic |

---

## Troubleshooting

### Common Issues

#### "Network Request Failed" on Physical Device

```bash
# Solution 1: Check IP configuration
# Ensure .env has your computer's IP, not localhost
cat .env
# Should show: EXPO_PUBLIC_API_URL=http://192.168.x.x:8080

# Solution 2: Use tunnel mode
npx expo start --tunnel

# Solution 3: Check firewall
# macOS: System Preferences > Security > Firewall > Allow ports 8080, 8081

# Solution 4: Same WiFi network
# Verify phone and computer on same network
```

#### "Unable to Verify App"

```bash
# Enterprise app certificate issue

# Check 1: Internet connection required
ping ppq.apple.com

# Check 2: For manual install (not MDM)
# Settings > General > VPN & Device Management > [Developer] > Trust

# Check 3: iOS 18+
# Tap "Allow & Restart" - device restart required
```

#### Metro Bundler Issues

```bash
# Clear cache and restart
npx expo start --clear

# Reset Metro
rm -rf node_modules/.cache

# Full reset
rm -rf node_modules
npm install
npx expo start --clear
```

#### Build Failures

```bash
# Check EAS login
eas whoami

# Login if needed
eas login

# Verify credentials
eas credentials

# Clean build
eas build --profile development --platform ios --clear-cache
```

### Enterprise Deployment Checklist

```
Pre-Deployment:
[ ] Apple Business Manager account configured
[ ] Domain verification complete
[ ] MDM server connected to ABM
[ ] Devices enrolled in ABM (or via Configurator)
[ ] App submitted to App Store Connect (for Custom Apps)
[ ] Configuration profiles created and signed
[ ] Network firewall rules configured

Deployment:
[ ] Assign app to devices/users in ABM
[ ] Push configuration profiles via MDM
[ ] Verify app installation
[ ] Test managed app restrictions
[ ] Confirm certificate trust

Post-Deployment:
[ ] Monitor device compliance
[ ] Track app versions
[ ] Plan certificate renewal (Enterprise only)
[ ] Review audit logs
```

---

## Apple Documentation References

### Primary Resources

| Topic | URL |
|-------|-----|
| Apple Platform Deployment | https://support.apple.com/guide/deployment/welcome/web |
| Apple Business Manager Guide | https://support.apple.com/guide/apple-business-manager/welcome/web |
| Apple Configurator Guide | https://support.apple.com/guide/apple-configurator-mac/welcome/mac |
| MDM Protocol Reference | https://developer.apple.com/documentation/devicemanagement |

### Specific Articles Referenced

| Article | Topic |
|---------|-------|
| [HT118254](https://support.apple.com/en-us/118254) | Install custom enterprise apps |
| [HT102300](https://support.apple.com/en-us/102300) | Automated Device Enrollment |
| [HT103272](https://support.apple.com/en-us/103272) | Available root certificates |
| [HT205205](https://support.apple.com/HT205205) | Apple Business Manager requirements |
| [HT207177](https://support.apple.com/HT207177) | Distribute managed apps |
| [HT208125](https://support.apple.com/HT208125) | Trust enterprise apps |

### Certificate Documentation

| OS Version | Reference |
|------------|-----------|
| iOS 18 / macOS 15 | https://support.apple.com/en-us/121672 |
| iOS 17 / macOS 14 | https://support.apple.com/en-us/HT213464 |
| iOS 11 | https://support.apple.com/HT208128 |
| macOS High Sierra | https://support.apple.com/HT208127 |
| tvOS 11 | https://support.apple.com/HT208129 |
| watchOS 2 | https://support.apple.com/HT205203 |

---

## Next Steps

1. **Development:** Follow Quick Start to run locally
2. **Testing:** Deploy to TestFlight for beta testing
3. **Enterprise:** Configure ABM and MDM for production
4. **Security:** Review and implement restriction profiles

For questions, refer to Apple's official deployment documentation or contact Apple Business support.

# GENESIS 2.0 Mobile - Complete Setup Guide

## Prerequisites

### Required Software

```bash
# Node.js 20+ (check with: node -v)
# Install via nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Expo CLI
npm install -g expo-cli eas-cli

# For iOS development (macOS only):
# - Xcode 15+ from App Store
# - Xcode Command Line Tools: xcode-select --install
# - CocoaPods: sudo gem install cocoapods

# For iOS Simulator:
# Open Xcode > Settings > Platforms > Download iOS Simulator
```

### Required Accounts

1. **Expo Account** (free): https://expo.dev/signup
2. **Apple Developer Account** ($99/year): Required only for physical device testing and App Store

---

## Step 1: Install Dependencies

```bash
cd /home/user/uefi-ntfs/genesis-mobile

# Install all packages
npm install

# If you get peer dependency warnings, try:
npm install --legacy-peer-deps
```

---

## Step 2: Configure Environment

### Option A: Local Development (Simulator)

```bash
# Create .env file
cp .env.example .env

# Edit .env - for simulator, use localhost:
echo 'EXPO_PUBLIC_API_URL=http://localhost:8080' > .env
```

### Option B: Local Development (Physical iPhone on same WiFi)

```bash
# Find your computer's local IP address:
# macOS:
ifconfig | grep "inet " | grep -v 127.0.0.1

# Linux:
ip addr show | grep "inet " | grep -v 127.0.0.1

# Example output: inet 192.168.1.42

# Create .env with your IP:
echo 'EXPO_PUBLIC_API_URL=http://192.168.1.42:8080' > .env
```

### Option C: Production

```bash
echo 'EXPO_PUBLIC_API_URL=https://api.your-domain.com' > .env
```

---

## Step 3: Start the GENESIS Backend

The mobile app needs the GENESIS backend running to function. Start it first:

```bash
# Terminal 1: Start GENESIS backend
cd /home/user/uefi-ntfs/caput-ultimate-edition

# Option A: Using npm
npm start

# Option B: Using the startup script
./go.sh

# Option C: Using Docker
docker-compose up -d

# The backend will start on port 8080 by default
# You should see: "GENESIS server listening on http://0.0.0.0:8080"
```

Verify the backend is running:

```bash
curl http://localhost:8080/health
# Should return: {"status":"healthy",...}
```

---

## Step 4: Start the Mobile App

```bash
# Terminal 2: Start Expo
cd /home/user/uefi-ntfs/genesis-mobile
npm start

# Or with specific options:
npx expo start --clear  # Clear cache and start
npx expo start --ios    # Start and open iOS simulator
npx expo start --tunnel # Use tunnel for physical device (bypasses network issues)
```

You'll see a QR code and menu:

```
› Metro waiting on exp://192.168.1.42:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Using Expo Go
› Press s │ switch to development build
› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web

› Press j │ open debugger
› Press r │ reload app
› Press m │ toggle menu
› Press o │ open project code in your editor
```

---

## Step 5: Run on Device/Simulator

### iOS Simulator (macOS only)

```bash
# Press 'i' in the Expo terminal
# Or run directly:
npx expo run:ios
```

### Physical iPhone

1. **Install Expo Go** from App Store: https://apps.apple.com/app/expo-go/id982107779

2. **Scan QR Code**:
   - Open iPhone Camera
   - Point at QR code in terminal
   - Tap the notification to open in Expo Go

3. **If QR code doesn't work** (firewall/network issues):
   ```bash
   # Use tunnel mode
   npx expo start --tunnel

   # This creates a public URL that bypasses local network
   ```

### Troubleshooting Physical Device

```bash
# Problem: "Network request failed"
# Solution 1: Use tunnel mode
npx expo start --tunnel

# Solution 2: Check firewall allows port 8080 and 8081
# macOS: System Preferences > Security > Firewall > Options

# Solution 3: Ensure phone and computer on same WiFi

# Problem: "Unable to connect to development server"
# Solution: Check EXPO_PUBLIC_API_URL uses your computer's IP, not localhost
```

---

## Step 6: Download Required Fonts

The app uses custom fonts. Download and place them:

```bash
mkdir -p src/assets/fonts
cd src/assets/fonts

# Download from Google Fonts (or use these direct links):
# Orbitron: https://fonts.google.com/specimen/Orbitron
# Rajdhani: https://fonts.google.com/specimen/Rajdhani
# Share Tech Mono: https://fonts.google.com/specimen/Share+Tech+Mono

# Expected files:
# - Orbitron-Regular.ttf
# - Orbitron-Bold.ttf
# - Orbitron-Black.ttf
# - Rajdhani-Regular.ttf
# - Rajdhani-Medium.ttf
# - Rajdhani-SemiBold.ttf
# - Rajdhani-Bold.ttf
# - ShareTechMono-Regular.ttf
```

Or use the bundled system fonts temporarily by modifying `src/theme/typography.ts`:

```typescript
export const fonts = {
  display: 'System',  // Fallback to system font
  body: 'System',
  mono: 'Courier',
} as const;
```

---

## Step 7: Add Placeholder Assets

Create placeholder images for the app:

```bash
mkdir -p src/assets/images

# Create a simple 1024x1024 icon (or use any PNG)
# icon.png - App icon
# splash.png - Splash screen (1284x2778 for iPhone)
# adaptive-icon.png - Android adaptive icon
# favicon.png - Web favicon
# notification-icon.png - Notification icon (96x96)
```

For quick testing, create placeholder files:

```bash
cd src/assets/images

# Create 1x1 pixel transparent PNGs as placeholders
# (The app will still run, just without custom icons)
convert -size 1024x1024 xc:transparent icon.png 2>/dev/null || touch icon.png
convert -size 1284x2778 xc:transparent splash.png 2>/dev/null || touch splash.png
```

---

## API Endpoints Required

The mobile app expects these endpoints on your GENESIS backend:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/login` | User authentication |
| POST | `/api/logout` | End session |
| POST | `/api/refresh` | Refresh JWT token |
| GET | `/api/session` | Validate current session |
| POST | `/api/mfa/verify` | Verify MFA code |
| GET | `/shield/health` | Security overview |
| POST | `/shield/scan` | Run security scan |
| GET | `/network/devices` | List managed devices |
| GET | `/alerts` | Get security alerts |
| GET | `/pentagon/list` | Get Pentagon room status |
| POST | `/ai/query` | AI chat query |
| GET | `/ai/providers/*` | Check AI provider availability |
| POST | `/sign` | Sign document with Ed25519 |
| GET | `/audit/chain` | Verify ledger integrity |
| POST | `/yubikey/otp` | Verify YubiKey OTP |
| POST | `/yubikey/challenge` | YubiKey challenge-response |
| POST | `/notifications/register` | Register push token |

---

## Development Commands

```bash
# Start development server
npm start

# Start with cache cleared
npx expo start --clear

# Start with tunnel (for physical device network issues)
npx expo start --tunnel

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Type checking
npm run type-check

# Linting
npm run lint

# Run tests
npm test
```

---

## Building for Production

### Setup EAS Build

```bash
# Login to Expo
eas login

# Initialize EAS in your project
eas init

# Configure build
eas build:configure
```

### Build iOS App

```bash
# Development build (includes dev tools)
eas build --profile development --platform ios

# Preview build (TestFlight ready)
eas build --profile preview --platform ios

# Production build (App Store ready)
eas build --profile production --platform ios
```

### Build Android App

```bash
# Development APK
eas build --profile development --platform android

# Production AAB (Play Store)
eas build --profile production --platform android
```

---

## Quick Start Checklist

```
[ ] Node.js 20+ installed
[ ] Expo CLI installed (npm install -g expo-cli)
[ ] Dependencies installed (npm install)
[ ] .env file created with EXPO_PUBLIC_API_URL
[ ] GENESIS backend running on port 8080
[ ] Fonts downloaded to src/assets/fonts/
[ ] Placeholder images in src/assets/images/
[ ] Expo Go installed on iPhone (for physical device testing)
[ ] Run: npm start
[ ] Press 'i' for simulator or scan QR for physical device
```

---

## Common Issues

### "Cannot find module" errors
```bash
rm -rf node_modules
npm install
npx expo start --clear
```

### "Invariant Violation: requireNativeComponent"
```bash
# Some native modules need a development build
npx expo run:ios
# Or create a dev build:
eas build --profile development --platform ios
```

### Metro bundler stuck
```bash
# Kill Metro and restart
npx expo start --clear
```

### iOS Simulator not appearing
```bash
# Open Simulator manually first
open -a Simulator
# Then run:
npx expo run:ios
```

### Network request failed on physical device
1. Check phone and computer on same WiFi
2. Check .env has computer's IP, not localhost
3. Try tunnel mode: `npx expo start --tunnel`
4. Check firewall allows ports 8080, 8081, 19000-19002

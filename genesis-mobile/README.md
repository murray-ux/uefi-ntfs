# GENESIS 2.0 Mobile

> Sovereign Security Platform for iOS

A full-featured React Native / Expo mobile application with cyberpunk RGB aesthetics, hardware security integration, and AI-powered security assistant.

## Features

### Authentication
- Face ID / Touch ID biometric authentication
- YubiKey NFC hardware MFA (OTP, WebAuthn, Challenge-Response)
- TOTP authenticator app support
- Secure token storage with Expo SecureStore

### Security Dashboard
- Real-time threat level monitoring
- Security metrics visualization
- Alert management with severity levels
- Device health overview

### Device Management
- FleetDM integration for MDM
- CIS benchmark scoring
- Vulnerability tracking
- Patch management status
- Certificate monitoring

### AI Assistant
- Multi-provider support (Anthropic Claude, OpenAI GPT-4, Ollama)
- Security-focused quick actions
- Incident response guidance
- Policy drafting assistance

### Pentagon Visualization
- Interactive 5-layer architecture display
- 40-room status monitoring
- Real-time metrics per room
- Layer filtering

### Document Signing
- Ed25519 digital signatures
- Camera document capture
- Evidence chain integration
- Hash verification

### Audit Log
- Hash-chained ledger viewer
- Chain integrity verification
- Detailed entry inspection
- Action filtering

## Tech Stack

- **Framework**: React Native + Expo SDK 52
- **Language**: TypeScript 5.6
- **State**: Zustand + React Query
- **Navigation**: React Navigation 7
- **Styling**: StyleSheet + expo-linear-gradient
- **Fonts**: Orbitron, Rajdhani, Share Tech Mono
- **Security**: expo-local-authentication, expo-secure-store
- **NFC**: react-native-nfc-manager
- **Notifications**: expo-notifications

## Getting Started

### Prerequisites

- Node.js 20+
- Expo CLI
- iOS Simulator or physical device
- Xcode 15+ (for iOS builds)

### Installation

```bash
cd genesis-mobile
npm install
```

### Development

```bash
# Start Expo development server
npm start

# Run on iOS Simulator
npm run ios

# Run on physical device
npx expo start --tunnel
```

### Building

```bash
# Build for iOS
npm run build:ios

# Build for Android
npm run build:android

# Build for all platforms
npm run build:all
```

## Project Structure

```
genesis-mobile/
├── src/
│   ├── index.tsx           # App entry point
│   ├── navigation/
│   │   └── AppNavigator.tsx # Navigation structure
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── SecurityScreen.tsx
│   │   ├── DevicesScreen.tsx
│   │   ├── AIAssistantScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   ├── PentagonScreen.tsx
│   │   ├── AuditLogScreen.tsx
│   │   ├── DocumentSignScreen.tsx
│   │   ├── YubiKeyScreen.tsx
│   │   └── ...
│   ├── store/
│   │   ├── authStore.ts     # Authentication state
│   │   ├── securityStore.ts # Security & alerts
│   │   └── aiStore.ts       # AI chat state
│   ├── services/
│   │   ├── nfc.ts           # YubiKey NFC integration
│   │   └── notifications.ts # Push notifications
│   ├── theme/
│   │   ├── colors.ts        # RGB cyberpunk palette
│   │   ├── typography.ts    # Font styles
│   │   ├── spacing.ts       # Layout system
│   │   ├── animations.ts    # Reanimated configs
│   │   └── index.ts
│   ├── components/          # Reusable UI components
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Utility functions
│   └── assets/
│       ├── fonts/
│       ├── images/
│       └── sounds/
├── app.json                 # Expo configuration
├── package.json
├── tsconfig.json
└── README.md
```

## Configuration

### Environment Variables

Create a `.env` file:

```bash
EXPO_PUBLIC_API_URL=http://localhost:8080
```

### iOS Permissions

The app requires the following permissions (configured in app.json):

- Face ID / Touch ID
- Camera (document scanning)
- Photo Library
- NFC (YubiKey)
- Notifications
- Location (audit logs)

## Design System

### Colors

The app uses a cyberpunk RGB color palette:

- **Cyan** `#00ffff` - Primary actions, links
- **Magenta** `#ff00ff` - Secondary accents
- **Green** `#00ff00` - Success states, Matrix effects
- **Yellow** `#ffee00` - Warnings
- **Orange** `#ff9500` - Alerts
- **Red** `#ff0000` - Critical, errors

### Typography

- **Orbitron** - Display headings, buttons
- **Rajdhani** - Body text, UI elements
- **Share Tech Mono** - Code, hashes, terminal

### Animations

- Matrix rain effect on login
- Pulsing threat indicators
- Neon glow effects
- Slide/fade transitions

## API Integration

The app connects to the GENESIS backend API:

```typescript
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';

// Endpoints used:
POST /api/login
POST /api/logout
GET  /api/session
POST /api/mfa/verify
GET  /shield/health
GET  /network/devices
GET  /alerts
GET  /pentagon/list
POST /ai/query
POST /sign
GET  /audit/chain
POST /yubikey/otp
```

## Security

- All tokens stored in SecureStore (iOS Keychain)
- Biometric authentication for sensitive actions
- Certificate pinning (production builds)
- No secrets in code
- Secure random token generation

## License

Part of GENESIS 2.0 Sovereign Security Platform

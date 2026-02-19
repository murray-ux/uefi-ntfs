/**
 * GENESIS 2.0 - Centralized Configuration
 * Single source of truth for all environment and API configuration
 */

import Constants from 'expo-constants';

// Environment detection
const isDevelopment = __DEV__;
const isProduction = !__DEV__;

// API Configuration with validation
const getApiBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;

  if (envUrl) {
    // Validate URL format
    try {
      new URL(envUrl);
      return envUrl;
    } catch {
      console.warn('[Config] Invalid EXPO_PUBLIC_API_URL, using default');
    }
  }

  // Development defaults
  if (isDevelopment) {
    return 'http://localhost:8080';
  }

  // Production MUST have valid API URL
  throw new Error('EXPO_PUBLIC_API_URL is required in production');
};

// Security configuration
const getSecurityConfig = () => ({
  // Token storage keys
  tokenKey: 'genesis_auth_token',
  refreshTokenKey: 'genesis_refresh_token',
  credentialsKey: 'genesis_credentials',
  biometricKey: 'genesis_biometric_enabled',

  // Session timeouts (milliseconds)
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  extendedSessionTimeout: 30 * 24 * 60 * 60 * 1000, // 30 days
  refreshThreshold: 5 * 60 * 1000, // 5 minutes before expiry

  // Rate limiting
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes

  // Biometric
  biometricPromptTitle: 'Authenticate to GENESIS',
  biometricFallbackLabel: 'Use Password',
  biometricCancelLabel: 'Cancel',
});

// API endpoints (centralized)
const getEndpoints = (baseUrl: string) => ({
  // Auth
  login: `${baseUrl}/api/auth/login`,
  logout: `${baseUrl}/api/auth/logout`,
  refresh: `${baseUrl}/api/auth/refresh`,
  session: `${baseUrl}/api/auth/session`,
  mfaVerify: `${baseUrl}/api/auth/mfa/verify`,

  // User
  settings: `${baseUrl}/api/user/settings`,
  preferences: `${baseUrl}/api/user/preferences`,

  // Security
  shieldHealth: `${baseUrl}/api/security/shield/health`,
  networkDevices: `${baseUrl}/api/security/network/devices`,
  alerts: `${baseUrl}/api/security/alerts`,
  pentagonList: `${baseUrl}/api/security/pentagon/list`,
  shieldScan: `${baseUrl}/api/security/shield/scan`,
  auditChain: `${baseUrl}/api/security/audit/chain`,

  // AI
  aiChat: `${baseUrl}/api/ai/chat`,
  aiStream: `${baseUrl}/api/ai/stream`,

  // NFC
  nfcVerify: `${baseUrl}/api/auth/nfc/verify`,

  // Notifications
  pushRegister: `${baseUrl}/api/notifications/register`,
  pushUnregister: `${baseUrl}/api/notifications/unregister`,
});

// App configuration
const getAppConfig = () => ({
  name: Constants.expoConfig?.name || 'GENESIS',
  version: Constants.expoConfig?.version || '2.0.0',
  slug: Constants.expoConfig?.slug || 'genesis-sovereign',

  // Feature flags
  features: {
    biometrics: true,
    nfc: true,
    pushNotifications: true,
    aiAssistant: true,
    documentSigning: true,
    offlineMode: true,
  },

  // Notification configuration
  notifications: {
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID || 'genesis-sovereign-2024',
    channels: {
      security: { name: 'Security Alerts', importance: 5 },
      mfa: { name: 'MFA Requests', importance: 5 },
      system: { name: 'System Updates', importance: 3 },
    },
  },
});

// Build the configuration
let cachedConfig: ReturnType<typeof buildConfig> | null = null;

const buildConfig = () => {
  const apiBaseUrl = getApiBaseUrl();

  return {
    env: {
      isDevelopment,
      isProduction,
    },
    api: {
      baseUrl: apiBaseUrl,
      timeout: 30000, // 30 seconds
      retryAttempts: 3,
      retryDelay: 1000,
    },
    endpoints: getEndpoints(apiBaseUrl),
    security: getSecurityConfig(),
    app: getAppConfig(),
  };
};

// Export singleton config
export const getConfig = () => {
  if (!cachedConfig) {
    cachedConfig = buildConfig();
  }
  return cachedConfig;
};

// Export individual sections for convenience
export const config = getConfig();
export const { endpoints, security, app, api, env } = config;

// Type exports
export type Config = ReturnType<typeof buildConfig>;
export type Endpoints = ReturnType<typeof getEndpoints>;
export type SecurityConfig = ReturnType<typeof getSecurityConfig>;
export type AppConfig = ReturnType<typeof getAppConfig>;

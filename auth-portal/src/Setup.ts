/**
 * Setup.ts - Configuration initialization for Auth Portal
 *
 * Loads DefaultSettings.ts, then applies LocalSettings.ts overrides.
 * Follows MediaWiki's includes/Setup.php pattern.
 *
 * @see Manual:LocalSettings.php
 * @see includes/Setup.php
 */

import { getDefaultSettings } from './DefaultSettings';
import type { Settings, LocalSettings } from './types';

// ============================================================================
// Global Configuration
// ============================================================================

let config: Settings | null = null;
let initialized = false;

// ============================================================================
// Setup Functions
// ============================================================================

/**
 * Initialize Auth Portal configuration
 *
 * This function:
 * 1. Loads default settings from DefaultSettings.ts
 * 2. Attempts to load LocalSettings.ts overrides
 * 3. Validates required settings
 * 4. Sets up global state
 *
 * @throws Error if required settings are missing
 */
export async function initializeConfig(): Promise<Settings> {
  if (initialized && config) {
    return config;
  }

  // 1. Start with default settings
  config = getDefaultSettings();

  // 2. Try to load LocalSettings
  try {
    const localSettingsPath = process.env.AUTH_PORTAL_LOCAL_SETTINGS || '../LocalSettings';
    const localSettings = await import(localSettingsPath);
    applyLocalSettings(localSettings.default || localSettings);
  } catch (error) {
    // LocalSettings not found - use defaults (development mode)
    if (process.env.NODE_ENV === 'production') {
      console.error('Warning: LocalSettings.ts not found. Using defaults.');
    }
  }

  // 3. Apply environment variable overrides
  applyEnvironmentOverrides();

  // 4. Validate required settings
  validateSettings();

  // 5. Mark as initialized
  initialized = true;

  return config;
}

/**
 * Apply LocalSettings overrides to configuration
 */
function applyLocalSettings(localSettings: LocalSettings): void {
  if (!config) return;

  // Map LocalSettings variables to config properties
  const mapping: Array<[keyof LocalSettings, keyof Settings]> = [
    ['wgSecretKey', 'secretKey'],
    ['wgSiteName', 'siteName'],
    ['wgServer', 'server'],
    ['wgDBtype', 'dbType'],
    ['wgSQLiteDataDir', 'sqliteDataDir'],
    ['wgDBserver', 'dbServer'],
    ['wgDBname', 'dbName'],
    ['wgDBuser', 'dbUser'],
    ['wgDBpassword', 'dbPassword'],
    ['wgMainCacheType', 'mainCacheType'],
    ['wgMemCachedServers', 'memcachedServers'],
    ['wgRedisServers', 'redisServers'],
    ['wgEnableEmail', 'enableEmail'],
    ['wgSMTP', 'smtp'],
    ['wgEmergencyContact', 'emergencyContact'],
    ['wgPasswordSender', 'passwordSender'],
    ['wgEPREnabledDefault', 'eprEnabledDefault'],
    ['wgCookieSecure', 'cookieSecure'],
    ['wgPasswordHashAlgorithm', 'passwordHashAlgorithm'],
    ['wgAuditLogEnabled', 'auditLogEnabled'],
    ['wgAllowAccountCreation', 'allowAccountCreation'],
    ['wgEmailConfirmToEdit', 'emailConfirmToEdit'],
    ['wgLanguageCode', 'languageCode'],
  ];

  for (const [localKey, configKey] of mapping) {
    if (localSettings[localKey] !== undefined) {
      (config as Record<string, unknown>)[configKey] = localSettings[localKey];
    }
  }

  // Merge group permissions (don't replace entirely)
  if (localSettings.wgGroupPermissions) {
    config.groupPermissions = mergeDeep(
      config.groupPermissions,
      localSettings.wgGroupPermissions
    );
  }

  // Merge hooks
  if (localSettings.wgHooks) {
    for (const [hookName, handlers] of Object.entries(localSettings.wgHooks)) {
      if (!config.hooks[hookName]) {
        config.hooks[hookName] = [];
      }
      config.hooks[hookName].push(...handlers);
    }
  }

  // Load balancer configuration
  if (localSettings.wgLBFactoryConf) {
    config.lbFactoryConf = localSettings.wgLBFactoryConf;
  }
}

/**
 * Apply environment variable overrides
 */
function applyEnvironmentOverrides(): void {
  if (!config) return;

  const env = process.env;

  // Database
  if (env.DATABASE_URL) {
    const url = new URL(env.DATABASE_URL);
    if (url.protocol.startsWith('sqlite')) {
      config.dbType = 'sqlite';
      config.sqliteDataDir = url.pathname;
    } else if (url.protocol.startsWith('mysql')) {
      config.dbType = 'mysql';
      config.dbServer = url.hostname;
      config.dbName = url.pathname.slice(1);
      config.dbUser = url.username;
      config.dbPassword = url.password;
    } else if (url.protocol.startsWith('postgres')) {
      config.dbType = 'postgres';
      config.dbServer = url.hostname;
      config.dbName = url.pathname.slice(1);
      config.dbUser = url.username;
      config.dbPassword = url.password;
    }
  }

  // Session
  if (env.SESSION_SECRET) {
    config.secretKey = env.SESSION_SECRET;
  }
  if (env.SESSION_EXPIRY) {
    config.sessionExpiry = parseInt(env.SESSION_EXPIRY, 10);
  }

  // SMTP
  if (env.SMTP_HOST) {
    config.smtp = {
      host: env.SMTP_HOST,
      port: parseInt(env.SMTP_PORT || '587', 10),
      secure: env.SMTP_SECURE === 'true',
      ...(env.SMTP_USER && env.SMTP_PASS && {
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      }),
    };
  }

  // Rate limits
  if (env.PASSWORD_RESET_RATE_LIMIT_MAX) {
    config.passwordResetRateLimit.max = parseInt(env.PASSWORD_RESET_RATE_LIMIT_MAX, 10);
  }
  if (env.LOGIN_RATE_LIMIT_MAX) {
    config.loginRateLimit.max = parseInt(env.LOGIN_RATE_LIMIT_MAX, 10);
  }

  // Features
  if (env.EPR_ENABLED_DEFAULT) {
    config.eprEnabledDefault = env.EPR_ENABLED_DEFAULT === 'true';
  }
  if (env.AUDIT_LOG_ENABLED) {
    config.auditLogEnabled = env.AUDIT_LOG_ENABLED === 'true';
  }

  // Environment
  if (env.NODE_ENV === 'production') {
    config.environment = 'production';
    config.showExceptionDetails = false;
    config.debugMode = false;
  } else if (env.NODE_ENV === 'test') {
    config.environment = 'test';
  }
}

/**
 * Validate required settings
 */
function validateSettings(): void {
  if (!config) return;

  const errors: string[] = [];

  // Secret key is required in production
  if (config.environment === 'production') {
    if (!config.secretKey || config.secretKey.length < 32) {
      errors.push('wgSecretKey must be at least 32 characters in production');
    }

    if (!config.cookieSecure) {
      console.warn('Warning: wgCookieSecure should be true in production (HTTPS)');
    }
  }

  // Database validation
  if (config.dbType !== 'sqlite') {
    if (!config.dbServer) {
      errors.push('wgDBserver is required for MySQL/PostgreSQL');
    }
    if (!config.dbName) {
      errors.push('wgDBname is required for MySQL/PostgreSQL');
    }
  }

  if (errors.length > 0) {
    throw new Error('Configuration errors:\n' + errors.join('\n'));
  }
}

/**
 * Deep merge objects
 */
function mergeDeep<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      sourceValue !== undefined &&
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      result[key] = mergeDeep(targetValue as object, sourceValue as object) as T[keyof T];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

// ============================================================================
// Getters
// ============================================================================

/**
 * Get the current configuration
 *
 * @throws Error if not initialized
 */
export function getConfig(): Settings {
  if (!config || !initialized) {
    throw new Error(
      'Configuration not initialized. Call initializeConfig() first.'
    );
  }
  return config;
}

/**
 * Get configuration, initializing if needed
 */
export async function getConfigAsync(): Promise<Settings> {
  if (!config || !initialized) {
    return initializeConfig();
  }
  return config;
}

/**
 * Check if configuration is initialized
 */
export function isInitialized(): boolean {
  return initialized;
}

// ============================================================================
// MediaWiki-style Global Functions
// ============================================================================

/**
 * Get a configuration value
 * Mimics MediaWiki's wfGetConfig pattern
 */
export function wfGetConfig<K extends keyof Settings>(key: K): Settings[K] {
  return getConfig()[key];
}

/**
 * Get site name
 */
export function wfSiteName(): string {
  return getConfig().siteName;
}

/**
 * Get server URL
 */
export function wfServer(): string {
  return getConfig().server;
}

/**
 * Check if in production
 */
export function wfIsProduction(): boolean {
  return getConfig().environment === 'production';
}

/**
 * Check debug mode
 */
export function wfDebugMode(): boolean {
  return getConfig().debugMode;
}

// ============================================================================
// Reset (for testing)
// ============================================================================

/**
 * Reset configuration (for testing only)
 */
export function resetConfig(): void {
  config = null;
  initialized = false;
}

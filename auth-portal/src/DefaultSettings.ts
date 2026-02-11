/**
 * DefaultSettings.ts - Default configuration for Auth Portal
 *
 * This file defines all configuration variables with their default values.
 * DO NOT modify this file directly. Instead, create a LocalSettings.ts file
 * and override the values you need.
 *
 * @see Manual:Configuration settings
 * @see LocalSettings.ts.example
 */

import type { Settings, DatabaseConfig, SmtpConfig, CacheConfig } from './types';

// ============================================================================
// Core Settings
// ============================================================================

/**
 * Name of the site (appears in emails and UI)
 */
export const wgSiteName = 'Auth Portal';

/**
 * Base URL for the site
 */
export const wgServer = 'http://localhost:3000';

/**
 * Path to the script directory
 */
export const wgScriptPath = '/w';

/**
 * Environment mode
 */
export const wgEnvironment: 'development' | 'production' | 'test' = 'development';

/**
 * Debug mode - enables verbose logging
 */
export const wgDebugMode = false;

/**
 * Show exception details to users (disable in production)
 */
export const wgShowExceptionDetails = true;

// ============================================================================
// Database Settings
// ============================================================================

/**
 * Database type: 'sqlite' | 'mysql' | 'postgres'
 */
export const wgDBtype: 'sqlite' | 'mysql' | 'postgres' = 'sqlite';

/**
 * Database server hostname
 */
export const wgDBserver = 'localhost';

/**
 * Database name
 */
export const wgDBname = 'auth_portal';

/**
 * Database username
 */
export const wgDBuser = '';

/**
 * Database password
 */
export const wgDBpassword = '';

/**
 * SQLite database path (for SQLite only)
 */
export const wgSQLiteDataDir = './data';

/**
 * Database table prefix
 */
export const wgDBprefix = '';

/**
 * Database connection options
 */
export const wgDBservers: DatabaseConfig[] = [];

/**
 * Load balancer configuration for read replicas
 * Format: [{ host, weight, type: 'primary'|'replica' }]
 */
export const wgLBFactoryConf = {
  class: 'LBFactorySingle',
  servers: [] as Array<{ host: string; weight: number; type: 'primary' | 'replica' }>,
};

// ============================================================================
// Cache Settings
// ============================================================================

/**
 * Main cache type: 'none' | 'db' | 'memcached' | 'redis' | 'apcu'
 */
export const wgMainCacheType: CacheConfig['type'] = 'none';

/**
 * Message cache type (for i18n messages)
 */
export const wgMessageCacheType: CacheConfig['type'] = 'none';

/**
 * Parser cache type
 */
export const wgParserCacheType: CacheConfig['type'] = 'none';

/**
 * Session cache type
 */
export const wgSessionCacheType: CacheConfig['type'] = 'db';

/**
 * Memcached servers
 */
export const wgMemCachedServers: string[] = [];

/**
 * Redis server configuration
 */
export const wgRedisServers: string[] = [];

/**
 * Object cache expiry time in seconds
 */
export const wgObjectCacheExpiry = 86400; // 24 hours

// ============================================================================
// Session Settings
// ============================================================================

/**
 * Session secret key - MUST be overridden in LocalSettings
 */
export const wgSecretKey = '';

/**
 * Session cookie name
 */
export const wgSessionName = 'auth_portal_session';

/**
 * Session expiry time in seconds
 */
export const wgSessionExpiry = 86400; // 24 hours

/**
 * Extended session expiry ("Keep me logged in")
 */
export const wgExtendedSessionExpiry = 2592000; // 30 days

/**
 * Secure cookies (HTTPS only)
 */
export const wgCookieSecure = false;

/**
 * Cookie domain
 */
export const wgCookieDomain = '';

/**
 * Cookie path
 */
export const wgCookiePath = '/';

// ============================================================================
// Email Settings
// ============================================================================

/**
 * Enable email features
 */
export const wgEnableEmail = true;

/**
 * SMTP server configuration
 */
export const wgSMTP: SmtpConfig | false = false;

/**
 * Email from address
 */
export const wgEmergencyContact = 'noreply@localhost';

/**
 * Password sender email
 */
export const wgPasswordSender = 'noreply@localhost';

/**
 * Password reset expiry in seconds
 */
export const wgPasswordResetExpiry = 3600; // 1 hour

/**
 * Enable user-to-user email
 */
export const wgEnableUserEmail = false;

// ============================================================================
// User Settings
// ============================================================================

/**
 * Minimum username length
 */
export const wgMinUsernameLength = 3;

/**
 * Maximum username length
 */
export const wgMaxUsernameLength = 30;

/**
 * Minimum password length
 */
export const wgMinPasswordLength = 8;

/**
 * Reserved usernames that cannot be registered
 */
export const wgReservedUsernames: string[] = [
  'Admin',
  'Administrator',
  'MediaWiki',
  'System',
  'Root',
  'Sysop',
];

/**
 * Require email confirmation for new accounts
 */
export const wgEmailConfirmToEdit = false;

/**
 * Allow account creation
 */
export const wgAllowAccountCreation = true;

// ============================================================================
// Security Settings
// ============================================================================

/**
 * Enable Enhanced Password Reset (EPR) by default for new users
 */
export const wgEPREnabledDefault = false;

/**
 * Rate limit for password reset requests (per IP)
 */
export const wgPasswordResetRateLimit = {
  window: 900,  // 15 minutes
  max: 5,
};

/**
 * Rate limit for login attempts (per IP)
 */
export const wgLoginRateLimit = {
  window: 900,  // 15 minutes
  max: 10,
};

/**
 * Rate limit for account creation (per IP)
 */
export const wgAccountCreationRateLimit = {
  window: 3600, // 1 hour
  max: 3,
};

/**
 * Auto-lock accounts after N failed login attempts
 */
export const wgAutoLockAttempts = 0; // 0 = disabled

/**
 * Enable audit logging
 */
export const wgAuditLogEnabled = true;

/**
 * Password hashing algorithm: 'mw-b' | 'bcrypt' | 'argon2'
 */
export const wgPasswordHashAlgorithm: 'mw-b' | 'bcrypt' | 'argon2' = 'mw-b';

// ============================================================================
// User Group Permissions
// ============================================================================

/**
 * Permission definitions by group
 * Follows MediaWiki's $wgGroupPermissions pattern
 */
export const wgGroupPermissions: Record<string, Record<string, boolean>> = {
  // Everyone (including anonymous)
  '*': {
    read: true,
    createaccount: true,
  },
  // All registered users
  user: {
    read: true,
    edit: true,
    changepassword: true,
  },
  // Sysops (administrators)
  sysop: {
    read: true,
    edit: true,
    changepassword: true,
    deleteuser: true,
    lockuser: true,
    viewauditlog: true,
    editinterface: true,
  },
  // Bureaucrats
  bureaucrat: {
    read: true,
    edit: true,
    changepassword: true,
    deleteuser: true,
    lockuser: true,
    viewauditlog: true,
    editinterface: true,
    userrights: true,
    createadmin: true,
  },
};

/**
 * Implicit groups (auto-assigned)
 */
export const wgImplicitGroups = ['*', 'user'];

// ============================================================================
// Language Settings
// ============================================================================

/**
 * Default site language
 */
export const wgLanguageCode = 'en';

/**
 * Language fallback chain
 * If a message isn't available in the chosen language, try these
 */
export const wgLanguageFallbackChain: Record<string, string[]> = {
  // Iberian
  'ca': ['es', 'en'],
  'gl': ['es', 'en'],
  'pt': ['es', 'en'],
  'pt-br': ['pt', 'es', 'en'],
  // Germanic
  'de-at': ['de', 'en'],
  'de-ch': ['de', 'en'],
  'lb': ['de', 'fr', 'en'],
  'nl': ['de', 'en'],
  'fy': ['nl', 'en'],
  // Romance
  'fr': ['en'],
  'it': ['fr', 'en'],
  'ro': ['fr', 'en'],
  // Slavic
  'be': ['ru', 'en'],
  'uk': ['ru', 'en'],
  'cs': ['sk', 'en'],
  'sk': ['cs', 'en'],
  'pl': ['en'],
  'ru': ['en'],
  // Asian
  'zh-hans': ['zh', 'en'],
  'zh-hant': ['zh', 'en'],
  'zh-tw': ['zh-hant', 'zh', 'en'],
  'zh-hk': ['zh-hant', 'zh', 'en'],
  'ja': ['en'],
  'ko': ['en'],
  'vi': ['en'],
  // Celtic
  'br': ['fr', 'en'],
  'cy': ['en'],
  'ga': ['en'],
  // Other
  'tr': ['en'],
  'ar': ['en'],
  'he': ['en'],
  'id': ['en'],
};

/**
 * RTL (right-to-left) languages
 */
export const wgRTLLanguages = ['ar', 'he', 'fa', 'ur', 'yi', 'ps', 'sd'];

// ============================================================================
// UI Settings
// ============================================================================

/**
 * Default skin
 */
export const wgDefaultSkin = 'vector';

/**
 * Available themes
 */
export const wgAvailableThemes = ['light', 'dark', 'auto'];

/**
 * Default theme
 */
export const wgDefaultTheme = 'auto';

/**
 * Available text sizes
 */
export const wgAvailableTextSizes = ['standard', 'medium', 'large'];

/**
 * Default text size
 */
export const wgDefaultTextSize = 'standard';

// ============================================================================
// Hooks
// ============================================================================

/**
 * Global hooks configuration
 * Extensions register their hooks here
 */
export const wgHooks: Record<string, Array<(...args: unknown[]) => boolean | void | Promise<boolean | void>>> = {};

// ============================================================================
// Extensions
// ============================================================================

/**
 * Loaded extensions
 */
export const wgExtensionCredits: Record<string, Array<{
  name: string;
  version?: string;
  author?: string;
  description?: string;
  url?: string;
}>> = {
  other: [],
  api: [],
  antispam: [],
  parserhook: [],
  skin: [],
};

// ============================================================================
// Export aggregated settings object
// ============================================================================

export function getDefaultSettings(): Settings {
  return {
    // Core
    siteName: wgSiteName,
    server: wgServer,
    scriptPath: wgScriptPath,
    environment: wgEnvironment,
    debugMode: wgDebugMode,
    showExceptionDetails: wgShowExceptionDetails,

    // Database
    dbType: wgDBtype,
    dbServer: wgDBserver,
    dbName: wgDBname,
    dbUser: wgDBuser,
    dbPassword: wgDBpassword,
    sqliteDataDir: wgSQLiteDataDir,
    dbPrefix: wgDBprefix,
    lbFactoryConf: wgLBFactoryConf,

    // Cache
    mainCacheType: wgMainCacheType,
    messageCacheType: wgMessageCacheType,
    parserCacheType: wgParserCacheType,
    sessionCacheType: wgSessionCacheType,
    memcachedServers: wgMemCachedServers,
    redisServers: wgRedisServers,
    objectCacheExpiry: wgObjectCacheExpiry,

    // Session
    secretKey: wgSecretKey,
    sessionName: wgSessionName,
    sessionExpiry: wgSessionExpiry,
    extendedSessionExpiry: wgExtendedSessionExpiry,
    cookieSecure: wgCookieSecure,
    cookieDomain: wgCookieDomain,
    cookiePath: wgCookiePath,

    // Email
    enableEmail: wgEnableEmail,
    smtp: wgSMTP,
    emergencyContact: wgEmergencyContact,
    passwordSender: wgPasswordSender,
    passwordResetExpiry: wgPasswordResetExpiry,
    enableUserEmail: wgEnableUserEmail,

    // User
    minUsernameLength: wgMinUsernameLength,
    maxUsernameLength: wgMaxUsernameLength,
    minPasswordLength: wgMinPasswordLength,
    reservedUsernames: wgReservedUsernames,
    emailConfirmToEdit: wgEmailConfirmToEdit,
    allowAccountCreation: wgAllowAccountCreation,

    // Security
    eprEnabledDefault: wgEPREnabledDefault,
    passwordResetRateLimit: wgPasswordResetRateLimit,
    loginRateLimit: wgLoginRateLimit,
    accountCreationRateLimit: wgAccountCreationRateLimit,
    autoLockAttempts: wgAutoLockAttempts,
    auditLogEnabled: wgAuditLogEnabled,
    passwordHashAlgorithm: wgPasswordHashAlgorithm,

    // Permissions
    groupPermissions: wgGroupPermissions,
    implicitGroups: wgImplicitGroups,

    // Language
    languageCode: wgLanguageCode,
    languageFallbackChain: wgLanguageFallbackChain,
    rtlLanguages: wgRTLLanguages,

    // UI
    defaultSkin: wgDefaultSkin,
    availableThemes: wgAvailableThemes,
    defaultTheme: wgDefaultTheme,
    availableTextSizes: wgAvailableTextSizes,
    defaultTextSize: wgDefaultTextSize,

    // Hooks
    hooks: wgHooks,

    // Extensions
    extensionCredits: wgExtensionCredits,
  };
}

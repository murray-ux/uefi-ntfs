/**
 * Auth Portal - Main Entry Point
 *
 * Unified export for the Wikimedia-style authentication system.
 * This module brings together all components:
 *
 * - ActionEntryPoint: Request routing and action handling
 * - Authentication: Login, account creation, password reset
 * - Session Management: Token validation and user sessions
 * - Hooks: Extensibility system
 * - Configuration: Setup and settings
 * - Caching: Object cache layer
 * - i18n: Multi-language support
 *
 * @example
 * ```typescript
 * import { processRequest, login, createAccount } from './auth-portal';
 *
 * // Process a web request
 * const response = await processRequest({
 *   action: 'submit',
 *   title: 'login',
 *   username: 'user',
 *   password: 'pass',
 *   ip: '127.0.0.1',
 * });
 *
 * // Direct authentication
 * const result = await login('user', 'pass');
 * ```
 */

// ============================================================================
// Core Request Processing
// ============================================================================

export {
  ActionEntryPoint,
  processRequest,
  registerAction,
  getAction,
  type ActionHandler,
} from './ActionEntryPoint';

// ============================================================================
// Authentication Functions
// ============================================================================

export {
  login,
  createAccount,
  requestPasswordReset,
  completePasswordReset,
  updatePreferences,
  confirmEmail,
  validateSession,
  logout,
  getUsernamesByEmail,
} from './auth';

// ============================================================================
// Types
// ============================================================================

export type {
  // User types
  User,
  UserPreferences,
  AuthResult,
  PasswordResetResult,
  PasswordResetRequest,

  // Configuration types
  Settings,
  LocalSettings,
  DatabaseConfig,
  SmtpConfig,
  CacheConfig,
  RateLimitConfig,

  // Request/Response types
  ActionType,
  WebRequest,
  WebResponse,

  // Database types
  DBServer,
  LoadBalancerState,

  // Cache types
  ObjectCache,
  CacheEntry,

  // Session types
  Session,

  // i18n types
  Language,
  Message,
  MessageCache,

  // Hook types
  HookRegistry,
} from './types';

export {
  SUPPORTED_LANGUAGES,
  DEFAULT_PREFERENCES,
} from './types';

// ============================================================================
// Hooks System
// ============================================================================

export { Hooks } from './Hooks';

// ============================================================================
// Configuration
// ============================================================================

export {
  getConfig,
  getConfigAsync,
  initializeConfig,
  isInitialized,
  wfGetConfig,
  wfSiteName,
  wfServer,
  wfIsProduction,
  wfDebugMode,
  resetConfig,
} from './Setup';

export { getDefaultSettings } from './DefaultSettings';

// ============================================================================
// Caching
// ============================================================================

export {
  BagOStuff,
  HashBagOStuff,
  SqlBagOStuff,
  MemcachedBagOStuff,
  RedisBagOStuff,
  APCuBagOStuff,
  EmptyBagOStuff,
  ObjectCacheFactory,
  wfGetMainCache,
  wfGetCached,
  wfInvalidateCache,
} from './cache/ObjectCache';

// ============================================================================
// i18n / Internationalization
// ============================================================================

export {
  MessageCache,
  MessageBuilder,
  wfMessage,
  wfMsg,
  processPlural,
  processGender,
  processGrammar,
  isRTL,
  getDirection,
  getFallbackLanguages,
} from './i18n/MessageCache';

// ============================================================================
// Database (Load Balancer)
// ============================================================================

export {
  LoadBalancer,
  ChronologyProtector,
  getLoadBalancer,
  resetLoadBalancer,
  wfGetDB,
  wfGetPrimaryDB,
  wfGetReplicaDB,
  type DBConnection,
  type QueryResult,
} from './db/LoadBalancer';

// ============================================================================
// Quick Start Utilities
// ============================================================================

/**
 * Initialize the Auth Portal with default settings.
 * Call this before processing any requests.
 *
 * @example
 * ```typescript
 * import { initAuthPortal, processRequest } from './auth-portal';
 *
 * // Initialize with defaults
 * await initAuthPortal();
 *
 * // The portal will load settings from:
 * // 1. DefaultSettings.ts (defaults)
 * // 2. LocalSettings.ts (overrides)
 * // 3. Environment variables
 * ```
 */
export async function initAuthPortal(): Promise<void> {
  const { initializeConfig } = await import('./Setup');
  await initializeConfig();

  // Register default hooks
  const { Hooks } = await import('./Hooks');

  // Audit logging hook
  Hooks.register('UserLoginComplete', async (user) => {
    console.log(`[Auth] User logged in: ${user.username}`);
  });

  Hooks.register('UserLoginFailed', async (username, reason) => {
    console.log(`[Auth] Login failed for ${username}: ${reason}`);
  });

  Hooks.register('AccountCreated', async (user) => {
    console.log(`[Auth] Account created: ${user.username}`);
  });

  Hooks.register('PasswordResetComplete', async (userId) => {
    console.log(`[Auth] Password reset requested: ${userId}`);
  });
}

// ============================================================================
// Version Info
// ============================================================================

export const VERSION = '1.0.0';
export const CODENAME = 'Wikimedia-Style Auth Portal';

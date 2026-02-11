/**
 * Auth Portal - Type Definitions
 * Mirroring Wikimedia Commons authentication patterns
 */

export interface User {
  id: string;
  username: string;
  email?: string;
  emailConfirmed: boolean;
  createdAt: Date;
  preferences: UserPreferences;
}

export interface UserPreferences {
  language: string;
  theme: 'light' | 'dark' | 'auto';
  textSize: 'standard' | 'medium' | 'large';
  expandSections: boolean;
  enhancedPasswordReset: boolean;  // EPR - require both username AND email
  emailNotifications: boolean;
}

export interface PasswordResetRequest {
  username?: string;
  email?: string;
  timestamp: Date;
  token: string;
  used: boolean;
  expiresAt: Date;
}

export interface AuthResult {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
  requiresEmailConfirmation?: boolean;
}

export interface PasswordResetResult {
  success: boolean;
  message: string;
  // Always show success for privacy - never reveal if account exists
  privacyProtected: true;
}

export type Language = {
  code: string;
  name: string;
  nativeName: string;
};

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'español' },
  { code: 'fr', name: 'French', nativeName: 'français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'pt', name: 'Portuguese', nativeName: 'português' },
  { code: 'ru', name: 'Russian', nativeName: 'русский' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'it', name: 'Italian', nativeName: 'italiano' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'sv', name: 'Swedish', nativeName: 'svenska' },
  { code: 'pl', name: 'Polish', nativeName: 'polski' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
];

export const DEFAULT_PREFERENCES: UserPreferences = {
  language: 'en',
  theme: 'light',
  textSize: 'standard',
  expandSections: false,
  enhancedPasswordReset: false,
  emailNotifications: true,
};

// ============================================================================
// Configuration Types (MediaWiki-style)
// ============================================================================

export interface DatabaseConfig {
  host: string;
  port?: number;
  database: string;
  user?: string;
  password?: string;
  type: 'sqlite' | 'mysql' | 'postgres';
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

export interface CacheConfig {
  type: 'none' | 'db' | 'memcached' | 'redis' | 'apcu';
  servers?: string[];
  expiry?: number;
}

export interface RateLimitConfig {
  window: number;  // seconds
  max: number;     // max requests in window
}

export interface Settings {
  // Core
  siteName: string;
  server: string;
  scriptPath: string;
  environment: 'development' | 'production' | 'test';
  debugMode: boolean;
  showExceptionDetails: boolean;

  // Database
  dbType: 'sqlite' | 'mysql' | 'postgres';
  dbServer: string;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  sqliteDataDir: string;
  dbPrefix: string;
  lbFactoryConf: {
    class: string;
    servers: Array<{ host: string; weight: number; type: 'primary' | 'replica' }>;
  };

  // Cache
  mainCacheType: CacheConfig['type'];
  messageCacheType: CacheConfig['type'];
  parserCacheType: CacheConfig['type'];
  sessionCacheType: CacheConfig['type'];
  memcachedServers: string[];
  redisServers: string[];
  objectCacheExpiry: number;

  // Session
  secretKey: string;
  sessionName: string;
  sessionExpiry: number;
  extendedSessionExpiry: number;
  cookieSecure: boolean;
  cookieDomain: string;
  cookiePath: string;

  // Email
  enableEmail: boolean;
  smtp: SmtpConfig | false;
  emergencyContact: string;
  passwordSender: string;
  passwordResetExpiry: number;
  enableUserEmail: boolean;

  // User
  minUsernameLength: number;
  maxUsernameLength: number;
  minPasswordLength: number;
  reservedUsernames: string[];
  emailConfirmToEdit: boolean;
  allowAccountCreation: boolean;

  // Security
  eprEnabledDefault: boolean;
  passwordResetRateLimit: RateLimitConfig;
  loginRateLimit: RateLimitConfig;
  accountCreationRateLimit: RateLimitConfig;
  autoLockAttempts: number;
  auditLogEnabled: boolean;
  passwordHashAlgorithm: 'mw-b' | 'bcrypt' | 'argon2';

  // Permissions
  groupPermissions: Record<string, Record<string, boolean>>;
  implicitGroups: string[];

  // Language
  languageCode: string;
  languageFallbackChain: Record<string, string[]>;
  rtlLanguages: string[];

  // UI
  defaultSkin: string;
  availableThemes: string[];
  defaultTheme: string;
  availableTextSizes: string[];
  defaultTextSize: string;

  // Hooks
  hooks: Record<string, Array<(...args: unknown[]) => boolean | void | Promise<boolean | void>>>;

  // Extensions
  extensionCredits: Record<string, Array<{
    name: string;
    version?: string;
    author?: string;
    description?: string;
    url?: string;
  }>>;
}

export interface LocalSettings {
  wgSecretKey: string;
  wgSiteName?: string;
  wgServer?: string;
  wgEnvironment?: string;
  wgDBtype?: string;
  wgSQLiteDataDir?: string;
  wgDBserver?: string;
  wgDBname?: string;
  wgDBuser?: string;
  wgDBpassword?: string;
  wgLBFactoryConf?: Settings['lbFactoryConf'];
  wgMainCacheType?: string;
  wgMemCachedServers?: string[];
  wgRedisServers?: string[];
  wgEnableEmail?: boolean;
  wgSMTP?: SmtpConfig | false;
  wgEmergencyContact?: string;
  wgPasswordSender?: string;
  wgEPREnabledDefault?: boolean;
  wgCookieSecure?: boolean;
  wgPasswordHashAlgorithm?: string;
  wgAuditLogEnabled?: boolean;
  wgAllowAccountCreation?: boolean;
  wgEmailConfirmToEdit?: boolean;
  wgLanguageCode?: string;
  wgGroupPermissions?: Record<string, Record<string, boolean>>;
  wgHooks?: Settings['hooks'];
}

// ============================================================================
// Action Types (MediaWiki-style entry points)
// ============================================================================

export type ActionType =
  | 'view'      // View a page (default)
  | 'edit'      // Edit a page
  | 'submit'    // Submit form (login, create, reset)
  | 'history'   // View history
  | 'delete'    // Delete (admin)
  | 'protect'   // Protect (admin)
  | 'watch'     // Watch a page
  | 'unwatch'   // Unwatch a page
  | 'purge'     // Purge cache
  | 'render'    // Raw render
  | 'raw';      // Raw content

export interface WebRequest {
  action: ActionType;
  title?: string;
  token?: string;
  returnto?: string;
  uselang?: string;
  usetheme?: string;
  // Form data
  username?: string;
  password?: string;
  email?: string;
  rememberMe?: boolean;
  // Preferences form data
  language?: string;
  theme?: string;
  textSize?: string;
  expandSections?: boolean;
  enhancedPasswordReset?: boolean;
  emailNotifications?: boolean;
  // Session
  sessionId?: string;
  // IP for rate limiting
  ip: string;
  // Headers
  userAgent?: string;
}

export interface WebResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  cookies?: Array<{
    name: string;
    value: string;
    options?: {
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: 'strict' | 'lax' | 'none';
      maxAge?: number;
      path?: string;
      domain?: string;
    };
  }>;
}

// ============================================================================
// Hook Types (MediaWiki-style extensibility)
// ============================================================================

export interface HookRegistry {
  // Authentication hooks
  'BeforeLogin': Array<(username: string, password: string) => boolean | Promise<boolean>>;
  'UserLoginComplete': Array<(user: User) => void | Promise<void>>;
  'UserLoginFailed': Array<(username: string, reason: string) => void | Promise<void>>;
  'BeforeLogout': Array<(user: User) => boolean | Promise<boolean>>;
  'UserLogoutComplete': Array<(userId: string) => void | Promise<void>>;

  // Account hooks
  'BeforeCreateAccount': Array<(username: string, email?: string) => boolean | Promise<boolean>>;
  'AccountCreated': Array<(user: User) => void | Promise<void>>;
  'BeforePasswordReset': Array<(username?: string, email?: string) => boolean | Promise<boolean>>;
  'PasswordResetComplete': Array<(userId: string) => void | Promise<void>>;
  'UserPreferencesSaved': Array<(user: User, prefs: UserPreferences) => void | Promise<void>>;

  // Request hooks
  'BeforeRequest': Array<(request: WebRequest) => boolean | Promise<boolean>>;
  'AfterRequest': Array<(request: WebRequest, response: WebResponse) => void | Promise<void>>;

  // Audit hooks
  'AuditLogEntry': Array<(action: string, userId: string | null, details: Record<string, unknown>) => void | Promise<void>>;

  // Cache hooks
  'CacheInvalidate': Array<(key: string) => void | Promise<void>>;

  // Output hooks
  'BeforePageDisplay': Array<(title: string, user: User | null) => void | Promise<void>>;
  'OutputPageBeforeHTML': Array<(html: string) => string | Promise<string>>;
}

// ============================================================================
// Database Load Balancer Types
// ============================================================================

export interface DBServer {
  host: string;
  port?: number;
  weight: number;
  type: 'primary' | 'replica';
  lag?: number;       // Replication lag in seconds
  available?: boolean;
}

export interface LoadBalancerState {
  primaryPosition?: string;  // For chronology protector
  selectedReplica?: string;
  writesPending: boolean;
}

// ============================================================================
// Object Cache Types
// ============================================================================

export interface ObjectCache {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown, expiry?: number): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<boolean>;
}

export interface CacheEntry {
  value: unknown;
  expiry: number;
  created: number;
}

// ============================================================================
// Session Types
// ============================================================================

export interface Session {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  data: Record<string, unknown>;
  // Chronology protector data
  primaryPosition?: string;
}

// ============================================================================
// Message/i18n Types
// ============================================================================

export interface Message {
  key: string;
  params?: Array<string | number>;
  language?: string;
}

export interface MessageCache {
  messages: Record<string, Record<string, string>>;  // lang -> key -> value
  documentation: Record<string, string>;              // key -> qqq docs
}

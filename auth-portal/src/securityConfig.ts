/**
 * Auth Portal - Security Configuration
 * Production-ready security defaults
 */

export interface SecurityConfig {
  // Session
  sessionSecret: string;
  sessionExpiry: number;
  extendedSessionExpiry: number;

  // Cookies
  cookieSecure: boolean;
  cookieSameSite: 'strict' | 'lax' | 'none';
  cookieDomain?: string;
  cookiePath: string;

  // Rate Limiting
  loginRateLimit: { window: number; max: number };
  passwordResetRateLimit: { window: number; max: number };
  accountCreationRateLimit: { window: number; max: number };

  // Headers
  enableHSTS: boolean;
  hstsMaxAge: number;
  enableCSP: boolean;
  cspReportUri?: string;

  // Password
  minPasswordLength: number;
  requirePasswordComplexity: boolean;

  // Error Handling
  showExceptionDetails: boolean;

  // CORS
  corsOrigins: string[];
}

// Validate required environment variables
function requireEnv(name: string, defaultValue?: string): string {
  const value = process.env[name] || defaultValue;
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

// Parse boolean environment variable
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

// Parse number environment variable
function parseNumber(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

// Load security configuration from environment
export function loadSecurityConfig(): SecurityConfig {
  const isProduction = process.env.NODE_ENV === 'production';

  // In production, enforce secure defaults
  if (isProduction) {
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
      throw new Error('Production requires SESSION_SECRET of at least 32 characters');
    }
    if (process.env.COOKIE_SECURE === 'false') {
      console.warn('WARNING: COOKIE_SECURE is false in production environment');
    }
    if (process.env.SHOW_EXCEPTION_DETAILS === 'true') {
      console.warn('WARNING: SHOW_EXCEPTION_DETAILS is true in production environment');
    }
  }

  return {
    // Session
    sessionSecret: requireEnv('SESSION_SECRET', isProduction ? undefined : 'dev-secret-change-in-production'),
    sessionExpiry: parseNumber(process.env.SESSION_EXPIRY, 86400), // 24 hours
    extendedSessionExpiry: parseNumber(process.env.EXTENDED_SESSION_EXPIRY, 2592000), // 30 days

    // Cookies
    cookieSecure: parseBoolean(process.env.COOKIE_SECURE, isProduction),
    cookieSameSite: (process.env.COOKIE_SAMESITE as 'strict' | 'lax' | 'none') || 'strict',
    cookieDomain: process.env.COOKIE_DOMAIN,
    cookiePath: process.env.COOKIE_PATH || '/',

    // Rate Limiting
    loginRateLimit: {
      window: parseNumber(process.env.LOGIN_RATE_WINDOW, 900), // 15 minutes
      max: parseNumber(process.env.LOGIN_RATE_MAX, 10),
    },
    passwordResetRateLimit: {
      window: parseNumber(process.env.RESET_RATE_WINDOW, 900),
      max: parseNumber(process.env.RESET_RATE_MAX, 5),
    },
    accountCreationRateLimit: {
      window: parseNumber(process.env.CREATE_RATE_WINDOW, 3600),
      max: parseNumber(process.env.CREATE_RATE_MAX, 3),
    },

    // Headers
    enableHSTS: parseBoolean(process.env.ENABLE_HSTS, isProduction),
    hstsMaxAge: parseNumber(process.env.HSTS_MAX_AGE, 31536000), // 1 year
    enableCSP: parseBoolean(process.env.ENABLE_CSP, true),
    cspReportUri: process.env.CSP_REPORT_URI,

    // Password
    minPasswordLength: parseNumber(process.env.MIN_PASSWORD_LENGTH, 8),
    requirePasswordComplexity: parseBoolean(process.env.REQUIRE_PASSWORD_COMPLEXITY, true),

    // Error Handling
    showExceptionDetails: parseBoolean(process.env.SHOW_EXCEPTION_DETAILS, !isProduction),

    // CORS
    corsOrigins: (process.env.CORS_ORIGINS || (isProduction ? '' : '*')).split(',').filter(Boolean),
  };
}

// Singleton instance
let _config: SecurityConfig | null = null;

export function getSecurityConfig(): SecurityConfig {
  if (!_config) {
    _config = loadSecurityConfig();
  }
  return _config;
}

// Validate configuration on startup
export function validateSecurityConfig(config: SecurityConfig): string[] {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (config.sessionSecret.length < 32) {
    errors.push('SESSION_SECRET should be at least 32 characters');
  }

  if (!config.cookieSecure && config.corsOrigins.some(o => o.startsWith('https'))) {
    warnings.push('COOKIE_SECURE is false but CORS allows HTTPS origins');
  }

  if (config.corsOrigins.includes('*')) {
    warnings.push('CORS allows all origins (*) - not recommended for production');
  }

  if (config.showExceptionDetails) {
    warnings.push('Exception details are exposed to clients');
  }

  if (config.minPasswordLength < 8) {
    warnings.push('Minimum password length is below recommended (8 characters)');
  }

  if (!config.enableHSTS) {
    warnings.push('HSTS is disabled - recommended for production');
  }

  if (!config.enableCSP) {
    warnings.push('Content Security Policy is disabled');
  }

  // Log warnings
  warnings.forEach(w => console.warn(`[Security] ${w}`));

  // Throw on errors
  if (errors.length > 0) {
    throw new Error(`Security configuration errors:\n${errors.join('\n')}`);
  }

  return warnings;
}

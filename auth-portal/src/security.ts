/**
 * Auth Portal - Security Module
 * Production-ready cryptographic functions and security utilities
 */

import * as crypto from 'crypto';

// ============================================================================
// Password Hashing (Production-ready PBKDF2)
// ============================================================================

const PBKDF2_ITERATIONS = 310000; // OWASP 2023 recommendation
const PBKDF2_KEY_LENGTH = 64;
const PBKDF2_ALGORITHM = 'sha512';
const SALT_LENGTH = 32;

/**
 * Hash a password using PBKDF2 with unique salt
 * Format: iterations:salt:hash (all base64)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_LENGTH);

  return new Promise((resolve, reject) => {
    crypto.pbkdf2(
      password,
      salt,
      PBKDF2_ITERATIONS,
      PBKDF2_KEY_LENGTH,
      PBKDF2_ALGORITHM,
      (err, derivedKey) => {
        if (err) {
          reject(err);
          return;
        }
        const hash = `${PBKDF2_ITERATIONS}:${salt.toString('base64')}:${derivedKey.toString('base64')}`;
        resolve(hash);
      }
    );
  });
}

/**
 * Verify a password against a stored hash
 * Uses constant-time comparison to prevent timing attacks
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [iterationsStr, saltBase64, hashBase64] = storedHash.split(':');
    const iterations = parseInt(iterationsStr, 10);
    const salt = Buffer.from(saltBase64, 'base64');
    const storedKey = Buffer.from(hashBase64, 'base64');

    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        password,
        salt,
        iterations,
        storedKey.length,
        PBKDF2_ALGORITHM,
        (err, derivedKey) => {
          if (err) {
            reject(err);
            return;
          }
          // Constant-time comparison
          resolve(crypto.timingSafeEqual(storedKey, derivedKey));
        }
      );
    });
  } catch {
    // Invalid hash format
    return false;
  }
}

// ============================================================================
// Token Generation
// ============================================================================

/**
 * Generate a cryptographically secure token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

/**
 * Generate a session token with timestamp
 */
export function generateSessionToken(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(24).toString('base64url');
  return `${timestamp}.${random}`;
}

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

// ============================================================================
// URL Validation (Open Redirect Prevention)
// ============================================================================

/**
 * Validate a redirect URL to prevent open redirects
 * Only allows same-origin or explicitly whitelisted URLs
 */
export function validateRedirectUrl(
  url: string,
  allowedHosts: string[] = []
): { valid: boolean; sanitized: string } {
  // Empty or missing URL defaults to home
  if (!url || url.trim() === '') {
    return { valid: true, sanitized: '/' };
  }

  // Reject javascript: and data: URLs
  const lowered = url.toLowerCase().trim();
  if (lowered.startsWith('javascript:') || lowered.startsWith('data:')) {
    return { valid: false, sanitized: '/' };
  }

  // Relative URLs are safe
  if (url.startsWith('/') && !url.startsWith('//')) {
    // Remove any dangerous characters
    const sanitized = url.replace(/[<>"'`]/g, '');
    return { valid: true, sanitized };
  }

  // Check absolute URLs
  try {
    const parsed = new URL(url);

    // Only allow http and https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, sanitized: '/' };
    }

    // Check against allowed hosts
    if (allowedHosts.length > 0) {
      const isAllowed = allowedHosts.some(
        host => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
      );
      if (!isAllowed) {
        return { valid: false, sanitized: '/' };
      }
    } else {
      // No whitelist means reject all absolute URLs
      return { valid: false, sanitized: '/' };
    }

    return { valid: true, sanitized: url };
  } catch {
    // Invalid URL
    return { valid: false, sanitized: '/' };
  }
}

// ============================================================================
// Security Headers
// ============================================================================

export const SECURITY_HEADERS = {
  // Prevent clickjacking
  'X-Frame-Options': 'SAMEORIGIN',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions policy (restrict browser features)
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',

  // Cross-origin policies
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

/**
 * Generate Content Security Policy header
 */
export function generateCSP(options: {
  nonce?: string;
  reportUri?: string;
} = {}): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self'${options.nonce ? ` 'nonce-${options.nonce}'` : ''}`,
    "style-src 'self' 'unsafe-inline'", // Required for inline styles
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "base-uri 'self'",
    "upgrade-insecure-requests",
  ];

  if (options.reportUri) {
    directives.push(`report-uri ${options.reportUri}`);
  }

  return directives.join('; ');
}

/**
 * Generate HSTS header
 */
export function generateHSTS(maxAge: number = 31536000, includeSubdomains: boolean = true): string {
  let header = `max-age=${maxAge}`;
  if (includeSubdomains) {
    header += '; includeSubDomains';
  }
  return header;
}

// ============================================================================
// Rate Limiting
// ============================================================================

interface RateLimitEntry {
  count: number;
  firstRequest: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check rate limit for an identifier (IP, user, etc.)
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now - entry.firstRequest > windowMs) {
    // New window
    rateLimitStore.set(identifier, { count: 1, firstRequest: now });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    };
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.firstRequest + windowMs,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.firstRequest + windowMs,
  };
}

/**
 * Clear old rate limit entries (run periodically)
 */
export function cleanupRateLimits(maxAgeMs: number = 3600000): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now - entry.firstRequest > maxAgeMs) {
      rateLimitStore.delete(key);
    }
  }
}

// ============================================================================
// Input Sanitization
// ============================================================================

/**
 * Escape HTML special characters
 */
export function escapeHtml(str: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;',
  };
  return str.replace(/[&<>"'`]/g, char => htmlEntities[char]);
}

/**
 * Sanitize a string for use in logs (remove sensitive patterns)
 */
export function sanitizeForLogging(str: string): string {
  // Remove potential tokens, passwords, etc.
  return str
    .replace(/password[=:]\s*\S+/gi, 'password=[REDACTED]')
    .replace(/token[=:]\s*\S+/gi, 'token=[REDACTED]')
    .replace(/secret[=:]\s*\S+/gi, 'secret=[REDACTED]')
    .replace(/api[_-]?key[=:]\s*\S+/gi, 'apikey=[REDACTED]');
}

// ============================================================================
// Audit Logging (Safe)
// ============================================================================

export enum AuditAction {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_COMPLETE = 'PASSWORD_RESET_COMPLETE',
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  SETTINGS_CHANGED = 'SETTINGS_CHANGED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  RATE_LIMITED = 'RATE_LIMITED',
}

/**
 * Log an audit event (safe - no sensitive data)
 */
export function auditLog(
  action: AuditAction,
  userId: string | null,
  metadata: Record<string, string | number | boolean> = {}
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    userId: userId ? `user:${userId.substring(0, 8)}...` : 'anonymous',
    ...metadata,
  };

  // In production: send to secure audit log service
  console.log(`[Audit] ${JSON.stringify(entry)}`);
}

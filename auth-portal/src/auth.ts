/**
 * Auth Portal - Core Authentication Logic
 * Privacy-first design following Wikimedia patterns
 */

import {
  User,
  UserPreferences,
  PasswordResetRequest,
  AuthResult,
  PasswordResetResult,
  DEFAULT_PREFERENCES,
} from './types';

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_PASSWORD_RESET_REQUESTS = 5;
const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// In-memory stores (replace with database in production)
const users = new Map<string, User & { passwordHash: string }>();
const passwordResetRequests = new Map<string, PasswordResetRequest[]>();
const sessions = new Map<string, { userId: string; expiresAt: Date }>();

/**
 * Generate a cryptographically secure token
 */
function generateToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    token += chars[randomValues[i] % chars.length];
  }
  return token;
}

/**
 * Simple hash function (use bcrypt/argon2 in production)
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'auth-portal-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a new user account
 */
export async function createAccount(
  username: string,
  password: string,
  email?: string
): Promise<AuthResult> {
  // Validate username
  if (!username || username.length < 3 || username.length > 30) {
    return { success: false, message: 'Username must be 3-30 characters' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { success: false, message: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }

  // Check if username exists (case-insensitive)
  const normalizedUsername = username.toLowerCase();
  for (const [, user] of users) {
    if (user.username.toLowerCase() === normalizedUsername) {
      return { success: false, message: 'Username already exists' };
    }
  }

  // Validate password
  if (!password || password.length < 8) {
    return { success: false, message: 'Password must be at least 8 characters' };
  }

  // Validate email if provided
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: 'Invalid email address format' };
  }

  const userId = generateToken(16);
  const passwordHash = await hashPassword(password);

  const user: User & { passwordHash: string } = {
    id: userId,
    username,
    email,
    emailConfirmed: false,
    createdAt: new Date(),
    preferences: { ...DEFAULT_PREFERENCES },
    passwordHash,
  };

  users.set(userId, user);

  // Create session
  const sessionToken = generateToken();
  sessions.set(sessionToken, {
    userId,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  });

  const { passwordHash: _, ...safeUser } = user;

  return {
    success: true,
    message: 'Account created successfully',
    user: safeUser,
    token: sessionToken,
    requiresEmailConfirmation: !!email,
  };
}

/**
 * Authenticate user with username and password
 */
export async function login(
  username: string,
  password: string
): Promise<AuthResult> {
  const passwordHash = await hashPassword(password);

  for (const [, user] of users) {
    if (user.username.toLowerCase() === username.toLowerCase()) {
      if (user.passwordHash === passwordHash) {
        // Create session
        const sessionToken = generateToken();
        sessions.set(sessionToken, {
          userId: user.id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        const { passwordHash: _, ...safeUser } = user;
        return {
          success: true,
          message: 'Login successful',
          user: safeUser,
          token: sessionToken,
        };
      }
      break;
    }
  }

  // Generic error message for security
  return { success: false, message: 'Invalid username or password' };
}

/**
 * Request password reset
 * Privacy-first: Always returns success to not reveal account existence
 */
export async function requestPasswordReset(
  username?: string,
  email?: string
): Promise<PasswordResetResult> {
  const privacyResponse: PasswordResetResult = {
    success: true,
    message: 'If an account with that information exists, a password reset email has been sent.',
    privacyProtected: true,
  };

  if (!username && !email) {
    return privacyResponse;
  }

  // Find user
  let targetUser: (User & { passwordHash: string }) | undefined;

  for (const [, user] of users) {
    // Check Enhanced Password Reset (EPR)
    if (user.preferences.enhancedPasswordReset) {
      // EPR requires BOTH username AND email to match
      if (username && email) {
        if (
          user.username.toLowerCase() === username.toLowerCase() &&
          user.email?.toLowerCase() === email.toLowerCase()
        ) {
          targetUser = user;
          break;
        }
      }
      // If EPR is enabled but both aren't provided, silently skip
      continue;
    }

    // Standard reset: match by username OR email
    if (username && user.username.toLowerCase() === username.toLowerCase()) {
      targetUser = user;
      break;
    }
    if (email && user.email?.toLowerCase() === email.toLowerCase()) {
      targetUser = user;
      break;
    }
  }

  if (!targetUser || !targetUser.email) {
    // Privacy: return success anyway
    return privacyResponse;
  }

  // Check rate limiting
  const requests = passwordResetRequests.get(targetUser.id) || [];
  const recentRequests = requests.filter(
    r => Date.now() - r.timestamp.getTime() < RATE_LIMIT_WINDOW_MS
  );

  if (recentRequests.length >= MAX_PASSWORD_RESET_REQUESTS) {
    // Privacy: still return success
    return privacyResponse;
  }

  // Create reset token
  const resetToken = generateToken(48);
  const resetRequest: PasswordResetRequest = {
    username: targetUser.username,
    email: targetUser.email,
    timestamp: new Date(),
    token: resetToken,
    used: false,
    expiresAt: new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS),
  };

  passwordResetRequests.set(targetUser.id, [...recentRequests, resetRequest]);

  // In production: Send email here
  console.log(`[Auth] Password reset token for ${targetUser.username}: ${resetToken}`);

  return privacyResponse;
}

/**
 * Complete password reset with token
 */
export async function completePasswordReset(
  token: string,
  newPassword: string
): Promise<AuthResult> {
  if (!newPassword || newPassword.length < 8) {
    return { success: false, message: 'Password must be at least 8 characters' };
  }

  // Find the reset request
  for (const [userId, requests] of passwordResetRequests) {
    const request = requests.find(r => r.token === token && !r.used);
    if (request) {
      // Check expiry
      if (new Date() > request.expiresAt) {
        return { success: false, message: 'Password reset link has expired' };
      }

      // Mark as used
      request.used = true;

      // Update password
      const user = users.get(userId);
      if (user) {
        user.passwordHash = await hashPassword(newPassword);
        return { success: true, message: 'Password has been reset successfully' };
      }
    }
  }

  return { success: false, message: 'Invalid or expired password reset link' };
}

/**
 * Update user preferences
 */
export function updatePreferences(
  userId: string,
  preferences: Partial<UserPreferences>
): AuthResult {
  const user = users.get(userId);
  if (!user) {
    return { success: false, message: 'User not found' };
  }

  user.preferences = { ...user.preferences, ...preferences };

  const { passwordHash: _, ...safeUser } = user;
  return { success: true, message: 'Preferences updated', user: safeUser };
}

/**
 * Confirm email address
 */
export function confirmEmail(userId: string, token: string): AuthResult {
  const user = users.get(userId);
  if (!user) {
    return { success: false, message: 'Invalid confirmation link' };
  }

  // In production: validate token
  user.emailConfirmed = true;

  const { passwordHash: _, ...safeUser } = user;
  return { success: true, message: 'Email confirmed successfully', user: safeUser };
}

/**
 * Validate session token
 */
export function validateSession(token: string): User | null {
  const session = sessions.get(token);
  if (!session) return null;
  if (new Date() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }

  const user = users.get(session.userId);
  if (!user) return null;

  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
}

/**
 * Logout - invalidate session
 */
export function logout(token: string): void {
  sessions.delete(token);
}

/**
 * Get all usernames associated with an email (for multi-account reset)
 */
export function getUsernamesByEmail(email: string): string[] {
  const usernames: string[] = [];
  for (const [, user] of users) {
    if (user.email?.toLowerCase() === email.toLowerCase()) {
      // Skip if EPR is enabled (don't reveal usernames)
      if (!user.preferences.enhancedPasswordReset) {
        usernames.push(user.username);
      }
    }
  }
  return usernames;
}

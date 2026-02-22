#!/usr/bin/env node
/**
 * changePassword.ts - Admin CLI for password management
 *
 * Inspired by MediaWiki's changePassword.php maintenance script
 *
 * Usage:
 *   npx ts-node changePassword.ts --user=username --password=newpassword
 *   npx ts-node changePassword.ts --email=user@example.com --list
 *   npx ts-node changePassword.ts --user=username --lock --reason="Policy violation"
 *   npx ts-node changePassword.ts --user=username --unlock
 */

import { createHash, randomBytes } from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════
// Password Hashing (MediaWiki-compatible format)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a salted password hash in MediaWiki format
 * Format: :B:salt:hash where hash = MD5(salt + '-' + MD5(password))
 */
function hashPassword(password: string, salt?: string): string {
  if (!salt) {
    salt = randomBytes(4).toString('hex');
  }

  const innerHash = createHash('md5').update(password).digest('hex');
  const outerHash = createHash('md5').update(`${salt}-${innerHash}`).digest('hex');

  return `:B:${salt}:${outerHash}`;
}

/**
 * Verify a password against a stored hash
 */
function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 4 || parts[1] !== 'B') {
    return false;
  }

  const salt = parts[2];
  const expectedHash = hashPassword(password, salt);

  return storedHash === expectedHash;
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI Argument Parsing
// ═══════════════════════════════════════════════════════════════════════════

interface CLIOptions {
  user?: string;
  email?: string;
  password?: string;
  list?: boolean;
  lock?: boolean;
  unlock?: boolean;
  reason?: string;
  help?: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--list') {
      options.list = true;
    } else if (arg === '--lock') {
      options.lock = true;
    } else if (arg === '--unlock') {
      options.unlock = true;
    } else if (arg.startsWith('--user=')) {
      options.user = arg.slice(7);
    } else if (arg.startsWith('--email=')) {
      options.email = arg.slice(8);
    } else if (arg.startsWith('--password=')) {
      options.password = arg.slice(11);
    } else if (arg.startsWith('--reason=')) {
      options.reason = arg.slice(9);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
changePassword.ts - Admin CLI for password management

USAGE:
  npx ts-node changePassword.ts [options]

OPTIONS:
  --user=USERNAME       Target username
  --email=EMAIL         Target email (for lookups)
  --password=PASSWORD   New password to set
  --list                List usernames for an email
  --lock                Lock user account
  --unlock              Unlock user account
  --reason=REASON       Reason for lock/unlock
  --help, -h            Show this help message

EXAMPLES:
  # Set password for a user
  npx ts-node changePassword.ts --user=example --password=newpassword

  # List all usernames associated with an email
  npx ts-node changePassword.ts --email=user@example.com --list

  # Lock an account
  npx ts-node changePassword.ts --user=badactor --lock --reason="Suspicious activity"

  # Unlock an account
  npx ts-node changePassword.ts --user=example --unlock

DATABASE QUERIES (for manual intervention):
  -- Set password (SQLite/MySQL)
  UPDATE user SET user_password = ':B:salt:hash' WHERE user_name = 'username';

  -- MySQL salted password
  UPDATE user SET user_password = CONCAT(':B:1234:', MD5(CONCAT('1234-', MD5('newpassword'))))
  WHERE user_name = 'username';

  -- PostgreSQL salted password
  UPDATE mwuser SET user_password = text(':B:1234:') || MD5(text('1234-') || MD5('newpassword'))
  WHERE user_name = 'username';

  -- Find users by email
  SELECT user_name FROM user WHERE user_email = 'user@example.com';

  -- Lock account
  UPDATE user SET user_locked = TRUE, user_locked_reason = 'Reason' WHERE user_name = 'username';
`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Mock Database Operations (replace with real DB in production)
// ═══════════════════════════════════════════════════════════════════════════

// In-memory mock database
const mockUsers = new Map<string, {
  user_id: number;
  user_name: string;
  user_email: string | null;
  user_password: string;
  user_locked: boolean;
  user_locked_reason: string | null;
}>();

// Seed some test data
mockUsers.set('admin', {
  user_id: 1,
  user_name: 'admin',
  user_email: 'admin@example.com',
  user_password: hashPassword('admin123'),
  user_locked: false,
  user_locked_reason: null,
});

mockUsers.set('testuser', {
  user_id: 2,
  user_name: 'testuser',
  user_email: 'test@example.com',
  user_password: hashPassword('test123'),
  user_locked: false,
  user_locked_reason: null,
});

async function changePassword(username: string, newPassword: string): Promise<boolean> {
  const user = mockUsers.get(username.toLowerCase());
  if (!user) {
    console.error(`Error: User '${username}' not found.`);
    return false;
  }

  if (user.user_locked) {
    console.error(`Error: User '${username}' is locked. Unlock first.`);
    return false;
  }

  if (newPassword.length < 8) {
    console.error('Error: Password must be at least 8 characters.');
    return false;
  }

  const newHash = hashPassword(newPassword);
  user.user_password = newHash;

  console.log(`Password changed for user '${username}'.`);
  console.log(`New hash: ${newHash}`);

  // In production: log to audit_log table
  console.log(`[AUDIT] Password changed for user_id=${user.user_id} by admin`);

  return true;
}

async function listUsersByEmail(email: string): Promise<void> {
  const users: string[] = [];

  for (const [, user] of mockUsers) {
    if (user.user_email?.toLowerCase() === email.toLowerCase()) {
      users.push(user.user_name);
    }
  }

  if (users.length === 0) {
    console.log(`No users found with email '${email}'.`);
  } else {
    console.log(`Users with email '${email}':`);
    users.forEach(u => console.log(`  - ${u}`));
  }
}

async function lockUser(username: string, reason: string): Promise<boolean> {
  const user = mockUsers.get(username.toLowerCase());
  if (!user) {
    console.error(`Error: User '${username}' not found.`);
    return false;
  }

  user.user_locked = true;
  user.user_locked_reason = reason;

  console.log(`User '${username}' has been locked.`);
  console.log(`Reason: ${reason}`);

  // In production: invalidate all sessions for this user
  console.log(`[AUDIT] User ${user.user_id} locked. Reason: ${reason}`);

  return true;
}

async function unlockUser(username: string): Promise<boolean> {
  const user = mockUsers.get(username.toLowerCase());
  if (!user) {
    console.error(`Error: User '${username}' not found.`);
    return false;
  }

  user.user_locked = false;
  user.user_locked_reason = null;

  console.log(`User '${username}' has been unlocked.`);
  console.log(`[AUDIT] User ${user.user_id} unlocked by admin`);

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  // List users by email
  if (options.list && options.email) {
    await listUsersByEmail(options.email);
    process.exit(0);
  }

  // Lock user
  if (options.lock && options.user) {
    const success = await lockUser(options.user, options.reason || 'No reason provided');
    process.exit(success ? 0 : 1);
  }

  // Unlock user
  if (options.unlock && options.user) {
    const success = await unlockUser(options.user);
    process.exit(success ? 0 : 1);
  }

  // Change password
  if (options.user && options.password) {
    const success = await changePassword(options.user, options.password);
    process.exit(success ? 0 : 1);
  }

  // No valid action
  console.error('Error: No valid action specified. Use --help for usage.');
  process.exit(1);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

// Export for use as module
export { hashPassword, verifyPassword };

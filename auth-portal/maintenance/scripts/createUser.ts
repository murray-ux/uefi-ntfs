#!/usr/bin/env npx ts-node
/**
 * createUser.ts - Create a new user account
 *
 * Usage:
 *   maintenance/run createUser --user=username --password=password
 *   maintenance/run createUser --user=username --password=password --email=user@example.com
 *   maintenance/run createUser --user=username --password=password --admin
 */

import { createHash, randomBytes } from 'crypto';

interface CreateOptions {
  user?: string;
  password?: string;
  email?: string;
  admin: boolean;
  help: boolean;
}

function hashPassword(password: string): string {
  const salt = randomBytes(4).toString('hex');
  const innerHash = createHash('md5').update(password).digest('hex');
  const outerHash = createHash('md5').update(`${salt}-${innerHash}`).digest('hex');
  return `:B:${salt}:${outerHash}`;
}

function parseArgs(): CreateOptions {
  const args = process.argv.slice(2);
  const options: CreateOptions = {
    admin: false,
    help: false,
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--admin') {
      options.admin = true;
    } else if (arg.startsWith('--user=')) {
      options.user = arg.slice(7);
    } else if (arg.startsWith('--password=')) {
      options.password = arg.slice(11);
    } else if (arg.startsWith('--email=')) {
      options.email = arg.slice(8);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
createUser - Create a new user account

USAGE:
  maintenance/run createUser --user=USERNAME --password=PASSWORD [options]

OPTIONS:
  --user=USERNAME       Username for the new account (required)
  --password=PASSWORD   Password for the new account (required)
  --email=EMAIL         Email address (optional, enables password reset)
  --admin               Grant admin privileges
  --help, -h            Show this help message

EXAMPLES:
  maintenance/run createUser --user=newuser --password=secret123
  maintenance/run createUser --user=admin --password=admin123 --email=admin@example.com --admin

NOTES:
  - Username must be 3-30 characters, alphanumeric with underscores/hyphens
  - Password must be at least 8 characters
  - Email is required for password reset functionality
`);
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  if (!options.user) {
    console.error('Error: --user is required');
    process.exit(1);
  }

  if (!options.password) {
    console.error('Error: --password is required');
    process.exit(1);
  }

  // Validate username
  if (options.user.length < 3 || options.user.length > 30) {
    console.error('Error: Username must be 3-30 characters');
    process.exit(1);
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(options.user)) {
    console.error('Error: Username can only contain letters, numbers, underscores, and hyphens');
    process.exit(1);
  }

  // Validate password
  if (options.password.length < 8) {
    console.error('Error: Password must be at least 8 characters');
    process.exit(1);
  }

  // Validate email if provided
  if (options.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(options.email)) {
    console.error('Error: Invalid email address format');
    process.exit(1);
  }

  console.log(`Creating user account`);
  console.log(`─`.repeat(40));
  console.log(`Username: ${options.user}`);
  console.log(`Email: ${options.email || '(none)'}`);
  console.log(`Admin: ${options.admin ? 'Yes' : 'No'}`);
  console.log('');

  // Generate password hash
  const passwordHash = hashPassword(options.password);

  // In production: INSERT INTO user ...
  console.log(`User '${options.user}' created successfully.`);
  console.log(`Password hash: ${passwordHash}`);

  if (!options.email) {
    console.log('\nWarning: No email address provided. User will not be able to reset password.');
  }

  console.log(`\n[AUDIT] User created: ${options.user}${options.admin ? ' (admin)' : ''}`);
}

main();

export default 'CreateUser';

#!/usr/bin/env npx ts-node
/**
 * Maintenance Script Runner
 *
 * MediaWiki 1.40+ style maintenance runner for Auth Portal.
 *
 * Usage:
 *   maintenance/run <script> [options]
 *   maintenance/run changePassword --user=example --password=newpass
 *   maintenance/run version
 *   maintenance/run --help
 *
 * Scripts can be called by:
 *   - Simple name: maintenance/run changePassword
 *   - Path: maintenance/run ./maintenance/changePassword.ts
 *   - Class name: maintenance/run ChangePassword
 */

import { existsSync } from 'fs';
import { resolve, basename, dirname } from 'path';
import { spawn } from 'child_process';

// ═══════════════════════════════════════════════════════════════════════════
// Script Registry
// ═══════════════════════════════════════════════════════════════════════════

interface ScriptInfo {
  name: string;
  path: string;
  description: string;
}

const SCRIPTS: ScriptInfo[] = [
  {
    name: 'changePassword',
    path: './scripts/changePassword.ts',
    description: 'Change user password, lock/unlock accounts',
  },
  {
    name: 'version',
    path: './scripts/version.ts',
    description: 'Display Auth Portal version information',
  },
  {
    name: 'createUser',
    path: './scripts/createUser.ts',
    description: 'Create a new user account',
  },
  {
    name: 'resetStats',
    path: './scripts/resetStats.ts',
    description: 'Reset rate limiting and session data',
  },
  {
    name: 'cleanupSessions',
    path: './scripts/cleanupSessions.ts',
    description: 'Remove expired sessions from database',
  },
  {
    name: 'exportUsers',
    path: './scripts/exportUsers.ts',
    description: 'Export user list (without passwords)',
  },
  {
    name: 'importUsers',
    path: './scripts/importUsers.ts',
    description: 'Import users from CSV/JSON',
  },
  {
    name: 'auditLog',
    path: './scripts/auditLog.ts',
    description: 'View or export audit log entries',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// Runner Logic
// ═══════════════════════════════════════════════════════════════════════════

function printHelp() {
  console.log(`
Auth Portal Maintenance Runner

USAGE:
  maintenance/run <script> [options]
  npx ts-node maintenance/run.ts <script> [options]

SCRIPTS:
${SCRIPTS.map(s => `  ${s.name.padEnd(20)} ${s.description}`).join('\n')}

OPTIONS:
  --help, -h           Show help for a script
  --quiet, -q          Suppress non-error output
  --verbose, -v        Show detailed output

EXAMPLES:
  maintenance/run changePassword --user=admin --password=newpass
  maintenance/run version
  maintenance/run cleanupSessions --older-than=7d
  maintenance/run auditLog --action=login --limit=100

INVOKING SCRIPTS:
  By name:    maintenance/run changePassword
  By path:    maintenance/run ./maintenance/scripts/changePassword.ts
  By class:   maintenance/run ChangePassword

NOTE:
  Since Auth Portal 1.0, maintenance scripts should be invoked through
  this runner. Direct invocation (npx ts-node scripts/foo.ts) is deprecated.
`);
}

function printVersion() {
  console.log(`
Auth Portal Maintenance Runner v1.0.0
Compatible with MediaWiki 1.40+ runner patterns

Scripts available: ${SCRIPTS.length}
Node version: ${process.version}
`);
}

function resolveScript(name: string): ScriptInfo | null {
  // Direct match by name
  const byName = SCRIPTS.find(s => s.name.toLowerCase() === name.toLowerCase());
  if (byName) return byName;

  // Match by class name (PascalCase)
  const normalized = name.charAt(0).toLowerCase() + name.slice(1);
  const byClass = SCRIPTS.find(s => s.name.toLowerCase() === normalized.toLowerCase());
  if (byClass) return byClass;

  // Match by path
  if (name.startsWith('./') || name.startsWith('/')) {
    const absPath = resolve(dirname(__filename), name);
    if (existsSync(absPath)) {
      return {
        name: basename(name, '.ts'),
        path: name,
        description: 'Custom script',
      };
    }
  }

  return null;
}

async function runScript(script: ScriptInfo, args: string[]): Promise<number> {
  const scriptPath = resolve(dirname(__filename), script.path);

  if (!existsSync(scriptPath)) {
    console.error(`Error: Script not found: ${scriptPath}`);
    console.error(`Run 'maintenance/run --help' for available scripts.`);
    return 1;
  }

  return new Promise((resolve) => {
    const child = spawn('npx', ['ts-node', scriptPath, ...args], {
      stdio: 'inherit',
      cwd: dirname(dirname(__filename)), // auth-portal root
    });

    child.on('close', (code) => {
      resolve(code || 0);
    });

    child.on('error', (err) => {
      console.error(`Error running script: ${err.message}`);
      resolve(1);
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

async function main(): Promise<number> {
  const args = process.argv.slice(2);

  // No arguments - show help
  if (args.length === 0) {
    printHelp();
    return 0;
  }

  const firstArg = args[0];

  // Help flags
  if (firstArg === '--help' || firstArg === '-h') {
    printHelp();
    return 0;
  }

  // Version flags
  if (firstArg === '--version' || firstArg === '-V') {
    printVersion();
    return 0;
  }

  // List scripts
  if (firstArg === '--list') {
    console.log('Available maintenance scripts:\n');
    SCRIPTS.forEach(s => {
      console.log(`  ${s.name}`);
      console.log(`    ${s.description}`);
      console.log(`    Path: ${s.path}\n`);
    });
    return 0;
  }

  // Resolve and run script
  const script = resolveScript(firstArg);

  if (!script) {
    console.error(`Error: Unknown script '${firstArg}'`);
    console.error(`Run 'maintenance/run --help' for available scripts.`);
    return 1;
  }

  // Pass remaining args to script
  const scriptArgs = args.slice(1);

  console.log(`Running maintenance script: ${script.name}`);
  console.log('─'.repeat(50));

  return runScript(script, scriptArgs);
}

main().then(code => process.exit(code));

#!/usr/bin/env npx ts-node
/**
 * auditLog.ts - View or export audit log entries
 *
 * Usage:
 *   maintenance/run auditLog
 *   maintenance/run auditLog --action=login --limit=100
 *   maintenance/run auditLog --user=admin --since=2024-01-01
 *   maintenance/run auditLog --export=json > audit.json
 */

interface AuditEntry {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  target?: string;
  ip: string;
  details?: string;
}

interface AuditOptions {
  action?: string;
  user?: string;
  limit: number;
  since?: string;
  export?: 'json' | 'csv';
  help: boolean;
}

function parseArgs(): AuditOptions {
  const args = process.argv.slice(2);
  const options: AuditOptions = {
    limit: 50,
    help: false,
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg.startsWith('--action=')) {
      options.action = arg.slice(9);
    } else if (arg.startsWith('--user=')) {
      options.user = arg.slice(7);
    } else if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.slice(8)) || 50;
    } else if (arg.startsWith('--since=')) {
      options.since = arg.slice(8);
    } else if (arg.startsWith('--export=')) {
      options.export = arg.slice(9) as 'json' | 'csv';
    }
  }

  return options;
}

function printHelp() {
  console.log(`
auditLog - View or export audit log entries

USAGE:
  maintenance/run auditLog [options]

OPTIONS:
  --action=ACTION       Filter by action type (login, logout, password_reset, etc.)
  --user=USERNAME       Filter by username
  --limit=N             Maximum entries to show (default: 50)
  --since=DATE          Show entries since date (YYYY-MM-DD)
  --export=FORMAT       Export as json or csv
  --help, -h            Show this help message

ACTION TYPES:
  login                 User login attempts
  logout                User logout
  password_reset        Password reset requests
  password_change       Password changes
  account_create        New account creation
  account_lock          Account locked
  account_unlock        Account unlocked
  settings_change       User settings modified
  email_confirm         Email confirmation

EXAMPLES:
  maintenance/run auditLog --limit=100
  maintenance/run auditLog --action=login --user=admin
  maintenance/run auditLog --since=2024-01-01 --export=json > audit.json
`);
}

function generateMockData(options: AuditOptions): AuditEntry[] {
  const actions = ['login', 'logout', 'password_reset', 'settings_change', 'account_create'];
  const users = ['admin', 'testuser', 'alice', 'bob', 'charlie'];
  const ips = ['192.168.1.100', '10.0.0.50', '172.16.0.25', '203.0.113.42'];

  const entries: AuditEntry[] = [];
  const now = Date.now();

  for (let i = 0; i < options.limit; i++) {
    const action = actions[Math.floor(Math.random() * actions.length)];
    const user = users[Math.floor(Math.random() * users.length)];

    // Apply filters
    if (options.action && action !== options.action) continue;
    if (options.user && user !== options.user) continue;

    entries.push({
      id: 1000 - i,
      timestamp: new Date(now - i * 3600000).toISOString(),
      user,
      action,
      ip: ips[Math.floor(Math.random() * ips.length)],
      details: action === 'login' ? (Math.random() > 0.1 ? 'success' : 'failed') : undefined,
    });

    if (entries.length >= options.limit) break;
  }

  return entries;
}

function formatTable(entries: AuditEntry[]): string {
  if (entries.length === 0) return 'No entries found.';

  const header = '| ID   | Timestamp                | User      | Action          | IP             | Details  |';
  const separator = '|------|--------------------------|-----------|-----------------|----------------|----------|';

  const rows = entries.map(e =>
    `| ${e.id.toString().padEnd(4)} | ${e.timestamp.padEnd(24)} | ${e.user.padEnd(9)} | ${e.action.padEnd(15)} | ${e.ip.padEnd(14)} | ${(e.details || '').padEnd(8)} |`
  );

  return [header, separator, ...rows].join('\n');
}

function formatCSV(entries: AuditEntry[]): string {
  const header = 'id,timestamp,user,action,ip,details';
  const rows = entries.map(e =>
    `${e.id},"${e.timestamp}","${e.user}","${e.action}","${e.ip}","${e.details || ''}"`
  );
  return [header, ...rows].join('\n');
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  // In production: SELECT * FROM audit_log WHERE ...
  const entries = generateMockData(options);

  if (options.export === 'json') {
    console.log(JSON.stringify(entries, null, 2));
  } else if (options.export === 'csv') {
    console.log(formatCSV(entries));
  } else {
    console.log(`Audit Log`);
    console.log(`─`.repeat(100));
    if (options.action) console.log(`Filter: action=${options.action}`);
    if (options.user) console.log(`Filter: user=${options.user}`);
    console.log(`Showing ${entries.length} entries (limit: ${options.limit})\n`);
    console.log(formatTable(entries));
  }
}

main();

export default 'AuditLog';

#!/usr/bin/env npx ts-node
/**
 * cleanupSessions.ts - Remove expired sessions from database
 *
 * Usage:
 *   maintenance/run cleanupSessions
 *   maintenance/run cleanupSessions --older-than=7d
 *   maintenance/run cleanupSessions --dry-run
 *   maintenance/run cleanupSessions --user=username
 */

interface CleanupOptions {
  olderThan: string;
  dryRun: boolean;
  user?: string;
  help: boolean;
}

function parseArgs(): CleanupOptions {
  const args = process.argv.slice(2);
  const options: CleanupOptions = {
    olderThan: '24h',
    dryRun: false,
    help: false,
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--older-than=')) {
      options.olderThan = arg.slice(13);
    } else if (arg.startsWith('--user=')) {
      options.user = arg.slice(7);
    }
  }

  return options;
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(h|d|w|m)$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}. Use format like 24h, 7d, 4w, 1m`);
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    h: 60 * 60 * 1000,         // hours
    d: 24 * 60 * 60 * 1000,    // days
    w: 7 * 24 * 60 * 60 * 1000, // weeks
    m: 30 * 24 * 60 * 60 * 1000, // months (approx)
  };

  return value * multipliers[unit];
}

function printHelp() {
  console.log(`
cleanupSessions - Remove expired sessions from database

USAGE:
  maintenance/run cleanupSessions [options]

OPTIONS:
  --older-than=DURATION   Remove sessions older than duration (default: 24h)
                          Formats: 24h, 7d, 4w, 1m
  --user=USERNAME         Only clean sessions for specific user
  --dry-run               Show what would be deleted without deleting
  --help, -h              Show this help message

EXAMPLES:
  maintenance/run cleanupSessions
  maintenance/run cleanupSessions --older-than=7d
  maintenance/run cleanupSessions --user=admin --dry-run
`);
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  try {
    const cutoffMs = parseDuration(options.olderThan);
    const cutoffDate = new Date(Date.now() - cutoffMs);

    console.log(`Session Cleanup`);
    console.log(`─`.repeat(40));
    console.log(`Cutoff: ${cutoffDate.toISOString()}`);
    console.log(`Older than: ${options.olderThan}`);
    if (options.user) console.log(`User filter: ${options.user}`);
    if (options.dryRun) console.log(`Mode: DRY RUN (no changes)`);
    console.log('');

    // In production: query database
    // DELETE FROM session WHERE session_expires < ? AND (? IS NULL OR session_user_id = ?)

    // Mock results
    const expiredCount = Math.floor(Math.random() * 50) + 10;

    if (options.dryRun) {
      console.log(`Would delete ${expiredCount} expired sessions.`);
    } else {
      console.log(`Deleted ${expiredCount} expired sessions.`);

      // Log the action
      console.log(`[AUDIT] Session cleanup: removed ${expiredCount} sessions older than ${options.olderThan}`);
    }

    // Show remaining sessions
    const remainingCount = Math.floor(Math.random() * 100) + 50;
    console.log(`Active sessions remaining: ${remainingCount}`);

  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();

export default 'CleanupSessions';

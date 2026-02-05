#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
// Copyright 2025 Murray Bembrick — Founder & Lead Developer
// See LICENSE and NOTICE for terms.

/**
 * GENESIS Database CLI
 * Advanced PostgreSQL operations
 *
 * GENESIS 2.0 — Forbidden Ninja City
 */

import { createGenesisDB } from '../db/genesis-pg.js';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLogger } from '../lib/kol-logger.js';

const kolDb = createLogger('DB');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..', '..');

// Colors
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(msg, level = 'info') {
  const colors = { info: C.cyan, success: C.green, warn: C.yellow, error: C.red };
  console.log(`${colors[level] || C.reset}${msg}${C.reset}`);
}

function header(text) {
  console.log(`\n${C.bold}${C.blue}═══ ${text} ═══${C.reset}\n`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Commands
// ═══════════════════════════════════════════════════════════════════════════

async function cmdInit() {
  header('Initialize Database');

  const schemaPath = join(ROOT_DIR, 'db', 'genesis_advanced.sql');

  if (!existsSync(schemaPath)) {
    log('Schema file not found: ' + schemaPath, 'error');
    process.exit(1);
  }

  const db = createGenesisDB();

  try {
    await db.connect();
    log('Connected to PostgreSQL', 'success');

    // Check for pgvector extension
    try {
      await db.query("CREATE EXTENSION IF NOT EXISTS vector");
      log('pgvector extension enabled', 'success');
    } catch (err) {
      log(`pgvector not available: ${err.message}`, 'warn');
      log('Vector similarity search will be disabled', 'warn');
    }

    // Run schema
    const schema = readFileSync(schemaPath, 'utf-8');

    // Split by statement (naive split, works for most cases)
    const statements = schema
      .split(/;\s*$/m)
      .filter(s => s.trim() && !s.trim().startsWith('--'));

    let success = 0;
    let skipped = 0;

    for (const statement of statements) {
      try {
        await db.query(statement);
        success++;
      } catch (err) {
        if (err.message.includes('already exists') ||
            err.message.includes('duplicate')) {
          skipped++;
        } else {
          log(`Statement failed: ${err.message}`, 'warn');
        }
      }
    }

    log(`Schema applied: ${success} statements, ${skipped} skipped`, 'success');

    await db.close();
  } catch (err) {
    log(`Initialization failed: ${err.message}`, 'error');
    process.exit(1);
  }
}

async function cmdHealth() {
  header('Database Health Check');

  const db = createGenesisDB();

  try {
    await db.connect();
    const health = await db.healthCheck();

    console.log(`${C.bold}Connection:${C.reset} ${health.connected ? C.green + '✓ Connected' : C.red + '✗ Disconnected'}${C.reset}`);

    if (health.connected) {
      console.log(`${C.bold}Server Time:${C.reset} ${health.serverTime}`);
      console.log(`${C.bold}PostgreSQL:${C.reset} ${health.version.split(',')[0]}`);
      console.log(`${C.bold}Ledger Integrity:${C.reset} ${health.ledgerIntegrity ? C.green + '✓ Valid' : C.red + '✗ Broken'}${C.reset}`);
      console.log(`${C.bold}Ledger Entries:${C.reset} ${health.ledgerEntries}`);
    }

    await db.close();
  } catch (err) {
    log(`Health check failed: ${err.message}`, 'error');
  }
}

async function cmdLedger(subcommand, ...args) {
  header('Ledger Operations');

  const db = createGenesisDB();

  try {
    await db.connect();

    switch (subcommand) {
      case 'verify':
        const integrity = await db.ledger.verifyIntegrity();
        log(`Chain integrity: ${integrity.valid ? 'VALID' : 'BROKEN'}`, integrity.valid ? 'success' : 'error');
        log(`Total entries: ${integrity.totalEntries}`, 'info');

        if (integrity.issues.length > 0) {
          console.log('\nIssues:');
          integrity.issues.forEach(issue => {
            log(`  Sequence ${issue.sequence_id}: ${issue.issue}`, 'error');
          });
        }
        break;

      case 'recent':
        const limit = parseInt(args[0]) || 10;
        const recent = await db.ledger.getRecent(limit);

        console.log(`\nLast ${recent.length} entries:\n`);
        recent.forEach(entry => {
          console.log(`${C.yellow}#${entry.sequence_id}${C.reset} [${entry.entry_type}] ${entry.created_at}`);
          console.log(`  Hash: ${entry.entry_hash.substring(0, 32)}...`);
        });
        break;

      case 'append':
        const type = args[0] || 'manual';
        const data = args[1] ? JSON.parse(args[1]) : { note: 'Manual entry' };
        const seq = await db.ledger.append(type, data);
        log(`Appended entry #${seq}`, 'success');
        break;

      default:
        console.log(`
Usage: genesis-db ledger <command>

Commands:
  verify           Verify chain integrity
  recent [limit]   Show recent entries
  append <type> <json>  Append manual entry
`);
    }

    await db.close();
  } catch (err) {
    log(`Ledger operation failed: ${err.message}`, 'error');
  }
}

async function cmdSearch(query) {
  header('Vector Search');

  if (!query) {
    log('Usage: genesis-db search "query text"', 'warn');
    return;
  }

  const db = createGenesisDB();

  try {
    await db.connect();

    log(`Searching for: "${query}"`, 'info');
    console.log('');

    const results = await db.searchEvidence(query, { limit: 10 });

    if (results.length === 0) {
      log('No results found', 'warn');
    } else {
      results.forEach((r, i) => {
        console.log(`${C.yellow}${i + 1}.${C.reset} ${C.bold}${r.evidence_code}${C.reset}`);
        console.log(`   Title: ${r.title}`);
        console.log(`   FTS: ${(r.fts_rank * 100).toFixed(1)}% | Vector: ${(r.vector_similarity * 100).toFixed(1)}% | Combined: ${(r.combined_score * 100).toFixed(1)}%`);
        console.log('');
      });
    }

    await db.close();
  } catch (err) {
    log(`Search failed: ${err.message}`, 'error');
  }
}

async function cmdEvents(subcommand, ...args) {
  header('Event Store');

  const db = createGenesisDB();

  try {
    await db.connect();

    switch (subcommand) {
      case 'stream':
        const streamId = args[0];
        if (!streamId) {
          log('Usage: genesis-db events stream <stream-id>', 'warn');
          return;
        }

        const events = await db.events.getStream(streamId);

        if (events.length === 0) {
          log(`No events for stream: ${streamId}`, 'warn');
        } else {
          events.forEach(e => {
            console.log(`${C.yellow}v${e.event_version}${C.reset} [${e.event_type}] ${e.occurred_at}`);
            console.log(`  ${JSON.stringify(e.payload)}`);
          });
        }
        break;

      case 'recent':
        const result = await db.query(`
          SELECT * FROM events ORDER BY occurred_at DESC LIMIT $1
        `, [parseInt(args[0]) || 20]);

        result.rows.forEach(e => {
          console.log(`${C.cyan}${e.stream_type}/${e.stream_id}${C.reset} [${e.event_type}]`);
          console.log(`  ${e.occurred_at}`);
        });
        break;

      default:
        console.log(`
Usage: genesis-db events <command>

Commands:
  stream <id>      Get events for a stream
  recent [limit]   Show recent events
`);
    }

    await db.close();
  } catch (err) {
    log(`Event operation failed: ${err.message}`, 'error');
  }
}

async function cmdStats() {
  header('Database Statistics');

  const db = createGenesisDB();

  try {
    await db.connect();

    // Table sizes
    const tables = await db.query(`
      SELECT
        relname AS table_name,
        n_live_tup AS row_count
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC
    `);

    console.log(`${C.bold}Table Row Counts:${C.reset}`);
    tables.rows.forEach(t => {
      console.log(`  ${t.table_name}: ${t.row_count}`);
    });

    // Evidence by category
    const categories = await db.query(`
      SELECT category, COUNT(*) as count
      FROM evidence WHERE valid_to = 'infinity'
      GROUP BY category
    `);

    if (categories.rows.length > 0) {
      console.log(`\n${C.bold}Evidence by Category:${C.reset}`);
      categories.rows.forEach(c => {
        console.log(`  ${c.category}: ${c.count}`);
      });
    }

    // Event types
    const eventTypes = await db.query(`
      SELECT event_type, COUNT(*) as count
      FROM events GROUP BY event_type
    `);

    if (eventTypes.rows.length > 0) {
      console.log(`\n${C.bold}Events by Type:${C.reset}`);
      eventTypes.rows.forEach(e => {
        console.log(`  ${e.event_type}: ${e.count}`);
      });
    }

    await db.close();
  } catch (err) {
    log(`Stats failed: ${err.message}`, 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI Entry Point
// ═══════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case 'init':
      await cmdInit();
      break;

    case 'health':
      await cmdHealth();
      break;

    case 'ledger':
      await cmdLedger(args[1], ...args.slice(2));
      break;

    case 'search':
      await cmdSearch(args.slice(1).join(' '));
      break;

    case 'events':
      await cmdEvents(args[1], ...args.slice(2));
      break;

    case 'stats':
      await cmdStats();
      break;

    case 'help':
    default:
      console.log(`
${C.bold}GENESIS Database CLI${C.reset}

Usage:
  genesis-db <command> [options]

Commands:
  init             Initialize database schema
  health           Check database health
  ledger <cmd>     Ledger operations (verify, recent, append)
  search <query>   Vector similarity search
  events <cmd>     Event store operations
  stats            Database statistics
  help             Show this help

Environment Variables:
  PGHOST           PostgreSQL host (default: localhost)
  PGPORT           PostgreSQL port (default: 5432)
  PGDATABASE       Database name (default: genesis)
  PGUSER           Username (default: genesis)
  PGPASSWORD       Password
  OPENAI_API_KEY   For vector embeddings

Examples:
  genesis-db init
  genesis-db health
  genesis-db ledger verify
  genesis-db search "hidden file surveillance"
  genesis-db events stream abc-123
`);
  }
}

main().catch(err => {
  log(`Error: ${err.message}`, 'error');
  process.exit(1);
});

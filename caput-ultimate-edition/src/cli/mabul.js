#!/usr/bin/env node
/**
 * MABUL CLI — Memory Persistence Layer Commands
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Command-line interface for the MABUL persistence system
 *
 * Commands:
 *   mabul store <key> <content>  - Store a memory
 *   mabul get <key>              - Retrieve a memory
 *   mabul search <query>         - Semantic search
 *   mabul list                   - List all memories
 *   mabul delete <key>           - Delete a memory
 *   mabul checkpoint [name]      - Create checkpoint
 *   mabul restore <checkpoint>   - Restore from checkpoint
 *   mabul status                 - Show system status
 *   mabul health                 - Run health check
 *   mabul context <query>        - Build context for prompts
 *
 * @module MABUL/CLI
 * @version 2.0.0
 */

import Mabul from '../lib/mabul-persistence.js';

// Colors for terminal output
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

// ASCII Banner
function showBanner() {
  console.log(`
${C.cyan}╔═══════════════════════════════════════════════════════════════════╗${C.reset}
${C.cyan}║${C.reset}  ${C.bold}${C.magenta}MABUL${C.reset} ${C.dim}— The Flood Layer${C.reset}                                      ${C.cyan}║${C.reset}
${C.cyan}║${C.reset}  ${C.green}Persistent Memory & Semantic Retrieval${C.reset}                          ${C.cyan}║${C.reset}
${C.cyan}╚═══════════════════════════════════════════════════════════════════╝${C.reset}
`);
}

// Help text
function showHelp() {
  showBanner();
  console.log(`
${C.bold}Usage:${C.reset}
  mabul <command> [options]

${C.bold}Commands:${C.reset}
  ${C.cyan}store${C.reset} <key> <content>     Store a memory with the given key
  ${C.cyan}get${C.reset} <key>                 Retrieve a memory by key
  ${C.cyan}search${C.reset} <query>            Semantic search across memories
  ${C.cyan}list${C.reset} [--category=<cat>]   List all stored memories
  ${C.cyan}delete${C.reset} <key>              Delete a memory
  ${C.cyan}checkpoint${C.reset} [name]         Create a checkpoint (ARARAT)
  ${C.cyan}restore${C.reset} <checkpoint>      Restore from a checkpoint
  ${C.cyan}checkpoints${C.reset}               List all checkpoints
  ${C.cyan}status${C.reset}                    Show system status
  ${C.cyan}health${C.reset}                    Run health diagnostics (YONAH)
  ${C.cyan}context${C.reset} <query>           Build context for prompts (TZOHAR)
  ${C.cyan}recover${C.reset} <strategy>        Recovery (checkpoint|repair|reset)
  ${C.cyan}interactive${C.reset}               Start interactive mode

${C.bold}Options:${C.reset}
  --category=<cat>    Filter by category (general, preference, fact, code)
  --tags=<t1,t2>      Add or filter by tags
  --limit=<n>         Limit results
  --json              Output as JSON

${C.bold}Examples:${C.reset}
  mabul store "user:pref:theme" "dark mode preferred"
  mabul search "user preferences"
  mabul list --category=preference
  mabul checkpoint "before-refactor"
  mabul context "What are the user's preferences?"

${C.bold}Components:${C.reset}
  TEBAH   (תבה)  — Ark: Secure storage container
  KOFER   (כפר)  — Pitch: Encryption layer
  TZOHAR  (צהר)  — Window: Query & retrieval
  ARARAT  (אררט) — Mountain: Checkpoints
  YONAH   (יונה) — Dove: Health probes
  KESHET  (קשת)  — Rainbow: Covenant verification
  ZAYIT   (זית)  — Olive: Graceful recovery
`);
}

// Parse command line arguments
function parseArgs(args) {
  const result = { command: null, args: [], options: {} };

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      result.options[key] = value || true;
    } else if (!result.command) {
      result.command = arg;
    } else {
      result.args.push(arg);
    }
  }

  return result;
}

// Format output
function output(data, json = false) {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
  } else if (typeof data === 'string') {
    console.log(data);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

// Main CLI handler
async function main() {
  const { command, args, options } = parseArgs(process.argv.slice(2));

  if (!command || command === 'help' || options.help) {
    showHelp();
    process.exit(0);
  }

  // Initialize MABUL
  const mabul = new Mabul();

  try {
    await mabul.initialize();
  } catch (err) {
    console.error(`${C.red}Failed to initialize MABUL:${C.reset}`, err.message);
    process.exit(1);
  }

  try {
    switch (command) {
      case 'store': {
        const [key, ...contentParts] = args;
        const content = contentParts.join(' ');

        if (!key || !content) {
          console.error(`${C.red}Usage:${C.reset} mabul store <key> <content>`);
          process.exit(1);
        }

        const record = await mabul.store(key, content, {
          category: options.category || 'general',
          tags: options.tags?.split(',') || []
        });

        console.log(`${C.green}✓${C.reset} Stored: ${C.cyan}${record.id}${C.reset}`);
        console.log(`  Timestamp: ${new Date(record.timestamp).toISOString()}`);
        console.log(`  Checksum: ${record.checksum}`);
        break;
      }

      case 'get': {
        const [key] = args;
        if (!key) {
          console.error(`${C.red}Usage:${C.reset} mabul get <key>`);
          process.exit(1);
        }

        const record = await mabul.retrieve(key);
        if (!record) {
          console.error(`${C.yellow}Memory not found:${C.reset} ${key}`);
          process.exit(1);
        }

        if (options.json) {
          output(record, true);
        } else {
          console.log(`\n${C.bold}Key:${C.reset} ${C.cyan}${record.id}${C.reset}`);
          console.log(`${C.bold}Category:${C.reset} ${record.category}`);
          console.log(`${C.bold}Tags:${C.reset} ${record.tags.join(', ') || 'none'}`);
          console.log(`${C.bold}Timestamp:${C.reset} ${new Date(record.timestamp).toISOString()}`);
          console.log(`\n${C.bold}Value:${C.reset}`);
          console.log(typeof record.value === 'string' ? record.value : JSON.stringify(record.value, null, 2));
        }
        break;
      }

      case 'search': {
        const query = args.join(' ');
        if (!query) {
          console.error(`${C.red}Usage:${C.reset} mabul search <query>`);
          process.exit(1);
        }

        const results = await mabul.search(query, {
          limit: parseInt(options.limit) || 10,
          threshold: parseFloat(options.threshold) || 0.3
        });

        if (options.json) {
          output(results, true);
        } else {
          console.log(`\n${C.bold}Search Results:${C.reset} ${results.length} matches for "${C.cyan}${query}${C.reset}"\n`);

          if (results.length === 0) {
            console.log(`${C.dim}No matching memories found${C.reset}`);
          } else {
            results.forEach((r, i) => {
              const similarity = Math.round((r.similarity || 0) * 100);
              console.log(`${C.cyan}${i + 1}.${C.reset} ${r.id} ${C.dim}(${similarity}% match)${C.reset}`);
              const preview = typeof r.value === 'string'
                ? r.value.slice(0, 100) + (r.value.length > 100 ? '...' : '')
                : JSON.stringify(r.value).slice(0, 100);
              console.log(`   ${C.dim}${preview}${C.reset}\n`);
            });
          }
        }
        break;
      }

      case 'list': {
        const list = await mabul.ark.list({
          category: options.category,
          tags: options.tags?.split(',')
        });

        const limit = parseInt(options.limit) || 50;
        const limited = list.slice(0, limit);

        if (options.json) {
          output(limited, true);
        } else {
          console.log(`\n${C.bold}Memories:${C.reset} ${list.length} total (showing ${limited.length})\n`);

          if (limited.length === 0) {
            console.log(`${C.dim}No memories stored${C.reset}`);
          } else {
            limited.forEach(r => {
              const age = Date.now() - r.timestamp;
              const ageStr = age < 3600000 ? `${Math.floor(age / 60000)}m` :
                age < 86400000 ? `${Math.floor(age / 3600000)}h` :
                  `${Math.floor(age / 86400000)}d`;

              console.log(`${C.cyan}${r.id}${C.reset} ${C.dim}[${r.category}] ${ageStr} ago${C.reset}`);
            });
          }
        }
        break;
      }

      case 'delete': {
        const [key] = args;
        if (!key) {
          console.error(`${C.red}Usage:${C.reset} mabul delete <key>`);
          process.exit(1);
        }

        const deleted = await mabul.ark.delete(key);
        if (deleted) {
          console.log(`${C.green}✓${C.reset} Deleted: ${key}`);
        } else {
          console.log(`${C.yellow}Memory not found:${C.reset} ${key}`);
        }
        break;
      }

      case 'checkpoint': {
        const [name] = args;
        const checkpoint = await mabul.createCheckpoint(name);

        console.log(`${C.green}✓${C.reset} Checkpoint created: ${C.cyan}${checkpoint.id}${C.reset}`);
        console.log(`  Memories: ${checkpoint.memoriesCount}`);
        console.log(`  Vectors: ${checkpoint.vectorsCount}`);
        console.log(`  Timestamp: ${new Date(checkpoint.timestamp).toISOString()}`);
        break;
      }

      case 'restore': {
        const [checkpointId] = args;
        if (!checkpointId) {
          console.error(`${C.red}Usage:${C.reset} mabul restore <checkpoint-id>`);
          process.exit(1);
        }

        const restored = await mabul.checkpoint.restoreCheckpoint(checkpointId);
        console.log(`${C.green}✓${C.reset} Restored from: ${C.cyan}${restored.id}${C.reset}`);
        console.log(`  Memories: ${restored.memoriesCount}`);
        break;
      }

      case 'checkpoints': {
        const checkpoints = await mabul.checkpoint.listCheckpoints();

        if (options.json) {
          output(checkpoints, true);
        } else {
          console.log(`\n${C.bold}Checkpoints:${C.reset} ${checkpoints.length}\n`);

          if (checkpoints.length === 0) {
            console.log(`${C.dim}No checkpoints created${C.reset}`);
          } else {
            checkpoints.forEach(cp => {
              console.log(`${C.cyan}${cp.id}${C.reset}`);
              console.log(`  Memories: ${cp.memoriesCount}`);
              console.log(`  Created: ${new Date(cp.timestamp).toISOString()}\n`);
            });
          }
        }
        break;
      }

      case 'status': {
        const status = await mabul.status();

        if (options.json) {
          output(status, true);
        } else {
          console.log(`\n${C.bold}MABUL System Status${C.reset}\n`);
          console.log(`${C.cyan}Ready:${C.reset}        ${status.ready ? `${C.green}Yes${C.reset}` : `${C.red}No${C.reset}`}`);
          console.log(`${C.cyan}Memories:${C.reset}     ${status.memories}`);
          console.log(`${C.cyan}Vectors:${C.reset}      ${status.vectors}`);
          console.log(`${C.cyan}Checkpoints:${C.reset}  ${status.checkpoints}`);
          console.log(`${C.cyan}Health:${C.reset}       ${status.health}`);

          console.log(`\n${C.bold}Components:${C.reset}`);
          Object.entries(status.components).forEach(([name, s]) => {
            const statusColor = s === 'active' ? C.green : s === 'encrypted' ? C.blue : C.dim;
            console.log(`  ${name.toUpperCase().padEnd(10)} ${statusColor}${s}${C.reset}`);
          });
        }
        break;
      }

      case 'health': {
        const health = await mabul.health();

        if (options.json) {
          output(health, true);
        } else {
          console.log(`\n${C.bold}YONAH Health Check${C.reset}\n`);
          console.log(`${C.cyan}Status:${C.reset} ${health.status === 'healthy' ? `${C.green}Healthy${C.reset}` : `${C.yellow}${health.status}${C.reset}`}`);

          console.log(`\n${C.bold}Probes:${C.reset}`);
          Object.entries(health.probes).forEach(([name, probe]) => {
            const icon = probe.status === 'healthy' ? `${C.green}✓${C.reset}` : `${C.red}✕${C.reset}`;
            console.log(`  ${icon} ${name}`);
            if (probe.memories !== undefined) {
              console.log(`    Memories: ${probe.memories}, Vectors: ${probe.vectors}`);
            }
            if (probe.ratio !== undefined) {
              console.log(`    Integrity: ${Math.round(probe.ratio * 100)}%`);
            }
          });
        }
        break;
      }

      case 'context': {
        const query = args.join(' ');
        if (!query) {
          console.error(`${C.red}Usage:${C.reset} mabul context <query>`);
          process.exit(1);
        }

        const context = await mabul.buildContext(query, {
          maxContext: parseInt(options.limit) || 10
        });

        if (options.json) {
          output(context, true);
        } else {
          console.log(`\n${C.bold}Context for:${C.reset} "${C.cyan}${context.query}${C.reset}"`);
          console.log(`${C.bold}Items:${C.reset} ${context.contextItems}\n`);
          console.log(`${C.dim}${'─'.repeat(60)}${C.reset}`);
          console.log(context.context || `${C.dim}No relevant context found${C.reset}`);
          console.log(`${C.dim}${'─'.repeat(60)}${C.reset}`);
        }
        break;
      }

      case 'recover': {
        const [strategy = 'checkpoint'] = args;

        if (!['checkpoint', 'repair', 'reset'].includes(strategy)) {
          console.error(`${C.red}Invalid strategy:${C.reset} ${strategy}`);
          console.error(`Valid strategies: checkpoint, repair, reset`);
          process.exit(1);
        }

        if (strategy === 'reset') {
          console.log(`${C.yellow}WARNING: This will DELETE ALL memories!${C.reset}`);
          // In a real CLI, we'd prompt for confirmation
        }

        const result = await mabul.recovery.recover(strategy);

        if (result.success) {
          console.log(`${C.green}✓${C.reset} Recovery (${strategy}) completed`);
        } else {
          console.error(`${C.red}Recovery failed:${C.reset} ${result.error}`);
        }
        break;
      }

      case 'interactive': {
        console.log(`${C.cyan}Interactive mode not yet implemented.${C.reset}`);
        console.log(`Use individual commands or the web UI.`);
        break;
      }

      default:
        console.error(`${C.red}Unknown command:${C.reset} ${command}`);
        console.log(`Run ${C.cyan}mabul help${C.reset} for usage information.`);
        process.exit(1);
    }
  } catch (err) {
    console.error(`${C.red}Error:${C.reset}`, err.message);
    if (options.debug) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

// Run
main();

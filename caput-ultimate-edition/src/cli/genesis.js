#!/usr/bin/env node
/**
 * GENESIS 2.0 — Unified CLI
 * The master command-line interface for Forbidden Ninja City
 *
 * ADMIN_MASTER: CAPUT Admin
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..', '..');

// ═══════════════════════════════════════════════════════════════════════════
// Colors & Formatting
// ═══════════════════════════════════════════════════════════════════════════

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function banner() {
  console.log(`
${c.cyan}╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   ${c.bold}${c.white}  ██████╗ ███████╗███╗   ██╗███████╗███████╗██╗███████╗${c.cyan}                   ║
║   ${c.bold}${c.white} ██╔════╝ ██╔════╝████╗  ██║██╔════╝██╔════╝██║██╔════╝${c.cyan}                   ║
║   ${c.bold}${c.white} ██║  ███╗█████╗  ██╔██╗ ██║█████╗  ███████╗██║███████╗${c.cyan}                   ║
║   ${c.bold}${c.white} ██║   ██║██╔══╝  ██║╚██╗██║██╔══╝  ╚════██║██║╚════██║${c.cyan}                   ║
║   ${c.bold}${c.white} ╚██████╔╝███████╗██║ ╚████║███████╗███████║██║███████║${c.cyan}                   ║
║   ${c.bold}${c.white}  ╚═════╝ ╚══════╝╚═╝  ╚═══╝╚══════╝╚══════╝╚═╝╚══════╝${c.cyan}                   ║
║                                                                              ║
║   ${c.yellow}Version 2.0.0${c.cyan}          ${c.green}Forbidden Ninja City${c.cyan}          ${c.magenta}Charter v1.0.0${c.cyan}   ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝${c.reset}
`);
}

function log(msg, type = 'info') {
  const prefix = {
    info: `${c.cyan}[GENESIS]${c.reset}`,
    success: `${c.green}[✓]${c.reset}`,
    warn: `${c.yellow}[⚠]${c.reset}`,
    error: `${c.red}[✗]${c.reset}`,
    cmd: `${c.magenta}[CMD]${c.reset}`
  };
  console.log(`${prefix[type] || prefix.info} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Module Loaders
// ═══════════════════════════════════════════════════════════════════════════

async function loadPentagon() {
  const { Pentagon } = await import('../pentagon/index.js');
  const { registerAllHandlers } = await import('../pentagon/handlers.js');
  const pentagon = new Pentagon();
  registerAllHandlers(pentagon);
  return pentagon;
}

async function loadNetgear() {
  const { NetgearClient } = await import('../netgear/index.js');
  return new NetgearClient({
    host: process.env.NETGEAR_HOST || '192.168.1.1',
    password: process.env.NETGEAR_PASSWORD || ''
  });
}

async function loadAI() {
  const { AIClient } = await import('../ai/index.js');
  return new AIClient({
    provider: process.env.AI_PROVIDER || 'offline'
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Commands
// ═══════════════════════════════════════════════════════════════════════════

async function cmdHealth() {
  log('Running system health check...', 'info');
  console.log();

  const pentagon = await loadPentagon();
  const status = pentagon.health();

  console.log(`${c.cyan}Pentagon Status:${c.reset}`);
  console.log(`  Status: ${status.healthy ? c.green + 'HEALTHY' : c.red + 'DEGRADED'}${c.reset}`);
  console.log(`  Rooms: ${status.totalRooms}`);
  console.log(`  Handlers: ${status.handlersRegistered}`);
  console.log();

  console.log(`${c.cyan}Layers:${c.reset}`);
  for (const layer of status.layers) {
    const indicator = layer.operational ? c.green + '●' : c.red + '○';
    console.log(`  ${indicator}${c.reset} ${layer.id} ${layer.name} (${layer.roomCount} rooms) - ${layer.description}`);
  }
  console.log();

  // Charter check
  const charterPath = join(ROOT_DIR, '..', 'forbidden-ninja-city-charter-v1.0.0', 'charter', 'charter.meta.json');
  if (existsSync(charterPath)) {
    const meta = JSON.parse(readFileSync(charterPath, 'utf8'));
    console.log(`${c.cyan}Charter:${c.reset}`);
    console.log(`  Version: ${meta.version}`);
    console.log(`  Status: ${c.green}${meta.status}${c.reset}`);
    console.log(`  ADMIN_MASTER: ${meta.admin_master.name}`);
  }
  console.log();

  log('Health check complete', 'success');
}

async function cmdPentagon(args) {
  const pentagon = await loadPentagon();
  const subCmd = args[0];

  switch (subCmd) {
    case 'status':
      const status = pentagon.getStatus();
      console.log(JSON.stringify(status, null, 2));
      break;

    case 'layer':
      const layerId = args[1]?.toUpperCase();
      if (!layerId) {
        log('Usage: genesis pentagon layer <L0|L1|L2|L3|L4>', 'error');
        return;
      }
      const layer = pentagon.getLayer(layerId);
      if (layer) {
        console.log(JSON.stringify(layer, null, 2));
      } else {
        log(`Unknown layer: ${layerId}`, 'error');
      }
      break;

    case 'room':
      const roomName = args[1]?.toLowerCase();
      if (!roomName) {
        log('Usage: genesis pentagon room <room-name> [action] [payload]', 'error');
        return;
      }
      const action = args[2] || 'status';
      const payload = args[3] ? JSON.parse(args[3]) : {};

      try {
        const result = await pentagon.cmd(roomName, action, payload);
        console.log(JSON.stringify(result, null, 2));
      } catch (err) {
        log(`Room command failed: ${err.message}`, 'error');
      }
      break;

    case 'list':
      console.log(`${c.cyan}Pentagon Rooms (40 total):${c.reset}`);
      console.log();
      const allStatus = pentagon.getStatus();
      for (const layer of allStatus.layers) {
        console.log(`${c.yellow}${layer.id} ${layer.name}${c.reset} - ${layer.description}`);
        const layerData = pentagon.getLayer(layer.id);
        for (const room of layerData.rooms) {
          console.log(`  ${c.green}●${c.reset} ${room.name.padEnd(12)} ${c.dim}${room.purpose}${c.reset}`);
        }
        console.log();
      }
      break;

    default:
      console.log(`
${c.cyan}Pentagon Commands:${c.reset}
  genesis pentagon status              Show Pentagon status
  genesis pentagon list                List all rooms
  genesis pentagon layer <id>          Show layer details
  genesis pentagon room <name> [action] [payload]  Execute room command

${c.cyan}Layers:${c.reset}
  L0 - Kernel (Crypto & Primitives)
  L1 - Conduit (Messaging)
  L2 - Reservoir (State & Storage)
  L3 - Valve (Policy & Control)
  L4 - Manifold (Orchestration)
`);
  }
}

async function cmdNetwork(args) {
  const netgear = await loadNetgear();
  const subCmd = args[0] || 'status';

  switch (subCmd) {
    case 'status':
    case 'health':
      log('Checking network health...', 'info');
      const health = await netgear.healthCheck();
      console.log(JSON.stringify(health, null, 2));
      break;

    case 'devices':
      log('Getting attached devices...', 'info');
      const devices = await netgear.getAttachedDevices();
      console.log(JSON.stringify(devices, null, 2));
      break;

    case 'traffic':
      const traffic = await netgear.getTrafficStats();
      console.log(JSON.stringify(traffic, null, 2));
      break;

    case 'wan':
      const wan = await netgear.getWANStatus();
      console.log(JSON.stringify(wan, null, 2));
      break;

    case 'wireless':
      const wireless = await netgear.getWirelessSettings();
      console.log(JSON.stringify(wireless, null, 2));
      break;

    default:
      console.log(`
${c.cyan}Network Commands:${c.reset}
  genesis network status      Full health check
  genesis network devices     List attached devices
  genesis network traffic     Traffic statistics
  genesis network wan         WAN connection status
  genesis network wireless    Wireless settings
`);
  }
}

async function cmdAI(args) {
  const ai = await loadAI();
  const subCmd = args[0];

  if (!subCmd || subCmd === 'chat') {
    // Interactive chat mode
    console.log(`
${c.cyan}GENESIS AI Assistant${c.reset}
Type your message and press Enter. Type 'exit' to quit.
`);
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: `${c.green}You>${c.reset} `
    });

    rl.prompt();

    rl.on('line', async (line) => {
      const input = line.trim();
      if (input.toLowerCase() === 'exit') {
        rl.close();
        return;
      }

      if (!input) {
        rl.prompt();
        return;
      }

      try {
        const result = await ai.query(input);
        console.log(`\n${c.cyan}GENESIS>${c.reset} ${result.response}\n`);
        console.log(`${c.dim}[${result.provider}/${result.model}]${c.reset}\n`);
      } catch (err) {
        log(`AI error: ${err.message}`, 'error');
      }

      rl.prompt();
    });

    rl.on('close', () => {
      console.log('\nGoodbye, ADMIN_MASTER.');
      process.exit(0);
    });

    return;
  }

  switch (subCmd) {
    case 'query':
      if (!args[1]) {
        log('Usage: genesis ai query "your message"', 'error');
        return;
      }
      const result = await ai.query(args.slice(1).join(' '));
      console.log(result.response);
      break;

    case 'legal':
      const legalResult = await ai.draftLegal(args[1] || 'letter', { case: '122458751' });
      console.log(legalResult.response);
      break;

    case 'status':
      const history = ai.getHistory();
      console.log(JSON.stringify(history, null, 2));
      break;

    default:
      console.log(`
${c.cyan}AI Commands:${c.reset}
  genesis ai              Interactive chat mode
  genesis ai chat         Interactive chat mode
  genesis ai query "msg"  Single query
  genesis ai legal <type> Draft legal document
  genesis ai status       Show conversation history
`);
  }
}

async function cmdCert(args) {
  // Delegate to CERT-MASTER CLI
  const { spawn } = await import('node:child_process');
  const certMaster = spawn('node', [join(__dirname, 'cert-master.js'), ...args], {
    stdio: 'inherit'
  });

  return new Promise((resolve) => {
    certMaster.on('close', resolve);
  });
}

async function cmdEvidence(args) {
  const { spawn } = await import('node:child_process');
  const evidence = spawn('bash', [join(ROOT_DIR, 'evidence', 'genesis-evidence.sh'), ...args], {
    stdio: 'inherit'
  });

  return new Promise((resolve) => {
    evidence.on('close', resolve);
  });
}

function cmdHelp() {
  console.log(`
${c.cyan}GENESIS 2.0 — Unified CLI${c.reset}
The master command-line interface for Forbidden Ninja City

${c.yellow}Usage:${c.reset}
  genesis <command> [options]

${c.yellow}Commands:${c.reset}
  ${c.green}health${c.reset}              System health check
  ${c.green}pentagon${c.reset} <cmd>      Pentagon architecture commands
  ${c.green}network${c.reset} <cmd>       Network/router commands
  ${c.green}ai${c.reset} [cmd]            AI assistant (interactive or query)
  ${c.green}cert${c.reset} <cmd>          Certificate management (CERT-MASTER)
  ${c.green}evidence${c.reset} <cmd>      Evidence documentation
  ${c.green}help${c.reset}                Show this help

${c.yellow}Quick Commands:${c.reset}
  genesis health                  Full system health check
  genesis pentagon list           List all 40 rooms
  genesis pentagon room spark generate   Generate crypto key
  genesis network devices         List network devices
  genesis ai                      Start AI chat
  genesis cert generate           Generate certificate
  genesis evidence interactive    Document evidence

${c.yellow}Environment:${c.reset}
  NETGEAR_HOST      Router IP (default: 192.168.1.1)
  NETGEAR_PASSWORD  Router password
  OPENAI_API_KEY    OpenAI API key
  ANTHROPIC_API_KEY Anthropic API key
  AI_PROVIDER       AI provider (openai|anthropic|ollama|offline)

${c.yellow}Governance:${c.reset}
  ADMIN_MASTER: CAPUT Admin
  Charter: v1.0.0 (Forbidden Ninja City)
  YubiKey: 5C FIPS (Serial: 31695265)
`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const subArgs = args.slice(1);

  // Show banner for main commands
  if (!['--help', '-h', 'help'].includes(command) && !args.includes('--quiet')) {
    banner();
  }

  try {
    switch (command) {
      case 'health':
        await cmdHealth();
        break;
      case 'pentagon':
      case 'pent':
      case 'p':
        await cmdPentagon(subArgs);
        break;
      case 'network':
      case 'net':
      case 'n':
        await cmdNetwork(subArgs);
        break;
      case 'ai':
      case 'chat':
        await cmdAI(subArgs);
        break;
      case 'cert':
      case 'certificate':
        await cmdCert(subArgs);
        break;
      case 'evidence':
      case 'evd':
        await cmdEvidence(subArgs);
        break;
      case 'help':
      case '--help':
      case '-h':
        cmdHelp();
        break;
      default:
        log(`Unknown command: ${command}`, 'error');
        cmdHelp();
        process.exit(1);
    }
  } catch (err) {
    log(`Fatal error: ${err.message}`, 'error');
    if (process.env.DEBUG) console.error(err);
    process.exit(1);
  }
}

main();

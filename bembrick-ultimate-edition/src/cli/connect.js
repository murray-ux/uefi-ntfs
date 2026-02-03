#!/usr/bin/env node
/**
 * GENESIS Connection Tester
 * Test and validate all service connections
 *
 * GENESIS 2.0 — Forbidden Ninja City
 */

import { ConnectionManager, loadEnv } from '../lib/connections.js';

// ═══════════════════════════════════════════════════════════════════════════
// Colors
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
  cyan: '\x1b[36m'
};

function banner() {
  console.log(`
${c.cyan}╔══════════════════════════════════════════════════════════════╗
║         GENESIS 2.0 — Connection Test Suite                  ║
║              Forbidden Ninja City                            ║
╚══════════════════════════════════════════════════════════════╝${c.reset}
`);
}

function log(msg, type = 'info') {
  const icons = {
    info: `${c.cyan}ℹ${c.reset}`,
    success: `${c.green}✓${c.reset}`,
    warn: `${c.yellow}⚠${c.reset}`,
    error: `${c.red}✗${c.reset}`,
    pending: `${c.dim}○${c.reset}`,
    test: `${c.magenta}▶${c.reset}`
  };
  console.log(`  ${icons[type] || icons.info} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

async function testPentagon(manager) {
  console.log(`\n${c.bold}Pentagon Architecture${c.reset}`);

  const pentagon = manager.get('pentagon');
  if (!pentagon) {
    log('Pentagon not initialized', 'error');
    return false;
  }

  const status = pentagon.getStatus();
  log(`Status: ${status.status}`, 'success');
  log(`Rooms: ${status.totalRooms}`, 'info');
  log(`Handlers: ${status.handlersRegistered}`, 'info');

  // Test a room
  log('Testing spark room...', 'test');
  try {
    const result = await pentagon.cmd('spark', 'generate', { algorithm: 'aes-256-gcm' });
    log(`Key generated: ${result.keyId}`, 'success');
  } catch (err) {
    log(`Room test failed: ${err.message}`, 'error');
    return false;
  }

  return true;
}

async function testNetgear(manager) {
  console.log(`\n${c.bold}Netgear Router${c.reset}`);

  const netgear = manager.get('netgear');
  if (!netgear) {
    log('Netgear not initialized', 'error');
    return false;
  }

  const status = manager.status.netgear;
  log(`Host: ${status.host}`, 'info');
  log(`Model: ${status.model}`, 'info');
  log(`Password configured: ${status.hasPassword ? 'Yes' : 'No (simulation mode)'}`, status.hasPassword ? 'success' : 'warn');

  // Test info endpoint
  log('Testing router info...', 'test');
  try {
    const info = await netgear.getInfo();
    log(`Router: ${info.model} (${info.firmware})`, 'success');
  } catch (err) {
    log(`Info test failed: ${err.message}`, 'error');
    return false;
  }

  // Test devices
  log('Testing attached devices...', 'test');
  try {
    const devices = await netgear.getAttachedDevices();
    log(`Devices found: ${devices.length}`, 'success');
  } catch (err) {
    log(`Devices test failed: ${err.message}`, 'warn');
  }

  return true;
}

async function testAI(manager) {
  console.log(`\n${c.bold}AI Provider${c.reset}`);

  const ai = manager.get('ai');
  if (!ai) {
    log('AI not initialized', 'error');
    return false;
  }

  const status = manager.status.ai;
  log(`Provider: ${status.provider}`, 'info');
  log(`OpenAI API Key: ${status.hasOpenAI ? 'Configured' : 'Not set'}`, status.hasOpenAI ? 'success' : 'warn');
  log(`Anthropic API Key: ${status.hasAnthropic ? 'Configured' : 'Not set'}`, status.hasAnthropic ? 'success' : 'warn');

  // Test query
  log('Testing AI query...', 'test');
  try {
    const result = await ai.query('What is your status?', { mode: 'default' });
    const preview = result.response.substring(0, 80).replace(/\n/g, ' ');
    log(`Response (${result.provider}): "${preview}..."`, 'success');
  } catch (err) {
    log(`AI test failed: ${err.message}`, 'error');
    return false;
  }

  return true;
}

async function testCharter(manager) {
  console.log(`\n${c.bold}Charter Governance${c.reset}`);

  const status = manager.status.charter;

  if (!status.connected) {
    log(`Charter not found: ${status.path || 'unknown path'}`, 'error');
    return false;
  }

  log(`Version: ${status.version}`, 'success');
  log(`Status: ${status.status}`, 'success');
  log(`ADMIN_MASTER: ${status.adminMaster}`, 'info');
  log(`Doctrines: ${status.doctrines}`, 'info');

  return true;
}

async function testYubiKey(manager) {
  console.log(`\n${c.bold}YubiKey${c.reset}`);

  const status = manager.status.yubikey;

  if (!status.connected) {
    log('YubiKey not configured', 'warn');
    return false;
  }

  log(`Serial: ${status.serial}`, 'info');
  log(`Model: ${status.model}`, 'info');
  log(`Mode: ${status.mode}`, 'info');
  log('Note: Physical YubiKey check requires device presence', 'warn');

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  banner();

  // Load environment
  console.log(`${c.bold}Loading Configuration${c.reset}`);
  loadEnv();
  log('Environment loaded', 'success');

  // Initialize connections
  console.log(`\n${c.bold}Initializing Connections${c.reset}`);
  const manager = new ConnectionManager();

  manager.on('connected', ({ service, status }) => {
    log(`${service}: connected`, 'success');
  });

  manager.on('error', ({ service, error }) => {
    log(`${service}: ${error.message}`, 'error');
  });

  await manager.initialize();

  // Run tests
  const results = {
    pentagon: await testPentagon(manager),
    netgear: await testNetgear(manager),
    ai: await testAI(manager),
    charter: await testCharter(manager),
    yubikey: await testYubiKey(manager)
  };

  // Summary
  console.log(`\n${c.cyan}════════════════════════════════════════════════════════════════${c.reset}`);
  console.log(`${c.bold}Connection Test Summary${c.reset}`);
  console.log(`${c.cyan}════════════════════════════════════════════════════════════════${c.reset}\n`);

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  for (const [service, result] of Object.entries(results)) {
    const icon = result ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
    console.log(`  ${icon} ${service.padEnd(12)} ${result ? 'PASSED' : 'FAILED'}`);
  }

  console.log();
  const overall = passed >= 3; // Pentagon, AI, Charter minimum
  if (overall) {
    console.log(`  ${c.green}${c.bold}OVERALL: READY${c.reset} (${passed}/${total} services)`);
    console.log(`  ${c.dim}The City stands. All core systems operational.${c.reset}`);
  } else {
    console.log(`  ${c.red}${c.bold}OVERALL: NOT READY${c.reset} (${passed}/${total} services)`);
    console.log(`  ${c.dim}Check configuration and try again.${c.reset}`);
  }

  console.log();

  // Configuration hints
  if (!manager.status.netgear.hasPassword) {
    console.log(`${c.yellow}Tip:${c.reset} Set NETGEAR_PASSWORD in .env for real router connection`);
  }
  if (!manager.status.ai.hasOpenAI && !manager.status.ai.hasAnthropic) {
    console.log(`${c.yellow}Tip:${c.reset} Set OPENAI_API_KEY or ANTHROPIC_API_KEY for real AI`);
  }

  console.log();
  process.exit(overall ? 0 : 1);
}

main().catch(err => {
  console.error(`${c.red}Fatal error:${c.reset} ${err.message}`);
  process.exit(1);
});

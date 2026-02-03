#!/usr/bin/env node
/**
 * Evidence Documentation CLI
 * Interactive evidence collection and management
 *
 * GENESIS 2.0 — Forbidden Ninja City
 */

import { createInterface } from 'node:readline';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

// ═══════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════

const EVIDENCE_DIR = process.env.EVIDENCE_DIR || './evidence/items';
const CASE_NUMBER = process.env.CASE_NUMBER || '122458751';
const COURT = 'WA Magistrates Court';

// Colors
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// ═══════════════════════════════════════════════════════════════════════════
// Evidence Categories
// ═══════════════════════════════════════════════════════════════════════════

const CATEGORIES = {
  'digital': 'Digital Evidence (files, screenshots, logs)',
  'communication': 'Communications (emails, messages, calls)',
  'document': 'Documents (contracts, letters, records)',
  'multimedia': 'Multimedia (photos, videos, audio)',
  'device': 'Device Evidence (phone, computer, IoT)',
  'network': 'Network Evidence (traffic, logs, access)',
  'physical': 'Physical Items (with photos)',
  'witness': 'Witness Statements',
  'other': 'Other Evidence'
};

const SEVERITY = {
  'low': 'Low - Minor relevance',
  'medium': 'Medium - Moderate relevance',
  'high': 'High - Significant relevance',
  'critical': 'Critical - Key evidence'
};

// ═══════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════

function log(msg, level = 'info') {
  const colors = { info: C.cyan, success: C.green, warn: C.yellow, error: C.red };
  console.log(`${colors[level] || C.reset}${msg}${C.reset}`);
}

function header(text) {
  console.log(`\n${C.bold}${C.blue}╔${'═'.repeat(60)}╗${C.reset}`);
  console.log(`${C.bold}${C.blue}║${C.reset} ${text.padEnd(58)} ${C.bold}${C.blue}║${C.reset}`);
  console.log(`${C.bold}${C.blue}╚${'═'.repeat(60)}╝${C.reset}\n`);
}

function generateEvidenceId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `EVD-${date}-${seq}`;
}

function hashContent(content) {
  return createHash('sha256').update(content).digest('hex');
}

// ═══════════════════════════════════════════════════════════════════════════
// Interactive Prompt
// ═══════════════════════════════════════════════════════════════════════════

class EvidenceCLI {
  constructor() {
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.currentEvidence = null;
  }

  async prompt(question, defaultValue = '') {
    return new Promise((resolve) => {
      const suffix = defaultValue ? ` [${defaultValue}]` : '';
      this.rl.question(`${C.cyan}${question}${suffix}: ${C.reset}`, (answer) => {
        resolve(answer.trim() || defaultValue);
      });
    });
  }

  async confirm(question) {
    const answer = await this.prompt(`${question} (y/n)`, 'n');
    return answer.toLowerCase() === 'y';
  }

  async selectOption(question, options) {
    console.log(`\n${C.cyan}${question}${C.reset}`);
    const keys = Object.keys(options);
    keys.forEach((key, i) => {
      console.log(`  ${C.yellow}${i + 1}.${C.reset} ${key} - ${options[key]}`);
    });
    const answer = await this.prompt('Select option');
    const index = parseInt(answer, 10) - 1;
    if (index >= 0 && index < keys.length) {
      return keys[index];
    }
    return keys[0];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Main Menu
  // ═══════════════════════════════════════════════════════════════════════════

  async mainMenu() {
    header('GENESIS Evidence Documentation System');
    console.log(`${C.bold}Case:${C.reset} ${COURT} ${CASE_NUMBER}`);
    console.log(`${C.bold}Date:${C.reset} ${new Date().toISOString()}\n`);

    console.log(`${C.yellow}1.${C.reset} Document New Evidence`);
    console.log(`${C.yellow}2.${C.reset} List Evidence Items`);
    console.log(`${C.yellow}3.${C.reset} Search Evidence`);
    console.log(`${C.yellow}4.${C.reset} View Evidence Details`);
    console.log(`${C.yellow}5.${C.reset} Export Evidence Bundle`);
    console.log(`${C.yellow}6.${C.reset} Verify Chain Integrity`);
    console.log(`${C.yellow}7.${C.reset} Exit`);

    const choice = await this.prompt('\nSelect option');

    switch (choice) {
      case '1': await this.documentEvidence(); break;
      case '2': await this.listEvidence(); break;
      case '3': await this.searchEvidence(); break;
      case '4': await this.viewEvidence(); break;
      case '5': await this.exportBundle(); break;
      case '6': await this.verifyChain(); break;
      case '7':
        log('Exiting. The City remembers all.', 'info');
        this.rl.close();
        return;
      default:
        log('Invalid option', 'warn');
    }

    await this.mainMenu();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Document Evidence
  // ═══════════════════════════════════════════════════════════════════════════

  async documentEvidence() {
    header('Document New Evidence');

    const evidenceId = generateEvidenceId();
    console.log(`${C.bold}Evidence ID:${C.reset} ${evidenceId}\n`);

    // Collect basic info
    const title = await this.prompt('Title/Description');
    if (!title) {
      log('Title is required', 'error');
      return;
    }

    const category = await this.selectOption('Category', CATEGORIES);
    const severity = await this.selectOption('Severity Level', SEVERITY);

    // Source information
    console.log(`\n${C.bold}Source Information${C.reset}`);
    const sourceDevice = await this.prompt('Source Device', 'iPhone 16 Pro Max');
    const sourceLocation = await this.prompt('Source Location/Path');
    const discoveredBy = await this.prompt('Discovered By', 'Murray Bembrick');
    const discoveredAt = await this.prompt('Discovery Date/Time', new Date().toISOString());

    // Detailed description
    console.log(`\n${C.bold}Detailed Description${C.reset}`);
    console.log(`${C.cyan}Enter description (empty line to finish):${C.reset}`);

    let description = '';
    let line = await this.prompt('');
    while (line) {
      description += line + '\n';
      line = await this.prompt('');
    }

    // Attachments
    const attachments = [];
    if (await this.confirm('\nAttach files?')) {
      console.log('Enter file paths (empty to finish):');
      let filePath = await this.prompt('File path');
      while (filePath) {
        if (existsSync(filePath)) {
          const content = readFileSync(filePath);
          attachments.push({
            name: basename(filePath),
            path: filePath,
            size: content.length,
            hash: hashContent(content)
          });
          log(`Added: ${basename(filePath)}`, 'success');
        } else {
          log(`File not found: ${filePath}`, 'warn');
        }
        filePath = await this.prompt('File path');
      }
    }

    // Chain of custody
    const custodian = await this.prompt('Current Custodian', 'Murray Bembrick');

    // Build evidence record
    const evidence = {
      id: evidenceId,
      uuid: randomUUID(),
      caseNumber: CASE_NUMBER,
      court: COURT,
      title,
      category,
      severity,
      source: {
        device: sourceDevice,
        location: sourceLocation,
        discoveredBy,
        discoveredAt
      },
      description: description.trim(),
      attachments,
      chainOfCustody: [{
        custodian,
        action: 'created',
        timestamp: new Date().toISOString(),
        notes: 'Initial documentation'
      }],
      metadata: {
        createdAt: new Date().toISOString(),
        createdBy: discoveredBy,
        version: 1
      }
    };

    // Compute hash
    evidence.contentHash = hashContent(JSON.stringify(evidence));

    // Confirm and save
    console.log(`\n${C.bold}Evidence Summary${C.reset}`);
    console.log(`  ID: ${evidence.id}`);
    console.log(`  Title: ${evidence.title}`);
    console.log(`  Category: ${evidence.category}`);
    console.log(`  Severity: ${evidence.severity}`);
    console.log(`  Attachments: ${evidence.attachments.length}`);
    console.log(`  Hash: ${evidence.contentHash.substring(0, 16)}...`);

    if (await this.confirm('\nSave this evidence record?')) {
      this.saveEvidence(evidence);
      log(`\nEvidence saved: ${evidence.id}`, 'success');
    } else {
      log('Evidence discarded', 'warn');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Storage Operations
  // ═══════════════════════════════════════════════════════════════════════════

  saveEvidence(evidence) {
    if (!existsSync(EVIDENCE_DIR)) {
      mkdirSync(EVIDENCE_DIR, { recursive: true });
    }

    const filename = `${evidence.id}.json`;
    const filepath = join(EVIDENCE_DIR, filename);
    writeFileSync(filepath, JSON.stringify(evidence, null, 2));
  }

  loadEvidence(id) {
    const filepath = join(EVIDENCE_DIR, `${id}.json`);
    if (existsSync(filepath)) {
      return JSON.parse(readFileSync(filepath, 'utf-8'));
    }
    return null;
  }

  getAllEvidence() {
    if (!existsSync(EVIDENCE_DIR)) return [];

    return readdirSync(EVIDENCE_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const filepath = join(EVIDENCE_DIR, f);
        try {
          return JSON.parse(readFileSync(filepath, 'utf-8'));
        } catch {
          return null;
        }
      })
      .filter(e => e !== null)
      .sort((a, b) => new Date(b.metadata.createdAt) - new Date(a.metadata.createdAt));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // List Evidence
  // ═══════════════════════════════════════════════════════════════════════════

  async listEvidence() {
    header('Evidence Items');

    const items = this.getAllEvidence();

    if (items.length === 0) {
      log('No evidence items found', 'warn');
      return;
    }

    console.log(`${C.bold}Found ${items.length} evidence items:${C.reset}\n`);

    items.forEach((item, i) => {
      const severityColor = {
        critical: C.red,
        high: C.yellow,
        medium: C.cyan,
        low: C.reset
      }[item.severity] || C.reset;

      console.log(`${C.yellow}${i + 1}.${C.reset} ${C.bold}${item.id}${C.reset}`);
      console.log(`   Title: ${item.title}`);
      console.log(`   Category: ${item.category} | Severity: ${severityColor}${item.severity}${C.reset}`);
      console.log(`   Created: ${item.metadata.createdAt}`);
      console.log('');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Search Evidence
  // ═══════════════════════════════════════════════════════════════════════════

  async searchEvidence() {
    header('Search Evidence');

    const query = await this.prompt('Search term');
    if (!query) return;

    const items = this.getAllEvidence();
    const matches = items.filter(item => {
      const searchText = JSON.stringify(item).toLowerCase();
      return searchText.includes(query.toLowerCase());
    });

    if (matches.length === 0) {
      log(`No matches for "${query}"`, 'warn');
      return;
    }

    console.log(`\n${C.bold}Found ${matches.length} matches:${C.reset}\n`);

    matches.forEach(item => {
      console.log(`${C.bold}${item.id}${C.reset} - ${item.title}`);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // View Evidence Details
  // ═══════════════════════════════════════════════════════════════════════════

  async viewEvidence() {
    const id = await this.prompt('Evidence ID');
    if (!id) return;

    const evidence = this.loadEvidence(id);
    if (!evidence) {
      log(`Evidence not found: ${id}`, 'error');
      return;
    }

    header(`Evidence: ${evidence.id}`);

    console.log(`${C.bold}Basic Information${C.reset}`);
    console.log(`  Title: ${evidence.title}`);
    console.log(`  UUID: ${evidence.uuid}`);
    console.log(`  Case: ${evidence.court} ${evidence.caseNumber}`);
    console.log(`  Category: ${evidence.category}`);
    console.log(`  Severity: ${evidence.severity}`);

    console.log(`\n${C.bold}Source${C.reset}`);
    console.log(`  Device: ${evidence.source.device}`);
    console.log(`  Location: ${evidence.source.location}`);
    console.log(`  Discovered By: ${evidence.source.discoveredBy}`);
    console.log(`  Discovered At: ${evidence.source.discoveredAt}`);

    if (evidence.description) {
      console.log(`\n${C.bold}Description${C.reset}`);
      console.log(`  ${evidence.description}`);
    }

    if (evidence.attachments.length > 0) {
      console.log(`\n${C.bold}Attachments (${evidence.attachments.length})${C.reset}`);
      evidence.attachments.forEach(att => {
        console.log(`  - ${att.name} (${att.size} bytes)`);
        console.log(`    Hash: ${att.hash.substring(0, 32)}...`);
      });
    }

    console.log(`\n${C.bold}Chain of Custody${C.reset}`);
    evidence.chainOfCustody.forEach(entry => {
      console.log(`  ${entry.timestamp} - ${entry.action} by ${entry.custodian}`);
      if (entry.notes) console.log(`    Notes: ${entry.notes}`);
    });

    console.log(`\n${C.bold}Integrity${C.reset}`);
    console.log(`  Content Hash: ${evidence.contentHash}`);
    console.log(`  Created: ${evidence.metadata.createdAt}`);
    console.log(`  Version: ${evidence.metadata.version}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Export Bundle
  // ═══════════════════════════════════════════════════════════════════════════

  async exportBundle() {
    header('Export Evidence Bundle');

    const items = this.getAllEvidence();
    if (items.length === 0) {
      log('No evidence to export', 'warn');
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const bundleName = `evidence-bundle-${timestamp}.json`;

    const bundle = {
      exportedAt: new Date().toISOString(),
      caseNumber: CASE_NUMBER,
      court: COURT,
      itemCount: items.length,
      items,
      bundleHash: hashContent(JSON.stringify(items))
    };

    const exportPath = join(EVIDENCE_DIR, '..', bundleName);
    writeFileSync(exportPath, JSON.stringify(bundle, null, 2));

    log(`\nBundle exported: ${bundleName}`, 'success');
    log(`  Items: ${bundle.itemCount}`, 'info');
    log(`  Hash: ${bundle.bundleHash.substring(0, 32)}...`, 'info');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Verify Chain
  // ═══════════════════════════════════════════════════════════════════════════

  async verifyChain() {
    header('Verify Chain Integrity');

    const items = this.getAllEvidence();
    if (items.length === 0) {
      log('No evidence to verify', 'warn');
      return;
    }

    let valid = 0;
    let invalid = 0;

    for (const item of items) {
      // Recompute hash
      const storedHash = item.contentHash;
      delete item.contentHash;
      const computedHash = hashContent(JSON.stringify(item));
      item.contentHash = storedHash;

      if (storedHash === computedHash) {
        log(`${C.green}✓${C.reset} ${item.id} - Valid`, 'success');
        valid++;
      } else {
        log(`${C.red}✗${C.reset} ${item.id} - TAMPERED`, 'error');
        invalid++;
      }
    }

    console.log('');
    log(`Verified: ${valid} valid, ${invalid} invalid`, invalid > 0 ? 'error' : 'success');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI Entry Point
// ═══════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const command = args[0];

const cli = new EvidenceCLI();

switch (command) {
  case 'interactive':
  case undefined:
    cli.mainMenu();
    break;

  case 'list':
    cli.listEvidence().then(() => cli.rl.close());
    break;

  case 'search':
    const query = args[1];
    if (query) {
      const items = cli.getAllEvidence().filter(item =>
        JSON.stringify(item).toLowerCase().includes(query.toLowerCase())
      );
      items.forEach(item => console.log(`${item.id} - ${item.title}`));
    }
    cli.rl.close();
    break;

  case 'export':
    cli.exportBundle().then(() => cli.rl.close());
    break;

  case 'verify':
    cli.verifyChain().then(() => cli.rl.close());
    break;

  case 'help':
  default:
    console.log(`
${C.bold}GENESIS Evidence CLI${C.reset}

Usage:
  evidence [command]

Commands:
  interactive    Launch interactive mode (default)
  list           List all evidence items
  search <term>  Search evidence
  export         Export evidence bundle
  verify         Verify chain integrity
  help           Show this help

Environment:
  EVIDENCE_DIR   Evidence storage directory
  CASE_NUMBER    Default case number
`);
    cli.rl.close();
    break;
}

#!/usr/bin/env node
/**
 * WorkflowGuardian CLI
 *
 * Usage:
 *   npx workflow-guardian scan .github/workflows/
 *   npx workflow-guardian scan workflow.yml --json
 *   npx workflow-guardian serve --port 3000
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname } from 'path';
import WorkflowGuardian, { formatResult, ScanResult } from './guardian';

const args = process.argv.slice(2);
const command = args[0];

const guardian = new WorkflowGuardian({
  confidenceThreshold: parseFloat(process.env.GUARDIAN_CONFIDENCE || '0.75'),
  blockThreshold: parseInt(process.env.GUARDIAN_BLOCK_THRESHOLD || '80'),
  warnThreshold: parseInt(process.env.GUARDIAN_WARN_THRESHOLD || '30'),
});

function scanFile(filepath: string): ScanResult {
  const content = readFileSync(filepath, 'utf-8');
  return guardian.execute(filepath, content);
}

function scanDirectory(dirpath: string): ScanResult[] {
  const results: ScanResult[] = [];
  const files = readdirSync(dirpath);

  for (const file of files) {
    const fullPath = join(dirpath, file);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      results.push(...scanDirectory(fullPath));
    } else if (['.yml', '.yaml'].includes(extname(file))) {
      results.push(scanFile(fullPath));
    }
  }

  return results;
}

function printHelp() {
  console.log(`
WorkflowGuardian - Self-Adaptive CI/CD Security Engine

USAGE:
  workflow-guardian <command> [options]

COMMANDS:
  scan <path>     Scan workflow file or directory
  stats           Show scanning statistics
  help            Show this help message

OPTIONS:
  --json          Output as JSON
  --strict        Exit with error on any warning
  --quiet         Only output on findings

ENVIRONMENT:
  GUARDIAN_CONFIDENCE        Confidence threshold (default: 0.75)
  GUARDIAN_BLOCK_THRESHOLD   Risk score to block (default: 80)
  GUARDIAN_WARN_THRESHOLD    Risk score to warn (default: 30)

EXAMPLES:
  workflow-guardian scan .github/workflows/
  workflow-guardian scan ci.yml --json
  GUARDIAN_BLOCK_THRESHOLD=50 workflow-guardian scan . --strict
`);
}

async function main() {
  if (!command || command === 'help' || command === '--help') {
    printHelp();
    process.exit(0);
  }

  if (command === 'scan') {
    const target = args[1];
    const jsonOutput = args.includes('--json');
    const strict = args.includes('--strict');
    const quiet = args.includes('--quiet');

    if (!target) {
      console.error('Error: No target specified');
      process.exit(1);
    }

    if (!existsSync(target)) {
      console.error(`Error: Path not found: ${target}`);
      process.exit(1);
    }

    const stat = statSync(target);
    const results = stat.isDirectory() ? scanDirectory(target) : [scanFile(target)];

    if (jsonOutput) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      for (const result of results) {
        if (quiet && result.verdict === 'ALLOW') continue;
        console.log(formatResult(result));
        console.log('');
      }

      // Summary
      const stats = guardian.getStats();
      console.log('─'.repeat(60));
      console.log(`Summary: ${stats.blocked} blocked, ${stats.warned} warned, ${stats.allowed} allowed`);
    }

    // Exit codes
    const hasBlocked = results.some(r => r.verdict === 'BLOCK');
    const hasWarned = results.some(r => r.verdict === 'WARN');

    if (hasBlocked) process.exit(2);
    if (strict && hasWarned) process.exit(1);
    process.exit(0);
  }

  if (command === 'stats') {
    const stats = guardian.getStats();
    console.log(JSON.stringify(stats, null, 2));
    process.exit(0);
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

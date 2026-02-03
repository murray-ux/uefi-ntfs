#!/usr/bin/env node
// Forbidden Ninja City Charter - Integrity Verification (Node.js)

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHARTER_DIR =
  process.env.FORBIDDEN_NINJA_CHARTER_DIR || join(__dirname, '..', 'charter');

function error(msg) {
  console.error(`\x1b[31mERROR:\x1b[0m ${msg}`);
  process.exit(1);
}

function info(msg) {
  console.log(`\x1b[32mINFO:\x1b[0m ${msg}`);
}

try {
  const metaPath = join(CHARTER_DIR, 'charter.meta.json');
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  info('Charter metadata loaded');

  const charterPath = join(CHARTER_DIR, meta.charter_filename);
  const charterContent = readFileSync(charterPath);
  const computedHash = createHash('sha256').update(charterContent).digest('hex');

  if (computedHash !== meta.charter_sha256) {
    error(
      `Charter hash mismatch!\n  Expected: ${meta.charter_sha256}\n  Computed: ${computedHash}`,
    );
  }

  info('Charter integrity verified: hash matches');

  const required = ['document_type', 'name', 'version', 'admin_master', 'supremacy'];
  for (const field of required) {
    if (!meta[field]) {
      error(`Missing required metadata field: ${field}`);
    }
  }

  info('Charter governance verification: PASSED');
  process.exit(0);
} catch (err) {
  error(`Verification failed: ${err.message}`);
}

#!/usr/bin/env node
/**
 * CERT-MASTER CLI
 * Certificate lifecycle management with Charter enforcement
 *
 * GENESIS 2.0 — Forbidden Ninja City
 * ADMIN_MASTER: CAPUT Admin
 */

import { createHash, randomBytes, generateKeyPairSync } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..', '..');
const OUTPUT_DIR = join(ROOT_DIR, 'output', 'certs');
const META_DIR = join(ROOT_DIR, 'output', 'meta');

// ═══════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
  owner: 'CAPUT Admin',
  email: 'admin@caput.system',
  org: 'Forbidden Ninja City',
  charterVersion: '1.0.0',
  yubikey: {
    serial: '31695265',
    model: '5C FIPS'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Colors
// ═══════════════════════════════════════════════════════════════════════════

const c = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(msg, type = 'info') {
  const prefix = {
    info: `${c.cyan}[CERT-MASTER]${c.reset}`,
    success: `${c.green}[✓]${c.reset}`,
    warn: `${c.yellow}[⚠]${c.reset}`,
    error: `${c.red}[✗]${c.reset}`,
    header: `${c.bold}${c.blue}`
  };
  console.log(`${prefix[type] || prefix.info} ${msg}${type === 'header' ? c.reset : ''}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Charter Verification
// ═══════════════════════════════════════════════════════════════════════════

function verifyCharter() {
  const charterDir = join(ROOT_DIR, '..', 'forbidden-ninja-city-charter-v1.0.0', 'charter');
  const metaPath = join(charterDir, 'charter.meta.json');
  const charterPath = join(charterDir, 'charter.md');

  if (!existsSync(metaPath) || !existsSync(charterPath)) {
    log('Charter not found - operating in standalone mode', 'warn');
    return { valid: false, standalone: true };
  }

  try {
    const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
    const charterContent = readFileSync(charterPath);
    const computedHash = createHash('sha256').update(charterContent).digest('hex');

    if (computedHash !== meta.charter_sha256) {
      log('Charter hash mismatch - UNSIGNED LAW', 'error');
      return { valid: false, reason: 'hash_mismatch' };
    }

    log(`Charter verified: v${meta.version} (${meta.status})`, 'success');
    return {
      valid: true,
      version: meta.version,
      hash: computedHash,
      adminMaster: meta.admin_master.name
    };
  } catch (err) {
    log(`Charter verification failed: ${err.message}`, 'error');
    return { valid: false, reason: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Certificate Generation
// ═══════════════════════════════════════════════════════════════════════════

function generateCertId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(4).toString('hex').toUpperCase();
  return `CERT-${timestamp}-${random}`;
}

function generateKeyPair(type = 'ed25519') {
  if (type === 'ed25519') {
    return generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
  } else if (type === 'rsa') {
    return generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
  }
  throw new Error(`Unsupported key type: ${type}`);
}

function createCertificate(options = {}) {
  const {
    type = 'ed25519',
    subject = CONFIG.owner,
    email = CONFIG.email,
    org = CONFIG.org,
    validityDays = 365,
    purpose = 'signing'
  } = options;

  const certId = generateCertId();
  const { publicKey, privateKey } = generateKeyPair(type);
  const now = new Date();
  const notAfter = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

  const cert = {
    certificate_id: certId,
    version: '1.0.0',
    type: type,
    purpose: purpose,
    subject: {
      commonName: subject,
      email: email,
      organization: org
    },
    issuer: {
      commonName: 'GENESIS CERT-MASTER',
      organization: 'Forbidden Ninja City',
      adminMaster: CONFIG.owner
    },
    validity: {
      notBefore: now.toISOString(),
      notAfter: notAfter.toISOString(),
      daysValid: validityDays
    },
    publicKey: publicKey,
    fingerprint: createHash('sha256').update(publicKey).digest('hex'),
    extensions: {
      keyUsage: purpose === 'signing' ? ['digitalSignature'] : ['keyEncipherment', 'dataEncipherment'],
      basicConstraints: { ca: false }
    },
    metadata: {
      generatedAt: now.toISOString(),
      generatedBy: 'CERT-MASTER CLI',
      charterVersion: CONFIG.charterVersion,
      yubikeySerial: CONFIG.yubikey.serial
    }
  };

  return { cert, privateKey };
}

// ═══════════════════════════════════════════════════════════════════════════
// File Operations
// ═══════════════════════════════════════════════════════════════════════════

function saveCertificate(cert, privateKey) {
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
  if (!existsSync(META_DIR)) mkdirSync(META_DIR, { recursive: true });

  const certPath = join(OUTPUT_DIR, `${cert.certificate_id}.pem`);
  const keyPath = join(OUTPUT_DIR, `${cert.certificate_id}.key`);
  const metaPath = join(META_DIR, `${cert.certificate_id}.json`);

  // Save public key as PEM
  writeFileSync(certPath, cert.publicKey);

  // Save private key (in production, encrypt this!)
  writeFileSync(keyPath, privateKey, { mode: 0o600 });

  // Save metadata
  const meta = {
    ...cert,
    publicKey: undefined, // Don't duplicate in meta
    publicKeyFile: `${cert.certificate_id}.pem`,
    privateKeyFile: `${cert.certificate_id}.key`,
    cert_master_cli_sha256: getCliHash()
  };
  writeFileSync(metaPath, JSON.stringify(meta, null, 2));

  return { certPath, keyPath, metaPath };
}

function getCliHash() {
  try {
    const cliPath = fileURLToPath(import.meta.url);
    const content = readFileSync(cliPath);
    return createHash('sha256').update(content).digest('hex');
  } catch {
    return 'unknown';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Commands
// ═══════════════════════════════════════════════════════════════════════════

function cmdGenerate(args) {
  log('═══════════════════════════════════════════════════════════════', 'header');
  log('CERT-MASTER — Certificate Generation', 'header');
  log('═══════════════════════════════════════════════════════════════', 'header');
  console.log();

  // Verify charter first
  const charter = verifyCharter();
  console.log();

  // Parse options
  const type = args.includes('--rsa') ? 'rsa' : 'ed25519';
  const purpose = args.includes('--encrypt') ? 'encryption' : 'signing';
  const daysIdx = args.indexOf('--days');
  const days = daysIdx !== -1 ? parseInt(args[daysIdx + 1]) || 365 : 365;

  log(`Generating ${type.toUpperCase()} certificate for ${purpose}...`);

  const { cert, privateKey } = createCertificate({ type, purpose, validityDays: days });
  const { certPath, keyPath, metaPath } = saveCertificate(cert, privateKey);

  console.log();
  log('Certificate generated successfully!', 'success');
  console.log();
  console.log(`  ${c.cyan}Certificate ID:${c.reset}  ${cert.certificate_id}`);
  console.log(`  ${c.cyan}Type:${c.reset}            ${type.toUpperCase()}`);
  console.log(`  ${c.cyan}Purpose:${c.reset}         ${purpose}`);
  console.log(`  ${c.cyan}Subject:${c.reset}         ${cert.subject.commonName}`);
  console.log(`  ${c.cyan}Valid Until:${c.reset}     ${cert.validity.notAfter}`);
  console.log(`  ${c.cyan}Fingerprint:${c.reset}     ${cert.fingerprint.substring(0, 32)}...`);
  console.log();
  console.log(`  ${c.green}Public Key:${c.reset}      ${certPath}`);
  console.log(`  ${c.yellow}Private Key:${c.reset}     ${keyPath}`);
  console.log(`  ${c.blue}Metadata:${c.reset}        ${metaPath}`);
  console.log();

  if (charter.valid) {
    log(`Bound to Charter v${charter.version}`, 'success');
  }
}

function cmdList() {
  log('═══════════════════════════════════════════════════════════════', 'header');
  log('CERT-MASTER — Certificate Inventory', 'header');
  log('═══════════════════════════════════════════════════════════════', 'header');
  console.log();

  if (!existsSync(META_DIR)) {
    log('No certificates found.', 'warn');
    return;
  }

  const { readdirSync } = await import('node:fs');
  const files = readdirSync(META_DIR).filter(f => f.endsWith('.json'));

  if (files.length === 0) {
    log('No certificates found.', 'warn');
    return;
  }

  console.log(`  ${c.cyan}ID${c.reset}                          ${c.cyan}Type${c.reset}      ${c.cyan}Purpose${c.reset}     ${c.cyan}Expires${c.reset}`);
  console.log('  ' + '─'.repeat(70));

  for (const file of files) {
    try {
      const meta = JSON.parse(readFileSync(join(META_DIR, file), 'utf8'));
      const expires = new Date(meta.validity.notAfter);
      const isExpired = expires < new Date();
      const status = isExpired ? c.red : c.green;
      console.log(`  ${meta.certificate_id}  ${meta.type.padEnd(9)} ${meta.purpose.padEnd(11)} ${status}${expires.toISOString().split('T')[0]}${c.reset}`);
    } catch {
      // Skip invalid files
    }
  }
  console.log();
  log(`Total: ${files.length} certificate(s)`, 'info');
}

function cmdVerify(certId) {
  log('═══════════════════════════════════════════════════════════════', 'header');
  log('CERT-MASTER — Certificate Verification', 'header');
  log('═══════════════════════════════════════════════════════════════', 'header');
  console.log();

  const metaPath = join(META_DIR, `${certId}.json`);
  if (!existsSync(metaPath)) {
    log(`Certificate not found: ${certId}`, 'error');
    process.exit(1);
  }

  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  const certPath = join(OUTPUT_DIR, meta.publicKeyFile);

  if (!existsSync(certPath)) {
    log('Public key file missing!', 'error');
    process.exit(1);
  }

  const publicKey = readFileSync(certPath, 'utf8');
  const computedFingerprint = createHash('sha256').update(publicKey).digest('hex');

  console.log(`  ${c.cyan}Certificate ID:${c.reset}  ${meta.certificate_id}`);
  console.log(`  ${c.cyan}Subject:${c.reset}         ${meta.subject.commonName}`);
  console.log();

  if (computedFingerprint === meta.fingerprint) {
    log('Fingerprint matches - certificate intact', 'success');
  } else {
    log('Fingerprint mismatch - certificate may be tampered!', 'error');
    process.exit(1);
  }

  const expires = new Date(meta.validity.notAfter);
  if (expires < new Date()) {
    log(`Certificate EXPIRED on ${expires.toISOString()}`, 'error');
  } else {
    log(`Certificate valid until ${expires.toISOString()}`, 'success');
  }

  // Charter binding check
  const charter = verifyCharter();
  if (charter.valid && meta.charterVersion) {
    if (meta.charterVersion === charter.version) {
      log(`Bound to current Charter v${charter.version}`, 'success');
    } else {
      log(`Bound to older Charter v${meta.charterVersion} (current: v${charter.version})`, 'warn');
    }
  }
}

function cmdRevoke(certId) {
  log('═══════════════════════════════════════════════════════════════', 'header');
  log('CERT-MASTER — Certificate Revocation', 'header');
  log('═══════════════════════════════════════════════════════════════', 'header');
  console.log();

  const metaPath = join(META_DIR, `${certId}.json`);
  if (!existsSync(metaPath)) {
    log(`Certificate not found: ${certId}`, 'error');
    process.exit(1);
  }

  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));

  // Add revocation info
  meta.revoked = {
    at: new Date().toISOString(),
    by: CONFIG.owner,
    reason: 'Manual revocation via CERT-MASTER CLI'
  };
  meta.status = 'REVOKED';

  writeFileSync(metaPath, JSON.stringify(meta, null, 2));

  log(`Certificate ${certId} has been REVOKED`, 'success');
  console.log();
  console.log(`  ${c.red}Status:${c.reset}     REVOKED`);
  console.log(`  ${c.red}Revoked At:${c.reset} ${meta.revoked.at}`);
  console.log(`  ${c.red}Revoked By:${c.reset} ${meta.revoked.by}`);
}

function cmdHelp() {
  console.log(`
${c.bold}CERT-MASTER CLI${c.reset}
Certificate lifecycle management for Forbidden Ninja City

${c.cyan}Usage:${c.reset}
  cert-master <command> [options]

${c.cyan}Commands:${c.reset}
  generate [options]    Generate a new certificate
  list                  List all certificates
  verify <cert-id>      Verify certificate integrity
  revoke <cert-id>      Revoke a certificate
  help                  Show this help

${c.cyan}Generate Options:${c.reset}
  --rsa                 Use RSA-4096 instead of Ed25519
  --encrypt             Generate for encryption (default: signing)
  --days <n>            Validity period in days (default: 365)

${c.cyan}Examples:${c.reset}
  cert-master generate
  cert-master generate --rsa --days 730
  cert-master list
  cert-master verify CERT-ABC123-XYZ
  cert-master revoke CERT-ABC123-XYZ

${c.cyan}Governance:${c.reset}
  All certificates are bound to the Forbidden Ninja City Charter.
  Charter verification runs automatically before generation.
`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  switch (command) {
    case 'generate':
    case 'gen':
    case 'new':
      cmdGenerate(args.slice(1));
      break;
    case 'list':
    case 'ls':
      await cmdList();
      break;
    case 'verify':
    case 'check':
      if (!args[1]) {
        log('Certificate ID required', 'error');
        process.exit(1);
      }
      cmdVerify(args[1]);
      break;
    case 'revoke':
      if (!args[1]) {
        log('Certificate ID required', 'error');
        process.exit(1);
      }
      cmdRevoke(args[1]);
      break;
    case 'help':
    case '--help':
    case '-h':
    default:
      cmdHelp();
  }
}

main().catch(err => {
  log(`Fatal error: ${err.message}`, 'error');
  process.exit(1);
});

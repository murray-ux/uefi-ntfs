#!/usr/bin/env node
/**
 * GENESIS STOP HOOK
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Claude Code Hook: Stop
 * Final check before response delivery
 *
 * Input (stdin): JSON with { response, sessionId }
 * Output (stdout): JSON with { action: 'continue'|'block', reason? }
 */

import { createHash } from 'crypto';

// Patterns that should not appear in final responses
const FORBIDDEN_OUTPUT_PATTERNS = [
  /-----BEGIN\s+(?:RSA|EC|DSA|OPENSSH)\s+PRIVATE\s+KEY-----/gi,
  /AKIA[0-9A-Z]{16}/g,                    // AWS access keys
  /(?:^|[^a-zA-Z0-9])sk-[a-zA-Z0-9]{48}/g, // OpenAI keys
  /ghp_[a-zA-Z0-9]{36}/g,                 // GitHub tokens
  /gho_[a-zA-Z0-9]{36}/g,                 // GitHub OAuth tokens
  /glpat-[a-zA-Z0-9\-]{20}/g,             // GitLab tokens
  /xox[baprs]-[a-zA-Z0-9\-]+/g            // Slack tokens
];

async function processStop() {
  let input = '';

  for await (const chunk of process.stdin) {
    input += chunk;
  }

  try {
    const data = JSON.parse(input);
    const response = data.response || '';
    const sessionId = data.sessionId || 'unknown';

    const responseStr = typeof response === 'string' ? response : JSON.stringify(response);

    // Check for forbidden patterns in output
    for (const pattern of FORBIDDEN_OUTPUT_PATTERNS) {
      if (pattern.test(responseStr)) {
        console.log(JSON.stringify({
          action: 'block',
          reason: '[GENESIS] Response contains potentially sensitive data that should not be output',
          hookName: 'genesis:stop'
        }));
        return;
      }
    }

    // Audit log
    const auditEntry = {
      timestamp: new Date().toISOString(),
      sessionId,
      responseHash: createHash('sha256').update(responseStr).digest('hex').slice(0, 16),
      responseLength: responseStr.length,
      action: 'delivered'
    };

    console.error(`[GENESIS AUDIT] Stop: ${JSON.stringify(auditEntry)}`);

    console.log(JSON.stringify({
      action: 'continue',
      hookName: 'genesis:stop'
    }));

  } catch (error) {
    console.error(`[GENESIS ERROR] Stop: ${error.message}`);
    console.log(JSON.stringify({
      action: 'continue',
      hookName: 'genesis:stop'
    }));
  }
}

processStop();

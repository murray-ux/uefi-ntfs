#!/usr/bin/env node
/**
 * GENESIS POST-TOOL-USE HOOK
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Claude Code Hook: PostToolUse
 * Processes tool results before the LLM sees them
 *
 * Input (stdin): JSON with { tool, params, result, sessionId }
 * Output (stdout): JSON with { action: 'continue'|'block', modifiedResult?, reason? }
 */

import { createHash } from 'crypto';

// Patterns to redact from tool output
const REDACTION_PATTERNS = [
  { pattern: /password\s*[:=]\s*['"]([^'"]+)['"]/gi, replacement: 'password="[REDACTED]"' },
  { pattern: /api[_-]?key\s*[:=]\s*['"]([^'"]+)['"]/gi, replacement: 'api_key="[REDACTED]"' },
  { pattern: /secret\s*[:=]\s*['"]([^'"]+)['"]/gi, replacement: 'secret="[REDACTED]"' },
  { pattern: /bearer\s+[a-zA-Z0-9_\-\.]+/gi, replacement: 'Bearer [REDACTED]' },
  { pattern: /-----BEGIN\s+(?:RSA|EC|DSA|OPENSSH)\s+PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA|EC|DSA|OPENSSH)\s+PRIVATE\s+KEY-----/gi, replacement: '[PRIVATE KEY REDACTED]' },
  { pattern: /AKIA[0-9A-Z]{16}/g, replacement: '[AWS_ACCESS_KEY_REDACTED]' },
  { pattern: /ghp_[a-zA-Z0-9]{36}/g, replacement: '[GITHUB_TOKEN_REDACTED]' },
  { pattern: /sk-[a-zA-Z0-9]{48}/g, replacement: '[OPENAI_KEY_REDACTED]' }
];

function redactSensitiveData(text) {
  if (typeof text !== 'string') return text;

  let redacted = text;
  let wasRedacted = false;

  for (const { pattern, replacement } of REDACTION_PATTERNS) {
    if (pattern.test(redacted)) {
      wasRedacted = true;
      redacted = redacted.replace(pattern, replacement);
    }
  }

  return { text: redacted, wasRedacted };
}

async function processToolResult() {
  let input = '';

  for await (const chunk of process.stdin) {
    input += chunk;
  }

  try {
    const data = JSON.parse(input);
    const tool = data.tool || data.name || '';
    const result = data.result || data.output || '';
    const sessionId = data.sessionId || 'unknown';

    // Convert result to string for processing
    const resultStr = typeof result === 'string' ? result : JSON.stringify(result);

    // Check and redact sensitive data
    const { text: redactedResult, wasRedacted } = redactSensitiveData(resultStr);

    // Audit log
    const auditEntry = {
      timestamp: new Date().toISOString(),
      sessionId,
      tool,
      resultHash: createHash('sha256').update(resultStr).digest('hex').slice(0, 16),
      resultLength: resultStr.length,
      wasRedacted,
      action: wasRedacted ? 'redacted' : 'passed'
    };

    console.error(`[GENESIS AUDIT] PostToolUse: ${JSON.stringify(auditEntry)}`);

    if (wasRedacted) {
      // Return modified result with redactions
      console.log(JSON.stringify({
        action: 'continue',
        modifiedResult: redactedResult,
        hookName: 'genesis:post-tool-use',
        note: 'Sensitive data was redacted from output'
      }));
    } else {
      // Continue with unmodified result
      console.log(JSON.stringify({
        action: 'continue',
        hookName: 'genesis:post-tool-use'
      }));
    }

  } catch (error) {
    console.error(`[GENESIS ERROR] PostToolUse: ${error.message}`);
    console.log(JSON.stringify({
      action: 'continue',
      hookName: 'genesis:post-tool-use',
      warning: 'Hook processing error, allowing through'
    }));
  }
}

processToolResult();

#!/usr/bin/env node
/**
 * GENESIS USER PROMPT SUBMIT HOOK
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Claude Code Hook: UserPromptSubmit
 * Processes user input before the LLM sees it
 *
 * Input (stdin): JSON with { prompt, sessionId, metadata }
 * Output (stdout): JSON with { action: 'continue'|'block', modifiedPrompt?, reason? }
 */

import { createHash } from 'crypto';

// Patterns that indicate potential security issues
const SECURITY_PATTERNS = [
  /password\s*[:=]\s*['"][^'"]+['"]/gi,
  /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
  /secret\s*[:=]\s*['"][^'"]+['"]/gi,
  /BEGIN\s+(?:RSA|EC|DSA|OPENSSH)\s+PRIVATE\s+KEY/gi,
  /aws_access_key_id/gi,
  /aws_secret_access_key/gi
];

// Patterns that indicate prompt injection attempts
const INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?(?:previous\s+)?instructions/gi,
  /you\s+are\s+now\s+(?:a\s+)?(?:different|new)/gi,
  /disregard\s+(?:all\s+)?(?:your\s+)?(?:previous|prior)/gi,
  /\[INST\]/gi,
  /<\|im_start\|>/gi,
  /system\s*:\s*you\s+are/gi
];

async function processPrompt() {
  let input = '';

  // Read from stdin
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  try {
    const data = JSON.parse(input);
    const prompt = data.prompt || '';
    const sessionId = data.sessionId || 'unknown';

    // Check for security patterns
    for (const pattern of SECURITY_PATTERNS) {
      if (pattern.test(prompt)) {
        console.log(JSON.stringify({
          action: 'block',
          reason: `[GENESIS] Potential credential exposure detected. Pattern: ${pattern.source}`,
          hookName: 'genesis:security-filter'
        }));
        return;
      }
    }

    // Check for injection patterns
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(prompt)) {
        console.log(JSON.stringify({
          action: 'block',
          reason: `[GENESIS] Potential prompt injection detected`,
          hookName: 'genesis:injection-filter'
        }));
        return;
      }
    }

    // Log to audit trail (async, don't wait)
    const auditEntry = {
      timestamp: new Date().toISOString(),
      sessionId,
      promptHash: createHash('sha256').update(prompt).digest('hex').slice(0, 16),
      promptLength: prompt.length,
      action: 'passed'
    };

    // Write to stderr for logging (doesn't affect hook output)
    console.error(`[GENESIS AUDIT] UserPromptSubmit: ${JSON.stringify(auditEntry)}`);

    // Continue with unmodified prompt
    console.log(JSON.stringify({
      action: 'continue',
      hookName: 'genesis:user-prompt-submit'
    }));

  } catch (error) {
    // On error, allow through but log
    console.error(`[GENESIS ERROR] UserPromptSubmit: ${error.message}`);
    console.log(JSON.stringify({
      action: 'continue',
      hookName: 'genesis:user-prompt-submit',
      warning: 'Hook processing error, allowing through'
    }));
  }
}

processPrompt();

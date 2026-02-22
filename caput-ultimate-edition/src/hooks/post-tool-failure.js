#!/usr/bin/env node
/**
 * GENESIS POST-TOOL-FAILURE HOOK
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Claude Code Hook: PostToolUseFailure
 * Handles tool execution failures
 *
 * Input (stdin): JSON with { tool, params, error, sessionId }
 * Output (stdout): JSON with { action: 'continue'|'retry', retryParams?, reason? }
 */

// Errors that might benefit from retry
const RETRIABLE_ERRORS = [
  /ECONNRESET/i,
  /ETIMEDOUT/i,
  /ENOTFOUND/i,
  /socket hang up/i,
  /network error/i,
  /rate limit/i,
  /429/,
  /503/,
  /502/
];

// Track retry counts per session/tool
const retryCounts = new Map();
const MAX_RETRIES = 3;

function shouldRetry(error, tool, sessionId) {
  const key = `${sessionId}:${tool}`;
  const count = retryCounts.get(key) || 0;

  if (count >= MAX_RETRIES) {
    return false;
  }

  const errorStr = typeof error === 'string' ? error : JSON.stringify(error);

  for (const pattern of RETRIABLE_ERRORS) {
    if (pattern.test(errorStr)) {
      retryCounts.set(key, count + 1);
      return true;
    }
  }

  return false;
}

async function processToolFailure() {
  let input = '';

  for await (const chunk of process.stdin) {
    input += chunk;
  }

  try {
    const data = JSON.parse(input);
    const tool = data.tool || data.name || '';
    const params = data.params || data.input || {};
    const error = data.error || {};
    const sessionId = data.sessionId || 'unknown';

    const errorMessage = error.message || error.toString?.() || JSON.stringify(error);

    // Audit log
    const auditEntry = {
      timestamp: new Date().toISOString(),
      sessionId,
      tool,
      errorType: error.name || 'Unknown',
      errorMessage: errorMessage.slice(0, 200),
      action: 'failure'
    };

    console.error(`[GENESIS AUDIT] PostToolFailure: ${JSON.stringify(auditEntry)}`);

    // Check if we should suggest retry
    if (shouldRetry(errorMessage, tool, sessionId)) {
      console.log(JSON.stringify({
        action: 'retry',
        hookName: 'genesis:post-tool-failure',
        reason: 'Retriable error detected',
        suggestion: `Consider retrying ${tool} - error appears transient`
      }));
    } else {
      console.log(JSON.stringify({
        action: 'continue',
        hookName: 'genesis:post-tool-failure',
        errorSummary: errorMessage.slice(0, 100)
      }));
    }

  } catch (error) {
    console.error(`[GENESIS ERROR] PostToolFailure: ${error.message}`);
    console.log(JSON.stringify({
      action: 'continue',
      hookName: 'genesis:post-tool-failure'
    }));
  }
}

processToolFailure();

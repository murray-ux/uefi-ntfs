#!/usr/bin/env node
/**
 * GENESIS PRE-TOOL-USE HOOK
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Claude Code Hook: PreToolUse
 * Gates tool calls before execution
 *
 * Input (stdin): JSON with { tool, params, sessionId }
 * Output (stdout): JSON with { action: 'continue'|'block', reason? }
 */

// Tools that require extra scrutiny
const SENSITIVE_TOOLS = new Set([
  'Bash',
  'Write',
  'Edit',
  'NotebookEdit'
]);

// Dangerous bash command patterns
const DANGEROUS_BASH_PATTERNS = [
  /rm\s+-rf\s+[\/~]/,        // Recursive deletion of root or home
  /rm\s+-rf\s+\*/,           // Recursive deletion of all
  />\s*\/dev\/sd[a-z]/,      // Writing directly to disk devices
  /mkfs\./,                   // Formatting filesystems
  /dd\s+if=.*of=\/dev/,      // Direct disk writes
  /chmod\s+-R\s+777/,        // Overly permissive permissions
  /curl.*\|\s*(?:ba)?sh/,    // Piping curl to shell
  /wget.*\|\s*(?:ba)?sh/,    // Piping wget to shell
  /:\(\)\{.*\}/,              // Fork bomb pattern
  /--no-preserve-root/        // Dangerous rm flag
];

// File paths that should not be modified
const PROTECTED_PATHS = [
  /^\/etc\//,
  /^\/boot\//,
  /^\/sys\//,
  /^\/proc\//,
  /^~?\/?\.ssh\//,
  /^~?\/?\.gnupg\//,
  /^~?\/?\.aws\/credentials/,
  /id_rsa/,
  /id_ed25519/,
  /\.pem$/,
  /\.key$/
];

async function processToolUse() {
  let input = '';

  for await (const chunk of process.stdin) {
    input += chunk;
  }

  try {
    const data = JSON.parse(input);
    const tool = data.tool || data.name || '';
    const params = data.params || data.input || {};
    const sessionId = data.sessionId || 'unknown';

    // Check Bash commands
    if (tool === 'Bash') {
      const command = params.command || '';

      for (const pattern of DANGEROUS_BASH_PATTERNS) {
        if (pattern.test(command)) {
          console.log(JSON.stringify({
            action: 'block',
            reason: `[GENESIS] Dangerous bash command blocked: ${pattern.source}`,
            hookName: 'genesis:bash-guard'
          }));
          return;
        }
      }
    }

    // Check file operations for protected paths
    if (tool === 'Write' || tool === 'Edit') {
      const filePath = params.file_path || params.path || '';

      for (const pattern of PROTECTED_PATHS) {
        if (pattern.test(filePath)) {
          console.log(JSON.stringify({
            action: 'block',
            reason: `[GENESIS] Protected path modification blocked: ${filePath}`,
            hookName: 'genesis:path-guard'
          }));
          return;
        }
      }
    }

    // Audit log
    const auditEntry = {
      timestamp: new Date().toISOString(),
      sessionId,
      tool,
      paramsKeys: Object.keys(params),
      action: 'allowed'
    };

    console.error(`[GENESIS AUDIT] PreToolUse: ${JSON.stringify(auditEntry)}`);

    // Continue with tool execution
    console.log(JSON.stringify({
      action: 'continue',
      hookName: 'genesis:pre-tool-use'
    }));

  } catch (error) {
    console.error(`[GENESIS ERROR] PreToolUse: ${error.message}`);
    console.log(JSON.stringify({
      action: 'continue',
      hookName: 'genesis:pre-tool-use',
      warning: 'Hook processing error, allowing through'
    }));
  }
}

processToolUse();

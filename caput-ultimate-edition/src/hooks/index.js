/**
 * GENESIS HOOKS INDEX
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Central export for all GENESIS Claude Code hooks
 */

export { default as Nephesh } from '../lib/nephesh-hooks.js';
export * from '../lib/nephesh-hooks.js';

// Hook configuration for Claude Code
export const HOOKS_CONFIG = {
  version: "1.0",
  description: "GENESIS Sovereign Security Platform - Claude Code Hooks",
  hooks: {
    UserPromptSubmit: [
      {
        command: "node ./src/hooks/user-prompt-submit.js",
        timeout: 5000,
        enabled: true
      }
    ],
    PreToolUse: [
      {
        command: "node ./src/hooks/pre-tool-use.js",
        timeout: 3000,
        enabled: true,
        tools: ["*"]
      }
    ],
    PostToolUse: [
      {
        command: "node ./src/hooks/post-tool-use.js",
        timeout: 3000,
        enabled: true
      }
    ],
    PostToolUseFailure: [
      {
        command: "node ./src/hooks/post-tool-failure.js",
        timeout: 3000,
        enabled: true
      }
    ],
    Stop: [
      {
        command: "node ./src/hooks/stop.js",
        timeout: 2000,
        enabled: true
      }
    ],
    SessionStart: [
      {
        command: "node ./src/hooks/session-start.js",
        timeout: 5000,
        enabled: true
      }
    ],
    SessionEnd: [
      {
        command: "node ./src/hooks/session-end.js",
        timeout: 5000,
        enabled: true
      }
    ]
  }
};

/**
 * Generate hooks.json content for Claude Code
 * @param {string} basePath - Path to the GENESIS installation
 * @returns {object} Hooks configuration object
 */
export function generateHooksConfig(basePath = '.') {
  const config = JSON.parse(JSON.stringify(HOOKS_CONFIG));

  // Update paths with base path
  for (const hookType of Object.keys(config.hooks)) {
    for (const hook of config.hooks[hookType]) {
      hook.command = hook.command.replace('./', `${basePath}/`);
    }
  }

  return config;
}

/**
 * Print hooks.json to stdout for easy copy/paste
 */
export function printHooksConfig(basePath) {
  const config = generateHooksConfig(basePath);
  console.log(JSON.stringify(config, null, 2));
}

// If run directly, print the config
if (import.meta.url === `file://${process.argv[1]}`) {
  const basePath = process.argv[2] || '.';
  printHooksConfig(basePath);
}

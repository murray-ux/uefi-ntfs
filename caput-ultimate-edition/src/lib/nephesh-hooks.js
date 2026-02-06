/**
 * NEPHESH HOOKS SYSTEM
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Copyright 2025 Murray Bembrick
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Claude Code Hooks Integration for GENESIS
 * נפש (Nephesh) = Soul/Life Force — The breath that animates all operations
 *
 * @author Murray Bembrick <Founder & Lead Developer>
 * @license Apache-2.0
 *
 * Implements the 13-hook lifecycle pattern for deterministic control:
 *
 * CONTROL HOOKS (Deterministic without LLM judgment):
 *   1. UserPromptSubmit - Pre-process user input before LLM sees it
 *   2. PreToolUse - Gate/modify tool calls before execution
 *   3. PostToolUse - Process tool results before LLM sees them
 *   4. PostToolUseFailure - Handle tool execution failures
 *   5. Stop - Final check before response delivery
 *
 * OBSERVABILITY HOOKS (Logging, metrics, telemetry):
 *   6. OnNotification - Capture system notifications
 *   7. OnContextWindow - Monitor context usage
 *   8. OnTokenUsage - Track token consumption
 *   9. OnModelResponse - Observe raw model outputs
 *
 * SESSION HOOKS (Lifecycle management):
 *   10. SessionStart - Initialize session resources
 *   11. SessionEnd - Cleanup and persist state
 *   12. OnError - Global error handling
 *   13. OnStateChange - Track state transitions
 *
 * @module NEPHESH
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import { createHash, randomUUID } from 'crypto';

// ══════════════════════════════════════════════════════════════════════════════
// HOOK TYPES AND CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

export const HOOK_TYPES = {
  // Control Hooks
  USER_PROMPT_SUBMIT: 'UserPromptSubmit',
  PRE_TOOL_USE: 'PreToolUse',
  POST_TOOL_USE: 'PostToolUse',
  POST_TOOL_USE_FAILURE: 'PostToolUseFailure',
  STOP: 'Stop',

  // Observability Hooks
  ON_NOTIFICATION: 'OnNotification',
  ON_CONTEXT_WINDOW: 'OnContextWindow',
  ON_TOKEN_USAGE: 'OnTokenUsage',
  ON_MODEL_RESPONSE: 'OnModelResponse',

  // Session Hooks
  SESSION_START: 'SessionStart',
  SESSION_END: 'SessionEnd',
  ON_ERROR: 'OnError',
  ON_STATE_CHANGE: 'OnStateChange'
};

export const HOOK_PRIORITIES = {
  CRITICAL: 0,
  HIGH: 100,
  NORMAL: 500,
  LOW: 900,
  BACKGROUND: 1000
};

export const HOOK_RESULTS = {
  CONTINUE: 'continue',
  BLOCK: 'block',
  MODIFY: 'modify',
  RETRY: 'retry',
  SKIP: 'skip'
};

// ══════════════════════════════════════════════════════════════════════════════
// HOOK CONTEXT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Context passed to every hook invocation
 */
export class HookContext {
  constructor(options = {}) {
    this.id = randomUUID();
    this.sessionId = options.sessionId || randomUUID();
    this.timestamp = Date.now();
    this.hookType = options.hookType;
    this.data = options.data || {};
    this.metadata = options.metadata || {};
    this.state = new Map();
    this.modifications = [];
    this.blocked = false;
    this.blockReason = null;
    this.result = HOOK_RESULTS.CONTINUE;
  }

  /**
   * Modify the data being processed
   */
  modify(key, value) {
    this.modifications.push({ key, value, timestamp: Date.now() });
    if (key.includes('.')) {
      const parts = key.split('.');
      let target = this.data;
      for (let i = 0; i < parts.length - 1; i++) {
        target = target[parts[i]] = target[parts[i]] || {};
      }
      target[parts[parts.length - 1]] = value;
    } else {
      this.data[key] = value;
    }
    this.result = HOOK_RESULTS.MODIFY;
    return this;
  }

  /**
   * Block the operation
   */
  block(reason) {
    this.blocked = true;
    this.blockReason = reason;
    this.result = HOOK_RESULTS.BLOCK;
    return this;
  }

  /**
   * Request a retry
   */
  retry(options = {}) {
    this.retryOptions = options;
    this.result = HOOK_RESULTS.RETRY;
    return this;
  }

  /**
   * Skip remaining hooks
   */
  skip() {
    this.result = HOOK_RESULTS.SKIP;
    return this;
  }

  /**
   * Get modified data or original
   */
  getData() {
    return this.data;
  }

  /**
   * Store state for later hooks
   */
  setState(key, value) {
    this.state.set(key, value);
    return this;
  }

  /**
   * Get stored state
   */
  getState(key, defaultValue = null) {
    return this.state.has(key) ? this.state.get(key) : defaultValue;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HOOK REGISTRY
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Central registry for all hooks
 */
export class HookRegistry {
  constructor() {
    this.hooks = new Map();
    this.globalMiddleware = [];
    this.metrics = {
      invocations: new Map(),
      durations: new Map(),
      errors: new Map(),
      blocks: new Map()
    };

    // Initialize all hook types
    Object.values(HOOK_TYPES).forEach(type => {
      this.hooks.set(type, []);
    });
  }

  /**
   * Register a hook handler
   */
  register(hookType, handler, options = {}) {
    if (!this.hooks.has(hookType)) {
      throw new Error(`Unknown hook type: ${hookType}`);
    }

    const hookEntry = {
      id: options.id || randomUUID(),
      name: options.name || handler.name || 'anonymous',
      handler,
      priority: options.priority ?? HOOK_PRIORITIES.NORMAL,
      enabled: options.enabled ?? true,
      timeout: options.timeout ?? 5000,
      retries: options.retries ?? 0,
      conditions: options.conditions || [],
      metadata: options.metadata || {}
    };

    const hooks = this.hooks.get(hookType);
    hooks.push(hookEntry);

    // Sort by priority (lower = higher priority)
    hooks.sort((a, b) => a.priority - b.priority);

    return hookEntry.id;
  }

  /**
   * Unregister a hook by ID
   */
  unregister(hookType, hookId) {
    const hooks = this.hooks.get(hookType);
    if (!hooks) return false;

    const index = hooks.findIndex(h => h.id === hookId);
    if (index === -1) return false;

    hooks.splice(index, 1);
    return true;
  }

  /**
   * Enable/disable a hook
   */
  setEnabled(hookType, hookId, enabled) {
    const hooks = this.hooks.get(hookType);
    if (!hooks) return false;

    const hook = hooks.find(h => h.id === hookId);
    if (!hook) return false;

    hook.enabled = enabled;
    return true;
  }

  /**
   * Add global middleware (runs before all hooks)
   */
  use(middleware) {
    this.globalMiddleware.push(middleware);
    return this;
  }

  /**
   * Get all hooks for a type
   */
  getHooks(hookType) {
    return this.hooks.get(hookType) || [];
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      invocations: Object.fromEntries(this.metrics.invocations),
      averageDurations: Object.fromEntries(
        Array.from(this.metrics.durations.entries()).map(([k, v]) => [
          k, v.length > 0 ? v.reduce((a, b) => a + b, 0) / v.length : 0
        ])
      ),
      errorCounts: Object.fromEntries(this.metrics.errors),
      blockCounts: Object.fromEntries(this.metrics.blocks)
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HOOK EXECUTOR
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Executes hooks with proper ordering, error handling, and metrics
 */
export class HookExecutor {
  constructor(registry) {
    this.registry = registry;
    this.emitter = new EventEmitter();
  }

  /**
   * Execute all hooks for a given type
   */
  async execute(hookType, data, options = {}) {
    const context = new HookContext({
      hookType,
      data,
      sessionId: options.sessionId,
      metadata: options.metadata
    });

    const startTime = Date.now();
    const hooks = this.registry.getHooks(hookType);

    // Update invocation count
    const invCount = (this.registry.metrics.invocations.get(hookType) || 0) + 1;
    this.registry.metrics.invocations.set(hookType, invCount);

    // Run global middleware first
    for (const middleware of this.registry.globalMiddleware) {
      try {
        await middleware(context);
      } catch (error) {
        this.emitter.emit('middleware-error', { middleware, error, context });
      }
    }

    // Execute hooks in priority order
    for (const hook of hooks) {
      if (!hook.enabled) continue;

      // Check conditions
      if (hook.conditions.length > 0) {
        const conditionsMet = hook.conditions.every(cond => cond(context));
        if (!conditionsMet) continue;
      }

      const hookStartTime = Date.now();
      let attempts = 0;
      let success = false;

      while (!success && attempts <= hook.retries) {
        attempts++;

        try {
          // Execute with timeout
          await Promise.race([
            hook.handler(context),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Hook timeout')), hook.timeout)
            )
          ]);

          success = true;

        } catch (error) {
          if (attempts > hook.retries) {
            // Record error
            const errCount = (this.registry.metrics.errors.get(hookType) || 0) + 1;
            this.registry.metrics.errors.set(hookType, errCount);

            this.emitter.emit('hook-error', { hook, error, context, attempts });

            // Call error hooks if this isn't already an error hook
            if (hookType !== HOOK_TYPES.ON_ERROR) {
              await this.execute(HOOK_TYPES.ON_ERROR, {
                originalHook: hookType,
                error: error.message,
                stack: error.stack,
                hookName: hook.name
              }, options);
            }
          }
        }
      }

      // Record duration
      const hookDuration = Date.now() - hookStartTime;
      if (!this.registry.metrics.durations.has(hookType)) {
        this.registry.metrics.durations.set(hookType, []);
      }
      this.registry.metrics.durations.get(hookType).push(hookDuration);

      // Check if we should stop processing
      if (context.result === HOOK_RESULTS.BLOCK) {
        const blockCount = (this.registry.metrics.blocks.get(hookType) || 0) + 1;
        this.registry.metrics.blocks.set(hookType, blockCount);

        this.emitter.emit('hook-blocked', { hook, context });
        break;
      }

      if (context.result === HOOK_RESULTS.SKIP) {
        break;
      }
    }

    // Record total duration
    const totalDuration = Date.now() - startTime;
    context.metadata.totalDuration = totalDuration;

    this.emitter.emit('hooks-complete', { hookType, context, duration: totalDuration });

    return context;
  }

  /**
   * Subscribe to executor events
   */
  on(event, handler) {
    this.emitter.on(event, handler);
    return this;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// BUILT-IN HOOK HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Content filtering hook - blocks harmful patterns
 */
export function createContentFilter(options = {}) {
  const blockedPatterns = options.blockedPatterns || [
    /password\s*[:=]\s*['"][^'"]+['"]/gi,
    /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
    /secret\s*[:=]\s*['"][^'"]+['"]/gi,
    /private[_-]?key/gi,
    /BEGIN\s+(?:RSA|EC|DSA|OPENSSH)\s+PRIVATE\s+KEY/gi
  ];

  const allowedPatterns = options.allowedPatterns || [];

  return async function contentFilter(context) {
    const content = JSON.stringify(context.data);

    // Check allowed patterns first (whitelist)
    for (const pattern of allowedPatterns) {
      if (pattern.test(content)) {
        return; // Allowed, continue
      }
    }

    // Check blocked patterns
    for (const pattern of blockedPatterns) {
      if (pattern.test(content)) {
        context.block(`Content blocked: matches forbidden pattern ${pattern}`);
        return;
      }
    }
  };
}

/**
 * Rate limiting hook
 */
export function createRateLimiter(options = {}) {
  const maxRequests = options.maxRequests || 100;
  const windowMs = options.windowMs || 60000;
  const requests = new Map();

  return async function rateLimiter(context) {
    const key = context.sessionId || 'global';
    const now = Date.now();

    if (!requests.has(key)) {
      requests.set(key, []);
    }

    const windowRequests = requests.get(key);

    // Clean old requests
    while (windowRequests.length > 0 && windowRequests[0] < now - windowMs) {
      windowRequests.shift();
    }

    if (windowRequests.length >= maxRequests) {
      context.block(`Rate limit exceeded: ${maxRequests} requests per ${windowMs}ms`);
      return;
    }

    windowRequests.push(now);
  };
}

/**
 * Tool whitelist/blacklist hook
 */
export function createToolGate(options = {}) {
  const whitelist = new Set(options.whitelist || []);
  const blacklist = new Set(options.blacklist || []);
  const requireApproval = options.requireApproval || [];
  const approvalCallback = options.approvalCallback;

  return async function toolGate(context) {
    const toolName = context.data.tool || context.data.name;

    if (!toolName) return;

    // Check blacklist first
    if (blacklist.has(toolName)) {
      context.block(`Tool '${toolName}' is blacklisted`);
      return;
    }

    // Check whitelist if specified
    if (whitelist.size > 0 && !whitelist.has(toolName)) {
      context.block(`Tool '${toolName}' is not in whitelist`);
      return;
    }

    // Check if requires approval
    if (requireApproval.includes(toolName) && approvalCallback) {
      const approved = await approvalCallback(toolName, context);
      if (!approved) {
        context.block(`Tool '${toolName}' requires approval which was denied`);
        return;
      }
    }
  };
}

/**
 * Token budget enforcement hook
 */
export function createTokenBudget(options = {}) {
  const maxTokensPerSession = options.maxTokensPerSession || 100000;
  const maxTokensPerRequest = options.maxTokensPerRequest || 4000;
  const sessionTokens = new Map();

  return async function tokenBudget(context) {
    const tokens = context.data.tokens || context.data.usage?.total_tokens || 0;
    const sessionId = context.sessionId;

    // Check per-request limit
    if (tokens > maxTokensPerRequest) {
      context.block(`Request exceeds token limit: ${tokens} > ${maxTokensPerRequest}`);
      return;
    }

    // Check session limit
    const currentSessionTokens = sessionTokens.get(sessionId) || 0;
    if (currentSessionTokens + tokens > maxTokensPerSession) {
      context.block(`Session token budget exceeded: ${currentSessionTokens + tokens} > ${maxTokensPerSession}`);
      return;
    }

    // Update session tokens
    sessionTokens.set(sessionId, currentSessionTokens + tokens);
    context.setState('sessionTokens', currentSessionTokens + tokens);
  };
}

/**
 * Audit logging hook
 */
export function createAuditLogger(options = {}) {
  const logger = options.logger || console;
  const includeData = options.includeData ?? false;
  const hashSensitive = options.hashSensitive ?? true;

  return async function auditLogger(context) {
    const entry = {
      timestamp: new Date().toISOString(),
      hookType: context.hookType,
      contextId: context.id,
      sessionId: context.sessionId,
      result: context.result,
      blocked: context.blocked,
      blockReason: context.blockReason,
      modifications: context.modifications.length
    };

    if (includeData) {
      if (hashSensitive) {
        entry.dataHash = createHash('sha256')
          .update(JSON.stringify(context.data))
          .digest('hex').slice(0, 16);
      } else {
        entry.data = context.data;
      }
    }

    logger.info?.('[NEPHESH AUDIT]', JSON.stringify(entry)) ||
    logger.log?.('[NEPHESH AUDIT]', JSON.stringify(entry));
  };
}

/**
 * Context window monitor hook
 */
export function createContextMonitor(options = {}) {
  const warningThreshold = options.warningThreshold || 0.8;
  const criticalThreshold = options.criticalThreshold || 0.95;
  const maxContextTokens = options.maxContextTokens || 200000;
  const onWarning = options.onWarning || (() => {});
  const onCritical = options.onCritical || (() => {});

  return async function contextMonitor(context) {
    const tokens = context.data.contextTokens || context.data.usage?.context_tokens || 0;
    const ratio = tokens / maxContextTokens;

    context.setState('contextUsageRatio', ratio);

    if (ratio >= criticalThreshold) {
      onCritical({ tokens, ratio, context });
      context.modify('contextWarning', 'critical');
    } else if (ratio >= warningThreshold) {
      onWarning({ tokens, ratio, context });
      context.modify('contextWarning', 'warning');
    }
  };
}

/**
 * Prompt sanitizer hook
 */
export function createPromptSanitizer(options = {}) {
  const maxLength = options.maxLength || 50000;
  const stripHtml = options.stripHtml ?? true;
  const normalizeWhitespace = options.normalizeWhitespace ?? true;
  const injectionPatterns = options.injectionPatterns || [
    /ignore\s+(?:all\s+)?(?:previous\s+)?instructions/gi,
    /you\s+are\s+now\s+(?:a\s+)?(?:different|new)/gi,
    /system\s*:\s*you\s+are/gi,
    /\[INST\]/gi,
    /<\|im_start\|>/gi
  ];

  return async function promptSanitizer(context) {
    let prompt = context.data.prompt || context.data.content || '';

    if (typeof prompt !== 'string') return;

    // Check for injection patterns
    for (const pattern of injectionPatterns) {
      if (pattern.test(prompt)) {
        context.block(`Potential prompt injection detected: ${pattern}`);
        return;
      }
    }

    // Truncate if too long
    if (prompt.length > maxLength) {
      prompt = prompt.slice(0, maxLength) + '\n[TRUNCATED]';
    }

    // Strip HTML
    if (stripHtml) {
      prompt = prompt.replace(/<[^>]*>/g, '');
    }

    // Normalize whitespace
    if (normalizeWhitespace) {
      prompt = prompt.replace(/\s+/g, ' ').trim();
    }

    if (prompt !== (context.data.prompt || context.data.content)) {
      context.modify('prompt', prompt);
      context.modify('content', prompt);
    }
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// NEPHESH MAIN CLASS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Main NEPHESH Hooks System
 */
export class Nephesh extends EventEmitter {
  constructor(options = {}) {
    super();

    this.registry = new HookRegistry();
    this.executor = new HookExecutor(this.registry);
    this.sessions = new Map();
    this.config = {
      enableBuiltins: options.enableBuiltins ?? true,
      enableMetrics: options.enableMetrics ?? true,
      enableAudit: options.enableAudit ?? true,
      ...options
    };

    // Forward executor events
    this.executor.on('hook-error', (data) => this.emit('error', data));
    this.executor.on('hook-blocked', (data) => this.emit('blocked', data));
    this.executor.on('hooks-complete', (data) => this.emit('complete', data));

    if (this.config.enableBuiltins) {
      this._registerBuiltins();
    }
  }

  /**
   * Register built-in hooks
   */
  _registerBuiltins() {
    // Content filter for prompts
    this.registry.register(
      HOOK_TYPES.USER_PROMPT_SUBMIT,
      createContentFilter(),
      { name: 'builtin:content-filter', priority: HOOK_PRIORITIES.HIGH }
    );

    // Prompt sanitizer
    this.registry.register(
      HOOK_TYPES.USER_PROMPT_SUBMIT,
      createPromptSanitizer(),
      { name: 'builtin:prompt-sanitizer', priority: HOOK_PRIORITIES.NORMAL }
    );

    // Tool gate for pre-tool
    this.registry.register(
      HOOK_TYPES.PRE_TOOL_USE,
      createToolGate({ blacklist: ['eval', 'exec'] }),
      { name: 'builtin:tool-gate', priority: HOOK_PRIORITIES.HIGH }
    );

    // Audit logger for all hooks if enabled
    if (this.config.enableAudit) {
      Object.values(HOOK_TYPES).forEach(hookType => {
        this.registry.register(
          hookType,
          createAuditLogger({ logger: console, hashSensitive: true }),
          { name: 'builtin:audit-logger', priority: HOOK_PRIORITIES.BACKGROUND }
        );
      });
    }
  }

  /**
   * Start a new session
   */
  async startSession(sessionId = randomUUID(), metadata = {}) {
    const session = {
      id: sessionId,
      startedAt: Date.now(),
      metadata,
      state: new Map(),
      hookHistory: []
    };

    this.sessions.set(sessionId, session);

    await this.executor.execute(HOOK_TYPES.SESSION_START, {
      sessionId,
      metadata
    }, { sessionId });

    this.emit('session-start', session);

    return session;
  }

  /**
   * End a session
   */
  async endSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.endedAt = Date.now();
    session.duration = session.endedAt - session.startedAt;

    await this.executor.execute(HOOK_TYPES.SESSION_END, {
      sessionId,
      duration: session.duration,
      hookCount: session.hookHistory.length
    }, { sessionId });

    this.emit('session-end', session);

    // Keep session for a while for metrics, then delete
    setTimeout(() => this.sessions.delete(sessionId), 60000);

    return session;
  }

  /**
   * Process user prompt through hooks
   */
  async onUserPromptSubmit(prompt, options = {}) {
    return this.executor.execute(HOOK_TYPES.USER_PROMPT_SUBMIT, {
      prompt,
      timestamp: Date.now(),
      ...options
    }, options);
  }

  /**
   * Process pre-tool-use through hooks
   */
  async onPreToolUse(tool, params, options = {}) {
    return this.executor.execute(HOOK_TYPES.PRE_TOOL_USE, {
      tool,
      params,
      timestamp: Date.now(),
      ...options
    }, options);
  }

  /**
   * Process post-tool-use through hooks
   */
  async onPostToolUse(tool, params, result, options = {}) {
    return this.executor.execute(HOOK_TYPES.POST_TOOL_USE, {
      tool,
      params,
      result,
      timestamp: Date.now(),
      ...options
    }, options);
  }

  /**
   * Process tool failure through hooks
   */
  async onPostToolUseFailure(tool, params, error, options = {}) {
    return this.executor.execute(HOOK_TYPES.POST_TOOL_USE_FAILURE, {
      tool,
      params,
      error: error.message || error,
      stack: error.stack,
      timestamp: Date.now(),
      ...options
    }, options);
  }

  /**
   * Process stop event through hooks
   */
  async onStop(response, options = {}) {
    return this.executor.execute(HOOK_TYPES.STOP, {
      response,
      timestamp: Date.now(),
      ...options
    }, options);
  }

  /**
   * Track token usage
   */
  async onTokenUsage(usage, options = {}) {
    return this.executor.execute(HOOK_TYPES.ON_TOKEN_USAGE, {
      ...usage,
      timestamp: Date.now()
    }, options);
  }

  /**
   * Track context window
   */
  async onContextWindow(contextTokens, maxTokens, options = {}) {
    return this.executor.execute(HOOK_TYPES.ON_CONTEXT_WINDOW, {
      contextTokens,
      maxTokens,
      ratio: contextTokens / maxTokens,
      timestamp: Date.now()
    }, options);
  }

  /**
   * Track model response
   */
  async onModelResponse(response, options = {}) {
    return this.executor.execute(HOOK_TYPES.ON_MODEL_RESPONSE, {
      response,
      timestamp: Date.now()
    }, options);
  }

  /**
   * Track notifications
   */
  async onNotification(notification, options = {}) {
    return this.executor.execute(HOOK_TYPES.ON_NOTIFICATION, {
      notification,
      timestamp: Date.now()
    }, options);
  }

  /**
   * Track state changes
   */
  async onStateChange(oldState, newState, options = {}) {
    return this.executor.execute(HOOK_TYPES.ON_STATE_CHANGE, {
      oldState,
      newState,
      timestamp: Date.now()
    }, options);
  }

  /**
   * Register a custom hook
   */
  register(hookType, handler, options = {}) {
    return this.registry.register(hookType, handler, options);
  }

  /**
   * Unregister a hook
   */
  unregister(hookType, hookId) {
    return this.registry.unregister(hookType, hookId);
  }

  /**
   * Add global middleware
   */
  use(middleware) {
    this.registry.use(middleware);
    return this;
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      registry: this.registry.getMetrics(),
      sessions: {
        active: this.sessions.size,
        sessions: Array.from(this.sessions.values()).map(s => ({
          id: s.id,
          duration: s.endedAt ? s.duration : Date.now() - s.startedAt,
          hookCount: s.hookHistory.length
        }))
      }
    };
  }

  /**
   * Get system status
   */
  status() {
    const metrics = this.getMetrics();
    return {
      initialized: true,
      version: '2.0.0',
      hookTypes: Object.keys(HOOK_TYPES).length,
      registeredHooks: Array.from(this.registry.hooks.values())
        .reduce((sum, hooks) => sum + hooks.length, 0),
      activeSessions: this.sessions.size,
      metrics: metrics.registry
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CLAUDE CODE HOOKS CONFIGURATION GENERATOR
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate Claude Code hooks configuration
 * Creates the .claude/hooks.json file for integration
 */
export function generateClaudeHooksConfig(options = {}) {
  const genesisPath = options.genesisPath || './caput-ultimate-edition';

  return {
    version: "1.0",
    hooks: {
      UserPromptSubmit: [
        {
          command: `node ${genesisPath}/src/hooks/user-prompt-submit.js`,
          timeout: 5000,
          enabled: true
        }
      ],
      PreToolUse: [
        {
          command: `node ${genesisPath}/src/hooks/pre-tool-use.js`,
          timeout: 3000,
          enabled: true,
          tools: ["*"]
        }
      ],
      PostToolUse: [
        {
          command: `node ${genesisPath}/src/hooks/post-tool-use.js`,
          timeout: 3000,
          enabled: true
        }
      ],
      PostToolUseFailure: [
        {
          command: `node ${genesisPath}/src/hooks/post-tool-failure.js`,
          timeout: 3000,
          enabled: true
        }
      ],
      Stop: [
        {
          command: `node ${genesisPath}/src/hooks/stop.js`,
          timeout: 2000,
          enabled: true
        }
      ],
      SessionStart: [
        {
          command: `node ${genesisPath}/src/hooks/session-start.js`,
          timeout: 5000,
          enabled: true
        }
      ],
      SessionEnd: [
        {
          command: `node ${genesisPath}/src/hooks/session-end.js`,
          timeout: 5000,
          enabled: true
        }
      ]
    }
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export default Nephesh;
export {
  Nephesh,
  HookContext,
  HookRegistry,
  HookExecutor,
  HOOK_TYPES,
  HOOK_PRIORITIES,
  HOOK_RESULTS,
  createContentFilter,
  createRateLimiter,
  createToolGate,
  createTokenBudget,
  createAuditLogger,
  createContextMonitor,
  createPromptSanitizer,
  generateClaudeHooksConfig
};

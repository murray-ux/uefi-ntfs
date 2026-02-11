/**
 * Hooks.ts - MediaWiki-style hook system for Auth Portal
 *
 * Hooks allow third-party code to run before, after, or instead of
 * MediaWiki code for particular events. Extensions use hooks to
 * plug into the code without modifying core.
 *
 * @see Manual:Hooks
 * @see includes/Hooks.php
 */

import type { HookRegistry } from './types';

// ============================================================================
// Types
// ============================================================================

type HookCallback = (...args: unknown[]) => boolean | void | Promise<boolean | void>;
type FilterCallback = (value: string, ...args: unknown[]) => string | Promise<string>;

interface HookInfo {
  callback: HookCallback | FilterCallback;
  priority: number;
  once: boolean;
  called: boolean;
}

// ============================================================================
// Hook Registry
// ============================================================================

/**
 * Global hook registry
 * Stores all registered hooks by name
 */
const hooks: Map<string, HookInfo[]> = new Map();

/**
 * Hook documentation for qqq-style help
 */
const hookDocs: Map<string, string> = new Map([
  // Authentication hooks
  ['BeforeLogin', 'Called before a user attempts to log in. Return false to block the login.'],
  ['UserLoginComplete', 'Called after a successful login.'],
  ['UserLoginFailed', 'Called when a login attempt fails.'],
  ['BeforeLogout', 'Called before a user logs out. Return false to prevent logout.'],
  ['UserLogoutComplete', 'Called after a user has logged out.'],

  // Account hooks
  ['BeforeCreateAccount', 'Called before a new account is created. Return false to block.'],
  ['AccountCreated', 'Called after a new account is successfully created.'],
  ['BeforePasswordReset', 'Called before a password reset is initiated. Return false to block.'],
  ['PasswordResetComplete', 'Called after a password has been reset.'],
  ['UserPreferencesSaved', 'Called after user preferences are saved.'],

  // Request hooks
  ['BeforeRequest', 'Called at the start of every request. Return false to abort.'],
  ['AfterRequest', 'Called after a request has been processed.'],

  // Audit hooks
  ['AuditLogEntry', 'Called when an audit log entry is created.'],

  // Cache hooks
  ['CacheInvalidate', 'Called when a cache key is invalidated.'],

  // Output hooks
  ['BeforePageDisplay', 'Called before a page is displayed.'],
  ['OutputPageBeforeHTML', 'Filter hook to modify HTML output before sending.'],
]);

// ============================================================================
// Hooks Class
// ============================================================================

export class Hooks {
  /**
   * Register a hook handler
   *
   * @param name - Hook name
   * @param callback - Function to call when hook is triggered
   * @param options - Registration options
   *
   * @example
   * Hooks.register('UserLoginComplete', (user) => {
   *   console.log('User logged in:', user.username);
   * });
   *
   * @example
   * // Run only once
   * Hooks.register('BeforeLogin', (username) => {
   *   console.log('First login attempt:', username);
   *   return true;
   * }, { once: true });
   *
   * @example
   * // High priority (runs first)
   * Hooks.register('BeforeRequest', (request) => {
   *   // Security check
   *   return isAllowed(request);
   * }, { priority: 100 });
   */
  static register(
    name: string,
    callback: HookCallback,
    options: { priority?: number; once?: boolean } = {}
  ): void {
    const { priority = 50, once = false } = options;

    if (!hooks.has(name)) {
      hooks.set(name, []);
    }

    const hookList = hooks.get(name)!;
    hookList.push({
      callback,
      priority,
      once,
      called: false,
    });

    // Sort by priority (higher priority runs first)
    hookList.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Register a filter hook (modifies a value)
   *
   * @param name - Hook name
   * @param callback - Filter function
   * @param options - Registration options
   *
   * @example
   * Hooks.registerFilter('OutputPageBeforeHTML', (html) => {
   *   return html.replace('</body>', '<script>...</script></body>');
   * });
   */
  static registerFilter(
    name: string,
    callback: FilterCallback,
    options: { priority?: number } = {}
  ): void {
    // Filters are just hooks that return a modified value
    this.register(name, callback as HookCallback, options);
  }

  /**
   * Unregister a hook handler
   *
   * @param name - Hook name
   * @param callback - The callback to remove (optional - removes all if not specified)
   */
  static unregister(name: string, callback?: HookCallback): void {
    if (!hooks.has(name)) return;

    if (callback) {
      const hookList = hooks.get(name)!;
      const index = hookList.findIndex(h => h.callback === callback);
      if (index !== -1) {
        hookList.splice(index, 1);
      }
    } else {
      hooks.delete(name);
    }
  }

  /**
   * Run a hook
   *
   * Calls all registered handlers for a hook. If any handler returns
   * false, hook execution stops and false is returned.
   *
   * @param name - Hook name
   * @param args - Arguments to pass to handlers
   * @returns false if any handler returned false, otherwise true
   *
   * @example
   * const allowed = await Hooks.run('BeforeLogin', username, password);
   * if (allowed === false) {
   *   throw new Error('Login blocked by hook');
   * }
   */
  static async run(name: string, ...args: unknown[]): Promise<boolean> {
    const hookList = hooks.get(name);
    if (!hookList || hookList.length === 0) {
      return true;
    }

    // Process hooks in priority order
    for (const hook of hookList) {
      // Skip if once-only hook that was already called
      if (hook.once && hook.called) {
        continue;
      }

      try {
        const result = await hook.callback(...args);
        hook.called = true;

        // If handler returns false, stop processing
        if (result === false) {
          return false;
        }
      } catch (error) {
        console.error(`Error in hook '${name}':`, error);
        // Continue to next handler on error
      }
    }

    // Remove once-only hooks that have been called
    const remaining = hookList.filter(h => !h.once || !h.called);
    if (remaining.length !== hookList.length) {
      hooks.set(name, remaining);
    }

    return true;
  }

  /**
   * Run a filter hook
   *
   * Passes a value through all registered handlers, each modifying it.
   *
   * @param name - Hook name
   * @param value - Initial value
   * @param args - Additional arguments to pass to handlers
   * @returns The filtered value
   *
   * @example
   * let html = renderPage();
   * html = await Hooks.runFilter('OutputPageBeforeHTML', html);
   */
  static async runFilter(name: string, value: string, ...args: unknown[]): Promise<string> {
    const hookList = hooks.get(name);
    if (!hookList || hookList.length === 0) {
      return value;
    }

    let result = value;

    for (const hook of hookList) {
      try {
        const filtered = await (hook.callback as FilterCallback)(result, ...args);
        if (typeof filtered === 'string') {
          result = filtered;
        }
      } catch (error) {
        console.error(`Error in filter hook '${name}':`, error);
        // Continue with unmodified value on error
      }
    }

    return result;
  }

  /**
   * Check if a hook has any handlers registered
   *
   * @param name - Hook name
   * @returns true if hook has handlers
   */
  static isRegistered(name: string): boolean {
    const hookList = hooks.get(name);
    return hookList !== undefined && hookList.length > 0;
  }

  /**
   * Get the number of handlers for a hook
   *
   * @param name - Hook name
   * @returns Number of registered handlers
   */
  static getHandlerCount(name: string): number {
    const hookList = hooks.get(name);
    return hookList ? hookList.length : 0;
  }

  /**
   * Get all registered hook names
   *
   * @returns Array of hook names
   */
  static getRegisteredHooks(): string[] {
    return Array.from(hooks.keys());
  }

  /**
   * Get documentation for a hook
   *
   * @param name - Hook name
   * @returns Documentation string or undefined
   */
  static getDocumentation(name: string): string | undefined {
    return hookDocs.get(name);
  }

  /**
   * Get all hook documentation
   *
   * @returns Map of hook names to documentation
   */
  static getAllDocumentation(): Map<string, string> {
    return new Map(hookDocs);
  }

  /**
   * Add documentation for a hook
   *
   * @param name - Hook name
   * @param doc - Documentation string
   */
  static addDocumentation(name: string, doc: string): void {
    hookDocs.set(name, doc);
  }

  /**
   * Clear all hooks (mainly for testing)
   */
  static clear(): void {
    hooks.clear();
  }

  /**
   * Clear hooks for a specific name (mainly for testing)
   */
  static clearHook(name: string): void {
    hooks.delete(name);
  }
}

// ============================================================================
// Convenience Functions (MediaWiki-style global functions)
// ============================================================================

/**
 * Register a hook handler (shorthand)
 * @see Hooks.register
 */
export function wfRegisterHook(
  name: string,
  callback: HookCallback,
  options?: { priority?: number; once?: boolean }
): void {
  Hooks.register(name, callback, options);
}

/**
 * Run a hook (shorthand)
 * @see Hooks.run
 */
export async function wfRunHooks(name: string, ...args: unknown[]): Promise<boolean> {
  return Hooks.run(name, ...args);
}

// ============================================================================
// Built-in Hook Handlers
// ============================================================================

/**
 * Register default audit logging hook
 */
Hooks.register('AuditLogEntry', async (action, userId, details) => {
  // Default audit logging - writes to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.log('[AUDIT]', {
      timestamp: new Date().toISOString(),
      action,
      userId,
      details,
    });
  }
  return true;
}, { priority: 10 }); // Low priority so custom handlers run first

/**
 * Register default cache invalidation logging
 */
Hooks.register('CacheInvalidate', async (key) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[CACHE] Invalidated:', key);
  }
  return true;
}, { priority: 10 });

// ============================================================================
// Export
// ============================================================================

export default Hooks;

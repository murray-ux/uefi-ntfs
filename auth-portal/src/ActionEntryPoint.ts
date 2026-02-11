/**
 * ActionEntryPoint.ts - Main entry point for Auth Portal requests
 *
 * Follows MediaWiki's ActionEntryPoint pattern:
 * - Handles action routing (view, edit, submit, etc.)
 * - Manages request lifecycle
 * - Coordinates with hooks system
 *
 * @see Manual:index.php
 * @see includes/MediaWikiEntryPoint.php
 */

import type {
  ActionType,
  WebRequest,
  WebResponse,
  User,
  Session,
  UserPreferences,
} from './types';
import { Hooks } from './Hooks';
import { getConfig } from './Setup';
import {
  login,
  createAccount,
  requestPasswordReset,
  updatePreferences,
  validateSession,
} from './auth';

// ============================================================================
// Action Handler Interface
// ============================================================================

export interface ActionHandler {
  getName(): string;
  getRestriction(): string | null;
  requiresAuth(): boolean;
  requiresWrite(): boolean;
  execute(request: WebRequest, user: User | null): Promise<WebResponse>;
}

// ============================================================================
// Built-in Action Handlers
// ============================================================================

/**
 * View action - displays a page
 */
class ViewAction implements ActionHandler {
  getName(): string { return 'view'; }
  getRestriction(): string | null { return null; }
  requiresAuth(): boolean { return false; }
  requiresWrite(): boolean { return false; }

  async execute(request: WebRequest, user: User | null): Promise<WebResponse> {
    const title = request.title || 'Main_Page';

    // Run BeforePageDisplay hook
    await Hooks.run('BeforePageDisplay', title, user);

    // For Auth Portal, "view" renders the appropriate page
    let html = await this.renderPage(title, user, request);

    // Run OutputPageBeforeHTML hook
    html = await Hooks.runFilter('OutputPageBeforeHTML', html);

    return {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: html,
    };
  }

  private async renderPage(title: string, user: User | null, request: WebRequest): Promise<string> {
    // Map titles to pages
    switch (title.toLowerCase()) {
      case 'special:userlogin':
      case 'login':
        return this.renderLoginPage(request);
      case 'special:createaccount':
      case 'createaccount':
        return this.renderCreateAccountPage(request);
      case 'special:passwordreset':
      case 'passwordreset':
        return this.renderPasswordResetPage(request);
      case 'special:preferences':
      case 'settings':
        return user ? this.renderSettingsPage(user) : this.redirectToLogin();
      default:
        return this.renderMainPage(user);
    }
  }

  private renderLoginPage(request: WebRequest): string {
    const returnto = request.returnto || '';
    return `<!-- Login page rendered by ViewAction -->
<div class="auth-form" data-page="login" data-returnto="${this.escapeHtml(returnto)}"></div>`;
  }

  private renderCreateAccountPage(request: WebRequest): string {
    return `<!-- Create account page rendered by ViewAction -->
<div class="auth-form" data-page="createaccount"></div>`;
  }

  private renderPasswordResetPage(request: WebRequest): string {
    return `<!-- Password reset page rendered by ViewAction -->
<div class="auth-form" data-page="passwordreset"></div>`;
  }

  private renderSettingsPage(user: User): string {
    return `<!-- Settings page rendered by ViewAction -->
<div class="auth-form" data-page="settings" data-user="${this.escapeHtml(user.username)}"></div>`;
  }

  private renderMainPage(user: User | null): string {
    const config = getConfig();
    return `<!-- Main page rendered by ViewAction -->
<div class="main-page">
  <h1>Welcome to ${this.escapeHtml(config.siteName)}</h1>
  ${user ? `<p>Logged in as ${this.escapeHtml(user.username)}</p>` : '<p>Please log in</p>'}
</div>`;
  }

  private redirectToLogin(): string {
    return `<!-- Redirect to login -->
<meta http-equiv="refresh" content="0; url=?action=view&title=Special:UserLogin">`;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

/**
 * Submit action - handles form submissions
 */
class SubmitAction implements ActionHandler {
  getName(): string { return 'submit'; }
  getRestriction(): string | null { return null; }
  requiresAuth(): boolean { return false; }
  requiresWrite(): boolean { return true; }

  async execute(request: WebRequest, user: User | null): Promise<WebResponse> {
    const title = request.title || '';

    switch (title.toLowerCase()) {
      case 'special:userlogin':
      case 'login':
        return this.handleLogin(request);
      case 'special:createaccount':
      case 'createaccount':
        return this.handleCreateAccount(request);
      case 'special:passwordreset':
      case 'passwordreset':
        return this.handlePasswordReset(request);
      case 'special:preferences':
      case 'settings':
        return user ? this.handleSaveSettings(request, user) : this.errorResponse(401, 'Not authenticated');
      default:
        return this.errorResponse(400, 'Unknown submit target');
    }
  }

  private async handleLogin(request: WebRequest): Promise<WebResponse> {
    const { username, password } = request;

    if (!username || !password) {
      return this.errorResponse(400, 'Username and password required');
    }

    // Run BeforeLogin hook
    const allowed = await Hooks.run('BeforeLogin', username, password);
    if (allowed === false) {
      await Hooks.run('UserLoginFailed', username, 'blocked-by-hook');
      return this.errorResponse(403, 'Login blocked');
    }

    // Authenticate using auth module
    const result = await login(username, password);

    if (!result.success) {
      await Hooks.run('UserLoginFailed', username, 'invalid-credentials');
      return {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: result.message }),
      };
    }

    // Run successful login hook
    if (result.user) {
      await Hooks.run('UserLoginComplete', result.user);
    }

    // Build response with session cookie
    const response: WebResponse = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: result.message,
        user: result.user,
        returnto: request.returnto,
      }),
    };

    // Set session cookie if token provided
    if (result.token) {
      const config = getConfig();
      response.cookies = [{
        name: config.sessionName,
        value: result.token,
        options: {
          httpOnly: true,
          secure: config.cookieSecure,
          sameSite: 'lax',
          maxAge: request.rememberMe ? config.extendedSessionExpiry : config.sessionExpiry,
          path: config.cookiePath,
          domain: config.cookieDomain || undefined,
        },
      }];
    }

    return response;
  }

  private async handleCreateAccount(request: WebRequest): Promise<WebResponse> {
    const { username, password, email } = request;

    if (!username || !password) {
      return this.errorResponse(400, 'Username and password required');
    }

    // Check if account creation is allowed
    const config = getConfig();
    if (!config.allowAccountCreation) {
      return this.errorResponse(403, 'Account creation is disabled');
    }

    // Run BeforeCreateAccount hook
    const allowed = await Hooks.run('BeforeCreateAccount', username, email);
    if (allowed === false) {
      return this.errorResponse(403, 'Account creation blocked');
    }

    // Create account using auth module
    const result = await createAccount(username, password, email);

    if (!result.success) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: result.message }),
      };
    }

    // Run account created hook
    if (result.user) {
      await Hooks.run('AccountCreated', result.user);
    }

    // Build response with session cookie (auto-login after registration)
    const response: WebResponse = {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: result.message,
        user: result.user,
        requiresEmailConfirmation: result.requiresEmailConfirmation,
      }),
    };

    // Set session cookie if token provided
    if (result.token) {
      response.cookies = [{
        name: config.sessionName,
        value: result.token,
        options: {
          httpOnly: true,
          secure: config.cookieSecure,
          sameSite: 'lax',
          maxAge: config.sessionExpiry,
          path: config.cookiePath,
          domain: config.cookieDomain || undefined,
        },
      }];
    }

    return response;
  }

  private async handlePasswordReset(request: WebRequest): Promise<WebResponse> {
    const { username, email } = request;

    if (!username && !email) {
      return this.errorResponse(400, 'Username or email required');
    }

    // Run BeforePasswordReset hook
    const allowed = await Hooks.run('BeforePasswordReset', username, email);
    if (allowed === false) {
      // Still return success for privacy
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: 'If an account exists, a password reset email has been sent.',
        }),
      };
    }

    // Request password reset using auth module
    // Note: This always returns success for privacy (doesn't reveal if account exists)
    const result = await requestPasswordReset(username, email);

    // Run completion hook (even if no user found, for audit logging)
    await Hooks.run('PasswordResetComplete', username || email || 'unknown');

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: result.success,
        message: result.message,
      }),
    };
  }

  private async handleSaveSettings(request: WebRequest, user: User): Promise<WebResponse> {
    // Extract preference updates from request
    const preferences: Partial<UserPreferences> = {};

    // Map form fields to preference keys
    if ('language' in request && typeof request.language === 'string') {
      preferences.language = request.language;
    }
    if ('theme' in request && typeof request.theme === 'string') {
      preferences.theme = request.theme as 'light' | 'dark' | 'auto';
    }
    if ('textSize' in request && typeof request.textSize === 'string') {
      preferences.textSize = request.textSize as 'standard' | 'medium' | 'large';
    }
    if ('expandSections' in request) {
      preferences.expandSections = Boolean(request.expandSections);
    }
    if ('enhancedPasswordReset' in request) {
      preferences.enhancedPasswordReset = Boolean(request.enhancedPasswordReset);
    }
    if ('emailNotifications' in request) {
      preferences.emailNotifications = Boolean(request.emailNotifications);
    }

    // Update preferences using auth module
    const result = updatePreferences(user.id, preferences);

    if (!result.success) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: result.message }),
      };
    }

    // Run hook with updated preferences
    const updatedPrefs = result.user?.preferences || { ...user.preferences, ...preferences };
    await Hooks.run('UserPreferencesSaved', user, updatedPrefs);

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: result.message,
        user: result.user,
      }),
    };
  }

  private errorResponse(status: number, message: string): WebResponse {
    return {
      status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: message }),
    };
  }
}

/**
 * History action - shows page history
 */
class HistoryAction implements ActionHandler {
  getName(): string { return 'history'; }
  getRestriction(): string | null { return 'read'; }
  requiresAuth(): boolean { return false; }
  requiresWrite(): boolean { return false; }

  async execute(request: WebRequest, user: User | null): Promise<WebResponse> {
    // For Auth Portal, history might show audit log for user
    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'history', title: request.title }),
    };
  }
}

/**
 * Purge action - purges cache for a page
 */
class PurgeAction implements ActionHandler {
  getName(): string { return 'purge'; }
  getRestriction(): string | null { return null; }
  requiresAuth(): boolean { return false; }
  requiresWrite(): boolean { return false; }

  async execute(request: WebRequest, user: User | null): Promise<WebResponse> {
    const key = `page:${request.title || 'Main_Page'}`;
    await Hooks.run('CacheInvalidate', key);

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, purged: key }),
    };
  }
}

// ============================================================================
// Action Registry
// ============================================================================

const actionHandlers: Map<ActionType, ActionHandler> = new Map([
  ['view', new ViewAction()],
  ['submit', new SubmitAction()],
  ['history', new HistoryAction()],
  ['purge', new PurgeAction()],
]);

/**
 * Register a custom action handler
 */
export function registerAction(action: ActionType, handler: ActionHandler): void {
  actionHandlers.set(action, handler);
}

/**
 * Get an action handler
 */
export function getAction(action: ActionType): ActionHandler | undefined {
  return actionHandlers.get(action);
}

// ============================================================================
// ActionEntryPoint Class
// ============================================================================

export class ActionEntryPoint {
  private request: WebRequest;
  private user: User | null = null;
  private session: Session | null = null;

  constructor(request: WebRequest) {
    this.request = request;
  }

  /**
   * Main entry point - handles the complete request lifecycle
   * Follows MediaWiki's index.php flow
   */
  async run(): Promise<WebResponse> {
    try {
      // 1. Run BeforeRequest hook
      const allowed = await Hooks.run('BeforeRequest', this.request);
      if (allowed === false) {
        return this.forbiddenResponse('Request blocked');
      }

      // 2. Load session and user
      await this.loadSession();

      // 3. Check for bad titles
      if (this.request.title && this.isBadTitle(this.request.title)) {
        return this.badTitleResponse();
      }

      // 4. Check read restrictions
      if (!this.canRead()) {
        return this.forbiddenResponse('Read access denied');
      }

      // 5. Get action handler
      const action = this.request.action || 'view';
      const handler = actionHandlers.get(action);

      if (!handler) {
        return this.notFoundResponse(`Unknown action: ${action}`);
      }

      // 6. Check action-specific restrictions
      if (handler.requiresAuth() && !this.user) {
        return this.redirectToLogin();
      }

      const restriction = handler.getRestriction();
      if (restriction && !this.hasPermission(restriction)) {
        return this.forbiddenResponse(`Permission '${restriction}' required`);
      }

      // 7. Execute the action
      const response = await handler.execute(this.request, this.user);

      // 8. Run AfterRequest hook
      await Hooks.run('AfterRequest', this.request, response);

      return response;

    } catch (error) {
      return this.errorResponse(error);
    }
  }

  /**
   * Load session and user from request
   */
  private async loadSession(): Promise<void> {
    const sessionId = this.request.sessionId;
    if (!sessionId) return;

    // Validate session and load user using auth module
    const user = validateSession(sessionId);
    if (user) {
      this.user = user;
      this.session = {
        id: sessionId,
        userId: user.id,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        data: {},
      };
    }
  }

  /**
   * Check if title is forbidden
   */
  private isBadTitle(title: string): boolean {
    const badPatterns = [
      /^\.\.?\/?/,         // Relative paths
      /[\x00-\x1f]/,       // Control characters
      /[<>|[\]{}]/,        // Special characters
      /^:/,                // Starting with colon
    ];

    return badPatterns.some(pattern => pattern.test(title));
  }

  /**
   * Check if user can read
   */
  private canRead(): boolean {
    const config = getConfig();
    const groups = this.user ? ['*', 'user'] : ['*'];

    return groups.some(group => {
      const perms = config.groupPermissions[group];
      return perms && perms.read === true;
    });
  }

  /**
   * Check if user has specific permission
   */
  private hasPermission(permission: string): boolean {
    if (!this.user) return false;

    const config = getConfig();
    // User would have groups stored; for now check implicit groups
    const groups = ['*', 'user'];

    return groups.some(group => {
      const perms = config.groupPermissions[group];
      return perms && perms[permission] === true;
    });
  }

  /**
   * Response helpers
   */
  private forbiddenResponse(message: string): WebResponse {
    return {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Forbidden', message }),
    };
  }

  private notFoundResponse(message: string): WebResponse {
    return {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Not Found', message }),
    };
  }

  private badTitleResponse(): WebResponse {
    return {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Bad title', message: 'The requested title is invalid' }),
    };
  }

  private redirectToLogin(): WebResponse {
    const returnto = this.request.title || '';
    return {
      status: 302,
      headers: {
        'Location': `?action=view&title=Special:UserLogin&returnto=${encodeURIComponent(returnto)}`,
      },
      body: '',
    };
  }

  private errorResponse(error: unknown): WebResponse {
    const config = getConfig();
    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = config.showExceptionDetails && error instanceof Error ? error.stack : undefined;

    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message,
        ...(stack && { stack }),
      }),
    };
  }
}

// ============================================================================
// Convenience function
// ============================================================================

/**
 * Process a web request through the action entry point
 */
export async function processRequest(request: WebRequest): Promise<WebResponse> {
  const entryPoint = new ActionEntryPoint(request);
  return entryPoint.run();
}

// identity/sso_endpoints.ts
//
// GENESIS SSO API Endpoints — High-performance SAML handlers
//
// Endpoints:
//   GET  /sso/login          - Initiate SAML login (redirect to Google)
//   POST /sso/acs            - Assertion Consumer Service (receive SAML response)
//   GET  /sso/logout         - Initiate SAML logout
//   GET  /sso/metadata       - SP metadata for Google Admin Console
//   GET  /sso/status         - Cache stats and health
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { IncomingMessage, ServerResponse } from "http";
import { parse as parseUrl } from "url";
import { parse as parseQueryString } from "querystring";
import { GoogleSAMLProvider, GoogleSAMLConfig } from "./google_saml_sso";
import { GenesisSSO, SSOConfig, Identity } from "./sso_master";
import { Evaluator } from "../src/core/evaluator";
import { getDoctrine } from "../src/core/doctrine";
import { AuditService } from "../src/audit/audit-service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SSOEndpointConfig {
  // Google SAML Configuration
  google: Omit<GoogleSAMLConfig, 'assertionCacheTtlMs' | 'certificateCacheTtlMs' | 'maxCacheEntries' | 'allowedClockSkewSeconds' | 'requireSignedResponse' | 'requireSignedAssertion'>;

  // Genesis SSO Configuration
  jwtSecret: string;
  tokenTtlSeconds?: number;

  // Endpoint paths
  basePath?: string;           // Default: /sso
  loginRedirectUrl?: string;   // Where to redirect after successful login
  logoutRedirectUrl?: string;  // Where to redirect after logout

  // Performance
  assertionCacheTtlMs?: number;
  maxCacheEntries?: number;

  // Audit
  auditLogDir?: string;
}

type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
) => Promise<void>;

// ---------------------------------------------------------------------------
// SSOEndpoints
// ---------------------------------------------------------------------------

export class SSOEndpoints {
  private config: Required<Omit<SSOEndpointConfig, 'google'>> & { google: GoogleSAMLConfig };
  private googleSAML: GoogleSAMLProvider;
  private genesisSSO: GenesisSSO;
  private audit: AuditService;
  private routes: Map<string, RouteHandler>;

  // Pending AuthnRequest IDs (for replay protection)
  private pendingRequests: Map<string, { createdAt: number; relayState?: string }>;
  private pendingRequestTtlMs = 300_000; // 5 minutes

  constructor(config: SSOEndpointConfig) {
    // Apply defaults
    this.config = {
      basePath: '/sso',
      loginRedirectUrl: '/',
      logoutRedirectUrl: '/',
      tokenTtlSeconds: 3600,
      assertionCacheTtlMs: 300_000,
      maxCacheEntries: 10_000,
      auditLogDir: './data/audit',
      ...config,
      google: {
        assertionCacheTtlMs: config.assertionCacheTtlMs || 300_000,
        certificateCacheTtlMs: 86_400_000,
        maxCacheEntries: config.maxCacheEntries || 10_000,
        allowedClockSkewSeconds: 120,
        requireSignedResponse: true,
        requireSignedAssertion: true,
        ...config.google,
      },
    };

    // Initialize audit
    this.audit = new AuditService({ logDir: this.config.auditLogDir });

    // Initialize Genesis SSO
    const doctrine = getDoctrine();
    const evaluator = new Evaluator(doctrine);
    const ssoConfig: SSOConfig = {
      jwtSecret: this.config.jwtSecret,
      tokenTtlSeconds: this.config.tokenTtlSeconds,
      evaluator,
      audit: this.audit,
    };
    this.genesisSSO = new GenesisSSO(ssoConfig);

    // Initialize Google SAML Provider
    this.googleSAML = new GoogleSAMLProvider(this.config.google, this.genesisSSO);

    // Pending requests map
    this.pendingRequests = new Map();

    // Register routes
    this.routes = new Map();
    this.registerRoutes();

    // Cleanup expired pending requests periodically
    setInterval(() => this.cleanupPendingRequests(), 60_000);
  }

  // -------------------------------------------------------------------------
  // Route Registration
  // -------------------------------------------------------------------------

  private registerRoutes(): void {
    const base = this.config.basePath;

    this.routes.set(`GET:${base}/login`, this.handleLogin.bind(this));
    this.routes.set(`POST:${base}/acs`, this.handleACS.bind(this));
    this.routes.set(`GET:${base}/logout`, this.handleLogout.bind(this));
    this.routes.set(`GET:${base}/metadata`, this.handleMetadata.bind(this));
    this.routes.set(`GET:${base}/status`, this.handleStatus.bind(this));
  }

  // -------------------------------------------------------------------------
  // Main Request Handler
  // -------------------------------------------------------------------------

  async handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const parsed = parseUrl(req.url || '', true);
    const path = parsed.pathname || '';
    const method = req.method || 'GET';

    const routeKey = `${method}:${path}`;
    const handler = this.routes.get(routeKey);

    if (!handler) {
      return false; // Not handled by SSO endpoints
    }

    try {
      await handler(req, res, parsed.query as Record<string, string>);
      return true;
    } catch (err) {
      this.sendError(res, 500, `Internal error: ${err instanceof Error ? err.message : 'Unknown'}`);
      return true;
    }
  }

  // -------------------------------------------------------------------------
  // Route Handlers
  // -------------------------------------------------------------------------

  private async handleLogin(
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ): Promise<void> {
    const relayState = params.redirect || this.config.loginRedirectUrl;

    // Generate AuthnRequest
    const { url, id } = this.googleSAML.generateAuthnRequest(relayState);

    // Store pending request for replay protection
    this.pendingRequests.set(id, {
      createdAt: Date.now(),
      relayState,
    });

    // Audit
    await this.audit.writeLogin({
      principalId: 'anonymous',
      ipAddress: this.getClientIP(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      success: true,
      riskLevel: 'low',
      actorId: 'sso-endpoint',
      actorType: 'service',
      source: 'sso-login-initiate',
    });

    // Redirect to Google
    res.writeHead(302, { Location: url });
    res.end();
  }

  private async handleACS(
    req: IncomingMessage,
    res: ServerResponse,
    _params: Record<string, string>
  ): Promise<void> {
    // Parse POST body
    const body = await this.parseBody(req);
    const samlResponse = body.SAMLResponse;
    const relayState = body.RelayState || this.config.loginRedirectUrl;

    if (!samlResponse) {
      this.sendError(res, 400, 'Missing SAMLResponse');
      return;
    }

    // Process SAML response
    const result = await this.googleSAML.processSAMLResponse(samlResponse);

    // Audit
    await this.audit.writeLogin({
      principalId: result.identity?.subjectId || 'unknown',
      ipAddress: this.getClientIP(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      success: result.success,
      riskLevel: result.success ? (result.identity?.mfa ? 'low' : 'medium') : 'high',
      actorId: 'sso-endpoint',
      actorType: 'service',
      source: 'sso-acs',
    });

    if (!result.success) {
      this.sendError(res, 401, result.error || 'SAML authentication failed');
      return;
    }

    // Set JWT cookie and redirect
    const cookieOptions = [
      `genesis_token=${result.token}`,
      'HttpOnly',
      'Secure',
      'SameSite=Strict',
      `Max-Age=${this.config.tokenTtlSeconds}`,
      'Path=/',
    ].join('; ');

    res.writeHead(302, {
      'Set-Cookie': cookieOptions,
      Location: relayState,
    });
    res.end();
  }

  private async handleLogout(
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ): Promise<void> {
    // Get current identity from cookie
    const token = this.extractToken(req);
    let identity: Identity | null = null;

    if (token) {
      try {
        identity = await this.genesisSSO.authenticate(token);
      } catch {
        // Token invalid or expired, continue with logout
      }
    }

    // Clear cookie
    const clearCookie = [
      'genesis_token=',
      'HttpOnly',
      'Secure',
      'SameSite=Strict',
      'Max-Age=0',
      'Path=/',
    ].join('; ');

    // If we have identity info, generate SAML logout request
    if (identity && params.saml !== 'false') {
      const sessionIndex = params.sessionIndex || '';
      const { url } = this.googleSAML.generateLogoutRequest(identity.email, sessionIndex);

      res.writeHead(302, {
        'Set-Cookie': clearCookie,
        Location: url,
      });
    } else {
      // Local logout only
      res.writeHead(302, {
        'Set-Cookie': clearCookie,
        Location: this.config.logoutRedirectUrl,
      });
    }

    // Audit
    await this.audit.writeLogin({
      principalId: identity?.subjectId || 'unknown',
      ipAddress: this.getClientIP(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      success: true,
      riskLevel: 'low',
      actorId: 'sso-endpoint',
      actorType: 'service',
      source: 'sso-logout',
    });

    res.end();
  }

  private async handleMetadata(
    _req: IncomingMessage,
    res: ServerResponse,
    _params: Record<string, string>
  ): Promise<void> {
    const metadata = this.googleSAML.generateSPMetadata();

    res.writeHead(200, {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400',
    });
    res.end(metadata);
  }

  private async handleStatus(
    _req: IncomingMessage,
    res: ServerResponse,
    _params: Record<string, string>
  ): Promise<void> {
    const cacheStats = this.googleSAML.getCacheStats();
    const status = {
      healthy: true,
      timestamp: new Date().toISOString(),
      cache: cacheStats,
      pendingRequests: this.pendingRequests.size,
      endpoints: {
        login: `${this.config.basePath}/login`,
        acs: `${this.config.basePath}/acs`,
        logout: `${this.config.basePath}/logout`,
        metadata: `${this.config.basePath}/metadata`,
      },
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status, null, 2));
  }

  // -------------------------------------------------------------------------
  // Utilities
  // -------------------------------------------------------------------------

  private async parseBody(req: IncomingMessage): Promise<Record<string, string>> {
    return new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => {
        try {
          const parsed = parseQueryString(data) as Record<string, string | string[]>;
          const result: Record<string, string> = {};
          for (const [key, value] of Object.entries(parsed)) {
            result[key] = Array.isArray(value) ? value[0] : value;
          }
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      req.on('error', reject);
    });
  }

  private extractToken(req: IncomingMessage): string | null {
    const cookies = req.headers.cookie || '';
    const match = cookies.match(/genesis_token=([^;]+)/);
    return match ? match[1] : null;
  }

  private getClientIP(req: IncomingMessage): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      return ips.split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
  }

  private sendError(res: ServerResponse, status: number, message: string): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: message, status }));
  }

  private cleanupPendingRequests(): void {
    const now = Date.now();
    for (const [id, entry] of this.pendingRequests) {
      if (now - entry.createdAt > this.pendingRequestTtlMs) {
        this.pendingRequests.delete(id);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Express/Fastify Middleware Adapters
  // -------------------------------------------------------------------------

  expressMiddleware() {
    return async (req: any, res: any, next: () => void) => {
      const handled = await this.handle(req, res);
      if (!handled) next();
    };
  }

  fastifyPlugin() {
    return async (fastify: any) => {
      fastify.route({
        method: ['GET', 'POST'],
        url: `${this.config.basePath}/*`,
        handler: async (req: any, reply: any) => {
          await this.handle(req.raw, reply.raw);
        },
      });
    };
  }
}

// ---------------------------------------------------------------------------
// Factory function
// ---------------------------------------------------------------------------

export function createSSOEndpoints(config: SSOEndpointConfig): SSOEndpoints {
  return new SSOEndpoints(config);
}

/**
 * Auth Portal - HTTP Server
 *
 * Full-stack application server that serves:
 * - Static frontend (HTML/CSS/JS)
 * - REST API endpoints for authentication
 * - WebSocket support for real-time features
 *
 * Zero external dependencies - uses Node.js built-in modules only.
 */

import * as http from 'node:http';
import * as https from 'node:https';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';
import { initAuthPortal, processRequest, VERSION } from './index';
import type { WebRequest, WebResponse } from './types';

// ============================================================================
// Configuration
// ============================================================================

interface ServerConfig {
  port: number;
  host: string;
  publicDir: string;
  apiPrefix: string;
  corsOrigins: string[];
  trustProxy: boolean;
  ssl?: {
    key: string;
    cert: string;
  };
}

function loadConfig(): ServerConfig {
  return {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    publicDir: process.env.PUBLIC_DIR || path.join(__dirname, '..', 'public'),
    apiPrefix: process.env.API_PREFIX || '/api',
    corsOrigins: (process.env.CORS_ORIGINS || '*').split(','),
    trustProxy: process.env.TRUST_PROXY === 'true',
    ssl: process.env.SSL_KEY && process.env.SSL_CERT ? {
      key: process.env.SSL_KEY,
      cert: process.env.SSL_CERT,
    } : undefined,
  };
}

// ============================================================================
// MIME Types
// ============================================================================

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.webp': 'image/webp',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.map': 'application/json',
};

// ============================================================================
// Request Parsing
// ============================================================================

interface ParsedRequest {
  method: string;
  pathname: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  cookies: Record<string, string>;
  ip: string;
}

async function parseRequest(
  req: http.IncomingMessage,
  config: ServerConfig
): Promise<ParsedRequest> {
  const parsedUrl = url.parse(req.url || '/', true);
  const headers: Record<string, string> = {};

  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') {
      headers[key.toLowerCase()] = value;
    } else if (Array.isArray(value)) {
      headers[key.toLowerCase()] = value.join(', ');
    }
  }

  // Parse cookies
  const cookies: Record<string, string> = {};
  const cookieHeader = headers.cookie || '';
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name) {
      cookies[name] = decodeURIComponent(rest.join('='));
    }
  });

  // Get client IP
  let ip = req.socket.remoteAddress || '127.0.0.1';
  if (config.trustProxy) {
    ip = (headers['x-forwarded-for'] || ip).split(',')[0].trim();
  }

  // Parse body for POST/PUT/PATCH
  let body: Record<string, unknown> = {};
  if (['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
    body = await parseBody(req, headers['content-type'] || '');
  }

  return {
    method: req.method || 'GET',
    pathname: parsedUrl.pathname || '/',
    query: parsedUrl.query as Record<string, string>,
    headers,
    body,
    cookies,
    ip,
  };
}

async function parseBody(
  req: http.IncomingMessage,
  contentType: string
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const maxSize = 10 * 1024 * 1024; // 10MB limit

    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxSize) {
        req.destroy();
        reject(new Error('Request body too large'));
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');

      if (!raw) {
        resolve({});
        return;
      }

      try {
        if (contentType.includes('application/json')) {
          resolve(JSON.parse(raw));
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          const params = new URLSearchParams(raw);
          const result: Record<string, string> = {};
          params.forEach((value, key) => {
            result[key] = value;
          });
          resolve(result);
        } else {
          resolve({ raw });
        }
      } catch {
        resolve({ raw });
      }
    });

    req.on('error', reject);
  });
}

// ============================================================================
// Response Helpers
// ============================================================================

function sendResponse(
  res: http.ServerResponse,
  status: number,
  headers: Record<string, string>,
  body: string | Buffer
): void {
  res.writeHead(status, headers);
  res.end(body);
}

function sendJSON(
  res: http.ServerResponse,
  status: number,
  data: unknown,
  extraHeaders: Record<string, string> = {}
): void {
  const body = JSON.stringify(data);
  sendResponse(res, status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body).toString(),
    ...extraHeaders,
  }, body);
}

function sendError(
  res: http.ServerResponse,
  status: number,
  message: string
): void {
  sendJSON(res, status, { error: message, status });
}

function setCookies(
  res: http.ServerResponse,
  cookies: WebResponse['cookies']
): void {
  if (!cookies) return;

  const cookieHeaders = cookies.map(cookie => {
    let cookieStr = `${cookie.name}=${encodeURIComponent(cookie.value)}`;
    const opts = cookie.options || {};

    if (opts.httpOnly) cookieStr += '; HttpOnly';
    if (opts.secure) cookieStr += '; Secure';
    if (opts.sameSite) cookieStr += `; SameSite=${opts.sameSite}`;
    if (opts.maxAge) cookieStr += `; Max-Age=${opts.maxAge}`;
    if (opts.path) cookieStr += `; Path=${opts.path}`;
    if (opts.domain) cookieStr += `; Domain=${opts.domain}`;

    return cookieStr;
  });

  res.setHeader('Set-Cookie', cookieHeaders);
}

// ============================================================================
// Static File Server
// ============================================================================

async function serveStaticFile(
  res: http.ServerResponse,
  filePath: string,
  config: ServerConfig
): Promise<boolean> {
  // Prevent directory traversal
  const safePath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath = path.join(config.publicDir, safePath);

  // Ensure path is within public directory
  if (!fullPath.startsWith(path.resolve(config.publicDir))) {
    sendError(res, 403, 'Forbidden');
    return true;
  }

  try {
    const stat = await fs.promises.stat(fullPath);

    if (stat.isDirectory()) {
      // Try index.html
      const indexPath = path.join(fullPath, 'index.html');
      try {
        await fs.promises.access(indexPath);
        return serveStaticFile(res, path.join(safePath, 'index.html'), config);
      } catch {
        return false;
      }
    }

    const ext = path.extname(fullPath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    // Cache headers
    const cacheControl = ext === '.html'
      ? 'no-cache, must-revalidate'
      : 'public, max-age=31536000, immutable';

    const content = await fs.promises.readFile(fullPath);

    sendResponse(res, 200, {
      'Content-Type': mimeType,
      'Content-Length': content.length.toString(),
      'Cache-Control': cacheControl,
      'X-Content-Type-Options': 'nosniff',
    }, content);

    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// API Handler
// ============================================================================

async function handleAPI(
  parsed: ParsedRequest,
  config: ServerConfig
): Promise<WebResponse> {
  const apiPath = parsed.pathname.slice(config.apiPrefix.length);

  // Build WebRequest from parsed request
  const webRequest: WebRequest = {
    action: parsed.body.action as string || parsed.query.action || 'view',
    title: parsed.body.title as string || parsed.query.title || '',
    username: parsed.body.username as string,
    password: parsed.body.password as string,
    email: parsed.body.email as string,
    rememberMe: parsed.body.rememberMe as boolean,
    returnto: parsed.body.returnto as string || parsed.query.returnto,
    sessionId: parsed.cookies['auth_session'] || parsed.headers.authorization?.replace('Bearer ', ''),
    ip: parsed.ip,
    userAgent: parsed.headers['user-agent'],
    language: parsed.body.language as string,
    theme: parsed.body.theme as string,
    ...parsed.body,
  };

  // Route API endpoints
  switch (apiPath) {
    case '/login':
      webRequest.action = 'submit';
      webRequest.title = 'login';
      break;
    case '/register':
    case '/signup':
      webRequest.action = 'submit';
      webRequest.title = 'createaccount';
      break;
    case '/password-reset':
    case '/forgot-password':
      webRequest.action = 'submit';
      webRequest.title = 'passwordreset';
      break;
    case '/settings':
    case '/preferences':
      webRequest.action = 'submit';
      webRequest.title = 'settings';
      break;
    case '/logout':
      webRequest.action = 'logout';
      break;
    case '/session':
    case '/me':
      webRequest.action = 'view';
      webRequest.title = 'session';
      break;
    case '/health':
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'healthy',
          version: VERSION,
          timestamp: new Date().toISOString(),
        }),
      };
    default:
      // Pass through to action entry point
      break;
  }

  return processRequest(webRequest);
}

// ============================================================================
// CORS Handler
// ============================================================================

function handleCORS(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  config: ServerConfig
): boolean {
  const origin = req.headers.origin || '';
  const allowedOrigin = config.corsOrigins.includes('*')
    ? '*'
    : config.corsOrigins.includes(origin) ? origin : '';

  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }

  return false;
}

// ============================================================================
// Request Handler
// ============================================================================

async function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  config: ServerConfig
): Promise<void> {
  const startTime = Date.now();

  // Security headers
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Handle CORS
  if (handleCORS(req, res, config)) {
    return;
  }

  try {
    const parsed = await parseRequest(req, config);

    // Log request
    const logLine = `${parsed.method} ${parsed.pathname}`;

    // API routes
    if (parsed.pathname.startsWith(config.apiPrefix)) {
      const apiResponse = await handleAPI(parsed, config);

      setCookies(res, apiResponse.cookies);

      const headers = {
        ...apiResponse.headers,
        'X-Response-Time': `${Date.now() - startTime}ms`,
      };

      sendResponse(
        res,
        apiResponse.status,
        headers,
        typeof apiResponse.body === 'string'
          ? apiResponse.body
          : JSON.stringify(apiResponse.body)
      );

      console.log(`${logLine} -> ${apiResponse.status} (${Date.now() - startTime}ms)`);
      return;
    }

    // Static files
    const served = await serveStaticFile(res, parsed.pathname, config);
    if (served) {
      console.log(`${logLine} -> 200 (static, ${Date.now() - startTime}ms)`);
      return;
    }

    // SPA fallback - serve index.html for unmatched routes
    const spaServed = await serveStaticFile(res, '/index.html', config);
    if (spaServed) {
      console.log(`${logLine} -> 200 (SPA fallback, ${Date.now() - startTime}ms)`);
      return;
    }

    // 404
    sendError(res, 404, 'Not Found');
    console.log(`${logLine} -> 404 (${Date.now() - startTime}ms)`);

  } catch (error) {
    console.error('Request error:', error);
    sendError(res, 500, 'Internal Server Error');
  }
}

// ============================================================================
// Server Startup
// ============================================================================

async function startServer(): Promise<void> {
  const config = loadConfig();

  // Initialize auth portal
  console.log('Initializing Auth Portal...');
  await initAuthPortal();

  // Create server
  const requestHandler = (req: http.IncomingMessage, res: http.ServerResponse) => {
    handleRequest(req, res, config).catch(err => {
      console.error('Unhandled error:', err);
      if (!res.headersSent) {
        sendError(res, 500, 'Internal Server Error');
      }
    });
  };

  let server: http.Server | https.Server;

  if (config.ssl) {
    const options = {
      key: fs.readFileSync(config.ssl.key),
      cert: fs.readFileSync(config.ssl.cert),
    };
    server = https.createServer(options, requestHandler);
    console.log('HTTPS mode enabled');
  } else {
    server = http.createServer(requestHandler);
  }

  // Graceful shutdown
  const shutdown = (signal: string) => {
    console.log(`\n${signal} received, shutting down gracefully...`);

    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Start listening
  server.listen(config.port, config.host, () => {
    const protocol = config.ssl ? 'https' : 'http';
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗               ║
║   ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝               ║
║   ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗               ║
║   ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║               ║
║   ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║               ║
║   ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝               ║
║                                                              ║
║   Auth Portal v${VERSION.padEnd(48)}║
║                                                              ║
║   Server running at ${protocol}://${config.host}:${config.port}                    ║
║                                                              ║
║   API:     ${config.apiPrefix.padEnd(50)}║
║   Static:  ${config.publicDir.slice(-45).padEnd(50)}║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${config.port} is already in use`);
    } else {
      console.error('Server error:', err);
    }
    process.exit(1);
  });
}

// Start if run directly
startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export { startServer, loadConfig };

import { Request, Response, NextFunction } from 'express';

const requestCounts = new Map<string, { count: number; resetTime: number }>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100;

export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const key = req.ip || 'unknown';
  const now = Date.now();

  const entry = requestCounts.get(key);

  if (!entry || now > entry.resetTime) {
    requestCounts.set(key, { count: 1, resetTime: now + WINDOW_MS });
    next();
    return;
  }

  if (entry.count >= MAX_REQUESTS) {
    res.status(429).json({ error: 'Too many requests', retryAfter: Math.ceil((entry.resetTime - now) / 1000) });
    return;
  }

  entry.count++;
  next();
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of requestCounts) {
    if (now > entry.resetTime) {
      requestCounts.delete(key);
    }
  }
}, 60000);

/**
 * GENESIS 2.0 API Server
 * Enterprise Security Backend - Port 8080
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { pino } from 'pino';

import { authRoutes } from './routes/auth';
import { securityRoutes } from './routes/security';
import { deviceRoutes } from './routes/devices';
import { alertRoutes } from './routes/alerts';
import { notificationRoutes } from './routes/notifications';
import { aiRoutes } from './routes/ai';
import { auditRoutes } from './routes/audit';
import { pentagonRoutes } from './routes/pentagon';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { rateLimiter } from './middleware/rateLimiter';
import { initDatabase } from './services/database';

const logger = pino({ name: 'genesis-api' });
const app = express();
const PORT = process.env.PORT || 8080;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:19006'],
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);
app.use(rateLimiter);

// Health check
app.get('/health', (_, res) => {
  res.json({ status: 'healthy', version: '2.0.0', timestamp: new Date().toISOString() });
});

app.get('/api/health', (_, res) => {
  res.json({ status: 'healthy', version: '2.0.0', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/pentagon', pentagonRoutes);

// Legacy routes (mobile app compatibility)
app.use('/shield', securityRoutes);
app.use('/network', deviceRoutes);
app.use('/alerts', alertRoutes);
app.use('/pentagon', pentagonRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((_, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Start server
async function start() {
  try {
    await initDatabase();
    logger.info('Database initialized');

    app.listen(PORT, () => {
      logger.info(`GENESIS API running on port ${PORT}`);
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    GENESIS 2.0 API                        ║
║                 Enterprise Security Backend               ║
╠═══════════════════════════════════════════════════════════╣
║  Status:  ONLINE                                          ║
║  Port:    ${PORT}                                            ║
║  Version: 2.0.0                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export default app;

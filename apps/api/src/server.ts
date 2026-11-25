import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables if .env exists
try {
  process.loadEnvFile();
} catch {
  // .env is optional
}

import { router as apiRoutes } from './routes/index.js';
import { WhatsAppController } from './controllers/whatsapp.controller.js';
import { requestLogger } from './middleware/logger.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error-handler.js';
import { getDb } from './database/db.js';
import { runSeed } from './database/seed.js';
import { PostgresService } from './database/postgres.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Global Middleware
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(requestLogger);
app.use(authMiddleware);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'Artha API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Mount modular API v1 router
app.use('/api/v1', apiRoutes);

// Root aliases for Meta WhatsApp Webhook configuration (supports both /webhooks/whatsapp and /api/v1/webhooks/whatsapp)
app.get('/webhooks/whatsapp', WhatsAppController.verifyWebhook);
app.post('/webhooks/whatsapp', WhatsAppController.handleWebhookMessage);
app.get('/whatsapp/test-connection', WhatsAppController.testConnection);

// Optional static frontend serving for unified single-service deployment
const candidateWebPaths = [
  path.resolve(__dirname, '../../web/dist'),
  path.resolve(process.cwd(), 'apps/web/dist'),
  path.resolve(process.cwd(), 'dist'),
];

for (const p of candidateWebPaths) {
  if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
    app.use(express.static(p));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/webhooks')) return next();
      res.sendFile(path.join(p, 'index.html'));
    });
    break;
  }
}

// Centralized Error Handling
app.use(errorHandler);

// Initialize database schema and verify seed on launch
try {
  const db = getDb();
  const userCheck = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  if (userCheck.cnt === 0) {
    console.log('⚡ Initializing database schema with default seed data...');
    runSeed();
  } else {
    // Re-verify that founder account is seeded even if database existed
    runSeed();
  }

  // Verify PostgreSQL cloud link if configured
  if (PostgresService.isConfigured()) {
    console.log('🐘 PostgreSQL detected in environment (DATABASE_URL configured). Connecting to cloud database...');
    PostgresService.testConnection().then((diag) => {
      if (diag.ok) {
        console.log('✅ PostgreSQL connection verified. Cloud database active:', diag.version);
      } else {
        console.warn('⚠️ PostgreSQL connection failed, falling back to local storage:', diag.error);
      }
    });
  }
} catch (err) {
  console.error('Error verifying database state:', err);
}

const isTest = process.env.NODE_ENV === 'test' || process.argv.some((arg) => arg.includes('test'));
if (!isTest) {
  app.listen(PORT, () => {
    console.log(`🏛️ Artha Financial API running at http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`💼 API v1 base: http://localhost:${PORT}/api/v1`);
  });
}

export default app;

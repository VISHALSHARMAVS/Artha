import express from 'express';
import cors from 'cors';
import { router as apiRoutes } from './routes/index.js';
import { requestLogger } from './middleware/logger.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error-handler.js';
import { getDb } from './database/db.js';
import { runSeed } from './database/seed.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Global Middleware
app.use(cors());
app.use(express.json());
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

// Centralized Error Handling
app.use(errorHandler);

// Initialize database schema and verify seed on launch
try {
  const db = getDb();
  const userCheck = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  if (userCheck.cnt === 0) {
    console.log('⚡ Initializing database schema with default seed data...');
    runSeed();
  }
} catch (err) {
  console.error('Error verifying database state:', err);
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🏛️ Artha Financial API running at http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`💼 API v1 base: http://localhost:${PORT}/api/v1`);
  });
}

export default app;

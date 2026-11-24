import { Request, Response, NextFunction } from 'express';
import { Security } from '../lib/security.js';
import { AppError } from './error-handler.js';

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

export const DEFAULT_USER_ID = 'usr_artha_demo';

// List of public endpoints that do not require authentication
const PUBLIC_PATHS = [
  '/api/health',
  '/api/v1/auth/register',
  '/api/v1/auth/login',
  '/api/v1/webhooks/whatsapp',
  '/api/v1/whatsapp/simulate',
  '/api/v1/whatsapp/test-connection',
  '/webhooks/whatsapp',
  '/whatsapp/test-connection',
];

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const path = req.path;

  // 1. All non-API frontend static assets and routes are public
  if (!path.startsWith('/api')) {
    return next();
  }

  // 2. Check if current API request path is public
  if (PUBLIC_PATHS.some((publicPath) => path === publicPath || path.startsWith(publicPath))) {
    return next();
  }

  const authHeader = req.header('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const payload = Security.verifyToken(token);
    if (payload) {
      req.userId = payload.userId;
      return next();
    }
  }

  // Developer / test mode ONLY: allow x-user-id in automated test suite
  if (process.env.NODE_ENV === 'test') {
    const headerUserId = req.header('x-user-id');
    if (headerUserId && headerUserId.trim()) {
      req.userId = headerUserId.trim();
      return next();
    }
  }

  // Demo mode fallback: allow read-only exploration of sample data
  if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEMO_MODE !== 'false') {
    // Prevent anonymous users from corrupting or mutating shared demo financial records
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    const isPublicFlow = path.startsWith('/api/v1/auth') || path.startsWith('/api/v1/onboarding');

    if (isMutation && !isPublicFlow && process.env.NODE_ENV !== 'test') {
      throw new AppError(
        'Authentication required. Shared demo data is protected against anonymous modifications. Please create a free account or sign in to record transactions.',
        401,
        'DEMO_MUTATION_FORBIDDEN'
      );
    }

    req.userId = DEFAULT_USER_ID;
    return next();
  }

  // Reject unauthenticated requests in production if demo mode is explicitly disabled
  throw new AppError('Unauthorized: Authentication token is missing or has expired. Please sign in.', 401, 'UNAUTHORIZED');
}

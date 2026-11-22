import { Request, Response, NextFunction } from 'express';

// Extend Express Request to include authenticated user ID
declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

export const DEFAULT_USER_ID = 'usr_artha_demo';

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  // Extract user ID from header or use default demo user
  const headerUserId = req.header('x-user-id');
  req.userId = (headerUserId && headerUserId.trim()) ? headerUserId.trim() : DEFAULT_USER_ID;
  next();
}

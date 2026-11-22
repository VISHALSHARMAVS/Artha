import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service.js';

export class DashboardController {
  static getOverview(req: Request, res: Response, next: NextFunction): void {
    try {
      const data = DashboardService.getOverview(req.userId);
      res.json({
        success: true,
        data,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  }
}

import { Request, Response, NextFunction } from 'express';
import { SplitService } from '../services/split.service.js';

export class SplitController {
  static list(req: Request, res: Response, next: NextFunction): void {
    try {
      let isSettled: boolean | undefined = undefined;
      if (req.query.is_settled !== undefined) {
        isSettled = req.query.is_settled === 'true' || req.query.is_settled === '1';
      }

      const receivables = SplitService.listReceivables(req.userId, isSettled);
      res.json({ success: true, data: receivables });
    } catch (error) {
      next(error);
    }
  }

  static summary(req: Request, res: Response, next: NextFunction): void {
    try {
      const summary = SplitService.getSummary(req.userId);
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }

  static settle(req: Request, res: Response, next: NextFunction): void {
    try {
      const updated = SplitService.settleReceivable(req.params.id, req.userId, req.body);
      res.json({
        success: true,
        data: updated,
        message: 'Split payment settled and account balance credited successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static delete(req: Request, res: Response, next: NextFunction): void {
    try {
      SplitService.deleteReceivable(req.params.id, req.userId);
      res.json({ success: true, message: 'Split receivable deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

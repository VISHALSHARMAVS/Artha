import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/report.service.js';

export class ReportController {
  static getCashFlow(req: Request, res: Response, next: NextFunction): void {
    try {
      const months = req.query.months ? parseInt(req.query.months as string, 10) : 6;
      const history = ReportService.getCashFlowHistory(req.userId, months);
      res.json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  }

  static getCategoryBreakdown(req: Request, res: Response, next: NextFunction): void {
    try {
      const now = new Date();
      const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const monthYear = (req.query.month_year as string) || defaultMonth;

      const breakdown = ReportService.getCategoryBreakdown(req.userId, monthYear);
      res.json({ success: true, data: breakdown });
    } catch (error) {
      next(error);
    }
  }
}

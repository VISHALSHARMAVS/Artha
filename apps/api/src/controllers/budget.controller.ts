import { Request, Response, NextFunction } from 'express';
import { BudgetService } from '../services/budget.service.js';

export class BudgetController {
  static listForMonth(req: Request, res: Response, next: NextFunction): void {
    try {
      const now = new Date();
      const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const monthYear = (req.query.month_year as string) || defaultMonth;

      const budgets = BudgetService.getBudgetsForMonth(req.userId, monthYear);
      res.json({ success: true, data: budgets });
    } catch (error) {
      next(error);
    }
  }

  static createOrUpdate(req: Request, res: Response, next: NextFunction): void {
    try {
      const budget = BudgetService.setBudget(req.body, req.userId);
      res.status(200).json({ success: true, data: budget });
    } catch (error) {
      next(error);
    }
  }
}

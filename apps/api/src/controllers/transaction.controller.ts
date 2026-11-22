import { Request, Response, NextFunction } from 'express';
import { TransactionService } from '../services/transaction.service.js';

export class TransactionController {
  static list(req: Request, res: Response, next: NextFunction): void {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = TransactionService.listTransactions({
        userId: req.userId,
        type: req.query.type as any,
        accountId: req.query.account_id as string,
        categoryId: req.query.category_id as string,
        startDate: req.query.start_date as string,
        endDate: req.query.end_date as string,
        search: req.query.search as string,
        page,
        limit,
      });

      res.json({
        success: true,
        data: result.transactions,
        pagination: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static getById(req: Request, res: Response, next: NextFunction): void {
    try {
      const tx = TransactionService.getTransaction(req.params.id, req.userId);
      res.json({ success: true, data: tx });
    } catch (error) {
      next(error);
    }
  }

  static create(req: Request, res: Response, next: NextFunction): void {
    try {
      const tx = TransactionService.recordTransaction(req.body, req.userId);
      res.status(201).json({ success: true, data: tx });
    } catch (error) {
      next(error);
    }
  }

  static quickAdd(req: Request, res: Response, next: NextFunction): void {
    try {
      const tx = TransactionService.quickAdd(req.body, req.userId);
      res.status(201).json({ success: true, data: tx });
    } catch (error) {
      next(error);
    }
  }

  static delete(req: Request, res: Response, next: NextFunction): void {
    try {
      TransactionService.deleteTransaction(req.params.id, req.userId);
      res.json({ success: true, message: 'Transaction deleted and account balance updated successfully' });
    } catch (error) {
      next(error);
    }
  }
}

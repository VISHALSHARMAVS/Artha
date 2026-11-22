import { Request, Response, NextFunction } from 'express';
import { AccountService } from '../services/account.service.js';

export class AccountController {
  static list(req: Request, res: Response, next: NextFunction): void {
    try {
      const accounts = AccountService.getAccounts(req.userId);
      res.json({ success: true, data: accounts });
    } catch (error) {
      next(error);
    }
  }

  static getById(req: Request, res: Response, next: NextFunction): void {
    try {
      const account = AccountService.getAccount(req.params.id, req.userId);
      res.json({ success: true, data: account });
    } catch (error) {
      next(error);
    }
  }

  static create(req: Request, res: Response, next: NextFunction): void {
    try {
      const created = AccountService.createAccount(req.body, req.userId);
      res.status(201).json({ success: true, data: created });
    } catch (error) {
      next(error);
    }
  }
}

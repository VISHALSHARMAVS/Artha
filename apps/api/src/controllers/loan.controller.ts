import { Request, Response, NextFunction } from 'express';
import { LoanService } from '../services/loan.service.js';

export class LoanController {
  static list(req: Request, res: Response, next: NextFunction): void {
    try {
      const loans = LoanService.getLoans(req.userId);
      res.json({ success: true, data: loans });
    } catch (error) {
      next(error);
    }
  }

  static getSchedule(req: Request, res: Response, next: NextFunction): void {
    try {
      const schedule = LoanService.getAmortizationSchedule(req.params.id, req.userId);
      res.json({ success: true, data: schedule });
    } catch (error) {
      next(error);
    }
  }

  static preview(req: Request, res: Response, next: NextFunction): void {
    try {
      const { principal_paise, annual_interest_rate, tenure_months } = req.body;
      const preview = LoanService.calculatePreview(
        Number(principal_paise),
        Number(annual_interest_rate),
        Number(tenure_months)
      );
      res.json({ success: true, data: preview });
    } catch (error) {
      next(error);
    }
  }

  static create(req: Request, res: Response, next: NextFunction): void {
    try {
      const loan = LoanService.createLoan(req.body, req.userId);
      res.status(201).json({ success: true, data: loan });
    } catch (error) {
      next(error);
    }
  }
}

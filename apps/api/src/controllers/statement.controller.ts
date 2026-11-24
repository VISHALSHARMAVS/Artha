import { Request, Response, NextFunction } from 'express';
import { ParseStatementSchema, BatchImportStatementSchema } from '@artha/domain';
import { PdfStatementService } from '../services/pdf-statement.service.js';

export class StatementController {
  static async parsePdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = ParseStatementSchema.parse(req.body);
      const candidates = await PdfStatementService.parseStatementPdf(
        payload.file_base64,
        payload.password,
        req.userId,
        payload.account_id
      );

      res.json({
        success: true,
        count: candidates.length,
        candidates,
      });
    } catch (error) {
      next(error);
    }
  }

  static batchImport(req: Request, res: Response, next: NextFunction): void {
    try {
      const payload = BatchImportStatementSchema.parse(req.body);
      const result = PdfStatementService.batchImportTransactions(
        req.userId,
        payload.account_id,
        payload.transactions
      );

      res.status(201).json({
        success: true,
        message: `Successfully imported ${result.imported_count} transactions.`,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}

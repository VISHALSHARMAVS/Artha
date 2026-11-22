import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/category.service.js';

export class CategoryController {
  static list(req: Request, res: Response, next: NextFunction): void {
    try {
      const categories = CategoryService.getCategoriesForUser(req.userId);
      res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  }

  static suggest(req: Request, res: Response, next: NextFunction): void {
    try {
      const { description } = req.body;
      const suggested = CategoryService.suggestCategory(description || '', req.userId);
      res.json({ success: true, data: suggested });
    } catch (error) {
      next(error);
    }
  }
}

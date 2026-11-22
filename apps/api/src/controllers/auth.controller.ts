import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';

export class AuthController {
  static register(req: Request, res: Response, next: NextFunction): void {
    try {
      const result = AuthService.register(req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Account registered successfully. Welcome to Artha.',
      });
    } catch (error) {
      next(error);
    }
  }

  static login(req: Request, res: Response, next: NextFunction): void {
    try {
      const result = AuthService.login(req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Signed in successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  static me(req: Request, res: Response, next: NextFunction): void {
    try {
      const user = AuthService.getMe(req.userId);
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
}

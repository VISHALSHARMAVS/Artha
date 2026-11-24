import { Request, Response, NextFunction } from 'express';
import { OnboardingService } from '../services/onboarding.service.js';

export class OnboardingController {
  static getCurrent(req: Request, res: Response, next: NextFunction): void {
    try {
      const data = OnboardingService.getCurrentSetup(req.userId);
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static submit(req: Request, res: Response, next: NextFunction): void {
    try {
      const result = OnboardingService.completeOnboarding(req.body, req.userId);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Onboarding completed successfully. Welcome to Artha.',
      });
    } catch (error) {
      next(error);
    }
  }
}

import { Request, Response, NextFunction } from 'express';
import { OnboardingService } from '../services/onboarding.service.js';

export class OnboardingController {
  static submit(req: Request, res: Response, next: NextFunction): void {
    try {
      const result = OnboardingService.completeOnboarding(req.body, req.userId);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Onboarding completed successfully. Welcome to Finora.',
      });
    } catch (error) {
      next(error);
    }
  }
}

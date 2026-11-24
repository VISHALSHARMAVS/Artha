import { SplitRepository } from '../repositories/split.repository.js';
import { AccountRepository } from '../repositories/account.repository.js';
import { AppError } from '../middleware/error-handler.js';
import type { SettleSplitDTO, SplitReceivable } from '@artha/domain';

export class SplitService {
  static listReceivables(userId: string, isSettled?: boolean): SplitReceivable[] {
    return SplitRepository.listByUser(userId, isSettled);
  }

  static getSummary(userId: string) {
    return SplitRepository.getSummary(userId);
  }

  static settleReceivable(id: string, userId: string, dto: SettleSplitDTO): SplitReceivable {
    const account = AccountRepository.findById(dto.account_id, userId);
    if (!account) {
      throw new AppError('Settlement account not found or does not belong to you', 404, 'ACCOUNT_NOT_FOUND');
    }

    const existing = SplitRepository.findById(id, userId);
    if (!existing) {
      throw new AppError('Split receivable record not found', 404, 'SPLIT_NOT_FOUND');
    }

    if (existing.is_settled) {
      throw new AppError('This split has already been marked as settled', 400, 'ALREADY_SETTLED');
    }

    return SplitRepository.settle(id, userId, dto);
  }

  static deleteReceivable(id: string, userId: string): boolean {
    const success = SplitRepository.delete(id, userId);
    if (!success) {
      throw new AppError('Split receivable could not be deleted', 404, 'DELETE_FAILED');
    }
    return true;
  }
}

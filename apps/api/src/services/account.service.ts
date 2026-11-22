import crypto from 'node:crypto';
import { AccountRepository, AccountRecord } from '../repositories/account.repository.js';
import type { CreateAccountDTO } from '@artha/domain';
import { AppError } from '../middleware/error-handler.js';

export class AccountService {
  static getAccounts(userId: string): AccountRecord[] {
    return AccountRepository.findByUserId(userId);
  }

  static getAccount(id: string, userId: string): AccountRecord {
    const account = AccountRepository.findById(id, userId);
    if (!account) {
      throw new AppError('Financial account not found', 404, 'ACCOUNT_NOT_FOUND');
    }
    return account;
  }

  static createAccount(dto: CreateAccountDTO, userId: string): AccountRecord {
    const id = `acc_${crypto.randomUUID().slice(0, 8)}`;
    return AccountRepository.create({
      id,
      user_id: userId,
      name: dto.name,
      account_type: dto.account_type,
      institution_name: dto.institution_name,
      account_number_mask: dto.account_number_mask,
      balance_paise: dto.initial_balance_paise || 0,
      credit_limit_paise: dto.credit_limit_paise || 0,
    });
  }
}

import crypto from 'node:crypto';
import { TransactionRepository, TransactionRecord, TransactionFilterParams } from '../repositories/transaction.repository.js';
import { AccountRepository } from '../repositories/account.repository.js';
import { CategoryService } from './category.service.js';
import type { CreateTransactionDTO, QuickAddTransactionDTO, UpdateTransactionDTO } from '@artha/domain';
import { AppError } from '../middleware/error-handler.js';

export class TransactionService {
  static listTransactions(params: TransactionFilterParams) {
    return TransactionRepository.list(params);
  }

  static getTransaction(id: string, userId: string): TransactionRecord {
    const tx = TransactionRepository.findById(id, userId);
    if (!tx) {
      throw new AppError('Transaction record not found', 404, 'TRANSACTION_NOT_FOUND');
    }
    return tx;
  }

  static recordTransaction(dto: CreateTransactionDTO, userId: string): TransactionRecord {
    // Verify source account exists and belongs to user
    const sourceAccount = AccountRepository.findById(dto.account_id, userId);
    if (!sourceAccount) {
      throw new AppError('Source account does not exist or does not belong to you', 404, 'ACCOUNT_NOT_FOUND');
    }

    // If transfer, verify destination account exists and belongs to user
    if (dto.type === 'TRANSFER') {
      if (!dto.destination_account_id) {
        throw new AppError('Destination account is required for transfers', 400, 'DESTINATION_REQUIRED');
      }
      if (dto.destination_account_id === dto.account_id) {
        throw new AppError('Source and destination accounts must be distinct', 400, 'SAME_ACCOUNT_TRANSFER');
      }
      const destAccount = AccountRepository.findById(dto.destination_account_id, userId);
      if (!destAccount) {
        throw new AppError('Destination account does not exist or does not belong to you', 404, 'DEST_ACCOUNT_NOT_FOUND');
      }
    }

    const id = `tx_${crypto.randomUUID().slice(0, 10)}`;

    return TransactionRepository.create({
      id,
      user_id: userId,
      account_id: dto.account_id,
      destination_account_id: dto.destination_account_id,
      category_id: dto.category_id,
      type: dto.type,
      amount_paise: dto.amount_paise,
      description: dto.description,
      notes: dto.notes,
      transaction_date: dto.transaction_date,
      is_split: dto.is_split,
      personal_share_paise: dto.personal_share_paise,
      splits: dto.splits,
    });
  }

  /**
   * Journey B: Ultra-fast Quick-Add Expense
   * Infers account and category automatically if omitted.
   */
  static quickAdd(dto: QuickAddTransactionDTO, userId: string): TransactionRecord {
    // If account not specified, pick user's primary/first active bank account
    let accountId = dto.account_id;
    if (!accountId) {
      const accounts = AccountRepository.findByUserId(userId);
      const defaultAccount = accounts.find((a) => a.account_type === 'SAVINGS' || a.account_type === 'CHECKING') || accounts[0];
      if (!defaultAccount) {
        throw new AppError('No active account found. Please create an account first.', 400, 'NO_ACCOUNT');
      }
      accountId = defaultAccount.id;
    }

    // Auto-detect category from description if not provided
    let categoryId = dto.category_id;
    if (!categoryId) {
      const suggested = CategoryService.suggestCategory(dto.description, userId);
      if (suggested) {
        categoryId = suggested.id;
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    const txDate = dto.transaction_date || today;

    return this.recordTransaction({
      account_id: accountId,
      category_id: categoryId,
      type: 'EXPENSE',
      amount_paise: dto.amount_paise,
      description: dto.description,
      transaction_date: txDate,
    }, userId);
  }

  static updateTransaction(id: string, dto: UpdateTransactionDTO, userId: string): TransactionRecord {
    const existing = TransactionRepository.findById(id, userId);
    if (!existing) {
      throw new AppError('Transaction record not found', 404, 'TRANSACTION_NOT_FOUND');
    }

    const targetAccountId = dto.account_id ?? existing.account_id;
    const sourceAccount = AccountRepository.findById(targetAccountId, userId);
    if (!sourceAccount) {
      throw new AppError('Account does not exist or does not belong to you', 404, 'ACCOUNT_NOT_FOUND');
    }

    const targetType = dto.type ?? existing.type;
    const targetDestAccountId = dto.destination_account_id !== undefined ? dto.destination_account_id : existing.destination_account_id;

    if (targetType === 'TRANSFER') {
      if (!targetDestAccountId) {
        throw new AppError('Destination account is required for transfers', 400, 'DESTINATION_REQUIRED');
      }
      if (targetDestAccountId === targetAccountId) {
        throw new AppError('Source and destination accounts must be distinct', 400, 'SAME_ACCOUNT_TRANSFER');
      }
      const destAccount = AccountRepository.findById(targetDestAccountId, userId);
      if (!destAccount) {
        throw new AppError('Destination account does not exist or does not belong to you', 404, 'DEST_ACCOUNT_NOT_FOUND');
      }
    }

    return TransactionRepository.update(id, userId, dto);
  }

  static deleteTransaction(id: string, userId: string): boolean {
    const success = TransactionRepository.delete(id, userId);
    if (!success) {
      throw new AppError('Transaction not found or could not be deleted', 404, 'DELETE_FAILED');
    }
    return true;
  }

  static undoLatestTransaction(userId: string): TransactionRecord {
    const latest = TransactionRepository.findLatestByUserId(userId);
    if (!latest) {
      throw new AppError('No transactions found to undo', 404, 'NO_TRANSACTIONS');
    }
    const success = TransactionRepository.delete(latest.id, userId);
    if (!success) {
      throw new AppError('Failed to undo latest transaction', 500, 'UNDO_FAILED');
    }
    return latest;
  }
}

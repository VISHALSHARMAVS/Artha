import { getDb, transaction } from '../database/db.js';
import { AccountRepository } from './account.repository.js';
import type { TransactionType } from '@artha/domain';

export interface TransactionRecord {
  id: string;
  user_id: string;
  account_id: string;
  destination_account_id: string | null;
  category_id: string | null;
  type: TransactionType;
  amount_paise: number;
  description: string;
  notes: string;
  transaction_date: string;
  is_recurring: number;
  recurring_obligation_id: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  account_name?: string;
  destination_account_name?: string;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
}

export interface TransactionFilterParams {
  userId: string;
  type?: TransactionType;
  accountId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class TransactionRepository {
  static findById(id: string, userId: string): TransactionRecord | null {
    const db = getDb();
    const row = db.prepare(`
      SELECT t.*, 
             a.name as account_name, 
             da.name as destination_account_name,
             c.name as category_name, 
             c.icon_name as category_icon, 
             c.color_hex as category_color
      FROM transactions t
      JOIN accounts a ON a.id = t.account_id
      LEFT JOIN accounts da ON da.id = t.destination_account_id
      LEFT JOIN categories c ON c.id = t.category_id
      WHERE t.id = ? AND t.user_id = ?
    `).get(id, userId) as unknown as TransactionRecord | undefined;

    return row || null;
  }

  static list(params: TransactionFilterParams): { transactions: TransactionRecord[]; total: number } {
    const db = getDb();
    const conditions: string[] = ['t.user_id = ?'];
    const sqlParams: any[] = [params.userId];

    if (params.type) {
      conditions.push('t.type = ?');
      sqlParams.push(params.type);
    }
    if (params.accountId) {
      conditions.push('(t.account_id = ? OR t.destination_account_id = ?)');
      sqlParams.push(params.accountId, params.accountId);
    }
    if (params.categoryId) {
      conditions.push('t.category_id = ?');
      sqlParams.push(params.categoryId);
    }
    if (params.startDate) {
      conditions.push('t.transaction_date >= ?');
      sqlParams.push(params.startDate);
    }
    if (params.endDate) {
      conditions.push('t.transaction_date <= ?');
      sqlParams.push(params.endDate);
    }
    if (params.search && params.search.trim()) {
      conditions.push('(t.description LIKE ? OR t.notes LIKE ?)');
      const wild = `%${params.search.trim()}%`;
      sqlParams.push(wild, wild);
    }

    const whereClause = conditions.join(' AND ');

    // Count total
    const countRow = db.prepare(`SELECT COUNT(*) as cnt FROM transactions t WHERE ${whereClause}`).get(...sqlParams) as { cnt: number };
    const total = countRow.cnt;

    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));
    const offset = (page - 1) * limit;

    const rows = db.prepare(`
      SELECT t.*, 
             a.name as account_name, 
             da.name as destination_account_name,
             c.name as category_name, 
             c.icon_name as category_icon, 
             c.color_hex as category_color
      FROM transactions t
      JOIN accounts a ON a.id = t.account_id
      LEFT JOIN accounts da ON da.id = t.destination_account_id
      LEFT JOIN categories c ON c.id = t.category_id
      WHERE ${whereClause}
      ORDER BY t.transaction_date DESC, t.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...sqlParams, limit, offset) as unknown as TransactionRecord[];

    return { transactions: rows, total };
  }

  /**
   * Atomic creation of transaction + ledger balance adjustment.
   */
  static create(data: {
    id: string;
    user_id: string;
    account_id: string;
    destination_account_id?: string;
    category_id?: string;
    type: TransactionType;
    amount_paise: number;
    description: string;
    notes?: string;
    transaction_date: string;
    is_recurring?: number;
    recurring_obligation_id?: string;
  }): TransactionRecord {
    return transaction(() => {
      const db = getDb();

      db.prepare(`
        INSERT INTO transactions (
          id, user_id, account_id, destination_account_id, category_id,
          type, amount_paise, description, notes, transaction_date,
          is_recurring, recurring_obligation_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.id,
        data.user_id,
        data.account_id,
        data.destination_account_id || null,
        data.category_id || null,
        data.type,
        data.amount_paise,
        data.description,
        data.notes || '',
        data.transaction_date,
        data.is_recurring || 0,
        data.recurring_obligation_id || null
      );

      // Adjust account balance based on type
      if (data.type === 'INCOME') {
        // Inflow credits the account
        AccountRepository.adjustBalance(data.account_id, data.amount_paise);
      } else if (data.type === 'EXPENSE') {
        // Outflow debits the account
        AccountRepository.adjustBalance(data.account_id, -data.amount_paise);
      } else if (data.type === 'TRANSFER') {
        if (!data.destination_account_id) {
          throw new Error('Transfer requires destination_account_id');
        }
        // Neutral balance movement: debit source, credit destination
        AccountRepository.adjustBalance(data.account_id, -data.amount_paise);
        AccountRepository.adjustBalance(data.destination_account_id, data.amount_paise);
      }

      return this.findById(data.id, data.user_id)!;
    });
  }

  /**
   * Atomic deletion of transaction + rollback of ledger impact.
   */
  static delete(id: string, userId: string): boolean {
    return transaction(() => {
      const existing = this.findById(id, userId);
      if (!existing) return false;

      const db = getDb();

      // Reverse previous balance impact
      if (existing.type === 'INCOME') {
        AccountRepository.adjustBalance(existing.account_id, -existing.amount_paise);
      } else if (existing.type === 'EXPENSE') {
        AccountRepository.adjustBalance(existing.account_id, existing.amount_paise);
      } else if (existing.type === 'TRANSFER' && existing.destination_account_id) {
        AccountRepository.adjustBalance(existing.account_id, existing.amount_paise);
        AccountRepository.adjustBalance(existing.destination_account_id, -existing.amount_paise);
      }

      db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(id, userId);
      return true;
    });
  }

  /**
   * Calculates Month-to-Date Income and Expense in paise.
   * Transfers are strictly excluded.
   */
  static getMonthTotals(userId: string, monthYear: string): { incomePaise: number; expensePaise: number } {
    const db = getDb();
    const start = `${monthYear}-01`;
    const end = `${monthYear}-31`;

    const incomeRow = db.prepare(`
      SELECT COALESCE(SUM(amount_paise), 0) as total
      FROM transactions
      WHERE user_id = ? AND type = 'INCOME' AND transaction_date >= ? AND transaction_date <= ?
    `).get(userId, start, end) as { total: number };

    const expenseRow = db.prepare(`
      SELECT COALESCE(SUM(amount_paise), 0) as total
      FROM transactions
      WHERE user_id = ? AND type = 'EXPENSE' AND transaction_date >= ? AND transaction_date <= ?
    `).get(userId, start, end) as { total: number };

    return {
      incomePaise: incomeRow.total,
      expensePaise: expenseRow.total,
    };
  }

  /**
   * Category spending distribution for a month.
   */
  static getCategorySpending(userId: string, monthYear: string): Array<{
    categoryId: string;
    categoryName: string;
    iconName: string;
    colorHex: string;
    totalPaise: number;
    transactionCount: number;
  }> {
    const db = getDb();
    const start = `${monthYear}-01`;
    const end = `${monthYear}-31`;

    const rows = db.prepare(`
      SELECT 
        c.id as categoryId,
        c.name as categoryName,
        c.icon_name as iconName,
        c.color_hex as colorHex,
        SUM(t.amount_paise) as totalPaise,
        COUNT(t.id) as transactionCount
      FROM transactions t
      JOIN categories c ON c.id = t.category_id
      WHERE t.user_id = ? AND t.type = 'EXPENSE' AND t.transaction_date >= ? AND t.transaction_date <= ?
      GROUP BY c.id
      ORDER BY totalPaise DESC
    `).all(userId, start, end) as any[];

    return rows;
  }
}

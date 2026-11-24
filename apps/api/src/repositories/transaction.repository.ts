import { getDb, transaction } from '../database/db.js';
import { AccountRepository } from './account.repository.js';
import type { TransactionType, SplitReceivable } from '@artha/domain';
import crypto from 'node:crypto';

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
  is_split?: number;
  personal_share_paise?: number | null;
  created_at: string;
  updated_at: string;
  // Joins
  account_name?: string;
  destination_account_name?: string;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  splits?: SplitReceivable[];
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

    if (row && row.is_split) {
      row.splits = db.prepare(`
        SELECT * FROM split_receivables WHERE transaction_id = ? ORDER BY created_at ASC
      `).all(row.id) as unknown as SplitReceivable[];
    }

    return row || null;
  }

  static findLatestByUserId(userId: string): TransactionRecord | null {
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
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC, t.rowid DESC
      LIMIT 1
    `).get(userId) as unknown as TransactionRecord | undefined;

    if (row && row.is_split) {
      row.splits = db.prepare(`
        SELECT * FROM split_receivables WHERE transaction_id = ? ORDER BY created_at ASC
      `).all(row.id) as unknown as SplitReceivable[];
    }

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
      ORDER BY t.transaction_date DESC, t.created_at DESC, t.rowid DESC
      LIMIT ? OFFSET ?
    `).all(...sqlParams, limit, offset) as unknown as TransactionRecord[];

    for (const r of rows) {
      if (r.is_split) {
        r.splits = db.prepare('SELECT * FROM split_receivables WHERE transaction_id = ? ORDER BY created_at ASC').all(r.id) as unknown as SplitReceivable[];
      }
    }

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
    is_split?: boolean;
    personal_share_paise?: number;
    splits?: Array<{ friend_name: string; amount_paise: number; notes?: string }>;
  }): TransactionRecord {
    return transaction(() => {
      const db = getDb();
      const isSplitNum = data.is_split ? 1 : 0;
      const personalShare = data.is_split ? (data.personal_share_paise ?? data.amount_paise) : null;

      db.prepare(`
        INSERT INTO transactions (
          id, user_id, account_id, destination_account_id, category_id,
          type, amount_paise, description, notes, transaction_date,
          is_recurring, recurring_obligation_id, is_split, personal_share_paise
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        data.recurring_obligation_id || null,
        isSplitNum,
        personalShare
      );

      // If split, insert split receivables
      if (data.is_split && data.splits && data.splits.length > 0) {
        for (const s of data.splits) {
          const splitId = `split_${crypto.randomUUID().slice(0, 10)}`;
          db.prepare(`
            INSERT INTO split_receivables (id, user_id, transaction_id, friend_name, amount_paise, notes)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(splitId, data.user_id, data.id, s.friend_name.trim(), s.amount_paise, s.notes || '');
        }
      }

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
   * Atomic update of transaction + recalculation of ledger balance impact.
   */
  static update(id: string, userId: string, data: {
    account_id?: string;
    destination_account_id?: string | null;
    category_id?: string | null;
    type?: TransactionType;
    amount_paise?: number;
    description?: string;
    notes?: string | null;
    transaction_date?: string;
    is_split?: boolean;
    personal_share_paise?: number | null;
    splits?: Array<{ id?: string; friend_name: string; amount_paise: number; notes?: string }>;
  }): TransactionRecord {
    return transaction(() => {
      const existing = this.findById(id, userId);
      if (!existing) {
        throw new Error('Transaction not found');
      }

      const db = getDb();

      // 1. Reverse previous balance impact on existing accounts
      if (existing.type === 'INCOME') {
        AccountRepository.adjustBalance(existing.account_id, -existing.amount_paise);
      } else if (existing.type === 'EXPENSE') {
        AccountRepository.adjustBalance(existing.account_id, existing.amount_paise);
      } else if (existing.type === 'TRANSFER' && existing.destination_account_id) {
        AccountRepository.adjustBalance(existing.account_id, existing.amount_paise);
        AccountRepository.adjustBalance(existing.destination_account_id, -existing.amount_paise);
      }

      // Determine merged fields
      const newType = data.type ?? existing.type;
      const newAccountId = data.account_id ?? existing.account_id;
      const newDestAccountId = data.destination_account_id !== undefined ? data.destination_account_id : existing.destination_account_id;
      const newCategoryId = data.category_id !== undefined ? data.category_id : existing.category_id;
      const newAmountPaise = data.amount_paise ?? existing.amount_paise;
      const newDescription = data.description ?? existing.description;
      const newNotes = data.notes !== undefined ? (data.notes || '') : existing.notes;
      const newDate = data.transaction_date ?? existing.transaction_date;
      const newIsSplit = data.is_split !== undefined ? (data.is_split ? 1 : 0) : (existing.is_split || 0);
      const newPersonalShare = data.personal_share_paise !== undefined ? data.personal_share_paise : existing.personal_share_paise;

      if (newType === 'TRANSFER' && (!newDestAccountId || newDestAccountId === newAccountId)) {
        throw new Error('Transfer requires a distinct destination account');
      }

      // 2. Apply new balance impact on new accounts
      if (newType === 'INCOME') {
        AccountRepository.adjustBalance(newAccountId, newAmountPaise);
      } else if (newType === 'EXPENSE') {
        AccountRepository.adjustBalance(newAccountId, -newAmountPaise);
      } else if (newType === 'TRANSFER') {
        AccountRepository.adjustBalance(newAccountId, -newAmountPaise);
        AccountRepository.adjustBalance(newDestAccountId!, newAmountPaise);
      }

      // 3. Update database record
      db.prepare(`
        UPDATE transactions
        SET account_id = ?,
            destination_account_id = ?,
            category_id = ?,
            type = ?,
            amount_paise = ?,
            description = ?,
            notes = ?,
            transaction_date = ?,
            is_split = ?,
            personal_share_paise = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `).run(
        newAccountId,
        newDestAccountId,
        newCategoryId,
        newType,
        newAmountPaise,
        newDescription,
        newNotes,
        newDate,
        newIsSplit,
        newPersonalShare ?? null,
        id,
        userId
      );

      // If splits were updated
      if (data.splits !== undefined) {
        db.prepare('DELETE FROM split_receivables WHERE transaction_id = ? AND is_settled = 0').run(id);
        if (data.splits && data.splits.length > 0) {
          for (const s of data.splits) {
            const splitId = s.id || `split_${crypto.randomUUID().slice(0, 10)}`;
            db.prepare(`
              INSERT INTO split_receivables (id, user_id, transaction_id, friend_name, amount_paise, notes)
              VALUES (?, ?, ?, ?, ?, ?)
            `).run(splitId, userId, id, s.friend_name.trim(), s.amount_paise, s.notes || '');
          }
        }
      }

      return this.findById(id, userId)!;
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
      SELECT COALESCE(SUM(COALESCE(personal_share_paise, amount_paise)), 0) as total
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
        SUM(COALESCE(t.personal_share_paise, t.amount_paise)) as totalPaise,
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

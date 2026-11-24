import { getDb, transaction } from '../database/db.js';
import { AccountRepository } from './account.repository.js';
import type { SplitReceivable } from '@artha/domain';

export class SplitRepository {
  static listByUser(userId: string, isSettled?: boolean): SplitReceivable[] {
    const db = getDb();
    let query = `
      SELECT s.*, 
             t.description as transaction_description, 
             t.transaction_date,
             a.name as settled_account_name
      FROM split_receivables s
      JOIN transactions t ON t.id = s.transaction_id
      LEFT JOIN accounts a ON a.id = s.settled_account_id
      WHERE s.user_id = ?
    `;
    const params: any[] = [userId];

    if (isSettled !== undefined) {
      query += ` AND s.is_settled = ?`;
      params.push(isSettled ? 1 : 0);
    }

    query += ` ORDER BY s.created_at DESC`;

    return db.prepare(query).all(...params) as unknown as SplitReceivable[];
  }

  static listByTransaction(transactionId: string): SplitReceivable[] {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM split_receivables WHERE transaction_id = ? ORDER BY created_at ASC
    `).all(transactionId) as unknown as SplitReceivable[];
  }

  static findById(id: string, userId: string): SplitReceivable | null {
    const db = getDb();
    const row = db.prepare(`
      SELECT s.*, 
             t.description as transaction_description, 
             t.transaction_date,
             a.name as settled_account_name
      FROM split_receivables s
      JOIN transactions t ON t.id = s.transaction_id
      LEFT JOIN accounts a ON a.id = s.settled_account_id
      WHERE s.id = ? AND s.user_id = ?
    `).get(id, userId) as unknown as SplitReceivable | undefined;

    return row || null;
  }

  static findPendingByFriendName(userId: string, friendName: string): SplitReceivable | null {
    const db = getDb();
    const wild = `%${friendName.trim().toLowerCase()}%`;
    const row = db.prepare(`
      SELECT s.*, 
             t.description as transaction_description, 
             t.transaction_date,
             a.name as settled_account_name
      FROM split_receivables s
      JOIN transactions t ON t.id = s.transaction_id
      LEFT JOIN accounts a ON a.id = s.settled_account_id
      WHERE s.user_id = ? AND LOWER(s.friend_name) LIKE ? AND s.is_settled = 0
      ORDER BY s.created_at DESC
      LIMIT 1
    `).get(userId, wild) as unknown as SplitReceivable | undefined;

    return row || null;
  }

  static getSummary(userId: string): {
    totalReceivablePaise: number;
    totalSettledPaise: number;
    pendingCount: number;
  } {
    const db = getDb();
    const row = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN is_settled = 0 THEN (amount_paise - settled_amount_paise) ELSE 0 END), 0) as totalReceivable,
        COALESCE(SUM(settled_amount_paise), 0) as totalSettled,
        COUNT(CASE WHEN is_settled = 0 THEN 1 END) as pendingCount
      FROM split_receivables
      WHERE user_id = ?
    `).get(userId) as { totalReceivable: number; totalSettled: number; pendingCount: number };

    return {
      totalReceivablePaise: row.totalReceivable,
      totalSettledPaise: row.totalSettled,
      pendingCount: row.pendingCount,
    };
  }

  static settle(
    id: string,
    userId: string,
    data: {
      account_id: string;
      settled_amount_paise?: number;
      settled_at?: string;
    }
  ): SplitReceivable {
    return transaction(() => {
      const existing = this.findById(id, userId);
      if (!existing) {
        throw new Error('Split receivable record not found');
      }

      if (existing.is_settled) {
        throw new Error('This split has already been marked as fully settled');
      }

      const db = getDb();
      const outstanding = existing.amount_paise - existing.settled_amount_paise;
      const amountToSettle = data.settled_amount_paise ? Math.min(data.settled_amount_paise, outstanding) : outstanding;

      if (amountToSettle <= 0) {
        throw new Error('Settlement amount must be positive');
      }

      // Credit the designated settlement account
      AccountRepository.adjustBalance(data.account_id, amountToSettle);

      const newSettledAmount = existing.settled_amount_paise + amountToSettle;
      const isFullySettled = newSettledAmount >= existing.amount_paise ? 1 : 0;
      const settledDate = data.settled_at || new Date().toISOString().slice(0, 10);

      db.prepare(`
        UPDATE split_receivables
        SET settled_amount_paise = ?,
            is_settled = ?,
            settled_at = ?,
            settled_account_id = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `).run(
        newSettledAmount,
        isFullySettled,
        settledDate,
        data.account_id,
        id,
        userId
      );

      return this.findById(id, userId)!;
    });
  }

  static delete(id: string, userId: string): boolean {
    return transaction(() => {
      const existing = this.findById(id, userId);
      if (!existing) return false;

      // If already settled, rollback the balance credit on the settled account
      if (existing.settled_amount_paise > 0 && existing.settled_account_id) {
        AccountRepository.adjustBalance(existing.settled_account_id, -existing.settled_amount_paise);
      }

      const db = getDb();
      db.prepare('DELETE FROM split_receivables WHERE id = ? AND user_id = ?').run(id, userId);
      return true;
    });
  }
}

import { getDb } from '../database/db.js';
import type { Frequency } from '@artha/domain';

export interface ObligationRecord {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  title: string;
  amount_paise: number;
  frequency: Frequency;
  due_day_of_month: number;
  is_active: number;
  auto_deduct: number;
  next_due_date: string;
  last_processed_date: string | null;
  created_at: string;
  // Joins
  account_name?: string;
  category_name?: string;
}

export class ObligationRepository {
  static listAll(userId: string): ObligationRecord[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT o.*, a.name as account_name, c.name as category_name
      FROM recurring_obligations o
      JOIN accounts a ON a.id = o.account_id
      LEFT JOIN categories c ON c.id = o.category_id
      WHERE o.user_id = ? AND o.is_active = 1
      ORDER BY o.due_day_of_month ASC
    `).all(userId) as unknown as ObligationRecord[];
    return rows;
  }

  static listDueBeforeDate(userId: string, targetDate: string): ObligationRecord[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT o.*, a.name as account_name, c.name as category_name
      FROM recurring_obligations o
      JOIN accounts a ON a.id = o.account_id
      LEFT JOIN categories c ON c.id = o.category_id
      WHERE o.user_id = ? AND o.is_active = 1 AND o.next_due_date <= ?
      ORDER BY o.next_due_date ASC
    `).all(userId, targetDate) as unknown as ObligationRecord[];
    return rows;
  }

  static create(data: {
    id: string;
    user_id: string;
    account_id: string;
    category_id?: string;
    title: string;
    amount_paise: number;
    frequency?: Frequency;
    due_day_of_month: number;
    next_due_date: string;
    auto_deduct?: boolean;
  }): ObligationRecord {
    const db = getDb();
    db.prepare(`
      INSERT INTO recurring_obligations (
        id, user_id, account_id, category_id, title,
        amount_paise, frequency, due_day_of_month, next_due_date, auto_deduct
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id,
      data.user_id,
      data.account_id,
      data.category_id || null,
      data.title,
      data.amount_paise,
      data.frequency || 'MONTHLY',
      data.due_day_of_month,
      data.next_due_date,
      data.auto_deduct ? 1 : 0
    );

    const rows = this.listAll(data.user_id);
    return rows.find((o) => o.id === data.id)!;
  }
}

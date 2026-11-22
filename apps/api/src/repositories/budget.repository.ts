import { getDb } from '../database/db.js';

export interface BudgetRecord {
  id: string;
  user_id: string;
  category_id: string;
  limit_paise: number;
  month_year: string;
  alert_threshold_percent: number;
  created_at: string;
  updated_at: string;
  // Joins
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  spent_paise?: number;
}

export class BudgetRepository {
  static listForMonth(userId: string, monthYear: string): BudgetRecord[] {
    const db = getDb();
    const start = `${monthYear}-01`;
    const end = `${monthYear}-31`;

    const rows = db.prepare(`
      SELECT 
        b.*,
        c.name as category_name,
        c.icon_name as category_icon,
        c.color_hex as category_color,
        COALESCE(SUM(t.amount_paise), 0) as spent_paise
      FROM budgets b
      JOIN categories c ON c.id = b.category_id
      LEFT JOIN transactions t ON t.category_id = b.category_id 
        AND t.user_id = b.user_id 
        AND t.type = 'EXPENSE'
        AND t.transaction_date >= ?
        AND t.transaction_date <= ?
      WHERE b.user_id = ? AND b.month_year = ?
      GROUP BY b.id
      ORDER BY b.limit_paise DESC
    `).all(start, end, userId, monthYear) as unknown as BudgetRecord[];

    return rows;
  }

  static upsert(data: {
    id: string;
    user_id: string;
    category_id: string;
    limit_paise: number;
    month_year: string;
    alert_threshold_percent?: number;
  }): BudgetRecord {
    const db = getDb();
    db.prepare(`
      INSERT INTO budgets (id, user_id, category_id, limit_paise, month_year, alert_threshold_percent, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, category_id, month_year) DO UPDATE SET
        limit_paise = excluded.limit_paise,
        alert_threshold_percent = excluded.alert_threshold_percent,
        updated_at = CURRENT_TIMESTAMP
    `).run(
      data.id,
      data.user_id,
      data.category_id,
      data.limit_paise,
      data.month_year,
      data.alert_threshold_percent || 85
    );

    const budgets = this.listForMonth(data.user_id, data.month_year);
    return budgets.find((b) => b.category_id === data.category_id)!;
  }
}

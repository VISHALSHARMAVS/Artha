import { getDb } from '../database/db.js';

export interface InvestmentRecord {
  id: string;
  user_id: string;
  name: string;
  asset_class: string;
  invested_amount_paise: number;
  current_value_paise: number;
  last_updated_date: string;
  created_at: string;
}

export class InvestmentRepository {
  static listForUser(userId: string): InvestmentRecord[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM investments
      WHERE user_id = ?
      ORDER BY current_value_paise DESC
    `).all(userId) as unknown as InvestmentRecord[];
    return rows;
  }

  static create(data: {
    id: string;
    user_id: string;
    name: string;
    asset_class: string;
    invested_amount_paise: number;
    current_value_paise: number;
    last_updated_date: string;
  }): InvestmentRecord {
    const db = getDb();
    db.prepare(`
      INSERT INTO investments (id, user_id, name, asset_class, invested_amount_paise, current_value_paise, last_updated_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id,
      data.user_id,
      data.name,
      data.asset_class,
      data.invested_amount_paise,
      data.current_value_paise,
      data.last_updated_date
    );

    const row = db.prepare('SELECT * FROM investments WHERE id = ?').get(data.id) as unknown as InvestmentRecord;
    return row;
  }

  static getPortfolioTotal(userId: string): { investedPaise: number; currentValuePaise: number } {
    const db = getDb();
    const row = db.prepare(`
      SELECT 
        COALESCE(SUM(invested_amount_paise), 0) as investedPaise,
        COALESCE(SUM(current_value_paise), 0) as currentValuePaise
      FROM investments
      WHERE user_id = ?
    `).get(userId) as unknown as { investedPaise: number; currentValuePaise: number };

    return row;
  }
}

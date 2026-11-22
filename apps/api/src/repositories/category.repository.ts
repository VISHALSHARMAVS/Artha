import { getDb } from '../database/db.js';
import type { TransactionType } from '@finora/domain';

export interface CategoryRecord {
  id: string;
  user_id: string | null;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon_name: string;
  color_hex: string;
  parent_id: string | null;
  is_system: number;
  created_at: string;
}

export class CategoryRepository {
  static listForUser(userId: string): CategoryRecord[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM categories 
      WHERE user_id = ? OR is_system = 1
      ORDER BY type DESC, name ASC
    `).all(userId) as CategoryRecord[];
    return rows;
  }

  static findById(id: string): CategoryRecord | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as CategoryRecord | undefined;
    return row || null;
  }

  static findByName(name: string, userId: string): CategoryRecord | null {
    const db = getDb();
    const row = db.prepare(`
      SELECT * FROM categories 
      WHERE (user_id = ? OR is_system = 1) AND LOWER(name) = LOWER(?)
      LIMIT 1
    `).get(userId, name) as CategoryRecord | undefined;
    return row || null;
  }

  static create(data: {
    id: string;
    user_id: string;
    name: string;
    type: 'INCOME' | 'EXPENSE';
    icon_name: string;
    color_hex: string;
  }): CategoryRecord {
    const db = getDb();
    db.prepare(`
      INSERT INTO categories (id, user_id, name, type, icon_name, color_hex, is_system)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(data.id, data.user_id, data.name, data.type, data.icon_name, data.color_hex);

    return this.findById(data.id)!;
  }
}

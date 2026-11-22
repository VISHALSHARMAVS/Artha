import { getDb } from '../database/db.js';
import type { AccountType } from '@artha/domain';

export interface AccountRecord {
  id: string;
  user_id: string;
  name: string;
  account_type: AccountType;
  institution_name: string;
  account_number_mask: string;
  balance_paise: number;
  credit_limit_paise: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export class AccountRepository {
  static findByUserId(userId: string): AccountRecord[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM accounts 
      WHERE user_id = ? AND is_active = 1
      ORDER BY 
        CASE account_type
          WHEN 'SAVINGS' THEN 1
          WHEN 'CHECKING' THEN 2
          WHEN 'CREDIT_CARD' THEN 3
          WHEN 'CASH' THEN 4
          WHEN 'INVESTMENT' THEN 5
          WHEN 'LOAN' THEN 6
          ELSE 7
        END,
        name ASC
    `).all(userId) as unknown as AccountRecord[];
    return rows;
  }

  static findById(id: string, userId: string): AccountRecord | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(id, userId) as unknown as AccountRecord | undefined;
    return row || null;
  }

  static create(data: {
    id: string;
    user_id: string;
    name: string;
    account_type: AccountType;
    institution_name?: string;
    account_number_mask?: string;
    balance_paise?: number;
    credit_limit_paise?: number;
  }): AccountRecord {
    const db = getDb();
    db.prepare(`
      INSERT INTO accounts (id, user_id, name, account_type, institution_name, account_number_mask, balance_paise, credit_limit_paise)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id,
      data.user_id,
      data.name,
      data.account_type,
      data.institution_name || '',
      data.account_number_mask || '',
      data.balance_paise || 0,
      data.credit_limit_paise || 0
    );

    return this.findById(data.id, data.user_id)!;
  }

  /**
   * Mutates balance atomically. Delta can be positive (credit) or negative (debit).
   */
  static adjustBalance(id: string, deltaPaise: number): void {
    const db = getDb();
    db.prepare(`
      UPDATE accounts 
      SET balance_paise = balance_paise + ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(deltaPaise, id);
  }

  static getLiquidBalance(userId: string): number {
    const db = getDb();
    // Liquid Balance = Sum of (SAVINGS, CHECKING, CASH) minus (CREDIT_CARD balances if negative/liability)
    const rows = db.prepare(`
      SELECT account_type, balance_paise 
      FROM accounts 
      WHERE user_id = ? AND is_active = 1
    `).all(userId) as { account_type: AccountType; balance_paise: number }[];

    let liquidTotal = 0;
    for (const acc of rows) {
      if (acc.account_type === 'SAVINGS' || acc.account_type === 'CHECKING' || acc.account_type === 'CASH') {
        liquidTotal += acc.balance_paise;
      } else if (acc.account_type === 'CREDIT_CARD') {
        // If credit card balance represents an outstanding liability (negative or positive debt)
        // In Artha standard: negative balance on credit card is outstanding debt to be paid
        if (acc.balance_paise < 0) {
          liquidTotal += acc.balance_paise; // deducts the liability
        }
      }
    }

    return liquidTotal;
  }
}

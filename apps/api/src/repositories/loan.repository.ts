import { getDb } from '../database/db.js';

export interface LoanRecord {
  id: string;
  user_id: string;
  account_id: string | null;
  loan_name: string;
  lender_name: string;
  original_principal_paise: number;
  current_outstanding_paise: number;
  annual_interest_rate: number;
  tenure_months: number;
  remaining_months: number;
  emi_amount_paise: number;
  start_date: string;
  created_at: string;
  // Joins
  account_name?: string;
}

export class LoanRepository {
  static listForUser(userId: string): LoanRecord[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT l.*, a.name as account_name
      FROM loans l
      LEFT JOIN accounts a ON a.id = l.account_id
      WHERE l.user_id = ?
      ORDER BY l.created_at DESC
    `).all(userId) as unknown as LoanRecord[];
    return rows;
  }

  static findById(id: string, userId: string): LoanRecord | null {
    const db = getDb();
    const row = db.prepare(`
      SELECT l.*, a.name as account_name
      FROM loans l
      LEFT JOIN accounts a ON a.id = l.account_id
      WHERE l.id = ? AND l.user_id = ?
    `).get(id, userId) as unknown as LoanRecord | undefined;
    return row || null;
  }

  static create(data: {
    id: string;
    user_id: string;
    account_id?: string;
    loan_name: string;
    lender_name: string;
    original_principal_paise: number;
    current_outstanding_paise?: number;
    annual_interest_rate: number;
    tenure_months: number;
    remaining_months?: number;
    emi_amount_paise: number;
    start_date: string;
  }): LoanRecord {
    const db = getDb();
    const outstanding = data.current_outstanding_paise ?? data.original_principal_paise;
    const remaining = data.remaining_months ?? data.tenure_months;

    db.prepare(`
      INSERT INTO loans (
        id, user_id, account_id, loan_name, lender_name,
        original_principal_paise, current_outstanding_paise,
        annual_interest_rate, tenure_months, remaining_months,
        emi_amount_paise, start_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id,
      data.user_id,
      data.account_id || null,
      data.loan_name,
      data.lender_name,
      data.original_principal_paise,
      outstanding,
      data.annual_interest_rate,
      data.tenure_months,
      remaining,
      data.emi_amount_paise,
      data.start_date
    );

    return this.findById(data.id, data.user_id)!;
  }
}

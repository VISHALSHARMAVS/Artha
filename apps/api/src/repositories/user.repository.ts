import { getDb } from '../database/db.js';

export interface UserRecord {
  id: string;
  email: string;
  full_name: string;
  currency_code: string;
  created_at: string;
  updated_at: string;
}

export interface SalaryProfileRecord {
  id: string;
  user_id: string;
  employer_name: string;
  net_monthly_salary_paise: number;
  pay_day_of_month: number;
  emergency_fund_target_paise: number;
  monthly_savings_target_paise: number;
  created_at: string;
  updated_at: string;
}

export class UserRepository {
  static findById(id: string): UserRecord | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRecord | undefined;
    return row || null;
  }

  static findByEmail(email: string): UserRecord | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRecord | undefined;
    return row || null;
  }

  static create(user: { id: string; email: string; full_name: string; currency_code?: string }): UserRecord {
    const db = getDb();
    const currency = user.currency_code || 'INR';
    db.prepare(`
      INSERT INTO users (id, email, full_name, currency_code)
      VALUES (?, ?, ?, ?)
    `).run(user.id, user.email, user.full_name, currency);

    return this.findById(user.id)!;
  }

  static getSalaryProfile(userId: string): SalaryProfileRecord | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM salary_profiles WHERE user_id = ?').get(userId) as SalaryProfileRecord | undefined;
    return row || null;
  }

  static upsertSalaryProfile(profile: {
    id: string;
    user_id: string;
    employer_name: string;
    net_monthly_salary_paise: number;
    pay_day_of_month: number;
    emergency_fund_target_paise?: number;
    monthly_savings_target_paise?: number;
  }): SalaryProfileRecord {
    const db = getDb();
    db.prepare(`
      INSERT INTO salary_profiles (id, user_id, employer_name, net_monthly_salary_paise, pay_day_of_month, emergency_fund_target_paise, monthly_savings_target_paise, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        employer_name = excluded.employer_name,
        net_monthly_salary_paise = excluded.net_monthly_salary_paise,
        pay_day_of_month = excluded.pay_day_of_month,
        emergency_fund_target_paise = excluded.emergency_fund_target_paise,
        monthly_savings_target_paise = excluded.monthly_savings_target_paise,
        updated_at = CURRENT_TIMESTAMP
    `).run(
      profile.id,
      profile.user_id,
      profile.employer_name,
      profile.net_monthly_salary_paise,
      profile.pay_day_of_month,
      profile.emergency_fund_target_paise || 0,
      profile.monthly_savings_target_paise || 0
    );

    return this.getSalaryProfile(profile.user_id)!;
  }
}

import { getDb } from '../database/db.js';

export interface UserRecord {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string | null;
  whatsapp_linked?: number;
  currency_code: string;
  created_at: string;
  updated_at: string;
}

export function normalizePhoneNumber(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 10) {
    return '91' + digits;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return '91' + digits.slice(1);
  }
  return digits;
}

export interface UserWithCredentials extends UserRecord {
  password_hash: string;
  password_salt: string;
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
    const row = db.prepare('SELECT id, email, full_name, phone_number, whatsapp_linked, currency_code, created_at, updated_at FROM users WHERE id = ?').get(id) as unknown as UserRecord | undefined;
    return row || null;
  }

  static findAll(): UserRecord[] {
    const db = getDb();
    return db.prepare('SELECT id, email, full_name, phone_number, whatsapp_linked, currency_code, created_at, updated_at FROM users').all() as unknown as UserRecord[];
  }

  static findByEmail(email: string): UserWithCredentials | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email) as unknown as UserWithCredentials | undefined;
    return row || null;
  }

  static findByPhoneNumber(rawPhone: string): UserRecord | null {
    const db = getDb();
    const normalized = normalizePhoneNumber(rawPhone);
    const digits = rawPhone.replace(/\D/g, '');
    const last10 = digits.length >= 10 ? digits.slice(-10) : '';

    if (!last10 && !normalized) return null;

    // Multi-format resilient phone matching: exact normalized, raw string, or matching last 10 digits
    const row = db.prepare(`
      SELECT id, email, full_name, phone_number, whatsapp_linked, currency_code, created_at, updated_at 
      FROM users 
      WHERE phone_number IS NOT NULL AND (
        phone_number = ? 
        OR phone_number = ? 
        OR (? != '' AND phone_number LIKE ?)
        OR (? != '' AND REPLACE(REPLACE(phone_number, '+', ''), ' ', '') LIKE ?)
      )
      LIMIT 1
    `).get(normalized, rawPhone, last10, `%${last10}`, last10, `%${last10}`) as unknown as UserRecord | undefined;

    return row || null;
  }

  static linkPhoneNumber(userId: string, rawPhone: string): UserRecord {
    const db = getDb();
    const normalized = normalizePhoneNumber(rawPhone);
    const digits = rawPhone.replace(/\D/g, '');
    const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
    
    // If phone number was previously associated with another user/demo account, reassign cleanly
    db.prepare(`
      UPDATE users 
      SET phone_number = NULL, whatsapp_linked = 0 
      WHERE (phone_number = ? OR phone_number LIKE ?) AND id != ?
    `).run(normalized, `%${last10}`, userId);

    db.prepare(`
      UPDATE users 
      SET phone_number = ?, whatsapp_linked = 1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(normalized, userId);

    return this.findById(userId)!;
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

  static createWithPassword(data: {
    id: string;
    email: string;
    full_name: string;
    password_hash: string;
    password_salt: string;
    currency_code?: string;
  }): UserRecord {
    const db = getDb();
    const currency = data.currency_code || 'INR';
    db.prepare(`
      INSERT INTO users (id, email, full_name, password_hash, password_salt, currency_code)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      data.id,
      data.email.toLowerCase(),
      data.full_name,
      data.password_hash,
      data.password_salt,
      currency
    );

    return this.findById(data.id)!;
  }

  static getSalaryProfile(userId: string): SalaryProfileRecord | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM salary_profiles WHERE user_id = ?').get(userId) as unknown as SalaryProfileRecord | undefined;
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

import crypto from 'node:crypto';
import { UserRepository } from '../repositories/user.repository.js';
import { AccountRepository } from '../repositories/account.repository.js';
import { ObligationRepository } from '../repositories/obligation.repository.js';
import { TransactionRepository } from '../repositories/transaction.repository.js';
import { CategoryRepository } from '../repositories/category.repository.js';
import { Security } from '../lib/security.js';
import { getDb, transaction } from '../database/db.js';
import type { OnboardingPayloadDTO } from '@artha/domain';
import type { AccountRecord } from '../repositories/account.repository.js';
import type { TransactionRecord } from '../repositories/transaction.repository.js';

export class OnboardingService {
  /**
   * Complete Journey A: User onboarding setup in a single atomic transaction.
   * Completely idempotent: editing or re-running setup updates existing profiles and
   * dedupes salary credits without duplicating transactions or accounts.
   */
  static completeOnboarding(dto: OnboardingPayloadDTO, userId: string) {
    return transaction(() => {
      const db = getDb();

      // 1. Create or update user profile
      let user = UserRepository.findById(userId);
      if (!user) {
        user = UserRepository.create({
          id: userId,
          email: dto.email,
          full_name: dto.full_name,
        });
      } else if (dto.full_name && dto.full_name.trim() !== user.full_name) {
        UserRepository.updateFullName(userId, dto.full_name.trim());
        user = UserRepository.findById(userId)!;
      }

      // 2. Primary Financial Account:
      // If an account with the same name already exists for this user, reuse and update it.
      // Otherwise, create a new financial account.
      const existingAccounts = AccountRepository.findByUserId(userId);
      const matchingAccount = existingAccounts.find(
        (a) => a.name.trim().toLowerCase() === dto.account.name.trim().toLowerCase()
      );

      let account: AccountRecord;
      let accountId: string;

      if (matchingAccount) {
        account = matchingAccount;
        accountId = account.id;
        AccountRepository.updateDetails(account.id, userId, {
          name: dto.account.name,
          account_type: dto.account.account_type,
          institution_name: dto.account.institution_name,
          balance_paise: dto.account.initial_balance_paise,
        });
        account = AccountRepository.findById(accountId, userId)!;
      } else {
        accountId = `acc_${crypto.randomUUID().slice(0, 8)}`;
        account = AccountRepository.create({
          id: accountId,
          user_id: userId,
          name: dto.account.name,
          account_type: dto.account.account_type,
          institution_name: dto.account.institution_name,
          balance_paise: dto.account.initial_balance_paise,
        });
      }

      // 3. Record or update salary profile
      const salaryProfileId = `sal_${crypto.randomUUID().slice(0, 8)}`;
      UserRepository.upsertSalaryProfile({
        id: salaryProfileId,
        user_id: userId,
        employer_name: dto.salary_profile.employer_name,
        net_monthly_salary_paise: dto.salary_profile.net_monthly_salary_paise,
        pay_day_of_month: dto.salary_profile.pay_day_of_month,
        emergency_fund_target_paise: dto.salary_profile.emergency_fund_target_paise,
        monthly_savings_target_paise: dto.salary_profile.monthly_savings_target_paise,
      });

      // 4. Record or update salary transaction (IDEMPOTENT — only 1 salary transaction per month)
      const salaryCategory = CategoryRepository.findByName('Salary & Income', userId);
      const today = new Date().toISOString().slice(0, 10);
      const currentMonthPrefix = today.slice(0, 7);

      // Find any salary transactions in the current month
      const existingSalaryTxs = db.prepare(`
        SELECT id, amount_paise FROM transactions 
        WHERE user_id = ? 
          AND type = 'INCOME' 
          AND (category_id = ? OR description LIKE 'Salary%')
          AND transaction_date LIKE ?
        ORDER BY created_at ASC
      `).all(userId, salaryCategory?.id || '', `${currentMonthPrefix}%`) as unknown as Array<{ id: string; amount_paise: number }>;

      if (existingSalaryTxs.length > 0) {
        // Keep the primary salary transaction and update its amount and description
        const primaryTx = existingSalaryTxs[0];
        db.prepare(`
          UPDATE transactions 
          SET amount_paise = ?, 
              description = ?, 
              account_id = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND user_id = ?
        `).run(
          dto.salary_profile.net_monthly_salary_paise,
          `Salary — ${dto.salary_profile.employer_name}`,
          accountId,
          primaryTx.id,
          userId
        );

        // Delete any duplicate salary transactions that were previously created by re-running setup
        if (existingSalaryTxs.length > 1) {
          for (let i = 1; i < existingSalaryTxs.length; i++) {
            db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(existingSalaryTxs[i].id, userId);
          }
        }
      } else {
        // Only create an initial salary transaction if none exists for this month
        TransactionRepository.create({
          id: `tx_sal_${crypto.randomUUID().slice(0, 8)}`,
          user_id: userId,
          account_id: accountId,
          category_id: salaryCategory?.id,
          type: 'INCOME',
          amount_paise: dto.salary_profile.net_monthly_salary_paise,
          description: `Salary — ${dto.salary_profile.employer_name}`,
          notes: 'Monthly salary credited',
          transaction_date: today,
        });
      }

      // 5. Replace recurring obligations cleanly (deactivate previous, insert current)
      db.prepare('UPDATE recurring_obligations SET is_active = 0 WHERE user_id = ?').run(userId);

      for (const obl of dto.obligations) {
        const oblId = `obl_${crypto.randomUUID().slice(0, 8)}`;
        const now = new Date();
        const nextDue = new Date(now.getFullYear(), now.getMonth(), obl.due_day_of_month);
        if (nextDue < now) {
          nextDue.setMonth(nextDue.getMonth() + 1);
        }

        ObligationRepository.create({
          id: oblId,
          user_id: userId,
          account_id: accountId,
          category_id: obl.category_id,
          title: obl.title,
          amount_paise: obl.amount_paise,
          frequency: 'MONTHLY',
          due_day_of_month: obl.due_day_of_month,
          next_due_date: nextDue.toISOString().slice(0, 10),
        });
      }

      // 6. If a password was provided during onboarding, hash and save it so user can log in later
      if (dto.password && dto.password.length >= 6) {
        const { hash, salt } = Security.hashPassword(dto.password);
        UserRepository.setPassword(userId, hash, salt, dto.full_name);
      }

      const token = Security.generateToken({
        userId: user.id,
        email: user.email,
      });

      return {
        user,
        account,
        salaryProfile: UserRepository.getSalaryProfile(userId),
        obligationsCount: dto.obligations.length,
        token,
      };
    });
  }

  /**
   * Returns current onboarding/financial setup data for prefilling the setup modal when editing.
   */
  static getCurrentSetup(userId: string) {
    const user = UserRepository.findById(userId);
    const accounts = AccountRepository.findByUserId(userId);
    const salaryProfile = UserRepository.getSalaryProfile(userId);
    const obligations = ObligationRepository.listAll(userId);

    const primaryAccount = accounts.length > 0 ? accounts[0] : null;

    return {
      user: user ? { full_name: user.full_name, email: user.email } : null,
      account: primaryAccount ? {
        id: primaryAccount.id,
        name: primaryAccount.name,
        account_type: primaryAccount.account_type,
        institution_name: primaryAccount.institution_name,
        balance_paise: primaryAccount.balance_paise,
      } : null,
      salary_profile: salaryProfile ? {
        employer_name: salaryProfile.employer_name,
        net_monthly_salary_paise: salaryProfile.net_monthly_salary_paise,
        pay_day_of_month: salaryProfile.pay_day_of_month,
        emergency_fund_target_paise: salaryProfile.emergency_fund_target_paise,
        monthly_savings_target_paise: salaryProfile.monthly_savings_target_paise,
      } : null,
      obligations: obligations.map(o => ({
        id: o.id,
        title: o.title,
        amount_paise: o.amount_paise,
        due_day_of_month: o.due_day_of_month,
      })),
    };
  }
}

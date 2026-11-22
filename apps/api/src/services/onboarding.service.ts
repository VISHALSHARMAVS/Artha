import crypto from 'node:crypto';
import { UserRepository } from '../repositories/user.repository.js';
import { AccountRepository } from '../repositories/account.repository.js';
import { ObligationRepository } from '../repositories/obligation.repository.js';
import { TransactionRepository } from '../repositories/transaction.repository.js';
import { CategoryRepository } from '../repositories/category.repository.js';
import { transaction } from '../database/db.js';
import type { OnboardingPayloadDTO } from '@artha/domain';

export class OnboardingService {
  /**
   * Complete Journey A: User onboarding setup in a single atomic transaction.
   */
  static completeOnboarding(dto: OnboardingPayloadDTO, userId: string) {
    return transaction(() => {
      // 1. Create or update user profile
      let user = UserRepository.findById(userId);
      if (!user) {
        user = UserRepository.create({
          id: userId,
          email: dto.email,
          full_name: dto.full_name,
        });
      }

      // 2. Add first financial account
      const accountId = `acc_${crypto.randomUUID().slice(0, 8)}`;
      const account = AccountRepository.create({
        id: accountId,
        user_id: userId,
        name: dto.account.name,
        account_type: dto.account.account_type,
        institution_name: dto.account.institution_name,
        balance_paise: dto.account.initial_balance_paise,
      });

      // 3. Record salary profile
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

      // Also record initial salary transaction for the current month if not yet logged
      const salaryCategory = CategoryRepository.findByName('Salary & Income', userId);
      const today = new Date().toISOString().slice(0, 10);
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

      // 4. Add monthly obligations
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

      return {
        user,
        account,
        salaryProfile: UserRepository.getSalaryProfile(userId),
        obligationsCount: dto.obligations.length,
      };
    });
  }
}

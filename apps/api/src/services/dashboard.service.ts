import { AccountRepository } from '../repositories/account.repository.js';
import { TransactionRepository } from '../repositories/transaction.repository.js';
import { ObligationRepository } from '../repositories/obligation.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { InvestmentRepository } from '../repositories/investment.repository.js';
import { LoanRepository } from '../repositories/loan.repository.js';
import { SafeToSpendCalculator, ObligationItem } from '@artha/domain';

export class DashboardService {
  /**
   * Generates the Institutional Dashboard answering the 5 Core Questions:
   * 1. How much money do I currently have?
   * 2. How much did I earn this month?
   * 3. How much did I spend this month?
   * 4. What payments are coming up?
   * 5. How much can I safely spend?
   */
  static getOverview(userId: string) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const monthYear = `${currentYear}-${currentMonth}`;
    const todayStr = now.toISOString().slice(0, 10);

    // 1. Account balances & liquid assets
    const accounts = AccountRepository.findByUserId(userId);
    const totalLiquidPaise = AccountRepository.getLiquidBalance(userId);

    const grossLiquidAssetsPaise = accounts
      .filter((a) => a.account_type === 'SAVINGS' || a.account_type === 'CHECKING' || a.account_type === 'CASH')
      .reduce((sum, a) => sum + Math.max(0, a.balance_paise), 0);

    const unpaidCreditCardDebtPaise = accounts
      .filter((a) => a.account_type === 'CREDIT_CARD' && a.balance_paise < 0)
      .reduce((sum, a) => sum + Math.abs(a.balance_paise), 0);

    // 2 & 3. How much did I earn and spend this month? (Transfers excluded)
    const { incomePaise, expensePaise } = TransactionRepository.getMonthTotals(userId, monthYear);
    const netSavingsPaise = incomePaise - expensePaise;
    const savingsRatePercent = incomePaise > 0 
      ? Math.round((netSavingsPaise / incomePaise) * 1000) / 10 
      : 0;

    // Retrieve salary profile to calculate next pay date and emergency buffer
    const salaryProfile = UserRepository.getSalaryProfile(userId);
    const isSetupComplete = Boolean(
      (salaryProfile && salaryProfile.net_monthly_salary_paise > 0) || accounts.length > 0
    );

    const payDay = salaryProfile?.pay_day_of_month || 1;
    const emergencyBufferPaise = salaryProfile?.emergency_fund_target_paise ?? (isSetupComplete ? 5000000 : 0);
    const plannedInvestmentsPaise = salaryProfile?.monthly_savings_target_paise ?? 0;

    // Calculate next salary date
    let nextSalaryYear = currentYear;
    let nextSalaryMonth = now.getMonth(); // 0-indexed
    if (now.getDate() >= payDay) {
      nextSalaryMonth += 1;
      if (nextSalaryMonth > 11) {
        nextSalaryMonth = 0;
        nextSalaryYear += 1;
      }
    }
    const nextSalaryDate = new Date(nextSalaryYear, nextSalaryMonth, payDay);
    const nextSalaryDateStr = nextSalaryDate.toISOString().slice(0, 10);

    // 4. What payments are coming up?
    const rawObligations = ObligationRepository.listDueBeforeDate(userId, nextSalaryDateStr);
    const upcomingObligations: ObligationItem[] = rawObligations.map((o) => {
      const dueDate = new Date(o.next_due_date);
      const diffDays = Math.max(0, Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      return {
        id: o.id,
        title: o.title,
        amountPaise: o.amount_paise,
        dueDate: o.next_due_date,
        daysRemaining: diffDays,
        categoryName: o.category_name,
      };
    });

    // 5. How much can I safely spend? (Obligation-aware domain algorithm with breakdown)
    const safeToSpend = SafeToSpendCalculator.calculate({
      isSetupComplete,
      grossLiquidAssetsPaise,
      unpaidCreditCardDebtPaise,
      plannedInvestmentsPaise,
      emergencyReserveBufferPaise: emergencyBufferPaise,
      upcomingObligations,
      nextSalaryDate: nextSalaryDateStr,
      currentDate: todayStr,
      monthlySalaryPaise: salaryProfile?.net_monthly_salary_paise || 0,
      liquidBalancePaise: totalLiquidPaise,
    });

    // Recent transactions for immediate verification
    const { transactions: recentTransactions } = TransactionRepository.list({
      userId,
      limit: 6,
    });

    // Net worth metrics
    const totalAssetsPaise = accounts
      .filter((a) => a.account_type !== 'CREDIT_CARD' && a.account_type !== 'LOAN')
      .reduce((sum, a) => sum + Math.max(0, a.balance_paise), 0);
    
    const investmentTotal = InvestmentRepository.getPortfolioTotal(userId);
    const loans = LoanRepository.listForUser(userId);
    const totalLoanDebtPaise = loans.reduce((sum, l) => sum + l.current_outstanding_paise, 0);

    const creditCardDebtPaise = accounts
      .filter((a) => a.account_type === 'CREDIT_CARD' && a.balance_paise < 0)
      .reduce((sum, a) => sum + Math.abs(a.balance_paise), 0);

    const netWorthPaise = (totalAssetsPaise + investmentTotal.currentValuePaise) - (totalLoanDebtPaise + creditCardDebtPaise);

    return {
      answers: {
        total_liquid_paise: totalLiquidPaise,
        income_mtd_paise: incomePaise,
        expense_mtd_paise: expensePaise,
        net_savings_mtd_paise: netSavingsPaise,
        savings_rate_percent: savingsRatePercent,
        upcoming_obligations_count: upcomingObligations.length,
        safe_to_spend: safeToSpend,
      },
      upcoming_obligations: upcomingObligations,
      recent_transactions: recentTransactions,
      net_worth: {
        net_worth_paise: netWorthPaise,
        total_assets_paise: totalAssetsPaise + investmentTotal.currentValuePaise,
        total_liabilities_paise: totalLoanDebtPaise + creditCardDebtPaise,
        investments_paise: investmentTotal.currentValuePaise,
      },
      salary_profile: salaryProfile,
    };
  }
}

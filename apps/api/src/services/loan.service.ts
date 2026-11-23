import crypto from 'node:crypto';
import { LoanRepository, LoanRecord } from '../repositories/loan.repository.js';
import { ObligationRepository } from '../repositories/obligation.repository.js';
import { CategoryRepository } from '../repositories/category.repository.js';
import { LoanCalculator } from '@artha/domain';
import type { CreateLoanDTO } from '@artha/domain';
import { transaction } from '../database/db.js';

export class LoanService {
  static getLoans(userId: string): LoanRecord[] {
    return LoanRepository.listForUser(userId);
  }

  static getAmortizationSchedule(loanId: string, userId: string) {
    const loan = LoanRepository.findById(loanId, userId);
    if (!loan) {
      throw new Error('Loan not found');
    }

    return LoanCalculator.generateSchedule({
      principalPaise: loan.original_principal_paise,
      annualInterestRatePercent: loan.annual_interest_rate,
      tenureMonths: loan.tenure_months,
    });
  }

  static calculatePreview(principalPaise: number, rate: number, tenureMonths: number) {
    return LoanCalculator.generateSchedule({
      principalPaise,
      annualInterestRatePercent: rate,
      tenureMonths,
    });
  }

  static createLoan(dto: CreateLoanDTO, userId: string): LoanRecord {
    return transaction(() => {
      const loanId = `loan_${crypto.randomUUID().slice(0, 8)}`;
      
      // Calculate EMI deterministically
      const emiPaise = LoanCalculator.calculateEMI({
        principalPaise: dto.original_principal_paise,
        annualInterestRatePercent: dto.annual_interest_rate,
        tenureMonths: dto.tenure_months,
      });

      const loan = LoanRepository.create({
        id: loanId,
        user_id: userId,
        account_id: dto.account_id,
        loan_name: dto.loan_name,
        lender_name: dto.lender_name,
        original_principal_paise: dto.original_principal_paise,
        current_outstanding_paise: dto.current_outstanding_paise ?? dto.original_principal_paise,
        annual_interest_rate: dto.annual_interest_rate,
        tenure_months: dto.tenure_months,
        remaining_months: dto.remaining_months ?? dto.tenure_months,
        emi_amount_paise: emiPaise,
        start_date: dto.start_date,
      });

      // Automatically register recurring obligation for the EMI payment if account_id is present
      if (dto.account_id) {
        const obligationId = `obl_loan_${crypto.randomUUID().slice(0, 6)}`;
        const emiCategory = CategoryRepository.findByName('Debt & EMI', userId);
        
        // Calculate next due date
        const startDate = new Date(dto.start_date);
        const dueDay = Math.min(28, startDate.getDate() || 5);
        const today = new Date();
        const nextDueDate = new Date(today.getFullYear(), today.getMonth() + 1, dueDay).toISOString().slice(0, 10);

        ObligationRepository.create({
          id: obligationId,
          user_id: userId,
          account_id: dto.account_id,
          category_id: emiCategory?.id,
          title: `${dto.lender_name} - ${dto.loan_name} EMI`,
          amount_paise: emiPaise,
          frequency: 'MONTHLY',
          due_day_of_month: dueDay,
          next_due_date: nextDueDate,
          auto_deduct: true,
        });
      }

      return loan;
    });
  }

  /**
   * Debt Freedom Summary (Dave Ramsey):
   * Calculates total outstanding debt, total monthly EMI burden, and exact Debt Freedom Date.
   */
  static getDebtFreedomSummary(userId: string) {
    const loans = LoanRepository.listForUser(userId);
    const totalOutstandingPaise = loans.reduce((sum, l) => sum + l.current_outstanding_paise, 0);
    const totalMonthlyEmiPaise = loans.reduce((sum, l) => sum + l.emi_amount_paise, 0);

    if (loans.length === 0 || totalOutstandingPaise === 0) {
      return {
        isDebtFree: true,
        totalOutstandingPaise: 0,
        totalMonthlyEmiPaise: 0,
        longestRemainingMonths: 0,
        freedomDate: new Date().toISOString().slice(0, 10),
        formattedFreedomDate: 'Already 100% Debt Free! 🎉',
        activeLoansCount: 0,
      };
    }

    const maxRemainingMonths = Math.max(...loans.map((l) => l.remaining_months || l.tenure_months));
    const freedom = LoanCalculator.calculateDebtFreedomDate(new Date(), maxRemainingMonths);

    return {
      isDebtFree: false,
      totalOutstandingPaise,
      totalMonthlyEmiPaise,
      longestRemainingMonths: maxRemainingMonths,
      freedomDate: freedom.debtFreeDate,
      formattedFreedomDate: freedom.formatted,
      yearsRemaining: freedom.yearsRemaining,
      activeLoansCount: loans.length,
    };
  }

  /**
   * Simulates Dave Ramsey Prepayment Accelerator for a specific loan or overall loan.
   */
  static simulatePrepayment(loanId: string, extraMonthlyPrepaymentPaise: number, userId: string) {
    const loan = LoanRepository.findById(loanId, userId);
    if (!loan) {
      throw new Error('Loan not found');
    }

    return LoanCalculator.simulatePrepayment(
      {
        principalPaise: loan.current_outstanding_paise,
        annualInterestRatePercent: loan.annual_interest_rate,
        tenureMonths: loan.remaining_months || loan.tenure_months,
      },
      extraMonthlyPrepaymentPaise
    );
  }
}

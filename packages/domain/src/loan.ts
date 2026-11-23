export interface AmortizationScheduleRow {
  month: number;
  paymentPaise: number;
  principalPaise: number;
  interestPaise: number;
  remainingPrincipalPaise: number;
}

export interface LoanCalculationInput {
  principalPaise: number;
  annualInterestRatePercent: number; // e.g. 8.5 for 8.5% p.a.
  tenureMonths: number;
}

export interface LoanCalculationOutput {
  monthlyEmiPaise: number;
  totalInterestPaise: number;
  totalAmountPayablePaise: number;
  amortizationSchedule: AmortizationScheduleRow[];
}

export class LoanCalculator {
  /**
   * Computes monthly EMI in paise using standard reducing-balance formula.
   */
  static calculateEMI(input: LoanCalculationInput): number {
    const P = input.principalPaise;
    const n = input.tenureMonths;
    const annualRate = input.annualInterestRatePercent;

    if (P <= 0 || n <= 0) return 0;
    if (annualRate <= 0) {
      return Math.round(P / n);
    }

    const r = annualRate / (12 * 100);
    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    return Math.round(emi);
  }

  /**
   * Generates a complete deterministic amortization schedule.
   */
  static generateSchedule(input: LoanCalculationInput): LoanCalculationOutput {
    const emiPaise = this.calculateEMI(input);
    const schedule: AmortizationScheduleRow[] = [];

    let currentBalance = input.principalPaise;
    const monthlyRate = input.annualInterestRatePercent / (12 * 100);
    let totalInterest = 0;

    for (let month = 1; month <= input.tenureMonths; month++) {
      if (currentBalance <= 0) {
        break;
      }

      const interestPaise = Math.round(currentBalance * monthlyRate);
      let principalPaise = emiPaise - interestPaise;

      // Adjust last month if remaining principal is smaller than calculated principal
      if (month === input.tenureMonths || principalPaise > currentBalance) {
        principalPaise = currentBalance;
      }

      currentBalance = Math.max(0, currentBalance - principalPaise);
      totalInterest += interestPaise;

      schedule.push({
        month,
        paymentPaise: principalPaise + interestPaise,
        principalPaise,
        interestPaise,
        remainingPrincipalPaise: currentBalance,
      });
    }

    return {
      monthlyEmiPaise: emiPaise,
      totalInterestPaise: totalInterest,
      totalAmountPayablePaise: input.principalPaise + totalInterest,
      amortizationSchedule: schedule,
    };
  }

  /**
   * Computes the exact calendar Debt Freedom Date (Dave Ramsey - The Total Money Makeover).
   */
  static calculateDebtFreedomDate(startDate: string | Date, remainingTenureMonths: number): {
    debtFreeDate: string; // 'YYYY-MM-DD'
    monthsRemaining: number;
    yearsRemaining: number;
    formatted: string;
  } {
    const start = new Date(startDate);
    const freedomDate = new Date(start.getFullYear(), start.getMonth() + remainingTenureMonths, start.getDate());
    const debtFreeDate = freedomDate.toISOString().slice(0, 10);
    const yearsRemaining = Number((remainingTenureMonths / 12).toFixed(1));

    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short' };
    const formatted = freedomDate.toLocaleDateString('en-IN', options);

    return {
      debtFreeDate,
      monthsRemaining: remainingTenureMonths,
      yearsRemaining,
      formatted,
    };
  }

  /**
   * Simulates Dave Ramsey's Extra Prepayment Accelerator.
   * Demonstrates how adding extra monthly prepayment directly shortens tenure and saves interest.
   */
  static simulatePrepayment(
    input: LoanCalculationInput,
    extraMonthlyPrepaymentPaise: number
  ): {
    originalTenureMonths: number;
    acceleratedTenureMonths: number;
    monthsSaved: number;
    originalTotalInterestPaise: number;
    acceleratedTotalInterestPaise: number;
    interestSavedPaise: number;
    newEmiPaise: number;
  } {
    const original = this.generateSchedule(input);
    if (extraMonthlyPrepaymentPaise <= 0) {
      return {
        originalTenureMonths: input.tenureMonths,
        acceleratedTenureMonths: input.tenureMonths,
        monthsSaved: 0,
        originalTotalInterestPaise: original.totalInterestPaise,
        acceleratedTotalInterestPaise: original.totalInterestPaise,
        interestSavedPaise: 0,
        newEmiPaise: original.monthlyEmiPaise,
      };
    }

    const monthlyRate = input.annualInterestRatePercent / (12 * 100);
    let currentBalance = input.principalPaise;
    let acceleratedMonths = 0;
    let acceleratedInterest = 0;
    const totalMonthlyPayment = original.monthlyEmiPaise + extraMonthlyPrepaymentPaise;

    while (currentBalance > 0 && acceleratedMonths < input.tenureMonths * 2) {
      acceleratedMonths++;
      const interest = Math.round(currentBalance * monthlyRate);
      let principal = totalMonthlyPayment - interest;
      if (principal > currentBalance) {
        principal = currentBalance;
      }
      currentBalance = Math.max(0, currentBalance - principal);
      acceleratedInterest += interest;
      if (currentBalance === 0) break;
    }

    const monthsSaved = Math.max(0, input.tenureMonths - acceleratedMonths);
    const interestSavedPaise = Math.max(0, original.totalInterestPaise - acceleratedInterest);

    return {
      originalTenureMonths: input.tenureMonths,
      acceleratedTenureMonths: acceleratedMonths,
      monthsSaved,
      originalTotalInterestPaise: original.totalInterestPaise,
      acceleratedTotalInterestPaise: acceleratedInterest,
      interestSavedPaise,
      newEmiPaise: totalMonthlyPayment,
    };
  }
}

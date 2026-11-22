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
}

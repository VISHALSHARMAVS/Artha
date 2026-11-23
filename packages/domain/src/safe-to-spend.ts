import { Money } from './money.js';

export interface ObligationItem {
  id: string;
  title: string;
  amountPaise: number;
  dueDate: string; // ISO date 'YYYY-MM-DD'
  daysRemaining: number;
  categoryName?: string;
  isEMI?: boolean;
}

export interface SafeToSpendInput {
  /**
   * Total liquid balance across all bank accounts and cash,
   * minus uncleared credit card liability balances.
   */
  liquidBalancePaise: number;

  /**
   * List of confirmed recurring bills, EMIs, and subscriptions
   * scheduled between today and the next salary disbursement date.
   */
  upcomingObligations: ObligationItem[];

  /**
   * Baseline emergency fund or monthly savings allocation to preserve untouched.
   */
  emergencyReserveBufferPaise: number;

  /**
   * Target date of next salary disbursement ('YYYY-MM-DD').
   */
  nextSalaryDate: string;

  /**
   * Reference date for calculation ('YYYY-MM-DD'). Defaults to today.
   */
  currentDate?: string;

  /**
   * Optional user net monthly salary in paise (to compute hourly wage / life energy & burn rate).
   */
  monthlySalaryPaise?: number;
}

export interface SafeToSpendOutput {
  /**
   * Total safe-to-spend amount for the remainder of the cycle.
   */
  safeAmountPaise: number;

  /**
   * Daily expenditure pace permitted without breaching buffer or commitments.
   */
  dailySafePaise: number;

  /**
   * Total sum of committed obligations due before next salary.
   */
  upcomingObligationsTotalPaise: number;

  /**
   * Emergency reserve buffer preserved.
   */
  emergencyReserveBufferPaise: number;

  /**
   * Number of days until next salary date.
   */
  daysUntilSalary: number;

  /**
   * Safety status health tier.
   */
  status: 'HEALTHY' | 'MODERATE' | 'TIGHT' | 'DEFICIT';

  /**
   * Normalized advisory message.
   */
  advisoryMessage: string;

  /**
   * 100% Guilt-Free Capital (Ramit Sethi). Equals unencumbered safe amount.
   */
  guiltFreePaise: number;

  /**
   * Estimated months of living expenses covered by current liquid funds (Morgan Housel).
   */
  freedomRunwayMonths: number;

  /**
   * Estimated days of living expenses covered by current liquid funds.
   */
  freedomRunwayDays: number;

  /**
   * Calculated hourly wage in paise assuming 160 hours/month (Vicki Robin).
   */
  hourlyWagePaise: number;
}

export class SafeToSpendCalculator {
  /**
   * Calculates Safe to Spend metric deterministically in integer paise.
   */
  static calculate(input: SafeToSpendInput): SafeToSpendOutput {
    const liquid = Money.fromPaise(input.liquidBalancePaise);
    const buffer = Money.fromPaise(Math.max(0, input.emergencyReserveBufferPaise));

    // Sum upcoming obligations
    const totalObligationsPaise = input.upcomingObligations.reduce(
      (sum, item) => sum + item.amountPaise,
      0
    );
    const obligations = Money.fromPaise(totalObligationsPaise);

    // Calculate days until salary
    const today = input.currentDate ? new Date(input.currentDate) : new Date();
    today.setHours(0, 0, 0, 0);

    const salaryDate = new Date(input.nextSalaryDate);
    salaryDate.setHours(0, 0, 0, 0);

    const diffMs = salaryDate.getTime() - today.getTime();
    const daysUntilSalary = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    // Safe To Spend = Liquid Balance - Obligations - Emergency Reserve
    const safeMoney = liquid.subtract(obligations).subtract(buffer);
    const safeAmountPaise = Math.max(0, safeMoney.toPaise());

    // Daily safe rate
    const dailySafePaise = Math.floor(safeAmountPaise / daysUntilSalary);

    // Determine status tier
    let status: 'HEALTHY' | 'MODERATE' | 'TIGHT' | 'DEFICIT' = 'HEALTHY';
    let advisoryMessage = `You can safely spend ${Money.fromPaise(dailySafePaise).format({ includeDecimals: false })} per day for the next ${daysUntilSalary} days.`;

    if (safeMoney.isNegative()) {
      status = 'DEFICIT';
      advisoryMessage = `Projected deficit of ${safeMoney.abs().format()} before next salary. Avoid discretionary expenses.`;
    } else if (dailySafePaise < 50000) { // Less than ₹500/day
      status = 'TIGHT';
      advisoryMessage = `Budget is tight (${Money.fromPaise(dailySafePaise).format({ includeDecimals: false })}/day). Essential spending only.`;
    } else if (dailySafePaise < 200000) { // Less than ₹2,000/day
      status = 'MODERATE';
      advisoryMessage = `Moderate cushion of ${Money.fromPaise(dailySafePaise).format({ includeDecimals: false })}/day until ${input.nextSalaryDate}.`;
    }

    // 1. Guilt-Free Capital (Ramit Sethi - I Will Teach You to Be Rich)
    const guiltFreePaise = safeAmountPaise;

    // 2. Life Energy Wage (Vicki Robin - Your Money or Your Life, assuming 160 hrs/mo)
    const monthlySalaryPaise = input.monthlySalaryPaise || 0;
    const hourlyWagePaise = monthlySalaryPaise > 0 ? Math.floor(monthlySalaryPaise / 160) : 0;

    // 3. Freedom Runway (Morgan Housel - The Psychology of Money)
    // Monthly baseline burn is estimated as committed obligations or baseline living burn
    const monthlyBurnPaise = Math.max(
      totalObligationsPaise,
      monthlySalaryPaise > 0 ? Math.floor(monthlySalaryPaise * 0.6) : 2500000 // default fallback ₹25,000/mo
    );
    const freedomRunwayMonths = monthlyBurnPaise > 0 && input.liquidBalancePaise > 0
      ? Number((input.liquidBalancePaise / monthlyBurnPaise).toFixed(1))
      : 0;
    const freedomRunwayDays = Math.round(freedomRunwayMonths * 30.4);

    return {
      safeAmountPaise,
      dailySafePaise,
      upcomingObligationsTotalPaise: totalObligationsPaise,
      emergencyReserveBufferPaise: buffer.toPaise(),
      daysUntilSalary,
      status,
      advisoryMessage,
      guiltFreePaise,
      freedomRunwayMonths,
      freedomRunwayDays,
      hourlyWagePaise,
    };
  }

  /**
   * Translates an expense into finite Life Energy / hours of work (Vicki Robin - Your Money or Your Life).
   */
  static calculateLifeEnergy(amountPaise: number, hourlyWagePaise: number): {
    hours: number;
    minutes: number;
    totalHoursDecimal: number;
    formatted: string;
  } {
    if (hourlyWagePaise <= 0 || amountPaise <= 0) {
      return { hours: 0, minutes: 0, totalHoursDecimal: 0, formatted: '0m' };
    }
    const totalMinutes = Math.round((amountPaise / hourlyWagePaise) * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const totalHoursDecimal = Number((totalMinutes / 60).toFixed(1));

    let formatted = '';
    if (hours > 0 && minutes > 0) {
      formatted = `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      formatted = `${hours}h`;
    } else {
      formatted = `${minutes}m`;
    }

    return { hours, minutes, totalHoursDecimal, formatted };
  }

  /**
   * Computes the "Pay Yourself First" automatic wealth allocation (George S. Clason - Richest Man in Babylon).
   */
  static calculatePayYourselfFirst(monthlySalaryPaise: number, percentage: number = 15): number {
    if (monthlySalaryPaise <= 0 || percentage <= 0) return 0;
    return Math.round(monthlySalaryPaise * (percentage / 100));
  }
}

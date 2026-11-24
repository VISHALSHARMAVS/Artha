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
   * Whether the user has completed their financial setup (salary profile and accounts).
   * If false, Safe-to-Spend will return SETUP_REQUIRED instead of an arbitrary guess.
   */
  isSetupComplete?: boolean;

  /**
   * Total liquid assets in savings, checking, and cash accounts (gross, >= 0).
   */
  grossLiquidAssetsPaise?: number;

  /**
   * Unpaid credit card liabilities (positive integer representing debt to be paid).
   */
  unpaidCreditCardDebtPaise?: number;

  /**
   * Planned investments or SIP deductions due before the next payday.
   */
  plannedInvestmentsPaise?: number;

  /**
   * Protected emergency fund reserves to keep untouched.
   */
  emergencyReserveBufferPaise?: number;
  protectedReservesPaise?: number;

  /**
   * User-defined minimum cash buffer.
   */
  minimumCashBufferPaise?: number;

  /**
   * Total liquid balance across all bank accounts and cash (backward compatibility alias).
   */
  liquidBalancePaise?: number;

  /**
   * List of confirmed recurring bills, EMIs, and subscriptions
   * scheduled between today and the next salary disbursement date.
   */
  upcomingObligations: ObligationItem[];

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

export interface SafeToSpendBreakdown {
  grossLiquidAssetsPaise: number;
  protectedReservesPaise: number;
  upcomingObligationsTotalPaise: number;
  plannedInvestmentsPaise: number;
  unpaidCreditCardDebtPaise: number;
  minimumCashBufferPaise: number;
  availableSpendingPoolPaise: number;
}

export interface SafeToSpendOutput {
  /**
   * Whether the user has completed their financial setup.
   */
  isSetupComplete: boolean;

  /**
   * Total unencumbered spending pool for the remainder of the cycle.
   */
  availableSpendingPoolPaise: number;

  /**
   * Total safe-to-spend amount for the remainder of the cycle (alias).
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
  status: 'HEALTHY' | 'MODERATE' | 'TIGHT' | 'DEFICIT' | 'SETUP_REQUIRED';

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

  /**
   * Detailed formula breakdown explaining every component.
   */
  breakdown: SafeToSpendBreakdown;
}

export class SafeToSpendCalculator {
  /**
   * Calculates Safe to Spend metric deterministically in integer paise.
   * 
   * Formula:
   * Available Spending Pool =
   *   Liquid Assets
   *   − Protected Reserves
   *   − Upcoming Mandatory Obligations
   *   − Planned Investments
   *   − Unpaid Credit Card Obligations
   *   − Minimum Cash Buffer
   * 
   * Daily Safe-to-Spend = Available Spending Pool ÷ Remaining Days Until Next Payday
   */
  static calculate(input: SafeToSpendInput): SafeToSpendOutput {
    // 1. Check if setup is complete
    const isSetup = input.isSetupComplete !== false;

    if (!isSetup) {
      return {
        isSetupComplete: false,
        availableSpendingPoolPaise: 0,
        safeAmountPaise: 0,
        dailySafePaise: 0,
        upcomingObligationsTotalPaise: 0,
        emergencyReserveBufferPaise: 0,
        daysUntilSalary: 0,
        status: 'SETUP_REQUIRED',
        advisoryMessage: 'Complete your financial setup to calculate Safe-to-Spend.',
        guiltFreePaise: 0,
        freedomRunwayMonths: 0,
        freedomRunwayDays: 0,
        hourlyWagePaise: 0,
        breakdown: {
          grossLiquidAssetsPaise: 0,
          protectedReservesPaise: 0,
          upcomingObligationsTotalPaise: 0,
          plannedInvestmentsPaise: 0,
          unpaidCreditCardDebtPaise: 0,
          minimumCashBufferPaise: 0,
          availableSpendingPoolPaise: 0,
        },
      };
    }

    // Determine gross liquid assets
    const grossLiquid = input.grossLiquidAssetsPaise !== undefined
      ? Math.max(0, input.grossLiquidAssetsPaise)
      : Math.max(0, input.liquidBalancePaise ?? 0);

    const protectedReserves = Math.max(
      0,
      input.protectedReservesPaise ?? input.emergencyReserveBufferPaise ?? 0
    );
    const plannedInvestments = Math.max(0, input.plannedInvestmentsPaise ?? 0);
    const unpaidCreditCard = Math.max(0, input.unpaidCreditCardDebtPaise ?? 0);
    const minCashBuffer = Math.max(0, input.minimumCashBufferPaise ?? 0);

    // Sum upcoming obligations
    const totalObligationsPaise = (input.upcomingObligations || []).reduce(
      (sum, item) => sum + item.amountPaise,
      0
    );

    // Calculate days until salary
    const today = input.currentDate ? new Date(input.currentDate) : new Date();
    today.setHours(0, 0, 0, 0);

    const salaryDate = new Date(input.nextSalaryDate || today);
    salaryDate.setHours(0, 0, 0, 0);

    const diffMs = salaryDate.getTime() - today.getTime();
    const daysUntilSalary = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    // Available Spending Pool =
    // Liquid Assets − Protected Reserves − Upcoming Obligations − Planned Investments − Unpaid CC − Minimum Buffer
    const totalDeductions = protectedReserves + totalObligationsPaise + plannedInvestments + unpaidCreditCard + minCashBuffer;
    const rawPoolPaise = grossLiquid - totalDeductions;
    const availableSpendingPoolPaise = Math.max(0, rawPoolPaise);

    // Daily safe rate
    const dailySafePaise = Math.floor(availableSpendingPoolPaise / daysUntilSalary);

    // Determine status tier
    let status: 'HEALTHY' | 'MODERATE' | 'TIGHT' | 'DEFICIT' | 'SETUP_REQUIRED' = 'HEALTHY';
    let advisoryMessage = `You can safely spend ${Money.fromPaise(dailySafePaise).format({ includeDecimals: false })} per day for the next ${daysUntilSalary} days.`;

    if (rawPoolPaise < 0) {
      status = 'DEFICIT';
      const deficit = Money.fromPaise(Math.abs(rawPoolPaise)).format();
      advisoryMessage = `Projected deficit of ${deficit} before next payday. Upcoming mandatory commitments exceed liquid assets.`;
    } else if (dailySafePaise < 50000) { // Less than ₹500/day
      status = 'TIGHT';
      advisoryMessage = `Budget is tight (${Money.fromPaise(dailySafePaise).format({ includeDecimals: false })}/day). Essential spending only.`;
    } else if (dailySafePaise < 200000) { // Less than ₹2,000/day
      status = 'MODERATE';
      advisoryMessage = `Moderate cushion of ${Money.fromPaise(dailySafePaise).format({ includeDecimals: false })}/day until next salary on ${input.nextSalaryDate}.`;
    }

    // 1. Guilt-Free Capital (Ramit Sethi - I Will Teach You to Be Rich)
    const guiltFreePaise = availableSpendingPoolPaise;

    // 2. Life Energy Wage (Vicki Robin - Your Money or Your Life, assuming 160 hrs/mo)
    const monthlySalaryPaise = input.monthlySalaryPaise || 0;
    const hourlyWagePaise = monthlySalaryPaise > 0 ? Math.floor(monthlySalaryPaise / 160) : 0;

    // 3. Freedom Runway (Morgan Housel - The Psychology of Money)
    const monthlyBurnPaise = Math.max(
      totalObligationsPaise,
      monthlySalaryPaise > 0 ? Math.floor(monthlySalaryPaise * 0.6) : 2500000 // default fallback ₹25,000/mo
    );
    const freedomRunwayMonths = monthlyBurnPaise > 0 && grossLiquid > 0
      ? Number((grossLiquid / monthlyBurnPaise).toFixed(1))
      : 0;
    const freedomRunwayDays = Math.round(freedomRunwayMonths * 30.4);

    const breakdown: SafeToSpendBreakdown = {
      grossLiquidAssetsPaise: grossLiquid,
      protectedReservesPaise: protectedReserves,
      upcomingObligationsTotalPaise: totalObligationsPaise,
      plannedInvestmentsPaise: plannedInvestments,
      unpaidCreditCardDebtPaise: unpaidCreditCard,
      minimumCashBufferPaise: minCashBuffer,
      availableSpendingPoolPaise,
    };

    return {
      isSetupComplete: true,
      availableSpendingPoolPaise,
      safeAmountPaise: availableSpendingPoolPaise,
      dailySafePaise,
      upcomingObligationsTotalPaise: totalObligationsPaise,
      emergencyReserveBufferPaise: protectedReserves,
      daysUntilSalary,
      status,
      advisoryMessage,
      guiltFreePaise,
      freedomRunwayMonths,
      freedomRunwayDays,
      hourlyWagePaise,
      breakdown,
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

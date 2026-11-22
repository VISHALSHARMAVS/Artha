import { Money } from './money.js';

export interface BudgetStatusInput {
  limitPaise: number;
  spentPaise: number;
  dayOfMonth: number;
  daysInMonth: number;
}

export interface BudgetStatusOutput {
  limitPaise: number;
  spentPaise: number;
  remainingPaise: number;
  utilizationPercent: number;
  projectedSpendPaise: number;
  status: 'ON_TRACK' | 'WARNING' | 'EXCEEDED';
  statusMessage: string;
}

export class BudgetEngine {
  static evaluate(input: BudgetStatusInput): BudgetStatusOutput {
    const limit = Money.fromPaise(input.limitPaise);
    const spent = Money.fromPaise(input.spentPaise);
    const remaining = limit.subtract(spent);

    const utilizationPercent = limit.isZero()
      ? 0
      : Math.round((spent.toPaise() / limit.toPaise()) * 1000) / 10; // 1 decimal place

    // Projection based on elapsed days
    const elapsedDays = Math.max(1, input.dayOfMonth);
    const dailyPace = spent.toPaise() / elapsedDays;
    const projectedSpendPaise = Math.round(dailyPace * input.daysInMonth);

    let status: 'ON_TRACK' | 'WARNING' | 'EXCEEDED' = 'ON_TRACK';
    let statusMessage = `${Money.fromPaise(Math.max(0, remaining.toPaise())).format({ includeDecimals: false })} left for the month.`;

    if (spent.greaterThan(limit)) {
      status = 'EXCEEDED';
      statusMessage = `Over budget by ${remaining.abs().format({ includeDecimals: false })}.`;
    } else if (utilizationPercent >= 85 || projectedSpendPaise > limit.toPaise()) {
      status = 'WARNING';
      statusMessage = `At ${utilizationPercent}% of budget. Run-rate projected to exceed cap.`;
    }

    return {
      limitPaise: limit.toPaise(),
      spentPaise: spent.toPaise(),
      remainingPaise: remaining.toPaise(),
      utilizationPercent,
      projectedSpendPaise,
      status,
      statusMessage,
    };
  }
}

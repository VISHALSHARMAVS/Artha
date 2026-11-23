import { test, describe } from 'node:test';
import assert from 'node:assert';
import { SafeToSpendCalculator } from '../src/safe-to-spend.ts';
import { LoanCalculator } from '../src/loan.ts';
import { BudgetEngine } from '../src/budget.ts';

describe('Financial Logic Domain Tests', () => {
  describe('SafeToSpendCalculator', () => {
    test('calculates safe to spend and daily velocity correctly', () => {
      const result = SafeToSpendCalculator.calculate({
        liquidBalancePaise: 10000000, // ₹1,00,000
        upcomingObligations: [
          { id: '1', title: 'Rent', amountPaise: 3000000, dueDate: '2026-11-28', daysRemaining: 6 }, // ₹30,000
          { id: '2', title: 'Car EMI', amountPaise: 2000000, dueDate: '2026-11-29', daysRemaining: 7 }, // ₹20,000
        ],
        emergencyReserveBufferPaise: 2000000, // ₹20,000 reserve
        nextSalaryDate: '2026-11-30',
        currentDate: '2026-11-22', // 8 days remaining
      });

      // Liquid (100k) - Obligations (50k) - Buffer (20k) = Safe (30k) = 3000000 paise
      assert.strictEqual(result.safeAmountPaise, 3000000);
      assert.strictEqual(result.upcomingObligationsTotalPaise, 5000000);
      assert.strictEqual(result.daysUntilSalary, 8);
      // Daily pace: 3,000,000 / 8 = 375,000 paise = ₹3,750 / day
      assert.strictEqual(result.dailySafePaise, 375000);
      assert.strictEqual(result.status, 'HEALTHY');
    });

    test('flags deficit when obligations exceed liquid capital', () => {
      const result = SafeToSpendCalculator.calculate({
        liquidBalancePaise: 4000000, // ₹40,000
        upcomingObligations: [
          { id: '1', title: 'Rent', amountPaise: 5000000, dueDate: '2026-11-28', daysRemaining: 6 },
        ],
        emergencyReserveBufferPaise: 1000000,
        nextSalaryDate: '2026-11-30',
        currentDate: '2026-11-22',
      });

      assert.strictEqual(result.safeAmountPaise, 0);
      assert.strictEqual(result.status, 'DEFICIT');
    });

    test('calculates guilt-free capital, freedom runway and life energy', () => {
      const result = SafeToSpendCalculator.calculate({
        liquidBalancePaise: 15000000, // ₹1,50,000 liquid
        upcomingObligations: [
          { id: '1', title: 'Rent', amountPaise: 3000000, dueDate: '2026-11-28', daysRemaining: 6 }, // ₹30,000
        ],
        emergencyReserveBufferPaise: 2000000, // ₹20,000 buffer
        nextSalaryDate: '2026-11-30',
        currentDate: '2026-11-22',
        monthlySalaryPaise: 10000000, // ₹1,00,000 monthly salary
      });

      // Guilt-Free Capital equals unencumbered safe amount (₹1,00,000)
      assert.strictEqual(result.guiltFreePaise, 10000000);
      // Hourly wage = 100,000 / 160 hrs = ₹625/hr (62500 paise)
      assert.strictEqual(result.hourlyWagePaise, 62500);
      // Freedom runway > 0
      assert.ok(result.freedomRunwayMonths > 0);

      // Life Energy calculation: ₹1,250 coffee / dining bill
      const energy = SafeToSpendCalculator.calculateLifeEnergy(125000, result.hourlyWagePaise);
      assert.strictEqual(energy.hours, 2);
      assert.strictEqual(energy.formatted, '2h');

      // Pay yourself first: 15% of ₹1,00,000 = ₹15,000
      const wealthAlloc = SafeToSpendCalculator.calculatePayYourselfFirst(10000000, 15);
      assert.strictEqual(wealthAlloc, 1500000);
    });
  });

  describe('LoanCalculator', () => {
    test('computes standard reducing balance EMI correctly', () => {
      // Principal: ₹10,00,000 (100,000,000 paise)
      // Rate: 9% p.a.
      // Tenure: 60 months (5 years)
      const emiPaise = LoanCalculator.calculateEMI({
        principalPaise: 100000000,
        annualInterestRatePercent: 9.0,
        tenureMonths: 60,
      });

      // Standard EMI formula gives ~₹20,758 = 2075836 paise
      const emiRupees = emiPaise / 100;
      assert.ok(emiRupees >= 20750 && emiRupees <= 20760, `EMI ${emiRupees} within tolerance`);
    });

    test('generates full amortization schedule with zero final principal', () => {
      const scheduleResult = LoanCalculator.generateSchedule({
        principalPaise: 10000000, // ₹1,00,000
        annualInterestRatePercent: 12.0,
        tenureMonths: 12,
      });

      assert.strictEqual(scheduleResult.amortizationSchedule.length, 12);
      const lastMonth = scheduleResult.amortizationSchedule[11];
      assert.strictEqual(lastMonth.remainingPrincipalPaise, 0);
      assert.ok(scheduleResult.totalInterestPaise > 0);
      assert.strictEqual(
        scheduleResult.totalAmountPayablePaise,
        10000000 + scheduleResult.totalInterestPaise
      );
    });

    test('calculates debt freedom date and simulates prepayment accelerator', () => {
      // 36 months loan starting from 2026-01-01
      const freedom = LoanCalculator.calculateDebtFreedomDate('2026-01-01', 36);
      assert.strictEqual(freedom.monthsRemaining, 36);
      assert.strictEqual(freedom.yearsRemaining, 3.0);
      assert.ok(freedom.formatted.includes('2029'));

      // Prepayment simulation: Extra ₹2,000/mo on a ₹5,00,000 loan
      const simulation = LoanCalculator.simulatePrepayment(
        {
          principalPaise: 50000000,
          annualInterestRatePercent: 10.5,
          tenureMonths: 60,
        },
        200000 // ₹2,000 extra monthly prepayment
      );

      assert.ok(simulation.monthsSaved > 0, 'Prepayment reduces tenure');
      assert.ok(simulation.interestSavedPaise > 0, 'Prepayment saves substantial interest');
    });
  });

  describe('BudgetEngine', () => {
    test('evaluates on-track budget', () => {
      const status = BudgetEngine.evaluate({
        limitPaise: 2000000, // ₹20,000
        spentPaise: 500000,  // ₹5,000
        dayOfMonth: 10,
        daysInMonth: 30,
      });

      assert.strictEqual(status.remainingPaise, 1500000);
      assert.strictEqual(status.utilizationPercent, 25.0);
      assert.strictEqual(status.status, 'ON_TRACK');
    });

    test('flags warning when approaching limit or high burn rate', () => {
      const status = BudgetEngine.evaluate({
        limitPaise: 1000000, // ₹10,000
        spentPaise: 900000,  // ₹9,000 (90%)
        dayOfMonth: 15,
        daysInMonth: 30,
      });

      assert.strictEqual(status.status, 'WARNING');
      assert.strictEqual(status.utilizationPercent, 90.0);
    });

    test('flags exceeded budget', () => {
      const status = BudgetEngine.evaluate({
        limitPaise: 1000000, // ₹10,000
        spentPaise: 1200000, // ₹12,000 (120%)
        dayOfMonth: 20,
        daysInMonth: 30,
      });

      assert.strictEqual(status.status, 'EXCEEDED');
      assert.strictEqual(status.remainingPaise, -200000);
    });
  });
});

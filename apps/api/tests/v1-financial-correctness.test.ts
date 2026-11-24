import { test, describe } from 'node:test';
import assert from 'node:assert';
import { Money, SafeToSpendCalculator } from '@artha/domain';
import { ReportService } from '../src/services/report.service.js';
import { SplitService } from '../src/services/split.service.js';
import { WhatsAppParserService } from '../src/services/whatsapp-parser.service.js';
import { UserRepository } from '../src/repositories/user.repository.js';
import { DEFAULT_USER_ID } from '../src/middleware/auth.js';

describe('Artha V1 — Financial Correctness & Production Readiness Test Suite', () => {
  // Test Suite 1: Money and Currency Verbalization
  describe('Money & Indian Currency Verbalization', () => {
    test('Converts numeric paise into accurate Indian English verbalization', () => {
      assert.strictEqual(Money.fromRupees(500).toWords(), 'Five Hundred Rupees');
      assert.strictEqual(Money.fromRupees(60000).toWords(), 'Sixty Thousand Rupees');
      assert.strictEqual(Money.fromRupees(600000).toWords(), 'Six Lakhs Rupees');
      assert.strictEqual(Money.fromRupees(15000000).toWords(), 'One Crore Fifty Lakhs Rupees');
      assert.strictEqual(Money.fromRupees(0).toWords(), 'Zero Rupees');
    });

    test('Prevents floating point arithmetic errors with integer paise', () => {
      const m1 = Money.fromRupees(0.1);
      const m2 = Money.fromRupees(0.2);
      const sum = m1.add(m2);
      assert.strictEqual(sum.toRupees(), 0.3);
      assert.strictEqual(sum.toPaise(), 30);
    });
  });

  // Test Suite 2: Obligation-Aware Safe-to-Spend Engine
  describe('Safe-to-Spend Obligation-Aware Calculation', () => {
    test('Calculates available spending pool by subtracting all mandatory liabilities & buffers', () => {
      const result = SafeToSpendCalculator.calculate({
        isSetupComplete: true,
        grossLiquidAssetsPaise: 25000000, // ₹2,50,000 in bank
        protectedReservesPaise: 5000000,  // ₹50,000 emergency reserve
        emergencyReserveBufferPaise: 5000000,
        upcomingObligations: [
          { id: 'obl1', title: 'Rent', amountPaise: 3000000, dueDate: '2026-12-01', daysRemaining: 6 }, // ₹30,000
          { id: 'obl2', title: 'Car EMI', amountPaise: 2000000, dueDate: '2026-12-05', daysRemaining: 10 }, // ₹20,000
        ],
        plannedInvestmentsPaise: 1500000, // ₹15,000 SIP
        unpaidCreditCardDebtPaise: 1000000, // ₹10,000 CC
        minimumCashBufferPaise: 500000, // ₹5,000
        nextSalaryDate: '2026-12-01',
        currentDate: '2026-11-25', // 6 days until salary
      });

      // Expected deductions: 50k (reserve) + 50k (rent+car) + 15k (SIP) + 10k (CC) + 5k (buffer) = 1,30,000
      // Pool = 2,50,000 - 1,30,000 = ₹1,20,000 = 12000000 paise
      assert.strictEqual(result.availableSpendingPoolPaise, 12000000);
      assert.strictEqual(result.daysUntilSalary, 6);
      assert.strictEqual(result.dailySafePaise, 2000000); // ₹20,000 / day
      assert.strictEqual(result.status, 'HEALTHY');
      assert.strictEqual(result.breakdown.grossLiquidAssetsPaise, 25000000);
      assert.strictEqual(result.breakdown.upcomingObligationsTotalPaise, 5000000);
      assert.strictEqual(result.breakdown.plannedInvestmentsPaise, 1500000);
      assert.strictEqual(result.breakdown.unpaidCreditCardDebtPaise, 1000000);
    });

    test('Identifies deficit when obligations and buffers exceed liquid assets', () => {
      const result = SafeToSpendCalculator.calculate({
        isSetupComplete: true,
        grossLiquidAssetsPaise: 5000000, // ₹50,000 liquid
        protectedReservesPaise: 3000000, // ₹30,000 reserve
        upcomingObligations: [
          { id: 'obl1', title: 'Apartment Rent', amountPaise: 3500000, dueDate: '2026-12-01', daysRemaining: 6 }, // ₹35,000
        ],
        nextSalaryDate: '2026-12-01',
        currentDate: '2026-11-25',
      });

      // 50k - (30k + 35k) = -15k deficit
      assert.strictEqual(result.availableSpendingPoolPaise, 0);
      assert.strictEqual(result.dailySafePaise, 0);
      assert.strictEqual(result.status, 'DEFICIT');
      assert.ok(result.advisoryMessage.includes('deficit'));
    });

    test('Returns SETUP_REQUIRED when user has not completed financial setup', () => {
      const result = SafeToSpendCalculator.calculate({
        isSetupComplete: false,
        upcomingObligations: [],
        nextSalaryDate: '2026-12-01',
      });

      assert.strictEqual(result.isSetupComplete, false);
      assert.strictEqual(result.status, 'SETUP_REQUIRED');
      assert.strictEqual(result.availableSpendingPoolPaise, 0);
      assert.strictEqual(result.dailySafePaise, 0);
      assert.strictEqual(result.advisoryMessage, 'Complete your financial setup to calculate Safe-to-Spend.');
    });
  });

  // Test Suite 3: Data Export Workflows
  describe('Financial Ledger & Splits Data Export', () => {
    test('Exports complete transaction audit trail as valid CSV', () => {
      const csv = ReportService.exportTransactionsCsv(DEFAULT_USER_ID);
      assert.ok(typeof csv === 'string');
      assert.ok(csv.startsWith('Date,Type'));
      assert.ok(csv.includes('Amount (INR)'));
      assert.ok(csv.includes('Is Split'));
    });

    test('Exports complete transaction audit trail as valid JSON array', () => {
      const data = ReportService.exportTransactionsJson(DEFAULT_USER_ID);
      assert.ok(Array.isArray(data));
      assert.ok(data.length > 0);
      assert.ok('amount_paise' in data[0]);
      assert.ok('description' in data[0]);
    });

    test('Exports reimbursements ledger as valid CSV', () => {
      const csv = SplitService.exportSplitsCsv(DEFAULT_USER_ID);
      assert.ok(typeof csv === 'string');
      assert.ok(csv.includes('Friend Name'));
      assert.ok(csv.includes('Owed Amount (INR)'));
      assert.ok(csv.includes('Settled Status'));
    });
  });

  // Test Suite 4: WhatsApp Ambiguous Message Handling
  describe('WhatsApp Conversational Input Hardening', () => {
    test('Ambiguous bare amount "500" triggers clarification prompt instead of silent logging', () => {
      const user = UserRepository.findById(DEFAULT_USER_ID)!;
      const res = WhatsAppParserService.parseAndRecordTransaction(user, '500');

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.action, 'PARSE_ERROR');
      assert.ok(res.replyMessage.includes('What did you spend'));
    });

    test('Ambiguous "Rs 1200" triggers clarification prompt', () => {
      const user = UserRepository.findById(DEFAULT_USER_ID)!;
      const res = WhatsAppParserService.parseAndRecordTransaction(user, 'Rs 1200');

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.action, 'PARSE_ERROR');
      assert.ok(res.replyMessage.includes('What did you spend'));
    });

    test('Clear contextual input "Petrol 500" logs transaction successfully', () => {
      const user = UserRepository.findById(DEFAULT_USER_ID)!;
      const res = WhatsAppParserService.parseAndRecordTransaction(user, 'Petrol 500');

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.action, 'TRANSACTION_RECORDED');
      assert.strictEqual(res.transaction?.amountPaise, 50000);
      assert.strictEqual(res.transaction?.description, 'Petrol');
    });
  });
});

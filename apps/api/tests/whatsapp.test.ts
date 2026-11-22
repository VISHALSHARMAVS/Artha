import { test, describe } from 'node:test';
import assert from 'node:assert';
import { WhatsAppParserService } from '../src/services/whatsapp-parser.service.js';
import { AuthService } from '../src/services/auth.service.js';
import { AccountService } from '../src/services/account.service.js';
import { DashboardService } from '../src/services/dashboard.service.js';

describe('WhatsApp Conversational Expense Engine Tests', () => {
  const uniqueSuffix = String(Date.now()).slice(-8);
  const userPhone = `9198${uniqueSuffix}`;
  const otherPhone = `9199${uniqueSuffix}`;

  test('Natural Language Amount Extraction', () => {
    // 1. Simple number
    const r1 = WhatsAppParserService.extractAmount('Spent 450 at Starbucks');
    assert.strictEqual(r1?.amountPaise, 45000);

    // 2. Large number
    const r2 = WhatsAppParserService.extractAmount('Petrol 2000');
    assert.strictEqual(r2?.amountPaise, 200000);

    // 3. Multiplier abbreviation (1.5k)
    const r3 = WhatsAppParserService.extractAmount('Paid 1.5k for groceries');
    assert.strictEqual(r3?.amountPaise, 150000);

    // 4. Currency symbol & decimals (₹ 1,250.50)
    const r4 = WhatsAppParserService.extractAmount('₹ 1,250.50 at fine dining');
    assert.strictEqual(r4?.amountPaise, 125050);

    // 5. Rs. prefix
    const r5 = WhatsAppParserService.extractAmount('Dinner Rs. 350');
    assert.strictEqual(r5?.amountPaise, 35000);
  });

  test('Transaction Type Detection', () => {
    assert.strictEqual(WhatsAppParserService.detectTransactionType('Spent 450 at Starbucks'), 'EXPENSE');
    assert.strictEqual(WhatsAppParserService.detectTransactionType('Salary 85000 credited from Google'), 'INCOME');
    assert.strictEqual(WhatsAppParserService.detectTransactionType('Received 15000 freelance payment'), 'INCOME');
    assert.strictEqual(WhatsAppParserService.detectTransactionType('Transferred 10000 to ICICI Bank'), 'TRANSFER');
  });

  test('Description Extraction & Sanitization', () => {
    const d1 = WhatsAppParserService.extractDescription('Spent 450 at Starbucks', '450', 'EXPENSE');
    assert.strictEqual(d1, 'Starbucks');

    const d2 = WhatsAppParserService.extractDescription('Petrol 2000', '2000', 'EXPENSE');
    assert.strictEqual(d2, 'Petrol');

    const d3 = WhatsAppParserService.extractDescription('Swiggy 540', '540', 'EXPENSE');
    assert.strictEqual(d3, 'Swiggy');
  });

  test('Unlinked phone number receives onboarding instructions', () => {
    const unlinkedPhone = '919999999999';
    const res = WhatsAppParserService.processIncomingMessage(unlinkedPhone, 'Spent 450 at Starbucks');

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.action, 'UNLINKED_USER');
    assert.ok(res.replyMessage.includes('Welcome to Artha'));
    assert.ok(res.replyMessage.includes('not yet linked'));
  });

  test('Linked user messages "Spent 450 at Starbucks" -> logs transaction & updates ledger', () => {
    // 1. Create a user and link phone
    const regRes = AuthService.register({
      email: `whatsapp_user_${Date.now()}@test.com`,
      password: 'StrongPassword@123',
      full_name: 'Aryan Sharma',
    });
    const user = regRes.user;
    AuthService.linkWhatsApp(user.id, userPhone);

    // Get baseline overview
    const baseline = DashboardService.getOverview(user.id);
    const baselineExpense = baseline.answers.expense_mtd_paise;

    // 2. Process incoming WhatsApp message
    const waResult = WhatsAppParserService.processIncomingMessage(userPhone, 'Spent 450 at Starbucks');

    assert.strictEqual(waResult.success, true);
    assert.strictEqual(waResult.action, 'TRANSACTION_RECORDED');
    assert.strictEqual(waResult.transaction?.amountPaise, 45000);
    assert.strictEqual(waResult.transaction?.type, 'EXPENSE');
    assert.strictEqual(waResult.transaction?.description, 'Starbucks');
    assert.ok(waResult.replyMessage.includes('₹450.00'));
    assert.ok(waResult.replyMessage.includes('Safe to Spend'));

    // 3. Verify user ledger is updated immediately
    const updated = DashboardService.getOverview(user.id);
    assert.strictEqual(
      updated.answers.expense_mtd_paise,
      baselineExpense + 45000,
      'User expense MTD must increase by exactly 45000 paise (₹450)'
    );
  });

  test('Balance and Safe-to-Spend conversational query', () => {
    const res = WhatsAppParserService.processIncomingMessage(userPhone, 'Balance');

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.action, 'BALANCE_CHECK');
    assert.ok(res.replyMessage.includes('Artha Financial Health Snapshot'));
    assert.ok(res.replyMessage.includes('Safe to Spend'));
  });

  test('Strict User Isolation: Aryan WhatsApp message never alters Neha ledger', () => {
    // Register Neha with different phone
    const regNeha = AuthService.register({
      email: `neha_${Date.now()}@test.com`,
      password: 'StrongPassword@123',
      full_name: 'Neha Gupta',
    });
    AuthService.linkWhatsApp(regNeha.user.id, otherPhone);

    const nehaBefore = DashboardService.getOverview(regNeha.user.id);

    // Aryan spends ₹2,000 on Petrol via WhatsApp
    const aryanRes = WhatsAppParserService.processIncomingMessage(userPhone, 'Petrol 2000');
    assert.strictEqual(aryanRes.success, true);

    // Neha's expense must remain unchanged
    const nehaAfter = DashboardService.getOverview(regNeha.user.id);
    assert.strictEqual(
      nehaAfter.answers.expense_mtd_paise,
      nehaBefore.answers.expense_mtd_paise,
      "Neha's expenses must be 100% isolated from Aryan's WhatsApp actions"
    );
  });
});

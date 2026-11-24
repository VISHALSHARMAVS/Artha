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
    assert.ok(res.replyMessage.includes('Link Vishal'));
  });

  test('Messaging "Link Vishal" links or auto-provisions account and enables immediate expense tracking', () => {
    const testPhone = `9188${String(Date.now()).slice(-8)}`;

    // 1. Send "Link Vishal" from unlinked phone
    const linkRes = WhatsAppParserService.processIncomingMessage(testPhone, 'Link Vishal');
    assert.strictEqual(linkRes.success, true);
    assert.strictEqual(linkRes.action, 'HELP');
    assert.ok(linkRes.replyMessage.includes('Successfully Linked'));
    assert.ok(linkRes.replyMessage.includes('Vishal'));

    // 2. Immediately send expense from this newly linked phone
    const expRes = WhatsAppParserService.processIncomingMessage(testPhone, 'Spent 350 on lunch');
    assert.strictEqual(expRes.success, true);
    assert.strictEqual(expRes.action, 'TRANSACTION_RECORDED');
    assert.strictEqual(expRes.transaction?.amountPaise, 35000);

    // 3. Re-link to another account: "Link Vishal Sharma"
    const relinkRes = WhatsAppParserService.processIncomingMessage(testPhone, 'Link Vishal Sharma');
    assert.strictEqual(relinkRes.success, true);
    assert.strictEqual(relinkRes.action, 'HELP');
    assert.ok(relinkRes.replyMessage.includes('Vishal Sharma'));

    // 4. Send "LINK" when already connected
    const statusRes = WhatsAppParserService.processIncomingMessage(testPhone, 'LINK');
    assert.strictEqual(statusRes.success, true);
    assert.ok(statusRes.replyMessage.includes('Already Connected'));
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

    // Also test "500 for tea" correctly classifies as Food & Dining
    const teaResult = WhatsAppParserService.processIncomingMessage(userPhone, '500 for tea');
    assert.strictEqual(teaResult.success, true);
    assert.strictEqual(teaResult.transaction?.amountPaise, 50000);
    assert.strictEqual(teaResult.transaction?.description, 'Tea');
    assert.strictEqual(teaResult.transaction?.categoryName, 'Food & Dining');
    assert.ok(teaResult.replyMessage.includes('Category:* Food & Dining'));
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

  test('Batch multi-line message logs all entries and updates ledger atomically', () => {
    const multiLineMessage = `Spent 450 at Starbucks\nPetrol 2000\nPaid 1.5 k for groceries`;
    const batchRes = WhatsAppParserService.processIncomingMessage(userPhone, multiLineMessage);

    assert.strictEqual(batchRes.success, true);
    assert.strictEqual(batchRes.action, 'BATCH_TRANSACTIONS_RECORDED');
    assert.strictEqual(batchRes.transactions?.length, 3);
    assert.strictEqual(batchRes.transactions?.[0].amountPaise, 45000);
    assert.strictEqual(batchRes.transactions?.[1].amountPaise, 200000);
    assert.strictEqual(batchRes.transactions?.[2].amountPaise, 150000);
    assert.ok(batchRes.replyMessage.includes('3 Transactions Logged'));
    assert.ok(batchRes.replyMessage.includes('Total Logged'));
    assert.ok(batchRes.replyMessage.includes('3,950.00'));
  });

  test('User sends "undo" or "delete" -> removes latest transaction and restores balance', () => {
    // 1. Send single transaction
    const addRes = WhatsAppParserService.processIncomingMessage(userPhone, 'Bought shirt 1200');
    assert.strictEqual(addRes.success, true);
    assert.strictEqual(addRes.action, 'TRANSACTION_RECORDED');
    assert.strictEqual(addRes.transaction?.amountPaise, 120000);
    assert.strictEqual(addRes.transaction?.categoryName, 'Shopping');

    // 2. Send "undo"
    const undoRes = WhatsAppParserService.processIncomingMessage(userPhone, 'undo');
    assert.strictEqual(undoRes.success, true);
    assert.strictEqual(undoRes.action, 'TRANSACTION_UNDONE');
    assert.ok(undoRes.replyMessage.includes('Transaction Undone & Removed!'));
    assert.ok(undoRes.replyMessage.includes('1,200.00'));
  });

  test('Conversational Split Payment: "Paid 3000 for dinner split with Rahul and Aman", "Who owes me", and "Rahul paid back 1000"', () => {
    // 1. Record split
    const splitRes = WhatsAppParserService.processIncomingMessage(userPhone, 'Paid 3000 for dinner split with Rahul and Aman');
    assert.strictEqual(splitRes.success, true);
    assert.strictEqual(splitRes.action, 'SPLIT_RECORDED');
    assert.ok(splitRes.replyMessage.includes('Split Expense Logged'));
    assert.ok(splitRes.replyMessage.includes('Your Real Share'));
    assert.ok(splitRes.replyMessage.includes('Rahul: ₹1,000.00'));
    assert.ok(splitRes.replyMessage.includes('Aman: ₹1,000.00'));

    // 2. Query who owes me
    const summaryRes = WhatsAppParserService.processIncomingMessage(userPhone, 'Who owes me');
    assert.strictEqual(summaryRes.success, true);
    assert.strictEqual(summaryRes.action, 'SPLIT_SUMMARY');
    assert.ok(summaryRes.replyMessage.includes('Rahul'));
    assert.ok(summaryRes.replyMessage.includes('Aman'));
    assert.ok(summaryRes.replyMessage.includes('2,000.00'));

    // 3. Friend pays back
    const settleRes = WhatsAppParserService.processIncomingMessage(userPhone, 'Rahul paid back 1000');
    assert.strictEqual(settleRes.success, true);
    assert.strictEqual(settleRes.action, 'SPLIT_SETTLED');
    assert.ok(settleRes.replyMessage.includes('Friend Settlement Recorded!'));
    assert.ok(settleRes.replyMessage.includes('Rahul'));
    assert.ok(settleRes.replyMessage.includes('Fully Settled'));
  });

  test('Differentiates personal memory phrases ("pizza with nitin") from actual splits ("taxi spit with nitin and vishal")', () => {
    // Case A: Memory description "100 for pizza with nitin" -> Normal expense, NOT split
    const memorySplitInfo = WhatsAppParserService.extractSplitInfo('100 for pizza with nitin', 10000);
    assert.strictEqual(memorySplitInfo.isSplit, false);
    assert.strictEqual(memorySplitInfo.personalSharePaise, 10000);
    assert.strictEqual(memorySplitInfo.splits.length, 0);

    const memoryRes = WhatsAppParserService.processIncomingMessage(userPhone, '100 for pizza with nitin');
    assert.strictEqual(memoryRes.success, true);
    assert.strictEqual(memoryRes.action, 'TRANSACTION_RECORDED');
    assert.ok(memoryRes.transaction?.description.toLowerCase().includes('pizza with nitin'));

    // Case B: Split with typo "spit with nitin and vishal" -> Split 3 ways
    const typoSplitInfo = WhatsAppParserService.extractSplitInfo('1200 for taxi spit with nitin and vishal', 120000);
    assert.strictEqual(typoSplitInfo.isSplit, true);
    assert.strictEqual(typoSplitInfo.personalSharePaise, 40000);
    assert.strictEqual(typoSplitInfo.splits.length, 2);
    assert.strictEqual(typoSplitInfo.splits[0].friend_name, 'Nitin');
    assert.strictEqual(typoSplitInfo.splits[0].amount_paise, 40000);
    assert.strictEqual(typoSplitInfo.splits[1].friend_name, 'Vishal');
    assert.strictEqual(typoSplitInfo.splits[1].amount_paise, 40000);

    // Case C: Split with "shared with nitin and vishal" -> Split 3 ways
    const sharedSplitInfo = WhatsAppParserService.extractSplitInfo('1200 for taxi shared with nitin and vishal', 120000);
    assert.strictEqual(sharedSplitInfo.isSplit, true);
    assert.strictEqual(sharedSplitInfo.personalSharePaise, 40000);
    assert.strictEqual(sharedSplitInfo.splits.length, 2);
  });
});

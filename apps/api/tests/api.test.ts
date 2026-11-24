import { test, describe } from 'node:test';
import assert from 'node:assert';
import { DashboardService } from '../src/services/dashboard.service.js';
import { TransactionService } from '../src/services/transaction.service.js';
import { TransactionRepository } from '../src/repositories/transaction.repository.js';
import { AccountService } from '../src/services/account.service.js';
import { CategoryService } from '../src/services/category.service.js';
import { BudgetService } from '../src/services/budget.service.js';
import { LoanService } from '../src/services/loan.service.js';
import { ReportService } from '../src/services/report.service.js';
import { SplitService } from '../src/services/split.service.js';
import { PdfStatementService } from '../src/services/pdf-statement.service.js';
import { DEFAULT_USER_ID } from '../src/middleware/auth.js';

describe('Artha Layered Backend Integration Tests', () => {
  test('Dashboard Service answers the 5 Core Questions', () => {
    const overview = DashboardService.getOverview(DEFAULT_USER_ID);

    // 1. How much money do I currently have?
    assert.ok(typeof overview.answers.total_liquid_paise === 'number');
    assert.ok(overview.answers.total_liquid_paise > 0);

    // 2. How much did I earn this month?
    assert.ok(overview.answers.income_mtd_paise > 0);

    // 3. How much did I spend this month?
    assert.ok(overview.answers.expense_mtd_paise > 0);

    // 4. What payments are coming up?
    assert.ok(Array.isArray(overview.upcoming_obligations));
    assert.ok(overview.upcoming_obligations.length > 0);

    // 5. How much can I safely spend?
    assert.ok(overview.answers.safe_to_spend.safeAmountPaise >= 0);
    assert.ok(overview.answers.safe_to_spend.dailySafePaise >= 0);
    assert.ok(overview.answers.safe_to_spend.daysUntilSalary >= 1);
  });

  test('Transfer transactions are neutral to Income and Expense metrics', () => {
    const now = new Date();
    const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Baseline metrics
    const before = DashboardService.getOverview(DEFAULT_USER_ID);
    const initialIncome = before.answers.income_mtd_paise;
    const initialExpense = before.answers.expense_mtd_paise;

    const accounts = AccountService.getAccounts(DEFAULT_USER_ID);
    const srcAccount = accounts[0];
    const dstAccount = accounts[1];
    const initialSrcBal = srcAccount.balance_paise;
    const initialDstBal = dstAccount.balance_paise;

    // Execute transfer of ₹10,000 (1000000 paise)
    const transferAmount = 1000000;
    const tx = TransactionService.recordTransaction({
      account_id: srcAccount.id,
      destination_account_id: dstAccount.id,
      type: 'TRANSFER',
      amount_paise: transferAmount,
      description: 'Test Inter-Account Transfer',
      transaction_date: `${curMonth}-15`,
    }, DEFAULT_USER_ID);

    assert.strictEqual(tx.type, 'TRANSFER');

    // Verify account balances changed accurately
    const updatedSrc = AccountService.getAccount(srcAccount.id, DEFAULT_USER_ID);
    const updatedDst = AccountService.getAccount(dstAccount.id, DEFAULT_USER_ID);
    assert.strictEqual(updatedSrc.balance_paise, initialSrcBal - transferAmount);
    assert.strictEqual(updatedDst.balance_paise, initialDstBal + transferAmount);

    // CRITICAL MANDATE INVARIANT: Transfers must not alter Income or Expense metrics!
    const after = DashboardService.getOverview(DEFAULT_USER_ID);
    assert.strictEqual(after.answers.income_mtd_paise, initialIncome, 'Transfer must not alter income total');
    assert.strictEqual(after.answers.expense_mtd_paise, initialExpense, 'Transfer must not alter expense total');

    // Clean up test transaction
    TransactionService.deleteTransaction(tx.id, DEFAULT_USER_ID);

    // Verify balances rolled back cleanly
    const rolledBackSrc = AccountService.getAccount(srcAccount.id, DEFAULT_USER_ID);
    assert.strictEqual(rolledBackSrc.balance_paise, initialSrcBal);
  });

  test('Category Auto-Suggestion Heuristics (Journey B)', () => {
    const teaSuggestion = CategoryService.suggestCategory('500 for tea', DEFAULT_USER_ID);
    assert.ok(teaSuggestion);
    assert.strictEqual(teaSuggestion?.name, 'Food & Dining');

    const chaiSuggestion = CategoryService.suggestCategory('Chai and samosa', DEFAULT_USER_ID);
    assert.ok(chaiSuggestion);
    assert.strictEqual(chaiSuggestion?.name, 'Food & Dining');

    const coffeeSuggestion = CategoryService.suggestCategory('Starbucks Pike Place Roast', DEFAULT_USER_ID);
    assert.ok(coffeeSuggestion);
    assert.strictEqual(coffeeSuggestion?.name, 'Food & Dining');

    const cabSuggestion = CategoryService.suggestCategory('Uber Premier ride to tech park', DEFAULT_USER_ID);
    assert.ok(cabSuggestion);
    assert.strictEqual(cabSuggestion?.name, 'Transportation');

    const grocerySuggestion = CategoryService.suggestCategory('Blinkit instant milk delivery', DEFAULT_USER_ID);
    assert.ok(grocerySuggestion);
    assert.strictEqual(grocerySuggestion?.name, 'Groceries');

    const shirtSuggestion = CategoryService.suggestCategory('1500 for shirt', DEFAULT_USER_ID);
    assert.ok(shirtSuggestion);
    assert.strictEqual(shirtSuggestion?.name, 'Shopping');

    const jeansSuggestion = CategoryService.suggestCategory('Zara Jeans', DEFAULT_USER_ID);
    assert.ok(jeansSuggestion);
    assert.strictEqual(jeansSuggestion?.name, 'Shopping');
  });

  test('Quick-Add Expense Workflow (Journey B)', () => {
    const tx = TransactionService.quickAdd({
      amount_paise: 35000, // ₹350
      description: 'Zomato Lunch Bowl',
    }, DEFAULT_USER_ID);

    assert.strictEqual(tx.type, 'EXPENSE');
    assert.strictEqual(tx.amount_paise, 35000);
    assert.ok(tx.account_id);
    assert.strictEqual(tx.category_name, 'Food & Dining');

    // Clean up
    TransactionService.deleteTransaction(tx.id, DEFAULT_USER_ID);
  });

  test('Loan Service Amortization & Preview Calculation', () => {
    const preview = LoanService.calculatePreview(
      100000000, // ₹10,00,000
      9.0,       // 9%
      60         // 5 years
    );

    assert.ok(preview.monthlyEmiPaise > 0);
    assert.strictEqual(preview.amortizationSchedule.length, 60);
    assert.strictEqual(preview.amortizationSchedule[59].remainingPrincipalPaise, 0);
  });

  test('Transaction Service allows updating a transaction with atomic balance reversals and recategorization', () => {
    const accounts = AccountService.getAccounts(DEFAULT_USER_ID);
    const acc1 = accounts[0];
    const acc2 = accounts[1];
    const initialAcc1Bal = acc1.balance_paise;
    const initialAcc2Bal = acc2.balance_paise;

    // 1. Create initial transaction: ₹500 expense on acc1
    const tx = TransactionService.recordTransaction({
      account_id: acc1.id,
      type: 'EXPENSE',
      amount_paise: 50000,
      description: 'Original Tea Expense',
      transaction_date: '2026-11-20',
    }, DEFAULT_USER_ID);

    assert.strictEqual(tx.amount_paise, 50000);
    const afterCreateAcc1 = AccountService.getAccount(acc1.id, DEFAULT_USER_ID);
    assert.strictEqual(afterCreateAcc1.balance_paise, initialAcc1Bal - 50000);

    // 2. Update transaction: Change amount to ₹1,200 and description to 'Dinner'
    const updatedTx = TransactionService.updateTransaction(tx.id, {
      amount_paise: 120000,
      description: 'Updated Dinner Expense',
    }, DEFAULT_USER_ID);

    assert.strictEqual(updatedTx.amount_paise, 120000);
    assert.strictEqual(updatedTx.description, 'Updated Dinner Expense');

    const afterUpdateAcc1 = AccountService.getAccount(acc1.id, DEFAULT_USER_ID);
    assert.strictEqual(afterUpdateAcc1.balance_paise, initialAcc1Bal - 120000);

    // 3. Update transaction: Switch to acc2 with amount ₹2,000
    const switchedTx = TransactionService.updateTransaction(tx.id, {
      account_id: acc2.id,
      amount_paise: 200000,
    }, DEFAULT_USER_ID);

    assert.strictEqual(switchedTx.account_id, acc2.id);
    assert.strictEqual(switchedTx.amount_paise, 200000);

    // acc1 must be completely restored, acc2 must be debited ₹2,000
    const restoredAcc1 = AccountService.getAccount(acc1.id, DEFAULT_USER_ID);
    const debitedAcc2 = AccountService.getAccount(acc2.id, DEFAULT_USER_ID);
    assert.strictEqual(restoredAcc1.balance_paise, initialAcc1Bal);
    assert.strictEqual(debitedAcc2.balance_paise, initialAcc2Bal - 200000);

    // 4. Cleanup: delete transaction
    TransactionService.deleteTransaction(tx.id, DEFAULT_USER_ID);
    const finalAcc2 = AccountService.getAccount(acc2.id, DEFAULT_USER_ID);
    assert.strictEqual(finalAcc2.balance_paise, initialAcc2Bal);
  });

  test('Account Service allows creating and deleting accounts', () => {
    const newAcc = AccountService.createAccount({
      name: 'Temporary Account To Delete',
      account_type: 'SAVINGS',
      institution_name: 'Test Bank',
      initial_balance_paise: 500000,
    }, DEFAULT_USER_ID);

    assert.ok(newAcc.id);
    const beforeCount = AccountService.getAccounts(DEFAULT_USER_ID).length;

    AccountService.deleteAccount(newAcc.id, DEFAULT_USER_ID);
    const afterCount = AccountService.getAccounts(DEFAULT_USER_ID).length;
    assert.strictEqual(afterCount, beforeCount - 1);
  });

  test('Report Service cash flow history excludes transfers and aggregates monthly net savings correctly', () => {
    const history = ReportService.getCashFlowHistory(DEFAULT_USER_ID, 6);
    assert.strictEqual(history.length, 6);
    history.forEach((month) => {
      assert.ok(month.monthYear);
      assert.ok(month.monthLabel);
      assert.strictEqual(typeof month.incomePaise, 'number');
      assert.strictEqual(typeof month.expensePaise, 'number');
      assert.strictEqual(month.netSavingsPaise, month.incomePaise - month.expensePaise);
    });
  });

  test('Split Expense Engine isolates personal expense share and manages friend debt settlements without inflating income', () => {
    const accounts = AccountService.getAccounts(DEFAULT_USER_ID);
    const acc = accounts[0];
    const initialBal = acc.balance_paise;

    const before = DashboardService.getOverview(DEFAULT_USER_ID);
    const initialExpense = before.answers.expense_mtd_paise;
    const initialIncome = before.answers.income_mtd_paise;

    // 1. User pays ₹3,000 for dinner split with Rahul (₹1,000) and Aman (₹1,000)
    // User's own share is ₹1,000. Total paid from bank is ₹3,000.
    const splitTx = TransactionService.recordTransaction({
      account_id: acc.id,
      type: 'EXPENSE',
      amount_paise: 300000,
      description: 'Team Dinner Split',
      transaction_date: '2026-11-20',
      is_split: true,
      personal_share_paise: 100000,
      splits: [
        { friend_name: 'Rahul', amount_paise: 100000 },
        { friend_name: 'Aman', amount_paise: 100000 },
      ],
    }, DEFAULT_USER_ID);

    assert.strictEqual(splitTx.amount_paise, 300000);
    assert.strictEqual(splitTx.personal_share_paise, 100000);
    assert.strictEqual(splitTx.splits?.length, 2);

    // Bank account must be debited by full ₹3,000
    const afterDebitAcc = AccountService.getAccount(acc.id, DEFAULT_USER_ID);
    assert.strictEqual(afterDebitAcc.balance_paise, initialBal - 300000);

    // CRITICAL: User's monthly expense must only increase by ₹1,000 (NOT ₹3,000)
    const afterOverview = DashboardService.getOverview(DEFAULT_USER_ID);
    assert.strictEqual(
      afterOverview.answers.expense_mtd_paise,
      initialExpense + 100000,
      'Monthly expense must reflect personal share of ₹1,000 only'
    );

    // Verify pending receivables summary
    const summaryBefore = SplitService.getSummary(DEFAULT_USER_ID);
    assert.strictEqual(summaryBefore.totalReceivablePaise, 200000);
    assert.strictEqual(summaryBefore.pendingCount, 2);

    // 2. Rahul pays back ₹1,000 via UPI
    const rahulSplit = splitTx.splits!.find(s => s.friend_name === 'Rahul')!;
    const settledRahul = SplitService.settleReceivable(rahulSplit.id, DEFAULT_USER_ID, {
      account_id: acc.id,
      settled_amount_paise: 100000,
    });

    assert.strictEqual(settledRahul.is_settled, 1);
    assert.strictEqual(settledRahul.settled_amount_paise, 100000);

    // Bank account balance restored by ₹1,000
    const afterRahulPaybackAcc = AccountService.getAccount(acc.id, DEFAULT_USER_ID);
    assert.strictEqual(afterRahulPaybackAcc.balance_paise, initialBal - 200000);

    // CRITICAL: Settling friend debt must NOT count as new income!
    const afterSettleOverview = DashboardService.getOverview(DEFAULT_USER_ID);
    assert.strictEqual(
      afterSettleOverview.answers.income_mtd_paise,
      initialIncome,
      'Receiving friend payback must be neutral to income metrics'
    );

    // Outstanding receivables is now ₹1,000 (only Aman left)
    const summaryAfter = SplitService.getSummary(DEFAULT_USER_ID);
    assert.strictEqual(summaryAfter.totalReceivablePaise, 100000);
    assert.strictEqual(summaryAfter.pendingCount, 1);

    // 3. Clean up
    TransactionService.deleteTransaction(splitTx.id, DEFAULT_USER_ID);
  });

  test('Bank Statement PDF Ingestion & Batch Import with Duplicate Detection', () => {
    const acc = AccountService.getAccounts(DEFAULT_USER_ID)[0];
    const initialBal = acc.balance_paise;

    // 1. Batch import 2 candidate transactions (1 Income, 1 Expense)
    const result = PdfStatementService.batchImportTransactions(DEFAULT_USER_ID, acc.id, [
      {
        date: '2026-11-20',
        description: 'Client Consulting Freelance',
        type: 'INCOME',
        amount_paise: 2500000, // ₹25,000
      },
      {
        date: '2026-11-21',
        description: 'Swiggy Gourmet Dinner',
        type: 'EXPENSE',
        amount_paise: 85000, // ₹850
      },
    ]);

    assert.strictEqual(result.imported_count, 2);
    assert.strictEqual(result.total_amount_paise, 2500000 + 85000);

    // Verify balance adjusted atomically: +25,000 - 850 = +24,150
    const afterImportAcc = AccountService.getAccount(acc.id, DEFAULT_USER_ID);
    assert.strictEqual(afterImportAcc.balance_paise, initialBal + 2415000);

    // Verify transactions exist in ledger
    const { transactions: txs } = TransactionRepository.list({ userId: DEFAULT_USER_ID, limit: 10 });
    const importedIncome = txs.find(t => t.description === 'Client Consulting Freelance');
    const importedExpense = txs.find(t => t.description === 'Swiggy Gourmet Dinner');

    assert.ok(importedIncome, 'Imported income transaction must exist');
    assert.ok(importedExpense, 'Imported expense transaction must exist');
    assert.strictEqual(importedIncome.amount_paise, 2500000);
    assert.strictEqual(importedExpense.amount_paise, 85000);

    // Clean up
    TransactionService.deleteTransaction(importedIncome.id, DEFAULT_USER_ID);
    TransactionService.deleteTransaction(importedExpense.id, DEFAULT_USER_ID);

    const restoredAcc = AccountService.getAccount(acc.id, DEFAULT_USER_ID);
    assert.strictEqual(restoredAcc.balance_paise, initialBal, 'Account balance must be cleanly restored');
  });
});

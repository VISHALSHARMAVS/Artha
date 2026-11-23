import { test, describe } from 'node:test';
import assert from 'node:assert';
import { DashboardService } from '../src/services/dashboard.service.js';
import { TransactionService } from '../src/services/transaction.service.js';
import { AccountService } from '../src/services/account.service.js';
import { CategoryService } from '../src/services/category.service.js';
import { BudgetService } from '../src/services/budget.service.js';
import { LoanService } from '../src/services/loan.service.js';
import { ReportService } from '../src/services/report.service.js';
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
    const coffeeSuggestion = CategoryService.suggestCategory('Starbucks Pike Place Roast', DEFAULT_USER_ID);
    assert.ok(coffeeSuggestion);
    assert.strictEqual(coffeeSuggestion?.name, 'Food & Dining');

    const cabSuggestion = CategoryService.suggestCategory('Uber Premier ride to tech park', DEFAULT_USER_ID);
    assert.ok(cabSuggestion);
    assert.strictEqual(cabSuggestion?.name, 'Transportation');

    const grocerySuggestion = CategoryService.suggestCategory('Blinkit instant milk delivery', DEFAULT_USER_ID);
    assert.ok(grocerySuggestion);
    assert.strictEqual(grocerySuggestion?.name, 'Groceries');
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
});

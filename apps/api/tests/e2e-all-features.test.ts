import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { Security } from '../src/lib/security.js';
import app from '../src/server.js';
import type { Server } from 'node:http';

let server: Server;
let BASE_URL = process.env.API_URL || '';

before(async () => {
  if (!BASE_URL) {
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          BASE_URL = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  }
});

after(async () => {
  if (server) {
    if (typeof (server as any).closeAllConnections === 'function') {
      (server as any).closeAllConnections();
    }
    server.close();
    server.unref();
    setTimeout(() => process.exit(0), 200).unref();
  }
});

// Helper for making typed HTTP requests to the running express server
async function request(
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<{ status: number; body: any }> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => null);
  return { status: res.status, body: json };
}

describe('Artha Comprehensive End-to-End Feature & Authentication Audit', () => {
  const timestamp = Date.now();
  const testUserEmail = `audit_user_${timestamp}@artha.finance`;
  const testUserPassword = 'InstitutionalSecurePass@2026';
  const testUserFullName = 'Aditya Sengupta';
  const testUserPhone = `91${String(timestamp).slice(-10)}`;

  let userToken: string;
  let userId: string;
  let primaryAccountId: string;
  let foodCategoryId: string;

  // -------------------------------------------------------------
  // FEATURE 1: USER REGISTRATION
  // -------------------------------------------------------------
  test('Feature 1: User Registration with scrypt hashing & JWT', async () => {
    const res = await request('POST', '/api/v1/auth/register', {
      email: testUserEmail,
      password: testUserPassword,
      full_name: testUserFullName,
      currency_code: 'INR',
    });

    assert.strictEqual(res.status, 201, 'Registration should return 201 Created');
    assert.ok(res.body.success, 'Response should indicate success');
    assert.ok(res.body.data.token, 'Should return signed JWT token');
    assert.strictEqual(res.body.data.user.email, testUserEmail.toLowerCase());
    assert.strictEqual(res.body.data.user.full_name, testUserFullName);

    userToken = res.body.data.token;
    userId = res.body.data.user.id;

    // Verify token validity cryptographically
    const payload = Security.verifyToken(userToken);
    assert.ok(payload);
    assert.strictEqual(payload?.userId, userId);
  });

  // -------------------------------------------------------------
  // FEATURE 2: USER LOGIN & CREDENTIAL VALIDATION
  // -------------------------------------------------------------
  test('Feature 2: User Login with valid & invalid credentials', async () => {
    // 2a. Reject wrong password
    const failRes = await request('POST', '/api/v1/auth/login', {
      email: testUserEmail,
      password: 'IncorrectPassword@999',
    });
    assert.strictEqual(failRes.status, 401, 'Wrong password must return 401');

    // 2b. Accept valid password
    const successRes = await request('POST', '/api/v1/auth/login', {
      email: testUserEmail,
      password: testUserPassword,
    });
    assert.strictEqual(successRes.status, 200, 'Valid login must return 200');
    assert.ok(successRes.body.data.token);
    assert.strictEqual(successRes.body.data.user.id, userId);
  });

  // -------------------------------------------------------------
  // FEATURE 3: AUTHENTICATED PROFILE IDENTITY (/auth/me)
  // -------------------------------------------------------------
  test('Feature 3: Verify authenticated session (/auth/me)', async () => {
    const res = await request('GET', '/api/v1/auth/me', null, userToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.id, userId);
    assert.strictEqual(res.body.data.email, testUserEmail.toLowerCase());
    assert.strictEqual(res.body.data.full_name, testUserFullName);
  });

  // -------------------------------------------------------------
  // FEATURE 4: JOURNEY A ONBOARDING SETUP (/onboarding)
  // -------------------------------------------------------------
  test('Feature 4: Journey A High-Precision Onboarding in Atomic Transaction', async () => {
    const onboardingPayload = {
      full_name: testUserFullName,
      email: testUserEmail,
      account: {
        name: 'HDFC Priority Salary A/c',
        account_type: 'SAVINGS',
        institution_name: 'HDFC Bank',
        initial_balance_paise: 15000000, // ₹1,50,000
      },
      salary_profile: {
        employer_name: 'Tech Mahindra Global',
        net_monthly_salary_paise: 12000000, // ₹1,20,000
        pay_day_of_month: 1,
        emergency_fund_target_paise: 10000000, // ₹1,00,000
        monthly_savings_target_paise: 3000000, // ₹30,000
      },
      obligations: [
        {
          title: 'Credit Card Bill',
          amount_paise: 2500000, // ₹25,000
          due_day_of_month: 28,
        },
        {
          title: 'Electricity & Wi-Fi',
          amount_paise: 350000, // ₹3,500
          due_day_of_month: 29,
        },
      ],
    };

    const res = await request('POST', '/api/v1/onboarding', onboardingPayload, userToken);
    assert.strictEqual(res.status, 201, 'Onboarding must return 201 Created');
    assert.ok(res.body.success);
    assert.ok(res.body.data.account.id);
    assert.strictEqual(res.body.data.account.balance_paise, 15000000);
    assert.strictEqual(res.body.data.obligationsCount, 2);

    primaryAccountId = res.body.data.account.id;
  });

  // -------------------------------------------------------------
  // FEATURE 5: THE 5 CORE FINANCIAL QUESTIONS (Dashboard Overview)
  // -------------------------------------------------------------
  test('Feature 5: Dashboard Overview answers the 5 Core Questions', async () => {
    const res = await request('GET', '/api/v1/dashboard/overview', null, userToken);
    assert.strictEqual(res.status, 200);
    const answers = res.body.data.answers;

    // 1. How much money do I currently have?
    assert.ok(answers.total_liquid_paise >= 15000000, 'Liquid balance matches or exceeds initial deposit');

    // 2. How much did I earn this month?
    assert.strictEqual(answers.income_mtd_paise, 12000000, 'Salary income recorded for current month');

    // 3. How much did I spend this month?
    assert.strictEqual(answers.expense_mtd_paise, 0, 'No expenses recorded yet');

    // 4. What payments are coming up?
    assert.strictEqual(answers.upcoming_obligations_count, 2, '2 monthly obligations scheduled');

    // 5. How much can I safely spend?
    assert.ok(answers.safe_to_spend.safeAmountPaise > 0, 'Safe to spend total must be positive');
    assert.ok(answers.safe_to_spend.dailySafePaise > 0, 'Safe to spend daily velocity must be positive');
    assert.strictEqual(answers.safe_to_spend.status, 'HEALTHY');
  });

  // -------------------------------------------------------------
  // FEATURE 6: JOURNEY B QUICK-ADD EXPENSE (/transactions/quick-add)
  // -------------------------------------------------------------
  test('Feature 6: Journey B Quick-Add Expense with auto-categorization', async () => {
    const quickAddRes = await request('POST', '/api/v1/transactions/quick-add', {
      amount_paise: 45000, // ₹450
      description: 'Starbucks Hazelnut Latte',
      account_id: primaryAccountId,
    }, userToken);

    assert.strictEqual(quickAddRes.status, 201);
    assert.strictEqual(quickAddRes.body.data.amount_paise, 45000);
    assert.strictEqual(quickAddRes.body.data.type, 'EXPENSE');
    assert.ok(quickAddRes.body.data.category_name, 'Should auto-suggest category');
    assert.strictEqual(quickAddRes.body.data.category_name, 'Food & Dining');

    foodCategoryId = quickAddRes.body.data.category_id;

    // Verify liquid balance decreased by ₹450 (45000 paise)
    const ovRes = await request('GET', '/api/v1/dashboard/overview', null, userToken);
    assert.strictEqual(ovRes.body.data.answers.expense_mtd_paise, 45000);
  });

  // -------------------------------------------------------------
  // FEATURE 7: TRANSACTION LISTING & FILTERING (/transactions)
  // -------------------------------------------------------------
  test('Feature 7: Transaction Listing & Filtering', async () => {
    // Add second transaction (Uber ride)
    await request('POST', '/api/v1/transactions/quick-add', {
      amount_paise: 38000, // ₹380
      description: 'Uber ride to Bangalore Airport',
      account_id: primaryAccountId,
    }, userToken);

    const listRes = await request('GET', '/api/v1/transactions?page=1&limit=10', null, userToken);
    assert.strictEqual(listRes.status, 200);
    const txs = listRes.body.data;
    assert.ok(txs.length >= 3, 'Should have initial salary + 2 expenses');
  });

  // -------------------------------------------------------------
  // FEATURE 8: CREATE ADDITIONAL ACCOUNT (/accounts)
  // -------------------------------------------------------------
  test('Feature 8: Multi-Account Management (Credit Card Creation)', async () => {
    const createCardRes = await request('POST', '/api/v1/accounts', {
      name: 'ICICI Sapphiro Credit Card',
      account_type: 'CREDIT_CARD',
      institution_name: 'ICICI Bank',
      account_number_mask: 'xx9821',
      credit_limit_paise: 30000000, // ₹3,00,000 limit
      initial_balance_paise: 0,
    }, userToken);

    assert.strictEqual(createCardRes.status, 201);
    assert.strictEqual(createCardRes.body.data.account_type, 'CREDIT_CARD');

    // List all accounts
    const accsRes = await request('GET', '/api/v1/accounts', null, userToken);
    assert.strictEqual(accsRes.status, 200);
    assert.strictEqual(accsRes.body.data.length, 3, 'User must have Default + Onboarding + Credit Card accounts');
  });

  // -------------------------------------------------------------
  // FEATURE 9: BUDGET ENGINE (/budgets)
  // -------------------------------------------------------------
  test('Feature 9: Budget Creation & Real-Time Tracking', async () => {
    const now = new Date();
    const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const setBudgetRes = await request('POST', '/api/v1/budgets', {
      category_id: foodCategoryId,
      month_year: curMonth,
      limit_paise: 1500000, // ₹15,000 budget for Dining
    }, userToken);

    assert.strictEqual(setBudgetRes.status, 200);
    assert.strictEqual(setBudgetRes.body.data.limit_paise, 1500000);

    // Fetch budget list
    const getBudgetsRes = await request('GET', `/api/v1/budgets?month_year=${curMonth}`, null, userToken);
    assert.strictEqual(getBudgetsRes.status, 200);
    const b = getBudgetsRes.body.data.find((x: any) => x.category_id === foodCategoryId);
    assert.ok(b);
    assert.strictEqual(b.spent_paise, 45000); // The ₹450 spent at Starbucks
    assert.strictEqual(b.evaluation.status, 'ON_TRACK');
  });

  // -------------------------------------------------------------
  // FEATURE 10: LOAN & EMI AMORTIZATION ENGINE (/loans)
  // -------------------------------------------------------------
  test('Feature 10: Loan Preview & Reducing Balance Schedule Creation', async () => {
    // 10a. Preview loan calculation
    const previewRes = await request('POST', '/api/v1/loans/preview', {
      principal_paise: 50000000, // ₹5,00,000 loan
      annual_interest_rate: 10.5, // 10.5%
      tenure_months: 24, // 2 years
    }, userToken);

    assert.strictEqual(previewRes.status, 200);
    assert.ok(previewRes.body.data.monthlyEmiPaise > 0);
    assert.strictEqual(previewRes.body.data.amortizationSchedule.length, 24);

    // 10b. Create active loan
    const createLoanRes = await request('POST', '/api/v1/loans', {
      loan_name: 'HDFC Car Loan',
      lender_name: 'HDFC Bank',
      original_principal_paise: 50000000,
      annual_interest_rate: 10.5,
      tenure_months: 24,
      start_date: new Date().toISOString().slice(0, 10),
      account_id: primaryAccountId,
    }, userToken);

    assert.strictEqual(createLoanRes.status, 201);
    assert.strictEqual(createLoanRes.body.data.loan_name, 'HDFC Car Loan');

    // 10c. Retrieve schedule for created loan
    const scheduleRes = await request('GET', `/api/v1/loans/${createLoanRes.body.data.id}/schedule`, null, userToken);
    assert.strictEqual(scheduleRes.status, 200);
    assert.strictEqual(scheduleRes.body.data.amortizationSchedule.length, 24);
    assert.strictEqual(
      scheduleRes.body.data.amortizationSchedule[23].remainingPrincipalPaise,
      0,
      'Final month remaining principal must be 0 paise'
    );
  });

  // -------------------------------------------------------------
  // FEATURE 11: REPORTS & ANALYTICS (/reports)
  // -------------------------------------------------------------
  test('Feature 11: Financial Reports (Cash Flow & Category Breakdown)', async () => {
    const cashFlowRes = await request('GET', '/api/v1/reports/cash-flow?months=6', null, userToken);
    assert.strictEqual(cashFlowRes.status, 200);
    assert.ok(Array.isArray(cashFlowRes.body.data));
    assert.ok(cashFlowRes.body.data.length > 0);

    const breakdownRes = await request('GET', '/api/v1/reports/category-breakdown', null, userToken);
    assert.strictEqual(breakdownRes.status, 200);
    assert.ok(Array.isArray(breakdownRes.body.data));
    const foodItem = breakdownRes.body.data.find((x: any) => x.categoryName === 'Food & Dining');
    assert.ok(foodItem, 'Food & Dining must appear in category breakdown');
    assert.strictEqual(foodItem.totalPaise, 45000);
  });

  // -------------------------------------------------------------
  // FEATURE 12: WHATSAPP PHONE LINKING (/whatsapp/link)
  // -------------------------------------------------------------
  test('Feature 12: Link WhatsApp Phone Number', async () => {
    const linkRes = await request('POST', '/api/v1/whatsapp/link', {
      phone_number: testUserPhone,
    }, userToken);

    assert.strictEqual(linkRes.status, 200);
    assert.ok(linkRes.body.success);
    assert.strictEqual(linkRes.body.data.user.phone_number, testUserPhone);
    assert.strictEqual(linkRes.body.data.user.whatsapp_linked, 1);

    // Check status endpoint
    const statusRes = await request('GET', '/api/v1/whatsapp/status', null, userToken);
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.body.data.phone_number, testUserPhone);
    assert.strictEqual(statusRes.body.data.whatsapp_linked, true);
  });

  // -------------------------------------------------------------
  // FEATURE 13: WHATSAPP CONVERSATIONAL EXPENSE LOGGING (/whatsapp/simulate)
  // -------------------------------------------------------------
  test('Feature 13: WhatsApp Conversational Expense Bot Engine', async () => {
    // 13a. Message: "Spent 1200 at Barbeque Nation"
    const wa1 = await request('POST', '/api/v1/whatsapp/simulate', {
      message: 'Spent 1200 at Barbeque Nation',
      phone_number: testUserPhone,
    });
    assert.strictEqual(wa1.status, 200);
    assert.strictEqual(wa1.body.data.result.action, 'TRANSACTION_RECORDED');
    assert.strictEqual(wa1.body.data.result.transaction.amountPaise, 120000);
    assert.ok(wa1.body.data.result.replyMessage.includes('₹1,200.00'));

    // 13b. Message: "Petrol 2000"
    const wa2 = await request('POST', '/api/v1/whatsapp/simulate', {
      message: 'Petrol 2000',
      phone_number: testUserPhone,
    });
    assert.strictEqual(wa2.status, 200);
    assert.strictEqual(wa2.body.data.result.action, 'TRANSACTION_RECORDED');
    assert.strictEqual(wa2.body.data.result.transaction.amountPaise, 200000);
    assert.strictEqual(wa2.body.data.result.transaction.categoryName, 'Transportation');

    // 13c. Conversational Query: "Balance"
    const wa3 = await request('POST', '/api/v1/whatsapp/simulate', {
      message: 'Balance',
      phone_number: testUserPhone,
    });
    assert.strictEqual(wa3.status, 200);
    assert.strictEqual(wa3.body.data.result.action, 'BALANCE_CHECK');
    assert.ok(wa3.body.data.result.replyMessage.includes('Safe to Spend'));
  });

  // -------------------------------------------------------------
  // FEATURE 14: COMPLETE MULTI-TENANT DATA ISOLATION
  // -------------------------------------------------------------
  test('Feature 14: Strict Isolation: Other Users cannot see or affect this user', async () => {
    // Register another user
    const otherUserRes = await request('POST', '/api/v1/auth/register', {
      email: `other_user_${timestamp}@artha.finance`,
      password: 'AnotherSecurePassword@123',
      full_name: 'Pooja Verma',
    });
    const otherToken = otherUserRes.body.data.token;

    // Other user must see 0 transactions and 0 expenses
    const otherOverview = await request('GET', '/api/v1/dashboard/overview', null, otherToken);
    assert.strictEqual(otherOverview.status, 200);
    assert.strictEqual(
      otherOverview.body.data.answers.expense_mtd_paise,
      0,
      "Other user's MTD expenses must be 0 despite Aditya spending money"
    );

    const otherTxs = await request('GET', '/api/v1/transactions', null, otherToken);
    assert.strictEqual(otherTxs.body.data.length, 0, "Other user must have 0 transactions");
  });
});

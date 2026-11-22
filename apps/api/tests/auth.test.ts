import { test, describe } from 'node:test';
import assert from 'node:assert';
import { AuthService } from '../src/services/auth.service.js';
import { TransactionService } from '../src/services/transaction.service.js';
import { AccountService } from '../src/services/account.service.js';
import { DashboardService } from '../src/services/dashboard.service.js';
import { Security } from '../src/lib/security.js';

describe('Multi-User Authentication & Data Isolation Tests', () => {
  const userAEmail = `user_a_${Date.now()}@test.com`;
  const userBEmail = `user_b_${Date.now()}@test.com`;
  const password = 'StrongPassword@123';

  let userAId: string;
  let userBId: string;
  let userAToken: string;
  let userBToken: string;

  test('User Registration with scrypt password hashing', () => {
    const resA = AuthService.register({
      email: userAEmail,
      password,
      full_name: 'Rahul Sharma',
    });

    assert.ok(resA.user.id);
    assert.strictEqual(resA.user.email, userAEmail);
    assert.ok(resA.token);

    userAId = resA.user.id;
    userAToken = resA.token;

    // Verify token can be verified
    const payload = Security.verifyToken(userAToken);
    assert.ok(payload);
    assert.strictEqual(payload?.userId, userAId);
  });

  test('Rejects duplicate email registration with 409', () => {
    assert.throws(
      () => {
        AuthService.register({
          email: userAEmail,
          password: 'AnotherPassword@123',
          full_name: 'Imposter Rahul',
        });
      },
      (err: any) => {
        return err.statusCode === 409 && err.code === 'EMAIL_EXISTS';
      }
    );
  });

  test('User Login with valid password succeeds', () => {
    const loginRes = AuthService.login({
      email: userAEmail,
      password,
    });

    assert.strictEqual(loginRes.user.id, userAId);
    assert.ok(loginRes.token);
  });

  test('User Login with invalid password fails with 401', () => {
    assert.throws(
      () => {
        AuthService.login({
          email: userAEmail,
          password: 'WrongPassword@999',
        });
      },
      (err: any) => {
        return err.statusCode === 401 && err.code === 'INVALID_CREDENTIALS';
      }
    );
  });

  test('Strict Multi-User Isolation: User A cannot see or corrupt User B data', () => {
    // 1. Register User B
    const resB = AuthService.register({
      email: userBEmail,
      password,
      full_name: 'Neha Verma',
    });
    userBId = resB.user.id;
    userBToken = resB.token;

    // User A and User B must have distinct accounts
    const userAAccounts = AccountService.getAccounts(userAId);
    const userBAccounts = AccountService.getAccounts(userBId);
    assert.ok(userAAccounts.length > 0);
    assert.ok(userBAccounts.length > 0);
    assert.notStrictEqual(userAAccounts[0].id, userBAccounts[0].id);

    // 2. User A records an expense of ₹2,500 (250000 paise)
    const txA = TransactionService.recordTransaction({
      account_id: userAAccounts[0].id,
      type: 'EXPENSE',
      amount_paise: 250000,
      description: 'User A Private Purchase',
      transaction_date: new Date().toISOString().slice(0, 10),
    }, userAId);

    // 3. User B's dashboard must NOT show User A's expense!
    const userBOverview = DashboardService.getOverview(userBId);
    assert.strictEqual(
      userBOverview.answers.expense_mtd_paise,
      0,
      'User B must have 0 expense MTD despite User A spending money'
    );

    // 4. User B cannot see User A's transactions in their list
    const userBTransactions = TransactionService.listTransactions({ userId: userBId });
    assert.strictEqual(userBTransactions.total, 0);

    // 5. User B cannot delete User A's transaction
    assert.throws(
      () => {
        TransactionService.deleteTransaction(txA.id, userBId);
      },
      (err: any) => {
        return err.statusCode === 404;
      }
    );

    // 6. User B cannot access User A's account
    assert.throws(
      () => {
        AccountService.getAccount(userAAccounts[0].id, userBId);
      },
      (err: any) => {
        return err.statusCode === 404;
      }
    );
  });
});

import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { AccountController } from '../controllers/account.controller.js';
import { TransactionController } from '../controllers/transaction.controller.js';
import { CategoryController } from '../controllers/category.controller.js';
import { BudgetController } from '../controllers/budget.controller.js';
import { LoanController } from '../controllers/loan.controller.js';
import { ReportController } from '../controllers/report.controller.js';
import { OnboardingController } from '../controllers/onboarding.controller.js';
import { validateBody } from '../middleware/validate.js';
import {
  CreateAccountSchema,
  CreateTransactionSchema,
  QuickAddTransactionSchema,
  CreateBudgetSchema,
  CreateLoanSchema,
  OnboardingPayloadSchema,
} from '@artha/domain';

export const router = Router();

// Dashboard overview
router.get('/dashboard/overview', DashboardController.getOverview);

// Accounts
router.get('/accounts', AccountController.list);
router.get('/accounts/:id', AccountController.getById);
router.post('/accounts', validateBody(CreateAccountSchema), AccountController.create);

// Transactions
router.get('/transactions', TransactionController.list);
router.get('/transactions/:id', TransactionController.getById);
router.post('/transactions', validateBody(CreateTransactionSchema), TransactionController.create);
router.post('/transactions/quick-add', validateBody(QuickAddTransactionSchema), TransactionController.quickAdd);
router.delete('/transactions/:id', TransactionController.delete);

// Categories
router.get('/categories', CategoryController.list);
router.post('/categories/suggest', CategoryController.suggest);

// Budgets
router.get('/budgets', BudgetController.listForMonth);
router.post('/budgets', validateBody(CreateBudgetSchema), BudgetController.createOrUpdate);

// Loans & Debt
router.get('/loans', LoanController.list);
router.get('/loans/:id/schedule', LoanController.getSchedule);
router.post('/loans/preview', LoanController.preview);
router.post('/loans', validateBody(CreateLoanSchema), LoanController.create);

// Reports
router.get('/reports/cash-flow', ReportController.getCashFlow);
router.get('/reports/category-breakdown', ReportController.getCategoryBreakdown);

// Journey A Onboarding
router.post('/onboarding', validateBody(OnboardingPayloadSchema), OnboardingController.submit);

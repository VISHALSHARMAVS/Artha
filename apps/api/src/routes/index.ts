import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { AccountController } from '../controllers/account.controller.js';
import { TransactionController } from '../controllers/transaction.controller.js';
import { CategoryController } from '../controllers/category.controller.js';
import { BudgetController } from '../controllers/budget.controller.js';
import { LoanController } from '../controllers/loan.controller.js';
import { ReportController } from '../controllers/report.controller.js';
import { SplitController } from '../controllers/split.controller.js';
import { StatementController } from '../controllers/statement.controller.js';
import { OnboardingController } from '../controllers/onboarding.controller.js';
import { WhatsAppController } from '../controllers/whatsapp.controller.js';
import { validateBody } from '../middleware/validate.js';
import {
  RegisterSchema,
  LoginSchema,
  CreateAccountSchema,
  CreateTransactionSchema,
  UpdateTransactionSchema,
  QuickAddTransactionSchema,
  CreateBudgetSchema,
  CreateLoanSchema,
  OnboardingPayloadSchema,
  SettleSplitSchema,
} from '@artha/domain';

export const router = Router();

// Authentication & Multi-User Management
router.post('/auth/register', validateBody(RegisterSchema), AuthController.register);
router.post('/auth/login', validateBody(LoginSchema), AuthController.login);
router.get('/auth/me', AuthController.me);

// Dashboard overview
router.get('/dashboard/overview', DashboardController.getOverview);

// Accounts
router.get('/accounts', AccountController.list);
router.get('/accounts/:id', AccountController.getById);
router.post('/accounts', validateBody(CreateAccountSchema), AccountController.create);
router.delete('/accounts/:id', AccountController.delete);

// Transactions
router.get('/transactions', TransactionController.list);
router.post('/transactions/undo', TransactionController.undo);
router.get('/transactions/:id', TransactionController.getById);
router.post('/transactions', validateBody(CreateTransactionSchema), TransactionController.create);
router.post('/transactions/quick-add', validateBody(QuickAddTransactionSchema), TransactionController.quickAdd);
router.put('/transactions/:id', validateBody(UpdateTransactionSchema), TransactionController.update);
router.delete('/transactions/:id', TransactionController.delete);

// Splits & Friend Receivables
router.get('/splits', SplitController.list);
router.get('/splits/summary', SplitController.summary);
router.get('/splits/export', SplitController.exportCsv);
router.post('/splits/:id/settle', validateBody(SettleSplitSchema), SplitController.settle);
router.delete('/splits/:id', SplitController.delete);

// Bank Statement PDF Import
router.post('/statements/parse-pdf', StatementController.parsePdf);
router.post('/statements/batch-import', StatementController.batchImport);

// Categories
router.get('/categories', CategoryController.list);
router.post('/categories/suggest', CategoryController.suggest);

// Budgets
router.get('/budgets', BudgetController.listForMonth);
router.post('/budgets', validateBody(CreateBudgetSchema), BudgetController.createOrUpdate);

// Loans & Debt
router.get('/loans', LoanController.list);
router.get('/loans/freedom-summary', LoanController.freedomSummary);
router.post('/loans/simulate-prepayment', LoanController.simulatePrepayment);
router.get('/loans/:id/schedule', LoanController.getSchedule);
router.post('/loans/preview', LoanController.preview);
router.post('/loans', validateBody(CreateLoanSchema), LoanController.create);

// Reports
router.get('/reports/cash-flow', ReportController.getCashFlow);
router.get('/reports/category-breakdown', ReportController.getCategoryBreakdown);
router.get('/reports/export', ReportController.exportData);

// Journey A Onboarding
router.get('/onboarding/current', OnboardingController.getCurrent);
router.post('/onboarding', validateBody(OnboardingPayloadSchema), OnboardingController.submit);

// WhatsApp Expense Bot Integration & Webhooks
router.get('/webhooks/whatsapp', WhatsAppController.verifyWebhook);
router.post('/webhooks/whatsapp', WhatsAppController.handleWebhookMessage);
router.post('/whatsapp/link', WhatsAppController.linkPhone);
router.post('/whatsapp/simulate', WhatsAppController.simulateMessage);
router.get('/whatsapp/status', WhatsAppController.getStatus);
router.get('/whatsapp/test-connection', WhatsAppController.testConnection);

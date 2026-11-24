import { z } from 'zod';

export const AccountTypeEnum = z.enum([
  'SAVINGS',
  'CHECKING',
  'CREDIT_CARD',
  'CASH',
  'INVESTMENT',
  'LOAN',
]);
export type AccountType = z.infer<typeof AccountTypeEnum>;

export const TransactionTypeEnum = z.enum(['INCOME', 'EXPENSE', 'TRANSFER']);
export type TransactionType = z.infer<typeof TransactionTypeEnum>;

export const FrequencyEnum = z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'WEEKLY']);
export type Frequency = z.infer<typeof FrequencyEnum>;

// Authentication schemas
export const RegisterSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters').max(60),
});
export type RegisterDTO = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});
export type LoginDTO = z.infer<typeof LoginSchema>;

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  currency_code: string;
  created_at: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

// Account validation schemas
export const CreateAccountSchema = z.object({
  name: z.string().min(2, 'Account name must be at least 2 characters').max(50),
  account_type: AccountTypeEnum,
  institution_name: z.string().max(50).optional().default(''),
  account_number_mask: z.string().max(20).optional().default(''),
  initial_balance_paise: z.number().int().default(0),
  credit_limit_paise: z.number().int().nonnegative().optional().default(0),
});
export type CreateAccountDTO = z.infer<typeof CreateAccountSchema>;

// Transaction validation schemas
export const CreateTransactionSchema = z.object({
  account_id: z.string().min(1, 'Source account is required'),
  destination_account_id: z.string().optional(),
  category_id: z.string().optional(),
  type: TransactionTypeEnum,
  amount_paise: z.number().int().positive('Amount must be a positive integer in paise'),
  description: z.string().min(1, 'Description is required').max(100),
  notes: z.string().max(500).optional(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
}).refine(
  (data) => {
    if (data.type === 'TRANSFER') {
      return !!data.destination_account_id && data.destination_account_id !== data.account_id;
    }
    return true;
  },
  {
    message: 'Transfers require a distinct destination account',
    path: ['destination_account_id'],
  }
);
export type CreateTransactionDTO = z.infer<typeof CreateTransactionSchema>;

// Update transaction schema
export const UpdateTransactionSchema = z.object({
  account_id: z.string().min(1, 'Source account is required').optional(),
  destination_account_id: z.string().optional().nullable(),
  category_id: z.string().optional().nullable(),
  type: TransactionTypeEnum.optional(),
  amount_paise: z.number().int().positive('Amount must be a positive integer in paise').optional(),
  description: z.string().min(1, 'Description is required').max(100).optional(),
  notes: z.string().max(500).optional().nullable(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
});
export type UpdateTransactionDTO = z.infer<typeof UpdateTransactionSchema>;

// Quick-Add expense schema (Journey B)
export const QuickAddTransactionSchema = z.object({
  amount_paise: z.number().int().positive('Amount must be a positive integer in paise'),
  description: z.string().min(1, 'Description is required').max(100),
  account_id: z.string().optional(),
  category_id: z.string().optional(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type QuickAddTransactionDTO = z.infer<typeof QuickAddTransactionSchema>;

// Budget validation schema
export const CreateBudgetSchema = z.object({
  category_id: z.string().min(1, 'Category is required'),
  month_year: z.string().regex(/^\d{4}-\d{2}$/, 'Format must be YYYY-MM'),
  limit_paise: z.number().int().positive('Budget limit must be greater than zero'),
});
export type CreateBudgetDTO = z.infer<typeof CreateBudgetSchema>;

// Loan validation schema
export const CreateLoanSchema = z.object({
  loan_name: z.string().min(2, 'Loan name is required').max(50),
  lender_name: z.string().min(2, 'Lender name is required').max(50),
  original_principal_paise: z.number().int().positive('Principal must be positive'),
  current_outstanding_paise: z.number().int().nonnegative('Outstanding cannot be negative').optional(),
  annual_interest_rate: z.number().positive('Interest rate must be positive').max(100),
  tenure_months: z.number().int().positive('Tenure must be positive months'),
  remaining_months: z.number().int().positive().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  account_id: z.string().optional(),
});
export type CreateLoanDTO = z.infer<typeof CreateLoanSchema>;

// Recurring Obligation schema
export const CreateObligationSchema = z.object({
  title: z.string().min(2, 'Title is required').max(50),
  amount_paise: z.number().int().positive('Amount must be a positive integer in paise'),
  frequency: FrequencyEnum.default('MONTHLY'),
  due_day_of_month: z.number().int().min(1).max(31),
  account_id: z.string().min(1, 'Payment account is required'),
  category_id: z.string().optional(),
  auto_deduct: z.boolean().default(false),
});
export type CreateObligationDTO = z.infer<typeof CreateObligationSchema>;

// Journey A Onboarding schema
export const OnboardingPayloadSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  account: z.object({
    name: z.string().min(2, 'Account name is required'),
    account_type: AccountTypeEnum,
    institution_name: z.string().optional(),
    initial_balance_paise: z.number().int().nonnegative(),
  }),
  salary_profile: z.object({
    employer_name: z.string().min(2, 'Employer is required'),
    net_monthly_salary_paise: z.number().int().positive('Salary must be positive'),
    pay_day_of_month: z.number().int().min(1).max(31),
    emergency_fund_target_paise: z.number().int().nonnegative().default(10000000), // Default ₹1,00,000
    monthly_savings_target_paise: z.number().int().nonnegative().default(2000000), // Default ₹20,000
  }),
  obligations: z.array(
    z.object({
      title: z.string().min(2),
      amount_paise: z.number().int().positive(),
      due_day_of_month: z.number().int().min(1).max(31),
      category_id: z.string().optional(),
    })
  ).default([]),
});
export type OnboardingPayloadDTO = z.infer<typeof OnboardingPayloadSchema>;

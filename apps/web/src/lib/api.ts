/**
 * Artha API Client & Precision Financial Formatters
 */

export interface Account {
  id: string;
  name: string;
  account_type: 'SAVINGS' | 'CHECKING' | 'CREDIT_CARD' | 'CASH' | 'INVESTMENT' | 'LOAN';
  institution_name: string;
  account_number_mask: string;
  balance_paise: number;
  credit_limit_paise: number;
  is_active: number;
}

export interface Transaction {
  id: string;
  account_id: string;
  destination_account_id: string | null;
  category_id: string | null;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amount_paise: number;
  description: string;
  notes: string;
  transaction_date: string;
  created_at: string;
  account_name?: string;
  destination_account_name?: string;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
}

export interface Obligation {
  id: string;
  title: string;
  amountPaise: number;
  dueDate: string;
  daysRemaining: number;
  categoryName?: string;
}

export interface SafeToSpendDetails {
  safeAmountPaise: number;
  dailySafePaise: number;
  upcomingObligationsTotalPaise: number;
  emergencyReserveBufferPaise: number;
  daysUntilSalary: number;
  status: 'HEALTHY' | 'MODERATE' | 'TIGHT' | 'DEFICIT';
  advisoryMessage: string;
}

export interface DashboardOverview {
  answers: {
    total_liquid_paise: number;
    income_mtd_paise: number;
    expense_mtd_paise: number;
    net_savings_mtd_paise: number;
    savings_rate_percent: number;
    upcoming_obligations_count: number;
    safe_to_spend: SafeToSpendDetails;
  };
  upcoming_obligations: Obligation[];
  recent_transactions: Transaction[];
  net_worth: {
    net_worth_paise: number;
    total_assets_paise: number;
    total_liabilities_paise: number;
    investments_paise: number;
  };
  salary_profile: {
    employer_name: string;
    net_monthly_salary_paise: number;
    pay_day_of_month: number;
  } | null;
}

export interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon_name: string;
  color_hex: string;
}

export interface Budget {
  id: string;
  category_id: string;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  limit_paise: number;
  month_year: string;
  spent_paise?: number;
  evaluation: {
    limitPaise: number;
    spentPaise: number;
    remainingPaise: number;
    utilizationPercent: number;
    projectedSpendPaise: number;
    status: 'ON_TRACK' | 'WARNING' | 'EXCEEDED';
    statusMessage: string;
  };
}

export interface Loan {
  id: string;
  account_id: string | null;
  loan_name: string;
  lender_name: string;
  original_principal_paise: number;
  current_outstanding_paise: number;
  annual_interest_rate: number;
  tenure_months: number;
  remaining_months: number;
  emi_amount_paise: number;
  start_date: string;
  account_name?: string;
}

export interface AmortizationRow {
  month: number;
  paymentPaise: number;
  principalPaise: number;
  interestPaise: number;
  remainingPrincipalPaise: number;
}

/**
 * Precision Indian Currency Formatter from Integer Paise
 */
export function formatPaise(paise: number, options: {
  includeDecimals?: boolean;
  signed?: boolean;
  compact?: boolean;
} = {}): string {
  const { includeDecimals = true, signed = false } = options;
  const isNegative = paise < 0;
  const absRupees = Math.abs(paise) / 100;

  const formattedNum = absRupees.toLocaleString('en-IN', {
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  });

  const prefix = isNegative ? '-₹' : (signed && paise > 0 ? '+₹' : '₹');
  return `${prefix}${formattedNum}`;
}

const API_BASE = '/api/v1';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    const errorMsg = json.error?.message || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return json.data;
}

export const api = {
  // Dashboard
  getDashboardOverview: () => request<DashboardOverview>('/dashboard/overview'),

  // Accounts
  getAccounts: () => request<Account[]>('/accounts'),
  createAccount: (data: {
    name: string;
    account_type: string;
    institution_name?: string;
    account_number_mask?: string;
    initial_balance_paise?: number;
    credit_limit_paise?: number;
  }) => request<Account>('/accounts', { method: 'POST', body: JSON.stringify(data) }),

  // Transactions
  getTransactions: (params: {
    page?: number;
    limit?: number;
    type?: string;
    account_id?: string;
    category_id?: string;
    search?: string;
  } = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.type) query.set('type', params.type);
    if (params.account_id) query.set('account_id', params.account_id);
    if (params.category_id) query.set('category_id', params.category_id);
    if (params.search) query.set('search', params.search);

    return request<Transaction[]>(`/transactions?${query.toString()}`);
  },

  createTransaction: (data: {
    account_id: string;
    destination_account_id?: string;
    category_id?: string;
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    amount_paise: number;
    description: string;
    notes?: string;
    transaction_date: string;
  }) => request<Transaction>('/transactions', { method: 'POST', body: JSON.stringify(data) }),

  quickAddExpense: (data: {
    amount_paise: number;
    description: string;
    account_id?: string;
    category_id?: string;
    transaction_date?: string;
  }) => request<Transaction>('/transactions/quick-add', { method: 'POST', body: JSON.stringify(data) }),

  deleteTransaction: (id: string) => request<{ success: boolean }>(`/transactions/${id}`, { method: 'DELETE' }),

  // Categories
  getCategories: () => request<Category[]>('/categories'),
  suggestCategory: (description: string) =>
    request<Category | null>('/categories/suggest', {
      method: 'POST',
      body: JSON.stringify({ description }),
    }),

  // Budgets
  getBudgets: (monthYear?: string) => {
    const q = monthYear ? `?month_year=${monthYear}` : '';
    return request<Budget[]>(`/budgets${q}`);
  },
  setBudget: (data: { category_id: string; month_year: string; limit_paise: number }) =>
    request<Budget>('/budgets', { method: 'POST', body: JSON.stringify(data) }),

  // Loans
  getLoans: () => request<Loan[]>('/loans'),
  getLoanSchedule: (id: string) =>
    request<{ monthlyEmiPaise: number; totalInterestPaise: number; totalAmountPayablePaise: number; amortizationSchedule: AmortizationRow[] }>(`/loans/${id}/schedule`),
  previewLoan: (data: { principal_paise: number; annual_interest_rate: number; tenure_months: number }) =>
    request<{ monthlyEmiPaise: number; totalInterestPaise: number; totalAmountPayablePaise: number; amortizationSchedule: AmortizationRow[] }>('/loans/preview', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  createLoan: (data: {
    loan_name: string;
    lender_name: string;
    original_principal_paise: number;
    annual_interest_rate: number;
    tenure_months: number;
    start_date: string;
    account_id?: string;
  }) => request<Loan>('/loans', { method: 'POST', body: JSON.stringify(data) }),

  // Reports
  getCashFlowHistory: (months = 6) =>
    request<Array<{ monthYear: string; monthLabel: string; incomePaise: number; expensePaise: number; netSavingsPaise: number }>>(`/reports/cash-flow?months=${months}`),
  getCategoryBreakdown: (monthYear?: string) => {
    const q = monthYear ? `?month_year=${monthYear}` : '';
    return request<Array<{ categoryId: string; categoryName: string; iconName: string; colorHex: string; totalPaise: number; percentage: number; transactionCount?: number }>>(`/reports/category-breakdown${q}`);
  },

  // Onboarding (Journey A)
  submitOnboarding: (data: any) =>
    request<any>('/onboarding', { method: 'POST', body: JSON.stringify(data) }),
};

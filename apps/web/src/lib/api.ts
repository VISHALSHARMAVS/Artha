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
  is_split?: number;
  personal_share_paise?: number | null;
  splits?: SplitReceivable[];
}

export interface SplitItem {
  id?: string;
  friend_name: string;
  amount_paise: number;
  notes?: string;
}

export interface SplitReceivable {
  id: string;
  user_id: string;
  transaction_id: string;
  friend_name: string;
  amount_paise: number;
  settled_amount_paise: number;
  is_settled: number;
  settled_at: string | null;
  settled_account_id: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  transaction_description?: string;
  transaction_date?: string;
  settled_account_name?: string;
}

export interface SplitSummary {
  totalReceivablePaise: number;
  totalSettledPaise: number;
  pendingCount: number;
}

export interface CandidateStatementTransaction {
  temp_id: string;
  date: string;
  raw_description: string;
  clean_description: string;
  type: 'INCOME' | 'EXPENSE';
  amount_paise: number;
  category_id?: string;
  category_name?: string;
  is_potential_duplicate: boolean;
  duplicate_reason?: string;
  selected: boolean;
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
  guiltFreePaise?: number;
  freedomRunwayMonths?: number;
  freedomRunwayDays?: number;
  hourlyWagePaise?: number;
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

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string | null;
  whatsapp_linked?: boolean | number;
  currency_code: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export interface WhatsAppStatus {
  phone_number: string | null;
  whatsapp_linked: boolean;
  has_api_credentials?: boolean;
  integration_status?: 'READY' | 'NUMBER_NOT_LINKED' | 'CREDENTIALS_MISSING';
  webhook_url: string;
  verify_token: string;
  sandbox_instructions: {
    steps: string[];
  };
}

export interface WhatsAppSimulateResponse {
  sender_phone: string;
  input_message: string;
  result: {
    success: boolean;
    action: string;
    replyMessage: string;
    transaction?: {
      id: string;
      type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
      amountPaise: number;
      description: string;
      categoryName?: string;
      accountName: string;
    };
  };
}

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api/v1';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('artha_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    const errorMsg = json.error?.message || json.message || `Request failed with status ${res.status}`;
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
  deleteAccount: (id: string) => request<{ success: boolean; message: string }>(`/accounts/${id}`, { method: 'DELETE' }),

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
    is_split?: boolean;
    personal_share_paise?: number;
    splits?: SplitItem[];
  }) => request<Transaction>('/transactions', { method: 'POST', body: JSON.stringify(data) }),

  quickAddExpense: (data: {
    amount_paise: number;
    description: string;
    account_id?: string;
    category_id?: string;
    transaction_date?: string;
  }) => request<Transaction>('/transactions/quick-add', { method: 'POST', body: JSON.stringify(data) }),

  updateTransaction: (id: string, data: {
    account_id?: string;
    destination_account_id?: string;
    category_id?: string;
    type?: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    amount_paise?: number;
    description?: string;
    notes?: string;
    transaction_date?: string;
    is_split?: boolean;
    personal_share_paise?: number;
    splits?: SplitItem[];
  }) => request<Transaction>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  undoLatestTransaction: () => request<Transaction>('/transactions/undo', { method: 'POST' }),

  deleteTransaction: (id: string) => request<{ success: boolean }>(`/transactions/${id}`, { method: 'DELETE' }),

  // Splits & Receivables
  getSplits: (isSettled?: boolean) => {
    const q = isSettled !== undefined ? `?is_settled=${isSettled}` : '';
    return request<SplitReceivable[]>(`/splits${q}`);
  },
  getSplitSummary: () => request<SplitSummary>('/splits/summary'),
  settleSplit: (id: string, data: { account_id: string; settled_amount_paise?: number; settled_at?: string }) =>
    request<SplitReceivable>(`/splits/${id}/settle`, { method: 'POST', body: JSON.stringify(data) }),
  deleteSplit: (id: string) => request<{ success: boolean }>(`/splits/${id}`, { method: 'DELETE' }),

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
  getDebtFreedomSummary: () =>
    request<{
      isDebtFree: boolean;
      totalOutstandingPaise: number;
      totalMonthlyEmiPaise: number;
      longestRemainingMonths: number;
      freedomDate: string;
      formattedFreedomDate: string;
      yearsRemaining?: number;
      activeLoansCount: number;
    }>('/loans/freedom-summary'),
  simulatePrepayment: (data: { loan_id: string; extra_monthly_paise: number }) =>
    request<{
      originalTenureMonths: number;
      acceleratedTenureMonths: number;
      monthsSaved: number;
      originalTotalInterestPaise: number;
      acceleratedTotalInterestPaise: number;
      interestSavedPaise: number;
      newEmiPaise: number;
    }>('/loans/simulate-prepayment', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
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

  // Multi-User Authentication
  login: (data: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: { email: string; password: string; full_name: string; currency_code?: string }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request<AuthUser>('/auth/me'),

  // WhatsApp Conversational Bot & Webhook
  getWhatsAppStatus: () => request<WhatsAppStatus>('/whatsapp/status'),
  linkWhatsAppPhone: (phone_number: string) =>
    request<{ message: string; user: AuthUser }>('/whatsapp/link', {
      method: 'POST',
      body: JSON.stringify({ phone_number }),
    }),
  simulateWhatsAppMessage: (message: string, phone_number?: string) =>
    request<WhatsAppSimulateResponse>('/whatsapp/simulate', {
      method: 'POST',
      body: JSON.stringify({ message, phone_number }),
    }),

  // Bank Statement PDF Import
  parseStatementPdf: (data: {
    file_base64: string;
    file_name: string;
    password?: string;
    account_id?: string;
  }) =>
    request<{ success: boolean; count: number; candidates: CandidateStatementTransaction[] }>(
      '/statements/parse-pdf',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  batchImportStatement: (data: {
    account_id: string;
    transactions: Array<{
      date: string;
      description: string;
      type: 'INCOME' | 'EXPENSE';
      amount_paise: number;
      category_id?: string;
    }>;
  }) =>
    request<{
      success: boolean;
      message: string;
      imported_count: number;
      total_amount_paise: number;
      new_balance_paise: number;
    }>('/statements/batch-import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

-- Artha Institutional Database DDL
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT UNIQUE,
    whatsapp_linked INTEGER DEFAULT 0 CHECK(whatsapp_linked IN (0, 1)),
    password_hash TEXT DEFAULT '',
    password_salt TEXT DEFAULT '',
    currency_code TEXT DEFAULT 'INR' NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);

CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK(account_type IN ('SAVINGS', 'CHECKING', 'CREDIT_CARD', 'CASH', 'INVESTMENT', 'LOAN')),
    institution_name TEXT DEFAULT '',
    account_number_mask TEXT DEFAULT '',
    balance_paise INTEGER NOT NULL DEFAULT 0,
    credit_limit_paise INTEGER DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(user_id, account_type);

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('INCOME', 'EXPENSE')),
    icon_name TEXT NOT NULL,
    color_hex TEXT NOT NULL,
    parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    is_system INTEGER NOT NULL DEFAULT 0 CHECK(is_system IN (0, 1)),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id, type);

CREATE TABLE IF NOT EXISTS recurring_obligations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    amount_paise INTEGER NOT NULL CHECK(amount_paise > 0),
    frequency TEXT NOT NULL CHECK(frequency IN ('MONTHLY', 'QUARTERLY', 'YEARLY', 'WEEKLY')),
    due_day_of_month INTEGER NOT NULL CHECK(due_day_of_month BETWEEN 1 AND 31),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    auto_deduct INTEGER NOT NULL DEFAULT 0 CHECK(auto_deduct IN (0, 1)),
    next_due_date TEXT NOT NULL,
    last_processed_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_obligations(user_id, is_active, next_due_date);

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    destination_account_id TEXT REFERENCES accounts(id) ON DELETE RESTRICT,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK(type IN ('INCOME', 'EXPENSE', 'TRANSFER')),
    amount_paise INTEGER NOT NULL CHECK(amount_paise > 0),
    description TEXT NOT NULL,
    notes TEXT DEFAULT '',
    transaction_date TEXT NOT NULL,
    is_recurring INTEGER DEFAULT 0 CHECK(is_recurring IN (0, 1)),
    recurring_obligation_id TEXT REFERENCES recurring_obligations(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(user_id, type);

CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    limit_paise INTEGER NOT NULL CHECK(limit_paise > 0),
    month_year TEXT NOT NULL,
    alert_threshold_percent INTEGER DEFAULT 85 CHECK(alert_threshold_percent BETWEEN 1 AND 100),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(user_id, category_id, month_year)
);
CREATE INDEX IF NOT EXISTS idx_budgets_lookup ON budgets(user_id, month_year);

CREATE TABLE IF NOT EXISTS salary_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employer_name TEXT NOT NULL,
    net_monthly_salary_paise INTEGER NOT NULL CHECK(net_monthly_salary_paise > 0),
    pay_day_of_month INTEGER NOT NULL CHECK(pay_day_of_month BETWEEN 1 AND 31),
    emergency_fund_target_paise INTEGER DEFAULT 0,
    monthly_savings_target_paise INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS loans (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    loan_name TEXT NOT NULL,
    lender_name TEXT NOT NULL,
    original_principal_paise INTEGER NOT NULL CHECK(original_principal_paise > 0),
    current_outstanding_paise INTEGER NOT NULL CHECK(current_outstanding_paise >= 0),
    annual_interest_rate REAL NOT NULL CHECK(annual_interest_rate >= 0),
    tenure_months INTEGER NOT NULL CHECK(tenure_months > 0),
    remaining_months INTEGER NOT NULL CHECK(remaining_months >= 0),
    emi_amount_paise INTEGER NOT NULL CHECK(emi_amount_paise > 0),
    start_date TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_loans_user ON loans(user_id);

CREATE TABLE IF NOT EXISTS investments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    asset_class TEXT NOT NULL CHECK(asset_class IN ('MUTUAL_FUND', 'EQUITY', 'FIXED_DEPOSIT', 'GOLD', 'EPF', 'CRYPTO', 'OTHER')),
    invested_amount_paise INTEGER NOT NULL CHECK(invested_amount_paise >= 0),
    current_value_paise INTEGER NOT NULL CHECK(current_value_paise >= 0),
    last_updated_date TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_investments_user ON investments(user_id, asset_class);

CREATE TABLE IF NOT EXISTS net_worth_snapshots (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    snapshot_date TEXT NOT NULL,
    total_assets_paise INTEGER NOT NULL,
    total_liabilities_paise INTEGER NOT NULL,
    net_worth_paise INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(user_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_net_worth_user_date ON net_worth_snapshots(user_id, snapshot_date ASC);

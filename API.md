# Artha RESTful API Specification (v1.0.0)

All requests and responses use JSON format. All monetary amounts are exchanged in integer **paise** (`1 INR = 100 paise`).

---

## 1. Response Envelope & Error Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-11-22T12:00:00.000Z"
  }
}
```

### Paginated Success Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 142,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid transaction amount. Amount must be a positive integer in paise.",
    "details": [
      {
        "field": "amount_paise",
        "issue": "Expected positive integer, received -500"
      }
    ]
  }
}
```

---

## 2. API Endpoints

### 2.1 Dashboard & Financial Summary

#### `GET /api/v1/dashboard/overview`
Retrieves the 5 instant answers required by the mandate:
1. Liquid Balance
2. Earned this month
3. Spent this month
4. Upcoming obligations
5. Safe-to-spend calculation

**Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "total_liquid_paise": 38450000,
    "income_mtd_paise": 18500000,
    "expense_mtd_paise": 6245000,
    "net_savings_mtd_paise": 12255000,
    "savings_rate_percent": 66.2,
    "safe_to_spend": {
      "safe_amount_paise": 19450000,
      "daily_safe_paise": 243125,
      "days_until_salary": 8,
      "next_salary_date": "2026-11-30",
      "emergency_reserve_buffer_paise": 10000000,
      "upcoming_obligations_total_paise": 9000000
    },
    "upcoming_obligations": [
      {
        "id": "obl_1",
        "title": "Apartment Rent",
        "amount_paise": 4500000,
        "due_date": "2026-11-28",
        "days_remaining": 6,
        "category_name": "Housing"
      },
      {
        "id": "obl_2",
        "title": "HDFC Home Loan EMI",
        "amount_paise": 4500000,
        "due_date": "2026-11-29",
        "days_remaining": 7,
        "category_name": "Debt / EMI"
      }
    ],
    "recent_transactions": [ ... ]
  }
}
```

---

### 2.2 Accounts

#### `GET /api/v1/accounts`
List all active accounts with current balances.

#### `POST /api/v1/accounts`
Create a new financial account.
```json
{
  "name": "ICICI Salary Account",
  "account_type": "SAVINGS",
  "institution_name": "ICICI Bank",
  "account_number_mask": "•••• 4012",
  "initial_balance_paise": 12500000
}
```

#### `GET /api/v1/accounts/:id`
Fetch account details and recent ledger movements.

---

### 2.3 Transactions

#### `GET /api/v1/transactions`
Query transactions with filtering and pagination.
- **Query Params**:
  - `page`: default `1`
  - `limit`: default `20`
  - `type`: `INCOME` | `EXPENSE` | `TRANSFER`
  - `account_id`: string
  - `category_id`: string
  - `start_date`: `YYYY-MM-DD`
  - `end_date`: `YYYY-MM-DD`
  - `search`: string

#### `POST /api/v1/transactions`
Record an expense, income, or transfer.
```json
{
  "account_id": "acc_sbi_salary",
  "type": "EXPENSE",
  "amount_paise": 185000,
  "description": "Organic Supermarket",
  "category_id": "cat_groceries",
  "transaction_date": "2026-11-22",
  "notes": "Weekly household essentials"
}
```

#### `POST /api/v1/transactions/quick-add`
Fast expense recording with automated category heuristics (Journey B).
```json
{
  "amount_paise": 24000,
  "description": "Starbucks Coffee",
  "account_id": "acc_sbi_salary"
}
```
*Backend infers category `Food & Dining` automatically if `category_id` is omitted.*

#### `PUT /api/v1/transactions/:id`
Updates transaction details and atomically recalculates related account ledger balances.

#### `DELETE /api/v1/transactions/:id`
Deletes a transaction and atomically reverses its account balance impact.

---

### 2.4 Categories

#### `GET /api/v1/categories`
List all categories with subcategory hierarchy.

#### `POST /api/v1/categories/suggest`
Suggests an appropriate category based on description text matching against historical habits and rules.

---

### 2.5 Budgets

#### `GET /api/v1/budgets?month_year=2026-11`
Returns monthly category budgets alongside realized expenditures and remaining amounts in paise.

#### `POST /api/v1/budgets`
Set or update category budget ceiling.
```json
{
  "category_id": "cat_dining",
  "month_year": "2026-11",
  "limit_paise": 1500000
}
```

---

### 2.6 Loans & EMIs

#### `GET /api/v1/loans`
List active loan facilities, remaining tenures, outstanding balances, and calculated EMI metrics.

#### `POST /api/v1/loans`
Create a loan facility with automatic recurring EMI generation.
```json
{
  "loan_name": "HDFC Home Loan",
  "lender_name": "HDFC Ltd",
  "original_principal_paise": 500000000,
  "current_outstanding_paise": 420000000,
  "annual_interest_rate": 8.75,
  "tenure_months": 240,
  "remaining_months": 182,
  "emi_amount_paise": 4418600,
  "start_date": "2022-01-15",
  "account_id": "acc_sbi_salary"
}
```

---

### 2.7 Net Worth & Investments

#### `GET /api/v1/net-worth/summary`
Returns total assets, total liabilities, net worth, and historical trend points.

#### `GET /api/v1/investments`
Lists investment portfolio items and cumulative returns.

---

### 2.8 Reports & Analytics

#### `GET /api/v1/reports/cash-flow?months=6`
Monthly inflow vs outflow trends with net savings ratios.

#### `GET /api/v1/reports/category-breakdown?month_year=2026-11`
Proportional category expenditure breakdown with percentage share.

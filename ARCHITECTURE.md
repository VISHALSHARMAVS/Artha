# Finora System Architecture Specification

## 1. Architectural Philosophy & Overview

Finora is designed as a **Modular Monolith** employing **Clean Layered Architecture** with strict Domain-Driven Design (DDD) principles. 

Financial software demands deterministic calculation, transactional safety, and strict auditability. To prevent state divergence, Finora cleanly segregates pure financial domain rules from application use cases, transport controllers, and database engines.

```
+-------------------------------------------------------------------------+
|                         Presentation Layer                              |
|         React 19 / Vite SPA, Design System, Tailwind, Lucide           |
+-------------------------------------------------------------------------+
                                    |  JSON / HTTP REST (Zod validated)
                                    v
+-------------------------------------------------------------------------+
|                     API / Controller Layer (apps/api)                   |
|  - Request parsing & Zod schema validation                             |
|  - Authentication / Authorization session context                      |
|  - HTTP response formatting & centralized error interception            |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                  Application / Service Layer (apps/api)                 |
|  - Use-case workflows (e.g. RecordTransactionUseCase, PlanSalary)       |
|  - Transaction orchestration across multiple repositories               |
|  - Audit logging and event emissions                                    |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|               Domain Layer (packages/domain - Pure TS)                  |
|  - Money Value Object (integer paise, zero float logic)                 |
|  - Double-Entry Ledger rules & balance integrity                        |
|  - Safe-to-Spend algorithm & obligations deduction                      |
|  - Loan EMI Amortization & Net Worth calculation                        |
|  - ZERO runtime dependencies, 100% testable                             |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|               Repository / Data Access Layer (apps/api)                 |
|  - SQLite database interface with ACID transactions                     |
|  - Foreign keys, indexed lookups, and user-isolation enforcement        |
|  - Entity mapping between SQL rows and Domain models                    |
+-------------------------------------------------------------------------+
```

---

## 2. Module Boundaries & Responsibilities

Finora is partitioned into 13 autonomous modules, each possessing a dedicated Service, Repository, and Controller:

| Module | Core Responsibility | Key Invariants |
| :--- | :--- | :--- |
| **Authentication & Users** | User session, credentials, profile metadata | User isolation guaranteed on every DB query via `user_id`. |
| **Accounts** | Bank accounts, credit cards, cash wallets, loan accounts | Account balances derive from ledger postings or cached ledger state. |
| **Ledger & Transactions** | Financial postings (Income, Expense, Transfer) | Double-entry invariant: transfers balance to 0 across accounts without altering net income/expense. |
| **Categories** | Hierarchical categorization of income & expense | Categories cannot be deleted if associated with active transactions; default system categories seeded. |
| **Budgets** | Monthly category spending thresholds | Evaluated against realized expenses in current calendar cycle. |
| **Salary Planning** | Monthly pay date, gross/net distribution, automatic allocations | Feeds directly into Safe-to-Spend baseline. |
| **Recurring & Subscriptions** | Recurring bills, EMIs, SIPs, utilities | Scheduled obligations detect next due date; prevents duplicate generation. |
| **Safe-to-Spend Engine** | Dynamic computation of truly expendable capital | Formula: `Liquid Balance - Committed Obligations (until next salary) - Emergency Reserve Buffer`. |
| **Loans & Debt (EMI)** | Amortization schedules, principal/interest split, payoff tracking | Monthly EMI automatically factored into upcoming obligations. |
| **Investments** | Mutual funds, stocks, fixed deposits, gold | Tracked in asset portfolio; gains/losses isolated from daily cash flow. |
| **Net Worth** | Aggregation of Total Assets minus Total Liabilities | Historical snapshotting for trend analytics. |
| **Reports & Analytics** | Cash flow, spending velocity, monthly savings rate | Deterministic aggregations computed via SQL + domain math. |
| **AI Assistant / Financial Advisor** | Natural language analysis of financial position | Pure read-only advisor querying structured domain aggregates. |

---

## 3. Financial System Engineering Invariants

### 3.1 Integer-Paise Standard
All monetary amounts are strictly represented in the database and in code as integer integers representing **paise** (`1 INR = 100 paise`).
- ₹1,500.50 is stored as `150050`.
- Multiplication and division (e.g. tax, interest, amortisation) round explicitly using bankers' rounding (round-half-to-even) or strict financial rounding (`Math.round`).
- Direct floating point numbers (e.g. `0.1 + 0.2`) are strictly prohibited in domain math.

### 3.2 Transaction-Safe Ledger Approach
A transaction in Finora is recorded as an immutable ledger movement:
- **Income Transaction**: Credit to user's Asset Account (increases balance), Source: External Income Entity.
- **Expense Transaction**: Debit from user's Asset Account (decreases balance), Sink: Expense Category.
- **Transfer Transaction**: Debit from Source Account, Credit to Destination Account. Net change to user's overall liquidity is zero. Transfers DO NOT alter Income or Expense metrics.
- **Reversal & Deletion**: Deleting or editing a transaction performs an atomic recalculation of account balances within a single database transaction.

### 3.3 Safe-to-Spend Computation Model
The Safe-to-Spend figure answers: *"How much can I spend right now without failing any upcoming financial obligations before my next salary?"*

$$\text{Safe to Spend} = \text{Total Liquid Balance} - \text{Committed Bills \& EMIs (Due before Next Payday)} - \text{Minimum Emergency Reserve}$$

Where:
- $\text{Total Liquid Balance} = \sum (\text{Bank Balances} + \text{Cash Wallets}) - \text{Uncleared Credit Card Balances}$
- $\text{Committed Bills} = \sum (\text{Recurring Bills} + \text{Loan EMIs} + \text{Planned Savings}) \text{ occurring in } [t_{\text{now}}, t_{\text{next\_salary}}]$
- $\text{Daily Safe Velocity} = \frac{\text{Safe to Spend}}{\text{Days Remaining until Next Salary}}$

---

## 4. Layered Code Organization

```
apps/api/src/
├── domain/                    # Symlinked or imported from packages/domain
├── controllers/               # Express / HTTP route handlers
│   ├── account.controller.ts
│   ├── transaction.controller.ts
│   ├── budget.controller.ts
│   ├── loan.controller.ts
│   └── dashboard.controller.ts
├── services/                  # Business logic workflows
│   ├── account.service.ts
│   ├── transaction.service.ts
│   ├── safe-to-spend.service.ts
│   └── dashboard.service.ts
├── repositories/              # Database access with ACID guarantees
│   ├── account.repository.ts
│   ├── transaction.repository.ts
│   ├── budget.repository.ts
│   └── user.repository.ts
├── database/                  # Connection pool, migrations, seed data
│   ├── db.ts
│   ├── schema.sql
│   └── seed.ts
├── middleware/                # Validation, authentication, logging, error handling
│   ├── validate.ts            # Zod validation middleware
│   ├── auth.ts                # Session / API user context
│   ├── error-handler.ts       # Centralized error translator
│   └── logger.ts              # Structured JSON request logger
└── server.ts                  # App bootstrap
```

---

## 5. Security & Multi-Tenant Data Isolation

1. **User Identity Boundary**: Every SQL query filtering financial entities includes `WHERE user_id = ?`. Repository methods accept a typed `UserId` extracted solely from verified session context.
2. **Input Sanitization**: Request bodies, route parameters, and query strings are validated via Zod schemas before reaching the service layer.
3. **No Sensitive Banking Credentials**: Finora does not store banking netbanking passwords or PINs. Account numbers are masked, displaying only the last 4 digits (e.g. `HDFC Bank ••4821`).
4. **Structured Auditing**: Every write operation (Create, Update, Delete) is logged with timestamp, user ID, entity type, and operation result.

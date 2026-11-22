# Artha Product Roadmap & Implementation Milestones

This roadmap tracks engineering deliverables against the **Institutional Fintech Product Design & System Engineering Quality Mandate**.

---

## Milestone 1: Engineering Foundation & Architecture Standard
- [x] Create project documentation (`README.md`, `ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `DATABASE.md`, `API.md`)
- [x] Author core Architecture Decision Records (`ADR/0001` through `ADR/0004`)
- [x] Initialize monorepo workspace structure (`packages/domain`, `apps/api`, `apps/web`)
- [x] Implement `packages/domain`:
  - [x] Integer-paise `Money` value object with strict integer math & rounding
  - [x] Safe-to-Spend calculator domain service
  - [x] Loan EMI amortization calculator
  - [x] Budget variance & velocity calculator
  - [x] Zod contracts and domain interfaces
  - [x] Exhaustive unit test suite for domain math (16 unit tests passing)
- [x] Configure strict TypeScript (`strict: true`, no `any`) and formatting rules across workspaces

---

## Milestone 2: Backend Architecture & ACID Ledger (apps/api)
- [x] SQLite database setup with WAL mode, foreign keys, and migration runner
- [x] Database schema DDL deployment (`users`, `accounts`, `categories`, `transactions`, `budgets`, `recurring_obligations`, `salary_profiles`, `loans`, `investments`, `net_worth_snapshots`)
- [x] Repository Layer with atomic database transactions:
  - [x] `AccountRepository`
  - [x] `TransactionRepository` (ledger consistency, transfer neutrality)
  - [x] `BudgetRepository`
  - [x] `LoanRepository`
  - [x] `ObligationRepository`
- [x] Application / Service Layer:
  - [x] `TransactionService` (atomic create, update, delete with balance rollbacks)
  - [x] `DashboardService` (answers the 5 core financial questions)
  - [x] `CategorySuggestionService` (smart merchant/description heuristics)
  - [x] `SafeToSpendService` (daily velocity, pay cycle obligations)
- [x] Controller & API Layer:
  - [x] Zod schema request validation middleware
  - [x] Centralized error handling & structured logging middleware
  - [x] RESTful routes (`/api/v1/dashboard`, `/api/v1/transactions`, `/api/v1/accounts`, `/api/v1/budgets`, `/api/v1/loans`, `/api/v1/categories`, `/api/v1/reports`, `/api/v1/onboarding`)
- [x] Seed script with realistic institutional dummy data for instant verification

---

## Milestone 3: Design System & Web Application (apps/web)
- [x] Setup Vite + React 19 / TypeScript + Tailwind CSS
- [x] Implement Artha Design Tokens in Tailwind:
  - [x] Color tokens (Surfaces, Borders, Brand Midnight/Cobalt, Income Emerald, Expense Crimson, Neutral Slate)
  - [x] Tabular numerical styling (`font-feature-settings: 'tnum'`)
  - [x] 8-point spatial grid
- [x] Reusable Design System Primitives:
  - [x] `Button` (sm, md, lg with focus rings)
  - [x] `Input` & `AmountInput` (currency lock, auto-formatting)
  - [x] `Card` & `MetricCard` (restrained borders, no flashy gradients)
  - [x] `Badge` (semantic income `+`, expense `-`, transfer `⇄`)
  - [x] `Modal` (accessible focus trap, ESC key support)
  - [x] Category squircle stroke icons (Lucide, zero emojis)
- [x] User Journeys & Screen Implementation:
  - [x] **Journey A (First-time User)**: Frictionless 3-step onboarding flow
  - [x] **Journey B (Record an Expense)**: Ultra-fast Quick-Add modal with automatic category detection & 'E' keyboard shortcut
  - [x] **Journey C (Understand Financial Health)**: Artha Hero Dashboard answering the 5 core questions
  - [x] **Transactions Screen**: Filterable, searchable, paginated ledger with delete and balance rollbacks
  - [x] **Accounts Screen**: Bank, cash, credit card, and liability management
  - [x] **Budgets Screen**: Monthly progress bars, category caps, variance alerts
  - [x] **Loans & Debt Screen**: Outstanding balance, EMI calculation, amortization visualization
  - [x] **Net Worth & Reports Screen**: Assets vs Liabilities, Cash Flow analysis
- [x] Responsive optimization across 360px, 390px, 768px, 1024px, 1440px
- [x] Dark Mode and Light Mode theme toggle with persistent preference

---

## Milestone 4: Verification & Quality Assurance
- [x] Automated domain math unit tests passing (16/16 tests)
- [x] API integration tests passing (5/5 tests, verifying transfer neutrality and atomic balance rolls)
- [x] Production web asset compilation verified (`vite build` succeeded with zero errors)
- [x] Accessibility audit (keyboard shortcuts, aria labels, color contrast ratios)
- [x] Documentation complete (`README.md`, `ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `DATABASE.md`, `API.md`, `CHANGELOG.md`, `ADR/0001` - `0004`)

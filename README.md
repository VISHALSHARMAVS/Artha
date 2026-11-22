# Finora — Intelligent Financial Operating System

Finora is a disciplined, high-precision personal finance operating system engineered for individuals, founders, and professionals who demand clarity, financial accuracy, and visual calm over vanity metrics and chaotic charts.

Finora is built according to the **Finora Product Design & System Engineering Quality Mandate** — adhering strictly to institutional fintech standards, double-entry transactional safety, integer-paise precision, and modern interface ergonomics inspired by Fold Money, Linear, Monzo, Revolut, Apple Wallet, and Stripe.

---

## Core Financial Philosophy

1. **Precision First**: Financial amounts are stored and computed in **integer paise** (`1 INR = 100 paise`). No JavaScript floating-point arithmetic errors occur in balances, ledgers, or aggregations.
2. **Transaction-Safe Ledger**: Account transfers are neutral movements between assets/liabilities; they never distort income or expense metrics.
3. **The 5 Instant Answers**: Finora's core dashboard answers the five fundamental financial questions at a single glance:
   - *How much money do I currently have?* (Liquid & Net Available Assets)
   - *How much did I earn this month?* (Realized Income MTD)
   - *How much did I spend this month?* (Realized Expenses MTD)
   - *What payments are coming up?* (Upcoming EMIs, Bills, Subscriptions)
   - *How much can I safely spend?* (Safe-to-Spend formula accounting for commitments & buffer)
4. **Calm, High-Density Ergonomics**: No AI-generated decorative clutter, random gradients, or emoji category icons. Strict typography with tabular numerals (`font-feature-settings: 'tnum'`), 8pt grid spacing, and semantic design tokens.

---

## Architecture Overview

Finora is structured as a modular monorepo:

```
MoneyTracker/
├── apps/
│   ├── api/                      # Modular backend API (Express / Node.js + SQLite / ACID Ledger)
│   │   ├── src/
│   │   │   ├── controllers/      # API / Controller Layer (HTTP, status codes, Zod schema validation)
│   │   │   ├── services/         # Application / Service Layer (Use-cases, orchestration)
│   │   │   ├── repositories/     # Repository / Data Access Layer (ACID transactions, DB persistence)
│   │   │   ├── middleware/       # Auth context, error handling, structured logging, request validation
│   │   │   ├── routes/           # RESTful modular route definitions
│   │   │   └── server.ts         # Server bootstrap and lifecycle
│   │   └── tests/                # Integration and API route tests
│   │
│   └── web/                      # High-performance client (React + Vite + Tailwind CSS + Lucide)
│       ├── src/
│       │   ├── components/       # Design system primitives & composite UI components
│       │   ├── design-system/    # Design tokens, typography, spacing, themes
│       │   ├── features/         # Domain-driven feature screens (Dashboard, Transactions, Accounts, Budgets, Loans, Analytics)
│       │   ├── hooks/            # Reactive state, keyboard shortcuts, query state
│       │   ├── lib/              # Formatting (INR currency, dates, tabular math, API client)
│       │   └── App.tsx           # Router and application layout
│       └── tailwind.config.js    # Design token integration
│
├── packages/
│   └── domain/                   # Pure TypeScript financial domain engine (Zero external runtime dependencies)
│       ├── src/
│       │   ├── money.ts          # Integer-paise Money value object and arithmetic operations
│       │   ├── ledger.ts         # Double-entry ledger logic and balance reconciliations
│       │   ├── safe-to-spend.ts  # Safe-to-Spend calculation engine
│       │   ├── loan.ts           # Loan EMI amortization & debt schedule calculator
│       │   ├── budget.ts         # Budget burn-rate & variance analyzer
│       │   └── schemas.ts        # Canonical Zod schemas & TypeScript types
│       └── tests/                # Exhaustive unit tests for all domain math
│
├── ADR/                          # Architecture Decision Records
├── ARCHITECTURE.md               # Detailed layered architecture specification
├── DESIGN_SYSTEM.md              # Design tokens, typography, component rules
├── DATABASE.md                   # Database schema, foreign keys, indexes, and constraints
├── API.md                        # RESTful API specifications and schemas
├── ROADMAP.md                    # Implementation roadmap and status
└── CHANGELOG.md                  # Detailed chronological audit of changes
```

---

## Getting Started

### Prerequisites

- **Node.js**: `v20.0.0` or higher (`v24.6.0` recommended)
- **npm**: `v10.0.0` or higher

### Installation

```bash
# Clone the repository
git clone <repo-url> Finora
cd Finora

# Install dependencies across all workspaces
npm install
```

### Development

```bash
# Run tests across all packages
npm test

# Run backend API server (port 3001)
npm run dev --workspace=apps/api

# Run frontend client (port 5173)
npm run dev --workspace=apps/web
```

---

## Documentation Links

- [System Architecture](ARCHITECTURE.md)
- [Design System & UI Tokens](DESIGN_SYSTEM.md)
- [Database Schema & Constraints](DATABASE.md)
- [REST API Specifications](API.md)
- [Architecture Decision Records (ADR)](ADR/)
- [Project Roadmap](ROADMAP.md)
- [Changelog](CHANGELOG.md)

---

## License

Proprietary — All rights reserved. Finora Fintech Systems.

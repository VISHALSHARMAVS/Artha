# ADR 0003: Transaction-Safe Double-Entry Ledger Principles

## Status
Accepted

## Context
In basic budget apps, moving money between a checking account and a savings account is frequently recorded as an "Expense" and an "Income", causing wildly inflated monthly spend and income numbers. Furthermore, editing or deleting past transactions often leaves account balances out of sync with the underlying transaction history.

## Decision
Artha enforces a transaction-safe ledger model:
1. **Transfer Neutrality**:
   - Transfers between user accounts (`source_account_id` -> `destination_account_id`) are classified as type `TRANSFER`.
   - Transfers update source balance (`-amount_paise`) and destination balance (`+amount_paise`) atomically inside a database transaction.
   - Transfers have zero effect on Monthly Income, Monthly Expense, and Net Cash Flow metrics.
2. **Atomic Updates & Reversals**:
   - Creating, editing, or deleting a transaction is executed inside an ACID SQLite transaction (`BEGIN TRANSACTION` ... `COMMIT`).
   - If an existing transaction is updated (e.g. amount altered from ₹1,000 to ₹1,500), the prior ledger impact is reversed and the new impact is applied in the same atomic block.
3. **Auditability**:
   - Transactions cannot be orphaned; deletion cascades or restricts according to relational foreign key policies.

## Consequences
- **Positive**: Complete financial accuracy. Users can transfer money between their accounts without corrupting budget trackers or cash flow metrics.
- **Negative**: Requires careful relational modeling and multi-step SQL queries wrapped in transactions.

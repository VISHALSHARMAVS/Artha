# ADR 0001: Record Financial Amounts in Integer Paise

## Status
Accepted

## Context
Standard IEEE 754 floating-point numbers in JavaScript (`number` type) suffer from precision issues when performing decimal arithmetic (e.g. `0.1 + 0.2 === 0.30000000000000004`). In financial systems, even microscopic rounding discrepancies accumulate over time, leading to balance mismatches, broken reconciliation, and loss of institutional trust.

## Decision
All monetary values across the database, domain models, network payloads, and internal calculations shall strictly use **64-bit integer values representing paise** (where `1 INR = 100 paise`).

Key rules:
1. Databases store amounts as integer columns (`amount_paise INTEGER NOT NULL`).
2. Domain logic operations (addition, subtraction, multiplication, division) operate on integer paise.
3. Conversions between human-readable decimal representations (e.g. `"1500.50"`) and paise (`150050`) occur strictly at the boundaries (UI inputs/outputs and API payload deserialization/serialization).
4. Interest and tax rates use explicit rounding strategies (`Math.round` or bankers' rounding) defined in `packages/domain/money.ts`.

## Consequences
- **Positive**: Absolute mathematical determinism. Zero floating-point rounding bugs. Clean database comparisons and index efficiency.
- **Negative**: Developers must remember not to divide or multiply by 100 arbitrarily inside core logic; all monetary operations must route through the `Money` domain utility.

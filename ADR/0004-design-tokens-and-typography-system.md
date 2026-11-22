# ADR 0004: Design Tokens, Typography, and Tabular Numeral System

## Status
Accepted

## Context
Many modern AI-generated or "vibe-coded" financial apps suffer from inconsistent typography, excessive glassmorphism, random multi-color gradients, emoji icons for serious financial categories, and proportional numbers that jitter and misalign in tables.

## Decision
Finora establishes a strict design token and typography standard:
1. **Typography**:
   - Primary typeface: `Inter` sans-serif.
   - All numerical data (currency, percentages, dates, metric counts) MUST use tabular numerals (`font-feature-settings: 'tnum' 1, 'cv05' 1, 'cv11' 1; font-variant-numeric: tabular-nums`).
   - Standard Indian Number System formatting (`en-IN`), e.g., `₹1,23,456.00`.
2. **Design Tokens**:
   - Centralized semantic color variables for brand, surfaces, borders, and financial states.
   - Strictly no emojis for financial categories. All categories use monochrome, 16px/20px geometric stroke icons from Lucide.
   - Distinct non-color signifiers for financial movements: positive `+` sign for income with upward arrow, negative `-` sign for expense with downward arrow, bidirectional arrow `⇄` for transfers.
3. **8-Point Spatial Grid**:
   - Spacing adheres to multiples of 4px and 8px (4, 8, 12, 16, 24, 32, 48).

## Consequences
- **Positive**: Cohesive, calm, trustworthy fintech user experience on par with Fold Money, Stripe Dashboard, and Linear.
- **Negative**: Requires discipline when creating UI components; arbitrary Tailwind arbitrary values (e.g. `p-[17px]`) are forbidden.

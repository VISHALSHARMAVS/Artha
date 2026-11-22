# Finora Design System Specification (v1.0.0)

Finora's design system is engineered for financial clarity, visual tranquility, and high information density. It draws inspiration from the utility and elegance of Fold Money, Linear, Monzo, Stripe Dashboard, and Apple Wallet.

---

## 1. Core Principles

1. **Restraint over Decoration**: No unnecessary gradients, glassmorphism, floating orbs, or arbitrary shadows. Every pixel must communicate financial meaning.
2. **Semantic Distinction**: Income and expenses must be distinguishable by multiple visual signifiers (directional sign `+` / `-`, typography weight, semantic badges, and iconography) rather than relying solely on color.
3. **Tabular Precision**: All numerical amounts use tabular figures (`tnum`) with monospaced digit widths so that columns of numbers line up cleanly.
4. **Predictable Geometry**: All components strictly align to an 8-point spatial grid with a standard 4-point subgrid.
5. **Calm, High-Contrast Readability**: Dark and light modes are calibrated for WCAG AAA compliance on critical financial data and WCAG AA on secondary metadata.

---

## 2. Color Palette & Semantic Tokens

### Color Tokens (Hex / CSS Variables)

```css
:root {
  /* Brand Tokens */
  --brand-primary: #0F172A;          /* Deep Slate / Midnight */
  --brand-primary-hover: #1E293B;
  --brand-secondary: #2563EB;        /* Institutional Cobalt */
  --brand-secondary-hover: #1D4ED8;
  --brand-accent: #3B82F6;

  /* Surfaces & Backgrounds */
  --bg-app: #F8FAFC;                 /* Canvas background */
  --bg-surface: #FFFFFF;             /* Cards, modules, panels */
  --bg-surface-elevated: #F1F5F9;    /* Dropdowns, tooltips, nested cards */
  --bg-surface-subtle: #F8FAFC;      /* Table headers, subtle containers */
  --bg-overlay: rgba(15, 23, 42, 0.4);

  /* Typography Colors */
  --text-primary: #0F172A;          /* Primary financial figures & headings */
  --text-secondary: #475569;        /* Supporting text, dates, subheadings */
  --text-tertiary: #94A3B8;         /* Micro-copy, metadata, placeholders */
  --text-inverse: #FFFFFF;

  /* Borders & Dividers */
  --border-subtle: #E2E8F0;          /* Dividers, card strokes */
  --border-medium: #CBD5E1;          /* Input borders, active states */
  --border-focus: #2563EB;           /* Keyboard focus ring */

  /* Semantic Financial Indicators */
  --color-income: #059669;           /* Realized Inflow (Emerald) */
  --color-income-subtle: #ECFDF5;
  --color-expense: #DC2626;          /* Realized Outflow (Crimson) */
  --color-expense-subtle: #FEF2F2;
  --color-transfer: #475569;         /* Neutral balance movement */
  --color-transfer-subtle: #F1F5F9;
  
  /* System Feedback */
  --color-success: #16A34A;
  --color-success-bg: #F0FDF4;
  --color-warning: #D97706;          /* Looming bill / budget limit warning */
  --color-warning-bg: #FFFBEB;
  --color-error: #DC2626;
  --color-error-bg: #FEF2F2;
  --color-info: #2563EB;
  --color-info-bg: #EFF6FF;
}

/* Dark Theme Tokens */
[data-theme="dark"] {
  --brand-primary: #FFFFFF;
  --brand-primary-hover: #F1F5F9;
  --brand-secondary: #3B82F6;
  --brand-secondary-hover: #60A5FA;
  --brand-accent: #60A5FA;

  --bg-app: #090D16;
  --bg-surface: #111827;
  --bg-surface-elevated: #1F2937;
  --bg-surface-subtle: #161F30;
  --bg-overlay: rgba(0, 0, 0, 0.7);

  --text-primary: #F9FAFB;
  --text-secondary: #9CA3AF;
  --text-tertiary: #6B7280;
  --text-inverse: #0F172A;

  --border-subtle: #1F2937;
  --border-medium: #374151;
  --border-focus: #3B82F6;

  --color-income: #10B981;
  --color-income-subtle: rgba(16, 185, 129, 0.12);
  --color-expense: #F87171;
  --color-expense-subtle: rgba(248, 113, 113, 0.12);
  --color-transfer: #9CA3AF;
  --color-transfer-subtle: #1F2937;

  --color-success: #22C55E;
  --color-success-bg: rgba(34, 197, 94, 0.12);
  --color-warning: #F59E0B;
  --color-warning-bg: rgba(245, 158, 11, 0.12);
  --color-error: #EF4444;
  --color-error-bg: rgba(239, 68, 68, 0.12);
  --color-info: #3B82F6;
  --color-info-bg: rgba(59, 130, 246, 0.12);
}
```

---

## 3. Typography Scale & Numerical Rules

### Typeface
- **Primary Typeface**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif`.
- **Numerical Feature Setting**: All monetary values and metrics MUST specify:
  ```css
  font-feature-settings: "tnum" 1, "cv05" 1, "cv11" 1;
  font-variant-numeric: tabular-nums;
  ```

### Type Scale

| Role | Font Size | Line Height | Weight | Letter Spacing | Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `display-lg` | 32px (2rem) | 40px | 600 (Semibold) | -0.02em | Net Worth, Primary Balance Hero |
| `display-md` | 24px (1.5rem) | 32px | 600 (Semibold) | -0.015em | Top-level KPI cards, Section Totals |
| `heading-lg` | 20px (1.25rem) | 28px | 600 (Semibold) | -0.01em | Screen headers, Modal titles |
| `heading-md` | 16px (1rem) | 24px | 600 (Semibold) | -0.005em | Card headers, table section titles |
| `body-md` | 14px (0.875rem) | 20px | 400 (Regular) | 0 | Standard UI copy, table rows, form inputs |
| `body-sm` | 13px (0.8125rem) | 18px | 400 (Regular) | 0 | Secondary metadata, dates, descriptions |
| `caption` | 11px (0.6875rem) | 16px | 500 (Medium) | +0.02em | Badges, tags, column headers, micro-labels |

### Currency & Decimal Formatting Rules
- Symbol: `₹` (Indian Rupee), formatted as `₹1,23,456.00` according to the Indian numerical system (`en-IN`), or `₹1,23,456` when decimals are zero in summary cards.
- Negative amounts: Placed as `-₹450.00` or `(₹450.00)`. Never write `₹-450.00`.
- Income amounts: Placed as `+₹5,000.00` with positive sign prefix and green badge indicator.
- Neutral transfers: Displayed with no plus/minus sign, e.g. `₹10,000.00`, paired with a double-ended arrow icon `⇄`.

---

## 4. Spacing System (8pt Grid)

| Token | Pixels | Application |
| :--- | :--- | :--- |
| `space-1` | 4px | Micro-spacing, icon-to-label gaps, badge padding |
| `space-2` | 8px | Button inline gaps, input padding vertical, tight list items |
| `space-3` | 12px | Compact card padding, standard gap in flex groups |
| `space-4` | 16px | Default card padding, form field vertical margin, modal body gaps |
| `space-6` | 24px | Large card padding, section separators, dashboard grid gaps |
| `space-8` | 32px | Screen section margins, hero header vertical spacing |
| `space-12` | 48px | Screen-level outer gutters on desktop |

---

## 5. Component Standards & Metrics

### Buttons
- **Height**:
  - `sm`: 32px (Header quick actions, filter pills)
  - `md`: 40px (Default form buttons, table row actions)
  - `lg`: 48px (Primary onboarding CTA, full-width modal submissions)
- **Border Radius**: 6px (`rounded-md`) for refined institutional feel. No pill buttons except for filter tags.
- **Typography**: 14px, Font Weight 500 (`font-medium`).
- **Focus State**: 2px solid offset outline (`ring-2 ring-brand-secondary ring-offset-2`).

### Inputs & Form Fields
- **Height**: 40px (`h-10`)
- **Border**: 1px solid `var(--border-subtle)`
- **Border Radius**: 6px
- **Padding**: 8px 12px
- **Typography**: 14px Regular
- **Amount Inputs**: Large hero inputs use 24px/32px font with automatic currency prefix symbol locked to the left.

### Cards & Containers
- **Border Radius**: 8px (`rounded-lg`)
- **Border**: 1px solid `var(--border-subtle)`
- **Shadow**: Subtle elevation only (`0 1px 3px 0 rgba(0, 0, 0, 0.04)`), no glowing drop shadows.
- **Padding**:
  - Compact: 16px
  - Default: 20px
  - Hero KPI: 24px

### Financial Category Icons
- **Strict Rule**: No emojis (e.g. 🍔, 🚗) as primary category icons.
- **Standard**: Clean, stroke-based 16px/20px monochrome icons (from Lucide: `Utensils`, `Car`, `Home`, `HeartPulse`, `Briefcase`, `ShieldCheck`, `TrendingUp`, `Wallet`).
- Encapsulated in a 32x32px rounded squircle with subtle tinted background (`bg-slate-100 dark:bg-slate-800`).

### Table Rows
- **Height**: 48px standard row height
- **Hover**: `bg-slate-50 dark:bg-slate-800/50`
- **Cell Alignment**: Text left-aligned; Dates left-aligned; Numbers & Currency right-aligned.

---

## 6. Responsive Breakpoints

| Breakpoint | Minimum Width | Target Devices | Layout Behavior |
| :--- | :--- | :--- | :--- |
| `mobile-sm` | 360px | Compact Android devices | Single column, stacked KPIs, bottom navigation bar |
| `mobile-md` | 390px | Modern iPhones & flagships | Single column, full-width cards, optimized touch targets |
| `tablet` | 768px | iPads & tablets | 2-column KPI grid, collateral sidebar toggleable |
| `laptop` | 1024px | Laptops / Desktop | Persistent left navigation sidebar, 3-column dashboard |
| `desktop` | 1440px | High-res monitors | Max content width constrained to 1320px with centered margin |

---

## 7. Prohibited Patterns Checklist

- [x] NO multi-colored gradient backgrounds on dashboard cards.
- [x] NO 24px+ border-radius rounded bubbles.
- [x] NO emoji icons for banking or transaction categories.
- [x] NO arbitrary floating glassmorphism blur effects.
- [x] NO fake unlinked mock charts.
- [x] NO disabled placeholder buttons that deceive the user.
- [x] NO floating point rounding discrepancies in table columns.

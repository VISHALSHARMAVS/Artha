# Changelog

All notable changes to the Artha platform are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and adheres to Semantic Versioning.

---

## [1.0.0] - 2026-11-22

### Changed
- **Brand Identity Evolution**: Transitioned product branding to **Artha** (अर्थ) — representing purposeful wealth, disciplined financial control, and institutional clarity.

### Added
- **Core Product Mandate Enforcement**: Established institutional fintech quality standards in alignment with the Product Design & System Engineering Mandate.
- **Architectural Specification (`ARCHITECTURE.md`)**: Detailed 4-layer architecture (API/Controller, Service/Application, Domain, Repository) and 13 autonomous modules.
- **Design System Tokens (`DESIGN_SYSTEM.md`)**: Full color tokens, typography scale with tabular numerals (`tnum`), 8pt spatial grid, and prohibited anti-patterns checklist.
- **Database Schema Specification (`DATABASE.md`)**: Relational DDL specifications for 10 entities in integer paise, foreign key constraints, indexes, and ACID guarantees.
- **RESTful API Specification (`API.md`)**: Contract definitions for dashboard overview, accounts, transactions, quick-add heuristics, budgets, and loans.
- **Architecture Decision Records (`ADR/`)**:
  - `ADR-0001`: Integer-paise financial precision standard.
  - `ADR-0002`: Layered modular monolith architecture.
  - `ADR-0003`: Transaction-safe double-entry ledger.
  - `ADR-0004`: Design tokens, typography, and tabular numeral system.

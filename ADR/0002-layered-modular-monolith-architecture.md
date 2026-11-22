# ADR 0002: Layered Modular Monolith Architecture

## Status
Accepted

## Context
Fintech applications often fail due to tight coupling between UI components and backend queries, or between HTTP controllers and raw SQL queries. Mixing financial balance updates with UI state or controller request handling prevents automated testing, obscures business rules, and leads to accidental double-spending or corrupt ledgers.

## Decision
Artha adopts a **Clean Layered Modular Monolith** architecture:
1. **Domain Layer (`packages/domain`)**: Contains pure TypeScript domain logic (Money value object, Safe-to-Spend formula, EMI calculator, Budget calculations). Has zero runtime dependencies, zero database awareness, and zero UI imports.
2. **Repository Layer (`apps/api/src/repositories`)**: Encapsulates all SQL execution, foreign key constraints, and transactional consistency.
3. **Application / Service Layer (`apps/api/src/services`)**: Orchestrates business use-cases, coordinating across multiple repositories and invoking domain calculations.
4. **API / Controller Layer (`apps/api/src/controllers`)**: Translates HTTP requests, runs Zod schema validation, enforces session identity, and formats HTTP responses.
5. **Presentation Layer (`apps/web`)**: React client consuming RESTful APIs, implementing design system primitives, and providing responsive user journeys.

## Consequences
- **Positive**: Strict separation of concerns, high testability (domain layer can be tested with 100% code coverage without spinning up databases), maintainable code that avoids spaghetti logic.
- **Negative**: Slightly more boilerplate code per feature (requires DTO, Repository, Service, and Controller).

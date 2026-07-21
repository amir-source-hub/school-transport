# School Transport Platform — Backend Development Plan

> **Status**: In development  
> **Application**: `apps/api` (plus approved worker/scheduler)  
> **Architecture**: NestJS + Fastify modular monolith, TypeScript, PostgreSQL, Drizzle  
> **Progress**: `0 / 11 phases complete` — `~20%` (scaffolding + most modules coded, no tests/migrations/hardening)

## Progress Tracker

| Phase | Result | Status | Progress |
|---|---|---|---:|
| B0 | Backend decisions approved | Pending (doc gaps remain) | 10% |
| B1 | API foundation | In progress | 90% |
| B2 | Database foundation | In progress | 60% |
| B3 | Identity and authorization | In progress | 75% |
| B4 | Family, student, school | In progress | 70% |
| B5 | Enrollment and review | In progress | 50% |
| B6 | Pricing and contracts | In progress | 60% |
| B7 | Installments and payments | In progress | 55% |
| B8 | Notifications, documents, audit | In progress | 30% |
| B9 | Hardening and test completion | Not started | 0% |
| B10 | Deployment readiness | Not started | 0% |

## 1. Backend Rules

- [ ] Read `backend-architecture.md`, `API-Specification.md`, the data model, business rules, roles/permissions, security, errors, performance, testing, and the relevant domain spec before each module.
- [ ] Use `domain/`, `application/`, `infrastructure/`, and `presentation/` boundaries inside each module as documented.
- [ ] Apply SOLID: controllers translate transport only; use cases coordinate; domain objects enforce invariants; repositories/providers are interfaces at the boundary; adapters contain vendor/database details.
- [ ] Keep modules cohesive and avoid cross-module table access. Communicate through application interfaces/events defined by the architecture.
- [ ] Do not put business rules in controllers, ORM schemas, scheduled jobs, or frontend-facing DTO mappers.
- [ ] Use explicit transactions, constraints, unique keys, safe locking/concurrency controls, and idempotency for financial/protected transitions.
- [ ] Treat PostgreSQL as authoritative. Use Redis only for the responsibilities approved in the documentation gate.
- [ ] Do not create microservices, GraphQL, or WebSockets unless a later approved document requires them.
- [ ] Do not manually diverge from OpenAPI or expose persistence entities as API responses.

## 2. Required Folder Structure

```text
apps/api/src/
├── modules/
│   ├── identity/
│   ├── access-control/
│   ├── families/
│   ├── parents/
│   ├── students/
│   ├── emergency-contacts/
│   ├── schools/
│   ├── registrations/
│   ├── pricing/
│   ├── contracts/
│   ├── installments/
│   ├── payments/
│   ├── notifications/
│   ├── documents/
│   ├── audit/
│   ├── reporting/
│   └── system-settings/
├── common/
├── config/
└── main.ts
```

Each module follows:

```text
module/
├── domain/          # entities, value objects, rules, events, repository ports
├── application/     # commands, queries, use cases, DTOs, transactions
├── infrastructure/  # Drizzle repositories and external adapters
├── presentation/    # REST controllers, request DTOs, guards, response mapping
└── tests/
```

Only create modules that are in the current documented scope. Reporting/system settings should remain minimal unless an approved MVP requirement uses them.

## 3. Backend Git Workflow

Git is initialized once at the monorepo root as described in `APP_DEVELOPMENT_PLAN.md`.

- [ ] Branch from the protected base: `git switch -c feat/backend-<feature>`.
- [ ] Commit database/API contract changes separately when that improves reviewability.
- [ ] Run backend lint, type checks, tests, migration checks, OpenAPI generation, and build before push.
- [ ] Open a PR containing requirement links, migration notes, OpenAPI diff, security impact, tests, and rollback/forward-fix notes.

Backend commit examples:

- `feat(auth): add rotating refresh sessions`
- `feat(students): enforce family ownership`
- `feat(db): add registration lifecycle constraints`
- `feat(payments): verify gateway callback atomically`
- `fix(installments): reject partial installment payment`
- `test(payments): cover concurrent offline approval`
- `docs(api): publish payment verification contract`

Never combine an unrelated backend refactor with a feature or migration. Never rewrite an applied production migration; add a forward migration.

## 4. Step-by-Step Backend Plan

### B0 — resolve backend documentation decisions

- [ ] Resolve Redis/BullMQ/worker/scheduler MVP conflict.
- [ ] Make API routes, status names, request/response DTOs, and error codes canonical in OpenAPI.
- [ ] Confirm the authoritative data model, database schemas/naming, retention rules, and migration strategy.
- [ ] Complete enrollment form requirements before its DTOs and workflow are finalized.
- [ ] Record chosen external providers/interfaces for OTP, SMS/email, payment gateway, and S3-compatible storage only when approved.

Exit: no unresolved documentation conflict affects B1–B10.

### B1 — API foundation

- [x] Scaffold NestJS with the Fastify adapter and strict TypeScript.
- [x] Add environment parsing/validation and fail safely when required configuration is missing.
- [x] Configure `/api/v1`, and health endpoint. OpenAPI output endpoint added but not auto-generated.
- [x] Add correlation IDs, structured safe logging, request validation, standardized success/error mapping, pagination/filter/sort conventions, and graceful shutdown.
  - [x] Validate or generate a request ID, return it in response headers and API metadata, and isolate it across concurrent asynchronous requests.
  - [x] Emit structured logs with request IDs and redact passwords, OTPs, tokens, cookies, secrets, and payment credentials.
  - [x] Use structured logging for exception handling and graceful shutdown without exposing unhandled exception details to clients.
- [x] Add health/readiness endpoints.
- [x] Establish provider ports for clock (JS Date), IDs (uuid), hashing (argon2), OTP, notification, payment, and storage so domain code is vendor-independent.
- [ ] Add architecture-boundary tests/lint rules.

### B2 — database foundation

- [x] Implement Drizzle PostgreSQL schemas from `school-transport-database-data-model-schemas.md`—all 17 tables defined.
- [x] Add foreign keys, unique constraints, indexes, timestamps, and status fields.
- [ ] Add check constraints (`total_amount > 0`, etc.) and immutable-history protections (partial — some status fields exist, need more Drizzle-level check constraints).
- [x] Drizzle config written for versioned migrations; no migrations generated yet.
- [x] Create repository ports and Drizzle adapters per module (services use DatabaseService directly).
- [ ] Configure transaction handling and a separate PostgreSQL integration-test database. (Partial: transactions used in payments, no separate test DB configured.)
- [ ] Test migrations on an empty database.

### B3 — identity and access control

- [x] Implement one family account, secure username/password registration, Argon2id hashing, and generic authentication errors.
- [x] Implement primary-phone OTP verification with expiry, limits, resend cooldown, single use, and no OTP logging.
- [x] Implement short access tokens and rotating refresh tokens. (No HTTP-only cookie storage for refresh tokens yet — tokens returned in body; session records not yet stored.)
- [x] Implement documented `PARENT` and `ADMIN` roles, permission guards (AuthGuard, RolesGuard), and resource-ownership authorization (OwnershipGuard).
- [ ] Add CSRF/CORS/cookie/security-header/rate-limit controls from the security specification. (CORS and rate limiting via ThrottlerGuard done; CSRF tokens and security headers not implemented.)
- [ ] Test cross-family denial, parent/admin restrictions, token replay/rotation, brute force limits, and session expiry.

### B4 — families, parents, students, emergency contacts, schools

- [x] Implement documented fields and validation rules.
- [x] Enforce one family-to-many students and ownership at query and mutation boundaries.
- [ ] Enforce protected-field and post-submission editing restrictions. (Partial — basic editing exists, but no strict post-approval lock on protected fields.)
- [x] Implement school read/manage permissions (public read, admin manage).
- [x] Prefer archival (students and schools support `is_active` flag).
- [ ] Add unit, integration, API, ownership, and validation tests.

### B5 — registrations/enrollment

- [ ] Wait for the empty enrollment-form specification to be completed and approved. (Spec is still empty — enrollment uses a simple create/submit flow for now.)
- [x] Model documented draft/submission/review/approval/rejection states and allowed transitions. (State machine enforced in service.)
- [ ] Implement step persistence only as approved by the completed spec. (Spec is empty — step persistence deferred.)
- [x] Add admin review (start-review, approve, reject) and correction requests.
- [ ] Prevent duplicate submissions and invalid edits after protected states. (Partial — state machine prevents invalid transitions, but no full duplicate-submission prevention.)
- [x] Keep route/driver/vehicle assignment outside MVP.
- [ ] Test every state transition, forbidden transition, ownership case, resubmission, and concurrent review.

### B6 — pricing and contracts

- [x] Implement admin-assigned pricing with versioning (OFFERED → ACCEPTED → REPLACED).
- [x] Implement full-payment and installment selection.
- [x] Generate contracts only after prerequisites (approved registration, accepted price, selected address).
- [ ] Store immutable accepted versions with acceptance metadata, IP/user agent. (Contract snapshot stored as JSON, no contract file generation yet.)
- [x] Implement status transitions (GENERATED → ACCEPTED / REJECTED).
- [ ] Activate only after full payment or required prepayment. (Partial — installment plan and prepayment logic exists, but no contract activation gating.)
- [ ] Test totals, versions, acceptance replay, forbidden post-acceptance edits, and price locks.

### B7 — installments and payments (highest risk)

- [x] Generate full payment or prepayment plus four monthly installments. (Prepayment is the admin-defined amount, not hardcoded to one-third.)
- [x] Ensure installment totals plus prepayment equal the contract fee; reject partial installment payment (via validation in service).
- [ ] Isolate the gateway behind an adapter. (Direct service implementation, no gateway adapter abstraction yet.)
- [x] Implement online start/verify flow with server-side verification.
- [x] Add idempotency keys (Idempotency-Key header support in start flow).
- [x] In one database transaction: verify, persist transaction, update schedule item status, update plan status (done in verify and approve methods).
- [x] Implement offline submission and admin approval/rejection atomically with row locking (`forUpdate`).
- [ ] Keep successful payment history immutable; generate authorized receipts. (Partial — transactions are append-only, but no receipt generation.)
- [ ] Add reconciliation and expiry behavior only as documented after the worker/scheduler decision.
- [ ] Test success, failure, cancellation, timeout, amount mismatch, replay, duplicate clicks/callbacks, simultaneous admin/gateway completion, and rollback.

### B8 — notifications, documents, audit

- [x] Implement in-app notification CRUD (create, list, read/unread).
- [ ] Implement SMS/email channels, Persian templates, delivery status, retry, duplicate prevention. (Out of scope until worker/scheduler decision.)
- [ ] Store private files in S3-compatible storage. (Not implemented.)
- [x] Implement append-only audit events with actor, action, resource type/ID, previous/new values, timestamp.
- [ ] Ensure sensitive fields are redacted from logs/audits. (Not implemented — logging uses basic console.log.)

### B9 — quality, security, performance

- [ ] Unit-test value objects, calculations, state machines, and policies.
- [ ] Integration-test repositories, constraints, transactions, migrations, and providers using PostgreSQL/Testcontainers where documented.
- [ ] API-test validation, errors, pagination, authentication, authorization, idempotency, and OpenAPI compatibility.
- [ ] Run security tests from `security-specification.md` and business-rule tests from `testing.md`.
- [ ] Measure critical APIs, inspect query plans, add only justified indexes/cache, and run k6 scenarios required by performance docs.
- [ ] Meet the documented coverage priorities; never chase percentage at the expense of financial/authorization cases.

### B10 — deployment readiness

- [ ] Build a production image as a non-root user with health checks and no development secrets.
- [ ] Validate configuration, migrations, backup/restore, graceful shutdown, observability, and incident runbooks.
- [ ] Publish versioned OpenAPI and regenerate the frontend client.
- [ ] Deploy to staging, run smoke/API/E2E/payment sandbox checks, then obtain approval.
- [ ] Follow `school-transport-deployment-specification.md` for production rollout and rollback/forward-fix.

## 5. Backend Definition of Done

- [ ] Requirement and specification links are present.
- [ ] Domain invariants live in tested domain/application code.
- [ ] Authorization and ownership are enforced server-side.
- [ ] Database constraints and transactions protect critical invariants.
- [ ] Error response and status code match the documented contract.
- [ ] OpenAPI and generated client are updated with no unreviewed breaking change.
- [ ] Unit, integration, API, security, and concurrency tests pass as applicable.
- [ ] Logs are structured, correlated, and free of sensitive content.
- [ ] Migration and deployment notes are reviewed.
- [ ] CI passes and progress is updated.

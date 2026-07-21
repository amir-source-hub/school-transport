# School Transport Platform — Backend Development Plan

> **Status**: In development  
> **Application**: `apps/api` (plus approved worker/scheduler)  
> **Architecture**: NestJS + Fastify modular monolith, TypeScript, PostgreSQL, Drizzle  
> **Progress**: `2 / 11 phases complete` — `~52%` (API and database foundations complete; local infrastructure, generated OpenAPI, CI definition, and worker maintenance are implemented)

## Progress Tracker

| Phase | Result | Status | Progress |
|---|---|---|---:|
| B0 | Backend decisions approved | In progress (external production providers and enrollment spec remain) | 65% |
| B1 | API foundation | Complete | 100% |
| B2 | Database foundation | Complete | 100% |
| B3 | Identity and authorization | In progress | 90% |
| B4 | Family, student, school | In progress | 80% |
| B5 | Enrollment and review | In progress | 60% |
| B6 | Pricing and contracts | In progress | 65% |
| B7 | Installments and payments | In progress | 75% |
| B8 | Notifications, documents, audit | In progress | 45% |
| B9 | Hardening and test completion | In progress | 30% |
| B10 | Deployment readiness | In progress | 65% |

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

- [x] Resolve Redis/BullMQ/worker/scheduler MVP conflict. (Approved for the development stack: PostgreSQL remains authoritative; Redis-backed BullMQ workers handle retryable background work.)
- [ ] Make API routes, status names, request/response DTOs, and error codes canonical in OpenAPI.
- [x] Confirm PostgreSQL as the authoritative data model, public schema/table naming, forward-only versioned migrations, and 30-day expired authentication-data retention.
  - [x] Define the required parent/admin session table, token-hash fields, device metadata, revocation fields, and indexes. (Automated retention cleanup remains.)
- [ ] Complete enrollment form requirements before its DTOs and workflow are finalized.
- [ ] Record chosen production providers/interfaces for OTP, SMS/email, payment gateway, and S3-compatible storage only when approved.
  - [x] Use a console OTP adapter and deterministic mock payment adapter in development only; both fail closed in production.

Exit: no unresolved documentation conflict affects B1–B10.

### B1 — API foundation

- [x] Scaffold NestJS with the Fastify adapter and strict TypeScript.
- [x] Add environment parsing/validation and fail safely when required configuration is missing.
- [x] Configure `/api/v1`, health endpoint, generated OpenAPI JSON at `/api/v1/openapi.json`, and interactive API documentation at `/api/docs`.
- [x] Add correlation IDs, structured safe logging, request validation, standardized success/error mapping, pagination/filter/sort conventions, and graceful shutdown.
  - [x] Validate or generate a request ID, return it in response headers and API metadata, and isolate it across concurrent asynchronous requests.
  - [x] Emit structured logs with request IDs and redact passwords, OTPs, tokens, cookies, secrets, and payment credentials.
  - [x] Use structured logging for exception handling and graceful shutdown without exposing unhandled exception details to clients.
- [x] Add health/readiness endpoints.
- [x] Establish provider ports for clock (JS Date), IDs (uuid), hashing (argon2), OTP, notification, payment, and storage so domain code is vendor-independent.
- [x] Add architecture-boundary tests/lint rules.
  - [x] Prevent product modules from importing another module's internals except the documented cross-cutting access-control module.
  - [x] Keep `common`, `config`, and `database` independent of product modules.
  - [x] Enforce inward dependency direction across `domain`, `application`, `infrastructure`, and `presentation` layers.

### B2 — database foundation

- [x] Implement Drizzle PostgreSQL schemas from `school-transport-database-data-model-schemas.md`—all 17 tables defined.
- [x] Add foreign keys, unique constraints, indexes, timestamps, and status fields.
- [x] Add check constraints (`total_amount > 0`, etc.) and immutable-history protections.
  - [x] Enforce documented positive/non-negative price and payment-plan amounts and the four-installment structure.
  - [x] Enforce schedule-item amount, sequence, and no-partial-payment invariants.
  - [x] Enforce unique gateway transactions and one successful transaction per schedule item.
  - [x] Add migration-level immutable accepted-price/contract, successful-payment, and append-only audit protections.
- [x] Configure Drizzle and generate the first version-controlled, forward migration.
- [x] Create repository ports and Drizzle adapters per module (services use DatabaseService directly).
- [x] Configure transaction handling and a separate PostgreSQL integration-test database.
- [x] Test migrations on an empty database. (The Docker test database migrated to all 20 tables.)

### B3 — identity and access control

- [x] Implement one family account, secure username/password registration, Argon2id hashing, and generic authentication errors.
- [x] Implement primary-phone OTP verification with expiry, limits, resend cooldown, and single use. (Development console delivery is explicitly enabled until an SMS provider is available; production fails closed.)
- [x] Implement short access tokens and rotating refresh tokens in restricted HTTP-only cookies with hashed server-side session records, per-device metadata, revocation, and reuse detection.
- [x] Implement documented `PARENT` and `ADMIN` roles, permission guards (AuthGuard, RolesGuard), and resource-ownership authorization (OwnershipGuard).
- [ ] Add CSRF/CORS/cookie/security-header/rate-limit controls from the security specification.
  - [x] Restrict credentialed CORS to configured frontend origins and required methods/headers.
  - [x] Store refresh tokens only in restricted HTTP-only, SameSite cookies with production-only `Secure` transmission.
  - [x] Validate exact configured origins/referrers on login, refresh, and logout cookie operations.
  - [x] Apply documented backend security headers and global request throttling.
    - [x] Verify CSP, frame, content-type, referrer, permissions, and production-only HSTS behavior.
  - [ ] Add account/phone/endpoint-specific authentication and OTP abuse controls. (Server-side session revocation and scheduled expired-session/OTP retention cleanup are complete.)
- [ ] Test cross-family denial, parent/admin restrictions, token replay/rotation, brute force limits, and session expiry.
  - [x] Unit-test missing/malformed/expired access tokens and reject refresh tokens at access-token boundaries.
  - [x] Unit-test parent denial on admin roles and synchronous/asynchronous ownership policy denial.
  - [ ] API-test private-resource concealment across families and students.
  - [ ] Test refresh replay/rotation, brute-force limits, and session expiry after the session persistence contract is approved.

### B4 — families, parents, students, emergency contacts, schools

- [x] Implement documented fields and validation rules.
- [x] Enforce one family-to-many students and ownership at query and mutation boundaries.
- [ ] Enforce protected-field and post-submission editing restrictions.
  - [x] Reject mass assignment of student school, national ID, ownership, status, registration, and archival fields.
  - [x] Reject mass assignment of address ownership, identity, status, and persistence fields.
  - [x] Require at least one correctly typed field from the explicit student/address edit allowlist.
  - [ ] Enforce submitted/review/correction/approved lifecycle field locks after correction-field authorization is modeled.
- [x] Implement school read/manage permissions (public read, admin manage).
- [x] Prefer archival (students and schools support `is_active` flag).
- [ ] Add unit, integration, API, ownership, and validation tests.
  - [x] Unit-test Iranian national ID normalization and checksum validation.
  - [x] Validate required student create fields and optional student update fields at the transport boundary.
  - [ ] Add PostgreSQL integration, API, and cross-family ownership tests.

### B5 — registrations/enrollment

- [ ] Wait for the empty enrollment-form specification to be completed and approved. (Spec is still empty — enrollment uses a simple create/submit flow for now.)
- [x] Model documented draft/submission/review/approval/rejection states and allowed transitions. (State machine enforced in service.)
  - [x] Model `NEEDS_CORRECTION` and allow parent resubmission only from draft or correction states.
  - [x] Require rejected registrations to remain terminal so parents create a new request as specified.
- [ ] Implement step persistence only as approved by the completed spec. (Spec is empty — step persistence deferred.)
- [x] Add admin review (start-review, approve, reject) and correction requests.
- [x] Prevent duplicate active enrollment creation for the same student/academic year and reject invalid lifecycle transitions.
- [x] Keep route/driver/vehicle assignment outside MVP.
- [ ] Test every state transition, forbidden transition, ownership case, resubmission, and concurrent review.
  - [x] Unit-test every allowed transition and reject all unspecified or unknown-status transitions.
  - [ ] Add PostgreSQL ownership, correction-resubmission, and concurrent-review integration tests.

### B6 — pricing and contracts

- [x] Implement admin-assigned pricing with versioning (OFFERED → ACCEPTED → REPLACED).
- [x] Implement full-payment and installment selection.
- [x] Generate contracts only after prerequisites (approved registration, accepted price, selected address).
- [ ] Store immutable accepted versions with acceptance metadata, IP/user agent. (Contract snapshot stored as JSON, no contract file generation yet.)
- [x] Implement status transitions (GENERATED → ACCEPTED / REJECTED).
- [ ] Activate only after full payment or required prepayment. (Partial — installment plan and prepayment logic exists, but no contract activation gating.)
- [ ] Test totals, versions, acceptance replay, forbidden post-acceptance edits, and price locks.
  - [x] Enforce family ownership when listing, reading, accepting, or rejecting contracts and when accepting prices.
  - [ ] Add PostgreSQL concurrency and immutable-version integration tests.

### B7 — installments and payments (highest risk)

- [x] Generate full payment or prepayment plus four monthly installments. (Prepayment is the admin-defined amount, not hardcoded to one-third.)
- [x] Ensure installment totals plus prepayment equal the contract fee; reject partial installment payment (via validation in service).
- [x] Isolate the gateway behind an adapter. (A deterministic development-only mock is configured; production fails closed until a real provider is approved.)
- [x] Implement online start/verify flow with server-side verification.
- [x] Add idempotency keys (Idempotency-Key header support in start flow).
- [x] In one database transaction: verify, persist transaction, update schedule item status, update plan status (done in verify and approve methods).
- [x] Implement offline submission and admin approval/rejection atomically with row locking (`forUpdate`).
- [ ] Keep successful payment history immutable; generate authorized receipts.
  - [x] Enforce successful-payment immutability at the database layer.
  - [ ] Persist and expose authorized receipts after successful online or approved offline payment.
- [ ] Add reconciliation and expiry behavior only as documented after the worker/scheduler decision.
- [ ] Test success, failure, cancellation, timeout, amount mismatch, replay, duplicate clicks/callbacks, simultaneous admin/gateway completion, and rollback.
  - [x] Unit-test gateway failure, exact-amount verification, and missing transaction identifiers.
  - [x] Enforce family ownership for installment reads and online/offline payment operations.
  - [ ] Add provider sandbox and PostgreSQL concurrency/rollback tests after provider and test-database approval.

### B8 — notifications, documents, audit

- [x] Implement in-app notification CRUD (create, list, read/unread).
- [ ] Implement SMS/email channels, Persian templates, delivery status, retry, duplicate prevention. (BullMQ retry infrastructure is operational; real delivery providers remain unapproved.)
- [ ] Store private files in S3-compatible storage. (Not implemented.)
- [x] Implement append-only audit events with actor, action, resource type/ID, previous/new values, timestamp.
- [x] Ensure sensitive fields are redacted from logs/audits.
  - [x] Recursively redact nested audit snapshots and censor opaque values.
  - [x] Remove usernames, user IDs, and phone numbers from interpolated authentication logs.

### B9 — quality, security, performance

- [ ] Unit-test value objects, calculations, state machines, and policies.
- [ ] Integration-test repositories, constraints, transactions, migrations, and providers using PostgreSQL/Testcontainers where documented.
- [ ] API-test validation, errors, pagination, authentication, authorization, idempotency, and OpenAPI compatibility.
- [ ] Run security tests from `security-specification.md` and business-rule tests from `testing.md`.
- [ ] Measure critical APIs, inspect query plans, add only justified indexes/cache, and run k6 scenarios required by performance docs.
- [ ] Meet the documented coverage priorities; never chase percentage at the expense of financial/authorization cases.
  - [x] Backend unit suite, strict typecheck, build, formatting, and zero-warning lint pass locally.

### B10 — deployment readiness

- [x] Build a production image as a non-root user with health checks and no development secrets.
- [ ] Validate configuration, migrations, backup/restore, graceful shutdown, observability, and incident runbooks.
  - [x] Run PostgreSQL, Redis, controlled migrate/seed, API, and BullMQ worker services with Docker health/dependency gates.
  - [x] Smoke-test API health, seeded authentication and refresh rotation, console OTP, Redis connectivity, and BullMQ processing.
  - [x] Document environment boundaries, controlled migrations, backup/restore commands, forward-fix rules, incident checks, and authentication retention.
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

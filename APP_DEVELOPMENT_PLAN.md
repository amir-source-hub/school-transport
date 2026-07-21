# School Transport Platform — Whole-App Development Plan

> Status: Planning  
> Scope: Current MVP only  
> Source of truth: Files in [`docs/`](./docs/)  
> Last updated: 2026-07-22

## Progress

- Overall: `1 / 12 phases complete` — `8%`
- Documentation readiness: `3 / 4 gates complete`
- Backend delivery: track in [`BACKEND_DEVELOPMENT_PLAN.md`](./BACKEND_DEVELOPMENT_PLAN.md)
- Frontend delivery: track in [`FRONTEND_DEVELOPMENT_PLAN.md`](./FRONTEND_DEVELOPMENT_PLAN.md)

| Phase | Deliverable | Status | Progress |
|---|---|---|---:|
| 0 | Documentation decisions | In progress | 75% |
| 1 | Git and monorepo foundation | Complete | 100% |
| 2 | Local infrastructure and CI | In progress | 90% |
| 3 | Identity and access | In progress | 85% |
| 4 | Families, students, schools | In progress | 80% |
| 5 | Enrollment and review | In progress | 60% |
| 6 | Pricing and contracts | In progress | 65% |
| 7 | Payments and installments | In progress | 75% |
| 8 | Notifications, documents, audit | In progress | 45% |
| 9 | Public, parent, and admin UI | In progress | 79% |
| 10 | Security, performance, testing | In progress | 28% |
| 11 | Deployment and release | Not started | 0% |

Update a phase to `In progress`, then `Complete`; update the fraction and percentage in the same commit. A phase is complete only when its acceptance checks, tests, documentation, and review are complete.

## 1. Non-Negotiable Development Rules

- [x] Implement only behavior explicitly supported by project documentation and the approved MVP scope.
- [x] When documents conflict or omit a decision, stop that feature, record the issue, update/approve the relevant specification, and only then code it.
- [x] Never invent business rules, payment behavior, permissions, API fields, database constraints, UI flows, or infrastructure choices.
- [x] Keep route, driver, vehicle, attendance, live tracking, camera, school-manager, and other deferred modules outside the MVP.
- [x] Use clean code, SOLID principles, dependency inversion at integration boundaries, small cohesive modules, explicit names, and no duplicated business rules.
- [x] Keep business rules in the backend domain/application layers. The frontend may validate for usability but is never authoritative.
- [x] Follow the documented folder structures. Any structural change requires an Architecture Decision Record (ADR) and documentation approval first.
- [x] Prefer simple, documented solutions; do not introduce libraries, services, abstractions, or microservices without a documented requirement.
- [x] Treat payments, contracts, authorization, student data, audit history, and accepted records as high-risk areas requiring review and negative tests.
- [x] Never log passwords, OTPs, tokens, payment credentials, secrets, or complete sensitive records.
- [x] Do not mark work complete with failing lint, type checks, tests, migrations, security checks, or documentation drift.

## 2. Documentation-First Workflow

For every feature:

1. Read the feature specification and its cross-cutting documents.
2. Extract acceptance criteria, states, permissions, invariants, errors, API operations, persistence rules, security requirements, and test cases.
3. Add traceability in the issue/PR: `Requirement → implementation → test`.
4. Resolve contradictions by changing the specification through review—not by choosing silently in code.
5. Define/update the API contract before frontend integration.
6. Implement the smallest vertical slice satisfying the approved requirements.
7. Test documented success, failure, authorization, concurrency, and retry cases.
8. Update OpenAPI, operational notes, plan progress, and relevant docs in the same PR.

### Documentation map

| Concern | Required documents |
|---|---|
| Product scope and workflows | `docs/specification.md`, `docs/school_transport_business_rules.md` |
| Technology and repository | `docs/school-transport-tech-stack.md` |
| Backend design | `docs/backend-architecture.md`, `docs/API-Specification.md` |
| Frontend and UI | `docs/frontend-architecture.md`, `docs/school-transport-ui-ux-specification.md` |
| Data | `docs/school-transport-database-data-model-schemas.md` |
| Roles and ownership | `docs/USER_ROLES_AND_PERMISSIONS.md` |
| Enrollment | `docs/specification.md`, `docs/enrollment-form-specification.md` |
| Pricing, contracts, payments | `docs/pricing-and-payments-specification.md`, `docs/contract-system-specification.md` |
| Errors and resilience | `docs/error-handling.md`, `docs/performance-specification.md` |
| Security | `docs/security-specification.md` |
| Testing and release | `docs/testing.md`, `docs/school-transport-deployment-specification.md` |

### Phase 0 — mandatory documentation gates

- [x] Fill and approve `docs/enrollment-form-specification.md` before implementing the complete enrollment form.
- [x] Reconcile the infrastructure conflict: PostgreSQL remains authoritative; Redis/BullMQ and a separate worker are approved for temporary/retryable development and MVP background work.
- [ ] Reconcile any route/name differences between API, architecture, and data-model documents; publish one canonical OpenAPI contract.
- [x] Record document precedence and approval owners in `docs/README.md`.

## 3. Target Architecture From the Docs

```text
school-transport-platform/
├── apps/
│   ├── web/          # Next.js App Router: public, auth, parent, admin
│   ├── api/          # NestJS + Fastify modular monolith
│   ├── worker/       # only after the Phase 0 infrastructure decision
│   └── scheduler/    # only after the Phase 0 infrastructure decision
├── packages/
│   ├── ui/
│   ├── api-client/   # generated from OpenAPI
│   ├── types/
│   ├── validation/
│   ├── auth/
│   ├── eslint-config/
│   ├── typescript-config/
│   ├── observability/
│   └── testing/
├── infrastructure/
└── docs/
```

Core documented stack: pnpm workspaces, Turborepo, TypeScript, Next.js/React, Tailwind CSS, shadcn/ui/Radix UI, NestJS with Fastify, PostgreSQL with Drizzle ORM/Kit, REST/OpenAPI, Docker, and GitHub Actions. Redis/BullMQ/worker/scheduler remain gated by Phase 0.

## 4. Git Initialization and Team Workflow

Use one Git repository for the monorepo; do not initialize separate repositories inside `apps/web` or `apps/api`.

### Initialize once

- [x] Confirm secrets and generated files are excluded in `.gitignore`.
- [x] Run `git init` if `.git/` does not exist.
- [x] Set the primary branch: `git branch -M main`.
- [x] Add the approved project files through focused commits.
- [x] Create the repository baseline and subsequent conventional commits.
- [ ] Add the remote when provided: `git remote add origin <repository-url>`.
- [ ] Push after remote review: `git push -u origin main`.

Never commit `.env`, credentials, production data, uploaded private documents, database dumps, or payment/OTP secrets. Commit `.env.example` with safe placeholders.

### Branch model

- `main`: protected and deployable; no direct feature work.
- `develop`: optional integration branch only if the team explicitly adopts it; otherwise use short-lived branches directly into `main`.
- `feat/<area>-<short-name>`: product work, e.g. `feat/backend-auth` or `feat/frontend-enrollment`.
- `fix/<area>-<short-name>`: defect fixes.
- `docs/<short-name>`, `test/<short-name>`, `refactor/<area>-<short-name>`, `chore/<short-name>`.
- `hotfix/<short-name>`: urgent production repair from `main`.

Keep branches short-lived, rebase/update before review, require CI and review, squash when appropriate, and delete merged branches. Backend and frontend work for one contract should reference the same issue and agreed OpenAPI version.

### Conventional Commits

Format: `<type>(<scope>): <imperative summary>`; keep the summary concise, lowercase, and without a period.

Scopes: `repo`, `docs`, `web`, `api`, `auth`, `students`, `enrollment`, `pricing`, `contracts`, `payments`, `notifications`, `db`, `security`, `ci`, `deploy`.

Examples:

- `docs(enrollment): define approved multi-step form requirements`
- `feat(api): add family registration endpoint`
- `feat(web): add parent enrollment review step`
- `fix(payments): prevent duplicate callback processing`
- `test(contracts): cover installment schedule invariants`
- `refactor(api): isolate payment gateway adapter`
- `chore(ci): add monorepo quality checks`

Breaking changes use `!` and a `BREAKING CHANGE:` footer. Each commit should be focused, buildable, free of secrets, and include relevant tests/docs. Do not use vague messages such as `update`, `fix stuff`, or `changes`.

## 5. Step-by-Step Delivery Phases

### Phase 1 — repository foundation

- [x] Complete local Git initialization and documented feature-branch workflow. (Remote branch protection remains external.)
- [x] Create the documented `apps/`, `packages/`, `infrastructure/`, and `docs/` structure.
- [x] Configure pnpm workspaces and Turborepo pipelines.
- [x] Add shared strict TypeScript, ESLint, formatter, frontend/backend tests, and import-boundary rules.
- [x] Add `.env.example`, contribution guide, ADR template, and root commands.
- [x] Verify frozen dependency installation state, lint, type-check, tests, and production builds locally.

### Phase 2 — infrastructure and CI

- [x] Add local PostgreSQL and approved supporting services through Docker Compose.
- [x] Configure versioned Drizzle migrations and a separate test database.
- [x] Configure GitHub Actions for install, lint, type-check, tests, build, migration validation, and dependency/security checks. (Remote execution awaits a configured GitHub remote.)
- [x] Establish development, test, staging, and production configuration boundaries.
- [x] Document backup/restore and migration rollback/forward-fix procedure according to deployment docs.

### Phases 3–9 — vertical product slices

Implement in dependency order, completing backend contract and tests before frontend integration for each slice:

- [ ] Identity: family account, password security, OTP verification, sessions, refresh rotation, logout, reset, rate limits.
- [ ] Access control: `PARENT` and `ADMIN`, permissions, ownership guards, audit metadata.
- [ ] Families/students/schools: documented data, validation, protected edits, multi-student ownership.
- [ ] Enrollment: approved multi-step flow, draft/progress behavior, review, submission, correction, approval/rejection, lifecycle rules.
- [ ] Pricing/contracts: admin pricing, full/installment choice, accepted immutable contract version, activation rules.
- [ ] Payments/installments: one-third prepayment plus four monthly installments, online verification, offline review, receipts, idempotency, locking, reconciliation.
- [ ] Notifications/documents/audit: documented channels, private object storage, signed access, immutable audit history.
- [ ] UI areas: public site, authentication, parent portal, admin panel, responsive RTL/Persian UX, accessibility, complete loading/empty/error states.

For detailed checklists, use the backend and frontend plans.

### Phase 10 — system hardening

- [ ] Run unit, integration, API, component, accessibility, E2E, security, concurrency, and payment gateway sandbox tests from `docs/testing.md`.
- [ ] Verify response-time, pagination, query/index, caching, and load requirements from `performance-specification.md`.
- [ ] Complete threat review and security acceptance criteria.
- [ ] Test backup restoration, migration execution, incident response, and observability alerts.
- [ ] Perform acceptance testing with documented parent and admin journeys.

### Phase 11 — deployment and release

- [ ] Build immutable artifacts and deploy to staging using the deployment specification.
- [ ] Run migrations through the approved controlled process.
- [ ] Complete smoke, E2E, payment sandbox, permission, RTL/mobile, and accessibility checks.
- [ ] Obtain product, security, and operations approval.
- [ ] Tag the release using SemVer, publish release notes, deploy production, and monitor.
- [ ] Execute the documented rollback/forward-fix plan if release checks fail.

## 6. Definition of Done

A task is done only when:

- [ ] Its source requirements and acceptance criteria are linked.
- [ ] Code follows the documented architecture, clean-code rules, and SOLID boundaries.
- [ ] API, database, authorization, error, security, and concurrency behavior match the docs.
- [ ] Tests cover positive, negative, ownership, retry, and duplicate-operation cases as relevant.
- [ ] Lint, formatting, type checks, tests, builds, and migration checks pass.
- [ ] OpenAPI/generated client and user/operational documentation are current.
- [ ] No secrets or sensitive data appear in code, fixtures, commits, or logs.
- [ ] Review is complete and the phase tracker is updated.

## 7. Release Progress Tracker

- [ ] Specifications approved
- [ ] Architecture and repository baseline approved
- [ ] Backend MVP complete
- [ ] Frontend MVP complete
- [ ] Generated API integration complete
- [ ] Critical business-rule tests complete
- [ ] Security acceptance complete
- [ ] Performance acceptance complete
- [ ] Staging acceptance complete
- [ ] Production release complete

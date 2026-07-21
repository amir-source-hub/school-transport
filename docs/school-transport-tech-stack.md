# School Transport Service — Technology Stack

## 1. Purpose

This document defines the technical stack and application architecture for the school transport service platform.

The system will be developed as a comprehensive platform and expanded gradually. The architecture must therefore:

- Separate the frontend and backend.
- Support independent background workers and scheduled jobs.
- Keep business domains modular.
- Support secure authentication and authorization.
- Handle registrations, pricing, installments, payments, notifications, and administrative workflows reliably.
- Remain maintainable as the codebase and development team grow.

The system should not begin as a collection of microservices. Instead, it should use a modular architecture with clear boundaries so individual modules can be separated later only when there is a real technical or operational need.

---

# 2. Main Architectural Decision

The platform will use:

- A separate web frontend.
- A separate backend API.
- A dedicated background worker.
- A dedicated scheduler.
- PostgreSQL as the primary database.
- Redis for caching, temporary data, rate limiting, and queues.
- S3-compatible object storage for private files.
- REST APIs with OpenAPI documentation.
- A monorepo for shared tooling and coordinated development.

The recommended foundation is:

> A separate frontend and backend, supported by workers and shared infrastructure, with a domain-oriented modular backend.

---

# 3. Frontend Application Structure

The public website, parent panel, and admin panel should initially remain inside one `web` application.

They do not need to be three separate frontend projects at this stage.

## Recommended structure

```text
apps/
├── web/
├── api/
├── worker/
├── scheduler/
└── docs/
```

Inside the web application:

```text
apps/web/src/app/
├── (public)/
│   ├── page.tsx
│   ├── about/
│   ├── contact/
│   └── registration-guide/
│
├── (auth)/
│   ├── login/
│   ├── register/
│   ├── verify-phone/
│   └── forgot-password/
│
├── (parent)/
│   └── parent/
│       ├── dashboard/
│       ├── students/
│       ├── registrations/
│       ├── payments/
│       ├── installments/
│       ├── notifications/
│       └── profile/
│
└── (admin)/
    └── admin/
        ├── dashboard/
        ├── registrations/
        ├── families/
        ├── students/
        ├── schools/
        ├── pricing/
        ├── payments/
        ├── installments/
        ├── notifications/
        └── settings/
```

## Why one web application?

The three sections share:

- The same design system.
- The same language and RTL configuration.
- The same authentication infrastructure.
- The same API client.
- The same validation schemas.
- The same component library.
- The same build tooling.
- The same frontend developers.
- Many common forms, dialogs, tables, and status components.

Keeping them in one frontend application reduces:

- Code duplication.
- Dependency duplication.
- Deployment complexity.
- Inconsistent UI behavior.
- Repeated authentication logic.
- Repeated API integration code.
- Maintenance overhead.

## How the sections remain separated

Even though they exist in one application, they should have independent:

- Route groups.
- Layouts.
- Navigation systems.
- Permission guards.
- Error boundaries.
- Loading states.
- Page modules.
- Feature components.
- Access rules.

The public website, parent panel, and admin panel should feel like distinct areas without requiring separate applications.

## When separate web applications may become justified

A frontend section should only become an independent application when there is a concrete need such as:

- Independent development teams.
- Independent release cycles.
- Different hosting requirements.
- Significantly different technologies.
- A very large admin application.
- Strong operational isolation requirements.

For the current platform, one `web` application is the recommended decision.

---

# 4. Repository Strategy

Use a monorepo with independently deployable applications.

## Recommended tools

- Turborepo
- pnpm workspaces
- TypeScript
- Changesets for shared package versioning when needed

## Repository structure

```text
school-transport-platform/
├── apps/
│   ├── web/
│   ├── api/
│   ├── worker/
│   ├── scheduler/
│   └── docs/
│
├── packages/
│   ├── ui/
│   ├── api-client/
│   ├── types/
│   ├── validation/
│   ├── auth/
│   ├── eslint-config/
│   ├── typescript-config/
│   ├── observability/
│   └── testing/
│
├── infrastructure/
│   ├── docker/
│   ├── reverse-proxy/
│   ├── database/
│   ├── monitoring/
│   └── deployment/
│
└── docs/
```

## Benefits

- Shared TypeScript configuration.
- Shared validation rules.
- Shared API types.
- Shared UI components.
- Consistent linting and formatting.
- Coordinated development.
- Independent application deployment.
- Easier refactoring across applications.

---

# 5. Frontend Stack

## Core technologies

- Next.js
- React
- TypeScript
- App Router
- pnpm

Next.js will be used as the frontend framework. Core business rules will remain in the backend API rather than being implemented inside frontend Server Actions.

## UI technologies

| Concern | Technology |
|---|---|
| Styling | Tailwind CSS |
| Component foundation | shadcn/ui |
| Accessible primitives | Radix UI |
| Icons | Lucide React |
| Animations | Motion |
| Toast notifications | Sonner |
| Forms | React Hook Form |
| Validation | Zod |
| Server state | TanStack Query |
| Tables | TanStack Table |
| Local UI state | Zustand |
| Dates | date-fns |
| Persian dates | date-fns-jalali |
| Charts | Recharts |
| API generation | Orval or OpenAPI Generator |

## Frontend state rules

Use each state tool only for its intended responsibility:

- **TanStack Query:** API data, caching, retries, pagination, and invalidation.
- **React Hook Form:** form state and field validation.
- **Zustand:** temporary interface state.
- **URL parameters:** filters, pagination, sorting, and searchable page state.
- **React state:** small local component interactions.

Server data should not be duplicated unnecessarily inside Zustand.

---

# 6. Frontend Organization

The frontend should use feature-based organization.

```text
apps/web/src/
├── app/
├── components/
│   ├── common/
│   ├── forms/
│   ├── tables/
│   ├── feedback/
│   └── layout/
│
├── features/
│   ├── auth/
│   ├── families/
│   ├── parents/
│   ├── students/
│   ├── registrations/
│   ├── pricing/
│   ├── payments/
│   ├── installments/
│   ├── notifications/
│   └── schools/
│
├── hooks/
├── lib/
├── providers/
├── styles/
└── types/
```

Each feature can contain:

```text
feature/
├── api/
├── components/
├── hooks/
├── schemas/
├── types/
└── utils/
```

---

# 7. Backend Stack

## Recommended backend

- NestJS
- TypeScript
- Node.js
- Fastify adapter

NestJS provides a structured foundation for:

- Modular application architecture.
- Dependency injection.
- Authentication guards.
- Authorization policies.
- Request validation.
- Global error handling.
- OpenAPI documentation.
- Queue processing.
- Scheduled jobs.
- Event-driven workflows.
- Testing.

## API style

Use:

- REST for frontend-to-backend communication.
- OpenAPI for API contracts.
- Internal events for asynchronous workflows.
- WebSockets only where current user-facing operational updates genuinely require them.

GraphQL is not required for the current platform.

---

# 8. Backend Modular Architecture

The backend should be implemented as a modular monolith.

```text
apps/api/src/modules/
├── identity/
├── access-control/
├── families/
├── parents/
├── students/
├── emergency-contacts/
├── schools/
├── registrations/
├── pricing/
├── contracts/
├── installments/
├── payments/
├── notifications/
├── documents/
├── audit/
├── reporting/
└── system-settings/
```

Each module should own its own:

- Domain rules.
- Entities.
- Use cases.
- Repository interfaces.
- Infrastructure adapters.
- Controllers.
- Events.
- Validation.
- Permissions.
- Tests.

## Module layers

```text
module/
├── domain/
├── application/
├── infrastructure/
└── presentation/
```

### Domain layer

Contains:

- Entities.
- Value objects.
- Domain services.
- Domain rules.
- Domain events.
- Repository contracts.

### Application layer

Contains:

- Commands.
- Queries.
- Use cases.
- DTOs.
- Application services.
- Transaction orchestration.

### Infrastructure layer

Contains:

- Database repositories.
- SMS integrations.
- Payment gateway integrations.
- Cache adapters.
- Queue adapters.
- File storage adapters.

### Presentation layer

Contains:

- REST controllers.
- Request DTOs.
- Response mapping.
- Authentication guards.
- Authorization guards.

---

# 9. Primary Database

## Technology

- PostgreSQL

PostgreSQL will be the main system of record.

## Stored data

- User accounts.
- Parent information.
- Family records.
- Student information.
- Emergency contacts.
- Schools.
- Registration requests.
- Registration statuses.
- Assigned prices.
- Contracts.
- Payment plans.
- Installments.
- Payment attempts.
- Successful payments.
- Notifications.
- Documents.
- Administrative actions.
- Audit records.
- System settings.

## Database organization

Use logical schemas or strict naming boundaries:

```text
PostgreSQL
├── identity
├── family
├── registration
├── finance
├── notification
├── document
├── audit
└── system
```

The exact physical schema strategy can be finalized during the database design phase.

---

# 10. ORM and Database Access

## Recommended ORM

- Drizzle ORM
- Drizzle Kit

Drizzle provides:

- Strong TypeScript support.
- Explicit database queries.
- Good SQL visibility.
- Migration tooling.
- Control over indexes and constraints.
- Flexibility for reporting and financial queries.

Prisma remains an acceptable alternative, but Drizzle is preferred for this comprehensive system because it provides more direct control over PostgreSQL behavior.

## Database requirements

- Version-controlled migrations.
- Forward-only production migrations.
- Foreign-key constraints.
- Unique constraints.
- Check constraints.
- Transactional operations.
- Proper indexes.
- Database-level financial protections.
- Backup and restoration procedures.

---

# 11. Redis

Redis should be included as supporting infrastructure.

## Responsibilities

- Distributed cache.
- OTP storage.
- Rate limiting.
- Temporary authentication tokens.
- Session-related temporary data.
- Idempotency records.
- Distributed locks.
- Queue storage.
- Short-lived workflow data.

## Restrictions

Redis must not become the authoritative source for:

- Payments.
- Installments.
- Registrations.
- User records.
- Prices.
- Contracts.

Permanent business state must remain in PostgreSQL.

---

# 12. Background Jobs and Queues

## Recommended technologies

- BullMQ
- Redis
- Dedicated NestJS worker
- Dedicated scheduler

## Worker responsibilities

- Sending OTP messages.
- Sending registration notifications.
- Sending payment confirmations.
- Sending installment reminders.
- Sending overdue warnings.
- Retrying failed SMS or email delivery.
- Generating invoices.
- Generating documents.
- Processing exports.
- Creating reports.
- Cleaning expired temporary data.

## Application structure

```text
apps/
├── api/
├── worker/
└── scheduler/
```

## Workflow example

```text
Payment verified
    ↓
Database transaction completed
    ↓
Payment event stored
    ↓
Background job created
    ↓
Worker sends notification
    ↓
Worker generates receipt
```

The API should not block while performing slow external operations.

---

# 13. Authentication

Authentication will be managed by the backend.

## Current login model

- Family username.
- Family password.
- One account per family.
- No shared account across unrelated families.
- Both parents' phone numbers are recorded.
- The selected primary phone number must be OTP verified.
- Secure password reset through verified contact information.

## Recommended session model

- Short-lived access token.
- Rotating refresh token.
- Secure HTTP-only cookie for refresh tokens.
- Session records stored in the database.
- Redis used for temporary token and rate-limit data.
- Device and session revocation support.

## Password security

- Argon2id hashing.
- Strong password policy.
- Password reset tokens with expiration.
- Session invalidation after password changes.
- Generic authentication errors.

## OTP protections

- Expiration time.
- Attempt limits.
- Resend cooldown.
- Rate limiting.
- Single-use verification.
- Secure random generation.
- No OTP values in logs.

---

# 14. Authorization

The platform should use:

- Role-based access control.
- Permission-based access control.
- Resource ownership rules.

## Current roles

```text
PARENT
ADMIN
```

The data model may support additional roles later, but they are not part of the current implementation scope.

## Example permissions

```text
registration.read_own
registration.create
registration.review
registration.approve
registration.reject

student.read_own
student.update_basic
student.read_all

pricing.read_own
pricing.assign
pricing.update

payment.read_own
payment.create
payment.verify
payment.read_all

installment.read_own
installment.manage

notification.read_own
notification.send

school.read
school.manage

audit.read
```

## Ownership rules

- Parents can only access their own family.
- Parents can only access students registered under their family.
- Parents cannot approve registrations.
- Parents cannot assign prices.
- Parents cannot edit protected school or service information.
- Admins can review registrations.
- Admins can approve or reject registrations.
- Admins can assign prices and payment plans.
- Admins can view and manage payments according to permissions.

Authorization must always be enforced on the backend.

---

# 15. API Design

## Standards

- REST.
- JSON.
- OpenAPI 3.
- URI-based versioning.
- Consistent response structures.
- Consistent error structures.

## Example routes

```text
/api/v1/auth
/api/v1/families
/api/v1/parents
/api/v1/students
/api/v1/schools
/api/v1/registrations
/api/v1/pricing
/api/v1/installments
/api/v1/payments
/api/v1/notifications
/api/v1/documents
```

## Required API capabilities

- Authentication.
- Authorization.
- Request validation.
- Pagination.
- Sorting.
- Filtering.
- Correlation IDs.
- Idempotency keys.
- Rate limiting.
- Audit metadata.
- Versioning.
- Generated documentation.

---

# 16. API Client Generation

The backend should publish an OpenAPI specification.

The frontend should use:

- Orval, or
- OpenAPI Generator

Generated output should include:

- Request functions.
- Response types.
- Error types.
- TanStack Query hooks where appropriate.

Frontend developers should not manually duplicate backend DTO definitions.

---

# 17. Payment Architecture

The payment module must be isolated from other business modules.

## Main payment concepts

- Payment plan.
- Full-payment option.
- Prepayment.
- Four monthly installments.
- Payment intent.
- Payment attempt.
- Gateway transaction.
- Verification result.
- Installment allocation.
- Payment reconciliation.
- Payment audit record.

## Required protections

- Idempotency keys.
- Unique gateway reference numbers.
- Server-side amount verification.
- Callback verification.
- Database transactions.
- Duplicate callback protection.
- Duplicate payment protection.
- Retry-safe verification.
- Concurrent update protection.
- Reconciliation jobs.
- Detailed audit logs.

## Financial transaction example

A successful payment verification should atomically:

1. Lock or safely validate the payment attempt.
2. Confirm it has not already been processed.
3. Validate the expected amount.
4. Save the gateway reference.
5. Create the payment record.
6. Allocate the amount to the correct installment or balance.
7. Update the payment-plan status.
8. Store an audit event.
9. Create background notification jobs.

If any required step fails, the transaction must roll back.

---

# 18. Notification Architecture

## Current channels

- In-app notifications.
- SMS.
- Email where required.

## Notification types

- Account verification.
- Registration submitted.
- Registration approved.
- Registration rejected.
- Price assigned.
- Payment received.
- Installment due soon.
- Installment overdue.
- Administrative warning.

## Architecture

```text
Business event
    ↓
Notification service
    ↓
Template renderer
    ↓
Queue
    ↓
Worker
    ├── SMS provider
    ├── Email provider
    └── In-app notification
```

## Required features

- Persian message templates.
- Delivery status.
- Retry handling.
- Provider error logging.
- Notification history.
- Duplicate prevention.
- Scheduled delivery.
- User-facing read/unread state.
- Administrative message sending.

---

# 19. File and Document Storage

## Recommended storage

- S3-compatible object storage.
- MinIO for local development.
- Private production object storage.

## Possible file types

- Student photographs.
- Identification documents.
- Registration attachments.
- Payment receipts.
- Contracts.
- Generated invoices.
- Administrative exports.

## Security requirements

- Private buckets.
- Signed upload URLs.
- Signed download URLs.
- File-size validation.
- MIME-type validation.
- File-name normalization.
- Access auditing.
- Metadata stored in PostgreSQL.
- Sensitive documents never exposed through public URLs.

---

# 20. Search and Filtering

For the current system, PostgreSQL is sufficient.

## Use PostgreSQL for

- Indexed filtering.
- Parent search.
- Student search.
- National ID lookup.
- Registration filtering.
- Payment filtering.
- Installment status filtering.
- School filtering.
- Full-text search where necessary.
- Trigram matching for Persian names where useful.

A separate search engine is not required for the current implementation.

---

# 21. Validation

Use Zod for frontend schemas and NestJS validation for backend request DTOs.

Validation must cover:

- Usernames.
- Passwords.
- Phone numbers.
- Primary phone selection.
- OTP verification.
- Parent information.
- Student information.
- National identification codes.
- Emergency contacts.
- School selection.
- Registration requests.
- Pricing.
- Prepayments.
- Installment plans.
- Payment callbacks.
- Uploaded files.

Client-side validation improves user experience, but backend validation remains authoritative.

Database constraints must also enforce critical integrity rules.

---

# 22. Observability

## Logging

- Pino.
- Structured JSON logs.
- Request IDs.
- Correlation IDs.
- User and session context where appropriate.

## Error tracking

- Sentry.

## Metrics

- Prometheus.

## Dashboards

- Grafana.

## Log aggregation

- Loki.

## Tracing

- OpenTelemetry where necessary.

## Important monitored areas

- API response times.
- Error rates.
- Database query duration.
- Queue delays.
- Failed jobs.
- SMS failures.
- Email failures.
- Payment verification failures.
- Login failures.
- OTP abuse.
- Cache performance.

## Sensitive logging rules

Never log:

- Passwords.
- Password hashes.
- OTP codes.
- Access tokens.
- Refresh tokens.
- Payment gateway secrets.
- Full sensitive identification documents.
- Complete private file URLs.

---

# 23. Testing Stack

## Frontend

- Vitest.
- React Testing Library.
- MSW.
- Playwright.

## Backend

- Jest or Vitest.
- Supertest.
- Testcontainers.
- PostgreSQL integration tests.
- Redis integration tests.
- Queue consumer tests.

## Quality and performance

- ESLint.
- Prettier.
- TypeScript strict mode.
- k6 for load testing.
- Dependency vulnerability scanning.
- Secret scanning.
- Container scanning.

## High-priority scenarios

- A parent cannot access another family's information.
- Duplicate usernames are rejected.
- Duplicate student national IDs are rejected.
- The primary phone number must be verified.
- Only admins can approve registrations.
- Only admins can assign prices.
- Parents cannot modify protected fields.
- Payment callbacks are idempotent.
- The same payment cannot be recorded twice.
- Installment totals equal the assigned price.
- Failed transactions do not leave partial financial changes.
- Notification jobs can be safely retried.
- Expired OTP codes are rejected.
- Rate limits prevent OTP abuse.

---

# 24. Deployment and Infrastructure

## Containerization

- Docker.
- Docker Compose for development.
- Separate production containers.

## Main production services

```text
Containers
├── web
├── api
├── worker
├── scheduler
├── PostgreSQL
├── Redis
├── MinIO
├── reverse-proxy
├── Prometheus
├── Grafana
└── Loki
```

## Reverse proxy

Use one of:

- Caddy.
- Nginx.

## Required production practices

- HTTPS.
- Environment-based configuration.
- Secret management.
- Database backups.
- Backup restoration testing.
- Persistent volumes.
- Health-check endpoints.
- Container restart policies.
- Database migration process.
- Separate development, staging, and production environments.

---

# 25. CI/CD

## Recommended service

- GitHub Actions.

## Pipeline

```text
Install dependencies
    ↓
Lint
    ↓
Type-check
    ↓
Unit tests
    ↓
Integration tests
    ↓
Build applications
    ↓
Security scans
    ↓
Build container images
    ↓
Deploy to staging
    ↓
Run end-to-end tests
    ↓
Manual production approval
    ↓
Deploy to production
```

## Deployment targets

- Staging.
- Production.

Database migrations must be executed through a controlled deployment step.

---

# 26. Final Technology Stack

```text
Language
- TypeScript

Repository
- Turborepo
- pnpm workspaces
- Changesets

Frontend
- One Next.js web application
- React
- App Router
- Tailwind CSS
- shadcn/ui
- Radix UI
- TanStack Query
- TanStack Table
- React Hook Form
- Zod
- Zustand
- Motion
- Recharts
- date-fns
- date-fns-jalali
- Sonner
- Lucide React

Backend
- NestJS
- Fastify
- REST
- OpenAPI
- Modular domain-oriented architecture

Database
- PostgreSQL
- Drizzle ORM
- Drizzle Kit

Caching and temporary data
- Redis

Queues and jobs
- BullMQ
- Dedicated worker application
- Dedicated scheduler application

Authentication
- Backend-managed authentication
- Username and password
- Argon2id
- OTP verification for the primary phone
- Access tokens
- Rotating refresh tokens
- Secure HTTP-only cookies

Authorization
- Role-based access control
- Permission-based access control
- Resource ownership policies

Storage
- S3-compatible object storage
- MinIO for local development

Notifications
- SMS
- Email
- In-app notifications

Observability
- Pino
- Sentry
- Prometheus
- Grafana
- Loki
- OpenTelemetry where required

Testing
- Vitest or Jest
- Supertest
- Testcontainers
- React Testing Library
- MSW
- Playwright
- k6

Infrastructure
- Docker
- Docker Compose
- Caddy or Nginx
- GitHub Actions
```

---

# 27. Final Decision Summary

The platform will not use separate `parent-web`, `admin-web`, and `public-web` applications initially.

Instead, it will use:

```text
apps/
├── web/
├── api/
├── worker/
├── scheduler/
└── docs/
```

The single web application will contain strongly separated public, authentication, parent, and admin sections through route groups, layouts, permissions, and feature modules.

This provides:

- Clear frontend separation.
- Less duplication.
- Easier maintenance.
- Shared UI consistency.
- Simpler deployment.
- A strong foundation for a comprehensive system.
# School Transport Platform

A Persian-first platform for managing school transport enrollment, contracts, and payments. The
repository contains a public website, a parent portal, an administrative dashboard, and the API
that supports them.

> The project is under active development. Online payment is intentionally disabled until a real
> gateway is integrated and verified; local OTP may use the console adapter only in development.
> Production still requires approved external providers and secret-manager configuration.

## What is included

### Parent experience

- Mobile-number registration and sign-in with OTP
- Multi-student family accounts
- Guided enrollment with school, grade, service, address, and map location selection
- Reuse of saved parent and family information for subsequent enrollments
- Contract review and acceptance
- Fixed prepayment followed by an admin-configured full or installment payment plan
- Private offline receipt submissions (online payment is visibly disabled pending integration)
- Jalali dates and RTL Persian interfaces
- Payment, enrollment, contract, decision, and account notifications
- Editable family profile, addresses, emergency contacts, and parent phone numbers

### Administration

- Operational dashboard and detailed notifications
- Enrollment review, correction, approval, and rejection workflows
- Family, student, school, contract, and administrator management
- Remaining-price and installment schedule configuration per student
- Offline receipt history, evidence review, approval, and rejection
- Payment-derived enrollment statuses, including installment progress and full settlement
- Contract and enrollment details in a unified view

## Technology

| Area                 | Technology                                     |
| -------------------- | ---------------------------------------------- |
| Monorepo             | pnpm workspaces, Turborepo, TypeScript         |
| Web                  | Next.js 16, React 19, Tailwind CSS 4, Radix UI |
| API                  | NestJS 10, Fastify, REST, OpenAPI              |
| Data                 | PostgreSQL 16, Drizzle ORM                     |
| Background work      | Redis 7, BullMQ                                |
| Validation and forms | Zod, class-validator, React Hook Form          |
| Testing              | Vitest, Testing Library, Playwright            |
| Infrastructure       | Docker Compose, GitHub Actions                 |

## Repository structure

```text
.
├── apps/
│   ├── api/             # NestJS API, database schema, migrations, and seed data
│   └── web/             # Public website, parent portal, and admin dashboard
├── infrastructure/      # PostgreSQL initialization and infrastructure support
├── packages/            # Shared TypeScript and ESLint configuration
├── Dockerfile           # Production-style API and web image targets
├── docker-compose.yml
└── package.json
```

## Requirements

- Docker Desktop with Docker Compose
- Git, when cloning the repository

Node.js and pnpm are only required for development outside Docker.

## Run the complete application with Docker

The base Compose file is production-oriented and deliberately refuses placeholder secrets and
development providers. For local development, first copy `.env.development.example` to
`.env.development`, then use the explicit override:

From the repository root, build and start the web application, API, background worker,
PostgreSQL, Redis, database migrations, and seed data with one command:

```bash
docker compose --env-file .env.development -f docker-compose.yml -f docker-compose.development.yml up --build
```

The first run downloads the base images and installs dependencies, so it can take several minutes.
With the development override, `bootstrap` waits for PostgreSQL, applies migrations, seeds demo data,
and exits successfully before the API starts. Seeding is idempotent and is safe to run again.

When the services are ready:

| Service               | URL                                   |
| --------------------- | ------------------------------------- |
| Web application       | <http://localhost:3000>               |
| API                   | <http://localhost:5000/api/v1>        |
| OpenAPI documentation | <http://localhost:5000/api/docs>      |
| Health check          | <http://localhost:5000/api/v1/health> |

Seeded development accounts:

| Role   | Username      | Phone number  |
| ------ | ------------- | ------------- |
| Parent | `demo-parent` | `09121111111` |
| Admin  | `demo-admin`  | `09120000000` |

The local stack uses the console OTP provider. To see generated OTP codes and follow startup:

```bash
docker compose --env-file .env.development -f docker-compose.yml -f docker-compose.development.yml logs -f api
```

Useful Docker commands:

```bash
# Start an existing stack in the background
docker compose --env-file .env.development -f docker-compose.yml -f docker-compose.development.yml up -d

# Rebuild after source-code changes
docker compose --env-file .env.development -f docker-compose.yml -f docker-compose.development.yml up -d --build

# Check container and health status
docker compose --env-file .env.development -f docker-compose.yml -f docker-compose.development.yml ps -a

# Follow all service logs
docker compose --env-file .env.development -f docker-compose.yml -f docker-compose.development.yml logs -f

# Stop containers while preserving database and Redis data
docker compose --env-file .env.development -f docker-compose.yml -f docker-compose.development.yml down

# Remove containers and persisted local data, then start from a clean database
docker compose --env-file .env.development -f docker-compose.yml -f docker-compose.development.yml down --volumes
docker compose --env-file .env.development -f docker-compose.yml -f docker-compose.development.yml up --build
```

## Local development

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start PostgreSQL and Redis

```bash
docker compose --env-file .env.development -f docker-compose.yml -f docker-compose.development.yml up -d postgres redis
```

The development configuration exposes PostgreSQL on port `5433` and Redis on port `6379`.
Starting Redis prevents repeated `ECONNREFUSED 127.0.0.1:6379` messages from the API.

### 3. Configure environment variables

Direct API development always loads the safe defaults in `apps/api/.env.example` and optionally
overlays `apps/api/.env` when it exists. Copy `apps/api/.env.example` to `apps/api/.env` only when
you need local overrides or provider credentials. Copy `apps/web/.env.example` to
`apps/web/.env.local` when web overrides are needed. See
[`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md) for ownership, validation, and rebuild behavior.

Never commit `.env` files or real credentials.

### 4. Prepare sample data

Run migrations and load the development seed:

```bash
pnpm --filter @school-transport/api db:bootstrap
```

This command is intended for a development database and seeds demo parent and administrator
accounts. With `OTP_PROVIDER=console`, sign-in codes are printed by the API process.

### 5. Start the applications

```bash
pnpm dev
```

| Service               | URL                                   |
| --------------------- | ------------------------------------- |
| Web application       | <http://localhost:3000>               |
| API                   | <http://localhost:5000/api/v1>        |
| OpenAPI documentation | <http://localhost:5000/api/docs>      |
| Health check          | <http://localhost:5000/api/v1/health> |

## Useful commands

```bash
# Run all workspaces
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test

# Database operations
pnpm --filter @school-transport/api db:generate
pnpm --filter @school-transport/api db:migrate
pnpm --filter @school-transport/api db:seed
pnpm --filter @school-transport/api db:studio

# Web end-to-end tests
pnpm --filter web test:e2e
```

## Payment development behavior

All runtime environments require `PAYMENT_GATEWAY_PROVIDER=none`; mock gateway behavior exists only
inside isolated unit tests. The online choice remains disabled and every online API path fails
closed. Offline payments use versioned administrator-managed destination details and a private,
normalized receipt image. A submitted receipt does not count as payment until an administrator
approves it; one draft/review claim is allowed per schedule item and rejected claims retain history.

Payment plan status is derived from its schedule:

- Paying only the prepayment activates the enrollment.
- Paying some configured installments shows installment progress.
- Paying the prepayment and every configured remaining payment marks the plan fully settled.

## Security notes

- OTPs, tokens, passwords, payment credentials, and real personal data must never be committed or
  logged.
- Console OTP and mock payment providers are disabled as production solutions by design.
- Payment, contract, authorization, and student-data changes require negative-path and ownership
  tests.

## License

No open-source license has been added. All rights are reserved unless the repository owner states
otherwise.

# School Transport Platform

A Persian-first platform for managing school transport enrollment, contracts, and payments. The
repository contains a public website, a parent portal, an administrative dashboard, and the API
that supports them.

> The project is under active development and currently uses development OTP and payment
> providers. It is not ready for production deployment without configuring approved external
> providers and production secrets.

## What is included

### Parent experience

- Mobile-number registration and sign-in with OTP
- Multi-student family accounts
- Guided enrollment with school, grade, service, address, and map location selection
- Reuse of saved parent and family information for subsequent enrollments
- Contract review and acceptance
- Fixed prepayment followed by an admin-configured full or installment payment plan
- Online payments and offline receipt submissions
- Jalali dates and RTL Persian interfaces
- Payment, enrollment, contract, decision, and account notifications
- Editable family profile, addresses, emergency contacts, and parent phone numbers

### Administration

- Operational dashboard and detailed notifications
- Enrollment review, correction, approval, and rejection workflows
- Family, student, school, contract, and administrator management
- Remaining-price and installment schedule configuration per student
- Online payment history and offline payment approval or rejection
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

From the repository root, build and start the web application, API, background worker,
PostgreSQL, Redis, database migrations, and seed data with one command:

```bash
docker compose up --build
```

The first run downloads the base images and installs dependencies, so it can take several minutes.
The `bootstrap` service waits for PostgreSQL, applies all migrations, seeds the development data,
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
docker compose logs -f api
```

Useful Docker commands:

```bash
# Start an existing stack in the background
docker compose up -d

# Rebuild after source-code changes
docker compose up -d --build

# Check container and health status
docker compose ps -a

# Follow all service logs
docker compose logs -f

# Stop containers while preserving database and Redis data
docker compose down

# Remove containers and persisted local data, then start from a clean database
docker compose down --volumes
docker compose up --build
```

## Local development

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start PostgreSQL and Redis

```bash
docker compose up -d postgres redis
```

The development configuration exposes PostgreSQL on port `5433` and Redis on port `6379`.
Starting Redis prevents repeated `ECONNREFUSED 127.0.0.1:6379` messages from the API.

### 3. Configure environment variables

Copy `apps/api/.env.example` to `apps/api/.env`, then replace the placeholder JWT secret.

Create `apps/web/.env.local` with:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
```

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

Local development defaults to `PAYMENT_GATEWAY_PROVIDER=mock`. This provider is deterministic and
exists only for development and automated testing. Offline payments are submitted by parents with
a Jalali payment date and bank reference, then approved or rejected by an administrator. A pending
offline receipt blocks duplicate submissions for the same installment until it is rejected.

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

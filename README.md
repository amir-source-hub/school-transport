# School Transport Platform

Persian-first school transport MVP implemented as a TypeScript monorepo.

## Applications

- `apps/web`: Next.js App Router application for public, authentication, parent, and admin areas.
- `apps/api`: NestJS and Fastify modular-monolith API.

Worker and scheduler applications remain gated by the unresolved infrastructure decision recorded in `APP_DEVELOPMENT_PLAN.md`.

## Requirements

- Node.js 20 or newer
- pnpm 9 or newer
- PostgreSQL for API development

## Local setup

1. Copy `.env.example` values into the appropriate app-local environment files.
2. Replace every development placeholder secret.
3. Run `pnpm install` from the repository root.
4. Run `pnpm dev` to start available applications.

## Quality commands

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm format:check`

Project behavior and architecture must remain traceable to the specifications in `docs/`.

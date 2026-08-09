# Remaining Engineering and Operations Tasks

> Audited on 2026-08-09. Completed and verified tasks/subtasks were removed. This file contains only unfinished, externally unverified, or operational work from the original engineering backlog.

## Backend verification and CI

- [ ] Build comprehensive backend verification across unit, integration, real-database, HTTP contract, migration, queue, and deployment-smoke levels. **[NOT FINISHED]**
  - Run PostgreSQL/Redis-backed tests in CI rather than relying only on mocked services.
  - Cover transaction rollback, locks, constraints, idempotency, authorization, outbox recovery, migrations, and worker restart behavior.
  - Publish deterministic test reports and fail CI on regression.

- [ ] Add real-database integration and deployment smoke tests to backend CI. **[NOT FINISHED]**
  - Start production-like PostgreSQL and Redis services.
  - Apply all migrations from an empty database and from a supported snapshot.
  - Verify readiness, login/OTP boundaries, enrollment, notification outbox, payment idempotency, feedback, broadcasts, and photo metadata flows.

## Host and production infrastructure

- [ ] Enable and persist Redis-compatible memory overcommit on the deployment host. **[BLOCKED — HOST ACCESS]**
  - Set the host kernel option required by Redis, verify it after reboot, and document it in the operations runbook.

- [ ] Verify PostgreSQL is never exposed with trust authentication. **[BLOCKED — DEPLOYMENT INSPECTION]**
  - Inspect `pg_hba.conf`, listening interfaces, firewall/security groups, Docker publishing, TLS, and credential rotation.

- [ ] Remove development providers, demo seeding, fallback secrets, and unsafe defaults from production deployment. **[NOT FINISHED]**
  - Production must reject console OTP, mock payment, demo seed data, weak JWT/database/Redis credentials, debug logs, and incomplete provider configuration.
  - Confirm secret values come from deployment secret management and never from committed examples.

- [ ] Harden the production container and reverse-proxy boundary. **[NOT FINISHED]**
  - Run as non-root, use minimal images, health checks, resource limits, read-only filesystem where practical, and controlled writable mounts.
  - Terminate TLS correctly, restrict trusted proxy CIDRs, set security headers, cap request bodies, and prevent direct database/Redis exposure.

- [ ] Establish safe migration, backup, restore, and rollback release procedures. **[NOT FINISHED]**
  - Automate encrypted backups, retention, restore drills, point-in-time expectations, forward-fix/rollback decisions, and migration ownership.
  - Test procedures with sanitized production-like data.

## Auditing, privacy, and observability

- [ ] Complete audit coverage for every privileged, identity, financial, notification, feedback, broadcast, and student-photo mutation. **[NOT FINISHED]**
  - Record actor, action, entity, safe before/after metadata, time, result, and request context without secrets or sensitive message/photo content.
  - Add tests for missing and duplicate audit events.

- [ ] Establish application observability, service objectives, and incident diagnostics. **[NOT FINISHED]**
  - Add low-cardinality metrics, structured masked logs, traces, queue/backlog age, database saturation, HTTP latency/error rates, OTP/SMS outcomes, and alert ownership.
  - Define SLOs, dashboards, alert thresholds, cooldowns, and incident/runbook links.

- [ ] Define and enforce personal-data privacy, retention, deletion, and export controls. **[NOT FINISHED]**
  - Inventory guardian/student identity data, addresses, national IDs, phones, contracts, payments, feedback, audit data, notifications, and child photos.
  - Define lawful purpose, access, retention, deletion/anonymization, export, backup handling, and auditability.

- [ ] Add software supply-chain and dependency security governance. **[NOT FINISHED]**
  - Pin/review dependencies, automate vulnerability/license checks, protect lockfiles, review install scripts, generate an SBOM if required, and document patch response.

## Query, report, and API-contract hardening

- [ ] Bound every list query and large report generation path. **[NOT FINISHED]**
  - Enforce maximum page sizes and stable ordering.
  - Stream or queue large exports, cap date ranges/rows, and prevent memory amplification.

- [ ] Keep the frontend API contract synchronized with the backend. **[NOT FINISHED]**
  - Generate or centrally validate types/schemas, detect drift in CI, and cover error/pagination contracts.

- [ ] Unify environment configuration, documentation, and startup validation. **[NOT FINISHED]**
  - Define which variables belong to web, API, worker, CI, staging, and production.
  - Keep `.env.example` files secret-free and safe by default; validate all required production combinations.

## Frontend quality and resilience

- [ ] Build a complete frontend QA and regression program. **[NOT FINISHED]**
  - Cover critical student/admin workflows with unit, component, integration, browser E2E, accessibility, mobile, visual, and failure-state tests.

- [ ] Make enrollment and long-form flows reliable at supported phone and tablet widths. **[NOT FINISHED]**
  - Verify keyboard behavior, scroll/focus, sticky controls, date/map/file inputs, validation summaries, draft recovery, and RTL layout.

- [ ] Replace generic horizontal-table dependence with responsive verified data views. **[NOT FINISHED]**
  - Use cards or priority columns on small screens, preserve sorting/actions/context, and test keyboard/screen-reader operation.

- [ ] Optimize remaining above-the-fold media and enforce frontend performance budgets. **[NOT FINISHED]**
  - Verify responsive sizes, preload only true LCP media, cache behavior, CLS/LCP/INP, bundle size, and slow-network behavior.

## Security verification

- [ ] Complete application and abuse-security verification. **[NOT FINISHED]**
  - Test authentication/session/OTP abuse, CSRF/origin enforcement, IDOR, privilege boundaries, stored/reflected XSS, injection, SSRF, file upload, rate/cost limits, sensitive logs, and error disclosure.
  - Include notification, feedback, broadcast, payment, and student-photo endpoints.

## Environment-specific verification

- [ ] Verify map-tile routing against the deployed CSP, provider policy, caching proxy, and real production origin. **[BLOCKED — DEPLOYMENT]**
- [ ] Verify stale Next.js Server Action handling across an actual rolling deployment with old browser assets and multiple replicas. **[BLOCKED — DEPLOYMENT]**

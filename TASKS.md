# Development Tasks

This file tracks technical fixes and future development work. Keep completed items checked instead of deleting them so decisions and progress remain traceable.

## Status Key

- [ ] Planned
- [x] Completed
- Priority: `P0` critical, `P1` high, `P2` normal, `P3` low

## Current Tasks

### [ ] Build comprehensive backend verification across all test levels

- **Priority:** `P1`
- **Area:** API / testing / quality assurance
- **Problem:** Existing backend coverage is limited to 87 mostly isolated unit tests and does not comprehensively verify every endpoint, service, database invariant, security boundary, failure mode, dependency interaction, concurrency path, performance limit, or deployment behavior.
- **Expected change:** Create and maintain a risk-based backend test program covering unit, contract, component, integration, end-to-end, authorization/security, concurrency, migration, resilience, load, stress, soak, and deployment smoke tests without adding product features.
- **Acceptance criteria:**
  - A traceability matrix maps every API route, business transition, role/ownership rule, queue job, migration, and documented error response to positive, negative, boundary, and failure-path tests.
  - Unit and property/boundary tests cover validation, normalization, calculations, state machines, redaction, and error translation.
  - Real PostgreSQL/Redis integration tests cover transactions, constraints, locks, idempotency, retries, migrations, queues, and dependency loss.
  - End-to-end tests exercise complete parent and administrator workflows through the compiled HTTP API, including cookies, CORS, rate limits, and authorization denial.
  - Load, spike, stress, and soak tests establish and enforce agreed p95/p99 latency, throughput, error-rate, connection, memory, CPU, and recovery thresholds for critical endpoints.
  - Mutation/coverage reporting identifies untested logic, with documented minimum thresholds and no exclusion of security- or finance-critical paths without review.
  - The suite is deterministic, parallel-safe, cleans up its data, produces actionable CI artifacts, and separates fast pull-request checks from scheduled heavy tests.
- **Notes:** Coordinate with the focused real-database CI task below; this task defines the complete test strategy and coverage standard.

### [x] Handle duplicate parent national IDs gracefully

- **Priority:** `P1`
- **Area:** API / registrations
- **Problem:** Guided enrollment can violate the `parents_national_id_unique` database constraint and reach the global exception handler as an unhandled exception.
- **Expected change:** Detect an existing parent before insertion, or translate the database uniqueness error into a clear conflict/validation response.
- **Acceptance criteria:**
  - Reusing an existing national ID does not produce an unhandled exception.
  - The API returns an appropriate `409 Conflict` or documented validation response.
  - The enrollment transaction remains consistent and creates no partial records.
  - Automated coverage includes duplicate and concurrent submission cases.
- **Notes:** Completed 2026-08-02. Added constraint-specific PostgreSQL conflict translation across family creation/update and guided enrollment paths, with duplicate/concurrency-focused tests and API typecheck verification.

### [x] Repair or correctly route map-tile requests

- **Priority:** `P1`
- **Area:** API / maps / reverse proxy
- **Problem:** Requests to `/api/map-tiles/{z}/{x}/{y}` repeatedly return `Cannot GET`, preventing map tiles from loading through the expected endpoint.
- **Expected change:** Implement the missing endpoint or update the frontend/proxy configuration to use the correct tile URL.
- **Acceptance criteria:**
  - Map tiles load at low and high zoom levels.
  - The browser console and API output contain no repeated map-tile 404 errors.
  - The map initializes reliably after navigation, refresh, slow-network loading, tab restore, and container resize; recoverable provider/network failures show a clear retry state instead of a blank map.
  - Address search, current-location, marker placement, and saved coordinates remain synchronized, with an accessible manual-address fallback when the map is unavailable.
  - Required caching, attribution, authentication, and upstream rate limits are respected.
  - A production-like deployment verifies the complete browser-to-provider request path.
- **Notes:** Completed 2026-08-02. Added strict tile-coordinate validation, bounded/cached OSM proxying with controlled failures, linked attribution, map loading/error/retry/manual-address states, resize/tab restoration handling, and mocked route/component tests.

### [ ] Enable Redis-compatible memory overcommit on the host

- **Priority:** `P2`
- **Area:** Infrastructure / Redis
- **Problem:** Redis warns that `vm.overcommit_memory` is disabled, which can cause background persistence or replication to fail under memory pressure.
- **Expected change:** Set `vm.overcommit_memory=1` through the host's persistent system configuration and document the deployment prerequisite.
- **Acceptance criteria:**
  - The setting survives a host reboot.
  - Redis starts without the memory-overcommit warning.
  - A background save completes successfully after the change.
- **Notes:** Repository-side work completed 2026-08-02: fail-closed host preflight, persistent sysctl policy, hardened systemd/Docker ordering, guarded installer, tests, and release runbook are present. The production operator must still apply it and capture post-reboot Redis warning/BGSAVE evidence before this host-state task can close.

### [x] Prevent stale or invalid Next.js Server Action requests

- **Priority:** `P2`
- **Area:** Web / deployment
- **Problem:** The web service reports `Failed to find Server Action "x"`, which may indicate stale clients, mismatched build artifacts, or malformed requests.
- **Expected change:** Confirm that each deployment serves matching Next.js assets and server code, then handle stale-client requests without noisy application errors where practical.
- **Acceptance criteria:**
  - A normal deployment and rollback do not produce Server Action ID mismatches.
  - Old browser tabs recover through refresh/retry or receive a controlled response.
  - All web replicas run the same build during a release.
- **Notes:** Completed 2026-08-02. Production builds now require an immutable Next deployment ID and a valid shared Server Action encryption key supplied as a BuildKit secret; all replicas are promoted from one image, stale clients use Next.js hard-navigation recovery, and rollback-by-digest/probe diagnosis is documented. Focused validation, Compose rendering, lint, typecheck, and a production build pass.

### [ ] Verify PostgreSQL is not exposed with trust authentication

- **Priority:** `P2`
- **Area:** Infrastructure / database
- **Problem:** PostgreSQL initialization enables `trust` authentication for local connections. This is safe only while those connections remain isolated from untrusted networks.
- **Expected change:** Verify database port exposure and container-network boundaries; use password or certificate authentication if any untrusted client can reach PostgreSQL.
- **Acceptance criteria:**
  - PostgreSQL is not publicly reachable.
  - Deployment documentation states the intended authentication and network model.
  - Production-like environments require credentials for connections outside the trusted container boundary.
- **Notes:** Partial progress: PostgreSQL is no longer published or exposed, is isolated to the internal backend network, and uses an explicit SCRAM-only `pg_hba.conf` with static regression checks. A live bad-password/HBA verification still requires an available Linux Docker engine.

### [ ] Remove development providers, demo seeding, and fallback secrets from production deployment

- **Priority:** `P0`
- **Area:** Infrastructure / API / deployment
- **Problem:** The server Compose configuration runs the API with `NODE_ENV=development`, console OTP delivery, the mock payment gateway, debug logging, a predictable fallback JWT secret, fixed database/Redis passwords, and an automatic bootstrap that seeds demo accounts and personal data. A production deployment can therefore disclose OTPs, accept fake payments, issue forgeable sessions, or contaminate live data.
- **Expected change:** Split development and production deployment configuration, require secrets from an approved secret source with no fallback values, run migrations separately from opt-in development seeding, and fail startup when a development-only provider or unsafe credential is selected in production.
- **Acceptance criteria:**
  - Production startup fails closed if the JWT/database/Redis credentials or real OTP/payment providers are absent.
  - Production configuration uses `NODE_ENV=production`, non-debug logging, and never selects console OTP or mock payment adapters.
  - Deploying or restarting production cannot execute `seedDatabase` or create demo accounts.
  - Secrets are rotated after the change and do not appear in Compose files, image layers, logs, or repository history.
  - Automated configuration tests cover every rejected production combination.
- **Notes:** Partial progress 2026-08-02: base production configuration requires external secrets, rejects debug/demo seeding and console/mock/absent providers, and uses migration-only bootstrap plus an explicit development override. Remaining completion requires real OTP/payment adapters and operational rotation of previously used secrets.

### [x] Prevent cross-account payment idempotency collisions and data disclosure

- **Priority:** `P0`
- **Area:** API / payments / security
- **Problem:** `startOnlinePayment` looks up an idempotency key globally and returns the matching transaction without verifying its user, schedule item, or request parameters. A reused or guessed key can disclose another family's transaction, while a missing header becomes the shared empty-string key and breaks later payments. The pre-check and insert are also race-prone.
- **Expected change:** Require and validate a bounded idempotency key, scope its stored request fingerprint to the authenticated user and payment operation, resolve concurrent uniqueness conflicts safely, and return a conflict when the same key is reused with different parameters.
- **Acceptance criteria:**
  - A missing, blank, oversized, or malformed idempotency key receives a documented validation response.
  - A key can never return transaction data owned by another user or another schedule item.
  - Concurrent identical requests create exactly one transaction and return the same safe result.
  - Reusing a key with a different request fingerprint returns `409 Conflict`.
  - Automated tests cover cross-user, cross-item, missing-key, replay, and concurrent cases.
- **Notes:** Completed 2026-08-02. Added validated bounded keys, authenticated-user/operation composite uniqueness, SHA-256 request fingerprints, safe owned replay projections, deterministic conflict handling, migration, and cross-user/item/replay/concurrency tests.

### [x] Harden OTP generation, throttling, and one-time consumption against concurrency

- **Priority:** `P0`
- **Area:** API / authentication / security
- **Problem:** OTP codes use `Math.random`, cooldown and attempt counters use read-then-write logic, and successful verification is not claimed atomically. Concurrent requests can bypass cooldown/attempt limits or consume the same OTP more than once. Generic global IP throttling alone is insufficient and may be inaccurate behind the reverse proxy.
- **Expected change:** Generate OTPs with a cryptographically secure random source; enforce send, attempt, expiry, and single-use rules atomically in the database or a trusted rate-limit store; add phone/account plus trusted-client-IP limits; and invalidate superseded codes.
- **Acceptance criteria:**
  - OTP values come from a CSPRNG and remain hashed at rest and redacted from production logs/responses.
  - Only one active code exists per phone and purpose, and a verified code cannot succeed twice under concurrent requests.
  - Concurrent invalid attempts cannot exceed the configured maximum or lose counter increments.
  - Resend limits apply per phone/purpose and per trusted client IP with documented windows.
  - Tests include parallel send, parallel verify, brute-force, expiry, resend, and proxy-IP cases.
- **Notes:** Completed 2026-08-02. Replaced `Math.random` with `crypto.randomInt`, added hashed/atomic single-use OTP state, resend/attempt/expiry/IP controls, delivery-failure invalidation, trusted-proxy CIDR validation, isolated exact-address Caddy wiring, migration, and concurrency/proxy tests.

### [x] Enforce session revocation and live account status on access-token requests

- **Priority:** `P0`
- **Area:** API / authentication / authorization
- **Problem:** `AuthGuard` validates only the access-token signature and type. It does not check whether the referenced session is revoked/expired or whether the parent/admin account was disabled, so logout, refresh-token reuse detection, and administrator archival do not immediately remove API access.
- **Expected change:** Make protected-request authorization verify session state and current account status, with an efficient cache or short-lived lookup strategy, and revoke all relevant sessions when an account is disabled or security reuse is detected.
- **Acceptance criteria:**
  - Logged-out, rotated, reused, expired, and explicitly revoked sessions cannot use existing access tokens.
  - Archiving an administrator or disabling a family account immediately blocks protected endpoints.
  - Refresh rotation is atomic and only one concurrent refresh succeeds; reuse handling cannot revoke a newly established legitimate session incorrectly.
  - Negative authorization tests cover both roles and every revocation path.
- **Notes:** Completed 2026-08-02. Protected requests now verify live session ownership/revocation/expiry and account status; admin disable revokes transactionally; refresh rotation atomically claims the prior session with both-role concurrency tests and generic failures.

### [x] Validate and normalize every API request at the transport boundary

- **Priority:** `P1`
- **Area:** API / validation / controllers
- **Problem:** Many controllers use inline TypeScript types, service parameter types, or `any` for bodies and route parameters. These types do not exist at runtime, so the global validation pipe does not validate or strip those inputs. Invalid dates, UUIDs, status strings, monetary values, coordinates, nested arrays, and oversized text can reach services or PostgreSQL as unhandled errors or corrupt state.
- **Expected change:** Replace unvalidated bodies/params/queries with explicit DTO classes and nested validation, normalize Iranian digits/phone/date inputs consistently, validate UUID route parameters, and define endpoint-specific size and range limits.
- **Acceptance criteria:**
  - Every non-empty request body, route parameter, query, and required header has runtime validation.
  - Unknown fields are rejected and malformed values return a stable `400` error contract without database details.
  - Money is positive and within the storage range; coordinates, dates, academic years, enums, text lengths, arrays, and identifiers have documented bounds.
  - Contract tests enumerate invalid and boundary inputs for every mutating endpoint.
- **Notes:** Completed 2026-08-02. Explicit runtime DTOs, pipes, normalization, bounds, and stable error contracts now cover all controllers and mutating boundaries. Architecture and financial-constraint regressions were corrected without exceptions; the independently rerun API suite passes 167/167 tests across 33 files.

### [x] Make workflow and financial state transitions atomic and concurrency-safe

- **Priority:** `P1`
- **Area:** API / database / payments / contracts / registrations
- **Problem:** Several operations validate state and then perform related updates in separate statements or transactions, including price acceptance plus plan creation, contract generation/acceptance/rejection, enrollment transitions, pricing version replacement, offline rejection, and payment-plan creation. Concurrent requests can create duplicate versions/plans/contracts, overwrite terminal states, or leave registration, contract, plan, and schedule states inconsistent.
- **Expected change:** Put each business transition and all dependent writes in one transaction, lock or conditionally update the authoritative row, make repeat submissions idempotent where appropriate, and add database constraints for invariants that must survive application bugs.
- **Acceptance criteria:**
  - Concurrent duplicate commands produce one valid transition and deterministic conflict/idempotent responses.
  - Price, plan, schedule, contract, registration, and payment totals/statuses cannot disagree after any success or failure path.
  - Offline approve/reject only applies to eligible manual transactions and cannot alter successful or already rejected transactions.
  - Active-enrollment, payment-plan, accepted-price, contract-version, and pending-offline-payment invariants are enforced by database constraints where practical.
  - Integration tests exercise concurrent commands and rollback at each failure point.
- **Notes:** Completed 2026-08-02. Price/plan/schedule, pricing replacement, contracts, registrations, and manual-payment decisions now use shared transaction logic, row locks/compare-and-set transitions, deterministic conflicts/idempotency, and database uniqueness invariants. A review-found zero-row transition gap was corrected with rollback coverage; the independently rerun API suite passes 169/169 tests across 34 files.

### [x] Decouple committed business changes from notification delivery failures

- **Priority:** `P1`
- **Area:** API / notifications / reliability
- **Problem:** Most services commit core database changes and then insert notifications afterward. If notification insertion fails, the API returns an error even though the enrollment, contract, payment, family, or account mutation already succeeded; clients may retry and duplicate or conflict with committed work. The BullMQ notification worker currently only logs jobs and is not a durable delivery path.
- **Expected change:** Write notification/outbox events in the same transaction as the business mutation, deliver them asynchronously with idempotent workers, and define retry/dead-letter/observability behavior without rolling back or misreporting an already committed operation.
- **Acceptance criteria:**
  - A notification-provider or worker outage never changes or misreports the outcome of a committed business command.
  - Outbox records are committed atomically, processed at least once, and deduplicated by a stable event ID.
  - Failed jobs have bounded retry, dead-letter visibility, and an operational replay procedure.
  - Integration tests simulate database, Redis, and delivery failures before and after commit.
- **Notes:** Completed 2026-08-02. Every notification-producing mutation writes a stable deduplicated intent inside its business transaction. A durable outbox worker uses skip-locked leases, restart recovery, at-least-once idempotent delivery, bounded exponential retry, and dead-letter diagnostics without logging payload/PII or depending on Redis at command time. Independent API tests/typecheck pass: 174/174 across 35 files.

### [ ] Add complete audit coverage for privileged and financial mutations

- **Priority:** `P1`
- **Area:** API / audit / security
- **Problem:** An append-only audit table and `AuditService` exist, but business services do not call it. Administrator account changes, family/student edits, enrollment decisions, pricing, contracts, and payment approvals/rejections therefore lack a reliable actor/action trail.
- **Expected change:** Record sanitized before/after values and request context for every privileged or financially material mutation in the same transaction as the change, while preserving immutable audit history and minimizing personal data.
- **Acceptance criteria:**
  - Every admin mutation and every payment/contract state transition records actor, action, entity, timestamp, and correlation metadata.
  - Audit creation failure rolls back the protected mutation instead of leaving an unaudited change.
  - Secrets and unnecessary national IDs, phone numbers, addresses, tokens, and payment data are redacted or omitted.
  - Tests verify coverage, immutability, redaction, and access control for audit reads.
- **Notes:** Define an allowlist of auditable fields rather than relying only on key-name redaction.

### [x] Add database-backed readiness checks and resilient connection settings

- **Priority:** `P1`
- **Area:** API / database / operations
- **Problem:** `/health` always returns success without checking PostgreSQL or required Redis, so the proxy can route traffic to an instance that cannot serve requests. The PostgreSQL pool has no explicit connection/query/idle limits or shutdown idempotency, and the worker has no health signal.
- **Expected change:** Separate liveness from readiness, verify required dependencies with strict timeouts, configure bounded database pooling and statement timeouts for the deployment size, expose worker readiness, and make shutdown safe to call once while draining HTTP, jobs, and database connections.
- **Acceptance criteria:**
  - Liveness reports process health without blocking on dependencies; readiness fails promptly when PostgreSQL or required Redis is unavailable.
  - Docker/proxy checks use readiness and stop routing before shutdown begins.
  - Pool size, acquisition/connection/idle/statement timeouts, TLS expectations, and retry behavior are configurable and documented.
  - SIGTERM drains in-flight HTTP/jobs within a bounded grace period and closes each resource exactly once.
  - Operational tests cover dependency loss, slow queries, startup, and graceful termination.
- **Notes:** Completed 2026-08-02. Added separate liveness/readiness with bounded PostgreSQL/required-Redis checks, configurable pool/query/TLS settings, worker readiness, draining state, and idempotent queue/database shutdown with tests and Compose wiring.

### [ ] Bound list queries and large report generation

- **Priority:** `P2`
- **Area:** API / performance / reports
- **Problem:** Most family/admin list endpoints return entire tables, and the comprehensive report loads eleven full tables concurrently before building the complete workbook in memory. Data growth can cause slow queries, excessive memory use, event-loop stalls, container OOM termination, and oversized sensitive exports.
- **Expected change:** Add stable cursor or bounded pagination and indexed ordering to list endpoints, eliminate N+1/in-memory joins where present, and generate existing reports through bounded/streamed queries with concurrency and size controls.
- **Acceptance criteria:**
  - List endpoints enforce a maximum page size and deterministic ordering and return pagination metadata.
  - Query plans for common admin/family filters use appropriate indexes at representative production volume.
  - Report generation has an explicit row/size/runtime limit or streams to bounded storage without holding the dataset and workbook twice in memory.
  - Load tests define acceptable p95 latency, database connections, memory, and event-loop delay.
- **Notes:** Keep the existing report content; this task changes resource usage, not product functionality.

### [x] Normalize database errors into stable safe API responses

- **Priority:** `P1`
- **Area:** API / errors / database
- **Problem:** The global exception filter converts unexpected PostgreSQL constraint, timeout, connectivity, and serialization errors into a generic `500`, while services inconsistently pre-check uniqueness and state. This produces avoidable unhandled errors under concurrency and gives clients no reliable retry/conflict behavior.
- **Expected change:** Add a centralized database-error translator for known unique, foreign-key, check, serialization/deadlock, timeout, and availability failures; use stable application codes; and log sanitized structured diagnostics with correlation IDs.
- **Acceptance criteria:**
  - Expected uniqueness and state conflicts return documented `409` or validation responses.
  - Retryable serialization/deadlock/availability failures are distinguished internally and retried only where the operation is idempotent.
  - Responses never expose SQL, schema, constraint internals, credentials, or personal data.
  - Tests cover every mapped error plus an unknown-error fallback.
- **Notes:** Completed 2026-08-02. Added centralized, sanitized SQLSTATE/constraint translation with provenance-safe database network handling, stable response envelopes, safe diagnostics, and focused exception-filter tests while preserving explicit domain errors.

### [ ] Harden the production container and reverse-proxy boundary

- **Priority:** `P2`
- **Area:** Infrastructure / containers / reverse proxy
- **Problem:** PostgreSQL, Redis, and Caddy images use mutable tags; services have no resource limits, read-only filesystem, dropped capabilities, or log rotation; API request bodies are globally allowed up to 10 MB; and OpenAPI documentation is always exposed. Proxy trust, forwarded client IP behavior, upstream timeouts, and security-header ownership are not explicitly defined.
- **Expected change:** Pin runtime images by digest, apply least-privilege container settings and resource/log limits, set route-specific body limits and proxy timeouts, trust only the known proxy network, and make API documentation exposure an explicit environment policy.
- **Acceptance criteria:**
  - All deployed images are immutable and updated through a documented vulnerability-patching process.
  - Containers run as non-root where supported with minimum capabilities and writable paths, bounded CPU/memory/PIDs, and rotated logs.
  - Oversized requests are rejected before buffering; normal JSON endpoints do not inherit a 10 MB limit without need.
  - Client IP, scheme, request ID, CORS, headers, and rate limiting behave correctly through Caddy and cannot be spoofed by direct clients.
  - OpenAPI is disabled or separately protected in production according to documented policy.
- **Notes:** Keep database and Redis on the internal network and verify restore/backup access before enforcing read-only settings.

### [ ] Add real-database integration and deployment smoke tests to backend CI

- **Priority:** `P1`
- **Area:** API / testing / CI
- **Problem:** The backend CI provisions PostgreSQL and Redis, but the current 87-test suite is predominantly isolated unit coverage and does not exercise repositories, migrations plus application startup, HTTP authentication/cookies, ownership boundaries, queues, or concurrent transactions. CI path filters also omit important backend build inputs such as the root `Dockerfile`, root package metadata, and environment examples.
- **Expected change:** Add deterministic integration suites against disposable PostgreSQL and Redis, start the compiled API for HTTP smoke tests, build and inspect the production API image, and make CI trigger for every file that can change backend artifacts or runtime behavior.
- **Acceptance criteria:**
  - CI applies all migrations to an empty database and to a representative previous-version fixture before starting the compiled API.
  - HTTP tests cover health/readiness, OTP/session cookies, CORS/origin enforcement, role and ownership denial, validation/error envelopes, and core enrollment/payment/contract flows.
  - Concurrency tests use real database connections for OTP, idempotency, price/plan/contract creation, and payment approval invariants.
  - Redis-required worker startup, job retry/deduplication, and dependency-loss behavior are exercised.
  - Changes to `Dockerfile`, Compose/Caddy configuration, root/API package manifests, lockfile, environment schemas/examples, migrations, or API source trigger the backend workflow.
  - CI builds the production API image and verifies it runs as the intended non-root user with a passing smoke request.
- **Notes:** Unit checks currently pass locally: typecheck, lint, build, and 87 tests on 2026-08-01.

### [ ] Establish safe migration, backup, restore, and rollback release procedures

- **Priority:** `P1`
- **Area:** Infrastructure / database / deployment
- **Problem:** Deployment automatically applies forward migrations before API startup, but there is no checked backup/restore procedure, compatibility window, migration lock policy, rollback plan, or production-like upgrade test. A destructive, long-running, partially applied, or application-incompatible migration can block every service or make rollback unsafe.
- **Expected change:** Separate migration execution into an observable one-shot release step, serialize concurrent migrators, classify and review destructive changes, require verified backups for risky releases, and use expand/migrate/contract sequencing when old and new application versions may overlap.
- **Acceptance criteria:**
  - Only one migration runner can mutate a database at a time, with bounded lock/statement timeouts and clear failure reporting.
  - CI tests clean installation and upgrade from the supported previous schema/data fixture and detects schema drift.
  - Production release documentation defines backup creation, integrity verification, restore rehearsal, rollback/roll-forward decisions, and responsible operator steps.
  - A failed migration prevents new application rollout without seeding or partially starting dependent services.
  - Restore and point-in-time recovery objectives are documented and demonstrated in a production-like environment.
- **Notes:** Partial progress 2026-08-02: added advisory-locked migration tooling, encrypted/checksummed backups, guarded restore/validation scripts, an expand/contract recovery runbook, and ephemeral CI migration/backup/restore tests. Remaining completion requires a supported-previous-schema/data upgrade fixture, Redis recovery policy, and recorded production-like PITR/restore evidence against final RPO/RTO targets.

### [ ] Build a complete frontend QA and regression test program

- **Priority:** `P1`
- **Area:** Web / testing / quality assurance
- **Problem:** The frontend has 179 source files and more than 35 page/API routes, but only 33 unit tests and three E2E spec files. There is no comprehensive route/feature traceability, tablet project, visual regression baseline, interaction-state matrix, performance budget, or reliable authenticated full-stack coverage.
- **Expected change:** Create a risk-based frontend test program covering unit, component, integration, contract, end-to-end, accessibility, keyboard, visual regression, responsive, cross-browser, performance, error/recovery, and long-session tests for every existing page and feature without changing the design or adding product behavior.
- **Acceptance criteria:**
  - A traceability matrix maps every page, route, component primitive, form, modal/drawer/menu, table/card view, API state, role, and user action to positive, negative, loading, empty, error, retry, and permission tests.
  - Automated projects explicitly cover laptop, tablet, and phone viewports, portrait/landscape where relevant, zoom/text scaling, reduced motion, keyboard-only use, and touch target checks.
  - Visual snapshots cover every route and material state with reviewed pixel-diff tolerances and stable fonts/data/animations.
  - Accessibility tests combine automated WCAG checks with focus order, focus trapping/restoration, labels/descriptions, announcements, contrast, reflow, and screen-reader-oriented semantic checks.
  - Full-stack tests use deterministic parent/admin fixtures and exercise all existing workflows against disposable API/database/Redis services.
  - Performance checks enforce route-level LCP, CLS, INP, JavaScript, image, request, and memory budgets on representative mobile and laptop hardware profiles.
  - Fast checks run on pull requests and heavier cross-browser, visual, stress, and soak suites run on a documented schedule with retained artifacts.
- **Notes:** This is the frontend counterpart to the comprehensive backend testing task.

### [x] Repair and isolate the existing frontend E2E suite

- **Priority:** `P1`
- **Area:** Web / testing / CI
- **Problem:** The current Playwright run executed 30 tests and all 30 failed. Assertions reference obsolete headings and an `/admin/pricing` route that does not exist, protected tests lack authenticated fixtures and redirect to login, public/API-backed tests depend on an unavailable external API, and the configured projects cover desktop and phone but not tablet.
- **Expected change:** Update expectations to the current UI contract, provision deterministic API/auth data, isolate network dependencies, add a tablet project, and ensure each test proves its preconditions instead of silently exercising an error or login page.
- **Acceptance criteria:**
  - Every E2E test passes locally and in CI from a clean checkout with no manually running services.
  - Parent and admin tests authenticate through supported fixtures and fail clearly when setup is unavailable.
  - Public tests do not fail because an unrelated API dependency is absent; API-backed states are explicitly mocked or supplied by the test stack.
  - Navigation assertions reference only routes present in the production route manifest.
  - Desktop, tablet, and phone projects run the same applicable route/accessibility suite, with device-specific cases clearly scoped.
  - Traces, screenshots, videos on failure, console errors, failed requests, and page errors are retained as CI artifacts.
- **Notes:** Completed 2026-08-02. Playwright now owns isolated web/mock-API ports and deterministic role fixtures, enforces browser health, retains failure artifacts, and runs current public/auth/parent/admin flows across desktop, exact 320px phone, and 768px touch tablet. Independent discovery found 18 tests and the full run passed 15 with three intentional desktop-only skips.

### [x] Render controlled loading, offline, and dependency-failure states on every route

- **Priority:** `P1`
- **Area:** Web / API integration / resilience
- **Problem:** When the API is unavailable, server components such as schools, dashboards, registrations, profiles, contracts, and payments throw raw `fetch failed` errors, switch to client rendering, or fall into broad route errors. This made unrelated pages and most E2E coverage unusable and produces noisy repeated retries rather than a clear recoverable state.
- **Expected change:** Define route-level handling for unavailable, timeout, malformed-response, unauthenticated, forbidden, not-found, and empty responses; use bounded retry only where safe; and keep shared/public layout content usable when one data section fails.
- **Acceptance criteria:**
  - Every API-backed route shows an intentional Persian loading/empty/error state with retry or navigation guidance as appropriate.
  - Network loss, timeout, `401`, `403`, `404`, `409`, `429`, `500`, and invalid envelopes are visually and behaviorally distinct where user action differs.
  - Server-render failures do not expose framework errors, produce hydration fallback warnings, or blank unrelated page sections.
  - Retries are bounded, cancellable, deduplicated, and do not amplify outages or repeat mutations.
  - Automated tests cover dependency failure before navigation, during interaction, after session expiry, and during recovery.
- **Notes:** Completed 2026-08-02. Public/auth/parent/admin routes inherit accessible Persian loading and focused error/retry states; offline, timeout, queue/provider, 5xx, auth, validation, conflict, and rate-limit failures are mapped intentionally with hard duplicate-retry prevention. Independent focused tests pass 10/10 and the dependency 503-to-retry E2E passes; production build and full strict E2E were also reported green.

### [x] Gate protected portals before rendering and harden session transitions

- **Priority:** `P0`
- **Area:** Web / authentication / authorization
- **Problem:** `PortalSessionGuard` renders children immediately and verifies `/auth/me` only in a client effect. Protected parent/admin UI and server-fetched data can render or flash before role validation, while expiry and API outages both redirect through the same path. The in-memory access token is also lost on reload and can trigger competing refresh/redirect behavior across requests.
- **Expected change:** Enforce authentication and role checks at the server/layout boundary where possible, render a neutral blocking state until client verification completes, coordinate one refresh operation, and preserve safe same-origin return navigation without exposing protected content.
- **Acceptance criteria:**
  - Unauthenticated or wrong-role users never receive or briefly see protected page content or data.
  - Reload, back/forward navigation, multiple tabs, concurrent `401` responses, refresh rotation, logout, and account disablement produce one deterministic transition.
  - Dependency outages are not misreported as invalid credentials and do not create redirect loops.
  - Return destinations are limited to valid same-origin application paths.
  - Tests cover parent/admin cross-role access, slow verification, expired cookies, refresh failure/success, and JavaScript hydration delay.
- **Notes:** Completed 2026-08-02. Added a no-flash role-verification gate, hard-reload refresh bootstrap with authoritative `/auth/me`, wrong-role routing, outage retry, bfcache revalidation, dynamic protected layouts, coalesced refresh, logout-race protection, and focused transition tests; backend live-session enforcement remains the security boundary.

### [ ] Fix parent mobile dock overlap, safe-area spacing, and active navigation state

- **Priority:** `P1`
- **Area:** Web / parent portal / responsive
- **Problem:** The parent dock is fixed to the bottom on all widths below `lg`, but the portal content has no matching bottom padding. The `pb-safe` class has no local definition, and dock links do not expose or style the current route. Content/actions can be hidden behind the dock—especially on short phone screens or devices with a home indicator—and users cannot reliably see which section is active.
- **Expected change:** Reserve dock height plus `env(safe-area-inset-bottom)` in the page layout, implement safe-area styles explicitly, and derive visible/semantic active state from the pathname while preserving focus and touch behavior.
- **Acceptance criteria:**
  - No text, form control, validation message, dialog trigger, pagination, or final action can be obscured by the dock at supported phone/tablet heights.
  - The dock clears iOS/Android safe areas in portrait and landscape and does not create excess whitespace where no inset exists.
  - The active item is visually distinct and has `aria-current="page"`.
  - Keyboard focus and screen zoom never place the focused element behind the dock.
  - Visual tests cover every parent route at phone and tablet widths, including the longest forms and error states.
- **Notes:** Partial progress: the parent dock now shares safe-area-aware geometry with page content, uses segment-safe active-route matching, hides for the virtual keyboard, and has 320/360/390/tablet contract tests. Real-browser geometry and visual viewport coverage remain.

### [x] Correct phone navigation, touch targets, and compact-control usability

- **Priority:** `P1`
- **Area:** Web / responsive / accessibility
- **Problem:** Several mobile/public/admin navigation items and small button variants use 40px or smaller minimum heights, below the intended 44px touch target; icon/account controls are tightly packed; and mobile menus must accommodate long Persian labels without clipping or accidental activation.
- **Expected change:** Enforce a consistent minimum interactive target and separation for touch layouts, preserve compact visual styling with larger hit areas where needed, and verify all header, drawer, dock, menu, carousel, accordion, pagination, and dialog controls.
- **Acceptance criteria:**
  - All primary touch interactions meet the agreed minimum target size and spacing at phone and tablet viewports.
  - Persian labels wrap or truncate only with an accessible full name and never overlap icons, badges, or close controls.
  - Menus and drawers trap/restore focus, close predictably, prevent background scroll, and remain usable with keyboard, touch, zoom, and screen readers.
  - Header controls remain visible without horizontal overflow at 320px width and with 200% text scaling.
  - Automated geometry and interaction tests cover every shared navigation/control primitive.
- **Notes:** Completed 2026-08-02. Public/admin mobile navigation uses focus-managed, safe-area-aware drawers; normalized route state and `aria-current`; 44px shared/navigation targets; and safe Persian wrapping. Unit contracts plus independently run strict-browser E2E cover keyboard dismissal/focus restoration, desktop, 320px/200% text, and 768px touch tablet without overflow or browser diagnostics.

### [ ] Make enrollment and long-form flows usable at phone and tablet widths

- **Priority:** `P1`
- **Area:** Web / enrollment / forms / responsive
- **Problem:** The enrollment flow forces four step columns on phone screens, renders step labels at 11px, contains dense multi-column option groups, a map with overlaid controls, long contract/payment content, and side-by-side action assumptions. Similar density exists in family, school, administrator, pricing, and payment forms.
- **Expected change:** Reflow existing form content and progress indicators for narrow screens, preserve context without tiny typography, make action areas and errors visible near their cause, and handle the virtual keyboard, map gestures, long Persian content, and browser zoom.
- **Acceptance criteria:**
  - No form has horizontal page overflow, clipped labels, overlapping controls, or off-screen validation at 320/360/390px phone and representative tablet widths.
  - Step state remains understandable without relying on 11px labels; current, completed, and pending states are announced semantically.
  - Validation summaries link/focus the first invalid field and field errors are associated through `aria-describedby`/`aria-invalid`.
  - Each field validates on change and/or blur as appropriate, and its specific error appears immediately below that field without waiting for final form submission.
  - Mobile date fields use an accessible date picker or automatically insert the required separators while accepting Persian or Latin digits from a numeric keyboard; users never need to type `/` manually.
  - Back/next/submit actions remain reachable above the mobile dock and virtual keyboard and cannot double-submit.
  - Map selection has an accessible non-pointer fallback and does not hijack page scrolling.
  - Visual and interaction tests cover every step, error, saved-data, retry, and success state at all three viewport classes.
- **Notes:** Partial progress 2026-08-02: added inline validation, numeric Jalali entry, semantic progress, first-error focus/summary links, mobile safe-area actions, hard double-submit locking, responsive map/manual fallback, and focused interaction tests. Remaining completion requires viewport-level visual/E2E coverage for every step, saved/error/retry/success state at phone/tablet sizes.

### [ ] Harden the existing website against common application and abuse attacks

- **Priority:** `P0`
- **Area:** Security / API / web / infrastructure
- **Problem:** The existing security tasks cover several individual risks, but there is no explicit end-to-end requirement for injection attacks, abusive traffic, unsafe browser input/output, and secure production defaults across the complete application.
- **Expected change:** Threat-model and harden the current features against SQL/NoSQL/command/template/formula injection, cross-site scripting, CSRF, request smuggling, path traversal, unsafe file/content handling, credential stuffing, brute force, scraping, and denial-of-service/resource-exhaustion attacks using layered controls at the browser, API, proxy, database, and deployment boundaries.
- **Acceptance criteria:**
  - Database access remains parameterized, dynamic identifiers are allowlisted, output is contextually encoded, rich text/HTML is sanitized where applicable, and spreadsheet exports neutralize formula injection.
  - All state-changing browser requests have an explicitly tested CSRF strategy; cookies, CORS, CSP, HSTS, framing, MIME-sniffing, referrer, and permissions policies use secure production settings.
  - Request body, upload, header, query, nesting, timeout, and concurrency limits prevent oversized or slow requests from exhausting application resources.
  - Layered rate limits cover authentication and expensive endpoints by trusted client IP plus account/resource identity, with bounded queues, backpressure, upstream timeouts, and documented reverse-proxy/WAF/DDoS-provider protections.
  - Authentication, authorization, tenant ownership, validation, and error redaction are tested for every endpoint, including automated SAST/DAST/dependency/secret scans and focused OWASP-style abuse tests in CI or scheduled security checks.
  - Security logging detects abnormal failures without recording secrets or unnecessary personal data, and operational runbooks cover blocking, investigation, recovery, and safe limit tuning.
- **Notes:** Partial progress 2026-08-02: parameterized Drizzle access, runtime DTO rejection, trusted-origin/CSRF guards, strict browser/API/proxy headers and body limits, OTP/account/IP throttling, trusted-proxy isolation, safe error/log redaction, dependency/secret/SAST/IaC/container scans, and spreadsheet formula neutralization with regression coverage are present. Endpoint-wide abuse/rate-limit coverage, DAST, WAF/DDoS-provider operations, and an independently exercised threat model/runbook remain. “Fully secure” cannot be guaranteed permanently; defense in depth and continuous review are required.

### [x] Show admin report data before Excel download

- **Priority:** `P1`
- **Area:** Web / admin portal / reports
- **Problem:** The admin reports page only downloads the Excel workbook, so administrators cannot inspect or verify the report in the panel before exporting it.
- **Expected change:** Present the existing report data in the admin panel with the same filters, definitions, permissions, and totals used by the Excel export, while retaining the download action.
- **Acceptance criteria:**
  - The page shows a readable, paginated or virtualized preview with loading, empty, error, and retry states.
  - Previewed values, filters, ordering, totals, timezone/date formatting, and authorization match the downloaded workbook for the same request.
  - Sensitive fields are minimized and protected consistently in both preview and export, and report viewing/downloading is audited.
  - The preview remains usable on phone, tablet, and desktop without loading the entire report into browser memory.
- **Notes:** Completed 2026-08-02. Added an authorized, audited, validated and paginated five-section preview with minimized fields, consistent totals/formatting, responsive table/cards, loading/empty/error/retry states, and retained Excel download. Database-side report streaming remains in the separate performance task.

### [x] Complete admin-added student enrollment and parent contract/payment handoff

- **Priority:** `P1`
- **Area:** Admin portal / families / enrollment / contracts / payments
- **Problem:** Adding a student to an existing family from the admin panel does not capture the complete information collected during parent-led enrollment or clearly hand off contract review and prepayment to the parent.
- **Expected change:** Reuse the existing enrollment schema and validation so the administrator supplies all required parent/student/service/address/school information, then create the same consistent enrollment state while reserving contract acceptance and prepayment for the authenticated parent portal.
- **Acceptance criteria:**
  - The admin flow collects and validates every field required by the equivalent parent enrollment, including conditional fields, without creating a second divergent data model.
  - Saving is transactional and idempotent, detects duplicate students/enrollments, records the administrator in the audit trail, and does not create a contract or payment schedule in an invalid state.
  - The parent receives the existing notification and sees a clear pending action in their panel to review/accept the contract and pay the required prepayment.
  - Only the parent or otherwise explicitly authorized guardian can accept/reject the contract and initiate payment; the administrator cannot silently accept it on their behalf.
  - The enrollment progresses only after the existing contract and prepayment rules succeed, with clear status and failure/retry handling in both panels.
- **Notes:** Completed 2026-08-02. Added the full shared guided-enrollment form and ADMIN-only family endpoint, serialized duplicate protection, generated parent-owned contract/prepayment state, parent notification/handoff, minimized response, and transaction-atomic admin audit with rollback tests; no admin accept/pay capability was added.

### [x] Move logout into the right-side navigation menu

- **Priority:** `P2`
- **Area:** Web / parent portal / admin portal / navigation
- **Problem:** The logout action is placed separately from the right-side account/navigation menu, making account actions inconsistent and harder to find.
- **Expected change:** Move the existing logout action into the right-side menu for authenticated layouts while preserving secure session termination and clear visual separation from navigation links.
- **Acceptance criteria:**
  - Logout appears in the right-side menu on supported desktop, tablet, and mobile layouts and is removed from its previous duplicate location.
  - The control has an accessible name, keyboard/touch support, a sufficient hit target, visible focus, and a destructive-action visual treatment that does not invite accidental activation.
  - Activating logout revokes the session, clears client authentication state, prevents protected-page back-navigation from revealing cached data, and redirects consistently.
  - Navigation and logout interaction tests cover both parent and administrator roles.
- **Notes:** Completed 2026-08-02. Moved the existing secure logout action into parent/admin side navigation and mobile drawers, removed header duplicates, and added role-specific navigation/logout tests.

### [ ] Replace generic horizontal table dependence with verified responsive data views

- **Priority:** `P2`
- **Area:** Web / admin portal / responsive
- **Problem:** The shared table enforces a 640px minimum width and several admin tables use 768px minimum width. Horizontal regions can be valid, but small screens risk hidden columns/actions, unclear scroll affordance, awkward RTL initial position, and keyboard focus moving content out of view. Responsive card alternatives are implemented inconsistently by page.
- **Expected change:** Audit every table and existing card representation, preserve all data/actions at phone and tablet widths, add explicit RTL scroll affordance and accessible region labeling where scrolling remains necessary, and keep desktop column alignment stable.
- **Acceptance criteria:**
  - Every table has a documented phone/tablet behavior and no critical identifier, status, amount, or action becomes inaccessible.
  - Horizontal scrolling starts at the logical RTL edge, is keyboard accessible, and has a visible affordance without causing page-level overflow.
  - Card and table variants present equivalent content and actions with consistent ordering and labels.
  - Sticky headers/actions do not overlap content at browser zoom or small heights.
  - Visual regression covers empty, one-row, long-content, maximum-column, pagination, and loading/error states.
- **Notes:** Prioritize registrations, students, schools, families, contracts, payments, administrators, notifications, and reports.

### [ ] Optimize above-the-fold images and enforce frontend performance budgets

- **Priority:** `P2`
- **Area:** Web / performance / images
- **Problem:** Runtime testing repeatedly warned that hero/LCP images on about, contact, FAQ, pricing, registration guide, schools, and services are not eagerly prioritized. Twenty-one image instances and large decorative assets can delay mobile LCP, consume unnecessary bandwidth, and cause layout/memory pressure; no route-level performance budget currently fails CI.
- **Expected change:** Identify the actual LCP image per viewport, use appropriate Next image priority/loading/fetch priority and accurate `sizes`, verify dimensions/crops/compression, lazy-load below-fold media, and enforce mobile/laptop performance budgets.
- **Acceptance criteria:**
  - No page emits Next.js LCP image-priority warnings in production-mode navigation.
  - Each responsive viewport downloads only appropriately sized image variants and below-fold images remain lazy.
  - Hero crops preserve their intended subject and text-safe area at phone, tablet, and laptop ratios without distortion or unexpected CLS.
  - Route budgets cover LCP, CLS, INP, transferred image bytes, total requests, and JavaScript execution under throttled mobile conditions.
  - Decorative images remain ignored by assistive technology; informative images retain accurate Persian alternatives.
- **Notes:** Partial progress 2026-08-02: image priority/`sizes` and lazy loading are audited across 15 components; static and real-Chrome mobile/laptop budgets now enforce LCP, CLS, real-control interaction latency, image/JS bytes, requests, and HTTP status with retained JSON in PR/scheduled CI. The final installed-Chrome smoke run passed every metric except mobile CLS on `/` (0.39638) and `/about` (0.78432) against 0.1, so this task remains open until those layout shifts are fixed and the full 10-route audit passes.

### [x] Add route-specific metadata and verify public document quality

- **Priority:** `P3`
- **Area:** Web / routing / document semantics
- **Problem:** Only a subset of auth pages defines route metadata; most public and portal pages inherit the generic site title and description. This makes browser history, bookmarks, shared links, and assistive navigation difficult to distinguish and leaves canonical/indexing policy undefined for protected pages.
- **Expected change:** Define accurate existing-page titles/descriptions and canonical/indexing rules, ensure one meaningful `h1` and logical heading hierarchy per state, and validate not-found/error/loading documents without adding marketing features.
- **Acceptance criteria:**
  - Every route has a unique, accurate Persian title; public routes have suitable descriptions and canonical URLs.
  - Parent/admin/auth pages follow the documented `noindex` policy and never expose sensitive values in titles, URLs, or metadata.
  - Every normal, empty, error, and dynamic-detail state has a valid landmark and heading hierarchy.
  - Route-manifest tests detect missing or duplicate metadata and broken internal links.
- **Notes:** Completed 2026-08-02. All 38 routes have audience-appropriate Persian metadata/canonical/robots policy without identifiers, and automated route-manifest/document tests cover unique titles, 33 content-route H1s, five redirects, RTL language semantics, and error/loading/not-found states. Both focused test files and web typecheck pass independently.

### [ ] Add frontend and repository-wide quality gates to CI

- **Priority:** `P1`
- **Area:** CI / web / monorepo
- **Problem:** The repository contains only a backend workflow. Frontend lint, typecheck, unit tests, production build, E2E/accessibility/visual checks, root workspace validation, and Docker/Compose verification are not enforced on pull requests. The backend workflow also runs only selected workspace commands and can miss cross-package breakage.
- **Expected change:** Add change-aware but complete web and repository workflows, reuse pinned setup, validate production configuration and artifacts, and make required checks block merging without duplicating expensive work unnecessarily.
- **Acceptance criteria:**
  - Relevant changes run frontend lint, typecheck, unit tests, production build, E2E projects, accessibility checks, and approved visual regression checks.
  - Root package/config/lockfile/shared-package changes run both API and web quality gates.
  - Dockerfile, Compose, Caddy, environment schema/example, and deployment changes build and smoke-test the affected production artifacts.
  - Required checks cannot be skipped by incomplete path filters, renamed files, or a stale generated route/type artifact.
  - CI concurrency cancels superseded runs, caches only safe reproducible outputs, retains failure artifacts, and uses least-privilege workflow permissions.
- **Notes:** The existing backend workflow should be consolidated or coordinated rather than copied blindly.

### [ ] Establish application observability, service objectives, and incident diagnostics

- **Priority:** `P1`
- **Area:** Operations / API / web / worker
- **Problem:** The app has structured API logs and request IDs but no defined metrics, distributed trace propagation, frontend error reporting, queue/database dashboards, service-level objectives, alert thresholds, or incident runbooks. Failures such as API unavailability, payment verification errors, OTP delivery failure, queue backlog, migration failure, and client rendering errors cannot be detected or diagnosed consistently.
- **Expected change:** Define privacy-safe logs, metrics, traces, dashboards, alerts, correlation propagation, health ownership, and runbooks for the existing services and critical workflows.
- **Acceptance criteria:**
  - API, web, worker, proxy, PostgreSQL, Redis, and payment/OTP adapters expose agreed availability, latency, error, saturation, and backlog signals.
  - Browser and server errors correlate to the same request/session-safe identifiers without collecting secrets or unnecessary personal data.
  - SLOs and alerting cover authentication, enrollment, contract acceptance, payment initiation/verification, notification processing, and report generation.
  - Alerts are actionable, deduplicated, tested, and linked to runbooks for dependency outage, queue growth, database exhaustion, elevated auth failures, and release regression.
  - Log retention, access, redaction, sampling, clock synchronization, and production log levels are documented and verified.
- **Notes:** Choose tooling during implementation; the task is operational reliability, not a user-facing feature.

### [ ] Define and enforce personal-data privacy, retention, and export controls

- **Priority:** `P0`
- **Area:** Security / privacy / data governance
- **Problem:** The system processes children's and parents' national IDs, phone numbers, addresses, precise coordinates, emergency contacts, contracts, payment records, IP addresses, and user agents. There is no complete data inventory, purpose/retention schedule, deletion/anonymization policy, field-level access review, export governance, or production-data handling policy for support, testing, backups, and logs.
- **Expected change:** Classify personal and financial fields, minimize collection/exposure, define lawful operational retention and deletion/anonymization workflows, restrict exports and operational access, and verify that logs, audits, backups, test fixtures, and error reports follow the same policy.
- **Acceptance criteria:**
  - A maintained data map identifies purpose, owner, sensitivity, storage locations, processors, access roles, retention, deletion method, and backup behavior for every personal field.
  - API responses, admin tables, notifications, URLs, browser state, reports, logs, traces, and audit records expose only data required for the current role/task.
  - Spreadsheet exports require explicit authorization, are audited, protected from formula injection, avoid unsafe caching, and have documented secure delivery/disposal.
  - Production data is prohibited from development/tests unless irreversibly anonymized through a reviewed process.
  - Account/data deletion or legal retention exceptions produce consistent outcomes across primary data, queues, derived records, backups, and immutable financial/audit history.
  - Automated tests verify field-level role access, redaction, retention jobs, export safety, and anonymization invariants.
- **Notes:** Obtain applicable Iranian legal/privacy requirements during implementation; preserve records that must remain immutable while minimizing identifiable data.

### [ ] Add software supply-chain and dependency security governance

- **Priority:** `P1`
- **Area:** Security / dependencies / CI / releases
- **Problem:** CI performs only a high-severity package audit in the backend job. There is no automated dependency update policy, secret scanning, SAST, container/IaC scanning, SBOM, license review, provenance/signing, action pinning by commit, or documented response window for vulnerable Node, OS, database, Redis, Caddy, and GitHub Action dependencies.
- **Expected change:** Introduce repository-wide automated scanning and controlled updates, pin release inputs immutably, generate verifiable release metadata, and define remediation/exception ownership without automatically accepting unsafe major upgrades.
- **Acceptance criteria:**
  - Pull requests and scheduled jobs scan committed secrets, source, lockfile dependencies, licenses, containers, and infrastructure configuration with reviewed severity gates.
  - Direct/transitive dependencies and runtime images receive grouped, tested update proposals on a documented cadence.
  - Production artifacts include an SBOM and provenance and are signed or otherwise verifiably tied to the reviewed commit/build.
  - GitHub Actions and external build inputs are pinned immutably with minimum permissions.
  - Vulnerability triage defines owners, remediation targets, compensating controls, expiration of exceptions, and emergency release steps.
- **Notes:** Partial progress 2026-08-02: scheduled/PR dependency, license, secret, SAST, IaC, filesystem, and container scans; grouped Dependabot updates; SPDX SBOMs; immutable Action pins with enforcement; digest-pinned runtime images; minimum permissions; remediation/exception/emergency-release policy; and hardened container boundaries are present. Signed artifact provenance still depends on selecting/enabling the production registry and GitHub attestation-capable publishing environment; executable container verification remains blocked by the unavailable Linux Docker engine.

### [ ] Keep the frontend API contract synchronized with the backend

- **Priority:** `P1`
- **Area:** API / web / contracts
- **Problem:** Frontend feature modules manually define request/response shapes independently of Nest controllers and the generated OpenAPI document. TypeScript compilation cannot detect backend DTO, enum, pagination, error-envelope, nullability, or route changes, so deployments can compile successfully while failing at runtime.
- **Expected change:** Treat a validated API schema as a versioned build artifact, check compatibility in CI, and derive or validate frontend contract types/fixtures from that schema while preserving the HTTP architecture boundary.
- **Acceptance criteria:**
  - Every frontend API call maps to a documented operation and validated request/response/error schema.
  - CI fails on undocumented endpoints, incompatible schema changes, stale generated/validated types, or mocks that no longer satisfy the real contract.
  - Contract tests cover success, validation, authentication, authorization, conflict, rate-limit, and service-unavailable envelopes.
  - Deployment sequencing documents backward compatibility for independently deployed web/API versions and stale browser clients.
  - Sensitive fields cannot appear in frontend types/responses unless explicitly reviewed for that role.
- **Notes:** Avoid importing API implementation code directly into the web package.

### [ ] Unify environment configuration, documentation, and startup validation

- **Priority:** `P2`
- **Area:** Configuration / documentation / developer experience
- **Problem:** Environment variables are duplicated across root/API examples, Compose, Docker build arguments, Next runtime code, and Zod validation. `API_INTERNAL_BASE_URL` is used in production Compose/code but absent from examples, `TEST_DATABASE_URL` is documented only at the root, Drizzle has a silent localhost fallback, and README deployment language does not clearly separate development Compose from safe production operation.
- **Expected change:** Define one authoritative environment inventory with per-service/runtime/build-time ownership, validate every entry at startup/build, generate or check examples/docs, and remove silent fallbacks that can connect to the wrong service or database.
- **Acceptance criteria:**
  - Every consumed variable is documented with scope, required environments, type/range, secret classification, safe example, and reload/rebuild behavior.
  - CI detects variables used in code/deployment but missing from validation/examples and detects stale unused entries.
  - Production and test startup fail before side effects when required configuration is missing, malformed, contradictory, or points to an unsafe environment.
  - README commands accurately describe development versus production-like operation, ports, providers, seeding, migrations, and prerequisites.
  - Database tooling never silently targets an implicit localhost/default database for mutating commands.
- **Notes:** Partial progress 2026-08-02: a scoped/secret/reload-aware environment inventory and separate web/local-Compose examples now exist; production web build validation covers API URL, deployment ID, and Server Action key; Drizzle and worker readiness no longer use implicit database/Redis fallbacks; README separates the production base stack from the explicit development override. A CI drift gate currently covers 42 consumed variables and rejects undocumented or stale example entries. Complete test-database safety validation remains.

### [ ] Make formatting and monorepo quality commands reproducible

- **Priority:** `P2`
- **Area:** Tooling / code quality / developer experience
- **Problem:** The web package defines `format` and `format:check` scripts but does not declare Prettier, so `pnpm --filter web format:check` fails with “prettier is not recognized.” The root has no formatting command, API formatting policy, or CI formatting gate; Turbo tasks also do not declare all relevant inputs/outputs/environment dependencies for reliable caching.
- **Expected change:** Pin the formatter and shared configuration, expose consistent root/workspace commands, enforce check-only formatting in CI, and audit Turbo task inputs, environment dependencies, cache outputs, and package scripts for deterministic clean-checkout behavior.
- **Acceptance criteria:**
  - Install, lint, typecheck, test, format-check, and build commands work from a clean checkout on supported environments using the locked toolchain.
  - One root format-check covers API, web, packages, configuration, workflows, Markdown, and supported data files with documented exclusions.
  - CI runs check-only formatting and never rewrites source.
  - Turbo cache keys include environment/config inputs that affect outputs and exclude secrets from remote caches/logs.
  - Node and pnpm versions used locally, in containers, and in CI are aligned or explicitly tested as a supported matrix.
- **Notes:** Baseline observed on 2026-08-02: lint, typecheck, and 120 unit tests pass; formatting cannot start because Prettier is missing.

## Backlog

Add future development work here using this template:

### [ ] Task title

- **Priority:** `P2`
- **Area:**
- **Problem:**
- **Expected change:**
- **Acceptance criteria:**
  -
- **Notes:**

## Completed Tasks

Move or copy completed tasks here, retain their checked state, and record completion details.

## Change Log

| Date       | Change                                                                                                                                                                                                      | Reference                       |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 2026-08-01 | Created task tracker from test-deployment health review.                                                                                                                                                    | Initial review                  |
| 2026-08-01 | Added comprehensive backend QA/QC remediation tasks covering production safety, authentication, payments, validation, consistency, reliability, auditability, performance, errors, and container hardening. | Backend file-by-file review     |
| 2026-08-01 | Added CI integration coverage and database release-safety tasks after installing dependencies and running local backend quality gates.                                                                      | Runtime-assisted backend review |
| 2026-08-01 | Added a comprehensive backend test-program task before the full frontend QA/QC phase.                                                                                                                       | Requested test expansion        |
| 2026-08-01 | Added comprehensive frontend QA/QC tasks after source review, production build, unit checks, E2E execution, and responsive/runtime analysis.                                                                | Full frontend review            |
| 2026-08-02 | Added final whole-app tasks for CI, observability, privacy, supply-chain security, API contracts, configuration drift, and reproducible tooling.                                                            | Repository-wide closing audit   |
| 2026-08-02 | Consolidated requested security, map reliability, inline validation/mobile date entry, report preview, admin-added student handoff, and logout-menu improvements without adding new product scope.          | Product improvement review      |

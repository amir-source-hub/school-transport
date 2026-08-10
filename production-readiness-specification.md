# Production Readiness Specification

> Created on 2026-08-10. This is an implementation checklist, not evidence that production is ready. Check an item only after its implementation, independent review, and recorded verification are complete. Product/provider work still blocked in `remaining-implementation-specification.md` remains out of scope until its inputs exist.

## Target repository shape

- [ ] Keep exactly one ignored root `.env` on each machine and one tracked root `.env.example`. The files share one variable contract, but development and production must use different values and secrets. Never copy a development `.env` onto a production server. **[REQUIRED — ENVIRONMENT ISOLATION]**
- [ ] Replace the current Compose base-plus-override arrangement with two explicit entry points: `docker-compose.local.yml` for development and `docker-compose.production.yml` for production. Each command must name its file explicitly with `docker compose --env-file .env -f <file> ...`; no deployment may depend on Compose's implicit file selection. **[REQUIRED — COMPOSE CLARITY]**
- [ ] Keep one multi-stage root `Dockerfile` unless independently deployable images later require separate files. Preserve distinct `api` and `web` targets, pinned base-image digests, an unprivileged runtime user, `tini`, health checks, and production-only dependencies. **[REQUIRED — IMAGE BOUNDARY]**
- [ ] Keep one root `.dockerignore` and one root `.gitignore`. Remove app-level environment examples only after every consumer, script, CI workflow, and document reads the root contract successfully. **[REQUIRED — SAFE CONSOLIDATION]**
- [ ] Do not commit `.env`, secret files, generated credentials, database dumps, backups, certificates, private keys, logs, uploads, build output, Playwright artifacts, or local volumes. Verify with `git ls-files`, `git check-ignore`, and a secret scan before every release. **[REQUIRED — SOURCE CONTROL HYGIENE]**

## 1. Environment contract consolidation

- [ ] Inventory every environment lookup in application code, Docker/Compose, CI, tests, scripts, and documentation with `rg "process\.env|env\(|\$\{"`; compare the result with `docs/ENVIRONMENT.md` and fail CI when code and the root example drift. **[IMPLEMENTATION — REPOSITORY ROOT/CI]**
- [ ] Build the single tracked `.env.example` from the complete inventory. Include every supported variable exactly once, grouped by shared, database, Redis, API/authentication, web/build, proxy, object storage, SMS, payment, observability, feature flags, and test-only settings. **[IMPLEMENTATION — `/.env.example`]**
- [ ] Put safe non-secret defaults in `.env.example` only where a universal default is intentional. For secrets and deployment-specific addresses, leave the value empty and add comments describing required format, minimum entropy, owner, build-time/runtime phase, and whether the value is public. Do not publish realistic-looking credentials. **[IMPLEMENTATION — `/.env.example`]**
- [ ] Add the Compose-only variables missing from the current main example, including `POSTGRES_PASSWORD` and `REDIS_PASSWORD`, and reconcile the API-only controls such as `PG_POOL_MAX`, `PG_IDLE_TIMEOUT_MS`, `PG_CONNECT_TIMEOUT_MS`, `PG_STATEMENT_TIMEOUT_MS`, `PG_SSL_MODE`, `READINESS_TIMEOUT_MS`, `TRUSTED_PROXY_CIDRS`, `FEATURE_ADMIN_2FA`, `FEATURE_ONBOARDING`, and `SEED_DEMO_DATA`. **[IMPLEMENTATION — ENVIRONMENT INVENTORY]**
- [ ] Classify `NEXT_PUBLIC_*` values as public build inputs. Confirm that no secret, internal hostname, credential, token, or private bucket detail uses the `NEXT_PUBLIC_` prefix because those values are embedded in browser assets. **[SECURITY — WEB BUILD]**
- [ ] Classify `NEXT_DEPLOYMENT_ID` and `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` as immutable web-build inputs. All replicas in one release must share them; a changed value requires rebuilding the web image, and old/new Server Action compatibility must follow `infrastructure/container/NEXTJS_DEPLOYMENTS.md`. **[SECURITY — NEXT.JS RELEASE]**
- [ ] Update the environment assertion script to validate the consolidated root example, reject duplicates and undocumented variables, require production-only variables in production mode, and reject placeholder, empty, weak, loopback, development-provider, or demo-seed values where unsafe. **[IMPLEMENTATION — `infrastructure/config/assert-environment-inventory.mjs`]**
- [ ] Update `pnpm dev`, Turbo tasks, API startup, web startup, tests, migration scripts, and Compose commands to load only the root `.env`. Remove `apps/api/.env.example`, `apps/web/.env.example`, and `.env.development.example` only after those consumers pass from a clean clone. **[IMPLEMENTATION — TOOLING]**
- [ ] Preserve `.env` in `.gitignore`, add patterns for `.env.*` while explicitly allowing only `.env.example`, and verify `git check-ignore -v .env` succeeds while `git check-ignore .env.example` does not. **[SECURITY — `/.gitignore`]**

## 2. Secret generation, storage, and rotation

- [ ] Generate production secrets on the production host or in an approved secret manager, not on a developer workstation and never in this specification. Use a cryptographically secure generator: at least 32 random bytes for `JWT_SECRET`, `METRICS_BEARER_TOKEN`, database passwords, and Redis passwords. **[SECURITY — PRODUCTION SECRET STORE]**
- [ ] Generate `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` as a base64-encoded AES key whose decoded length is exactly 16, 24, or preferably 32 bytes. Inject it as a BuildKit secret so it is not stored in a Dockerfile layer, build argument, image config, CI log, or Compose-rendered output. **[SECURITY — BUILD SECRET]**
- [ ] Use separate credentials for PostgreSQL application runtime, migrations, backups, restore validation, monitoring, and administrators. Grant the minimum schema/database privileges to each identity and prevent the runtime account from creating roles or databases. **[SECURITY — DATABASE IAM]**
- [ ] Require Redis authentication, keep Redis on an internal network, disable public host publishing in production, and use a production-only password distinct from PostgreSQL/JWT secrets. **[SECURITY — CACHE/QUEUE]**
- [ ] Store Kavenegar, future payment-gateway, and Arvan S3 credentials only in the production secret store or ignored server `.env`. Leave their example values empty and keep their providers/features disabled until the blocked verification in `remaining-implementation-specification.md` is complete. **[BLOCKED — PROVIDER INPUTS]**
- [ ] Define a rotation runbook for every secret: owner, creation date, expiry/rotation interval, dual-key or maintenance-window procedure, affected services, validation, rollback, and revocation evidence. Rotate immediately after suspected exposure. **[OPERATIONS — SECRET LIFECYCLE]**
- [ ] Restrict production `.env` ownership to the deployment account and mode `0600`; ensure backups, shell history, support bundles, monitoring agents, and log collectors cannot read or copy it. **[SECURITY — SERVER FILE PERMISSIONS]**
- [ ] Add automated secret scanning in pre-merge and scheduled CI, retain current high/critical blocking policy, and revoke—not merely delete—any committed credential before rewriting history. **[SECURITY — CI/GOVERNANCE]**

## 3. Local Compose specification

- [ ] The local Docker entry point must run the entire application and every mandatory dependency with one command: PostgreSQL, Redis, one-shot database bootstrap/migrations, API, queue worker, and web. It must require no host-installed Node.js, pnpm, PostgreSQL, or Redis after Docker/Compose and the root `.env` are available. **[IMPLEMENTATION — FULL LOCAL STACK]**
- [ ] Make `docker compose --env-file .env -f docker-compose.local.yml up --build --wait` the canonical clean-clone startup command. The command must exit unsuccessfully when bootstrap, API, worker, or web cannot become ready; document `docker compose --env-file .env -f docker-compose.local.yml logs -f` for diagnosis. **[IMPLEMENTATION — ONE-COMMAND STARTUP]**
- [ ] Permit a fixed, explicitly public development-only Server Actions encryption-key fixture in the local Compose path so a clean clone can build without a real secret. Keep that fixture isolated from production Compose; production must require a unique secret injected through BuildKit and must reject the local fixture and all placeholders. **[SECURITY — LOCAL/PRODUCTION SECRET SEPARATION]**
- [ ] Publish web, API, PostgreSQL, and Redis only on loopback development ports (`3000`, `5000`, `5433`, and `6379` respectively), while service-to-service traffic uses Compose DNS names and internal container ports. Verify the app is reachable from the host and no local service binds a public interface. **[SECURITY — LOCAL PORTS]**
- [ ] Give every long-running local service a meaningful health check and order dependencies with health/completion conditions: PostgreSQL/Redis healthy, bootstrap completed successfully, API and worker ready, then web healthy. Test first startup, repeat startup, container restart, and recovery after a dependency restart. **[RELIABILITY — LOCAL ORCHESTRATION]**
- [ ] Keep local data in clearly named Compose volumes and document the non-destructive stop command separately from the destructive `down --volumes` reset command. Verify migrations and seed behavior are idempotent across repeated starts. **[SAFETY — LOCAL DATA]**
- [ ] Create `docker-compose.local.yml` as the complete, explicit local stack. It may publish PostgreSQL and Redis only to `127.0.0.1`, use named disposable development volumes, enable API docs/debug logs, use console OTP and no real SMS/payment provider by default, and permit demo seed data only when explicitly selected. **[IMPLEMENTATION — LOCAL COMPOSE]**
- [ ] Make local API, worker, bootstrap, web, PostgreSQL, and Redis consume values from the root `.env`; remove hard-coded database URLs, passwords, JWT placeholders, provider choices, and duplicated feature flags from Compose `environment` blocks. Compose may map variable names and set non-secret service-role constants, but values must come from `.env`. **[IMPLEMENTATION — LOCAL COMPOSE]**
- [ ] Use `${VARIABLE:?message}` for required local inputs and `${VARIABLE:-safe-default}` only for documented non-secret conveniences. Avoid silent credentials and ambiguous precedence among shell variables, `.env`, `env_file`, and inline values. **[SAFETY — COMPOSE VALIDATION]**
- [ ] Give the local project an explicit project name and document clean startup, logs, migration, seed, test, stop, and volume-reset commands. Mark volume deletion as destructive and require an explicit developer choice. **[OPERATIONS — LOCAL RUNBOOK]**
- [ ] Verify a clean-clone workflow: copy `.env.example` to `.env`, fill development-only values, run the environment validator, start the local Compose file, wait for health, run migrations/tests, and stop without creating untracked secret/example files. **[VERIFICATION — CLEAN CLONE]**

## 4. Production Compose specification

- [ ] Create `docker-compose.production.yml` as a complete production stack with no development override dependency, no source bind mounts, no debug/API-doc exposure, no demo data, no mock/console providers, and no PostgreSQL/Redis host ports. Publish only Caddy ports 80/443. **[IMPLEMENTATION — PRODUCTION COMPOSE]**
- [ ] Remove literal application values and credentials from production Compose. Resolve runtime settings through the server `.env` or a supported secret mechanism, and use BuildKit secrets for build-only secrets. Confirm `docker compose config` does not print secret values into CI logs or deployment evidence. **[SECURITY — CONFIGURATION INJECTION]**
- [ ] Preserve internal network segmentation: database/Redis on backend-only networks, application services on narrowly required networks, and Caddy as the only public ingress and the only trusted reverse-proxy path to the API. **[SECURITY — NETWORK BOUNDARY]**
- [ ] Preserve `read_only`, bounded `tmpfs`, `no-new-privileges`, capability drops, PID/memory/CPU limits, `init`, health checks, restart policies, and graceful stop periods for every eligible service. Document exceptions for writable database/cache/proxy volumes. **[SECURITY — CONTAINER HARDENING]**
- [ ] Ensure migration/bootstrap is a one-shot, idempotent, lock-protected service that finishes successfully before API/worker startup. Never run destructive schema synchronization and never run a migration concurrently from every replica. **[SAFETY — DATABASE RELEASE]**
- [ ] Tag application images with immutable release identifiers and record image digests. Build once, scan/sign/attest once, then promote the exact digest through staging and production; never rebuild a supposedly identical production release on the server. **[SUPPLY CHAIN — IMAGE PROMOTION]**
- [ ] Add a production preflight command that validates required variables without revealing values, renders Compose, runs `infrastructure/container/validate.sh`, runs host preflight, confirms storage/disk/TLS/DNS, and exits before any mutation when a requirement fails. **[OPERATIONS — DEPLOYMENT GATE]**

## 5. Docker image and build security

- [ ] Keep Node.js on an actively supported LTS line and pin the exact multi-platform image-index digest. Reject the superseded Node.js 26 Dependabot branch unless the project intentionally approves that major migration after release-note, compatibility, and security review. **[SUPPLY CHAIN — BASE IMAGE]**
- [ ] Pin PostgreSQL, Redis, Caddy, and all runtime base images by trusted digest; schedule weekly update PRs, review upstream notes, validate architecture coverage, and rebuild promptly for exploitable vulnerabilities. **[SUPPLY CHAIN — DEPENDENCIES]**
- [ ] Keep dependency installation reproducible with the committed lockfile and `pnpm install --frozen-lockfile`. Ensure runtime stages contain only production dependencies and required built artifacts, not source-control metadata, tests, coverage, caches, local `.env`, or package-manager stores. **[SECURITY — IMAGE CONTENTS]**
- [ ] Keep non-root runtime users and exact `tini` entrypoints. Verify image user, entrypoint, health check, exposed ports, filesystem permissions, and absence of secrets with automated assertions. **[SECURITY — RUNTIME IDENTITY]**
- [ ] Maintain `.dockerignore` entries for `.git`, `.env*` except the non-secret example if validation needs it, node modules, build outputs, logs, coverage, test artifacts, backups/dumps, IDE files, and uploaded media. Test the actual build context for accidental secret inclusion. **[SECURITY — BUILD CONTEXT]**
- [ ] Produce an SPDX SBOM, vulnerability scan, license inventory, and signed provenance for each release image. Block critical/high exploitable findings unless a documented, time-bounded exception meets `.github/SECURITY_GOVERNANCE.md`. **[SUPPLY CHAIN — RELEASE EVIDENCE]**

## 6. Host, operating system, and Docker daemon

- [ ] Provision a supported, patched Linux LTS host with automatic security updates, synchronized time, monitored disk/inodes, encrypted storage where available, and a dedicated non-root deployment account. Disable password SSH and direct root login; require key-based access and controlled sudo. **[SECURITY — HOST BASELINE]**
- [ ] Configure the firewall/security group to allow inbound 80/443 publicly and SSH only from approved administration addresses or a VPN. Deny public PostgreSQL, Redis, API, metrics, and Docker daemon access. **[SECURITY — NETWORK EDGE]**
- [ ] Install Docker from the vendor-supported repository, restrict Docker-group membership as root-equivalent access, disable unauthenticated remote daemon sockets, configure log rotation, and document engine/Compose update policy. **[SECURITY — DOCKER HOST]**
- [ ] Apply and persist `vm.overcommit_memory=1` using `infrastructure/host/install.sh` or equivalent configuration management, then verify `infrastructure/host/preflight.sh` after installation and every reboot. **[OPERATIONS — REDIS PREREQUISITE]**
- [ ] Size CPU, RAM, swap policy, disk, volume IOPS, connection limits, and Docker log retention from measured staging load with headroom. Configure alerts before exposing traffic. **[RELIABILITY — CAPACITY]**

## 7. DNS, TLS, reverse proxy, and browser security

- [ ] Point production DNS only after the server is hardened and verified. Use controlled TTLs for cutover, document rollback records, and configure separate staging and production hostnames. **[OPERATIONS — DNS]**
- [ ] Configure Caddy with the exact production domain and monitored certificate-renewal persistence. Redirect HTTP to HTTPS, require TLS 1.2/1.3, and test certificate chain, hostname, renewal, OCSP behavior, and clock dependencies. **[SECURITY — TLS]**
- [ ] Verify strict security headers and application CSP without unsafe broad sources: HSTS after HTTPS is proven, frame protection, MIME sniffing protection, referrer policy, permissions policy, and nonce/hash-based script rules. **[SECURITY — BROWSER]**
- [ ] Set exact production `CORS_ORIGINS`, trusted proxy CIDRs, host validation, cookie domain/path, `Secure`, `HttpOnly`, and `SameSite` behavior. Test forged forwarding headers, cross-origin credential requests, CSRF, cache leakage, and redirect manipulation. **[SECURITY — REQUEST BOUNDARY]**
- [ ] Apply request-body, header, connection, upstream, and idle timeouts plus upload-specific limits at Caddy and the API. Ensure payment receipts/photos use stricter type/size/content validation when S3 is enabled. **[SECURITY — RESOURCE EXHAUSTION]**

## 8. Authentication, authorization, and application security

- [ ] Validate production JWT entropy and rotation behavior; keep access tokens short-lived, rotate refresh tokens, detect reuse, revoke live sessions, and test ordinary and remembered-session expiry. Never log tokens or OTP values. **[SECURITY — AUTHENTICATION]**
- [ ] Enforce admin password plus OTP, bounded attempts, resend cooldowns, generic failures, rate limits, audit events, and secure recovery. Verify no development bypass or console OTP provider can start in production. **[SECURITY — ADMIN ACCESS]**
- [ ] Repeat IDOR/authorization tests for every parent/student/admin resource, payment evidence, contract, notification, export, and future S3 signed URL. Server-side ownership and role checks must protect every object independently of UI visibility. **[SECURITY — AUTHORIZATION]**
- [ ] Validate all request DTOs, content types, lengths, enums, identifiers, pagination, upload metadata, and URLs; use parameterized database access and safe output encoding. Test injection, XSS, SSRF, path traversal, prototype pollution, mass assignment, and malformed media. **[SECURITY — INPUT/OUTPUT]**
- [ ] Configure global and sensitive-route rate limits with trusted client-IP derivation, bounded queues, account/IP abuse correlation, and alerting. Load-test limits without locking out health checks or internal workers. **[SECURITY — ABUSE RESISTANCE]**
- [ ] Disable production API documentation unless access-controlled and intentionally approved. Remove stack traces and internal identifiers from client errors while retaining correlated, redacted server diagnostics. **[SECURITY — INFORMATION DISCLOSURE]**

## 9. Database, Redis, storage, and data protection

- [ ] Keep PostgreSQL and Redis private. Enforce PostgreSQL SCRAM authentication, least-privilege roles, restricted listen interfaces, trusted `pg_hba.conf`, TLS for non-local transport, connection/time limits, and audit-worthy administrative access. **[SECURITY — DATA SERVICES]**
- [ ] Run migrations with `infrastructure/database/migrate-safe.sh` after an encrypted, verified backup. Test the full migration chain and restore against a sanitized production-like snapshot; record locks, duration, compatibility, RPO, and RTO. **[RELIABILITY — DATABASE RELEASE]**
- [ ] Store backups encrypted in a separate account/location with immutability, access logging, retention, checksum verification, and key-recovery procedures. Perform scheduled restore drills; backup success without restore validation is insufficient. **[RELIABILITY — DISASTER RECOVERY]**
- [ ] Monitor database connections, slow queries, locks, replication if used, disk, vacuum/bloat, transaction age, Redis memory/evictions/persistence, queue depth, retries, and dead letters. **[OBSERVABILITY — DATA HEALTH]**
- [ ] Enable Arvan S3 only after the endpoint, private bucket, scoped credentials, CORS, lifecycle/versioning, retention, and signed URL verification in `remaining-implementation-specification.md` are complete. Keep anonymous access denied and never proxy permanent object credentials to browsers. **[BLOCKED — S3 INPUTS]**
- [ ] Approve and enforce retention, deletion, legal hold, export, and audit policies for student identity, location, contracts, sessions, messages, and payment evidence before enabling irreversible cleanup. **[BLOCKED — PRODUCT/LEGAL POLICY]**

## 10. Observability, alerting, and incident response

- [ ] Emit structured JSON logs to stdout/stderr with release/service/request correlation and tested redaction for passwords, JWTs, OTPs, phones, national IDs, addresses, coordinates, payment references, signed URLs, and provider credentials. **[SECURITY — LOGGING]**
- [ ] Protect `/metrics` with a strong bearer token and network restriction; never expose it through public routing. Deploy the dashboards/alerts under `infrastructure/monitoring` and validate every alert route with a controlled test. **[OBSERVABILITY — METRICS]**
- [ ] Monitor availability, latency, error rates, saturation, authentication failures, OTP/SMS outcomes, payment state, upload failures, queues, database/Redis health, certificate expiry, backup age, image vulnerabilities, and host capacity. Define owners and actionable thresholds. **[OBSERVABILITY — COVERAGE]**
- [ ] Configure error tracking with environment/release tags, source-map protection, PII scrubbing, sampling, retention, and access control. Verify one synthetic exception end-to-end without exposing sensitive data. **[OBSERVABILITY — ERRORS]**
- [ ] Review and rehearse `infrastructure/monitoring/INCIDENT_RUNBOOK.md`: severity, paging, containment, credential rotation, rollback, recovery, evidence preservation, communications, breach assessment, and post-incident review. **[OPERATIONS — INCIDENT RESPONSE]**

## 11. CI/CD, repository, and supply-chain controls

- [ ] Protect `main`: require pull requests, successful required checks, resolved reviews, current branches, signed or verified commits if practical, no force pushes/deletion, restricted administrators, and at least one independent reviewer for security/deployment changes. **[SECURITY — GITHUB SETTINGS]**
- [ ] Enable GitHub Dependency graph, dependency review, Dependabot alerts/security updates, secret scanning/push protection where available, CodeQL, and least-privilege workflow permissions. Pin every external action to a full commit SHA. **[SECURITY — GITHUB SETTINGS]**
- [ ] Fix and require all current workflows: backend quality, frontend quality/E2E/performance, formatting, environment inventory, migration safety, deployment smoke, CodeQL, dependency/license review, repository/container scanning, and SBOM generation. Skips must be intentional and event-specific. **[CI — REQUIRED CHECKS]**
- [ ] Resolve the current production Compose build/start failure and confirm the container scan described in `remaining-implementation-specification.md` before release. Preserve actionable logs without secrets. **[BLOCKED — CURRENT CI]**
- [ ] Use protected GitHub environments for staging and production with scoped secrets, approval gates, concurrency locks, deployment records, and no pull-request access to production credentials. **[SECURITY — DEPLOYMENT AUTHORIZATION]**
- [ ] Publish digest-addressed images to an authenticated registry, sign them, attach provenance/SBOM, verify signatures during deployment, and define retention/garbage-collection rules that preserve rollback releases. **[SUPPLY CHAIN — REGISTRY]**
- [ ] Delete merged local branches after verifying `git branch --merged main`; close/delete superseded remote branches only after confirming their commits are unnecessary. Never delete an unmerged branch merely because its name is old. **[REPOSITORY HYGIENE]**

## 12. Testing and release acceptance

- [ ] From a clean clone, install with the locked pnpm version and run `pnpm env:check`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, production builds, API contract generation/drift checks, E2E suites, performance budgets, security assertions, and Compose validation. **[VERIFICATION — CLEAN BUILD]**
- [ ] Test production configuration in staging with production-equivalent TLS, proxy, database/Redis authentication, build secrets, migrations, health/readiness, workers, queues, restart behavior, rolling deployment, and rollback. Use sanitized data and non-production provider credentials. **[VERIFICATION — STAGING]**
- [ ] Test critical user journeys: onboarding, login/logout/session refresh, admin 2FA, enrollment, student ownership, contracts, offline payment evidence, admin review, notifications, consent, feedback, exports, and failure/retry paths. Mark S3/SMS/video/gateway cases blocked until their inputs are supplied. **[VERIFICATION — PRODUCT]**
- [ ] Run security-focused tests from `.github/SECURITY_GOVERNANCE.md` and the abuse matrix; remediate or formally accept findings with owner and expiry. Conduct an independent review before first production launch. **[VERIFICATION — SECURITY]**
- [ ] Test backup restoration, forward migration, application rollback compatibility, container/host restart, certificate renewal, alert delivery, provider outage, database/Redis outage, disk pressure, and a lost-secret rotation scenario. **[VERIFICATION — RESILIENCE]**

## 13. Deployment procedure

- [ ] Freeze the reviewed commit and assign a unique `RELEASE_ID`/`NEXT_DEPLOYMENT_ID`. Record commit, image digests, SBOM/provenance, approvals, environment checksum without values, database migration set, backup receipt, and rollback image. **[RELEASE — EVIDENCE]**
- [ ] On the server, clone/fetch using a read-only deploy key, check out the exact reviewed commit or tag, create the ignored `.env` with production-only values and `0600` permissions, and run the non-secret environment/preflight validators before pulling or building anything. **[RELEASE — SERVER PREPARATION]**
- [ ] Prefer CI-built signed images. If server-side build is temporarily unavoidable, use the exact commit, locked dependencies, BuildKit secret mounts, no cache for secret-sensitive steps, scan the result, record its digest, and never expose build secrets through command arguments or logs. **[RELEASE — IMAGE ACQUISITION]**
- [ ] Verify host, DNS/TLS, disk, database/Redis, backup, queue, and current error-rate health. Run the one-shot migration under its release lock, verify status, then start the production Compose project with orphan removal only after reviewing the rendered service set. **[RELEASE — CONTROLLED START]**
- [ ] Wait for service health and verify public homepage, authentication, API readiness, static assets, security headers, database/queue activity, logs/metrics/alerts, and representative critical journeys. Do not enable optional provider features until their separate acceptance checks pass. **[RELEASE — SMOKE TEST]**
- [ ] Monitor an agreed stabilization window. Roll back application images only when schema compatibility is proven; prefer forward-fix migrations, and invoke the reviewed disaster-recovery procedure instead of an improvised in-place database restore. **[RELEASE — ROLLBACK]**

## 14. Operational ownership and compliance

- [ ] Assign named owners and backups for application, host, database, security, privacy, product, payments, SMS, object storage, DNS/TLS, and incident command. Record escalation contacts outside the repository. **[OPERATIONS — OWNERSHIP]**
- [ ] Approve Persian terms, privacy notice, consent text, child/student data handling, payment-evidence handling, retention/deletion/legal hold, provider data processing, and breach notification obligations with qualified product/legal reviewers. **[BLOCKED — LEGAL APPROVAL]**
- [ ] Establish patching, dependency updates, access review, secret rotation, backup/restore drills, vulnerability response, capacity review, log/metric retention, certificate monitoring, and disaster-recovery rehearsal schedules. **[OPERATIONS — MAINTENANCE]**
- [ ] Create an auditable production go/no-go record containing named approvals, timestamps, evidence links, accepted risks with expiries, unresolved blocked provider features, rollback authority, and the exact promoted image/database versions. **[RELEASE — FINAL APPROVAL]**

## Completion and cleanup rule

- Check an item only when implementation and verification evidence exist; do not mark configuration assumptions as complete.
- Remove completed items from this file after their evidence is preserved in the permanent runbook or release record.
- Keep blocked S3, SMS, video, payment-gateway, policy, and staging items synchronized with `remaining-implementation-specification.md`; do not duplicate or silently close them.
- Delete this file only when the repository, infrastructure, operational process, and first production release are independently approved and all continuing duties have permanent owners/runbooks.

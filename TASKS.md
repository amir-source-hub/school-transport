# Remaining Project Tasks

> Audited and consolidated on 2026-08-13 from every Markdown file in the repository root. Completed implementation and stale duplicate task plans have been removed. This is the single source of truth for unresolved work.
>
> Items tagged `[LATER — …]` require external input (accounts, networks, assets, media, legal/product approval, deployment access) or are deliberately deferred and are not actionable in this codebase right now. In particular, anything coupled to the SMS provider (OTP delivery, delivery-status reconciliation, notification/consent copy, outbox verification) is deferred until the Kavenegar/sender issues under §1 are resolved; do not attempt OTP- or notification-related work while the SMS provider is unavailable.

## 1. SMS and Kavenegar

- [ ] Obtain an authorized Kavenegar sender line; sender `2000660110` currently returns provider status `427`. **[LATER — KAVENEGAR ACCOUNT]**
- [ ] Restore outbound access to `api.kavenegar.com:443` and verify candidate sender `0018018949161`. **[LATER — NETWORK/PROVIDER]**
- [ ] Allowlist the server outbound IP if `LatestOutbox`/`SelectOutbox` reconciliation is required; the current request returns `407`. **[LATER — KAVENEGAR ACCOUNT]**
- [ ] Create and approve the exact `KAVEHNEGAR_OTP_TEMPLATE`; VerifyLookup currently returns `424`. **[LATER — KAVENEGAR ACCOUNT]**
- [ ] Supply the current price per segment, campaign spend cap, alert recipient/system, and approved live test number. **[LATER — USER INPUT]**
- [ ] Confirm whether authenticated callbacks are available for the account/plan or approve bounded official status polling, then implement and test the selected replay-safe delivery-status path. **[LATER — PROVIDER DECISION]**
- [ ] After configuration is corrected, verify one ordinary SMS, one OTP, and one controlled broadcast on an approved handset. **[LATER — EXTERNAL SEND]**
- [ ] Approve that requested OTP/security messages do not depend on optional marketing consent. **[LATER — PRODUCT/LEGAL APPROVAL]**

## 2. Private S3-compatible storage and student cards

- [ ] Supply the Arvan endpoint, region, private bucket, scoped access key/secret, exact CORS origins, lifecycle policy, and versioning choice. **[LATER — USER INPUT]**
- [ ] Verify presigned PUT/GET expiry and tampering, anonymous denial, key scoping, CORS, TLS, and actual Arvan compatibility in staging for student photos and payment receipts. **[LATER — ARVAN CONFIGURATION]**
- [ ] Verify and repair scheduled student-photo cleanup. Confirm the worker schedules and executes `cleanupExpired`, records failures without log flooding, transitions expired authorizations to `EXPIRED`, and remains effective after Redis reconnect/restart. Add unit/integration coverage for worker scheduling, Redis interruption/recovery, repeated cleanup, and an authorization request racing cleanup; expose actionable metrics/alerts for stale `AUTHORIZED`, `UPLOADED`, and `VALIDATING` rows. **[READY — WORKER/OBSERVABILITY]**
- [ ] After the fixes, clear only confirmed expired local authorization rows through the application cleanup path, then run a complete JPEG and PNG acceptance test: authorize, browser `PUT`, complete, server-side metadata/read, isolated validation/crop, canonical 600×800 JPEG write, raw-object deletion, review queue, signed view, approval/rejection, expiry/tampering, and retry. Repeat the equivalent presigned upload/read checks for offline-payment receipts. **[LATER — ARVAN/IMPLEMENTATION VERIFICATION]**
- [ ] Create a separate public static-asset bucket, public prefix, or CDN origin for website backgrounds, banners, illustrations, and other non-sensitive marketing images. Do not make the private student-photo/payment-receipt bucket public and do not reuse its privileged application credentials in the browser; isolate bucket/prefix policy, credentials, lifecycle, access logs, budgets, and incident impact. **[LATER — PUBLIC ASSET STORAGE DECISION]**
- [ ] Configure the public delivery boundary with anonymous read access only for the approved static prefix, no anonymous list/write/delete, scoped uploader credentials, TLS, optional CDN/WAF/hotlink controls, controlled CORS for browser `GET`/`HEAD`, compression/content-sniffing protections, access logging, bandwidth/storage alerts, and an explicit domain/certificate/DNS owner. Verify traversal, encoded-key, unauthorized-write, directory-listing, and private-prefix denial. **[LATER — ARVAN/CDN CONFIGURATION]**
- [ ] Verify the migration in local, staging, and production-like builds before repository removal: every page and breakpoint loads successfully over HTTPS; no mixed content, CORS, CSP, 403/404, redirect, case-sensitivity, or stale-cache failures occur; performance budgets, image optimization, lazy loading, accessibility, visual-regression screenshots, SEO/Open Graph previews, CDN cache-hit behavior, and provider outage/fallback behavior are acceptable. **[LATER — ASSET ACCEPTANCE]**
- [ ] Treat “remove from GitHub” as removal from the current branch/release by default; old commits and existing Git LFS objects may remain retrievable. Decide separately whether regulatory, licensing, or repository-size requirements justify destructive history/LFS purging; if approved, back up and tag the last recoverable state, coordinate a merge freeze, use a reviewed history-rewrite procedure, force-update protected branches intentionally, invalidate clones/caches, and verify all collaborators and deployments reclone. Do not rewrite history merely to save routine storage. **[LATER — HISTORY PURGE DECISION]**
- [ ] Approve retention/deletion and legal-hold rules for photos and payment-receipt evidence, then enable the remaining irreversible cleanup behavior. **[LATER — PRODUCT/LEGAL POLICY]**
- [ ] Supply and approve the physical student-card template and crop area, verify the 600×800 canonical output visually, and add the card-layout preview/export integration. **[LATER — CARD TEMPLATE]**

## 3. Offline-payment policy and contracts

- [ ] Before release, render the two source Word files and the generated populated contract to page images/PDF and visually compare every page at 100% zoom. Structural extraction, source hashes, and the intended 1+2-page split are recorded in `docs/contracts/offline-payment-v1-source-map.md`, but LibreOffice remains unavailable in this Windows environment. Product/legal must approve the final three-page visual comparison and representative long/short/empty-safe cases. **[BLOCKED — LIBREOFFICE AND PRODUCT/LEGAL APPROVAL REQUIRED]**
- [ ] Product/legal must approve and version the final Persian offline-payment wording, including claim-versus-acceptance, destination/amount/reference responsibility, review timing, corrections, duplicate transfers, refunds, disputes, installments, late payment, retention, and activation timing. The application now uses the supplied Word wording without inventing these missing approvals. **[BLOCKED — PRODUCT/LEGAL AUTHORITY REQUIRED]**
- [ ] Product/legal/privacy must approve notification consent, photo privacy, payment-evidence privacy, retention/deletion, and SMS/OTP clauses before they can be added to the versioned rendering and regression fixtures. **[BLOCKED — APPROVED TEXT REQUIRED]**

## 4. Online-payment gateway

- [ ] Select a gateway and supply official documentation, sandbox/merchant credentials, callback URLs/IPs, rial/toman units, verification, expiry, reconciliation, settlement, duplicate-payment, refund, and support rules. **[LATER — USER INPUT]**
- [ ] Implement the selected provider behind the existing gateway port with server-to-server verification, atomic/idempotent finalization, unknown-state reconciliation, validated HTTPS redirects, return UI, sandbox contract/E2E coverage, and runbooks. **[LATER — GATEWAY INPUT]**
- [ ] Enable online controls only after sandbox and production-readiness verification; the completed offline workflow remains available. **[LATER — GATEWAY VERIFICATION]**

## 5. Media

- [ ] Supply the approved tutorial video, poster, Persian captions/transcript, duration, rights, placement, and hosting origin; then build and verify the accessible reusable video surface. **[LATER — MEDIA INPUT]**
- [ ] Supply approved advertisement media, poster/captions, rights, campaign dates/pages, hosting, frequency, dismissal, autoplay/audio, and replay rules; then build and verify the accessible fail-closed dialog. **[LATER — MEDIA INPUT]**

## 6. Product and operations decisions

- [ ] Define required export ranges, delivery method, access control, expiry, and retention before implementing queued/streamed exports beyond the current 10,000-row synchronous ceiling. **[LATER — PRODUCT/OPERATIONS INPUT]**
- [ ] Approve exact retention, erasure/anonymization, dispute/legal-hold, consent-history, child-record, financial, audit, support, and campaign periods before enabling irreversible cleanup and replacing `pending-legal-approval` in the privacy register. **[LATER — LEGAL/PRODUCT POLICY]**

## 7. CI and repository cleanup

- [ ] Review and correct every failing, cancelled, unexpectedly skipped, or flaky GitHub Actions check on `main` and active pull requests, including backend/frontend quality, formatting, type checking, unit/integration/E2E and visual tests, performance budgets, API-contract drift, migration safety, environment inventory, production Compose smoke tests, dependency/license review, CodeQL, secret/IaC/repository/container vulnerability scans, SBOM generation, and artifact publication. Preserve strict security and quality thresholds, fix root causes rather than disabling checks, document intentional event/path skips, rerun the exact failed jobs, and require a fully understood green/expected-skip result before production release. **[LATER — GITHUB TESTS AND CORRECTIONS]**
- [ ] Reproduce and diagnose the failing production Compose `Build and start the production web dependency chain` step from the `8bd55c7` `main` workflow run; the local reproduction was intentionally stopped before completion. Split build/start diagnostics if needed, preserve the first actionable Docker/Next.js error in CI annotations or an artifact, fix the root cause, and verify the complete deployment smoke job. **[LATER — CI/LOCAL REPRODUCTION]**
- [ ] Confirm the production-container scan result after the `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` and Git LFS checkout fixes; if it still fails, inspect the Trivy/SARIF findings, remediate actionable vulnerabilities or document narrowly scoped accepted risks, and rerun the scan to success. **[LATER — CI RESULT/REPOSITORY ACCESS]**
- [ ] Enable GitHub Dependency graph and dependency review under repository security settings, then rerun the pull-request dependency/license check and verify that push runs remain intentionally skipped. **[LATER — REPOSITORY ADMIN SETTING]**
- [ ] Close the superseded `dependabot/docker/node-26-bookworm-slim` pull request and delete its remote branch after confirming no useful dependency metadata remains; `main` deliberately targets Node.js 24 LTS instead of that proposed Node.js 26 image update. **[LATER — REMOTE REPOSITORY APPROVAL]**

## 8. Production readiness and first release

The repository now has the consolidated root environment contract, explicit local and production Compose entry points, multi-stage container build, Caddy configuration, environment/Compose validators, host preflight, database backup/restore tooling, monitoring definitions, security checks, and a deployment runbook. The following work still requires real-environment evidence or organizational approval.

### 8.1 Secrets, access, and host preparation

- [ ] Generate unique production PostgreSQL, Redis, JWT, metrics, Next.js Server Actions, provider, backup, and deployment credentials on the production host or in an approved secret manager. Record owner, creation date, rotation/revocation procedure, and recovery path without committing values. Use separate least-privilege identities for application runtime, migrations, backups/restores, monitoring, and administration. **[LATER — PRODUCTION SECRET STORE]**
- [ ] Create the ignored root server `.env` with mode `0600`, production-only origins and credentials, no placeholders/loopback/demo data, and a unique immutable release/deployment ID. Run `pnpm env:check`, `pnpm env:check:production`, Compose `config --quiet`, and the host/container preflight checks without exposing rendered secrets. **[LATER — HOST ACCESS]**
- [ ] Harden the Linux host: supported patched OS/kernel, persistent `vm.overcommit_memory=1`, time synchronization, minimum open ports, restricted SSH, firewall, intrusion controls, disk/log rotation, Docker daemon access controls, and verified DNS/TLS ownership and renewal. Confirm PostgreSQL and Redis are not publicly reachable and PostgreSQL does not permit trust authentication. **[LATER — HOST SECURITY]**
- [ ] Configure GitHub environments, protected branches, required reviews/checks, least-privilege deploy credentials, immutable artifact retention, and separation between preview/staging and production secrets. Prefer CI-built, digest-pinned, signed images with SBOM/provenance over mutable tags or ad-hoc server builds. **[LATER — REPOSITORY/CI ADMIN]**

### 8.2 Database, Redis, backup, and migration evidence

- [ ] Provision production-equivalent PostgreSQL and Redis with authentication, private networking, encrypted storage/transport where applicable, capacity limits, connection/statement timeouts, persistence, eviction policy, and alerting. Use distinct credentials and test behavior during restart, network interruption, saturation, and disk pressure. **[LATER — INFRASTRUCTURE]**
- [ ] Configure encrypted off-host backups with retention and access controls. Run and record a full backup/restore drill, including checksum, duration, recovery-point/recovery-time results, restore into an isolated target, application validation, and failure escalation. A backup is not accepted until restore is proven. **[LATER — BACKUP DESTINATION/DRILL]**
- [ ] Apply every forward migration, including `0025_notification_read_state.sql` and later migrations, to a sanitized production-like snapshot under the migration lock. Record duration, locks, compatibility, backup receipt, rollback/forward-fix decision, and legacy notification/outbox behavior. Verify only one migrator can run per release. **[LATER — STAGING DATABASE]**

### 8.3 Observability, security, privacy, and resilience

- [ ] Connect metrics, structured redacted logs, dashboards, and alerts to real production systems. Assign owners and test alert delivery for API/web readiness, database/Redis failures, queue backlog/stalls, OTP/SMS/provider failures, payment inconsistencies, storage errors, certificate expiry, disk/capacity pressure, elevated latency/error rate, and security events. **[LATER — MONITORING DESTINATIONS]**
- [ ] Execute the repository security and abuse-test matrices plus an independent review covering authentication/admin 2FA, session rotation/reuse, CSRF/CORS/CSP, IDOR/ownership, upload/download authorization, SSRF, injection/XSS, rate limits, audit immutability, secret leakage, dependency/container/IaC vulnerabilities, and sensitive-data redaction. Remediate findings or record narrowly scoped accepted risks with owner and expiry. **[LATER — SECURITY REVIEW]**
- [ ] Approve and operationalize the privacy/data inventory: lawful purpose, minimization, retention, deletion/anonymization, legal hold, consent history, child/student records, precise locations, photos, contracts, payment evidence, notifications, exports, audits, backups, and provider subprocessors. Test access/export/correction/deletion workflows without breaking financial or audit obligations. **[LATER — LEGAL/PRIVACY APPROVAL]**
- [ ] Run resilience exercises for container/host restart, database and Redis outage, provider/storage outage, queue replay, disk pressure, lost-secret rotation, certificate renewal, failed migration, application rollback, and disaster recovery. Document decision authority, communications, evidence, and safe forward-fix/restore boundaries. **[LATER — OPERATIONS DRILLS]**

### 8.4 Clean-build, staging, and product acceptance

- [ ] From a clean clone at the exact release commit, use the locked pnpm version and run environment validation, formatting, linting, type checking, unit/integration tests, production builds, API-contract drift checks, E2E and visual suites, accessibility checks, performance budgets, migration/Compose validation, security scans, license/dependency review, SBOM generation, and artifact publication. Investigate every failure, cancellation, flaky result, or unexpected skip; do not weaken thresholds to obtain green status. **[LATER — CLEAN RELEASE CI]**
- [ ] In production-equivalent staging, verify TLS/proxy headers, trusted-proxy behavior, database/Redis authentication, build secrets, migrations, health/readiness, workers/queues, restart and rolling deployment, legacy redirects/bookmarks, route metadata/sitemap, map tiles/CSP, static assets/cache behavior, and old/new Next.js Server Action compatibility. **[LATER — STAGING]**
- [ ] Test all critical Persian desktop/mobile journeys and failure/retry paths: onboarding, login/logout/refresh, admin 2FA, enrollment, student ownership/capacity, contracts, offline-payment evidence/review, notifications/consent, feedback, photo review, exports, and admin operations. Keep SMS, private S3, media, and online-gateway cases blocked until their specific inputs above are supplied. **[LATER — PRODUCT ACCEPTANCE]**
- [ ] Obtain recorded Persian-language, accessibility, product, legal/privacy, security, and operations approval. Include reviewer, timestamp, evidence link, accepted risks and expiry, and any provider feature intentionally disabled for launch. **[LATER — RELEASE APPROVAL]**

### 8.5 Controlled production release

- [ ] Freeze the reviewed commit and release ID; record image digests, signatures/SBOM/provenance, environment checksum without values, migration set, backup receipt, approvals, unresolved risks, rollback authority, and exact rollback image. Verify host/DNS/TLS/disk/database/Redis/queue health before migration or traffic changes. **[LATER — GO/NO-GO RECORD]**
- [ ] Deploy the exact reviewed artifacts using the documented production Compose/runbook. Run the one-shot locked migration, start services, wait for health, and smoke-test homepage, API readiness, authentication, headers, public/private assets, workers/queues, logs/metrics/alerts, and representative student/admin workflows. Do not enable optional providers without their acceptance evidence. **[LATER — PRODUCTION DEPLOYMENT]**
- [ ] Monitor the agreed stabilization window and prove the rollback/forward-fix procedure is compatible with the deployed schema. Record final status and hand ongoing patching, access reviews, secret rotation, backup/restore drills, vulnerability response, capacity review, retention, certificate monitoring, and disaster-recovery schedules to named primary and backup owners. **[LATER — RELEASE STABILIZATION/OWNERSHIP]**

## Cleanup rule

- Remove an item when its implementation and verification are complete.
- Delete this file only when no blocked, unverified, or continuing requirement remains.

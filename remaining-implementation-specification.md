# Unified Remaining Implementation Specification

> Audited against code and commit history on 2026-08-09. This is the only authoritative root task checklist. Finished and verified tasks/subtasks are removed instead of retained as history. It combines immediate engineering, operations, future media/gateway work, legal text, and external release requirements.

## Audit evidence and cautions

- Commit reviewed: `1d1b251 feat(api,web): add student card photo uploads and notification enhancements`.
- Automated baseline passes: API typecheck/lint and 347 tests; web typecheck/lint and 147 tests.
- Passing checks do not close the gaps below.
- `.env` is ignored and its variable-name set matches root `.env.example`; secret values must never be committed or printed.
- Current runtime roles remain `PARENT | ADMIN`. `PARENT` is the internal compatibility name for a student/guardian panel account.

## 1. Notification correctness gaps

### Catalog and producers

- Enrollment review/approval/rejection/correction, payment-plan readiness, feedback responses, photo decisions, onboarding account creation, and capacity-request decisions have direct producer assertions; a catalog contract fails when a retained type lacks a production producer. The account-security boundary is documented: requested OTPs are already the security channel, while administrator credential changes revoke sessions and remain privileged audit events rather than being misrouted through parent notifications.

### Shared admin operational view

- The shared operational view now uses a fixed snapshot plus `(created_at, id)` cursor, fetches a bounded look-ahead row, preserves filters in continuation links, and has regression coverage for equal timestamps and concurrent newer inserts. It remains shared without per-admin read state, links only to supported admin routes, defaults to a documented 30-day history, and validates filters. Verified with focused API/web tests and both application typechecks on 2026-08-09.

### Student notification UI/API verification

- [ ] Add database-backed IDOR tests for notification list, read-one, and read-all using different user accounts. Unit coverage verifies not-found behavior and authenticated controller boundaries, but staging-equivalent row isolation remains unverified. **[NOT FINISHED]**
- [ ] Test stable pagination with equal timestamps and concurrent inserts. **[NOT FINISHED]**
- [ ] Add real-browser verification for notification RTL/mobile layout and screen-reader output. Component coverage now verifies loading, empty, unread state, mark-one, mark-all, keyboard activation, accessible alerts, retry readiness, duplicate-submit prevention, links, and responsive wrapping. **[NOT FINISHED]**
- [ ] Verify migration `0025_notification_read_state.sql` on a production-like snapshot and prove old queued outbox records remain compatible. **[BLOCKED — STAGING DATABASE]**

## 2. SMS operations and live Kavenegar verification

### Metrics and alerts

- The protected Prometheus endpoint exposes fixed-category outcomes for OTP, service/optional notifications, test broadcasts, and campaigns; provider latency, retry/dead-letter, queue age, OTP rate limits, campaign volume, and aggregate estimated spend are covered without personal/message/credential labels. Versioned alert rules cover timeout/failure rates, backlog/dead letters, OTP spikes, campaign volume, and spend. `docs/OBSERVABILITY.md` assigns ownership and documents Alertmanager cooldown/deduplication, credential rotation, provider disablement, recovery, and incident handling.
- Logging verification removed development phone/OTP output and changed exception logging to code/status/error-type metadata rather than raw user-controlled messages or stacks. Regression tests prohibit feedback/phone and signed-URL/token leakage. No tracing exporter is configured; future exporters must preserve the same allowlist boundary.

### Local configuration status

- The local Kavenegar API key, OTP template name, and latest candidate sender `0018018949161` are set in ignored `.env`.
- A read-only official `account/info.json` request succeeded on 2026-08-09; the key is valid and the account reported positive credit. No SMS was sent and no secret/account value was logged.
- The approved owned test number is stored only in ignored local `.env`; it is not present in tracked documentation/examples.
- Live provider tests on 2026-08-09 reached Kavenegar. Without an explicit sender, ordinary SMS returned `412`; with sender `2000660110`, it returned `427` (the line requires an access level/permission). VerifyLookup returned `424` (template missing or not approved). None of these requests returned a delivery message ID.
- Attempts using candidate sender `0018018949161` could not connect to `api.kavenegar.com:443`, including idempotent retries, so this sender has not yet been accepted or rejected by Kavenegar.
- ArvanCloud connection/credential fields are empty.

Tasks:

- [ ] Ask Kavenegar to grant this API key/account permission to send from line `2000660110`, or provide another line already authorized for the account; status `427` must no longer occur. **[BLOCKED — KAVENEGAR ACCOUNT]**
- [ ] Retry candidate sender `0018018949161` after network access to `api.kavenegar.com:443` is restored and record the actual provider response. **[BLOCKED — NETWORK/PROVIDER]**
- [ ] Add the server's outbound IP to Kavenegar security settings if delivery reconciliation through `LatestOutbox`/`SelectOutbox` is required; the current read-only reconciliation attempt returns `407`. **[BLOCKED — KAVENEGAR ACCOUNT]**
- [ ] Create/approve the exact VerifyLookup template configured by `KAVEHNEGAR_OTP_TEMPLATE`; status `424` must no longer occur. **[BLOCKED — KAVENEGAR ACCOUNT]**
- [ ] After both account settings are corrected, rerun one ordinary SMS and one OTP send to the locally configured approved test number and confirm handset receipt. **[BLOCKED — PROVIDER CONFIGURATION]**
- Provider message IDs/statuses are persisted in notification/broadcast delivery records for reconciliation; dispatch logging contains no phone, API key, OTP, provider payload, or message body.

### OTP verification

- OTP accepted, timeout, transient/permanent failure, rejection, and rate-limit outcomes plus provider latency are emitted with the single fixed `otp` category; alert rules cover OTP rate-limit spikes and provider failure/timeout rates.
- [ ] Obtain final product/legal approval that requested OTP/security messages do not depend on optional marketing consent. **[BLOCKED — APPROVAL]**
- Two-minute expiry, single-use, resend cooldown, account/IP attempt limits, concurrent parent/admin verification, generic errors, production provider selection, and safe metric hooks were reverified by the focused OTP concurrency, onboarding, configuration, and delivery suites after instrumentation.
- [ ] Verify the actual Kavenegar template and delivery with an approved number before marking production delivery verified. **[BLOCKED — EXTERNAL SEND]**

## 3. Feedback verification gaps

- [ ] Add database-backed IDOR verification proving one student account cannot list or infer another account's feedback. Cross-account student association now returns the same not-found result without inserting feedback. **[NOT FINISHED]**
- [ ] Add database-backed filter, empty-page, and concurrent-insert pagination tests. Service ordering is now stable by `created_at DESC, id DESC`, and DTO bounds are enforced. **[NOT FINISHED]**
- Feedback UI component coverage now verifies keyboard-native labeled controls, required/minimum validation semantics, live success/error announcements, recovery/retry, immediate duplicate-submit guards, inert hostile content, long Persian wrapping, and responsive action layout. The tests also exposed and fixed an async form-target lifetime failure and a same-tick double-submit race. Real-device/browser coverage remains part of the cross-cutting release verification section.

## 4. Student card photo gaps

### Placement and enrollment lifecycle

- Enrollment step one now supports account/onboarding-scoped upload before a student exists, retains the selection and retry state on storage failure, and atomically links a completed pending upload inside the student/enrollment transaction. Enrollment may proceed while review is pending; the remaining approved-only card-readiness gate is tracked under card integration.

### Admin review and card integration

- [ ] Add the approved physical card-layout preview to the admin photo-review page after the template/crop area is supplied. The shared queue, short-lived canonical preview, minimal student context, filters, pagination, standard Persian rejection reasons, safe detail, optimistic version checks, audit, and navigation are implemented. **[BLOCKED — CARD TEMPLATE]**
- [ ] Connect only the current approved canonical photo to the actual student-card generation/export path after the approved physical card template and crop area define that path. No card generator/export surface exists in the repository yet, so an integration cannot be implemented or verified without inventing the blocked product artifact. **[BLOCKED — CARD TEMPLATE]**

### Storage and processing hardening

- [ ] Configure a real private ArvanCloud bucket and local/deployment credentials. **[BLOCKED — USER INPUT]**
  - Required local values: endpoint, region, bucket, access key, secret key.
  - Configure exact production/staging/local CORS origins, least privilege, TLS, at-rest protection, private listing/objects, lifecycle, versioning decision, and optional antivirus.
- [ ] Approve the Persian privacy notice, retention/deletion policy, and physical card crop area/template. **[BLOCKED — USER/LEGAL INPUT]**
- [ ] Verify the five-minute presigned PUT/GET behavior, CORS, anonymous denial, key scoping, and actual Arvan compatibility against staging. **[BLOCKED — ARVAN CONFIGURATION]**
- [ ] Add process-level memory/concurrency isolation and crafted polyglot/decompression-bomb fixtures. Sharp processing now enforces byte, pixel, axis, aspect-ratio, decode-failure, and ten-second libvips operation limits; renamed SVG/PDF, corrupt, empty, oversized, huge-axis, huge-pixel, and extreme-aspect cases are covered. **[NOT FINISHED]**
- Expired upload authorizations and stalled processing are transitioned to terminal states and their raw objects are deleted; retained rejected/failed/expired/superseded raw objects and rejected/superseded canonical objects are deleted after bounded retention windows, with deletion failures isolated for retry on the next sweep. Archived-student, deletion-request, and versioned-object behavior cannot be finalized until the retention/deletion policy and Arvan bucket versioning choice are approved. **[BLOCKED — RETENTION/ARVAN POLICY]**
- [ ] Add a PostgreSQL-backed concurrent-approval proof for the one-current-approved-photo invariant. Database status/version/declared-size/canonical-shape constraints, the partial unique index, domain transitions, optimistic review versions, account-link requirement, and stale-newer-upload rejection are implemented and covered structurally/unit-wise. **[NOT FINISHED]**

### Photo verification

- [ ] Test cross-account/student IDOR, ordinary-admin authorization, signed URL expiry/tampering, actual-vs-declared size, zero byte, mismatch, corrupt, renamed SVG/PDF, huge pixels/axis, extreme aspect, and valid JPEG/PNG. **[NOT FINISHED]**
- [ ] Verify canonical output is exactly 600×800 JPEG, sRGB, visually acceptable in the real card layout, and contains no EXIF/GPS. **[BLOCKED — CARD TEMPLATE/STAGING]**
- [ ] Test upload replacement races, stale approval, processing retries, rollback/orphan cleanup, archived students, and approved-only card use. **[NOT FINISHED]**
- [ ] Add real-browser enrollment/mobile verification for the photo field. Component tests now cover object-URL preview, measurable accessible progress, cancellation, removal before upload, retry/error text, Persian guidance, privacy navigation, and status announcements. **[NOT FINISHED]**

## 5. Existing admin bulk SMS — remaining verification

Bulk-SMS controller metadata coverage proves every campaign operation requires authentication plus the ordinary active `ADMIN` role, so student tokens are denied by the shared role guard.

- [ ] Reverify audience/consent changes at dispatch, phone deduplication, Tehran scheduling, immutable approval snapshot, bounded skip-locked batching, idempotency, pause/resume/cancel, partial failure, and cost limits after notification changes. **[NOT FINISHED]**
- [ ] Configure an approved test number and perform one controlled live test before production verification. **[BLOCKED — USER INPUT/EXTERNAL SEND]**

## 6. Offline payments and temporary online-payment shutdown

### Product behavior

Online payment is now fail-closed until a real gateway is integrated: the only accepted runtime provider is `none`, every start path rejects before database access, user-facing choices remain visibly disabled with an accessible Persian explanation, onboarding uses offline receipt submission, and `mock:` authorities remain only in isolated gateway tests.

### Payment destination shown to students

Central offline-payment destination settings are implemented with immutable versions, one active version, validation, explicit admin confirmation, optimistic concurrency, masked audit evidence, authenticated payer display, and an immutable destination snapshot on each submission.

### Student offline-payment submission

Offline payment now supports prepayments and installments with centrally sourced destination details, exact schedule-item amounts, payment date/reference, optional payer/card suffix/note, required receipt evidence, server-derived ownership and amounts, stable retry idempotency, and one active draft/review submission per item. A completed upload enters `PENDING_REVIEW` without changing financial totals or enrollment; rejected history and safe reasons remain visible and a corrected submission may be created. Pending evidence cannot be replaced until reviewed, preventing ambiguous simultaneous claims.

### Receipt image storage

Receipt images use the private vendor-neutral S3 boundary under separate `payment-receipts/raw` and `payment-receipts/canonical` prefixes. Completion verifies declared/actual bytes, signatures, MIME, dimensions and decode limits, rejects non-JPEG/PNG inputs, strips metadata into a bounded sRGB JPEG, persists checksum/size/type/dimensions/key, deletes raw evidence, and exposes only short-lived owner/admin-authorized views.

- [ ] Implement and operationally approve retention/cleanup for accepted, rejected, abandoned, archived, disputed, and legally retained receipt evidence. **[BLOCKED — RETENTION/LEGAL POLICY]**

### Data model and API

- The explicit `offline_payment_submissions` model preserves payer, plan/item, exact amount/date/reference, source-card suffix, private canonical evidence metadata, immutable destination snapshot/version, review state/version, reviewer/reason, transaction link, idempotency, and audit timestamps. Database constraints allow only one active submission and one approval per schedule item. Student/onboarding endpoints cover destination, draft creation, upload authorization/completion, own history, correction after rejection, and scoped receipt views; `MANUAL_ADMIN_ENTRY` remains a distinct privileged cash/manual source.
- The admin submission-history endpoint now validates status/item-type filters, caps pages at 50 rows, uses stable `created_at DESC, id DESC` ordering, returns a total, and enriches each row with schedule, student, and primary-family context. The responsive admin queue preserves filters across pagination and exposes private preview plus versioned review actions only for pending receipts; API and component regressions cover bounded/empty pages and filter preservation.

### Admin review and financial finalization

- The admin payment view reviews both prepayments and installments with student/family context, expected/submitted amounts, plan/item/due/payment dates, reference, private receipt preview, prior-attempt count, and destination snapshot. Active admins can confirm approval or give a bounded Persian rejection reason. Approval locks the submission/item/plan, creates one immutable `OFFLINE_RECEIPT` transaction, updates item/plan/enrollment state, audits, and enqueues notification in the transaction; rejection changes only the submission and enqueues audited correction guidance.

### Offline-payment notifications

Receipt submitted, approved, and correction-required/rejected transitions are cataloged for in-app and generic privacy-safe SMS delivery. Messages contain no amount, card/reference, receipt link, or child data; submitted receipts appear in the shared admin operational view without per-admin read state.

### Offline-payment verification

- [ ] Add PostgreSQL-backed cross-account prepayment/installment and concurrent duplicate/replacement proofs, plus real-object-storage signed URL expiry/tampering verification. Service/DTO tests now cover server-derived item amount/destination binding, invalid/future dates, blank/bounded references, card suffix validation, idempotent replay versus cross-item key collision, uniform foreign/missing receipt denial, configured short-lived canonical URLs, declared/actual byte mismatch before decode, and hostile/valid JPEG/PNG processing fixtures. **[NOT FINISHED]**
- [ ] Add PostgreSQL-backed concurrent approval/rollback proof for the exact-once financial effect. Controller guards cover ordinary-admin authorization; direct transaction tests now cover stale/repeated version rejection, amount mismatch, immutable transaction creation, item/plan/enrollment updates, rejection isolation, audit/outbox calls, and propagation of outbox failure for rollback. Provider delivery remains outside the financial transaction and is covered by outbox retry/dead-letter tests. **[NOT FINISHED]**
      Disabled online controls have accessible native disabled semantics and explanatory text in component coverage; both online start and verify reject before database access while the feature is disabled.
      Component coverage proves onboarding finalization is refused while the receipt is pending and runs only after an approved prepayment is observed; the backend independently verifies paid prepayment before issuing panel credentials.
- [ ] Add real-browser mobile receipt capture plus long-filename and real network/storage-failure verification. Component coverage now exercises destination display, required evidence, preview, progress, upload ordering, and retry-safe submission. **[NOT FINISHED]**

## 7. Contract and legal-text updates

- [ ] Approve and version final Persian contract text for the offline-payment workflow. **[BLOCKED — PRODUCT/LEGAL INPUT]**
  - State that receipt submission is a claim awaiting review and is not proof of accepted payment.
  - Define expected payment destination, amount/date/reference responsibility, review timing, rejection/correction, duplicate/incorrect transfers, refund/support, installments, late payment, disputes, receipt retention, and fraud/misrepresentation consequences.
  - Explain when enrollment, service, or panel activation occurs after prepayment approval.
  - Keep contract versions immutable; store the exact accepted version, acceptance timestamp, actor, and audit evidence.
- [ ] Review notification-consent, photo privacy, payment-evidence privacy, retention/deletion, and SMS/OTP clauses together so product/legal wording is consistent. **[BLOCKED — PRODUCT/LEGAL INPUT]**
- [ ] Update contract rendering, downloadable/print views, tests, and admin/student previews only after the Persian text is approved. **[BLOCKED — APPROVED TEXT]**

## 8. Environment-file policy

- Production validation must continue rejecting console OTP, missing Kavenegar secrets when enabled, zero broadcast price/cap, mock payment, unsafe logging/seeding, and incomplete Arvan configuration.
  Environment loading now has two explicit supported paths: root `.env.development` selected with Docker Compose, or app-local `apps/api/.env` plus `apps/web/.env.local` for direct pnpm development. Root environment files are documented as ignored local inputs, deployment secrets belong in the hosting secret manager, Kavenegar data is API-only, and Docker/CI ignore policies exclude local environment files and generated evidence artifacts.

## 9. Engineering, security, and operations backlog

### Backend verification and CI

- [ ] Add PostgreSQL/Redis-backed integration, migration, queue-restart, HTTP-contract, and deployment-smoke tests to CI. **[NOT FINISHED]**
- [ ] Verify transaction rollback, row locks, constraints, idempotency, authorization, outbox recovery, notification migration, feedback, broadcast, photo, and offline-payment flows against real services. **[NOT FINISHED]**
- [ ] Finish the repository-wide list audit and move genuinely large exports to queued/streamed generation. Existing paged operational queues enforce validated maximum page sizes and stable ordering; admin enrollment materialization has a stable newest-first 5,000-row ceiling, fails closed at overflow, and scopes parent/payment joins to the bounded window; admin payment aggregation is limited to the newest 1,000 plans before loading related items, transactions, submissions, and only the associated parents; the admin family collection is limited to the newest 500 accounts before scoped parent/student lookup, while family detail uses a direct ID query and does not depend on list-window membership; school reference lists and student-limit-request queues are capped at 500 with stable name/ID and newest-first timestamp/ID ordering, and limit-request parent lookup is scoped to the window; the broadcast campaign view is limited to the newest 200 campaigns with stable timestamp/ID ordering and count queries scoped to that window; family/admin contract collections are limited to the newest 100/500 contracts with stable timestamp/ID ordering before related financial rows load; comprehensive previews are capped at 50 rows per page, while the synchronous XLSX export reads every source in stable ID order with a 10,000-row-per-source ceiling and fails closed before workbook construction when any source exceeds it. **[NOT FINISHED]**
- [ ] Keep frontend/backend API contracts synchronized through generated or centrally validated schemas and CI drift detection. **[NOT FINISHED]**

### Infrastructure and release operations

- [ ] Enable/persist Redis memory overcommit and verify it after host reboot. **[BLOCKED — HOST ACCESS]**
- [ ] Verify PostgreSQL authentication/listening/firewall/TLS and prevent trust authentication or public exposure. **[BLOCKED — DEPLOYMENT INSPECTION]**
      Container/proxy hardening is codified and statically validated: digest-pinned minimal images, non-root application users, read-only roots, bounded tmpfs/resources/PIDs, dropped capabilities, isolated internal networks, exact trusted proxy CIDR, TLS/security headers/request limits, and no host exposure for PostgreSQL or Redis.
      Encrypted backup, guarded restore validation, safe migration status/apply procedures, release ownership, rollback/forward-fix documentation, and a scheduled ephemeral CI restore drill are implemented; production retention execution still requires deployment ownership.
- Production configuration rejects demo seeding, console or absent request-time OTP delivery, mock payment at schema level, weak/fallback JWT secrets, credential-less PostgreSQL/Redis, debug logging, missing metrics authentication, incomplete Arvan configuration, incomplete Kavenegar credentials/template, and enabled broadcasts without a real provider, current price, and finite spend cap. Development-only behavior remains explicitly separated and covered by configuration tests.

### Privacy, audit, observability, and supply chain

- [ ] Complete safe audit coverage for privileged, identity, financial, notification, feedback, broadcast, photo, and receipt mutations. **[NOT FINISHED]**
- [ ] Inventory personal/child/financial data and enforce purpose, least privilege, retention, deletion/anonymization, export, backup, and evidence requirements. **[NOT FINISHED]**
- [ ] Define SLOs and add masked structured logs, traces, HTTP/database/queue/provider metrics, dashboards, alert ownership, and incident runbooks. **[NOT FINISHED]**
      Dependency and action pins, frozen lockfile installs, high-severity audit, dependency/license review, CodeQL, Trivy repository/container scans, and SPDX SBOM generation are enforced by security-governance CI.

### Frontend quality and security

- [ ] Complete critical-flow unit/component/integration/browser E2E, accessibility, mobile, visual, performance, offline/dependency-failure, and regression coverage. **[NOT FINISHED]**
- [ ] Verify enrollment and long forms at phone/tablet sizes, including keyboard, focus/scroll, sticky controls, date/map/file inputs, validation, and draft recovery. **[NOT FINISHED]**
- [ ] Replace remaining mobile-hostile table layouts with responsive views preserving context, sorting, actions, keyboard, and screen-reader behavior. **[NOT FINISHED]**
      Deterministic bundle/media budgets run on every frontend change and scheduled real-browser performance jobs enforce CLS/LCP/INP and slow-network/cache scenarios.
- [ ] Complete abuse/security testing for sessions/OTP, CSRF/origins, IDOR, roles, XSS, injection, SSRF, uploads, rate/cost limits, secrets/logs, and error disclosure. **[NOT FINISHED]**

## 10. Future phases

### Tutorial video

- [ ] Provide approved video, poster, Persian captions/transcript, duration, rights, placement, and hosting origin. **[BLOCKED — USER INPUT]**
- [ ] Build a reusable semantic accessible video with poster/lazy loading, controls, captions/transcript, exact CSP origin, resilient failure, mobile/keyboard/touch/screen-reader support, and performance/accessibility tests. **[BLOCKED — MEDIA INPUT]**

### Advertisement video popup

- [ ] Provide approved media/rights, campaign dates/pages, hosting, frequency, dismissal, autoplay/audio, and replay rules. **[BLOCKED — USER INPUT]**
- [ ] Build an accessible fail-closed dialog with focus trap/restoration, Escape/close, stopped media, no sound autoplay, minimal frequency data, no navigation reopening/hydration flash, and full viewport/accessibility tests. **[BLOCKED — MEDIA INPUT]**

### Real online-payment gateway

- [ ] Select a gateway and provide official docs, sandbox/merchant credentials, callback URLs/IPs, rial/toman units, verification, expiry, reconciliation, settlement, duplicate-payment, refund, and support rules. **[BLOCKED — USER INPUT]**
- [ ] Implement the provider behind the existing port, server-to-server verification, atomic/idempotent finalization, unknown-state reconciliation, validated HTTPS redirect, real return page, sandbox contract/E2E tests, and incident/runbooks. **[BLOCKED — GATEWAY INPUT]**
- [ ] Enable online controls only after sandbox and production-readiness verification; the offline workflow remains available. **[BLOCKED — GATEWAY VERIFICATION]**

### Kavenegar final delivery status

- [ ] Confirm authenticated callback availability for the account/plan; otherwise use bounded official status polling or document provider acceptance as the available state. **[BLOCKED — PROVIDER CONFIRMATION]**
- [ ] Add replay-safe idempotent callback/polling status mapping and tests if approved. **[BLOCKED — PROVIDER DECISION]**

## 11. User inputs still required

- [ ] Kavenegar sender confirmation; exact approved OTP template; current price per segment; campaign spend cap; alert recipient/system; consent/legal approval. **[BLOCKED — USER INPUT]**
- [ ] Arvan endpoint, region, private bucket, scoped credentials, exact CORS origins, lifecycle/versioning choices, privacy/retention approval, and card template. **[BLOCKED — USER INPUT]**
- [ ] Tutorial and advertisement videos with posters, Persian captions/transcripts, rights, placement/hosting, campaign, frequency, and autoplay rules. **[BLOCKED — USER INPUT]**
- [ ] Payment gateway selection, documentation, sandbox/merchant credentials, unit/callback/reconciliation/refund rules. **[BLOCKED — USER INPUT]**
- [ ] Staging/production access and recorded Persian/product/legal/privacy/security approval. **[BLOCKED — EXTERNAL VERIFICATION]**

## 12. Deployment and human approval gates

- [ ] Verify legacy redirects/bookmarks, route metadata, sitemap, proxy/browser caches, map tiles/CSP, and stale Next.js Server Actions through an actual rolling deployment. **[BLOCKED — DEPLOYMENT]**
- [ ] Run all forward migrations and recovery procedures against a sanitized production-like staging snapshot; record duration, locks, backup, restore, and compatibility evidence. **[BLOCKED — STAGING]**
- [ ] Obtain final Persian-language, product, legal/privacy, security, and operations approval for user text, contracts, consent, photos, receipts, retention, and release. **[BLOCKED — EXTERNAL APPROVAL]**

## 13. Final cleanup rule

- [ ] After each implementation phase, remove its finished-and-verified task and subtasks from this file instead of checking them off permanently. **[ONGOING]**
- [ ] Delete a root task file only when it contains no unfinished, blocked, unverified, or continuing operational requirement. **[ONGOING]**

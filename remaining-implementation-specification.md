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

- The PostgreSQL CI integration gate inserts two real accounts and verifies notification list, read-one, and read-all remain scoped to the authenticated account, including uniform not-found behavior for a foreign notification.
- User notification pagination now carries an immutable `snapshotAt` through API metadata and web navigation, filters both rows and counts to that snapshot, and uses `created_at DESC, id DESC`; the PostgreSQL gate proves deterministic equal-timestamp ordering and that a concurrent later insert neither duplicates nor shifts page two.
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

- The PostgreSQL CI integration gate proves one account lists only its own feedback while a foreign account's submission remains absent; cross-account student association already returns the same not-found result without insertion.
- Feedback list/count queries now share an immutable `snapshotAt`, retain stable `created_at DESC, id DESC` ordering, and expose the snapshot in response metadata. PostgreSQL coverage verifies combined status/category filters, empty pages, and exclusion of a concurrent later insert from both rows and totals.
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
- The PostgreSQL CI gate creates two valid pending canonical photos for one student and races independent approval transactions; exactly one commits, one is rejected by the partial unique index, and a final database count proves the one-current-approved-photo invariant. Status/version/size/canonical-shape constraints, domain transitions, account linking, optimistic review versions, and stale-newer-upload rejection remain covered by focused tests.

### Photo verification

- Cross-account upload ownership returns uniform not-found behavior, controller metadata enforces separate account/onboarding/ordinary-admin boundaries, and completion now rejects declared-versus-HEAD mismatch before download plus HEAD-versus-read truncation before decode. The 45-test photo cluster covers zero-byte, oversized, corrupt, renamed SVG/PDF, huge pixels/axis, extreme aspect, active-upload limits, expired/missing uploads, and valid JPEG/PNG canonicalization to metadata-free sRGB JPEG.
- [ ] Verify signed URL expiry and tampering against the actual private Arvan bucket; local signing-unit coverage cannot prove vendor enforcement. **[BLOCKED — ARVAN CONFIGURATION]**
- [ ] Verify canonical output is exactly 600×800 JPEG, sRGB, visually acceptable in the real card layout, and contains no EXIF/GPS. **[BLOCKED — CARD TEMPLATE/STAGING]**
- Upload completion uses an optimistic status/version write so concurrent processors cannot both persist; a loser removes both its canonical output and raw input, persistence failure is marked for maintenance retry where possible, successful processing removes the raw object, stale approval is rejected when a newer pending upload exists, and approval supersedes the prior current photo. Archived-student cleanup remains retention-policy blocked, while approved-only card consumption remains card-template blocked.
- [ ] Add real-browser enrollment/mobile verification for the photo field. Component tests now cover object-URL preview, measurable accessible progress, cancellation, removal before upload, retry/error text, Persian guidance, privacy navigation, and status announcements. **[NOT FINISHED]**

## 5. Existing admin bulk SMS — remaining verification

Bulk-SMS controller metadata coverage proves every campaign operation requires authentication plus the ordinary active `ADMIN` role, so student tokens are denied by the shared role guard.

- Broadcast regression coverage now reverifies audience/consent/account/phone eligibility at dispatch, normalized-phone deduplication, explicit Tehran-local-to-ISO scheduling, immutable approval snapshot and recalculated estimate, bounded skip-locked recipient claims with atomic attempt increments, stable provider idempotency keys, pause/resume/cancel transitions, transient retry versus permanent failure, dual approval, segment/recipient/spend caps, and privileged audit actions after the notification changes.
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

- The PostgreSQL CI gate builds a real family/enrollment/price/plan with prepayment and installment rows, proves a foreign account receives uniform not-found for both item types, races two different-key active claims so exactly one draft exists, and verifies same-key idempotent replay. Service/DTO tests additionally cover server-derived amount/destination, invalid/future dates, reference/card bounds, cross-item key collision, declared/read size mismatch, and hostile/valid JPEG/PNG fixtures.
- [ ] Verify receipt signed-URL expiry/tampering against the actual private object store. **[BLOCKED — ARVAN CONFIGURATION]**
- The same PostgreSQL fixture promotes the winning receipt to review and races two production approval transactions. Row locks/version predicates yield one success and one conflict; the final query proves exactly one immutable transaction and one fully paid schedule item. Unit transaction tests separately prove amount mismatch, plan/enrollment updates, rejection isolation, audit/outbox calls, and outbox-failure rollback; provider delivery remains outside the financial transaction.
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

- CI now migrates PostgreSQL before tests and runs a real-service integration gate that verifies the migration ledger/application schema, an actual PostgreSQL rollback, BullMQ job persistence across queue-client restart, and real Nest module-graph HTTP liveness against provisioned PostgreSQL/Redis. The test safely skips only when the explicit test-service URLs are absent locally.
- [ ] Add the remaining flow-specific PostgreSQL proof for notification migration and a deployed-process smoke. Notification/feedback isolation and pagination, photo-approval uniqueness, payment ownership/duplicate idempotency, row locks, and exact-once offline finalization now run in the real-service CI gate. **[NOT FINISHED]**
- [ ] Verify outbox recovery across an actual worker termination/restart rather than only a BullMQ client restart and unit-level retry/dead-letter transitions. **[NOT FINISHED]**
- The HTTP collection inventory is bounded and deterministically ordered: operational queues use validated maximum page sizes; admin enrollment/payment/family materializers have explicit ceilings and scope related queries to their window; school, limit-request, admin-identity, broadcast, contract, registration, pricing-version, payment-plan, transaction, receipt-submission, and other parent histories have domain-appropriate hard caps with stable tie-breakers. Comprehensive previews are capped at 50 rows per page, while synchronous XLSX reads every source in stable ID order with a 10,000-row-per-source ceiling and fails closed before workbook construction when any source exceeds it.
- [ ] Move exports that must exceed the synchronous XLSX ceiling to queued/streamed generation once product defines required export ranges and delivery/retention behavior. **[BLOCKED — PRODUCT/OPERATIONS INPUT]**
- [ ] Generate web response/request types or validators from the canonical contract so frontend/backend field-level synchronization is automatic. The API now generates a deterministic committed OpenAPI snapshot from the real Nest module graph, checks it after build in CI, and fails on uncommitted route/DTO drift; web feature boundaries already parse unknown responses with Zod. Building the real module graph also exposed and fixed invalid S3 provider construction and a missing queue-to-photo module dependency. **[NOT FINISHED]**

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

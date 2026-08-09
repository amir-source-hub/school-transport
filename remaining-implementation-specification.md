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

- [ ] Add behavioral producer tests for enrollment review/approval/rejection/correction, payment-plan readiness, feedback responses, and account security events. A catalog contract now fails when any retained type lacks a production producer, and photo decision producers already have direct service tests. **[NOT FINISHED]**

### Shared admin operational view

- [ ] Replace offset paging in the shared operational view with cursor/snapshot paging and add a concurrent-insert test. The view is shared without per-admin read state, links to supported action routes, defaults to a documented 30-day bounded history, validates filters, and orders equal timestamps by ID. **[NOT FINISHED]**

### Student notification UI/API verification

- [ ] Add database-backed IDOR tests for notification list, read-one, and read-all using different user accounts. Unit coverage verifies not-found behavior and authenticated controller boundaries, but staging-equivalent row isolation remains unverified. **[NOT FINISHED]**
- [ ] Test stable pagination with equal timestamps and concurrent inserts. **[NOT FINISHED]**
- [ ] Add real-browser verification for notification RTL/mobile layout and screen-reader output. Component coverage now verifies loading, empty, unread state, mark-one, mark-all, keyboard activation, accessible alerts, retry readiness, duplicate-submit prevention, links, and responsive wrapping. **[NOT FINISHED]**
- [ ] Verify migration `0025_notification_read_state.sql` on a production-like snapshot and prove old queued outbox records remain compatible. **[BLOCKED — STAGING DATABASE]**

## 2. SMS operations and live Kavenegar verification

### Metrics and alerts

- [ ] Add low-cardinality metrics for accepted, rejected, timeout, transient/permanent failure, skipped-no-consent, retry, dead-letter, and queue age. **[NOT STARTED]**
- [ ] Separate OTP, service notification, optional notification, test broadcast, and broadcast-campaign metrics without phone/user/message/API-key labels. **[NOT STARTED]**
- [ ] Add provider latency and configurable alerts for failure/timeout rates, dead-letter/backlog growth, OTP spikes, campaign volume, and estimated spend. **[NOT STARTED]**
- [ ] Add alert cooldown/deduplication and document dashboard ownership, credential rotation, disable-provider, retry/dead-letter recovery, and incident response. **[NOT STARTED]**
- [ ] Verify all logs/metrics/traces mask phone numbers and exclude OTPs, API keys, provider payloads, SMS bodies, feedback content, and signed URLs. **[NOT FINISHED]**

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
- [ ] Record provider message ID/status without logging the number, key, OTP, or message body. **[NOT FINISHED]**

### OTP verification

- [ ] Add safe OTP send/failure/timeout/rate-limit metrics and alerts. **[NOT STARTED]**
- [ ] Obtain final product/legal approval that requested OTP/security messages do not depend on optional marketing consent. **[BLOCKED — APPROVAL]**
- [ ] Reverify two-minute expiry, single-use, resend cooldown, account/IP attempt limits, concurrent verification, generic enumeration-safe errors, and production-only adapter selection after metrics changes. **[NOT FINISHED]**
- [ ] Verify the actual Kavenegar template and delivery with an approved number before marking production delivery verified. **[BLOCKED — EXTERNAL SEND]**

## 3. Feedback verification gaps

- [ ] Add database-backed IDOR verification proving one student account cannot list or infer another account's feedback. Cross-account student association now returns the same not-found result without inserting feedback. **[NOT FINISHED]**
- [ ] Add database-backed filter, empty-page, and concurrent-insert pagination tests. Service ordering is now stable by `created_at DESC, id DESC`, and DTO bounds are enforced. **[NOT FINISHED]**
- [ ] Add keyboard, focus, validation announcement, error recovery, duplicate-submit, long Persian/RTL, mobile/tablet, and screen-reader tests. **[NOT FINISHED]**

## 4. Student card photo gaps

### Placement and enrollment lifecycle

- Enrollment step one now supports account/onboarding-scoped upload before a student exists, retains the selection and retry state on storage failure, and atomically links a completed pending upload inside the student/enrollment transaction. Enrollment may proceed while review is pending; the remaining approved-only card-readiness gate is tracked under card integration.

### Admin review and card integration

- [ ] Add the approved physical card-layout preview to the admin photo-review page after the template/crop area is supplied. The shared queue, short-lived canonical preview, minimal student context, filters, pagination, standard Persian rejection reasons, safe detail, optimistic version checks, audit, and navigation are implemented. **[BLOCKED — CARD TEMPLATE]**
- [ ] Connect only the current approved canonical photo to the actual student-card generation/export path. **[NOT STARTED]**

### Storage and processing hardening

- [ ] Configure a real private ArvanCloud bucket and local/deployment credentials. **[BLOCKED — USER INPUT]**
  - Required local values: endpoint, region, bucket, access key, secret key.
  - Configure exact production/staging/local CORS origins, least privilege, TLS, at-rest protection, private listing/objects, lifecycle, versioning decision, and optional antivirus.
- [ ] Approve the Persian privacy notice, retention/deletion policy, and physical card crop area/template. **[BLOCKED — USER/LEGAL INPUT]**
- [ ] Verify the five-minute presigned PUT/GET behavior, CORS, anonymous denial, key scoping, and actual Arvan compatibility against staging. **[BLOCKED — ARVAN CONFIGURATION]**
- [ ] Add explicit processing resource/time limits and stronger polyglot/decompression-bomb tests; a passing Sharp decode alone is insufficient evidence for every adversarial format. **[NOT FINISHED]**
- [ ] Verify cleanup covers abandoned raw objects, failed processing, rejected originals, superseded versions, archived students, deletion requests, and all object versions when bucket versioning is enabled. **[NOT FINISHED]**
- [ ] Add a database status constraint and database-backed concurrency proof for the one-current-approved-photo invariant. Account-scoped uploads are explicitly allowed but cannot be approved until transactionally linked, the partial unique index enforces one approved photo, domain transitions are checked, optimistic review versions are required, and stale approval is rejected when a newer pending photo exists. **[NOT FINISHED]**

### Photo verification

- [ ] Test cross-account/student IDOR, ordinary-admin authorization, signed URL expiry/tampering, actual-vs-declared size, zero byte, mismatch, corrupt, renamed SVG/PDF, huge pixels/axis, extreme aspect, and valid JPEG/PNG. **[NOT FINISHED]**
- [ ] Verify canonical output is exactly 600×800 JPEG, sRGB, visually acceptable in the real card layout, and contains no EXIF/GPS. **[BLOCKED — CARD TEMPLATE/STAGING]**
- [ ] Test upload replacement races, stale approval, processing retries, rollback/orphan cleanup, archived students, and approved-only card use. **[NOT FINISHED]**
- [ ] Add real-browser enrollment/mobile verification for the photo field. Component tests now cover object-URL preview, measurable accessible progress, cancellation, removal before upload, retry/error text, Persian guidance, privacy navigation, and status announcements. **[NOT FINISHED]**

## 5. Existing admin bulk SMS — remaining verification

- [ ] Add controller-level ordinary-admin authorization and student-denial tests. **[NOT FINISHED]**
- [ ] Reverify audience/consent changes at dispatch, phone deduplication, Tehran scheduling, immutable approval snapshot, bounded skip-locked batching, idempotency, pause/resume/cancel, partial failure, and cost limits after notification changes. **[NOT FINISHED]**
- [ ] Configure an approved test number and perform one controlled live test before production verification. **[BLOCKED — USER INPUT/EXTERNAL SEND]**

## 6. Offline payments and temporary online-payment shutdown

### Product behavior

- [ ] Disable online payment everywhere until a real gateway is selected and production-verified. **[NOT FINISHED]**
  - Keep the `پرداخت آنلاین` choice visible beside `پرداخت آفلاین` wherever payment is required, but render it disabled with accessible explanatory text such as `به‌زودی فعال می‌شود`.
  - Do not rely only on button disabling. API online start/verify endpoints must reject requests while the online-payment feature is disabled.
  - Remove all production/user paths that fabricate `mock:` authorities, including `online-payment-button.tsx` and onboarding/enrollment helpers.
  - Mock gateway behavior may remain only in isolated automated tests or an explicit development-only test harness.
  - Add one shared feature/config decision so onboarding prepayment, student prepayment, installments, contracts, and any future payment entry point cannot drift.

### Payment destination shown to students

- [ ] Add centrally managed offline-payment destination settings. **[NOT FINISHED]**
  - Minimum fields: account/card owner, bank name, card number, optional IBAN/account number, Persian instructions, active/versioned status, and update timestamp.
  - Never hard-code destination details separately in multiple React components.
  - Only active approved destination data may be returned to student accounts.
  - Mask destination details in logs/audits where appropriate, but display the complete approved payment destination to the authenticated payer.
  - Admin changes require confirmation, audit, validation, and optimistic concurrency; previous settings must remain attributable to receipts submitted against them.

### Student offline-payment submission

- [ ] Support offline payment for both prepayment and every installment. **[NOT FINISHED]**
  - When the user selects offline payment, show the approved bank/card details and the exact amount/schedule item being paid.
  - Collect: target schedule-item ID, paid amount, payment date/time, payer/card-holder name if required, source card last four digits (not the full source card number), bank/reference/tracking number, optional note, and receipt image.
  - The backend derives account/student/plan/installment ownership and expected amount; never trust user/account IDs or a client-calculated amount.
  - Accept one active pending receipt per schedule item. Make repeat submission idempotent and require explicit replacement/withdrawal rules.
  - Submission creates `PENDING_REVIEW`; it must not mark the prepayment/installment paid, activate the panel, advance contract/payment lifecycle, or increase totals.
  - After rejection, show a safe Persian reason and allow a new corrected submission. Preserve immutable history of earlier attempts.

### Receipt image storage

- [ ] Store receipt images privately using the same vendor-neutral S3/Arvan infrastructure boundary, with a separate prefix/bucket policy from child photos. **[NOT FINISHED]**
  - Do not expose storage credentials or permanent/public URLs.
  - Validate declared/actual bytes, signature, MIME, size, dimensions, decode, and processing limits; reject SVG/PDF/executable/polyglot/decompression-bomb inputs unless PDF support is separately approved and safely implemented.
  - Strip unnecessary metadata and store an approved normalized derivative plus checksum, size, type, dimensions, and object key.
  - Return short-lived signed views only after payer ownership or admin-role authorization.
  - Define retention for accepted, rejected, replaced, abandoned, archived, disputed, and legally retained payment evidence.

### Data model and API

- [ ] Replace the current reference-only `MANUAL_ADMIN_ENTRY` model with an explicit student-submitted offline-payment workflow, while preserving legitimate admin-recorded cash/manual entries as a distinguishable privileged source. **[NOT FINISHED]**
  - Suggested concepts: `payment_submissions` or receipt/evidence fields linked to immutable `payment_transactions` and one `payment_schedule_item`.
  - Store payer account, plan/item, submitted amount/date/reference, safe source-card suffix, receipt object metadata, destination-settings snapshot/version, status, submit/review timestamps, reviewer, rejection reason, optimistic version, idempotency key, and audit timestamps.
  - States: `DRAFT` if required, `PENDING_REVIEW`, `APPROVED`, `REJECTED`, `WITHDRAWN`, `SUPERSEDED`.
  - Add constraints preventing more than one active pending submission per schedule item and preventing one approved item from increasing paid totals twice.
  - Student endpoints: destination/details, create upload authorization, complete receipt upload, submit metadata, list own submissions/status, replace after rejection, and authorized short-lived receipt view.
  - Admin endpoints: filtered/paginated pending/history list, details/receipt view, approve, reject, and destination-setting management.

### Admin review and financial finalization

- [ ] Add a complete admin receipt-review queue for prepayments and installments. **[NOT FINISHED]**
  - Show student/account context, expected versus submitted amount, plan/item, due date, payment date, reference, receipt preview, previous attempts, and destination snapshot.
  - Allow every active admin to approve/reject; require a Persian rejection reason and confirmation.
  - Approval must lock submission, schedule item, plan, and relevant transaction rows; atomically create/finalize the immutable transaction, update paid totals/item/plan/lifecycle state, audit, and enqueue notifications.
  - Rejection changes only the submission state, audits the decision, and notifies the student; it never mutates paid totals.
  - Concurrent/repeated approval must be idempotent and exactly one approval may affect financial totals.

### Offline-payment notifications

- [ ] Add cataloged in-app and safe SMS events for receipt submitted, approved, rejected, and correction required. **[NOT FINISHED]**
  - Student SMS contains only a generic payment-status change and panel direction—no amount, card number, reference, receipt link, or child details.
  - The shared admin operational view should expose pending receipt reviews without per-admin read state.

### Offline-payment verification

- [ ] Test prepayment and installment ownership/IDOR, invalid amount/date/reference, duplicate pending submission, replacement, receipt tampering, private access, and signed URL expiry. **[NOT FINISHED]**
- [ ] Test approval/rejection authorization, optimistic concurrency, idempotency, rollback, exact-once financial effect, audit, notifications, and worker/provider failure isolation. **[NOT FINISHED]**
- [ ] Test that disabled online controls are keyboard/screen-reader understandable and every API online-payment path rejects safely. **[NOT FINISHED]**
- [ ] Test onboarding: panel activation occurs only after an offline prepayment is approved—not merely submitted. **[NOT FINISHED]**
- [ ] Test mobile receipt capture/upload, progress/cancel/retry, Persian errors, preview, long filenames, and network/storage failures. **[NOT FINISHED]**

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
- [ ] Decide and document one supported local launch path for environment loading. **[NOT FINISHED]**
  - Docker Compose may use an explicitly selected root environment file.
  - Direct `pnpm --filter api/web ...` commands do not automatically load the workspace-root `.env`; current README guidance uses `apps/api/.env` and `apps/web/.env.local` for direct development.
  - Keep the Kavenegar key API-only; it must never enter `apps/web/.env.local` or a `NEXT_PUBLIC_*` variable.
- [ ] Document that the ignored root `.env` is for local values and deployment secrets must use the hosting secret manager. **[NOT FINISHED]**
- [ ] Do not copy the local `.env` into container images, CI artifacts, logs, screenshots, or support bundles. **[NOT FINISHED]**

## 9. Engineering, security, and operations backlog

### Backend verification and CI

- [ ] Add PostgreSQL/Redis-backed integration, migration, queue-restart, HTTP-contract, and deployment-smoke tests to CI. **[NOT FINISHED]**
- [ ] Verify transaction rollback, row locks, constraints, idempotency, authorization, outbox recovery, notification migration, feedback, broadcast, photo, and offline-payment flows against real services. **[NOT FINISHED]**
- [ ] Bound every list/report/export with maximum page/range/row limits, stable ordering, and streamed/queued large output. **[NOT FINISHED]**
- [ ] Keep frontend/backend API contracts synchronized through generated or centrally validated schemas and CI drift detection. **[NOT FINISHED]**

### Infrastructure and release operations

- [ ] Enable/persist Redis memory overcommit and verify it after host reboot. **[BLOCKED — HOST ACCESS]**
- [ ] Verify PostgreSQL authentication/listening/firewall/TLS and prevent trust authentication or public exposure. **[BLOCKED — DEPLOYMENT INSPECTION]**
- [ ] Harden containers/proxy with non-root/minimal images, resource limits, controlled writable paths, TLS, trusted-proxy allowlists, request limits, and no direct database/Redis exposure. **[NOT FINISHED]**
- [ ] Establish encrypted backup, retention, restore-drill, rollback/forward-fix, migration ownership, and incident procedures. **[NOT FINISHED]**
- [ ] Remove/reject production demo seeding, console OTP, mock payment, weak/fallback secrets, debug logs, incomplete providers, and unsafe defaults. **[NOT FINISHED]**

### Privacy, audit, observability, and supply chain

- [ ] Complete safe audit coverage for privileged, identity, financial, notification, feedback, broadcast, photo, and receipt mutations. **[NOT FINISHED]**
- [ ] Inventory personal/child/financial data and enforce purpose, least privilege, retention, deletion/anonymization, export, backup, and evidence requirements. **[NOT FINISHED]**
- [ ] Define SLOs and add masked structured logs, traces, HTTP/database/queue/provider metrics, dashboards, alert ownership, and incident runbooks. **[NOT FINISHED]**
- [ ] Pin/review dependencies, automate vulnerability/license checks, protect lockfiles/install scripts, and generate an SBOM if required. **[NOT FINISHED]**

### Frontend quality and security

- [ ] Complete critical-flow unit/component/integration/browser E2E, accessibility, mobile, visual, performance, offline/dependency-failure, and regression coverage. **[NOT FINISHED]**
- [ ] Verify enrollment and long forms at phone/tablet sizes, including keyboard, focus/scroll, sticky controls, date/map/file inputs, validation, and draft recovery. **[NOT FINISHED]**
- [ ] Replace remaining mobile-hostile table layouts with responsive views preserving context, sorting, actions, keyboard, and screen-reader behavior. **[NOT FINISHED]**
- [ ] Enforce media/bundle/CLS/LCP/INP budgets and slow-network/cache behavior. **[NOT FINISHED]**
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

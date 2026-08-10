# Remaining Implementation Specification

> Audited on 2026-08-10. Completed and verified implementation has been removed. This file contains only unresolved work, including diagnosed implementation defects and work blocked by external configuration, supplied assets, deployment access, or human approval.

## 1. SMS and Kavenegar

- [ ] Obtain an authorized Kavenegar sender line; sender `2000660110` currently returns provider status `427`. **[BLOCKED — KAVENEGAR ACCOUNT]**
- [ ] Restore outbound access to `api.kavenegar.com:443` and verify candidate sender `0018018949161`. **[BLOCKED — NETWORK/PROVIDER]**
- [ ] Allowlist the server outbound IP if `LatestOutbox`/`SelectOutbox` reconciliation is required; the current request returns `407`. **[BLOCKED — KAVENEGAR ACCOUNT]**
- [ ] Create and approve the exact `KAVEHNEGAR_OTP_TEMPLATE`; VerifyLookup currently returns `424`. **[BLOCKED — KAVENEGAR ACCOUNT]**
- [ ] Supply the current price per segment, campaign spend cap, alert recipient/system, and approved live test number. **[BLOCKED — USER INPUT]**
- [ ] Confirm whether authenticated callbacks are available for the account/plan or approve bounded official status polling, then implement and test the selected replay-safe delivery-status path. **[BLOCKED — PROVIDER DECISION]**
- [ ] After configuration is corrected, verify one ordinary SMS, one OTP, and one controlled broadcast on an approved handset. **[BLOCKED — EXTERNAL SEND]**
- [ ] Approve that requested OTP/security messages do not depend on optional marketing consent. **[BLOCKED — PRODUCT/LEGAL APPROVAL]**

## 2. Private S3-compatible storage and student cards

- [ ] Supply the Arvan endpoint, region, private bucket, scoped access key/secret, exact CORS origins, lifecycle policy, and versioning choice. **[BLOCKED — USER INPUT]**
- [ ] Verify presigned PUT/GET expiry and tampering, anonymous denial, key scoping, CORS, TLS, and actual Arvan compatibility in staging for student photos and payment receipts. **[BLOCKED — ARVAN CONFIGURATION]**
- [ ] Diagnose and fix the browser-to-Arvan presigned `PUT` failure. Local evidence on 2026-08-10 shows that the onboarding authorization endpoint returns `200`, creates an `AUTHORIZED` row, and generates a five-minute SigV4 URL; the configured endpoint resolves and serves TLS, the bucket answers the `http://localhost:3000` `OPTIONS` preflight with `200` and allows `PUT` plus `content-type`, and a host-side signed `HEAD` returns the expected `404`, but no browser `PUT` is observed and no object reaches storage. Capture the failed browser `OPTIONS`/`PUT` status and provider error without recording the signed URL, then correct any request-header, signing, provider-policy, browser-network, or Arvan-compatibility defect. **[READY — DIAGNOSTIC/IMPLEMENTATION]**
- [ ] Restore outbound HTTPS connectivity from the API/worker containers to `s3.ir-thr-at1.arvanstorage.ir:443`. The Windows host reaches the endpoint, but a signed read-only request from the API container fails with `UND_ERR_CONNECT_TIMEOUT`; verify Docker DNS, routing, proxy/VPN, firewall, IPv4/IPv6 behavior, and production-host egress. Server-side `HEAD`, `GET`, canonical-image `PUT`, and cleanup `DELETE` must all work before photo or payment-receipt storage is considered usable. **[BLOCKED — DOCKER/HOST NETWORK]**
- [ ] Fix expired photo-upload authorizations exhausting `STUDENT_PHOTO_MAX_ACTIVE_UPLOADS`. Three failed local attempts remained `AUTHORIZED` after their five-minute expiry and caused `PHOTO_UPLOAD_LIMIT` (`409`). In the authorization transaction, expire overdue `AUTHORIZED` rows before enforcing the cap or exclude rows whose `upload_authorization_expiry` is in the past; preserve concurrency safety, account scoping, auditability, and idempotency. Verify that genuinely active uploads still enforce the cap while abandoned/expired uploads immediately stop counting. **[READY — BACKEND IMPLEMENTATION]**
- [ ] Verify and repair scheduled student-photo cleanup. Confirm the worker schedules and executes `cleanupExpired`, records failures without log flooding, transitions expired authorizations to `EXPIRED`, and remains effective after Redis reconnect/restart. Add unit/integration coverage for worker scheduling, Redis interruption/recovery, repeated cleanup, and an authorization request racing cleanup; expose actionable metrics/alerts for stale `AUTHORIZED`, `UPLOADED`, and `VALIDATING` rows. **[READY — WORKER/OBSERVABILITY]**
- [ ] After the fixes, clear only confirmed expired local authorization rows through the application cleanup path, then run a complete JPEG and PNG acceptance test: authorize, browser `PUT`, complete, server-side metadata/read, isolated validation/crop, canonical 600×800 JPEG write, raw-object deletion, review queue, signed view, approval/rejection, expiry/tampering, and retry. Repeat the equivalent presigned upload/read checks for offline-payment receipts. **[BLOCKED — ARVAN/IMPLEMENTATION VERIFICATION]**
- [ ] Approve retention/deletion and legal-hold rules for photos and payment-receipt evidence, then enable the remaining irreversible cleanup behavior. **[BLOCKED — PRODUCT/LEGAL POLICY]**
- [ ] Supply and approve the physical student-card template and crop area, verify the 600×800 canonical output visually, and add the card-layout preview/export integration. **[BLOCKED — CARD TEMPLATE]**

## 3. Enrollment form validation and UX

- [ ] Replace the generic English `Invalid verification code.` response with an appropriate Persian OTP error at both API and UI boundaries. Distinguish an incorrect code, expired code, missing/invalidated request, resend cooldown, and too many attempts; preserve the tracking ID, avoid revealing whether an account exists, keep Persian copy consistent across login/onboarding/admin flows, and add API/UI tests for each state. **[READY — AUTH ERROR HANDLING]**
- [ ] Redesign enrollment-form error presentation so errors appear next to the relevant field in Persian, the first invalid field receives focus, an accessible summary identifies every invalid section, submitted values are preserved, hidden conditional fields do not report stale errors, and server/network/conflict errors remain visually distinct from field-validation errors. Verify keyboard navigation, screen-reader associations, mobile layout, RTL rendering, loading/disabled states, and retry behavior. **[READY — ENROLLMENT ERROR UI]**
- [ ] Render all numeric identifiers and telephone inputs left-to-right with left-aligned digits while keeping labels, help text, and surrounding form layout RTL. Apply `dir="ltr"`, numeric-friendly input modes, predictable caret behavior, and Persian/Arabic-to-ASCII digit normalization consistently without converting stored identifiers to numbers. **[READY — RTL/LTR INPUT UX]**
- [ ] Initialize every mobile-phone field with the `09` prefix and every home/landline field with the `021` prefix. Keep these prefixes editable where product rules permit, place the caret after the prefix, prevent duplicated prefixes on paste/autofill, accept Persian and Arabic digits, and validate the normalized final value. Do not apply the `09` default to landline fields or the `021` default to mobile fields. **[READY — PHONE INPUT DEFAULTS]**
- [ ] Change the product rule for every national-ID field to a numeric string of 1–10 digits, including values with meaningful leading zeros and short values such as three or four digits. Do not coerce the value to a number, do not require exactly ten digits, and do not apply the Iranian checksum rule unless product requirements are changed later. Use one shared validator and the same accurate Persian error across student, father, mother, attendant, emergency-contact, and any admin/edit/import surfaces. **[READY — NATIONAL-ID CONTRACT]**
- [ ] Fix the attendant national-ID rejection demonstrated by `0023518805`. Remove the incorrect shared error `کد ملی نامعتبر است. فقط عدد و حداکثر ۲۰ رقم وارد کنید.` and any 20-digit, checksum, or field-specific schema mismatch; ensure the normalized value `0023518805` is accepted and its leading zeros survive request validation, persistence, retrieval, editing, exports, and audit redaction. Add regression tests for `1`, three/four-digit values, `0023518805`, ten digits, Persian digits, eleven digits, letters, whitespace/paste, and empty required/optional states. **[READY — NATIONAL-ID DEFECT]**
- [ ] Replace free-form date fields with either an accessible Persian/Jalali calendar picker or three constrained numeric inputs for year, month, and day. The numeric presentation must read visually as `____/__/__` (`YYYY/MM/DD`), keep numeric segments left-to-right, auto-advance without trapping focus, support keyboard/paste/backspace, normalize Persian digits, and display the selected Persian date unambiguously. **[READY — PERSIAN DATE INPUT]**
- [ ] Define one canonical date contract between UI and API: validate real Jalali dates including month lengths and leap years, reject impossible/future/out-of-policy dates with specific Persian messages, convert only at the boundary if storage uses Gregorian/ISO, and guarantee round-trip stability without timezone/day shifts. Apply it consistently to birth dates and every other enrollment date, with unit, integration, and E2E coverage. **[READY — DATE VALIDATION]**
- [ ] Reduce the student-photo upload maximum from 25 MiB to 5 MiB across API configuration/defaults, authorization DTO responses, frontend preflight validation, Persian help/error copy, tests, environment examples, operational documentation, and S3/provider enforcement. Reject oversized files before issuing a presigned URL and verify exact-boundary behavior at 5 MiB and one byte above it. **[READY — PHOTO SIZE LIMIT]**
- [ ] Make attendant identity fields conditional on the selected relationship: when `father` is selected, reuse the already entered father record and do not request duplicate father details; when `mother` is selected, reuse the mother record and do not request duplicate mother details; when `other` is selected, retain both father and mother sections and collect a separate attendant record. Clear or ignore stale hidden attendant values, preserve intentional data when toggling safely, enforce the same rule server-side, and verify create/edit/resume/export behavior. **[READY — CONDITIONAL ATTENDANT FORM]**
- [ ] Add focused enrollment E2E coverage combining the preceding rules: mobile/home prefixes and LTR alignment, short/leading-zero national IDs, attendant relationship switching, Persian date entry/calendar selection, 5 MiB photo boundary, accessible field errors, submission retry, onboarding resume, and successful persistence/reload of normalized values. **[READY — ENROLLMENT VERIFICATION]**

## 4. Offline-payment policy and contracts

- [ ] Approve and version the final Persian offline-payment contract, including claim-versus-acceptance wording, destination/amount/reference responsibility, review timing, corrections, duplicate transfers, refunds, disputes, installments, late payment, retention, and activation timing. **[BLOCKED — PRODUCT/LEGAL INPUT]**
- [ ] Review notification consent, photo privacy, payment-evidence privacy, retention/deletion, and SMS/OTP clauses together, then update contract rendering, print/download views, tests, and previews with the approved text. **[BLOCKED — APPROVED TEXT]**

## 5. Online-payment gateway

- [ ] Select a gateway and supply official documentation, sandbox/merchant credentials, callback URLs/IPs, rial/toman units, verification, expiry, reconciliation, settlement, duplicate-payment, refund, and support rules. **[BLOCKED — USER INPUT]**
- [ ] Implement the selected provider behind the existing gateway port with server-to-server verification, atomic/idempotent finalization, unknown-state reconciliation, validated HTTPS redirects, return UI, sandbox contract/E2E coverage, and runbooks. **[BLOCKED — GATEWAY INPUT]**
- [ ] Enable online controls only after sandbox and production-readiness verification; the completed offline workflow remains available. **[BLOCKED — GATEWAY VERIFICATION]**

## 6. Media

- [ ] Supply the approved tutorial video, poster, Persian captions/transcript, duration, rights, placement, and hosting origin; then build and verify the accessible reusable video surface. **[BLOCKED — MEDIA INPUT]**
- [ ] Supply approved advertisement media, poster/captions, rights, campaign dates/pages, hosting, frequency, dismissal, autoplay/audio, and replay rules; then build and verify the accessible fail-closed dialog. **[BLOCKED — MEDIA INPUT]**

## 7. Product and operations decisions

- [ ] Define required export ranges, delivery method, access control, expiry, and retention before implementing queued/streamed exports beyond the current 10,000-row synchronous ceiling. **[BLOCKED — PRODUCT/OPERATIONS INPUT]**
- [ ] Approve exact retention, erasure/anonymization, dispute/legal-hold, consent-history, child-record, financial, audit, support, and campaign periods before enabling irreversible cleanup and replacing `pending-legal-approval` in the privacy register. **[BLOCKED — LEGAL/PRODUCT POLICY]**

## 8. CI and repository cleanup

- [ ] Reproduce and diagnose the failing production Compose `Build and start the production web dependency chain` step from the `8bd55c7` `main` workflow run; the local reproduction was intentionally stopped before completion. Split build/start diagnostics if needed, preserve the first actionable Docker/Next.js error in CI annotations or an artifact, fix the root cause, and verify the complete deployment smoke job. **[PAUSED — CI/LOCAL REPRODUCTION]**
- [ ] Confirm the production-container scan result after the `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` and Git LFS checkout fixes; if it still fails, inspect the Trivy/SARIF findings, remediate actionable vulnerabilities or document narrowly scoped accepted risks, and rerun the scan to success. **[PAUSED — CI RESULT/REPOSITORY ACCESS]**
- [ ] Enable GitHub Dependency graph and dependency review under repository security settings, then rerun the pull-request dependency/license check and verify that push runs remain intentionally skipped. **[BLOCKED — REPOSITORY ADMIN SETTING]**
- [ ] Close the superseded `dependabot/docker/node-26-bookworm-slim` pull request and delete its remote branch after confirming no useful dependency metadata remains; `main` deliberately targets Node.js 24 LTS instead of that proposed Node.js 26 image update. **[BLOCKED — REMOTE REPOSITORY APPROVAL]**

## 9. Staging, deployment, and release approval

- [ ] Verify notification migration `0025_notification_read_state.sql`, all forward migrations, and recovery procedures against a sanitized production-like snapshot; record duration, locks, backup, restore, and legacy outbox compatibility. **[BLOCKED — STAGING DATABASE]**
- [ ] Enable persistent Redis memory overcommit and verify it after a host reboot. **[BLOCKED — HOST ACCESS]**
- [ ] Inspect PostgreSQL authentication, listening interfaces, firewall, and TLS; prevent trust authentication and public exposure. **[BLOCKED — DEPLOYMENT INSPECTION]**
- [ ] Verify legacy redirects/bookmarks, route metadata, sitemap, proxy/browser caches, map tiles/CSP, and stale Next.js Server Actions through an actual rolling deployment. **[BLOCKED — DEPLOYMENT]**
- [ ] Obtain recorded Persian-language, product, legal/privacy, security, and operations release approval. **[BLOCKED — EXTERNAL APPROVAL]**

## Cleanup rule

- Remove an item when its implementation and verification are complete.
- Delete this file only when no blocked, unverified, or continuing requirement remains.

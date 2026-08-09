# Remaining Implementation Specification

> Created: 2026-08-09  
> Purpose: authoritative checklist for all work that remains after the completed items in `modifications.md` and `more-features.md` are removed.  
> Status tags: **[NOT STARTED]**, **[IN PROGRESS]**, **[FINISHED · NOT VERIFIED]**, **[FINISHED · VERIFIED]**, **[BLOCKED — USER INPUT]**, and **[BLOCKED — EXTERNAL VERIFICATION]**.

## 1. Rules for using this specification

- [ ] Work on an independent `codex/*` feature branch and make focused commits at safe checkpoints. **[NOT STARTED]**
- [ ] Use only forward database migrations; never edit an already-applied migration. **[NOT STARTED]**
- [ ] A checkbox may be marked **FINISHED · VERIFIED** only after its complete code path has been inspected and its relevant automated checks pass. Production-only behavior remains **FINISHED · NOT VERIFIED** until checked in staging/production.
- [ ] Keep secrets out of Git. Only placeholders belong in `.env.example` files.
- [ ] Preserve unrelated user changes and do not remove either source checklist until its remaining items have been transferred and completed according to section 9.
- [ ] All user-visible text must be Persian and must have accessible labels, errors, loading states, and empty states.
- [ ] The supported application audiences for this phase are only:
  - `ADMIN`: staff who use `/admin/*`.
  - Student/guardian account: users who use `/student/*`; the current internal database/API role is still named `PARENT` for backward compatibility.
- [ ] Do not introduce a separate `SUPER_ADMIN` role. Remove `SuperAdminGuard` requirements from in-scope features and authorize them with authenticated `ADMIN` access. Keep auditing and high-risk workflow safeguards.
- [ ] Do not create a private per-admin notification inbox. All admins may view the same operational notification data.

## 2. Current implementation baseline

### 2.1 Roles and authorization

- Runtime roles are currently `PARENT | ADMIN` in:
  - `apps/api/src/common/authentication.types.ts`
  - `apps/api/src/common/http-request.ts`
  - `apps/web/src/features/auth/auth-api.ts`
  - authentication/session guards and tests.
- `PARENT` represents the guardian-owned student panel and should remain compatible until a separately planned data-contract migration renames it.
- `admin_users.is_super_admin` and `apps/api/src/modules/access-control/super-admin.guard.ts` currently add a second privilege check to some admin operations. This phase must remove that requirement from feedback, broadcasts, admin-account management, and any other in-scope panel feature.
- High-risk operations must still require confirmation, audit records, rate/cost limits, and—in the broadcast workflow—a different admin's approval. Dual approval is a workflow safety rule, not a super-admin role.

### 2.2 Current student notification types

The audited producers currently include:

| Area | Current types | Required panel delivery | Required SMS delivery |
| --- | --- | --- | --- |
| Account/onboarding | `ACCOUNT_REGISTERED`, `WELCOME` | Yes | Account registered: service; welcome: optional |
| Profile | `PROFILE_UPDATED`, `ADDRESS_UPDATED`, `EMERGENCY_CONTACT_UPDATED` | Yes | Optional/consent-aware |
| Students/capacity | `ADMIN_STUDENT_ADDED`, `LIMIT_REQUEST_CREATED`, `LIMIT_REQUEST_APPROVED`, `LIMIT_REQUEST_REJECTED` | Yes | Service notice |
| Enrollment | `ENROLLMENT_CREATED`, `REGISTRATION_UPDATE` | Yes | Service notice |
| Pricing | `PRICE_OFFERED`, `PRICE_ACCEPTED` | Yes | Service notice |
| Payments | `PAYMENT_SUCCEEDED`, `PAYMENT_APPROVED`, `PAYMENT_REJECTED`, `PAYMENT_PLAN_READY`, `PAYMENT_REMINDER` | Yes | Service notice; no amount in SMS |
| Contracts | `CONTRACT_READY`, `CONTRACT_ACCEPTED`, `CONTRACT_REJECTED` | Yes | Service notice; no sensitive text in SMS |
| Feedback | feedback received/status response events, including response notification | Yes | Generic service notice directing to panel |
| Admin campaign | `ADMIN_BROADCAST` when in-app content is selected | Yes | Optional/marketing and consent-aware |

Required catalog review:

- [ ] Locate every producer rather than relying only on the table above; identify seed-only types and remove them from the production catalog unless a real producer is added. **[NOT STARTED]**
- [ ] Remove duplicate or low-value notifications. Do not notify merely because the user performed an action and already received an immediate success response unless the event has later operational value.
- [ ] Add missing events only for actionable state changes: enrollment decision, price availability, contract readiness/decision, payment outcome/plan/reminder, capacity-request decision, feedback response, photo rejection/approval, and account-security events.
- [ ] For every retained user notification, support both `IN_APP` and `SMS` through the same typed logical catalog. Channel eligibility must be decided by purpose and consent at dispatch time.
- [ ] Keep detailed content inside the authenticated panel. SMS must remain generic and must not include national IDs, child details, addresses, contract content, exact financial values, feedback content, or signed photo URLs.

### 2.3 Current admin notification behavior

- `GET /admin/notifications` is a shared operational projection of selected user-domain events.
- It is not a true admin inbox and must not gain per-admin read state in this phase.
- [ ] Define the shared admin event list in the typed catalog. Recommended events: new enrollment awaiting action, extra-student-limit request, price/contract action required, manual payment review, urgent feedback, failed/dead-letter notification delivery, pending student-photo review, and broadcast status/failure threshold. **[NOT STARTED]**
- [ ] Show shared admin events once, with stable ordering, filters, pagination, event time, status, and a link to the relevant admin page.
- [ ] Do not add “mark read” per administrator. An operational event disappears or changes state when the underlying work is resolved, or it remains visible according to its shared lifecycle.
- [ ] Do not send ordinary SMS to admins for every operational event in this phase. If admin alert SMS is later required, add a separate explicit configuration and recipient policy rather than reusing student consent.

## 3. Phase A — Notification architecture cleanup

### 3.1 Data model and migration

Primary files:

- `apps/api/src/database/schemas/notifications.schema.ts`
- `apps/api/src/database/schemas/index.ts`
- new forward migration under `apps/api/drizzle/`
- `apps/api/src/infrastructure/notifications/**`
- `apps/api/src/modules/notifications/**`

Tasks:

- [ ] Add `readAt` to in-app notification records. It represents only user acknowledgement. **[NOT STARTED]**
- [ ] Stop using `notificationStatus=PENDING/SENT` as unread/read state.
- [ ] Keep logical event identity, channel delivery state, and in-app read state separate:
  - logical event: outbox event/type/audience/entity/purpose;
  - delivery: queued, processing, accepted, failed, skipped-no-consent, dead-letter;
  - in-app acknowledgement: nullable `readAt`.
- [ ] Consider a dedicated `notification_deliveries` table if one logical event can produce multiple channel attempts. If retaining the existing `notifications` table, enforce a unique event/channel key and document the invariant.
- [ ] Migrate existing in-app rows:
  - old `PENDING` → `readAt = NULL`;
  - old `SENT` → `readAt = sentAt ?? updatedAt ?? createdAt`;
  - preserve SMS delivery timestamps/statuses unchanged.
- [ ] Add indexes for `(user_id, channel, created_at, id)`, unread queries, delivery dispatch, and stable cursor pagination.
- [ ] Preserve compatibility with already queued outbox events and make migration/retry behavior idempotent.

### 3.2 Typed notification catalog

Suggested new file:

- `apps/api/src/infrastructure/notifications/notification.catalog.ts`

Each catalog entry must declare:

- notification type;
- audience (`STUDENT_ACCOUNT` or shared `ADMIN_OPERATIONAL`);
- Persian in-app title/message builder;
- safe Persian SMS builder when SMS is allowed;
- purpose (`SERVICE_NOTICE`, `SECURITY`, or `OPTIONAL_UPDATES`);
- allowed channels;
- related entity type and route-link builder;
- whether deduplication/exactly-once delivery is required;
- whether resolved underlying work should hide the shared admin item.

Tasks:

- [ ] Replace substring-based SMS routing in `notification-sms.catalog.ts` with exhaustive typed catalog entries. **[NOT STARTED]**
- [ ] Make compilation/tests fail when a declared notification type lacks channel/audience/purpose handling.
- [ ] Normalize existing producer names and remove fixture-only types from runtime assumptions.
- [ ] Review all Persian copy for usefulness, safety, consistency, and absence of sensitive information.

### 3.3 Welcome notification lifecycle

- [ ] Remove creation of `WELCOME` from `NotificationsService.getByUser()`. GET operations must be read-only. **[NOT STARTED]**
- [ ] Enqueue `WELCOME` exactly once when the panel becomes active after the required enrollment/contract/prepayment lifecycle completes.
- [ ] Use a deterministic event ID such as `WELCOME:<userId>` and a database uniqueness constraint.
- [ ] Do not create a welcome notification for incomplete or abandoned onboarding.

### 3.4 Student notification API and UI

Primary files:

- `apps/api/src/modules/notifications/notifications.controller.ts`
- `apps/api/src/modules/notifications/notifications.service.ts`
- `apps/web/src/features/notifications/notifications-api.ts`
- `apps/web/src/features/notifications/notification-actions.tsx`
- `apps/web/src/app/student/notifications/page.tsx`

Tasks:

- [ ] Add bounded cursor or page pagination, default and maximum page size, stable `createdAt DESC, id DESC` ordering, and total/next metadata. **[NOT STARTED]**
- [ ] Return explicit `readAt`; do not infer it from delivery status.
- [ ] Keep notification ownership derived from the authenticated session on list/read/read-all operations.
- [ ] Return 404 or a safe idempotent result when a user attempts to read a notification they do not own; never disclose another user's record.
- [ ] Add loading skeleton, empty state, recoverable Persian error state, retry, pagination controls, unread styling, mark-one-read, and mark-page/all-read behavior.
- [ ] Add links only from catalog-approved internal paths and never accept arbitrary URLs from stored event payloads.

### 3.5 Shared admin operational view

Primary files:

- `apps/api/src/modules/notifications/notifications.controller.ts`
- `apps/api/src/modules/notifications/notifications.service.ts`
- `apps/web/src/features/admin-notifications/admin-notifications-api.ts`
- `apps/web/src/app/admin/notifications/page.tsx`

Tasks:

- [ ] Keep one shared view for all authenticated admins. **[NOT STARTED]**
- [ ] Add type/status/date filters, stable pagination, and safe links to operational pages.
- [ ] Remove the current fake `readAt` mapping derived from `notificationStatus`.
- [ ] Do not create per-admin notification/read tables.
- [ ] Ensure the endpoint is protected by `AuthGuard`, `RolesGuard`, and `@Roles('ADMIN')` only.

### 3.6 Notification verification

- [ ] Test migration mapping, old outbox compatibility, and idempotent reprocessing. **[NOT STARTED]**
- [ ] Test that GET requests never create notifications.
- [ ] Test exact-once welcome creation at panel activation.
- [ ] Test user ownership/IDOR for list, read, and read-all.
- [ ] Test stable pagination when equal timestamps and concurrent inserts exist.
- [ ] Test every catalog type produces the intended in-app record and eligible safe SMS.
- [ ] Test consent is rechecked at dispatch for optional messages while service/security messages follow their documented policy.
- [ ] Test the shared admin projection is identical for all active admins and inaccessible to student accounts.

## 4. Phase B — SMS operational improvements and OTP review

### 4.1 Metrics, monitoring, and alerts

Primary files:

- `apps/api/src/infrastructure/sms/**`
- `apps/api/src/infrastructure/notifications/**`
- `apps/api/src/infrastructure/queue/**`
- `apps/api/src/config/config.service.ts`
- `.env.example`, `apps/api/.env.example`
- `docs/NOTIFICATION_SMS.md`

Tasks:

- [ ] Add low-cardinality counters for accepted, rejected, timeout, transient failure, permanent failure, skipped-no-consent, retry, and dead-letter outcomes. **[NOT STARTED]**
- [ ] Add separate counters for OTP, service notification, optional notification, test broadcast, and broadcast campaign. Never use phone number, user ID, API key, full provider error, or message text as metric labels.
- [ ] Add latency histogram/timer for Kavenegar calls and queue age metrics.
- [ ] Add configurable alert thresholds for sustained failure rate, timeout rate, dead-letter growth, queue backlog/age, OTP-send spikes, and estimated SMS spend.
- [ ] Add cooldown/deduplication to alert emission so a provider outage does not create an alert storm.
- [ ] Ensure logs mask phone numbers and never contain OTPs, API keys, full provider payloads, SMS bodies, or signed URLs.
- [ ] Document dashboards, alert ownership, disable-provider procedure, retry/dead-letter recovery, credential rotation, and incident response.

### 4.2 Delivery status callback

- [ ] Confirm from the selected Kavenegar plan/documentation whether a signed/authenticated delivery callback is available. **[BLOCKED — EXTERNAL VERIFICATION]**
- [ ] If authenticated callbacks are supported, implement a narrow callback endpoint with signature/authentication verification, timestamp/replay window, idempotent provider-message mapping, safe status normalization, and no recipient disclosure.
- [ ] If they are not supported, document that the application records provider acceptance only and optionally add bounded scheduled status polling if the official API and cost policy permit it.

### 4.3 OTP implementation review

Primary files:

- `apps/api/src/modules/identity/application/otp-delivery.port.ts`
- `apps/api/src/modules/identity/infrastructure/otp-delivery.ts`
- `apps/api/src/modules/identity/application/auth.service.ts`
- `apps/api/src/modules/identity/identity.module.ts`
- OTP concurrency/configuration tests

Tasks:

- [ ] Preserve OTP as a requested `SECURITY` message independent of optional/marketing consent; obtain final legal/product approval for that policy. **[BLOCKED — USER INPUT]**
- [ ] Verify two-minute server-authoritative expiry, single use, resend cooldown, account/IP/device limits, attempt limits, concurrent verification, and generic enumeration-safe errors.
- [ ] Verify Kavenegar `VerifyLookup` is used only behind `OtpDelivery`, with the ordinary SMS adapter kept separate at the service boundary.
- [ ] Verify `developmentCode` can appear only in non-production console mode.
- [ ] Add OTP success/failure/timeout/rate-limit metrics without logging phone numbers or codes.
- [ ] Add operational alerts for unusual OTP send volume and provider failure rate.
- [ ] Production-enable only after `KAVEHNEGAR_API_KEY` and an approved `KAVEHNEGAR_OTP_TEMPLATE` are configured. **[BLOCKED — USER INPUT]**

## 5. Phase C — Feedback verification and admin-only authorization

### 5.1 Authorization simplification

Primary files:

- `apps/api/src/modules/feedback/feedback.controller.ts`
- `apps/api/src/modules/access-control/super-admin.guard.ts`
- feedback service/controller tests

Tasks:

- [ ] Remove `SuperAdminGuard` from feedback endpoints; retain `AuthGuard`, `RolesGuard`, and `@Roles('ADMIN')`. **[NOT STARTED]**
- [ ] Confirm every active admin can list, read, assign, respond, and close feedback.
- [ ] Keep all feedback reads and mutations audited with the acting admin ID.

### 5.2 Automated security and correctness tests

- [ ] IDOR: Student A cannot list, read, associate, or infer Student B's feedback. **[NOT STARTED]**
- [ ] Roles: logged-out and student accounts cannot access admin feedback endpoints; every active admin can.
- [ ] Stored XSS: reject raw HTML input and verify escaped rendering in student history and admin views for tag-like, encoded, and mixed-direction payloads.
- [ ] Pagination/filtering: verify bounds, stable ordering, status/category combinations, empty pages, and concurrent insert behavior.
- [ ] Concurrency: two admins responding/closing with the same version must result in exactly one successful state transition.
- [ ] Exactly-once response notification: retries and concurrent responses must create one logical outbox event and eligible channel delivery per event.
- [ ] Sensitive logging: feedback subject/message/response must not appear in audit details, logs, traces, analytics, or error payloads.

### 5.3 UI verification

- [ ] Add component/browser tests for keyboard submission, labels, focus movement, validation announcement, error recovery, empty/history states, and admin actions. **[NOT STARTED]**
- [ ] Verify student/admin layouts at supported mobile, tablet, and desktop widths.
- [ ] Verify long Persian text, RTL punctuation, wrapping, and screen-reader names.
- [ ] Verify loading/disabled states prevent duplicate submission and stale concurrent admin actions.

## 6. Phase D — Student card photo upload using ArvanCloud Object Storage

The supplied `arvancloud_student_card_photo_upload_spec.md` is the product/infrastructure authority for version 1. Where the older `more-features.md` says S3/MinIO and WebP, use the newer decision below: **ArvanCloud S3-compatible Object Storage, private bucket, direct presigned upload, and canonical 600 × 800 JPEG**. Do not deploy both JPEG and WebP pipelines unless the physical card generator later requires another derivative.

### 6.1 Final version-one decisions

- Storage: ArvanCloud Object Storage; no MinIO.
- Bucket: dedicated private bucket per environment; no public listing or public object ACL.
- Upload placement: student photo field in enrollment step one.
- Upload path: browser uploads directly to Arvan through a backend-issued five-minute presigned URL.
- Accepted originals: JPG/JPEG and PNG.
- Maximum original size: 25 MB, checked before authorization and again from the stored object.
- Minimum recommended source: 600 × 800; hard low-quality rejection near 480 × 640.
- Maximum decoded pixels: 12.5 MP; maximum axis: 8,000 px.
- Canonical output: 600 × 800 portrait JPEG, sRGB, quality approximately 85, EXIF/GPS removed.
- Object keys: server-generated opaque UUIDs; never include student name, national ID, phone, or student number.
- Review: technical validation followed by manual admin approval.
- Access: short-lived presigned GET only after ownership/admin authorization.
- The photo is required for official card readiness. Enrollment data may be saved while upload/review is pending, but the workflow must clearly prevent final card readiness until an approved photo exists.

### 6.2 Infrastructure and configuration

Primary files:

- new `apps/api/src/modules/student-images/`
- `apps/api/src/config/config.service.ts`
- `.env.example`, `apps/api/.env.example`
- `docker-compose*.yml` only for service configuration, not embedded credentials
- new deployment/runbook documentation

Required environment placeholders:

```dotenv
ARVAN_S3_ENDPOINT=
ARVAN_S3_REGION=
ARVAN_S3_BUCKET=
ARVAN_S3_ACCESS_KEY=
ARVAN_S3_SECRET_KEY=
STUDENT_PHOTO_UPLOAD_URL_TTL_SECONDS=300
STUDENT_PHOTO_VIEW_URL_TTL_SECONDS=300
STUDENT_PHOTO_MAX_BYTES=26214400
STUDENT_PHOTO_MAX_PIXELS=12500000
STUDENT_PHOTO_MAX_AXIS=8000
STUDENT_PHOTO_OUTPUT_WIDTH=600
STUDENT_PHOTO_OUTPUT_HEIGHT=800
STUDENT_PHOTO_JPEG_QUALITY=85
```

Tasks:

- [ ] Add schema validation and production validation for every setting; examples contain empty placeholders only. **[NOT STARTED]**
- [ ] Use separate production/staging buckets and credentials.
- [ ] Configure exact-origin CORS for the student portal; never use wildcard origins with credentials.
- [ ] Create a least-privilege application identity limited to required object operations/prefixes.
- [ ] Verify TLS, at-rest protection, bucket privacy, versioning decision, lifecycle rules, and anonymous access denial. **[BLOCKED — USER/ARVAN CONFIGURATION]**

### 6.3 Database model and state machine

Suggested new tables/fields:

- `student_photo_uploads`: ID, student/account IDs, raw/canonical keys, declared and actual type/size, dimensions, checksum, version, status, rejection code/detail, reviewer, reviewed time, upload authorization expiry, processing timestamps, superseded/deletion timestamps, created/updated time.
- Student reference to the currently approved photo/version, or a queryable invariant that selects exactly one active approved photo.

Required statuses:

`AUTHORIZED → UPLOADED → VALIDATING → PENDING_REVIEW → APPROVED | REJECTED | FAILED | EXPIRED | SUPERSEDED`

Tasks:

- [ ] Add a forward migration, foreign keys, indexes, uniqueness/invariants, optimistic version, and cleanup indexes. **[NOT STARTED]**
- [ ] Prevent an old/superseded upload from becoming active after a newer decision.
- [ ] Keep originals and canonical derivatives in separate prefixes.
- [ ] Store object keys and metadata, never permanent public URLs or signed URLs.

### 6.4 Enrollment step-one UI

Primary files:

- `apps/web/src/features/enrollment/enrollment-actions.tsx`
- `apps/web/src/features/enrollment/enrollment-form-model.ts`
- `apps/web/src/features/enrollment/enrollment-schema.ts`
- `apps/web/src/features/enrollment/enrollments-api.ts`
- suggested new `apps/web/src/features/enrollment/student-photo-field.tsx`

Tasks:

- [ ] Add the photo field to enrollment step one with file chooser/camera-compatible input, local object-URL preview, progress, cancel, replace, remove-before-finalization, and Persian validation errors. **[NOT STARTED]**
- [ ] Never store base64 image content in form state, localStorage, sessionStorage, logs, analytics, or error tracking. Revoke local object URLs after use.
- [ ] Show accepted JPG/JPEG/PNG formats, 25 MB maximum, portrait guidance, processing/review status, and rejection/re-upload path.
- [ ] Display the requested Persian guidance:
  - `پشت سر دانش‌آموز دیوار سفید باشد.`
  - `ترجیحاً دانش‌آموز لباس فرم مدرسه پوشیده باشد.`
  - `عکس از سر به بالا باشد و تمام‌قد نباشد.`
  - `برای دانش‌آموزان دختر حجاب کامل رعایت شود.`
  - `این تصویر برای کارت سرویس دانش‌آموز استفاده خواهد شد.`
- [ ] Also explain: recent color photo, one person, straight-on, eyes visible, no sunglasses/filters/AI identity editing/group photo, and admin approval required.
- [ ] Preserve enrollment draft/retry behavior when upload fails. A storage outage must show a recoverable error and must not corrupt entered enrollment data.
- [ ] Add a privacy-notice link explaining purpose, authorized viewers, retention, replacement/deletion, and contact route. Final legal wording requires approval. **[BLOCKED — USER INPUT]**

### 6.5 Backend upload authorization and completion

Suggested endpoints (exact naming may follow repository conventions):

- `POST /student-photos/uploads` — authorize one upload;
- direct browser `PUT` to Arvan presigned URL;
- `POST /student-photos/uploads/:id/complete` — independently verify and enqueue processing;
- `GET /student-photos/current` — student status;
- `GET /student-photos/:id/view-url` — authorized short-lived view;
- admin list/review/view endpoints.

Tasks:

- [ ] Derive account/student ownership from the authenticated session and eligible enrollment; never accept arbitrary user ID, bucket, or object key. **[NOT STARTED]**
- [ ] Rate-limit by account and IP, restrict concurrent active uploads, and make authorization/completion idempotent.
- [ ] Validate declared filename extension, MIME, and size before issuing the five-minute URL.
- [ ] Generate opaque UUID keys and persist authorization before returning the signed URL.
- [ ] On completion, use S3 HEAD/GET to verify existence, actual size, checksum where available, and authorized key. Never trust browser success.

### 6.6 Secure image processing

- [ ] Stream with strict byte/time/resource limits; reject zero-byte, oversized, corrupt, malformed, decompression-bomb, polyglot, SVG/PDF/executable, excessive-pixel, extreme-axis, and unsupported input. **[NOT STARTED]**
- [ ] Verify magic bytes and perform a full decoder pass; do not trust extension or browser MIME.
- [ ] Normalize EXIF orientation, convert to sRGB, resize/crop to approved 3:4 card ratio, strip all EXIF/GPS/device metadata, and encode canonical 600 × 800 JPEG.
- [ ] Re-validate the encoded derivative, calculate checksum/size/dimensions, store it privately, and move status atomically to `PENDING_REVIEW`.
- [ ] Delete/quarantine invalid uploads and do not retain raw originals longer than the documented operational need.
- [ ] Bound worker retries and make processing idempotent so the same upload cannot create multiple active derivatives.

### 6.7 Admin review and card usage

Primary UI suggestion:

- `apps/web/src/app/admin/student-photos/page.tsx`
- `apps/web/src/features/admin-student-photos/`

Tasks:

- [ ] Allow every authenticated active admin to see the shared pending-review queue. **[NOT STARTED]**
- [ ] Show only the canonical image through a short-lived authorized URL plus the minimum student identity context, upload time, previous approved photo, and card-layout preview.
- [ ] Add approve/reject actions with standard Persian rejection reasons and optional safe detail.
- [ ] Audit reviewer, decision, timestamp, reason, photo version, and request IP without logging signed URLs/image bytes.
- [ ] Notify the owning student account in-app and by safe generic SMS when approved or rejected; rejection reason detail stays in the panel.
- [ ] Ensure only the current approved canonical image can be used by card generation/download.

### 6.8 Cleanup, privacy, and verification

- [ ] Add cleanup for abandoned authorizations/uploads after approximately 24 hours, failed processing, rejected originals after retention, replaced/superseded photos, archived students, and approved deletion requests. **[NOT STARTED]**
- [ ] Make deletion cover object versions when bucket versioning is enabled and record an auditable tombstone/result.
- [ ] Test authentication, cross-student IDOR, admin authorization, signed URL expiry/key tampering, exact CORS origin, and anonymous bucket denial.
- [ ] Test 24.9 MB valid, over-25 MB declared/actual, zero-byte, MIME/extension mismatch, corrupt bytes, SVG/PDF renamed as image, huge pixel count, extreme aspect, and valid JPEG/PNG.
- [ ] Verify output is exactly 600 × 800 JPEG, visually acceptable, sRGB, and contains no EXIF/GPS.
- [ ] Test replacement races, stale approval, processing retries, rollback/orphan cleanup, archived student behavior, and card generator's approved-only invariant.
- [ ] Test keyboard/mobile upload, progress, recovery, Persian errors, privacy notice, preview cleanup, and screen-reader announcements.
- [ ] Run staging verification against the real private Arvan bucket before marking deployment verified. **[BLOCKED — USER/ARVAN CONFIGURATION]**

## 7. Phase E — Admin bulk SMS section

The section already exists at `/admin/notifications/broadcasts` with API module `apps/api/src/modules/broadcasts/`. Do not build a duplicate.

Required changes and verification:

- [ ] Remove `SuperAdminGuard` from `BroadcastsController`; keep authenticated `ADMIN` authorization. **[NOT STARTED]**
- [ ] Keep the different-admin approval rule: the creator cannot approve their own campaign, but either person may be any active admin.
- [ ] Ensure the navigation label `ارسال گروهی پیامک` remains visible to all active admins.
- [ ] Confirm campaign fields: name, Persian SMS, optional in-app content, active-user audience, schedule/expiry, recipient estimate, Unicode segment count, estimated cost, and feature flag.
- [ ] Preserve optional/marketing consent recheck, normalized-phone deduplication, approved test-number restriction, immutable approval snapshot, skip-locked batches, idempotency, pause/resume/cancel, recipient/spend caps, and aggregate reports without phone lists.
- [ ] Add/retain tests for ordinary admin access, student denial, dual approval, scheduling in Tehran timezone, consent changes before dispatch, partial failures, retry classification, cost cap, pause/cancel, and exactly-once recipient delivery.
- [ ] Production sending remains disabled until Kavenegar credentials, sender/template requirements, price-per-segment, spend cap, and approved test numbers are configured. **[BLOCKED — USER INPUT]**

## 8. Inputs and actions required from the user

### Required for Kavenegar production

- [ ] Provide `KAVEHNEGAR_API_KEY` through deployment secret management, not chat or Git if avoidable. **[BLOCKED — USER INPUT]**
- [ ] Create/approve the Kavenegar VerifyLookup OTP template and provide its exact name.
- [ ] Confirm sender line/default sender availability.
- [ ] Provide current per-segment price, campaign maximum spend, and approved test phone numbers.
- [ ] Approve the notification-consent/legal text and confirm OTP/service-message consent policy.
- [ ] Choose who receives operational alerts and through which monitoring system.

### Required for ArvanCloud

- [ ] Activate Object Storage and provide endpoint, region, bucket name, and narrowly scoped application credentials through deployment secrets. **[BLOCKED — USER INPUT]**
- [ ] Provide exact production, staging, and local origins for CORS.
- [ ] Confirm/configure private access, lifecycle, versioning, and optional antivirus availability.
- [ ] Approve the final Persian privacy notice and retention/deletion policy.
- [ ] Provide the physical student-card template or exact image area for final crop-quality review.

### Required later for videos

- [ ] Provide tutorial video and advertisement video. **[BLOCKED — USER INPUT]**
- [ ] For each: poster, Persian captions/transcript, duration, publishing rights, eligible pages, hosting preference/origin, and campaign/frequency/autoplay rules.

### Required later for payment gateway

- [ ] Select the gateway and provide official documentation, sandbox/merchant credentials, allowed callback URLs/IPs, and settlement support. **[BLOCKED — USER INPUT]**
- [ ] Confirm rial/toman units and callback, verification, expiry, duplicate-payment, reconciliation, refund, and support policies.

### External approvals and deployment evidence

- [ ] Persian-language review; product/legal/privacy/security approval; staging migration with production-like sanitized data; deployment redirect/cache checks; production monitoring/runbooks. **[BLOCKED — EXTERNAL VERIFICATION]**

## 9. Source-checklist cleanup procedure

This cleanup happens after implementation and verification, not before.

- [ ] Re-audit `modifications.md` and `more-features.md` against code, migrations, tests, documentation, and current Git commits. **[NOT STARTED]**
- [ ] Remove every individual **FINISHED · VERIFIED** item from its source file after confirming it is represented by code/history and does not contain a still-needed operational instruction.
- [ ] Keep **FINISHED · NOT VERIFIED**, **NOT FINISHED**, blocked, production, legal, and external-verification items, transferring any missing detail into this specification before removing them from the old file.
- [ ] Recalculate file-level counts/status after each cleanup.
- [ ] Delete `modifications.md` only when no unfinished/unverified/blocked content remains and all continuing operational knowledge has a permanent home in documentation or this specification.
- [ ] Delete `more-features.md` only under the same condition. Videos, gateway, deployment checks, approvals, or credentials still outstanding mean it must not yet be deleted unless every outstanding item has first been preserved here.
- [ ] Before deleting either file, inspect `rg` references and update repository documentation links.
- [ ] Commit checklist pruning separately from functional code so the historical change is reviewable.

## 10. Recommended execution order and commit boundaries

1. Notification schema/catalog cleanup and migration.
2. Student notification API/UI and shared admin operational view.
3. SMS metrics, alerts, runbooks, and OTP review.
4. Remove super-admin requirements and complete feedback verification.
5. Remove super-admin requirement and reverify the existing broadcast section.
6. Arvan configuration/schema/upload authorization.
7. Enrollment photo UI/direct upload.
8. Image processing/cleanup worker.
9. Admin photo review/card integration and notification events.
10. Full API/web tests, typecheck, lint, build, migration validation, mobile/accessibility/security checks.
11. Prune completed items from the two source checklists; delete a source file only when its remaining scope is empty.

Suggested commits:

- `refactor(notifications): separate read and delivery state`
- `feat(notifications): add typed catalog and paginated views`
- `feat(operations): add sms metrics and alerts`
- `test(feedback): cover authorization and concurrency`
- `refactor(authz): use admin role for panel operations`
- `feat(media): add arvan student photo upload pipeline`
- `feat(web): add enrollment photo and admin review flows`
- `docs(tasks): prune completed implementation checklists`

## 11. Final acceptance criteria

- [ ] Only `ADMIN` and student/guardian panel audiences exist for this phase; no in-scope operation requires `isSuperAdmin`. **[NOT STARTED]**
- [ ] Every retained user notification is cataloged, appears in the authenticated panel, and produces an eligible safe SMS according to purpose/consent.
- [ ] Admin operational notifications are shared; no per-admin inbox/read state is created.
- [ ] Kavenegar failures are observable through safe metrics/alerts without exposing secrets or personal data.
- [ ] OTP remains two-minute, single-use, rate-limited, enumeration-safe, and production-configured through Kavenegar VerifyLookup.
- [ ] Feedback authorization, XSS, pagination, concurrency, exactly-once notification, mobile, and accessibility verification passes.
- [ ] Every active admin can use the existing bulk SMS section, with dual approval and cost/consent safeguards.
- [ ] Enrollment step one supports secure direct Arvan photo upload; only validated, reviewed, approved 600 × 800 canonical images can be used for cards.
- [ ] Full API/web tests, typecheck, lint, build, migration verification, security tests, and staging checks pass.
- [ ] Remaining user/external inputs are documented and no completed/verified item remains in the two source task files.

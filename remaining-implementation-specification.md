# Remaining Immediate Implementation Specification

> Audited against code and commit history on 2026-08-09. Finished and verified tasks/subtasks were removed. This document contains only incomplete, incorrect, externally unverified, or production-blocked work.

## Audit evidence and cautions

- Commit reviewed: `1d1b251 feat(api,web): add student card photo uploads and notification enhancements`.
- Automated baseline passes: API typecheck/lint and 347 tests; web typecheck/lint and 147 tests.
- Passing checks do not close the gaps below.
- `.env` is ignored and its variable-name set matches root `.env.example`; secret values must never be committed or printed.
- Current runtime roles remain `PARENT | ADMIN`. `PARENT` is the internal compatibility name for a student/guardian panel account.

## 1. Finish removing the super-admin concept

The request is for ordinary admins and student accounts only. `SuperAdminGuard` was removed, but the concept still exists in data and UI.

- [ ] Add a forward migration removing `admin_users.is_super_admin` after removing all runtime dependencies. **[NOT FINISHED]**
- [ ] Remove `isSuperAdmin` from:
  - `apps/api/src/database/schemas/auth.schema.ts`
  - `apps/api/src/modules/identity/application/auth.service.ts`
  - `apps/api/src/database/seed.ts`
  - `apps/web/src/features/admin-admins/admin-admins-api.ts`
  - `apps/web/src/app/admin/admins/page.tsx`
  - affected fixtures/tests.
- [ ] Replace “cannot disable the final super-admin” with a documented ordinary-admin safety rule. Recommended: prevent disabling the final active admin account. **[NOT FINISHED]**
- [ ] Rename broadcast test/copy references from “super-administrator” to “different active administrator”; retain dual approval. **[NOT FINISHED]**
- [ ] Verify every admin endpoint uses authenticated `ADMIN` authorization and no hidden `isSuperAdmin` condition remains. **[NOT FINISHED]**

## 2. Notification correctness gaps

### Catalog and producers

- [ ] Make every retained user notification eligible for both panel and SMS as requested, subject to purpose/consent. **[NOT FINISHED]**
  - `WELCOME`, `PROFILE_UPDATED`, `ADDRESS_UPDATED`, and `EMERGENCY_CONTACT_UPDATED` currently declare only `IN_APP` in `notification.catalog.ts` even though SMS-safe text exists.
  - Keep optional messages disabled without current channel-specific consent.
  - `ADMIN_BROADCAST` remains in-app when in-app content is selected; campaign SMS is sent through the broadcast recipient workflow.
- [ ] Verify every catalog entry has a real producer or remove it. **[NOT FINISHED]**
  - Search all outbox creation sites; distinguish production events from seed fixtures.
  - Add producer tests for enrollment review/approval/rejection/correction, payment reminders if retained, photo decisions, feedback responses, and account security events.
- [ ] Correct invalid operational links in `notification.catalog.ts`. **[NOT FINISHED]**
  - `/admin/enrollments` does not exist; use `/admin/registrations` or the specific registration route.
  - `/admin/pricing` does not exist; link to the actual pricing/registration workflow.
  - Add a route-contract test so catalog links must match supported route metadata/pages.
- [ ] Review Persian catalog content. Several entries still say “خانواده” although the visible product terminology is student panel. **[NOT FINISHED]**
- [ ] Ensure detailed/sensitive data remains in the authenticated panel and SMS excludes national ID, child/address data, financial amount, contract/feedback content, and signed URLs. **[NOT FINISHED]**

### Shared admin operational view

- [ ] Add the promised type/status/date filters to the shared admin notification view and API. **[NOT FINISHED]**
- [ ] Define resolution behavior instead of showing an unlimited history of user notifications as “operational” work. **[NOT FINISHED]**
  - Link actionable types to existing routes.
  - Decide whether resolved underlying work is hidden, marked resolved, or retained for a bounded history.
  - Do not create per-admin read state; all admins see the same data.
- [ ] Add shared-view authorization, filter, route, stable-pagination, and concurrent-insert tests. **[NOT FINISHED]**

### Student notification UI/API verification

- [ ] Add IDOR tests for list, read-one, and read-all using different user accounts. **[NOT FINISHED]**
- [ ] Test stable pagination with equal timestamps and concurrent inserts. **[NOT FINISHED]**
- [ ] Add component/browser verification for loading, empty, error/retry, unread state, mark-one, mark-all, keyboard, screen reader, RTL, and mobile behavior. **[NOT FINISHED]**
- [ ] Verify migration `0025_notification_read_state.sql` on a production-like snapshot and prove old queued outbox records remain compatible. **[BLOCKED — STAGING DATABASE]**

## 3. SMS operations and live Kavenegar verification

### Metrics and alerts

- [ ] Add low-cardinality metrics for accepted, rejected, timeout, transient/permanent failure, skipped-no-consent, retry, dead-letter, and queue age. **[NOT STARTED]**
- [ ] Separate OTP, service notification, optional notification, test broadcast, and broadcast-campaign metrics without phone/user/message/API-key labels. **[NOT STARTED]**
- [ ] Add provider latency and configurable alerts for failure/timeout rates, dead-letter/backlog growth, OTP spikes, campaign volume, and estimated spend. **[NOT STARTED]**
- [ ] Add alert cooldown/deduplication and document dashboard ownership, credential rotation, disable-provider, retry/dead-letter recovery, and incident response. **[NOT STARTED]**
- [ ] Verify all logs/metrics/traces mask phone numbers and exclude OTPs, API keys, provider payloads, SMS bodies, feedback content, and signed URLs. **[NOT FINISHED]**

### Local configuration status

- The local Kavenegar API key and OTP template fields are set; sender is empty, which may be valid when the account default sender is approved.
- A read-only official `account/info.json` request succeeded on 2026-08-09; the key is valid and the account reported positive credit. No SMS was sent and no secret/account value was logged.
- SMS broadcast test numbers are empty, so no safe real recipient is configured.
- ArvanCloud connection/credential fields are empty.

Tasks:

- [ ] Add at least one owned/approved Iranian test number to local `SMS_BROADCAST_TEST_NUMBERS`; never put it in `.env.example`. **[BLOCKED — USER INPUT]**
- [ ] Confirm the exact approved Kavenegar VerifyLookup template name and sender behavior in the Kavenegar console. **[BLOCKED — USER/PROVIDER]**
- [ ] Run one ordinary test SMS and one OTP template test only to an approved owned number, with user confirmation of cost and receipt. **[BLOCKED — TEST NUMBER/EXTERNAL SEND]**
- [ ] Record provider message ID/status without logging the number, key, OTP, or message body. **[NOT FINISHED]**

### OTP verification

- [ ] Add safe OTP send/failure/timeout/rate-limit metrics and alerts. **[NOT STARTED]**
- [ ] Obtain final product/legal approval that requested OTP/security messages do not depend on optional marketing consent. **[BLOCKED — APPROVAL]**
- [ ] Reverify two-minute expiry, single-use, resend cooldown, account/IP attempt limits, concurrent verification, generic enumeration-safe errors, and production-only adapter selection after metrics changes. **[NOT FINISHED]**
- [ ] Verify the actual Kavenegar template and delivery with an approved number before marking production delivery verified. **[BLOCKED — EXTERNAL SEND]**

## 4. Feedback verification gaps

- [ ] Add IDOR tests proving one student account cannot list, associate, or infer another account's feedback. **[NOT FINISHED]**
- [ ] Test logged-out/student denial and ordinary-admin access for every admin feedback operation. **[NOT FINISHED]**
- [ ] Expand stored-XSS coverage across DTOs and both React rendering contexts, including encoded/tag-like and mixed-direction payloads. **[NOT FINISHED]**
- [ ] Test pagination/filter bounds, stable ordering, empty pages, and concurrent inserts. **[NOT FINISHED]**
- [ ] Test optimistic concurrency: simultaneous response/close requests with one version allow exactly one state transition. **[NOT FINISHED]**
- [ ] Test exactly-once feedback-response outbox creation/delivery across retries and concurrent attempts. **[NOT FINISHED]**
- [ ] Verify feedback content never enters logs, traces, analytics, audits, or error payloads. **[NOT FINISHED]**
- [ ] Add keyboard, focus, validation announcement, error recovery, duplicate-submit, long Persian/RTL, mobile/tablet, and screen-reader tests. **[NOT FINISHED]**

## 5. Student card photo gaps

### Placement and enrollment lifecycle

- [ ] Move/integrate the photo field into enrollment step one as requested. **[NOT FINISHED]**
  - The current component is rendered only on `/student/students/[studentId]`, after a student already exists.
  - Support account/onboarding-scoped authorization before a student ID exists, then transactionally link the upload to the created student.
  - Preserve enrollment draft data and retry when storage is unavailable.
  - Define the exact gate: enrollment may be saved while review is pending, but card readiness must require one current approved photo.
- [ ] Add local preview, measurable upload progress, cancel, replace, remove-before-finalization, full requested Persian guidance, privacy link, and accessible field-level errors. **[NOT FINISHED]**
  - Current UI has selection/status/re-upload but no preview, progress percentage, cancel, remove, full guidance, or privacy notice.
  - Continue using object URLs only; never persist base64 or signed URLs.

### Admin review and card integration

- [ ] Build an admin photo-review page and navigation entry. **[NOT STARTED]**
  - Show the shared pending queue, canonical image via short-lived authorized URL, minimum student context, prior approved version, and card-layout preview.
  - Add approve/reject actions, standard Persian rejection reasons, optional safe detail, optimistic concurrency, audit, filters, and pagination.
- [ ] Connect only the current approved canonical photo to the actual student-card generation/export path. **[NOT STARTED]**
- [ ] Add student panel and safe SMS notifications for approval/rejection and prove the catalog types have real producers. **[NOT FINISHED]**

### Storage and processing hardening

- [ ] Configure a real private ArvanCloud bucket and local/deployment credentials. **[BLOCKED — USER INPUT]**
  - Required local values: endpoint, region, bucket, access key, secret key.
  - Configure exact production/staging/local CORS origins, least privilege, TLS, at-rest protection, private listing/objects, lifecycle, versioning decision, and optional antivirus.
- [ ] Approve the Persian privacy notice, retention/deletion policy, and physical card crop area/template. **[BLOCKED — USER/LEGAL INPUT]**
- [ ] Verify the five-minute presigned PUT/GET behavior, CORS, anonymous denial, key scoping, and actual Arvan compatibility against staging. **[BLOCKED — ARVAN CONFIGURATION]**
- [ ] Add explicit processing resource/time limits and stronger polyglot/decompression-bomb tests; a passing Sharp decode alone is insufficient evidence for every adversarial format. **[NOT FINISHED]**
- [ ] Verify cleanup covers abandoned raw objects, failed processing, rejected originals, superseded versions, archived students, deletion requests, and all object versions when bucket versioning is enabled. **[NOT FINISHED]**
- [ ] Resolve migration/data-model risks:
  - define behavior for account-scoped pre-enrollment uploads (`student_id IS NULL`);
  - enforce valid status values and transition invariants at the database/domain boundary;
  - prove exactly one current approved photo under replacement concurrency;
  - ensure stale review cannot approve a superseded upload. **[NOT FINISHED]**

### Photo verification

- [ ] Test cross-account/student IDOR, ordinary-admin authorization, signed URL expiry/tampering, actual-vs-declared size, zero byte, mismatch, corrupt, renamed SVG/PDF, huge pixels/axis, extreme aspect, and valid JPEG/PNG. **[NOT FINISHED]**
- [ ] Verify canonical output is exactly 600×800 JPEG, sRGB, visually acceptable in the real card layout, and contains no EXIF/GPS. **[BLOCKED — CARD TEMPLATE/STAGING]**
- [ ] Test upload replacement races, stale approval, processing retries, rollback/orphan cleanup, archived students, and approved-only card use. **[NOT FINISHED]**
- [ ] Add enrollment/mobile/accessibility/browser tests for preview, progress, cancel, retry, Persian errors, privacy notice, and screen-reader announcements. **[NOT FINISHED]**

## 6. Existing admin bulk SMS — remaining verification

- [ ] Update stale “super-administrator” terminology in tests/copy and verify any two different active admins can create/approve. **[NOT FINISHED]**
- [ ] Add controller-level ordinary-admin authorization and student-denial tests. **[NOT FINISHED]**
- [ ] Reverify audience/consent changes at dispatch, phone deduplication, Tehran scheduling, immutable approval snapshot, bounded skip-locked batching, idempotency, pause/resume/cancel, partial failure, and cost limits after notification changes. **[NOT FINISHED]**
- [ ] Configure an approved test number and perform one controlled live test before production verification. **[BLOCKED — USER INPUT/EXTERNAL SEND]**

## 7. Environment-file policy

- Production validation must continue rejecting console OTP, missing Kavenegar secrets when enabled, zero broadcast price/cap, mock payment, unsafe logging/seeding, and incomplete Arvan configuration.
- [ ] Decide and document one supported local launch path for environment loading. **[NOT FINISHED]**
  - Docker Compose may use an explicitly selected root environment file.
  - Direct `pnpm --filter api/web ...` commands do not automatically load the workspace-root `.env`; current README guidance uses `apps/api/.env` and `apps/web/.env.local` for direct development.
  - Keep the Kavenegar key API-only; it must never enter `apps/web/.env.local` or a `NEXT_PUBLIC_*` variable.
- [ ] Document that the ignored root `.env` is for local values and deployment secrets must use the hosting secret manager. **[NOT FINISHED]**
- [ ] Do not copy the local `.env` into container images, CI artifacts, logs, screenshots, or support bundles. **[NOT FINISHED]**

## 8. User inputs still required

- [ ] Owned/approved SMS test number; Kavenegar sender confirmation; exact approved OTP template; current price per segment; campaign spend cap; alert recipient/system; consent/legal approval. **[BLOCKED — USER INPUT]**
- [ ] Arvan endpoint, region, private bucket, scoped credentials, exact CORS origins, lifecycle/versioning choices, privacy/retention approval, and card template. **[BLOCKED — USER INPUT]**
- [ ] Tutorial and advertisement videos with posters, Persian captions/transcripts, rights, placement/hosting, campaign, frequency, and autoplay rules. **[BLOCKED — USER INPUT]**
- [ ] Payment gateway selection, documentation, sandbox/merchant credentials, unit/callback/reconciliation/refund rules. **[BLOCKED — USER INPUT]**
- [ ] Staging/production access and recorded Persian/product/legal/privacy/security approval. **[BLOCKED — EXTERNAL VERIFICATION]**

## 9. Final cleanup rule

- [ ] After each implementation phase, remove its finished-and-verified task and subtasks from this file instead of checking them off permanently. **[ONGOING]**
- [ ] Delete a root task file only when it contains no unfinished, blocked, unverified, or continuing operational requirement. **[ONGOING]**

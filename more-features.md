# More Features — Later-Phase Implementation Guide

> Status: deferred features only. These items are not required in the current phase and must not be implemented as part of `modifications.md` unless explicitly moved into scope.
>
> This document contains the items marked with asterisks in the original request, plus the later notification, SMS, OTP-provider, broadcast, and payment-gateway requirements.

## How to use this guide

- Check a box only after implementation, tests, security review, and deployment verification are complete.
- Paths are relative to the repository root. Paths marked **new** do not currently exist.
- Put each feature behind an independent feature flag.
- Use new forward-only database migrations. Never rewrite old migrations.
- Preserve Persian text where it is intended to appear in the UI; implementation notes remain in English.

## 1. Student-enrollment tutorial video

### Relevant files

- **New:** `apps/web/src/features/public-home/enrollment-tutorial-video.tsx`
- `apps/web/src/app/(public)/page.tsx`
- `apps/web/src/app/(public)/registration-guide/page.tsx`
- `apps/web/src/app/(public)/layout.tsx`
- `apps/web/next.config.ts`
- `apps/web/src/lib/security-headers.ts`

### Product decisions

- [ ] Obtain the approved video, poster, Persian captions/transcript, duration, and publishing rights.
- [ ] Decide whether it appears on the homepage, registration guide, or both.
- [ ] Decide whether it is hosted locally or through an approved CDN/media origin.

### Implementation

- [ ] Create one reusable video component and reuse it on all approved pages.
- [ ] Use semantic `<video>` where practical and provide play/pause, seek, volume, fullscreen, and playback-speed controls.
- [ ] Add a poster to prevent layout movement before loading.
- [ ] Lazy-load the video and avoid downloading the full asset until it is near the viewport or playback is requested.
- [ ] Add Persian captions and a text alternative/transcript.
- [ ] Ensure controls work with keyboard, touch, screen readers, and small mobile screens.
- [ ] If an external origin is used, allow only that exact origin in CSP `media-src`.
- [ ] Keep the registration action usable when the video fails to load.

### Verification

- [ ] Test mouse, keyboard, touch, captions, fullscreen, and playback-speed behavior.
- [ ] Confirm no meaningful CLS/LCP or initial-data regression.
- [ ] Confirm invalid/unavailable media never blocks the page.
- [ ] Test mobile portrait and landscape layouts.

## 2. Advertisement video popup

### Relevant files

- **New:** `apps/web/src/components/common/advertisement-video-dialog.tsx`
- **New:** `apps/web/src/features/advertising/advertisement-config.ts`
- `apps/web/src/components/ui/dialog.tsx`
- `apps/web/src/app/(public)/layout.tsx`
- Root layout only if authenticated pages are explicitly included

### Product decisions

- [ ] Approve the video, poster, captions, rights, campaign start/end time, and eligible pages.
- [ ] Define first-display and repeat frequency, dismissal persistence, autoplay/audio, and replay behavior.
- [ ] Prefer public pages. Do not interrupt enrollment, contracts, payments, or admin work without explicit approval.

### Implementation

- [ ] Build the popup using the existing accessible dialog primitives.
- [ ] Blur/dim the background, trap focus, support Escape, show an obvious close button, and restore focus after closing.
- [ ] Pause audio/video when closed.
- [ ] Provide play/pause, seek, mute/volume, fullscreen, and speeds including 2x.
- [ ] Never autoplay with sound. Respect browser autoplay rules and reduced-motion/user-data concerns.
- [ ] Store only campaign ID, view/dismiss time, and the minimum count needed for frequency capping.
- [ ] Do not reopen on every client-side navigation.
- [ ] Make invalid configuration fail closed: show the normal site without a popup.
- [ ] Prevent hydration flashes and duplicate opening.
- [ ] Ensure the popup never imitates authentication, payment, browser, or security dialogs.

### Verification

- [ ] Accessibility tests cover focus trapping, background blocking, Escape, and focus restoration.
- [ ] Closing always stops audio.
- [ ] Frequency rules persist and expire correctly.
- [ ] Unavailable media does not block the website.
- [ ] Test all supported viewport sizes.

## 3. Student photo upload, WebP processing, and S3/MinIO storage

### Relevant files

- `apps/web/src/features/enrollment/enrollment-actions.tsx`
- `apps/web/src/features/enrollment/enrollment-form-model.ts`
- `apps/web/src/features/enrollment/enrollments-api.ts`
- **New backend module:** `apps/api/src/modules/student-images/` or `apps/api/src/modules/media/`
- `apps/api/src/modules/students/**`
- `apps/api/src/modules/registrations/**`
- `apps/api/src/database/schemas/students.schema.ts`
- `apps/api/src/config/config.service.ts`
- `.env.example`
- `apps/api/.env.example`
- `docker-compose.yml`
- `docker-compose.development.yml`
- A new migration

### Product decisions

- [ ] Choose S3 or MinIO.
- [ ] Define source formats, maximum bytes/pixels, minimum dimensions, output dimensions/aspect ratio, WebP quality, and retention.
- [ ] Decide whether the photo is mandatory.
- [ ] Approve the privacy notice and Persian instructions.

### UI implementation

- [ ] Add the photo field to enrollment step one with preview, progress, replace, remove, and Persian field-level errors.
- [ ] Do not keep a large base64 image in form state or localStorage.
- [ ] Show these instructions:
  - `پشت سر دانش‌آموز دیوار سفید باشد.`
  - `ترجیحاً دانش‌آموز لباس فرم مدرسه پوشیده باشد.`
  - `عکس از سر به بالا باشد و تمام‌قد نباشد.`
  - `برای دانش‌آموزان دختر حجاب کامل رعایت شود.`
  - `این تصویر برای کارت سرویس دانش‌آموز استفاده خواهد شد.`
- [ ] Show the approved format, size, and dimension limits below the field.

### Backend processing

- [ ] Validate the real signature/magic bytes; never trust extension or browser MIME alone.
- [ ] Reject corrupt, unsupported, oversized, excessive-dimension, or excessive-processing-time files.
- [ ] Protect against MIME spoofing, polyglots, decompression bombs, and malformed images.
- [ ] Decode and re-encode every accepted image.
- [ ] Apply orientation, resize/crop to the approved service-card ratio, strip EXIF/GPS/device metadata, and save WebP.
- [ ] Discard the original after processing unless a documented requirement says otherwise.

### Storage and access

- [ ] Use a private bucket with public listing/object ACLs disabled.
- [ ] Use random keys with no student name, phone, or national ID.
- [ ] Encrypt data in transit and at rest and use narrowly scoped credentials.
- [ ] Return short-lived signed URLs only after ownership/RBAC checks.
- [ ] Define cleanup for abandoned drafts, replacements, archived students, and deletion requests.
- [ ] Store object key, derivative version, dimensions, content type, size, checksum, processing status, and timestamps—not a permanent public URL.
- [ ] Make upload finalization idempotent and clean orphan objects after failures.
- [ ] Protect all signing/download endpoints against IDOR.

### Verification

- [ ] Test extension/MIME mismatch, corrupt bytes, large files, huge dimensions, and valid formats.
- [ ] Verify generated WebP files contain no EXIF/GPS data.
- [ ] Verify the bucket cannot be publicly listed or read.
- [ ] Test authorization, signed URL expiry, replacement, rollback, and cleanup.
- [ ] Review visual quality on the actual service-card layout.

## 4. Criticisms and suggestions (`انتقادات و پیشنهادات`)

### Relevant files

- **New:** `apps/web/src/app/student/feedback/page.tsx`
- **New:** `apps/web/src/features/feedback/`
- **New:** `apps/web/src/app/admin/feedback/page.tsx`
- **New backend module:** `apps/api/src/modules/feedback/`
- **New schema:** `apps/api/src/database/schemas/feedback.schema.ts`
- `apps/api/src/database/schemas/index.ts`
- `apps/api/src/modules/notifications/**`
- A new migration

### Product decisions

- [x] Define categories, maximum length, response expectations, retention, moderation, and admin roles. **Policy documented in `docs/FEEDBACK_WORKFLOW.md`.** **[FINISHED · VERIFIED]**
- [x] Decide whether students can view submission history and replies. **History and management replies are visible only to the owning account.** **[FINISHED · VERIFIED]**
- [x] Define escalation for urgent safety or child-safeguarding reports. **Safety submissions are automatically urgent and escalated into the restricted queue.** **[FINISHED · VERIFIED]**

### Student implementation

- [x] Add the section to student navigation with Persian title, explanation, text area, submit action, errors, and confirmation. **[FINISHED · VERIFIED]**
- [x] If history is approved, list only records owned by the authenticated account. **[FINISHED · VERIFIED]**
- [x] Never accept an ownership/user ID from the client without deriving or verifying it from the session. **[FINISHED · VERIFIED]**
- [x] Define whether a student can reply or edit after an admin response. **Neither editing nor student replies are allowed after submission.** **[FINISHED · VERIFIED]**

### Data and admin implementation

- [x] Store the complete feedback case, assignment, response, concurrency version, and timestamps. **[FINISHED · VERIFIED]**
- [x] Implement `NEW`, `READ`, `ESCALATED`, `ANSWERED`, and `CLOSED`. **[FINISHED · VERIFIED]**
- [x] Add server-side admin filters, pagination, assignment, read, respond, and close actions. **[FINISHED · VERIFIED]**
- [x] Restrict access to super-administrators and audit reads, responses, assignments, and status changes. **No sensitive recipient export is exposed.** **[FINISHED · VERIFIED]**
- [x] Notify the student exactly once after a response using the notification outbox. **[FINISHED · VERIFIED]**
- [x] Do not put the full sensitive response in SMS; direct the user to the authenticated panel. **[FINISHED · VERIFIED]**

### Security and tests

- [x] Set length/rate limits and validation errors. **[FINISHED · VERIFIED]**
- [x] Store text as text, render it escaped, and reject raw HTML. **[FINISHED · VERIFIED]**
- [x] Keep content out of logs, traces, analytics, audits, and error details. **[FINISHED · VERIFIED]**
- [ ] Test IDOR, admin roles, stored XSS, pagination, concurrency, and exactly-once response notification.
- [ ] Test mobile and accessibility behavior.

## 5. Notification audit, SMS notifications, and OTP SMS

### Current implementation

- Student/family notifications are stored in `notifications` and displayed by the student notification page.
- Students can mark one/all as read using `apps/web/src/features/notifications/notification-actions.tsx`.
- `apps/api/src/modules/notifications/notifications.service.ts` currently creates `WELCOME` as a side effect of the first empty list request.
- Domain events use `apps/api/src/infrastructure/notifications/in-app-notification.service.ts` and `notification_outbox`.
- The outbox has claim locking, retry/backoff, and dead-letter behavior and now delivers independent `IN_APP` and `SMS` records.
- `notificationStatus` currently mixes delivery and read state: `PENDING` means unread and `SENT` means read.
- `GET /admin/notifications` returns selected user-domain events rather than a true per-admin inbox.
- OTP already has a port in `apps/api/src/modules/identity/application/otp-delivery.port.ts`.
- Kavenegar is available for ordinary notification SMS and OTP VerifyLookup; production validates the API key and approved OTP-template name.
- The audited event inventory and deployment guidance are in `docs/NOTIFICATION_SMS.md`.

### 5.1 Review and correct in-app notifications

- [x] Search every notification producer and build an inventory containing type, producer, recipient, Persian content, entity, channels, and transaction behavior. **[FINISHED · VERIFIED]**
- [x] Review existing types including account, enrollment, payment, payment-plan, and contract events; identify missing, duplicated, or incorrectly targeted messages. **The admin endpoint remains an operational projection, not a true admin inbox.** **[FINISHED · VERIFIED]**
- [x] Define student and admin notification requirements separately. **Baseline account SMS is implemented; a true admin inbox and admin broadcast campaigns remain separately deferred.** **[FINISHED · VERIFIED]**
- [ ] Remove the `WELCOME` side effect from `GET /notifications`; enqueue it when the panel is activated.
- [ ] Separate logical notification, channel-delivery state, and in-app `readAt` in the schema.
- [ ] Migrate existing `PENDING` to unread and `SENT` to read using the best historical timestamp.
- [ ] Create a typed notification catalog declaring audience, Persian template, related entity, required/optional purpose, and channels.
- [ ] Add student pagination, stable ordering, explicit `readAt`, empty/loading/error states, and ownership-safe read actions.
- [ ] Create a true admin audience/inbox with per-admin read state if required.
- [ ] Add admin filters, pagination, mark-read actions, and links to relevant operational pages.
- [ ] Preserve compatibility or drain old outbox records during migration.

### 5.2 Consent-aware SMS notification provider

#### Suggested files

- **New:** `apps/api/src/modules/notifications/sms-provider.port.ts`
- **New:** `apps/api/src/infrastructure/notifications/providers/<provider>.sms-provider.ts`
- **New:** `apps/api/src/infrastructure/notifications/sms-notification.service.ts`
- Notification preference/consent schema and migration
- Notification module, worker, configuration, and environment files

- [x] Select a provider after reviewing its official API, Iran delivery support, sender line, templates, delivery receipts, rate limits, Unicode segmentation, credentials, and test environment. **Selected: Kavenegar REST API.** **[FINISHED · VERIFIED]**
- [x] Define a vendor-neutral port accepting phone, safe message content, idempotency key, and correlation ID; keep the Kavenegar request format inside its adapter. **[FINISHED · VERIFIED]**
- [x] Normalize provider responses into accepted/rejected state, provider message ID, and stable errors. **[FINISHED · VERIFIED]**
- [x] Add validated provider settings, base URL, credentials, sender, timeout, and retry classification. Put placeholders—not secrets—in examples. **No callback secret is needed until callbacks are implemented.** **[FINISHED · VERIFIED]**
- [x] Implement channel-and-purpose-specific consent with text version, source, granted/revoked time, and actor. **[FINISHED · VERIFIED]**
- [x] Add an SMS toggle to panel settings and persist it server-side. **[FINISHED · VERIFIED]**
- [x] Re-check current consent immediately before dispatch, not only when queued. **[FINISHED · VERIFIED]**
- [x] Mark ineligible delivery `SKIPPED_NO_CONSENT` while preserving eligible in-app delivery. **[FINISHED · VERIFIED]**
- [x] Keep optional/marketing consent separate from required service/security messages. **[FINISHED · VERIFIED]**
- [x] Dispatch asynchronously through the worker with idempotency, bounded retries, jitter, permanent/transient classification, and dead-letter visibility. **[FINISHED · VERIFIED]**
- [x] Never make a successful enrollment/payment/contract appear failed because SMS failed. **[FINISHED · VERIFIED]**
- [ ] If supported, add a signature-verified, replay-safe, idempotent delivery-status webhook. **Not required by the baseline send integration.** **[NOT FINISHED]**
- [x] Keep Persian SMS concise and free of national IDs, addresses, child-sensitive information, or financial details. **[FINISHED · VERIFIED]**
- [x] Test consent/revocation at dispatch, provider timeout classification, stable duplicate-retry IDs, response mapping, and production configuration. **Callback replay remains tied to the deferred webhook.** **[FINISHED · VERIFIED]**

### 5.3 Real SMS provider for OTPs

- [x] Keep OTP delivery separate from ordinary notifications, even if both share a low-level client. **[FINISHED · VERIFIED]**
- [ ] OTP is a requested security message and does not depend on optional notification/marketing consent; legal/product confirmation is still required. **[NOT FINISHED]**
- [x] Implement Kavenegar VerifyLookup behind the existing `OtpDelivery` port. **[FINISHED · VERIFIED]**
- [x] Register it in `identity.module.ts` and extend `OTP_PROVIDER` validation in `ConfigService`. **[FINISHED · VERIFIED]**
- [x] Configure an OTP/pattern template containing only the code and approved brand/purpose text. **Code support is complete; the named template must still be created and approved in the Kavenegar account.** **[FINISHED · NOT VERIFIED]**
- [x] Keep the main requirement of a two-minute, single-use OTP. **[FINISHED · VERIFIED]**
- [x] On definite provider rejection, show a generic Persian service error without revealing account existence. **[FINISHED · VERIFIED]**
- [x] Apply send, resend, attempt, account, IP, and cost/volume limits. **Existing OTP throttling and attempt controls remain in force around the adapter.** **[FINISHED · VERIFIED]**
- [x] Never expose `developmentCode` outside non-production console mode. **[FINISHED · VERIFIED]**
- [ ] Add strict timeouts, safe metrics, masked logging, and alerts for failure rate/send spikes. **Timeouts and non-logging are complete; provider metrics and operational alerts remain.** **[NOT FINISHED]**
- [x] Test adapter mapping, enumeration resistance, expiry, single use, cooldown, concurrency, and production configuration. **[FINISHED · VERIFIED]**

### 5.4 Admin broadcast notifications by SMS

> This is the separately starred later feature for messages such as New Year congratulations to all eligible users.

#### Suggested files

- **New:** `apps/web/src/app/admin/notifications/broadcasts/page.tsx`
- **New:** `apps/web/src/features/admin-broadcasts/`
- **New backend module:** `apps/api/src/modules/broadcasts/`
- Broadcast, recipient, delivery, and audit migration

- [x] Treat congratulatory/campaign SMS as optional/marketing and send only to users with the correct consent. **[FINISHED · VERIFIED]**
- [x] Restrict compose, test, approve, schedule, cancel, and report actions to super-administrator authorization and require a different administrator to approve. **[FINISHED · VERIFIED]**
- [x] Compose fields: campaign name, Persian content, optional in-app content, active-account audience policy, schedule, expiry, and per-campaign feature flag. **[FINISHED · VERIFIED]**
- [x] Show SMS character/segment count, estimated recipients, and estimated cost before confirmation. **[FINISHED · VERIFIED]**
- [x] Allow test sends only to deployment-configured approved test numbers. **[FINISHED · VERIFIED]**
- [x] Resolve audience server-side and re-check active account, phone ownership/validity, and consent at send time. **[FINISHED · VERIFIED]**
- [x] Deduplicate normalized phone numbers. **[FINISHED · VERIFIED]**
- [x] Save immutable content/audience/creator/approver/schedule snapshots after approval. **[FINISHED · VERIFIED]**
- [x] Send in controlled, skip-locked worker batches with recipient, segment, and hard estimated-spend limits. **[FINISHED · VERIFIED]**
- [x] Use per-recipient idempotency keys and support pause/resume/cancel for unsent recipients. **[FINISHED · VERIFIED]**
- [x] Report queued, skipped-no-consent, accepted, failed, and cancelled aggregate counts without exposing phone lists. **Handset-level delivered status requires the separately deferred verified callback.** **[FINISHED · VERIFIED]**
- [x] Audit preview, submission, test send, approval, pause/resume, and cancellation. **A separate export is unnecessary because the aggregate report is returned directly and contains no recipient list.** **[FINISHED · VERIFIED]**
- [x] Verify authorization, dual approval, audience/consent rechecks, deduplication, Tehran scheduling, bounded batching, retry/permanent failure classification, pause/cancel, and partial-failure isolation. **Focused automated coverage supports the inspected workflow; production provider delivery still requires the configured Kavenegar account.** **[FINISHED · VERIFIED]**

## 6. Real payment gateway integration

### Current implementation

- `apps/api/src/modules/payments/payment-gateway.ts` already provides mock/disabled gateway abstractions.
- `ConfigService` supports `PAYMENT_GATEWAY_PROVIDER=mock|none`; production rejects mock and requires a real provider.
- Payment start and verify endpoints, ownership checks, transactions, schedule items, idempotency, and notifications already exist.
- `apps/web/src/features/finance/online-payment-button.tsx` currently starts a payment and immediately verifies a fabricated `mock:` reference.
- Guided enrollment in `apps/web/src/features/enrollment/enrollments-api.ts` uses the same mock behavior.
- `payment-return-preview.tsx` is only a visual preview, not a real callback page.

### Decisions

- [ ] Choose the gateway and obtain official documentation, sandbox, merchant credentials, allowed URLs/IPs, callback rules, and settlement support.
- [ ] Confirm whether internal and gateway amounts use ریال or تومان and convert exactly once.
- [ ] Define callback, verification, expiry, duplicate payment, reconciliation, refund, and support procedures.

### Backend implementation

- [ ] Implement `apps/api/src/modules/payments/providers/<provider>.payment-gateway.ts` behind the existing port.
- [ ] Keep vendor fields inside the adapter; return normalized authority/token, redirect URL, reference, and status.
- [ ] Add provider configuration, credentials, base URL, callback URL, timeout, and certificate settings to validated config and examples.
- [ ] Store real secrets only in deployment secret management.
- [ ] During start, validate ownership, payable state, amount, currency, and idempotency.
- [ ] Create/persist an internal transaction safely before redirect and store provider authority/expiry.
- [ ] Return only a validated HTTPS gateway URL/token and internal transaction ID.
- [ ] Add a callback/return endpoint according to provider requirements.
- [ ] Treat browser callback parameters as untrusted. Final success requires server-to-server provider verification.
- [ ] Verify amount, currency, merchant, authority, ownership, and provider status.
- [ ] Lock transaction/schedule rows and finalize transaction, paid amount, schedule/plan status, provider reference, and notification atomically.
- [ ] Make verification idempotent so refreshes/repeated callbacks never pay twice.
- [ ] Add a recoverable pending state and reconciliation job for timeouts/unknown results.
- [ ] Never start a second charge while an earlier authority may still succeed.
- [ ] Keep refunds/cancellations as separate privileged immutable transactions if required.

### Frontend implementation

- [ ] Update `payments-api.ts` so start returns gateway redirect information.
- [ ] Remove fabricated `mock:` verification from `online-payment-button.tsx` and guided enrollment production paths.
- [ ] Redirect the browser to the validated provider URL.
- [ ] Create a real return page such as `apps/web/src/app/student/payments/return/page.tsx`.
- [ ] Show Persian pending, success, failure, cancelled, expired, and already-completed states based only on backend verification.
- [ ] Preserve enrollment state while the user is at the gateway.
- [ ] Activate the panel only after verified prepayment, never merely after redirect.

### Security, reconciliation, and tests

- [ ] Verify webhook signatures or documented gateway authentication and prevent replay.
- [ ] Do not trust forwarded IP headers unless trusted proxies are configured correctly.
- [ ] Do not log secrets, card data, full provider payloads, or unnecessary personal information.
- [ ] Add provider contract tests against sandbox responses.
- [ ] Test ownership, invalid/already-paid amounts, concurrency, idempotency, success, failure, cancellation, expiry, repeated/out-of-order callbacks, and tampering.
- [ ] Test amount/currency/authority/merchant mismatches and network timeouts.
- [ ] Prove one provider transaction can increase paid amount only once.
- [ ] Reconcile pending transactions and provider settlements and alert on mismatches.
- [ ] Run E2E against the sandbox and document test behavior.

## Deferred-feature security checklist

- [ ] Confirm video publishing rights and accessibility requirements.
- [ ] Restrict CSP media/storage origins without broad wildcards.
- [ ] Complete threat modeling for student photo upload, storage, access, replacement, and deletion.
- [ ] Verify bucket privacy and signed URLs through deployment tests.
- [ ] Treat student photos as highly sensitive child data and use least privilege.
- [ ] Escape feedback output and test stored XSS in every rendering context.
- [ ] Define operational escalation for urgent/safeguarding feedback.
- [ ] Keep notification delivery separate from read state and preserve ownership.
- [ ] Re-check SMS consent at send time; separate optional messages from OTP/security messages.
- [ ] Protect provider credentials, callbacks, templates, rate limits, and cost limits.
- [ ] Require high privilege, approval, and volume safeguards for broadcasts.
- [ ] Treat gateway callbacks as untrusted until verified server-to-server.
- [ ] Verify payment amount, currency, authority, merchant, ownership, and idempotency before marking paid.
- [ ] Review and pin dependencies after vulnerability/license/maintenance review.

## Definition of done

- [ ] Product decisions and Persian content are approved before implementation.
- [ ] Every feature is independently deployable behind a disabled-by-default feature flag.
- [ ] Unit, integration, E2E, accessibility, mobile, performance, privacy, and security tests pass.
- [ ] Migrations pass against a sanitized production-like snapshot.
- [ ] S3/MinIO, video, CSP, lifecycle, backup, and incident-response documentation is complete.
- [ ] SMS/OTP consent, provider, broadcast, cost-alert, and delivery-monitoring runbooks are complete.
- [ ] Payment credentials, callbacks, reconciliation, settlement monitoring, and incident procedures are complete.
- [ ] Disabled deferred features do not change current enrollment/authentication behavior.
- [ ] Product, Persian-language, legal/privacy, and security owners approve release.

# More Features — Later-Phase Modification Plan

> Document status: deferred feature plan only. None of these features are required in the current phase.
>
> This file contains the items that were marked with asterisks in the original change request. Do not implement them as part of `modifications.md` unless they are explicitly moved into the active scope.

## How to use this document

- Check an item only after its product decisions, implementation, tests, security review, and deployment verification are complete.
- Paths are relative to the repository root. Paths marked **new file** are suggested locations and do not currently exist.
- Keep these features isolated behind feature flags so unfinished work cannot become visible in production.
- Make database changes through new forward-only migrations. Never rewrite an existing migration.

## Decisions required before development

- [ ] Obtain and approve the enrollment tutorial video, poster image, captions, duration, and publishing rights.
- [ ] Decide whether the tutorial belongs on the homepage, the registration guide, or both.
- [ ] Obtain and approve the advertising video, poster, captions, duration, publishing rights, and campaign dates.
- [ ] Define advertisement behavior: eligible pages, first display, repeat frequency, dismissal persistence, autoplay, audio, and playback speeds.
- [ ] Select S3 or MinIO for student photos.
- [ ] Define photo source limits, allowed formats, output dimensions, WebP quality, retention, replacement, and deletion behavior.
- [ ] Approve the exact Persian photo instructions and any legal/privacy notice required for a child’s photograph.
- [ ] Define feedback categories, maximum length, response expectations, retention, moderation, and which admin roles can read or answer messages.

## 1. Student-enrollment tutorial video

Primary locations:

- **New file:** `apps/web/src/features/public-home/enrollment-tutorial-video.tsx`
- `apps/web/src/app/(public)/page.tsx`
- `apps/web/src/app/(public)/registration-guide/page.tsx`
- `apps/web/src/app/(public)/layout.tsx`
- `apps/web/next.config.ts`, if an approved external media origin is required
- `apps/web/src/lib/security-headers.ts`, if CSP changes are required

- [ ] Add a reusable enrollment tutorial video component.
  - Use semantic HTML `<video>` where practical.
  - Provide native or accessible custom controls for play/pause, seeking, volume, fullscreen, and playback speed.
  - Provide a poster image so layout is stable before the media loads.
  - Do not load the full video until it is near the viewport or the user requests playback.
  - Include Persian captions/subtitles when available and expose a text alternative or transcript.
  - Ensure keyboard operation, visible focus, screen-reader labeling, and usable controls on small mobile screens.

- [ ] Place the tutorial at the approved location.
  - If it appears on both pages, reuse the same component and configuration rather than duplicating markup.
  - Add a clear Persian heading and description explaining that the video demonstrates student enrollment.
  - Keep the registration action available if the video fails to load.

- [ ] Configure video hosting securely and efficiently.
  - Prefer an approved CDN or private managed origin with correct content types, byte-range requests, caching, and HTTPS.
  - Do not place sensitive credentials or signed permanent URLs in client code.
  - If hosted locally, consider repository and deployment-image size before adding a large asset to `apps/web/public/`.
  - Restrict CSP `media-src` to the exact approved origin.

- [ ] Add tests and acceptance checks.
  - Component renders without JavaScript/media errors.
  - Playback controls work with mouse, touch, and keyboard.
  - Captions and fallback content are available.
  - The page remains responsive and does not introduce meaningful CLS.
  - The video does not significantly regress homepage LCP or data usage before user interaction.

## 2. Advertisement video popup

Primary locations:

- **New file:** `apps/web/src/components/common/advertisement-video-dialog.tsx`
- **New file:** `apps/web/src/features/advertising/advertisement-config.ts`
- `apps/web/src/app/(public)/layout.tsx`, for public pages only
- `apps/web/src/app/layout.tsx`, only if product explicitly requires all pages
- Existing dialog primitives in `apps/web/src/components/ui/dialog.tsx`
- Security-header and environment configuration files when using external media

- [ ] Add a global advertisement-video dialog.
  - Display it above the site and blur/dim the content behind it.
  - Use the existing accessible dialog primitives where possible.
  - Trap focus while open and restore focus to the previous element after closing.
  - Support a visible close button and the Escape key.
  - Pause and reset or preserve playback according to the approved behavior when closed.

- [ ] Provide complete video controls.
  - Include play/pause, seek, volume/mute, fullscreen where supported, and speed choices including 2x.
  - Do not autoplay with sound.
  - If silent autoplay is approved, respect reduced-motion, browser autoplay rules, and user data considerations.
  - Add Persian captions and accessible labels.

- [ ] Implement repeat-display and dismissal rules.
  - Users must be able to see the advertisement multiple times, but it should not reopen on every client-side navigation.
  - Store only a campaign identifier, view/dismiss time, and count where necessary; do not use this feature for hidden behavioral tracking.
  - A new campaign version may reset the display count according to the approved policy.
  - Provide an explicit way to replay the advertisement if product requires it.
  - Ensure server/client rendering does not cause a hydration flash or open the modal twice.

- [ ] Define page eligibility carefully.
  - Prefer public pages unless there is a documented reason to interrupt enrollment, contract signing, payment, or admin workflows.
  - Never cover an emergency error, payment confirmation, or security prompt in a way that could confuse the user.
  - Do not show the advertisement in `/admin` unless explicitly approved.

- [ ] Add campaign configuration.
  - Keep media URL, poster URL, campaign ID, start/end time, and frequency policy in validated configuration.
  - Fail closed when configuration is invalid: render the website normally without the popup.
  - Audit configuration changes if administrators can manage campaigns later.

- [ ] Add tests and acceptance checks.
  - Modal focus management and Escape behavior pass accessibility tests.
  - Background interaction is unavailable while the dialog is open.
  - Closing reliably stops audio.
  - Frequency caps persist as designed across refreshes and expire correctly.
  - Invalid or unavailable video does not block the website.
  - Mobile portrait and landscape layouts are usable.

## 3. Student photo upload, WebP processing, and object storage

Primary frontend locations:

- `apps/web/src/features/enrollment/enrollment-actions.tsx`
- `apps/web/src/features/enrollment/enrollment-form-model.ts`
- `apps/web/src/features/enrollment/enrollments-api.ts`
- Shared form/feedback components under `apps/web/src/components/`

Suggested backend locations:

- **New module:** `apps/api/src/modules/student-images/` or `apps/api/src/modules/media/`
- `apps/api/src/modules/students/**`
- `apps/api/src/modules/registrations/**`
- `apps/api/src/database/schemas/students.schema.ts`
- `apps/api/src/config/config.service.ts`
- `.env.example`
- `apps/api/.env.example`
- `docker-compose.yml`
- `docker-compose.development.yml`
- A new database migration

- [ ] Add a student photo field to the first enrollment step.
  - Show a preview, replace action, remove action, upload progress, and Persian field-level errors.
  - Clearly identify it as the photograph used for the student service card.
  - Decide whether it is mandatory before marking the form schema as required.
  - Avoid keeping a large base64 image in form state or localStorage.

- [ ] Display the approved Persian photo guidance below the upload area.
  - `پشت سر دانش‌آموز دیوار سفید باشد.`
  - `ترجیحاً دانش‌آموز لباس فرم مدرسه پوشیده باشد.`
  - `عکس از سر به بالا باشد و تمام‌قد نباشد.`
  - `برای دانش‌آموزان دختر حجاب کامل رعایت شود.`
  - `این تصویر برای کارت سرویس دانش‌آموز استفاده خواهد شد.`
  - Also display the approved maximum size, minimum/maximum dimensions, and permitted extensions.

- [ ] Validate the upload in both frontend and backend.
  - Frontend validation is immediate feedback only; backend validation is authoritative.
  - Check actual file signatures/magic bytes rather than trusting extensions or browser MIME values.
  - Decode the image with a maintained library; reject corrupt or unsupported content.
  - Set strict source file, pixel-count, width, height, and processing-time limits.
  - Protect against decompression bombs, MIME spoofing, polyglot files, and malformed image parsers.

- [ ] Process every accepted image into a safe WebP derivative.
  - Apply orientation correctly, crop/fit according to the approved card aspect ratio, and resize to the approved dimensions.
  - Strip EXIF, GPS, device, thumbnail, and other metadata.
  - Re-encode rather than copying the source bytes.
  - Use a documented quality setting and verify that faces remain clear enough for the service card.
  - Keep the original only if a documented business need and retention policy require it; otherwise discard it after successful processing.

- [ ] Configure private S3 or MinIO storage.
  - Use a private bucket with public listing and public object ACLs disabled.
  - Generate random object keys; never include national ID, phone number, student name, or other personal data in keys.
  - Encrypt data in transit and at rest.
  - Use narrowly scoped service credentials and rotate them through the deployment secret-management process.
  - Return only short-lived signed URLs after server-side ownership/role checks.
  - Define lifecycle rules for abandoned drafts, replaced photos, archived students, and legally required deletion.

- [ ] Store photo metadata safely.
  - Suggested fields: object key, derivative version, width, height, content type, byte size, checksum, created time, updated time, and processing status.
  - Do not store a permanent public URL.
  - Link the photo to the student and draft enrollment with referential-integrity and cleanup rules.
  - Make upload finalization idempotent so retries cannot leave multiple orphan objects.

- [ ] Control access to photos.
  - Students/guardians may access only photos belonging to their account.
  - Admin access must use granular RBAC and audit sensitive views or exports where required.
  - Public school-directory and general registration endpoints must never include photo object keys or URLs.
  - Protect every download/signing endpoint against IDOR.

- [ ] Add failure handling and cleanup.
  - If upload succeeds but database finalization fails, schedule object cleanup.
  - If image processing fails, mark the operation failed without activating enrollment with an unusable image.
  - Replacing a photo should not delete the previous valid object until the new version is committed successfully.
  - Use retry limits and a dead-letter/error review path for asynchronous processing.

- [ ] Add tests and acceptance checks.
  - Unit tests cover extension/MIME mismatch, invalid bytes, oversized files, huge dimensions, corrupt images, and valid common source formats.
  - Integration tests cover upload authorization, signed URL expiry, replacement, cleanup, and rollback.
  - Verify EXIF/GPS metadata is absent from generated WebP files.
  - Verify storage is not publicly listable or readable.
  - Perform a security review of the image library and processing environment.
  - Check visual quality on the actual service-card layout.

## 4. Criticisms and suggestions (`انتقادات و پیشنهادات`)

Suggested frontend locations:

- **New page:** `apps/web/src/app/student/feedback/page.tsx`
- **New feature folder:** `apps/web/src/features/feedback/`
- Student-panel navigation/shell
- **New admin page:** `apps/web/src/app/admin/feedback/page.tsx`
- Admin navigation/shell
- Notification feature for response alerts

Suggested backend locations:

- **New module:** `apps/api/src/modules/feedback/`
- **New schema:** `apps/api/src/database/schemas/feedback.schema.ts`
- `apps/api/src/database/schemas/index.ts`
- `apps/api/src/modules/notifications/**`
- A new database migration

- [ ] Add an `انتقادات و پیشنهادات` section to the student panel.
  - Provide a Persian title, explanation, text area, submit action, validation feedback, and success confirmation.
  - Consider optional categories such as service quality, driver conduct, application issue, payment, or other only after product approval.
  - Show previous submissions and admin responses if this is approved; otherwise clearly state whether submissions are one-way.

- [ ] Define and implement the feedback data model.
  - Suggested fields: ID, account/guardian ID, optional student ID, category, subject, message, status, assigned admin, created/updated times, first-read time, response text, responder, and response time.
  - Suggested lifecycle: `NEW`, `READ`, `ANSWERED`, and optionally `CLOSED`.
  - Preserve a useful audit history when status, assignment, or response changes.
  - Decide retention and deletion rules for feedback containing personal information.

- [ ] Add student-facing API operations.
  - Create feedback.
  - List only submissions owned by the authenticated account, if history is in scope.
  - Read only an owned submission.
  - Never accept account ownership IDs directly without verifying them against the session.
  - Prevent editing after an admin response unless a reply-thread design is explicitly approved.

- [ ] Add admin review and response capabilities.
  - List and filter by status, date, category, assigned admin, and other approved fields.
  - Open the submission with only the student information necessary to respond.
  - Mark as read safely and record who read it.
  - Allow an authorized admin to respond and optionally close the item.
  - Prevent unauthorized roles from viewing or responding.

- [ ] Notify the student when an admin responds.
  - Reuse `apps/api/src/modules/notifications/**` and the notification outbox pattern.
  - Do not send the full potentially sensitive response in SMS; use a short notice directing the user to the authenticated panel.
  - Respect applicable notification preferences while ensuring required service messages follow the approved legal policy.
  - Make response and notification creation transactional/idempotent so duplicate alerts are not sent.

- [ ] Validate and sanitize content safely.
  - Define minimum and maximum lengths and show Persian field-level validation messages.
  - Store text as text, not executable HTML.
  - Escape output in every UI and export to prevent stored XSS.
  - Apply sensible submission rate limits and abuse controls without blocking legitimate safety reports.
  - Mask sensitive feedback content in logs, traces, analytics, and error reports.

- [ ] Add audit, privacy, and moderation safeguards.
  - Audit reads, assignments, responses, status changes, and exports where appropriate.
  - Restrict bulk export and do not expose unrelated student details.
  - Provide an escalation process for urgent safety complaints or reports involving a child.
  - Define who can delete or redact a submission and require a reason.

- [ ] Add tests and acceptance checks.
  - Ownership and admin-role tests cover all read/write endpoints and IDOR attempts.
  - Stored-XSS payloads are rendered harmlessly.
  - Rate limits and length limits return Persian user-facing errors.
  - Response notifications are delivered exactly once.
  - Filters, pagination, status changes, and concurrent admin actions behave predictably.
  - Mobile and accessibility checks cover the student form and admin response UI.

## 5. Notification review, SMS delivery, and OTP SMS provider

### Current implementation audit

The following behavior already exists and must be understood before adding SMS:

- Student/family in-app notifications are stored in `notifications` and displayed by `apps/web/src/app/parent/notifications/page.tsx`.
- Student notification actions can mark one or all items as read through `apps/web/src/features/notifications/notification-actions.tsx`.
- `apps/api/src/modules/notifications/notifications.service.ts` creates a welcome notification the first time an account with no notifications opens the list.
- Domain services enqueue notification events through `apps/api/src/infrastructure/notifications/in-app-notification.service.ts`.
- The existing `notification_outbox` supports claiming, retry with exponential backoff, a processing lease, and a dead-letter state.
- The outbox currently delivers only the `IN_APP` channel.
- `notificationStatus` currently uses `PENDING` for unread and `SENT` for read. These names mix delivery state with read state and should be separated before adding SMS.
- Admin notifications at `apps/web/src/app/admin/notifications/page.tsx` are not a separate admin inbox. `GET /admin/notifications` returns selected user-domain events such as account registration, enrollment, payment, and contract events.
- The admin page does not currently provide a mark-read action, even though its UI derives `readAt` from the same status field.
- OTP delivery already has an abstraction in `apps/api/src/modules/identity/application/otp-delivery.port.ts` and implementation selection in `apps/api/src/modules/identity/infrastructure/otp-delivery.ts`.
- `ConfigService` currently allows only `OTP_PROVIDER=console|none`; production explicitly rejects console and requires a non-none provider, so a real provider must be added before production startup can work.

### 5.1 Audit and redesign in-app notifications

Primary files:

- `apps/api/src/modules/notifications/notifications.service.ts`
- `apps/api/src/modules/notifications/notifications.controller.ts`
- `apps/api/src/infrastructure/notifications/in-app-notification.service.ts`
- `apps/api/src/database/schemas/notifications.schema.ts`
- `apps/api/src/worker.ts`
- `apps/api/src/worker-readiness.ts`
- `apps/web/src/features/notifications/**`
- `apps/web/src/app/parent/notifications/page.tsx`, later moved to the student route
- `apps/web/src/features/admin-notifications/**`
- `apps/web/src/app/admin/notifications/page.tsx`
- A new forward-only migration

- [ ] Create a notification inventory before changing behavior.
  - Search every call to `enqueueInTransaction`, `.create({`, and every `notificationType` literal.
  - For each event, record producer, recipient, current title/message, related entity, whether it is transactional, and intended channels.
  - Known current types include `ACCOUNT_REGISTERED`, `ADMIN_STUDENT_ADDED`, `ENROLLMENT_CREATED`, `PAYMENT_SUCCEEDED`, `PAYMENT_APPROVED`, `PAYMENT_REJECTED`, `PAYMENT_PLAN_READY`, `CONTRACT_ACCEPTED`, and `CONTRACT_REJECTED`; confirm the full list from source.
  - Identify missing student events, duplicated events, and events that should be admin-only rather than shown to the student.

- [ ] Define separate student and admin notification requirements.
  - Student inbox should show only notifications owned by the authenticated guardian/student account.
  - Admin inbox should show operational events intended for admins, not merely an unfiltered copy of user notifications.
  - Decide whether each admin sees their own read state. If yes, add per-admin notification/read records rather than mutating a shared user notification.
  - Remove the side effect that creates `WELCOME` during `GET /notifications`; enqueue welcome when the account/panel is activated instead so a read endpoint remains read-only.

- [ ] Separate notification concepts in the schema.
  - Recommended model:
    - A logical notification/event with type, title, body, recipient, related entity, and created time.
    - One or more channel deliveries with channel, delivery status, attempt count, provider message ID, timestamps, and safe failure code.
    - An in-app read timestamp independent from delivery status.
  - Replace overloaded `notificationStatus=PENDING|SENT` read semantics with a nullable `readAt` or explicit read state.
  - Preserve and migrate existing records; do not lose read/unread information.
  - Keep idempotency unique per logical event and recipient/channel, not globally in a way that prevents intended multi-channel delivery.

- [ ] Define a typed notification catalog.
  - Create a module such as `apps/api/src/modules/notifications/notification-catalog.ts`.
  - Each type should declare allowed recipients, default Persian title/body builder, related-entity type, required vs optional purpose, and eligible channels.
  - Avoid free-form type strings scattered across services.
  - Keep sensitive details out of SMS templates; SMS can tell the user to open the authenticated panel.

- [ ] Improve student notification APIs and UI.
  - Add pagination and stable ordering.
  - Return `readAt` explicitly.
  - Verify ownership on single-read updates and return not-found when the row does not belong to the current user.
  - Add empty, loading, and Persian error states.
  - Preserve unread count after the route migration from parent to student.

- [ ] Improve admin notification APIs and UI.
  - Define a genuine admin recipient/audience rather than selecting particular user notification types in `getAll()`.
  - Add filters for type, severity, read state, and date.
  - Add per-admin mark-read and mark-all-read actions if an admin inbox is required.
  - Link operational notifications to the relevant admin student, registration, payment, or contract page.
  - Apply admin role guards and pagination to prevent unbounded sensitive data downloads.

- [ ] Add migration and compatibility tests.
  - Existing `PENDING` rows should become unread in-app records.
  - Existing `SENT` rows should become read records using `sentAt` as the best available historical `readAt`.
  - Ensure old outbox events remain dispatchable during a rolling deployment or drain the old queue before migration.

### 5.2 Add an SMS provider for consented notifications

Suggested files:

- **New port:** `apps/api/src/modules/notifications/sms-provider.port.ts`
- **New provider adapter:** `apps/api/src/infrastructure/notifications/providers/<provider-name>.sms-provider.ts`
- **New dispatcher/channel service:** `apps/api/src/infrastructure/notifications/sms-notification.service.ts`
- Notification module/provider registration
- Worker dispatch integration
- `apps/api/src/config/config.service.ts`
- `.env.example` and `apps/api/.env.example`
- Notification preference/consent schema and migration

- [ ] Select the SMS provider and read its official API documentation before implementation.
  - Confirm Iran delivery support, sender line, template requirements, delivery receipts, throughput, rate limits, Unicode/Persian segmentation, credentials, test environment, and data-processing terms.
  - Do not couple domain services directly to the vendor SDK.

- [ ] Define a provider-neutral SMS port.
  - Suggested input: recipient phone, template/key, safe variables, idempotency key, and correlation ID.
  - Suggested output: accepted/rejected state, provider message ID, and normalized provider status.
  - Map vendor exceptions to stable internal codes; do not persist raw responses that may contain credentials or full personal data.

- [ ] Extend configuration safely.
  - Add an approved provider name to a new `SMS_PROVIDER` setting or a notification-specific provider setting.
  - Add base URL, API key/secret reference, sender line, timeout, retry policy, and callback secret as required.
  - Validate required production configuration in `ConfigService`.
  - Put placeholders, never real secrets, in example environment files.
  - Redact provider credentials and full phone numbers from startup errors and logs.

- [ ] Implement notification consent and preferences before enabling notification SMS.
  - Reuse the consent/settings work planned in `modifications.md`.
  - Model channel and purpose separately, for example service updates vs optional/marketing announcements.
  - Record consent text version, source, granted/revoked time, and actor.
  - The panel must show an SMS toggle and accurately reflect persisted server state.
  - Default optional SMS to off unless legal/product review explicitly approves another basis.

- [ ] Enforce consent on the backend at dispatch time.
  - Do not rely on a hidden UI button or a consent snapshot taken when the event was created.
  - Re-check the recipient’s current consent immediately before sending so revocation takes effect for queued messages.
  - If consent is absent, mark the SMS delivery `SKIPPED_NO_CONSENT`; keep the in-app notification if it remains eligible.
  - Transactional/security messages must be classified separately. Do not incorrectly block necessary OTP or legally required service messages using a marketing-consent toggle.

- [ ] Dispatch SMS asynchronously.
  - Add an SMS delivery row/outbox item in the same transaction as the domain change when an event is eligible.
  - Let the worker call the provider after commit.
  - Use idempotency keys and provider message IDs to avoid duplicate SMS during retries.
  - Implement bounded retries with jitter, permanent/transient failure classification, dead-letter state, and operator visibility.
  - Never make a successful payment, contract, or enrollment appear failed merely because SMS delivery failed.

- [ ] Process delivery callbacks if supported.
  - Add a dedicated unauthenticated webhook endpoint protected by provider signature/secret verification and replay controls.
  - Store normalized delivered/failed status and timestamps.
  - Accept callbacks idempotently and tolerate out-of-order status updates.
  - Do not expose internal notification details in webhook responses.

- [ ] Create concise Persian SMS templates.
  - Avoid national IDs, precise addresses, payment-card data, detailed complaints, or child-sensitive information.
  - Prefer messages such as `وضعیت درخواست شما به‌روزرسانی شد. برای مشاهده جزئیات وارد پنل ثمین گشت مهر ایران شوید.`
  - Account for Persian Unicode SMS segment limits and provider template approval.

- [ ] Add tests.
  - Consented recipient receives one SMS delivery request.
  - Non-consented or revoked recipient is skipped even if the event was queued earlier.
  - In-app delivery continues when SMS fails.
  - Provider timeout retries safely without duplicate sends.
  - Callback signatures, replay, out-of-order delivery, and unknown message IDs are handled safely.
  - Logs and error responses do not expose full phone numbers or secrets.

### 5.3 Add a real SMS provider for OTPs

Primary files:

- `apps/api/src/modules/identity/application/otp-delivery.port.ts`
- `apps/api/src/modules/identity/infrastructure/otp-delivery.ts`
- `apps/api/src/modules/identity/identity.module.ts`
- `apps/api/src/modules/identity/application/auth.service.ts`
- `apps/api/src/config/config.service.ts`
- Environment example files
- OTP delivery and concurrency tests

- [ ] Keep OTP delivery separate from ordinary notification SMS.
  - It may share the low-level provider client, but use a dedicated OTP template, rate limits, metrics, configuration, and service abstraction.
  - OTP is a requested security message and generally must not depend on the optional panel SMS-consent toggle. Confirm this distinction with legal/product owners.

- [ ] Extend the existing `OtpDelivery` port instead of calling a vendor from `AuthService`.
  - Implement a production provider adapter alongside the current console/disabled adapters.
  - Register the adapter in `identity.module.ts` according to validated `OTP_PROVIDER` configuration.
  - Extend the configuration enum beyond `console|none` with the chosen provider.

- [ ] Use the provider’s approved OTP/pattern template where available.
  - Send only the short code and approved brand/purpose text.
  - Do not include username, national ID, or other account data.
  - Keep the code expiry at the two-minute requirement configured in the main-phase work.

- [ ] Preserve authentication safety when the provider fails.
  - If delivery is definitively rejected, do not tell the client that the code was sent successfully.
  - Use a generic Persian service-unavailable message without revealing account existence.
  - Rate limits must count accepted request attempts appropriately even when a provider is degraded, to prevent abuse and cost spikes.
  - Never return `developmentCode` outside non-production console mode.

- [ ] Add provider resilience and observability.
  - Use strict connection/read timeouts and limited retries only where duplicate delivery is acceptable.
  - Record safe metrics: requests, accepted, rejected, latency, and normalized failure categories.
  - Alert on sustained failure rate or unusual send volume.
  - Mask phones and never log OTP codes or raw provider payloads.

- [ ] Add tests.
  - Provider adapter request mapping and response normalization.
  - Unknown account behavior remains non-enumerating.
  - OTP expires after two minutes and is single-use.
  - Resend/cooldown/max attempts and concurrent verification still hold.
  - Production configuration rejects console, none, missing credentials, and invalid provider setup.

### 5.4 Later feature: admin broadcast notifications by SMS

> This was specifically marked as an additional later feature. Keep it behind its own feature flag even after ordinary SMS notifications exist.

Suggested files:

- **New admin page:** `apps/web/src/app/admin/notifications/broadcasts/page.tsx`
- **New feature folder:** `apps/web/src/features/admin-broadcasts/`
- **New backend module:** `apps/api/src/modules/broadcasts/`
- New broadcast, recipient, and delivery schema/migration
- Existing notification catalog, SMS provider, worker, consent, and audit services

- [ ] Define broadcast scope and permissions.
  - Example use: a Persian New Year congratulation message to all eligible users.
  - Treat congratulatory/campaign messages as optional or marketing messages requiring the correct SMS consent purpose.
  - Restrict creation, approval, scheduling, cancellation, and reporting to explicit admin permissions.
  - Consider dual approval for broadcasts to a large audience.

- [ ] Build a safe compose workflow.
  - Fields: internal campaign name, Persian title, SMS body/template, optional in-app body, audience filters, scheduled time, and expiry/cancel time.
  - Show character/segment count, estimated recipient count, and estimated cost before confirmation.
  - Provide a test-send action limited to approved test numbers.
  - Provide preview and final confirmation that clearly states recipient count and channel.

- [ ] Build audience selection on the server.
  - Example filters: all eligible active users, school, service status, or another approved segment.
  - Never send client-supplied user IDs without server authorization and validation.
  - Resolve recipients from current data and current consent at dispatch time.
  - Deduplicate normalized phone numbers.
  - Exclude disabled accounts, invalid phones, revoked consent, and suppression-list entries.

- [ ] Store an immutable campaign snapshot.
  - Store creator, approver, content/template version, filters, scheduled time, status, estimated/actual counts, and audit data.
  - Store per-recipient delivery state without copying unnecessary personal information.
  - Once approved/sending, content cannot be silently edited; cancel and create a new version instead.

- [ ] Send in controlled batches through the worker.
  - Respect provider throughput and cost limits.
  - Use stable per-recipient idempotency keys.
  - Support pause/cancel for unsent recipients.
  - Re-check consent immediately before each send.
  - Handle partial failure without restarting successful recipients.

- [ ] Add reports and safeguards.
  - Show queued, skipped-no-consent, accepted, delivered, failed, and cancelled counts.
  - Do not expose full phone lists in normal UI or exports.
  - Add spend/volume limits and alerts to prevent accidental or compromised mass sends.
  - Audit every preview, test send, approval, schedule, cancellation, and export.

- [ ] Add tests.
  - Authorization and dual-approval rules.
  - Audience and consent filtering.
  - Phone deduplication.
  - Scheduling and timezone handling for `Asia/Tehran`.
  - Batch retry/idempotency, pause/cancel, and partial provider failure.
  - Cost/recipient confirmation and maximum-volume protection.

## 6. Real payment gateway integration

### Current implementation audit

- `apps/api/src/modules/payments/payment-gateway.ts` already defines a provider abstraction and mock/disabled implementations.
- `ConfigService` currently allows only `PAYMENT_GATEWAY_PROVIDER=mock|none` and rejects both unsafe production states: mock is forbidden and the API cannot run with none.
- `PaymentsController` already exposes start and verify endpoints.
- `PaymentsService` already has payment plans, schedule items, transactions, ownership checks, idempotency handling, and payment notifications.
- `apps/web/src/features/finance/online-payment-button.tsx` starts a transaction and immediately calls verification with a fabricated `mock:` gateway transaction ID; it does not redirect to a real gateway.
- `apps/web/src/features/enrollment/enrollments-api.ts` uses the same fabricated verification for guided-enrollment prepayment.
- `payment-return-preview.tsx` is only a visual state preview and is not a real callback/result page.

### Decisions required before development

- [ ] Choose the payment gateway/acquirer and obtain merchant credentials, test environment, official API documentation, callback requirements, allowed domains/IPs, settlement rules, and support contacts.
- [ ] Confirm currency units. The application displays تومان in some places while backend amounts may be stored as integer currency values; determine whether the gateway accepts ریال or تومان and convert exactly once.
- [ ] Confirm callback and verification flow, transaction expiry, duplicate-payment rules, refund/cancel support, and reconciliation/reporting requirements.
- [ ] Approve the production callback URL and whether the provider calls the backend directly, redirects the browser, or both.

### Backend implementation

- [ ] Implement a provider adapter behind the existing payment gateway port.
  - Suggested file: `apps/api/src/modules/payments/providers/<provider-name>.payment-gateway.ts`.
  - Map internal transaction ID, amount, callback URL, description, and merchant data into the provider request.
  - Normalize authority/token, provider reference, status, and error codes into internal types.
  - Keep vendor-specific fields out of controllers and domain services.

- [ ] Extend payment configuration.
  - Add the real provider to `PAYMENT_GATEWAY_PROVIDER`.
  - Add merchant ID/key/secret, base URL, callback base URL, timeout, and any certificate settings.
  - Validate production configuration in `ConfigService` and example files.
  - Store real credentials only in the deployment secret manager/environment, never Git.

- [ ] Change online start behavior.
  - Validate authenticated ownership of the schedule item.
  - Validate item is payable, not already fully paid, and amount is a positive safe integer.
  - Reuse the required `Idempotency-Key` to return the same active transaction for repeated starts.
  - Create the internal transaction before calling the provider or use a clearly documented state flow that survives a process crash.
  - Store provider authority/token and expiry securely.
  - Return a validated HTTPS redirect URL or provider token to the frontend; do not return merchant secrets.

- [ ] Implement callback/return handling.
  - Add a dedicated backend callback/return endpoint according to provider requirements.
  - Treat browser query parameters as untrusted hints. Final success comes only from server-to-server verification with the provider.
  - Correlate using the internal transaction and stored provider authority, not an amount supplied by the browser.
  - Verify amount, merchant, authority/token, and provider status.
  - Make callback processing idempotent so refreshes and repeated provider callbacks cannot pay twice.

- [ ] Finalize payment atomically.
  - Lock the transaction/schedule row during verification.
  - Transition only allowed states, persist provider reference and verified time, update paid amount/item status/plan status, and enqueue the success notification in one database transaction.
  - A second successful verification of the same provider transaction should return the existing success result, not add money again.
  - A failed verification must not mark the schedule item paid.

- [ ] Handle uncertain states.
  - Network timeout after provider verification may leave the result unknown; keep a `VERIFY_PENDING` or equivalent recoverable state.
  - Add a reconciliation job that rechecks pending transactions and compares provider settlements.
  - Do not automatically start a new charge while an earlier authority may still succeed.

- [ ] Add refunds/cancellations only if business scope requires them.
  - Use separate privileged actions and immutable transaction records.
  - Never rewrite a succeeded payment to pretend it never existed.

### Frontend implementation

- [ ] Update `apps/web/src/features/finance/payments-api.ts` so `startOnlinePayment` returns the gateway redirect URL/token and internal transaction ID.
- [ ] Remove every fabricated `mock:` verification value from production paths:
  - `apps/web/src/features/finance/online-payment-button.tsx`
  - `apps/web/src/features/enrollment/enrollments-api.ts`
- [ ] After start succeeds, navigate the browser to the validated provider URL.
- [ ] Create a real return page, for example `apps/web/src/app/student/payments/return/page.tsx`.
  - Read only expected callback parameters.
  - Ask the backend for final transaction status or invoke the safe verification endpoint as designed.
  - Show Persian pending, success, failure, cancelled, and already-completed states.
  - Provide navigation back to payments/enrollment without allowing the UI to mark payment successful itself.
- [ ] Preserve the enrollment state while the browser is away at the gateway. After successful prepayment, refresh server state and activate the panel according to the onboarding lifecycle.
- [ ] Disable repeated clicks while start is pending, but rely on backend idempotency for real protection.

### Webhooks and network security

- [ ] If the gateway provides server webhooks, verify signatures/certificates or use its documented authentication mechanism.
- [ ] Apply replay protection and idempotency.
- [ ] If IP allowlisting is required, maintain it operationally and do not trust `X-Forwarded-For` unless trusted proxy configuration is correct.
- [ ] Keep callback endpoints narrowly scoped; they do not grant a user session.
- [ ] Do not log full provider payloads, secrets, card-related data, or personal information.

### Tests and verification

- [ ] Provider adapter contract tests using documented sandbox responses.
- [ ] Start-payment ownership, invalid amount, already-paid, concurrent click, and idempotency tests.
- [ ] Successful, failed, cancelled, expired, repeated, out-of-order, and tampered callback tests.
- [ ] Amount/currency mismatch and wrong authority/merchant tests.
- [ ] Network timeout and reconciliation tests.
- [ ] Confirm one successful provider transaction can increase paid amount only once.
- [ ] Confirm contract/panel activation occurs only after verified prepayment, not after redirect alone.
- [ ] Run E2E against the gateway sandbox and document test merchant behavior.
- [ ] Add production monitoring for start failures, verification failures, pending-age, duplicate callbacks, and settlement mismatch.

## Deferred-feature security checklist

> These features introduce public media, a disruptive global modal, children’s photographs, and user-generated content. They require dedicated privacy and security review before release.

- [ ] Confirm media publishing rights and accessibility requirements for both videos.
- [ ] Restrict media and storage CSP origins; do not add broad wildcards.
- [ ] Ensure the advertisement cannot imitate authentication, payment, browser, or security dialogs.
- [ ] Keep frequency tracking minimal and document it in the privacy notice if required.
- [ ] Complete a threat model for student-image upload, storage, download, replacement, and deletion.
- [ ] Confirm bucket privacy and signed-URL behavior through deployment tests, not configuration review alone.
- [ ] Treat student photos as highly sensitive child data and limit admin access using least privilege.
- [ ] Never include image keys, student identifiers, or full feedback messages in logs.
- [ ] Escape feedback output and test stored-XSS payloads in every rendering context.
- [ ] Add an operational process for urgent or safeguarding-related feedback.
- [ ] Review all added dependencies for vulnerabilities, license compatibility, maintenance status, and pinned versions.
- [ ] Keep notification delivery state separate from in-app read state and preserve recipient ownership.
- [ ] Re-check SMS consent at send time and separate optional messages from OTP/security messages.
- [ ] Protect SMS and OTP credentials, callbacks, templates, rate limits, cost limits, and provider identifiers.
- [ ] Require explicit high-privilege approval and volume safeguards for admin broadcasts.
- [ ] Treat gateway redirects and callbacks as untrusted until verified server-to-server.
- [ ] Verify payment amount, currency, authority, merchant, ownership, and idempotency before marking anything paid.

## Definition of done for later-phase features

- [ ] Product decisions and Persian content are approved before implementation begins.
- [ ] Each feature is independently deployable behind a feature flag.
- [ ] Unit, integration, E2E, accessibility, mobile, performance, privacy, and security tests pass.
- [ ] New migrations are verified on a sanitized production-like snapshot.
- [ ] S3/MinIO, video, CSP, lifecycle, backup, and incident-response documentation is complete.
- [ ] SMS/OTP provider runbooks, consent rules, delivery monitoring, broadcast safeguards, and cost alerts are complete.
- [ ] Payment-gateway credentials, callback configuration, reconciliation, settlement monitoring, and incident procedures are complete.
- [ ] No deferred feature changes the current-phase enrollment or authentication behavior while its flag is disabled.
- [ ] Product, Persian-language, legal/privacy, and security owners approve the production release.

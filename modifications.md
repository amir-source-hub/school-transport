# Comprehensive Modification Plan

> Document status: implementation plan only. None of the changes listed here were implemented when this document was created.
>
> Target brand name: **ثمین گشت مهر ایران**

## How to use this document

- Each main task and acceptance criterion has a checkbox. Check an item only after implementation, testing, and review are complete.
- All paths are relative to the repository root. Paths marked **new file** do not currently exist and are suggested implementation locations.
- Make database changes through new forward-only migrations. Do not rewrite old migrations or production data manually.
- Changing “family/parent” to “student” is not only a text replacement. Review domain terminology, routes, API contracts, roles, permissions, links, tests, and backward compatibility.
- Read the acceptance criteria and security section before beginning each feature.

## Product decisions required before final implementation

- [x] Decide the exact lifetime of normal and “remember me” sessions. Suggested starting point: a short normal session and a maximum seven-day remembered session using rotating refresh tokens. **APPROVED: normal refresh session 24h (86,400s), remembered refresh session 7 days (604,800s); both roles; access tokens remain 1h.**
- [ ] Clarify “remove an unsuccessful enrollment.” The safer design is an expiring incomplete draft with scheduled cleanup, not immediate hard deletion, so auditing and abuse prevention remain possible.
- [ ] Define the exact lifecycle mapping for the four requested admin registration filters: `همه`، `پیش ثبت نام انجام شده`، `تسویه کامل`، `در حال سرویس دهی`.
- [ ] Choose the new student-panel route, such as `/student`, and define redirects from existing `/parent/*` URLs.
- [ ] Approve the legal text and channels covered by notification consent, including SMS and in-app notifications.
- [ ] Define the extra-student request policy: required reason, permitted reviewers, approval states, increment size, and maximum allowed limit.

## 1. Branding and homepage

Primary files:

- `apps/web/src/lib/route-metadata.ts`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/components/navigation/public-header.tsx`
- `apps/web/src/components/navigation/public-footer.tsx`
- `apps/web/src/app/(public)/**`
- `apps/web/src/features/public-home/**`
- `apps/web/src/app/parent/contracts/[contractId]/page.tsx`

- [x] Replace every user-facing occurrence of `سامانه سرویس مدرسه` with `ثمین گشت مهر ایران`.
  - Search the entire repository in Unicode mode.
  - Review page metadata, browser titles, public pages, header/footer, FAQ, contact content, contracts, notifications, API messages, SMS templates, and tests.
  - Keep the brand in one shared constant such as the existing `SITE_NAME` whenever possible.
  - Acceptance: a repository-wide search finds no unintended occurrence of the old name.

- [x] Change the homepage action `ثبت نام دانش آموز` to `ثبت نام و ورود`.
  - Likely locations: `public-hero.tsx`, `final-registration-cta.tsx`, the public header, and homepage banners.
  - Ensure the button opens the new student login/registration flow.

- [ ] Convert and compress images in `apps/web/public/images/` to WebP.
  - Update every `next/image`, HTML, and CSS reference.
  - Review `apps/web/public/images.zip`; rebuild or remove it intentionally rather than leaving stale PNG references.
  - Do not delete original files until visual comparison is approved.
  - Verify dimensions, transparency, visible quality, LCP, and the budgets in `apps/web/performance/budgets.json`.

## 2. Separate admin login and authentication hardening

Primary files:

- `apps/web/src/app/(auth)/login/page.tsx`
- `apps/web/src/features/auth/auth-forms.tsx`
- `apps/web/src/features/auth/auth-api.ts`
- `apps/web/src/features/auth/auth-session.ts`
- `apps/web/src/app/admin/layout.tsx`
- `apps/api/src/modules/identity/**`
- `apps/api/src/database/schemas/auth.schema.ts`
- A new database migration

- [ ] Create a separate admin login at `/admin/login`.
  - Suggested new page: `apps/web/src/app/admin/login/page.tsx`.
  - Remove admin login choices from the normal user login page.
  - Unauthenticated access to `/admin/*`, except `/admin/login`, must redirect to `/admin/login`.
  - A less-visible URL is not a security control. Every admin endpoint must still enforce roles and permissions server-side.

- [ ] Require two-step admin authentication: username and password, followed by SMS OTP.
  - The first API step should verify the password and issue a short-lived, single-use challenge.
  - The OTP step should accept only that challenge and create the admin session after successful verification.
  - Hash passwords with Argon2id or another project-approved password hashing algorithm.
  - Never log passwords, OTP values, or reusable authentication secrets.

- [ ] Update admin creation and editing to use username, password, and an OTP-capable mobile number.
  - Frontend: `apps/web/src/features/admin-admins/admin-account-form.tsx` and `admin-admins-api.ts`.
  - Backend: extend the identity/admin service and auth schema or create a dedicated admin-account module if one is absent.
  - Changing username, password, or mobile number must require suitable re-authentication, revoke old sessions where appropriate, and generate an audit entry.

- [ ] Add a remove/disable action to `/admin/admins`.
  - Prevent an admin from deleting themselves.
  - Prevent removal of the final super-admin.
  - Prefer disabling or soft deletion to hard deletion.
  - Require confirmation, permission checks, and audit logging.

- [ ] Set every user and admin OTP to expire after exactly two minutes.
  - The backend expiry timestamp is authoritative; a browser countdown is informational only.
  - Add a visible Persian countdown and controlled resend behavior.
  - OTPs must be single-use and protected by per-account and per-IP rate limits and attempt limits.
  - Test boundary behavior at 119, 120, and 121 seconds.

- [ ] Add a `مرا به خاطر بسپار` option.
  - Confirm the exact duration before implementation.
  - Store long-lived authentication only in `HttpOnly`, `Secure`, appropriately scoped `SameSite` cookies, not localStorage.
  - Use refresh-token rotation and revoke remembered sessions on logout, password changes, or security-sensitive account changes.
  - Extend the existing session-concurrency tests in `apps/api/src/modules/identity/application/`.

## 3. User login and panel-creation lifecycle

- [ ] Display three user choices: `دانش آموزان`، `مدیران مدارس`، `رانندگان`.
  - Replace the current `خانواده` choice with `دانش آموزان`.
  - For now, school managers and drivers should be selectable but disabled from proceeding, with a clear Persian message such as `این بخش به‌زودی فعال می‌شود`.
  - Do not create incomplete endpoints or sessions for the unavailable roles.
  - System admins must not be included here; they use `/admin/login`.

- [ ] Change the student-login phone label to `شماره همراه سرپرست دانش آموز`.

- [ ] Send a first-time verified phone number directly into enrollment.
  - Check whether the phone already exists transactionally to prevent duplicate accounts during concurrent requests.
  - Do not create or activate the student panel until enrollment, contract signing, and prepayment are all successful.
  - Define an explicit state machine in `apps/api/src/modules/registrations/registration-lifecycle.ts`, for example:
    - `PHONE_VERIFIED`
    - `ENROLLMENT_COMPLETE`
    - `CONTRACT_SIGNED`
    - `PREPAYMENT_PAID`
    - `PANEL_ACTIVE`

- [ ] Allow a failed or interrupted first enrollment to be attempted again.
  - Keep only the minimum necessary draft data.
  - Protect drafts with access control and an expiration time.
  - Add scheduled cleanup and define whether the user resumes or restarts.
  - Payment failure must not accidentally delete a valid contract or identity record.
  - Make every multi-step operation idempotent and rollback-safe.

## 4. Student enrollment form

Primary frontend files:

- `apps/web/src/features/enrollment/enrollment-actions.tsx`
- `apps/web/src/features/enrollment/enrollment-form-model.ts`
- `apps/web/src/features/enrollment/enrollments-api.ts`
- `apps/web/src/features/family-profile/family-onboarding-form.tsx`
- `apps/web/src/components/forms/field.tsx`
- `apps/web/src/components/forms/jalali-date-input.tsx`
- `apps/web/src/components/common/location-picker.tsx`

Primary backend and data files:

- `apps/api/src/modules/registrations/**`
- `apps/api/src/modules/students/**`
- `apps/api/src/modules/families/**`
- `apps/api/src/database/schemas/registrations.schema.ts`
- `apps/api/src/database/schemas/students.schema.ts`
- `apps/api/src/database/schemas/families.schema.ts`
- New migrations for added fields and tables

### 4.1 First step: student and guardian details

- [x] Add a `سرپرست` section to the first enrollment step.
  - Show the phone number used during login as read-only.
  - Enforce immutability in the backend; a disabled or hidden input alone is not sufficient.
  - Collect guardian name, national ID, and relationship.
  - Relationship choices: `پدر`، `مادر`، `سایر`.
  - When `سایر` is selected, reveal a required relationship-description field for values such as `پدربزرگ` or `عمو`.

- [x] Make only the student and primary guardian sections mandatory.
  - Father, mother, and emergency-contact sections remain optional.
  - Do not display “optional” above optional fields, as requested.
  - If the user begins filling an optional section, validate the fields required to make that partial record meaningful.
  - Keep frontend and backend required/optional rules identical.

- [x] Add a home phone number.
  - Display fixed, non-editable prefix `021-`.
  - Allow exactly eight additional digits.
  - Store a normalized canonical value in the backend.

- [x] Standardize mobile phone inputs.
  - Display fixed, non-editable prefix `09` on the left as requested.
  - Allow exactly nine additional digits, no more and no fewer.
  - The final number is therefore 11 digits, for example `09123456789`.
  - Note: the original example `091234567890` contains 12 digits and must not be used as the validation rule.
  - Normalize Persian and Arabic numerals before validation and store the canonical `09XXXXXXXXX` representation.

- [x] Add an optional student mobile number to the first step.

- [x] Validate national IDs as exactly ten digits and verify the Iranian national-ID checksum.
  - Reuse `apps/web/src/features/enrollment/national-id.ts` and `apps/api/src/common/iranian-national-id.ts` rather than creating inconsistent implementations.

### 4.2 Date, language, and validation rules for all steps

- [ ] Replace manual date typing with a Persian/Jalali date picker.
  - Apply it to birth dates, payment dates, and every other date input.
  - Reuse `apps/web/src/components/forms/jalali-date-input.tsx` and `apps/web/src/lib/jalali-date.ts`.
  - If the picker cannot provide reliable mobile behavior, use three selectors for year, month, and day.
  - Do not require users to type `/`, especially when a numeric mobile keyboard is open.
  - Define one canonical backend storage format and test Jalali/Gregorian conversion and timezone boundaries.

- [x] Restrict appropriate personal-name and relationship fields to Persian text.
  - Permit Persian letters, spaces, and `،` as requested.
  - Decide explicitly whether Persian half-space is accepted; it is usually necessary for valid Persian writing.
  - Normalize Arabic/Persian variants before validation where safe.
  - If Latin letters are entered, show `لطفاً صفحه‌کلید را به فارسی تغییر دهید`.
  - Do not apply this restriction blindly to passwords, codes, addresses, emails, or free-text fields that legitimately need digits or other characters.

- [x] Provide field-level Persian validation for every enrollment input.
  - Validate in both frontend and backend.
  - Disable native browser validation with controlled validation where needed so English messages such as “Please fill in this field” never appear.
  - Required-field message: `پر کردن این فیلد اجباری است`.
  - Display the error in red directly below the relevant field.
  - Prevent moving to the next step until every error in the current step is resolved.
  - Focus the first invalid field and set `aria-invalid` and `aria-describedby` for accessibility.
  - Map backend errors through `apps/web/src/lib/api-error-feedback.ts`; never show raw English server messages.

- [x] Add explicit validation tests for every field.
  - Cover empty values, minimum and maximum length, invalid characters, pasted values, Persian numerals, Arabic numerals, English numerals, and boundary values.
  - Ensure optional empty fields pass and partially completed optional sections fail correctly.

### 4.3 Second step: address and map

- [ ] Remove `منطقه` from the second form.
  - Update the UI, form model, DTOs, API types, contract snapshots, and reports.
  - Before removing a database column, verify whether pricing, routing, reporting, or old contracts depend on `district`.
  - Migrate or deprecate old data safely before dropping anything.

- [x] Require the postal code to contain exactly ten digits.

- [ ] Make every field on this step mandatory, including map location.

- [ ] Repair the map.
  - Review `apps/web/src/components/common/location-picker.tsx`.
  - Review the tile proxy at `apps/web/src/app/api/map-tiles/[z]/[x]/[y]/route.ts`.
  - Check CSP/security headers, tile-provider settings, environment variables, default coordinates, container sizing, and client-side hydration.
  - Add loading and Persian error states, marker selection, mobile interaction, and RTL testing.
  - Do not expose private provider credentials in browser code.

### 4.4 Third step and enrollment completion

- [ ] Change `توضیحات برای واحد مسیر` to `توضیحات`.

- [ ] Ask for notification permission after contract signing.
  - Use a separate unchecked checkbox; consent must not be preselected.
  - Store timestamp, consent-text version, actor, and included channels.
  - Allow the student to enable or disable it later in panel settings.
  - Withdrawing consent must actually stop the affected optional notifications.

## 5. Student panel and student-count limits

Current affected areas:

- `apps/web/src/app/parent/**`
- `apps/web/src/features/parent-shell/**`
- `apps/web/src/features/parent-dashboard/**`
- `apps/web/src/features/family-profile/**`
- `apps/api/src/modules/families/**`
- Route metadata and related tests

- [ ] Rename and migrate the family/parent panel to the student panel.
  - Update routes, breadcrumbs, navigation, metadata, role names, API types, test names, and visible text.
  - Create safe temporary redirects from old `/parent/*` bookmarks to the selected student routes.
  - A terminology change must not weaken ownership or role checks.

- [ ] Add a button in the authenticated panel that returns to the homepage without logging the user out.
  - Put it in the student shell so it is consistently available.

- [ ] Allow a guardian account to enroll a maximum of two students by default.
  - Enforce this rule transactionally in the backend, not only by hiding a button.
  - Show this exact warning in the enrollment experience:
    - `با ثبت دانش آموز دیگر غیر از فرزند خود کلیه تعهدات این دانش آموز نیز برعهده ی شما میباشد.`
  - Product/editorial review may normalize spacing and Persian typography without changing the legal meaning.

- [ ] Add an admin-approved extra-student request flow.
  - Suggested table: `student_limit_requests`.
  - Store requester, current limit, requested increment, reason, status, reviewer, review time, and audit metadata.
  - The admin can approve or reject the request.
  - Approval increases the specific guardian account’s limit by one or by the approved increment.
  - Prevent double approval and concurrent creation beyond the effective limit.

- [ ] Add notification-consent settings to the student panel and synchronize them with the consent captured during enrollment.

## 6. Admin panel: students, registrations, and families

- [ ] Add a remove action for students.
  - Frontend: `apps/web/src/app/admin/students/page.tsx` and `apps/web/src/features/admin-students/student-actions.tsx`.
  - Backend: `apps/api/src/modules/students/students.controller.ts` and `students.service.ts`.
  - Because students may have contracts, payments, and audit history, prefer archive/deactivate or soft deletion.
  - Require confirmation, a reason, appropriate permission, and an audit record.
  - Allow permanent deletion only under an approved retention policy.

- [ ] Remove the empty `کلاس` field from the admin student edit form.
  - Review `apps/web/src/features/students/student-form.tsx`, `students-api.ts`, backend DTOs, and the student schema.
  - Remove the database column only after confirming that reporting or integrations do not use it.

- [ ] Allow authorized admins to view and edit all information collected throughout enrollment.
  - Reuse a shared enrollment schema/component rather than creating a second set of validation rules.
  - Apply granular permissions and before/after audit data to sensitive changes such as national ID, guardian phone, school, location, contract, or payment information.

- [ ] Make admin-created student enrollment include all normal enrollment fields and contract signing.
  - Extend `apps/web/src/features/admin-families/admin-family-enrollment-form.tsx` and the guided-enrollment backend.
  - Display a Persian warning telling the admin that they must collect the prepayment manually and that the system will treat it as paid.
  - Suggested message: `پیش‌پرداخت این دانش‌آموز باید به‌صورت نقدی توسط شما دریافت شود. سامانه پس از ثبت نهایی، مبلغ را پرداخت‌شده در نظر می‌گیرد.`
  - A cash payment record must include amount, receiving admin, date/time, reference or receipt, and audit details; do not use only a checkbox.
  - On successful atomic completion, create/activate the student panel using the guardian phone number.
  - Extend the existing admin guided-enrollment rollback tests.

- [ ] Add student archive filters with `همه`، `بایگانی شده`، `فعال` or equivalent approved titles.

- [ ] Add student sorting by student name ascending/descending, school name, and other approved fields.
  - Implement sorting, filtering, and pagination in the backend.
  - Use an allowlist; never interpolate a raw query-string column into SQL.

- [ ] Reduce `/admin/registrations` to the four requested product-status filters.
  - Visible options: `همه`، `پیش ثبت نام انجام شده`، `تسویه کامل`، `در حال سرویس دهی`.
  - Map the detailed lifecycle states to these labels in one central function.
  - Do not delete the underlying lifecycle history.

- [ ] Add student-name A→Z/Z→A sorting, school-name sorting, and a school column to admin registrations.
  - Define appropriate Persian database collation and null handling.
  - Add indexes where query plans show they are needed.

- [ ] Remove the admin “families” panel after moving necessary capabilities into students.
  - Affected frontend: `apps/web/src/app/admin/families/**` and `apps/web/src/features/admin-families/**`.
  - Add temporary redirects for old URLs.
  - Do not delete the backend family/guardian domain blindly if student ownership and contact data still depend on it.

## 7. Admin panel: schools and payments

- [ ] Add school types `استثنائی` and `بین المللی`.
  - Frontend: `apps/web/src/features/admin-schools/school-form-dialog.tsx` and school API types.
  - Backend: `apps/api/src/modules/schools/school.dto.ts`, schools service/controller, and `apps/api/src/database/schemas/schools.schema.ts`.
  - Update database enums/check constraints using a new migration.
  - Add backward-compatibility tests for existing school records.

- [ ] Add school manager name, school manager mobile number, and school phone number.
  - Validate the mobile number with fixed `09` plus nine digits.
  - Validate the current requested landline format with fixed `021-` plus eight digits.
  - If schools outside Tehran are possible, revise the fixed `021` rule before implementation.
  - Do not make manager mobile globally unique unless the business rules require it.
  - Do not expose manager personal contact data through public school-directory APIs.

- [ ] Replace manual admin payment-date entry with the Persian/Jalali date component or selectors.
  - Primary location: `apps/web/src/features/admin-payments/payment-actions.tsx` and related payment/contract pages.
  - Preserve a single canonical API and database date representation.

## 8. Detailed file-by-file implementation guide

This section turns the requirements above into concrete work packages. A junior developer should complete them in order because later tasks depend on the contracts and migrations introduced by earlier tasks.

### Work package A — establish shared terminology and constants

#### Current state

- The public site name is centralized in `apps/web/src/lib/route-metadata.ts` as `SITE_NAME`, but several pages still contain hard-coded `سامانه سرویس مدرسه` text.
- Routes, folder names, API roles, and components still use `parent`, `family`, and `PARENT`.
- Those words currently have two meanings: the authenticated guardian account and the UI name of the panel. Replacing every source-code identifier at once would be risky.

#### Required changes

- [x] In `apps/web/src/lib/route-metadata.ts`, change `SITE_NAME` to `ثمین گشت مهر ایران` and update the public metadata descriptions.
- [x] Run a repository-wide search for the old brand and classify every result before changing it:
  - User-facing text: replace it.
  - Test expectation: update it after the UI change.
  - Historical migration or immutable contract snapshot: do not alter without a data/legal migration decision.
  - Domain identifier such as `PARENT`: handle through the compatibility plan below, not a blind search-and-replace.
- [x] Where public pages repeat the brand, import the shared constant if server/client boundaries permit it. Otherwise create a small dependency-free brand constants module usable by both environments.
- [ ] Decide whether the backend role remains `PARENT` temporarily while the UI says `دانش آموزان`.
  - Recommended first release: retain the persisted/API role `PARENT` for compatibility, change visible labels and routes, then migrate the role in a separate controlled release if the domain truly requires it.
  - Document this temporary mapping in code comments and API types so developers do not accidentally create both `PARENT` and `STUDENT` accounts.
- [x] Add a test in `apps/web/src/lib/route-metadata.test.ts` for the new site name and updated audience labels.

#### Verification

- [x] Search for `سامانه سرویس مدرسه` and review every remaining match manually.
- [ ] Open every public page and confirm browser title, heading, header, footer, CTA, and contract wording.
- [x] Confirm no authorization behavior changed as a side effect of text changes.

### Work package B — homepage CTA and WebP conversion

#### Current state

- Homepage presentation is split across `apps/web/src/app/(public)/page.tsx` and `apps/web/src/features/public-home/`.
- Public navigation is in `apps/web/src/components/navigation/public-header.tsx` and `public-footer.tsx`.
- PNG assets are stored in `apps/web/public/images/`, and `apps/web/public/images.zip` may contain a second stale copy.

#### Required changes

- [x] Search for `ثبت نام دانش آموز`, related spacing variants, and links to `/register` or `/login`.
- [x] Change the visible CTA to `ثبت نام و ورود` in `public-hero.tsx`, `final-registration-cta.tsx`, the public header, and any banner that independently renders the action.
- [x] Point all instances to one approved route. Recommended: `/login`, because the new flow determines whether the phone is new or existing.
- [x] Add or update E2E assertions in `apps/web/e2e/public-pages.spec.ts` so the CTA label and destination cannot drift.
- [x] Inventory every image reference before conversion. Record source path, displayed dimensions, transparency, and whether it contributes to LCP.
- [x] Convert each PNG to WebP using one documented quality policy. Keep exact pixel dimensions unless resizing is separately approved.
- [x] Update component imports/paths and any CSS `url(...)` values.
- [x] Check `next.config.ts` only if image domains or formats need configuration; local WebP files require no remote-domain exception.
- [ ] After visual and performance approval, remove only PNGs that have no remaining references. Rebuild or remove `images.zip` deliberately.

#### Verification

- [x] `rg` finds no code reference to a removed PNG.
- [ ] Pages do not show broken images at mobile, tablet, or desktop sizes.
- [ ] Visual quality is acceptable around faces, text, gradients, and transparency.
- [ ] Run the scripts documented in `apps/web/performance/README.md`; LCP, CLS, and asset budgets must not regress.

### Work package C — split user and admin authentication

#### Current state

- `apps/web/src/features/auth/auth-forms.tsx` renders one `OtpAuthForm` with `PARENT` and `ADMIN` choices.
- `apps/web/src/features/auth/auth-api.ts` defines `AuthRole = 'PARENT' | 'ADMIN'` and calls `/auth/request-otp` and `/auth/verify-otp` for both.
- `apps/api/src/modules/identity/application/auth.service.ts` currently authenticates admins using phone plus OTP; it does not require a password before OTP.
- `adminUsers` already has username and phone fields, but admin creation currently does not accept a password.
- Existing sessions and refresh-token rotation are already implemented. Extend them rather than replacing them.

#### Backend sequence

- [x] Inspect `adminUsers` in `apps/api/src/database/schemas/auth.schema.ts` and add a nullable `passwordHash` column in a new migration.
  - Make it nullable during rollout so existing admins can be migrated safely.
  - Backfill passwords through a secure administrative procedure, never a shared default password. (deferred: needs a secure admin password-reset provisioning flow)
  - After all active admins are migrated, add a later `NOT NULL` constraint if appropriate. (deferred)
- [x] Add DTOs for admin password login in the identity presentation layer:
  - `AdminPasswordChallengeDto`: username and password.
  - `AdminOtpVerificationDto`: challenge ID and OTP.
  - Apply username length/character limits and a reasonable password input maximum to prevent resource abuse.
- [x] Add dedicated endpoints, for example:
  - `POST /auth/admin/password-challenge`
  - `POST /auth/admin/verify-otp`
  - Do not overload the existing user endpoints with optional password fields.
- [x] In `AuthService`, verify the password hash with Argon2 and issue a random, single-use, two-minute admin challenge.
  - Store only a hash of the challenge token.
  - Bind the challenge to admin ID, purpose, expiry, attempt count, and the request context required by the security design.
  - Return the same generic error for unknown username, wrong password, inactive account, and invalid OTP where practical.
- [x] Send the OTP only after password verification succeeds.
- [x] Consume the challenge and OTP atomically so concurrent requests cannot use either value twice.
- [x] Generate the existing admin access/refresh session only after both factors succeed.
- [x] Extend `auth.otp-concurrency.test.ts`, `auth.session-concurrency.test.ts`, and controller IP tests with admin two-factor cases.

#### Frontend sequence

- [x] Refactor `auth-forms.tsx` into reusable user OTP components and a separate admin form. Do not keep an `ADMIN` tab on the public login form.
- [x] Create `apps/web/src/app/admin/login/page.tsx` with:
  - Username field.
  - Password field with `autocomplete="current-password"`.
  - First-step submit button.
  - OTP field after challenge creation.
  - Persian inline errors and a two-minute countdown.
- [x] Add typed API functions in `auth-api.ts` for both new admin endpoints. Model the challenge response and never store the password in the React state longer than needed.
- [x] Update `apps/web/src/app/admin/layout.tsx` and the session guard so `/admin/login` is public but every other admin route requires an admin role.
- [x] Ensure an authenticated normal user cannot enter admin pages and an authenticated admin is not redirected to the student panel.
- [x] Update public `/login` text so it no longer says admins can sign in there.

#### Admin account management

- [x] Add password and password-confirmation fields to `apps/web/src/features/admin-admins/admin-account-form.tsx` when creating an admin.
- [x] For editing, leave password blank to mean “unchanged”; use a separate explicit reset action if possible.
- [x] Update `admin-admins-api.ts`, controller DTOs, and `AuthService.createAdmin/updateAdmin` to hash passwords server-side.
- [x] Never return `passwordHash` through a query or response schema.
- [x] Add disable/remove UI through `admin-account-action.tsx`; reuse `setAdminStatus` because it already revokes active sessions when an admin becomes inactive.
- [x] Add a service guard that refuses to disable the acting admin or the last active super-admin.

### Work package D — OTP expiry and remembered sessions

#### Current state

- `OTP_EXPIRY_SECONDS` defaults to 300 in `apps/api/src/config/config.service.ts`.
- OTP responses already include `expiresAt` and `cooldownSeconds`.
- The current frontend does not display a countdown or resend button.
- Refresh sessions already exist, but the login UI has no explicit remember-me choice.

#### Required changes

- [x] Change the configuration default and every example environment file to `OTP_EXPIRY_SECONDS=120`.
- [x] Search deployment files and documentation for overrides of 300 seconds and update them.
- [x] Do not hard-code 120 in verification logic. Continue using the stored backend expiry generated from configuration.
- [x] In the OTP UI, calculate remaining time from the server-provided `expiresAt`, not from “two minutes after render.”
- [x] Display Persian expired state, such as `زمان اعتبار کد به پایان رسیده است.` and disable verification until a new code is requested.
- [x] Add resend behavior using `cooldownSeconds`; avoid parallel resend requests and reset the OTP input after a successful resend.
- [x] Add remember-me to the initial normal-user login and the admin login only after the session duration decision is approved.
- [x] Pass a boolean such as `rememberMe` at session creation. The backend, not the browser, selects the refresh-session expiry.
- [x] Keep access tokens short-lived in both cases. Only the refresh session should be extended.
- [x] Ensure cookie creation in the auth controller uses `HttpOnly`, production `Secure`, and the agreed `SameSite`, path, and maximum age.
- [x] Logout must revoke the current server session and clear cookies for both remembered and normal sessions.

#### Tests

- [x] Add time-controlled tests for valid at 119 seconds, invalid at 120 seconds, and invalid after 120 seconds according to the exact comparison semantics selected.
- [x] Test resend invalidates or supersedes old OTPs as intended.
- [x] Test remembered and normal session expiries, refresh rotation, logout, disabled accounts, and refresh-token reuse.

### Work package E — user-role selector and first-time onboarding

#### Current state

- `auth-forms.tsx` supports only `PARENT` and `ADMIN`.
- `AuthService.verifyAuthOtp` immediately inserts a `users` row for an unknown parent phone and sends `ACCOUNT_REGISTERED`.
- The frontend then always stores a session and redirects to `/parent/dashboard`.
- This behavior conflicts with the requirement that a new phone enter enrollment first and receive a panel only after contract and prepayment success.

#### Required design

- [x] Separate a verified enrollment identity/challenge from an active panel account.
  - Recommended: create a short-lived onboarding session or a `registration_leads`/`onboarding_sessions` record after OTP verification.
  - Do not grant normal panel access with that onboarding credential.
  - Scope it only to the guided-enrollment endpoints required for completion.
- [x] Decide whether an existing incomplete onboarding resumes its draft or starts a new one. Enforce one active onboarding per normalized guardian phone.
- [x] Move `users` creation, welcome notification, and full session issuance to the successful finalization transaction after contract acceptance and verified prepayment.
- [x] Add explicit onboarding state and expiry fields. Do not infer completion only by checking whether several unrelated rows happen to exist.

#### Frontend steps

- [x] Replace the two-option account fieldset with three cards:
  - `دانش آموزان`: active and selected by default.
  - `مدیران مدارس`: selectable but shows `این بخش به‌زودی فعال می‌شود` and does not submit.
  - `رانندگان`: same temporary behavior.
- [x] Use the label `شماره همراه سرپرست دانش آموز` for student login.
- [x] Keep UI-only role identifiers separate from backend auth roles, for example `STUDENT_PORTAL`, `SCHOOL_MANAGER_COMING_SOON`, and `DRIVER_COMING_SOON`, so unavailable choices cannot be sent as valid API roles.
- [x] After OTP verification, inspect the typed backend result:
  - Existing active account → create the normal session and redirect to the student dashboard.
  - New/incomplete phone → store the restricted onboarding state and redirect to the enrollment route.
- [x] Update `portal-session-guard.tsx` so onboarding credentials cannot access the regular panel.

#### Backend and data steps

- [x] Add an onboarding table or extend the registration schema with phone, verified time, expiry, current step, status, and draft ownership.
- [x] Hash any bearer onboarding token and rotate or invalidate it after successful completion.
- [x] Make finalization one transaction where possible: create user/guardian ownership, activate student access, associate enrollment/contract/payment, mark onboarding completed, and enqueue welcome notification.
- [x] If external payment prevents one database transaction across the whole process, use explicit durable states and idempotent compensating actions.
- [x] Add cleanup for expired onboarding records without deleting completed financial or contract history.

### Work package F — rebuild enrollment validation around a shared contract

#### Current state

- `EnrollmentFormState` explicitly contains father, mother, emergency, district, and no primary guardian or student phone/home phone.
- `GuidedEnrollmentInput` and backend `GuidedEnrollmentDto` require father, mother, and emergency contact.
- DTO validation checks lengths and number patterns but does not consistently produce field-keyed Persian messages.
- Existing national-ID helpers already implement reusable validation.

#### Shared model first

- [x] Write a field matrix before editing UI. For every field record:
  - JSON path and database destination.
  - Persian label.
  - Required or optional behavior.
  - Normalization.
  - Frontend rule.
  - Backend rule.
  - Exact Persian error messages.
- [x] Add shared frontend validation modules, for example:
  - `apps/web/src/features/enrollment/enrollment-schema.ts`
  - `apps/web/src/features/enrollment/input-normalizers.ts`
  - `apps/web/src/features/enrollment/persian-text.ts`
- [x] Keep API input types derived from or checked against the schema to avoid updating `EnrollmentFormState` but forgetting `GuidedEnrollmentInput`.
- [x] On the backend, split nested DTO classes into clearly named exported or tested classes rather than keeping every rule compressed onto one line.
- [x] Add explicit Persian messages to `class-validator` decorators or translate structured validation errors in `apps/api/src/common/filters.ts`.
- [x] Ensure error responses contain a stable field path such as `guardian.nationalId`, not only a combined English sentence.

#### Guardian and optional contacts

- [x] Replace the assumption that both father and mother are mandatory with a mandatory `guardian` object.
- [x] Suggested guardian fields: firstName, lastName, nationalId, phoneNumber, relationshipType, and optional relationshipDescription.
- [x] Obtain guardian phone from the verified onboarding/session context. Ignore or reject a different client-supplied value.
- [x] Keep father, mother, and emergencyContact nullable/optional in TypeScript, DTOs, services, and database writes.
- [x] In `registrations.service.ts` guided enrollment, insert/update only optional records that were actually provided.
- [x] If the current `parents` schema requires father/mother rows, create a migration that supports a generic guardian relationship before changing service code.
- [x] Preserve existing father/mother data and map it to the new representation; do not erase records during migration.

#### Phone fields

- [x] Add `studentPhone?: string` and `homePhone: string` to form state, API input, DTO, schema, and persistence destination.
- [x] Build a prefix input component or compose an input with a non-editable prefix element.
- [x] Store only the nine editable mobile digits in local field state if that simplifies UX, but send/store the normalized full number.
- [x] Accept Persian/Arabic digits through normalization, then validate `^09\d{9}$` for mobile and `^021\d{8}$` for the requested Tehran landline.
- [x] Reject extra digits even if pasted. Do not silently truncate a value because that can change the intended phone number.
- [x] Provide exact field errors such as `شماره همراه باید با ۰۹ شروع شود و ۱۱ رقم باشد.` and `شماره تلفن منزل باید شامل پیش‌شماره ۰۲۱ و ۸ رقم باشد.`

#### Persian text

- [x] Define a tested Unicode regular expression covering Persian letters, approved Arabic variants, space, optional half-space, and `،`.
- [x] Normalize presentation variants only when normalization does not change legal identity data unexpectedly.
- [x] Validate on blur and submit; do not prevent every keydown because IME, mobile keyboards, accessibility tools, and paste may break.
- [x] Show `لطفاً صفحه‌کلید را به فارسی تغییر دهید` when Latin letters are detected.
- [x] Apply stricter text rules only to approved name/relationship fields. Address and notes need a broader character set.

#### Required and optional behavior

- [x] Remove HTML `required` attributes or use `noValidate` consistently if native English browser messages can appear.
- [x] Keep the visual required marker hidden if product does not want required/optional labels, but preserve programmatic accessibility and validation.
- [x] For an entirely blank optional object, send `undefined`/`null`, not an object full of empty strings.
- [x] If one optional field is entered, validate the minimum coherent set and show errors only in that section.
- [x] In the wizard submit handler, validate the current step, set all field errors, focus the first error, and return without incrementing `step`.

### Work package G — Jalali dates, address, map, and final consent

#### Dates

- [x] Inventory every date input in enrollment, student editing, admin payments, contracts, and installment configuration.
- [x] Use `JalaliDateInput` consistently and verify whether it returns a Jalali display string or canonical Gregorian ISO value.
- [x] Make conversion happen at one boundary. Recommended: UI displays Jalali; API sends a documented Gregorian date-only `YYYY-MM-DD` value.
- [x] Do not call `new Date(dateOnlyString)` casually for a birth date because timezone conversion can shift the calendar day.
- [x] Add leap-year, Esfand, invalid-day, minimum/maximum age, and timezone tests in `jalali-date.test.ts` and component tests.

#### District removal and address validation

- [x] Search `district` across web, API, schemas, contract rendering, pricing, reports, seeds, and tests.
- [x] First make the field optional/ignored in new requests while preserving reads of old records.
- [x] Remove it from `EnrollmentFormState`, the UI step, `GuidedEnrollmentInput`, `AddressDto`, and new contract snapshots.
- [x] Keep the database column through at least one compatibility release if old contracts or reports display it.
- [x] Make address title, province, city, street address, ten-digit postal code, latitude, and longitude mandatory in frontend and backend.
- [x] Do not accept the default map center as user consent to a location. Track an explicit `locationSelected` flag or require a marker-change event.

#### Map repair workflow

- [x] Run the existing tests for `location-picker.test.tsx` and the tile route test before modifying code.
- [ ] Inspect browser network requests for `/api/map-tiles/...`: distinguish a missing tile, 4xx provider response, CSP block, server error, or zero-height map container.
- [x] Validate z/x/y parameters in the tile route and use bounded timeouts and safe caching.
- [ ] Confirm tile-provider terms permit proxying/caching and include required attribution.
- [x] Render a Persian retry/error state if tiles fail; the rest of the address form must remain understandable.
- [x] Store latitude/longitude only after explicit selection and validate geographic bounds server-side.

#### Notes and notification consent

- [x] Rename the label to `توضیحات` without renaming the persisted `parentNotes` field in the same release unless an API migration is planned.
- [ ] Add notification-consent fields to the final contract/onboarding step only after the consent text is approved.
- [ ] Suggested data model: user ID, channel, purpose, granted boolean, text version, source, granted/revoked time, and updatedBy.
- [ ] Do not use one boolean for legally required service notices and optional marketing messages; model purposes separately.
- [ ] Add a settings endpoint and panel form. Use optimistic UI only if failure is surfaced and reverted correctly.

### Work package H — student-panel route migration and student limits

#### Route migration

- [x] Create the new `apps/web/src/app/student/` route tree by moving or wrapping current parent pages one section at a time.
- [x] Rename `parent-shell` and `parent-dashboard` components only after imports are mapped; avoid a single enormous rename mixed with behavior changes.
- [x] Update `route-metadata.ts`, breadcrumbs, navigation links, redirects, session guards, E2E fixtures, and test expectations.
- [x] Add redirects for every old route, including dynamic student and contract URLs. Preserve query strings where they are meaningful.
- [x] Keep backend ownership keyed to the authenticated guardian/user ID even though the visible panel is called the student panel.
- [x] Add a homepage link to the shell navigation using a normal `Link`; it must not call `logout()` or clear `auth-session.ts`.

#### Two-student limit

- [x] Add an account-level `studentLimit` with default 2, or calculate `2 + approved increments`. Prefer an explicit effective limit if support staff need to inspect it easily.
- [x] Count active/non-deleted students according to a documented rule. Decide whether archived, rejected, cancelled, and draft students consume capacity.
- [x] In the service method that creates a student, lock the owner/account row or otherwise serialize the count-and-insert operation.
- [x] Return a stable error code such as `STUDENT_LIMIT_REACHED`; map it to a Persian panel message.
- [x] Disable the new-enrollment action in the UI when the returned capacity is exhausted, but retain backend enforcement.
- [x] Display the requested responsibility warning before final creation of an additional student.

#### Limit-increase requests

- [x] Create a migration and schema for requests with a unique constraint preventing more than one pending request per account.
- [x] Add user endpoints to create and view the current request; derive requester from the authenticated session.
- [x] Add admin endpoints to list, approve, and reject with role guards and reviewer audit data.
- [x] Approve in a transaction that locks the request, verifies it is still pending, increases the limit once, and marks it approved.
- [x] Add student and admin UI states for pending, approved, and rejected requests, including a Persian rejection reason if supplied.

### Work package I — admin student and registration management

#### Student removal/archive

- [x] Review `archive-student-button.tsx`, `admin-students/student-actions.tsx`, and existing service methods before adding another “remove” concept.
- [x] Define the button label and behavior clearly: recommended `غیرفعال‌سازی` or `بایگانی` for ordinary admins, not irreversible deletion.
- [x] Require a confirmation dialog that names the student and explains the effect on panel access, enrollment, transport service, and financial history.
- [x] Add a reason field and audit actor/time. Preserve contracts and payments.
- [x] If permanent erasure is legally required, implement it as a separate privileged retention workflow, not the list-page action.

#### Full admin edit form

- [x] Replace the narrow `apps/web/src/features/students/student-form.tsx` admin use with the same sections and validation contract used by guided enrollment.
- [x] Remove `className` from the visible edit form and update `students-api.ts` request types.
- [x] Build tabs/steps for identity, guardian/contacts, address/map, school/service, contract, and payment so the form remains understandable.
- [x] Fetch one complete authorized admin DTO rather than stitching together public/student endpoints in the browser.
- [x] On save, send only editable fields or use version/updatedAt checks to prevent one admin overwriting another’s recent change.
- [x] Audit sensitive before/after values with masking rules.

#### Admin-created student

- [x] Keep `admin-family-enrollment-form.tsx` but refactor it to consume the shared enrollment sections and schema. (form now builds a `GuidedEnrollmentInput` and validates with the shared `guidedEnrollmentSchema`)
- [x] Add the verified/selected guardian phone and create or associate the correct account without duplicating users. (guardian phone is the family's verified primary phone; reuse `getOwnedParentByNationalId` + duplicate-student guard, no duplicate `users` row)
- [x] Let the authorized admin accept/sign the contract on the student's behalf only if the legal model permits it; record signer role, actor ID, timestamp, contract version, and reason/source. (recorded via new `contracts` columns `acceptedByAdminId`, `signerRole`, `signerReason`, `signerSource`; actor/timestamp/version captured in audit `CONTRACT_ACCEPTED_BY_ADMIN`. Deviation: `signerRole` is a denormalized copy of the contract-status owner; accept/reject stays parent-only, no admin force-cancel)
- [x] Create an offline/cash prepayment transaction using the existing payment domain rather than directly marking schedule rows paid. (inserts a `SUCCEEDED`/`MANUAL_ADMIN_ENTRY` payment transaction with `gatewayTransactionId` = receipt reference and `recordedByAdminId`; schedule row/plan status derived from the payment)
- [x] Display the Persian cash warning before confirmation and require receipt/reference information. (`CASH_RECEIPT_REQUIRED` at transport + warning panel + required receipt/paidAt/description in the UI)
- [x] Preserve the existing rollback guarantees in `admin-guided-enrollment.rollback.test.ts` and add duplicate-phone/idempotency cases. (audit-failure rollback, `CONTRACT_ACCEPTANCE_REQUIRED`, `CASH_RECEIPT_REQUIRED`, duplicate-student no-touch, guardian-phone reuse)

#### Filters, sorting, and registration status groups

- [x] Define query parameters centrally, for example `archive=all|active|archived`, `sort=studentName|schoolName|createdAt`, and `direction=asc|desc`.
- [x] Validate them in DTOs and map values to an allowlisted Drizzle expression in services.
- [x] Add school name to the backend select used by admin registration rows; do not perform one school request per row.
- [x] Return pagination metadata and preserve filter/sort query parameters across pages.
- [x] Create and test one status-group mapper for the requested Persian filters. The UI sends a product group, and the service expands it to the appropriate detailed lifecycle statuses.
- [x] Decide Persian collation behavior with PostgreSQL and test representative Persian names rather than assuming JavaScript A→Z is correct.

#### Removing the families section

- [x] List every action currently available in `apps/web/src/app/admin/families/**` and `features/admin-families/**`. (list page, family detail with I3 enrollment form, parent add/edit/delete, address edit, emergency-contact edit; API functions `getAdminFamilies`, `getAdminFamily`, `create/update/deleteFamilyParent`, `createAdminFamilyEnrollment`, `create/updateAdminFamilyAddress`, `updateAdminFamilyEmergencyContact`)
- [x] Map each still-required action to a student-detail or guardian subsection before removing navigation. (parent add/edit, emergency contact, and address were already in `StudentEditDialog` from I2; added parent **delete** to the guardian tab there. I3 enrollment form and family info stay on `/admin/families/[familyId]`, reachable via the clickable family name in the students list)
- [x] Add route redirects from family detail URLs when a safe equivalent exists; otherwise render a migration notice/404 according to product policy. (`/admin/families` now `redirect('/admin/students')`; `/admin/families/[familyId]` retained and linked from student rows; route policy updated with `redirectTo`)
- [x] Remove menu entries and route metadata only after transferred actions pass E2E tests. (removed the `خانواده‌ها` nav entry from `admin-shell.tsx`; route metadata keeps `/admin/families` as a redirect policy and `/admin/families/[familyId]` as a live route; web suite green)
- [x] Retain backend family/parent tables and services needed for ownership, guardians, contacts, and old records. (all `/admin/families/*` endpoints and the families service untouched)

### Work package J — schools and admin date controls

#### School fields

- [ ] Inspect whether `schoolType` is a database enum, varchar with validation, or both. Update every layer consistently.
- [ ] Add stable internal values such as `SPECIAL` and `INTERNATIONAL`; map them to `استثنائی` and `بین المللی` in the UI.
- [ ] Never store Persian display strings as enum values if the existing schema uses English constants.
- [ ] Add manager name, manager phone, and school phone columns through a nullable migration so existing schools remain valid.
- [ ] Update `school.dto.ts`, controller/service selections, `admin-schools-api.ts`, `school-form-dialog.tsx`, and tests.
- [ ] Keep manager contact fields out of `apps/web/src/features/schools/schools-api.ts` if that API feeds the public school directory.
- [ ] Normalize and validate phone values server-side. Decide whether landline `021` remains mandatory before enforcing it for every school.

#### Payment-date UI

- [ ] Locate date inputs in `admin-payments/payment-actions.tsx`, installment configuration, contracts, and any pricing forms.
- [ ] Replace free-text/date typing with the shared Jalali picker.
- [ ] Convert the chosen date to the canonical API format before sending `ConfigureInstallmentsDto`.
- [ ] Validate that installment dates are real, ordered according to business rules, not duplicated, and appropriate relative to contract/start dates.
- [ ] Display backend date errors in Persian at the exact installment row rather than only at the dialog top.

## 9. Testing, migration, and delivery

- [ ] Add forward-only migrations for authentication, guardian/contact fields, notification consent, limit requests, and new school fields.
- [ ] Run migrations against a sanitized production-like snapshot and verify rollback or forward-fix procedures.
- [ ] Add unit tests for mobile, landline, postal code, national ID, Persian text, and Jalali date validation.
- [ ] Add integration tests for two-minute OTP expiry, admin 2FA, panel activation lifecycle, two-student limits, limit increases, admin cash payment, and transactional rollback.
- [ ] Update or rename:
  - `apps/web/e2e/public-pages.spec.ts`
  - `apps/web/e2e/parent-dashboard.spec.ts`
  - `apps/web/e2e/admin-dashboard.spec.ts`
- [ ] Add accessibility tests for field errors, focus management, the date picker, and the map.
- [ ] Test on real mobile-sized viewports, especially number keyboards, dates, upload, map interaction, and the multi-step form.
- [ ] Add visual comparison for WebP conversion and run performance checks to ensure LCP and CLS remain within budget.
- [ ] Roll out admin 2FA, the new onboarding flow, and new panel routes behind suitable feature flags.
- [ ] Document a rollback or forward-fix plan before production deployment.
- [ ] Verify redirects, old links, metadata, sitemap behavior, and caches after deployment.
- [ ] Have a Persian-language reviewer and the product/legal owners approve all final Persian messages.

## Mandatory security and caution notes

> **Warning:** These changes affect admin authentication, OTPs, children’s identity data, home locations, contracts, and payments. Treat this data as highly sensitive. Apply least privilege, strong audit controls, and an independent security review.

- [ ] Never treat the obscurity of `/admin` as protection. Authentication, authorization, and rate limiting remain mandatory.
- [ ] Repeat every important validation rule on the backend. Client data is untrusted.
- [ ] Never store or log plaintext passwords or OTPs.
- [ ] Authentication errors must not reveal whether a particular user or administrator exists.
- [ ] Protect login and resend endpoints against brute force, credential stuffing, account enumeration, and OTP replay.
- [ ] Design lockouts carefully so an attacker cannot trivially deny service to another account.
- [ ] Separate admin and user session scope and roles; protect cookies against fixation, CSRF, and theft.
- [ ] Keep home coordinates private and never expose them through public APIs or logs.
- [ ] Mask national IDs, phones, addresses, coordinates, and contracts in logs, analytics, and error tracking.
- [ ] Extend and test `apps/api/src/common/sensitive-data.ts` for all new sensitive fields.
- [ ] Audit student/admin removal, limit changes, feedback responses, cash payments, contract signing, sensitive profile edits, and consent changes.
- [ ] Back up and dry-run any migration or cleanup. Do not use unchecked cascade deletion across students, contracts, and payments.
- [ ] Use granular RBAC for complete student records. Not every administrator should automatically be able to export records or view precise locations.
- [ ] Keep CSP sources limited to approved application and map origins. Avoid unnecessary wildcards.
- [ ] Review calendar and map dependencies for maintenance status, known vulnerabilities, and license compatibility; pin approved versions.
- [ ] Before production, perform threat modeling and focused security testing for admin login, OTP, IDOR in student/contract endpoints, and payment transitions.

## Definition of done

- [ ] Every applicable checkbox is implemented, reviewed, and tested.
- [ ] No unintended old branding or parent-panel terminology remains.
- [ ] Backward-compatible redirects are active and tested.
- [ ] Migrations and operational recovery procedures pass in staging with production-like data.
- [ ] Security, accessibility, performance, mobile behavior, and Persian localization requirements pass review.
- [ ] Environment documentation includes all map and authentication settings required by this phase.
- [ ] Backup, cleanup, incident-response, and support runbooks are updated.
- [ ] Product, Persian-language, legal, and security owners have recorded final approval for release.

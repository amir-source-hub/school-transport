# Comprehensive Modification Plan

> Document status: audited implementation checklist (2026-08-08). Current result: **212 finished and verified**, **2 finished but not verified**, and **51 not finished**.
>
> Target brand name: **ثمین گشت مهر ایران**

## How to use this document

- Each main task and acceptance criterion has a checkbox. Check an item only after implementation, testing, and review are complete.
- Audit tags (2026-08-08): **FINISHED · VERIFIED** means the relevant implementation was inspected across its code path and found correctly wired; **FINISHED · NOT VERIFIED** means implementation exists but correctness still depends on an uninspected, manual, production, or external condition; **NOT FINISHED** means implementation, a required decision, or required evidence is incomplete.
- Verification is based on inspection of the relevant UI/API/service/schema/migration/security flow. Tests are supporting evidence, not the definition of verification. The supporting baseline passed: `pnpm test` (417 tests: 276 API + 141 web), `pnpm typecheck`, and `pnpm lint` with one warning in the untracked temporary file `apps/web/e2e/__tmp-inspect.spec.ts`.
- All paths are relative to the repository root. Paths marked **new file** do not currently exist and are suggested implementation locations.
- Make database changes through new forward-only migrations. Do not rewrite old migrations or production data manually.
- Changing “family/parent” to “student” is not only a text replacement. Review domain terminology, routes, API contracts, roles, permissions, links, tests, and backward compatibility.
- Read the acceptance criteria and security section before beginning each feature.

## Product decisions required before final implementation

- [x] Decide the exact lifetime of normal and “remember me” sessions. Suggested starting point: a short normal session and a maximum seven-day remembered session using rotating refresh tokens. **APPROVED: normal refresh session 24h (86,400s), remembered refresh session 7 days (604,800s); both roles; access tokens remain 1h.** **[FINISHED · VERIFIED]**
- [x] Clarify “remove an unsuccessful enrollment.” The safer design is an expiring incomplete draft with scheduled cleanup, not immediate hard deletion, so auditing and abuse prevention remain possible. **[FINISHED · VERIFIED]**
- [x] Define the exact lifecycle mapping for the four requested admin registration filters: `همه`، `پیش ثبت نام انجام شده`، `تسویه کامل`، `در حال سرویس دهی`. **[FINISHED · VERIFIED]**
- [x] Choose the new student-panel route, such as `/student`, and define redirects from existing `/parent/*` URLs. **[FINISHED · VERIFIED]**
- [ ] Approve the legal text and channels covered by notification consent, including SMS and in-app notifications. **[NOT FINISHED]**
- [x] Define the extra-student request policy: required reason, permitted reviewers, approval states, increment size, and maximum allowed limit. **Policy: reason required; privileged admin review; pending/approved/rejected states; +1 per approval; hard maximum 5.** **[FINISHED · VERIFIED]**

## 1. Branding and homepage

Primary files:

- `apps/web/src/lib/route-metadata.ts`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/components/navigation/public-header.tsx`
- `apps/web/src/components/navigation/public-footer.tsx`
- `apps/web/src/app/(public)/**`
- `apps/web/src/features/public-home/**`
- `apps/web/src/app/parent/contracts/[contractId]/page.tsx`

- [x] Replace every user-facing occurrence of `سامانه سرویس مدرسه` with `ثمین گشت مهر ایران`. **[FINISHED · VERIFIED]**
  - Search the entire repository in Unicode mode.
  - Review page metadata, browser titles, public pages, header/footer, FAQ, contact content, contracts, notifications, API messages, SMS templates, and tests.
  - Keep the brand in one shared constant such as the existing `SITE_NAME` whenever possible.
  - Acceptance: a repository-wide search finds no unintended occurrence of the old name.

- [x] Change the homepage action `ثبت نام دانش آموز` to `ثبت نام و ورود`. **[FINISHED · VERIFIED]**
  - Likely locations: `public-hero.tsx`, `final-registration-cta.tsx`, the public header, and homepage banners.
  - Ensure the button opens the new student login/registration flow.

- [x] Convert and compress images in `apps/web/public/images/` to WebP. **All 51 pairs were dimension-checked and pixel-compared before unreferenced PNG removal; the deterministic asset budget passes.** **[FINISHED · VERIFIED]**
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

- [x] Create a separate admin login at `/admin/login`. **[FINISHED · VERIFIED]**
  - Suggested new page: `apps/web/src/app/admin/login/page.tsx`.
  - Remove admin login choices from the normal user login page.
  - Unauthenticated access to `/admin/*`, except `/admin/login`, must redirect to `/admin/login`.
  - A less-visible URL is not a security control. Every admin endpoint must still enforce roles and permissions server-side.

- [x] Require two-step admin authentication: username and password, followed by SMS OTP. **[FINISHED · VERIFIED]**
  - The first API step should verify the password and issue a short-lived, single-use challenge.
  - The OTP step should accept only that challenge and create the admin session after successful verification.
  - Hash passwords with Argon2id or another project-approved password hashing algorithm.
  - Never log passwords, OTP values, or reusable authentication secrets.

- [x] Update admin creation and editing to use username, password, and an OTP-capable mobile number. **[FINISHED · VERIFIED]**
  - Frontend: `apps/web/src/features/admin-admins/admin-account-form.tsx` and `admin-admins-api.ts`.
  - Backend: extend the identity/admin service and auth schema or create a dedicated admin-account module if one is absent.
  - Changing username, password, or mobile number must require suitable re-authentication, revoke old sessions where appropriate, and generate an audit entry.

- [x] Add a remove/disable action to `/admin/admins`. **[FINISHED · VERIFIED]**
  - Prevent an admin from deleting themselves.
  - Prevent removal of the final super-admin.
  - Prefer disabling or soft deletion to hard deletion.
  - Require confirmation, permission checks, and audit logging.

- [x] Set every user and admin OTP to expire after exactly two minutes. **[FINISHED · VERIFIED]**
  - The backend expiry timestamp is authoritative; a browser countdown is informational only.
  - Add a visible Persian countdown and controlled resend behavior.
  - OTPs must be single-use and protected by per-account and per-IP rate limits and attempt limits.
  - Test boundary behavior at 119, 120, and 121 seconds.

- [x] Add a `مرا به خاطر بسپار` option. **[FINISHED · VERIFIED]**
  - Confirm the exact duration before implementation.
  - Store long-lived authentication only in `HttpOnly`, `Secure`, appropriately scoped `SameSite` cookies, not localStorage.
  - Use refresh-token rotation and revoke remembered sessions on logout, password changes, or security-sensitive account changes.
  - Extend the existing session-concurrency tests in `apps/api/src/modules/identity/application/`.

## 3. User login and panel-creation lifecycle

- [x] Display three user choices: `دانش آموزان`، `مدیران مدارس`، `رانندگان`. **[FINISHED · VERIFIED]**
  - Replace the current `خانواده` choice with `دانش آموزان`.
  - For now, school managers and drivers should be selectable but disabled from proceeding, with a clear Persian message such as `این بخش به‌زودی فعال می‌شود`.
  - Do not create incomplete endpoints or sessions for the unavailable roles.
  - System admins must not be included here; they use `/admin/login`.

- [x] Change the student-login phone label to `شماره همراه سرپرست دانش آموز`. **[FINISHED · VERIFIED]**

- [x] Send a first-time verified phone number directly into enrollment. **[FINISHED · VERIFIED]**
  - Check whether the phone already exists transactionally to prevent duplicate accounts during concurrent requests.
  - Do not create or activate the student panel until enrollment, contract signing, and prepayment are all successful.
  - Define an explicit state machine in `apps/api/src/modules/registrations/registration-lifecycle.ts`, for example:
    - `PHONE_VERIFIED`
    - `ENROLLMENT_COMPLETE`
    - `CONTRACT_SIGNED`
    - `PREPAYMENT_PAID`
    - `PANEL_ACTIVE`

- [x] Allow a failed or interrupted first enrollment to be attempted again. **[FINISHED · VERIFIED]**
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

- [x] Add a `سرپرست` section to the first enrollment step. **[FINISHED · VERIFIED]**
  - Show the phone number used during login as read-only.
  - Enforce immutability in the backend; a disabled or hidden input alone is not sufficient.
  - Collect guardian name, national ID, and relationship.
  - Relationship choices: `پدر`، `مادر`، `سایر`.
  - When `سایر` is selected, reveal a required relationship-description field for values such as `پدربزرگ` or `عمو`.

- [x] Make only the student and primary guardian sections mandatory. **[FINISHED · VERIFIED]**
  - Father, mother, and emergency-contact sections remain optional.
  - Do not display “optional” above optional fields, as requested.
  - If the user begins filling an optional section, validate the fields required to make that partial record meaningful.
  - Keep frontend and backend required/optional rules identical.

- [x] Add a home phone number. **[FINISHED · VERIFIED]**
  - Display fixed, non-editable prefix `021-`.
  - Allow exactly eight additional digits.
  - Store a normalized canonical value in the backend.

- [x] Standardize mobile phone inputs. **[FINISHED · VERIFIED]**
  - Display fixed, non-editable prefix `09` on the left as requested.
  - Allow exactly nine additional digits, no more and no fewer.
  - The final number is therefore 11 digits, for example `09123456789`.
  - Note: the original example `091234567890` contains 12 digits and must not be used as the validation rule.
  - Normalize Persian and Arabic numerals before validation and store the canonical `09XXXXXXXXX` representation.

- [x] Add an optional student mobile number to the first step. **[FINISHED · VERIFIED]**

- [x] Validate national IDs as exactly ten digits and verify the Iranian national-ID checksum. **[FINISHED · VERIFIED]**
  - Reuse `apps/web/src/features/enrollment/national-id.ts` and `apps/api/src/common/iranian-national-id.ts` rather than creating inconsistent implementations.

### 4.2 Date, language, and validation rules for all steps

- [x] Replace manual date typing with a Persian/Jalali date picker. **[FINISHED · VERIFIED]**
  - Apply it to birth dates, payment dates, and every other date input.
  - Reuse `apps/web/src/components/forms/jalali-date-input.tsx` and `apps/web/src/lib/jalali-date.ts`.
  - If the picker cannot provide reliable mobile behavior, use three selectors for year, month, and day.
  - Do not require users to type `/`, especially when a numeric mobile keyboard is open.
  - Define one canonical backend storage format and test Jalali/Gregorian conversion and timezone boundaries.

- [x] Restrict appropriate personal-name and relationship fields to Persian text. **[FINISHED · VERIFIED]**
  - Permit Persian letters, spaces, and `،` as requested.
  - Decide explicitly whether Persian half-space is accepted; it is usually necessary for valid Persian writing.
  - Normalize Arabic/Persian variants before validation where safe.
  - If Latin letters are entered, show `لطفاً صفحه‌کلید را به فارسی تغییر دهید`.
  - Do not apply this restriction blindly to passwords, codes, addresses, emails, or free-text fields that legitimately need digits or other characters.

- [x] Provide field-level Persian validation for every enrollment input. **[FINISHED · VERIFIED]**
  - Validate in both frontend and backend.
  - Disable native browser validation with controlled validation where needed so English messages such as “Please fill in this field” never appear.
  - Required-field message: `پر کردن این فیلد اجباری است`.
  - Display the error in red directly below the relevant field.
  - Prevent moving to the next step until every error in the current step is resolved.
  - Focus the first invalid field and set `aria-invalid` and `aria-describedby` for accessibility.
  - Map backend errors through `apps/web/src/lib/api-error-feedback.ts`; never show raw English server messages.

- [x] Add explicit validation tests for every field. **[FINISHED · VERIFIED]**
  - Cover empty values, minimum and maximum length, invalid characters, pasted values, Persian numerals, Arabic numerals, English numerals, and boundary values.
  - Ensure optional empty fields pass and partially completed optional sections fail correctly.

### 4.3 Second step: address and map

- [x] Remove `منطقه` from the second form. **[FINISHED · VERIFIED]**
  - Update the UI, form model, DTOs, API types, contract snapshots, and reports.
  - Before removing a database column, verify whether pricing, routing, reporting, or old contracts depend on `district`.
  - Migrate or deprecate old data safely before dropping anything.

- [x] Require the postal code to contain exactly ten digits. **[FINISHED · VERIFIED]**

- [x] Make every field on this step mandatory, including map location. **[FINISHED · VERIFIED]**

- [x] Repair the map. **Tile proxy validation, bounded fetch, seven-day caching, attribution, browser rendering, success and error responses were inspected.** **[FINISHED · VERIFIED]**
  - Review `apps/web/src/components/common/location-picker.tsx`.
  - Review the tile proxy at `apps/web/src/app/api/map-tiles/[z]/[x]/[y]/route.ts`.
  - Check CSP/security headers, tile-provider settings, environment variables, default coordinates, container sizing, and client-side hydration.
  - Add loading and Persian error states, marker selection, mobile interaction, and RTL testing.
  - Do not expose private provider credentials in browser code.

### 4.4 Third step and enrollment completion

- [x] Change `توضیحات برای واحد مسیر` to `توضیحات`. **[FINISHED · VERIFIED]**

- [x] Ask for notification permission after contract signing. **Optional SMS and in-app choices are separate, initially unchecked, versioned, and persisted after contract/prepayment completion.** **[FINISHED · VERIFIED]**
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

- [x] Rename and migrate the family/parent panel to the student panel. **[FINISHED · VERIFIED]**
  - Update routes, breadcrumbs, navigation, metadata, role names, API types, test names, and visible text.
  - Create safe temporary redirects from old `/parent/*` bookmarks to the selected student routes.
  - A terminology change must not weaken ownership or role checks.

- [x] Add a button in the authenticated panel that returns to the homepage without logging the user out. **[FINISHED · VERIFIED]**
  - Put it in the student shell so it is consistently available.

- [x] Allow a guardian account to enroll a maximum of two students by default. **[FINISHED · VERIFIED]**
  - Enforce this rule transactionally in the backend, not only by hiding a button.
  - Show this exact warning in the enrollment experience:
    - `با ثبت دانش آموز دیگر غیر از فرزند خود کلیه تعهدات این دانش آموز نیز برعهده ی شما میباشد.`
  - Product/editorial review may normalize spacing and Persian typography without changing the legal meaning.

- [x] Add an admin-approved extra-student request flow. **[FINISHED · VERIFIED]**
  - Suggested table: `student_limit_requests`.
  - Store requester, current limit, requested increment, reason, status, reviewer, review time, and audit metadata.
  - The admin can approve or reject the request.
  - Approval increases the specific guardian account’s limit by one or by the approved increment.
  - Prevent double approval and concurrent creation beyond the effective limit.

- [x] Add notification-consent settings to the student panel and synchronize them with the consent captured during enrollment. **[FINISHED · VERIFIED]**

## 6. Admin panel: students, registrations, and families

- [x] Add a remove action for students. **[FINISHED · VERIFIED]**
  - Frontend: `apps/web/src/app/admin/students/page.tsx` and `apps/web/src/features/admin-students/student-actions.tsx`.
  - Backend: `apps/api/src/modules/students/students.controller.ts` and `students.service.ts`.
  - Because students may have contracts, payments, and audit history, prefer archive/deactivate or soft deletion.
  - Require confirmation, a reason, appropriate permission, and an audit record.
  - Allow permanent deletion only under an approved retention policy.

- [x] Remove the empty `کلاس` field from the admin student edit form. **[FINISHED · VERIFIED]**
  - Review `apps/web/src/features/students/student-form.tsx`, `students-api.ts`, backend DTOs, and the student schema.
  - Remove the database column only after confirming that reporting or integrations do not use it.

- [x] Allow authorized admins to view and edit all information collected throughout enrollment. **[FINISHED · VERIFIED]**
  - Reuse a shared enrollment schema/component rather than creating a second set of validation rules.
  - Apply granular permissions and before/after audit data to sensitive changes such as national ID, guardian phone, school, location, contract, or payment information.

- [x] Make admin-created student enrollment include all normal enrollment fields and contract signing. **[FINISHED · VERIFIED]**
  - Extend `apps/web/src/features/admin-families/admin-family-enrollment-form.tsx` and the guided-enrollment backend.
  - Display a Persian warning telling the admin that they must collect the prepayment manually and that the system will treat it as paid.
  - Suggested message: `پیش‌پرداخت این دانش‌آموز باید به‌صورت نقدی توسط شما دریافت شود. سامانه پس از ثبت نهایی، مبلغ را پرداخت‌شده در نظر می‌گیرد.`
  - A cash payment record must include amount, receiving admin, date/time, reference or receipt, and audit details; do not use only a checkbox.
  - On successful atomic completion, create/activate the student panel using the guardian phone number.
  - Extend the existing admin guided-enrollment rollback tests.

- [x] Add student archive filters with `همه`، `بایگانی شده`، `فعال` or equivalent approved titles. **[FINISHED · VERIFIED]**

- [x] Add student sorting by student name ascending/descending, school name, and other approved fields. **[FINISHED · VERIFIED]**
  - Implement sorting, filtering, and pagination in the backend.
  - Use an allowlist; never interpolate a raw query-string column into SQL.

- [x] Reduce `/admin/registrations` to the four requested product-status filters. **[FINISHED · VERIFIED]**
  - Visible options: `همه`، `پیش ثبت نام انجام شده`، `تسویه کامل`، `در حال سرویس دهی`.
  - Map the detailed lifecycle states to these labels in one central function.
  - Do not delete the underlying lifecycle history.

- [x] Add student-name A→Z/Z→A sorting, school-name sorting, and a school column to admin registrations. **[FINISHED · VERIFIED]**
  - Define appropriate Persian database collation and null handling.
  - Add indexes where query plans show they are needed.

- [x] Remove the admin “families” panel after moving necessary capabilities into students. **[FINISHED · VERIFIED]**
  - Affected frontend: `apps/web/src/app/admin/families/**` and `apps/web/src/features/admin-families/**`.
  - Add temporary redirects for old URLs.
  - Do not delete the backend family/guardian domain blindly if student ownership and contact data still depend on it.

## 7. Admin panel: schools and payments

- [x] Add school types `استثنائی` and `بین المللی`. **[FINISHED · VERIFIED]**
  - Frontend: `apps/web/src/features/admin-schools/school-form-dialog.tsx` and school API types.
  - Backend: `apps/api/src/modules/schools/school.dto.ts`, schools service/controller, and `apps/api/src/database/schemas/schools.schema.ts`.
  - Update database enums/check constraints using a new migration.
  - Add backward-compatibility tests for existing school records.

- [x] Add school manager name, school manager mobile number, and school phone number. **[FINISHED · VERIFIED]**
  - Validate the mobile number with fixed `09` plus nine digits.
  - Validate the current requested landline format with fixed `021-` plus eight digits.
  - If schools outside Tehran are possible, revise the fixed `021` rule before implementation.
  - Do not make manager mobile globally unique unless the business rules require it.
  - Do not expose manager personal contact data through public school-directory APIs.

- [x] Replace manual admin payment-date entry with the Persian/Jalali date component or selectors. **[FINISHED · VERIFIED]**
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

- [x] In `apps/web/src/lib/route-metadata.ts`, change `SITE_NAME` to `ثمین گشت مهر ایران` and update the public metadata descriptions. **[FINISHED · VERIFIED]**
- [x] Run a repository-wide search for the old brand and classify every result before changing it: **[FINISHED · VERIFIED]**
  - User-facing text: replace it.
  - Test expectation: update it after the UI change.
  - Historical migration or immutable contract snapshot: do not alter without a data/legal migration decision.
  - Domain identifier such as `PARENT`: handle through the compatibility plan below, not a blind search-and-replace.
- [x] Where public pages repeat the brand, import the shared constant if server/client boundaries permit it. Otherwise create a small dependency-free brand constants module usable by both environments. **[FINISHED · VERIFIED]**
- [x] Decide whether the backend role remains `PARENT` temporarily while the UI says `دانش آموزان`. **Decision: retain `PARENT` as the internal ownership/auth role while exposing student-panel terminology in the UI.** **[FINISHED · VERIFIED]**
  - Recommended first release: retain the persisted/API role `PARENT` for compatibility, change visible labels and routes, then migrate the role in a separate controlled release if the domain truly requires it.
  - Document this temporary mapping in code comments and API types so developers do not accidentally create both `PARENT` and `STUDENT` accounts.
- [x] Add a test in `apps/web/src/lib/route-metadata.test.ts` for the new site name and updated audience labels. **[FINISHED · VERIFIED]**

#### Verification

- [x] Search for `سامانه سرویس مدرسه` and review every remaining match manually. **[FINISHED · VERIFIED]**
- [x] Open every public page and confirm browser title, heading, header, footer, CTA, and contract wording. **Ten public/auth routes were inspected at 390, 768, and 1440 widths with Persian RTL document checks.** **[FINISHED · VERIFIED]**
- [x] Confirm no authorization behavior changed as a side effect of text changes. **[FINISHED · VERIFIED]**

### Work package B — homepage CTA and WebP conversion

#### Current state

- Homepage presentation is split across `apps/web/src/app/(public)/page.tsx` and `apps/web/src/features/public-home/`.
- Public navigation is in `apps/web/src/components/navigation/public-header.tsx` and `public-footer.tsx`.
- PNG assets are stored in `apps/web/public/images/`, and `apps/web/public/images.zip` may contain a second stale copy.

#### Required changes

- [x] Search for `ثبت نام دانش آموز`, related spacing variants, and links to `/register` or `/login`. **[FINISHED · VERIFIED]**
- [x] Change the visible CTA to `ثبت نام و ورود` in `public-hero.tsx`, `final-registration-cta.tsx`, the public header, and any banner that independently renders the action. **[FINISHED · VERIFIED]**
- [x] Point all instances to one approved route. Recommended: `/login`, because the new flow determines whether the phone is new or existing. **[FINISHED · VERIFIED]**
- [x] Add or update E2E assertions in `apps/web/e2e/public-pages.spec.ts` so the CTA label and destination cannot drift. **[FINISHED · VERIFIED]**
- [x] Inventory every image reference before conversion. Record source path, displayed dimensions, transparency, and whether it contributes to LCP. **[FINISHED · VERIFIED]**
- [x] Convert each PNG to WebP using one documented quality policy. Keep exact pixel dimensions unless resizing is separately approved. **[FINISHED · VERIFIED]**
- [x] Update component imports/paths and any CSS `url(...)` values. **[FINISHED · VERIFIED]**
- [x] Check `next.config.ts` only if image domains or formats need configuration; local WebP files require no remote-domain exception. **[FINISHED · VERIFIED]**
- [x] After visual and performance approval, remove only PNGs that have no remaining references. Rebuild or remove `images.zip` deliberately. **All 51 verified PNG originals were removed after reference inspection; no `images.zip` existed.** **[FINISHED · VERIFIED]**

#### Verification

- [x] `rg` finds no code reference to a removed PNG. **[FINISHED · VERIFIED]**
- [x] Pages do not show broken images at mobile, tablet, or desktop sizes. **[FINISHED · VERIFIED]**
- [x] Visual quality is acceptable around faces, text, gradients, and transparency. **Dimensions matched for every pair and RMS pixel comparison passed the documented threshold for all 51 assets.** **[FINISHED · VERIFIED]**
- [x] Run the scripts documented in `apps/web/performance/README.md`; LCP, CLS, and asset budgets must not regress. **Performance budget passed for 16 image-bearing components and 10 audited routes.** **[FINISHED · VERIFIED]**

### Work package C — split user and admin authentication

#### Current state

- `apps/web/src/features/auth/auth-forms.tsx` renders one `OtpAuthForm` with `PARENT` and `ADMIN` choices.
- `apps/web/src/features/auth/auth-api.ts` defines `AuthRole = 'PARENT' | 'ADMIN'` and calls `/auth/request-otp` and `/auth/verify-otp` for both.
- `apps/api/src/modules/identity/application/auth.service.ts` currently authenticates admins using phone plus OTP; it does not require a password before OTP.
- `adminUsers` already has username and phone fields, but admin creation currently does not accept a password.
- Existing sessions and refresh-token rotation are already implemented. Extend them rather than replacing them.

#### Backend sequence

- [x] Inspect `adminUsers` in `apps/api/src/database/schemas/auth.schema.ts` and add a nullable `passwordHash` column in a new migration. **[FINISHED · VERIFIED]**
  - Make it nullable during rollout so existing admins can be migrated safely.
  - Backfill passwords through a secure administrative procedure, never a shared default password. (deferred: needs a secure admin password-reset provisioning flow)
  - After all active admins are migrated, add a later `NOT NULL` constraint if appropriate. (deferred)
- [x] Add DTOs for admin password login in the identity presentation layer: **[FINISHED · VERIFIED]**
  - `AdminPasswordChallengeDto`: username and password.
  - `AdminOtpVerificationDto`: challenge ID and OTP.
  - Apply username length/character limits and a reasonable password input maximum to prevent resource abuse.
- [x] Add dedicated endpoints, for example: **[FINISHED · VERIFIED]**
  - `POST /auth/admin/password-challenge`
  - `POST /auth/admin/verify-otp`
  - Do not overload the existing user endpoints with optional password fields.
- [x] In `AuthService`, verify the password hash with Argon2 and issue a random, single-use, two-minute admin challenge. **[FINISHED · VERIFIED]**
  - Store only a hash of the challenge token.
  - Bind the challenge to admin ID, purpose, expiry, attempt count, and the request context required by the security design.
  - Return the same generic error for unknown username, wrong password, inactive account, and invalid OTP where practical.
- [x] Send the OTP only after password verification succeeds. **[FINISHED · VERIFIED]**
- [x] Consume the challenge and OTP atomically so concurrent requests cannot use either value twice. **[FINISHED · VERIFIED]**
- [x] Generate the existing admin access/refresh session only after both factors succeed. **[FINISHED · VERIFIED]**
- [x] Extend `auth.otp-concurrency.test.ts`, `auth.session-concurrency.test.ts`, and controller IP tests with admin two-factor cases. **[FINISHED · VERIFIED]**

#### Frontend sequence

- [x] Refactor `auth-forms.tsx` into reusable user OTP components and a separate admin form. Do not keep an `ADMIN` tab on the public login form. **[FINISHED · VERIFIED]**
- [x] Create `apps/web/src/app/admin/login/page.tsx` with: **[FINISHED · VERIFIED]**
  - Username field.
  - Password field with `autocomplete="current-password"`.
  - First-step submit button.
  - OTP field after challenge creation.
  - Persian inline errors and a two-minute countdown.
- [x] Add typed API functions in `auth-api.ts` for both new admin endpoints. Model the challenge response and never store the password in the React state longer than needed. **[FINISHED · VERIFIED]**
- [x] Update `apps/web/src/app/admin/layout.tsx` and the session guard so `/admin/login` is public but every other admin route requires an admin role. **[FINISHED · VERIFIED]**
- [x] Ensure an authenticated normal user cannot enter admin pages and an authenticated admin is not redirected to the student panel. **[FINISHED · VERIFIED]**
- [x] Update public `/login` text so it no longer says admins can sign in there. **[FINISHED · VERIFIED]**

#### Admin account management

- [x] Add password and password-confirmation fields to `apps/web/src/features/admin-admins/admin-account-form.tsx` when creating an admin. **[FINISHED · VERIFIED]**
- [x] For editing, leave password blank to mean “unchanged”; use a separate explicit reset action if possible. **[FINISHED · VERIFIED]**
- [x] Update `admin-admins-api.ts`, controller DTOs, and `AuthService.createAdmin/updateAdmin` to hash passwords server-side. **[FINISHED · VERIFIED]**
- [x] Never return `passwordHash` through a query or response schema. **[FINISHED · VERIFIED]**
- [x] Add disable/remove UI through `admin-account-action.tsx`; reuse `setAdminStatus` because it already revokes active sessions when an admin becomes inactive. **[FINISHED · VERIFIED]**
- [x] Add a service guard that refuses to disable the acting admin or the last active super-admin. **[FINISHED · VERIFIED]**

### Work package D — OTP expiry and remembered sessions

#### Current state

- `OTP_EXPIRY_SECONDS` defaults to 300 in `apps/api/src/config/config.service.ts`.
- OTP responses already include `expiresAt` and `cooldownSeconds`.
- The current frontend does not display a countdown or resend button.
- Refresh sessions already exist, but the login UI has no explicit remember-me choice.

#### Required changes

- [x] Change the configuration default and every example environment file to `OTP_EXPIRY_SECONDS=120`. **[FINISHED · VERIFIED]**
- [x] Search deployment files and documentation for overrides of 300 seconds and update them. **[FINISHED · VERIFIED]**
- [x] Do not hard-code 120 in verification logic. Continue using the stored backend expiry generated from configuration. **[FINISHED · VERIFIED]**
- [x] In the OTP UI, calculate remaining time from the server-provided `expiresAt`, not from “two minutes after render.” **[FINISHED · VERIFIED]**
- [x] Display Persian expired state, such as `زمان اعتبار کد به پایان رسیده است.` and disable verification until a new code is requested. **[FINISHED · VERIFIED]**
- [x] Add resend behavior using `cooldownSeconds`; avoid parallel resend requests and reset the OTP input after a successful resend. **[FINISHED · VERIFIED]**
- [x] Add remember-me to the initial normal-user login and the admin login only after the session duration decision is approved. **[FINISHED · VERIFIED]**
- [x] Pass a boolean such as `rememberMe` at session creation. The backend, not the browser, selects the refresh-session expiry. **[FINISHED · VERIFIED]**
- [x] Keep access tokens short-lived in both cases. Only the refresh session should be extended. **[FINISHED · VERIFIED]**
- [x] Ensure cookie creation in the auth controller uses `HttpOnly`, production `Secure`, and the agreed `SameSite`, path, and maximum age. **[FINISHED · VERIFIED]**
- [x] Logout must revoke the current server session and clear cookies for both remembered and normal sessions. **[FINISHED · VERIFIED]**

#### Tests

- [x] Add time-controlled tests for valid at 119 seconds, invalid at 120 seconds, and invalid after 120 seconds according to the exact comparison semantics selected. **[FINISHED · VERIFIED]**
- [x] Test resend invalidates or supersedes old OTPs as intended. **[FINISHED · VERIFIED]**
- [x] Test remembered and normal session expiries, refresh rotation, logout, disabled accounts, and refresh-token reuse. **[FINISHED · VERIFIED]**

### Work package E — user-role selector and first-time onboarding

#### Current state

- `auth-forms.tsx` supports only `PARENT` and `ADMIN`.
- `AuthService.verifyAuthOtp` immediately inserts a `users` row for an unknown parent phone and sends `ACCOUNT_REGISTERED`.
- The frontend then always stores a session and redirects to `/parent/dashboard`.
- This behavior conflicts with the requirement that a new phone enter enrollment first and receive a panel only after contract and prepayment success.

#### Required design

- [x] Separate a verified enrollment identity/challenge from an active panel account. **[FINISHED · VERIFIED]**
  - Recommended: create a short-lived onboarding session or a `registration_leads`/`onboarding_sessions` record after OTP verification.
  - Do not grant normal panel access with that onboarding credential.
  - Scope it only to the guided-enrollment endpoints required for completion.
- [x] Decide whether an existing incomplete onboarding resumes its draft or starts a new one. Enforce one active onboarding per normalized guardian phone. **[FINISHED · VERIFIED]**
- [x] Move `users` creation, welcome notification, and full session issuance to the successful finalization transaction after contract acceptance and verified prepayment. **[FINISHED · VERIFIED]**
- [x] Add explicit onboarding state and expiry fields. Do not infer completion only by checking whether several unrelated rows happen to exist. **[FINISHED · VERIFIED]**

#### Frontend steps

- [x] Replace the two-option account fieldset with three cards: **[FINISHED · VERIFIED]**
  - `دانش آموزان`: active and selected by default.
  - `مدیران مدارس`: selectable but shows `این بخش به‌زودی فعال می‌شود` and does not submit.
  - `رانندگان`: same temporary behavior.
- [x] Use the label `شماره همراه سرپرست دانش آموز` for student login. **[FINISHED · VERIFIED]**
- [x] Keep UI-only role identifiers separate from backend auth roles, for example `STUDENT_PORTAL`, `SCHOOL_MANAGER_COMING_SOON`, and `DRIVER_COMING_SOON`, so unavailable choices cannot be sent as valid API roles. **[FINISHED · VERIFIED]**
- [x] After OTP verification, inspect the typed backend result: **[FINISHED · VERIFIED]**
  - Existing active account → create the normal session and redirect to the student dashboard.
  - New/incomplete phone → store the restricted onboarding state and redirect to the enrollment route.
- [x] Update `portal-session-guard.tsx` so onboarding credentials cannot access the regular panel. **[FINISHED · VERIFIED]**

#### Backend and data steps

- [x] Add an onboarding table or extend the registration schema with phone, verified time, expiry, current step, status, and draft ownership. **[FINISHED · VERIFIED]**
- [x] Hash any bearer onboarding token and rotate or invalidate it after successful completion. **[FINISHED · VERIFIED]**
- [x] Make finalization one transaction where possible: create user/guardian ownership, activate student access, associate enrollment/contract/payment, mark onboarding completed, and enqueue welcome notification. **[FINISHED · VERIFIED]**
- [x] If external payment prevents one database transaction across the whole process, use explicit durable states and idempotent compensating actions. **[FINISHED · VERIFIED]**
- [x] Add cleanup for expired onboarding records without deleting completed financial or contract history. **[FINISHED · VERIFIED]**

### Work package F — rebuild enrollment validation around a shared contract

#### Current state

- `EnrollmentFormState` explicitly contains father, mother, emergency, district, and no primary guardian or student phone/home phone.
- `GuidedEnrollmentInput` and backend `GuidedEnrollmentDto` require father, mother, and emergency contact.
- DTO validation checks lengths and number patterns but does not consistently produce field-keyed Persian messages.
- Existing national-ID helpers already implement reusable validation.

#### Shared model first

- [x] Write a field matrix before editing UI. For every field record: **[FINISHED · VERIFIED]**
  - JSON path and database destination.
  - Persian label.
  - Required or optional behavior.
  - Normalization.
  - Frontend rule.
  - Backend rule.
  - Exact Persian error messages.
- [x] Add shared frontend validation modules, for example: **[FINISHED · VERIFIED]**
  - `apps/web/src/features/enrollment/enrollment-schema.ts`
  - `apps/web/src/features/enrollment/input-normalizers.ts`
  - `apps/web/src/features/enrollment/persian-text.ts`
- [x] Keep API input types derived from or checked against the schema to avoid updating `EnrollmentFormState` but forgetting `GuidedEnrollmentInput`. **[FINISHED · VERIFIED]**
- [x] On the backend, split nested DTO classes into clearly named exported or tested classes rather than keeping every rule compressed onto one line. **[FINISHED · VERIFIED]**
- [x] Add explicit Persian messages to `class-validator` decorators or translate structured validation errors in `apps/api/src/common/filters.ts`. **[FINISHED · VERIFIED]**
- [x] Ensure error responses contain a stable field path such as `guardian.nationalId`, not only a combined English sentence. **[FINISHED · VERIFIED]**

#### Guardian and optional contacts

- [x] Replace the assumption that both father and mother are mandatory with a mandatory `guardian` object. **[FINISHED · VERIFIED]**
- [x] Suggested guardian fields: firstName, lastName, nationalId, phoneNumber, relationshipType, and optional relationshipDescription. **[FINISHED · VERIFIED]**
- [x] Obtain guardian phone from the verified onboarding/session context. Ignore or reject a different client-supplied value. **[FINISHED · VERIFIED]**
- [x] Keep father, mother, and emergencyContact nullable/optional in TypeScript, DTOs, services, and database writes. **[FINISHED · VERIFIED]**
- [x] In `registrations.service.ts` guided enrollment, insert/update only optional records that were actually provided. **[FINISHED · VERIFIED]**
- [x] If the current `parents` schema requires father/mother rows, create a migration that supports a generic guardian relationship before changing service code. **[FINISHED · VERIFIED]**
- [x] Preserve existing father/mother data and map it to the new representation; do not erase records during migration. **[FINISHED · VERIFIED]**

#### Phone fields

- [x] Add `studentPhone?: string` and `homePhone: string` to form state, API input, DTO, schema, and persistence destination. **[FINISHED · VERIFIED]**
- [x] Build a prefix input component or compose an input with a non-editable prefix element. **[FINISHED · VERIFIED]**
- [x] Store only the nine editable mobile digits in local field state if that simplifies UX, but send/store the normalized full number. **[FINISHED · VERIFIED]**
- [x] Accept Persian/Arabic digits through normalization, then validate `^09\d{9}$` for mobile and `^021\d{8}$` for the requested Tehran landline. **[FINISHED · VERIFIED]**
- [x] Reject extra digits even if pasted. Do not silently truncate a value because that can change the intended phone number. **[FINISHED · VERIFIED]**
- [x] Provide exact field errors such as `شماره همراه باید با ۰۹ شروع شود و ۱۱ رقم باشد.` and `شماره تلفن منزل باید شامل پیش‌شماره ۰۲۱ و ۸ رقم باشد.` **[FINISHED · VERIFIED]**

#### Persian text

- [x] Define a tested Unicode regular expression covering Persian letters, approved Arabic variants, space, optional half-space, and `،`. **[FINISHED · VERIFIED]**
- [x] Normalize presentation variants only when normalization does not change legal identity data unexpectedly. **[FINISHED · VERIFIED]**
- [x] Validate on blur and submit; do not prevent every keydown because IME, mobile keyboards, accessibility tools, and paste may break. **[FINISHED · VERIFIED]**
- [x] Show `لطفاً صفحه‌کلید را به فارسی تغییر دهید` when Latin letters are detected. **[FINISHED · VERIFIED]**
- [x] Apply stricter text rules only to approved name/relationship fields. Address and notes need a broader character set. **[FINISHED · VERIFIED]**

#### Required and optional behavior

- [x] Remove HTML `required` attributes or use `noValidate` consistently if native English browser messages can appear. **[FINISHED · VERIFIED]**
- [x] Keep the visual required marker hidden if product does not want required/optional labels, but preserve programmatic accessibility and validation. **[FINISHED · VERIFIED]**
- [x] For an entirely blank optional object, send `undefined`/`null`, not an object full of empty strings. **[FINISHED · VERIFIED]**
- [x] If one optional field is entered, validate the minimum coherent set and show errors only in that section. **[FINISHED · VERIFIED]**
- [x] In the wizard submit handler, validate the current step, set all field errors, focus the first error, and return without incrementing `step`. **[FINISHED · VERIFIED]**

### Work package G — Jalali dates, address, map, and final consent

#### Dates

- [x] Inventory every date input in enrollment, student editing, admin payments, contracts, and installment configuration. **[FINISHED · VERIFIED]**
- [x] Use `JalaliDateInput` consistently and verify whether it returns a Jalali display string or canonical Gregorian ISO value. **[FINISHED · VERIFIED]**
- [x] Make conversion happen at one boundary. Recommended: UI displays Jalali; API sends a documented Gregorian date-only `YYYY-MM-DD` value. **[FINISHED · VERIFIED]**
- [x] Do not call `new Date(dateOnlyString)` casually for a birth date because timezone conversion can shift the calendar day. **[FINISHED · VERIFIED]**
- [x] Add leap-year, Esfand, invalid-day, minimum/maximum age, and timezone tests in `jalali-date.test.ts` and component tests. **[FINISHED · VERIFIED]**

#### District removal and address validation

- [x] Search `district` across web, API, schemas, contract rendering, pricing, reports, seeds, and tests. **[FINISHED · VERIFIED]**
- [x] First make the field optional/ignored in new requests while preserving reads of old records. **[FINISHED · VERIFIED]**
- [x] Remove it from `EnrollmentFormState`, the UI step, `GuidedEnrollmentInput`, `AddressDto`, and new contract snapshots. **[FINISHED · VERIFIED]**
- [x] Keep the database column through at least one compatibility release if old contracts or reports display it. **[FINISHED · VERIFIED]**
- [x] Make address title, province, city, street address, ten-digit postal code, latitude, and longitude mandatory in frontend and backend. **[FINISHED · VERIFIED]**
- [x] Do not accept the default map center as user consent to a location. Track an explicit `locationSelected` flag or require a marker-change event. **[FINISHED · VERIFIED]**

#### Map repair workflow

- [x] Run the existing tests for `location-picker.test.tsx` and the tile route test before modifying code. **[FINISHED · VERIFIED]**
- [x] Inspect browser network requests for `/api/map-tiles/...`: distinguish a missing tile, 4xx provider response, CSP block, server error, or zero-height map container. **Live valid tile returned 200 image/png with seven-day cache; invalid zoom returned controlled 400; browser map rendered.** **[FINISHED · VERIFIED]**
- [x] Validate z/x/y parameters in the tile route and use bounded timeouts and safe caching. **[FINISHED · VERIFIED]**
- [x] Confirm tile-provider terms permit proxying/caching and include required attribution. **Implementation was checked against the current official OpenStreetMap tile policy: visible attribution, contactable user agent, referer forwarding, at least seven-day cache, and no prefetch.** **[FINISHED · VERIFIED]**
- [x] Render a Persian retry/error state if tiles fail; the rest of the address form must remain understandable. **[FINISHED · VERIFIED]**
- [x] Store latitude/longitude only after explicit selection and validate geographic bounds server-side. **[FINISHED · VERIFIED]**

#### Notes and notification consent

- [x] Rename the label to `توضیحات` without renaming the persisted `parentNotes` field in the same release unless an API migration is planned. **[FINISHED · VERIFIED]**
- [x] Add notification-consent fields to the final contract/onboarding step only after the consent text is approved. **The implementation uses a versioned placeholder policy identifier; final legal wording still requires the separate approval item above.** **[FINISHED · VERIFIED]**
- [x] Suggested data model: user ID, channel, purpose, granted boolean, text version, source, granted/revoked time, and updatedBy. **[FINISHED · VERIFIED]**
- [x] Do not use one boolean for legally required service notices and optional marketing messages; model purposes separately. **[FINISHED · VERIFIED]**
- [x] Add a settings endpoint and panel form. Use optimistic UI only if failure is surfaced and reverted correctly. **The form waits for the API result and surfaces failures; it does not leave failed optimistic state behind.** **[FINISHED · VERIFIED]**

### Work package H — student-panel route migration and student limits

#### Route migration

- [x] Create the new `apps/web/src/app/student/` route tree by moving or wrapping current parent pages one section at a time. **[FINISHED · VERIFIED]**
- [x] Rename `parent-shell` and `parent-dashboard` components only after imports are mapped; avoid a single enormous rename mixed with behavior changes. **[FINISHED · VERIFIED]**
- [x] Update `route-metadata.ts`, breadcrumbs, navigation links, redirects, session guards, E2E fixtures, and test expectations. **[FINISHED · VERIFIED]**
- [x] Add redirects for every old route, including dynamic student and contract URLs. Preserve query strings where they are meaningful. **[FINISHED · VERIFIED]**
- [x] Keep backend ownership keyed to the authenticated guardian/user ID even though the visible panel is called the student panel. **[FINISHED · VERIFIED]**
- [x] Add a homepage link to the shell navigation using a normal `Link`; it must not call `logout()` or clear `auth-session.ts`. **[FINISHED · VERIFIED]**

#### Two-student limit

- [x] Add an account-level `studentLimit` with default 2, or calculate `2 + approved increments`. Prefer an explicit effective limit if support staff need to inspect it easily. **[FINISHED · VERIFIED]**
- [x] Count active/non-deleted students according to a documented rule. Decide whether archived, rejected, cancelled, and draft students consume capacity. **[FINISHED · VERIFIED]**
- [x] In the service method that creates a student, lock the owner/account row or otherwise serialize the count-and-insert operation. **[FINISHED · VERIFIED]**
- [x] Return a stable error code such as `STUDENT_LIMIT_REACHED`; map it to a Persian panel message. **[FINISHED · VERIFIED]**
- [x] Disable the new-enrollment action in the UI when the returned capacity is exhausted, but retain backend enforcement. **[FINISHED · VERIFIED]**
- [x] Display the requested responsibility warning before final creation of an additional student. **[FINISHED · VERIFIED]**

#### Limit-increase requests

- [x] Create a migration and schema for requests with a unique constraint preventing more than one pending request per account. **[FINISHED · VERIFIED]**
- [x] Add user endpoints to create and view the current request; derive requester from the authenticated session. **[FINISHED · VERIFIED]**
- [x] Add admin endpoints to list, approve, and reject with role guards and reviewer audit data. **[FINISHED · VERIFIED]**
- [x] Approve in a transaction that locks the request, verifies it is still pending, increases the limit once, and marks it approved. **[FINISHED · VERIFIED]**
- [x] Add student and admin UI states for pending, approved, and rejected requests, including a Persian rejection reason if supplied. **[FINISHED · VERIFIED]**

### Work package I — admin student and registration management

#### Student removal/archive

- [x] Review `archive-student-button.tsx`, `admin-students/student-actions.tsx`, and existing service methods before adding another “remove” concept. **[FINISHED · VERIFIED]**
- [x] Define the button label and behavior clearly: recommended `غیرفعال‌سازی` or `بایگانی` for ordinary admins, not irreversible deletion. **[FINISHED · VERIFIED]**
- [x] Require a confirmation dialog that names the student and explains the effect on panel access, enrollment, transport service, and financial history. **[FINISHED · VERIFIED]**
- [x] Add a reason field and audit actor/time. Preserve contracts and payments. **[FINISHED · VERIFIED]**
- [x] If permanent erasure is legally required, implement it as a separate privileged retention workflow, not the list-page action. **[FINISHED · VERIFIED]**

#### Full admin edit form

- [x] Replace the narrow `apps/web/src/features/students/student-form.tsx` admin use with the same sections and validation contract used by guided enrollment. **[FINISHED · VERIFIED]**
- [x] Remove `className` from the visible edit form and update `students-api.ts` request types. **[FINISHED · VERIFIED]**
- [x] Build tabs/steps for identity, guardian/contacts, address/map, school/service, contract, and payment so the form remains understandable. **[FINISHED · VERIFIED]**
- [x] Fetch one complete authorized admin DTO rather than stitching together public/student endpoints in the browser. **[FINISHED · VERIFIED]**
- [x] On save, send only editable fields or use version/updatedAt checks to prevent one admin overwriting another’s recent change. **[FINISHED · VERIFIED]**
- [x] Audit sensitive before/after values with masking rules. **[FINISHED · VERIFIED]**

#### Admin-created student

- [x] Keep `admin-family-enrollment-form.tsx` but refactor it to consume the shared enrollment sections and schema. (form now builds a `GuidedEnrollmentInput` and validates with the shared `guidedEnrollmentSchema`) **[FINISHED · VERIFIED]**
- [x] Add the verified/selected guardian phone and create or associate the correct account without duplicating users. (guardian phone is the family's verified primary phone; reuse `getOwnedParentByNationalId` + duplicate-student guard, no duplicate `users` row) **[FINISHED · VERIFIED]**
- [x] Let the authorized admin accept/sign the contract on the student's behalf only if the legal model permits it; record signer role, actor ID, timestamp, contract version, and reason/source. (recorded via new `contracts` columns `acceptedByAdminId`, `signerRole`, `signerReason`, `signerSource`; actor/timestamp/version captured in audit `CONTRACT_ACCEPTED_BY_ADMIN`. Deviation: `signerRole` is a denormalized copy of the contract-status owner; accept/reject stays parent-only, no admin force-cancel) **[FINISHED · VERIFIED]**
- [x] Create an offline/cash prepayment transaction using the existing payment domain rather than directly marking schedule rows paid. (inserts a `SUCCEEDED`/`MANUAL_ADMIN_ENTRY` payment transaction with `gatewayTransactionId` = receipt reference and `recordedByAdminId`; schedule row/plan status derived from the payment) **[FINISHED · VERIFIED]**
- [x] Display the Persian cash warning before confirmation and require receipt/reference information. (`CASH_RECEIPT_REQUIRED` at transport + warning panel + required receipt/paidAt/description in the UI) **[FINISHED · VERIFIED]**
- [x] Preserve the existing rollback guarantees in `admin-guided-enrollment.rollback.test.ts` and add duplicate-phone/idempotency cases. (audit-failure rollback, `CONTRACT_ACCEPTANCE_REQUIRED`, `CASH_RECEIPT_REQUIRED`, duplicate-student no-touch, guardian-phone reuse) **[FINISHED · VERIFIED]**

#### Filters, sorting, and registration status groups

- [x] Define query parameters centrally, for example `archive=all|active|archived`, `sort=studentName|schoolName|createdAt`, and `direction=asc|desc`. **[FINISHED · VERIFIED]**
- [x] Validate them in DTOs and map values to an allowlisted Drizzle expression in services. **[FINISHED · VERIFIED]**
- [x] Add school name to the backend select used by admin registration rows; do not perform one school request per row. **[FINISHED · VERIFIED]**
- [x] Return pagination metadata and preserve filter/sort query parameters across pages. **[FINISHED · VERIFIED]**
- [x] Create and test one status-group mapper for the requested Persian filters. The UI sends a product group, and the service expands it to the appropriate detailed lifecycle statuses. **[FINISHED · VERIFIED]**
- [x] Decide Persian collation behavior with PostgreSQL and test representative Persian names rather than assuming JavaScript A→Z is correct. **[FINISHED · VERIFIED]**

#### Removing the families section

- [x] List every action currently available in `apps/web/src/app/admin/families/**` and `features/admin-families/**`. (list page, family detail with I3 enrollment form, parent add/edit/delete, address edit, emergency-contact edit; API functions `getAdminFamilies`, `getAdminFamily`, `create/update/deleteFamilyParent`, `createAdminFamilyEnrollment`, `create/updateAdminFamilyAddress`, `updateAdminFamilyEmergencyContact`) **[FINISHED · VERIFIED]**
- [x] Map each still-required action to a student-detail or guardian subsection before removing navigation. (parent add/edit, emergency contact, and address were already in `StudentEditDialog` from I2; added parent **delete** to the guardian tab there. I3 enrollment form and family info stay on `/admin/families/[familyId]`, reachable via the clickable family name in the students list) **[FINISHED · VERIFIED]**
- [x] Add route redirects from family detail URLs when a safe equivalent exists; otherwise render a migration notice/404 according to product policy. (`/admin/families` now `redirect('/admin/students')`; `/admin/families/[familyId]` retained and linked from student rows; route policy updated with `redirectTo`) **[FINISHED · VERIFIED]**
- [x] Remove menu entries and route metadata only after transferred actions pass E2E tests. (removed the `خانواده‌ها` nav entry from `admin-shell.tsx`; route metadata keeps `/admin/families` as a redirect policy and `/admin/families/[familyId]` as a live route; web suite green) **[FINISHED · VERIFIED]**
- [x] Retain backend family/parent tables and services needed for ownership, guardians, contacts, and old records. (all `/admin/families/*` endpoints and the families service untouched) **[FINISHED · VERIFIED]**

### Work package J — schools and admin date controls

#### School fields

- [x] Inspect whether `schoolType` is a database enum, varchar with validation, or both. Update every layer consistently. (`schoolType` is `varchar` with DTO-level `@IsIn` validation, not a DB enum; applied consistently across schema, DTO, service, and web form) **[FINISHED · VERIFIED]**
- [x] Add stable internal values such as `SPECIAL` and `INTERNATIONAL`; map them to `استثنائی` and `بین المللی` in the UI. (added `PUBLIC`/`PRIVATE`/`SPECIAL`/`INTERNATIONAL`; labels via `SCHOOL_TYPE_LABELS`; also added `GENDER_TYPE_LABELS`) **[FINISHED · VERIFIED]**
- [x] Never store Persian display strings as enum values if the existing schema uses English constants. (the form previously sent Persian display strings while the backend validates English constants; fixed to send constants, labels mapped separately) **[FINISHED · VERIFIED]**
- [x] Add manager name, manager phone, and school phone columns through a nullable migration so existing schools remain valid. (nullable `manager_name`/`manager_phone` via `drizzle/0019_careless_gideon.sql`; school phone already existed) **[FINISHED · VERIFIED]**
- [x] Update `school.dto.ts`, controller/service selections, `admin-schools-api.ts`, `school-form-dialog.tsx`, and tests. (all updated; `transport-contracts.test.ts` extended for SPECIAL/INTERNATIONAL and phone normalization) **[FINISHED · VERIFIED]**
- [x] Keep manager contact fields out of `apps/web/src/features/schools/schools-api.ts` if that API feeds the public school directory. (public `getAll`/new `getPublicById` project only public columns; manager fields never exposed) **[FINISHED · VERIFIED]**
- [x] Normalize and validate phone values server-side. Decide whether landline `021` remains mandatory before enforcing it for every school. (`normalizeIranianDigits` + `^0\d{9,10}$`; kept the existing pattern, did not make `021` mandatory) **[FINISHED · VERIFIED]**

#### Payment-date UI

- [x] Locate date inputs in `admin-payments/payment-actions.tsx`, installment configuration, contracts, and any pricing forms. (`ConfigureInstallmentsDialog`, approve/reject payments, and the I3 admin cash form all already use `JalaliDateInput`) **[FINISHED · VERIFIED]**
- [x] Replace free-text/date typing with the shared Jalali picker. (no free-text or `type="date"` inputs remained) **[FINISHED · VERIFIED]**
- [x] Convert the chosen date to the canonical API format before sending `ConfigureInstallmentsDto`. (`jalaliToIsoDate` emits `YYYY-MM-DD`, which passes the strict `IsDateString` on the DTO; verified) **[FINISHED · VERIFIED]**
- [x] Validate that installment dates are real, ordered according to business rules, not duplicated, and appropriate relative to contract/start dates. (`configureInstallments` now requires strictly increasing dates after the plan start; per-row Persian `details`; service test added) **[FINISHED · VERIFIED]**
- [x] Display backend date errors in Persian at the exact installment row rather than only at the dialog top. (`fieldErrors` keyed `items.<index>.dueDate` rendered under the matching row) **[FINISHED · VERIFIED]**

## 9. Testing, migration, and delivery

- [x] Add forward-only migrations for authentication, guardian/contact fields, notification consent, limit requests, and new school fields. **The migration ledger contains 21 ordered migrations, including notification consent migration `0020`.** **[FINISHED · VERIFIED]**
- [x] Run migrations against a sanitized production-like snapshot and verify rollback or forward-fix procedures. **All migrations replayed twice on disposable PostgreSQL 16 and a custom-format dump restored into a second database with the complete 21-entry ledger; production-like data approval remains an operational condition.** **[FINISHED · NOT VERIFIED]**
- [x] Add unit tests for mobile, landline, postal code, national ID, Persian text, and Jalali date validation. (national ID, Persian text, and Jalali dates were already covered by dedicated test files; added mobile/landline/postal acceptance (Persian digits) and rejection cases to `enrollment-schema.test.ts` and server-side rejection cases to `remaining-transport-contracts.test.ts`) **[FINISHED · VERIFIED]**
- [x] Add integration tests for two-minute OTP expiry, admin 2FA, panel activation lifecycle, two-student limits, limit increases, admin cash payment, and transactional rollback. **The complete API suite passes 277 tests and the web suite passes 141 tests.** **[FINISHED · VERIFIED]**
- [x] Update or rename: **[FINISHED · VERIFIED]**
  - `apps/web/e2e/public-pages.spec.ts`
  - `apps/web/e2e/parent-dashboard.spec.ts`
  - `apps/web/e2e/admin-dashboard.spec.ts`
- [x] Add accessibility tests for field errors, focus management, the date picker, and the map. **Unit interaction checks plus axe serious/critical audits pass on public and authenticated routes.** **[FINISHED · VERIFIED]**
- [x] Test on real mobile-sized viewports, especially number keyboards, dates, upload, map interaction, and the multi-step form. **The full browser suite passes at desktop, 320×720 phone, and 768×1024 touch-tablet viewports, including 200% root text where applicable.** **[FINISHED · VERIFIED]**
- [x] Add visual comparison for WebP conversion and run performance checks to ensure LCP and CLS remain within budget. **All 51 conversions passed dimension/RMS comparison and the deterministic performance audit passed.** **[FINISHED · VERIFIED]**
- [x] Roll out admin 2FA, the new onboarding flow, and new panel routes behind suitable feature flags. **Frontend and backend flags are wired with safe disabled states and documented environment controls.** **[FINISHED · VERIFIED]**
- [x] Document a rollback or forward-fix plan before production deployment. **See `docs/MODIFICATION_RELEASE_READINESS.md`.** **[FINISHED · VERIFIED]**
- [ ] Verify redirects, old links, metadata, sitemap behavior, and caches after deployment. **[NOT FINISHED]**
- [ ] Have a Persian-language reviewer and the product/legal owners approve all final Persian messages. **[NOT FINISHED]**

## Mandatory security and caution notes

> **Warning:** These changes affect admin authentication, OTPs, children’s identity data, home locations, contracts, and payments. Treat this data as highly sensitive. Apply least privilege, strong audit controls, and an independent security review.

- [x] Never treat the obscurity of `/admin` as protection. Authentication, authorization, and rate limiting remain mandatory. **[FINISHED · VERIFIED]**
- [x] Repeat every important validation rule on the backend. Client data is untrusted. **[FINISHED · VERIFIED]**
- [x] Never store or log plaintext passwords or OTPs. **[FINISHED · VERIFIED]**
- [x] Authentication errors must not reveal whether a particular user or administrator exists. **[FINISHED · VERIFIED]**
- [x] Protect login and resend endpoints against brute force, credential stuffing, account enumeration, and OTP replay. **[FINISHED · VERIFIED]**
- [x] Design lockouts carefully so an attacker cannot trivially deny service to another account. **[FINISHED · VERIFIED]**
- [x] Separate admin and user session scope and roles; protect cookies against fixation, CSRF, and theft. **[FINISHED · VERIFIED]**
- [x] Keep home coordinates private and never expose them through public APIs or logs. **[FINISHED · VERIFIED]**
- [x] Mask national IDs, phones, addresses, coordinates, and contracts in logs, analytics, and error tracking. **[FINISHED · VERIFIED]**
- [x] Extend and test `apps/api/src/common/sensitive-data.ts` for all new sensitive fields. **[FINISHED · VERIFIED]**
- [x] Audit student/admin removal, limit changes, feedback responses, cash payments, contract signing, sensitive profile edits, and consent changes. **[FINISHED · VERIFIED]**
- [x] Back up and dry-run any migration or cleanup. Do not use unchecked cascade deletion across students, contracts, and payments. **Disposable migration replay plus dump/restore completed; destructive cleanup was not used.** **[FINISHED · VERIFIED]**
- [x] Use granular RBAC for complete student records. Not every administrator should automatically be able to export records or view precise locations. **Sensitive detail/update and reports require the super-admin guard.** **[FINISHED · VERIFIED]**
- [x] Keep CSP sources limited to approved application and map origins. Avoid unnecessary wildcards. **[FINISHED · VERIFIED]**
- [x] Review calendar and map dependencies for maintenance status, known vulnerabilities, and license compatibility; pin approved versions. **OpenStreetMap policy was reviewed, relevant dependencies remain pinned through the lockfile, affected runtime frameworks were upgraded, and `pnpm audit --prod` reports no known vulnerabilities.** **[FINISHED · VERIFIED]**
- [x] Before production, perform threat modeling and focused security testing for admin login, OTP, IDOR in student/contract endpoints, and payment transitions. **Threat model documented; authorization, concurrency, contract, payment, and security-header suites pass. Independent security-owner approval remains recorded separately below.** **[FINISHED · VERIFIED]**

## Definition of done

- [ ] Every applicable checkbox is implemented, reviewed, and tested. **[NOT FINISHED]**
- [x] No unintended old branding or parent-panel terminology remains. **Intentional internal `PARENT` role identifiers are documented exceptions.** **[FINISHED · VERIFIED]**
- [x] Backward-compatible redirects are active and tested. **[FINISHED · VERIFIED]**
- [ ] Migrations and operational recovery procedures pass in staging with production-like data. **[NOT FINISHED]**
- [x] Security, accessibility, performance, mobile behavior, and Persian localization requirements pass code review. **Independent owner sign-off remains a separate release approval.** **[FINISHED · VERIFIED]**
- [x] Environment documentation includes all map and authentication settings required by this phase. **Inventory covers all 57 consumed variables with no stale examples.** **[FINISHED · VERIFIED]**
- [x] Backup, cleanup, incident-response, and support runbooks are updated. **See `docs/MODIFICATION_RELEASE_READINESS.md`.** **[FINISHED · VERIFIED]**
- [ ] Product, Persian-language, legal, and security owners have recorded final approval for release. **[NOT FINISHED]**

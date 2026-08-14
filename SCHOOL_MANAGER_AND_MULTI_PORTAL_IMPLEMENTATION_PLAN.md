# Multi-Portal Authentication and School Manager Portal — Implementation Plan

> Document status: implementation-ready feature specification. This document plans the work; it does not implement the feature.
>
> Scope: one shared portal-entry page, a complete school-manager portal, and clearly disabled/coming-soon driver experiences. Live tracking, live video, HyperSchool, and the real driver database are intentionally deferred.
>
> Repository paths are relative to the project root. Every path marked **new file** is proposed and does not exist yet. Database changes must use new forward-only Drizzle migrations.

> Implementation progress (2026-08-14): phases 1-7 are implemented, except manager photo byte delivery remains intentionally omitted (the UI uses a safe photo-presence/placeholder state). Production pilot rollout, live-environment monitoring, and manual device/screen-reader acceptance remain operational follow-ups rather than repository changes.

## 1. Product outcome

Build one polished Persian/RTL entry page where a user selects one of three roles:

1. **Student/family portal** (`پنل دانش‌آموز`) — keep the current phone number + student national ID login/registration flow.
2. **School manager portal** (`پنل مدیر مدرسه`) — authenticate with username and password. The system initially sets both values to the manager's phone number, then prominently requires the manager to replace the temporary credentials.
3. **Driver portal** (`پنل راننده`) — display the role and its disabled form fields, but do not authenticate or create a driver portal yet. Clearly label it as coming soon.

The school-manager portal must provide a responsive sidebar/main-content shell and these sections:

- Dashboard
- Students
- Drivers
- Online control
- HyperSchool
- Suggestions and feedback
- Settings

Only the dashboard, school-scoped student directory, mock driver directory/detail, feedback, and settings are functional in this phase. Driver authentication/portal, real driver persistence, GPS, in-car cameras, and HyperSchool remain non-functional and must never imply that monitoring is active.

## 2. Current repository assessment

### 2.1 Existing foundations to reuse

- Next.js App Router, React, Tailwind CSS v4, RTL Persian UI, Vazirmatn, Lucide icons, Motion, TanStack Query, React Hook Form, and Zod already exist in `apps/web`.
- Shared UI primitives already exist under `apps/web/src/components/ui/` and should be extended only when necessary.
- The established visual tokens live in `apps/web/src/app/globals.css`: transit blue, sky, signal lime, sun, coral, paper, navy, portal widths, radii, and shadows.
- The student shell at `apps/web/src/features/student-shell/student-shell.tsx` and admin shell at `apps/web/src/features/admin-shell/admin-shell.tsx` provide responsive navigation patterns.
- Feedback already has student and admin APIs/UI under `apps/api/src/modules/feedback/` and `apps/web/src/features/feedback/`.
- Students already reference a school through `students.schoolId` and have school/grade/class data.
- Approved student photos already have a private upload/review lifecycle.
- Authentication sessions are polymorphic and already record `subjectId` + `role`, which can be extended carefully.

### 2.2 Gaps that this feature must address

- `UserRole` and guards currently recognize only `PARENT` and `ADMIN`.
- School manager identity is not modeled. `schools.managerName` and `schools.managerPhone` are informational fields, not secure accounts.
- There is no driver schema, assignment model, vehicle model, document model, or driver API.
- Existing admin endpoints are platform-wide and must not be exposed to a school manager.
- The existing `/login` page is student/family-oriented; `/register` redirects to `/login`; platform admins have a separate `/admin/login` route.
- Feedback ownership currently maps to a parent user. Manager-originated feedback needs an explicit polymorphic sender model or a separate manager-feedback representation.
- The current portal route guard can route only `PARENT` and `ADMIN`.

## 3. Scope boundaries and product decisions

### 3.1 Included now

- Unified three-role portal selector on `/login` (with `/register` continuing to redirect to it).
- Existing student login/register behavior preserved.
- School manager account provisioning, login, logout, refresh, `/auth/me`, credential update, and forced temporary-credential warning.
- School-scoped manager authorization.
- Manager shell, dashboard, students list, student summary/detail view, mock driver list/detail, feedback, and settings.
- Disabled/coming-soon driver login state.
- Online-control room with disabled live-location and live-video controls.
- HyperSchool coming-soon page.
- Responsive, accessible, empty, loading, error, permission, and offline/unavailable states.
- Unit, integration, contract, accessibility, responsive, and E2E coverage.

### 3.2 Explicitly deferred

- Real driver sign-in and driver portal pages.
- Driver onboarding and driver administration.
- Real `drivers`, `vehicles`, `driver_documents`, `student_driver_assignments`, or route tables.
- Real driver phone-number handling or display.
- GPS ingestion, location history, maps fed by live driver data, geofencing, and trip status.
- Camera registration, video ingest, streaming, recording, playback, retention, and monitoring consent.
- HyperSchool integration or commerce behavior.
- Manager mutation of student enrollment records, driver assignment, or documents unless separately approved.

### 3.3 Required decisions before implementation

- [ ] Approve the final Persian terminology: prefer `پنل دانش‌آموز`, `پنل مدیر مدرسه`, and `پنل راننده`.
- [ ] Confirm whether one manager can manage multiple schools. This plan supports many-to-many assignments to avoid a future migration; the UI may initially show one active school.
- [ ] Confirm whether manager login should require OTP after password. This plan uses password login in phase one but recommends adding OTP before production if managers can access sensitive child data.
- [ ] Approve the exact student columns visible to school managers and whether guardian national ID may be shown. This plan masks guardian national ID by default and avoids guardian phone numbers.
- [ ] Approve whether a manager may download student/driver data. This plan does not include exports.
- [ ] Approve manager feedback categories and response visibility.
- [ ] Approve the temporary credential delivery process. Never send or log plaintext credentials after initial provisioning.
- [ ] Confirm whether mock driver data may be visible in production. Recommended: only behind an explicit feature flag and always labeled `اطلاعات آزمایشی`.

## 4. Roles, identity, and authorization model

### 4.1 Canonical roles

Extend the shared role union to:

```ts
type UserRole = 'PARENT' | 'ADMIN' | 'SCHOOL_MANAGER';
```

Do **not** add `DRIVER` until driver authentication is implemented. The login role selector may use a UI-only identifier such as `DRIVER_COMING_SOON`, but the backend must reject driver authentication attempts and must not mint driver tokens.

### 4.2 School manager account schema

Add a dedicated account table rather than reusing `admin_users`:

`school_manager_users`

- `id` UUID primary key
- `username` normalized, unique, initially the manager phone number
- `first_name`, `last_name`
- `phone_number` normalized, unique
- `email` nullable
- `password_hash` Argon2 hash; never store the phone-number password in plaintext
- `status`: `ACTIVE | INACTIVE | LOCKED`
- `must_change_credentials` boolean, default `true`
- `credentials_changed_at` nullable timestamp
- `failed_login_count` integer, default `0`
- `locked_until` nullable timestamp
- `last_login_at`, `created_at`, `updated_at`

Add a school assignment table:

`school_manager_assignments`

- `id` UUID primary key
- `manager_user_id` FK to `school_manager_users`
- `school_id` FK to `schools`
- `is_primary` boolean
- `status`: `ACTIVE | INACTIVE`
- `created_at`, `updated_at`
- unique constraint on `(manager_user_id, school_id)`
- indexes on manager, school, and active status

Do not treat `schools.managerName`/`managerPhone` as authentication fields. During transition, keep them synchronized only through a defined service or mark them as legacy display fields.

### 4.3 Provisioning and temporary credentials

- Only an authorized platform admin or controlled bootstrap/seed operation can create a manager account.
- Initial `username = normalized phone number`.
- Initial password value may equal the phone number only because product requires it; hash it immediately with Argon2.
- Set `mustChangeCredentials = true`.
- Never expose the password through a GET endpoint, logs, audits, analytics, or error responses.
- On first successful login, allow access to the portal but show a persistent high-priority banner and settings call-to-action.
- For higher security, allow only dashboard + settings until credentials are changed. If product chooses unrestricted first-login access, document the risk and keep the banner non-dismissible.
- A credential update must require the current password, a new username, new password, and new-password confirmation.
- Reject a new username or password equal to the manager's normalized phone number.
- Require at least 8 characters; prefer 12+, and check against a short denylist of common/compromised patterns.
- Revoke all other sessions after credential changes; rotate the current session or require a fresh login.
- Audit provisioning, activation/deactivation, school assignment, successful credential change, failed changes, lock/unlock, and session revocation without sensitive values.

### 4.4 School-scoped authorization

Create a reusable school-scope guard/service. A manager request must derive permitted school IDs from the authenticated manager assignment; it must never trust a `schoolId` supplied by the browser without checking the assignment.

Mandatory rules:

- A `SCHOOL_MANAGER` can query only students whose `students.schoolId` belongs to an active manager assignment.
- A student detail endpoint repeats the school-scope predicate in the database query; it must not fetch by ID and check only in the UI.
- Approved photo access must verify the student belongs to the manager's school before returning a short-lived URL or proxying image bytes.
- Manager feedback ownership is derived from the session.
- Manager settings can update only the authenticated manager's credentials, never school records or another manager.
- Platform-admin routes remain `ADMIN` only.
- Every cross-school IDOR attempt returns a generic 404 or 403 according to the repository's error policy and creates a security/audit signal where appropriate.

## 5. Unified login/register experience

### 5.1 Route behavior

- Keep `/login` as the canonical shared entry page.
- Keep `/register` redirecting to `/login`; update route metadata/copy so users understand that student registration begins from the student role.
- Keep `/admin/login` separate for platform administrators; do not show it as one of the three public portal cards.
- If a valid session opens `/login`, route it to its correct portal: `PARENT -> /student/dashboard`, `SCHOOL_MANAGER -> /manager/dashboard`, `ADMIN -> /admin/dashboard`.
- Sanitize the `next` parameter and allow only same-origin routes valid for the authenticated role.

### 5.2 Visual composition

Use a strong, modern split composition consistent with the public/student UI:

- Branded intro area with a subtle route-line/transport motif, concise security copy, and school-service illustration built from existing brand primitives.
- Three large role cards or a segmented role selector with icon, title, short explanation, and clear selected state.
- Selected role animates a shared indicator and reveals the matching form without layout jump.
- Student accent: transit blue/sky; manager accent: navy/sun; driver accent: slate/coral with disabled treatment.
- On mobile, stack role cards above the form and keep primary action within easy thumb reach.
- Preserve high contrast, visible focus, reduced-motion behavior, and minimum 44px controls.

Do not use three visually unrelated pages inside one screen. The selector and form should feel like one coherent secure gateway.

### 5.3 Role-specific behavior and copy

**Student/family**

- Fields: `شماره همراه سرپرست`, `کد ملی دانش‌آموز`.
- Preserve existing validation, normalization, onboarding redirect, remember-me behavior, and generic credential errors.
- Primary action: `ورود یا ثبت‌نام`.

**School manager**

- Fields: `نام کاربری`, `رمز عبور`.
- Helper text: `نام کاربری اولیه و رمز عبور اولیه توسط سامانه ایجاد می‌شود.`
- Primary action: `ورود به پنل مدرسه`.
- Use a generic failure message so account existence is not disclosed.
- Provide show/hide password, Caps Lock hint when detectable, loading state, and retry-safe submission.

**Driver**

- Show representative username/password fields disabled with `aria-disabled` semantics.
- Disable the submit button.
- Badge: `به‌زودی`.
- Message: `پنل رانندگان در حال آماده‌سازی است و به‌زودی در دسترس قرار می‌گیرد.`
- Do not submit a request, create a session, or collect typed credentials.

## 6. Manager portal information architecture

Proposed routes:

```text
/manager
  /dashboard
  /students
  /students/[studentId]
  /drivers
  /drivers/[driverId]
  /online-control
  /hyperschool
  /feedback
  /settings
```

`/manager` redirects to `/manager/dashboard`.

### 6.1 Shell and navigation

The manager shell should reuse the structural lessons of the student shell without copy/pasting it wholesale:

- Desktop: fixed/sticky RTL sidebar, school identity block, grouped navigation, active-route indicator, user menu, logout.
- Tablet/mobile: top bar + accessible drawer; optional bottom dock for Dashboard, Students, Drivers, and More.
- Main area: breadcrumbs, page heading, contextual actions, content canvas.
- Show the active school name and current academic year in the shell.
- If multiple schools are supported, add an accessible school switcher and clear cached queries on switch.
- Display the forced credential-change banner across every manager page until resolved.
- Navigation labels:
  - `داشبورد`
  - `دانش‌آموزان`
  - `رانندگان`
  - `کنترل آنلاین`
  - `هایپراسکول`
  - `انتقادات و پیشنهادات`
  - `تنظیمات`

## 7. Dashboard specification

The dashboard is an operational overview, not decorative statistics. It should answer: how many students are served, what needs attention, and where can the manager go next?

### 7.1 Summary cards

- Active students in the selected school.
- Students with/without approved photo.
- Assigned drivers (mock count in this phase, visibly labeled experimental).
- Active service registrations grouped by status where available.
- Unanswered feedback count for this manager if manager replies are included.
- Online-control status card: `در حال آماده‌سازی`, never `offline` or `disconnected` because no telemetry exists.

### 7.2 Dashboard modules

- Welcome header with manager name and school name.
- Temporary credential security alert and direct link to settings.
- Quick actions: view students, view drivers, send feedback, open online-control preview.
- Student distribution by education level/grade using compact bars or chips; avoid complex chart dependencies unless needed.
- Recent enrollment/activity summary using real school-scoped data only.
- `امکانات در راه` card for GPS, video, and HyperSchool.
- Empty states for schools with no students or no registration activity.

### 7.3 Dashboard API

`GET /manager/dashboard`

Return one school-scoped aggregate payload rather than making many page-load requests:

- school summary
- manager summary
- student counts
- photo coverage counts
- registration status counts
- recent activity limited to a small safe number
- mock-driver summary only when the server-side feature flag is enabled, otherwise an availability status
- credential-change requirement

Avoid returning national IDs, addresses, phone numbers, document keys, or other detail data in the dashboard payload.

## 8. Manager students directory

### 8.1 List content

Show a responsive desktop table and mobile cards with:

- Approved student photo or initials placeholder.
- Full name.
- Education level (`مقطع تحصیلی`) and grade (`پایه تحصیلی`). In the current schema, `className` represents level in parts of the service; normalize API naming to `educationLevel` and document the mapping.
- Primary attendant/guardian name (`نام سرپرست`).
- Student national ID, masked in the list by default (for example `***1234`) with full display only if explicitly approved.
- Assigned driver name (mock/experimental in this phase).
- Vehicle type and service type (mock/experimental where no real assignment exists).
- Enrollment/service status.

Do not include guardian phone numbers. Avoid guardian national ID unless product/legal review explicitly approves it.

### 8.2 Search, filter, sort, and pagination

Server-side query parameters:

- `page`, `pageSize` with bounded maximum.
- `query`: normalized Persian/Arabic characters and digit forms; search name, student code, and exact/authorized national ID behavior.
- `educationLevel`.
- `grade`.
- `serviceType`.
- `registrationStatus`.
- `photoStatus`.
- `driverAssignmentStatus`: experimental until real assignments exist.
- `sortBy`: allowlisted `name | grade | createdAt | registrationStatus`.
- `sortOrder`: `asc | desc`.

Requirements:

- Debounce free-text search.
- Store filters in the URL so refresh/back/share within the authenticated portal is predictable.
- Reset page to 1 when filters change.
- Use stable secondary sort by ID.
- Show active filter chips and one-click clear.
- Provide count-aware empty states (`no students in school` versus `no filter results`).

### 8.3 Student detail

Clicking a row/card opens `/manager/students/[studentId]` with:

- Photo and identity summary.
- School program details.
- Guardian/attendant name(s) with only approved contact fields.
- Current registration/service summary.
- Driver/service preview explicitly marked experimental until real assignment data exists.
- No mutation controls in this phase.

Every field should be explicitly selected in a manager DTO; never serialize the full student/family aggregate used by platform admins.

## 9. Drivers directory with experimental data

### 9.1 Data strategy

Because the driver domain does not exist, do not create pretend production records in the main database. Add a typed mock adapter:

- Static fixture data in source or a dedicated development fixture file.
- Enabled only through `NEXT_PUBLIC_MANAGER_DRIVER_PREVIEW` for presentation and a corresponding server setting if served by API.
- Prominent `اطلاعات آزمایشی` badge on list, detail, dashboard metric, and any student assignment preview.
- Deterministic IDs and data so tests are stable.
- No real phone numbers, national IDs, license numbers, faces, or document scans.
- Use fictional names and obviously synthetic masked document identifiers.

Recommended initial approach: a frontend mock repository under `apps/web/src/features/manager-drivers/mock-drivers.ts` because no driver API/domain exists. Encapsulate access behind a repository interface so a later API implementation replaces the adapter without rewriting UI components.

### 9.2 Driver list content

- Synthetic portrait/avatar.
- Full name.
- Vehicle type: bus, minibus, van, sedan, etc.
- Vehicle make/model and color.
- Masked plate presentation.
- Capacity.
- Assigned student count.
- Service area/route label.
- Document review status.
- Availability/status as `آزمایشی`, not a real operational state.

The driver's phone number must never appear in list, detail, search index, fixture, API payload, DOM attributes, client cache, or exports.

### 9.3 Driver filters and sorting

- Search by synthetic name, vehicle, or route.
- Filter by vehicle type, capacity band, document status, and experimental assignment status.
- Sort by name, vehicle type, capacity, or assigned student count.
- URL-backed filters and responsive cards/table matching the students directory.

### 9.4 Driver detail

`/manager/drivers/[driverId]` shows:

- Identity card (without phone number).
- Vehicle details.
- Service summary and assigned-student mock count.
- Document cards: driving license, vehicle card, insurance, technical inspection, background-check placeholder.
- Each document uses synthetic metadata and a generic illustrative placeholder—never a realistic personal document image.
- Document state chips such as `تأیید آزمایشی`, `نیازمند بررسی آزمایشی`.
- Clear banner explaining the entire page is preview data.
- No download, approve, reject, edit, call, or message actions.

### 9.5 Future replacement contract

Define TypeScript interfaces now: `ManagerDriverSummary`, `ManagerDriverDetail`, `DriverVehicle`, `DriverDocumentSummary`, and `DriverRepository`. Later implementation can add real backend tables/endpoints while keeping page components stable.

## 10. Online control placeholder

Create `/manager/online-control` as a polished preview room with two tabs/cards:

### 10.1 Live location (`موقعیت زنده`)

- Map-shaped preview canvas using a neutral grid/route illustration; do not show fake moving markers.
- Disabled driver selector.
- Disabled `نمایش موقعیت زنده` button.
- Availability badge and explanatory copy.

### 10.2 Live video (`تصویر زنده داخل خودرو`)

- Camera-grid preview with privacy shield icon.
- Disabled vehicle/camera selector.
- Disabled `مشاهده تصویر زنده` button.
- Privacy/safety note stating that access controls and required approvals will apply when launched.

Use explicit copy such as:

`این قابلیت در حال آماده‌سازی است. در حال حاضر هیچ موقعیت یا تصویر زنده‌ای دریافت یا نمایش داده نمی‌شود.`

Do not request browser camera/location permission, connect WebSockets, poll endpoints, load map tiles, or emit monitoring analytics.

## 11. HyperSchool placeholder

Create `/manager/hyperschool` with a purposeful coming-soon composition:

- Short explanation of the future service without promising unapproved capabilities.
- Illustrated feature cards in disabled state.
- `به‌زودی` badge.
- No form, purchase action, waitlist collection, or external link unless separately approved.

Suggested copy:

`هایپراسکول در نسخه‌های آینده به پنل مدیر مدرسه اضافه می‌شود. جزئیات و زمان فعال‌سازی از طریق سامانه اعلام خواهد شد.`

## 12. Manager feedback

### 12.1 User experience

- Reuse the visual/form behavior from the student feedback page.
- Heading: `انتقادات و پیشنهادات`.
- Explain that the message goes to platform administration.
- Fields: category, subject, message; student reference is not applicable.
- Show validation, sending, success, retry, and rate-limit states in Persian.
- If response history is enabled, show the manager's own messages and admin responses only.

### 12.2 Backend model and API

Preferred approach: evolve feedback to an explicit polymorphic sender:

- `sender_type: PARENT | SCHOOL_MANAGER`
- `sender_id`
- optional `school_id` snapshot/reference for manager feedback

If a polymorphic FK cannot be enforced, validate references transactionally in the service and add typed indexes. Do not store manager messages under a fake parent user.

Endpoints:

- `POST /manager/feedback`
- `GET /manager/feedback`
- optionally `GET /manager/feedback/:id`

Admin feedback views gain sender type and school filters. Existing student behavior remains backward compatible.

### 12.3 Safety and privacy

- Derive sender and school from session/assignment.
- Store plain text and render escaped output.
- Reuse rate limits, length validation, audit, pagination, optimistic concurrency, and notification patterns.
- Never expose messages from another school manager.
- Do not put full feedback text in SMS, logs, or analytics.

## 13. Manager settings

### 13.1 School information

Read-only card:

- School name, type, gender type, province/city/district, address, school phone, hours, education levels/grades, and active status.
- Do not allow edits in this phase.

### 13.2 Manager information

Read-only or admin-controlled fields:

- First and last name.
- Phone number (masked where appropriate).
- Email.
- Assigned school(s).
- Last login time.

### 13.3 Credential change form

- Current password.
- New username.
- New password.
- Confirm new password.
- Password strength/help text.
- Save button with pending, success, field-error, conflict, and expired-session states.
- Non-dismissible warning while temporary credentials remain:

`برای امنیت اطلاعات دانش‌آموزان، نام کاربری و رمز عبور اولیه خود را همین حالا تغییر دهید.`

API:

- `GET /manager/settings`
- `PATCH /manager/settings/credentials`

The credential mutation must be rate-limited, audited, protected against CSRF/trusted-origin issues using existing patterns, and revoke other sessions.

## 14. Proposed backend files

### 14.1 Database

- **New:** `apps/api/src/database/schemas/school-managers.schema.ts`
- Modify `apps/api/src/database/schemas/index.ts`
- Modify `apps/api/src/database/schemas/auth.schema.ts` comments/role constraints where needed
- Modify `apps/api/src/database/schemas/feedback.schema.ts`
- **New forward migration:** next numbered file under `apps/api/drizzle/`
- Update `apps/api/src/database/seed.ts` with safe development-only manager provisioning if needed
- Update bootstrap tests; never provision default manager credentials silently in production

### 14.2 Identity and access control

- Modify `apps/api/src/common/authentication.types.ts`
- Modify `apps/api/src/common/http-request.ts` if request-user typing is duplicated
- Modify `apps/api/src/modules/access-control/auth.guard.ts`
- Modify role/ownership tests under `apps/api/src/modules/access-control/`
- **New:** `apps/api/src/modules/access-control/school-manager-scope.service.ts`
- **New:** `apps/api/src/modules/access-control/school-manager-scope.guard.ts` only if route metadata is useful
- Modify `apps/api/src/modules/identity/domain/auth.types.ts`
- Modify `apps/api/src/modules/identity/application/auth.service.ts`
- Modify `apps/api/src/modules/identity/presentation/auth.controller.ts`
- Add manager-login DTO validation and tests

### 14.3 Manager module

Create a dedicated module rather than scattering manager-only queries across admin controllers:

- **New:** `apps/api/src/modules/school-managers/school-managers.module.ts`
- **New:** `apps/api/src/modules/school-managers/school-managers.controller.ts`
- **New:** `apps/api/src/modules/school-managers/school-managers.service.ts`
- **New:** `apps/api/src/modules/school-managers/school-manager.dto.ts`
- **New:** focused tests for dashboard, student list/detail, settings, scope, and credential changes
- Modify `apps/api/src/app.module.ts`

If student query logic is reusable, extract a domain/query helper; do not call an admin controller or return the broad admin DTO.

### 14.4 Feedback and photos

- Modify `apps/api/src/modules/feedback/**` for sender type and manager endpoints or add a manager controller within the module.
- Add a manager-safe photo endpoint/authorization path under `apps/api/src/modules/student-images/**` if approved photos appear in manager views.
- Ensure object keys never reach the client.

### 14.5 OpenAPI

- Update Swagger decorators/types.
- Regenerate `apps/api/openapi.json`.
- Regenerate `apps/web/src/generated/api-contract.ts`.
- Run contract drift checks.

## 15. Proposed frontend files

### 15.1 Authentication

- Modify `apps/web/src/app/(auth)/login/page.tsx`
- Keep/adjust `apps/web/src/app/(auth)/register/page.tsx`
- Modify `apps/web/src/app/(auth)/layout.tsx` if the new composition needs a wider canvas
- Refactor `apps/web/src/features/auth/auth-forms.tsx` into role-specific components
- Modify `apps/web/src/features/auth/auth-api.ts`
- Modify `apps/web/src/features/auth/auth-session.ts`
- Modify `apps/web/src/features/auth/portal-session-guard.tsx`
- Add role-selector and manager-login tests

Suggested new files:

- `apps/web/src/features/auth/portal-role-selector.tsx`
- `apps/web/src/features/auth/student-portal-login-form.tsx`
- `apps/web/src/features/auth/manager-portal-login-form.tsx`
- `apps/web/src/features/auth/driver-coming-soon-form.tsx`

### 15.2 Manager shell and routes

- **New:** `apps/web/src/app/manager/layout.tsx`
- **New:** `apps/web/src/app/manager/page.tsx`
- **New:** route pages listed in section 6
- **New:** `apps/web/src/features/manager-shell/manager-shell.tsx`
- **New:** manager shell navigation/config tests
- Extend shared breadcrumbs/page-heading only if needed

### 15.3 Manager feature folders

- **New:** `apps/web/src/features/manager-dashboard/`
- **New:** `apps/web/src/features/manager-students/`
- **New:** `apps/web/src/features/manager-drivers/`
- **New:** `apps/web/src/features/manager-online-control/`
- **New:** `apps/web/src/features/manager-hyperschool/`
- **New:** `apps/web/src/features/manager-settings/`
- Reuse or extend `apps/web/src/features/feedback/`

Each feature should keep API/repository logic separate from page composition and use generated contract types where possible.

### 15.4 Shared UI additions

Add only if existing primitives cannot cover the need:

- `avatar` / student-photo component with safe fallback
- `data-toolbar` for search/filter/sort
- `stat-card`
- `coming-soon-panel`
- responsive `entity-list` conventions
- `credential-security-banner`

Avoid introducing a new UI framework or duplicate button/card/input styles.

## 16. API contract outline

| Method | Route                           | Role           | Purpose                                      |
| ------ | ------------------------------- | -------------- | -------------------------------------------- |
| POST   | `/auth/manager/login`           | Public         | Manager username/password login              |
| GET    | `/auth/me`                      | Authenticated  | Include new role and credential-change state |
| GET    | `/manager/dashboard`            | SCHOOL_MANAGER | School-scoped aggregates                     |
| GET    | `/manager/students`             | SCHOOL_MANAGER | Filtered, sorted, paginated directory        |
| GET    | `/manager/students/:id`         | SCHOOL_MANAGER | Manager-safe student detail                  |
| GET    | `/manager/settings`             | SCHOOL_MANAGER | Manager + assigned school summary            |
| PATCH  | `/manager/settings/credentials` | SCHOOL_MANAGER | Change temporary credentials                 |
| POST   | `/manager/feedback`             | SCHOOL_MANAGER | Send message to platform admin               |
| GET    | `/manager/feedback`             | SCHOOL_MANAGER | List own messages if enabled                 |

There is no driver, GPS, camera, or HyperSchool API in this phase.

All list endpoints must use bounded pagination, allowlisted sorts, DTO transformation, stable ordering, and response envelopes consistent with the current API.

## 17. UI design system guidance

### 17.1 Visual concept

Use the existing transportation identity as a “school operations control desk”:

- Paper background with layered white cards.
- Navy manager rail for authority and clarity.
- Transit-blue active states and links.
- Sun accent for manager/security attention.
- Sky panels for filters/information.
- Coral only for warnings or unavailable features, never as the primary manager color.
- Route lines, stops, vehicle silhouettes, and ticket-like dividers as restrained brand details.

### 17.2 Component quality

- Clear information hierarchy; avoid a wall of equally weighted cards.
- Use whitespace and grouped toolbars to keep dense directories readable.
- Sticky table header on large lists where practical.
- Mobile cards must preserve all essential information without horizontal scrolling.
- Skeletons should match final card/table shapes.
- Motion should clarify role selection, filter changes, and navigation; respect `prefers-reduced-motion`.
- All Persian numerals/date formatting should follow the existing formatters and Jalali conventions where applicable.

### 17.3 Accessibility

- Logical RTL keyboard order.
- Role selector implemented as tabs or radio group with correct semantics.
- Visible focus and screen-reader-selected state.
- Disabled coming-soon controls remain understandable; do not rely on opacity alone.
- Tables have captions/headers; mobile cards expose equivalent labels.
- Status never conveyed by color alone.
- Dialog/drawer focus trapping and restoration.
- Axe checks plus manual keyboard/screen-reader smoke tests.

## 18. Security, privacy, and operational requirements

- Treat student, guardian, driver, school, and monitoring data as sensitive.
- Prefer minimal manager DTOs and explicit field selection.
- Never expose driver phone numbers, including future endpoints.
- Mask national IDs in lists and logs; show full values only after explicit authorization/product approval.
- Rate-limit manager login and credential changes by account/IP using existing trusted-IP configuration.
- Use generic login failures and account lockout/backoff without enabling denial-of-service abuse.
- Keep cookies/session TTLs intentional for manager role; do not automatically inherit platform-admin cookie behavior without review.
- Update polymorphic-session comments, validation, refresh, logout, revocation, and concurrency tests for `SCHOOL_MANAGER`.
- Audit sensitive student detail/photo access if required by privacy policy.
- Ensure server logs, traces, metrics, and error reports do not include credentials, national IDs, feedback bodies, signed photo URLs, or future tracking/video data.
- Set `Cache-Control: private, no-store` on sensitive manager responses where appropriate.
- Do not prefetch sensitive detail routes unnecessarily.
- Mock data must be unmistakably synthetic and must not accidentally ship as unlabeled operational data.

## 19. Implementation sequence

### Phase 0 — decisions and UX contract

- [ ] Resolve decisions in section 3.3.
- [ ] Approve Persian copy and field visibility matrix.
- [ ] Produce low-fidelity desktop/mobile flows for login, shell, students, drivers, and settings.
- [ ] Define feature flags and production behavior for experimental drivers.
- [ ] Threat-model manager authentication and school-scoped student access.

### Phase 1 — identity and database

- [x] Add manager account/assignment schemas and migration.
- [x] Add `SCHOOL_MANAGER` to server and web role types.
- [x] Extend session generation, refresh, revocation, `/auth/me`, guard account lookup, and cookie handling.
- [x] Implement secure manager provisioning path.
- [x] Implement manager login and lockout/rate-limit behavior.
- [x] Add forced credential-change state and mutation.
- [x] Add unit/integration tests before building protected pages.

### Phase 2 — shared portal login

- [x] Build accessible three-role selector.
- [x] Preserve student form behavior exactly.
- [x] Add manager login form and correct redirects.
- [x] Add disabled driver form and coming-soon copy.
- [x] Update route guard and wrong-role redirects.
- [x] Test refresh, back/forward cache, remember-me, invalid `next`, and concurrent sessions.

### Phase 3 — manager shell and settings

- [x] Build responsive shell/navigation.
- [x] Add manager layout guard and route error/loading boundaries.
- [x] Implement settings query and read-only school/manager cards.
- [x] Implement credential-change banner/form and session revocation behavior.
- [ ] Verify keyboard/drawer/mobile navigation.

### Phase 4 — manager student data

- [x] Add school-scope service/guard.
- [x] Build manager-safe student list DTO/query with filters, sort, and pagination.
- [ ] Add approved-photo access with school scope.
- [x] Build responsive directory and student detail.
- [ ] Add IDOR, field-leakage, pagination, filtering, and photo authorization tests.

### Phase 5 — dashboard

- [x] Add aggregate dashboard endpoint.
- [x] Build summary cards, distributions, activity, quick actions, and empty states.
- [x] Verify no sensitive overfetching and acceptable query count/performance.

### Phase 6 — experimental drivers

- [x] Define repository interfaces and deterministic fixtures.
- [x] Build preview list/detail, documents, and badges (the small deterministic fixture set does not need separate server filtering).
- [x] Confirm phone number is absent from types, fixtures, UI, and tests.
- [x] Add feature-flag behavior and production-safe unavailable state.

### Phase 7 — placeholders and feedback

- [x] Build online-control location/video preview with no network/device behavior.
- [x] Build HyperSchool coming-soon page.
- [x] Extend feedback sender model and admin filters.
- [x] Build manager feedback form/history and ownership tests.

### Phase 8 — verification and rollout

- [x] Regenerate OpenAPI/web contract.
- [ ] Run formatting, lint, typecheck, unit, integration, and E2E tests. (Formatting, lint, typecheck, focused unit/integration tests, and production build pass; live E2E requires a running API/database.)
- [ ] Run desktop/tablet/320px visual checks and axe checks.
- [x] Verify Persian copy, RTL layout, loading/error/empty states, and reduced motion.
- [x] Verify role isolation among PARENT, SCHOOL_MANAGER, and ADMIN.
- [x] Verify a manager assigned to School A cannot enumerate or access School B students/photos.
- [x] Verify mock driver labels and disabled features in the production-like build.
- [ ] Roll out behind a manager-portal feature flag to a pilot school.
- [ ] Monitor login failures, authorization denials, API errors, and performance without logging sensitive data.

## 20. Test plan

### 20.1 Backend

- Manager account constraints, assignments, normalization, and migration behavior.
- Correct Argon2 verification and no plaintext persistence.
- Generic response for unknown username, wrong password, inactive/locked account.
- Rate limit and lockout recovery.
- Session refresh/rotation/revocation for `SCHOOL_MANAGER`.
- Credential change requires current password, rejects phone-number credentials, and revokes other sessions.
- School-scoped dashboard/student list/detail/photo queries.
- Cross-school IDOR attempts.
- Pagination bounds, allowlisted sorts, normalized search, stable secondary order.
- DTO leakage tests explicitly assert forbidden fields are absent.
- Feedback sender ownership and admin filtering.

### 20.2 Frontend unit/integration

- Keyboard role selection and selected-panel semantics.
- Student login regression.
- Manager login validation, pending/error/success states, redirect.
- Driver fields and action remain disabled and trigger no request.
- Portal guard accepts manager role and reroutes wrong roles safely.
- Sidebar/drawer active routes and logout cleanup.
- Filter URL synchronization and clear behavior.
- Student table/mobile-card equivalence.
- Driver fixture filters and explicit experimental labels.
- Credential warning visibility and settings validation.
- Coming-soon pages contain no active monitoring calls.

### 20.3 E2E journeys

1. Student selects student portal, signs in, and reaches existing dashboard.
2. New/pending student account continues onboarding without regression.
3. Manager uses temporary credentials, reaches manager dashboard, sees mandatory warning, changes credentials, and signs in again.
4. Manager filters students and opens an allowed detail.
5. Manager cannot open another school's student by URL.
6. Manager browses experimental drivers and sees no phone number.
7. Online-control controls are disabled and no camera/location prompt occurs.
8. Manager submits feedback and sees only their own history.
9. Driver role shows coming soon and performs no authentication request.
10. Platform admin login and portal remain separate and unaffected.

### 20.4 Visual/responsive matrix

- Chromium desktop at 1440px.
- Laptop at 1024/1280px.
- Tablet at 768px.
- Mobile at 390px and 320px.
- Long Persian names, long school names, missing photos, empty lists, validation errors, and slow loading.
- Light theme only unless dark theme is separately in scope.

## 21. Performance requirements

- Avoid loading manager page code in the public landing bundle.
- Lazy-load heavy preview content and future map-related components.
- Do not load Leaflet/map tiles for the non-functional online-control placeholder.
- Use bounded API responses and database indexes for school/status/filter paths.
- Avoid N+1 queries for guardian names, registration summaries, and approved photos.
- Use optimized/private image delivery with explicit dimensions to prevent layout shift.
- Set practical dashboard/list latency budgets and verify them with seeded school-sized data.

## 22. Feature flags and deployment

Recommended flags:

- `MANAGER_PORTAL_ENABLED`
- `MANAGER_LOGIN_ENABLED`
- `MANAGER_DRIVER_PREVIEW_ENABLED`

Rules:

- Backend authorization remains authoritative regardless of frontend flags.
- When manager login is disabled, show a friendly unavailable message and do not expose the form action.
- Driver preview off: show a polished coming-soon directory page, not an empty operational table.
- Rollback can disable manager entry without altering student/admin portals or deleting accounts.
- Apply migration before enabling manager authentication.

## 23. Definition of done

The feature is complete only when all statements below are true:

- [x] `/login` presents all three roles in one cohesive, accessible design.
- [x] Student login/registration has no functional regression.
- [x] Manager accounts are distinct from platform admins and tied to assigned schools.
- [x] Manager sessions, refresh, logout, and role guards work end to end.
- [x] Temporary credentials are hashed, clearly flagged, and safely changeable.
- [x] Manager dashboard contains useful real school-scoped information and clear navigation.
- [x] Students list/detail includes only approved fields and cannot cross school boundaries.
- [x] Driver list/detail uses clearly labeled deterministic experimental data and contains no phone number.
- [x] Online location, video, driver login, and HyperSchool are visibly unavailable and perform no hidden implementation/network/device access.
- [x] Manager feedback reaches platform administration with correct ownership and privacy.
- [x] Settings shows school/manager details and supports secure credential change.
- [ ] Desktop, tablet, mobile, RTL, keyboard, reduced-motion, and automated accessibility checks pass.
- [ ] OpenAPI contracts, tests, documentation, feature flags, monitoring, and rollout steps are complete. (Repository contracts/docs/flags are complete; live E2E, monitoring, and pilot rollout remain operational steps.)

## 24. Future handoff notes

When real drivers are implemented, create a separate driver-domain specification covering identity, licensing/document privacy, vehicle ownership, student assignment, route/trip state, emergency workflows, GPS consent/retention, and camera legal/privacy requirements. Replace `DriverRepository`'s mock adapter with the real API, remove experimental labels only after real data validation, and do not infer monitoring consent from ordinary portal terms.

The live-control feature should not be implemented as a simple UI follow-up. It requires a dedicated architecture and privacy review covering device authentication, streaming protocols, encryption, authorization, audit logs, data retention, access alerts, incident handling, child safeguarding, and applicable law.

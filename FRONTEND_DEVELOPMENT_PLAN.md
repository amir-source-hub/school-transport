# School Transport Platform — Frontend Development Plan

> Status: Planning  
> Application: `apps/web`  
> Architecture: One Next.js App Router application for public, auth, parent, and admin areas  
> Progress: `0 / 10 phases complete` — `0%`

## Progress Tracker

| Phase | Result                             | Status      | Progress |
| ----- | ---------------------------------- | ----------- | -------: |
| F0    | UI and contract decisions approved | Not started |       0% |
| F1    | Web foundation and design system   | In progress |      90% |
| F2    | API, session, and state foundation | In progress |      40% |
| F3    | Public and authentication areas    | In progress |      40% |
| F4    | Parent shell and family/student UI | Not started |       0% |
| F5    | Enrollment flow                    | Not started |       0% |
| F6    | Contracts, pricing, payments       | Not started |       0% |
| F7    | Admin panel                        | Not started |       0% |
| F8    | Accessibility, resilience, tests   | In progress |      20% |
| F9    | Build and release readiness        | In progress |      15% |

## 1. Frontend Rules

- [ ] Read `frontend-architecture.md`, UI/UX specification, product/business rules, roles/permissions, API spec, errors, security, performance, and testing docs before each feature.
- [ ] Use one web application. Separate public, auth, parent, and admin concerns through route groups/layouts/features—not separate projects.
- [ ] Use Server Components by default; add `'use client'` only for browser interaction.
- [ ] Use the generated OpenAPI client/types. Do not manually duplicate backend DTOs or infer undocumented fields.
- [ ] Use TanStack Query for server state, React Hook Form for forms, Zod for client UX validation, URL parameters for shareable filters, local React state for local UI, and Zustand only for small shared UI state.
- [ ] Never place authoritative pricing, contract, payment, status-transition, permission, or ownership rules in the frontend.
- [ ] Build mobile-first, RTL/Persian-ready, keyboard accessible, and responsive from the first component.
- [ ] Every data view must define loading, refetching, empty, error, success, unauthorized, and expired-session behavior as applicable.
- [ ] Reuse accessible shadcn/ui and Radix primitives; do not create duplicate components or introduce undocumented UI libraries.
- [ ] Keep feature code cohesive, components small, names explicit, and side effects inside focused hooks/services.

## 2. Required Folder Structure

```text
apps/web/src/
├── app/
│   ├── (public)/
│   ├── (auth)/
│   ├── parent/
│   └── admin/
├── features/
│   ├── authentication/
│   ├── families/
│   ├── students/
│   ├── registrations/
│   ├── service-requests/
│   ├── schools/
│   ├── contracts/
│   ├── pricing/
│   ├── payments/
│   ├── notifications/
│   └── profile/
├── components/
│   ├── ui/
│   ├── forms/
│   ├── navigation/
│   ├── feedback/
│   ├── data-display/
│   └── common/
├── hooks/
├── lib/
├── providers/
├── stores/
├── styles/
└── types/
```

Each feature contains only what it needs: `api/` or `services/`, `components/`, `hooks/`, `schemas/`, `types/`, `utils/`, and `constants/`. Promote something to shared code only after genuine reuse; avoid catch-all `utils` and oversized components.

## 3. Frontend Git Workflow

Git is initialized once at the monorepo root as described in `APP_DEVELOPMENT_PLAN.md`.

- [ ] Create a short-lived branch: `git switch -c feat/frontend-<feature>`.
- [ ] Confirm the backend OpenAPI contract is approved before integrating a feature.
- [ ] Commit generated API client changes clearly and review their contract diff.
- [ ] Run web lint, formatting, type checks, unit/component tests, accessibility checks, E2E for affected journeys, and production build before push.
- [ ] Include screenshots for desktop/mobile/RTL states and a checklist of loading/error/empty states in the PR.

Frontend commit examples:

- `feat(web): add responsive parent dashboard shell`
- `feat(enrollment): add student information step`
- `feat(payments): show verification pending state`
- `fix(web): preserve form values after api error`
- `test(web): cover admin payment approval dialog`
- `refactor(ui): extract accessible status badge`
- `docs(web): document route access behavior`

Keep visual-only refactors separate from behavioral changes when practical. Do not commit build output, local environment files, or sensitive browser traces.

## 4. Step-by-Step Frontend Plan

### F0 — resolve UI and contract decisions

- [ ] Wait for the empty `enrollment-form-specification.md` to be completed and approved before final enrollment fields/steps are built.
- [ ] Confirm canonical OpenAPI routes, DTOs, status labels, pagination, errors, and authentication-cookie behavior.
- [ ] Extract approved color, typography, spacing, RTL, responsive, component, and content rules from the UI/UX specification.
- [ ] Map every parent/admin route to its documented permission and ownership rule.
- [ ] Identify which supplied images are approved for which public/auth pages; do not assign them by guesswork.

### F1 — application and design-system foundation

- [ ] Scaffold Next.js App Router with strict TypeScript, Tailwind CSS, shadcn/ui, Radix UI, Lucide React, Motion, and documented fonts/localization.
- [ ] Add `(public)`, `(auth)`, `parent`, and `admin` layouts with separate navigation and error/loading boundaries.
- [ ] Configure RTL and Persian content/date/number/currency behavior exactly as the UI and business docs require; use `date-fns`/`date-fns-jalali` where documented.
- [x] Build tokens and accessible primitives for buttons, inputs, selections, dialogs, drawers, cards, badges, tables, pagination, breadcrumbs, feedback, and skeletons.
- [x] Add consistent page container, headings/actions, focus styles, reduced motion, touch targets, and responsive breakpoints.
- [x] Document reusable component APIs and avoid business-specific behavior in the UI package.

### F2 — API, authentication, and state foundation

- [ ] Generate the typed client from backend OpenAPI using the approved Orval/OpenAPI Generator configuration.
- [x] Build the central API layer for base URL, credentials, headers, correlation/error handling, timeout, cancellation, and safe session expiry.
- [x] Configure TanStack Query defaults deliberately; do not retry non-idempotent mutations blindly.
- [ ] Validate protected routes on the server, render role-specific navigation, and treat hidden UI as convenience—not authorization.
- [ ] Keep refresh tokens out of local storage; follow the secure HTTP-only cookie model.
- [x] Add normalized mapping from documented backend errors to field, form, toast, dialog, or page feedback.
- [ ] Use MSW fixtures generated/aligned with OpenAPI for isolated UI tests.

### F3 — public website and authentication

- [ ] Build documented public routes: landing, about, services, schools, pricing explanation, registration guide, FAQ, contact, login, and register.
- [ ] Add semantic metadata, responsive approved imagery, optimized assets, keyboard navigation, and clear registration/login actions.
- [ ] Build register, login, verify-phone, forgot-password, and reset-password flows from backend contracts.
- [ ] Show generic authentication errors, OTP cooldown/attempt feedback, password requirements, submission locks, and safe redirects.
- [ ] Test anonymous/authenticated redirects, keyboard/screen-reader use, mobile layouts, validation, expired OTP/session, and throttling feedback.

### F4 — parent shell and family/student experiences

- [ ] Build responsive parent sidebar/drawer, breadcrumbs, account menu, notifications, and touch-friendly student selector.
- [ ] Build dashboard summaries for each selected student using documented status, registration, contract, next-payment, and notification data.
- [ ] Build family/profile and student create/view/edit flows with protected-field explanations and server error preservation.
- [ ] Prevent accidental data loss and duplicate submissions; never imply success before the API confirms it.
- [ ] Provide documented empty states for no students, registration, contract, payment, or notifications.
- [ ] Test multi-student switching, cache keys/invalidation, cross-student data isolation, mobile layout, and session expiry.

### F5 — enrollment flow

- [ ] Begin final implementation only after the enrollment-form document is approved.
- [ ] Build the approved multi-step order and fields; the architecture currently proposes family, parent, primary phone, student, school/grade, service request, emergency contact, and review.
- [ ] Use React Hook Form and Zod for usability while displaying authoritative server validation.
- [ ] Implement per-step validation, back/next, progress, approved draft saving, final review, submission lock, and recoverable-error preservation.
- [ ] Reuse family information for another student only as documented.
- [ ] Show lifecycle status, correction requests, allowed edits, and approval/rejection feedback without exposing internal notes.
- [ ] Test refresh/resume rules, browser back behavior, duplicate submission, network failure, correction/resubmission, RTL, keyboard, and narrow screens.

### F6 — pricing, contracts, installments, and payments

- [ ] Display server-calculated price and available full/installment choices; never calculate or authorize final amounts on the client.
- [ ] Build contract viewer with version/terms/payment schedule, required acknowledgment, acceptance confirmation, and immutable accepted-state presentation.
- [ ] Display one-third prepayment plus four monthly installments or full payment exactly as returned by the API.
- [ ] Build online payment initiation with disabled duplicate action, gateway transition, and return states: success, failure, cancelled, already completed, and pending verification.
- [ ] Never show payment success solely from query parameters or gateway return; wait for verified backend status.
- [ ] Build offline submission and status/history UI; build authorized receipt view/download.
- [ ] Add clear warnings against paying again during unknown/pending verification.
- [ ] Test duplicate clicks, refresh on return, stale status, timeout, amount mismatch response, offline pending/rejected/approved, and accessibility.

### F7 — admin panel

- [ ] Build admin layout, dashboard, registration/family/student/school/service-request/contract/pricing/payment/notification/settings routes that are in MVP scope.
- [ ] Use URL parameters for search, pagination, filters, sorting, tabs, and status so views are linkable and restorable.
- [ ] Use responsive tables on desktop and priority columns/scrolling/expandable rows/cards on smaller screens.
- [ ] Implement registration review/correction/approval/rejection with confirmations and conflict feedback.
- [ ] Implement pricing and contract actions only when current status permits them.
- [ ] Implement online monitoring and offline approval/rejection with confirmation, reason/notes where documented, idempotent UI behavior, and audit-result display.
- [ ] Do not add route, driver, vehicle, attendance, school-staff, accountant, dispatcher, or super-admin UI in the MVP.
- [ ] Test role denial, stale/concurrent records, filters in URLs, destructive confirmation, mobile tables, and error recovery.

### F8 — accessibility, resilience, performance, testing

- [ ] Verify semantic HTML, labels/descriptions, focus order/visibility, keyboard access, screen-reader announcements, dialog focus traps, contrast, touch targets, and reduced motion.
- [ ] Add page and feature error boundaries for enrollment, contracts, and payments.
- [ ] Verify every async screen has skeleton/loading, refetching, empty, error, unauthorized, success, and retry behavior as relevant.
- [ ] Optimize images/fonts, keep client bundles small, lazy-load heavy noncritical UI, and measure against `performance-specification.md`.
- [ ] Unit-test schemas/utilities, component-test interactions with React Testing Library, mock APIs with MSW, and E2E critical journeys with Playwright.
- [ ] Run documented desktop/mobile browser coverage and payment gateway sandbox scenarios.

### F9 — build and release readiness

- [ ] Validate production environment variables without exposing secrets to the browser.
- [ ] Run clean install, generated-client check, lint, type check, unit/component tests, accessibility checks, E2E smoke tests, and production build.
- [ ] Verify CSP/security headers, cookie behavior, API origin/CORS expectations, error reporting, and source-map policy with the backend/deployment docs.
  - [x] Configure and test the documented browser security headers and environment-aware CSP.
  - [ ] Verify cookie behavior, deployed API origin/CORS, error reporting, and source-map policy when the backend and deployment contracts are available.
- [ ] Deploy staging, complete public/parent/admin acceptance on desktop and mobile RTL layouts, and verify payment return flows.
- [ ] Follow `school-transport-deployment-specification.md` for release, monitoring, and rollback.

## 5. Frontend Definition of Done

- [ ] UI behavior is traceable to approved product, UI/UX, permission, and API documentation.
- [ ] Generated API types are used; no manual contract duplication or invented fields exist.
- [ ] Server/client component boundaries and state-tool choices follow the architecture.
- [ ] Desktop, tablet, mobile, RTL, loading, empty, error, unauthorized, and success states are complete as relevant.
- [ ] Forms preserve safe input after recoverable errors and prevent duplicate submission.
- [ ] Accessibility checks and relevant unit/component/E2E tests pass.
- [ ] No sensitive tokens/data are stored or exposed incorrectly.
- [ ] Lint, formatting, strict type checks, tests, and production build pass.
- [ ] Screenshots and contract/test notes are reviewed.
- [ ] Plan progress is updated in the same PR.

# UI/UX Redesign — Detailed Implementation Plan

Companion to: `UI_UX_REDESIGN_PLAN.md`  
Application: `apps/web`  
Framework: Next.js 16 App Router, React 19, Tailwind CSS 4, Motion 12, Radix UI  
Language and direction: Persian (`fa`), right-to-left (`rtl`)

## 1. Implementation strategy

This redesign should be delivered as an incremental visual-system migration. Do not rewrite business logic, routes, validation, API adapters, or access rules merely to change appearance.

The correct separation is:

- Keep route files responsible for metadata, data loading, and feature composition.
- Keep `features/*` responsible for domain-aware UI and state.
- Keep `components/ui/*` small, accessible, domain-neutral primitives.
- Add `components/brand/*` for transport-specific visual language.
- Add `components/motion/*` for reusable motion behavior.
- Add `components/data-display/*` for timelines, metrics, records, and operational views.
- Keep animation client boundaries small. A server page should not become a client component just because one child animates.

The migration order is foundation → public shell/home → parent shell/dashboard → enrollment/finance → admin shell/dashboard → secondary pages → final hardening.

## 2. Rules that apply to every code change

1. Preserve the current URLs and route groups.
2. Preserve form field names and schemas unless a product/API requirement changes them.
3. Do not put Motion imports in server components. Wrap only the animated fragment in a client component.
4. Use CSS for simple hover/focus transitions; use Motion for layout continuity, gesture feedback, enter/exit orchestration, and scroll-linked storytelling.
5. All motion must use `useReducedMotion` or inherit a shared reduced-motion variant.
6. Every animated state must have an equivalent semantic state in text, `aria-current`, `aria-pressed`, `aria-live`, or native control state.
7. Decorative components must accept `className`, avoid hardcoded page width, and expose no business logic.
8. Do not introduce GSAP, Three.js, or a second animation runtime during the initial migration. The installed `motion` package is sufficient.
9. Do not copy external component code until its license, dependencies, accessibility, and source quality are reviewed.
10. Keep the existing mock-data warnings until the real API is connected.

## 3. Target source structure

Add these folders under `apps/web/src/components`:

```text
components/
├── brand/
│   ├── brand-mark.tsx
│   ├── route-field.tsx
│   ├── route-line.tsx
│   ├── route-checkpoint.tsx
│   ├── transit-ticket.tsx
│   ├── product-scene.tsx
│   └── trust-strip.tsx
├── motion/
│   ├── motion-provider.tsx
│   ├── motion-config.ts
│   ├── reveal.tsx
│   ├── stagger.tsx
│   ├── shared-indicator.tsx
│   └── animated-number.tsx
├── storytelling/
│   ├── feature-bento.tsx
│   ├── editorial-media-section.tsx
│   ├── role-switcher.tsx
│   ├── school-rail.tsx
│   └── testimonial-stack.tsx
└── data-display/
    ├── lifecycle-rail.tsx
    ├── event-timeline.tsx
    ├── metric-pulse.tsx
    ├── receipt-row.tsx
    ├── responsive-record-view.tsx
    └── definition-list.tsx
```

Add domain-aware components under their feature folders, not under generic UI:

```text
features/
├── public-home/
│   ├── public-hero.tsx
│   ├── journey-story.tsx
│   ├── ecosystem-bento.tsx
│   ├── safety-story.tsx
│   └── final-registration-cta.tsx
├── parent-dashboard/
│   ├── student-identity-switcher.tsx
│   ├── journey-status-canvas.tsx
│   ├── next-best-action.tsx
│   └── parent-dashboard.tsx
├── enrollment/
│   ├── enrollment-shell.tsx
│   ├── enrollment-progress.tsx
│   ├── enrollment-actions.tsx
│   ├── steps/
│   └── enrollment-wizard.tsx
├── finance/
│   ├── payment-summary.tsx
│   ├── payment-ledger.tsx
│   ├── payment-verification-timeline.tsx
│   └── contract-document-shell.tsx
└── admin-dashboard/
    ├── operational-pulse.tsx
    ├── queue-health.tsx
    ├── exception-feed.tsx
    └── registration-queue-preview.tsx
```

## 4. Foundation changes

### 4.1 `apps/web/src/app/globals.css`

Replace the current small token set with explicit token families. Keep existing semantic variable names temporarily as aliases so old screens do not break during migration.

Add:

- Brand tokens: `--ink`, `--transit-blue`, `--sky`, `--signal-lime`, `--sun`, `--coral`, `--paper`, `--mist`.
- Surface tokens: `--surface-paper`, `--surface-raised`, `--surface-inset`, `--surface-dark`, `--surface-glass`.
- Text tokens: `--text-strong`, `--text-body`, `--text-muted`, `--text-on-dark`.
- Border tokens: default, strong, and on-dark.
- Radius tokens: control, card, canvas, pill, and ticket. Avoid one radius for every component.
- Shadow tokens: raised, floating, overlay, and focus. Remove shadow from containers that can use tonal separation.
- Motion tokens: `--duration-fast`, `--duration-ui`, `--duration-section`, and easing curves.
- Layout tokens: public max width, portal max width, narrow reading width, shell rail width.
- Background utility classes for subtle grid/route patterns using CSS gradients rather than image assets.

Change the body background from one universal gray to surface-context classes applied by layouts. Keep body itself neutral.

Add utilities/classes for:

- `.text-balance` and controlled Persian headline wrapping.
- `.surface-paper`, `.surface-inset`, `.surface-dark`.
- `.focus-ring` if Tailwind composition becomes repetitive.
- Ticket perforation and route-dot patterns using pseudo-elements.
- Reduced-motion fallback that also disables parallax transforms and animated counters.

Do not place page-specific styling in this file.

### 4.2 `apps/web/src/app/layout.tsx`

Keep `lang="fa"`, `dir="rtl"`, the Vazirmatn import, and `AppProviders`.

Change:

- Add richer default metadata and metadata base only when the production origin is known.
- Add theme-color metadata matching the public paper/blue identity.
- Replace global `data-scroll-behavior="smooth"` if it causes route focus issues; use smooth scrolling only for explicit public-page anchors.
- Add `suppressHydrationWarning` only if a future theme mode actually requires it; do not add it preemptively.

### 4.3 `apps/web/src/providers/app-providers.tsx`

Add a small `MotionConfig` wrapper with reduced-motion preference set to user preference. Preserve the Query provider and any toast provider.

Do not make the entire application animate on route changes here. Route transitions complicate focus restoration and server rendering; section-level motion is safer.

### 4.4 Primitive components

#### `components/ui/button.tsx`

- Replace manual string concatenation with `cn`.
- Add variants: `primary`, `secondary`, `ghost`, `inverse`, and `danger`.
- Add sizes: `sm`, `md`, `lg`, and `icon`.
- Add optional leading/trailing icons without forcing icons into every button.
- Add `data-loading` presentation and a stable-width loading indicator.
- Keep native disabled semantics.
- Keep `ButtonLink` visually aligned with `Button`; do not emulate disabled anchors.
- Use CSS press feedback for ordinary buttons. Create a separate public-only animated CTA instead of putting Motion in the primitive.

#### `components/ui/card.tsx`

The current `Card` forces border, white background, padding, radius, and shadow. Replace it with a variant-driven surface primitive:

- Variants: `raised`, `outlined`, `inset`, `dark`, `transparent`.
- Padding sizes: `none`, `sm`, `md`, `lg`.
- Keep the default compatible with existing usage during migration.
- Never add hover animation by default; interactive cards must declare it explicitly.

#### Inputs, selects, textarea, checkbox

Update `input.tsx`, `select.tsx`, `textarea.tsx`, and `checkbox.tsx` to use the new control radius, 48px default touch height, consistent invalid state, focus ring, disabled surface, and placeholder contrast.

#### `components/common/page-container.tsx`

- Add `size="public" | "portal" | "reading" | "full"`.
- Retain current default until all callers migrate.
- Avoid embedding vertical padding; page sections control their own rhythm.

#### `components/common/page-heading.tsx`

- Add optional eyebrow, status, and meta slots.
- Add compact mode for admin pages and spacious mode for parent pages.
- Do not turn it into a public hero component.

#### `components/common/public-page-intro.tsx`

Deprecate the one-layout-for-all implementation. Replace with a flexible `PublicPageHero` that supports:

- `variant="editorial" | "visual" | "compact"`.
- Optional media/illustration slot.
- Optional route-pattern background.
- Actions and trust/meta row.

Migrate each public route intentionally, then delete the old component when unused.

## 5. Brand and motion components

### `components/brand/brand-mark.tsx`

Replace the current letter-in-a-blue-square logo treatment. Build a simple code-native mark from a route curve, bus/window shape, and checkpoint. It must work at 24, 32, and 40px and in single color. Use SVG with `currentColor`, decorative paths hidden from assistive technology, and visible brand text outside the SVG.

### `components/brand/route-field.tsx`

Purpose: lightweight atmospheric background for hero and CTA areas.

- Render CSS/SVG route lines and dots, not canvas/WebGL.
- Accept density and contrast props.
- Mark as decorative.
- On reduced motion, render the final static state.
- Never capture pointer events.

### `components/brand/route-line.tsx` and `route-checkpoint.tsx`

Purpose: reusable physical/process journey visualization.

- Support horizontal and vertical orientation.
- Accept current index, completed indexes, labels, and optional descriptions.
- Expose semantic ordered-list markup even when the line is decorative.
- Animate only line completion and active checkpoint; do not animate every label continuously.

### `components/motion/motion-config.ts`

Export named transitions and variants:

- `uiTransition`: fast ease-out.
- `layoutSpring`: low-bounce spring.
- `sectionReveal`: opacity plus 12–20px movement.
- `staggerContainer` and `staggerItem`.
- `reducedVariants`: final state without travel.

This prevents random durations and springs across pages.

### `components/motion/reveal.tsx`

- Client component wrapping `motion.div`.
- Props: direction, delay with a strict maximum, once, className.
- Use `whileInView` only for public content.
- Default viewport amount must prevent very late reveals.
- Content remains present and readable before hydration.

### `components/motion/shared-indicator.tsx`

Use `layoutId` for active student, nav, tab, and filter indicators. The component renders a purely decorative background while the control retains `aria-current` or `aria-pressed`.

## 6. Public shell

### `components/navigation/public-header.tsx`

Current problem: a conventional bordered sticky bar with text links and a letter logo.

Change to:

- Floating pill/rounded navigation inside the page width, with top margin on desktop.
- Solid/glass state based on scroll position in a small client child; the server-compatible link structure remains stable.
- New `BrandMark` plus shorter brand label.
- Active route indicator using `usePathname` in a focused `PublicNavLinks` client component.
- Primary registration action styled as a compact ticket/filled pill.
- Mobile navigation continues to use an accessible Drawer instead of `<details>` so focus is trapped and restored.
- Keep every current link and route.
- Add “درباره ما” if it is deliberately part of navigation; otherwise keep it in the footer.

Tests:

- Keyboard open/close and focus return.
- Active link semantics.
- Mobile menu at 320px.
- Header readability over both light and dark page heroes.

### `components/navigation/public-footer.tsx`

Change to a high-contrast closing canvas:

- Brand block, short positioning statement, support action, grouped navigation, legal row.
- Add a static/animated route line that terminates at the brand mark.
- Add operating/support metadata only when confirmed.
- Do not add fake social accounts, statistics, or addresses.
- Ensure the animated decoration stops in reduced-motion mode.

### `app/(public)/layout.tsx`

- Give public pages a `bg-paper` context.
- Add a skip link before the header and `id="main-content"` on main.
- Keep footer after main.
- Do not apply global reveal animation to `children`.

## 7. Public home page

### `app/(public)/page.tsx`

Convert this file from a long collection of inline arrays and cards into a server composition file. It should import section components from `features/public-home` and contain only content/data wiring.

Target structure:

```tsx
<PublicHero />
<JourneyStory />
<EcosystemBento />
<RoleExperience />
<SchoolsPreview />
<SafetyStory />
<FaqPreview />
<FinalRegistrationCta />
```

Remove the existing hero status card, three equal step cards, numbered benefit row, and generic blue CTA once their replacements are complete.

### `features/public-home/public-hero.tsx`

- Server wrapper contains headline, description, and actions.
- Client `HeroRouteScene` contains route drawing and the layered product preview.
- Headline should use two visual tones but remain one semantic `h1`.
- Place the main action before the secondary action in DOM and visual RTL order.
- Product preview uses representative UI from existing registration/contract/payment models, not impossible live bus tracking.
- If live tracking is not in product scope, label the visual as service-process visibility rather than showing a real-time map.
- Hero animation runs once, finishes within 900ms, and never blocks buttons.

### `features/public-home/journey-story.tsx`

- Replace `steps` cards with a vertical journey story on mobile and a sticky scroll-linked route on desktop.
- The semantic structure is an ordered list.
- Highlight one step as it enters the reading region.
- Do not bind critical content visibility to JavaScript intersection state.

### `features/public-home/ecosystem-bento.tsx`

- Use an asymmetric grid: registration spans two columns; payments and contract share smaller modules; notifications use a narrow event rail; multi-student support uses overlapping identity chips.
- Use current real feature scope only.
- On mobile, render a normal single-column reading order.
- Hover effects are enhancements; all descriptions remain visible or available on focus.

### `features/public-home/role-experience.tsx`

- Tabs for family, school/service organization, and admin only if all three roles are truly supported.
- Use shared-layout transition between previews.
- Maintain Radix tab keyboard behavior.
- Do not imply school staff or driver portals if excluded from MVP; in that case show “خانواده” and “مدیریت سامانه” only.

### `features/public-home/schools-preview.tsx`

- Reuse `getSchools` from `features/schools/schools-api.ts` through the server page or a data-aware server component.
- Show up to a small curated count and link to `/schools`.
- Use textual school identity until approved logos exist.
- Preserve development fallback labeling.

### `features/public-home/final-registration-cta.tsx`

- Use the `TransitTicket` visual.
- Include a short readiness checklist and one primary action.
- Avoid multiple competing CTAs at the bottom.

## 8. Other public routes

### `app/(public)/about/page.tsx`

Replace the intro plus card grid with:

- Editorial hero with mission statement.
- Split story section with approved photograph/illustration slot.
- Operating principles as a route of commitments, not equal cards.
- Transparency/safety facts in a dark feature canvas.
- Final support/contact link.

Create `features/public-about/about-story.tsx` only if the page grows beyond clean server markup.

### `app/(public)/services/page.tsx`

- Create `features/public-services/service-story.tsx`.
- Represent the lifecycle from registration to active service with alternating media/text sections.
- Include concrete outcome and next action for each service.
- Link each relevant section to registration guide, pricing, contracts explanation, or login.
- Do not promise routing, vehicle tracking, attendance, or driver features outside scope.

### `app/(public)/schools/page.tsx`

Keep `getSchools` and server loading behavior.

Change presentation to:

- Visual directory hero.
- Search/filter only when the dataset and server contract justify it; otherwise use client-side search over the fetched list.
- New `features/schools/school-directory.tsx` client component for query/filter UI.
- New `school-directory-item.tsx` showing school, branch, supported levels, and active state.
- Use URL search params if filters should be shareable.
- Preserve explicit API fallback and empty states.

Tests must cover loaded, empty, fallback, search-no-result, keyboard, and narrow viewport states.

### `app/(public)/pricing/page.tsx`

- Replace generic cards with a pricing anatomy diagram.
- Add `features/public-pricing/pricing-anatomy.tsx` to explain inputs without calculating a final amount.
- Add a sample lifecycle showing “ثبت درخواست → بررسی → قیمت نهایی سرور → انتخاب پرداخت”.
- Keep the existing warning that values are authoritative only from the backend.
- Use a comparison layout only for real payment choices, not invented plans.

### `app/(public)/registration-guide/page.tsx`

- Replace simple step content with `RegistrationJourney` using `RouteLine`.
- Add sticky current-step navigation on desktop and anchor navigation on mobile.
- Each step includes expected information, estimated user effort only if verified, privacy note, and next output.
- Embed small product previews using the same form primitives rather than screenshots that can drift.
- CTA starts registration and preserves an obvious login alternative.

### `app/(public)/faq/page.tsx`

- Keep the accessible Radix accordion.
- Add category chips and optional search in `features/public-faq/faq-browser.tsx`.
- Store questions in a separate typed data file.
- Update URL hash on question open only if deep linking is needed.
- Add a support CTA after unresolved questions.
- Motion is limited to accordion height/opacity already supported by the primitive.

### `app/(public)/contact/page.tsx`

- Create a support-hub composition: common destinations, response expectations, and contact form.
- Use one dominant form surface and an adjacent help rail.
- Keep unimplemented channels explicitly disabled or omitted.
- Add success/error handling only when the real endpoint exists; never simulate delivery as production success.

## 9. Authentication

### `app/(auth)/layout.tsx`

Replace the generic two-column blue panel with:

- Left/right split respecting RTL reading order.
- Form region on a paper surface with brand, back-to-home link, and support link.
- Visual region using `AuthJourneyScene`: route, checkpoints, and a compact trust statement.
- Hide the visual scene below `lg`; do not render a tall decorative block above the mobile form.
- Use a dark or sky feature surface distinct from the public hero.

### `features/auth/auth-forms.tsx`

Do not alter API calls or schemas for appearance.

Refactor into smaller `LoginForm`, `RegisterForm`, and `ForgotPasswordForm` files if the current combined file makes visual migration risky.

For every form:

- Add concise page title, context text, and role indicator.
- Use consistent 48px controls and visible labels.
- Place password assistance next to the relevant field.
- Keep server errors in an `aria-live` summary.
- Add stable loading states within the submit button.
- Animate only error summary entry and confirmed success; never shake fields.
- Preserve values after recoverable errors.

Pages affected:

- `app/(auth)/login/page.tsx`
- `app/(auth)/register/page.tsx`
- `app/(auth)/forgot-password/page.tsx`

## 10. Parent shell

### `features/parent-shell/parent-shell.tsx`

Current problem: header and sidebar resemble the admin shell and give every destination equal weight.

Change to:

- Desktop: narrower branded navigation rail, grouped as “امروز”, “خدمات”, and “حساب”.
- Add brand mark and family context in the rail.
- Use a shared active indicator behind the current link.
- Move account and notification controls into a compact top utility bar.
- Mobile: retain Drawer navigation and add `MobileActionDock` for the four highest-frequency destinations: home, students, registration, payments.
- Keep less frequent destinations in the drawer.
- Keep the mock-data badge visible but less dominant.
- Add skip link and main landmark id.

Do not add notification counts without data.

### `features/parent-shell/parent-section-placeholder.tsx`

Replace generic placeholder cards as each route is implemented. Until then, enhance the component to show:

- Purpose of the coming section.
- Data/contract dependency.
- Relevant working alternative link.
- No decorative fake controls.

## 11. Parent dashboard

### `features/parent-dashboard/parent-dashboard.tsx`

Preserve `selectedId`, student isolation, empty handling, and mock labels. Replace most inline markup with these components:

```tsx
<ParentDashboardHeader />
<StudentIdentitySwitcher />
<JourneyStatusCanvas />
<NextBestAction />
<PaymentSummary />
<StudentSnapshot />
<EventTimeline />
```

Remove the four equal summary cards. The dominant hierarchy should be journey status, required action, next payment, then history/details.

### `student-identity-switcher.tsx`

- Continue using real buttons with `aria-pressed`.
- Add initials/avatar, school/grade secondary label, and active shared indicator.
- Use horizontal scrolling on mobile with visible edge cue.
- On change, update an `aria-live="polite"` status message.
- Shared layout animation must not temporarily display one student’s data under another name.

### `journey-status-canvas.tsx`

- Map existing enrollment, contract, and payment statuses into ordered checkpoints.
- Put mapping logic in a pure function with tests.
- Use status tone plus icon plus text.
- Show one current-state explanation and one next transition.
- Do not imply live bus location.

### `next-best-action.tsx`

- Accept action label, explanation, urgency, and href.
- Render only one primary action. Secondary context links may appear as text.
- Danger styling is reserved for actual blocking/overdue states.

### `event-timeline.tsx`

- Replace the notification list with timestamp-ready chronological items.
- Until mock data has dates, label order as recent without inventing timestamps.
- Each event can link to its target only if a real route exists.

Update `mock-parent-dashboard.ts` only to add presentation-independent fields needed by these components. Do not put icons or CSS class names in mock/domain data.

## 12. Enrollment

### `features/enrollment/enrollment-wizard.tsx`

The current file mixes schemas, forms, step navigation, mock dependencies, and layout. Split it before completing the remaining steps.

Move:

- Student schema/form to `steps/student-step.tsx` and `student-schema.ts`.
- School schema/form to `steps/school-step.tsx` and `school-schema.ts`.
- Future transport, emergency, payment, and review steps into parallel files.
- Step metadata to `enrollment-steps.ts`.
- Navigation/layout to `enrollment-shell.tsx` and `enrollment-progress.tsx`.

Keep the root wizard responsible for current step, completed-step state, collected values, and transitions.

### `enrollment-shell.tsx`

- Desktop grid: sticky progress rail, main form canvas, optional contextual help rail.
- Tablet: progress above form, help in collapsible drawer.
- Mobile: compact progress header and sticky bottom actions.
- The sticky action bar must not cover validation errors or the final field.

### `enrollment-progress.tsx`

- Use semantic ordered list.
- Completed items look like validated checkpoints/ticket stamps.
- Current item uses `aria-current="step"`.
- Future steps remain readable but cannot be clicked unless backward/forward navigation rules allow it.
- Motion draws progress between confirmed completed steps only.

### Step transitions

- Use `AnimatePresence` with keyed step content.
- Fade plus 12px directional movement based on next/back.
- Focus the new step heading after navigation.
- On validation failure, focus the first invalid field and do not transition.
- Reduced motion uses opacity or immediate replacement.

### Form visuals

- Group related fields with section headings and short explanations.
- Replace raw native `<select>` styling with the existing accessible `Select` primitive where behavior remains correct.
- Keep national ID and date fields LTR where currently required.
- Preserve in-memory-only warning until persistence is approved.
- The review page uses an itinerary/definition-list layout, not disabled input fields.

Update tests in `enrollment-wizard.test.tsx` to cover focus movement, back preservation, current-step semantics, reduced-motion-safe state, and mobile action visibility in addition to validation.

## 13. Parent students and family profile

### `app/parent/students/page.tsx`

- Replace card grid with a student identity list using `StudentRecordCard` on mobile and richer rows on desktop.
- Show school, grade, enrollment/service status, and one contextual action.
- Keep add-student action dominant.
- Use empty state with a route illustration and explicit first action.

### `app/parent/students/[studentId]/page.tsx`

- Add profile header with identity, school/grade, status, and actions.
- Use `LifecycleRail` for enrollment/service state.
- Use a definition list for protected data instead of generic cards.
- Keep protection explanations adjacent to protected fields.
- Preserve not-found behavior and warning alerts.

### `app/parent/students/new/page.tsx`

Replace `ParentSectionPlaceholder` only when student creation contract is ready. Then reuse the student form module from enrollment where fields and validation are genuinely identical. Do not copy forms.

### `app/parent/profile/page.tsx` and `features/family-profile/family-profile-form.tsx`

- Add profile completion/status header.
- Group identity, contact, address, and protected data into clear sections.
- Use a sticky save bar only on desktop if the form is long; mobile uses bottom actions with safe-area padding.
- Add dirty-state warning before navigation when real mutation behavior is enabled.
- Preserve validation, values, and mock confirmation semantics.

## 14. Contracts and payments

### `app/parent/contracts/page.tsx`

- Replace summary card with document list/record view.
- Show contract version, student, status, issued date when available, total, and next action.
- Empty and unavailable states remain explicit.

### `app/parent/contracts/[contractId]/page.tsx`

Compose `ContractDocumentShell`:

- Main document/terms area.
- Sticky metadata rail with version, status, totals, and acceptance state.
- Payment schedule below as receipt rows.
- Acceptance action appears only when server/state rules permit it.
- Keep current controls disabled while authoritative acceptance is unavailable.
- Never animate the document itself; only metadata/status transitions.

### `app/parent/payments/page.tsx`

Reorder content:

1. Total/payment status summary.
2. Blocking or verification warning.
3. Ledger of invoices/installments.
4. Selected payment details/action.
5. Offline payment form.
6. Return-state preview, development-only or clearly labeled.

Create:

- `payment-summary.tsx` for amounts and next due item.
- `payment-ledger.tsx` rendering `ReceiptRow` items.
- `payment-verification-timeline.tsx` for pending/success/failure lifecycle.

Preserve `getFinanceStatusTone`, mock amounts, backend-verification warning, and disabled duplicate actions. Never animate number count-up for amounts on every render.

### `features/finance/offline-payment-form.tsx`

- Place inside an inset upload/submission canvas.
- Keep error summary and field preservation.
- Show submission lifecycle next to the form when available.
- Use stable submit loading state and explicit pending-review confirmation.

### `features/finance/payment-return-preview.tsx`

- Present as a status demonstrator only in development/mock context.
- Use verification timeline and semantic state icon.
- Keep success dependent on the supplied server-confirmed state, never URL query assumptions.

## 15. Parent notifications and service requests

### `app/parent/notifications/page.tsx`

Replace placeholder with a typed event list after the contract is available:

- Filters: all, required action, payment, contract, service.
- Group by meaningful date when real timestamps exist.
- Unread uses text/weight/marker, not color alone.
- Each actionable item has one clear destination.
- Add empty state per filter.

### `app/parent/service-requests/page.tsx`

Replace placeholder with:

- Request status pipeline.
- Current request list.
- Detail/activity drawer or detail route.
- New request action only when the API and allowed request types exist.
- Correspondence history separated from internal notes.

Until those contracts exist, improve placeholders only; do not invent workflows.

## 16. Admin shell

### `features/admin-shell/admin-shell.tsx`

Split the current large component into:

- `admin-shell.tsx`: layout composition.
- `admin-navigation.tsx`: grouped navigation and active state.
- `admin-command-bar.tsx`: search, date/context, notifications, account.
- `admin-mobile-navigation.tsx`: Drawer.

Visual changes:

- Use a darker or ink-tinted navigation rail to distinguish admin from parent.
- Group modules: overview, people/service, finance, communication/system.
- Add compact/collapsed state only if it can be persisted without harming SSR; otherwise defer.
- Active item uses a left/start rail or shared highlight plus text and icon.
- Search opens a command dialog only when real search actions exist; until then preserve disabled status with explanation.
- Main content becomes denser and uses a larger max width.

No decorative scroll reveals in admin.

## 17. Admin dashboard and operational pages

### `app/admin/dashboard/page.tsx`

Move presentation into `features/admin-dashboard/admin-dashboard.tsx` and keep page data wiring minimal.

Replace equal metric cards with:

- `OperationalPulse`: one horizontal summary of pending, blocked, overdue, and upcoming work.
- `QueueHealth`: registrations/contracts/payments with status distribution.
- `RegistrationQueuePreview`: recent actionable records.
- `ExceptionFeed`: overdue/failed/conflict items only when such data exists.

`mock-admin-dashboard.ts` may add typed queue categories and severity, but must not contain visual classes.

### `app/admin/registrations/page.tsx`

Preserve URL search parameters, sorting, status, and pagination.

Refactor into:

- `registration-command-bar.tsx`: search, filter chips, sort, saved-view placeholder if not implemented.
- `registration-results.tsx`: table desktop plus card records mobile.
- `registration-status-summary.tsx`: compact queue counts.
- Existing route file parses search params and passes them down.

The table needs sticky headers, visible focus, whole-row clarity without making the row itself an inaccessible nested link, and a dedicated details action.

### `app/admin/registrations/[registrationId]/page.tsx`

- Create a case-review layout with identity summary, lifecycle rail, submitted information sections, activity/audit rail, and action panel.
- Keep approve/reject/correction controls disabled until authoritative mutation, permission, reason, conflict, and audit support exist.
- Sensitive actions use Dialog with reason and consequences when later enabled.
- Do not hide internal-action restrictions in tooltips; place them in visible explanatory text.

### `app/admin/contracts/page.tsx`

- Use responsive record list instead of independent cards.
- Add lifecycle/status filters and price/acceptance state columns.
- Use a detail drawer or link for full contract history.
- Keep replacement semantics and immutable accepted contract explanation.

### `app/admin/pricing/page.tsx`

- Build a pricing work queue: unpriced first, then issued/locked.
- Use a split view on desktop: queue and selected-record details.
- Keep price entry disabled until role/state/version/audit requirements are available.
- Make locked states visually clear without reducing opacity so far that text becomes unreadable.

### `app/admin/payments/page.tsx`

- Build review queue with expected/submitted amount, reference, age, status, and anomaly marker.
- Detail panel contains receipt/evidence metadata and audit history.
- Approval/rejection stays disabled until mutations are safe.
- Use semantic confirmation dialogs and idempotent pending state when enabled.

### Placeholder admin pages

Affected routes:

- `admin/families/page.tsx`
- `admin/students/page.tsx`
- `admin/schools/page.tsx`
- `admin/service-requests/page.tsx`
- `admin/notifications/page.tsx`
- `admin/settings/page.tsx`

For each page, replace `AdminSectionPlaceholder` only after its contract exists. The eventual page pattern should be:

- Families: searchable identity records with related students and account state.
- Students: dense records with family, school, grade, and lifecycle state.
- Schools: school/branch directory with active service coverage.
- Service requests: triage queue with status, owner, age, and correspondence.
- Notifications: campaign/template/history layout with recipient safety.
- Settings: grouped settings sections with permission and audit context; no fake toggles.

## 18. Loading, error, empty, and not-found states

Files affected:

- `app/loading.tsx`
- `app/error.tsx`
- `app/not-found.tsx`
- Route-group `loading.tsx` and `error.tsx` files.
- `components/feedback/route-loading.tsx`
- `components/feedback/route-error.tsx`
- `components/feedback/empty-state.tsx`
- `components/feedback/skeleton.tsx`

Changes:

- Public loading uses section-shaped skeletons, not a portal card skeleton.
- Parent loading mirrors identity switcher, journey canvas, and one action panel.
- Admin loading mirrors pulse strip and table rows.
- Route errors use context-specific recovery and preserve retry behavior.
- Empty states may use a static route/checkpoint illustration but always lead with meaning and action.
- Not-found offers return destinations appropriate to anonymous/public context.
- Skeleton animation respects reduced motion and uses low contrast.

## 19. Content and assets

Create `apps/web/src/content` for static typed public content only:

```text
content/
├── public-navigation.ts
├── home.ts
├── services.ts
├── registration-guide.ts
└── faq.ts
```

Do not move operational mock/API data into this folder.

Assets:

- Audit existing `images/` before adding anything.
- Approved images used by Next.js should live in `apps/web/public/images` with descriptive names.
- Provide width/height and meaningful alt text for informative images.
- Decorative hero images use empty alt text.
- Prefer SVG/CSS for route geometry and abstract backgrounds.
- Avoid generic AI-generated images of children, drivers, or schools unless the product owner explicitly approves provenance and usage.

## 20. Responsive behavior

Define and test behavior rather than only breakpoints:

- 320–479px: single column, compact hero, no cursor effects, bottom action dock, horizontally scrollable identity/filter chips.
- 480–767px: wider form rows where safe, still mobile navigation.
- 768–1023px: two-column bento/story sections, enrollment progress above content, responsive admin cards.
- 1024–1279px: portal side rails appear; public hero gains layered scene.
- 1280px+: full editorial compositions, sticky supporting rails, denser admin tables.

Every sticky region must be checked with browser zoom and short viewport height. Use `min-height: 0`, overflow boundaries, and safe-area padding deliberately.

## 21. Accessibility requirements

- Preserve one `h1` per page and logical heading levels.
- Move focus to step/page headings after controlled navigation.
- Keep skip links in all three shells.
- Use `aria-current` for navigation and wizard steps, `aria-pressed` for student selection, and `aria-live` for context changes.
- Never use animated placeholder text as the only label.
- Test Persian numerals with screen readers and retain LTR direction for IDs/reference numbers where needed.
- Status always includes text; route checkpoint color is secondary.
- Hover-revealed content must also appear on keyboard focus and remain accessible on touch.
- Motion reduction must remove spatial travel, parallax, continuous loops, and counting animation.
- Validate 200% zoom, 320px reflow, focus visibility over every surface, and touch target size.

## 22. Performance requirements

- Keep public hero animation SVG/CSS/Motion-based; no WebGL in phase one.
- Dynamically import only genuinely heavy below-fold client sections.
- Do not turn entire public pages into client components.
- Prefer transform/opacity animation.
- Pause observers/loops offscreen.
- Use `next/image` for approved raster media.
- Avoid multiple font families in the first implementation; use Vazirmatn weight/size contrast.
- Measure bundle impact after each imported external pattern.
- Set targets before release: no visible CLS, responsive input, and acceptable LCP on a throttled mid-range mobile profile.

## 23. Testing changes

### Unit/component tests

Add tests for:

- Route/status mapping functions.
- `RouteLine` semantics and current/completed state.
- Student switcher isolation and announcement.
- Enrollment progress, focus movement, validation preservation, and backwards navigation.
- Payment status/timeline mapping.
- Responsive record representation contains equivalent information.
- Reduced-motion variants render final readable state.

### Existing test files to update

- `features/parent-dashboard/parent-dashboard.test.tsx`
- `features/enrollment/enrollment-wizard.test.tsx`
- `features/family-profile/family-profile-form.test.tsx`
- `features/finance/offline-payment-form.test.tsx`
- `features/finance/payment-return-preview.test.tsx`
- UI primitive tests when APIs change.

### Playwright

Update:

- `e2e/public-pages.spec.ts`
- `e2e/parent-dashboard.spec.ts`
- `e2e/admin-dashboard.spec.ts`

Add assertions for:

- Desktop and mobile shell navigation.
- No content hidden before animation/hydration.
- Reduced-motion emulation.
- RTL order and horizontal overflow.
- Student switch changes all student-scoped content consistently.
- Enrollment focus and step state.
- Admin filters remain URL-restorable.
- Automated axe scans after interactive states, not only initial load.

Add screenshot baselines only after visual direction is approved; otherwise early snapshots create churn.

## 24. Delivery phases and exact change sets

### Change set 1 — tokens and primitives

Files:

- `app/globals.css`
- `app/layout.tsx`
- `providers/app-providers.tsx`
- `components/ui/button.tsx`
- `components/ui/card.tsx`
- Form primitives
- `components/common/page-container.tsx`
- New motion config/components

Verification: format, lint, typecheck, component tests, current E2E to detect compatibility regressions.

### Change set 2 — brand system and public shell

Files:

- New `components/brand/*`
- `components/navigation/public-header.tsx`
- `components/navigation/public-footer.tsx`
- `app/(public)/layout.tsx`
- Shell-specific tests

Verification: keyboard navigation, mobile drawer, reduced motion, light/dark hero contrast.

### Change set 3 — public home

Files:

- `app/(public)/page.tsx`
- New `features/public-home/*`
- Static home content file
- Public E2E updates

Verification: visual review at 320, 768, 1024, 1440px; LCP/CLS; no unsupported product claims.

### Change set 4 — parent shell and dashboard

Files:

- `features/parent-shell/*`
- `features/parent-dashboard/*`
- `app/parent/dashboard/page.tsx` only if composition/data wiring changes
- Parent tests/E2E

Verification: multi-student isolation, keyboard, screen-reader announcement, mobile dock, reduced motion.

### Change set 5 — enrollment

Files:

- Split `features/enrollment/enrollment-wizard.tsx`
- New shell/progress/action/step files
- Enrollment tests

Verification: no schema/field regression, value preservation, focus management, mobile sticky actions.

### Change set 6 — finance and student/profile pages

Files:

- Parent students routes
- Parent contracts routes
- Parent payments route
- `features/finance/*`
- `features/family-profile/*`
- Tests

Verification: exact mock amounts/statuses retained; no false payment success; responsive document and ledger views.

### Change set 7 — admin shell/dashboard/registrations

Files:

- `features/admin-shell/*`
- `features/admin-dashboard/*`
- Admin dashboard route
- Admin registrations routes and feature components
- Admin tests/E2E

Verification: URL state retained, table/card parity, keyboard operation, disabled sensitive actions remain disabled.

### Change set 8 — remaining public and operational pages

Migrate each remaining route separately. Do not bundle unfinished API-dependent pages with visual work on completed routes.

### Change set 9 — state polish and final QA

- Context-specific loading/error/empty states.
- Manual accessibility review.
- Visual regression baselines.
- Performance profiling.
- Final content and asset approval.

## 25. Definition of done for each migrated page

A page is not redesigned merely because its colors and cards changed. It is complete only when:

- Its information hierarchy has a deliberate dominant element.
- Its composition is distinct but uses shared system tokens/components.
- Mobile and desktop are designed, not merely wrapped.
- Loading, empty, error, disabled, and success states are covered where relevant.
- Keyboard, focus, RTL, reduced motion, 200% zoom, and 320px reflow work.
- Existing business logic, validation, and security behavior are preserved.
- Motion communicates hierarchy/state and does not delay action.
- Tests are updated and pass.
- No fake product capability or trust claim is introduced.
- New external code has license, bundle, accessibility, and maintainability review.

## 26. Recommended first implementation target

The first coded vertical slice should include:

1. New tokens and primitive variants.
2. Brand mark, route field, route line, reveal, and shared indicator.
3. Public header/footer.
4. New home hero, journey story, and ecosystem bento.
5. New parent student switcher and journey status canvas using existing mock data.
6. One admin registration results view using the responsive record pattern.

This slice exercises all three visual contexts and validates whether the design language can support marketing, reassuring family UX, and dense operations before the rest of the application is migrated.

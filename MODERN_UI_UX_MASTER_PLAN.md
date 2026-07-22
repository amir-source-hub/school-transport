# Modern UI/UX Master Plan — School Transport Platform

Status: implementation-ready redesign plan  
Date: 2026-07-22  
Scope: public website, authentication, parent portal, admin portal, content, motion, responsive behavior, and visual QA  
Product language: Persian-first, RTL, mobile-first

## 1. Executive decision

The next redesign will use a **“Safe Journey / مسیر امن”** visual direction: real school-transport photography, route and map motifs, strong editorial typography, warm sunlight, deep navy, transport yellow, trust green, and layered panels. The website must look like a transportation service within the first second.

The redesign is not a cosmetic recoloring. It changes the information architecture and component language:

- Public pages become visual, content-rich marketing and guidance experiences.
- The parent portal becomes a journey and action center focused on each child.
- The admin portal becomes a dense operational workspace with charts, queues, filters, timelines, and actionable data.
- White cards stop being the default container. Content will also use full-bleed imagery, colored bands, split layouts, timelines, lists, tables, carousels, maps, drawers, tabs, steppers, charts, and inline action rows.

## 2. Findings from the current frontend

### What is already good

- RTL and Persian typography are established.
- The application already has reusable buttons, forms, dialogs, drawers, dropdowns, tabs, accordions, tables, badges, motion wrappers, and navigation shells.
- Public, parent, and admin routes are separated correctly.
- The codebase already uses Radix primitives, Lucide icons, Tailwind, Motion, and design tokens.
- Responsive navigation and reduced-motion support exist.

### Why it still feels simple

- The homepage hero is a dark text block with no image, despite ten transport-related images in `/images`.
- Most pages follow the same formula: heading, paragraph, white bordered card grid.
- The homepage contains only a hero, three-step row, feature cards, and CTA; it lacks proof, emotion, practical content, service detail, and varied section rhythm.
- The current “bento” is visually a normal card grid; item sizes and content types are not different enough to create a genuine bento composition.
- Parent and admin dashboards use cards as wrappers for almost every unit of information.
- Metrics are numbers without trends, comparisons, chart context, or operational urgency.
- The route motif is mostly decorative and is not yet a functional navigation/progress system.
- Motion exists in the dependency graph but is barely visible in the experience.
- Public pages have limited content and do not answer the questions a parent would ask before registration.
- The public navigation is clean but visually small, static, and lacks a services mega-menu, announcement state, or contextual CTA.

## 3. Visual direction and design principles

### 3.1 Design concept: “مسیر امن، تجربه روشن”

Every screen should express one of three ideas:

1. **Safety:** verified process, clear statuses, dependable help.
2. **Movement:** routes, stops, stages, transitions, and forward actions.
3. **Visibility:** parents and administrators always know what happened and what comes next.

### 3.2 Visual language

- Deep navy for authority and legibility.
- Bright route blue for primary actions and active states.
- Transport yellow for movement, highlights, vehicles, and important markers.
- Trust green for successful/safe/verified states.
- Warm cream and pale sky backgrounds instead of endless pure white.
- Photography with golden-hour light, Iranian urban context, visible students, families, schools, and vehicles.
- Rounded geometry should be purposeful: large image frames and major canvases can be rounded; tables and dense lists should be flatter.
- Route lines, stop dots, map pins, license/receipt shapes, and ticket perforations become recurring motifs.

### 3.3 “No card by default” rule

Before adding a card, choose the best semantic pattern:

- Narrative content: full-width or split section.
- Sequential content: stepper, timeline, or route rail.
- Comparable options: tabs, segmented control, or comparison table.
- Dense records: data grid, compact list, or master-detail layout.
- Live status: status banner, lifecycle rail, or activity feed.
- KPIs: metric strip with chart context, not five isolated cards.
- Testimonial or school gallery: carousel.
- Quick actions: command bar, dock, or action cluster.
- A card is used only for a distinct object that benefits from a boundary.

## 4. Image asset strategy

### 4.1 Recommended hero asset

Use `ChatGPT Image Jul 21, 2026, 04_04_11 PM (1).png` for the first homepage hero iteration. It has substantial negative space on the left for copy and clearly shows a parent, children, and school vehicle on the right.

Alternative crops:

- Use `(2).png` for school-arrival sections.
- Use `(3).png` or `04_04_16 PM.png` for route/pricing or city-coverage banners.
- Use `(4).png`, `04_04_21 PM.png`, or `Gemini_Generated...png` for safety and family-trust sections.
- Do not use `04_04_25 PM.png` as a single image because it is a four-image collage.
- Treat `04_10_50 PM.png` as a visual layout reference, not a production asset; it contains baked-in text and UI.
- The small JPG illustration can be used only for a lightweight empty state or guide page, not as the main brand direction.

### 4.2 Production treatment

- Copy approved assets into `apps/web/public/images/transport/` with descriptive names.
- Produce AVIF/WebP variants and responsive sizes.
- Use `next/image`, explicit aspect ratios, `sizes`, meaningful Persian alt text, and priority loading only for the hero.
- Apply separate desktop and mobile focal positions; never rely on a single center crop.
- Add a navy-to-transparent gradient overlay behind text rather than darkening the entire photo.
- Confirm ownership and AI-image usage policy before production launch.
- Replace any image containing malformed Persian writing, logos, or license-plate detail that could appear misleading.

## 5. Design system evolution

### 5.1 Tokens

Extend the current token set with:

- Brand: navy `#0B1F3A`, route blue `#1769E8`, vehicle yellow `#F5B700`, trust green `#22A06B`, warm cream `#FFF8EA`, sky tint `#EEF6FF`.
- Surface hierarchy: canvas, tint, glass, sun, dark, elevated, inset.
- Section spacing: compact, normal, editorial, immersive.
- Content widths: reading, public, wide, data-grid.
- Layered shadows: image overlay, floating navigation, popover, command palette.
- Overlay gradients for light and dark images.
- Chart colors and semantic status colors with accessible contrast.

### 5.2 Typography

- Keep Vazirmatn for interface and Persian body copy.
- Establish an editorial display scale for hero and campaign headings.
- Use tighter line-height in large Persian headlines and more breathing room in body text.
- Define numeric styles for Persian dashboard figures and monospaced treatment for tracking codes.
- Limit centered text to hero introductions and compact campaigns; most long content remains right-aligned.

### 5.3 Component additions

Build on the existing Radix/Tailwind system instead of installing full Material UI. Add MUI-quality patterns as local components:

- `AppBar`, `MegaMenu`, `MobileNavigationDrawer`
- `HeroMedia`, `HeroSearch`, `AnnouncementBar`
- `ImageCarousel`, `TestimonialsCarousel`, `SchoolsCarousel`
- `JourneyStepper`, `LifecycleRail`, `RouteTimeline`
- `MetricStrip`, `Sparkline`, `DonutSummary`, `TrendBadge`
- `CommandBar`, `FilterBar`, `SavedViewMenu`
- `DataGrid`, `ColumnVisibilityMenu`, `BulkActionBar`
- `ActivityFeed`, `NotificationCenter`, `MasterDetailPanel`
- `StudentSwitcher`, `StudentJourneyCanvas`, `NextActionPanel`
- `PriceEstimator`, `FAQSearch`, `SchoolFinder`
- `ImageFeature`, `MediaBand`, `StatBand`, `TrustRibbon`
- `BottomActionSheet`, `Snackbar`, `Tooltip`, `ProgressRing`, `Skeleton`

Keep Radix for accessibility primitives. Consider Recharts only for real dashboard charts and Embla only for robust accessible carousels. Avoid adding a large UI library solely for visual appearance.

## 6. Public information architecture

### Primary navigation

- خانه
- خدمات
- نحوه کار
- مدارس و محدوده‌ها
- قیمت‌گذاری
- ایمنی و استانداردها
- راهنمای خانواده
- درباره ما
- پشتیبانی

Primary CTA: `ثبت‌نام دانش‌آموز`  
Secondary CTA: `ورود خانواده`

### New or expanded public routes

- `/safety` — driver/vehicle/process safety and verification.
- `/coverage` — covered neighborhoods, schools, and service availability.
- `/family-guide` — articles, checklists, payment and contract guidance.
- `/tracking` — tracking-code/status lookup when supported by the backend.
- `/support` — contact routes, common problems, service-request entry.
- `/news` or `/announcements` — registration windows and operational notices.

Do not create thin pages merely to increase route count. Each page must answer a distinct parent need and contain at least three meaningful content blocks.

## 7. Homepage blueprint

### 7.1 Utility announcement bar

- Registration-season message with calendar icon.
- Optional deadline or service-area notice.
- Compact link: `مشاهده شرایط ثبت‌نام`.
- Dismissible only if the message is not critical.

### 7.2 Floating modern header

- Transparent/glass state over hero; solid state after scroll.
- Stronger brand lockup and transport symbol.
- Desktop services mega-menu with illustrated links and quick actions.
- Prominent blue/yellow registration button.
- Mobile full-height navigation drawer with bottom login/register actions.
- Active page marker and accessible keyboard behavior.

### 7.3 Immersive image hero

Desktop height: about 760–860px; mobile: 680–760px.

Content:

- Eyebrow: `ثبت‌نام سال تحصیلی جدید آغاز شد`.
- Headline: `مسیر امن فرزند شما، از خانه تا مدرسه`.
- Supporting copy describing online enrollment, transparent contract, payment, and status visibility.
- Primary button: `ثبت‌نام دانش‌آموز` with directional icon.
- Secondary glass button: `مراحل دریافت سرویس` with play/route icon.
- Trust row: secure payment, transparent contract, responsive support.
- Small floating status panels over the photography: fast registration, payment methods, family support. Use at most two on mobile.
- Animated route from home to bus to school; animation draws once, then remains static.
- Scroll cue at the bottom.

### 7.4 Trust and coverage ribbon

A horizontal, non-card band containing verified process markers, registration availability, support hours, and participating-school count only when backed by real data. Avoid invented statistics.

### 7.5 “How the journey works” scrollytelling section

- Split screen: sticky photo/route illustration on one side, changing content on the other.
- Four stages: create family profile, add student and school, review/price/contract, pay and follow status.
- Progress line animates with scroll.
- On mobile, convert to a vertical timeline with static progressive disclosure.

### 7.6 Service ecosystem bento

A true mixed-content bento, not equal cards:

- Large interactive enrollment panel with mini stepper.
- Wide payment panel with receipt visual.
- Tall family panel with student avatars/switcher.
- Dark notification panel with sample activity feed.
- Image tile showing school arrival.
- Small service-support tile with action button.

Each tile has a different information model, color, scale, and interaction.

### 7.7 School and area finder

- Search field for school/neighborhood.
- Filter chips for district, school type, and service availability.
- Map-like visual or service-area illustration if exact geographic data is unavailable.
- Results displayed as a horizontal carousel on the homepage and full directory on `/schools` or `/coverage`.

### 7.8 Safety story

- Full-bleed photograph with a contrasting content panel.
- Three proof points: vehicle/driver verification, clear service lifecycle, support and incident reporting.
- Link to `/safety`.
- Avoid unverifiable claims such as live GPS tracking unless the product supports it.

### 7.9 Pricing preview

- Interactive estimator with school, district, service type, and payment method inputs.
- Clearly label as estimate when a binding price is not available.
- Explain what affects price using an accordion or visual breakdown.
- CTA to detailed pricing page.

### 7.10 Family stories carousel

- Portrait/image, short quote, school/district, and scenario.
- Only use approved real testimonials. Until then, show “common family scenarios” rather than fake people and quotes.
- Accessible previous/next buttons, pagination dots, swipe, pause behavior, and reduced motion.

### 7.11 Guide and FAQ section

- Searchable FAQs with category tabs.
- Three editorial guide links with imagery: documents, contracts/payments, changing student/address data.
- Link to full help center.

### 7.12 Final cinematic CTA and footer

- Panoramic bus/city image with dark gradient.
- Strong one-line promise and registration button.
- Footer with route-style column connectors, contact channels, service hours, trust/legal links, and social links only when active.

## 8. Public page redesigns

### Services

- Editorial image hero.
- Service types as tabs or comparison rows.
- Process timeline.
- Included/not-included comparison.
- Safety and payment callouts.
- Contextual registration CTA.

### Registration guide

- Sticky section navigation.
- Visual stepper with required documents per step.
- Expandable screenshots/example fields.
- Time estimate and “before you begin” checklist.
- Resume/start registration CTA.

### Schools and coverage

- Search/filter command bar.
- Map/list switch if geographic data is supported.
- School result rows with logo/photo, address, grades, availability, and details drawer.
- Recently viewed and popular filters only if backed by real interaction data.

### Pricing

- Estimator first, explanation second.
- Pricing-factor visualization.
- Payment-method tabs and installment timeline.
- Transparent example invoice.
- FAQs specific to adjustments, refunds, and offline verification.

### About

- Human story and mission, not generic feature cards.
- Full-width image bands.
- Operating principles timeline.
- Team/organization section only with real content.

### Contact and support

- Channel selector for registration, payment, contract, or technical issue.
- Support hours and response expectations.
- Structured form with conditional fields.
- FAQ suggestions before submission.
- Ticket confirmation timeline after submission.

### FAQ

- Search-first layout.
- Category tabs.
- Deep links to answers.
- Helpful/not-helpful action and contact escalation.

## 9. Authentication experience

- Replace the centered white form card with a split-screen layout.
- One side contains transport photography and a concise trust message; the other contains the form.
- Use a compact progress indicator for registration.
- Improve OTP, password visibility, validation, loading, and recovery states.
- On mobile, use a short image masthead and full-width form rather than squeezing a split layout.
- Preserve fast loading and avoid decorative animation while the user is entering credentials.

## 10. Parent portal redesign

### 10.1 Shell

- More distinctive navy/cream shell with a branded side rail.
- Collapse/expand desktop rail.
- Persistent quick action button: add student, continue registration, or pay—chosen contextually.
- Header contains student switcher, notifications with unread count, help, and profile.
- Mobile bottom navigation highlights the current route and includes a central contextual action.

### 10.2 Dashboard

Replace the stack of status cards with:

- Greeting/header band with family identity and contextual message.
- Student carousel/switcher with avatar, school, grade, and status.
- Large `StudentJourneyCanvas`: home → request → review → price → contract → payment → active service.
- Visually dominant `NextActionPanel` with due date, reason, and one primary action.
- Compact money strip: contract total, paid, remaining, next installment.
- Activity timeline combining status changes, payments, notifications, and support updates.
- Documents and receipts drawer.
- Help/action dock.

### 10.3 Students

- Student profile header with photo/avatar and key facts.
- Tabs: overview, enrollment, service requests, documents, history.
- Editable information grouped by task, not one long form.
- Address and school changes show impact warnings before submission.

### 10.4 Enrollments

- Full-width stepper with completion and validation state.
- Save/resume support.
- Contextual side summary on desktop and bottom sheet on mobile.
- Document checklist, review screen, and clear final receipt.

### 10.5 Contracts

- Contract cover sheet, status ribbon, key terms summary, and expandable legal text.
- Acceptance timeline and explicit consent state.
- Download/print actions.
- Avoid presenting the full contract as a generic card.

### 10.6 Payments

- Balance and next-payment hero strip.
- Installment timeline.
- Payment method selector.
- Receipt history as rows with filters and status.
- Offline payment upload uses a guided drawer and verification timeline.

### 10.7 Notifications and requests

- Unified activity inbox with category filters, unread state, and action buttons.
- Service request detail opens in a master-detail panel on desktop and a full page on mobile.
- Show status timeline and expected next response.

## 11. Admin portal redesign

### 11.1 Shell and navigation

- Dark collapsible side rail with grouped navigation and counts.
- Top command bar: global search, create action, date/context filter, notifications, profile.
- Command palette with keyboard shortcut.
- Saved views for operational queues.
- Keep admin density higher than parent/public density.

### 11.2 Dashboard

- Operational status header: date range, last refresh, critical alerts.
- KPI strip with delta and sparkline instead of five cards.
- Enrollment funnel chart.
- Payment health chart: collected, pending verification, upcoming, overdue.
- Work queue grouped by urgency and ownership.
- Recent activity timeline.
- Geographic/school distribution visualization only if the data exists.
- Quick actions: create school, price request, verify payment, send notification.

### 11.3 Record-list pages

All admin lists receive a consistent data-workspace pattern:

- Page command bar.
- Search, filter chips, advanced filter drawer, sort, saved views.
- Column visibility and density controls.
- Bulk selection and bulk action bar.
- Sticky table header.
- Status chips with icons and tooltips.
- Row quick actions and keyboard focus.
- Master-detail preview without losing list state.
- Pagination plus result count.
- Realistic loading, empty, error, and permission states.

### 11.4 Registration workspace

- Kanban/funnel overview toggle plus data grid.
- Lifecycle rail in detail view.
- Student/family/school summary header.
- Missing information checklist.
- Price, contract, and notification actions in a sticky action panel.
- Audit/activity timeline.

### 11.5 Finance workspace

- Receivables summary and aging buckets.
- Verification queue for offline payments.
- Payment detail with evidence viewer and approve/reject workflow.
- Contract/price side panel.
- Export capability only when backend and permissions support it.

### 11.6 Schools and administration

- School directory with availability indicators.
- School detail uses tabs: profile, coverage, students, registrations, pricing, history.
- Admin management includes role, scope, last activity, and status.
- Settings use section navigation and autosave/explicit-save feedback as appropriate.

## 12. Motion and interaction plan

Motion must explain movement or state, not decorate every element.

- Hero: slow image scale (1.00 → 1.03), route-line draw, and staggered copy once.
- Header: transparent-to-solid transition after leaving hero.
- Scrollytelling: active route stop changes as sections enter view.
- Carousels: snap movement, drag/swipe, button navigation, no autoplay by default.
- Dashboards: short number and chart entrance only after data loads.
- Status changes: shared-layout indicator and color transition.
- Drawers/dialogs: directional motion consistent with RTL.
- Hover: image zoom, underline/arrow shift, subtle elevation; no excessive bouncing.
- Loading: skeletons shaped like the final content.
- Respect `prefers-reduced-motion`; all content and progress remain understandable without animation.

## 13. Content plan

The interface needs substantially more useful content, not filler.

### Required content inventory

- Exact service definition and eligibility.
- Registration periods and deadlines.
- Required documents.
- Service coverage and supported schools.
- Pricing factors and payment options.
- Contract lifecycle.
- Safety and verification process.
- Support channels and operating hours.
- Cancellation/change/refund guidance.
- Common parent scenarios.
- Admin status definitions and operational SLAs.

### Content standards

- Every section answers a user question.
- Use short Persian headlines and specific supporting copy.
- Do not invent counts, testimonials, certifications, live tracking, response times, or safety guarantees.
- Use realistic mock data in development and clearly isolate it from production data.
- Give every empty state a reason, consequence, and next action.

## 14. Technical architecture

### Recommended stack decision

Keep:

- Next.js 16 / React 19
- Tailwind 4 and current design tokens
- Radix primitives
- Motion
- Lucide icons
- Existing TanStack Query/forms/Zod architecture

Optional additions after a small prototype:

- Embla Carousel for production carousels.
- Recharts for admin charts.
- TanStack Table for advanced admin grids if the custom table becomes costly.

Do not install full MUI in the first sprint. MUI offers many strong patterns, but combining MUI/Emotion with the current Tailwind/Radix system would duplicate theming, increase bundle and maintenance cost, and create inconsistent component APIs. Use MUI as a pattern reference: app bars, drawers, steppers, tabs, chips, data grids, snackbars, tooltips, and responsive navigation.

### Component boundaries

- Marketing components stay under `features/public-*`.
- Portal patterns live under `features/parent-*` and `features/admin-*`.
- Only genuinely shared primitives belong in `components/ui`.
- Image configuration and content data should be centralized rather than embedded repeatedly in JSX.
- Client components should be limited to actual interaction; static content remains server-rendered.

## 15. Responsive and accessibility requirements

- Test at 320, 375, 768, 1024, 1280, and 1440+ widths.
- Preserve RTL order visually and semantically.
- Minimum 44×44px targets for touch actions.
- Keyboard support for menus, carousels, tabs, grids, drawers, and dialogs.
- Visible focus on photography and colored surfaces.
- WCAG AA contrast for text and controls.
- Text zoom to 200% without clipped content.
- Hero copy must remain readable over every responsive crop.
- Carousels must expose controls and slide position to assistive technology.
- Charts need textual summaries and cannot be the only way to understand a metric.
- Dense tables need an accessible mobile alternative or controlled horizontal scrolling.
- Motion and parallax must have reduced-motion equivalents.

## 16. Performance requirements

- Hero LCP target under 2.5s on a representative mid-range mobile connection.
- Use responsive optimized images; do not ship original multi-megabyte PNGs directly.
- Lazy-load below-the-fold photography and carousel slides.
- Avoid video in the first redesign release.
- Keep motion transform/opacity based.
- Dynamically load heavy chart/grid modules only inside portal routes.
- Prevent layout shift with explicit media dimensions and stable skeletons.
- Review client-component and bundle growth after every sprint.

## 17. Delivery plan

### Phase 0 — Design audit and content lock (2–3 days)

- Capture current desktop/mobile screenshots for every route.
- Create a page inventory and mark thin/duplicate content.
- Approve image usage and final hero copy.
- Confirm which claims/data can be shown publicly.
- Define analytics baseline and conversion events.

Deliverable: signed-off content and visual brief.

### Phase 1 — Foundation and navigation (4–6 days)

- Extend tokens, typography, surface and overlay utilities.
- Build new header, mega-menu, mobile drawer, announcement bar, and footer.
- Build image, carousel, timeline, metric, chart-wrapper, command-bar, and data-grid foundations.
- Add image optimization pipeline and approved assets.

Deliverable: component showcase and responsive shell prototypes.

### Phase 2 — Homepage flagship (5–7 days)

- Implement immersive hero and floating UI.
- Add trust ribbon, scrollytelling journey, true bento, finder preview, safety story, pricing preview, scenario carousel, guide/FAQ, and final CTA.
- Add purposeful motion and reduced-motion states.
- Validate desktop and mobile visual rhythm.

Deliverable: complete content-rich homepage.

### Phase 3 — Public pages and authentication (6–9 days)

- Redesign services, guide, schools/coverage, pricing, safety, about, contact/support, and FAQ.
- Build new split authentication layouts.
- Add metadata, social images, and structured content where appropriate.

Deliverable: coherent public website and conversion funnel.

### Phase 4 — Parent portal (7–10 days)

- Redesign shell and dashboard.
- Implement student journey canvas and next-action model.
- Redesign students, enrollment, contracts, payments, notifications, profile, and service requests.
- Validate long Persian content and multi-student states.

Deliverable: action-focused family experience.

### Phase 5 — Admin operational workspace (9–13 days)

- Redesign shell, command palette, dashboard charts, and KPI strips.
- Apply data workspace to registrations, families, students, schools, service requests, contracts, pricing, payments, notifications, and admins.
- Add master-detail patterns, saved views, bulk actions, and audit timelines where backed by APIs.

Deliverable: dense, scalable operational portal.

### Phase 6 — QA, performance, and rollout (4–7 days)

- Visual regression for all target breakpoints.
- Accessibility, keyboard, zoom, reduced-motion, and screen-reader passes.
- Image and bundle optimization.
- Verify error, loading, empty, permission, and offline states.
- Roll out by surface or feature flag and monitor conversion/task completion.

Deliverable: production-ready redesign.

## 18. Priority backlog

### P0 — Must change first

- Image-led homepage hero.
- New public navigation and footer.
- Homepage content expansion and section variety.
- Parent dashboard journey/next-action redesign.
- Admin KPI/chart/queue dashboard redesign.
- Eliminate repeated white-card grids on flagship pages.
- Responsive image optimization and accessibility.

### P1 — High value

- Carousels for schools and scenarios.
- School/coverage finder.
- Pricing estimator.
- Admin command/filter/data-grid patterns.
- Payment and contract timelines.
- Safety and support public pages.

### P2 — Later enhancements

- Saved admin views.
- Command palette shortcuts.
- Personalized public content.
- Exact map integration.
- Live vehicle/route features only if backed by reliable product APIs.

## 19. Definition of done

- A visitor understands the service, audience, value, and next action from the first viewport.
- The homepage uses approved transport photography and at least six distinct section patterns.
- No flagship page is primarily a stack of white bordered cards.
- Public pages contain substantive, non-duplicated content.
- Parent dashboard gives one dominant next action per selected student.
- Admin dashboard shows trends and operational queues, not only totals.
- Navigation is polished on desktop and mobile.
- Carousels, menus, steppers, drawers, tables, and charts are accessible.
- All images are optimized, correctly cropped, and have suitable alt behavior.
- RTL, 320px width, 200% zoom, keyboard navigation, and reduced motion pass QA.
- No unverified claims, fabricated testimonials, or fake operational statistics ship.
- Core Web Vitals and bundle size remain within agreed budgets.

## 20. First implementation slice

The first build should cover only three flagship surfaces but complete them deeply:

1. Homepage: new header, photographic hero, journey, bento, school finder preview, safety band, FAQ, footer.
2. Parent dashboard: student switcher, journey canvas, next action, payment strip, activity feed.
3. Admin dashboard: command bar, KPI trends, charts, urgent queue, activity feed.

This slice establishes the design language across marketing, consumer workflow, and operations. After visual and usability approval, extend the same patterns page by page.

## 21. Reference tools and pattern sources

- Material UI: use as a reference for mature app bars, drawers, tabs, steppers, chips, feedback, and data-display patterns—not as an automatic replacement for the current system.
- Motion: use for route drawing, layout transitions, reveal choreography, and reduced-motion-aware interactions.
- Embla Carousel: evaluate for accessible, touch-friendly image and content carousels.
- Recharts: evaluate for responsive admin charts with accessible text summaries.
- Existing repository photography: primary visual source for the first iteration.


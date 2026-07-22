# School Transport UI/UX Redesign Plan

Status: proposed visual redesign plan  
Scope: public website, authentication, parent portal, enrollment, finance, and admin operations  
Primary experience: Persian, right-to-left, mobile-first, accessible, trustworthy, and modern

## 1. Why the current interface feels generic

The current foundation is structurally sound, accessible, and consistent, but its visual grammar is too narrow:

- Most sections use the same white surface, border, heading, paragraph, and three-card grid.
- The home hero describes the product but does not show the feeling of a safe, visible school journey.
- The parent dashboard presents data as summaries instead of an unfolding journey with a clear next action.
- Public, parent, and admin experiences share nearly the same density and component rhythm even though their jobs differ.
- Status, progress, price, contract, and payment information lack distinctive visual models.
- Motion is installed but is not yet used as a communication layer.
- There is almost no photography, illustration, map language, route geometry, or human trust signal.

The redesign must make the product recognizable as school transportation within one second. It should feel designed for Iranian families—not like a translated SaaS template.

## 2. Creative direction: “The Visible Journey”

Build the identity around one concept: every important journey is visible.

- The physical journey: home → pickup → school.
- The enrollment journey: student → school → service → safety → payment → confirmation.
- The service journey: submitted → reviewed → priced → contracted → active.
- The payment journey: amount → method → verification → receipt.

Use a continuous route line as a recurring visual motif. It can become a hero path, section divider, progress indicator, timeline, active-navigation marker, and empty-state illustration. This creates cohesion without filling every page with decorative cards.

### Visual personality

- Warm, reassuring, energetic, civic, and precise.
- Friendly enough for parents; controlled enough for finance and administration.
- Contemporary Persian editorial typography with expressive display scale.
- Soft daylight public pages; focused operational portal pages.
- Rounded geometry inspired by roads, bus windows, map pins, and tickets.
- Real depth through layered surfaces, tonal contrast, and selective glass—not default drop shadows everywhere.

### Proposed color system

Keep blue as the trust anchor, but broaden the palette:

- Ink: `#101828` for strong text and dark hero surfaces.
- Transit blue: `#2257E6` for primary actions and route identity.
- Sky: `#DCEBFF` for open public backgrounds.
- Signal lime: `#BCEB62` for fresh highlights and successful forward motion.
- Sun: `#FFC857` for pickup, warning, and attention states.
- Coral: `#FF6B5E` for human accents and urgent states.
- Paper: `#FAFAF7` instead of cold gray as the main public canvas.
- Mist: `#F1F4F8` for portal backgrounds.

Semantic colors remain independent from decorative brand colors. Text contrast must remain WCAG AA.

## 3. Inspiration translated into product decisions

Reference sites are inspiration sources, not wholesale component imports.

### Motion for React

Use Motion as the core animation system because it is already in the project and supports layout, gesture, scroll, and reduced-motion patterns.

- Shared-layout motion for student switching, tabs, filters, and active navigation.
- Layout animation for accordions, expandable payment rows, and responsive card/table transitions.
- `whileInView` only for public storytelling sections; do not animate operational data every time it appears.
- Spring feedback for buttons, chips, step completion, and map pins.
- Animated numbers only when a value changes or enters the viewport once.
- `useReducedMotion` and the existing global reduced-motion rules remain mandatory.

### Skiper UI

Borrow its uncommon composition rather than its dark visual identity:

- Image/text reveal for the public story and service explanation.
- Seamless carousel for supported schools or parent trust statements.
- Text-scroll or masked-word reveal for one hero line only.
- Floating navigation treatment on the public site.
- Avoid copying its black-canvas aesthetic into the parent portal.

### Animmaster Lib

Use as a pattern reference for polished transitions and scene construction:

- Choreographed hero entrance.
- Scroll-linked route progression.
- Layered device/dashboard preview.
- Small looping ambient details, stopped when offscreen.

Only adopt patterns whose source, license, bundle cost, keyboard behavior, and reduced-motion behavior are verified.

### Vengeance UI

The most relevant patterns are:

- Spotlight or notch navbar for a distinctive public header.
- Aurora/rays/perspective-grid ideas for the hero background, adapted into a subtle route-map field.
- Expandable bento grid for explaining the service ecosystem.
- Glow-border or highlight-grid effects for hover discovery, used sparingly.
- Animated number for trust and operational metrics.
- Shared tooltip avatars for support/team trust signals.
- Animated footer with a restrained route-line reveal.

Do not use WebGL ocean, liquid-metal, cursor trails, creepy buttons, or heavy 3D effects in core flows. They conflict with trust, performance, touch, and accessibility goals.

### Dribbble

Use Dribbble for composition and mood references, not UX evidence. The useful recurring lessons are bold hierarchy, human imagery, conversion flow, strong trust signals, and distinct high-utility versus low-stress views. Avoid portfolio-only layouts that hide real product complexity.

## 4. New page architecture

## 4.1 Public home

### Hero: “From your door to the school gate, clearly.”

Replace the current split text/card hero with a cinematic but lightweight product scene.

Desktop composition:

- A floating pill navigation over an edge-to-edge soft sky/ink canvas.
- Large two-tone Persian headline occupying roughly 55% of the first viewport.
- Short supporting sentence and two actions: “شروع ثبت‌نام” and “دیدن مسیر کار”.
- An animated route line travels from a home marker to a school marker behind a layered product preview.
- Product preview combines a phone-shaped parent status view, a compact registration timeline, and a payment confirmation ticket.
- Small trust row: participating schools, secure payment, support availability, and a real service statistic when backend data exists.
- One subtle bus marker moves along the route once, then rests.

Mobile composition:

- Headline and CTA first.
- Simplified vertical route with three milestone cards.
- No autoplay parallax or cursor-dependent interaction.

### Home section sequence

1. Hero and immediate trust proof.
2. “Your whole service journey” scroll-linked route timeline.
3. Expandable bento ecosystem: registration, contracts, payment, notifications, multi-student family.
4. Interactive product story: switch between parent, school, and admin viewpoints without leaving the page.
5. Schools strip or searchable school preview with logos/images when approved.
6. Safety and transparency section with a human photograph and layered facts, not cards.
7. Parent testimonial stack or quote carousel; omit until authentic content exists.
8. FAQ preview with animated accordion.
9. High-contrast final CTA shaped like a digital transit ticket.

## 4.2 Public supporting pages

- Services: alternating editorial story panels with route-line connectors and interactive feature previews.
- Registration guide: full vertical journey map with sticky progress and realistic previews of each step.
- Schools: visual directory with search, region filter, school identity, service status, and useful empty states.
- Pricing: explain inputs through an interactive anatomy diagram; never imply client-calculated final pricing.
- About: human story, operating principles, safety commitments, and system transparency.
- FAQ: searchable grouped questions with deep links and highlighted common answers.
- Contact: split support hub with contact channels, expected response, common shortcuts, and a compact form.

Each page receives one signature composition. Do not repeat a hero followed by three cards on every route.

## 4.3 Authentication

- Use a calm split-screen “journey starts here” layout on wide screens.
- Keep the form on a clean paper surface; place route illustration, reassurance, and support on the opposite side.
- Add clear role/context labels so parent and admin entry never feel ambiguous.
- Animate validation and success feedback without shaking or moving the entire form.
- Preserve a focused single-column form on mobile.

## 4.4 Parent home screen

The parent dashboard should answer, in order:

1. What is happening with my selected child?
2. What needs my attention today?
3. What is the next milestone or payment?
4. Where can I see the full history?

### New dashboard composition

- Personalized greeting bar with student selector represented as compact identity chips.
- Large “journey status” canvas spanning the page: registration/contract/service state on a route timeline.
- One dominant next-action panel, not several equal cards.
- Upcoming payment as a visual receipt strip with due-date urgency and verification state.
- Contract and enrollment as expandable milestones below the main journey.
- Notification rail using chronological event items with semantic icons.
- Family quick actions in a bottom dock on mobile.

Use shared-layout animation when switching students so the context change feels continuous. Announce the change to assistive technology and never rely on motion alone.

## 4.5 Enrollment wizard

- Turn the six-step form into a guided route.
- Desktop: sticky vertical journey rail plus focused form canvas and contextual help panel.
- Mobile: compact horizontal step rail, persistent back/next action bar, and clear saved-state feedback.
- Completed steps become stamped tickets/checkpoints rather than generic numbered circles.
- Use section-level transitions (fade + 12px directional move), not full-page slides.
- Add review as a readable itinerary grouped by student, school, transport, safety, and payment.
- Keep validation stable; errors must not cause dramatic layout jumps.

## 4.6 Students, contracts, payments, and notifications

- Students: identity-led list with photo/initial, school, grade, and service state; detail page uses a profile header plus lifecycle rail.
- Contracts: document-centric viewer with metadata sidebar, version badge, acceptance timeline, and payment schedule.
- Payments: ledger first, summary second; use receipt rows, amount hierarchy, verification timeline, and one clear pay action.
- Notifications: timeline/inbox hybrid with grouping, unread marker, filters, and direct actions.
- Service requests: status pipeline plus correspondence/activity history rather than isolated status cards.

## 4.7 Admin shell and dashboard

Admin needs density and speed, not marketing animation.

- Replace the broad card dashboard with a command-center layout.
- Collapsible rail navigation with clear module groups and numeric badges.
- Header includes global search/command palette, date context, notifications, and account.
- Dashboard uses one operational pulse strip, queue health, financial status, and recent exceptions.
- Registration queue becomes the visual center, with saved views and URL-restorable filters.
- Tables use sticky headers, row actions, expandable detail, density controls, and responsive record cards.
- Sensitive actions use deliberate confirmation, reason capture, and audit-result feedback.
- Motion is limited to state continuity: filter changes, row expansion, drawer opening, optimistic-disabled states, and confirmed completion.

## 5. Component system to build

### Brand and storytelling

- RouteField background
- JourneyLine and JourneyCheckpoint
- ProductScene layered preview
- TrustStrip
- ExpandableFeatureBento
- PerspectiveRoleSwitcher
- SchoolLogoRail
- TestimonialStack
- TransitTicketCTA
- EditorialMediaSection

### Product and operations

- StudentIdentitySwitcher
- NextBestAction panel
- LifecycleRail
- JourneyStatusCanvas
- ReceiptRow and PaymentTimeline
- ContractDocumentShell
- EventTimeline
- MetricPulse
- FilterCommandBar
- ResponsiveRecordView
- MobileActionDock
- ContextualHelpDrawer

### Micro-interactions

- Magnetic effect only for the primary public CTA on pointer devices.
- Active-nav spotlight or sliding underline.
- Press depth on primary buttons.
- Animated status dot only for genuinely live/pending states.
- Number transitions for changed metrics.
- Shared indicator for tabs and student chips.
- Success checkpoint draw animation after confirmed completion.

## 6. Motion language

Motion must explain state, hierarchy, or causality.

### Timing

- Micro feedback: 120–180ms.
- Component transition: 200–320ms.
- Section reveal: 400–650ms.
- Hero choreography: maximum 900ms total, staggered but quickly interactive.

### Easing

- Standard UI: ease-out curve.
- Spatial movement: soft spring with low bounce.
- Financial/sensitive confirmation: no bounce.
- Ambient route motion: linear or gentle ease, one pass by default.

### Rules

- Animate transform and opacity wherever possible.
- Never delay form usability for an entrance sequence.
- Pause looping animation offscreen and when the tab is hidden.
- Do not use cursor effects on touch devices.
- Reduced-motion mode removes travel, parallax, count-up, and looping effects while preserving state changes.
- Define a bundle/performance budget before adopting GSAP, WebGL, or 3D libraries; Motion should cover the default implementation.

## 7. Design-system upgrade

- Expand tokens to include brand accents, elevation levels, glass surfaces, display type, motion duration/easing, and responsive radii.
- Use three surface families: paper, tinted canvas, and dark/high-contrast feature canvas.
- Define display, section-title, body, label, metric, and financial typography roles for Persian numerals.
- Move from universal rounded cards to varied containers: borderless sections, inset canvases, ticket edges, rails, split panes, sheets, and data rows.
- Introduce icon containers only when they add grouping; do not put every icon in a rounded square.
- Create light and dark feature canvases without committing the entire product to a dark theme.
- Use real approved school/transport photography or commissioned illustration. Do not use generic AI-generated children imagery without explicit approval and provenance.

## 8. Implementation phases

### Phase R0 — visual prototype and decisions

- Produce three high-fidelity directions for the home hero, then select one.
- Prototype the parent journey canvas and admin queue at desktop and mobile widths.
- Confirm image policy, authentic content, brand name/logo, and whether route tracking is an actual capability or only a visual metaphor.
- Establish token, motion, and performance budgets.

Exit: approved home, parent dashboard, admin dashboard, and component moodboard.

### Phase R1 — foundation

- Upgrade tokens, typography roles, surface utilities, and motion primitives.
- Build shared journey, ticket, bento, timeline, student switcher, and record-view components.
- Add Storybook or an internal component gallery if the team wants faster visual review.
- Test RTL, keyboard, reduced motion, contrast, and mobile touch behavior.

Exit: reusable components verified without business integration changes.

### Phase R2 — public conversion experience

- Rebuild header, home, footer, registration guide, services, and pricing.
- Add approved media and product previews.
- Measure LCP, CLS, interaction responsiveness, and animation CPU cost on mid-range mobile.

Exit: public experience feels distinctive and remains fast and accessible.

### Phase R3 — parent experience

- Rebuild parent shell, dashboard, student selector, lifecycle views, payments, contracts, and notifications.
- Convert the enrollment wizard to the guided-route model without changing business validation.
- Validate multi-student comprehension and the visibility of the next action.

Exit: a parent can identify current status and next action within five seconds.

### Phase R4 — admin operations

- Rebuild admin shell, command bar, dashboard, filters, queues, responsive records, and detail drawers.
- Preserve URL state, audit explanations, disabled sensitive actions, and permission boundaries.
- Run realistic density and keyboard-navigation tests.

Exit: frequent admin tasks are faster and no status is conveyed through color alone.

### Phase R5 — refinement and rollout

- Add remaining public and secondary portal pages.
- Run visual regression across RTL desktop/tablet/mobile.
- Conduct manual screen-reader, focus-order, zoom, reduced-motion, and high-contrast review.
- Roll out in vertical slices rather than replacing every screen in one release.

## 9. Acceptance criteria

- The first viewport clearly communicates school transportation, audience, value, and primary action.
- Public, parent, and admin areas feel related but purpose-built.
- No major page relies on the repeated heading + three equal cards pattern.
- Every portal home gives one visually dominant next action.
- Motion communicates a state transition or story and has a reduced-motion equivalent.
- All core flows work at 320px width, 200% zoom, keyboard-only, and RTL.
- Public-page motion does not compromise Core Web Vitals on a mid-range mobile device.
- Operational tables remain fast and readable with realistic record counts.
- Authentic trust content replaces placeholder statistics/testimonials before production.
- Decorative imports are source-reviewed, license-reviewed, locally owned where appropriate, and aligned with the design tokens.

## 10. Immediate first sprint

1. Design and implement the new token/motion foundation.
2. Build RouteField, JourneyLine, TransitTicketCTA, StudentIdentitySwitcher, and LifecycleRail.
3. Create the new public hero and first two home sections behind a feature branch.
4. Create the new parent dashboard journey canvas with current mock data.
5. Create one admin registration queue prototype using the new command bar and responsive records.
6. Capture desktop/mobile screenshots and compare them as a single visual review set.
7. Test performance, accessibility, and reduced motion before extending the language to every page.

## 11. Reference links

- Motion: https://motion.dev/
- Animmaster Lib: https://animmasterlib.dev/
- Skiper UI: https://skiper-ui.com/
- Vengeance UI: https://www.vengenceui.com/
- Dribbble: https://dribbble.com/


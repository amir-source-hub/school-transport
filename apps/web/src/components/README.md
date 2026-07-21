# Web component APIs

Shared components contain presentation and generic interaction only. Business status transitions, permissions, pricing, payment decisions, ownership checks, and API response types must remain outside this directory.

## Common

- `PageContainer`: consistent responsive page width and horizontal spacing.
- `PageHeading`: page title, optional description, and action slot.
- `PublicPageIntro`: public-page eyebrow, title, description, and optional action content.

## UI

- `Button` and `ButtonLink`: primary, secondary, and ghost actions with standard touch targets.
- `Input`, `Textarea`, `Checkbox`, and `Select`: accessible form controls; labels and messages are supplied by `Field`.
- `Card` and `Badge`: neutral presentation primitives without business rules.
- `Dialog` and `Drawer`: Radix-based focus-managed overlays. Callers must provide Persian titles and descriptions.
- `Accordion`, `Tabs`, and `DropdownMenu`: keyboard-accessible disclosure and navigation primitives.

## Navigation and data display

- `Breadcrumbs`: accepts ordered `{ label, href? }` items; the final item may omit `href`.
- `Pagination`: accepts current page, total pages, and a URL builder so filters remain shareable.
- `Table` primitives: semantic table markup inside a controlled horizontal-scroll container.

## Feedback

- `Alert`: persistent informational feedback.
- `EmptyState` and `ErrorState`: page or section states with optional action slots.
- `Skeleton` and `RouteLoading`: non-interactive loading placeholders.
- `RouteError`: reusable recoverable route error UI; technical error details are never displayed.

Feature-specific components belong under `features/<feature>/components`. Promote code here only after genuine reuse.

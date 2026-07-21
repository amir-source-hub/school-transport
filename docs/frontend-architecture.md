# Frontend Architecture

## 1. Overview

The school transport service should use a **single frontend application** containing the public website, parent portal, authentication pages, and admin panel.

Each area remains separated internally through route groups, layouts, features, permissions, and reusable components.

This approach provides:

- One consistent codebase
- Shared design system and components
- Simpler authentication handling
- Easier deployment
- Reusable forms, validation, types, and API services
- Clear separation between public, parent, and admin functionality
- Enough flexibility for the system to grow over time

---

## 2. Recommended Application Structure

```text
apps/
├── web/
│   ├── src/
│   │   ├── app/
│   │   ├── features/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── stores/
│   │   ├── schemas/
│   │   ├── types/
│   │   ├── constants/
│   │   ├── lib/
│   │   └── styles/
│   └── public/
```

The public website, parent portal, and admin panel should remain inside the same `web` application.

```text
app/
├── (public)/
├── (auth)/
├── parent/
└── admin/
```

Using one frontend application is preferred over creating separate applications for the public website, parent portal, and admin panel at this stage.

Benefits include:

- Shared authentication logic
- Shared components and forms
- Shared validation schemas
- Consistent UI and UX
- No duplicated API clients
- Simpler deployment and maintenance
- Easier implementation of responsive behavior
- Ability to separate applications later if it becomes necessary

---

## 3. Main Frontend Areas

### 3.1 Public Website

The public website introduces the transport service, explains how it works, builds trust, and directs parents toward registration.

Example routes:

```text
/
├── about
├── services
├── schools
├── pricing
├── faq
├── contact
├── register
└── login
```

The public website should include:

- Landing page
- Service introduction
- About the company
- Supported schools
- Pricing explanation
- Registration guidance
- Frequently asked questions
- Contact information
- Login and registration links

---

### 3.2 Parent Portal

The parent portal allows a family to manage its account, students, registrations, contracts, payments, and notifications.

Example routes:

```text
/parent
├── dashboard
├── students
│   ├── new
│   └── [studentId]
├── service-requests
├── contracts
├── payments
├── notifications
├── profile
└── settings
```

Parents with multiple children should remain inside one shared family account.

The parent should be able to select a student and view the information related to that student, including:

- Registration status
- Student information
- Service request
- Contract
- Payment schedule
- Payment history
- Notifications
- Available actions

---

### 3.3 Admin Panel

The admin panel manages registrations, families, students, contracts, prices, payments, schools, and notifications.

Example routes:

```text
/admin
├── dashboard
├── families
├── students
├── registrations
├── service-requests
├── schools
├── contracts
├── pricing
├── payments
├── notifications
└── settings
```

The admin frontend should provide:

- Registration review
- Family and student management
- School management
- Service request review
- Manual pricing
- Contract generation and management
- Online payment monitoring
- Offline payment approval
- Notification management
- Basic dashboard summaries
- Search, filtering, sorting, and pagination

---

## 4. Route Groups and Layouts

Each major application area should use its own layout.

```text
app/
├── (public)/
│   ├── layout.tsx
│   └── page.tsx
├── (auth)/
│   ├── layout.tsx
│   ├── login/
│   └── register/
├── parent/
│   ├── layout.tsx
│   └── dashboard/
└── admin/
    ├── layout.tsx
    └── dashboard/
```

### 4.1 Public Layout

The public layout should include:

- Main header
- Desktop navigation
- Mobile navigation
- Footer
- Contact action
- Registration action
- Login action
- Responsive content container

### 4.2 Authentication Layout

The authentication layout should include:

- Simplified header
- Login and registration forms
- Supporting illustration or background image
- Clear progress indicators where required
- Minimal navigation distractions
- Responsive single-column mobile layout

### 4.3 Parent Layout

The parent layout should include:

- Responsive sidebar
- Mobile navigation drawer
- Student selector
- Notification access
- Account menu
- Breadcrumbs
- Page title
- Main page actions
- Responsive content area

### 4.4 Admin Layout

The admin layout should include:

- Admin sidebar
- Mobile drawer navigation
- Dashboard navigation
- Search
- Notification area
- Account menu
- Breadcrumbs
- Page-specific actions
- Responsive content area

---

## 5. Feature-Based Architecture

The frontend should be organized around business features rather than only technical file types.

```text
features/
├── authentication/
├── families/
├── students/
├── registrations/
├── service-requests/
├── schools/
├── contracts/
├── pricing/
├── payments/
├── notifications/
└── profile/
```

Each feature should contain the code related to that business area.

Example:

```text
features/students/
├── components/
├── hooks/
├── services/
├── schemas/
├── types/
├── utils/
└── constants/
```

A more detailed example:

```text
features/students/
├── components/
│   ├── student-card.tsx
│   ├── student-form.tsx
│   ├── student-selector.tsx
│   └── student-status-badge.tsx
├── hooks/
│   ├── use-student.ts
│   └── use-students.ts
├── services/
│   └── student-service.ts
├── schemas/
│   └── student-schema.ts
├── types/
│   └── student-types.ts
└── utils/
    └── student-utils.ts
```

This architecture keeps related logic together and makes the codebase easier to understand, test, and extend.

---

## 6. Shared Components

Reusable components should remain separate from feature-specific components.

```text
components/
├── ui/
├── forms/
├── navigation/
├── feedback/
├── data-display/
├── media/
└── common/
```

### 6.1 UI Components

Examples:

- Button
- Input
- Textarea
- Select
- Checkbox
- Radio group
- Switch
- Modal
- Drawer
- Tabs
- Accordion
- Tooltip
- Badge
- Card
- Table
- Dropdown menu
- Pagination
- Breadcrumb
- Separator

### 6.2 Form Components

Examples:

- Phone number field
- National ID field
- Currency field
- Date field
- Address field
- School selector
- Grade selector
- Parent relationship selector
- Primary phone selector
- Payment method selector
- Emergency contact field
- Password field

### 6.3 Feedback Components

Examples:

- Loading spinner
- Skeleton loader
- Empty state
- Error state
- Confirmation dialog
- Success message
- Warning message
- Toast notification
- Form validation message
- Retry action

### 6.4 Data Display Components

Examples:

- Status badge
- Information list
- Payment summary
- Contract summary
- Student summary card
- Responsive data table
- Mobile record card
- Timeline
- Activity list

---

## 7. Server and Client Components

Because the frontend uses Next.js, server components should be used by default.

### 7.1 Server Components

Server components are appropriate for:

- Page-level data loading
- Public website content
- Initial dashboard data
- Secure server-side access checks
- SEO-sensitive pages
- Static informational sections
- Data that does not require browser interaction

### 7.2 Client Components

Client components should only be used when browser interaction is required.

Examples:

- Forms
- Modals
- Dropdowns
- Student switcher
- Interactive tables
- Payment actions
- Mobile menu
- Filters
- Tabs
- Local UI state
- Drag-and-drop interactions
- Animated interactive sections

Using server components by default reduces unnecessary client-side JavaScript and improves loading performance.

---

## 8. Data Fetching

The frontend should use a central API client.

```text
services/
├── api-client.ts
├── auth-service.ts
├── student-service.ts
├── registration-service.ts
├── contract-service.ts
├── payment-service.ts
└── notification-service.ts
```

The API client should handle:

- Base API URL
- Authentication credentials
- Standard request headers
- Error normalization
- Request cancellation
- Timeout handling
- Session expiration
- Refresh-token handling, if used
- Consistent response types
- Duplicate request prevention where appropriate

For client-side server-state management, **TanStack Query** is recommended.

TanStack Query should manage:

- Data fetching
- Loading states
- Error states
- Caching
- Refetching
- Mutations
- Cache invalidation
- Background updates
- Optimistic updates where appropriate

---

## 9. State Management

Frontend state should be divided according to its purpose.

### 9.1 Server State

Server state should be managed through TanStack Query.

Examples:

- Students
- Families
- Registrations
- Service requests
- Contracts
- Payments
- Notifications
- Schools
- Pricing information

### 9.2 URL State

URL parameters should be used for:

- Search
- Pagination
- Filters
- Sorting
- Active tabs
- Table views
- Selected status

Example:

```text
/admin/students?status=pending&page=2&school=12
```

Using URL state allows views to be shared, bookmarked, refreshed, and restored.

### 9.3 Local Component State

Local component state should be used for:

- Modal visibility
- Accordion state
- Temporary form UI
- Mobile navigation state
- Password visibility
- Dropdown state
- Temporary selection state

### 9.4 Global Client State

A small Zustand store may be used for limited shared client-side state.

Examples:

- Selected student
- Sidebar state
- Temporary multi-step enrollment progress
- User interface preferences

The global store should not duplicate data already managed by the API or TanStack Query.

---

## 10. Form Architecture

Forms are a major part of the frontend.

Important forms include:

- Family registration
- Parent information
- Student registration
- Service request
- Contract review
- Pricing entry
- Payment confirmation
- Offline payment approval
- Profile editing

Recommended tools:

- React Hook Form
- Zod
- Shared form components

Example structure:

```text
features/registrations/
├── components/
│   ├── registration-form.tsx
│   ├── parent-information-step.tsx
│   ├── student-information-step.tsx
│   ├── school-information-step.tsx
│   └── registration-review-step.tsx
├── schemas/
│   └── registration-schema.ts
└── hooks/
    └── use-registration-form.ts
```

Validation schemas should be reusable between the frontend and backend where practical.

Forms should support:

- Client-side validation
- Server-side validation feedback
- Accessible error messages
- Loading state
- Submission protection
- Duplicate submission prevention
- Clear success and failure states
- Preservation of user-entered data after recoverable errors

---

## 11. Enrollment Form Flow

The enrollment form should use a multi-step structure.

Recommended steps:

1. Family information
2. Parent information
3. Primary phone selection
4. Student information
5. School and grade
6. Service request details
7. Emergency contact
8. Review and submission

The form should support:

- Saving temporary progress
- Back and next navigation
- Validation per step
- Final review
- Clear progress indicator
- Mobile-friendly input layout
- Protection against accidental data loss
- Clear required and optional fields
- Reusing family information when adding another student

---

## 12. Authentication Architecture

Authentication pages should remain separate from the parent and admin layouts.

```text
(auth)/
├── login/
├── register/
├── verify-phone/
├── forgot-password/
└── reset-password/
```

Authentication state should be validated on the server before protected pages are rendered.

Route access rules:

- Public pages are available to everyone.
- Parent pages require the parent role.
- Admin pages require the admin role.
- Authentication pages may redirect authenticated users when appropriate.

The frontend should never rely only on hiding links for permission enforcement.

The backend must validate every protected action.

---

## 13. Role-Based Navigation

Navigation should be generated according to the authenticated user's role.

### 13.1 Parent Navigation

- Dashboard
- Students
- Registrations
- Service Requests
- Contracts
- Payments
- Notifications
- Profile

### 13.2 Admin Navigation

- Dashboard
- Registrations
- Families
- Students
- Schools
- Service Requests
- Contracts
- Pricing
- Payments
- Notifications
- Settings

Permission checking should support:

- Route-level access
- Page-level access
- Component-level visibility
- Action-level access

For example, only authorized administrators should see actions for:

- Editing prices
- Approving offline payments
- Approving registrations
- Issuing contracts
- Changing administrative settings

---

## 14. Responsive Architecture

The frontend should be designed mobile-first because many parents may use mobile devices.

### 14.1 Desktop

- Persistent sidebar
- Wide content areas
- Multi-column forms
- Dashboard summaries
- Side-by-side sections
- Full data tables

### 14.2 Tablet

- Collapsible sidebar
- Reduced column counts
- Scrollable tables
- Adaptive spacing
- Simplified dashboard grids

### 14.3 Mobile

- Drawer navigation
- Single-column forms
- Cards instead of wide tables where appropriate
- Sticky primary actions
- Large touch targets
- Simplified filters
- Bottom sheets for secondary actions
- Compact dashboard summaries
- Student selector optimized for touch

Admin tables should remain usable on smaller screens through:

- Column priority
- Horizontal scrolling
- Expandable rows
- Mobile record cards
- Condensed action menus

---

## 15. Error Handling

The frontend should display errors based on their context.

### 15.1 Field Errors

Field errors should appear directly below the related field.

### 15.2 Form Errors

Form-level errors should appear above the form when the complete submission fails.

### 15.3 Page Errors

Page errors should display:

- Clear explanation
- Retry action
- Safe navigation option
- Contact support guidance where appropriate

### 15.4 Authentication Errors

Examples:

- Invalid username or password
- Expired session
- Insufficient permission
- Phone verification failure
- Account unavailable

### 15.5 Payment Errors

Examples:

- Payment cancelled
- Payment failed
- Payment pending verification
- Payment already completed
- Offline payment awaiting admin approval
- Payment record unavailable

Technical error details should not be exposed to users.

---

## 16. Loading and Empty States

Every data-driven page should define:

- Initial loading state
- Refetching state
- Empty state
- Error state
- Success state

Examples of empty states:

- No registered students
- No active contract
- No unpaid installments
- No notifications
- No pending registrations
- No offline payments awaiting approval
- No search results

Skeleton loaders should be used for major dashboard sections instead of blank screens.

---

## 17. Frontend Security Considerations

The frontend should:

- Avoid storing sensitive authentication data in local storage
- Sanitize user-provided content
- Validate all form inputs
- Protect against repeated submissions
- Disable payment buttons after submission
- Avoid exposing internal IDs unnecessarily
- Handle expired sessions safely
- Hide unauthorized actions
- Require confirmation for sensitive admin actions
- Protect against accidental duplicate operations
- Avoid displaying private family data to unauthorized users
- Never treat frontend validation as sufficient security

All sensitive rules and permissions must also be enforced by the backend.

---

## 18. Accessibility

The frontend should include:

- Keyboard navigation
- Visible focus indicators
- Semantic HTML
- Proper labels
- Accessible error messages
- Sufficient color contrast
- Screen-reader-friendly forms
- Accessible dialogs and drawers
- Touch-friendly controls
- Reduced-motion support where appropriate
- Proper heading structure
- Accessible table markup
- Clear button labels
- Form instructions linked to their fields

---

## 19. Suggested Core Libraries

Recommended frontend libraries:

```text
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
Radix UI
React Hook Form
Zod
TanStack Query
Zustand
TanStack Table
Lucide React
Motion
date-fns
```

A Persian or Jalali date library may be added if the application requires Persian calendar input and display.

---

## 20. Recommended Architecture Decision

The recommended frontend architecture is:

- One Next.js frontend application
- Separate public, authentication, parent, and admin route groups
- Separate layouts for each major area
- Feature-based code organization
- Server components by default
- TanStack Query for server state
- React Hook Form and Zod for forms and validation
- Zustand only for small shared client state
- Shared responsive design system
- Mobile-first implementation
- Centralized API client
- Strict separation between UI, business features, and API services
- Role-based routes, navigation, and actions
- Reusable loading, empty, error, and feedback states

This architecture is structured enough for the complete school transport system while avoiding unnecessary complexity during the first development stages.
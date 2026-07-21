# School Transport Service — UI/UX Specification

## 1. Document Purpose

This document defines the UI/UX direction, visual standards, responsive behavior, interaction patterns, and usability rules for the school transport service platform.

The specification covers:

- Public website
- Authentication pages
- Parent panel
- Admin panel
- Enrollment and registration flows
- Contract-related interfaces
- Online and offline payment interfaces
- Notifications and system feedback
- Responsive and mobile-first behavior
- Persian RTL support
- Images, banners, illustrations, and background assets
- Accessibility and interaction guidelines

The goal is to create a system that feels trustworthy and professional while remaining friendly, simple, and comfortable for families.

---

## 2. Core Design Direction

The design must combine two qualities:

1. **Formal and trustworthy**
   - Suitable for contracts
   - Suitable for payments
   - Suitable for school-related services
   - Suitable for official administrative processes
   - Clear, reliable, and structured

2. **Friendly and family-oriented**
   - Comfortable for parents
   - Easy to understand
   - Not overly corporate
   - Not visually cold
   - Approachable for users with different levels of technical experience

The interface should feel modern and professional without becoming complicated, rigid, or intimidating.

---

## 3. Theme and General Appearance

The first version of the platform will use a **light theme only**.

### 3.1 Visual Characteristics

The interface should use:

- Clean light backgrounds
- Strong visual hierarchy
- Clear spacing
- Readable typography
- Moderate border radius
- Light borders
- Soft shadows
- Simple and recognizable icons
- Limited gradients
- Friendly illustrations
- Professional school transport photography
- Clear status colors
- Balanced information density

The platform should avoid:

- Heavy dark sections
- Excessive gradients
- Excessive glassmorphism
- Overly playful visuals
- Too many card-based layouts
- Heavy continuous animations
- Cluttered dashboards
- Small text
- Complicated decorative elements

---

## 4. Color Direction

The primary brand color should use a **blue-based direction**.

Blue is recommended because it communicates:

- Trust
- Safety
- Reliability
- Stability
- Professional service

Green should be used as a secondary and semantic color, especially for:

- Successful payments
- Approved enrollments
- Active contracts
- Completed actions
- Verified information

### 4.1 Suggested Semantic Colors

- **Primary blue:** navigation, main buttons, links, highlighted sections
- **Green:** approved, paid, active, successful
- **Amber or yellow:** pending, awaiting action, warning
- **Red:** rejected, failed, overdue, destructive actions
- **Gray:** draft, inactive, disabled, completed archive states
- **Purple:** optional contract-related intermediate states

Colors must never be the only way to communicate meaning. Statuses must also include text and, where appropriate, icons.

---

## 5. Typography

The system is Persian-first and should use a high-quality Persian font.

### 5.1 Recommended Font

- **Vazirmatn**

Alternative fonts may be used only if they provide:

- Excellent Persian readability
- Clear number rendering
- Consistent RTL behavior
- Multiple weights
- Good performance on web and mobile

### 5.2 Typography Rules

- Headings must be clearly distinguishable
- Body text must remain readable on small screens
- Form labels must be visible and descriptive
- Error messages must not be too small
- Button labels must be short and clear
- Avoid overly thin font weights
- Avoid excessive uppercase Latin text
- Persian and Latin numbers must align correctly
- Line heights must support Persian text comfortably

---

## 6. Persian and RTL Support

The complete first version will be:

- Persian-only
- Fully RTL
- Designed specifically for RTL
- Not treated as a mirrored LTR interface

### 6.1 RTL Requirements

The design must correctly support:

- RTL page layouts
- RTL sidebar placement
- RTL breadcrumbs
- RTL form labels
- RTL tables
- RTL pagination
- RTL modals
- RTL drawers
- RTL dropdowns
- RTL notifications
- RTL date and number display
- RTL step indicators
- RTL icons where direction matters

Directional icons such as arrows must be reversed appropriately.

### 6.2 Persian Content Rules

- Validation messages must be Persian
- Empty states must be Persian
- System notifications must be Persian
- Button text must be Persian
- Contract and payment terminology must remain consistent
- Dates must follow the project’s selected Persian date format
- Phone numbers and national ID values must be displayed clearly
- Input direction may switch to LTR for phone numbers, codes, or Latin values when needed

---

## 7. Responsive and Mobile-First Strategy

The complete system must be fully responsive.

This includes:

- Public website
- Login and registration
- Parent panel
- Admin panel
- Enrollment forms
- Contracts
- Online payments
- Offline payment submissions
- Payment history
- Tables
- Modals
- Drawers
- Notifications
- Settings
- Profile pages

The design should be **mobile-first**, especially for the parent-facing experience.

Many parents may use mobile devices more than desktop computers.

### 7.1 Mobile Requirements

On mobile:

- Sidebars become drawers
- Navigation remains easy to access
- Important actions remain visible
- Inputs use touch-friendly sizes
- Buttons must not be too small
- Forms must avoid crowded multi-column layouts
- Tables should transform into cards or use controlled horizontal scrolling
- Long content should remain readable
- Status labels must remain visible
- Payment actions must be easy to find
- Contract acceptance must work comfortably
- Student selection must remain accessible
- File or receipt uploads must work well on mobile
- Confirmation dialogs must fit small screens
- Sticky action areas may be used for important steps

### 7.2 Desktop Requirements

On desktop:

- Sidebars may remain fixed
- Content can use multiple columns
- Tables can show more information
- Parent views should still remain simple
- Admin views may be denser
- Important summary cards may be shown above detailed data
- Filters and actions should remain easy to reach

---

## 8. Main Product Areas

The platform includes three primary UI areas:

1. Public website
2. Parent panel
3. Admin panel

---

## 9. Public Website

The public website introduces the service and guides parents toward registration.

### 9.1 Main Public Pages

Recommended pages include:

- Home
- About the service
- How registration works
- Service explanation
- Pricing explanation
- Supported schools or service areas
- Frequently asked questions
- Contact
- Login
- Registration entry page

### 9.2 Homepage Structure

A suggested homepage structure:

1. Hero section
2. Main value proposition
3. Service introduction
4. How registration works
5. Safety and trust section
6. Service benefits
7. Supported schools or areas
8. Registration process preview
9. Parent-focused call to action
10. Frequently asked questions
11. Contact or support section
12. Footer

### 9.3 Public Website UX Goals

The public website should quickly answer:

- What is this service?
- Who can use it?
- How does registration work?
- What information is required?
- How are prices determined?
- How are contracts accepted?
- How are payments made?
- How can parents contact support?
- How can a parent begin registration?

### 9.4 Public Website Visual Style

The public website may use more expressive visuals than the dashboards.

Suitable visual elements include:

- Hero banners
- School transport photography
- Parent and child illustrations
- Service process graphics
- Safety-related visual sections
- Background images
- Promotional banners
- Decorative transport icons
- Soft motion effects
- Section transitions

The public pages must still remain fast, readable, and responsive.

---

## 10. Authentication Pages

Authentication pages include:

- Login
- Registration
- Forgot password
- Password reset
- Primary phone verification
- OTP verification where required

### 10.1 Authentication Layout

The desktop version may use:

- Form on one side
- Image, illustration, or branded background on the other side

The mobile version should prioritize the form and reduce decorative elements when needed.

### 10.2 Authentication UX Rules

- Keep forms simple
- Show clear validation messages
- Explain password requirements
- Clearly distinguish login and registration
- Avoid too many fields on the first screen
- Show loading feedback
- Prevent duplicate submissions
- Make OTP entry mobile-friendly
- Clearly explain which parent phone number is being verified
- Provide easy navigation back to the previous step

---

## 11. Parent Panel

The parent panel must be simple, clear, and action-oriented.

Parents should not need to understand complex administrative details.

### 11.1 Parent Navigation

The parent panel will use a responsive sidebar.

Suggested navigation items:

- Overview
- Students
- Enrollment
- Contracts
- Payments
- Notifications
- Family information
- Settings

On mobile, the sidebar becomes a drawer or another compact navigation structure.

### 11.2 Family Dashboard

The dashboard should show:

- Current student
- Registration status
- Required next action
- Contract status
- Payment summary
- Upcoming installment
- Pending warnings
- Recent notifications
- Important deadlines
- Quick actions

### 11.3 Multiple Students

A family can have multiple students.

The interface must include a clearly visible student selector.

The selected student must remain obvious throughout the parent panel.

Each student should have a separate view for:

- Personal information
- Enrollment
- Service request
- Contract
- Payment plan
- Payment history
- Notifications

The user must not accidentally perform an action for the wrong student.

### 11.4 Parent UX Questions

Every important parent-facing screen should clearly answer:

- Which student am I viewing?
- What is the current status?
- What should I do next?
- Is anything incomplete?
- Has the request been approved?
- Has the price been assigned?
- Is the contract ready?
- Has the contract been accepted?
- How much must I pay?
- Which installment is due?
- Was my offline payment approved?
- Is any payment overdue?
- Can I edit this information?

---

## 12. Admin Panel

The admin panel should prioritize operational clarity and speed.

It may be denser than the parent panel, but it must remain readable and responsive.

### 12.1 Admin Navigation

Suggested navigation items:

- Dashboard
- Enrollment requests
- Families
- Parents
- Students
- Pricing
- Contracts
- Online payments
- Offline payment approvals
- Notifications
- Settings

### 12.2 Admin Dashboard

The dashboard should show important operational summaries such as:

- New registrations
- Requests under review
- Requests waiting for price assignment
- Contracts waiting for acceptance
- Pending online payments
- Pending offline payment confirmations
- Overdue installments
- Recently completed actions
- Warning counts
- Quick links to pending work

### 12.3 Admin UX Priorities

Admin screens should support:

- Fast approvals
- Clear filtering
- Search
- Status visibility
- Quick access to parent details
- Quick access to student details
- Price assignment
- Contract management
- Online payment visibility
- Offline payment verification
- Rejection reasons
- Pending action counts
- Clear audit information
- Easy navigation between related records

### 12.4 Admin Tables

Tables may be used where appropriate.

They should support:

- Search
- Filtering
- Sorting
- Pagination
- Clear row actions
- Status indicators
- Responsive behavior
- Empty states
- Loading states
- Error states

On mobile, tables should transform into readable cards or use controlled horizontal scrolling.

---

## 13. Enrollment Flow

Long enrollment forms must be divided into logical steps.

### 13.1 Suggested Enrollment Steps

1. Parent information
2. Student information
3. School and service information
4. Emergency contact
5. Review and submission
6. Admin review
7. Price assignment
8. Contract acceptance
9. Payment

### 13.2 Enrollment UX Rules

- Show progress clearly
- Allow moving between completed steps
- Save drafts where appropriate
- Preserve entered information
- Clearly show required fields
- Validate each step
- Use Persian error messages
- Show a final review screen
- Require confirmation before final submission
- Explain what happens after submission
- Clearly show whether editing is still allowed
- Show reasons when changes are requested
- Highlight returned fields when admin corrections are required

---

## 14. Form Design

Forms are a major part of the platform and must remain simple.

### 14.1 Form Rules

- Labels must appear above inputs
- Required fields must be clear
- Placeholder text must not replace labels
- Help text should be used where needed
- Validation must appear close to the related field
- Error messages must explain how to fix the issue
- Success feedback should be visible
- Long forms must use sections or steps
- Related fields may be grouped
- Irreversible actions require confirmation
- Disabled fields should explain why they cannot be edited
- Mobile input types must be correct
- Phone and national ID fields should use proper formatting
- Buttons must show loading states
- Duplicate submissions must be prevented

### 14.2 Input Types

The design system should include:

- Text inputs
- Phone inputs
- National ID inputs
- Password fields
- OTP inputs
- Select fields
- Searchable selects
- Radio groups
- Checkboxes
- Date fields
- Text areas
- File or receipt uploads
- Currency inputs
- Read-only fields
- Confirmation controls

---

## 15. Contract Interface

The contract interface must feel formal and clear.

### 15.1 Contract Screen Content

The contract screen should show:

- Student information
- Parent information
- Service period
- Agreed price
- Payment plan
- Contract terms
- Contract status
- Acceptance action
- Acceptance date
- Download or print action where available

### 15.2 Contract UX Rules

- Contract content must be readable on mobile
- Price information must be prominent
- Parents must confirm acceptance explicitly
- The system must clearly explain that accepted contracts cannot be modified unless a new contract is signed
- Important clauses may be visually highlighted
- Confirmation must prevent accidental acceptance
- Status must remain visible after acceptance
- A clear notice must be shown when a replacement contract is issued

---

## 16. Payment Interface

The system supports:

- Online payment
- Offline payment with admin confirmation

### 16.1 Payment Overview

The payment screen should show:

- Total contract price
- Prepayment amount
- Remaining amount
- Installment schedule
- Paid amounts
- Pending amounts
- Overdue amounts
- Payment method
- Payment history
- Receipts or reference numbers
- Required next payment

### 16.2 Online Payment UX

The online payment flow should:

- Clearly show the amount
- Clearly show the related installment
- Require confirmation before redirecting
- Show loading feedback
- Prevent repeated clicks
- Handle success, failure, timeout, and cancellation states
- Provide clear return-to-system feedback
- Show payment reference information
- Update the payment status clearly

### 16.3 Offline Payment UX

The offline payment flow should allow the parent to:

- Select offline payment
- View payment instructions
- Enter payment information
- Upload a receipt if required
- Submit for admin review
- See pending confirmation status
- See approval or rejection
- Read the rejection reason
- Resubmit when allowed

### 16.4 Admin Offline Payment Review

The admin interface should show:

- Parent
- Student
- Contract
- Installment
- Submitted amount
- Submission date
- Receipt
- Reference number
- Notes
- Approval action
- Rejection action
- Rejection reason

After approval, the payment should be shown as successful.

---

## 17. Status System

Statuses must be consistent across the entire platform.

### 17.1 Suggested Enrollment and Service Statuses

- Draft
- Submitted
- Under review
- Changes requested
- Approved
- Price assigned
- Awaiting contract acceptance
- Awaiting prepayment
- Active
- Rejected
- Completed

### 17.2 Suggested Payment Statuses

- Unpaid
- Pending
- Under review
- Paid
- Failed
- Rejected
- Overdue
- Cancelled

### 17.3 Status Component Requirements

Each status should include:

- Clear Persian label
- Color
- Optional icon
- Short explanation
- Next required action where applicable

Status naming must remain consistent across:

- Dashboard
- Tables
- Detail pages
- Notifications
- Contract screens
- Payment screens

---

## 18. Notifications and Alerts

The system should provide clear notifications for:

- Registration submission
- Registration approval
- Changes requested
- Price assignment
- Contract availability
- Contract acceptance
- Payment due dates
- Successful payment
- Failed payment
- Offline payment approval
- Offline payment rejection
- Overdue installment
- Administrative warnings

### 18.1 Notification UI

Notifications should include:

- Title
- Short description
- Date and time
- Related student
- Priority
- Read or unread state
- Related action

Important notifications may appear as:

- Dashboard alerts
- Notification center items
- Inline warnings
- Toast messages
- Modal confirmations

Toast messages should not be used for important information that users may need to review later.

---

## 19. Images, Banners, and Generated Visual Assets

The UI/UX design must intentionally include places for generated images.

The user will generate images and visual assets for the project.

### 19.1 Suggested Visual Assets

- Homepage hero background
- Homepage hero illustration
- Promotional banners
- Service introduction banners
- Registration call-to-action background
- School transport illustrations
- Parent and student imagery
- Safety and trust visuals
- About-us image
- Contact-page background
- Login and registration side image
- Empty-state illustrations
- Dashboard welcome illustration
- Mobile promotional graphics
- School-related decorative images
- Payment success illustration
- Contract-related illustration

### 19.2 Image Usage Rules

Images must:

- Support the content
- Avoid reducing readability
- Be responsive
- Use optimized formats
- Use proper aspect ratios
- Avoid excessive file sizes
- Include alternative text when meaningful
- Avoid containing important text inside the image
- Allow text overlays only when contrast is strong
- Use overlays when needed for readability
- Use consistent visual style

Important website text should be rendered as HTML, not permanently embedded inside generated images.

### 19.3 Banner Rules

Banners should:

- Have a clear purpose
- Include one main message
- Include one primary action
- Work on desktop and mobile
- Avoid placing critical content near crop-sensitive edges
- Use separate mobile crops when needed
- Remain visually consistent with the brand

---

## 20. Animation and Interaction

The system should use restrained but polished interactions.

Animations must not become distracting or reduce performance.

### 20.1 Suitable Interactions

- Smooth section entrances
- Button hover and press feedback
- Light card elevation
- Sidebar open and close animation
- Drawer transitions
- Form step transitions
- Validation feedback
- Loading skeletons
- Expandable FAQ items
- Subtle image movement
- Smooth counters
- Animated status updates
- Payment success feedback
- Contract acceptance feedback
- Dropdown transitions
- Tab transitions
- Progress indicator animation

### 20.2 Animation Limits

Avoid:

- Heavy parallax
- Constant movement
- Large background animations
- Excessive scroll effects
- Long loading animations
- Overly complex cursor effects
- Effects that interfere with reading
- Motion that makes mobile performance worse

The platform should support reduced-motion preferences.

---

## 21. Components and Design System

A consistent component system should be used across the platform.

### 21.1 Core Components

- Buttons
- Icon buttons
- Inputs
- Selects
- Checkboxes
- Radio groups
- Text areas
- Date inputs
- OTP inputs
- File upload
- Cards
- Summary cards
- Status badges
- Alerts
- Toasts
- Modals
- Drawers
- Dropdown menus
- Tabs
- Accordions
- Breadcrumbs
- Pagination
- Tables
- Mobile data cards
- Empty states
- Loading skeletons
- Progress steps
- Timelines
- Student selector
- Payment summary
- Contract summary
- Notification item
- Confirmation dialog

### 21.2 Component Consistency

Components should share:

- Spacing
- Border radius
- Typography
- Icon style
- Hover behavior
- Focus behavior
- Disabled behavior
- Loading behavior
- Error behavior
- Success behavior

---

## 22. Empty, Loading, Error, and Success States

Every important screen must define:

- Loading state
- Empty state
- Error state
- Success state
- Disabled state

### 22.1 Empty States

Empty states should:

- Explain why there is no content
- Suggest the next action
- Use a simple illustration where appropriate
- Avoid technical wording

### 22.2 Loading States

Use:

- Skeletons for content areas
- Button spinners for actions
- Progress indicators for multi-step actions
- Clear waiting feedback for payments and submissions

### 22.3 Error States

Errors should:

- Use simple Persian wording
- Explain what happened
- Explain what the user can do
- Preserve entered form data
- Avoid exposing technical details
- Include retry options where appropriate

### 22.4 Success States

Success feedback should:

- Confirm the completed action
- Explain what happens next
- Show relevant references
- Provide the next action
- Avoid relying only on temporary toast messages

---

## 23. Accessibility

The system should follow practical accessibility principles.

### 23.1 Accessibility Requirements

- Readable font sizes
- Strong color contrast
- Keyboard navigation
- Visible focus states
- Proper form labels
- Clear error messages
- Touch-friendly controls
- Reduced-motion support
- Accessible modals
- Accessible drawers
- Alternative text for meaningful images
- No information communicated only by color
- Proper heading structure
- Sufficient spacing between interactive controls
- Buttons and links must be distinguishable

---

## 24. UX Writing

The interface text must be:

- Clear
- Short
- Respectful
- Persian
- Consistent
- Action-oriented
- Easy for non-technical users

Avoid:

- Technical jargon
- Unclear abbreviations
- Long button labels
- Vague error messages
- Different names for the same status
- Formal language that feels unnecessarily difficult

### 24.1 Button Examples

Use clear actions such as:

- ثبت اطلاعات
- ادامه
- ذخیره پیش‌نویس
- ارسال درخواست
- مشاهده قرارداد
- تأیید قرارداد
- پرداخت آنلاین
- ثبت پرداخت آفلاین
- ویرایش اطلاعات
- مشاهده جزئیات

---

## 25. Performance Considerations

UI/UX decisions must support good performance.

The system should:

- Optimize images
- Lazy-load non-critical images
- Avoid excessive animation libraries
- Avoid unnecessary large backgrounds
- Use responsive image sizes
- Minimize layout shifts
- Use loading skeletons
- Keep mobile interactions fast
- Avoid rendering overly large tables
- Paginate admin data

Visual quality should not make the system slow or difficult to use.

---

## 26. Final Design Principles

The final UI/UX should be:

- Persian-first
- Fully RTL
- Mobile-first
- Fully responsive
- Light-themed
- Trustworthy
- Family-friendly
- Professional
- Simple for parents
- Efficient for admins
- Image-supported
- Moderately interactive
- Accessible
- Consistent
- Clear about statuses and next actions

The system should help parents complete registration, contracts, and payments with minimal confusion, while giving administrators a fast and reliable interface for managing requests, prices, contracts, and payments.
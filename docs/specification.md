# School Transport Service Platform
## Project Specification

**Document Type:** Product and System Specification  
**Current Release Focus:** Student enrollment, parent portal, internal review, pricing, installments, and payment  
**Future Direction:** Drivers, school managers, routes, live tracking, vehicle monitoring, and advanced administration  
**Status:** Initial approved specification

---

# 1. Project Overview

The School Transport Service Platform is a web-based system for managing student transportation enrollment, contract acceptance, service preferences, pricing, installment plans, payments, and parent access.

The first release focuses on the complete student enrollment and payment lifecycle. The platform must still be designed with a modular and upgradeable architecture so that future modules can be added without rebuilding the current system.

The system will initially serve:

- Parents
- Students
- Internal staff or administrators

Future releases may also serve:

- Drivers
- School managers
- Transportation operators
- Support personnel
- Route managers

The platform should support multiple students under one parent account. Each student will have a separate profile, enrollment, dashboard, contract, service request, payment plan, and payment history.

---

# 2. Current Project Scope

The current release includes:

1. Public website
2. Parent registration and authentication
3. Parent account management
4. Multiple student profiles under one parent account
5. Multi-step student transportation enrollment
6. Student and parent information validation
7. School, educational level, and grade selection
8. Personalized contract generation and acceptance
9. Transportation service preferences
10. Special, medical, and operational notes
11. Enrollment review and status management
12. Minimal staff administration panel
13. Price assignment after review
14. Cash and installment payment options
15. One-third prepayment and four installments
16. Online payment integration
17. Parent and student dashboards
18. Payment receipts and transaction history
19. Notifications
20. Audit logs and security controls

The following features are not part of the current implementation but must be considered in the architecture:

- Driver enrollment and management
- School manager accounts
- Vehicle management
- Route planning
- Student-to-route assignment
- Driver-to-route assignment
- Live vehicle location
- Estimated arrival time
- Student boarding and drop-off tracking
- In-vehicle camera integration
- Advanced reports and Excel exports
- Advanced administrative permissions

---

# 3. Main User Types

## 3.1 Parent User

The parent is the main customer and account owner.

A parent can:

- Create an account
- Log in using username and password
- Manage account information
- Register multiple children
- Select one child from the parent panel
- View a separate dashboard for each child
- Start or continue an enrollment
- View enrollment status
- Correct returned information
- Review accepted contracts
- View approved pricing
- Choose cash or installment payment
- Pay prepayments and installments
- View payment history
- Download receipts
- Receive notifications

## 3.2 Student

A student does not need a separate login in the current release.

Each student has:

- Personal profile
- School information
- Educational information
- Enrollment history
- Contract records
- Service preferences
- Sensitive notes
- Pricing records
- Payment plans
- Payment history
- Status history

## 3.3 Staff or Administrator

A minimal staff panel is required in the current release.

Staff can:

- Log in securely
- View student enrollments
- Search and filter requests
- Review submitted information
- Request corrections
- Approve or reject enrollments
- Assign prices
- Configure cash and installment options
- Define installment dates
- View payment status
- Add internal notes
- View contract acceptance information
- View audit history
- Export basic data where required

The full advanced administrative system is reserved for future releases.

---

# 4. Authentication and Account Model

## 4.1 Authentication Method

The system will use a username and password combination for registration and login.

OTP-based login is not required for the current release.

The authentication system must include:

- Unique username
- Secure password storage
- Password confirmation during registration
- Password strength requirements
- Login error handling
- Rate limiting
- Account lock protection
- Secure session management
- Password reset flow
- Logout from current session
- Optional logout from all sessions
- Audit logging for important authentication events

## 4.2 Parent Account Structure

The recommended relationship is:

```text
Parent Account
    ├── Student 1
    │     ├── Student Dashboard
    │     ├── Enrollment
    │     ├── Contract
    │     ├── Pricing
    │     └── Payments
    │
    ├── Student 2
    │     ├── Student Dashboard
    │     ├── Enrollment
    │     ├── Contract
    │     ├── Pricing
    │     └── Payments
    │
    └── Additional Students
```

The parent panel must allow switching between children.

Each child must have an independent page and dashboard. Actions taken for one student must not affect another student.

---

# 5. Public Website

The public website should introduce the service and guide parents toward enrollment.

Recommended pages:

- Home
- About Us
- Company Background or Résumé
- Services
- Supported Schools
- Enrollment Guide
- Frequently Asked Questions
- Contact Us
- Terms and Conditions
- Privacy Policy
- Student Transportation Contract Information
- Login
- Registration
- Student Enrollment

The primary call to action is:

**Enroll a Student**

The public website should clearly explain:

- How enrollment works
- What information is required
- How the review process works
- When pricing is provided
- Available payment methods
- The difference between service preference and final assignment
- How parents can track their request

---

# 6. Student Enrollment Flow

The student enrollment process is a multi-step form.

The form should include:

- Progress indicator
- Previous and next buttons
- Autosave
- Draft restoration
- Server-side validation
- Client-side validation
- Clear Persian error messages
- Prevention of duplicate submission
- Review page before final submission

Recommended steps:

1. Student and contact information
2. School and educational information
3. Contract review and acceptance
4. Service preferences and additional notes
5. Final review and submission

---

# 7. Enrollment Step One: Student and Contact Information

## 7.1 Student Information

Required fields:

- First name
- Last name
- Father’s name
- Iranian national ID code
- Home address

Optional or configurable fields:

- Date of birth
- Gender
- Postal code

The field previously referred to as “card code” is the Iranian national ID code.

## 7.2 Parent Contact Information

Both parent phone numbers are mandatory.

Required fields:

- Mother’s mobile number
- Father’s mobile number
- Home phone number
- Main notification phone selection

The parent must choose one of the parent mobile numbers as the primary notification number.

The other phone numbers act as fallback contacts.

Suggested notification priority:

```text
Primary selected mobile number
        ↓
Other parent mobile number
        ↓
Home phone or alternate configured contact
```

Home phone may be used for operational contact but not necessarily for automated SMS.

## 7.3 Emergency Contact

The emergency contact must be someone other than the student’s parents.

Required fields:

- Emergency contact full name
- Relationship to student
- Emergency contact mobile number

Validation must prevent the emergency contact from being identical to the mother or father where this can be reliably detected.

## 7.4 Address

For the current release, the address is entered manually.

Required field:

- Full home address

Future support may include:

- Map location selection
- Geographic coordinates
- Pickup location
- Alternate pickup point
- Address verification
- Service area validation

---

# 8. Field Validation and Error Handling

## 8.1 National ID Validation

The Iranian national ID code must:

- Contain the correct number of digits
- Accept Persian and English digits
- Be normalized before validation
- Pass the Iranian national ID checksum rules
- Be checked for duplicate student registration where appropriate

## 8.2 Mobile Number Validation

Mobile numbers must:

- Accept Persian and English digits
- Be normalized to a standard internal format
- Match valid Iranian mobile formats
- Reject incomplete or invalid values
- Prevent unsupported characters
- Display clear error messages

## 8.3 Home Phone Validation

Home phone numbers must:

- Support area code
- Accept Persian and English digits
- Be normalized
- Validate length and structure
- Support extension where required

## 8.4 Text Field Validation

Text fields must:

- Trim unnecessary whitespace
- Reject invalid characters where appropriate
- Support Persian text correctly
- Enforce minimum and maximum lengths
- Prevent script injection
- Display field-specific error messages

## 8.5 Form Safety

The system must:

- Save drafts automatically
- Prevent accidental data loss
- Restore unfinished enrollment after login
- Prevent duplicate form submission
- Validate data on both frontend and backend
- Preserve previous valid values when one field fails
- Clearly identify the invalid step and field

---

# 9. Enrollment Step Two: School and Educational Information

The selection process must be hierarchical.

Selection order:

1. School
2. Educational level
3. Grade
4. Optional academic field

Example:

```text
School
    └── Educational Level
            └── Grade
                    └── Academic Field
```

Possible educational levels include:

- Primary school
- متوسطه اول
- متوسطه دوم
- Other configured levels

Possible grades include:

- هفتم
- هشتم
- نهم
- دهم
- یازدهم
- دوازدهم

Each school may support different educational levels and grades.

The system must only show valid choices configured for the selected school.

## 9.1 School Configuration Requirements

Each school should support configuration for:

- School name
- School code
- Address
- Active or inactive status
- Supported educational levels
- Supported grades
- Supported academic fields
- Academic year
- Enrollment availability
- Service availability
- Future transport zones
- Future capacity limits

## 9.2 Academic Year

Every enrollment must belong to an academic year.

Examples:

- 1405–1406
- 1406–1407

This is necessary to preserve historical records and allow future yearly enrollment renewal.

---

# 10. Enrollment Step Three: Contract Review and Acceptance

The contract must be generated from a versioned template.

## 10.1 Contract Variables

The contract can contain variables such as:

```text
{{student_first_name}}
{{student_last_name}}
{{student_full_name}}
{{father_name}}
{{national_id}}
{{mother_phone}}
{{father_phone}}
{{primary_notification_phone}}
{{address}}
{{school_name}}
{{education_level}}
{{grade}}
{{academic_year}}
{{registration_date}}
```

These values must be replaced with the current student’s information before the contract is shown.

## 10.2 Contract Viewer

The contract must be displayed:

- In full
- In a scrollable container
- In a readable Persian layout
- With personalized values
- With the current contract version
- Before final submission

The user cannot continue until:

- The contract has been presented
- The agreement checkbox is selected
- Any required confirmation action is completed

## 10.3 Contract Acceptance Record

The system should store:

- Contract template ID
- Contract version
- Generated contract snapshot
- Student ID
- Parent account ID
- Enrollment ID
- Acceptance date and time
- Acceptance IP where legally appropriate
- User-agent information where appropriate
- Agreement status

Accepted contract content must be immutable.

Changing the general contract template later must not modify an already accepted contract.

## 10.4 Future Contract Capabilities

Future releases may add:

- OTP confirmation
- Electronic signature
- PDF generation
- Downloadable signed contract
- Separate school-specific contract
- Separate final pricing agreement

---

# 11. Enrollment Step Four: Service Preferences and Additional Information

## 11.1 Vehicle Preferences

Possible service preferences:

- Bus
- Minibus
- Van
- Passenger car

The selected option is a preference, not a guaranteed vehicle assignment.

The interface must explain that:

- The final vehicle depends on availability
- The final vehicle depends on route planning
- The final vehicle depends on student capacity
- The final vehicle depends on school and area
- Another suitable service may be assigned
- Final pricing is determined after review

## 11.2 Service Direction

Recommended options:

- Morning only
- Return only
- Round trip

## 11.3 Additional Information

The parent can provide extra information about the child.

Possible structured fields:

- Medical considerations
- Allergies
- Accessibility needs
- Behavioral notes
- Communication notes
- Special pickup instructions
- Other important information

A general additional-information text box should also be available.

## 11.4 Sensitive Data

Medical and health-related information is sensitive.

The system must:

- Store it securely
- Restrict access
- Avoid displaying it unnecessarily
- Record who viewed or changed it where required
- Share it with future drivers only when operationally necessary
- Clearly explain why the information is collected

---

# 12. Final Review and Submission

Before submission, the parent must see a complete summary.

The summary should include:

- Student information
- Parent contact information
- Emergency contact
- Address
- School
- Educational level
- Grade
- Academic year
- Service preference
- Special notes
- Contract acceptance
- Main notification number

The parent must confirm the information before submission.

After successful submission:

- A unique tracking code is generated
- The enrollment status becomes Submitted
- The parent sees a success message
- The request appears in the parent panel
- Staff are notified
- A confirmation notification is sent

---

# 13. Enrollment Status Lifecycle

Recommended statuses:

```text
Draft
Submitted
Under Review
Needs Correction
Approved
Priced
Payment Pending
Partially Paid
Active
Rejected
Cancelled
Expired
```

Recommended core lifecycle:

```text
Draft
  ↓
Submitted
  ↓
Under Review
  ├── Needs Correction
  │       ↓
  │    Resubmitted
  │       ↓
  │    Under Review
  │
  ├── Rejected
  │
  └── Approved
          ↓
        Priced
          ↓
    Payment Pending
          ↓
    Partially Paid
          ↓
        Active
```

The system must prevent invalid status transitions.

Every status change should store:

- Previous status
- New status
- Date and time
- Changed by
- Public note
- Internal note
- Reason where required

---

# 14. Parent Panel

The parent panel is the main authenticated interface.

## 14.1 Parent Dashboard

The parent dashboard should show:

- Parent account summary
- Registered children
- Add new student button
- Enrollment status for each child
- Required actions
- Upcoming payments
- Unpaid installments
- Recent notifications

## 14.2 Student Selection

The parent can select one student from a child switcher.

Each child has a separate dashboard and page.

Example:

```text
Parent Dashboard
    ├── Child A Dashboard
    ├── Child B Dashboard
    └── Add New Child
```

## 14.3 Student Dashboard

Each student dashboard should show:

- Student summary
- School and grade
- Academic year
- Enrollment status
- Service preference
- Contract status
- Pricing status
- Payment plan
- Next payment
- Remaining balance
- Important messages
- Required corrections
- Downloadable documents

## 14.4 Editing Rules

Recommended editing permissions:

- Draft: all fields editable
- Submitted: locked
- Needs Correction: requested fields editable
- Under Review: locked
- Approved: locked unless returned by staff
- Priced: price-related information locked
- Active: changes require staff approval

Each edit must be logged.

---

# 15. Internal Staff Panel

A basic internal panel is required for the current workflow.

## 15.1 Enrollment Management

Staff should be able to:

- View all enrollments
- View student details
- View parent contact information
- View emergency contact
- View school and educational information
- View service preference
- View additional notes
- View contract acceptance
- View payment details

## 15.2 Search and Filters

Recommended filters:

- Tracking code
- Student name
- National ID
- Parent phone
- School
- Educational level
- Grade
- Academic year
- Enrollment status
- Payment status
- Submission date

## 15.3 Review Actions

Staff can:

- Move request to Under Review
- Request correction
- Add correction message
- Approve request
- Reject request
- Add rejection reason
- Assign final price
- Configure payment plan
- Add internal notes
- View audit trail

## 15.4 Internal Notes

Internal notes are visible only to authorized staff.

Public notes or correction messages are visible to the parent.

---

# 16. Pricing

Pricing is assigned after staff review.

The final price may eventually depend on:

- School
- Address
- Route
- Distance
- Vehicle type
- One-way or round trip
- Academic year
- Service capacity
- Special conditions

For the current release, staff can manually assign the approved price.

The pricing record should contain:

- Total price
- Pricing date
- Pricing status
- Pricing explanation
- Available payment methods
- Prepayment amount
- Installment count
- Installment dates
- Offer expiration date
- Staff member who created it

Pricing rules should be configurable and not permanently hardcoded.

---

# 17. Payment Options

Parents can choose:

- Full cash payment
- Installment payment

## 17.1 Cash Payment

For full payment:

- One payment is generated
- The full amount is payable
- The enrollment becomes paid after successful verification

## 17.2 Installment Payment

Current agreed rule:

- One-third of the total price is paid as prepayment
- The remaining two-thirds is divided into four installments

Example:

```text
Total Price: 30,000,000

Prepayment:
10,000,000

Remaining:
20,000,000

Four Installments:
5,000,000 each
```

This creates five total payment items:

1. Prepayment
2. Installment 1
3. Installment 2
4. Installment 3
5. Installment 4

The system should calculate amounts carefully so rounding differences are applied to the final installment.

## 17.3 Installment Record

Each installment should contain:

- Title
- Sequence number
- Amount
- Due date
- Payment status
- Paid date
- Payment transaction
- Late status
- Remaining balance

---

# 18. Payment Processing

The system should integrate with an approved payment gateway.

## 18.1 Payment Lifecycle

Recommended statuses:

```text
Pending
Initiated
Redirected
Processing
Paid
Failed
Cancelled
Expired
Refunded
```

## 18.2 Payment Safety

The system must prevent duplicate charges.

Required protections:

- Unique payment request ID
- Idempotency key
- Gateway transaction reference
- Server-side verification
- Duplicate callback protection
- Retry-safe verification
- Refresh-safe payment page
- Back-button handling
- Timeout handling
- Cancelled payment handling
- Reconciliation support

The system must never mark a payment as successful only because the user returns to the website.

A payment is successful only after server-side verification with the payment provider.

## 18.3 Payment Receipts

After successful payment, the parent should receive:

- Payment confirmation
- Receipt number
- Amount
- Payment date
- Payment title
- Gateway reference
- Updated remaining balance

Receipts should be viewable and downloadable from the student dashboard.

---

# 19. Notifications

The system should support notifications related to enrollment and payment.

## 19.1 Notification Priority

The parent chooses a primary notification mobile number.

The notification priority is:

1. Selected primary parent mobile
2. Other parent mobile
3. Other configured fallback channel

Fallback should only occur when delivery failure can be reliably detected.

## 19.2 Notification Events

Recommended notifications:

- Account created
- Enrollment draft reminder
- Enrollment submitted
- Enrollment under review
- Correction requested
- Enrollment approved
- Enrollment rejected
- Price issued
- Payment plan created
- Prepayment due
- Payment successful
- Payment failed
- Installment reminder
- Installment overdue
- Enrollment activated
- Important service announcement

## 19.3 Notification Records

Store:

- Recipient
- Channel
- Template
- Message type
- Related student
- Related enrollment
- Delivery status
- Provider response
- Retry count
- Sent date
- Delivered date
- Failure reason

---

# 20. Core Data Model

Recommended current entities:

```text
User
ParentProfile
Student
StudentParentRelation
Address
EmergencyContact
School
EducationLevel
Grade
AcademicField
SchoolEducationLevel
SchoolGrade
AcademicYear
Enrollment
EnrollmentStatusHistory
ServicePreference
StudentSensitiveNote
ContractTemplate
ContractVersion
AcceptedContract
PricingOffer
PaymentPlan
Installment
Payment
PaymentTransaction
PaymentReceipt
Notification
InternalNote
CorrectionRequest
AuditLog
Session
PasswordResetRequest
```

## 20.1 Important Relationships

```text
User
  └── ParentProfile
        ├── Students
        │     └── Enrollments
        │           ├── AcceptedContract
        │           ├── ServicePreference
        │           ├── PricingOffer
        │           ├── PaymentPlan
        │           └── Payments
        │
        └── Contact Information
```

## 20.2 Multi-Student Support

The schema must not assume one parent equals one student.

A parent account may be linked to multiple students.

Each student can have multiple yearly enrollments.

```text
Parent 1 → Many Students
Student 1 → Many Academic-Year Enrollments
Enrollment 1 → One Contract Snapshot
Enrollment 1 → Zero or One Pricing Offer
Enrollment 1 → Zero or One Payment Plan
Payment Plan 1 → Many Installments
```

---

# 21. Future Data Domains

The architecture should prepare for:

```text
Driver
DriverProfile
DriverDocument
DriverVerification
Vehicle
VehicleDocument
SchoolManager
Route
RouteStop
RouteSchedule
StudentRouteAssignment
DriverRouteAssignment
VehicleRouteAssignment
Trip
TripLocation
StudentAttendance
PickupEvent
DropOffEvent
Incident
CameraDevice
CameraAccessLog
SchoolReport
ExportJob
```

These entities do not need to be implemented in the current release unless required by technical foundations.

---

# 22. Security Requirements

The system contains student, parent, contact, address, payment, and possibly medical information.

Required protections:

- Secure password hashing
- HTTPS
- Secure cookies
- CSRF protection
- XSS prevention
- SQL injection prevention
- Input sanitization
- Rate limiting
- Authentication attempt limits
- Role-based access control
- Sensitive-data access restrictions
- Audit logging
- Database backups
- Encrypted secrets
- Safe file handling
- Session expiration
- Secure password reset
- Payment verification
- Least-privilege access

Sensitive student notes must not be visible to unauthorized users.

The parent must only access students connected to their own account.

Every student-specific request must verify ownership on the server.

---

# 23. Audit Logging

The system should log important actions.

Examples:

- Account created
- Login success or failure
- Password changed
- Student added
- Enrollment created
- Enrollment submitted
- Field corrected
- Contract accepted
- Status changed
- Price assigned
- Payment plan generated
- Payment initiated
- Payment verified
- Staff note added
- Sensitive information viewed
- Enrollment approved or rejected

Audit records should contain:

- Actor
- Action
- Entity type
- Entity ID
- Previous value where appropriate
- New value where appropriate
- Date and time
- IP address where appropriate

---

# 24. Non-Functional Requirements

## 24.1 Usability

- Persian-first interface
- RTL layout
- Clear progress indicators
- Mobile-friendly forms
- Accessible labels
- Clear error messages
- Easy child switching
- Simple payment experience
- Consistent navigation

## 24.2 Performance

- Fast public pages
- Efficient dashboard loading
- Pagination for staff lists
- Database indexes
- Cached school configuration where appropriate
- Optimized contract generation
- Reliable payment callbacks

## 24.3 Reliability

- Draft autosave
- Transaction-safe payment updates
- Retry-safe notifications
- Database backups
- Error monitoring
- Structured logging
- Graceful failure states

## 24.4 Maintainability

- Modular architecture
- Clear domain separation
- Migration-based database changes
- Reusable validation
- Typed APIs
- Configurable business rules
- Versioned contracts
- Testable payment logic

## 24.5 Scalability

The architecture should support future growth in:

- Number of students
- Number of schools
- Number of parents
- Number of drivers
- Number of routes
- Live tracking records
- Notifications
- Payments
- Reports

---

# 25. Current Business Rules

1. A parent uses username and password to register and log in.
2. A parent can register multiple students.
3. Each student has a separate dashboard.
4. Each student can have multiple enrollments across academic years.
5. Mother’s mobile number is mandatory.
6. Father’s mobile number is mandatory.
7. Home phone is mandatory.
8. One parent mobile is selected as the primary notification number.
9. Other contact numbers are fallback contacts.
10. Emergency contact must be someone other than the parents.
11. Address is entered manually in the current release.
12. National ID is required and validated.
13. School choices determine available educational levels.
14. Educational level determines available grades.
15. Contract acceptance is mandatory before submission.
16. Accepted contract content is versioned and immutable.
17. Vehicle selection is a preference, not a guarantee.
18. Staff review is required before pricing.
19. Parent chooses cash or installment payment after pricing.
20. Installment payment uses one-third prepayment.
21. The remaining amount is divided into four installments.
22. Successful payment requires gateway verification.
23. Duplicate payment must be prevented.
24. Submitted enrollment is locked unless returned for correction.
25. Sensitive notes have restricted access.
26. Every important status change is logged.

---

# 26. Future Roadmap

## Phase 2: Advanced Administration

- Full student list
- School-based student lists
- Filters by student, school, year, grade, and status
- Excel exports
- Advanced reports
- Role and permission management
- Bulk operations

## Phase 3: Driver and Vehicle Management

- Driver registration
- Driver authentication
- Driver document upload
- Driver approval
- Vehicle registration
- Vehicle documents
- Driver dashboard
- Driver assignments

## Phase 4: School Manager Portal

- School manager accounts
- School student lists
- Enrollment monitoring
- School reports
- School-specific announcements

## Phase 5: Route Operations

- Route creation
- Stop creation
- Student assignment
- Driver assignment
- Vehicle assignment
- Capacity controls
- Pickup and drop-off schedules

## Phase 6: Live Services

- GPS tracking
- Parent map
- Driver location
- Estimated arrival time
- Pickup confirmation
- Drop-off confirmation
- Delay alerts
- Incident reporting

## Phase 7: Camera and Monitoring

- Vehicle camera integration
- Restricted live access
- Recording policy
- Access logging
- Privacy controls
- Data retention policy
- Legal and operational review

---

# 27. Current Release Acceptance Summary

The current release is complete when:

- Parents can create accounts using username and password
- Parents can register multiple students
- Each student has a separate dashboard
- Enrollment works through all required steps
- All required fields are validated
- School, level, and grade selections are dynamic
- Personalized contracts are generated and accepted
- Service preferences and notes are stored
- Staff can review requests
- Staff can request corrections
- Staff can approve or reject enrollments
- Staff can assign prices
- Parents can choose cash or installment payment
- One-third prepayment and four installments are generated correctly
- Payments are verified securely
- Duplicate charges are prevented
- Parents can view payment history and receipts
- Notifications are sent to the selected primary number
- The database and architecture remain ready for future modules

---

# 28. Final Product Definition

The first version of the School Transport Service Platform is not only a registration form.

It is a complete student transportation enrollment and payment system containing:

- Parent account management
- Multi-student support
- Student-specific dashboards
- Structured enrollment
- Contract acceptance
- Internal review
- Pricing
- Installment planning
- Online payment
- Notifications
- Auditability
- Future-ready architecture

The system must be implemented as a stable foundation for later driver, school, route, location, and monitoring modules.
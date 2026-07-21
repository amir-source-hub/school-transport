# School Transport Service — Business Rules Specification

## 1. Document Purpose

This document defines the business rules for the MVP version of the School Transport Service platform.

The goal is to establish clear and consistent rules for:

- Parent and family accounts
- Student registration
- Service requests
- Registration approval
- Manual pricing
- Full and installment payments
- Basic notifications
- Parent and student data editing
- Administrator operations
- Academic-term handling

Features related to routes, vehicles, drivers, attendance, pickup and drop-off, capacity management, service suspension, cancellation workflows, and advanced audit history are planned for future versions and are not part of the current MVP.

---

## 2. Core MVP Principles

The MVP follows these principles:

1. One parent account may manage multiple students.
2. Every student has an independent profile, registration, service request, pricing, payment plan, and payment history.
3. Student registrations require administrator approval.
4. Duplicate active student registrations are prevented using the student’s Iranian national ID code.
5. Parents register and log in using a username and password.
6. The selected primary parent phone number must be verified using OTP.
7. Prices are entered manually by the administrator after registration review.
8. Parents may pay the full amount at once or choose an installment plan.
9. Installment payments begin with a required prepayment before the academic term starts.
10. The remaining balance is divided across four monthly installments.
11. Basic notifications are sent for registration, payments, due dates, and warnings.
12. Parents may edit only simple and non-operational information.
13. Critical student, school, service, and pricing information is controlled by the administrator.
14. Important records from previous academic terms must remain available and must not be overwritten.

---

# 3. Parent and Family Rules

## 3.1 Parent Account

A parent account represents one family account in the platform.

A single parent account may:

- Register multiple students
- View each student separately
- Submit an independent service request for each student
- View the price assigned to each student
- Select a payment method for each student
- Pay each student’s invoices separately
- View each student’s payment history
- Edit permitted family and student information

Each student must have a separate section or dashboard inside the parent panel.

---

## 3.2 Required Parent Information

Both parents’ information must be collected during registration.

Required information includes:

- Father’s full name
- Father’s phone number
- Mother’s full name
- Mother’s phone number
- Family address
- Account username
- Account password
- Selected primary phone number
- Required identity and contact details defined by the registration form

Both the mother’s and father’s phone numbers are mandatory.

The two phone numbers should normally be different.

---

## 3.3 Primary Phone Number

The parent must select either the mother’s or father’s phone number as the primary phone number.

The primary phone number is used for:

- OTP verification
- Main notifications
- Payment notifications
- Due-date reminders
- Registration updates
- Warnings and important messages

The selected primary phone number must be verified using a one-time password before the account becomes fully active.

The secondary parent phone number may be used as a fallback notification number when required.

---

## 3.4 Login and Authentication

The main login method is:

```text
Username + Password
```

OTP is not the main login method.

OTP is used to verify the selected primary phone number during account registration or when the primary phone number is changed.

Password storage must use secure password hashing.

---

## 3.5 Emergency Contact

An emergency contact is mandatory.

The emergency contact:

- Must be someone other than the student’s mother or father
- Must have a valid phone number
- Must have a defined relationship with the student
- May be updated only according to the permitted data-editing rules

Required emergency-contact information includes:

- Full name
- Phone number
- Relationship to the student

---

# 4. Student Registration Rules

## 4.1 Student Registration

Parents may register one or more students under the same account.

Each student registration must be stored independently.

Required student information may include:

- Full name
- Iranian national ID code
- Date of birth
- Gender, when required
- School
- Grade
- Academic term
- Pickup address
- Student photo, if required
- Special notes
- Medical or operational notes, when necessary
- Emergency contact
- Requested service type

The exact form fields may be refined during implementation, but the Iranian national ID code, school, grade, and service information are required operational fields.

---

## 4.2 Iranian National ID Code

The student’s card code refers to the Iranian national ID code.

The system must:

- Validate the format of the national ID code
- Prevent duplicate active student registrations
- Use the national ID code as a key identity field
- Prevent the same student from being registered multiple times for the same active academic term

An administrator may review suspected duplicate cases.

---

## 4.3 Registration Status

Each student registration must have one of the following statuses:

```text
Draft
Submitted
Under Review
Approved
Rejected
```

Allowed lifecycle:

```text
Draft → Submitted → Under Review → Approved
                          ↘ Rejected
```

Definitions:

- `Draft`: The parent has started the registration but has not submitted it.
- `Submitted`: The registration has been sent for administrator review.
- `Under Review`: The administrator is reviewing the registration.
- `Approved`: The registration has been accepted.
- `Rejected`: The registration has been rejected.

A student cannot receive an assigned price or become eligible for payment until the registration has been reviewed.

---

## 4.4 Registration Approval

The administrator is responsible for approving or rejecting student registrations.

The administrator may:

- Review submitted information
- Request correction when necessary
- Approve the registration
- Reject the registration
- Add an administrative note
- Enter the final service price after review

Approval does not automatically mean that the service has been paid.

Registration approval and payment status must remain separate.

---

# 5. Service Request Rules

## 5.1 Independent Service Request

A separate service request must exist for each student.

A parent with multiple students must submit and manage each student’s request separately.

Each request may include:

- Student
- School
- Grade
- Academic term
- Requested start date
- Pickup address
- Service direction
- Additional notes
- Special requirements

---

## 5.2 Service Type

The MVP may support the following service types:

```text
Pickup only
Return only
Round trip
```

The selected service type may affect the manually entered price.

---

## 5.3 Service Request Status

Each service request should use the following simplified MVP statuses:

```text
Draft
Submitted
Under Review
Approved
Rejected
Awaiting Price
Awaiting Payment
Active
Completed
```

Recommended lifecycle:

```text
Draft
→ Submitted
→ Under Review
→ Approved
→ Awaiting Price
→ Awaiting Payment
→ Active
→ Completed
```

A request may also move to:

```text
Rejected
```

The administrator manually handles operational assignment outside the system during the MVP.

---

## 5.4 Manual Assignment

Route assignment, driver assignment, vehicle assignment, and capacity validation are handled manually outside the MVP system.

The platform does not currently need:

- Automatic route assignment
- Route optimization
- Driver scheduling
- Vehicle scheduling
- Vehicle capacity validation
- Pickup tracking
- Attendance tracking

These are planned as future features.

---

# 6. Pricing Rules

## 6.1 Manual Pricing

Prices are entered manually by the administrator after reviewing the student registration and service request.

The MVP does not calculate prices automatically.

The administrator may consider factors such as:

- Student location
- School
- Service type
- Distance
- Academic term
- Operational conditions
- Other manually evaluated factors

The calculation method is outside the system in the MVP.

---

## 6.2 Price Assignment

Each approved student service request must have its own assigned price.

The assigned price belongs to:

- One student
- One service request
- One academic term
- One approved service period

The price must not be shared automatically between students, including siblings.

---

## 6.3 Price Confirmation

After the administrator enters the price:

1. The price becomes visible to the parent.
2. The parent receives a notification.
3. The parent chooses a payment method.
4. The system creates the required payment schedule.
5. The service remains inactive until the required initial payment conditions are satisfied.

---

## 6.4 Historical Price Preservation

When the administrator assigns a price, the value must be stored as part of the student’s service agreement.

Later price changes must not modify historical:

- Paid invoices
- Completed payment plans
- Previous academic-term records
- Previous student service agreements

A corrected price must create an updated record rather than silently overwriting completed financial history.

---

# 7. Payment Rules

## 7.1 Payment Timing

Payment is arranged before the academic term begins.

After the administrator approves the registration and enters the final price, the parent must choose one of the available payment methods.

Available payment methods:

```text
Full payment
Installment payment
```

---

## 7.2 Full Payment

Under full payment:

- The parent pays the entire assigned price in one transaction.
- The system creates one payable invoice.
- The payment must be verified by the payment gateway.
- After successful verification, the invoice is marked as paid.
- The payment requirement for the academic term is considered complete.

---

## 7.3 Installment Payment

Under installment payment:

- The parent must pay a required prepayment before the academic term begins.
- The remaining balance is divided into four monthly installments.
- Each installment has its own amount, due date, and status.
- The prepayment and all four installments belong to the same student payment plan.

The payment structure is:

```text
Initial Prepayment
+ Month 1 Installment
+ Month 2 Installment
+ Month 3 Installment
+ Month 4 Installment
```

The exact prepayment amount may be entered or configured by the administrator.

The remaining balance must be calculated as:

```text
Remaining Balance = Total Assigned Price - Prepayment
```

The remaining balance is divided into four installments.

Where the amount cannot be divided equally, the system may place the rounding difference in the final installment.

---

## 7.4 Payment Plan Selection

The payment method is selected separately for each student.

A parent with multiple students may choose:

- Full payment for one student
- Installment payment for another student

Once a payment plan has been selected and the first payment has been successfully completed, changing the plan should require administrator action.

---

## 7.5 Student-Specific Payment Accounts

Each student must have an independent financial record.

The system must keep separate:

- Assigned price
- Payment method
- Prepayment
- Installments
- Due dates
- Paid amounts
- Remaining balance
- Transaction history
- Payment status

Payments for one student must never automatically affect another student’s balance.

---

## 7.6 Payment Schedule

For installment payments, the system must create:

- One prepayment invoice
- Four monthly installment invoices

Each invoice must contain:

- Student
- Parent account
- Service request
- Academic term
- Invoice type
- Amount
- Due date
- Status
- Payment transaction reference
- Payment date, when paid

---

## 7.7 Invoice Status

The MVP invoice statuses are:

```text
Draft
Issued
Paid
Overdue
Cancelled
```

Definitions:

- `Draft`: Created but not yet made payable.
- `Issued`: Available for payment.
- `Paid`: Successfully paid and verified.
- `Overdue`: Due date has passed without successful payment.
- `Cancelled`: Invalidated by an authorized administrator.

Partial payment of a single invoice is not supported unless added later.

The installment plan itself provides partial payment across multiple invoices.

---

## 7.8 Payment Plan Status

A payment plan may use:

```text
Pending
Active
Completed
Overdue
Cancelled
```

Definitions:

- `Pending`: Created but the required prepayment has not yet been paid.
- `Active`: Prepayment has been paid and future installments remain.
- `Completed`: All required payments have been successfully paid.
- `Overdue`: One or more issued installments are overdue.
- `Cancelled`: Cancelled by an authorized administrator.

---

## 7.9 Payment Verification

A payment must not be marked as successful only because the user returns from the payment gateway.

The backend must verify the transaction with the payment gateway.

A payment becomes successful only after:

1. The gateway confirms the transaction.
2. The transaction reference is valid.
3. The amount matches the invoice.
4. The transaction has not already been processed.
5. The invoice is still payable.

---

## 7.10 Duplicate Payment Prevention

Payment processing must be idempotent.

The system must prevent:

- Processing the same gateway callback more than once
- Marking the same invoice as paid twice
- Creating duplicate payment records
- Charging the same successful transaction against multiple invoices
- Updating the balance more than once for the same payment

Every gateway transaction reference must be unique in the system.

Repeated callbacks for an already processed payment must return the existing result without creating another financial operation.

---

## 7.11 Failed and Cancelled Payments

When payment fails or is cancelled:

- The invoice remains unpaid.
- The payment attempt may be recorded.
- The parent may try again.
- No paid balance is added.
- No installment is considered completed.
- The service payment state must not be incorrectly activated.

---

## 7.12 Offline Payment Recording

The administrator may record an approved offline payment.

An offline payment record should include:

- Student
- Invoice
- Amount
- Payment date
- Payment method
- Reference or receipt number
- Administrative note

An offline payment must be connected to a specific invoice.

The system must prevent the same invoice from being paid both online and offline more than once.

---

## 7.13 Due Dates and Overdue Payments

Each installment has a due date.

When an issued invoice passes its due date without successful payment:

```text
Issued → Overdue
```

The system should:

- Mark the invoice as overdue
- Notify the parent
- Display a warning in the parent dashboard
- Display the overdue state in the administrator dashboard

Automatic service suspension is not included in the MVP.

Administrators handle overdue cases manually.

---

## 7.14 Remaining Balance

The system must calculate the remaining balance using verified payments only.

```text
Remaining Balance =
Total Assigned Price
- Sum of Successfully Verified Payments
```

Failed, cancelled, pending, or unverified transactions must not reduce the remaining balance.

---

# 8. Notification Rules

## 8.1 MVP Notification Scope

The MVP includes only basic notifications.

Notifications are required for:

- Account and primary phone verification
- Registration submission
- Registration approval
- Registration rejection
- Price assignment
- Payment-plan creation
- Successful payment
- Failed payment, when useful
- Upcoming due date
- Overdue payment
- Important administrative warnings

Advanced transport-operation notifications are not included in the MVP.

---

## 8.2 Notification Priority

Notifications should use the following priority:

```text
Verified primary parent phone number
→ Secondary parent phone number when needed
```

The primary phone number is selected by the parent as either the mother’s or father’s number.

Only the primary number must be OTP verified in the MVP.

---

## 8.3 Notification Channels

The MVP may use:

- SMS
- In-application notifications

Email may be added where available, but SMS and dashboard notifications are the primary channels.

---

## 8.4 Due-Date Notifications

The system should send basic reminders:

- Before an installment due date
- On or near the due date
- After the invoice becomes overdue

The exact reminder schedule may be configured during implementation.

---

# 9. Data Editing Rules

## 9.1 Parent-Editable Information

Parents may edit simple, non-critical information such as:

- Optional student notes
- Non-operational personal details
- Selected notification preferences
- Account password
- Permitted contact details
- Other fields explicitly marked as editable

---

## 9.2 Restricted Information

Parents must not directly edit operationally important fields after registration approval.

Restricted fields include:

- Student’s Iranian national ID code
- School
- Grade, when it affects the active service
- Academic term
- Approved service type
- Assigned price
- Payment records
- Payment-plan structure
- Registration approval status
- Service approval status

Changes to restricted information require administrator review or direct administrator action.

---

## 9.3 Primary Phone Number Change

When the parent changes the primary phone number:

1. The new number must belong to either the registered mother or father.
2. The new number must be verified using OTP.
3. The previous primary number remains active until the new number is verified.
4. After successful verification, the new number becomes the primary notification number.

---

## 9.4 Address and School Changes

The parent may not directly change the approved school or other service-critical information.

Address editing should be restricted after service approval because it may affect:

- Manual pricing
- Service feasibility
- Administrative planning
- Future route assignment

Such changes must be submitted to the administrator.

---

# 10. Academic Term Rules

## 10.1 Term-Based Records

Every registration, service request, assigned price, and payment plan must belong to an academic term.

A student may have different records for different terms.

---

## 10.2 Pre-Term Payment

The parent must select the payment method before the academic term begins.

For installment plans, the required prepayment must also be paid before the term starts.

The remaining four installments are paid during the following four months.

---

## 10.3 End of Term

At the end of the academic term:

- Active service records may become completed.
- The payment plan remains visible.
- Historical invoices remain accessible.
- Historical registrations remain accessible.
- Previous prices must remain unchanged.
- A new term requires a new or renewed service request.

Previous service and financial records must not be overwritten.

---

# 11. Administrator Rules

## 11.1 MVP Administrator Responsibilities

Administrators may perform the following tasks:

- View parent accounts
- View student profiles
- Review student registrations
- Approve registrations
- Reject registrations
- Review service requests
- Enter manual prices
- Edit assigned prices before payment
- Create or confirm payment plans
- View invoices
- View payment statuses
- Record offline payments
- View overdue installments
- Send or trigger basic warnings
- View basic operational and financial dashboards
- Manage simple user and student records

---

## 11.2 Registration Management

The administrator controls:

- Registration review
- Approval
- Rejection
- Correction requests
- Administrative notes
- Final pricing

Parents cannot approve their own student registrations.

---

## 11.3 Price Management

The administrator may enter or update a price before the parent completes the first successful payment.

After payment begins, price changes must be controlled carefully.

A price change after a successful payment should require:

- A recorded reason
- Recalculation of the remaining balance
- Regeneration or correction of unpaid future invoices
- Preservation of completed payment history

The MVP may restrict this operation to authorized administrators only.

---

## 11.4 Dashboard Rules

The administrator dashboard should provide basic information such as:

- Total parent accounts
- Total students
- Submitted registrations
- Approved registrations
- Rejected registrations
- Registrations awaiting review
- Registrations awaiting price
- Full-payment selections
- Installment-payment selections
- Paid invoices
- Upcoming installments
- Overdue installments
- Total verified payments
- Remaining receivables

These values must be calculated from actual stored records.

---

# 12. Validation Rules

The system must validate:

- Required parent information
- Both parent phone numbers
- Primary phone selection
- OTP verification of the primary phone number
- Emergency contact being different from both parents
- Student national ID format
- Duplicate student registration
- Required school and academic-term fields
- Valid assigned price
- Valid prepayment amount
- Four-installment schedule
- Invoice amount consistency
- Unique gateway transaction references
- Valid invoice and payment status transitions

---

# 13. Security and Financial Integrity Rules

The system must:

- Hash passwords securely
- Never store plain-text passwords
- Restrict administrator operations by authorization
- Verify all online payments on the backend
- Prevent duplicate payment processing
- Prevent parents from editing prices or payment records
- Prevent one parent from accessing another family’s records
- Keep each student’s financial records separate
- Validate all payment amounts against server-side invoice data
- Never trust price or invoice amounts sent only by the frontend

---

# 14. Future-Scope Business Rules

The following areas are intentionally excluded from the MVP and are planned for future development:

## 14.1 Route Management

- Route creation
- Automatic route assignment
- Route optimization
- Route changes
- Route histories
- Map-based routing

## 14.2 Vehicle Capacity

- Seat-capacity validation
- Student capacity allocation
- Temporary capacity reservations
- Capacity conflict prevention

## 14.3 Driver and Vehicle Assignment

- Driver schedules
- Vehicle schedules
- Assignment conflicts
- Document-expiration validation
- Substitute drivers
- Substitute vehicles

## 14.4 Pickup and Drop-Off

- Pickup confirmation
- Drop-off confirmation
- Authorized guardian handover
- Missed pickups
- Driver waiting rules
- Live trip status

## 14.5 Attendance

- Morning attendance
- Return-trip attendance
- Student absence reporting
- Attendance histories
- Invalid transition prevention

## 14.6 Cancellation and Suspension

- Daily absence
- Temporary suspension
- Permanent cancellation
- Cancellation deadlines
- Financial adjustments
- Service suspension because of overdue payments

## 14.7 Advanced Audit History

- Before-and-after values
- Detailed change history
- Administrative override reasons
- Full financial audit logs
- Route and operational audit trails

---

# 15. Final Confirmed MVP Decisions

The following decisions are confirmed:

1. One parent account may manage multiple students.
2. Each student has an independent dashboard and records.
3. Both parents’ phone numbers are mandatory.
4. The parent selects either the mother’s or father’s number as the primary phone number.
5. The selected primary phone number must be OTP verified.
6. Login uses username and password.
7. The emergency contact must be someone other than the parents.
8. Duplicate student registration is prevented using the Iranian national ID code.
9. Student registration requires administrator approval.
10. Service requests are created separately for each student.
11. Operational assignments are manual and outside the MVP system.
12. Prices are entered manually by the administrator.
13. Prices are assigned independently for each student and academic term.
14. Payments are arranged before the academic term starts.
15. Parents may pay the full amount in one payment.
16. Parents may instead choose an installment plan.
17. Installment plans require an initial prepayment.
18. The remaining balance is paid in four monthly installments.
19. Each student has an independent payment plan and payment history.
20. Online payments must be verified by the payment gateway.
21. Payment processing must be idempotent.
22. Duplicate successful payments must never be processed twice.
23. Administrators may record approved offline payments.
24. Basic notifications cover registrations, prices, payments, due dates, overdue payments, and warnings.
25. Parents may edit only simple non-critical information.
26. School, pricing, approval, and payment information remain administrator-controlled.
27. Previous academic-term and payment records must remain unchanged and accessible.
28. Route, driver, vehicle, attendance, pickup, cancellation, suspension, capacity, and advanced audit features are future work.

---

# 16. Acceptance Summary

The Business Rules module is considered correctly implemented when:

- A parent can register and manage multiple students.
- Both parent phone numbers are required.
- The selected primary phone number is OTP verified.
- Duplicate student national IDs are rejected for the same active term.
- Registrations move through valid approval statuses.
- An administrator can approve or reject registrations.
- An administrator can manually assign a price.
- A parent can choose full or installment payment.
- The installment plan creates one prepayment and four monthly installments.
- All student payments remain independent.
- Payment-gateway callbacks cannot create duplicate payments.
- Verified payments correctly reduce the remaining balance.
- Due and overdue invoices are visible to parents and administrators.
- Basic notifications are generated for required events.
- Parents cannot edit protected operational or financial data.
- Historical academic-term records remain preserved.
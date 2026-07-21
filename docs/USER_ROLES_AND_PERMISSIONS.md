# User Roles and Permissions Specification

## 1. Purpose

This document defines the user roles, access permissions, ownership rules, protected actions, and authorization boundaries for the School Transport Service MVP.

The MVP intentionally uses a simple role model to reduce complexity while still protecting family, student, registration, pricing, and payment data.

---

## 2. MVP Roles

The MVP includes only two authenticated roles:

```text
PARENT
ADMIN
```

The system does not require separate roles for students, drivers, school personnel, accountants, dispatchers, or vehicle managers at this stage.

---

## 3. Family Account Model

Each family uses one shared account.

The mother and father do not have separate login accounts.

The family account uses:

- One shared username
- One shared password
- One selected primary phone number
- OTP verification for the selected primary phone number
- Information for both parents
- One or more registered students

Both parents may use the same credentials to access the family panel.

The selected primary phone number may belong to either the mother or the father.

The primary phone number is used for:

- OTP verification
- Main notifications
- Registration updates
- Payment notifications
- Installment due-date reminders
- Warnings and important service messages

The other parent phone number is stored as a secondary contact and may be used when the primary contact is unavailable.

---

## 4. Parent Role

The `PARENT` role represents the complete family account.

A parent account owns and manages the family's information, registered students, service requests, payment plans, and notifications.

### 4.1 Parent Permissions

Parents can:

- Register a new family account.
- Log in using the shared username and password.
- Verify the selected primary phone number through OTP.
- View the family profile.
- Edit permitted family information.
- View both parents' information.
- Select whether the mother's or father's number is the primary contact.
- Register multiple students under the same family account.
- View all students belonging to the family.
- Switch between students in the family panel.
- View a separate dashboard or profile for each student.
- Create a service request for each student.
- Save an incomplete student registration as a draft.
- Submit a completed service request.
- Correct requested information when the admin returns a registration.
- View registration status.
- View approval, correction, or rejection messages.
- View the manually assigned service price.
- Choose full payment or the available installment option.
- Pay the full price.
- Pay individual installments.
- View payment history.
- View remaining balance.
- View installment due dates.
- Retry failed payments.
- View or download payment receipts when available.
- View notifications.
- Mark notifications as read.
- Update optional notification preferences.
- Contact support or administration through available channels.

### 4.2 Parent Restrictions

Parents cannot:

- Access another family's account.
- View another family's students.
- Change another family's service requests.
- Approve or reject registrations.
- Set or modify service prices.
- Create or modify payment records manually.
- Mark an installment as paid.
- Change successful gateway transaction information.
- Assign routes.
- Assign drivers.
- Assign vehicles.
- Manage schools.
- Manage system-wide settings.
- View internal administrative notes.
- View audit logs.
- Suspend or reactivate accounts.
- Delete financial history.
- Delete approved registrations with related payment records.
- Directly modify protected registration information after approval.

---

## 5. Admin Role

The `ADMIN` role manages registrations, approvals, pricing, payments, notifications, and basic system records.

A single general admin role is sufficient for the MVP.

More specialized roles may be introduced later.

### 5.1 Admin Permissions

Admins can:

- Log in to the admin panel.
- View all family accounts.
- View both parents' information.
- View all registered students.
- Search and filter families.
- Search and filter students.
- Search and filter registrations.
- Search and filter payments.
- Review submitted service requests.
- Change a submitted request to under review.
- Approve a service request.
- Reject a service request.
- Request corrections.
- Add correction or rejection reasons.
- Review resubmitted information.
- Manually enter the service price.
- Modify the price before protected payment activity begins.
- Configure the approved payment option.
- Generate a four-month installment schedule.
- View full-payment and installment selections.
- View all transaction records.
- View successful, pending, failed, and overdue payments.
- Confirm supported manual or offline payments.
- Add payment notes.
- Send registration notifications.
- Send payment notifications.
- Send installment reminders.
- Send warnings.
- Edit permitted parent information.
- Edit permitted student information.
- Correct simple data-entry mistakes.
- Suspend a family account.
- Reactivate a family account.
- Add internal administrative notes.
- Perform approved manual overrides.
- View audit history for sensitive actions.

### 5.2 Admin Restrictions

Admins cannot:

- View users' plain-text passwords.
- Edit immutable audit records.
- Delete successful gateway transaction records.
- Rewrite gateway reference numbers.
- Mark an online payment successful without valid payment confirmation.
- Remove legally or operationally required payment history.
- Bypass important validation silently.
- Perform sensitive overrides without a recorded reason.
- Permanently delete records that are required for financial or historical tracking.

---

## 6. Roles Not Included in the MVP

### 6.1 Student

Students do not have accounts.

All student information is managed through the shared family account.

### 6.2 Driver

Driver authentication and driver panels are future features.

The MVP does not include:

- Driver login
- Assigned route viewing
- Pickup confirmation
- Drop-off confirmation
- Attendance recording
- Navigation
- Driver notifications

### 6.3 School Staff

Schools do not have system access in the MVP.

School staff cannot review, approve, or manage student transportation requests.

### 6.4 Accountant

A separate accountant role is not required.

The main admin manages basic payment and installment records.

### 6.5 Dispatcher or Operations Manager

Operational transportation management is outside the current MVP.

The MVP does not include separate permissions for:

- Route planning
- Driver assignment
- Vehicle assignment
- Daily trip management
- Capacity management
- Pickup and drop-off monitoring

### 6.6 Super Admin

A separate super-admin role is not required for the initial MVP.

Admin creation and advanced permission management may be handled manually or added later.

---

## 7. Authorization Model

The system uses Role-Based Access Control.

```text
User
├── PARENT
└── ADMIN
```

Role checks must be enforced on the backend.

The frontend may hide or disable unauthorized actions, but frontend restrictions are not sufficient security controls.

Every protected API request must independently verify:

1. The user is authenticated.
2. The user has the required role.
3. The user owns the requested resource or has administrative access.
4. The requested action is allowed for the current record status.
5. Sensitive changes satisfy verification and audit requirements.

---

## 8. Resource Ownership

Every family-owned record must be linked to the authenticated family account.

```text
Family Account
├── Parent Information
├── Students
├── Service Requests
├── Prices
├── Payment Plans
├── Payments
├── Documents
└── Notifications
```

A parent may access a resource only when its `familyId` matches the authenticated account's family ID.

Example:

```text
Family A
├── Student A1
└── Student A2

Family B
└── Student B1
```

Family A must never be able to access Student B1, even by changing:

- URL parameters
- Student IDs
- Request bodies
- API endpoints
- Browser storage
- Form values

Ownership verification must always occur on the server.

---

## 9. Family Information Permissions

### 9.1 Parent-Editable Information

Parents may edit simple family information such as:

- Parent names
- Secondary phone number
- Email address
- Home address
- Emergency contact details
- Optional notification preferences
- Primary-contact selection

### 9.2 Primary Phone Number Rules

The selected primary phone number must be OTP verified.

Changing the primary number requires:

1. Entering the new phone number.
2. Sending an OTP.
3. Verifying the OTP.
4. Updating the verified phone only after successful confirmation.
5. Recording the change in the audit history when appropriate.

An unverified phone number must not become the primary notification number.

### 9.3 Protected Family Information

The following information should require additional verification or admin assistance:

- National ID code
- Verified primary phone number
- Family account ownership information
- Account status
- Username changes
- Sensitive identity information

### 9.4 Password Rules

Parents may change the shared family password after confirming the current password or completing an approved recovery flow.

Changing the password affects both parents because the family uses one shared account.

The system must never display or store the plain-text password.

---

## 10. Student Permissions

### 10.1 Before Submission

While a service request is in draft status, parents may edit all required student registration information.

Parents can:

- Add student information.
- Update school and educational details.
- Update address and contact details.
- Upload or replace required documents.
- Save progress.
- Submit the completed request.

### 10.2 After Submission

After submission, parents cannot freely edit the complete request.

They may only edit fields explicitly returned for correction.

### 10.3 After Approval

After approval, parents may edit only simple non-critical information, such as:

- Student photo
- Non-critical notes
- Emergency contact details
- Minor contact information

Protected approved information requires admin assistance.

### 10.4 Protected Student Information

Parents cannot directly change the following after approval:

- Registered school
- Educational level
- Student identity information
- National ID code
- Approved home address
- Service type
- Approved registration data
- Assigned price
- Payment plan
- Payment records

---

## 11. Service Request Permissions

### 11.1 Recommended Status Lifecycle

```text
DRAFT
→ SUBMITTED
→ UNDER_REVIEW
→ CORRECTION_REQUIRED
→ APPROVED
→ REJECTED
```

A corrected request may return from `CORRECTION_REQUIRED` to `SUBMITTED` or `UNDER_REVIEW`.

### 11.2 Parent Actions by Status

| Status | Allowed Parent Actions |
|---|---|
| Draft | View, edit, submit, or discard |
| Submitted | View only |
| Under Review | View only |
| Correction Required | Edit requested fields and resubmit |
| Approved | View approved service, price, and payments |
| Rejected | View rejection reason and create a new request if allowed |

### 11.3 Admin Actions by Status

| Status | Allowed Admin Actions |
|---|---|
| Draft | View only when administrative access is necessary |
| Submitted | Start review |
| Under Review | Approve, reject, or request correction |
| Correction Required | Review corrected information |
| Approved | Enter price and configure payment |
| Rejected | View history or reopen through a recorded override |

### 11.4 Invalid Actions

The system must reject actions such as:

- Parent approving a request.
- Parent editing an under-review request.
- Admin approving an incomplete request.
- Parent changing an approved price.
- Parent changing the school after approval.
- Parent submitting another family's request.
- Rejected request becoming approved without an authorized admin action.

---

## 12. Pricing Permissions

Only admins can:

- Enter the service price.
- Change the price before protected payment activity begins.
- Configure full-payment availability.
- Configure the four-month installment schedule.
- Apply an approved price correction.
- Record a reason for a price override.

Parents can:

- View the assigned price.
- Choose from payment methods allowed by the admin.
- Select full payment.
- Select the four-month installment plan.
- View installment amounts and due dates.

Parents cannot negotiate or directly edit the price inside the system.

After successful payment activity begins, price changes must be restricted.

Required corrections should be handled through traceable adjustments rather than rewriting historical payment data.

---

## 13. Payment Permissions

### 13.1 Parent Payment Permissions

Parents can:

- Initiate payment.
- Pay the total amount.
- Pay an available installment.
- Retry failed or abandoned payments.
- View transaction status.
- View successful payment receipts.
- View remaining balance.
- View due dates.
- View overdue warnings.

### 13.2 Admin Payment Permissions

Admins can:

- View all payment records.
- View payment gateway references.
- Review pending or failed payments.
- Confirm approved manual payments.
- Add internal payment notes.
- Send payment reminders.
- View overdue installments.
- Review suspicious or duplicate payment attempts.

### 13.3 Immutable Payment Information

Neither parents nor admins may directly edit:

- Successful gateway transaction ID
- Gateway reference number
- Paid amount recorded by the gateway
- Payment confirmation timestamp
- Payment verification result
- Original successful transaction history

Corrections must be represented as separate traceable records.

---

## 14. Notification Permissions

### 14.1 Parent Permissions

Parents can:

- View family notifications.
- View student-specific notifications.
- Mark notifications as read.
- Configure optional notification preferences.
- Receive mandatory operational notifications.

Mandatory notifications may include:

- Registration submitted
- Correction requested
- Registration approved
- Registration rejected
- Price assigned
- Payment successful
- Payment failed
- Installment due soon
- Installment overdue
- Account warning

Parents must not be able to disable critical payment or account notices completely.

### 14.2 Admin Permissions

Admins can:

- Send a notification to one family.
- Send a student-specific message.
- Send registration updates.
- Send payment reminders.
- Send due-date warnings.
- View notification delivery status when available.
- Resend failed important notifications.

---

## 15. Admin Override Rules

Admin overrides must be limited, justified, and recorded.

Possible overrides include:

- Reopening a rejected request.
- Returning an approved record for correction.
- Correcting a spelling mistake.
- Updating a verified phone after identity confirmation.
- Adjusting a price before payment.
- Confirming an approved offline payment.
- Reactivating a suspended account.
- Correcting simple parent or student information.

Every sensitive override should record:

```text
Admin ID
Action Type
Target Record
Previous Value
New Value
Reason
Timestamp
```

An override must not silently destroy historical information.

---

## 16. Account Suspension Rules

Admins may suspend a family account for approved administrative reasons.

A suspended parent account may be prevented from:

- Creating new service requests.
- Editing active registrations.
- Initiating new payments.
- Accessing selected protected services.

The system may still allow the family to:

- Log in.
- View suspension information.
- View existing records.
- View payment history.
- Contact administration.

Suspension and reactivation must be recorded.

---

## 17. Data Deletion Rules

### 17.1 Parent Deletion Restrictions

Parents cannot permanently delete:

- Approved service requests
- Payment plans
- Successful payments
- Installment history
- Audit records
- Records required for administrative history

Parents may discard an incomplete draft when it has no protected dependencies.

### 17.2 Admin Deletion Restrictions

Admins should use archival or deactivation instead of permanent deletion for important records.

Records with payment or approval history must remain available for tracking.

---

## 18. Audit Requirements

The system should record sensitive actions such as:

- Registration approval
- Registration rejection
- Correction request
- Price creation
- Price modification
- Manual payment confirmation
- Primary phone change
- Password recovery
- Account suspension
- Account reactivation
- Protected student information change
- Admin override

Audit records should include:

- Actor
- Role
- Action
- Target resource
- Previous value when applicable
- New value when applicable
- Reason when required
- Date and time

Audit records must not be editable through normal admin interfaces.

---

## 19. Permission Matrix

| Capability | Parent | Admin |
|---|---:|---:|
| Register family account | Yes | No |
| Use shared family login | Yes | No |
| Verify primary phone with OTP | Yes | Assist when necessary |
| View own family profile | Yes | Yes |
| Edit simple family information | Yes | Yes |
| View other families | No | Yes |
| Register students | Yes | Yes |
| View own students | Yes | Yes |
| View all students | No | Yes |
| Edit student draft | Yes | Yes |
| Edit submitted request freely | No | Yes, when allowed |
| Submit service request | Yes | Yes |
| Review registration | No | Yes |
| Request corrections | No | Yes |
| Approve registration | No | Yes |
| Reject registration | No | Yes |
| Set service price | No | Yes |
| Change assigned price | No | Yes, with restrictions |
| Choose payment plan | Yes | Assist when necessary |
| Initiate payment | Yes | No |
| View own payment history | Yes | Yes |
| View all payments | No | Yes |
| Confirm manual payment | No | Yes |
| Modify successful gateway payment | No | No |
| View own notifications | Yes | Yes |
| Send notifications | No | Yes |
| Change primary phone | Yes, with OTP | Yes, with verification and reason |
| Suspend family account | No | Yes |
| Reactivate family account | No | Yes |
| View audit logs | No | Yes |
| Assign routes | No | Not in MVP |
| Assign drivers | No | Not in MVP |
| Assign vehicles | No | Not in MVP |
| Manage vehicle capacity | No | Not in MVP |
| Manage attendance | No | Not in MVP |
| Manage admins | No | Future feature |

---

## 20. Backend Authorization Requirements

Every protected backend endpoint must:

- Require authentication.
- Validate the user's role.
- Validate family ownership.
- Validate the current record status.
- Validate whether the requested fields are editable.
- Reject unauthorized IDs supplied by the client.
- Prevent mass-assignment vulnerabilities.
- Validate payment and price operations independently.
- Record sensitive admin actions.
- Return a safe authorization error without exposing protected data.

Recommended authorization errors:

```text
401 Unauthorized
```

Used when the user is not authenticated.

```text
403 Forbidden
```

Used when the authenticated user does not have permission.

```text
404 Not Found
```

May be used when hiding the existence of another family's private resource.

```text
409 Conflict
```

Used when the action conflicts with the current request, registration, pricing, or payment status.

---

## 21. Security Principles

The implementation must follow these principles:

1. Never trust family IDs received from the frontend.
2. Derive ownership from the authenticated session.
3. Enforce permissions on the server.
4. Use the frontend only for usability restrictions.
5. Keep successful payment records immutable.
6. Require OTP for primary phone verification.
7. Require reasons for sensitive admin overrides.
8. Prevent parents from editing approved protected fields.
9. Prevent one family from discovering another family's records.
10. Keep passwords hashed and inaccessible.
11. Record sensitive administrative actions.
12. Prefer archival over destructive deletion.

---

## 22. Future Role Expansion

The authorization design should allow future roles without requiring them in the MVP.

Possible future roles include:

- Driver
- School Staff
- Accountant
- Dispatcher
- Operations Manager
- Support Agent
- Super Admin

Future permissions may include:

- Route assignment
- Vehicle assignment
- Driver assignment
- Attendance management
- Pickup and drop-off confirmation
- Live tracking
- Capacity management
- School-specific access
- Financial reporting
- Staff permission management

These roles and permissions are explicitly outside the current MVP.

---

## 23. Final MVP Decision

The School Transport Service MVP uses:

- One shared family account
- One shared username
- One shared password
- Two stored parent profiles
- One selected primary phone number
- OTP verification for the primary phone number
- One family dashboard
- Multiple students per family
- Separate student views inside the same family panel
- One general admin role
- Backend-enforced role and ownership authorization

This model provides a simple and practical MVP while preserving secure access boundaries and allowing future role expansion.
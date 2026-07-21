# Contract System Specification

## 1. Overview

The Contract System manages the creation, review, acceptance, activation, versioning, and cancellation of service contracts.

For the current MVP, the system should remain simple while ensuring that each contract is clearly connected to:

- An approved enrollment request
- One student
- One family account
- One primary parent or legal guardian
- The admin-approved service price
- The selected payment plan
- The related payment schedule

A separate contract must be created for each student and enrollment.

---

## 2. Contract Creation Conditions

A contract can be created only after:

- The enrollment request has been approved by the admin.
- The admin has entered and confirmed the final service price.
- The student receiving the service has been identified.
- The parent has selected either full payment or installment payment.
- The admin has approved contract generation.

The contract is generated through an admin request and is not created automatically immediately after registration.

---

## 3. Contract Parties

Each contract should identify the following parties and related information:

### Service Provider

- Service provider name
- Business or organization information
- Contact information
- Address, when required
- Authorized representative, when applicable

### Parent or Legal Guardian

- Full name
- National ID
- Primary verified phone number
- Secondary phone number
- Relationship to the student
- Account information

The primary parent selected during registration should be treated as the main contract party.

### Student

- Full name
- National ID
- Date of birth
- School name
- Grade
- Academic year
- Pickup address
- Drop-off address

---

## 4. Contract Information

Each contract should contain:

- Unique contract number
- Contract version number
- Contract creation date
- Academic year or service period
- Service start date
- Service end date
- Student information
- Parent or legal guardian information
- School information
- Pickup address
- Drop-off address
- Emergency contact information
- Service type
- Total service fee
- Selected payment method
- Prepayment amount
- Remaining balance
- Installment amounts
- Installment due dates
- General service terms
- Parent responsibilities
- Service provider responsibilities
- Cancellation conditions
- Contract status

---

## 5. Contract Number

Every contract must have a unique contract number.

A contract number may use a structured format such as:

```text
CTR-2026-000001
```

The contract number must remain unchanged across the lifecycle of the contract.

New contract versions should use the same main contract number with a version identifier.

Example:

```text
CTR-2026-000001-V1
CTR-2026-000001-V2
```

---

## 6. Payment Terms

The contract must clearly reflect the payment plan selected by the parent.

### 6.1 Full Payment

For full payment:

- The total approved service fee is paid in one payment.
- The admin defines the payment due date.
- The contract records the full amount and due date.
- The contract may become active after successful payment, based on the final activation rule.

### 6.2 Installment Payment

For installment payment:

- The parent pays a predefined prepayment.
- The remaining balance is divided into four monthly installments.
- Installment dates are calculated monthly from the prepayment date.
- Each installment is paid as one complete payment.
- A single installment cannot be divided into multiple partial payments.

Example:

```text
Total fee: 15,000
Prepayment: 5,000
Remaining balance: 10,000
Number of installments: 4
Each installment: 2,500
```

The real values must always come from the price entered and approved by the admin.

---

## 7. Installment Schedule Calculation

The installment schedule should be generated after the prepayment date is recorded.

Example:

```text
Prepayment date: 2026-08-01

Installment 1: 2026-09-01
Installment 2: 2026-10-01
Installment 3: 2026-11-01
Installment 4: 2026-12-01
```

Rules:

- Each installment date is one month after the previous due date.
- The system should handle months with different numbers of days.
- If the original day does not exist in a target month, the due date should use the final valid day of that month.
- Admin should be able to adjust due dates before contract acceptance.
- After contract acceptance, due-date changes require a new contract version when they materially change the agreement.

---

## 8. Contract Generation

The contract should be generated from a predefined contract template.

The system should automatically insert:

- Parent information
- Student information
- School information
- Enrollment information
- Pickup and drop-off addresses
- Service period
- Admin-approved price
- Selected payment method
- Prepayment amount
- Installment schedule
- Contract terms
- Contract number
- Contract version
- Creation date

The final contract should be generated as a PDF document.

---

## 9. Contract Template

The MVP should use one official predefined contract template.

The template should contain:

- Fixed legal and service terms
- Dynamic placeholders for parent and student data
- Dynamic pricing information
- Dynamic payment schedule
- Dynamic service dates
- Contract number and version
- Acceptance information

Only authorized admins should be able to replace or update the official contract template.

Updating the template should not modify previously generated or accepted contracts.

---

## 10. Contract Review Process

The recommended contract workflow is:

1. Parent submits an enrollment request.
2. Admin reviews and approves the enrollment.
3. Admin enters the final service price.
4. Parent selects the payment method.
5. Admin generates the contract.
6. Contract status becomes `Ready for Review`.
7. Admin sends the contract to the parent.
8. Contract status becomes `Awaiting Parent Acceptance`.
9. Parent reviews and accepts the contract.
10. The system records acceptance details.
11. Contract becomes `Accepted`.
12. Contract becomes `Active` according to the configured activation rule.

---

## 11. Parent Contract Acceptance

For the current MVP, the parent should accept the contract electronically.

The recommended acceptance process is:

1. Parent opens the contract.
2. Parent reviews the full contract.
3. Parent confirms an acceptance checkbox.
4. Parent enters an OTP sent to the primary verified phone number.
5. The system validates the OTP.
6. The system records the contract acceptance.

The acceptance checkbox should clearly state that the parent:

- Has reviewed the contract
- Accepts the contract terms
- Confirms the entered information
- Accepts the defined payment obligations

A handwritten signature or advanced digital signature is not required for the MVP.

---

## 12. Acceptance Records

When a contract is accepted, the system should store:

- Contract ID
- Contract version
- Parent account ID
- Parent full name
- Verified phone number
- Acceptance date and time
- OTP verification result
- Acceptance IP address, when available
- User agent or device information, when available
- Accepted PDF file reference
- Accepted contract data snapshot

The acceptance record must not be editable.

---

## 13. Contract Statuses

The recommended contract statuses are:

### Draft

The contract is being prepared and is visible only to the admin.

### Ready for Review

The contract has been generated and is ready for admin review.

### Awaiting Parent Acceptance

The contract has been sent to the parent and is waiting for acceptance.

### Accepted

The parent has accepted the contract successfully.

### Active

The contract is currently in effect.

### Completed

The service period has ended and all required contract actions have been completed.

### Cancelled

The contract has been cancelled by the admin.

### Expired

The contract was not accepted within its allowed acceptance period or is otherwise no longer valid.

---

## 14. Contract Activation

The recommended MVP rule is:

- The contract becomes `Accepted` immediately after successful parent acceptance.
- The contract becomes `Active` after the required prepayment or full payment has been completed.

For installment plans:

- Parent accepts the contract.
- Parent pays the prepayment.
- The contract becomes active after successful prepayment.

For full payment:

- Parent accepts the contract.
- Parent completes the full payment.
- The contract becomes active after successful payment.

Admin may manually activate a contract when necessary.

---

## 15. Contract Editing Rules

### Before Parent Acceptance

The admin may:

- Correct parent information
- Correct student information
- Update service dates
- Change the total price
- Change the payment plan
- Adjust installment due dates
- Update pickup or drop-off information
- Regenerate the contract

### After Parent Acceptance

The accepted contract must not be edited directly.

When a meaningful change is required:

- A new contract version must be created.
- The old accepted version must remain stored.
- The new version must be reviewed.
- Parent acceptance may be required again.
- Only one version can be active at a time.

Minor profile changes must not silently modify the accepted contract.

---

## 16. Contract Versioning

Every contract should have a version number.

Example:

```text
Version 1
Version 2
Version 3
```

A new version should be created when changing:

- Total price
- Payment method
- Prepayment amount
- Installment amounts
- Installment due dates
- Service period
- Pickup or drop-off address
- Important parent or student information
- Contract terms

Versioning rules:

- Previous versions must never be deleted.
- Accepted versions must remain immutable.
- Each version must have its own generated PDF.
- Each version must store its creation date.
- Each version must store its acceptance status.
- Only one version can be marked as the current active version.
- A superseded version should remain visible in contract history.

---

## 17. Contract Expiration

A contract may expire when:

- The parent does not accept it within the allowed period.
- The service period has passed before activation.
- The admin replaces it with a newer version.
- The admin manually marks it as expired.

The system should store:

- Expiration date
- Expiration reason
- Contract version
- Admin responsible for the action, when applicable

---

## 18. Contract Cancellation

For the MVP, contract cancellation is controlled by the admin.

The admin must provide:

- Cancellation reason
- Cancellation date
- Internal note, when needed

Cancellation rules:

- A cancelled contract remains stored.
- Its PDF remains available.
- Its acceptance information remains available.
- Payment records are not deleted.
- Refund or financial decisions are handled manually by the admin according to business policy.
- Cancellation does not automatically create a refund.

---

## 19. Parent Panel Requirements

The parent should be able to:

- View contracts for each student
- View contract status
- Open the current contract
- Download the contract PDF
- Review payment terms
- View prepayment information
- View installment amounts
- View installment due dates
- Accept a pending contract
- View acceptance status
- View the active contract
- View previous contract versions
- View cancellation or expiration information

Each student should have a separate contract section in the parent panel.

---

## 20. Admin Panel Requirements

The admin should be able to:

- View approved enrollments without contracts
- Create a contract
- Review contract data
- Enter or confirm the total price
- Confirm the payment plan
- Set the service period
- Adjust installment dates before acceptance
- Generate the contract PDF
- Preview the contract
- Send the contract to the parent
- View parent acceptance information
- Activate the contract
- Generate a new contract version
- Cancel a contract
- Expire a contract
- Download contract PDFs
- View contract history
- Filter contracts by status, student, parent, school, or date

---

## 21. Contract Notifications

Basic notifications should be sent when:

- A contract is ready for parent review.
- A contract is awaiting acceptance.
- A contract has been accepted.
- A contract has become active.
- A new contract version has been created.
- A contract is close to expiration.
- A contract has expired.
- A contract has been cancelled.
- A payment related to the contract is due.
- A payment related to the contract is overdue.

Notifications may be delivered through:

- SMS
- Parent dashboard notifications

Email notifications may be added later if required.

---

## 22. Contract and Enrollment Relationship

Each contract belongs to:

- One family account
- One primary parent or legal guardian
- One student
- One approved enrollment request
- One academic year or service period

A family with multiple students must have separate contracts for each student.

An enrollment should not have more than one active contract at the same time.

---

## 23. Contract and Payment Relationship

The contract defines the payment obligations.

The payment system should connect the contract to:

- Total fee
- Prepayment
- Installment plan
- Installment due dates
- Payment records
- Remaining balance
- Overdue amounts
- Payment status

Payment activity must not modify the original accepted contract text.

Payment records only indicate whether the contract obligations have been fulfilled.

---

## 24. Data Model Overview

The Contract System may include the following main entities:

### Contract

Stores the main contract identity and lifecycle.

Suggested fields:

- `id`
- `contract_number`
- `family_id`
- `parent_id`
- `student_id`
- `enrollment_id`
- `current_version_id`
- `status`
- `service_start_date`
- `service_end_date`
- `activated_at`
- `completed_at`
- `cancelled_at`
- `cancellation_reason`
- `expired_at`
- `expiration_reason`
- `created_at`
- `updated_at`

### Contract Version

Stores each generated version.

Suggested fields:

- `id`
- `contract_id`
- `version_number`
- `status`
- `total_fee`
- `payment_method`
- `prepayment_amount`
- `remaining_amount`
- `installment_count`
- `contract_data_snapshot`
- `template_version`
- `pdf_file_reference`
- `created_by_admin_id`
- `created_at`

### Contract Acceptance

Stores parent acceptance information.

Suggested fields:

- `id`
- `contract_version_id`
- `parent_id`
- `verified_phone_number`
- `accepted_at`
- `otp_verified`
- `ip_address`
- `user_agent`
- `acceptance_text`
- `created_at`

### Contract Installment

Stores contract payment obligations.

Suggested fields:

- `id`
- `contract_version_id`
- `installment_number`
- `amount`
- `due_date`
- `status`
- `payment_id`
- `paid_at`
- `created_at`

---

## 25. Security and Access Rules

- Parents can only access contracts belonging to their own family account.
- Parents can only accept contracts assigned to them.
- Admins can create, generate, send, cancel, and version contracts.
- Accepted contract versions must be immutable.
- Contract PDFs must not be publicly accessible.
- Contract downloads must require authorization.
- OTP verification must use the primary verified phone number.
- All important admin actions should be logged.
- Acceptance records must not be editable or removable through normal application operations.

---

## 26. Audit Logging

The system should log important contract actions, including:

- Contract creation
- Contract generation
- Contract preview
- Contract sent to parent
- Contract acceptance
- Contract activation
- Contract version creation
- Contract cancellation
- Contract expiration
- Contract PDF download by admin
- Manual status changes

Each log entry should include:

- Action
- Contract ID
- Contract version ID, when applicable
- User or admin ID
- Date and time
- Previous value, when applicable
- New value, when applicable
- Reason or note, when applicable

---

## 27. Validation Rules

- A contract cannot be generated for an unapproved enrollment.
- A contract cannot be generated without a confirmed total price.
- A contract cannot be sent without a generated PDF.
- A parent cannot accept a draft contract.
- A parent cannot accept an expired or cancelled contract.
- An accepted contract cannot be edited.
- A cancelled contract cannot become active.
- Only one active contract version is allowed.
- Installment totals plus prepayment must equal the total contract fee.
- Installment dates must follow the configured monthly schedule.
- A contract cannot become active before the required initial payment unless manually overridden by an admin.

---

## 28. Error Handling

The system should display clear errors when:

- Contract generation fails
- PDF generation fails
- Required data is missing
- OTP verification fails
- The contract has already been accepted
- The contract version is outdated
- The contract has expired
- The contract has been cancelled
- Payment information does not match the contract
- A parent attempts to access another family's contract

Failed contract generation must not create a partially valid contract version.

---

## 29. MVP Scope

The current MVP includes:

- One contract per student and approved enrollment
- Admin-controlled contract creation
- Admin-defined service price
- Full-payment and installment-payment terms
- Four monthly installments after prepayment
- PDF contract generation
- Parent contract review
- Checkbox and OTP acceptance
- Contract acceptance records
- Contract activation after required initial payment
- Contract statuses
- Contract versioning
- Admin-controlled cancellation
- Parent and admin contract panels
- Basic SMS and dashboard notifications
- Contract and payment relationships
- Secure contract storage and access

---

## 30. Out of Scope for the Current MVP

The following are not required for the current MVP:

- Handwritten electronic signatures
- Certificate-based digital signatures
- Third-party legal signing platforms
- Biometric signatures
- Contract negotiation inside the platform
- Parent-uploaded legal documents
- Automated refund calculation
- Advanced legal workflow automation
- Multi-party signing
- School-side contract approval
- Public contract verification pages
- Blockchain-based contract verification

---

## 31. Final MVP Decisions

The Contract System will use the following rules:

- One contract is created for each student.
- A contract is connected to one approved enrollment.
- Contract creation is initiated by an admin.
- The admin defines and confirms the service price.
- The contract supports full payment or installment payment.
- Installment plans use a prepayment followed by four monthly installments.
- Each installment must be paid as one complete amount.
- The contract is generated as a PDF.
- The parent accepts the contract using a checkbox and OTP.
- No advanced digital signature is required.
- The contract becomes active after full payment or required prepayment.
- Accepted contracts cannot be edited.
- Important changes create a new contract version.
- Previous versions remain stored.
- Contract cancellation is controlled by the admin.
- Refund and cancellation financial decisions are handled manually.
- Each student has a separate contract section in the parent panel.
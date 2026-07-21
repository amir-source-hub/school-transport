# School Transport Service  
# Database, Data Model, and Schema Specification

## 1. Purpose

This document defines the database architecture, data model, relationships, constraints, and recommended schemas for the current school transport service.

The current system supports:

- Shared family accounts
- Mother and father information
- Multiple students under one family
- Multiple family addresses
- School selection
- Student service registration
- Manual admin review and approval
- Manual pricing by administrators
- Contract generation and management
- Full payment or installment payment
- An additional prepayment before installments
- Four monthly installments
- Payment transaction records
- Basic notifications
- OTP verification of the selected primary parent phone number
- Controlled parent editing
- Administrative notes and audit logs

The current scope does not include:

- Automatic route assignment
- Vehicle capacity management
- Driver assignment
- Student attendance
- Registration document uploads
- Parent-uploaded documents

PostgreSQL is the recommended primary database.

---

## 2. Main Database Principles

The database should follow these rules:

- Use UUID primary keys.
- Use `created_at` and `updated_at` timestamps.
- Use foreign keys for all important relationships.
- Use unique constraints where duplication is not allowed.
- Store monetary values as integers.
- Never use floating-point types for prices or payments.
- Preserve financial and contract history.
- Use database transactions for payment-related operations.
- Avoid permanently deleting records with financial, contract, or registration history.
- Use status fields for deactivation and cancellation.
- Store snapshots for contractual records that must not change later.
- Record important administrative actions in audit logs.
- Never store passwords, OTP codes, or payment secrets in plain text.

---

# 3. Main Entity Structure

```text
Family Account
├── Parent Profiles
├── Family Addresses
├── Emergency Contacts
├── Students
│   └── Service Registrations
│       ├── Registration Reviews
│       ├── Registration Snapshots
│       ├── Pricing Offers
│       ├── Contract
│       └── Payment Plan
│           ├── Prepayment
│           ├── Four Installments
│           └── Payment Transactions
└── Notifications

Schools
└── Students

Admin Users
├── Review Registrations
├── Set or Revise Prices
├── Generate Contracts
├── Approve or Reject Registrations
├── Record Payments
└── Create Notes and Warnings
```

---

# 4. Authentication and Family Accounts

## 4.1 `users`

Each family has one shared account.

```text
users
-----
id
username
password_hash
account_status
last_login_at
created_at
updated_at
```

Recommended `account_status` values:

```text
ACTIVE
SUSPENDED
DISABLED
```

### Rules

- Each family uses one shared username and password.
- The username must be unique.
- The password must only be stored as a secure hash.
- One account may contain multiple students.
- Family accounts must not be permanently deleted when registrations, contracts, or payments exist.
- Suspended accounts keep their data and history.

### Constraints

```text
UNIQUE(username)
```

---

# 5. Parent Profiles

## 5.1 `parents`

Mother and father information is stored separately from the shared login account.

```text
parents
-------
id
user_id
parent_type
first_name
last_name
national_id
phone_number
is_primary_contact
phone_verified_at
created_at
updated_at
```

Recommended `parent_type` values:

```text
MOTHER
FATHER
```

### Rules

- Each family normally has one mother record and one father record.
- Both parent phone numbers are required.
- Both parent national ID codes are required.
- One parent must be selected as the primary contact.
- The primary contact phone number must be verified through OTP.
- The other parent phone number is used as an alternative contact.
- National ID codes must be stored as strings.
- Parent national ID codes should be unique across the system.
- Only one parent per family may be marked as primary.

### Constraints

```text
UNIQUE(user_id, parent_type)
UNIQUE(national_id)
```

A partial unique index should ensure that only one parent is marked as primary for each family.

Example:

```sql
CREATE UNIQUE INDEX one_primary_parent_per_user
ON parents(user_id)
WHERE is_primary_contact = true;
```

---

# 6. Family Addresses

A family may have multiple saved addresses.

## 6.1 `family_addresses`

```text
family_addresses
----------------
id
user_id
title
province
city
district
street_address
postal_code
additional_details
is_active
created_at
updated_at
```

Example address titles:

```text
HOME
MOTHER_HOME
FATHER_HOME
RELATIVE_HOME
OTHER
```

### Rules

- A family may save multiple addresses.
- Addresses are entered manually in the current scope.
- Parents may create, edit, or deactivate their saved addresses.
- An address cannot be permanently removed if it is referenced by a registration or contract.
- Before the contract is generated, one address must be selected for the registration.
- The selected address becomes the official service address for that contract.
- Later changes to the family address must not automatically change an existing contract.

---

# 7. Emergency Contacts

## 7.1 `emergency_contacts`

```text
emergency_contacts
------------------
id
user_id
first_name
last_name
relationship
phone_number
secondary_phone_number
is_active
created_at
updated_at
```

### Rules

- At least one emergency contact is required.
- The emergency contact must not be the mother or father.
- The primary emergency phone number must differ from both parent phone numbers.
- Multiple emergency contacts may be supported, but one active contact is sufficient for the current MVP.
- An emergency contact may be deactivated rather than permanently deleted.

---

# 8. Schools

## 8.1 `schools`

Schools are managed by administrators.

```text
schools
-------
id
name
school_type
gender_type
province
city
district
address
phone_number
is_active
created_at
updated_at
```

Possible `school_type` values:

```text
PUBLIC
PRIVATE
OTHER
```

Possible `gender_type` values:

```text
BOYS
GIRLS
MIXED
```

### Rules

- Parents select from active schools.
- Parents cannot create or edit school records.
- Schools referenced by students must not be permanently deleted.
- Administrators can deactivate schools that are no longer available.
- Changing a student's school after registration requires administrative handling.

---

# 9. Students

## 9.1 `students`

```text
students
--------
id
user_id
school_id
first_name
last_name
national_id
birth_date
gender
grade
class_name
student_code
is_active
created_at
updated_at
```

### Rules

- One family may register multiple students.
- Each student belongs to one family account.
- Each student belongs to one school.
- Student national ID must be unique.
- National ID must be stored as a string.
- Parents may edit simple information such as name or class where permitted.
- Parents cannot freely change the school or protected registration information.
- Students should normally be deactivated instead of permanently deleted.

### Constraints

```text
UNIQUE(national_id)
```

---

# 10. Service Registrations

Student records and service registrations must remain separate.

A student represents the child.  
A registration represents a request for transport service for a specific academic year.

## 10.1 `service_registrations`

```text
service_registrations
---------------------
id
student_id
academic_year
service_type
selected_address_id
requested_start_date
registration_status
submission_number
submitted_at
reviewed_at
reviewed_by_admin_id
rejection_reason
parent_notes
admin_notes
created_at
updated_at
```

Possible `service_type` values:

```text
ROUND_TRIP
PICKUP_ONLY
DROPOFF_ONLY
```

Possible `registration_status` values:

```text
DRAFT
SUBMITTED
UNDER_REVIEW
APPROVED
REJECTED
CANCELLED
CONTRACT_PENDING
CONTRACT_READY
```

### Recommended Workflow

```text
DRAFT
  ↓
SUBMITTED
  ↓
UNDER_REVIEW
  ├── APPROVED
  │     ↓
  │  CONTRACT_PENDING
  │     ↓
  │  CONTRACT_READY
  └── REJECTED
```

### Resubmission Rule

When a registration is rejected:

- The family may submit a new registration.
- The rejected registration remains unchanged for history.
- A new registration row is created.
- The new row may reference the previous registration.
- Each submission receives a new `submission_number`.

To support this, the table may also contain:

```text
previous_registration_id
```

### Important Rules

- Multiple submissions may exist for the same student and academic year.
- Only one registration may be active or approved for the same student and academic year.
- Rejected and cancelled registrations remain stored.
- The selected address is required before contract generation.
- The registration should preserve the administrator who reviewed it.
- Approval does not mean the payment has been completed.

### Recommended Partial Uniqueness

A partial unique index should prevent multiple active registrations for the same student and academic year.

Example active statuses:

```text
SUBMITTED
UNDER_REVIEW
APPROVED
CONTRACT_PENDING
CONTRACT_READY
```

---

# 11. Registration Snapshots

Important information must be preserved exactly as it existed when the registration was submitted or the contract was generated.

## 11.1 `registration_snapshots`

```text
registration_snapshots
----------------------
id
registration_id
snapshot_type
student_data
parent_data
selected_address_data
emergency_contact_data
created_at
```

Possible `snapshot_type` values:

```text
SUBMISSION
CONTRACT
```

The data fields may use PostgreSQL `JSONB`.

### Purpose

Snapshots preserve:

- Student information at submission time
- Parent information at submission time
- Selected address
- Emergency contact information
- Contract-time information

A later profile change must not alter old registration or contract records.

---

# 12. Admin Users

## 12.1 `admin_users`

```text
admin_users
-----------
id
username
password_hash
first_name
last_name
email
phone_number
status
last_login_at
created_at
updated_at
```

Possible `status` values:

```text
ACTIVE
SUSPENDED
DISABLED
```

### Rules

- Admin accounts are separate from family accounts.
- Administrators may review registrations.
- Administrators may approve or reject registrations.
- Administrators may create and revise price offers.
- Administrators may generate contracts.
- Administrators may manage payment records and warnings.
- Important admin actions must be audited.

---

# 13. Pricing Offers

The administrator manually sets the transport price after reviewing a registration.

## 13.1 `registration_prices`

```text
registration_prices
-------------------
id
registration_id
version_number
total_amount
currency
full_payment_allowed
installment_payment_allowed
prepayment_amount
installment_count
price_status
set_by_admin_id
set_at
parent_confirmed_at
replaced_by_price_id
created_at
updated_at
```

Possible `price_status` values:

```text
DRAFT
OFFERED
ACCEPTED
REPLACED
CANCELLED
```

### Rules

- Prices are entered manually by administrators.
- Administrators may revise a price before the parent accepts it.
- A revised price creates a new version.
- The previous price is marked as `REPLACED`.
- Accepted prices must not be silently edited.
- After acceptance, any correction requires a new version and explicit administrative handling.
- Monetary values are stored as integers.
- Currency should be stored explicitly.
- The system may support full payment, installment payment, or both.

### Constraints

```text
total_amount > 0
prepayment_amount >= 0
installment_count = 4 for installment plans
UNIQUE(registration_id, version_number)
```

---

# 14. Payment Plans

The payment plan is created after the parent accepts the price and chooses the payment method.

## 14.1 `payment_plans`

```text
payment_plans
-------------
id
registration_price_id
plan_type
total_amount
prepayment_amount
remaining_installment_amount
installment_count
plan_status
activated_at
completed_at
created_at
updated_at
```

Possible `plan_type` values:

```text
FULL
PREPAYMENT_PLUS_FOUR_INSTALLMENTS
```

Possible `plan_status` values:

```text
PENDING
ACTIVE
COMPLETED
OVERDUE
CANCELLED
```

### Confirmed Installment Structure

The prepayment is additional.

Therefore, the installment plan contains:

```text
1 separate prepayment
+
4 monthly installments
```

This creates five payable schedule items:

```text
Prepayment
Installment 1
Installment 2
Installment 3
Installment 4
```

### Rules

- The prepayment must be paid before the installment schedule becomes fully active.
- The remaining balance is divided across four monthly installments.
- Rounding differences should be applied to the final installment.
- Only one active payment plan should exist for an accepted price.
- The payment plan must reference the exact accepted price version.

---

# 15. Payment Schedule Items

A unified schedule table is clearer than separating prepayment and installments.

## 15.1 `payment_schedule_items`

```text
payment_schedule_items
----------------------
id
payment_plan_id
item_type
sequence_number
amount
due_date
item_status
paid_amount
paid_at
created_at
updated_at
```

Possible `item_type` values:

```text
PREPAYMENT
INSTALLMENT
```

Possible `item_status` values:

```text
PENDING
PAID
OVERDUE
CANCELLED
```

### Rules

- Exactly one prepayment item exists for an installment plan.
- Exactly four installment items exist for an installment plan.
- Installments cannot be split into multiple partial payments.
- A parent must pay the full amount of each scheduled item at once.
- `paid_amount` must be either zero or equal to the scheduled amount.
- Partial payment is not supported.
- One successful payment completes one schedule item.
- Failed payment attempts do not change the item to paid.

### Constraints

```text
amount > 0
sequence_number >= 0
UNIQUE(payment_plan_id, item_type, sequence_number)
```

For the prepayment:

```text
item_type = PREPAYMENT
sequence_number = 0
```

For installments:

```text
item_type = INSTALLMENT
sequence_number BETWEEN 1 AND 4
```

---

# 16. Payment Transactions

A schedule item is an amount due.  
A payment transaction is a real payment attempt.

A schedule item may have multiple failed attempts but only one successful payment.

## 16.1 `payment_transactions`

```text
payment_transactions
--------------------
id
payment_plan_id
payment_schedule_item_id
user_id
amount
payment_method
gateway_name
gateway_authority
gateway_transaction_id
idempotency_key
transaction_status
requested_at
verified_at
failure_code
failure_message
recorded_by_admin_id
created_at
updated_at
```

Possible `payment_method` values:

```text
ONLINE_GATEWAY
MANUAL_ADMIN_ENTRY
```

Possible `transaction_status` values:

```text
CREATED
REDIRECTED
PENDING_VERIFICATION
SUCCEEDED
FAILED
CANCELLED
EXPIRED
```

### Rules

- The transaction amount must equal the full schedule item amount.
- Partial payments are rejected.
- A successful schedule item cannot be paid again.
- A browser redirect is not sufficient proof of payment.
- Online payments must be verified with the payment gateway.
- Repeated callbacks must not create duplicate successful transactions.
- Closing the browser or pressing Back must not invalidate a verified payment.
- Failed attempts remain stored.
- Manual payments entered by administrators must record the responsible administrator.
- Updating the payment transaction and schedule item must happen in one database transaction.

### Constraints

```text
UNIQUE(idempotency_key)
UNIQUE(gateway_transaction_id)
```

The gateway transaction ID may be nullable before gateway verification.

A partial unique index should ensure that only one successful transaction exists for each schedule item.

Example:

```sql
CREATE UNIQUE INDEX one_successful_payment_per_schedule_item
ON payment_transactions(payment_schedule_item_id)
WHERE transaction_status = 'SUCCEEDED';
```

---

# 17. Contracts

The only document currently required is the service contract generated by the system.

Parents do not upload registration documents.

## 17.1 `contracts`

```text
contracts
---------
id
registration_id
registration_price_id
payment_plan_id
contract_number
contract_status
selected_address_id
contract_data_snapshot
file_storage_key
generated_by_admin_id
generated_at
accepted_at
signed_at
cancelled_at
created_at
updated_at
```

Possible `contract_status` values:

```text
DRAFT
GENERATED
READY_FOR_ACCEPTANCE
ACCEPTED
SIGNED
CANCELLED
EXPIRED
```

### Rules

- A contract is generated only after registration approval.
- A registration must have a selected address before contract generation.
- The contract references the accepted price version.
- The contract references the selected payment plan.
- Contract data must be stored as an immutable snapshot.
- The generated contract file is stored in file or object storage.
- PostgreSQL stores only the file reference and metadata.
- Later changes to parent, student, or address information must not modify the existing contract.
- A revised contract should create a new contract version rather than overwrite the old contract.

Optional versioning fields:

```text
version_number
replaced_by_contract_id
```

### Constraints

```text
UNIQUE(contract_number)
UNIQUE(registration_id, version_number)
```

---

# 18. Notifications

## 18.1 `notifications`

```text
notifications
-------------
id
user_id
notification_type
channel
title
message
related_entity_type
related_entity_id
notification_status
scheduled_at
sent_at
failure_reason
created_at
updated_at
```

Possible `channel` values:

```text
SMS
IN_APP
EMAIL
```

Possible `notification_type` values:

```text
REGISTRATION_SUBMITTED
REGISTRATION_APPROVED
REGISTRATION_REJECTED
PRICE_ASSIGNED
PRICE_REVISED
CONTRACT_READY
PAYMENT_SUCCESSFUL
PAYMENT_FAILED
PREPAYMENT_DUE
INSTALLMENT_DUE
INSTALLMENT_OVERDUE
ADMIN_WARNING
```

Possible `notification_status` values:

```text
PENDING
SENT
FAILED
CANCELLED
```

### Rules

- The selected primary parent phone number is used first.
- The alternative parent phone may be used when necessary.
- Registration, pricing, contract, payment, due-date, and warning notifications are supported.
- Failed notification attempts should remain recorded.

---

# 19. OTP Verification

## 19.1 `otp_requests`

```text
otp_requests
------------
id
phone_number
purpose
code_hash
expires_at
attempt_count
max_attempts
verified_at
created_at
```

Possible `purpose` values:

```text
PRIMARY_PHONE_VERIFICATION
PHONE_CHANGE
PASSWORD_RECOVERY
```

### Rules

- OTP codes must never be stored in plain text.
- OTP codes must expire.
- Verification attempts must be limited.
- Resending must be rate-limited.
- Verified codes cannot be reused.
- Successful verification updates `parents.phone_verified_at`.

---

# 20. Registration Reviews

A separate review table preserves review history across resubmissions and repeated admin reviews.

## 20.1 `registration_reviews`

```text
registration_reviews
--------------------
id
registration_id
admin_id
review_action
review_status
comment
created_at
```

Possible `review_action` values:

```text
START_REVIEW
REQUEST_CORRECTION
APPROVE
REJECT
REOPEN
```

### Rules

- Every approval or rejection is recorded.
- Rejection reasons must be preserved.
- A later resubmission creates a new registration and new review history.
- Review history must not be overwritten.

---

# 21. Registration Notes and Warnings

## 21.1 `registration_notes`

```text
registration_notes
------------------
id
registration_id
admin_id
note_type
content
is_visible_to_parent
created_at
```

Possible `note_type` values:

```text
INTERNAL_NOTE
PARENT_WARNING
REVIEW_NOTE
PAYMENT_NOTE
CONTRACT_NOTE
```

### Rules

- Internal notes are visible only to administrators.
- Parent warnings may be shown in the family panel.
- Notes remain attached to the related registration.
- Important warnings may trigger a notification.

---

# 22. Audit Logs

## 22.1 `audit_logs`

```text
audit_logs
----------
id
actor_type
actor_id
action
entity_type
entity_id
previous_values
new_values
ip_address
created_at
```

Possible actions:

```text
REGISTRATION_SUBMITTED
REGISTRATION_APPROVED
REGISTRATION_REJECTED
REGISTRATION_RESUBMITTED
PRICE_CREATED
PRICE_REVISED
PRICE_ACCEPTED
CONTRACT_GENERATED
CONTRACT_ACCEPTED
PAYMENT_RECORDED
PAYMENT_VERIFIED
STUDENT_UPDATED
ADDRESS_SELECTED
ACCOUNT_SUSPENDED
```

### Rules

- Important administrative and financial actions must be audited.
- `previous_values` and `new_values` may use `JSONB`.
- Passwords, OTP values, tokens, and payment secrets must never appear in audit logs.
- Audit logs should not be editable through normal application workflows.

---

# 23. Final Recommended Table List

## Core Tables

```text
users
parents
family_addresses
emergency_contacts
schools
students
service_registrations
registration_snapshots
registration_reviews
admin_users
registration_prices
payment_plans
payment_schedule_items
payment_transactions
contracts
notifications
otp_requests
registration_notes
audit_logs
```

## Removed From Current Scope

```text
registration_documents
payment_allocations
route_assignments
vehicles
drivers
attendance
capacity_management
```

`payment_allocations` is unnecessary because each payment must fully pay exactly one prepayment or installment item.

---

# 24. Relationship Summary

```text
users
  1 ─── 2 parents
  1 ─── many family_addresses
  1 ─── many emergency_contacts
  1 ─── many students
  1 ─── many notifications

schools
  1 ─── many students

students
  1 ─── many service_registrations

service_registrations
  many ─── 1 selected family_address
  1 ─── many registration_snapshots
  1 ─── many registration_reviews
  1 ─── many registration_prices
  1 ─── many registration_notes
  1 ─── many contracts

registration_prices
  1 ─── 0..1 active payment_plan
  1 ─── many historical price versions

payment_plans
  1 ─── 5 payment_schedule_items for installment plans
  1 ─── many payment_transactions

payment_schedule_items
  1 ─── many payment attempts
  1 ─── maximum 1 successful payment

contracts
  many ─── 1 registration
  many ─── 1 accepted price
  many ─── 1 payment plan

admin_users
  1 ─── many registration reviews
  1 ─── many price versions
  1 ─── many contracts
  1 ─── many notes
  1 ─── many manual payment records
```

---

# 25. Important Constraints

## Unique Constraints

```text
users.username
parents.national_id
students.national_id
contracts.contract_number
payment_transactions.idempotency_key
payment_transactions.gateway_transaction_id
```

## Composite Constraints

```text
UNIQUE(user_id, parent_type)
UNIQUE(registration_id, version_number) on registration_prices
UNIQUE(registration_id, version_number) on contracts
UNIQUE(payment_plan_id, item_type, sequence_number)
```

## Check Constraints

```text
registration_prices.total_amount > 0
registration_prices.prepayment_amount >= 0
payment_schedule_items.amount > 0
payment_schedule_items.sequence_number >= 0
payment_transactions.amount > 0
otp_requests.attempt_count >= 0
```

## Business Constraints

The application and database must ensure that:

- Only one parent is selected as the primary contact.
- The primary parent phone is OTP verified.
- One family may have multiple addresses.
- One address is selected before contract generation.
- Rejected registrations remain stored.
- Families can create a new registration after rejection.
- Only one active registration exists per student and academic year.
- Administrators can revise prices before parent acceptance.
- Accepted price versions remain immutable.
- Installment plans contain one additional prepayment and four monthly installments.
- Each installment must be paid in full.
- Installments cannot be split.
- Only one successful transaction exists per schedule item.
- Successful transactions cannot be changed back to failed.
- Contract records preserve the accepted price, address, student, and parent information.
- Historical contracts and financial records are never silently overwritten.

---

# 26. Recommended Indexes

Indexes should be created for frequently searched fields.

```text
users.username
parents.phone_number
parents.national_id
students.national_id
students.user_id
students.school_id
service_registrations.student_id
service_registrations.registration_status
service_registrations.academic_year
registration_prices.registration_id
payment_plans.registration_price_id
payment_schedule_items.payment_plan_id
payment_schedule_items.due_date
payment_schedule_items.item_status
payment_transactions.payment_schedule_item_id
payment_transactions.transaction_status
contracts.registration_id
contracts.contract_number
notifications.user_id
notifications.notification_status
audit_logs.entity_type
audit_logs.entity_id
```

---

# 27. Transaction Requirements

Database transactions are mandatory for sensitive operations.

## Payment Verification Transaction

A successful payment verification should atomically:

1. Lock the related schedule item.
2. Confirm that it is not already paid.
3. Verify that the transaction amount matches the full scheduled amount.
4. Mark the payment transaction as successful.
5. Mark the schedule item as paid.
6. Update the payment plan if all items are paid.
7. Record an audit event.
8. Create the payment notification.

If any step fails, the entire transaction must roll back.

## Price Acceptance Transaction

Price acceptance should atomically:

1. Confirm that the offered price is still active.
2. Mark the selected price as accepted.
3. Prevent acceptance of replaced price versions.
4. Create the selected payment plan.
5. Create the prepayment and installment schedule.
6. Record the action in the audit log.

## Contract Generation Transaction

Contract generation should atomically:

1. Confirm registration approval.
2. Confirm a selected address.
3. Confirm an accepted price.
4. Confirm the selected payment plan.
5. Create the contract snapshot.
6. Generate or register the contract number.
7. Store the contract metadata.
8. Update the registration status.
9. Record the audit event.

---

# 28. Final Confirmed Decisions

The final data model uses the following confirmed business decisions:

1. The prepayment is additional to the four monthly installments.
2. A rejected registration remains stored, and the family may submit a new registration.
3. A family may have multiple saved addresses.
4. One address must be selected before contract generation.
5. Each installment must be paid completely in one payment.
6. Partial or split installment payments are not allowed.
7. Registration document uploads are not required.
8. The only current document is the system-generated contract.
9. Administrators may revise pricing before parent acceptance.
10. Price revisions create new versions and preserve previous versions.
11. Accepted prices and generated contracts must not be silently edited.
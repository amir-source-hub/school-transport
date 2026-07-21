Enrollment Form Specification

1. Document Purpose

This document defines the complete enrollment form requirements for the School Transport Service MVP.

The enrollment form allows a family to submit a transport service request for one student. Each student must have a separate enrollment submission. A family may submit multiple enrollments for multiple children and may submit a new enrollment again when required.

Submitting an enrollment does not guarantee service acceptance. The administration must review the request, approve or reject it, enter the final price, confirm the payment method, and prepare the contract.

2. Enrollment Scope

The enrollment form covers:

Family and parent information

Student information

School information

Transport request details

Pickup and drop-off addresses

Emergency contact information

Basic health and safety information

Payment preference

Terms and confirmations

Review and final submission

Admin review and approval

The following are not included in the MVP:

Student photo upload

Pickup-only service

Drop-off-only service

Parent-entered schedules

Authorized pickup person management

Map-based address selection

Supporting document uploads

3. Enrollment Ownership

Each enrollment belongs to:

One family account

One student

One academic year

One selected school

One transport service request

A family account may contain multiple students.

Each student enrollment must remain separate so that the family can:

View the enrollment status

Review the student information

Receive pricing

Select or confirm payment

Complete the contract

Manage payments independently

4. Enrollment Statuses

The enrollment lifecycle should support the following statuses:

DRAFT

SUBMITTED

UNDER_REVIEW

MORE_INFORMATION_REQUIRED

APPROVED

REJECTED

PRICE_ASSIGNED

CONTRACT_PREPARATION

CONTRACTED

CANCELLED

EXPIRED

Status Rules

A newly created form starts as DRAFT.

A parent may edit a draft until submission.

After submission, the form becomes SUBMITTED.

The admin may move it to UNDER_REVIEW.

If corrections are required, the admin may set it to MORE_INFORMATION_REQUIRED.

Approved enrollments move to APPROVED.

After the admin enters the final price, the enrollment moves to PRICE_ASSIGNED.

After payment preference confirmation, it may move to CONTRACT_PREPARATION.

After the contract is completed, it becomes CONTRACTED.

Rejected enrollments remain available in history.

Cancelled enrollments must not be deleted.

Incomplete drafts expire after 30 days of inactivity.

5. Form Structure

The enrollment form should use a multi-step layout.

Recommended steps:

Student Information

School Information

Transport Information

Emergency and Safety Information

Payment Preference

Review and Confirmation

The interface should display:

Current step

Completed steps

Remaining steps

Validation errors

Draft save status

Last saved date and time

6. Family Information

The form should automatically load available family information from the logged-in family account.

Displayed information:

Father’s full name

Mother’s full name

Father’s phone number

Mother’s phone number

Selected primary parent

Primary phone number

Verification status of the primary phone number

Home address

Rules

Both parents’ phone numbers are required.

One parent must be selected as the primary contact.

The selected primary phone number must be OTP verified.

The family uses one shared username and password.

The form must not create another family account.

Basic parent information may be edited according to the system’s data-editing rules.

Changes to restricted information may require admin approval.

7. Student Information

Required fields:

First name

Last name

Iranian national ID code

Date of birth

Gender

Educational grade

Optional fields:

Additional student notes

Rules

Student photo is not included in the MVP.

The national ID code must pass Iranian national ID validation.

A family may register multiple students.

Each student must belong to the logged-in family.

Duplicate active enrollment for the same student, school, and academic year must be blocked or clearly warned.

Previous rejected, cancelled, or expired enrollments must not be overwritten.

Each submission must preserve its own history.

8. School Information

Required fields:

School

School branch, when applicable

Educational grade

Academic year

Optional fields:

Class name or class number

Rules

Schools must be selected from an admin-managed list.

Parents must not enter the school as free text.

The active academic year should be selected automatically.

The school cannot be changed directly by the parent after submission.

A school change after submission requires an admin request.

Schedule details are not collected from parents in the MVP.

9. Transport Service Information

The MVP supports only full round-trip service.

Required service type:

Full round trip

The form should not display pickup-only or drop-off-only options.

Required fields:

Requested service start date

Pickup address

Drop-off address

Same pickup and drop-off address checkbox

Optional fields:

Pickup instructions

Drop-off instructions

Additional transport notes

Address Rules

Addresses are entered manually.

Map selection is not required.

The family home address may be copied into pickup and drop-off fields.

Pickup and drop-off addresses may be different.

After submission, parents cannot directly change the addresses.

Any address change after submission requires an admin request.

The system should preserve the original address and the approved replacement in the change history.

10. Schedule Information

Parent-entered schedule information is not required in the MVP.

The form should not request:

School start time

School dismissal time

Required pickup days

Required drop-off days

Morning or afternoon shift

Scheduling and route assignment are handled manually by the administration outside the enrollment form for the current MVP.

11. Emergency Contact

An emergency contact is required.

Required fields:

Full name

Relationship to student

Primary phone number

Optional fields:

Secondary phone number

Address

Additional notes

Rules

The emergency contact cannot be the father.

The emergency contact cannot be the mother.

The emergency contact phone number must not match either parent’s phone number.

At least one valid Iranian mobile number is required.

The relationship to the student must be provided.

The emergency contact may be edited later according to the allowed data-editing rules.

12. Health and Safety Information

The MVP should collect only essential information and should not require medical documents.

Required yes/no questions:

Does the student have a medical condition?

Does the student have an allergy?

Does the student take essential medication?

Does the student require special assistance?

Conditional fields:

Medical condition details

Allergy details

Medication details

Special assistance details

Optional field:

Additional safety notes

Rules

No supporting medical documents are required.

Health and safety information must be treated as sensitive.

Only authorized administrators should have access.

Future operational roles may receive limited access only when necessary.

13. Authorized Pickup Persons

Structured authorized pickup person management is not included in the MVP.

The form should not collect:

Authorized pickup person lists

Multiple pickup-person profiles

Identity documents

Release permissions

Any special pickup instructions may be entered in the transport notes field.

14. Payment Preference

The parent must select one payment preference:

Full payment

Installment payment

The final price is not entered by the parent. The administration enters the final service fee after reviewing and approving the enrollment.

Full Payment

Under full payment:

The total assigned fee is paid in one payment.

The payment must be completed by one parent.

The payment cannot be split between parents.

Installment Payment

The installment model contains:

One prepayment

Four monthly installments

Example:

Total service fee: 15,000

Prepayment: 5,000

Remaining balance: 10,000

Number of installments: 4

Each installment: 2,500

Formula:

remaining_balance = total_fee - prepayment_amount
installment_amount = remaining_balance / 4

Installment Due Dates

The prepayment is paid first.

The first monthly installment is due one month after the prepayment date.

The next installments are due monthly from that date.

There are exactly four installments.

Each installment must be paid completely by one parent.

An individual installment cannot be split between multiple parents.

Different installments may be paid by different parents if the system records the payer, but each installment remains one complete payment.

The parent may select a preferred payment method during enrollment.

The final payment plan is confirmed before the contract.

The admin may define the total fee and prepayment amount.

The system calculates the remaining balance and four equal installments.

Payment Example Schedule

If the prepayment is paid on 10 September:

Prepayment: 10 September

Installment 1: 10 October

Installment 2: 10 November

Installment 3: 10 December

Installment 4: 10 January

If a target month does not contain the exact original day, the due date should be the final valid day of that month.

15. Terms and Confirmations

The parent must accept all required confirmations before submission.

Required checkboxes:

I confirm that the entered information is correct.

I confirm that both parents’ contact information is valid.

I confirm that the selected primary phone number is available and verified.

I understand that submission does not guarantee service acceptance.

I understand that the final price is determined by the administration.

I understand that the service is full round trip.

I understand that address or school changes after submission require an admin request.

I agree to the selected payment method and payment schedule after contract confirmation.

I agree to the school transport service terms.

The submit button must remain disabled until all required confirmations are accepted.

16. Draft Saving

The form must support automatic draft saving.

Save Triggers

The system should save the draft:

After completing a step

When moving to another step

When leaving a field after meaningful changes

Before the user leaves the enrollment form

When the user manually selects Save and Continue Later

Draft Rules

Drafts must not appear as submitted enrollments.

Drafts must not notify the admin.

Drafts must be visible to the parent in the dashboard.

The latest save date and time should be displayed.

A draft may be resumed from the last completed step.

Draft data should be validated before final submission.

Draft Expiration

A draft expires after 30 days of inactivity.

The family should receive a warning notification before expiration.

Recommended warning time: 3 days before expiration.

An expired draft becomes read-only or is archived.

Expired drafts must not be treated as active enrollment requests.

The parent may start a new enrollment after expiration.

17. Review Page

Before final submission, the parent must see a complete review page.

The review page should include:

Family information

Student information

School information

Academic year

Pickup address

Drop-off address

Transport instructions

Emergency contact

Health and safety information

Payment preference

Required confirmations

Each section should include an Edit action that returns the user to the corresponding step.

The final submission button should clearly state that submission sends the request to the administration.

18. Submission Process

When the parent submits the enrollment, the backend must:

Validate all required fields.

Validate the primary phone verification.

Validate the national ID code.

Validate the emergency contact.

Validate the selected school and academic year.

Validate pickup and drop-off addresses.

Check for duplicate active enrollments.

Validate payment preference.

Validate required confirmations.

Create a unique enrollment reference number.

Change the status from DRAFT to SUBMITTED.

Record the submission date and time.

Record the submitting family account.

Notify the parent.

Notify the admin.

Create an audit-history entry.

Suggested confirmation message:

Your enrollment request has been submitted successfully. The administration will review your information and notify you about approval, pricing, payment, and contract preparation.

19. Enrollment Reference Number

Every submitted enrollment must receive a unique reference number.

Recommended format:

ENR-{YEAR}-{SEQUENCE}

Example:

ENR-2026-000145

The reference number should appear in:

Submission confirmation

Parent dashboard

Admin dashboard

Notifications

Contract records

Payment records

Support communications

20. Editing After Submission

After submission, parents may edit only permitted basic information.

Potentially editable:

Parent contact details

Emergency contact

Simple student information

Additional notes

Restricted fields:

School

Academic year

Pickup address

Drop-off address

Service type

Admin-assigned price

Prepayment amount

Installment schedule

Contract information

Restricted Change Process

For restricted fields:

The parent submits an admin change request.

The request records the current value and requested value.

The admin approves or rejects the change.

Approved changes are applied.

The system records who approved the change and when.

The previous value remains available in the audit history.

21. Resubmission Rules

A family may submit another enrollment.

Rules:

One submission represents one student service request.

A family may create enrollments for multiple children.

A rejected enrollment may be submitted again.

A cancelled enrollment may be submitted again.

An expired draft may be recreated as a new enrollment.

Previous submissions must not be overwritten.

Each submission must retain its own reference number, status, dates, and history.

A duplicate active enrollment for the same student, school, and academic year must be blocked unless an admin explicitly allows it.

Active statuses for duplicate checking:

SUBMITTED

UNDER_REVIEW

MORE_INFORMATION_REQUIRED

APPROVED

PRICE_ASSIGNED

CONTRACT_PREPARATION

CONTRACTED

22. Validation Rules

Validation must be implemented on both frontend and backend.

General Validation

Required fields cannot be empty.

Text fields must enforce reasonable maximum lengths.

Phone numbers must use a valid Iranian mobile format.

Dates must be valid.

The service start date cannot be invalid or unreasonably old.

Required confirmations must be accepted.

Student Validation

First and last name are required.

Iranian national ID code must be valid.

Date of birth must be valid.

Educational grade must be selected.

Duplicate active enrollment must be checked.

Family Validation

Both parents’ phone numbers are required.

One primary parent must be selected.

The primary phone number must be OTP verified.

School Validation

School must exist and be active.

Academic year must be active.

Grade must be supported by the selected school when this information is configured.

Address Validation

Pickup address is required.

Drop-off address is required.

Addresses must meet minimum completeness requirements.

Address changes after submission require admin approval.

Emergency Contact Validation

Full name is required.

Relationship is required.

Primary phone number is required.

Emergency contact cannot match either parent.

Emergency phone must not match the parents’ phone numbers.

Payment Validation

A payment preference is required.

The parent can choose full payment or installments.

Installment payment must contain one prepayment and four installments.

The remaining balance must be divisible according to the currency precision rules.

The total of prepayment and installments must equal the total fee.

23. Admin Enrollment View

The admin enrollment page should display:

Enrollment reference number

Status

Submission date

Last update date

Family information

Primary contact parent

Primary verified phone

Student information

School information

Academic year

Pickup address

Drop-off address

Transport notes

Emergency contact

Health and safety information

Payment preference

Final assigned price

Prepayment amount

Remaining balance

Installment amount

Installment due dates

Internal admin notes

Change requests

Audit history

Admin Actions

The admin should be able to:

Review the enrollment

Move it to under review

Request more information

Approve it

Reject it

Enter the total service fee

Enter the prepayment amount

Confirm full payment or installment payment

Generate the four-installment schedule

Add internal notes

Review address or school change requests

Approve or reject requested changes

Move the enrollment to contract preparation

Mark the contract as completed

Cancel the enrollment when necessary

24. Pricing and Contract Rules

The parent does not determine the final price.

The administration enters the total service fee.

The administration enters the prepayment amount.

The system calculates the remaining balance.

Under installment payment, the remaining balance is divided into four equal monthly installments.

The parent must confirm one payment preference before contract completion.

Multiple payment options may be available, but only one active payment plan may be connected to the final contract.

The contract is generated and controlled by the administration.

Parents do not upload contract documents.

Payment obligations become final only after price confirmation and contract preparation.

25. Notifications

Basic notifications should be sent for:

Draft expiration warning

Successful enrollment submission

Enrollment received by administration

More information required

Enrollment approved

Enrollment rejected

Price assigned

Payment preference confirmation

Prepayment due

Prepayment received

Monthly installment due

Payment overdue warning

Contract ready

Contract completed

Requested change approved or rejected

Notifications should use the selected primary phone number first.

If the primary contact is unavailable, the system may use the other parent’s phone number according to the project’s notification rules.

26. Security and Audit Requirements

The enrollment system must:

Allow access only to the owning family and authorized admins.

Prevent one family from viewing another family’s enrollment.

Protect health and safety information.

Validate all submitted data on the backend.

Record important status changes.

Record admin approvals and rejections.

Record price changes.

Record payment-plan changes.

Record restricted field changes.

Preserve previous values in the audit history.

Store submission and modification timestamps.

Prevent silent modification of submitted enrollments.

27. Acceptance Criteria

The enrollment form is complete when:

A logged-in family can create a draft.

The family can register one student per enrollment.

Multiple children can be enrolled separately.

Student photos are not requested.

Only full round-trip service is available.

Parent-entered schedule fields are not displayed.

Authorized pickup persons are not included.

Both parents’ phone numbers are required.

The selected primary phone number is OTP verified.

An emergency contact other than the parents is required.

Pickup and drop-off addresses are collected manually.

Address changes after submission require an admin request.

The parent can select full payment or installment payment.

Installment payment uses one prepayment and four monthly installments.

The first installment is due one month after the prepayment date.

The total payment schedule equals the admin-assigned total fee.

Drafts are automatically saved.

Drafts expire after 30 days of inactivity.

The parent can review all information before submission.

Submitted enrollments receive a unique reference number.

The admin can review, approve, reject, price, and prepare the contract.

Duplicate active enrollments are prevented.

Notifications are sent for important enrollment, payment, and contract events.

All sensitive and important changes are recorded in audit history.
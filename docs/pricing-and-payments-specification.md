# Pricing and Payments Specification

## 1. Purpose

This document defines the pricing, payment-plan, installment, payment approval, receipt, notification, and financial record rules for the School Transport Service.

The pricing and payment system is designed for the current MVP while preserving clear records and supporting both online and offline payments.

---

## 2. Core Pricing Model

The service does not have a fixed public price during enrollment.

The final service price is determined manually by the admin after reviewing the student's enrollment request and service details.

### Standard Pricing Flow

1. The parent submits an enrollment request for a student.
2. The admin reviews the request.
3. The admin manually assigns the total service fee.
4. The parent is notified that the price has been assigned.
5. The parent selects a payment option:
   - Full payment
   - Installment payment
6. The contract is generated based on:
   - The selected student
   - The approved service request
   - The assigned total price
   - The selected payment plan
7. The contract is accepted and signed.
8. Payment begins according to the selected payment plan.

---

## 3. Pricing Period

The assigned price applies to the complete service period.

For the current system, the service period is:

- One full academic year
- One contract period
- One complete transportation service period

Each student has a separate yearly price and contract.

A price assigned to one student does not apply to another student, even when both students belong to the same family account.

---

## 4. Price Assignment

The admin manually enters the total service price after reviewing the enrollment request.

The assigned price must be connected to:

- Student
- Family account
- Enrollment request
- Academic year
- Service period
- Contract
- Payment plan

The system should not automatically calculate the service price in the MVP.

---

## 5. Price Changes Before Contract Acceptance

The admin may change the assigned price before the contract is accepted.

Examples include:

- Correcting an incorrect amount
- Applying a manually approved adjustment
- Updating the service scope
- Updating transportation conditions
- Correcting administrative mistakes

When the price is changed before contract acceptance:

- The latest approved price becomes the active price.
- The parent must see the updated price.
- Any previously generated unsigned contract must be invalidated or regenerated.
- The payment plan must be recalculated.
- The old price must remain in the price-change history.

---

## 6. Price Changes After Contract Acceptance

The price cannot be directly changed after the contract has been accepted and signed.

A price change after contract acceptance requires:

1. Cancelling or replacing the current contract according to admin procedures.
2. Creating a new price record.
3. Generating a new contract.
4. Receiving acceptance and signature for the new contract.
5. Creating a new or revised payment plan.

The original contract and its financial records must remain available in the system history.

The system must never silently overwrite the price of a signed contract.

---

## 7. Price Change History

The system must preserve a complete history of all price changes.

Each price history record should contain:

- Student
- Enrollment request
- Academic year
- Previous price
- New price
- Change reason
- Changed by
- Change date and time
- Contract status at the time of change
- Related old contract, if applicable
- Related new contract, if applicable

Price history records must not be deleted or edited directly.

---

## 8. Payment Options

The parent can choose one of the following payment options:

### 8.1 Full Payment

The complete service price is paid in one transaction.

### 8.2 Installment Payment

The total price is divided into:

- One mandatory prepayment
- Four monthly installments

The parent selects the payment option before the final contract is accepted.

If the payment option changes after contract acceptance, a new contract must be created and signed.

---

## 9. Supported Payment Methods

The system supports two payment methods:

### 9.1 Online Payment

The parent pays through the connected online payment gateway.

An online payment is considered successful only after:

- The payment gateway confirms the transaction.
- The system verifies the payment with the gateway.
- The verified amount matches the expected amount.
- The transaction has not already been processed.
- The payment record is successfully stored.

### 9.2 Offline Payment

The parent pays outside the online payment gateway.

Examples may include:

- Bank transfer
- Card-to-card payment
- Cash payment
- Payment at the service office

Offline payments require admin review and approval.

An offline payment is not considered successful immediately after the parent submits it.

---

## 10. Payment Method Selection

For each required payment, the parent chooses:

- Online payment
- Offline payment

The selected payment method applies to that specific payment transaction.

The parent may use different payment methods for different installments unless restricted manually by the admin.

Examples:

- Prepayment paid online
- First installment paid offline
- Second installment paid online

Each payment must still belong to one specific student, contract, and payment obligation.

---

## 11. Full Payment Rules

For full payment:

- The entire contract amount must be paid in one complete payment.
- Partial payments are not allowed under the full-payment option.
- No automatic discount is applied.
- The payment may be completed online or offline.
- Offline full payment requires admin approval.
- The contract balance becomes zero only after the payment is successfully verified or approved.
- The payment record cannot be directly edited after completion.

The service activation rule may depend on admin approval, but the financial status must show the actual payment state.

---

## 12. Installment Payment Structure

The standard installment plan contains:

- One mandatory prepayment
- Four monthly installments

### Example

For a total service fee of `15,000`:

- Total price: `15,000`
- Prepayment: `5,000`
- Remaining balance: `10,000`
- Number of installments: `4`
- Each installment: `2,500`

The system automatically calculates the installment amounts after the admin enters:

- Total price
- Prepayment amount

---

## 13. Installment Calculation

The installment calculation is:

```text
Remaining Balance = Total Price - Prepayment Amount

Monthly Installment = Remaining Balance / 4
```

If the remaining balance cannot be divided equally:

- The system should round the first three installments according to the supported currency rules.
- The final installment should contain the remaining amount.
- The sum of all installments and the prepayment must exactly equal the total contract price.

Example:

```text
Total Price = 15,003
Prepayment = 5,000
Remaining Balance = 10,003

Installment 1 = 2,500
Installment 2 = 2,500
Installment 3 = 2,500
Installment 4 = 2,503
```

The system must not create a rounding difference between the contract total and the payment schedule.

---

## 14. Prepayment Rules

The prepayment is mandatory for installment plans.

The prepayment:

- Is paid before the monthly installment schedule becomes active.
- May be paid online.
- May be submitted offline and approved by admin.
- Must be paid in full.
- Cannot be divided into multiple partial transactions.
- Determines the installment schedule start date.
- Must be linked to the relevant student and contract.

The installment plan becomes active only after the prepayment is successfully verified or approved.

---

## 15. Installment Due Dates

The first installment is due one month after the successful prepayment date.

Each following installment is due monthly on the same calendar day where possible.

### Example

If the prepayment is completed on September 10:

- Installment 1: October 10
- Installment 2: November 10
- Installment 3: December 10
- Installment 4: January 10

If the target month does not contain the same day number, the due date should use the final valid day of that month.

Example:

If the prepayment is completed on January 31:

- February installment: February 28 or 29
- March installment: March 31
- April installment: April 30
- May installment: May 31

---

## 16. Holidays and Due Dates

Holidays do not change installment due dates.

Because payments can be completed online:

- The due date remains unchanged when it falls on a holiday.
- The system does not automatically postpone the payment.
- The payment becomes overdue after the due date passes.
- Admin may manually change an unpaid due date when necessary.

---

## 17. Admin Due-Date Changes

The admin may change the due date of an unpaid installment.

When a due date is changed:

- The previous due date must remain in history.
- The new due date becomes active.
- The system should record the admin who made the change.
- A reason should be recorded.
- The parent should be notified.
- Later installment dates should not automatically change.

Paid installments cannot have their due dates edited.

---

## 18. Payment Amount Rules

Each payment obligation must be paid completely.

This includes:

- Full payment
- Prepayment
- Individual installments

The system does not allow:

- Partial installment payments
- Splitting one installment between multiple parents
- Splitting one installment into several payment transactions
- Paying more than the required amount
- Paying an amount different from the payment obligation

A failed payment attempt does not reduce the outstanding balance.

---

## 19. Online Payment Flow

### 19.1 Online Payment Initiation

1. The parent selects a payable item.
2. The system checks that the payment is still unpaid.
3. The system checks the expected amount.
4. The system creates a pending payment attempt.
5. The parent is redirected to the payment gateway.

### 19.2 Online Payment Return

After the gateway redirects the parent back:

1. The system receives the gateway response.
2. The system does not trust the redirect response alone.
3. The system verifies the transaction directly with the gateway.
4. The system checks:
   - Transaction identity
   - Payment amount
   - Payment status
   - Duplicate processing
   - Related contract and installment
5. The system marks the payment successful only after verification.
6. The system updates the payment plan balance.
7. The system generates a receipt.
8. The parent is notified.

### 19.3 Failed Online Payment

If verification fails:

- The payment remains unpaid.
- The payment attempt is marked failed.
- The balance is not changed.
- The parent may try again.
- The failure reason should be recorded when available.

---

## 20. Offline Payment Submission

When the parent chooses offline payment, the parent submits payment information for admin review.

The offline payment submission should include:

- Student
- Contract
- Related payment obligation
- Payment amount
- Payment date
- Payment method
- Transaction or reference number
- Payment description
- Optional receipt image or proof, when file uploads are introduced
- Submission date and time

For the current MVP, receipt image upload may remain optional or be excluded until document-upload support is introduced.

---

## 21. Offline Payment Status

An offline payment follows this status flow:

```text
Awaiting Submission
→ Submitted
→ Under Review
→ Approved
```

Possible rejection flow:

```text
Submitted
→ Under Review
→ Rejected
```

After rejection, the parent may submit a new offline payment request.

The payment remains financially unpaid until admin approval.

---

## 22. Manual Payment Confirmation

The admin can review submitted offline payments.

The admin review page should show:

- Parent
- Student
- Contract
- Payment type
- Expected amount
- Submitted amount
- Submission date
- Claimed payment date
- Payment method
- Reference number
- Parent note
- Current payment status
- Previous submissions for the same payment obligation

The admin can:

- Approve the payment
- Reject the payment
- Add an internal note
- Enter a rejection reason

---

## 23. Offline Payment Approval

When the admin approves an offline payment:

- The payment becomes successful.
- The payment obligation becomes paid.
- The paid amount is added to the contract payment total.
- The outstanding balance is reduced.
- The admin identity is recorded.
- The approval date and time are recorded.
- A receipt is generated.
- The parent is notified.
- The payment record becomes immutable.

For installment plans, approval of the prepayment activates the installment schedule.

---

## 24. Offline Payment Rejection

When an offline payment is rejected:

- The related payment obligation remains unpaid.
- The contract balance does not change.
- The rejection reason is stored.
- The parent is notified.
- The parent may submit a corrected offline payment request.
- The rejected submission remains in history.

The admin must not delete rejected submissions.

---

## 25. Payment Statuses

### 25.1 Payment Transaction Statuses

A payment transaction may have one of the following statuses:

- Pending
- Submitted
- Under Review
- Successful
- Failed
- Rejected
- Cancelled
- Reversed

### 25.2 Payment Obligation Statuses

A payment obligation may have one of the following statuses:

- Unpaid
- Pending Online Verification
- Pending Offline Approval
- Paid
- Overdue
- Cancelled
- Waived
- Reversed

### 25.3 Payment Plan Statuses

A payment plan may have one of the following statuses:

- Awaiting Prepayment
- Active
- Partially Paid
- Fully Paid
- Overdue
- Cancelled
- Replaced

---

## 26. Overdue Payments

A payment becomes overdue immediately after its due date passes while it remains unpaid.

For the MVP:

- There is no automatic grace period.
- There is no automatic late fee.
- There is no automatic penalty calculation.
- The service is not automatically suspended.
- The system displays warnings.
- The system sends payment reminders.
- The admin handles overdue cases manually.

An offline payment awaiting approval may still appear as pending review rather than successful.

The admin should be able to see whether the parent submitted payment before the due date, even if approval occurs later.

---

## 27. Payment Notifications

The system should send basic notifications for:

- Price assigned
- Price changed
- Contract ready
- Payment plan created
- Prepayment required
- Prepayment submitted offline
- Offline payment approved
- Offline payment rejected
- Online payment successful
- Online payment failed
- Upcoming installment
- Installment due today
- Installment overdue
- Due date changed
- Full contract amount paid
- Contract payment plan completed

Notifications may be sent through the currently supported notification channels.

---

## 28. Payment Reminders

Recommended installment reminders:

- Several days before the due date
- On the due date
- After the payment becomes overdue

The exact notification timing should be configurable later.

For the MVP, simple fixed reminder intervals are sufficient.

The system should avoid sending repeated success or overdue notifications unnecessarily.

---

## 29. Payment Receipts

A receipt should be generated after:

- A verified successful online payment
- An admin-approved offline payment

Each receipt should contain:

- Receipt number
- Parent name
- Student name
- Contract reference
- Academic year
- Total contract price
- Payment amount
- Payment type
- Payment method
- Payment date
- Approval or verification date
- Remaining balance
- Transaction reference
- Payment status

For offline payments, the receipt should also show that the payment was approved manually.

---

## 30. Multiple Students

Each student must have a separate:

- Price
- Contract
- Payment option
- Payment plan
- Prepayment
- Installment schedule
- Payment history
- Outstanding balance
- Receipt history

The parent can switch between students in the family panel.

The system must always clearly show which student and contract a payment belongs to.

Payments from one student's contract cannot be transferred automatically to another student's contract.

---

## 31. Admin Capabilities

The admin may:

- Assign the total price.
- Change the price before contract acceptance.
- Create a replacement contract when the price changes after signing.
- View price history.
- Configure the prepayment amount.
- Review the selected payment option.
- Review online payment results.
- Review offline payment submissions.
- Approve or reject offline payments.
- Change unpaid installment due dates.
- View overdue payments.
- Add internal financial notes.
- Create recorded adjustments.
- Cancel unpaid payment plans.
- View payment and modification history.

---

## 32. Admin Restrictions

The admin must not:

- Directly edit a successful transaction.
- Delete successful payment records.
- Delete rejected offline payment submissions.
- Replace the price of a signed contract without a new contract.
- Mark an offline payment successful without recording approval details.
- Change paid installment amounts.
- Silently change payment schedules without history.
- Apply one payment to multiple students or contracts.

---

## 33. Payment Corrections and Reversals

For the MVP:

- There is no automated refund process.
- Successful transactions cannot be edited directly.
- Incorrect financial records must be handled through a separate correction, adjustment, or reversal record.
- Only authorized admins may create a correction.
- Every correction must include a reason.
- The original payment record must remain unchanged.
- The correction must be linked to the original transaction.

If a correction changes the payable balance, the payment plan and outstanding balance must be recalculated without deleting prior history.

---

## 34. Cancellation of Payment Plans

An unpaid payment plan may be cancelled by the admin.

A partially paid plan should not be deleted.

When cancelling a partially paid plan:

- Existing successful payments remain recorded.
- The remaining obligations are cancelled or replaced.
- A reason is required.
- The related contract status must be reviewed.
- A replacement contract and payment plan may be created when necessary.

---

## 35. Financial Records

The system must preserve the following financial data:

- Original assigned price
- Current contract price
- Academic year
- Service period
- Price history
- Contract version
- Payment option
- Prepayment amount
- Installment count
- Installment amounts
- Original due dates
- Current due dates
- Paid amounts
- Outstanding balance
- Payment method
- Payment status
- Gateway transaction ID
- Gateway verification result
- Offline payment reference
- Offline submission details
- Admin approval details
- Receipt number
- Payment timestamps
- Adjustment records
- Reversal records
- Admin action history

---

## 36. Audit History

All important financial actions must be auditable.

The audit history should record:

- Action type
- Related student
- Related contract
- Related payment
- Previous value
- New value
- Performed by
- Date and time
- Reason
- Source of action

Important audited actions include:

- Price assignment
- Price changes
- Contract replacement
- Payment-plan creation
- Due-date changes
- Offline payment approval
- Offline payment rejection
- Payment cancellation
- Adjustment creation
- Reversal creation

---

## 37. Validation Rules

The system must validate that:

- The total price is greater than zero.
- The prepayment is greater than zero for installment plans.
- The prepayment is less than the total price.
- The installment amounts total the remaining balance.
- Full payment equals the total outstanding balance.
- A payment belongs to an active contract.
- A payment belongs to one specific student.
- A paid obligation cannot be paid again.
- An offline payment cannot become successful without admin approval.
- An online payment cannot become successful without gateway verification.
- The submitted amount matches the required amount.
- Duplicate gateway callbacks do not create duplicate payments.
- Duplicate offline approvals do not create duplicate payments.

---

## 38. Concurrency and Duplicate Protection

The system must prevent duplicate payments.

Before finalizing a payment, it should check:

- Current payment-obligation status
- Existing successful transaction
- Existing gateway reference
- Existing offline approval
- Expected amount
- Contract status

Only one successful payment may be connected to a single payment obligation.

Repeated gateway callbacks must return the existing result rather than creating another payment.

Repeated admin approval attempts must not create multiple successful transactions.

---

## 39. Parent Panel Requirements

The parent panel should show, per student:

- Total contract price
- Payment option
- Prepayment amount
- Installment schedule
- Paid amount
- Remaining balance
- Next due payment
- Overdue payments
- Payment history
- Payment method
- Offline payment submissions
- Approval or rejection status
- Receipts

The parent should be able to:

- Select a payable obligation.
- Choose online or offline payment.
- Pay online.
- Submit offline payment details.
- View payment status.
- View rejection reasons.
- Retry failed online payments.
- Resubmit rejected offline payments.
- Download or view receipts.

---

## 40. Admin Panel Requirements

The admin panel should provide:

- Enrollment requests awaiting pricing
- Price assignment form
- Price history
- Contract and price status
- Payment-plan details
- Online payment history
- Offline payments awaiting review
- Approved and rejected offline payments
- Upcoming installments
- Overdue installments
- Student financial summary
- Family financial summary
- Payment receipts
- Audit history

The admin should be able to filter records by:

- Student
- Parent
- Contract
- Academic year
- Payment method
- Payment status
- Due date
- Approval status

---

## 41. Recommended Data Entities

The pricing and payment module will likely require entities similar to:

- `prices`
- `price_history`
- `contracts`
- `contract_versions`
- `payment_plans`
- `payment_obligations`
- `payment_transactions`
- `online_payment_attempts`
- `offline_payment_submissions`
- `payment_receipts`
- `payment_adjustments`
- `payment_audit_logs`

Final entity names and relationships are defined in the Database and Data Model specification.

---

## 42. MVP Summary

The MVP pricing and payment system follows these core rules:

- The admin manually assigns the yearly service price.
- The price applies to one complete one-year service period.
- The admin may change the price before contract acceptance.
- A price change after contract acceptance requires a new signed contract.
- Every price change is preserved in history.
- Parents may choose full payment or installment payment.
- Installment plans contain one prepayment and four monthly installments.
- Due dates are based on the successful prepayment date.
- Holidays do not change due dates.
- Parents may pay online or submit an offline payment.
- Online payments require gateway verification.
- Offline payments require admin approval.
- Offline payments are not successful until approved.
- Partial and split payments are not allowed.
- Paid transactions cannot be edited directly.
- Overdue payments generate warnings but do not automatically suspend service.
- Each student has a separate contract, price, payment plan, balance, and payment history.
- All pricing and payment actions are recorded for audit purposes.
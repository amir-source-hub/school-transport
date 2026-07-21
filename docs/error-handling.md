# Error Handling

## 1. Overview

Error handling for the school transport service must be clear for users, safe for sensitive operations, and detailed enough for developers and administrators to diagnose problems.

The system must:

- Show understandable and actionable messages to parents and admins.
- Never expose stack traces, database errors, credentials, tokens, or sensitive technical details.
- Prevent duplicate registrations, payments, approvals, and contract actions.
- Preserve entered form data whenever possible.
- Log enough information to investigate failures.
- Handle validation, authorization, business-rule, database, payment, and external-service errors consistently.

---

## 2. Standard API Error Response

All backend errors should follow a consistent structure.

```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_ALREADY_COMPLETED",
    "message": "This installment has already been paid.",
    "field": null,
    "requestId": "req_abc123"
  }
}
```

### Recommended Fields

| Field | Description |
|---|---|
| `code` | Stable machine-readable error code |
| `message` | Safe user-facing message |
| `field` | Related form field, when applicable |
| `requestId` | Unique identifier used to trace the request in logs |
| `details` | Optional safe validation details |

Raw framework, database, or external-service error objects must never be returned directly to the frontend.

---

## 3. Error Categories

### 3.1 Validation Errors

Validation errors occur when submitted data is missing, malformed, or invalid.

Examples:

- Invalid national ID code.
- Invalid phone number.
- Missing parent information.
- Emergency contact is the same as one of the parents.
- Invalid student birth date.
- Missing required fields.
- Invalid payment amount.
- Invalid primary phone selection.

Recommended HTTP status:

```text
400 Bad Request
```

Example:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please correct the highlighted fields.",
    "details": {
      "fatherPhone": "Enter a valid phone number.",
      "nationalId": "Enter a valid national ID code."
    }
  }
}
```

### 3.2 Authentication Errors

Authentication errors include:

- Incorrect username or password.
- Expired session.
- Disabled account.
- Too many login attempts.
- Invalid or expired phone verification code.

Recommended HTTP statuses:

```text
401 Unauthorized
403 Forbidden
429 Too Many Requests
```

The login response must not reveal whether a username exists.

Recommended message:

```text
The username or password is incorrect.
```

### 3.3 Authorization Errors

Authorization errors occur when an authenticated user attempts an action they are not allowed to perform.

Examples:

- A parent attempts to access another family’s student.
- A parent attempts an admin-only action.
- A parent attempts to modify a locked field.
- A parent attempts to access another family’s contract or payment.
- An unauthorized admin attempts a restricted action.

Recommended HTTP status:

```text
403 Forbidden
```

### 3.4 Resource Not Found Errors

Examples:

- Student does not exist.
- Enrollment request cannot be found.
- Contract does not exist.
- Payment or installment does not exist.
- Requested notification does not exist.

Recommended HTTP status:

```text
404 Not Found
```

### 3.5 Conflict and Business-Rule Errors

These errors occur when a request is technically valid but violates a business rule or conflicts with the current record state.

Examples:

- A contract has already been accepted.
- A payment has already been completed.
- An enrollment has already been approved or rejected.
- A new price cannot be applied after contract acceptance.
- A locked field cannot be changed.
- An offline-payment request is already under review.
- A record was updated by another admin.

Recommended HTTP status:

```text
409 Conflict
```

### 3.6 Rate-Limit Errors

Rate limiting should be applied to:

- Login attempts.
- Phone verification requests.
- Verification-code checks.
- Repeated form submissions.
- Repeated payment-status requests.
- Suspicious automated requests.

Recommended HTTP status:

```text
429 Too Many Requests
```

### 3.7 Internal System Errors

Examples:

- Unexpected application exception.
- Database connectivity failure.
- Internal configuration error.
- Unhandled backend failure.
- Failed server-side processing.

Recommended HTTP status:

```text
500 Internal Server Error
```

User-facing message:

```text
Something went wrong. Please try again.
```

The detailed exception must only be recorded in server logs.

### 3.8 External-Service Errors

External-service failures may involve:

- Payment gateway.
- SMS provider.
- Email provider.
- File or object storage.
- Payment verification service.

Recommended HTTP statuses:

```text
502 Bad Gateway
503 Service Unavailable
504 Gateway Timeout
```

The user should receive a safe message explaining whether they should retry, wait for verification, or contact support.

---

## 4. Form Error Handling

All forms must use both client-side and server-side validation.

Client-side validation improves usability, but server-side validation remains mandatory because client validation can be bypassed.

Forms should:

- Display errors below the related field.
- Highlight invalid fields.
- Move focus to the first invalid field after submission.
- Preserve previously entered values.
- Avoid clearing the complete form after an error.
- Disable the submit button while the request is processing.
- Prevent repeated submissions.
- Display a general error summary when multiple fields are invalid.
- Use accessible error text and appropriate ARIA attributes.
- Re-enable the submit button if the request fails.

Example:

```text
National ID Code
[123456]

Enter a valid national ID code.
```

---

## 5. Enrollment Error Handling

The enrollment workflow must handle:

- Invalid parent information.
- Invalid student information.
- Duplicate student submission.
- Invalid primary phone selection.
- Failed primary-phone verification.
- Missing emergency contact.
- Emergency contact matching a parent.
- Network interruption.
- Submission timeout.
- Duplicate submit clicks.
- Previously processed enrollment requests.

The system should preserve form data after recoverable failures.

For long enrollment forms, temporary browser-side draft storage is recommended so users do not lose entered data after an accidental refresh or connection interruption.

A draft must not be treated as a submitted enrollment until the backend successfully accepts it.

---

## 6. Payment Error Handling

Payment operations require stricter protections because they affect financial records.

### 6.1 Validation Before Payment

Before redirecting a parent to the payment gateway, the backend must verify:

- The installment exists.
- The installment belongs to the selected student and family.
- The installment is unpaid.
- The related contract is active.
- The payment amount is correct.
- No valid pending payment already exists.
- The parent has access to the related student.
- The installment is not currently under offline-payment review.

### 6.2 Duplicate Payment Prevention

The system should use:

- Unique payment references.
- Idempotency keys.
- Database transactions.
- Unique constraints.
- Server-side payment-status checks.
- Atomic payment-state updates.

Repeated clicks or repeated requests must not create multiple payable transactions for the same installment.

### 6.3 Payment Gateway Return

Returning from the gateway does not automatically mean that payment succeeded.

The backend must verify the transaction directly with the payment gateway before marking the installment as paid.

Possible results include:

- Payment verified successfully.
- Payment cancelled by the parent.
- Payment failed.
- Payment verification pending.
- Payment already verified.
- Invalid gateway response.
- Amount mismatch.
- Payment record not found.

### 6.4 Unknown Payment State

When the payment gateway times out or returns an unclear result:

- Do not mark the payment as failed immediately.
- Change the transaction status to `verification_pending`.
- Retry verification safely.
- Prevent another payment attempt for the same installment until the status is resolved or the attempt expires.
- Allow admins to review unresolved payments.
- Notify the parent that the result is still being verified.

Recommended message:

```text
Your payment result is being verified. Please do not pay again.
```

### 6.5 Payment Amount Mismatch

If the amount verified by the payment gateway does not match the expected installment amount:

- Do not mark the installment as paid.
- Record the transaction for investigation.
- Mark it as a verification failure or manual-review case.
- Notify an administrator.
- Show the parent a safe support message.

---

## 7. Offline Payment Errors

When a parent selects offline payment:

- A pending confirmation record must be created.
- Duplicate confirmation requests must be prevented.
- The installment must not already be paid.
- Admin approval must be idempotent.
- A payment cannot be approved twice.
- A rejected request may contain a reason.
- Approval must fail if the installment was paid online while the request was pending.
- The system must record which admin approved or rejected the request.
- The decision timestamp must be stored.

Recommended statuses:

```text
pending_review
approved
rejected
cancelled
```

---

## 8. Contract Error Handling

The contract system must prevent:

- Accepting an expired contract.
- Accepting an outdated contract version.
- Accepting a contract without a valid payment plan.
- Editing an accepted contract.
- Changing the price of an accepted contract.
- Accepting the same contract more than once.
- Accepting a contract belonging to another family.
- Accepting a replaced or invalidated contract.

When the price changes before acceptance:

- The previous contract version must become invalid.
- A new contract version must be created.
- The parent must review and accept the latest version.

Recommended message:

```text
This contract has been replaced by a newer version. Please review the latest contract.
```

---

## 9. Admin Action Errors

Admin actions must be protected from accidental repetition and concurrent changes.

Examples:

- Approving an enrollment twice.
- Rejecting an already approved enrollment.
- Changing a price after contract acceptance.
- Approving an already paid installment.
- Approving an offline payment after online payment succeeds.
- Processing stale data opened in another browser session.

For important actions, the backend must verify the latest record status before applying the update.

Recommended stale-record message:

```text
This record was changed by another user. Refresh the page and try again.
```

Important admin actions should use confirmation dialogs where appropriate.

---

## 10. Database Error Handling

Database errors must be converted into safe application errors.

| Database Condition | Application Response |
|---|---|
| Unique constraint violation | Duplicate record or action |
| Foreign-key violation | Related record does not exist |
| Transaction conflict | Retry safely or return a conflict |
| Database connection timeout | Temporary service error |
| Concurrent record update | Stale-data conflict |
| Invalid persisted state | Internal server error and admin alert |

Raw database error messages must never be exposed to users.

Critical operations should use database transactions, including:

- Enrollment approval.
- Price assignment.
- Contract creation.
- Contract replacement.
- Contract acceptance.
- Installment creation.
- Online payment confirmation.
- Offline payment approval.
- Manual payment correction.

---

## 11. Concurrency Handling

The system must assume that multiple requests can occur at the same time.

Examples:

- A parent clicks the payment button twice.
- Two admins review the same enrollment.
- An online payment succeeds while an admin approves an offline payment.
- Two admins attempt to change a price.
- A contract is replaced while the parent has an older version open.

Recommended protections:

- Database transactions.
- Atomic updates.
- Unique constraints.
- Optimistic locking where appropriate.
- Status checks inside transactions.
- Idempotency keys for sensitive actions.
- Version fields for records that can become stale.

Example conditional update:

```sql
UPDATE installments
SET status = 'paid'
WHERE id = ?
  AND status = 'unpaid';
```

If no row is updated, the operation should be treated as already processed, invalid, or conflicting.

---

## 12. Frontend Error Messages

Frontend messages must be:

- Clear.
- Brief.
- Actionable.
- Non-technical.
- Displayed near the affected section.
- Available in the website’s supported language.
- Consistent across parent and admin panels.

Good message:

```text
We could not submit the form. Check the highlighted fields and try again.
```

Bad message:

```text
PrismaClientKnownRequestError P2002
```

Good message:

```text
This installment has already been paid.
```

Bad message:

```text
Request failed with status code 409.
```

Good messages should explain what happened and what the user can do next.

---

## 13. Toasts, Alerts, Dialogs, and Error Pages

### Inline Errors

Use inline errors for:

- Invalid form fields.
- Missing required information.
- Payment form validation.
- Contract acceptance requirements.

### Toast Notifications

Use toast notifications for:

- Temporary network failures.
- Failed non-critical actions.
- Successful retries.
- Background refresh failures.
- General operation results.

### Confirmation Dialogs

Use confirmation dialogs for:

- Rejecting an enrollment.
- Replacing a contract.
- Rejecting an offline payment.
- Cancelling important records.
- Performing sensitive admin overrides.

### Dedicated Error Pages

The application should include:

- `403` access denied.
- `404` page not found.
- `500` unexpected server error.
- Temporary maintenance or service-unavailable page.

Each page should provide a safe path back to the dashboard or public website.

---

## 14. Retry Policy

Automatic retries are appropriate for temporary failures such as:

- SMS provider timeout.
- Email provider timeout.
- Temporary payment-verification failure.
- Temporary network failure.
- Short database connection interruption.

Automatic retries must not be used blindly for:

- Creating payments.
- Approving offline payments.
- Accepting contracts.
- Approving enrollment requests.
- Submitting duplicate registrations.

Retries must be:

- Limited.
- Delayed using backoff.
- Idempotent.
- Logged.
- Stopped after the maximum number of attempts.

After retries are exhausted, the operation should be moved to a failed or manual-review state where appropriate.

---

## 15. Logging and Monitoring

Every backend error log should include:

- Timestamp.
- Request ID.
- Error code.
- Endpoint or operation.
- User or admin ID, when available.
- Related student ID, when relevant.
- Related enrollment, contract, payment, or installment ID.
- Safe request context.
- Error stack trace.
- Application environment.
- External-service response code.
- Retry count, when applicable.

Logs must not contain:

- Passwords.
- Verification codes.
- Complete payment information.
- Authentication tokens.
- Session cookies.
- Sensitive personal information unless strictly required.
- Full request bodies containing confidential data.

Structured logging is recommended so logs can be searched and filtered reliably.

---

## 16. Audit Logs

Important business actions should have a separate audit log.

Audit events should include:

- Enrollment approved or rejected.
- Student or parent information edited.
- Price entered or changed.
- Contract generated or replaced.
- Contract accepted.
- Offline payment approved or rejected.
- Payment manually corrected.
- Admin override performed.
- Important status changed manually.

Each audit record should contain:

- Actor.
- Action.
- Target entity type.
- Target entity ID.
- Previous value, where appropriate.
- New value, where appropriate.
- Timestamp.
- Optional reason.
- Related request ID.

Audit records must not be editable through the normal admin panel.

---

## 17. Recommended Error Codes

```text
VALIDATION_ERROR
INVALID_CREDENTIALS
SESSION_EXPIRED
ACCESS_DENIED
RESOURCE_NOT_FOUND
DUPLICATE_REGISTRATION
STUDENT_ALREADY_REGISTERED
PRIMARY_PHONE_NOT_VERIFIED
INVALID_NATIONAL_ID
REGISTRATION_ALREADY_PROCESSED
PRICE_ALREADY_ASSIGNED
CONTRACT_ALREADY_ACCEPTED
CONTRACT_VERSION_OUTDATED
CONTRACT_EXPIRED
CONTRACT_REPLACED
PAYMENT_ALREADY_COMPLETED
PAYMENT_ALREADY_PENDING
PAYMENT_VERIFICATION_PENDING
PAYMENT_VERIFICATION_FAILED
PAYMENT_AMOUNT_MISMATCH
OFFLINE_PAYMENT_ALREADY_SUBMITTED
OFFLINE_PAYMENT_ALREADY_PROCESSED
EXTERNAL_SERVICE_UNAVAILABLE
RATE_LIMIT_EXCEEDED
CONCURRENT_UPDATE
DATABASE_UNAVAILABLE
INTERNAL_SERVER_ERROR
```

Error codes should remain stable even when user-facing message wording changes.

---

## 18. Centralized Backend Error Handling

The backend should use centralized error handling instead of manually formatting errors in every controller or route.

The centralized handler should:

- Recognize known application errors.
- Convert validation errors into field-level responses.
- Map error types to HTTP status codes.
- Generate or include a request ID.
- Log unexpected errors.
- Hide technical details in production.
- Return a consistent response shape.

Application-specific error classes may be used for:

- Validation errors.
- Authentication errors.
- Authorization errors.
- Resource-not-found errors.
- Conflict errors.
- Payment errors.
- External-service errors.

---

## 19. Frontend Error Boundary

The frontend should include a global error boundary for unexpected rendering failures.

The error boundary should:

- Prevent the entire application from showing a blank screen.
- Display a safe fallback interface.
- Allow the user to retry or return to a safe page.
- Log the failure with the related route and request information.
- Avoid exposing technical stack traces.

Feature-level error boundaries may also be used for critical areas such as payments, contracts, and enrollment.

---

## 20. MVP Decisions

For the current MVP, the system will include:

- A consistent API error-response structure.
- Client-side and server-side form validation.
- Field-level validation messages.
- Request IDs for backend errors.
- Centralized backend exception handling.
- A global frontend error boundary.
- Payment idempotency and gateway verification.
- Database transactions for critical operations.
- Duplicate-action prevention.
- Safe concurrency handling.
- Audit logs for important admin actions.
- Structured application logs.
- Limited retry handling for SMS, email, and payment verification.
- User-friendly `403`, `404`, and `500` pages.
- Temporary enrollment-form draft preservation in the browser.
- Manual admin review for unresolved payment verification cases.

Advanced monitoring platforms are not required for the first MVP, but the logging and error architecture should be designed so monitoring can be added later without major structural changes.
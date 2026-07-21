# Testing

For the school transport service MVP, testing should focus on the workflows that directly affect registrations, contracts, pricing, and payments. The goal is not maximum test coverage, but reliable coverage of critical business rules.

## 1. Testing Levels

### 1.1 Unit Testing

Unit tests verify isolated business logic and utility functions.

Main areas:

- Iranian national ID validation
- Phone number validation
- Installment calculation
- Payment due-date calculation
- Price-change restrictions
- Contract status transitions
- Registration status transitions
- Permission checks
- Input normalization
- Notification message generation

Recommended tools:

- **Vitest** for frontend and shared TypeScript code
- **Jest** or **Vitest** for the NestJS backend
- Backend framework testing utilities for services and controllers

### 1.2 Integration Testing

Integration tests verify that several parts of the backend work together correctly.

Important integration scenarios:

- Creating a family account
- Registering multiple students under one family
- Selecting the primary phone number
- Verifying the primary phone number by OTP
- Submitting an enrollment request
- Admin approval or rejection
- Admin entering a service price
- Generating a contract
- Accepting a contract
- Creating payment records
- Recording online payments
- Confirming offline payments
- Sending notifications
- Database transaction rollback when an operation fails

Integration tests should use a separate PostgreSQL test database.

### 1.3 API Testing

API tests should validate:

- Authentication requirements
- Role-based authorization
- Request validation
- Response structure
- HTTP status codes
- Error messages
- Pagination and filtering
- Duplicate request handling
- Idempotency for sensitive actions

Critical APIs include:

- Authentication
- Parent profile
- Student registration
- Enrollment submission
- Admin approval
- Pricing
- Contracts
- Payments
- Offline payment confirmation
- Notifications

### 1.4 End-to-End Testing

End-to-end tests simulate complete user workflows through the actual website.

Recommended tool:

- **Playwright**

Critical parent workflow:

1. Register or log in.
2. Complete parent information.
3. Add a student.
4. Select the primary phone number.
5. Verify the number.
6. Submit an enrollment request.
7. View the request status.
8. Review the assigned price.
9. Accept the contract.
10. Select full payment or installments.
11. Complete an online or offline payment.
12. View payment history.

Critical admin workflow:

1. Log in as admin.
2. Review submitted registrations.
3. Approve or reject a request.
4. Enter or update the price before contract acceptance.
5. Generate the contract.
6. Review payment records.
7. Approve or reject an offline payment.
8. Send or verify notifications.

## 2. Business Rule Testing

The following rules require explicit tests.

### 2.1 Family and Student Rules

- One family account can contain multiple students.
- Students remain separated inside the family dashboard.
- Both parents’ phone numbers are required.
- The emergency contact cannot be one of the parents.
- The selected primary phone number must be OTP verified.
- A rejected registration can be submitted again.

### 2.2 Pricing Rules

- Admin can set the price before contract acceptance.
- Admin can change the price before contract acceptance.
- Every price change is stored in price history.
- The accepted contract preserves the agreed price.
- The price cannot change after acceptance without a new contract.
- The price applies to the complete one-year service period.

### 2.3 Contract Rules

- A contract can only be generated after required approval and pricing.
- A parent cannot accept an outdated contract version.
- An accepted contract cannot be edited directly.
- A price change after acceptance requires a new contract.
- Contract acceptance date and version must be stored.

### 2.4 Payment Rules

- The total payable amount must equal the contract price.
- The prepayment is deducted from the remaining balance.
- The remaining balance is divided into four installments.
- Installment amounts must handle rounding correctly.
- A payment cannot be confirmed twice.
- A failed online payment must not be recorded as successful.
- Duplicate payment callbacks must not create duplicate payments.
- Offline payments remain pending until admin approval.
- Rejected offline payments remain unpaid.
- Payment history must remain available after status changes.

## 3. Security Testing

Security testing should cover:

- Invalid login attempts
- Brute-force protection
- Expired sessions
- Expired OTP codes
- Reused OTP codes
- Unauthorized API access
- Parent attempting to access another family’s students
- Parent attempting to access admin APIs
- Manipulated price or payment values
- SQL injection attempts
- Cross-site scripting inputs
- Malicious file or text input
- Rate-limit enforcement
- Sensitive-data exposure in API responses
- Secure password reset and session invalidation

## 4. Database Testing

Database tests should verify:

- Foreign-key constraints
- Unique constraints
- Required fields
- Transaction safety
- Soft deletion behavior
- Audit history
- Contract version preservation
- Price history preservation
- Payment idempotency
- Concurrent updates
- Rollback after failures

Important concurrency cases:

- Two admins reviewing the same request
- Two price updates submitted at the same time
- Duplicate payment gateway callbacks
- Repeated offline payment approval requests
- Parent accepting an outdated contract while admin creates a new version

## 5. Frontend Testing

Frontend testing should include:

- Form validation
- Error-message rendering
- Loading states
- Empty states
- Success notifications
- Confirmation dialogs
- Disabled buttons during submission
- Prevention of repeated submissions
- Responsive layouts
- Mobile navigation
- Accessibility
- Keyboard navigation
- RTL layout correctness
- Persian text rendering
- Long names and long addresses
- Slow-network behavior

Responsive testing should cover at least:

- Small mobile devices
- Standard mobile devices
- Tablets
- Laptops
- Desktop screens

Because many parents may use mobile devices, the primary workflows should be tested mobile-first.

## 6. Payment Testing

Payment testing is one of the highest-priority areas.

Required scenarios:

- Successful payment
- Failed payment
- Cancelled payment
- Payment timeout
- User closes the payment page
- User returns using the browser back button
- Gateway callback arrives multiple times
- Callback arrives after a delay
- Invalid callback signature
- Amount mismatch
- Previously successful transaction callback
- Database failure during confirmation
- Payment succeeds at the gateway but local confirmation initially fails
- Manual reconciliation by admin
- Offline payment approved
- Offline payment rejected

Payment gateway sandbox environments should be used before production testing.

## 7. Notification Testing

Tests should verify:

- Registration-submitted notification
- Approval notification
- Rejection notification
- Contract-ready notification
- Upcoming-payment reminder
- Overdue-payment warning
- Successful-payment notification
- Failed-payment notification
- Offline-payment approval notification
- Notification fallback to the secondary phone number
- Duplicate notification prevention
- Failed provider response handling

SMS and email providers should be mocked during automated tests.

## 8. Test Environments

Recommended environments:

- **Local development**
- **Automated test environment**
- **Staging**
- **Production**

The staging environment should closely resemble production but use:

- Test payment credentials
- Test SMS credentials
- Test email credentials
- Non-production data
- Separate database and storage

## 9. Test Data

Test data should include:

- One-student family
- Multiple-student family
- Long Persian names
- Duplicate national IDs
- Duplicate phone numbers
- Invalid phone numbers
- Invalid national IDs
- Missing emergency contact
- Rejected and resubmitted enrollment
- Full-payment contract
- Installment-payment contract
- Approved offline payment
- Rejected offline payment
- Expired contract version
- Overdue installment
- Fully paid contract

Production personal data should never be copied directly into local or test environments.

## 10. Continuous Integration

Each pull request should automatically run:

- Linting
- Type checking
- Unit tests
- Integration tests
- Production build
- Database migration validation

End-to-end tests may run:

- On important pull requests
- Before release
- Against staging
- On a scheduled basis

A pull request should not be merged when critical tests fail.

## 11. Manual Testing

Manual testing remains necessary for:

- Visual quality
- Responsive layouts
- Persian and RTL behavior
- Payment gateway redirects
- SMS delivery
- Email formatting
- Contract appearance
- Browser compatibility
- Mobile usability
- Admin workflow clarity

Before every production release, a short regression checklist should be completed.

## 12. Browser and Device Coverage

Recommended browser coverage:

- Google Chrome
- Microsoft Edge
- Firefox
- Safari
- Mobile Chrome
- Mobile Safari

The highest priority should be recent versions of Chrome, Edge, Android Chrome, and iOS Safari.

## 13. Coverage Priorities

Test coverage should be prioritized as follows:

1. Payments
2. Contracts and pricing
3. Enrollment and approval
4. Authentication and authorization
5. Family and student data isolation
6. Notifications
7. Admin operations
8. UI components and secondary pages

A practical MVP target is:

- High coverage for critical business logic
- Moderate coverage for APIs and services
- Focused end-to-end coverage for major workflows
- Lower coverage for purely visual or static components

## 14. Release Acceptance

A release should only be approved when:

- Critical automated tests pass.
- No unresolved critical or high-severity defects remain.
- Parent registration works from start to finish.
- Admin approval and pricing work correctly.
- Contract acceptance works correctly.
- Online and offline payment workflows work.
- Duplicate payments are prevented.
- Access-control tests pass.
- Mobile workflows are usable.
- Database migrations complete successfully.
- Staging smoke tests pass.

These recommendations are suitable for the current MVP while remaining scalable as the system grows.
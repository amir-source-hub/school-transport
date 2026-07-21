# API Specification

For the school transport service, the API should support the current MVP while remaining structured enough for later expansion. Since the frontend and backend are separate applications, the backend will expose a versioned REST API consumed by the parent web application and the admin panel.

## 1. Recommended API Style

Use a REST API with JSON request and response bodies.

```text
/api/v1
```

Example endpoints:

```text
POST   /api/v1/auth/login
GET    /api/v1/students
POST   /api/v1/enrollments
GET    /api/v1/contracts/:contractId
POST   /api/v1/payments/:paymentId/verify
```

The first version should use REST instead of GraphQL because:

- The system has clear resources and workflows.
- REST is simpler to document, test, secure, and maintain.
- It works well with the selected Node.js and TypeScript backend.
- OpenAPI documentation can be generated easily.
- The API can later support mobile applications without major changes.

## 2. Main API Modules

The MVP API should be divided into these modules:

1. Authentication
2. Parent and family accounts
3. Students
4. Schools
5. Enrollment requests
6. Admin enrollment review
7. Pricing
8. Contracts
9. Payments
10. Notifications
11. Admin management
12. Media and public configuration
13. Audit history

## 3. Authentication API

Authentication uses a shared family username and password.

The selected primary phone number must be verified through OTP during registration or when the primary number changes.

### Main Endpoints

```text
POST /api/v1/auth/register
POST /api/v1/auth/send-phone-verification
POST /api/v1/auth/verify-phone
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
GET  /api/v1/auth/me
```

### Registration Flow

1. Parent submits account and family information.
2. Backend validates username, phone numbers, national IDs, and required fields.
3. OTP is sent to the selected primary phone number.
4. Parent verifies the OTP.
5. Account becomes active.
6. Parent can add one or more students.

### Login Request

```json
{
  "username": "family_ahmadi",
  "password": "secure-password"
}
```

### Login Response

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_123",
      "username": "family_ahmadi",
      "role": "PARENT"
    },
    "accessToken": "access-token",
    "refreshToken": "refresh-token"
  }
}
```

For browser security, refresh tokens should preferably be stored in secure, HTTP-only cookies rather than exposed directly to frontend JavaScript.

## 4. Parent and Family API

A family account contains information about both parents and their selected primary phone number.

```text
GET   /api/v1/family/profile
PATCH /api/v1/family/profile
POST  /api/v1/family/change-primary-phone
POST  /api/v1/family/verify-primary-phone-change
POST  /api/v1/family/change-password
```

Editable fields should include simple personal information such as:

- Parent names
- Secondary phone number
- Email
- Home address
- Emergency contact

Sensitive identifiers should have stricter editing rules.

Changing the primary phone number must require verification.

## 5. Student API

A family can register and manage multiple students.

```text
GET    /api/v1/students
POST   /api/v1/students
GET    /api/v1/students/:studentId
PATCH  /api/v1/students/:studentId
DELETE /api/v1/students/:studentId
```

Deletion should only be allowed when the student has no active contract, accepted enrollment, or payment history. Otherwise, the student should be archived rather than permanently deleted.

### Create Student Request

```json
{
  "firstName": "Sara",
  "lastName": "Ahmadi",
  "nationalId": "0012345678",
  "birthDate": "2015-09-12",
  "schoolId": "sch_123",
  "grade": "5",
  "serviceType": "ROUND_TRIP"
}
```

Parents can edit basic student information. Changing the school or service-related information after submission should require a new enrollment request or admin approval.

## 6. School API

Parents need access to active schools when completing an enrollment.

```text
GET /api/v1/schools
GET /api/v1/schools/:schoolId
```

Admin endpoints:

```text
GET    /api/v1/admin/schools
POST   /api/v1/admin/schools
PATCH  /api/v1/admin/schools/:schoolId
POST   /api/v1/admin/schools/:schoolId/archive
```

Schools should normally be archived instead of permanently deleted.

## 7. Enrollment API

Enrollment represents the parent’s request for school transportation.

```text
GET  /api/v1/enrollments
POST /api/v1/enrollments
GET  /api/v1/enrollments/:enrollmentId
POST /api/v1/enrollments/:enrollmentId/submit
POST /api/v1/enrollments/:enrollmentId/cancel
```

A rejected enrollment does not prevent the parent from submitting a new request.

A family may submit multiple requests over time, but one accepted enrollment must be selected before contract generation.

### Enrollment Statuses

```text
DRAFT
SUBMITTED
UNDER_REVIEW
NEEDS_CORRECTION
APPROVED
REJECTED
CANCELLED
CONVERTED_TO_CONTRACT
```

### Submit Enrollment Request

```json
{
  "studentId": "stu_123",
  "schoolId": "sch_123",
  "serviceType": "ROUND_TRIP",
  "pickupAddress": {
    "province": "Tehran",
    "city": "Tehran",
    "district": "District 2",
    "street": "Example Street",
    "fullAddress": "Complete written address"
  },
  "preferredStartDate": "2026-09-01",
  "notes": "Optional parent note"
}
```

## 8. Admin Enrollment Review API

```text
GET  /api/v1/admin/enrollments
GET  /api/v1/admin/enrollments/:enrollmentId
POST /api/v1/admin/enrollments/:enrollmentId/start-review
POST /api/v1/admin/enrollments/:enrollmentId/request-correction
POST /api/v1/admin/enrollments/:enrollmentId/approve
POST /api/v1/admin/enrollments/:enrollmentId/reject
```

### Request Correction

```json
{
  "message": "Please correct the pickup address.",
  "fields": [
    "pickupAddress.fullAddress"
  ]
}
```

### Approve Enrollment

```json
{
  "approvedServiceType": "ROUND_TRIP",
  "serviceStartDate": "2026-09-01",
  "serviceEndDate": "2027-08-31",
  "internalNotes": "Approved after manual review"
}
```

Route and vehicle assignment are manual operational activities and are outside the current MVP API.

## 9. Pricing API

The admin manually enters the final price after reviewing the enrollment.

The price can be changed before contract acceptance. After contract acceptance, changing the price requires creating a new contract.

```text
GET  /api/v1/admin/enrollments/:enrollmentId/pricing
POST /api/v1/admin/enrollments/:enrollmentId/pricing
GET  /api/v1/admin/enrollments/:enrollmentId/pricing-history
```

### Pricing Request

```json
{
  "totalAmount": 150000000,
  "currency": "IRR",
  "paymentPlan": "INSTALLMENT",
  "prepaymentAmount": 50000000,
  "installmentCount": 4,
  "description": "Transportation service for one academic service period"
}
```

Amounts should always be stored and transferred as integers in the smallest supported currency unit.

The API must not accept floating-point values for money.

## 10. Contract API

```text
GET  /api/v1/contracts
GET  /api/v1/contracts/:contractId
GET  /api/v1/contracts/:contractId/document
POST /api/v1/contracts/:contractId/accept
POST /api/v1/contracts/:contractId/reject
```

Admin endpoints:

```text
POST /api/v1/admin/enrollments/:enrollmentId/contracts
GET  /api/v1/admin/contracts
GET  /api/v1/admin/contracts/:contractId
POST /api/v1/admin/contracts/:contractId/cancel
POST /api/v1/admin/contracts/:contractId/replace
```

### Contract Statuses

```text
DRAFT
ISSUED
VIEWED
ACCEPTED
REJECTED
CANCELLED
REPLACED
EXPIRED
```

### Contract Acceptance Request

```json
{
  "accepted": true,
  "confirmation": "I have read and accept the contract terms."
}
```

The backend should record:

- Acceptance time
- Accepting user
- IP address
- User agent
- Contract version
- Contract document checksum

## 11. Payment Plan API

After the contract is accepted, the backend creates the payment schedule.

Supported plans:

```text
FULL_PAYMENT
INSTALLMENT
```

For installment payments:

- A prepayment is created first.
- The remaining amount is divided into four installments.
- Installment due dates are calculated monthly from the prepayment date.
- Each installment must be paid as one complete payment.
- Parents cannot split one installment into multiple partial payments.

```text
GET /api/v1/contracts/:contractId/payment-plan
GET /api/v1/payments
GET /api/v1/payments/:paymentId
```

Example response:

```json
{
  "success": true,
  "data": {
    "totalAmount": 150000000,
    "paidAmount": 50000000,
    "remainingAmount": 100000000,
    "items": [
      {
        "id": "pay_1",
        "type": "PREPAYMENT",
        "amount": 50000000,
        "status": "PAID"
      },
      {
        "id": "pay_2",
        "type": "INSTALLMENT",
        "installmentNumber": 1,
        "amount": 25000000,
        "dueDate": "2026-10-01",
        "status": "PENDING"
      }
    ]
  }
}
```

## 12. Online Payment API

```text
POST /api/v1/payments/:paymentId/online/start
GET  /api/v1/payments/online/callback
POST /api/v1/payments/:paymentId/online/verify
```

The backend must:

1. Confirm that the payment belongs to the authenticated family.
2. Confirm that it is still payable.
3. Create a payment attempt.
4. Generate an idempotency identifier.
5. Redirect the parent to the payment gateway.
6. Receive the gateway callback.
7. Verify payment directly with the gateway.
8. Update the payment atomically.
9. Create a receipt.
10. Send a notification.

The callback itself must not be trusted as proof of payment. Payment must be verified with the payment provider.

## 13. Offline Payment API

Parents may choose offline payment and submit payment details.

```text
POST /api/v1/payments/:paymentId/offline-submissions
GET  /api/v1/payments/:paymentId/offline-submissions
```

Admin endpoints:

```text
GET  /api/v1/admin/offline-payment-submissions
GET  /api/v1/admin/offline-payment-submissions/:submissionId
POST /api/v1/admin/offline-payment-submissions/:submissionId/approve
POST /api/v1/admin/offline-payment-submissions/:submissionId/reject
```

### Offline Payment Submission

```json
{
  "paidAt": "2026-10-01T10:30:00+03:30",
  "referenceNumber": "TRX-123456",
  "description": "Bank transfer",
  "receiptMediaId": "med_123"
}
```

### Approval Request

```json
{
  "approvedAmount": 25000000,
  "adminNote": "Verified against bank records"
}
```

Approving an offline payment must update the payment successfully in one database transaction.

## 14. Receipt API

```text
GET /api/v1/payments/:paymentId/receipt
GET /api/v1/payments/:paymentId/receipt/download
```

Receipts should include:

- Family
- Student
- Contract reference
- Payment amount
- Payment method
- Payment date
- Gateway or offline reference
- Receipt number
- Payment status

## 15. Notification API

```text
GET   /api/v1/notifications
GET   /api/v1/notifications/unread-count
PATCH /api/v1/notifications/:notificationId/read
POST  /api/v1/notifications/read-all
```

Admin endpoints:

```text
GET  /api/v1/admin/notifications
POST /api/v1/admin/notifications/send
```

Initial notification events include:

- Enrollment submitted
- Enrollment correction requested
- Enrollment approved or rejected
- Price assigned
- Contract issued
- Contract accepted
- Payment created
- Payment successful
- Offline payment approved or rejected
- Payment due-date reminder
- Overdue payment warning

## 16. Admin Dashboard API

```text
GET /api/v1/admin/dashboard/summary
GET /api/v1/admin/dashboard/recent-enrollments
GET /api/v1/admin/dashboard/upcoming-payments
GET /api/v1/admin/dashboard/overdue-payments
```

Example summary response:

```json
{
  "success": true,
  "data": {
    "pendingEnrollments": 12,
    "contractsAwaitingAcceptance": 5,
    "offlinePaymentsAwaitingReview": 3,
    "upcomingPayments": 18,
    "overduePayments": 4
  }
}
```

## 17. Admin User Management API

```text
GET   /api/v1/admin/families
GET   /api/v1/admin/families/:familyId
PATCH /api/v1/admin/families/:familyId
POST  /api/v1/admin/families/:familyId/suspend
POST  /api/v1/admin/families/:familyId/activate
GET   /api/v1/admin/families/:familyId/students
GET   /api/v1/admin/families/:familyId/contracts
GET   /api/v1/admin/families/:familyId/payments
```

Admin overrides should be limited to defined actions and should always create audit records.

## 18. Media Upload API

Media is currently needed primarily for offline payment receipts and public website images.

```text
POST   /api/v1/media/upload
GET    /api/v1/media/:mediaId
DELETE /api/v1/media/:mediaId
```

Upload validation should include:

- Allowed MIME types
- Maximum file size
- Extension validation
- Ownership validation
- Malware or unsafe-file checks where available

Receipt uploads may support JPEG, PNG, WebP, and PDF.

## 19. Public API

Public website data should be separated from authenticated API resources.

```text
GET /api/v1/public/site-settings
GET /api/v1/public/schools
GET /api/v1/public/faqs
GET /api/v1/public/contact-information
GET /api/v1/public/pages/:slug
```

Only approved public information should be returned from these endpoints.

## 20. Standard API Response Format

Successful response:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "req_123"
  }
}
```

Successful paginated response:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 85,
    "totalPages": 5
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

Error response:

```json
{
  "success": false,
  "error": {
    "code": "ENROLLMENT_INVALID_STATUS",
    "message": "This enrollment cannot be edited in its current status.",
    "fieldErrors": {
      "schoolId": [
        "The selected school is not active."
      ]
    }
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

## 21. HTTP Status Codes

Use standard HTTP status codes consistently:

```text
200 OK
201 Created
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests
500 Internal Server Error
503 Service Unavailable
```

Examples:

- Invalid request data: `422`
- Duplicate username: `409`
- Missing authentication: `401`
- Parent accessing another family’s student: `403` or privacy-safe `404`
- Payment gateway unavailable: `503`

## 22. Validation

All API input must be validated on the backend.

Validation should cover:

- Required fields
- Iranian national ID format
- Iranian mobile number format
- Username rules
- Password strength
- Valid date ranges
- Active school selection
- Enrollment status transitions
- Contract eligibility
- Payment amounts
- File types and sizes
- Resource ownership

Frontend validation improves usability but must never replace backend validation.

## 23. Authorization

Authorization must be implemented at both route and resource levels.

Roles:

```text
PARENT
ADMIN
```

Examples:

- Parents can access only their family and students.
- Parents can access only their own enrollments, contracts, and payments.
- Admins can review all enrollments.
- Only admins can assign prices.
- Only admins can approve offline payments.
- Only parents associated with a contract can accept it.
- Accepted contracts cannot be edited directly.

## 24. Pagination, Filtering, and Sorting

List endpoints should support standardized query parameters:

```text
?page=1
&pageSize=20
&sortBy=createdAt
&sortOrder=desc
&status=SUBMITTED
&search=ahmadi
```

Example:

```text
GET /api/v1/admin/enrollments?page=1&pageSize=20&status=SUBMITTED
```

Maximum page size should be limited to prevent expensive requests.

## 25. Idempotency

Idempotency is required for sensitive write operations, especially:

- Starting online payments
- Verifying payments
- Approving offline payments
- Accepting contracts
- Creating contracts
- Sending critical notifications

Example header:

```http
Idempotency-Key: 6408d7db-833a-4f37-a537-6dfa56103459
```

Repeated requests with the same key should not create duplicate payments, contracts, or approvals.

## 26. Concurrency Control

The API must protect critical operations from simultaneous changes.

Recommended protections:

- Database transactions
- Row-level locking where required
- Unique database constraints
- Optimistic concurrency for editable records
- Idempotency keys
- Immutable payment records
- Explicit status-transition checks

For example, two admins must not be able to approve the same offline payment twice.

## 27. Audit Logging

Important admin and financial operations must create audit records.

Audit events should include:

- Actor
- Action
- Resource type
- Resource ID
- Previous values
- New values
- Timestamp
- IP address
- Request ID

Audited operations include:

- Enrollment approval or rejection
- Pricing changes
- Contract creation or replacement
- Offline payment approval
- Family suspension
- Sensitive profile changes
- Admin overrides

## 28. API Documentation

The backend should provide an OpenAPI specification and an interactive API documentation interface.

Recommended endpoints:

```text
GET /api/docs
GET /api/openapi.json
```

Production documentation may be protected or disabled for public access.

The API documentation should contain:

- Endpoint description
- Authentication requirements
- Request schemas
- Response schemas
- Error codes
- Example requests
- Example responses
- Role permissions

## 29. Security Requirements

The API should implement:

- HTTPS-only communication
- Secure password hashing
- Short-lived access tokens
- Secure refresh-token handling
- Rate limiting
- OTP attempt limits
- Login attempt limits
- Request body size limits
- CORS restrictions
- Security headers
- Sanitized error responses
- Structured security logging
- Input validation
- File upload validation

Sensitive information such as passwords, OTP values, complete tokens, and payment credentials must never appear in logs.

## 30. Recommended API Implementation Structure

```text
src/
├── modules/
│   ├── auth/
│   ├── families/
│   ├── students/
│   ├── schools/
│   ├── enrollments/
│   ├── pricing/
│   ├── contracts/
│   ├── payments/
│   ├── notifications/
│   ├── media/
│   └── admin/
├── common/
│   ├── errors/
│   ├── middleware/
│   ├── guards/
│   ├── validation/
│   ├── pagination/
│   └── logging/
├── database/
│   ├── schema/
│   ├── migrations/
│   └── repositories/
└── app.ts
```

Database access should use Drizzle ORM, matching the selected backend architecture and database specification.

## Recommended MVP Decisions

For the first API version:

- Use REST and JSON.
- Use `/api/v1` versioning.
- Use shared family username/password authentication.
- Verify the selected primary phone using OTP.
- Use access and refresh tokens.
- Support parent and admin roles.
- Generate OpenAPI documentation.
- Use standardized responses and error codes.
- Require idempotency for payment and contract operations.
- Keep route, driver, vehicle, attendance, and tracking APIs outside the current MVP.
- Preserve clear module boundaries so those features can be added later.
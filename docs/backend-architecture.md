# Backend Architecture Specification

## 1. Overview

The school transport service backend will be developed as a **modular monolith** using a separate backend application.

The architecture must support the current MVP while remaining structured enough for future expansion without requiring an early migration to microservices.

### Selected Backend Stack

- Node.js
- TypeScript
- NestJS
- PostgreSQL
- Drizzle ORM
- REST API
- Zod-based validation where appropriate
- JWT access tokens
- Refresh tokens
- Scheduled jobs
- External service provider abstractions

Drizzle ORM is the selected database layer because it provides:

- Strong TypeScript type safety
- SQL-like query construction
- Explicit and predictable database behavior
- Lightweight runtime overhead
- Clear PostgreSQL schema definitions
- Controlled migrations
- Good compatibility with a separated backend architecture

---

## 2. Architecture Style

The backend will use a **modular monolith architecture**.

This means:

- The backend is deployed as one application.
- Business areas are separated into independent modules.
- Each module owns its business logic.
- Modules communicate through services and defined interfaces.
- Database access remains centralized and controlled.
- The architecture can later be separated into services if genuinely required.

Microservices are not appropriate for the current stage because they would add unnecessary operational, deployment, networking, monitoring, and data-consistency complexity.

---

## 3. Project Structure

```text
apps/
├── web/
└── api/
    ├── src/
    │   ├── modules/
    │   ├── common/
    │   ├── config/
    │   ├── database/
    │   ├── integrations/
    │   ├── jobs/
    │   └── main.ts
    ├── drizzle/
    │   ├── migrations/
    │   └── meta/
    ├── test/
    ├── drizzle.config.ts
    ├── package.json
    └── tsconfig.json
```

The frontend and backend remain separate applications inside the same repository or monorepo.

---

## 4. Main Backend Modules

## 4.1 Authentication Module

Responsible for:

- Family account registration
- Username and password login
- Password hashing
- Access token generation
- Refresh token management
- Logout
- Password reset
- Primary phone OTP verification
- Authentication guards
- Login attempt control
- Session management

The account belongs to the complete family, not separately to the mother or father.

---

## 4.2 Family Module

Responsible for:

- Shared family account information
- Mother information
- Father information
- Primary phone selection
- Secondary phone fallback
- Notification phone selection
- Family address
- Emergency contact
- Editable family profile fields

Both parents' phone numbers are required.

The selected primary phone number must be verified using OTP.

The emergency contact must be someone other than either parent.

---

## 4.3 Student Module

Responsible for:

- Registering multiple students under one family account
- Student personal information
- National ID information
- School association
- Academic information
- Student status
- Parent access to each student dashboard
- Student profile updates

Each student belongs to one family account.

A family can register multiple students and access each student's information separately.

---

## 4.4 Enrollment Module

Responsible for:

- Enrollment form creation
- Enrollment submission
- Administrative review
- Approval
- Rejection
- Resubmission
- Enrollment history
- Admin comments
- Rejection reasons
- Student and service information snapshots

Suggested statuses:

```text
draft
submitted
under_review
approved
rejected
cancelled
```

A rejected enrollment may be corrected and submitted again.

---

## 4.5 School Module

Responsible for:

- School records
- School names
- School addresses
- School activation status
- Associating students with schools
- Administrative school management

Schools are controlled by administrators.

Parents must not freely create or modify school records.

---

## 4.6 Service Request Module

Responsible for:

- Student transport service requests
- Requested pickup address
- Requested service period
- Full-trip service selection
- Request status
- Administrative review
- Linking approved requests to pricing
- Linking requests to contracts

Route assignment remains manual in the current MVP.

Vehicle assignment, driver assignment, capacity management, attendance, and live tracking are outside the current backend scope.

---

## 4.7 Pricing Module

Responsible for:

- Admin-defined service prices
- Initial price proposals
- Prepayment amount
- Remaining balance
- Installment calculation
- Complete service-period pricing
- Price history
- Price snapshots
- Price changes before contract acceptance

The price applies to the complete one-year service period.

The administrator may change the price before the contract is accepted.

After contract acceptance, the price can only change through a newly generated contract.

Every price change must be preserved in the price history.

---

## 4.8 Contract Module

Responsible for:

- Contract generation
- Contract versioning
- Contract acceptance
- Contract rejection
- Contract replacement
- Contract status management
- Contract file metadata
- Linking contracts to students
- Linking contracts to service requests
- Linking contracts to pricing snapshots

Suggested statuses:

```text
draft
pending_parent_acceptance
accepted
rejected
expired
replaced
cancelled
```

Accepted contracts are immutable.

When service terms or pricing change after acceptance, the system must generate a new contract rather than editing the accepted contract.

---

## 4.9 Payment Module

Responsible for:

- Online payments
- Offline payment submissions
- Payment gateway requests
- Payment gateway callbacks
- Payment verification
- Offline payment review
- Admin approval
- Admin rejection
- Payment transaction records
- Payment retry handling
- Idempotency protection
- Payment status management

Suggested statuses:

```text
pending
processing
paid
failed
cancelled
expired
awaiting_admin_approval
rejected
```

Online payments are completed through the selected payment gateway.

For offline payments:

1. The parent submits payment information.
2. The payment enters an awaiting-approval state.
3. An administrator reviews the payment.
4. The administrator approves or rejects it.
5. The installment is marked as paid only after approval.

---

## 4.10 Installment Module

Responsible for:

- Prepayment generation
- Four monthly installment records
- Due-date generation
- Installment amount calculation
- Paid status
- Unpaid status
- Overdue detection
- Payment association
- Remaining balance calculation

The payment structure is:

1. Initial prepayment
2. Remaining balance divided into four monthly installments

Each installment must be paid as one complete payment.

An installment cannot be divided into multiple partial payments.

Due dates remain valid even when they fall on holidays because payments can be completed online.

---

## 4.11 Notification Module

Responsible for:

- Registration notifications
- Enrollment notifications
- Approval notifications
- Rejection notifications
- Contract notifications
- Payment confirmations
- Due-date reminders
- Overdue warnings
- Basic system alerts
- SMS delivery
- In-app notifications
- Notification delivery records

The primary phone number is used first.

If the primary phone is unavailable, another registered parent phone number may be used according to the notification rules.

---

## 4.12 Admin Module

Responsible for:

- Enrollment review
- Enrollment approval
- Enrollment rejection
- Manual pricing
- Price updates
- Contract management
- Offline payment verification
- Family review
- Student review
- Basic dashboard statistics
- Administrative overrides
- Warning management

The Admin Module must use services from the related business modules rather than duplicating their business logic.

For example, an admin enrollment approval endpoint should call the Enrollment Service rather than implementing approval rules inside the Admin Controller.

---

## 4.13 Audit Log Module

Responsible for recording important system actions, including:

- Enrollment approval
- Enrollment rejection
- Price creation
- Price changes
- Contract generation
- Contract acceptance
- Contract replacement
- Offline payment approval
- Offline payment rejection
- Important profile changes
- Administrative overrides

Each audit log should contain:

```text
actor ID
actor role
action
entity type
entity ID
previous value
new value
timestamp
request ID
IP address where appropriate
```

Audit records should be append-only and must not be editable through normal application endpoints.

---

## 5. Module Structure

A standard module may use the following structure:

```text
students/
├── controllers/
│   └── students.controller.ts
├── services/
│   └── students.service.ts
├── repositories/
│   └── students.repository.ts
├── dto/
│   ├── create-student.dto.ts
│   └── update-student.dto.ts
├── policies/
├── validators/
├── students.module.ts
└── students.types.ts
```

Simple modules do not need every folder.

The structure should remain practical and should not create unnecessary abstraction or empty files.

---

## 6. Backend Layers

## 6.1 Controller Layer

Controllers are responsible for:

- Receiving HTTP requests
- Reading route parameters
- Reading query parameters
- Reading request bodies
- Accessing the authenticated user
- Calling application services
- Returning standardized responses

Controllers must not contain core business logic.

---

## 6.2 Service Layer

Services are responsible for:

- Business rules
- Workflow coordination
- Authorization-sensitive actions
- State transitions
- Transaction management
- Calling repositories
- Calling external integrations
- Creating audit records

Most business logic belongs in the service layer.

---

## 6.3 Repository Layer

Repositories are responsible for:

- Drizzle ORM queries
- Entity retrieval
- Data persistence
- Query filtering
- Pagination
- Database-specific operations
- Reusable query logic

Drizzle queries should not be written directly inside controllers.

For small and simple operations, services may use repositories without creating unnecessary domain layers.

---

## 6.4 Integration Layer

The integration layer manages external services such as:

- SMS providers
- Payment gateways
- File storage
- Logging systems
- Future verification services

Each external provider should be hidden behind an internal interface.

Example:

```ts
export interface SmsProvider {
  send(message: SmsMessage): Promise<SmsResult>;
}
```

Business modules must depend on the interface instead of a specific provider implementation.

This allows the SMS or payment provider to be replaced without rewriting the business modules.

---

## 7. Database Architecture with Drizzle ORM

Database schemas should be defined using Drizzle PostgreSQL schema definitions.

Suggested structure:

```text
src/database/
├── schema/
│   ├── auth.schema.ts
│   ├── families.schema.ts
│   ├── students.schema.ts
│   ├── enrollments.schema.ts
│   ├── schools.schema.ts
│   ├── service-requests.schema.ts
│   ├── pricing.schema.ts
│   ├── contracts.schema.ts
│   ├── installments.schema.ts
│   ├── payments.schema.ts
│   ├── notifications.schema.ts
│   ├── audit-logs.schema.ts
│   └── index.ts
├── relations/
├── database.module.ts
├── database.service.ts
└── database.types.ts
```

Example Drizzle table:

```ts
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
} from 'drizzle-orm/pg-core';

export const students = pgTable('students', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id').notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  nationalId: varchar('national_id', { length: 20 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
```

Database migrations must be generated and managed through Drizzle Kit.

Production schema changes must always use migrations and must not rely on direct synchronization.

---

## 8. API Design

The backend exposes a versioned REST API.

```text
/api/v1/auth
/api/v1/families
/api/v1/students
/api/v1/enrollments
/api/v1/schools
/api/v1/service-requests
/api/v1/pricing
/api/v1/contracts
/api/v1/payments
/api/v1/installments
/api/v1/notifications
/api/v1/admin
```

Example endpoints:

```text
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/verify-phone

GET    /api/v1/families/me
PATCH  /api/v1/families/me

GET    /api/v1/students
POST   /api/v1/students
GET    /api/v1/students/:studentId
PATCH  /api/v1/students/:studentId

POST   /api/v1/enrollments
GET    /api/v1/enrollments/:enrollmentId
POST   /api/v1/enrollments/:enrollmentId/submit
POST   /api/v1/enrollments/:enrollmentId/resubmit

POST   /api/v1/admin/enrollments/:id/approve
POST   /api/v1/admin/enrollments/:id/reject

POST   /api/v1/admin/pricing
PATCH  /api/v1/admin/pricing/:id

GET    /api/v1/contracts/:id
POST   /api/v1/contracts/:id/accept

POST   /api/v1/payments/online
POST   /api/v1/payments/offline
POST   /api/v1/payments/callback
POST   /api/v1/admin/payments/:id/approve
POST   /api/v1/admin/payments/:id/reject
```

Business workflow actions should use explicit action endpoints.

For example:

```text
POST /enrollments/:id/submit
POST /contracts/:id/accept
POST /admin/payments/:id/approve
```

This is clearer and safer than using generic update endpoints for important state transitions.

---

## 9. Authentication

The family account uses:

- Username
- Password
- Verified primary phone number

The backend should use:

- Secure password hashing
- Short-lived access tokens
- Refresh tokens
- Refresh-token rotation
- Hashed refresh-token storage
- HTTP-only secure cookies for refresh tokens
- Authentication guards
- Rate limiting
- Login attempt protection

The selected primary phone number must be verified using OTP.

OTP is used for phone verification and sensitive account recovery, not as the normal login method.

---

## 10. Authorization

Authorization must be implemented at two levels.

### 10.1 Role-Level Authorization

Current roles:

```text
parent
admin
```

### 10.2 Resource-Level Authorization

A parent may only access:

- Their own family profile
- Students belonging to their family
- Their own enrollments
- Their own service requests
- Their own contracts
- Their own installments
- Their own payments
- Their own notifications

Checking only the user's role is insufficient.

Every resource query must also enforce ownership.

Whenever possible, ownership conditions should be included directly in the database query.

Example:

```ts
const student = await db.query.students.findFirst({
  where: and(
    eq(students.id, studentId),
    eq(students.familyId, authenticatedFamilyId),
  ),
});
```

This reduces the risk of insecure direct object reference vulnerabilities.

---

## 11. Database Transactions

Database transactions must be used for workflows that update multiple related records.

Examples:

- Approving an enrollment
- Creating a pricing snapshot
- Generating a contract
- Accepting a contract
- Generating installments
- Confirming an online payment
- Approving an offline payment
- Replacing a contract
- Writing related audit records

Example using Drizzle:

```ts
await db.transaction(async (tx) => {
  await tx
    .update(contracts)
    .set({
      status: 'accepted',
      acceptedAt: new Date(),
    })
    .where(eq(contracts.id, contractId));

  await tx.insert(installments).values(generatedInstallments);

  await tx.insert(auditLogs).values({
    actorId,
    action: 'contract.accepted',
    entityType: 'contract',
    entityId: contractId,
  });
});
```

If any operation fails, the complete transaction must be rolled back.

---

## 12. Concurrency and Data Integrity

The backend must protect important workflows from duplicate or concurrent execution.

Examples:

- A contract must not be accepted twice.
- An installment must not be paid twice.
- A payment callback must not be processed twice.
- An offline payment must not be approved twice.
- Two concurrent admin actions must not create conflicting contract versions.

Protection mechanisms include:

- Database unique constraints
- Foreign keys
- Transactions
- Status conditions in update queries
- Idempotency keys
- Payment gateway reference uniqueness
- Row-level locking where required
- Optimistic concurrency where appropriate

Example conditional update:

```ts
const result = await tx
  .update(installments)
  .set({
    status: 'paid',
    paidAt: new Date(),
  })
  .where(
    and(
      eq(installments.id, installmentId),
      eq(installments.status, 'unpaid'),
    ),
  )
  .returning({ id: installments.id });

if (result.length === 0) {
  throw new ConflictException('Installment is already paid or unavailable.');
}
```

---

## 13. Background Jobs

Redis and BullMQ are not required for the current MVP.

Simple scheduled jobs can handle:

- Due-date reminders
- Overdue installment detection
- Expired payment detection
- Notification retries
- Contract expiration checks
- Cleanup of expired sessions or OTP records

Jobs should be implemented behind a clear internal abstraction.

This allows BullMQ or another queue system to be introduced later without changing the business modules.

Jobs must be idempotent so repeated execution does not create duplicate notifications or duplicate state changes.

---

## 14. Validation

Validation exists at multiple levels.

### 14.1 Request Validation

Examples:

- Required fields
- String lengths
- Phone number format
- National ID format
- Date format
- Password requirements
- Allowed enum values
- UUID validation

NestJS DTO validation may be used at the transport layer.

Zod may be used for shared schemas, environment validation, provider payload validation, and database-adjacent validation.

### 14.2 Business Validation

Examples:

- Emergency contact cannot be either parent.
- A student must belong to the authenticated family.
- Parents cannot modify controlled school information.
- Accepted contracts cannot be edited.
- Paid installments cannot be paid again.
- Prices cannot change after contract acceptance.
- Offline payments require admin approval.
- An installment cannot receive partial payments.
- A rejected enrollment must be corrected before resubmission.

Business validation belongs in services, policies, or domain-specific helper functions.

---

## 15. State Transitions

Important entities must use controlled state transitions.

Example enrollment transitions:

```text
draft → submitted
submitted → under_review
under_review → approved
under_review → rejected
rejected → submitted
```

Example contract transitions:

```text
draft → pending_parent_acceptance
pending_parent_acceptance → accepted
pending_parent_acceptance → rejected
accepted → replaced
```

Example offline payment transitions:

```text
pending → awaiting_admin_approval
awaiting_admin_approval → paid
awaiting_admin_approval → rejected
```

State changes must occur through dedicated service methods.

Direct arbitrary status updates must not be exposed through generic endpoints.

---

## 16. Error Handling

The API should use a consistent error format.

```json
{
  "success": false,
  "error": {
    "code": "CONTRACT_ALREADY_ACCEPTED",
    "message": "The accepted contract cannot be modified.",
    "details": null,
    "requestId": "req_..."
  }
}
```

Common error categories:

- Validation errors
- Authentication errors
- Authorization errors
- Not-found errors
- Conflict errors
- State-transition errors
- Payment errors
- External service errors
- Unexpected server errors

Production responses must not expose:

- Stack traces
- SQL queries
- Database credentials
- Internal file paths
- Access tokens
- Provider secrets

---

## 17. API Response Format

Successful single-resource response:

```json
{
  "success": true,
  "data": {
    "id": "..."
  }
}
```

Paginated response:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 120,
    "totalPages": 6
  }
}
```

The response format should remain consistent across all modules.

---

## 18. Security Requirements

The backend must include:

- Secure password hashing
- Rate limiting
- OTP expiration
- OTP attempt limits
- Login attempt protection
- Input validation
- Parameterized SQL through Drizzle
- Secure HTTP headers
- CORS configuration
- Refresh-token rotation
- Hashed refresh-token storage
- Ownership authorization
- Sensitive data masking
- Payment callback verification
- Payment idempotency
- Administrative audit logging
- Secure environment variable management

Passwords, OTP codes, tokens, payment secrets, and complete sensitive records must never be written to application logs.

---

## 19. Contract File Handling

Contracts are generated by the system.

The backend stores:

- Contract database record
- Contract version
- Contract status
- Pricing snapshot
- Contract file metadata
- Private storage key
- Generation timestamp
- Acceptance timestamp

Contract files must be stored privately.

They must not be exposed through permanent public URLs.

The backend must verify authorization before:

- Returning the file
- Generating a temporary signed URL
- Allowing the parent or admin to download it

No parent document upload system is required in the current MVP.

---

## 20. Logging and Monitoring

The backend should generate structured logs for:

- Request failures
- Authentication failures
- Authorization failures
- Enrollment state changes
- Contract state changes
- Payment requests
- Payment callbacks
- Offline payment decisions
- SMS failures
- Scheduled-job failures
- Admin actions
- Unexpected exceptions

Each request should receive a unique request ID.

The request ID should be included in:

- Logs
- Error responses
- Payment-related records where useful
- External integration logs

---

## 21. Testing Strategy

Backend testing should include:

- Unit tests for business rules
- Integration tests for Drizzle repositories
- Database transaction tests
- API endpoint tests
- Authentication tests
- Authorization tests
- Ownership tests
- Contract workflow tests
- Installment generation tests
- Online payment callback tests
- Payment idempotency tests
- Offline payment approval tests
- State-transition tests

Priority workflows:

```text
family registration
phone verification
login
student creation
enrollment submission
admin enrollment approval
manual pricing
contract generation
contract acceptance
installment generation
online payment
offline payment submission
offline payment approval
```

Tests should use a dedicated test database.

Database state should be reset or isolated between test cases.

---

## 22. Configuration Management

Application configuration should be validated at startup.

Required configuration categories include:

- Application environment
- Application port
- PostgreSQL connection
- JWT secrets
- Access-token lifetime
- Refresh-token lifetime
- OTP settings
- SMS provider credentials
- Payment gateway credentials
- Contract storage settings
- CORS origins
- Logging level

The application must fail during startup when critical configuration is missing or invalid.

Secrets must not be committed to the repository.

---

## 23. Recommended Final Backend Architecture

```text
Architecture: Modular Monolith
Runtime: Node.js
Language: TypeScript
Framework: NestJS
API Style: REST
Database: PostgreSQL
ORM: Drizzle ORM
Migrations: Drizzle Kit
Authentication: Username and password
Phone Verification: OTP
Authorization: Role and resource ownership
Access Tokens: JWT
Refresh Tokens: Rotating, hashed, HTTP-only cookie
Validation: NestJS DTO validation and Zod where appropriate
Background Processing: Scheduled jobs without Redis
External Services: Provider interfaces
File Storage: Private contract storage
Testing: Unit, integration, API, and workflow tests
```

This architecture provides:

- Clear module boundaries
- Strong type safety
- Explicit SQL behavior
- Reliable payment and contract workflows
- Maintainable business logic
- Practical MVP development
- A clear path for future system expansion
- No unnecessary microservice or queue complexity
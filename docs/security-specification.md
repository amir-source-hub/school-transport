# Security Specification

## 1. Purpose

This document defines the security requirements for the School Transport Service MVP.

The system stores sensitive parent, student, contract, payment, and administrative information. Security must therefore be implemented from the beginning, even though the current MVP does not yet include advanced route tracking, attendance, driver management, or vehicle management features.

The primary security goals are:

- Protect parent and student personal information.
- Prevent unauthorized access to family, student, contract, and payment records.
- Protect administrative operations.
- Secure authentication and account recovery.
- Prevent payment manipulation and duplicate payment processing.
- Maintain reliable audit and activity records.
- Reduce common web application security risks.
- Protect production infrastructure, credentials, files, and backups.

---

## 2. Security Scope

The current security scope includes:

- Parent authentication.
- Admin authentication.
- Username and password login.
- Primary phone number verification through OTP.
- Password recovery.
- Session and token management.
- Role-based authorization.
- Family and student data ownership checks.
- Enrollment and registration form security.
- Contract access protection.
- Online payment verification.
- Offline payment approval.
- Price and payment schedule protection.
- Audit logging.
- API security.
- Database security.
- File storage security.
- Production deployment security.
- Backup and recovery protection.

---

## 3. Final Security Decisions

The following decisions are approved for the MVP.

### 3.1 Multiple Active Parent Sessions

Parents may remain logged in on multiple devices at the same time.

Examples:

- Mobile phone.
- Home computer.
- Work computer.

Each device must have its own refresh token and session record.

The system must allow all active sessions to be revoked after:

- Password change.
- Suspected account compromise.
- Admin security action.
- Parent request.

A future account-security page may allow parents to view and revoke individual sessions. This is not mandatory for the first MVP release.

### 3.2 Admin Two-Factor Authentication

Two-factor authentication is mandatory for admin accounts.

The admin login process should use:

1. Username and password.
2. OTP sent to the admin's verified phone number.

This is required because admins can:

- Access parent and student information.
- Approve registrations.
- Set prices.
- Generate contracts.
- Confirm offline payments.
- View payment and contract records.
- Modify important system statuses.

### 3.3 Inactivity Logout

Automatic logout after inactivity is required.

Recommended session behavior:

- Parent access token: approximately 15 minutes.
- Parent refresh session: up to 30 days.
- Admin access token: approximately 10 minutes.
- Admin refresh session: up to 8 hours.
- Admin session should expire after prolonged inactivity.
- Sensitive admin actions may require re-authentication.

The exact token duration must be configurable through environment variables.

### 3.4 Primary Phone Number Change

Changing the primary phone number requires verification of both numbers when possible.

Recommended process:

1. Verify the current password.
2. Send OTP to the existing primary phone number.
3. Send OTP to the new phone number.
4. Confirm both codes.
5. Replace the primary phone number.
6. Invalidate active sessions.
7. Record the change in the audit log.

If the user no longer has access to the old phone number, the change must require admin-assisted identity verification.

### 3.5 Parent Session Management

Parents should eventually be able to view and revoke active sessions.

For the MVP:

- The backend must store sessions separately.
- The backend must support revoking all sessions.
- A full session-management screen is optional.
- Password changes must revoke all existing sessions except the current recovery session.

This approach keeps the backend ready for future account-security features without increasing the first release scope unnecessarily.

### 3.6 Offline Payment Approval

One authorized admin is sufficient to approve or reject an offline payment in the MVP.

Each approval must record:

- Admin identity.
- Payment record.
- Expected amount.
- Confirmed amount.
- Payment date.
- Approval date and time.
- Payment reference or receipt number when available.
- Optional admin note.
- Previous payment status.
- New payment status.

A second-admin approval workflow is not required for the current MVP.

### 3.7 Audit Log Visibility

Audit logs should be visible inside the admin panel.

Access should be restricted to authorized admins.

The MVP audit interface should support:

- Viewing recent actions.
- Filtering by admin.
- Filtering by action type.
- Filtering by date.
- Searching by family, student, contract, or payment reference.
- Viewing previous and new values when appropriate.

Audit logs must be read-only from the admin panel.

### 3.8 Data Retention

Recommended retention rules:

- Parent and student account data: retained while the account or service relationship is active.
- Completed service records: retained for at least 5 years.
- Contracts: retained for at least 10 years.
- Payment and financial records: retained for at least 10 years.
- Audit logs: retained for at least 5 years.
- OTP records: deleted or anonymized shortly after expiration.
- Expired password-reset records: deleted after a short retention period.
- Revoked session records: retained temporarily for security investigation, then deleted.
- Application logs: retained for 30 to 90 days depending on production needs.
- Backups: retained according to the backup rotation policy.

Data deletion must not remove records that must be preserved for contractual, financial, dispute-resolution, or legal reasons.

---

## 4. Authentication Security

The system uses username and password authentication for parent and admin accounts.

### 4.1 Password Storage

Passwords must never be stored in plain text.

Recommended hashing algorithm:

- Argon2id.

bcrypt may be used if Argon2id is unavailable, but Argon2id is preferred.

Each password hash must use:

- A unique random salt.
- Secure cost parameters.
- Server-side password hashing.
- No reversible encryption.

### 4.2 Password Requirements

Minimum requirements:

- At least 8 characters.
- At least one letter.
- At least one number.
- Maximum length limit to prevent abuse.
- Common and easily guessed passwords should be rejected.

Admin accounts should use stronger password requirements than parent accounts.

Recommended admin minimum:

- At least 12 characters.
- Combination of letters, numbers, and symbols.

### 4.3 Login Protection

Login endpoints must include:

- Rate limiting.
- Temporary lockout after repeated failed attempts.
- Generic error messages.
- Secure logging of failed attempts.
- IP and account-based protection.
- CAPTCHA or additional verification only if abuse becomes significant.

The system must not reveal whether a username exists.

Unsafe response:

```text
Username does not exist.
```

Recommended response:

```text
Invalid username or password.
```

### 4.4 Password Reset

Password reset should use the verified primary phone number.

The reset process must:

1. Accept the username or primary phone number.
2. Return a generic response.
3. Generate a secure OTP.
4. Send the OTP to the verified primary phone number.
5. Limit OTP verification attempts.
6. Require a new password.
7. Invalidate the OTP after successful use.
8. Invalidate previous account sessions.
9. Record the action in the audit log.

---

## 5. OTP Security

OTP verification is required for:

- Primary phone number verification.
- Password recovery.
- Admin two-factor authentication.
- Primary phone number changes.
- Other highly sensitive actions where necessary.

### 5.1 OTP Rules

OTP codes must:

- Be generated using a cryptographically secure random generator.
- Expire after approximately 2 to 5 minutes.
- Be valid for one successful use only.
- Have limited verification attempts.
- Have limited resend frequency.
- Be invalidated when a new OTP is generated.
- Never be stored permanently in plain text.
- Never appear in logs.
- Never be included in API responses.

### 5.2 OTP Abuse Prevention

Rate limiting should apply based on:

- Phone number.
- Account ID.
- IP address.
- Endpoint.
- Device or session where practical.

Recommended controls:

- Maximum resend count per time window.
- Cooldown between OTP requests.
- Maximum verification attempts.
- Temporary blocking after repeated failures.

---

## 6. Session and Token Security

Because the frontend and backend are separate applications, secure token-based authentication should be used.

### 6.1 Recommended Token Model

Use:

- Short-lived access tokens.
- Rotating refresh tokens.
- Server-side session records.

Access tokens should be sent in the authorization header.

Refresh tokens should be stored in secure cookies.

### 6.2 Cookie Security

Authentication cookies must use:

- `HttpOnly`.
- `Secure`.
- `SameSite=Lax` or stricter when possible.
- Restricted path.
- Appropriate expiration.
- Production-only secure transmission.

Sensitive authentication tokens must not be stored in `localStorage`.

### 6.3 Refresh Token Rotation

Each refresh operation should:

1. Validate the current refresh token.
2. Confirm the session is active.
3. Revoke the current refresh token.
4. Issue a new refresh token.
5. Update the session record.
6. Detect reuse of an already revoked token.

Refresh token reuse may indicate token theft and should trigger session revocation.

### 6.4 Logout

Logout must:

- Revoke the active refresh token.
- Remove authentication cookies.
- Mark the server-side session as revoked.
- Prevent further token refresh.

The system should support:

- Logout from the current device.
- Logout from all devices.

---

## 7. Authorization and Access Control

Authentication confirms identity. Authorization confirms permission.

The backend must enforce authorization for every protected operation.

### 7.1 Current Roles

The current roles are:

- Parent.
- Admin.

### 7.2 Parent Permissions

Parents may:

- View and edit allowed family information.
- View their registered students.
- Submit student registrations.
- View registration status.
- View assigned prices.
- Review and accept contracts.
- View payment schedules.
- Complete online payments.
- Submit offline payment details.
- View their own payment records.
- View their own notifications.

Parents must not:

- Access another family's information.
- Access another student's information.
- Change authoritative prices.
- Approve registrations.
- Approve payments.
- Change payment success status.
- Modify accepted contracts.
- Access audit logs.
- Access admin endpoints.

### 7.3 Admin Permissions

Admins may:

- Review parent and student registrations.
- Approve or reject registrations.
- Set proposed service prices.
- Generate contracts.
- Review accepted contracts.
- Confirm or reject offline payments.
- View online payment verification results.
- View system notifications and audit logs.
- Perform approved administrative actions.

### 7.4 Resource Ownership Validation

Every resource request must verify ownership.

For example:

```http
GET /students/:studentId
```

The backend must confirm that:

- The authenticated parent belongs to the family that owns the student, or
- The authenticated user is an authorized admin.

Changing a URL parameter or request body ID must never allow access to another family's data.

Frontend visibility rules are not sufficient security.

---

## 8. Parent and Student Data Protection

The system stores sensitive information including:

- Parent names.
- Parent national ID codes.
- Student details.
- Parent phone numbers.
- Addresses.
- School information.
- Emergency contact information.
- Contracts.
- Prices.
- Payment records.

### 8.1 Data Minimization

Only data required for the current service should be collected.

The API should return only fields required by the current page or operation.

Examples:

- Do not return full national ID codes when a masked value is enough.
- Do not expose internal security fields.
- Do not include password hashes or session records.
- Do not expose unrelated family members' data.

### 8.2 Sensitive Field Handling

Sensitive values should be:

- Masked where full display is unnecessary.
- Excluded from logs.
- Protected through authorization.
- Avoided in URLs.
- Protected in exports and reports.

Examples:

```text
National ID: 123******7
Phone: 09*******42
```

### 8.3 Environment Separation

The project must use separate environments:

- Development.
- Testing.
- Staging if introduced.
- Production.

Real parent and student data must not be copied into local development or test environments.

---

## 9. Input Validation

Every input must be validated on both the frontend and backend.

Frontend validation improves usability.

Backend validation provides security and is mandatory.

### 9.1 Inputs Requiring Validation

Validation must cover:

- Username.
- Password.
- Parent information.
- Student information.
- National ID codes.
- Phone numbers.
- Addresses.
- School values.
- Emergency contact information.
- Enrollment forms.
- Contract actions.
- Prices.
- Installment values.
- Payment identifiers.
- Payment amounts.
- Status values.
- Admin notes.
- Query parameters.
- Path parameters.
- Uploaded or generated file metadata.

### 9.2 Validation Rules

The backend should:

- Reject unexpected fields.
- Apply maximum lengths.
- Validate required fields.
- Validate enums.
- Validate dates.
- Normalize phone numbers.
- Normalize national ID values.
- Reject invalid status transitions.
- Reject negative or impossible amounts.
- Validate ownership-related identifiers.
- Reject values calculated only by the frontend.

The frontend must never be the authoritative source for:

- Final price.
- Contract total.
- Installment amount.
- Payment success.
- Registration approval.
- Contract acceptance timestamp.
- Offline payment approval.

### 9.3 Shared Schemas

Shared validation schemas may be used between frontend and backend where appropriate.

Recommended options include:

- Zod.
- Valibot.
- Equivalent TypeScript validation libraries.

Backend validation must still remain independently enforced.

---

## 10. Database Query Security

Drizzle ORM should be used for database access.

### 10.1 SQL Injection Prevention

Rules:

- Use Drizzle query builders.
- Use parameterized queries.
- Avoid SQL string concatenation.
- Review all raw SQL manually.
- Never insert untrusted values directly into raw SQL.
- Validate and normalize inputs before database queries.

Unsafe example:

```ts
const query = `SELECT * FROM users WHERE username = '${username}'`;
```

Recommended approach:

```ts
await db.select().from(users).where(eq(users.username, username));
```

### 10.2 Database-Level Constraints

Security and integrity should also be supported through database constraints.

Examples:

- Unique usernames.
- Unique active transaction references.
- Unique payment verification keys.
- Foreign keys.
- Non-negative payment amounts.
- Valid status values.
- Required ownership relationships.

---

## 11. Cross-Site Scripting Protection

To reduce XSS risks:

- Render user input as plain text by default.
- Escape displayed values.
- Avoid unsafe HTML rendering.
- Do not use raw HTML injection unless necessary.
- Sanitize rich text if introduced later.
- Validate external URLs.
- Apply Content Security Policy.
- Keep sensitive tokens inaccessible to JavaScript.
- Avoid embedding untrusted scripts.

The current MVP should not include unrestricted rich-text editing.

---

## 12. CSRF Protection

Because refresh tokens may be stored in cookies, CSRF protection is required.

Recommended protections:

- Use `SameSite` cookies.
- Validate the request origin.
- Validate the referrer where appropriate.
- Use CSRF tokens for sensitive cookie-authenticated actions when necessary.
- Reject requests from unauthorized origins.
- Avoid permissive CORS.
- Use non-cookie access tokens for normal API authorization.

Sensitive actions include:

- Changing account information.
- Changing the primary phone number.
- Accepting a contract.
- Submitting offline payment confirmation.
- Admin approvals.
- Password changes.
- Session revocation.

---

## 13. CORS Configuration

The API must accept browser requests only from approved frontend domains.

Production CORS must:

- Use an explicit allowlist.
- Never use `*` with credentials.
- Allow only required HTTP methods.
- Allow only required headers.
- Reject unknown origins.
- Separate development origins from production origins.
- Avoid reflecting arbitrary request origins.

Example production origins:

```text
https://example.com
https://admin.example.com
```

Local development origins must not remain enabled in production.

---

## 14. Rate Limiting and Abuse Prevention

Rate limiting should be applied to:

- Login.
- Registration.
- OTP request.
- OTP verification.
- Password reset.
- Admin login.
- Payment initiation.
- Payment verification.
- Payment callbacks.
- Offline payment submissions.
- Contact forms.
- Repeated enrollment submissions.
- Expensive search or report endpoints.

Limits may be based on:

- IP address.
- Username.
- Phone number.
- Account ID.
- Session.
- Endpoint.
- Combination of multiple values.

The rate-limit response should not expose sensitive system details.

---

## 15. Online Payment Security

The system must not store bank card information.

Online payments must be processed through the selected payment provider.

### 15.1 Server-Side Verification

The frontend payment result is not trusted.

A payment becomes successful only after the backend:

1. Receives the payment return or callback.
2. Locates the internal payment record.
3. Validates the expected amount.
4. Validates the payment provider reference.
5. Calls the provider's verification API.
6. Confirms successful verification.
7. Updates the payment atomically.
8. Records the transaction reference.
9. Creates an audit record.
10. Returns the final result to the frontend.

### 15.2 Idempotency

Payment initiation and verification must be idempotent.

The system must prevent:

- Duplicate payment records.
- Duplicate successful verification.
- Repeated callback side effects.
- Double payment for the same installment.
- Multiple success updates from retries.

Recommended controls:

- Unique internal payment ID.
- Idempotency key.
- Unique gateway transaction reference.
- Database transaction.
- Row-level locking where necessary.
- Unique database constraint.

### 15.3 Payment Amount Protection

The backend must calculate the authoritative payment amount from:

- Accepted contract.
- Payment schedule.
- Current installment.
- Existing successful payments.

The frontend may display the amount but must not decide it.

### 15.4 Payment Data Storage

Store only necessary information such as:

- Internal payment ID.
- Contract ID.
- Installment ID.
- Expected amount.
- Verified amount.
- Gateway name.
- Gateway transaction reference.
- Payment status.
- Verification timestamp.
- Failure reason.
- Request correlation ID.

Do not store:

- Card number.
- CVV.
- Bank password.
- OTP from the bank.
- Sensitive gateway credentials.

---

## 16. Offline Payment Security

Offline payments require admin review.

### 16.1 Parent Submission

Parents may submit:

- Selected installment.
- Payment date.
- Payment method.
- Reference number.
- Optional note.
- Receipt information if receipt uploads are added later.

Parent submission status should initially be:

```text
Pending Review
```

### 16.2 Admin Approval

Only authorized admins can:

- Approve the offline payment.
- Reject the offline payment.
- Request correction.

Approval must confirm:

- Payment belongs to the correct family.
- Payment belongs to the correct contract.
- Payment belongs to the correct installment.
- Amount is correct.
- Reference is acceptable.
- Payment is not already completed.

### 16.3 Approval History

Offline payment approval must record:

- Acting admin.
- Previous status.
- New status.
- Expected amount.
- Confirmed amount.
- Date and time.
- Admin note.
- Reference information.

Approved offline payments must not be silently edited.

Corrections should create a new adjustment or status-history record.

---

## 17. Price and Contract Security

The admin may change the proposed price before contract acceptance.

After acceptance:

- The contract price becomes immutable.
- The payment schedule becomes immutable except through a replacement contract.
- Existing contract content must not be overwritten.
- A new price requires a new contract version.
- Previous contracts must remain available.
- Price history must be retained.
- Contract acceptance must be timestamped.
- The accepting parent account must be recorded.
- Accepted terms must be preserved exactly.

The frontend must not submit an authoritative contract total.

---

## 18. Contract File Security

Generated contract documents contain sensitive information.

### 18.1 Storage Rules

Contracts should be stored using:

- Private object storage, or
- Protected backend file routes.

File names and storage keys must not expose:

- Parent national ID.
- Student national ID.
- Full parent name.
- Full student name.
- Phone number.

Use randomly generated storage keys.

### 18.2 Access Rules

Parents may access only contracts belonging to their own family.

Admins may access contracts according to their permissions.

Contract URLs must not be publicly guessable.

Recommended delivery methods:

- Authorized backend download.
- Short-lived signed URL.
- Expiring access token.

### 18.3 File Validation

Generated or uploaded files must have:

- Allowed file types.
- Maximum file size.
- Safe file names.
- Valid MIME type.
- Malware scanning if external uploads are introduced later.

---

## 19. Admin Panel Security

The admin panel requires stronger controls than the parent panel.

### 19.1 Required Controls

- Separate admin authorization checks.
- Mandatory admin two-factor authentication.
- Strong password policy.
- Shorter session lifetime.
- Rate-limited login.
- Audit logs.
- Secure logout.
- Session revocation.
- Re-authentication for critical actions where appropriate.
- Restricted admin account creation.
- Immediate deactivation of former employee accounts.

### 19.2 Sensitive Admin Actions

Sensitive actions include:

- Registration approval.
- Registration rejection.
- Price assignment.
- Price modification.
- Contract generation.
- Contract replacement.
- Offline payment approval.
- Offline payment rejection.
- Payment correction.
- Account suspension.
- Admin account management.
- Data export.
- Audit log access.

### 19.3 Re-Authentication

The system may require recent authentication before:

- Changing another admin account.
- Exporting sensitive data.
- Replacing accepted contract data.
- Reversing a payment status.
- Changing critical system settings.

---

## 20. Audit Logging

Audit logs are required for accountability and investigation.

### 20.1 Audit Log Fields

Each audit record should include:

- Audit ID.
- Acting user ID.
- Acting role.
- Action type.
- Target resource type.
- Target resource ID.
- Previous value where appropriate.
- New value where appropriate.
- Date and time.
- Request ID or correlation ID.
- IP address where appropriate.
- User agent where appropriate.
- Result status.
- Optional reason or note.

### 20.2 Actions to Audit

Audit-worthy actions include:

- Successful login.
- Failed login.
- Password reset.
- Password change.
- OTP verification.
- Phone number change.
- Session revocation.
- Registration submission.
- Registration approval.
- Registration rejection.
- Price assignment.
- Price modification.
- Contract generation.
- Contract acceptance.
- Contract replacement.
- Payment initiation.
- Payment verification.
- Payment failure.
- Offline payment submission.
- Offline payment approval.
- Offline payment rejection.
- Important personal information changes.
- Admin account creation.
- Admin account deactivation.
- Sensitive data export.

### 20.3 Audit Log Protection

Audit logs must:

- Be read-only from the admin interface.
- Be protected from normal application users.
- Be retained according to the retention policy.
- Avoid storing secrets.
- Avoid storing passwords.
- Avoid storing OTP values.
- Avoid storing access or refresh tokens.
- Avoid storing full banking data.

---

## 21. Logging and Error Handling

Production logging should support debugging without exposing sensitive information.

### 21.1 Data That Must Not Be Logged

Do not log:

- Passwords.
- Password hashes.
- Access tokens.
- Refresh tokens.
- OTP codes.
- Full payment credentials.
- Full national ID values unless strictly necessary.
- Database connection strings.
- Secret keys.
- Full authentication cookies.

### 21.2 Safe Logging

Logs may include:

- Request ID.
- Endpoint.
- Response status.
- Processing duration.
- User ID.
- Admin ID.
- Internal resource ID.
- Masked phone number.
- Masked national ID.
- Payment reference.
- Error category.

### 21.3 Error Responses

Client-facing errors must:

- Be clear enough for the user.
- Avoid stack traces.
- Avoid database details.
- Avoid internal service names.
- Avoid revealing whether an account exists.
- Use consistent error codes.

Detailed errors should remain in protected server logs.

---

## 22. Database Security

### 22.1 Database Access

The application must use a dedicated database user.

The application database user must:

- Have only required permissions.
- Not be a database superuser.
- Not have unnecessary schema-management permissions in runtime.
- Use a strong password.
- Use encrypted connections when remote.

### 22.2 Network Protection

The database should:

- Not be publicly accessible.
- Accept connections only from approved services.
- Run inside a private network where possible.
- Use firewall restrictions.
- Use secure cloud security groups if hosted remotely.

### 22.3 Migration Security

Schema changes should use reviewed migrations.

Avoid:

- Manual production changes.
- Untracked SQL changes.
- Destructive migrations without backups.
- Running development seeds in production.

### 22.4 Backups

Database backups must be:

- Automated.
- Encrypted where possible.
- Access-restricted.
- Stored separately from the main database.
- Tested through restoration.
- Retained through a documented rotation policy.

---

## 23. Secrets Management

Secrets include:

- Database credentials.
- JWT signing keys.
- Refresh token secrets.
- OTP provider credentials.
- Payment provider credentials.
- Email provider credentials.
- Storage credentials.
- Encryption keys.
- Admin bootstrap credentials.

### 23.1 Rules

- Never commit secrets to Git.
- Use environment variables or a secrets manager.
- Keep `.env.example` free of real values.
- Use separate secrets per environment.
- Rotate exposed credentials immediately.
- Restrict production secret access.
- Do not print secrets in CI, build, or deployment logs.
- Use long, randomly generated secrets.
- Do not share production credentials through chat or documentation.

---

## 24. API Security

The API must apply security controls consistently.

Required controls:

- Authentication on protected endpoints.
- Authorization on every resource operation.
- Input validation.
- Request body size limits.
- Rate limiting.
- Secure headers.
- Origin checks.
- Consistent error responses.
- API versioning strategy.
- Disabled debug endpoints in production.
- Restricted production API documentation.
- Pagination limits.
- Safe file downloads.
- Safe status transitions.
- Correlation IDs.

The API should reject unknown fields where appropriate.

---

## 25. Security Headers

The frontend, backend, and reverse proxy should configure security headers.

Recommended headers:

- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Permissions-Policy`
- `Cross-Origin-Opener-Policy`
- `Cross-Origin-Resource-Policy`
- CSP `frame-ancestors`

Legacy `X-Frame-Options` may also be used where needed.

---

## 26. HTTPS and Transport Security

Production traffic must use HTTPS.

Requirements:

- Redirect HTTP to HTTPS.
- Use valid TLS certificates.
- Enable HSTS after confirming HTTPS configuration.
- Do not send credentials through insecure connections.
- Use secure cookies.
- Use encrypted communication with payment, SMS, email, storage, and database services.

---

## 27. Dependency Security

The project depends on third-party packages.

Required practices:

- Use lockfiles.
- Review high-severity vulnerabilities.
- Keep dependencies updated.
- Remove unused packages.
- Avoid unmaintained libraries.
- Minimize authentication and cryptography dependencies.
- Review major upgrades.
- Run dependency audits.
- Pin or constrain critical package versions appropriately.

Security updates should be prioritized over normal feature updates.

---

## 28. Backup and Recovery Security

Security includes protection from accidental deletion, corruption, and infrastructure failure.

The system should include:

- Automated database backups.
- Contract-file backups.
- Backup encryption.
- Restricted access.
- Multiple retention periods.
- Restore testing.
- Recovery documentation.
- Separate backup storage.
- Backup monitoring.

Recommended rotation:

- Daily backups for 14 days.
- Weekly backups for 8 weeks.
- Monthly backups for 12 months.

Financial and contract archives may require longer retention.

---

## 29. Data Retention and Deletion

Data retention must balance operational, contractual, financial, and privacy requirements.

### 29.1 Recommended Retention

| Data Type | Recommended Retention |
|---|---:|
| Active parent and student data | While service relationship is active |
| Completed service records | At least 5 years |
| Contracts | At least 10 years |
| Payment records | At least 10 years |
| Audit logs | At least 5 years |
| OTP records | Delete shortly after expiration |
| Password-reset records | Delete after expiration and short security retention |
| Revoked sessions | Temporary security retention |
| Application logs | 30 to 90 days |
| Backups | According to backup rotation |

### 29.2 Account Deletion

Parent account deletion should not automatically remove:

- Accepted contracts.
- Payment records.
- Financial records.
- Audit logs.
- Records needed for disputes or legal obligations.

Where full deletion is not allowed, unnecessary personal fields may be anonymized after the required retention period.

---

## 30. Security Testing

The following tests are required before production release.

### 30.1 Authentication Tests

- Invalid username or password.
- Repeated failed logins.
- Account lockout.
- OTP expiration.
- OTP reuse.
- OTP resend limits.
- Password reset.
- Session revocation.
- Refresh token rotation.
- Revoked token reuse.
- Admin two-factor authentication.

### 30.2 Authorization Tests

- Parent accessing another family's data.
- Parent accessing another student's data.
- Parent changing URL IDs.
- Parent calling admin endpoints.
- Parent modifying price.
- Parent changing payment status.
- Parent accessing audit logs.
- Admin accessing restricted actions without correct permission.

### 30.3 Payment Tests

- Duplicate payment initiation.
- Duplicate callback.
- Duplicate verification.
- Amount mismatch.
- Invalid transaction reference.
- Already paid installment.
- Concurrent payment attempts.
- Failed gateway verification.
- Offline payment double approval.
- Offline payment approval after online success.

### 30.4 Input Security Tests

- SQL injection payloads.
- XSS payloads.
- Invalid phone numbers.
- Invalid national ID values.
- Oversized request bodies.
- Unexpected fields.
- Invalid status transitions.
- Negative payment values.
- Manipulated contract amounts.
- Unauthorized file access.

### 30.5 Infrastructure Tests

- HTTPS enforcement.
- Secure cookies.
- CORS restrictions.
- Security headers.
- Database network restrictions.
- Backup creation.
- Backup restoration.
- Production error masking.
- Secret exposure checks.

---

## 31. Security Incident Response

The MVP should include a basic incident-response process.

When suspicious activity or a confirmed breach occurs:

1. Record the incident.
2. Identify affected accounts and systems.
3. Revoke affected sessions.
4. Rotate exposed credentials.
5. Disable compromised admin accounts.
6. Preserve relevant logs.
7. Investigate unauthorized actions.
8. Restore affected data if necessary.
9. Notify responsible project stakeholders.
10. Document corrective actions.

The system should support immediate revocation of:

- Parent sessions.
- Admin sessions.
- Refresh tokens.
- Payment provider credentials.
- SMS provider credentials.
- Storage credentials.
- Database credentials.

---

## 32. MVP Security Priorities

The following controls are mandatory for the first production release:

1. Argon2id password hashing.
2. Primary phone number OTP verification.
3. Mandatory admin two-factor authentication.
4. Secure access and refresh token handling.
5. Refresh token rotation.
6. Parent and admin session revocation.
7. Backend authorization for every protected resource.
8. Family and student ownership checks.
9. Strict input validation.
10. HTTPS.
11. Restricted CORS.
12. Rate limiting for authentication and OTP endpoints.
13. Secure online payment verification.
14. Payment idempotency.
15. Admin-only offline payment approval.
16. Immutable accepted contract values.
17. Protected contract files.
18. Audit logs for important actions.
19. Sanitized production logs.
20. Secure environment variables and secrets.
21. Database least-privilege access.
22. Automated backups.
23. Secure error handling.
24. Basic security testing before release.

---

## 33. Deferred Security Features

The following features may be added after the MVP:

- Parent-facing active session management.
- Device recognition.
- Login alerts.
- Risk-based authentication.
- Hardware security keys for admins.
- Advanced admin permission levels.
- Dual-admin approval for highly sensitive financial actions.
- Automated anomaly detection.
- Advanced fraud monitoring.
- Dedicated security monitoring dashboard.
- Automated secret rotation.
- Web Application Firewall.
- Centralized SIEM integration.
- Advanced file malware scanning.
- Formal penetration testing program.
- Privacy self-service tools.
- Automated data anonymization workflows.

These deferred features must not reduce the mandatory MVP protections defined in this document.

---

## 34. Acceptance Criteria

The security implementation is accepted when:

- Passwords are securely hashed.
- Parent primary phone numbers are OTP verified.
- Admin two-factor authentication is active.
- Parents cannot access other families' records.
- Admin routes are protected on the backend.
- Access and refresh token handling is secure.
- Refresh tokens rotate and can be revoked.
- Login and OTP endpoints are rate-limited.
- Input is validated on the backend.
- Online payments are verified server-side.
- Duplicate payment processing is prevented.
- Offline payments require admin approval.
- Accepted contract prices cannot be modified.
- Contract files require authorization.
- Important actions create audit records.
- Production logs do not expose secrets.
- CORS allows only approved origins.
- HTTPS is enforced.
- Database credentials are protected.
- Backups are automated and restorable.
- Critical security tests pass before release.
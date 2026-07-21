# Deployment Specification

## 1. Overview

The school transport service should be deployed using a simple but professional production architecture that supports the separated frontend and backend applications.

The deployment approach should remain manageable for the MVP while allowing the system to grow without requiring a complete infrastructure redesign.

The recommended production stack includes:

- Next.js frontend
- Node.js backend API
- PostgreSQL
- Redis
- Object storage
- Reverse proxy
- Docker and Docker Compose
- Automated database backups
- External SMS and payment services

Kubernetes and other complex orchestration platforms are not required for the MVP.

---

## 2. Recommended Deployment Architecture

```text
Users
  │
  ▼
Reverse Proxy / HTTPS
  │
  ├── Web Application
  │     Next.js
  │
  └── Backend API
        Node.js
        │
        ├── PostgreSQL
        ├── Redis
        ├── Object Storage
        ├── SMS Provider
        └── Payment Gateway
```

The reverse proxy receives incoming requests and routes them to the appropriate application service.

The backend communicates with the database, Redis, object storage, SMS provider, and payment gateway through secure server-side connections.

---

## 3. Containerization

All deployable application services should use Docker.

Recommended containers:

```text
web
api
postgres
redis
reverse-proxy
```

Object storage may be provided through:

- An external S3-compatible service
- A locally hosted MinIO instance
- A storage service supplied by the hosting provider

Docker provides:

- Consistent development and production environments
- Easier server configuration
- Service isolation
- Independent frontend and backend deployment
- Simpler rollback
- Repeatable deployments

A production Docker Compose configuration is sufficient for the MVP.

---

## 4. Initial Server Strategy

The initial production system can be deployed on one reliable virtual private server.

Recommended starting resources:

- 4 CPU cores
- 8 GB RAM
- 80–120 GB SSD storage
- Linux operating system
- Separate backup storage

The following services may initially run on the same server in isolated containers:

- Frontend
- Backend API
- PostgreSQL
- Redis
- Reverse proxy

The deployment structure should allow PostgreSQL, Redis, object storage, or the backend to be moved to separate servers later if usage increases.

---

## 5. Environments

At least two deployment environments should be maintained.

### 5.1 Staging

The staging environment is used for:

- Final feature testing
- Payment gateway sandbox testing
- SMS testing
- Database migration verification
- Admin acceptance testing
- Deployment validation

### 5.2 Production

The production environment is used by real parents, administrators, and employees.

Staging and production must use separate:

- Databases
- Environment variables
- Payment credentials
- SMS credentials
- Storage locations
- Application URLs

Development data must not be copied directly into production without review and sanitization.

---

## 6. Domain Structure

A possible production domain structure is:

```text
example.com             Public and parent-facing web application
api.example.com         Backend API
admin.example.com       Optional dedicated admin entry point
```

Because the public, parent, and admin interfaces can exist inside the same frontend application, a dedicated admin subdomain is optional.

The recommended MVP structure is:

```text
example.com
example.com/parent
example.com/admin
api.example.com
```

This structure is simpler to manage and is sufficient for the current system.

---

## 7. Reverse Proxy and HTTPS

Use Caddy or Nginx as the reverse proxy.

Caddy is recommended for the MVP because it provides simple automatic HTTPS configuration.

The reverse proxy should:

- Terminate HTTPS connections
- Redirect HTTP requests to HTTPS
- Route web requests to the frontend
- Route API requests to the backend
- Apply request-size limits
- Apply security headers
- Support rate limiting
- Hide internal container ports

Only ports `80` and `443` should normally be publicly accessible.

PostgreSQL and Redis must never be exposed directly to the internet.

---

## 8. Environment Variables and Secrets

Production credentials and secrets must remain outside the source code.

Example variables:

```env
DATABASE_URL=
REDIS_URL=
SESSION_SECRET=
JWT_SECRET=
SMS_API_KEY=
PAYMENT_GATEWAY_KEY=
PAYMENT_CALLBACK_SECRET=
OBJECT_STORAGE_ACCESS_KEY=
OBJECT_STORAGE_SECRET_KEY=
```

Rules:

- Never commit `.env` files
- Provide `.env.example` files without real credentials
- Use different secrets in staging and production
- Rotate compromised credentials immediately
- Restrict production credentials to authorized administrators
- Never expose server-only environment variables to the frontend
- Use long, randomly generated secrets

---

## 9. Database Deployment

PostgreSQL should use:

- Persistent Docker volumes
- Restricted private network access
- Strong credentials
- Automated backups
- Controlled migrations
- Health checks
- Connection limits

Database migrations should run as a controlled deployment step.

Recommended migration process:

```text
Create database backup
        ↓
Deploy backend image
        ↓
Run Drizzle migrations
        ↓
Verify migration result
        ↓
Start or restart application
        ↓
Run health checks
```

Migration files should be:

- Generated during development
- Reviewed before deployment
- Committed to the repository
- Applied intentionally in production

The application must not generate uncontrolled schema changes during normal runtime.

---

## 10. Redis Deployment

Redis may be used for:

- Rate limiting
- OTP expiration
- Short-lived session data
- Temporary locks
- Payment processing locks
- Cached data

Redis should:

- Run inside the private Docker network
- Require authentication where supported
- Use persistent storage when necessary
- Have memory limits
- Use an appropriate eviction policy
- Never be publicly accessible

Redis must not be treated as the primary permanent database.

---

## 11. Contract and File Storage

Generated contracts and uploaded files must not be stored only inside application containers because containers may be replaced during deployment.

Persistent object storage should be used for:

- Generated contracts
- Contract snapshots
- Public website images
- Banners and backgrounds
- Future uploaded documents
- Other generated files

The database should store:

- File name
- Storage key
- MIME type
- File size
- Ownership information
- Related entity identifiers
- Creation date

Large binary files should not be stored directly inside PostgreSQL.

Private contracts should only be accessible through:

- Authenticated backend requests
- Authorization checks
- Temporary signed URLs

---

## 12. Deployment Workflow

The recommended deployment workflow is:

```text
Approved changes are pushed
        ↓
Tests and builds run
        ↓
Docker images are created
        ↓
Images are transferred or pulled
        ↓
Database backup is created
        ↓
Database migrations are executed
        ↓
New containers are started
        ↓
Health checks are performed
        ↓
Deployment is accepted or rolled back
```

For the MVP, deployment may be started manually by an authorized developer.

Even when deployment is manual, the process must be:

- Documented
- Repeatable
- Versioned
- Reversible

---

## 13. Health Checks

Each critical service should provide a health check.

### 13.1 Frontend Health Check

The frontend health check confirms that the web application is running and responding.

### 13.2 API Health Check

Example endpoint:

```http
GET /health
```

The API health check may verify:

- API process status
- Database connection
- Redis connection
- Required configuration availability

The public health endpoint must not reveal sensitive infrastructure information.

### 13.3 Container Health Checks

Docker should monitor:

- Web
- API
- PostgreSQL
- Redis
- Reverse proxy

A failed dependency must not silently leave the application operating in an unreliable state.

---

## 14. Monitoring and Logging

The MVP requires basic production monitoring.

Monitor:

- Application uptime
- API errors
- HTTP response times
- Failed payment callbacks
- Failed SMS messages
- Database connectivity
- Server CPU usage
- Server memory usage
- Disk usage
- Container restarts
- Backup completion

Logs should include:

- Timestamp
- Environment
- Service name
- Log level
- Request or correlation ID
- Safe contextual information
- Error message
- Stack trace where appropriate

Logs must never contain:

- Passwords
- OTP values
- Authentication tokens
- Full payment credentials
- Complete national ID codes
- Sensitive contract content

Production logs should be structured and searchable.

---

## 15. Backup Strategy

Backups are essential because the system stores:

- Parent information
- Student information
- Contracts
- Payment records
- Installment schedules
- Administrative decisions

### 15.1 PostgreSQL Backups

Recommended policy:

- Automated daily backups
- Additional backup before important migrations
- Retention of at least 14–30 days
- Encrypted backup storage
- Backup storage separate from the main server

### 15.2 Object Storage Backups

Object storage should use:

- Regular file backups
- Versioning where supported
- A separate backup location
- Periodic integrity checks

### 15.3 Configuration Backups

Securely preserve:

- Docker Compose files
- Reverse proxy configuration
- Environment variable templates
- Migration files
- Deployment scripts
- Infrastructure documentation

Backup restoration should be tested periodically.

A backup that has never been restored should not be considered fully reliable.

---

## 16. Rollback Strategy

Every deployment must have a rollback path.

Rollback options may include:

- Restarting the previous Docker image
- Restoring the previous application configuration
- Reverting a compatible migration
- Restoring the database from backup when necessary

Docker images should use identifiable version tags.

Example:

```text
school-transport-web:1.0.0
school-transport-api:1.0.0
```

The deployment process should not rely only on the `latest` tag because this makes auditing and rollback difficult.

Database migrations should preferably be backward-compatible during application rollout.

---

## 17. Payment Deployment Considerations

The online payment callback must use a stable HTTPS URL.

Example:

```text
https://api.example.com/payments/callback
```

The production payment integration should:

- Verify callbacks on the backend
- Confirm transactions with the payment provider
- Use idempotency protection
- Prevent duplicate successful payment records
- Store gateway transaction references
- Log callback failures safely
- Support admin reconciliation
- Never trust payment success information from the frontend

Sandbox and production payment credentials must remain separate.

Payment callbacks must remain available even if the parent closes the browser after payment.

---

## 18. SMS Deployment Considerations

The SMS integration should support:

- OTP delivery
- Registration updates
- Payment confirmations
- Installment due-date reminders
- Administrative warnings

The deployed system should:

- Use approved provider templates
- Store provider message identifiers
- Record delivery or failure status where available
- Retry temporary failures safely
- Apply rate limits
- Prevent repeated OTP abuse
- Avoid blocking important application requests while waiting for the SMS provider

Only the backend should communicate directly with the SMS provider.

---

## 19. Security Hardening

The production environment should include:

- HTTPS everywhere
- Firewall rules
- SSH key authentication
- Disabled password-based SSH where practical
- Restricted administrative access
- Non-root application containers
- Secure HTTP headers
- Rate limiting
- Database network isolation
- Redis network isolation
- Regular operating system updates
- Dependency security reviews
- Strong secret generation
- Automatic session expiration
- Audit logs for sensitive admin actions

The following must be disabled in production:

- Development debugging tools
- Public database administration tools
- Detailed error responses
- Unprotected internal endpoints
- Development API documentation unless explicitly secured

---

## 20. Static Assets and Images

Public images, banners, and background images should be optimized before deployment.

Use:

- WebP or AVIF formats where appropriate
- Responsive image sizes
- Lazy loading
- Compressed assets
- Versioned file names
- Long-lived cache headers
- CDN support when needed later

Large images should not be unnecessarily included in the main frontend JavaScript bundle.

Admin-managed images should be stored in object storage.

---

## 21. Deployment Acceptance Checklist

A production deployment is accepted when:

- The frontend loads through HTTPS
- The API responds through HTTPS
- HTTP redirects to HTTPS
- PostgreSQL is not publicly exposed
- Redis is not publicly exposed
- Database migrations complete successfully
- Parent registration works
- Login works
- OTP verification works
- Student registration works
- Admin approval works
- Contract creation works
- Online payment callbacks work
- Offline payment approval works
- Installment schedules are generated correctly
- SMS notifications work
- Generated contracts remain available after container restart
- Automated backups complete successfully
- Health checks pass
- Logs do not expose sensitive information
- The previous version can be restored
- Staging and production credentials are separated
- Persistent volumes survive container replacement

---

## 22. Final Deployment Recommendation

For the MVP, use:

- Linux VPS
- Docker
- Docker Compose
- Caddy reverse proxy
- Next.js frontend container
- Node.js backend container
- PostgreSQL with persistent storage
- Redis
- S3-compatible object storage
- Separate staging and production environments
- Automated daily backups
- Versioned Docker images
- Basic monitoring and structured logs

This deployment architecture provides a professional and scalable foundation while avoiding unnecessary infrastructure complexity during the MVP stage.
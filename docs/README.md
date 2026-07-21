# Documentation authority

The files in this directory are the product and engineering source of truth. When documents conflict, use this precedence order and record the resolution in the relevant plan or an ADR before implementation:

1. Approved product scope and business rules
2. Security and roles/permissions specifications
3. Domain specifications for enrollment, contracts, pricing, and payments
4. API and database specifications
5. Backend/frontend architecture and technology-stack guidance
6. Deployment, performance, testing, and UI guidance

The project owner approves product and business-rule changes. Security-sensitive behavior and production-provider choices require explicit project-owner approval. Engineering implementation details that do not change product behavior are recorded in an ADR. Empty specifications are blocking; they are not permission to invent requirements.

Current approved development decisions:

- PostgreSQL is authoritative.
- Redis and BullMQ are approved for temporary and retryable background work.
- Console OTP and mock payments are development-only substitutes and fail closed in production.
- Production SMS/email, payment, storage, domain/TLS, and hosting providers remain unselected.

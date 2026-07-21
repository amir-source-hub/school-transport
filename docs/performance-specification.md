# Performance

For this MVP, performance should focus on keeping the parent and admin experience fast, reliable, and responsive without introducing unnecessary infrastructure such as Redis, complex queues, or microservices.

## 1. Performance Goals

Recommended initial targets:

- Main pages should load within roughly **2–3 seconds** on normal mobile internet.
- Important user actions should respond within about **1 second** where possible.
- Forms should provide immediate feedback after submission.
- Admin tables should remain responsive as records grow.
- The application should work smoothly on mobile devices and slower connections.
- Database operations involving payments, contracts, and registrations must remain consistent under concurrent requests.

## 2. Frontend Performance

The frontend should use:

- Next.js server rendering where appropriate
- Static generation for public and mostly unchanged pages
- Client components only when interaction is required
- Route-level code splitting
- Lazy loading for heavy components
- Optimized image loading
- Responsive image sizes
- Modern image formats such as WebP or AVIF
- Font optimization
- Skeleton loaders for delayed content
- Pagination instead of rendering very large lists
- Debounced search inputs
- Minimal JavaScript on public pages

Large libraries should not be added unless they provide clear value.

Animations should remain lightweight and should not delay page loading or block interaction.

## 3. Mobile Performance

Because many parents may use mobile devices, mobile performance should be treated as a primary requirement.

The system should:

- Avoid oversized images
- Avoid large background videos
- Use responsive banners
- Reduce animation intensity on weaker devices
- Avoid loading admin-only code in parent pages
- Maintain usable layouts on slower mobile connections
- Keep forms simple and fast to complete
- Preserve user-entered form data when temporary errors occur

## 4. Image and Media Optimization

Pictures, banners, school images, and background images should be optimized before delivery.

Recommended rules:

- Use the Next.js image component
- Store multiple image sizes where useful
- Load only the size required by the current screen
- Compress uploaded images
- Use lazy loading below the visible page area
- Set width and height values to prevent layout shifts
- Avoid decorative images larger than necessary
- Use placeholders while large images load

Hero-section images should be visually high quality but compressed carefully.

## 5. Backend Performance

The backend should:

- Validate requests before database execution
- Avoid unnecessary database calls
- Avoid repeated queries for the same request
- Select only required database fields
- Use transactions only where necessary
- Keep transaction duration short
- Paginate list endpoints
- Limit exported or returned records
- Apply request size limits
- Avoid long-running work inside normal HTTP requests

Operations such as sending notification messages should not block important actions for too long.

For the MVP, basic asynchronous handling can be implemented inside the backend without introducing a dedicated queue system unless actual usage proves it necessary.

## 6. Database Performance

PostgreSQL should remain the primary performance and consistency layer.

Indexes should be added for frequently searched or filtered fields, including:

- Parent phone numbers
- Parent username
- Student national ID
- Registration status
- Contract status
- Payment status
- Payment due date
- Created date
- Foreign-key fields
- Active and archived record filters

Composite indexes may be needed for common combinations such as:

- Parent ID and student ID
- Contract ID and payment status
- Registration status and creation date
- Payment status and due date

Indexes should be based on real query patterns rather than added to every field.

## 7. Query Optimization

The application should avoid:

- N+1 queries
- Loading full related records unnecessarily
- Returning all registrations at once
- Fetching large contract or payment histories by default
- Recalculating totals repeatedly when stored values are available
- Running search queries without limits

Admin list pages should use server-side:

- Pagination
- Filtering
- Sorting
- Search
- Date ranges

## 8. Caching Strategy

A separate caching system such as Redis is not required for the initial MVP.

The system can use:

- Browser caching
- Next.js data caching
- Static page caching
- HTTP cache headers
- In-memory caching for small, non-critical values
- Cached public content where appropriate

Sensitive or frequently changing information should not be cached carelessly, including:

- Payment status
- Contract status
- Approval status
- Current price
- Current installment state

Cached data must never become the source of truth for financial operations.

## 9. Payment Performance and Reliability

Payment-related operations must prioritize correctness over raw speed.

The system should:

- Prevent duplicate payment processing
- Use idempotency checks
- Lock or validate payment state before updating
- Use database transactions
- Verify gateway callbacks
- Avoid repeated creation of the same payment
- Return a clear pending state when verification is still in progress
- Record failed and timed-out attempts
- Prevent multiple simultaneous confirmations of the same installment

The payment gateway callback should remain lightweight and should only perform required verification and database updates.

## 10. Contract and Pricing Performance

Contract generation should not repeatedly calculate unchanged data.

The system should store finalized contract values such as:

- Agreed total price
- Prepayment amount
- Remaining amount
- Installment amount
- Installment dates
- Contract version
- Acceptance date

After contract acceptance, these values should be read directly from the accepted contract record.

Price history should be loaded only when requested by an admin.

## 11. Form Performance

Registration and enrollment forms should:

- Validate simple fields in the browser
- Repeat validation on the server
- Submit only necessary data
- Avoid repeated OTP requests
- Disable duplicate submissions
- Show progress while submitting
- Preserve entered data after recoverable errors
- Load dependent options only when needed

The submit button should not remain active while the same request is processing.

## 12. Admin Panel Performance

Admin pages may eventually contain many parents, students, contracts, and payments.

To keep them responsive:

- Use server-side pagination
- Set a reasonable default page size
- Provide targeted filters
- Avoid loading unrelated relational data
- Load detail panels on demand
- Export reports asynchronously only if exports become large
- Avoid dashboard queries that scan entire tables repeatedly
- Use summary queries for dashboard metrics

Dashboard metrics should be limited to useful MVP information rather than calculating many unused statistics.

## 13. Notifications

Notification processing should not delay core workflows.

For example, after a registration is saved:

1. Save the registration successfully.
2. Record that a notification must be sent.
3. Send the notification.
4. Record success or failure.

A failed SMS or email should not reverse an otherwise successful registration or payment.

Failed notifications should be retryable.

## 14. API Response Design

API responses should:

- Return only required fields
- Use pagination metadata
- Avoid deeply nested objects
- Use consistent response structures
- Avoid returning sensitive internal fields
- Compress responses where supported
- Return appropriate status codes
- Include stable error codes

Large document content should not be returned in ordinary list endpoints.

## 15. File and Contract Delivery

Generated contracts should be stored or generated efficiently.

Recommended approach:

- Generate the final contract after required approval
- Store the generated file or final contract snapshot
- Avoid regenerating the same contract for every download
- Protect download URLs
- Stream large files rather than loading them fully into memory
- Keep contract generation outside critical payment transactions

## 16. Concurrency

The system must safely handle cases such as:

- Two admin actions on the same registration
- Multiple payment callbacks
- Parent submitting the same form twice
- Admin changing a price while the parent is reviewing the contract
- Parent attempting to pay the same installment from multiple tabs

Concurrency protection should use:

- Database transactions
- Unique constraints
- Idempotency keys
- Conditional updates
- Record version checks where useful
- Row locking for critical financial operations

## 17. Monitoring

The MVP should record basic performance information:

- API response time
- Slow database queries
- Failed requests
- Payment verification duration
- Notification delivery duration
- Contract generation failures
- Repeated request attempts
- Database connection errors

Logs should include request context but must not expose passwords, OTP codes, or sensitive payment information.

## 18. Performance Testing

Testing should include:

- Public-page loading tests
- Mobile viewport testing
- Slow-network testing
- Large admin list testing
- Concurrent payment callback testing
- Duplicate form submission testing
- Database query inspection
- Image-size checks
- Contract-generation tests
- Basic load testing for common endpoints

The MVP does not require very large-scale stress testing, but important workflows must be tested under simultaneous requests.

## 19. Recommended MVP Decisions

For the current project:

- Use PostgreSQL without Redis.
- Use Next.js caching for suitable public content.
- Use server-side pagination.
- Optimize all uploaded images.
- Add indexes based on real filters and searches.
- Keep payment operations transactional and idempotent.
- Avoid microservices.
- Avoid premature caching.
- Avoid heavy animation libraries unless necessary.
- Measure slow queries before introducing more infrastructure.
- Design the system so Redis or a queue can be added later without restructuring the complete application.

## 20. Acceptance Criteria

The performance implementation is acceptable when:

- Public pages load smoothly on mobile.
- Images do not cause major layout shifts.
- Forms prevent duplicate submissions.
- Admin tables use pagination.
- Important database searches use indexes.
- Payment callbacks are safe under repetition.
- The same installment cannot be confirmed twice.
- Slow notifications do not block successful payments or registrations.
- Large record lists do not freeze the browser.
- Critical API endpoints remain responsive under normal concurrent use.
- No unnecessary Redis, queue, or microservice infrastructure is introduced.
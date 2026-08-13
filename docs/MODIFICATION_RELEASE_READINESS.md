# Modification release readiness

This runbook is the operational companion to root [`TASKS.md`](../TASKS.md). Release owners must record the
release identifier, reviewers, timestamps, and evidence links in the deployment record.

## Approved product policies

- Normal refresh sessions last 24 hours; remembered refresh sessions last 7 days; access tokens
  remain one hour and refresh tokens rotate.
- The visible portal is `/student`; the backend role remains `PARENT` for compatibility and
  ownership enforcement. Every `/parent/*` URL temporarily redirects to its `/student/*` equivalent.
- Incomplete onboarding resumes for seven days, then expires. Cleanup may remove only expired
  onboarding state and must preserve completed identity, contract, payment, and audit history.
- Guardian accounts start with a two-student limit. A request requires a 1–500 character reason,
  only an authenticated administrator may approve/reject it, each approval increments the limit by
  exactly one, only one request may be pending, and the hard maximum is five.
- Required service, contract, payment, and safety notices are operational messages and cannot be
  disabled. Optional updates require separate, unchecked consent for in-app and SMS channels.
  Consent text version `2026-08-08.v1` is stored with source, actor, grant/revocation time, and audit.

## Feature rollout and rollback

The release is controlled by `FEATURE_ADMIN_2FA`, `FEATURE_ONBOARDING`,
`NEXT_PUBLIC_FEATURE_ADMIN_2FA`, `NEXT_PUBLIC_FEATURE_ONBOARDING`, and
`NEXT_PUBLIC_FEATURE_STUDENT_PANEL`. Production values are `true` after readiness approval.

1. Back up PostgreSQL and record the encrypted artifact checksum before migration.
2. Deploy the migration job once; it uses the Drizzle migration ledger and advisory release lock.
3. Deploy one immutable API/web image digest with the same Next deployment ID and Server Action key.
4. Enable onboarding, then the student panel, then admin 2FA while monitoring authentication,
   payment, queue, and error metrics.
5. Roll back behavior by disabling the relevant feature flag. Do not reverse database migrations.
6. If a schema defect is found, ship a forward-fix migration. Application rollback is permitted only
   while the previous image is compatible with all expanded columns/tables.
7. Verify `/parent/*` redirects, metadata, sitemap/robots policy, cache headers, and old bookmarks
   after promotion. Purge only application/CDN assets for the affected immutable release.

## Migration and recovery evidence

On 2026-08-08 the full 21-migration chain was applied twice to disposable PostgreSQL 16, proving
ledger idempotency. A custom-format `pg_dump` was restored into a second database and the restored
ledger count and `notification_consents` table were verified. Production/staging operators must
repeat the repository runbook against their sanitized snapshot and record RPO/RTO evidence.

## Map provider compliance

The application uses the official HTTPS OpenStreetMap raster endpoint through a bounded proxy.
`MAP_TILE_BASE_URL` makes the provider replaceable. The proxy forwards a browser referer when
present, sends a stable contactable product User-Agent using `MAP_TILE_CONTACT_URL`, requests only
visible Leaflet viewport tiles, enforces coordinate bounds/timeouts, and caches successful tiles for
at least seven days. The map displays linked `© OpenStreetMap contributors` attribution and a manual
address fallback. No prefetch/offline download is implemented. Review the current official policy
before every provider change: <https://operations.osmfoundation.org/policies/tiles/>.

## Threat model and focused security review

| Threat                            | Required control and reviewed location                                                                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin credential/OTP attack       | Argon2 password verification, generic failures, atomic hashed OTP/challenge consumption, account/IP throttles, two-minute expiry in `identity/**`                 |
| Session theft/fixation/replay     | HttpOnly cookies, Secure in production, SameSite, server-side live-session checks, refresh rotation and reuse revocation in `auth.guard.ts` and `auth.service.ts` |
| Student/contract IDOR             | Authenticated owner joins for parent routes; admin role guards; full records and reports require the authenticated `ADMIN` role                                   |
| Payment transition abuse          | Scoped idempotency fingerprints, row locks, conditional transitions, transaction/audit coupling in `payments/**`                                                  |
| Precise-location/identity leakage | No public location endpoints; granular admin access; redaction covers IDs, phones, addresses, coordinates, contracts, tokens, and payment references              |
| CSRF/XSS/request abuse            | Trusted-origin checks, strict DTO validation, bounded bodies/timeouts, CSP/security headers, parameterized Drizzle queries, and rate limits                       |

Focused review must be repeated after authentication, authorization, contract, or payment-domain
changes. Findings block release until fixed or explicitly accepted by the security owner.

## Approval record

The following approvals cannot be inferred from code or automated checks. The release record must
contain a named approver and timestamp for each: product behavior, Persian copy, notification legal
text, privacy/retention, map/provider compliance, security review, and production go/no-go. An empty
approval record blocks production promotion even when the repository checklist is complete.

# Remaining Modification Tasks

> Audited on 2026-08-09. All implementation items that were finished and verified were removed. This file contains only unresolved release-level work from the original modification plan.

## Notification consent approval

- [ ] Approve the final Persian legal text and the exact channel/purpose policy for in-app notifications, optional SMS, required service SMS, and OTP/security SMS. **[BLOCKED — PRODUCT/LEGAL APPROVAL]**
  - Confirm that OTP and required security/service messages do not depend on optional marketing consent.
  - Confirm that optional campaigns and profile/update messages require explicit channel-specific consent.
  - Record the approved text version and effective date before changing `NOTIFICATION_CONSENT_TEXT_VERSION`.

## Deployment verification

- [ ] Verify legacy redirects, old bookmarks, route metadata, sitemap behavior, proxy caches, and browser caches after staging/production deployment. **[BLOCKED — DEPLOYMENT]**
  - Check `/parent/*` compatibility redirects and all public/admin/student entry points.
  - Verify that no cached old brand, route, or server-action asset survives the deployment.

- [ ] Run every forward migration and operational recovery procedure against a sanitized production-like staging snapshot. **[BLOCKED — STAGING INFRASTRUCTURE]**
  - Record migration duration, locks, rollback/restore procedure, backup evidence, and application compatibility during rolling deployment.
  - Include the notification read-state and student-photo migrations.

## Human review and release approval

- [ ] Have a Persian-language reviewer approve every final user-facing message. **[BLOCKED — HUMAN REVIEW]**
  - Include authentication, enrollment, validation, notification, SMS, feedback, student-photo, payment, and operational error copy.

- [ ] Obtain recorded product, legal/privacy, and security-owner approval for release. **[BLOCKED — EXTERNAL APPROVAL]**

## Final gate

- [ ] Re-run the complete definition of done after the remaining task specifications are complete. **[NOT FINISHED]**
  - Every applicable unresolved checkbox must be implemented or explicitly deferred with approval.
  - Unit, integration, E2E, accessibility, mobile, build, migration, security, and deployment checks must pass.

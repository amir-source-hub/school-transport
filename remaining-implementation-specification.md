# Remaining Implementation Specification

> Audited on 2026-08-10. Completed and verified implementation has been removed. This file contains only work that is blocked by external configuration, supplied assets, deployment access, or human approval.

## 1. SMS and Kavenegar

- [ ] Obtain an authorized Kavenegar sender line; sender `2000660110` currently returns provider status `427`. **[BLOCKED — KAVENEGAR ACCOUNT]**
- [ ] Restore outbound access to `api.kavenegar.com:443` and verify candidate sender `0018018949161`. **[BLOCKED — NETWORK/PROVIDER]**
- [ ] Allowlist the server outbound IP if `LatestOutbox`/`SelectOutbox` reconciliation is required; the current request returns `407`. **[BLOCKED — KAVENEGAR ACCOUNT]**
- [ ] Create and approve the exact `KAVEHNEGAR_OTP_TEMPLATE`; VerifyLookup currently returns `424`. **[BLOCKED — KAVENEGAR ACCOUNT]**
- [ ] Supply the current price per segment, campaign spend cap, alert recipient/system, and approved live test number. **[BLOCKED — USER INPUT]**
- [ ] Confirm whether authenticated callbacks are available for the account/plan or approve bounded official status polling, then implement and test the selected replay-safe delivery-status path. **[BLOCKED — PROVIDER DECISION]**
- [ ] After configuration is corrected, verify one ordinary SMS, one OTP, and one controlled broadcast on an approved handset. **[BLOCKED — EXTERNAL SEND]**
- [ ] Approve that requested OTP/security messages do not depend on optional marketing consent. **[BLOCKED — PRODUCT/LEGAL APPROVAL]**

## 2. Private S3-compatible storage and student cards

- [ ] Supply the Arvan endpoint, region, private bucket, scoped access key/secret, exact CORS origins, lifecycle policy, and versioning choice. **[BLOCKED — USER INPUT]**
- [ ] Verify presigned PUT/GET expiry and tampering, anonymous denial, key scoping, CORS, TLS, and actual Arvan compatibility in staging for student photos and payment receipts. **[BLOCKED — ARVAN CONFIGURATION]**
- [ ] Approve retention/deletion and legal-hold rules for photos and payment-receipt evidence, then enable the remaining irreversible cleanup behavior. **[BLOCKED — PRODUCT/LEGAL POLICY]**
- [ ] Supply and approve the physical student-card template and crop area, verify the 600×800 canonical output visually, and add the card-layout preview/export integration. **[BLOCKED — CARD TEMPLATE]**

## 3. Offline-payment policy and contracts

- [ ] Approve and version the final Persian offline-payment contract, including claim-versus-acceptance wording, destination/amount/reference responsibility, review timing, corrections, duplicate transfers, refunds, disputes, installments, late payment, retention, and activation timing. **[BLOCKED — PRODUCT/LEGAL INPUT]**
- [ ] Review notification consent, photo privacy, payment-evidence privacy, retention/deletion, and SMS/OTP clauses together, then update contract rendering, print/download views, tests, and previews with the approved text. **[BLOCKED — APPROVED TEXT]**

## 4. Online-payment gateway

- [ ] Select a gateway and supply official documentation, sandbox/merchant credentials, callback URLs/IPs, rial/toman units, verification, expiry, reconciliation, settlement, duplicate-payment, refund, and support rules. **[BLOCKED — USER INPUT]**
- [ ] Implement the selected provider behind the existing gateway port with server-to-server verification, atomic/idempotent finalization, unknown-state reconciliation, validated HTTPS redirects, return UI, sandbox contract/E2E coverage, and runbooks. **[BLOCKED — GATEWAY INPUT]**
- [ ] Enable online controls only after sandbox and production-readiness verification; the completed offline workflow remains available. **[BLOCKED — GATEWAY VERIFICATION]**

## 5. Media

- [ ] Supply the approved tutorial video, poster, Persian captions/transcript, duration, rights, placement, and hosting origin; then build and verify the accessible reusable video surface. **[BLOCKED — MEDIA INPUT]**
- [ ] Supply approved advertisement media, poster/captions, rights, campaign dates/pages, hosting, frequency, dismissal, autoplay/audio, and replay rules; then build and verify the accessible fail-closed dialog. **[BLOCKED — MEDIA INPUT]**

## 6. Product and operations decisions

- [ ] Define required export ranges, delivery method, access control, expiry, and retention before implementing queued/streamed exports beyond the current 10,000-row synchronous ceiling. **[BLOCKED — PRODUCT/OPERATIONS INPUT]**
- [ ] Approve exact retention, erasure/anonymization, dispute/legal-hold, consent-history, child-record, financial, audit, support, and campaign periods before enabling irreversible cleanup and replacing `pending-legal-approval` in the privacy register. **[BLOCKED — LEGAL/PRODUCT POLICY]**

## 7. CI and repository cleanup

- [ ] Reproduce and diagnose the failing production Compose `Build and start the production web dependency chain` step from the `8bd55c7` `main` workflow run; the local reproduction was intentionally stopped before completion. Split build/start diagnostics if needed, preserve the first actionable Docker/Next.js error in CI annotations or an artifact, fix the root cause, and verify the complete deployment smoke job. **[PAUSED — CI/LOCAL REPRODUCTION]**
- [ ] Confirm the production-container scan result after the `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` and Git LFS checkout fixes; if it still fails, inspect the Trivy/SARIF findings, remediate actionable vulnerabilities or document narrowly scoped accepted risks, and rerun the scan to success. **[PAUSED — CI RESULT/REPOSITORY ACCESS]**
- [ ] Enable GitHub Dependency graph and dependency review under repository security settings, then rerun the pull-request dependency/license check and verify that push runs remain intentionally skipped. **[BLOCKED — REPOSITORY ADMIN SETTING]**
- [ ] Close the superseded `dependabot/docker/node-26-bookworm-slim` pull request and delete its remote branch after confirming no useful dependency metadata remains; `main` deliberately targets Node.js 24 LTS instead of that proposed Node.js 26 image update. **[BLOCKED — REMOTE REPOSITORY APPROVAL]**

## 8. Staging, deployment, and release approval

- [ ] Verify notification migration `0025_notification_read_state.sql`, all forward migrations, and recovery procedures against a sanitized production-like snapshot; record duration, locks, backup, restore, and legacy outbox compatibility. **[BLOCKED — STAGING DATABASE]**
- [ ] Enable persistent Redis memory overcommit and verify it after a host reboot. **[BLOCKED — HOST ACCESS]**
- [ ] Inspect PostgreSQL authentication, listening interfaces, firewall, and TLS; prevent trust authentication and public exposure. **[BLOCKED — DEPLOYMENT INSPECTION]**
- [ ] Verify legacy redirects/bookmarks, route metadata, sitemap, proxy/browser caches, map tiles/CSP, and stale Next.js Server Actions through an actual rolling deployment. **[BLOCKED — DEPLOYMENT]**
- [ ] Obtain recorded Persian-language, product, legal/privacy, security, and operations release approval. **[BLOCKED — EXTERNAL APPROVAL]**

## Cleanup rule

- Remove an item when its implementation and verification are complete.
- Delete this file only when no blocked, unverified, or continuing requirement remains.

# Remaining Later-Phase Features

> Audited on 2026-08-09. Completed and verified features/subtasks were removed. Immediate incomplete notification, feedback, SMS, role, and student-photo work is tracked in `remaining-implementation-specification.md`.

## 1. Student-enrollment tutorial video

### Inputs required

- [ ] Provide the approved video, poster, Persian captions/transcript, duration, publishing rights, and hosting origin. **[BLOCKED — USER INPUT]**
- [ ] Decide whether it appears on the homepage, registration guide, or both. **[BLOCKED — USER INPUT]**

### Implementation and verification

- [ ] Create one reusable accessible video component and use it on approved pages. **[NOT STARTED]**
  - Use semantic `<video>` with play/pause, seek, volume, fullscreen, and playback speed.
  - Add poster, lazy loading, Persian captions, transcript, keyboard/touch/screen-reader support, and a small-screen layout.
  - Allow only the exact media origin in CSP; do not broaden `media-src`.
  - Media failure must never block registration or the public page.
- [ ] Test mouse, keyboard, touch, captions, fullscreen, playback speed, portrait/landscape, unavailable media, and CLS/LCP/data-budget impact. **[NOT STARTED]**

## 2. Advertisement video popup

### Inputs required

- [ ] Provide approved video/poster/captions/rights, campaign start/end, eligible pages, hosting origin, frequency, dismissal persistence, autoplay/audio, and replay rules. **[BLOCKED — USER INPUT]**

### Implementation and verification

- [ ] Build the popup with the existing accessible dialog primitives. **[NOT STARTED]**
  - Prefer public pages and never interrupt enrollment, contracts, payments, or admin work without explicit approval.
  - Trap focus, support Escape, restore focus, show an obvious close button, stop media on close, and never autoplay sound.
  - Persist only campaign ID and minimum view/dismiss timing/count data.
  - Prevent reopen on every navigation, hydration flashes, duplicate opening, and deceptive auth/payment styling.
  - Invalid configuration or unavailable media must fail closed to the normal site.
- [ ] Test focus/background blocking, Escape/restoration, audio stop, frequency expiry, all supported viewports, reduced motion/data, and media failure. **[NOT STARTED]**

## 3. Kavenegar delivery confirmation

- [ ] Confirm whether the selected Kavenegar account/plan exposes an authenticated delivery-status callback suitable for server verification. **[BLOCKED — PROVIDER CONFIRMATION]**
- [ ] If supported, implement signature/authentication verification, replay protection, idempotent message mapping, normalized statuses, safe logs, and callback tests. **[NOT STARTED]**
- [ ] Otherwise document provider acceptance as the final available state, or add bounded official status polling if approved. **[NOT STARTED]**

## 4. Real payment gateway

### Inputs and decisions

- [ ] Choose the gateway and provide official documentation, sandbox/merchant credentials, allowed callback URLs/IPs, and settlement support. **[BLOCKED — USER INPUT]**
- [ ] Confirm rial/toman units and callback, verification, expiry, duplicate-payment, reconciliation, refund, and support procedures. **[BLOCKED — USER INPUT]**

### Backend

- [ ] Implement the provider behind `apps/api/src/modules/payments/payment-gateway.ts`. **[NOT STARTED]**
  - Keep vendor fields inside the adapter and normalize authority/token, redirect URL, reference, and status.
  - Validate ownership, payable state, amount, currency, merchant, authority, expiry, and idempotency.
  - Persist an internal pending transaction before redirect.
  - Treat callback data as untrusted and require server-to-server verification.
  - Lock and atomically finalize transaction, paid amount, schedule/plan state, provider reference, and notification.
  - Prevent double charge/finalization and add reconciliation for unknown/timeouts.
  - Store secrets only in deployment secret management.

### Frontend

- [ ] Replace fabricated `mock:` verification in production paths with real redirect/return behavior. **[NOT STARTED]**
  - Return a validated HTTPS provider URL and internal transaction ID from start.
  - Add a real student payment return page with pending, success, failure, cancelled, expired, and already-completed states based only on backend verification.
  - Preserve enrollment state at the gateway and activate the panel only after verified prepayment.

### Security and verification

- [ ] Add sandbox contract/E2E tests for ownership, amount/currency/merchant/authority mismatch, concurrency, idempotency, callback replay/tampering/order, timeout, expiry, cancellation, settlement, and reconciliation. **[BLOCKED — GATEWAY SANDBOX]**
- [ ] Prove one provider transaction can increase paid amount only once and document incident/refund/support procedures. **[NOT STARTED]**

## 5. Later-phase release gates

- [ ] Confirm video publishing rights and accessibility requirements. **[BLOCKED — EXTERNAL APPROVAL]**
- [ ] Review and pin newly added media/storage/gateway dependencies after vulnerability, license, and maintenance review. **[NOT FINISHED]**
- [ ] Complete staging migrations, privacy/security review, operational runbooks, backup/restore, incident response, and product/Persian/legal approval. **[BLOCKED — EXTERNAL VERIFICATION]**

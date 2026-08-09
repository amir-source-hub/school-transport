# Admin SMS broadcast operations

Admin SMS campaigns are disabled by default and restricted to active administrators. A campaign creator cannot approve their own campaign.

## Enablement

```dotenv
FEATURE_SMS_BROADCASTS=true
SMS_BROADCAST_BATCH_SIZE=50
SMS_BROADCAST_MAX_RECIPIENTS=5000
SMS_BROADCAST_MAX_SEGMENTS=3
SMS_BROADCAST_PRICE_PER_SEGMENT_RIAL=0
SMS_BROADCAST_MAX_COST_RIAL=0
SMS_BROADCAST_TEST_NUMBERS=09120000000
```

Set the price from the current Kavenegar commercial agreement; it is an estimate and is never treated as an invoice. Keep the test-number allowlist in deployment configuration rather than source control.

## Workflow

1. An active administrator previews the audience, Unicode segment count, and estimated cost.
2. Submission freezes the draft for approval.
3. A different active administrator approves it. The server resolves active accounts with current `SMS` / `OPTIONAL_UPDATES` consent and stores an immutable content/audience/schedule snapshot.
4. The worker claims recipients in bounded, skip-locked batches. It rechecks account status, phone ownership, and consent immediately before dispatch.
5. Operators can pause, resume, or cancel unsent recipients. Expired campaigns are closed automatically.

The report exposes aggregate statuses only. Full recipient phone lists are not returned by the API. `ACCEPTED` means Kavenegar accepted the send request; it does not mean handset delivery. Delivery receipts remain unavailable until a verified provider callback is implemented.

## Incident controls

- Disable `FEATURE_SMS_BROADCASTS` to stop new previews, submissions, approvals, test sends, and worker dispatch.
- Pause an individual campaign when its content, audience, schedule, or cost is questioned.
- Cancel to permanently mark all queued/retry recipients as cancelled.
- Rotate the Kavenegar API key through deployment secret management if compromise is suspected.
- Audit records cover submission, approval, test send, pause, resume, and cancellation.

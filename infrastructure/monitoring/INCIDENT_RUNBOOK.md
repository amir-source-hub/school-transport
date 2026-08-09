# Incident runbook

Owner: platform on-call. Escalation: security lead for suspected disclosure/auth abuse; finance operations for payment ambiguity; messaging operations for provider/spend events.

1. Acknowledge the alert, record UTC start, release ID, affected SLO, and trace/request IDs. Never paste tokens, phones, child details, receipts, or message bodies into the incident record.
2. Check `/api/v1/health`, protected `/api/v1/metrics`, container state, PostgreSQL pool waiting/availability, queue failures/backlog, and recent deployment changes.
3. Contain: drain or roll back a bad release; disable optional broadcasts; keep online payment fail-closed; do not delete queues, outbox rows, receipt evidence, or financial rows.
4. Recover queues by restarting workers and verifying the same durable job completes. For database incidents, use the guarded encrypted-backup/restore procedure and never restore over production.
5. For payment ambiguity, stop review actions, preserve immutable transaction/audit evidence, and reconcile by schedule-item ID—not payer-provided references in logs.
6. For suspected privacy/security incidents, revoke sessions/credentials, preserve minimized evidence, restrict access, and follow the legally approved notification process once supplied.
7. Close only after health, error rate, latency, pool, queue age, and critical browser smoke remain healthy for 30 minutes. Record cause, customer impact, timeline, corrective owner, and due date.

Useful commands are documented in `infrastructure/container/README.md`, `infrastructure/database/README.md`, and `infrastructure/host/README.md`.

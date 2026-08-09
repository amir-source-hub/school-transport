# Observability and messaging operations

## Metrics boundary

The API exposes Prometheus text at `GET /metrics` only when the request supplies
`Authorization: Bearer <METRICS_BEARER_TOKEN>`. A missing or invalid token returns 404. Rotate this
token through the deployment secret manager, update the scraper, restart the API, verify one scrape,
then revoke the old value. Never place it in browser code or dashboards.

Messaging metrics use fixed `category` and `outcome` enums only. Categories are `otp`,
`service_notification`, `optional_notification`, `test_broadcast`, and `broadcast_campaign`.
Outcomes cover accepted, timeout, transient/permanent failure, consent/phone skips, disabled,
rate-limited, retry, and dead-letter states. Phone numbers, user/event IDs, message or feedback text,
OTPs, API keys, provider payloads, and signed URLs are forbidden as labels or metric values.

## Alert rules and ownership

Import `infrastructure/monitoring/messaging-alerts.yml` into Prometheus and tune thresholds through
the monitored deployment configuration. Operations owns the dashboard and primary alerts; the
application owner is the escalation contact. Alertmanager must group by `alertname` and `category`,
use a 30-minute repeat interval for provider alerts, and inhibit backlog warnings while the provider
is intentionally disabled. This provides cooldown/deduplication without application-side recipient
state.

The dashboard must show outcome rate by bounded category, p95 provider latency, oldest queue age,
OTP rate-limit spikes, campaign accepted volume, dead letters, and estimated campaign spend from the
approved campaign records. Do not join metrics to phone- or user-level data.

## Incident procedure

1. Disable `FEATURE_SMS_BROADCASTS` first for unexpected campaign volume. Set `SMS_PROVIDER=none`
   only when all ordinary notification sends must stop; requested OTP delivery then remains governed
   separately by `OTP_PROVIDER`.
2. Determine whether failures are timeout/transient or permanent rejections. Do not retry permanent
   provider errors. Let bounded exponential retry handle transient failures and inspect dead-letter
   counts before any manual recovery.
3. For backlog growth, verify worker health and Redis/PostgreSQL readiness, then restore workers.
   Reprocessing is safe only through the existing idempotency keys and skip-locked claim paths.
4. For OTP spikes, preserve generic client errors, inspect aggregate rate-limit metrics, and tighten
   edge throttling if needed. Never retrieve or log OTP values.
5. For suspected credential exposure, disable provider traffic, rotate the Kavenegar key and metrics
   token in the secret manager, restart API/workers, verify aggregate recovery, and document the
   incident without copying provider payloads or personal data.

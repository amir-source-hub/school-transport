# Monitoring contract

Status: baseline contract. This document defines telemetry and operational ownership; it does not
deploy a monitoring backend or notification integration.

## Objectives and scope

Monitoring must detect user-visible failure, data-integrity risk, security abuse, dependency
degradation, and failed recovery controls without collecting personal data. The monitored boundary
contains the public web service, API, background worker, PostgreSQL, Redis/queues, private object
storage, messaging and payment providers, the container host, TLS endpoints, and backup/restore
jobs.

The machine-readable source of truth is `monitoring-inventory.json`. A signal marked `implemented`
exists in application code today. A signal marked `planned` must not be referenced by a mandatory
alert until its producer and tests exist.

## Telemetry conventions

- Prometheus metric names use the `school_transport_` prefix and base units (`seconds`, `bytes`).
- Counters end in `_total`. Durations use histograms when percentiles are operationally useful.
- Labels are fixed, low-cardinality enums. Route labels contain normalized templates, never paths
  with concrete identifiers.
- Every target carries deployment-level `environment`, `service`, and `release` labels at scrape
  time; application metrics must not repeat them.
- Logs are structured JSON and may contain `requestId` and `traceId` for correlation. These values
  are log fields, never metric labels.
- Health separates process liveness from dependency readiness. External probes assess user-visible
  availability independently of application self-reporting.

## Sensitive-data boundary

Metrics, alert annotations, dashboards, and notification payloads must never contain names, phone
numbers, national IDs, addresses, precise locations, student or family identifiers, object keys,
payment references, contract or message text, credentials, cookies, tokens, OTPs, signed URLs,
request or response bodies, or raw provider payloads.

Logs must apply the same prohibition to secrets and authentication material. Personal data may be
logged only when an approved incident procedure explicitly requires minimized evidence; access,
retention, and deletion must then follow the privacy policy. Dashboards must not provide user-level
or child-level views.

## Service indicators

The existing objectives in `SLOS.md` remain authoritative. Implementation phases must add these
missing indicators before their associated objectives can become enforceable:

| Area            | Required indicator                                                    | Contract state |
| --------------- | --------------------------------------------------------------------- | -------------- |
| Public web      | External availability and response duration                           | planned        |
| API             | Request count, error ratio, and duration                              | implemented    |
| Worker          | Heartbeat, queue depth, oldest job, failures, dead letters            | partial        |
| PostgreSQL      | Readiness and application pool usage                                  | implemented    |
| Redis           | Availability, memory, evictions, and persistence health               | planned        |
| Object storage  | Operation outcomes and duration                                       | planned        |
| Payments        | Operation outcomes and integrity inconsistencies                      | planned        |
| Authentication  | Attempts, lockouts, throttling, and refresh reuse                     | planned        |
| Host/containers | CPU, memory, disk, inode, restart, and OOM state                      | planned        |
| TLS             | External certificate validity and expiry                              | planned        |
| Backup/recovery | Last success, duration, size, remote verification, restore validation | implemented    |

## Alert contract

Every actionable alert must include `severity`, `service`, and `owner` labels plus `summary`,
`impact`, and `runbook` annotations. Alerts must describe symptoms and user or data impact; they
must not embed identifiers or secrets.

| Severity | Meaning                                                                                  |    Acknowledge |        Escalate | Notification              |
| -------- | ---------------------------------------------------------------------------------------- | -------------: | --------------: | ------------------------- |
| critical | Active outage, data-integrity risk, confirmed security event, or missed recovery control |         10 min |          15 min | page primary and backup   |
| warning  | Sustained degradation or approaching capacity with time to intervene                     |        4 hours |  1 business day | operations channel/ticket |
| info     | Non-urgent operational change or trend requiring review                                  | 1 business day | 3 business days | ticket/dashboard          |

Alerts must tolerate brief transients, group duplicate symptoms, inhibit downstream symptoms when
their root dependency is unavailable, and contain an expiring silence owner for maintenance.
`platform-on-call` owns initial response. `application-owner` handles code defects,
`security-lead` handles suspected disclosure or authentication abuse, `finance-operations` handles
payment ambiguity, and `messaging-operations` handles provider or campaign events. Deployment must
replace these role names with named primary and backup contacts.

## Verification and acceptance

A monitoring capability is complete only when its producer is tested, Prometheus can query it, an
alert rule is syntax-validated, a controlled failure makes the alert fire, the assigned recipient
acknowledges it, and the linked runbook restores a healthy state. Dashboard visibility alone is not
acceptance evidence.

The minimum operational acceptance set is API outage, database outage, stopped worker, Redis
failure, failed or stale backup, low disk, certificate expiry, object-storage failure, payment
integrity risk, and authentication abuse.

# Logging pipeline

Owner: platform on-call. Escalate suspected sensitive-data logging to the security lead.

1. Check the Prometheus `loki` and `alloy` targets, Loki readiness, Alloy component health, free disk
   space, and recent container logs in Grafana.
2. For discarded samples, group `loki_discarded_samples_total` by `reason`. Correct timestamp,
   ingestion-rate, stream-limit, or malformed-entry causes without globally removing safety limits.
3. Confirm Alloy discovers only the approved School Transport Compose projects and can reach Loki.
   Never expose the Alloy HTTP endpoint or Docker socket.
4. If logs contain prohibited data, restrict Grafana access, preserve minimized evidence, stop the
   offending emission at its source, and follow the privacy/security incident process. Deleting
   evidence is not containment.
5. Close only after expected services produce logs, discarded-sample rates remain zero for 30
   minutes, and no unrelated Docker project appears in Loki.

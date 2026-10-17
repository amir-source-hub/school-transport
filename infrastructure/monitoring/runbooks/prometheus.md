# Prometheus alert runbook

Owner: platform on-call. Escalation: application owner when the API metrics endpoint is unhealthy and
security lead when scrape credentials may be exposed.

## Initial checks

1. Record the UTC alert time, environment, release, target, and the last successful scrape. Do not
   place the metrics bearer token in logs, tickets, commands, or screenshots.
2. Check the Prometheus container health and sanitized logs, then query `up`,
   `prometheus_config_last_reload_successful`, and `prometheus_rule_evaluation_failures_total`.
3. Run `promtool check config` and `promtool check rules` inside the pinned Prometheus image against
   the mounted configuration. Do not bypass a rejected rule or configuration.
4. For API scrape failure, distinguish API outage, backend-network/DNS failure, invalid bearer
   credentials, and malformed metrics output. A missing or invalid API token deliberately returns 404.
5. For storage pressure, confirm current TSDB size, retention settings, free host space, ingestion
   growth, and unexpected label cardinality before changing retention.

## Recovery and closure

- Restore the intended configuration and restart the pinned container if a reload cannot recover.
- Rotate the metrics token through the secret store if exposure is suspected; update both API and
  Prometheus, verify a successful scrape, and revoke the previous value.
- Do not expose Prometheus publicly, disable bearer authentication, delete TSDB data, or weaken
  alerts to obtain a healthy state.
- Close only after all expected targets remain up, configuration reload and rule evaluation succeed,
  required recording rules return data, and alert evaluation remains healthy for 15 minutes.

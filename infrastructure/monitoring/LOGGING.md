# Centralized logging

Loki stores logs and Grafana Alloy discovers and tails Docker containers. Both run as digest-pinned
Docker images with no published host ports. Grafana provisions Loki as a read-only datasource and
loads the `School Transport Logs` dashboard.

Only containers whose Compose project starts with `school-transport` or `school_transport` are
collected. Labels are limited to container, Compose service/project, and platform. Request IDs,
account identifiers, URLs, and message content are not labels because their cardinality and privacy
risk are unacceptable.

Loki retains data for 30 days on the local `loki_data` volume and rejects samples older than seven
days. Include this volume in encrypted monitoring-state backups only when the approved recovery plan
requires log preservation. Legal/privacy retention requirements override the technical default.

## Docker socket boundary

Alloy requires the Docker API to discover and read container logs. A read-only socket mount does not
make the Docker API read-only; control of the Alloy container is effectively host-administrator
access. Keep Alloy unexposed, restrict Compose access to host administrators, and never add remote
write or arbitrary configuration access. A future deployment should place an allowlisted Docker
socket proxy between Alloy and the daemon.

## Sensitive data

Centralized logging does not make sensitive application logging acceptable. The application must
continue to exclude credentials, tokens, cookies, OTP values, personal details, precise locations,
payment references, object keys, signed URLs, and request/response bodies. Restrict Grafana access,
audit operator access, and treat exported log results as sensitive operational evidence.

After startup, confirm the Prometheus `loki` and `alloy` targets are up, the Loki datasource passes
its health check, each expected service produces recent entries, old entries expire, and unrelated
Docker projects do not appear. Stop one test container and confirm collection resumes without a
duplicate historical flood after restart.

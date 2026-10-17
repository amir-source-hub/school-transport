# Grafana operations

Grafana runs from the digest-pinned official image in `docker-compose.monitoring.yml`. It is
provisioned from version-controlled files: the Prometheus and Loki datasources are read-only, dashboard UI
edits are disabled, anonymous access and self-registration are disabled, and telemetry/update
checks are disabled.

Create a random administrator password in a root-owned mode `0600` file and set:

```text
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=<strong-unique-password>
GRAFANA_HOST_PORT=3001
GRAFANA_ROOT_URL=http://localhost:3001
```

Start Grafana with the monitoring stack, then reach `127.0.0.1:3001` through an SSH tunnel. Do not
publish Grafana through the application reverse proxy until SSO, role mapping, TLS, access logs,
rate limits, and an approved external-access policy are configured.

Verify the `Prometheus` and `Loki` datasources, both provisioned School Transport dashboards, all
operations panels, and the selected environment/release labels. A panel showing `No data` is an
instrumentation, scrape, or collection issue to investigate; it is not acceptable solely because
Grafana itself is healthy.

The named `grafana_data` volume contains local users, sessions, preferences, and internal metadata.
Include it in the encrypted monitoring-state backup policy. The dashboards and datasource do not
depend on this volume because they are reprovisioned from the repository.

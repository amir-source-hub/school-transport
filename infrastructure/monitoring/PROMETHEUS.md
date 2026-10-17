# Prometheus operations

Prometheus runs only from the image pinned in `docker-compose.monitoring.yml`. The selected
distroless image is the official Prometheus 3.14.0 release. It runs as UID/GID 65532 with a read-only
root filesystem and stores TSDB data in a named volume.

The application production stack must be running first. Prometheus joins its existing backend
network to reach `api:5000`; change `APPLICATION_BACKEND_NETWORK` only when the application Compose
project uses a different network name. Port 9090 binds to loopback and must not be exposed through
Caddy or a public firewall.

The monitoring environment is separate from the application environment. Copy
`infrastructure/monitoring/.env.monitoring.example` to the ignored local file
`infrastructure/monitoring/.env.monitoring`, or use a protected production file such as
`/etc/school-transport/monitoring.env` through `MONITORING_ENV_FILE`.

Required monitoring values:

```text
METRICS_BEARER_TOKEN_FILE=/etc/school-transport/secrets/metrics-bearer-token
RELEASE_ID=<monitored application release>
DEPLOY_ENV=production
```

Optional settings are `PROMETHEUS_RETENTION_TIME` (default `30d`),
`PROMETHEUS_RETENTION_SIZE` (default `8GB`), and `PROMETHEUS_HOST_PORT` (default `9090`). The size
limit takes precedence when it is reached first.

## Dockerized exporters

The same Compose project runs five digest-pinned images. None publishes a host port:

- Node Exporter collects Linux host metrics and the backup/restore textfiles from
  `/var/lib/node_exporter/textfile_collector`.
- cAdvisor collects Docker container resource metrics. Its official deployment requires privileged
  host access and read-only Docker/runtime mounts. Restrict control of this Compose project to host
  administrators.
- PostgreSQL Exporter connects as `POSTGRES_EXPORTER_USER` using the password file selected by
  `POSTGRES_EXPORTER_PASSWORD_FILE`.
- Redis Exporter uses `REDIS_EXPORTER_PASSWORD_MAP_FILE`. This file must be JSON in the exact form
  `{"redis://redis:6379":"<password>"}` and mode `0600`; it is not a raw password file.
- Blackbox Exporter probes the public website and the internal API health endpoint. Change the
  `https://samingasht.ir/` target in `prometheus.yml` when the production domain changes.

Grafana is also part of this Compose project and is documented separately in `GRAFANA.md`. Unlike
the exporters, it has a loopback-only host binding for operator access through an SSH tunnel.

Create the PostgreSQL monitoring login interactively so its password does not enter shell history:

```sql
CREATE ROLE postgres_exporter LOGIN;
GRANT CONNECT ON DATABASE school_transport TO postgres_exporter;
GRANT pg_monitor TO postgres_exporter;
```

Set its password with `psql`'s interactive `\password postgres_exporter` command, then place the same
value in the protected file referenced by `POSTGRES_EXPORTER_PASSWORD_FILE`. Rotate both exporter
secrets independently of application releases. Do not reuse the application database account.

Before startup, validate using the same pinned image:

```sh
docker compose --env-file infrastructure/monitoring/.env.monitoring \
  -f docker-compose.monitoring.yml config --quiet
docker compose --env-file infrastructure/monitoring/.env.monitoring \
  -f docker-compose.monitoring.yml run --rm --no-deps \
  --entrypoint /bin/promtool prometheus check config /etc/prometheus/prometheus.yml
docker compose --env-file infrastructure/monitoring/.env.monitoring \
  -f docker-compose.monitoring.yml up -d
```

The complete preflight should normally be run instead of invoking each validator manually:

```sh
sh infrastructure/monitoring/validate-monitoring.sh
```

Preflight rejects weak or malformed monitoring secrets, permissive secret-file modes on Linux, and
non-HTTPS production webhook endpoints. It reports only the failing variable name or requirement,
never the secret value.

After startup, access Prometheus through an SSH tunnel to `127.0.0.1:9090`. Confirm all ten scrape
jobs are up, all rule groups load, recording rules return data, backup metrics are present through
Node Exporter, and both black-box targets have `probe_success == 1`. A controlled exporter stop must
fire `PrometheusTargetDown`. Do not treat container state alone as monitoring acceptance.

After the stack is healthy, run the non-destructive runtime acceptance test:

```sh
node --env-file=infrastructure/monitoring/.env.monitoring \
  infrastructure/monitoring/smoke-monitoring.mjs
```

During an approved delivery exercise, add `--send-test-alert` and confirm the notification manually.
The script never reads or prints the webhook secret.

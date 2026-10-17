# Alertmanager operations

Alertmanager runs from the digest-pinned official image in `docker-compose.monitoring.yml`. It
groups repeated alerts, sends resolved notifications, routes critical alerts with a shorter delay,
and inhibits a warning when the same alert is already critical.

## Notification secret

Put the approved HTTPS webhook endpoint in a root-owned mode `0600` file. The file must contain only
the URL. Set `ALERT_WEBHOOK_URL_FILE` to its host path. The URL is mounted as a Docker secret and read
through Alertmanager's `url_file` setting; do not put it in `.env`, source control, commands, logs, or
incident records.

The receiver must accept the standard Alertmanager webhook JSON schema. Place any provider-specific
translation service behind the webhook endpoint rather than embedding provider credentials here.

## Operation

The UI binds to host loopback at `127.0.0.1:9093` by default. Reach it through an SSH tunnel only.
Alert state is retained in the `alertmanager_data` volume for five days by default; alert rules and
routing configuration remain version controlled.

Validate before startup and after each routing change:

```sh
docker compose --env-file infrastructure/monitoring/.env.monitoring \
  -f docker-compose.monitoring.yml run --rm --no-deps \
  --entrypoint /bin/amtool alertmanager check-config /etc/alertmanager/alertmanager.yml
docker compose --env-file infrastructure/monitoring/.env.monitoring \
  -f docker-compose.monitoring.yml up -d alertmanager prometheus
```

Send controlled synthetic warning and critical alerts through Prometheus, confirm notification and
resolution delivery, confirm grouping and inhibition, and record timestamps. A successful config
check alone does not prove the notification channel works.

Maintain an out-of-band contact tree that does not depend on this Alertmanager, its host, or the
configured webhook provider.

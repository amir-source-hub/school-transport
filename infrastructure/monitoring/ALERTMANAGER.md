# Alertmanager operations

Alertmanager runs from the digest-pinned official image in `docker-compose.monitoring.yml`. It
groups repeated alerts, sends resolved notifications, routes critical alerts with a shorter delay,
and inhibits a warning when the same alert is already critical.

## Bale notification secrets

Create the bot with Bale's `@botfather`, add it to the destination chat, and obtain the destination's
numeric chat ID. Put the token and chat ID in separate root-owned mode `0600` files containing only
their respective values. Configure their host paths as `BALE_BOT_TOKEN_FILE` and
`BALE_CHAT_ID_FILE`. Do not put either value directly in `.env`, source control, commands, logs, or
incident records.

Alertmanager uses its Telegram-compatible notifier with `https://tapi.bale.ai` as the API root.
Both values are mounted as Docker secrets and read through `bot_token_file` and `chat_id_file`.
Plain-text messages are used because Bale does not document Telegram parse modes. The concise
template stays well below Bale's documented 4096-character message limit.

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
configured Bale chat.

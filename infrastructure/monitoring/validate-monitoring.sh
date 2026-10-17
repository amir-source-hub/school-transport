#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/../.."

monitoring_env_file="${MONITORING_ENV_FILE:-infrastructure/monitoring/.env.monitoring}"
if [ ! -f "$monitoring_env_file" ] || [ ! -r "$monitoring_env_file" ]; then
  printf 'Monitoring environment file is missing or unreadable: %s\n' "$monitoring_env_file" >&2
  exit 1
fi

node --env-file="$monitoring_env_file" infrastructure/monitoring/validate-monitoring-secrets.mjs

compose() {
  docker compose --env-file "$monitoring_env_file" -f docker-compose.monitoring.yml "$@"
}

compose config --quiet
compose run --rm --no-deps --entrypoint /bin/promtool prometheus \
  check config /etc/prometheus/prometheus.yml
compose run --rm --no-deps --entrypoint /bin/amtool alertmanager \
  check-config /etc/alertmanager/alertmanager.yml --enable-feature=utf8-strict-mode
compose run --rm --no-deps loki \
  -config.file=/etc/loki/config.yml -verify-config
compose run --rm --no-deps alloy \
  validate /etc/alloy/config.alloy

node infrastructure/monitoring/assert-monitoring.mjs
printf 'Monitoring preflight validation passed.\n'

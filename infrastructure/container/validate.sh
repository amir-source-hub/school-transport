#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

command -v docker >/dev/null 2>&1 || {
  printf 'error: docker is required\n' >&2
  exit 1
}
command -v node >/dev/null 2>&1 || {
  printf 'error: node is required for static Compose assertions\n' >&2
  exit 1
}

caddy_image="${CADDY_VALIDATION_IMAGE:-caddy:2-alpine@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648}"
compose_model="$(mktemp "${TMPDIR:-/tmp}/school-transport-compose.XXXXXX.json")"
trap 'rm -f -- "$compose_model"' EXIT

export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-validation-only-password}"
export REDIS_PASSWORD="${REDIS_PASSWORD:-validation-only-password}"
export DATABASE_URL="${DATABASE_URL:-postgresql://validation:validation@postgres:5432/validation}"
export REDIS_URL="${REDIS_URL:-redis://:validation@redis:6379}"
export JWT_SECRET="${JWT_SECRET:-validation-only-secret-with-at-least-32-characters}"

docker compose config --format json >"$compose_model"
node infrastructure/container/assert-compose.mjs "$compose_model"
node infrastructure/postgres/assert-auth.mjs infrastructure/postgres/pg_hba.conf

docker build --check --file Dockerfile .
docker build --file Dockerfile --target api --tag school-transport-api:validation .
docker build --file Dockerfile --target web --tag school-transport-web:validation .
docker run --rm \
  --network none \
  --read-only \
  --volume "$repo_root/infrastructure/caddy/Caddyfile:/etc/caddy/Caddyfile:ro" \
  "$caddy_image" \
  caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile

docker image inspect school-transport-api:validation \
  --format '{{json .Config.User}} {{json .Config.Entrypoint}} {{json .Config.Healthcheck}}'
docker image inspect school-transport-web:validation \
  --format '{{json .Config.User}} {{json .Config.Entrypoint}} {{json .Config.Healthcheck}}'

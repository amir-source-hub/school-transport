#!/usr/bin/env bash
set -Eeuo pipefail

die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "required command not found: $1"
}

require_database_url() {
  [[ -n "${DATABASE_URL:-}" ]] || die 'DATABASE_URL is required'
  [[ "$DATABASE_URL" == postgresql://* || "$DATABASE_URL" == postgres://* ]] ||
    die 'DATABASE_URL must be a PostgreSQL URL'
}

database_name() {
  psql "$DATABASE_URL" --no-psqlrc --tuples-only --no-align \
    --command 'select current_database()' | tr -d '\r\n'
}

require_nonproduction_restore_target() {
  local name
  name="$(database_name)"
  [[ "$name" == *_test || "$name" == *_restore_validation ]] ||
    die "restore target '$name' must end in _test or _restore_validation"
  [[ "${ALLOW_DESTRUCTIVE_RESTORE:-}" == "$name" ]] ||
    die "set ALLOW_DESTRUCTIVE_RESTORE exactly to '$name'"
}

#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

require_command psql
require_database_url
mode="${1:---status}"

case "$mode" in
  --status)
    migration_table="$(psql "$DATABASE_URL" --no-psqlrc --tuples-only --no-align --command \
      "select to_regclass('drizzle.__drizzle_migrations') is not null")"
    if [[ "$migration_table" == t ]]; then
      psql "$DATABASE_URL" --no-psqlrc --set=ON_ERROR_STOP=1 --command \
        'select id, hash, created_at from drizzle.__drizzle_migrations order by created_at;'
    else
      printf 'migration history is empty (drizzle.__drizzle_migrations does not exist)\n'
    fi
    ;;
  --dry-run)
    psql "$DATABASE_URL" --no-psqlrc --set=ON_ERROR_STOP=1 --command \
      'select current_database(), current_user, pg_is_in_recovery() as replica;'
    find apps/api/drizzle -maxdepth 1 -type f -name '*.sql' -print | sort
    printf 'dry-run is read-only; review every listed migration before --apply\n'
    ;;
  --apply)
    [[ -n "${RELEASE_ID:-}" ]] || die 'RELEASE_ID is required'
    [[ "${DEPLOY_ENV:-}" =~ ^(development|test|staging|production)$ ]] ||
      die 'DEPLOY_ENV must be development, test, staging, or production'
    if [[ "${DEPLOY_ENV:-}" == production ]]; then
      [[ -f "${BACKUP_RECEIPT:-}" ]] || die 'a verified BACKUP_RECEIPT is required in production'
      [[ "${CONFIRM_EXPAND_MIGRATION:-}" == "$RELEASE_ID" ]] ||
        die 'CONFIRM_EXPAND_MIGRATION must exactly match RELEASE_ID'
    fi

    status_file="$(mktemp "${TMPDIR:-/tmp}/school-transport-migrate.XXXXXX")"
    command_file="$(mktemp "${TMPDIR:-/tmp}/school-transport-migrate.XXXXXX.sql")"
    trap 'rm -f -- "$status_file" "$command_file"' EXIT
    printf '%s\n' \
      "\\set ON_ERROR_STOP on" \
      "select pg_try_advisory_lock(731944812037145) as acquired \\gset" \
      "\\if :acquired" \
      "\\! sh -c 'pnpm --filter @school-transport/api exec tsx src/database/migrate.ts; printf \"%s\" \"\$?\" > \"\$MIGRATION_STATUS_FILE\"'" \
      "select pg_advisory_unlock(731944812037145);" \
      "\\else" \
      "\\echo 'another migration runner holds the deployment lock'" \
      "\\quit 75" \
      "\\endif" >"$command_file"
    export MIGRATION_STATUS_FILE="$status_file"
    psql "$DATABASE_URL" --no-psqlrc --file="$command_file"
    [[ -s "$status_file" ]] || die 'migration command did not record a result'
    [[ "$(cat "$status_file")" == 0 ]] || die 'migration command failed'
    ;;
  *)
    die 'usage: migrate-safe.sh [--status|--dry-run|--apply]'
    ;;
esac

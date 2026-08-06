#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

require_command psql
[[ -n "${SOURCE_DATABASE_URL:-}" ]] || die 'SOURCE_DATABASE_URL is required'
require_database_url
require_nonproduction_restore_target

signature_sql="select md5(string_agg(table_schema || '.' || table_name || '.' || column_name ||
  ':' || data_type || ':' || is_nullable, ',' order by table_schema, table_name, ordinal_position))
  from information_schema.columns where table_schema not in ('pg_catalog', 'information_schema');"

source_signature="$(psql "$SOURCE_DATABASE_URL" --no-psqlrc --tuples-only --no-align --command "$signature_sql")"
target_signature="$(psql "$DATABASE_URL" --no-psqlrc --tuples-only --no-align --command "$signature_sql")"
[[ -n "$source_signature" && "$source_signature" == "$target_signature" ]] ||
  die 'restored schema signature does not match the source'

source_migrations="$(psql "$SOURCE_DATABASE_URL" --no-psqlrc --tuples-only --no-align --command \
  'select count(*) from drizzle.__drizzle_migrations')"
target_migrations="$(psql "$DATABASE_URL" --no-psqlrc --tuples-only --no-align --command \
  'select count(*) from drizzle.__drizzle_migrations')"
[[ "$source_migrations" == "$target_migrations" ]] || die 'restored migration history differs'

printf 'restore validation passed: schema=%s migrations=%s\n' "$target_signature" "$target_migrations"

#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

require_command pg_dump
require_command age
require_command sha256sum
require_database_url

[[ -n "${BACKUP_AGE_RECIPIENT:-}" ]] || die 'BACKUP_AGE_RECIPIENT is required'
[[ -n "${BACKUP_OUTPUT_DIR:-}" ]] || die 'BACKUP_OUTPUT_DIR is required'
[[ "${DEPLOY_ENV:-}" =~ ^(development|test|staging|production)$ ]] ||
  die 'DEPLOY_ENV must be development, test, staging, or production'

if [[ "$DEPLOY_ENV" == production ]]; then
  [[ "${CONFIRM_PRODUCTION_BACKUP:-}" == "BACKUP_ONLY" ]] ||
    die 'set CONFIRM_PRODUCTION_BACKUP=BACKUP_ONLY for a production backup'
fi

umask 077
mkdir -p -- "$BACKUP_OUTPUT_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
db_name="$(database_name)"
safe_name="${db_name//[^a-zA-Z0-9_.-]/_}"
artifact="$BACKUP_OUTPUT_DIR/${safe_name}-${timestamp}.dump.age"
temporary="$(mktemp "${TMPDIR:-/tmp}/school-transport-backup.XXXXXX.dump")"
trap 'rm -f -- "$temporary"' EXIT

pg_dump "$DATABASE_URL" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="$temporary"

age --encrypt --recipient "$BACKUP_AGE_RECIPIENT" --output "$artifact" "$temporary"
(cd -- "$BACKUP_OUTPUT_DIR" && sha256sum "$(basename -- "$artifact")" >"$(basename -- "$artifact").sha256")
printf 'encrypted_backup=%s\nchecksum=%s\n' "$artifact" "$artifact.sha256"

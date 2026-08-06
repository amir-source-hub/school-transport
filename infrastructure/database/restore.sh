#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

require_command psql
require_command pg_restore
require_command age
require_command sha256sum
require_database_url
require_nonproduction_restore_target

[[ -f "${BACKUP_FILE:-}" ]] || die 'BACKUP_FILE must name an encrypted backup'
[[ -f "$BACKUP_FILE.sha256" ]] || die 'the adjacent BACKUP_FILE.sha256 is required'
[[ -f "${BACKUP_AGE_IDENTITY_FILE:-}" ]] || die 'BACKUP_AGE_IDENTITY_FILE is required'

(cd -- "$(dirname -- "$BACKUP_FILE")" && sha256sum --check "$(basename -- "$BACKUP_FILE").sha256")
age --decrypt --identity "$BACKUP_AGE_IDENTITY_FILE" "$BACKUP_FILE" |
  pg_restore \
    --dbname="$DATABASE_URL" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --exit-on-error

printf 'restore completed only for guarded non-production target %s\n' "$(database_name)"

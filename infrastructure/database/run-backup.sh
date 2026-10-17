#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

require_command aws
require_command age
require_command flock
require_command sha256sum

for name in BACKUP_OUTPUT_DIR BACKUP_REMOTE_BUCKET BACKUP_AGE_RECIPIENT DEPLOY_ENV; do
  [[ -n "${!name:-}" ]] || die "$name is required"
done
database_mode="${BACKUP_DATABASE_MODE:-direct}"
if [[ "$database_mode" == direct ]]; then
  require_command pg_dump
  require_command psql
  require_database_url
elif [[ "$database_mode" == docker-compose ]]; then
  require_command docker
  [[ -n "${BACKUP_COMPOSE_FILE:-}" ]] || die 'BACKUP_COMPOSE_FILE is required in docker-compose mode'
  [[ -f "$BACKUP_COMPOSE_FILE" ]] || die 'BACKUP_COMPOSE_FILE does not exist'
else
  die 'BACKUP_DATABASE_MODE must be direct or docker-compose'
fi
[[ "${BACKUP_REMOTE_PREFIX:-}" != /* ]] || die 'BACKUP_REMOTE_PREFIX must not start with /'
[[ "${BACKUP_LOCAL_RETENTION_HOURS:-}" =~ ^[0-9]+$ ]] ||
  die 'BACKUP_LOCAL_RETENTION_HOURS must be a non-negative integer'
if [[ "$DEPLOY_ENV" == production ]]; then
  [[ "${CONFIRM_PRODUCTION_BACKUP:-}" == BACKUP_ONLY ]] ||
    die 'set CONFIRM_PRODUCTION_BACKUP=BACKUP_ONLY for a production backup'
fi

umask 077
mkdir -p -- "$BACKUP_OUTPUT_DIR"
lock_file="${BACKUP_LOCK_FILE:-$BACKUP_OUTPUT_DIR/.backup.lock}"
exec 9>"$lock_file"
flock -n 9 || die 'another backup run is active'

metrics_dir="${BACKUP_METRICS_DIR:-}"
write_run_status() {
  local value="$1"
  [[ -n "$metrics_dir" ]] || return 0
  mkdir -p -- "$metrics_dir"
  local status_tmp
  status_tmp="$(mktemp "$metrics_dir/backup-status.prom.XXXXXX")"
  cat >"$status_tmp" <<EOF
# HELP school_transport_backup_last_run_success Whether the most recent backup run succeeded.
# TYPE school_transport_backup_last_run_success gauge
school_transport_backup_last_run_success $value
EOF
  chmod 0644 "$status_tmp"
  mv -f -- "$status_tmp" "$metrics_dir/school-transport-backup-status.prom"
}
on_error() {
  local status="$?"
  set +e
  write_run_status 0
  rm -f -- "${artifact:-}" "${checksum_file:-}" "${manifest:-}"
  exit "$status"
}
trap on_error ERR

started_epoch="$(date -u +%s)"
started_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

compose_args=()
if [[ "$database_mode" == docker-compose ]]; then
  compose_args=(-f "$BACKUP_COMPOSE_FILE")
  [[ -z "${BACKUP_COMPOSE_PROJECT_DIRECTORY:-}" ]] || compose_args+=(--project-directory "$BACKUP_COMPOSE_PROJECT_DIRECTORY")
fi
postgres_service="${BACKUP_POSTGRES_SERVICE:-postgres}"
db_query() {
  local query="$1"
  if [[ "$database_mode" == direct ]]; then
    psql "$DATABASE_URL" --no-psqlrc --tuples-only --no-align --command "$query"
  else
    docker compose "${compose_args[@]}" exec -T "$postgres_service" \
      sh -c 'psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --no-psqlrc --tuples-only --no-align --command "$1"' sh "$query"
  fi
}

latest_migration="$(db_query \
  "select coalesce(created_at::text || ':' || hash, 'none') from drizzle.__drizzle_migrations order by created_at desc limit 1" \
  2>/dev/null || printf 'unavailable')"
postgres_version="$(db_query 'show server_version' | tr -d '\r\n')"
db_name="$(db_query 'select current_database()' | tr -d '\r\n')"
safe_name="${db_name//[^a-zA-Z0-9_.-]/_}"
artifact="$BACKUP_OUTPUT_DIR/${safe_name}-$(date -u +%Y%m%dT%H%M%SZ).dump.age"
checksum_file="$artifact.sha256"

if [[ "$database_mode" == direct ]]; then
  pg_dump "$DATABASE_URL" --format=custom --compress=9 --no-owner --no-privileges |
    age --encrypt --recipient "$BACKUP_AGE_RECIPIENT" --output "$artifact"
else
  docker compose "${compose_args[@]}" exec -T "$postgres_service" \
    sh -c 'pg_dump --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --format=custom --compress=9 --no-owner --no-privileges' |
    age --encrypt --recipient "$BACKUP_AGE_RECIPIENT" --output "$artifact"
fi
(cd -- "$BACKUP_OUTPUT_DIR" && sha256sum "$(basename -- "$artifact")" >"$(basename -- "$checksum_file")")

artifact_name="$(basename -- "$artifact")"
prefix="${BACKUP_REMOTE_PREFIX:-production/postgresql}"
manifest="$artifact.manifest.json"
artifact_size="$(wc -c <"$artifact" | tr -d ' ')"
artifact_sha256="$(cut -d ' ' -f 1 "$checksum_file")"
minimum_bytes="${BACKUP_MINIMUM_BYTES:-1024}"
[[ "$minimum_bytes" =~ ^[0-9]+$ && "$minimum_bytes" -ge 1 ]] ||
  die 'BACKUP_MINIMUM_BYTES must be a positive integer'
(( artifact_size >= minimum_bytes )) ||
  die "encrypted backup is implausibly small: ${artifact_size} bytes"

aws_args=(--no-cli-pager)
[[ -z "${BACKUP_S3_ENDPOINT:-}" ]] || aws_args+=(--endpoint-url "$BACKUP_S3_ENDPOINT")
[[ -z "${BACKUP_S3_REGION:-}" ]] || aws_args+=(--region "$BACKUP_S3_REGION")

upload() {
  local bucket="$1" file="$2" key="$3" content_type="$4"
  aws "${aws_args[@]}" s3api put-object \
    --bucket "$bucket" --key "$key" --body "$file" \
    --content-type "$content_type" >/dev/null
}

upload_backup_set() {
  local bucket="$1" backup_type="$2"
  local remote_key="$prefix/$backup_type/$(date -u +%Y/%m/%d)/$artifact_name"
  cat >"$manifest" <<EOF
{
  "schemaVersion": 1,
  "backupId": "${artifact_name%.dump.age}",
  "environment": "$DEPLOY_ENV",
  "createdAt": "$started_at",
  "postgresVersion": "$postgres_version",
  "releaseId": "${RELEASE_ID:-unknown}",
  "latestMigration": "$latest_migration",
  "backupType": "$backup_type",
  "artifact": "$artifact_name",
  "encryptedSizeBytes": $artifact_size,
  "sha256": "$artifact_sha256",
  "remoteBucket": "$bucket",
  "remoteKey": "$remote_key"
}
EOF
  aws "${aws_args[@]}" s3api put-object \
    --bucket "$bucket" --key "$remote_key" --body "$artifact" \
    --content-type application/octet-stream --metadata "sha256=$artifact_sha256" >/dev/null
  upload "$bucket" "$checksum_file" "$remote_key.sha256" text/plain
  # The manifest is the completion marker and must always be uploaded last.
  upload "$bucket" "$manifest" "$remote_key.manifest.json" application/json

  local remote_size remote_sha256
  remote_size="$(aws "${aws_args[@]}" s3api head-object \
    --bucket "$bucket" --key "$remote_key" --query ContentLength --output text)"
  [[ "$remote_size" == "$artifact_size" ]] || die "remote backup size verification failed for $bucket"
  remote_sha256="$(aws "${aws_args[@]}" s3api head-object \
    --bucket "$bucket" --key "$remote_key" --query Metadata.sha256 --output text)"
  [[ "$remote_sha256" == "$artifact_sha256" ]] ||
    die "remote backup checksum metadata verification failed for $bucket"
  printf 'remote_backup=%s/%s\n' "$bucket" "$remote_key"
}

upload_backup_set "$BACKUP_REMOTE_BUCKET" rolling
if [[ "$(date -u +%d%H)" == 0102 ]]; then
  [[ -n "${BACKUP_MONTHLY_REMOTE_BUCKET:-}" ]] ||
    die 'BACKUP_MONTHLY_REMOTE_BUCKET is required for the scheduled monthly archive'
  upload_backup_set "$BACKUP_MONTHLY_REMOTE_BUCKET" monthly
fi

if [[ -n "$metrics_dir" ]]; then
  mkdir -p -- "$metrics_dir"
  metrics_tmp="$(mktemp "$metrics_dir/backup.prom.XXXXXX")"
  duration="$(( $(date -u +%s) - started_epoch ))"
  cat >"$metrics_tmp" <<EOF
# HELP school_transport_backup_last_success_timestamp_seconds Last remotely verified backup completion.
# TYPE school_transport_backup_last_success_timestamp_seconds gauge
school_transport_backup_last_success_timestamp_seconds $(date -u +%s)
# HELP school_transport_backup_duration_seconds Duration of the last successful backup.
# TYPE school_transport_backup_duration_seconds gauge
school_transport_backup_duration_seconds $duration
# HELP school_transport_backup_size_bytes Encrypted size of the last successful backup.
# TYPE school_transport_backup_size_bytes gauge
school_transport_backup_size_bytes $artifact_size
# HELP school_transport_backup_remote_verification_success Whether the last upload passed remote verification.
# TYPE school_transport_backup_remote_verification_success gauge
school_transport_backup_remote_verification_success 1
EOF
  chmod 0644 "$metrics_tmp"
  mv -f -- "$metrics_tmp" "$metrics_dir/school-transport-backup.prom"
fi
write_run_status 1

find "$BACKUP_OUTPUT_DIR" -maxdepth 1 -type f \
  \( -name '*.dump.age' -o -name '*.dump.age.sha256' -o -name '*.dump.age.manifest.json' \) \
  -mmin "+$(( BACKUP_LOCAL_RETENTION_HOURS * 60 ))" -delete

printf 'backup completed and all required remote copies verified: bytes=%s\n' "$artifact_size"

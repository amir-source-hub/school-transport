#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

for command in age aws docker flock openssl sha256sum; do require_command "$command"; done
for name in BACKUP_REMOTE_BUCKET BACKUP_REMOTE_PREFIX BACKUP_AGE_IDENTITY_FILE RESTORE_VALIDATION_DIR; do
  [[ -n "${!name:-}" ]] || die "$name is required"
done
[[ -f "$BACKUP_AGE_IDENTITY_FILE" ]] || die 'BACKUP_AGE_IDENTITY_FILE does not exist'

umask 077
mkdir -p -- "$RESTORE_VALIDATION_DIR"
exec 9>"${RESTORE_VALIDATION_LOCK_FILE:-$RESTORE_VALIDATION_DIR/.restore-validation.lock}"
flock -n 9 || die 'another restore validation is active'

metrics_dir="${BACKUP_METRICS_DIR:-}"
write_run_status() {
  local success="$1"
  [[ -n "$metrics_dir" ]] || return 0
  mkdir -p -- "$metrics_dir"
  local temporary
  temporary="$(mktemp "$metrics_dir/restore-validation-status.prom.XXXXXX")"
  cat >"$temporary" <<EOF
# HELP school_transport_restore_validation_last_run_success Whether the latest restore validation succeeded.
# TYPE school_transport_restore_validation_last_run_success gauge
school_transport_restore_validation_last_run_success $success
EOF
  chmod 0644 "$temporary"
  mv -f -- "$temporary" "$metrics_dir/school-transport-restore-validation-status.prom"
}
write_success_evidence() {
  local completed="$1" duration="$2"
  [[ -n "$metrics_dir" ]] || return 0
  local temporary
  temporary="$(mktemp "$metrics_dir/restore-validation-success.prom.XXXXXX")"
  cat >"$temporary" <<EOF
# HELP school_transport_restore_validation_last_success_timestamp_seconds Last successful restore validation.
# TYPE school_transport_restore_validation_last_success_timestamp_seconds gauge
school_transport_restore_validation_last_success_timestamp_seconds $completed
# HELP school_transport_restore_validation_duration_seconds Duration of the latest restore validation.
# TYPE school_transport_restore_validation_duration_seconds gauge
school_transport_restore_validation_duration_seconds $duration
EOF
  chmod 0644 "$temporary"
  mv -f -- "$temporary" "$metrics_dir/school-transport-restore-validation-success.prom"
}

started_epoch="$(date -u +%s)"
work_dir="$(mktemp -d "$RESTORE_VALIDATION_DIR/run.XXXXXX")"
container_name="school-transport-restore-validation-$$"
cleanup() {
  local status="$?"
  set +e
  docker rm --force "$container_name" >/dev/null 2>&1
  rm -rf -- "$work_dir"
  if [[ "$status" -ne 0 ]]; then write_run_status 0; fi
  exit "$status"
}
trap cleanup EXIT

aws_args=(--no-cli-pager)
[[ -z "${BACKUP_S3_ENDPOINT:-}" ]] || aws_args+=(--endpoint-url "$BACKUP_S3_ENDPOINT")
[[ -z "${BACKUP_S3_REGION:-}" ]] || aws_args+=(--region "$BACKUP_S3_REGION")

artifact="$work_dir/backup.dump.age"
checksum_file="$artifact.sha256"
manifest="$artifact.manifest.json"
candidates="$work_dir/candidates.tsv"
: >"$candidates"
buckets=("$BACKUP_REMOTE_BUCKET")
if [[ -n "${BACKUP_MONTHLY_REMOTE_BUCKET:-}" && "$BACKUP_MONTHLY_REMOTE_BUCKET" != "$BACKUP_REMOTE_BUCKET" ]]; then
  buckets+=("$BACKUP_MONTHLY_REMOTE_BUCKET")
fi
for bucket in "${buckets[@]}"; do
  manifest_keys="$(aws "${aws_args[@]}" s3api list-objects-v2 \
    --bucket "$bucket" --prefix "$BACKUP_REMOTE_PREFIX/" \
    --query 'Contents[?ends_with(Key, `.dump.age.manifest.json`)].Key' --output text)"
  while IFS= read -r manifest_key; do
    [[ -n "$manifest_key" && "$manifest_key" != None ]] || continue
    candidate_key="${manifest_key%.manifest.json}"
    printf '%s\t%s\t%s\n' "$(basename -- "$candidate_key")" "$bucket" "$candidate_key" >>"$candidates"
  done < <(printf '%s\n' "$manifest_keys" | tr '\t' '\n')
done
sort -r "$candidates" -o "$candidates"

selected_bucket=''
latest_key=''
while IFS=$'\t' read -r _ candidate_bucket candidate_key; do
  [[ -n "$candidate_key" ]] || continue
  rm -f -- "$artifact" "$checksum_file" "$manifest"
  aws "${aws_args[@]}" s3api head-object --bucket "$candidate_bucket" --key "$candidate_key" >/dev/null 2>&1 || continue
  aws "${aws_args[@]}" s3api head-object --bucket "$candidate_bucket" --key "$candidate_key.sha256" >/dev/null 2>&1 || continue
  aws "${aws_args[@]}" s3api get-object --bucket "$candidate_bucket" --key "$candidate_key" "$artifact" >/dev/null || continue
  aws "${aws_args[@]}" s3api get-object --bucket "$candidate_bucket" --key "$candidate_key.sha256" "$checksum_file" >/dev/null || continue
  aws "${aws_args[@]}" s3api get-object --bucket "$candidate_bucket" --key "$candidate_key.manifest.json" "$manifest" >/dev/null || continue
  expected_sha256="$(cut -d ' ' -f 1 "$checksum_file")"
  actual_sha256="$(sha256sum "$artifact" | cut -d ' ' -f 1)"
  [[ "$actual_sha256" == "$expected_sha256" ]] || continue
  grep -Fq "\"sha256\": \"$actual_sha256\"" "$manifest" || continue
  grep -Fq "\"remoteBucket\": \"$candidate_bucket\"" "$manifest" || continue
  grep -Fq "\"remoteKey\": \"$candidate_key\"" "$manifest" || continue
  selected_bucket="$candidate_bucket"
  latest_key="$candidate_key"
  break
done <"$candidates"
[[ -n "$latest_key" ]] || die 'no complete backup with a valid checksum and manifest was found'

postgres_image="${RESTORE_POSTGRES_IMAGE:-postgres:16-alpine@sha256:57c72fd2a128e416c7fcc499958864df5301e940bca0a56f58fddf30ffc07777}"
validator_user=restore_validator
validator_db=school_transport_restore_validation
validator_password="$(openssl rand -hex 24)"
docker run --detach --name "$container_name" --network none --read-only \
  --security-opt no-new-privileges=true --cap-drop ALL \
  --cap-add CHOWN --cap-add DAC_OVERRIDE --cap-add FOWNER --cap-add SETGID --cap-add SETUID \
  --pids-limit 200 --memory 2g --cpus 1.0 \
  --tmpfs /tmp:rw,noexec,nosuid,nodev,size=64m,mode=1777 \
  --tmpfs /var/run/postgresql:rw,noexec,nosuid,nodev,size=16m,mode=3775 \
  --tmpfs /var/lib/postgresql/data:rw,noexec,nosuid,nodev,size=1536m \
  --env POSTGRES_USER="$validator_user" --env POSTGRES_PASSWORD="$validator_password" \
  --env POSTGRES_DB="$validator_db" --env POSTGRES_INITDB_ARGS=--data-checksums \
  "$postgres_image" >/dev/null

ready=false
for _ in $(seq 1 60); do
  if docker exec "$container_name" pg_isready --username "$validator_user" --dbname "$validator_db" >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 2
done
[[ "$ready" == true ]] || die 'isolated PostgreSQL validation container did not become ready'

age --decrypt --identity "$BACKUP_AGE_IDENTITY_FILE" "$artifact" |
  docker exec --interactive "$container_name" pg_restore \
    --username "$validator_user" --dbname "$validator_db" --no-owner --no-privileges --exit-on-error

query() {
  docker exec "$container_name" psql --username "$validator_user" --dbname "$validator_db" \
    --no-psqlrc --tuples-only --no-align --set ON_ERROR_STOP=1 --command "$1"
}
schema_count="$(query "select count(*) from information_schema.tables where table_schema = 'public'")"
[[ "$schema_count" =~ ^[0-9]+$ && "$schema_count" -ge 10 ]] || die 'restored public schema is incomplete'
migration_count="$(query 'select count(*) from drizzle.__drizzle_migrations')"
[[ "$migration_count" =~ ^[0-9]+$ && "$migration_count" -gt 0 ]] || die 'restored migration history is empty'
restored_latest_migration="$(query "select coalesce(created_at::text || ':' || hash, 'none') from drizzle.__drizzle_migrations order by created_at desc limit 1" | tr -d '\r\n')"
grep -Fq "\"latestMigration\": \"$restored_latest_migration\"" "$manifest" ||
  die 'restored migration marker does not match the backup manifest'
for table in users students schools service_registrations contracts payment_transactions audit_logs; do
  exists="$(query "select to_regclass('public.$table') is not null")"
  [[ "$exists" == t ]] || die "required restored table is missing: $table"
done
invalid_constraints="$(query "select count(*) from pg_constraint where connamespace = 'public'::regnamespace and not convalidated")"
[[ "$invalid_constraints" == 0 ]] || die 'restored database contains unvalidated public constraints'
invalid_payment_plans="$(query 'select count(*) from payment_plans where total_amount <= 0 or prepayment_amount < 0 or remaining_installment_amount < 0 or total_amount <> prepayment_amount + remaining_installment_amount')"
[[ "$invalid_payment_plans" == 0 ]] || die 'restored payment plans violate financial invariants'
invalid_schedule_items="$(query 'select count(*) from payment_schedule_items where amount <= 0 or paid_amount not in (0, amount)')"
[[ "$invalid_schedule_items" == 0 ]] || die 'restored payment schedule items violate financial invariants'
critical_rows="$(query "select (select count(*) from users) || ',' || (select count(*) from students) || ',' || (select count(*) from payment_transactions)")"

duration="$(( $(date -u +%s) - started_epoch ))"
write_success_evidence "$(date -u +%s)" "$duration"
write_run_status 1
printf 'remote restore validation passed: bucket=%s key=%s tables=%s migrations=%s critical_rows=%s duration_seconds=%s\n' \
  "$selected_bucket" "$latest_key" "$schema_count" "$migration_count" "$critical_rows" "$duration"

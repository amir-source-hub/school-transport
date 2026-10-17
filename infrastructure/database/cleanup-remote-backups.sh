#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

for command in aws date flock; do require_command "$command"; done
for name in BACKUP_REMOTE_BUCKET BACKUP_MONTHLY_REMOTE_BUCKET BACKUP_REMOTE_PREFIX; do
  [[ -n "${!name:-}" ]] || die "$name is required"
done
[[ "$BACKUP_REMOTE_BUCKET" != "$BACKUP_MONTHLY_REMOTE_BUCKET" ]] || die 'rolling and monthly buckets must differ'
mode="${1:---dry-run}"
[[ "$mode" == --dry-run || "$mode" == --apply ]] || die 'usage: cleanup-remote-backups.sh [--dry-run|--apply]'
if [[ "$mode" == --apply ]]; then
  [[ "${CONFIRM_BACKUP_RETENTION_CLEANUP:-}" == DELETE_EXPIRED_LOCKED_BACKUPS ]] ||
    die 'set CONFIRM_BACKUP_RETENTION_CLEANUP=DELETE_EXPIRED_LOCKED_BACKUPS'
fi
rolling_days="${BACKUP_ROLLING_RETENTION_DAYS:-35}"
monthly_days="${BACKUP_MONTHLY_RETENTION_DAYS:-400}"
for value in "$rolling_days" "$monthly_days"; do
  [[ "$value" =~ ^[0-9]+$ && "$value" -ge 1 ]] || die 'retention days must be positive integers'
done

state_dir="${BACKUP_RETENTION_STATE_DIR:-/var/lib/school-transport/backup-retention}"
metrics_dir="${BACKUP_METRICS_DIR:-}"
umask 077
mkdir -p -- "$state_dir"
exec 9>"${BACKUP_RETENTION_LOCK_FILE:-$state_dir/.cleanup.lock}"
flock -n 9 || die 'another retention cleanup is active'

write_status() {
  local success="$1" eligible="$2" deleted="$3"
  [[ -n "$metrics_dir" ]] || return 0
  mkdir -p -- "$metrics_dir"
  local temporary
  temporary="$(mktemp "$metrics_dir/backup-retention.prom.XXXXXX")"
  cat >"$temporary" <<EOF
# HELP school_transport_backup_retention_last_run_success Whether the latest retention run succeeded.
# TYPE school_transport_backup_retention_last_run_success gauge
school_transport_backup_retention_last_run_success $success
# HELP school_transport_backup_retention_eligible_sets Number of expired backup sets found.
# TYPE school_transport_backup_retention_eligible_sets gauge
school_transport_backup_retention_eligible_sets $eligible
# HELP school_transport_backup_retention_deleted_versions Number of object versions deleted by the latest run.
# TYPE school_transport_backup_retention_deleted_versions gauge
school_transport_backup_retention_deleted_versions $deleted
EOF
  chmod 0644 "$temporary"
  mv -f -- "$temporary" "$metrics_dir/school-transport-backup-retention.prom"
}
write_success_evidence() {
  [[ -n "$metrics_dir" ]] || return 0
  mkdir -p -- "$metrics_dir"
  local temporary
  temporary="$(mktemp "$metrics_dir/backup-retention-success.prom.XXXXXX")"
  cat >"$temporary" <<EOF
# HELP school_transport_backup_retention_last_success_timestamp_seconds Last successful retention cleanup.
# TYPE school_transport_backup_retention_last_success_timestamp_seconds gauge
school_transport_backup_retention_last_success_timestamp_seconds $(date -u +%s)
EOF
  chmod 0644 "$temporary"
  mv -f -- "$temporary" "$metrics_dir/school-transport-backup-retention-success.prom"
}
eligible_sets=0
deleted_versions=0
on_error() {
  local status="$?"
  set +e
  write_status 0 "$eligible_sets" "$deleted_versions"
  exit "$status"
}
trap on_error ERR

aws_args=(--no-cli-pager)
[[ -z "${BACKUP_S3_ENDPOINT:-}" ]] || aws_args+=(--endpoint-url "$BACKUP_S3_ENDPOINT")
[[ -z "${BACKUP_S3_REGION:-}" ]] || aws_args+=(--region "$BACKUP_S3_REGION")

is_complete() {
  local bucket="$1" key="$2"
  aws "${aws_args[@]}" s3api head-object --bucket "$bucket" --key "$key.sha256" >/dev/null 2>&1 &&
    aws "${aws_args[@]}" s3api head-object --bucket "$bucket" --key "$key.manifest.json" >/dev/null 2>&1
}

delete_set_versions() {
  local bucket="$1" artifact_key="$2"
  local rows object_key version_id
  rows="$(aws "${aws_args[@]}" s3api list-object-versions --bucket "$bucket" --prefix "$artifact_key" \
    --query 'Versions[].[Key,VersionId]' --output text)"
  while IFS=$'\t' read -r object_key version_id; do
    [[ -n "$object_key" && "$object_key" != None ]] || continue
    case "$object_key" in
      "$artifact_key"|"$artifact_key.sha256"|"$artifact_key.manifest.json") ;;
      *) die "refusing unexpected version key: $object_key" ;;
    esac
    if [[ "$mode" == --dry-run ]]; then
      printf 'would_delete bucket=%s key=%s version=%s\n' "$bucket" "$object_key" "$version_id"
    else
      aws "${aws_args[@]}" s3api delete-object --bucket "$bucket" --key "$object_key" \
        --version-id "$version_id" >/dev/null
      deleted_versions=$((deleted_versions + 1))
      printf 'deleted bucket=%s key=%s version=%s\n' "$bucket" "$object_key" "$version_id"
    fi
  done <<<"$rows"
}

cleanup_bucket() {
  local bucket="$1" retention_days="$2"
  local inventory="$state_dir/${bucket//[^a-zA-Z0-9_.-]/_}.tsv"
  aws "${aws_args[@]}" s3api list-objects-v2 --bucket "$bucket" --prefix "$BACKUP_REMOTE_PREFIX/" \
    --query 'Contents[?ends_with(Key, `.dump.age`)].[LastModified,Key]' --output text |
    sort -r >"$inventory"
  local newest_good='' modified key modified_epoch cutoff_epoch
  cutoff_epoch="$(( $(date -u +%s) - retention_days * 86400 ))"
  while IFS=$'\t' read -r modified key; do
    [[ -n "$key" && "$key" != None ]] || continue
    if [[ -z "$newest_good" ]] && is_complete "$bucket" "$key"; then newest_good="$key"; fi
  done <"$inventory"
  [[ -n "$newest_good" ]] || die "no complete backup exists in $bucket; refusing retention cleanup"

  while IFS=$'\t' read -r modified key; do
    [[ -n "$key" && "$key" != None ]] || continue
    [[ "$key" != "$newest_good" ]] || continue
    modified_epoch="$(date -u -d "$modified" +%s)"
    (( modified_epoch < cutoff_epoch )) || continue
    eligible_sets=$((eligible_sets + 1))
    delete_set_versions "$bucket" "$key"
  done <"$inventory"
  printf 'retention_checked bucket=%s days=%s newest_preserved=%s\n' "$bucket" "$retention_days" "$newest_good"
}

cleanup_bucket "$BACKUP_REMOTE_BUCKET" "$rolling_days"
cleanup_bucket "$BACKUP_MONTHLY_REMOTE_BUCKET" "$monthly_days"
write_success_evidence
write_status 1 "$eligible_sets" "$deleted_versions"
printf 'retention complete: mode=%s eligible_sets=%s deleted_versions=%s\n' \
  "$mode" "$eligible_sets" "$deleted_versions"

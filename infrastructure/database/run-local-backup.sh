#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

fail() { printf 'error: %s\n' "$*" >&2; exit 1; }
for tool in docker flock sha256sum df mktemp; do
  command -v "$tool" >/dev/null || fail "$tool is required"
done
[[ "${CONFIRM_PRODUCTION_BACKUP:-}" == BACKUP_ONLY ]] || fail 'production backup confirmation is required'
output="${BACKUP_OUTPUT_DIR:-/var/lib/school-transport/backups}"
container="${BACKUP_POSTGRES_CONTAINER:-school-transport-production-postgres-1}"
retention="${BACKUP_LOCAL_RETENTION_HOURS:-168}"
minimum_free="${BACKUP_MIN_FREE_KB:-1048576}"
[[ "$retention" =~ ^[0-9]+$ && "$retention" -ge 6 && "$retention" -le 8760 ]] || fail 'retention must be 6 through 8760 hours'
[[ "$minimum_free" =~ ^[0-9]+$ ]] || fail 'BACKUP_MIN_FREE_KB must be a non-negative integer'
[[ "$output" == /* && "$output" != / ]] || fail 'backup output must be an absolute directory other than /'
mkdir -p -- "$output"
exec 9>"$output/.backup.lock"
flock -n 9 || fail 'another backup is running'
free_kb="$(df -Pk -- "$output" | awk 'END {print $4}')"
[[ "$free_kb" =~ ^[0-9]+$ && "$free_kb" -ge "$minimum_free" ]] || fail 'insufficient free disk space; inspect storage before retrying'

temporary="$(mktemp "$output/.local-backup.XXXXXX")"
checksum_tmp=''
cleanup() {
  rm -f -- "$temporary"
  [[ -z "$checksum_tmp" ]] || rm -f -- "$checksum_tmp"
}
trap cleanup EXIT

# Credentials are resolved inside the existing container and never printed.
docker exec "$container" sh -ec '
  if [ -n "${POSTGRES_PASSWORD_FILE:-}" ]; then
    PGPASSWORD="$(cat "$POSTGRES_PASSWORD_FILE")"
  else
    PGPASSWORD="${POSTGRES_PASSWORD:-}"
  fi
  export PGPASSWORD
  exec pg_dump --username="${POSTGRES_USER:?}" --dbname="${POSTGRES_DB:?}" \
    --format=custom --compress=6 --no-owner --no-acl
' > "$temporary"
[[ -s "$temporary" ]] || fail 'backup is empty'
docker exec -i "$container" pg_restore --list < "$temporary" >/dev/null
artifact="$output/school_transport_$(date -u +%Y%m%dT%H%M%SZ).dump"
[[ ! -e "$artifact" ]] || fail 'backup filename already exists'
checksum_tmp="$(mktemp "$output/.local-checksum.XXXXXX")"
hash="$(sha256sum "$temporary")"
printf '%s  %s\n' "${hash%% *}" "$(basename "$artifact")" > "$checksum_tmp"
mv -- "$temporary" "$artifact"
mv -- "$checksum_tmp" "$artifact.sha256"

# Expire only this runner's completed pairs after a new valid backup exists.
while IFS= read -r -d '' old; do
  [[ "$old" == "$artifact" || ! -f "$old.sha256" ]] && continue
  rm -f -- "$old" "$old.sha256"
done < <(find "$output" -maxdepth 1 -type f \
  -name 'school_transport_????????T??????Z.dump' \
  -mmin "+$((retention * 60))" -print0)
printf 'Local backup completed: %s\nArchive listing validated; a full restore test is still required.\n' "$artifact"

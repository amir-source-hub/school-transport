# Database release, backup, restore, and rollback runbook

These procedures are for PostgreSQL operators. Never paste database URLs into logs, tickets, or
command history. Production credentials and age identities belong in the deployment secret store,
not in the repository or CI artifacts.

## Migration design and review

Every schema change requires an expand/contract plan in its pull request. The expand release may
add nullable columns, new tables/indexes, or dual-read/write compatibility, but must not rename or
drop objects still used by the current release. Backfill in bounded, resumable batches with measured
lock duration. Verify old and new application versions against the expanded schema. Only a later
contract release may remove old reads/writes and then obsolete objects, after telemetry confirms no
old release or worker uses them.

Review migration SQL for table rewrites, long locks, unbounded updates, irreversible data loss,
index-build behavior, transaction compatibility, and disk/replication headroom. `db:push` is never a
release mechanism. Generated migration files are immutable after deployment.

## Release sequence

1. Run `bash infrastructure/host/preflight.sh`, then confirm replication, disk, connection, queue,
   and error-rate health; stop if any preflight or health check is degraded.
2. Run `bash infrastructure/database/migrate-safe.sh --dry-run`, inspect every listed SQL file,
   then run it with `--status`.
3. Run `bash infrastructure/database/run-backup.sh`. It creates an encrypted artifact, checksum,
   and manifest; uploads all three to S3-compatible remote storage; and verifies the remote size.
   Retain 140 six-hourly backups (35 days) and 13 monthly backups unless legal policy requires a
   different period. Record the immutable object version as `BACKUP_RECEIPT`.
4. Test decryption and restore into an isolated `_restore_validation` database. Run
   `bash infrastructure/database/validate-restore.sh`, application health checks, and a representative read-only query.
5. Set a unique `RELEASE_ID`; deploy exactly one migration runner using
   `bash infrastructure/database/migrate-safe.sh --apply`.
   The PostgreSQL advisory lock rejects concurrent runners. Never run migrations from every app
   replica.
6. Deploy the backward-compatible application, monitor database locks, latency, errors, and queues,
   and record migration/release identifiers. Run `--status` again.

## Failure and rollback

Prefer a forward fix for additive migrations. Roll back application code only while the expanded
schema remains backward-compatible. Never automatically reverse a migration that dropped or
rewrote data. For destructive failure, stop writers, preserve evidence, obtain incident-commander
approval, and restore the verified backup into new infrastructure. Validate it before controlled
traffic cutover. Define recovery objectives in the service policy; the recommended starting targets
are RPO 6 hours and RTO 4 hours. A backup counts toward RPO only after remote verification.

Restore scripts deliberately refuse production database names and require an exact
`ALLOW_DESTRUCTIVE_RESTORE` match. Production recovery must use a separately reviewed incident
procedure and a new database/cluster, never an in-place CI command.

## Routine evidence

Run the non-production CI smoke workflow on migration and operational-script changes and weekly.
Quarterly, operators must perform an isolated restore drill, record duration and integrity results,
verify retention/immutability and key recovery, and resolve any RPO/RTO miss. Backup success alone
is not recovery evidence.

## Six-hour production backup service

The host service runs at 02:00, 08:00, 14:00, and 20:00 UTC. `Persistent=true` catches a missed timer
after host recovery, and `flock` prevents overlap. Backups are online PostgreSQL snapshots; ordinary
application reads and writes continue, although operators must monitor I/O and latency and must not
run schema migrations concurrently.

Prerequisites are `age`, AWS CLI v2, `flock`, and Docker Compose. The monitoring deployment runs
Node Exporter as a digest-pinned Docker image and mounts `/var/lib/node_exporter/textfile_collector`
read-only as its textfile collector directory. Compose mode executes `pg_dump` inside
the existing PostgreSQL container and streams it directly into host-side encryption, so PostgreSQL
is not exposed and no plaintext dump is written to disk. Membership in the Docker group is
privileged host access; restrict this service account and audit its use. S3 credentials must be
upload-only and must not permit deletion or retention changes. The host receives only the public
`age` recipient.

```sh
bash infrastructure/database/install-backup.sh --check
sudo env CONFIRM_BACKUP_INSTALL=INSTALL_SCHOOL_TRANSPORT_BACKUP \
  bash infrastructure/database/install-backup.sh --apply
```

Replace every placeholder in `/etc/school-transport/backup.env`. Validate bucket public-access
blocking, versioning, encryption, immutable retention, lifecycle, and access logging. Then run and
inspect one backup before enabling the schedule:

```sh
sudo systemctl start school-transport-backup.service
sudo systemctl status school-transport-backup.service
sudo journalctl -u school-transport-backup.service --since today
sudo systemctl enable --now school-transport-backup.timer
systemctl list-timers school-transport-backup.timer
```

The backup job writes every successful run to the rolling bucket and also writes the 02:00 run on
the first day of each month to the monthly bucket. A manifest uploaded last is the completion marker.
Do not enable the timer until a recovery operator has restored the first remote copy into an isolated
validation database.

### Arvan Cloud bucket controls

Arvan's Object Storage management API supports private buckets, versioning, default Object Lock
retention, temporary users, access points, replication, and bucket Prometheus metrics. It does not
currently publish lifecycle-expiration or explicit encryption-at-rest configuration in the same API.
Use two buckets so default lock periods match the two retention classes:

- rolling bucket: private, versioned, Object Lock at least 35 days;
- monthly bucket: private, versioned, Object Lock at least 400 days.

Run the management utility from an operator workstation using a short-lived Arvan API token. Check
mode is read-only. Apply mode creates missing buckets or enables versioning/retention, but refuses to
silently repair a public bucket:

```sh
node --env-file=/secure/path/arvan-backup-buckets.env \
  infrastructure/database/configure-arvan-backup-buckets.mjs --check
CONFIRM_ARVAN_BACKUP_BUCKETS=CREATE_LOCKED_BACKUP_BUCKETS \
  node --env-file=/secure/path/arvan-backup-buckets.env \
  infrastructure/database/configure-arvan-backup-buckets.mjs --apply
```

Arvan default Object Lock prevents early deletion but does not itself delete expired objects. Until
Arvan exposes a lifecycle feature, schedule cleanup with a separate deletion identity after the lock
period and test it against disposable objects. Do not grant deletion rights to the backup uploader.
Temporary users provide expiry, but the published management schema does not establish fine-grained
S3 action policies; verify bucket scoping in the Arvan panel and with explicit denied-operation tests.

Install the retention worker on the deployment host. Give its dedicated identity list and
delete-version access only to the two backup buckets. Configure
`/etc/school-transport/backup-retention.env`, then execute and review a dry run. The worker always
preserves the newest complete set in each bucket and deletes exact object versions, avoiding
versioning delete markers.

```sh
bash infrastructure/database/install-retention-cleanup.sh --check
sudo env CONFIRM_RETENTION_INSTALL=INSTALL_SCHOOL_TRANSPORT_RETENTION \
  bash infrastructure/database/install-retention-cleanup.sh --apply
sudo systemctl start school-transport-backup-retention.service
sudo journalctl -u school-transport-backup-retention.service --since today
sudo systemctl enable --now school-transport-backup-retention.timer
```

Before starting the applying service, temporarily change its `ExecStart` to `--dry-run`, inspect the
output, then restore `--apply`. Do not put storage credentials on a command line.

## Weekly isolated restore validation

Install the validator on a separate recovery host. That host receives a read-only bucket identity
and the private `age` identity; the production backup host receives neither. The validator searches
both retention classes and skips incomplete or corrupt candidates. It verifies checksum and manifest
agreement, restores into a temporary network-disabled PostgreSQL container, checks the exact
migration marker, required tables, validated constraints, and financial invariants, emits metrics,
then destroys the container and downloaded files.

```sh
bash infrastructure/database/install-restore-validator.sh --check
sudo env CONFIRM_RESTORE_VALIDATOR_INSTALL=INSTALL_SCHOOL_TRANSPORT_RESTORE_VALIDATOR \
  bash infrastructure/database/install-restore-validator.sh --apply
```

Replace `/etc/school-transport/restore-validation.env`, then install the escrowed private identity at
`/etc/school-transport/keys/backup-age-identity.txt` owned by root, group `school-transport-recovery`,
mode `0640`. Manually validate before enabling the Sunday timer:

```sh
sudo systemctl start school-transport-restore-validation.service
sudo systemctl status school-transport-restore-validation.service
sudo journalctl -u school-transport-restore-validation.service --since today
sudo systemctl enable --now school-transport-restore-validation.timer
```

The disposable database has no network interface and uses tmpfs, so restored personal data does not
persist after the job. Docker-group membership is root-equivalent; dedicate and restrict the recovery
host, audit access, and do not run unrelated workloads on it. Weekly automation supplements rather
than replaces the documented quarterly operator recovery drill.

## Provisioning the first administrator

Keep demo seeding disabled in production. On a brand-new empty database, create only the first
administrator with this one-time command:

```bash
docker compose --env-file .env -f docker-compose.production.yml run --rm --no-deps \
  -e ALLOW_INSECURE_DEMO_ADMIN=true \
  api node dist/database/create-initial-admin.js
```

The command refuses to run when any administrator already exists and never creates demo schools,
students, registrations, or payments. The compatibility credentials are `demo-admin` /
`demo-admin-password`; change this publicly known password before exposing the service to users.

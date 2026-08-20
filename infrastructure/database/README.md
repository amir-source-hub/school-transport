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
3. Create an encrypted `bash infrastructure/database/backup.sh` artifact and checksum. Copy both to encrypted, access-logged,
   immutable object storage with cross-account or cross-region protection. Keep daily backups 35
   days and monthly backups 13 months unless legal policy requires longer. Record its object version
   as `BACKUP_RECEIPT`.
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
are RPO 24 hours and RTO 4 hours, then test and tighten them.

Restore scripts deliberately refuse production database names and require an exact
`ALLOW_DESTRUCTIVE_RESTORE` match. Production recovery must use a separately reviewed incident
procedure and a new database/cluster, never an in-place CI command.

## Routine evidence

Run the non-production CI smoke workflow on migration and operational-script changes and weekly.
Quarterly, operators must perform an isolated restore drill, record duration and integrity results,
verify retention/immutability and key recovery, and resolve any RPO/RTO miss. Backup success alone
is not recovery evidence.

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

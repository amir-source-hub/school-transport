# Backend operations runbook

## Environment boundaries

- Development uses Docker Compose, development seed accounts, console OTP, and the mock gateway.
- Test uses an isolated PostgreSQL database, isolated Redis, provider mocks, and no production data.
- Staging must use separate credentials, databases, storage, and provider sandbox accounts.
- Production must reject `OTP_PROVIDER=console` and `PAYMENT_GATEWAY_PROVIDER=mock`; secrets must come from the deployment secret manager rather than committed files.

## Controlled migration

1. Back up PostgreSQL and verify the backup is readable.
2. Build the immutable API image containing reviewed forward migrations.
3. Run `node dist/database/migrate.js` as a one-off deployment job.
4. Verify the migration journal and application health before starting new application instances.
5. Do not rewrite or remove an applied migration. Correct defects with a new forward migration.

## Local backup and restore drill

Create a custom-format backup:

```sh
docker compose exec -T postgres pg_dump -U school_transport -d school_transport -Fc > school_transport.dump
```

Restore only into a disposable empty validation database:

```sh
docker compose exec -T postgres createdb -U school_transport school_transport_restore_test
docker compose exec -T postgres pg_restore -U school_transport -d school_transport_restore_test --clean --if-exists < school_transport.dump
docker compose exec -T postgres psql -U school_transport -d school_transport_restore_test -c "select count(*) from drizzle.__drizzle_migrations;"
```

Never overwrite production as a restore test. Store production backups encrypted, access-controlled, and outside the application host according to the deployment specification.

## Rollback and forward-fix

Prefer a forward fix. Roll application code back only when the previous version is compatible with the migrated schema. Restore a database backup only for confirmed destructive corruption and only with explicit incident authorization, because it can discard newer transactions.

## Incident checks

1. Check API and worker structured logs by request/job identifier.
2. Check `/api/v1/health`, PostgreSQL readiness, Redis readiness, and BullMQ failed jobs.
3. Disable the affected external adapter or payment action if correctness is uncertain.
4. Preserve logs and database evidence without copying secrets or complete personal records.
5. Apply and verify a reviewed forward fix, then document impact and follow-up tests.

## Authentication retention

The worker runs `purge-expired-auth-data` daily. It removes sessions and OTP requests only after their expiry is older than `AUTH_SESSION_RETENTION_DAYS` (30 days by default). PostgreSQL remains authoritative; Redis contains queue state only.

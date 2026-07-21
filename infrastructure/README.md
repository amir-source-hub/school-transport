# Local infrastructure

The development stack uses PostgreSQL as the authoritative store and Redis-backed BullMQ for retryable background work. Docker Compose runs PostgreSQL, Redis, a controlled migration/seed job, the API, and a separate worker.

## Start the stack

```sh
docker compose up -d --build
docker compose ps
```

The API is available at `http://localhost:3001/api/v1`; health is at `/health`. Named volumes preserve PostgreSQL and Redis data between restarts. The migration and idempotent seed job runs before the API and worker start.

Development seed accounts:

- Parent: `demo-parent` / `DemoParent123`
- Admin: `demo-admin` / `DemoAdmin123!`

These credentials and the Compose secrets are local-development values only.

## Development providers

- OTP delivery uses `OTP_PROVIDER=console`; retrieve codes with `docker compose logs api`. This adapter cannot be selected in production.
- Payments use `PAYMENT_GATEWAY_PROVIDER=mock`. Mock verification tokens have the form `mock:<amount>:<transactionId>` and are accepted only when the amount matches the server-side schedule item.
- SMS, email, object storage, domain/TLS, and a real payment gateway remain unconfigured. Their adapters fail closed.

## Database operations

```sh
docker compose run --rm migrate node dist/database/migrate.js
docker compose run --rm migrate node dist/database/seed.js
```

The Compose PostgreSQL initialization also creates `school_transport_test`. To validate migrations against it:

```sh
docker compose run --rm -e DATABASE_URL=postgresql://school_transport:school_transport_dev@postgres:5432/school_transport_test migrate node dist/database/migrate.js
```

Never run the development seed against production. Production migrations are controlled, versioned, and forward-only.

## Stop services

```sh
docker compose down
```

This preserves named volumes. Removing volumes destroys local data and must be an explicit operation.

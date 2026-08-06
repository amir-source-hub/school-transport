# PostgreSQL network and authentication boundary

PostgreSQL has no published host port and joins only Compose's internal `backend` network. Network
isolation is defense in depth: every IPv4, IPv6, and Unix-socket connection still requires
`scram-sha-256` in the reviewed, read-only `pg_hba.conf`; no active rule uses `trust`. The official
entrypoint supplies the secret-backed password while processing initialization scripts. PostgreSQL
also stores new password verifiers as SCRAM hashes.

Changing `POSTGRES_INITDB_ARGS` affects only newly initialized data volumes. The explicit server HBA
and password-encryption settings apply on each start, but an existing role with an older MD5 verifier
must have its password rotated through the secret store before SCRAM-only rollout. Keep
`POSTGRES_PASSWORD` and `DATABASE_URL` synchronized without placing either value in source control.

## Static verification

Run:

```sh
POSTGRES_PASSWORD=validation-only-password \
REDIS_PASSWORD=validation-only-password \
DATABASE_URL=postgresql://validation:validation@postgres:5432/validation \
REDIS_URL=redis://:validation@redis:6379 \
JWT_SECRET=validation-only-secret-with-at-least-32-characters \
docker compose config --format json > /tmp/school-transport-compose.json

node infrastructure/container/assert-compose.mjs /tmp/school-transport-compose.json
node infrastructure/postgres/assert-auth.mjs infrastructure/postgres/pg_hba.conf
```

The checks reject PostgreSQL host-port publication, attachment outside the internal backend network,
missing SCRAM initialization/server settings, writable HBA mounts, active `trust`, and non-SCRAM TCP
rules.

## Isolated integration verification

Only on a disposable host with no production environment loaded, use a unique Compose project and
random temporary passwords. Never point these commands at an existing volume or database:

```sh
docker compose -p school-transport-auth-verification up -d postgres
docker compose -p school-transport-auth-verification exec postgres \
  psql -U school_transport -d school_transport -c \
  "show password_encryption; select type,address,auth_method,error from pg_hba_file_rules;"

# This TCP attempt must fail.
docker compose -p school-transport-auth-verification exec -e PGPASSWORD=wrong postgres \
  psql -h 127.0.0.1 -U school_transport -d school_transport -c 'select 1'

# This must print no public binding.
docker compose -p school-transport-auth-verification port postgres 5432
docker compose -p school-transport-auth-verification down --volumes --remove-orphans
```

Confirm `password_encryption` is `scram-sha-256`, all host rules report `scram-sha-256` with no
errors, the bad-password test fails, and the port command prints nothing. Application bootstrap and
migrations continue over `DATABASE_URL` with the secret-backed database password.

# Production deployment runbook

This runbook turns `production-readiness-specification.md` into an executable release process.
Repository checks are necessary but do not replace staging, provider, legal, or infrastructure
approval. Production deployment must stop whenever a required gate below has no evidence.

## Clean local checkout

Prerequisites are Git, Docker Engine, and Docker Compose v2. No host Node.js, PostgreSQL, or Redis
is required for the application stack.

```bash
git clone https://github.com/amir-source-hub/school-transport.git
cd school-transport
cp .env.example .env
docker compose --env-file .env -f docker-compose.local.yml up --build --wait --wait-timeout 300
```

The local stack publishes only loopback ports: web `3000`, API `5000`, PostgreSQL `5433`, and Redis
`6379`. `bootstrap` applies migrations once before API/worker startup. Diagnose with:

```bash
docker compose --env-file .env -f docker-compose.local.yml ps --all
docker compose --env-file .env -f docker-compose.local.yml logs -f
```

Stop without deleting data:

```bash
docker compose --env-file .env -f docker-compose.local.yml down
```

The following reset is destructive and deletes the local database/cache volumes:

```bash
docker compose --env-file .env -f docker-compose.local.yml down --volumes
```

## Production inputs (never commit values)

Create the production `.env.production` on the Linux deployment host with mode `0600`. Generate independent
random values of at least 32 bytes for PostgreSQL, Redis, JWT, and metrics credentials. Generate
`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` as a base64-encoded 32-byte AES key. Set exact HTTPS public
origins, immutable `NEXT_DEPLOYMENT_ID`, public asset release URL, trusted proxy CIDRs, storage
configuration, and approved provider settings. Never reuse the local fixture or demo credentials.

```bash
cp infrastructure/config/production.env.template .env.production
chmod 600 .env.production
# Replace every CHANGE_ME value, then validate without printing secrets:
node infrastructure/config/validate-production-env.mjs .env.production
```

The API requires an approved Kavenegar OTP template and key in production. Offline payment remains
available while `PAYMENT_GATEWAY_PROVIDER=none`; there is no implemented online gateway yet.

Before enabling traffic, independently supply and approve:

- production domain, DNS, TLS email/ownership, firewall, and staging hostname;
- scoped private S3 bucket credentials, lifecycle, CORS, signed-URL and deletion verification;
- real OTP/SMS and payment provider credentials plus sandbox acceptance evidence;
- backup destination/key, successful restore drill, retention and legal/privacy decisions;
- monitoring destinations, escalation owners, alert tests, and GitHub environment approvals.

These are external gates and are intentionally not represented as successful by repository tests.

## Repository and host preflight

Run from the exact reviewed commit:

```bash
pnpm install --frozen-lockfile
pnpm env:check
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
node infrastructure/config/validate-production-env.mjs .env.production
docker compose --env-file .env.production -f docker-compose.production.yml config --quiet
bash infrastructure/host/preflight.sh
bash infrastructure/container/validate.sh
```

Do not print `docker compose config` in deployment logs because interpolated secret values may be
rendered. `config --quiet` validates without disclosing them.

## Release and deployment

1. Protect and review `main`; select an exact commit and unique release ID.
2. Build API/web images once in CI from locked dependencies using the BuildKit Server Actions
   secret. Generate SBOM, scan, sign, attest, and record immutable image digests.
3. Back up PostgreSQL and verify the backup receipt before migration.
4. Run the lock-protected migration/bootstrap service once; never migrate concurrently per replica.
5. Start the explicit production project:

   ```bash
   docker compose --env-file .env.production -f docker-compose.production.yml up -d --build --wait --wait-timeout 300 --remove-orphans
   ```

6. Verify homepage, API readiness, authentication, worker readiness, static/S3 assets, headers,
   database/Redis activity, logs, metrics, alerts, and the critical student/admin workflows.
7. Record commit, image digests, migration set, environment checksum without values, backup receipt,
   test evidence, approvers, accepted risks/expiry, and rollback image.

Rollback application images only when database compatibility is proven. Prefer a reviewed forward
fix for migrations; never improvise an in-place restore.

## Current verified repository evidence

- Root environment inventory validation passes and tracks 90 consumed variables.
- Local and production Compose files render explicitly; implicit Compose selection is unsupported.
- The local project starts PostgreSQL, Redis, bootstrap, API, worker, and web; all long-running
  services report healthy and bootstrap exits successfully.
- Public company logo is available from immutable public S3 storage with one-year caching.

The remaining unchecked items in `production-readiness-specification.md` stay open until their
external evidence and independent approvals exist.

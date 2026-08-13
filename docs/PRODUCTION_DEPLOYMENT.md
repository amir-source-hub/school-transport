# Deploying the current preview on samingasht.ir

This procedure upgrades the existing test deployment without deleting PostgreSQL, Redis, Caddy,
or application volumes. The server uses one ignored root `.env`, copied from the tracked
`.env.example`. Caddy is included in `docker-compose.production.yml`; do not install Nginx in front
of it unless the architecture is intentionally changed.

## Important preview limitations

Use `DEPLOYMENT_PROFILE=preview` while Kavenegar is unavailable. Fixed-credential demo/admin login
works, but operations that require sending or recovering an OTP return a provider-unavailable
error. Never use `OTP_PROVIDER=console` on an internet-accessible server. The preview profile also
allows idempotent demo seed data (three schools, parent/student, admin, contracts, payments, and
notifications). Change the seeded admin password before starting.

For public launch, switch to `DEPLOYMENT_PROFILE=production`, set `SEED_DEMO_DATA=false`, configure
Kavenegar, remove demo accounts/data, and complete the remaining production-readiness gates.

PostgreSQL and Redis still require distinct passwords even though they use private Docker networks.
They are separate authenticated services, and credentials limit access if another container is
compromised. They have no public host ports in the production Compose file.

## 1. Connect and locate the existing checkout

```bash
ssh YOUR_USER@YOUR_SERVER_IP
cd /path/to/school-transport
git status
```

If the existing checkout contains local source changes, stop and back them up before pulling. Do
not run `git reset --hard` against unknown server work.

## 2. Back up the existing database

At minimum, preserve the existing Docker volumes and take a database backup using the repository
backup runbook before updating. Do not run `docker compose down --volumes`.

```bash
docker volume ls | grep school-transport
```

## 3. Update exactly from main

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
git log -1 --oneline
```

The expected repository baseline for this runbook is commit `43654e8` or newer.

## 4. Preserve or create the single server environment

If the old deployment already has an ignored `.env`, back it up and keep its real S3/provider
credentials:

```bash
cp .env ".env.backup.$(date +%Y%m%d-%H%M%S)"
chmod 600 .env .env.backup.*
```

If `.env` does not exist:

```bash
cp .env.example .env
chmod 600 .env
```

Edit it:

```bash
nano .env
```

For the current test preview, set at least:

```dotenv
NODE_ENV=production
DEPLOYMENT_PROFILE=preview
APP_DOMAIN=samingasht.ir
ACME_EMAIL=YOUR_REAL_EMAIL

POSTGRES_DB=school_transport
POSTGRES_USER=school_transport
POSTGRES_PASSWORD=YOUR_EXISTING_OR_NEW_32_CHARACTER_PASSWORD
REDIS_PASSWORD=YOUR_EXISTING_OR_NEW_32_CHARACTER_PASSWORD
DATABASE_URL=postgresql://school_transport:URL_ENCODED_POSTGRES_PASSWORD@postgres:5432/school_transport
REDIS_URL=redis://:URL_ENCODED_REDIS_PASSWORD@redis:6379

JWT_SECRET=YOUR_RANDOM_32_BYTE_OR_LONGER_SECRET
METRICS_BEARER_TOKEN=YOUR_RANDOM_32_BYTE_OR_LONGER_TOKEN
SEED_ADMIN_PASSWORD=YOUR_UNIQUE_12_CHARACTER_OR_LONGER_PREVIEW_ADMIN_PASSWORD
SEED_DEMO_DATA=true
OTP_PROVIDER=none
SMS_PROVIDER=none
FEATURE_SMS_BROADCASTS=false
PAYMENT_GATEWAY_PROVIDER=none
API_DOCS_ENABLED=false
LOG_LEVEL=info
QUEUE_REQUIRED=true

CORS_ORIGINS=https://samingasht.ir
TRUSTED_PROXY_CIDRS=172.30.20.2/32
NEXT_PUBLIC_API_BASE_URL=https://samingasht.ir/api/v1
API_INTERNAL_BASE_URL=http://api:5000/api/v1
NEXT_DEPLOYMENT_ID=THE_CURRENT_GIT_COMMIT
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=BASE64_ENCODED_32_BYTE_KEY
MAP_TILE_CONTACT_URL=https://samingasht.ir/contact
```

Keep the real `ARVAN_S3_*`, `NEXT_PUBLIC_PRIVATE_UPLOAD_ORIGIN`, and
`NEXT_PUBLIC_ASSET_BASE_URL` values already used by the working deployment. S3 passwords/keys must
never appear in Git.

Generate independent secrets when values do not already exist:

```bash
openssl rand -hex 32
openssl rand -base64 32
git rev-parse HEAD
```

Do not casually change existing PostgreSQL/Redis passwords without coordinating the persisted
database/cache configuration. For an upgrade, retain the values used by the current containers.

## 5. Check domain and port ownership

The DNS A/AAAA record for `samingasht.ir` must point to this server. Caddy needs host ports 80 and 443. Check whether the old deployment or another proxy owns them:

```bash
getent hosts samingasht.ir
sudo ss -lntup | grep -E ':(80|443)\b'
docker ps --format 'table {{.Names}}\t{{.Ports}}'
```

If an old Caddy container from this project owns the ports, the Compose upgrade replaces it. If a
host Nginx, Arvan agent, or unrelated service owns them, stop and decide which proxy remains before
starting; two services cannot bind the same ports.

## 6. Validate without printing secrets

```bash
node infrastructure/config/validate-production-env.mjs .env
docker compose --env-file .env -f docker-compose.production.yml config --quiet
```

If Node is unavailable on the host, install the supported Node LTS or run the validator in a
temporary Node container. Do not use plain `docker compose config` in shared logs because it can
render secret values.

Linux must also satisfy Redis memory requirements:

```bash
sudo sysctl -w vm.overcommit_memory=1
bash infrastructure/host/preflight.sh
```

## 7. Upgrade the running deployment

First inspect the old services and preserve their names/volumes:

```bash
docker compose --env-file .env -f docker-compose.production.yml config --services
docker compose --env-file .env -f docker-compose.production.yml ps --all
```

Then build and start the explicit production stack:

```bash
docker compose --env-file .env -f docker-compose.production.yml up -d --build --wait --wait-timeout 300 --remove-orphans
```

`bootstrap` applies migrations and the preview seed idempotently before API/worker startup. It must
exit with code 0. Do not run another migration process concurrently.

## 8. Verify

```bash
docker compose --env-file .env -f docker-compose.production.yml ps --all
docker compose --env-file .env -f docker-compose.production.yml logs --no-color --tail 200
curl -fsS https://samingasht.ir/api/v1/health/ready
curl -I https://samingasht.ir
```

Expected state: PostgreSQL/Redis/API/worker/web are healthy, bootstrap exited 0, and Caddy is
running with HTTPS. Then test admin login using `demo-admin` and the private
`SEED_ADMIN_PASSWORD`, demo parent login, school listing, uploads, offline payments, notifications,
and admin review flows.

## 9. Future updates

```bash
cd /path/to/school-transport
git pull --ff-only origin main
docker compose --env-file .env -f docker-compose.production.yml up -d --build --wait --wait-timeout 300 --remove-orphans
```

Never use `down --volumes` in production. It deletes persisted database/cache/proxy data.

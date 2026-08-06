# Production container boundary

The [Next.js release procedure](./NEXTJS_DEPLOYMENTS.md) defines build-once promotion and rollback
controls that prevent Server Action version skew.

The API and web images use the digest-pinned Node 20 Bookworm Slim base, install a version-pinned
`tini`, run as the unprivileged `node` user, emit logs to stdout/stderr, and place home/cache state
under `/tmp`. They are designed to run with a read-only root filesystem and writable `/tmp` tmpfs.
Health checks use Node's built-in `fetch`, avoiding an extra runtime HTTP client.

Run `bash infrastructure/container/validate.sh` from a machine with Docker and Node. It renders and
statically asserts every Compose security boundary, checks Dockerfile structure, builds both
production targets without starting application providers, validates Caddy offline in a
read-only/no-network container pinned by digest, and prints each image's runtime user, init
entrypoint, and health-check metadata. Review that output before publishing images.

Before any production rollout, also run `bash infrastructure/host/preflight.sh`; Redis must not start
on a Linux host unless the read-only check confirms `vm.overcommit_memory=1`.

Caddy terminates TLS 1.2/1.3, caps request bodies and header/time budgets, strips upstream and proxy
version headers, supplies authoritative forwarding headers, applies bounded upstream failure
handling, prevents caching authenticated routes, and emits common browser security headers. The
application remains responsible for route-specific CSP nonces and authorization.

Compose applies read-only roots, size-limited `/tmp` mounts, full capability drops, narrowly scoped
entrypoint capabilities for PostgreSQL/Redis and low-port binding for Caddy, no-new-privileges,
PID/memory/CPU limits, and graceful stop periods. PostgreSQL, Redis, and Caddy use immutable
multi-platform image-index digests. Their named data/config volumes intentionally remain writable;
bootstrap and migration code writes only to PostgreSQL and its bounded `/tmp`.

## Updating pinned images

1. Read the upstream release notes and confirm the tag remains on the intended major version.
2. Resolve the tag with `docker buildx imagetools inspect <image>:<tag>` and record the
   multi-platform index digest, not a workstation-specific manifest digest.
3. Verify the image is from the Docker Official Images namespace, review its provenance/attestation,
   and scan it before changing Compose. For Caddy, update the validation-script digest in the same
   pull request.
4. Run `bash infrastructure/container/validate.sh`, review the rendered static assertions and image
   metadata, then run the isolated deployment smoke workflow before approval.

Never use a floating tag without its digest in a production Compose service.

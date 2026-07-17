# 05 — Docker and Data Plane

Status: ACTIVE_CANONICAL

## Ownership

- `infra/docker` owns container composition, networks, volumes, health checks, runtime profiles, and resource constraints.
- `infra/data-plane` owns infrastructure provisioning for shared data services, roles, extensions, buckets, backup, restore, and platform health.
- `services/<service>/database` owns service migrations, service schema, indexes, seeds, and read models.

Infrastructure provisioning does not own service business schema, and service database folders do not own infrastructure lifecycle.

## Runtime truth

A compose file, image reference, health-check declaration, or environment example does not prove a runtime executed. Live-like claims require same-commit startup, health, migration, request, and persistence evidence for the affected profile.

## Forbidden

- memory repositories used as live-like persistence proof;
- wildcard CORS in live-like or production posture;
- business schema under shared infrastructure provisioning;
- infrastructure provisioning under service database ownership;
- untagged or floating container images where the locked runtime policy requires immutable or versioned references;
- mock, seed, or fixture success presented as provider or production proof;
- destructive reset as a default verification step.

## Acceptance condition

Accepted only when ownership boundaries are preserved, runtime profiles are explicit and fail-closed, data mutations remain with the correct service, destructive operations are opt-in, and every live-like claim is supported by same-commit runtime and persistence evidence.

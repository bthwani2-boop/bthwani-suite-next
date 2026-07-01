# 05 — Docker and Data Plane

Status: CANONICAL

## Ownership

`infra/docker` owns containers, networks, volumes, healthchecks, and resource limits.

`infra/data-plane` owns Postgres/MinIO/Redis provisioning, roles, extensions, buckets, backup, restore, and health.

`services/<service>/database` owns service migrations, seeds, indexes, schema, and read models.

## Forbidden

- memory repository in live-like runtime
- CORS wildcard in live-like runtime
- business schema inside infra/data-plane
- infra provisioning inside service database folders
- untagged or latest Docker images

## Acceptance condition

Accepted only when live-like journeys run through Docker and service schemas stay under service database folders.
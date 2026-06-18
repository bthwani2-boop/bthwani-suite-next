# PostgreSQL Data Plane

PostgreSQL is the only active data-plane service in Foundation-005.

## Runtime

- Compose file: `infra/docker/compose.runtime.yml`
- Image: `postgres:16-alpine`
- Default host port: `55432`
- Healthcheck: `pg_isready`

## Ownership

- `infra/docker` owns orchestration only.
- `infra/data-plane/postgres` owns provisioning scaffolding only.
- `services/<service>/database` owns service schema, migrations, seeds, and indexes.

## Rules

- Do not install PostgreSQL separately on Windows for this repository.
- Do not put service schema or migrations inside `infra/data-plane/postgres`.
- Do not use memory repositories in local/runtime execution.
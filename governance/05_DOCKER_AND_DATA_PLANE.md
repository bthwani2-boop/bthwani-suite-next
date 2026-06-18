# Docker and Data Plane

Docker is required for slice runtime evidence.

## infra/docker

Owns orchestration only.

## infra/data-plane

Owns Postgres/MinIO/Redis provisioning, roles, extensions, backup, restore.

## services/<service>/database

Owns service schema, migrations, seeds/local, and indexes.

## Forbidden

- memory repository in slice runtime
- CORS wildcard in realtest/live-like runtime
- media slice without MinIO
- auth inside DSH

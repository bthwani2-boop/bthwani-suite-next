# Runtime Profile Index

Canonical compose file:

- infra/docker/compose.runtime.yml

Forbidden:

- compose.local.yml
- compose.full.yml
- compose.slice.yml
- per-slice compose files

Profiles reserved:

- identity
- dsh
- wlt
- media

Activation rule:

- postgres runs by default
- media runs only with -Profile media
- dsh is activated only inside a DSH slice after backend/Dockerfile/health exists
- wlt is activated only inside a WLT/payment slice after backend/Dockerfile/health exists
- no donor containers, networks, ports, or volumes are allowed

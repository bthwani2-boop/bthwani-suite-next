# DSH Docker Runtime Contract

Owner:

- infra/docker owns compose services, containers, networks, volumes, profiles, healthchecks.
- services/dsh/database owns DSH migrations, seeds, indexes, schema, read models.

Reserved runtime:

- profile: dsh
- container: bthwani-dsh-api-runtime
- host port: 58080
- internal port: 8080
- database: dsh_runtime
- network: bthwani-runtime

Activation is forbidden until:

- DSH backend runtime exists
- DSH Dockerfile exists
- DSH DB migration exists
- DSH local seed exists
- /health and /ready exist
- API smoke exists
- no memory repo
- no CORS wildcard

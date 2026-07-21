# DSH generated catalog client

The sovereign catalog client is governed by two contract inputs:

```text
services/dsh/contracts/dsh.catalog.openapi.yaml
services/dsh/contracts/dsh.catalog.overlay.yaml
```

The overlay is applied before `openapi-typescript` validates the materialized contract. It replaces the create-style `UpdateNodeRequest` inheritance with a partial OCC mutation that requires `expectedVersion` and excludes immutable node fields.

The stable multi-surface catalog contract facade is:

```text
services/dsh/clients/generated/dsh-catalog-api.ts
```

Generate and validate from the repository root:

```powershell
pnpm run openapi:generate:dsh-catalog
node tools/scripts/generate-dsh-catalog-client.mjs --check
```

The check fails closed when the base contract, sovereign overlay, generated OpenAPI client input, or catalog contract facade drift. Existing-entity writes must retain `expectedVersion`, and version mismatches must retain the structured HTTP `409 CONFLICT` response.

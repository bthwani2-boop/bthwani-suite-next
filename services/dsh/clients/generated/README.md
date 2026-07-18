# DSH generated catalog client

Source of truth:

```text
services/dsh/contracts/dsh.catalog.openapi.yaml
```

Generate the client from the repository root:

```powershell
node tools/scripts/generate-dsh-catalog-client.mjs
```

Verify that the committed client is current:

```powershell
node tools/scripts/generate-dsh-catalog-client.mjs --check
```

The generated output is:

```text
services/dsh/clients/generated/dsh-catalog-api.ts
```

The shared multi-surface catalog mutation client imports its request schemas
from this file. Existing-entity writes must retain `expectedVersion`, and
version mismatches must retain the structured HTTP `409 CONFLICT` response.

# DSH OpenAPI contract layout

`dsh.openapi.yaml` is the sovereign entry contract. It contains metadata and external references only.

- `paths/*.paths.yaml`: path items grouped by operational domain.
- `components/schemas/*.schemas.yaml`: schemas grouped by domain.
- `components/*.yaml`: shared parameters, responses, security schemes, and other component maps.
- `generated/dsh.bundle.openapi.yaml`: deterministic monolithic bundle used for client generation and Swagger. Never edit it directly.
- `dsh.modular.manifest.json`: expected path, operation, component, and domain counts.
- `dsh.contract-ownership.json`: cross-contract path ownership audit.

## Commands

`pnpm --dir services/dsh openapi:compose` regenerates the bundle.

`pnpm --dir services/dsh openapi:generate` regenerates the bundle and TypeScript client.

`pnpm --dir services/dsh openapi:verify` validates references, uniqueness, ownership, bundle drift, and regenerates the client.

## Rules

1. Add each endpoint to exactly one path module.
2. Keep every `operationId` globally unique.
3. Add reusable schemas under the correct domain module and reference them through the root contract.
4. Do not add root-relative `#/components/...` references inside module files; module references must point back to `dsh.openapi.yaml`.
5. Do not edit generated artifacts manually.

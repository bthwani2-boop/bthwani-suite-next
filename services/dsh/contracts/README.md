# DSH OpenAPI contract layout

`dsh.openapi.yaml` is the sovereign DSH API contract entry point. It contains service metadata plus external references to governed path and component modules.

## Structure

- `dsh.openapi.yaml`: sovereign entry contract; edit references and metadata here.
- `paths/*.paths.yaml`: API path items grouped by operational domain.
- `components/schemas/*.schemas.yaml`: reusable schemas grouped by domain.
- `components/*.yaml`: shared parameters, responses, security schemes, and other component maps.
- `generated/dsh.bundle.openapi.yaml`: deterministic monolithic bundle used by TypeScript client generation and Swagger tooling. Never edit it directly.
- `dsh.modular.manifest.json`: expected path, operation, component, and domain counts.
- `dsh.contract-ownership.json`: audit of sovereign paths and governed projection contracts.

## Commands

```powershell
pnpm --dir services/dsh openapi:compose
pnpm --dir services/dsh openapi:generate
pnpm --dir services/dsh openapi:verify
```

- `openapi:compose` regenerates the monolithic bundle from the modular source contract.
- `openapi:generate` regenerates the bundle and `clients/generated/dsh-api.ts`.
- `openapi:verify` checks reference integrity, uniqueness, manifest parity, bundle drift, and client generation.

## Contract rules

1. Every runtime endpoint has one sovereign definition under exactly one `paths/*.paths.yaml` module.
2. Every `operationId` is globally unique across DSH.
3. Shared schemas belong in the appropriate `components/schemas` domain module and are referenced through `dsh.openapi.yaml`.
4. Module files must not use unresolved root-relative `#/components/...` references. They must reference `../dsh.openapi.yaml` or `../../dsh.openapi.yaml`, depending on their depth.
5. Governed journey and surface contracts may project sovereign paths, but they do not become competing runtime sources of truth.
6. Generated bundle and client files are never edited manually.
7. Any contract change must pass the modular OpenAPI gate, contract foundation gate, DSH tests, and generated-artifact drift check.

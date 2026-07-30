# Platform contract index

`master.openapi.yaml` is the sovereign contract index. It declares
`x-bthwani-contract-role: MASTER_INDEX_ONLY`, owns `paths: {}`, and no client is
ever generated from it.

## The one rule

The master indexes **exactly one canonical entry contract per bounded context**
and never a context's internal modules.

```text
contracts/master.openapi.yaml
├── core/identity/contracts/identity.openapi.yaml
├── core/platform-control/contracts/platform-control.openapi.yaml
├── core/providers/contracts/providers.openapi.yaml
├── core/workforce/contracts/workforce.openapi.yaml
├── services/dsh/contracts/dsh.openapi.yaml
└── services/wlt/contracts/wlt.openapi.yaml
```

Each entry then indexes its own internals:

```yaml
# services/dsh/contracts/dsh.openapi.yaml
x-bthwani-contracts:
  refunds: ./dsh.refunds.openapi.yaml
  orderTruth: ./dsh.order-truth.openapi.yaml
  # ...
x-bthwani-overlays:
  catalog: ./dsh.catalog.overlay.yaml
```

Resolution is **one level deep**. A module is a leaf: it must not declare its own
`x-bthwani-contracts`, must not be indexed by two entries, and must not also be a
master-indexed entry. `tools/important-scripts/contracts-foundation.mjs` enforces
all three, and `tools/guards/api-binding-gate.mjs` follows master → entry → module
when deciding whether a runtime path is registered.

## Per-context manifest

Every context declares `<context>/contracts/contract.manifest.yaml`:

```yaml
context: services/dsh
entry: ./dsh.openapi.yaml
owner: services/dsh
contractState: CONTRACT_ACTIVE
layout: MODULAR
bundle: ./generated/dsh.bundle.openapi.yaml
client: ../clients/generated/dsh-api.ts
regenerateScript: pnpm --dir services/dsh openapi:generate
modules:
  - ./dsh.administration.openapi.yaml
  # ...
```

`modules` must equal the entry's `x-bthwani-contracts` exactly, and `client` must
be registered in `governance/contracts/generated-client-registry.json`.

## Derived diagnostics

The contract tree report is generated on demand at
`.diagnostics/contracts/contract-registry.json`. It is an untracked diagnostic
projection of the master index, context manifests, modules, overlays, bundles,
clients, and path counts. It is not an authority source and must not be committed.

```sh
pnpm run contracts:registry   # generate the ignored diagnostic report
pnpm run contracts:lint       # foundation invariants + diagnostic integrity + spectral
```

## Layout ownership

The master owns no shared components. Bounded contexts continue to own their
domain schemas, operations, runtime bindings, and context-specific transport
constraints.

`contracts/shared/common.openapi.yaml` is the cross-context transport-component
source for shapes that have been migrated deliberately. WLT currently consumes
its canonical `Error` schema through `services/wlt/contracts/wlt.common.openapi.yaml`.
Other contexts keep their local transport declarations until their composers,
contracts, generated clients, backend bindings, and consumers are migrated in one
verified slice. The shared file does not authorize parallel variants or automatic
cross-context ownership of domain schemas.

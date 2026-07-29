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

The master owns no shared components. Reusable headers, error envelopes, security
schemes, and primitives currently live inside each context; extracting them to a
repo-level `shared/` is deliberately deferred to its own slice, since it means
rewiring `$ref`s across all six contexts and regenerating every client.

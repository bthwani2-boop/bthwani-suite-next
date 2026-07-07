# Discovery Sources

status: `DISCOVERY_PACKAGE_ONLY`

## Generated Inventory Sources

The journey package is based on summarized discovery outputs generated under `.diagnostics/operational-journey-factory/`.

- `.diagnostics/operational-journey-factory/toolchain-inventory.json`
- `.diagnostics/operational-journey-factory/toolchain-inventory.md`
- `.diagnostics/operational-journey-factory/surface-inventory.json`
- `.diagnostics/operational-journey-factory/surface-inventory.md`
- `.diagnostics/operational-journey-factory/journey-inventory.json`
- `.diagnostics/operational-journey-factory/journey-inventory.md`
- `.diagnostics/operational-journey-factory/gap-ledger.json`
- `.diagnostics/operational-journey-factory/gap-ledger.md`

Raw diagnostics are not committed into this journey package.

## Direct Source Paths

- `services/dsh/SERVICE_BLUEPRINT.md`
- `services/dsh/service.manifest.ts`
- `services/dsh/runtime-map.ts`
- `services/dsh/capability-map.ts`
- `services/dsh/frontend/shared/operations/dsh-operational-registry.ts`
- `services/dsh/frontend/shared/runtime/dsh-cross-surface-closure-map.ts`
- `services/dsh/contracts/dsh.openapi.yaml`
- `services/dsh/clients/generated/dsh-api.ts`
- `services/dsh/backend/internal/http/checkout.go`
- `services/dsh/backend/internal/http/orders.go`
- `services/dsh/backend/internal/http/dispatch.go`
- `services/dsh/frontend/shared/orders/dsh-order-lifecycle-client.ts`
- `services/wlt/contracts/wlt.openapi.yaml`
- `services/wlt/clients/generated/wlt-api.ts`

## Discovery Counts Used

- OpenAPI files: 5
- Generated clients: 4
- Backend route candidates: 29
- Frontend surface candidates: 134
- Proposed smart journey groups: 5
- Proposed unfilled journeys: 206

## Evidence Boundaries

- This package summarizes current evidence only.
- Missing database, audit, permission, UI action, runtime, or CI evidence remains a blocker.
- Evidence must be refreshed when source files or generated inventories change.

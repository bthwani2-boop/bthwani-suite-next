# 13 — DSH Service Activation

Status: CANONICAL
Stage: PHASE-10A_DSH_SERVICE_ACTIVATION

## Purpose

Phase 10A activates DSH as a real service contract under `services/dsh`.

Activation is evidence-based and limited to repository truth. The current DSH OpenAPI defines health and readiness contracts only. Phase 10A does not claim a commerce runtime, Store Discovery behavior, generated client, database schema, or screen.

## Activation gate

Artifact: `services/dsh/service.manifest.ts`

Active scope:

- service owner: DSH
- activation capability: DSH system health/readiness contract
- active contract: `services/dsh/contracts/dsh.openapi.yaml`
- current surfaces: app-client, app-partner, app-captain, app-field, control-panel
- runtime binding: blocked until backend implementation and runtime evidence exist
- next operational journey: Store Discovery

## Required service files

```text
services/dsh/
  SERVICE_BLUEPRINT.md
  service.manifest.ts
  capability-map.ts
  surface-map.ts
  runtime-map.ts
  contracts/dsh.openapi.yaml
```

## Truth rules

- A contract path is not runtime evidence.
- A declared surface without a screen remains planned, not implemented.
- A declared capability without its required chain remains blocked.
- DSH must not calculate or mutate WLT financial truth.
- Store Discovery cannot close before OpenAPI, backend, client, frontend, tests, and evidence are linked.

## Forbidden Phase 10A claims

- Store Discovery implemented
- DSH runtime ready
- DSH screens ready
- generated client ready
- database ready
- production ready
- Store Discovery closed

## Validation

- DSH manifest and maps must be internally linked.
- DSH OpenAPI must remain a valid service-owned contract.
- service linkage guard must pass.
- foundation and journey gates must propagate native command failures.

## Acceptance condition

Accepted only when the DSH service files exist, current contract truth is represented without runtime inflation, service linkage passes, typecheck passes, and both foundation and DSH activation journey gates pass.

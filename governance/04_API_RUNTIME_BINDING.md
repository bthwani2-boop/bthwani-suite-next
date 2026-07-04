# 04 — API Runtime Binding

Status: CANONICAL

## Required chain

```text
OpenAPI contract
→ generated types/client
→ service adapter
→ view-model
→ screen state
→ runtime evidence
```

## Contract ownership

- `contracts/master.openapi.yaml` is an index only.
- `core/identity/contracts/auth.openapi.yaml` owns auth/session/actor identity contracts.
- `core/providers/contracts/providers.openapi.yaml` owns external provider health contract only; it does not define provider runtime, adapters, registry implementation, audit, or mutations.
- `services/<service>/contracts/<service>.openapi.yaml` owns service endpoints.

## Forbidden

- raw fetch in screens
- undocumented endpoints
- fake actor IDs
- mock/demo success paths
- generated client from master OpenAPI
- service endpoint without service OpenAPI

## Acceptance condition

Accepted only when master is index-only, auth/providers contracts exist, and active endpoints are contract-backed.

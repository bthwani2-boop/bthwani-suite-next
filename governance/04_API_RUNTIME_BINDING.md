# 04 — API and Runtime Binding

Status: ACTIVE_CANONICAL

## Required static chain

```text
owner OpenAPI contract
→ generated types or client
→ service adapter or transport
→ controller or view model
→ surface state and actions
```

Every link must resolve through declared owner paths. Static reachability proves binding only; it does not prove network execution, authorization, persistence, or runtime success.

## Runtime evidence chain

When runtime behavior is changed or claimed, also require:

```text
immutable commit
→ declared runtime environment
→ service startup and health
→ actor-specific request and response
→ mutation persistence or readback when applicable
→ negative permission and failure behavior
```

## Contract ownership

- `contracts/master.openapi.yaml` is an index only.
- `core/identity/contracts/auth.openapi.yaml` owns authentication, session, and actor-identity contracts.
- `core/providers/contracts/providers.openapi.yaml` owns the declared external-provider control contract; runtime adapters, registry, audit, and mutations remain with their implementation owners.
- `services/<service>/contracts/<service>.openapi.yaml` owns public service operations.

## Forbidden

- raw network calls in screens;
- undocumented operations or routes;
- fake actor or object identifiers presented as runtime truth;
- preview, demo, fixture, or mock success in live paths;
- generating service clients from the master index;
- backend routes without an owner contract;
- claiming runtime completion from source presence, route AST, or static binding alone.

## Acceptance condition

Accepted only when owner contracts, generated clients, adapters, controllers, and surfaces align statically, and every runtime claim additionally has same-commit request, response, permission, failure, and persistence evidence applicable to the change.

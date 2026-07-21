---
name: bthwani-service-fullstack-journey
version: 2026.07.17-v1
summary: Verify a declared capability across product, contract, backend, data, shared state, and required surfaces.
---

# bthwani-service-fullstack-journey

## Purpose

Own cross-layer journey verification for a capability that spans an owning service, contracts, backend/domain logic, data, generated clients, adapters/controllers, and one or more declared surfaces.

## Invoke when

- A capability crosses two or more implementation layers.
- A DSH, WLT, Identity, Workforce, or platform journey is claimed to work end to end.
- Cross-surface consistency or full-stack closure is requested.

## Do not invoke when

- The change is isolated to one layer and makes no cross-layer claim.
- The request is product discovery, governance-only, or visual-only.

## Authority boundary

This skill owns full-stack journey verification only. Product scope belongs to Product Manager authority, functional acceptance to Product Owner authority, finance truth to WLT, and final closure to the final closure judge after independent gates.

## Execution contract

Trace the same capability through:

```text
Product Truth
→ owning service and domain boundary
→ OpenAPI/contract
→ backend route and domain logic
→ database or authoritative state
→ generated/typed client
→ adapter/controller/view-model
→ every required surface and actor state
→ targeted tests
→ same-commit runtime evidence when claimed
```

Declare exclusions explicitly. Apply negative checks for actor leakage, omitted required surfaces, unauthorized actions, stale generated clients, fake runtime success, and DSH/WLT ownership violations.

## Forbidden

- Closing from backend-only, UI-only, or declaration-only evidence.
- Inventing endpoints, screens, actors, data ownership, or runtime results.
- Duplicating service truth in a surface or bypassing WLT for financial truth.
- Treating partial surface coverage as full-stack completion.

## Required output

```text
capability_id:
product_truth_contract:
owning_service:
contract_paths:
backend_and_data_paths:
client_and_controller_paths:
required_surfaces:
checks:
runtime_evidence:
failed_links:
decision:
```

Allowed decisions: `PASS`, `FIX_REQUIRED`, `NEEDS_EVIDENCE`, `BLOCKED_EXTERNAL`, and `OUT_OF_SCOPE_FOR_THIS_JOURNEY`.

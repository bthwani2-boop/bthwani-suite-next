---
name: bthwani-api-runtime-binding
version: 2026.07.17-v1
summary: Verify the contract-to-runtime binding chain without owning product scope or final closure.
---

# bthwani-api-runtime-binding

## Purpose

Own verification of the chain from service OpenAPI and backend operation through generated client, adapter/controller, consumer state, and runtime proof when runtime behavior is claimed.

## Invoke when

- A public API contract, operation ID, backend route, generated client, adapter, controller, or API-backed consumer changes.
- A feature is claimed to be connected to live backend behavior.

## Do not invoke when

- No API, backend route, generated client, adapter, controller, or runtime binding is affected.
- The task is product discovery, visual-only design, or a behavior-preserving internal refactor.

## Read before

- `governance/GOVERNANCE.md`
- `governance/policies/engineering.md`
- applicable Product Truth when public behavior changes
- owning service OpenAPI contract and contract manifest
- backend router and handler
- generated client
- adapter/controller and consuming surface
- `governance/policies/delivery.md` when runtime/evidence/closure is claimed

## Authority boundary

This skill owns API/runtime binding analysis and verification only. It does not approve product scope, UX allocation, database ownership, QA, security, release, production readiness, or final closure.

## Execution contract

Verify, in order:

1. operation is declared by the owning service contract;
2. backend route/handler implements the declared operation;
3. generated client matches canonical contract provenance;
4. adapter/controller uses the generated or typed client;
5. consumer state represents applicable success, empty, loading, forbidden, conflict, and failure states;
6. runtime evidence is tied to the same candidate when runtime behavior is claimed.

## Forbidden

- Raw network calls in screens when an owned adapter/client exists.
- Undocumented endpoints or invented operation IDs.
- Generated clients derived from a non-owning master index.
- Fake actor identifiers, seed success, or local state presented as runtime proof.
- Treating static binding checks as runtime, production, or journey closure.

## Required output

```text
contract_path:
operation_ids:
backend_paths:
generated_client_paths:
adapter_or_controller_paths:
consumer_paths:
checks:
runtime_evidence:
decision:
remaining_risk:
```

Allowed decisions: `PASS`, `FIX_REQUIRED`, `NEEDS_EVIDENCE`, `BLOCKED_EXTERNAL`, and `OUT_OF_SCOPE_FOR_THIS_JOURNEY`.

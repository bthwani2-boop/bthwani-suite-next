---
name: bthwani-service-fullstack-slice
version: 2026.06.19-clean
summary: Close service slices across contract, backend, client, UI, runtime, and evidence.
---

# bthwani-service-fullstack-slice

## Invoke when

- work touches a service journey or vertical slice
- DSH, WLT, or another service needs end-to-end proof
- the user asks for full-stack closure

## Read before

`governance/09_SLICE_OPERATING_MODEL.md`, service blueprint, service contract, relevant surface files, evidence router

## Execution contract

Declare slice scope and exclusions. Verify contract, domain/backend, generated/adapted client, view-model, screen states, runtime evidence, and matrix updates when applicable.

## Forbidden

- do not close with backend only or UI only
- do not skip service owner boundaries
- do not invent endpoints or screens
- do not bypass WLT for financial truth

## Required evidence

- slice scope
- touched paths by layer
- contract/client/runtime evidence
- UI evidence when screens change
- final decision

## Failure decision

- missing API contract -> `BLOCKED_NEEDS_API_CONTRACT`
- runtime behavior without runtime evidence -> `BLOCKED_NEEDS_RUNTIME_EVIDENCE`
- UI state gaps -> `FIX_REQUIRED`

## Notes

No extra notes.

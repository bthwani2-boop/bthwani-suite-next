---
name: bthwani-service-fullstack-journey
version: 2026.06.19-clean
summary: Implement service journeys with code-based checks by default; use full closure evidence only when final closure is requested.
---

# bthwani-service-fullstack-journey

## Invoke when

- work touches a service journey or vertical journey
- DSH, WLT, or another service needs end-to-end proof
- the user asks for full-stack closure

## Read before

`governance/09_JOURNEY_OPERATING_MODEL.md`, service blueprint, service contract, relevant surface files, evidence router

## Execution contract

Declare journey scope and exclusions. Verify contract, domain/backend, generated/adapted client, view-model, screen states, runtime evidence, and matrix updates when applicable.

## Forbidden

- do not close with backend only or UI only
- do not skip service owner boundaries
- do not invent endpoints or screens
- do not bypass WLT for financial truth

## Required evidence

Required evidence only for final closure, PR readiness, release readiness, or high-risk runtime/contract/data changes.
Normal implementation requires only touched paths and targeted check summary.

## Failure decision

- missing API contract -> `BLOCKED_NEEDS_API_CONTRACT`
- runtime behavior without runtime evidence -> `BLOCKED_NEEDS_RUNTIME_EVIDENCE`
- UI state gaps -> `FIX_REQUIRED`

## Notes

No extra notes.

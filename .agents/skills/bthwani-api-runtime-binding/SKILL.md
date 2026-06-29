---
name: bthwani-api-runtime-binding
version: 2026.06.19-clean
summary: Protect OpenAPI to client to screen/runtime binding.
---

# bthwani-api-runtime-binding

## Invoke when

- OpenAPI, generated types, clients, adapters, backend handlers, or screen fetch behavior are touched
- a feature needs API-backed behavior

## Read before

`governance/04_API_RUNTIME_BINDING.md`, `contracts/master.openapi.yaml`, service OpenAPI, relevant clients/adapters/screens

## Execution contract

Enforce the chain: service OpenAPI -> generated or typed client -> service adapter -> view-model -> screen state -> runtime evidence (when escalation applies). Use existing guard scripts when present.

## Forbidden

- no raw fetch in screens
- no generated client from master index
- no undocumented endpoint
- no fake actor IDs
- no mock success path as runtime truth

## Required evidence

- contract path
- client/adapter path
- screen/view-model path when UI affected
- contract lint or targeted check when changed
- runtime proof only when escalation applies or runtime behavior changes are claimed

## Failure decision

- endpoint without service contract -> `FIX_REQUIRED`
- no client binding -> `FIX_REQUIRED`
- runtime claim without proof when escalation applies -> `NEEDS_EVIDENCE`

## Notes

No extra notes.

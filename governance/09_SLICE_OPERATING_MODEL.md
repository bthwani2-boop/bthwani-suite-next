# 09 — Slice Operating Model

Status: CANONICAL

## Model

Build the new repository by production-shaped slices.

A slice may include governance link, blueprint, domain, database, OpenAPI, backend, generated client, frontend, Docker/runtime, tests, visual evidence, and evidence pack.

## Order

1. FOUNDATION-001 — mini governance closure
2. FOUNDATION-002 — core identity contract
3. FOUNDATION-003 — provider contract/control baseline
4. FOUNDATION-004 — ui-kit baseline
5. DSH-001 — store discovery
6. DSH-002 — storefront/catalog
7. DSH-003 — cart/serviceability
8. WLT-001 — payment session/status
9. DSH-WLT-001 — checkout/payment binding

## Stop rule

Do not continue while current slice is NOT_APPROVED_YET, BLOCKED_NEEDS_BLUEPRINT, BLOCKED_NEEDS_API_CONTRACT, or BLOCKED_NEEDS_RUNTIME_EVIDENCE.

## Acceptance condition

Accepted only when every slice declares scope, exclusions, evidence requirements, and closure state.
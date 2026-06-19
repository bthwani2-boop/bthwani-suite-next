# DSH Service Blueprint

Status: ACTIVE_SERVICE_CONTRACT
Stage: PHASE-10A_DSH_SERVICE_ACTIVATION

## Purpose

DSH owns operational commerce and delivery truth: store discovery, catalog, cart, checkout intent, orders, delivery lifecycle, readiness, execution, and operations visibility.

WLT exclusively owns wallet, payment, refund, settlement, payout, commission, COD financial truth, ledger, reconciliation, and finance reporting.

## Current activation

The active repository contract currently covers:

- `GET /dsh/health`
- `GET /dsh/readiness`

These are contract declarations. Backend/runtime binding remains blocked until implementation and runtime evidence exist.

## Active surfaces

- app-client
- app-partner
- app-captain
- app-field
- control-panel

The surfaces are ownership boundaries, not proof that screens exist.

## Next product slice

`DSH-001 Store Discovery` is the next product slice.

It remains blocked from closure until the complete chain exists:

```text
OpenAPI
→ backend
→ generated client
→ adapter
→ view-model
→ app-client screen state
→ tests
→ runtime and visual evidence
```

## Exclusions

Phase 10A creates no store endpoint, business migration, provider integration, generated client, or screen.

## Evidence

Evidence belongs under `tools/registry/runs/<SESSION>`.

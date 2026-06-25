# bthwani-suite-next

Clean canonical rebuild line for BThwani.

## Repository Role

Old repo `C:\bthwani-suite` on branch `realtest` is donor/reference/evidence source only.

This repo is the canonical implementation target.

## Rule

No blind copy. No runtime dependency on the old repo. No feature is closed without gate evidence.

## Current Stage

DSH-001: Store Discovery & Governance — RUNTIME_VERIFIED (all 5 surfaces)
DSH-002: Home Discovery — RUNTIME_VERIFIED (app-client + control-panel admin)
DSH-003: Catalog Management — RUNTIME_VERIFIED (app-client, app-partner, control-panel)
DSH-004: Cart & Serviceability — NOT_APPROVED_YET (backend implemented, contract frozen)
DSH-005: Checkout Intent & WLT Handoff — CONTRACT_ONLY (backend implemented, awaiting DSH-004 closure)
DSH-006: Order Fulfillment — CONTRACT_ONLY (backend implemented, awaiting DSH-005 closure)
DSH-007: Dispatch & Captain Delivery — CONTRACT_ONLY (backend implemented, awaiting DSH-006 closure)

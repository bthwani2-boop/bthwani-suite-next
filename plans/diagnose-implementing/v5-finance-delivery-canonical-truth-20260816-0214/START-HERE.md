# START HERE — V5 Finance / Delivery Canonical Truth

## Purpose

This package prepares a root-level cutover for all discussed finance/delivery authority problems and their similar patterns across the platform.

It covers:

- WLT single-source monetary authority;
- BTHWANI captain one-wallet/opening-funding/collateral/minimum/excess settlement;
- COD/WALLET/MIXED payment semantics;
- PaymentAllocation;
- COD order-specific reserve/final debit/failure recovery;
- customer/captain official-wallet top-up;
- refunds by funding lineage;
- penalties and policy-owned values;
- unified captain eligibility;
- Workforce accreditation/scopes/absence;
- DSH presence/capacity/fleet/assignments;
- BTHWANI XOR PARTNER affiliation;
- partner/store courier identity and delivery lifecycle;
- partner salaried/per-delivery compensation boundary;
- optional store-owned courier collateral boundary;
- partner-app store-delivery sections;
- settlement/reconciliation;
- cross-surface behavior;
- legacy/stale/duplicate truth cleanup to line/file/folder level.

## Files

1. `PACKAGE.md` — executable V5 facts/relations/evidence/frontier.
2. `DIAGNOSIS.md` — full top-down operational/financial diagnosis.
3. `DECISIONS.md` — resolved product decisions and the only remaining decision questions discovered by this pass.
4. `CLEANUP.md` — coherent cutover, deletion, migration, verification and final closure requirements.

## Authority order

1. Live current code/runtime/data evidence on the pinned task candidate.
2. Explicit user product decisions.
3. Canonical WLT target architecture where it does not conflict with newer user decisions/live evidence.
4. Current contracts/migrations/tests.
5. Historical plans/packages only as Derived Support/search seeds.

## Hard rules

- One canonical source of truth per durable fact/decision.
- WLT alone owns authoritative money.
- No patch/workaround/fallback/parallel truth closure.
- No ignored financial errors.
- No generic identifier crossing authority boundaries with two meanings.
- No stale projection granting a critical write.
- No final DONE until obsolete lines/files/folders and references are removed and the exact final candidate is verified.

## Current highest roots

1. `RC-001 MONETARY_FACT_OWNERSHIP_SPLIT` — P0.
2. `RC-002 COD_EXPOSURE_SETTLEMENT_LIFECYCLE_SPLIT` — P0.
3. `RC-003 CAPTAIN_OPERATIONAL_ELIGIBILITY_AUTHORITY_SPLIT` — P0.
4. Partner courier identifier/payment boundary, checkout payment drift, service-area/capacity drift, accreditation/availability overlap — P1.
5. Historical ledger/daily-close risks — reproof required before claiming current defect.
6. Order actor provenance — material but HOLD behind higher roots.

This is `PREPARE_ONLY`. Product/runtime implementation is intentionally not performed by this package creation request.

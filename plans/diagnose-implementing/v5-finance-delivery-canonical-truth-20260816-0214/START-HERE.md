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
- store-owned/off-platform courier collateral boundary;
- partner-app store-delivery sections;
- settlement/reconciliation;
- cross-surface behavior;
- legacy/stale/duplicate truth cleanup to line/file/folder level.

## Files

1. `MERGE-RECONCILIATION.md` — **integration-time verification and no-omission reconciliation.** It records the failed rootfix execution gate, confirms both requested source-branch histories are already contained in `A`, and restores material findings from the prior deep diagnosis/attachment that were underrepresented in the original package.
2. `PACKAGE.md` — executable V5 facts/relations/evidence/frontier captured by the diagnosis pass.
3. `DIAGNOSIS.md` — full top-down operational/financial diagnosis.
4. `DECISIONS.md` — **canonical final product decision register for this package; `DECISION_REQUIRED = 0`.** If an older statement inside `PACKAGE.md` or `DIAGNOSIS.md` still labels D17/D18/D19 unresolved, it is superseded by `DECISIONS.md` and is not active authority.
5. `CLEANUP.md` — coherent cutover, deletion, migration, verification and final closure requirements.

## Final decision deltas bound after diagnosis

- Initial BTHWANI captain opening/minimum funding is required for activation; after activation, insufficient COD-safe balance blocks COD/Mixed cash exposure while fully prepaid wallet deliveries may remain eligible if every non-financial gate passes.
- Excess above the protected minimum may be requested for governed settlement only after reservations/exposure/holds/debts are accounted.
- Store salaried courier receives no per-order earning; delivery fee belongs to the store.
- Store-selected per-delivery courier compensation may be platform-managed only as a store-funded, WLT-canonical versioned earning policy; Bthwani does not fund it or provide credit.
- Optional store-courier collateral remains the store's off-platform responsibility; Bthwani does not custody it or create a fake WLT balance for it.
- Store employment/payroll/internal staff responsibility remains with the store; platform identity/account/security baseline remains mandatory.

## Authority order

1. Live current code/runtime/data evidence on the pinned execution candidate.
2. `DECISIONS.md` plus explicit later user product decisions.
3. `MERGE-RECONCILIATION.md` for integration verification and mandatory carried-forward findings not fully represented in the original package.
4. Canonical WLT target architecture where it does not conflict with newer user decisions/live evidence.
5. Current contracts/migrations/tests.
6. Historical plans/packages only as Derived Support/search seeds.

## Hard rules

- One canonical source of truth per durable fact/decision.
- WLT alone owns authoritative Bthwani monetary truth.
- No patch/workaround/fallback/parallel truth closure.
- No ignored financial errors.
- No generic identifier crossing authority boundaries with two meanings.
- No stale projection granting a critical write.
- No final DONE until obsolete lines/files/folders and references are removed and the exact final candidate is verified.
- A source branch being merged/contained does not prove its runtime implementation succeeded; execution status comes from exact-SHA verification evidence.

## Current highest roots

1. `RC-001 MONETARY_FACT_OWNERSHIP_SPLIT` — P0.
2. `RC-002 COD_EXPOSURE_SETTLEMENT_LIFECYCLE_SPLIT` — P0.
3. `RC-003 CAPTAIN_OPERATIONAL_ELIGIBILITY_AUTHORITY_SPLIT` — P0.
4. Partner courier identifier/payment boundary, checkout payment drift, service-area/capacity drift, accreditation/availability overlap — P1.
5. Additional mandatory carried-forward cones in `MERGE-RECONCILIATION.md`: StoreCourierSettings/pricing parallel truth, StoreBranch/identifier semantics, partner courier finance leakage, distributed finance best-effort paths, partner settlement gross drift, electronic WALLET/MIXED journey completeness.
6. Historical ledger/daily-close risks — reproof required before claiming current defect.
7. Order actor provenance — material but HOLD behind higher roots; its previous Stage-2 execution failed the DSH backend test gate and did not produce a governed product commit.

This is `PREPARE_ONLY`. Product/runtime implementation is intentionally not claimed by this package. The package is ready to drive a separate `EXECUTE_END_TO_END` task after reconciliation with the then-current integration HEAD.

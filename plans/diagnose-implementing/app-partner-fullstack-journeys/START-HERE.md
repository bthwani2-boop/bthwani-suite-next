# Start here — app-partner-fullstack-journeys

## Objective

Diagnose and prepare a strictly app-partner-bounded implementation package for every proven Partner journey, surface, operation, contract, data owner and cross-surface readback, while excluding unrelated product areas with evidence.

## Pinned baseline

- Repository: `bthwani2-boop/bthwani-suite-next`
- Branch: `abbas`
- Diagnosis baseline: `4dbcc1c39190d6c19da0a54e0a6db1f6f0582ce0`
- Primary surface: `app-partner`
- Package class: derived support only; this directory is never runtime, policy, approval, product, migration, CI, or operational truth.

## Required reading order

1. `MANIFEST.json`
2. `GLOBAL-DIAGNOSIS.md`
3. `COVERAGE.json`
4. `EXECUTION-ORDER.json`
5. the first execution unit whose dependencies are complete and status is `READY`
6. that unit's `DIAGNOSIS.md`, `EXECUTION.json`, and `VERIFICATION.json`
7. record actual outcomes only in that unit's `RESULT.json`
8. continue in dependency order
9. complete `CLOSURE.md` only after every unit is implemented and verified on the exact resulting candidate

## Scope lock

The word “Partner” is the starting point, not permission to scan or modify the whole product. Include another surface only when Partner writes, reads, authorization, contracts, persistence, serviceability, financial ownership, or canonical readback prove a dependency. The included cross-surfaces are therefore partial vertical slices, not permission to redesign those applications.

`app-field` is included only for Partner onboarding/evidence. `app-captain` is included only for Partner fleet connection, store-captain handoff, and shared support compatibility. `app-client` is included only for store publication, order/custody readback, and shared support compatibility. Control-panel sections are restricted by `COVERAGE.json`.

## Architecture input limitation

`docs/architecture.drawio` is zero bytes at the pinned baseline. It provides no usable architecture evidence. Do not infer from a historical or local copy. Use current authority, Product Truth, service contracts and pinned source, and re-check the file if the branch changes before implementation.

## Execution constraints

- Re-resolve `abbas` before every logical write batch. If it moved, compare the new head to this baseline and reconcile any affected unit before editing.
- Fix the authoritative owner first, then migrate affected consumers/readbacks. Never create a second Partner, Store, Order, Fleet, Support, Analytics or WLT truth.
- Do not use client-controlled store/context values as authorization. Selected store IDs express intent; backend authorization must prove ownership.
- WLT remains the sole financial truth owner. DSH/frontend may only use bounded contracts/projections explicitly allowed by current Product Truth.
- Do not claim runtime, database, security, finance, visual, QA or CI success from this planning package.
- Do not modify an unrelated control-panel section merely because it exists in the seeded coverage inventory.

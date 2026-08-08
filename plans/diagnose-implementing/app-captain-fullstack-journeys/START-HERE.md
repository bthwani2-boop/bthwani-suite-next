# START HERE — App Captain full-stack journeys

This is a **diagnosis and implementation package only** for `APP-CAPTAIN-FULLSTACK-JOURNEYS` on branch `abbas`, pinned to `319f47ce41aaca136fa9f25fa0db4e3587681886`.

## Hard scope

Primary surface: `app-captain`.

Include another surface, service, contract, database area or control-panel section only when the pinned implementation or an applicable Product Truth proves a direct Captain dependency or required readback. `app-field`, catalog, marketing, generic analytics/dashboard/login and unrelated WLT capabilities are not implementation scope merely because they share infrastructure.

The branch advanced twice during diagnosis. The first movement added WLT daily finance close and settlement-batch behavior; it was reviewed and incorporated as current financial infrastructure that Captain finance work must preserve. The second movement changed only `apps/app-field/runtime/package.json`; because `app-field` is explicitly outside this Captain task absent a proven Captain-caused shared effect, it did not invalidate the diagnosis. Both movements were compared before finalization.

The package is planning-only. It must not be imported by runtime/build/CI/migrations/governance/operations.

## Read order

1. `MANIFEST.json`
2. `GLOBAL-DIAGNOSIS.md`
3. `COVERAGE.json`
4. `EXECUTION-ORDER.json`
5. each unit's `DIAGNOSIS.md`, `EXECUTION.json`, `VERIFICATION.json`, `RESULT.json`
6. `CLOSURE.md`

Execute units strictly in order and re-resolve `abbas` before every logical write batch. Each implementation unit must fix the authoritative owner first, migrate every affected Captain-specific consumer/readback, remove parallel behavior only when safe, then rerun invalidated evidence on the final candidate SHA.

## Key evidence constraint

`docs/architecture.drawio` was inspected at the pinned lineage and is zero bytes. It is not architectural evidence. `plans/smsm-dsh-wlt-journeys` may help discovery and sequencing, but it is not Product Truth.

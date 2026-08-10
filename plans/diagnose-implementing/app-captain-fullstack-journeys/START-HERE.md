# START HERE — App Captain full-stack journeys

This is the **existing** `APP-CAPTAIN-FULLSTACK-JOURNEYS` package resumed and rebaselined for `BB`, not a new package. The diagnosis baseline is `0916eb2500a0f6d83c47ed44124c02665f9cd0f9`. The package itself is derived planning support only; it is not Product Truth, runtime truth, approval, or closure evidence.

## Hard scope

Primary surface: `app-captain`.

Include another surface, service, contract, database area, shared module, control-panel section, Identity/Workforce path, WLT path, mobile runtime path, or CI check **only** when current Product Truth or pinned implementation proves that it writes, authorizes, persists, transports, or reads Captain state required by the same Captain journey.

Current allowed cross-surface expansion is bounded to:

- `control-panel`: Captain Identity/Workforce lifecycle, partner-fleet readback, dispatch/handoff/proof/exceptions/support/rescue, and WLT finance controls/readback.
- `app-client`: Captain-caused delivery/tracking/order-state readback only.
- `app-partner`: partner-fleet membership and store↔Captain custody/handoff consequences only.
- `app-field`: excluded from Captain implementation. Reopen only if a Captain fix must change a shared contract/component/state actually consumed by field; then verify that shared consumer without importing field-only product scope.

Generic dashboard, analytics, catalog, marketing, operator login, customer-address ownership, field-only workflows, partner-only commercial workflows, and unrelated WLT capabilities remain outside this package.

## Rebaseline facts

The prior package was pinned to `abbas@319f47ce41aaca136fa9f25fa0db4e3587681886`. That baseline is stale. Current `BB` contains material Captain, Identity, Workforce, DSH, mobile-runtime, finance, test, and CI changes.

Concurrent movement observed and reconciled during this diagnosis:

- `de34ec33ff9ee52d0228a340453272d4e03ba7b1`: governed Identity historical-migration digest amendment and guard; relevant to U002 and preserved.
- `629b86b9a3ca8fadc16158b6c9a078217ebe4af4`: repository-root derivation fix for closure tooling; disjoint from Captain product scope and preserved without importing it.
- `086e48f8f8ed9deaa9d1525f379505af056df355`: shared mobile LAN gateway root-cause fix for the PowerShell read-only `$PID` collision plus executable regression tests; relevant only as current Captain development/runtime transport infrastructure.
- `0916eb2500a0f6d83c47ed44124c02665f9cd0f9`: app-partner package rebaseline; no overlap with this Captain package and explicitly excluded from Captain scope.

Important current-state corrections:

1. Captain runtime already composes Identity + Workforce + server readiness and fails closed with `ELIGIBILITY_UNAVAILABLE` when eligibility cannot be read.
2. Captain finance already renders WLT-backed own wallet/COD/commissions/payout surfaces; the old claim that Captain commission lifecycle readback is missing is stale.
3. `docs/architecture.drawio` is now a generated ArchPulse XML topology artifact. It may assist dependency discovery but cannot override authority, Product Truth, or exact source/contracts.
4. A concrete route-convergence check remains: `DshCaptainRouteRenderer` renders `orderchat` as disabled while `CaptainSupportScreenRouter` exposes governed `chat-read-ack`/`chat-send`. U005 must establish one canonical support/chat route and remove or delegate any obsolete parallel route if proven.
5. Dispatch Product Truth currently says `IMPLEMENTED_PENDING_VERIFICATION` with no declared open code gaps. U004 therefore verifies the current candidate first and changes code only on evidence-backed failure.

## Execution discipline

Execute units in `EXECUTION-ORDER.json`. Before every logical write batch re-resolve `BB`, classify concurrent movement, reconcile it, and use only fast-forward writes. For each unit:

`current truth → targeted verification → reproduce/prove gap → fix truth owner → migrate affected Captain-specific consumers → remove obsolete parallel behavior → rerun invalidated checks → canonical readback → RESULT.json bound to exact resulting SHA`

Do not rewrite working code merely because an older plan expected work there. Do not accept a local UI success as closure for persisted, cross-surface, security, financial, or runtime behavior.

## Read order

1. `MANIFEST.json`
2. `GLOBAL-DIAGNOSIS.md`
3. `COVERAGE.json`
4. `EXECUTION-ORDER.json`
5. each unit's `DIAGNOSIS.md`, `EXECUTION.json`, `VERIFICATION.json`, `RESULT.json`
6. `CLOSURE.md`

## Package validation

When a shell is available:

```powershell
node plans/diagnose-implementing/validate-package.mjs plans/diagnose-implementing/app-captain-fullstack-journeys --strict
```

Do not claim strict-validator PASS unless that command actually exits zero on the package candidate.

# Start here — app-partner-fullstack-journeys

## Current repository truth

- Repository: `bthwani2-boop/bthwani-suite-next`
- Branch: `BB`
- Current re-diagnosis baseline: `f48d27e09e17dffaa471f394a46cd2878d3c1d86`
- Previous package-observed head: `086e48f8f8ed9deaa9d1525f379505af056df355`
- Drift since that observation: 314 commits, including direct Partner runtime, Identity session/refresh, WLT financial Product Truth, migrations, runtime and CI changes.
- Existing package mode: `RESUME_AND_RECONCILE`
- Package decision: `READY_FOR_IMPLEMENTATION`
- Product/runtime closure: **OPEN**

This is the existing Partner package. Do not create a replacement package. Do not import the Captain, Client, Field or Control Panel applications as independent scope.

## FAIL-CLOSED execution rule

Every unit begins OPEN. DONE is forbidden while one known executable in-scope defect, contradiction, stale contract/evidence reference, unjustified duplicate path, dead code/remnant, authorization weakness, data inconsistency, unresolved state, hidden workaround, regression or unverified required behavior remains.

For every finding execute:

`Root Cause → Blast Radius → authoritative-owner correction → affected Partner consumers/counterparts → cleanup/remnant removal → canonical readback → negative/concurrency/unknown-result tests → regression/E2E verification`

Build, lint, typecheck, unit tests, partial CI, a working screen or disappearance of one error are supporting evidence only. Do not use bypass, fallback that hides failure, weakened gate, disabled test, TODO/FIXME, local success flag or parallel truth to close a unit.

Cleanup is part of DONE: remove proven dead/duplicate/stale routes, imports, exports, types, contracts, evidence pointers, compatibility layers and misleading presentation after caller/blast-radius proof.

## Hard scope

Primary implementation surface: `apps/app-partner/runtime` and `services/dsh/frontend/app-partner`.

External paths enter only when they are a direct truth owner, authorization/data/contract boundary, or a mandatory counterpart of the same Partner journey:

- Identity: Partner authentication/session/surface/refresh lifecycle.
- DSH: Partner/Store operational truth, orders, publication, team/fleet, custody, support and operational analytics.
- WLT: payout destination, wallet/ledger, COD/settlement/commission/payout financial truth.
- app-field: only onboarding/evidence and field-rating counterpart required by the Partner onboarding lifecycle.
- app-captain: only Partner fleet and Store↔Captain handoff/support counterpart.
- app-client: only Partner-originated publication/order/custody/support readback.
- control-panel: only Partner-specific operator/finance counterparts.

Generic dashboard, HR, operator login, unrelated analytics/catalog/marketing, independent Client/Captain/Field flows and unrelated financial capabilities stay out unless current evidence proves a direct Partner dependency before a write.

## Current high-priority findings

1. **Identity/session blast radius changed.** Current Partner runtime still uses SecureStore, stable device fingerprint, Partner push registration and exact `partner` + `app-partner` session gating, but Identity now includes governed refresh-rotation concurrency and stronger outage/session contracts. U001 must prove simultaneous refresh, replay/conflict, logout/relogin/restart/actor-switch and exact session-surface isolation instead of relying on the old generic session check.
2. **A current Partner-specific post-onboarding path was missing from the package.** `PartnerFieldRatingGate` wraps `DshPartnerSurface` after Identity. It is a dismissible feedback modal, not an authorization gate: children render regardless. U001 must verify server-derived eligibility, one governed rating fact, actor/Partner/field isolation and retry/readback without turning this feedback path into access/readiness truth or broadening app-field scope.
3. **Partner Fleet Product Truth contains stale evidence metadata.** It still references removed `dsh-933_jrn030_partner_fleet_action_audit.sql`; the live migration is `dsh-933_partner_fleet_action_audit.sql`. U004 must repair the canonical evidence pointer and verify migration manifest/database lifecycle without renaming or rewriting applied migration history.
4. **Partner finance contract changed materially.** Current `WLT_MONEY_MOVEMENT_SETTLEMENT` Product Truth makes Partner payout destination read-only, requires server-resolved current verified destination, `FULL_AVAILABLE`/`SPECIFIED` payout intent, WLT-owned eligible amount, idempotency and explicit `provider_result_unknown` reconciliation. U007 must be reverified against this contract; it must not recreate already-correct UI behavior or preserve obsolete Partner COD/finance semantics merely because a route exists.
5. **Selected-Store analytics mismatch remains reproduced on the current head.** `PartnerAnalyticsInsightsPanel` depends on and displays `canonicalStoreId`, while `fetchPartnerPerformance(period)` sends no Store identifier and backend `handlePartnerPerformance` chooses a Store via `partnerStore`. U008 must fix the semantic contract at backend/authorization level or change the UI to the actual aggregation semantic; changing only labels is forbidden.
6. Partner onboarding/publication remains `READY_FOR_IMPLEMENTATION`, support/rescue remains `DISCOVERY`, and `WLT_MONEY_MOVEMENT_SETTLEMENT` remains `DISCOVERY`. Existing code is not protected product acceptance or final closure evidence.

## Units

Keep the existing eight-unit DAG:

1. `U001` Partner access/readiness/Store scope — materially updated for Identity refresh/session and post-onboarding field rating.
2. `U002` Partner order intake/preparation — revalidated; no duplicate unit needed.
3. `U003` Partner catalog/Store publication — revalidated against current onboarding/publication Product Truth.
4. `U004` Partner team/fleet — materially updated for stale fleet migration evidence plus lifecycle proof.
5. `U005` Partner handoff/delivery exceptions — revalidated as the Store↔Captain custody slice only.
6. `U006` Partner support/order rescue — revalidated as the governed Partner support slice only.
7. `U007` Partner finance/WLT — materially rebaselined to current money-movement/payout contract.
8. `U008` Partner analytics/commercial readback — current mismatch reproduced and retained as a concrete root-cause task.

## Execution discipline

Before each logical product write and before final decision: fetch `BB`, compare against the pinned candidate, classify concurrent changes, reconcile related/overlapping work, rerun invalidated evidence, and fast-forward only. Never force push.

All `RESULT.json` files remain evidence-only. Do not pre-populate PASS. The final candidate must be the SHA after the last relevant product write and cleanup write.

## Package validation

When a shell is available:

```powershell
node plans/diagnose-implementing/validate-package.mjs plans/diagnose-implementing/app-partner-fullstack-journeys --strict
```

Do not report this validator, runtime, PostgreSQL, WLT reconciliation, device, visual/RTL/accessibility or CI as PASS until actually executed on the exact candidate.

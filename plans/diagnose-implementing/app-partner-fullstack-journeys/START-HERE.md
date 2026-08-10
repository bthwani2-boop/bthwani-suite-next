# Start here — app-partner-fullstack-journeys

## Objective

Close the Partner application at root cause across its mobile runtime, sovereign Partner frontend, shared Partner-only bindings, Identity/session boundary, DSH operational truth, WLT-owned Partner finance readback, contracts, PostgreSQL invariants, runtime/CI evidence, and only the mandatory counterpart readbacks proven by current Product Truth.

This is the existing package. Do not create a replacement package and do not broaden it into general Client, Captain, Field, Control Panel, DSH, WLT, or infrastructure work.

## Pinned baseline

- Repository: `bthwani2-boop/bthwani-suite-next`
- Branch: `BB`
- Re-diagnosed baseline: `629b86b9a3ca8fadc16158b6c9a078217ebe4af4`
- Latest observed remote head after final pre-write reconciliation: `086e48f8f8ed9deaa9d1525f379505af056df355`
- Primary surface: `app-partner`
- Package class: derived support only; this directory is never runtime, policy, approval, product, migration, CI, or operational truth.

## Why the package was rebaselined

The previous package mixed an `abbas` diagnosis baseline with later evidence. `BB` is now hundreds of commits ahead of that source snapshot and contains direct Partner changes in runtime Identity/session wiring, Partner frontend bindings, DSH Partner APIs, tests, runtime smoke coverage, WLT-related behavior, and architecture documentation. Reusing the old baseline would make otherwise valid tasks untrustworthy.

During this reconciliation `BB` first moved from `a93586e91d1850b1db77a5514be65472056ec655` to `629b86b9a3ca8fadc16158b6c9a078217ebe4af4`. Those commits changed migration-governance records/guards and final-root-closure tooling rather than Partner route/UI semantics. Immediately before the package write it moved once more to `086e48f8f8ed9deaa9d1525f379505af056df355`; that commit fixes the shared mobile LAN gateway PowerShell implementation and strengthens its executable tests. It changes development/runtime transport tooling, not Partner business contracts, so it is incorporated as runtime-environment verification evidence rather than a new Partner product concern.

## Required reading order

1. `MANIFEST.json`
2. `GLOBAL-DIAGNOSIS.md`
3. `COVERAGE.json`
4. `EXECUTION-ORDER.json`
5. the first `READY` unit whose dependencies are satisfied
6. that unit's `DIAGNOSIS.md`, `EXECUTION.json`, and `VERIFICATION.json`
7. record real outcomes only in that unit's `RESULT.json`
8. continue in dependency order
9. complete `CLOSURE.md` only after every required check is bound to the exact final candidate

## Scope lock

`app-partner` is the product scope. A path outside the Partner app may be changed only when current evidence proves that it is one of the following for a Partner journey: authoritative Identity/DSH/WLT owner, server-side authorization boundary, database invariant, contract/generated client, directly shared Partner adapter/controller, or mandatory counterpart readback required by current Product Truth.

Other applications are never independent implementation scope here. `app-field`, `app-captain`, and `app-client` may appear only as narrow counterpart slices where current Product Truth requires onboarding evidence, fleet/handoff compatibility, publication/order readback, or support compatibility. The Control Panel may appear only at Partner-specific operator counterparts. Generic capabilities of those applications remain out of scope.

## Current architecture evidence

`docs/architecture.drawio` is now a non-empty ArchPulse-generated draw.io XML document on `BB`. It is useful dependency evidence, but it is not higher authority than governance, Product Truth, machine contracts, database constraints, or current source. The old statement that the file is zero bytes is obsolete and must not be reused.

## Current high-priority closure facts

- Partner runtime uses SecureStore-backed Identity session storage, a stable device fingerprint provider, Partner/app-partner `IdentitySessionGate`, mobile push registration, and `DshPartnerSurface`.
- Partner surface composition is centralized through the Partner binding registry and shared Partner models rather than independent local business truth.
- Store scope is loaded from DSH and Store context is re-authorized before presentation; client-selected Store identifiers remain intent, never authorization.
- The selected-Store analytics ambiguity is still present: `PartnerAnalyticsInsightsPanel` receives `canonicalStoreId`, while `fetchPartnerPerformance(period)` sends no Store identifier and the Go handler chooses a Store through `partnerStore`. `U008` must resolve the semantic contract, not patch the label.
- Applicable Product Truth is not uniformly in a final accepted state. For example Partner onboarding/publication is `READY_FOR_IMPLEMENTATION` and support/incidents/order-rescue is `DISCOVERY`; source presence is therefore not closure evidence.
- WLT remains the sole financial truth owner. Partner COD/settlement/commission/payout paths require vertical authorization, persistence, idempotency, reconciliation, audit, failure/unknown-outcome, and canonical readback proof.
- Shared mobile LAN/gateway tooling may be exercised only as runtime transport evidence for app-partner; it is not permission to modify unrelated mobile applications.

## Execution constraints

- Re-resolve `BB` before each logical write batch and before final push/decision. If it moved, compare and reconcile before continuing.
- Fix the first authoritative divergence, then migrate affected Partner consumers/readbacks. Do not add a second Partner, Store, Order, Fleet, Support, Analytics, settlement, COD, or wallet truth.
- Do not trust client-controlled Partner/Store/operator context for authorization.
- Do not convert an external counterpart into general scope merely because one Partner journey touches it.
- Do not weaken migration, security, contract, CI, runtime, or financial gates to make a check pass.
- No runtime/database/security/finance/visual/CI claim is PASS until executed against the exact implementation candidate.

# START HERE — app-client fail-closed full-stack closure

This is a **RESUME_AND_RECONCILE** of the existing package; no replacement package is authorized. The final pre-write branch pin is `BB@d6ff3a2463e4a6d748bbe6ef8955281e4ef25c28`. Deep source/CI diagnosis was performed at its immediate parent `f48d27e09e17dffaa471f394a46cd2878d3c1d86`; the one intervening commit changes only `app-partner-fullstack-journeys`, was classified DISJOINT, and was preserved. The prior client package commit `c14c208bbe778c6310123945d53820317f2b3798` is now 309 commits behind the final pin.

## Scope lock

`app-client` is primary. Partner/Captain/Field/Control Panel enter only at an exact writer/readback that changes client-visible canonical state. Independent administration, HR, analytics, dashboard, operator login, fleet, other-surface payout/settlement and unrelated defects are excluded unless a current exact trace proves client impact.

## Confirmed root findings

- Identity refresh concurrency now exists; do not recreate it. Close lifecycle/cache/offline/push/device isolation instead.
- Identity readiness is stale: runtime expects `identity-021_actor_lifecycle_status.sql` while governed manifest requires `identity-022_refresh_rotation_concurrency.sql`.
- DSH mobile actor/surface semantics are inconsistent: the system-surface/mobile-role test receives 401 instead of required 403.
- Canonical client catalog projection/assortment truth now exists; close publication→projection→runtime convergence rather than add another layer.
- Checkout still calls the versionless compatibility snapshot path although `ComputeCheckoutSnapshotTx` owns expected-version OCC. Propagate cart version through contract/generated/frontend/backend and remove the bypass when no valid caller remains.
- WLT readiness is stale: required `wlt-931_settlement_batch_mutation_idempotency.sql` versus runtime `wlt-930_checkout_quote_payment_session_guard.sql`.
- Node setup is blocked in root postinstall by Redocly `Self-referencing circular pointer` during generated OpenAPI materialization. U007 must identify its owner; repair enters this package only if the failing context is client-consumed Identity/DSH/WLT.
- WLT payout test compile failures are known but payout is not an app-client capability; do not import that implementation into this package.

Run U001→U006 in dependency order. U007 is mandatory terminal cleanup/red-team/exact-SHA closure. The package remains OPEN: implementation and verification are `NOT_STARTED`; no RESULT/CLOSURE may claim completion before all required evidence is executed on the exact final candidate.

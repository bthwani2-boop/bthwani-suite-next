# App Client Full-Stack Journeys — Start Here

This is the **existing** Schema v3 derived implementation-support package for `app-client`. It was reconciled in place; no replacement package was created.

## Pinned source truth

- Repository: `bthwani2-boop/bthwani-suite-next`
- Target branch: `BB`
- Final pre-write pin: `efbe5fae065dcc66b9bdcf0872deeed2bca61cf1`
- Intermediate diagnosis pin: `0916eb2500a0f6d83c47ed44124c02665f9cd0f9`
- Previous package baseline: `abbas@49bb4723f969c7275445d0c2ea96a4ee8fb8e2fa`
- Lifecycle decision: `RESUME_AND_RECONCILE`
- Package decision: `READY_FOR_IMPLEMENTATION` — this is not a claim that product/runtime closure has already occurred.

The old package cannot be mechanically reused: the final write base is 310 commits ahead of the old diagnosis pin and the delta includes direct app-client runtime/tests, shared mobile runtime, Identity, DSH cart/checkout/order/store/service-area/support/ratings code, WLT/governance and CI/runtime changes. During diagnosis `BB` moved twice. The first movement included a client-relevant shared mobile LAN fix and was inspected and incorporated as re-verification rather than duplicated work. The second movement changed captain/control-panel packages and governance classification without touching this app-client package or app-client code; it was classified and reconciled before the final pin.

## Hard boundary

**In scope:** every client runtime/native/session/account/address/discovery/store/catalog/marketing/special-request/cart/serviceability/checkout/order/tracking/pickup/delivery/finance/support/rating/notification/preference path, plus the exact shared controller/generated contract/backend/database/event/provider/WLT path and the minimal authorized writer/readback on another surface when that writer changes the same client-visible canonical state.

**Not in scope by mere proximity:** independent Partner/Captain/Field workforce, HR, fleet, payout administration, dashboards/analytics, generic administration/login, unrelated control-panel behavior, unrelated refactors, production deployment, provider activation or policy invention. An excluded area reopens only when current Product Truth or source trace proves it is necessary to the client outcome.

## Execution rule

Execute `EXECUTION-ORDER.json` sequentially. For every task: resolve the canonical owner first; repair the first authoritative divergence; migrate only directly affected consumers; delete only proven parallel/fallback truth; then verify positive, forbidden, wrong-actor/object, duplicate/replay, stale/conflict, race, dependency-unavailable, offline/recovery and cross-surface convergence cases as applicable.

A UI, unit test, static scan, CI check, database test, runtime smoke or physical-device scenario proves only what its `VERIFICATION.json` entry says. Final closure requires exact-candidate evidence and the independent approvals required by current Product Truth; this package never self-grants those approvals.

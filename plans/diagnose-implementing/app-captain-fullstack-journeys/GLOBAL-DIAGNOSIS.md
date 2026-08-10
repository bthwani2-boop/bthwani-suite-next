# Global diagnosis — App Captain on BB

## Pinned repository evidence

Target repository: `bthwani2-boop/bthwani-suite-next`.
Target branch: `BB`.
Rebaseline start SHA: `0916eb2500a0f6d83c47ed44124c02665f9cd0f9`.

The package previously described `abbas@319f47ce41aaca136fa9f25fa0db4e3587681886`. Comparing that lineage to current `BB` showed material drift across app-captain runtime/tests, Identity, Workforce, DSH dispatch/database tests, mobile runtime/transport, WLT-facing finance, contracts and CI. The old PASS/DONE assumptions and old “missing feature” statements are therefore not inherited.

Concurrent movement during diagnosis was explicitly reconciled rather than overwritten. `de34ec33ff9ee52d0228a340453272d4e03ba7b1` repaired the governed Identity historical migration digest ledger and added a guard against silent immutable-migration digest drift; this is relevant to U002. `629b86b9a3ca8fadc16158b6c9a078217ebe4af4` changed closure-tool repository-root derivation and is disjoint. `086e48f8f8ed9deaa9d1525f379505af056df355` fixed the shared mobile LAN gateway `$Pid`/`$PID` PowerShell collision and added executable regression coverage; this is relevant only to current development/runtime transport. `0916eb2500a0f6d83c47ed44124c02665f9cd0f9` rebaselined the app-partner package and does not overlap this Captain package.

## Authority and architecture

`AGENTS.md` and current governance remain authoritative for execution order and truth boundaries. Product semantics come from current Product Truth; implementation truth comes from the exact pinned source/contracts/migrations/tests; runtime truth requires candidate-bound execution evidence.

`docs/architecture.drawio` is currently non-empty ArchPulse-generated XML. It is useful only as a topology/discovery aid. It is not Product Truth and must never justify unrelated expansion.

The current Captain runtime composition is:

`Identity session/device → captain role + app-captain surface gate → Workforce captain profile → server readiness gate → DshCaptainSurface → shared DSH adapters → DSH backend/persistence → governed cross-surface readback`

WLT remains the exclusive owner of financial truth.

## Current implementation facts that must be preserved

### Identity / Workforce / readiness

`apps/app-captain/runtime/src/App.tsx` configures SecureStore-backed Identity session storage and device fingerprinting, requires `captain` + `app-captain`, requires Workforce kind `captain`, fetches authoritative readiness, and blocks with `ELIGIBILITY_UNAVAILABLE` when eligibility cannot be retrieved. `captain-readiness.policy.ts` makes allowed/blocked/unknown explicit. Current app-captain tests include readiness composition/transport and lifecycle policy checks.

Therefore U002 is **verification-first**. It must not recreate a readiness model. It must prove provisioning, role/surface enforcement, suspended/missing/wrong-actor denial, restart/logout isolation, push/device rebinding, shared mobile transport health, and migration/runtime integrity; only a reproduced mismatch authorizes code changes.

### Dispatch / fleet / custody

Captain dispatch Product Truth remains DSH-owned and currently records `IMPLEMENTED_PENDING_VERIFICATION`; it requires idempotent assignment/reassignment, server-owned eligibility/capacity, expiry, authenticated accept/decline, isolation and role-appropriate operator/client readback. U004 must not rewrite this path speculatively.

Store↔Captain custody still requires app-partner + app-captain + control-panel, with app-client as readback and app-field explicitly excluded. Pickup cannot outrun bilateral custody or a blocking handoff exception.

Partner fleet Product Truth remains approved and requires one DSH versioned/audited fleet truth, digest-only one-time codes, own-membership actions for Captain, partner lifecycle visibility and redacted operator readback.

### Tracking / proof / support

Location, delivery status and PoD require assignment-scoped retry/readback and device/runtime evidence. Foreground-only behavior is not, by itself, authorization to add background tracking.

Support/rescue Product Truth remains in discovery. Captain support is allowed only for assigned orders, internal notes remain operator-only, rescue transitions remain operator-owned, and DSH rescue must not mutate WLT truth.

A concrete route-convergence finding exists in current code: `DshCaptainRouteRenderer` has an `orderchat` route that renders messaging as disabled, while `CaptainSupportScreenRouter` maps `chat-read-ack` and `chat-send` to `CaptainOrderSupportConversationScreen`. U005 must decide from current route ownership/Product Truth which route is canonical, route all live Captain support entry points through it, and remove/delegate obsolete parallel behavior only if proven safe. This is a root-cause convergence task, not a cosmetic copy patch.

### Captain finance

The old package's “missing Captain commission readback” finding is stale. Current `WltCaptainFinanceScreen` renders `ActorWalletPanel actorType="captain"`, `WltCaptainCodCustodyScreen`, `RepresentativeCommissionPanel actorType="captain"`, and `PayoutDestinationPanel actorType="captain"`.

`RepresentativeCommissionPanel` reads `fetchOwnCommissions("captain")` and displays `pending`, `confirmed`, `settled`, `rejected`, `reversed`, policy/source information and resolution notes. The DSH representative-finance backend registers authenticated self-service Captain wallet/ledger/commission/payout routes and separate COD collect/remit actions, and resolves self-service identity server-side before calling WLT.

U006 therefore does **not** implement a second commission feature. It verifies actor isolation, contract/generated-consumer parity, WLT ownership, COD idempotency/reconciliation, payout destination/request lifecycle, error/unknown-result behavior and control-panel mutation separation. Shared representative components must not be changed unless a Captain-proven gap requires it; if a shared contract/component changes, every actual consumer must be verified without importing unrelated field/partner product work.

## Bounded cross-surface scope

In scope only where directly tied to Captain truth:

- control-panel `administration`: Captain role/access only.
- control-panel `hr`: Captain create/detail/readiness/fleet only.
- control-panel `partners`: partner-fleet operator readback only.
- control-panel `platform`: service-area/capacity configuration that gates Captain dispatch only.
- control-panel `operations`: dispatch, custody, proof, exceptions and rescue only.
- control-panel `support`: Captain assigned-order support only.
- WLT control-panel `finance`: Captain wallet/COD/commission/payout controls/readback only.
- app-client: Captain-caused tracking/order-state readback only.
- app-partner: fleet and store↔Captain handoff only.

Explicitly out of scope absent new proof: app-field implementation, catalogs, marketing, generic analytics/dashboard, generic control-panel login, client address/privacy ownership, unrelated finance/settlement capabilities, and planning work for other applications.

## Execution risks and closure standard

The high-risk areas are trusted actor isolation, session/device recovery, historical migration compatibility, shared mobile dev/runtime transport, assignment/custody concurrency, idempotency/replay, stale/unknown-result handling, PoD/media binding, location privacy, support ownership/internal-note isolation, WLT financial boundaries, and shared-contract compatibility.

No unit closes from static inspection alone when its acceptance depends on runtime, PostgreSQL, cross-surface, finance, security, physical-device or CI behavior. `RESULT.json` must record actual checks on the exact unit candidate. Final package closure requires all units DONE, required checks PASS on the final relevant candidate, canonical readback evidence, and protected independent approvals where Product Truth requires them.

This diagnosis was performed through GitHub Remote/API, not a shell. The package has been projected onto the current validator schema, but strict-validator PASS must be obtained by actually running the repository validator.

# Global diagnosis — app-partner-fullstack-journeys

Pinned diagnosis baseline: `bthwani2-boop/bthwani-suite-next@BB` at `f48d27e09e17dffaa471f394a46cd2878d3c1d86`.

## 1. Decision

Retain and update the existing package. Do not create a new package or new duplicate concerns. The eight existing units still form a coherent Partner closure DAG, but the package was materially stale: its root remained pinned to `629b86b.../086e48f...` while `BB` advanced another 314 commits through Partner runtime, Identity, WLT, migration, runtime and CI changes.

The package is now diagnosis-complete and execution-ready, but product/runtime closure remains OPEN. This update plans durable fixes; it does not execute shell/database/device/CI evidence.

## 2. Scope and truth ownership

`app-partner` is the primary product scope. External surfaces are included only as bounded mandatory counterparts of the same Partner transition/readback.

Authoritative ownership:

- Identity owns authentication, session surface/role, refresh rotation and trusted identity context.
- DSH owns Partner/Store lifecycle and scope, publication/serviceability, catalog/assortment, Partner orders, team/fleet, custody/handoff, support/rescue and operational analytics facts.
- WLT owns wallet/ledger, payout destination master data, payout eligibility/request, COD financial custody/effects, settlement, commission and reconciliation truth.
- app-partner and counterpart surfaces collect intent and render canonical readback only.

A selected Store ID, payout amount input, device fingerprint, local modal state or UI success is never authoritative security/operational/financial truth.

## 3. Rebaseline delta

The previous package-observed head was `086e48f8f8ed9deaa9d1525f379505af056df355`. Current `BB` is `f48d27e09e17dffaa471f394a46cd2878d3c1d86`, 314 commits ahead.

Material current changes include:

- app-partner runtime wrapper/startup changes;
- Identity exact session-surface policy, refresh-rotation concurrency, migration and contract tests;
- control-panel auth boundary hardening that affects Partner operator counterparts only where those counterparts are used;
- migration runner/amendment governance changes;
- WLT money-movement/settlement Product Truth changes;
- runtime/CI/security gate changes;
- current Partner package closure metadata without a matching full re-diagnosis.

Because the drift is material, old exact-SHA evidence is invalid. The package cannot merely replace SHA strings while preserving old assumptions.

## 4. Current Partner runtime and access

`apps/app-partner/runtime/src/App.tsx` still configures SecureStore-backed Identity session storage, stable Partner device fingerprint, catalog document selection, Identity API, Partner push registration and `IdentitySessionGate requiredRole="partner" requiredSurface="app-partner"` before `DshPartnerSurface`.

The old U001 session wording is insufficient on current `BB`. Identity now has a dedicated refresh-concurrency boundary and migration. U001 must prove one governed successor under concurrent refresh, replay/conflict behavior, outage recovery, exact session surface, logout/relogin/restart and actor switching. Local Store/device/push state must never bridge actors or authorize a request.

## 5. New Partner post-onboarding rating slice

Current Partner runtime also wraps `DshPartnerSurface` with `PartnerFieldRatingGate`. Despite its name, this component is not an access gate: it always renders children and conditionally overlays a dismissible modal. It fetches server prompt eligibility and submits a 1–5 rating/comment through shared provider-rating APIs.

This current Partner-specific flow was absent from the package. It belongs to the Partner onboarding/post-activation vertical slice because the copy ties eligibility to Store onboarding/activation and the field agent who assisted it. It does **not** authorize broad Field-app work.

U001 must verify:

- prompt eligibility is server-derived from the authenticated Partner/onboarding relationship;
- another Partner cannot rate or read an unrelated field relationship;
- completion/retry is persisted and duplicate-safe according to current rating contract;
- dismissing the modal is only presentation state and does not forge completion;
- prompt fetch failure does not grant or revoke Partner access/readiness;
- if current Product Truth/PRD defines the rating as optional feedback, it remains non-blocking; if product authority requires otherwise, change the authoritative contract rather than silently converting UI state into readiness truth.

## 6. Onboarding/publication remains open by Product Truth

`PARTNER_ONBOARDING_STORE_PUBLICATION` remains `READY_FOR_IMPLEMENTATION`. It requires trusted server-derived context, explicit Partner/Store business authorization, separation of field evidence and operator approval, WLT-owned payout destination references, and client visibility only after every applicable publication gate.

Therefore U001/U003 may preserve current working pieces but cannot declare the journey closed from source presence. Exact candidate runtime/database/security/counterpart evidence remains required.

## 7. Partner team/fleet — concrete canonical evidence drift

`PARTNER_FLEET_CONNECTION.product-truth.json` still names `services/dsh/database/migrations/dsh-933_jrn030_partner_fleet_action_audit.sql` as evidence. That file is no longer the live migration path. Current repository truth contains `services/dsh/database/migrations/dsh-933_partner_fleet_action_audit.sql`.

This is a real canonical-evidence defect inside U004. The implementation unit must correct the Product Truth evidence pointer, preserve migration immutability/history, and verify the current migration manifest plus partner-fleet lifecycle. It must **not** rename or rewrite an applied migration to make stale metadata appear correct.

The functional fleet requirements remain: Store-scoped Partner issue/list/revoke, Captain redeem/list/disconnect, redacted operator readback, digest-only code storage, expiry, optimistic versioning, audit, notifications and deterministic replay/concurrency behavior.

## 8. Orders, catalog, handoff and support

U002, U003, U005 and U006 remain correctly bounded after re-diagnosis:

- U002 owns Partner order intake/preparation decisions, legal transitions, OCC/idempotency/audit and canonical readback; Client/operator appearances are only counterpart readbacks.
- U003 owns central catalog/assortment/Store publication consequences used by Partner; unrelated catalogs/marketing remain excluded.
- U005 owns Store↔Captain custody/handoff/exceptions only; no independent Captain redesign.
- U006 owns Partner assigned-order support/rescue compatibility; operator owns rescue transitions and DSH must not mutate WLT from rescue.

Their current tasks should first reproduce a mismatch on the then-current candidate before changing code. Already-correct source is verified, not rewritten for activity.

## 9. Partner finance — U007 requires material rebaseline

The former package framed U007 mainly around wallet/settlement/commission/payout/COD readback. Current financial Product Truth is `WLT_MONEY_MOVEMENT_SETTLEMENT`, state `DISCOVERY`, and it is more specific.

For Partner, current Product Truth requires:

- one canonical WLT wallet/ledger truth;
- masked read-only current official-wallet destination;
- Partner cannot create/update/deactivate/select payout destination master data;
- payout request intent is only `FULL_AVAILABLE` or `SPECIFIED` plus idempotency context;
- for `FULL_AVAILABLE`, WLT resolves current eligible amount transactionally; the client sends no authoritative total;
- for `SPECIFIED`, WLT validates the requested amount against current eligible funds inside the authoritative boundary;
- ambiguous external execution remains `provider_result_unknown`/held for reconciliation and is not local success;
- financial master-data changes belong to governed Finance workflows with versioning/evidence/approval;
- DSH/frontend cannot calculate authoritative balances, settlements, commissions, payout totals or completion.

Current `WltDshPartnerBridge` already composes WLT-backed wallet, commission, payout and Partner COD panels. Current `PayoutDestinationPanel` is substantially aligned: destination is masked/read-only, FULL_AVAILABLE/SPECIFIED are explicit, an attempt idempotency key is retained through failures, and `provider_result_unknown` is presented as reconciliation-required.

Therefore U007 is **verification-first** for those aligned pieces. Do not reimplement them. The remaining work is to prove server authorization/eligibility/idempotency/reconciliation and to census Partner COD/legacy finance routes against current Product Truth. A route that is no longer canonical must be removed/delegated after caller proof rather than preserved as parallel financial truth.

## 10. Selected-Store analytics defect remains reproduced

The old U008 root cause remains present on `f48d27e...`:

- `PartnerAnalyticsInsightsPanel` accepts `canonicalStoreId`, reloads when it changes, labels performance as Store-specific and prints that operational scope.
- `fetchPartnerPerformance(period)` sends only `period`.
- `handlePartnerPerformance` resolves `storeID` independently through `partnerStore` and computes performance for that Store.

For a multi-Store Partner, the visible selected Store and backend analytics Store are not contractually tied. U008 must select one semantic:

1. selected-Store intent is part of the API contract and is re-authorized server-side; or
2. analytics is Partner-wide/default-Store and UI/read-model semantics stop claiming selected-Store scope.

Changing only copy, refetch dependencies or local Store state is a workaround and does not close the root cause.

## 11. FAIL-CLOSED cleanup and adversarial verification

For every unit, a fix is incomplete until all affected callers/contracts/migrations/readbacks are migrated and obsolete parallel remnants are removed. Final review must deliberately search for:

- stale Store/Partner/actor state after restart/logout/refresh;
- cross-Partner/Store IDOR and client-controlled trusted context;
- payload-divergent idempotency replay;
- partial/unknown mutation shown as success;
- duplicate Partner/team/fleet/order/support/financial truth;
- dead routes/types/imports/contracts/evidence references after convergence;
- sensitive payout/code/token disclosure;
- stale analytics/financial data rendered as authoritative zero/success;
- migration manifest/amendment drift;
- regressions in required counterpart surfaces.

Any known executable finding reopens the owning unit.

## 12. Unit reconciliation

- `U001`: materially update for Identity refresh/session concurrency and PartnerFieldRating post-onboarding feedback, while preserving Store-scope/onboarding scope.
- `U002`: retain; current order/preparation boundary remains correct.
- `U003`: retain; current catalog/publication boundary remains correct and Product Truth is still not final.
- `U004`: materially update for stale Partner Fleet migration evidence plus existing lifecycle/security proof.
- `U005`: retain; Store↔Captain handoff/exceptions boundary remains correct.
- `U006`: retain; Partner support/rescue boundary remains correct.
- `U007`: materially rebase to `WLT_MONEY_MOVEMENT_SETTLEMENT` Partner payout/destination/reconciliation semantics and current COD compatibility census.
- `U008`: retain and strengthen; selected-Store mismatch is still reproduced on current source.

The dependency DAG remains valid and is not changed.

## 13. Evidence limits

This re-diagnosis is based on current GitHub repository truth. It does not execute Node/Go/PostgreSQL/WLT provider/device/visual/CI commands. `RESULT.json` remains the only location for actual candidate-bound outcomes. No PASS, DONE or CLOSED claim is created by this package update.

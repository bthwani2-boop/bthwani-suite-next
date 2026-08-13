# Global diagnosis — app-client full-stack journeys

## Current independent pin

This package was independently source-audited at `BB@659c05537d235e59b8fc39c64534df46987dcd0c` and reconciled before write to `BB@a13eacd6c5892501358563e324b1a9a53fa912cf` after the previous package commit `95649d7350803e230477e9564060b1ca7bcd0bb8`. BB advanced 29 commits after that package, including Identity migration evolution, DSH/Partner/Field onboarding work, mobile push registration, OpenAPI composer and CI/runtime changes. The package therefore cannot treat the previous CI snapshot as current product truth. The final concurrent delta `659c055... -> a13eacd6...` changes Field contract/tests and Partner local evidence/store-ownership seeds only; it does not touch app-client/package paths or the audited client benefits/profile/subscription sources, so it is preserved as a disjoint client-adjacent runtime seed delta rather than imported into client implementation.

## What the re-audit found missing

The previous six implementation units plus terminal closure did not cover all real client journeys. The largest omission is the benefits/commercial-program slice: `BenefitsHubScreen` exposes loyalty points/tiers, offers/coupons, membership, subscription purchase/payment/activation/renewal and cancellation/compensation, yet no unit owned that combined DSH/WLT lifecycle. The shared subscription client also creates a new time/process-sequence idempotency key for every mutation and stores pending purchase/payment session only in component memory. Crash/relaunch/retry safety must therefore be treated as a root-cause financial invariant, not assumed from UI state.

The second omission is account self-service reachability and privacy. `MySpaceScreen` exposes a commercial-profile action, but `DshClientSurface` does not supply `onOpenProfile` or route `MyProfileScreen`. That screen owns OCC preferences and marketing/data-processing consents and contains data-copy/account-deletion affordances. The package previously covered address privacy but not profile OCC, consent persistence, privacy-right disposition or the requirement that every visible client action be reachable.

The final omission is closure-level route/dead-code census. `WltClientWalletPanel` is explicitly a legacy alias exported by the app-client finance barrel while the active My Space path uses the canonical shared wallet projection. It is a cleanup candidate, but deletion requires a full reference census. U008 now requires this evidence for every visible action, deep link, compatibility wrapper, alias and exported adapter.

## Superseded findings

The older package recorded Identity readiness lag, DSH 401-versus-403 mobile-surface semantics and an OpenAPI postinstall `Self-referencing circular pointer` as current defects. On Actions run `31672375772` at `659c05537d235e59b8fc39c64534df46987dcd0c`, Node workspace setup succeeds and Identity backend/database succeeds; the DSH `internal/http` package also passes. Those findings are retained only as history and must not trigger duplicate implementation.

## Current failures and scope classification

Current DSH backend verification fails in `internal/health`: `latest_required=dsh-999b_partner_evidence_lifecycle.sql` while runtime reports `dsh-999z_field_onboarding_assignments.sql`. The migration named by the failure is Partner evidence, so the client package records it as a shared/external closure blocker rather than implementing Partner onboarding.

Current WLT verification still fails readiness because runtime expects `wlt-930_checkout_quote_payment_session_guard.sql` while the governed set requires `wlt-931_settlement_batch_mutation_idempotency.sql`. This is a shared WLT readiness defect that can block client financial runtime and remains relevant to U005. The same WLT job also has payout test compile failures; payout is not a client capability and stays outside client execution.

Current project-wide journey gates fail on Field payout/onboarding contract bindings, and full runtime smoke fails on Partner payout-destination HTTP 405 after the DSH catalog smoke already passes. These are real repository blockers but not app-client implementation tasks absent a direct client trace. The package must never expand scope just to make those jobs green.

## Corrected execution model

U001 now owns runtime/session plus client profile/consents/privacy rights and visible account route reachability. U002 remains discovery/catalog/special requests. U003 remains cart/serviceability/checkout/exactly-once order creation. U004 remains order lifecycle/fulfillment. U005 remains wallet/payment/refund. U006 remains support/ratings/notifications/preferences. New U007 owns benefits/loyalty/offers/subscription purchase-renew-cancel-compensation. U008 is the strengthened terminal visible-action cleanup, red-team and exact-SHA closure gate.

Cross-surfaces enter only where they write the exact canonical state read by the client. Partner/Field onboarding, payouts, HR, fleet, independent administration/analytics/dashboard and unrelated style failures are not implementation scope. They may remain explicit external blockers if project-wide gates require them.

## Fail-closed decision

Diagnosis is COMPLETE and the plan is READY; implementation and verification are NOT_STARTED. No DONE/CLOSED claim is authorized. Execution must use `tools/prompting/02-execute-verify-close.md`, re-resolve BB before every write, reconcile concurrent movement, implement root cause by canonical owner, and run U008 on the exact final candidate before any `CLOSED_WITH_EVIDENCE` transition.

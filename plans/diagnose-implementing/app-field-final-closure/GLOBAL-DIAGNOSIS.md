# Global Diagnosis — App Field Final Closure

## Scope decision
This package is intentionally **app-field-centric**. `app-field` is the primary execution surface. Another surface, service, database, provider or control-panel section is included only when current Product Truth or current source proves that it writes, authorizes, persists, observes, reviews, publishes, pays or recovers an outcome that originates in or is required by an app-field journey. The five mobile/control surfaces remain in the mechanical package envelope because the current validator expects them; they are not automatically functional scope.

`app-captain` is explicitly excluded from the currently identified field closure journeys. `governance/product/contracts/store-captain-handoff.product-truth.json` states that app-field has no custody role after readiness, and `partner-onboarding-store-publication.product-truth.json` marks app-captain as not required for onboarding/publication. Generic customer checkout, dispatch, delivery, captain COD/custody, partner-only operations, marketing campaigns and unrelated control-panel administration are not part of this package.

## Authority and current truth
Authority resolves through `governance/authority/authority-precedence.json`: Product Truth precedes architecture, journey protocol, implementation and derived support. The prior package and `plans/smsm-dsh-wlt-journeys` are discovery support only. Current Product Truth directly establishes field involvement in partner onboarding/store publication, Identity activation/session behavior, and field representative wallet/commission/payout reads through DSH with WLT as the financial owner.

The diagnosis was pinned at `ba3393c39b0d0b265a4caf110b3bca685e43b0e3` and reconciled through observed head `a2373ded31dc04f807d182997d0f07f56cd1f3fb`. The seven intervening commits were inspected by compare. Most are WLT-wide finance work outside this package. One directly relevant DSH change adds canonical store-mutation request fingerprinting and PostgreSQL transaction-scoped advisory-lock serialization in `services/dsh/backend/internal/store/idempotency.go`, with focused regression tests. This is a correct existing implementation to preserve and consume; field store/onboarding work must verify that its mutations converge through this canonical protection rather than recreating idempotency locally.

## Current implementation to preserve
The current app-field runtime composes SecureStore-backed Identity session state, device fingerprint, role/surface gating, Workforce profile gating, readiness gating, deep links and push registration. Field onboarding has evidence/document/media flows. Visits capture high-accuracy location and reject disabled services, denied permission, mocked location and weak accuracy. Shared field problem classification carries specific reason codes and recovery actions. Work queue, visit, checklist, verification, escalation, catalog operations and field finance surfaces exist. Field finance calls `/dsh/field/me/finance/*`, preserving the DSH-to-WLT boundary. Canonical DSH store mutation idempotency now fingerprints operator context, actor, store, operation and payload and serializes identical identities inside PostgreSQL transactions; field flows should reuse it.

## Remaining root gaps
1. `UnifiedReadinessWrapper` still returns `null` while readiness is unresolved, allowing an ambiguous blank screen instead of explicit loading/recovery state.
2. Work queue currently represents in-progress visits and open escalations; complete assignment-scoped work-center behavior, freshness, stale/revoked work and pending-sync visibility are not proven.
3. Visit UI exposes start/checklist/complete/verification but does not prove every authoritative terminal/conflict/cancel-or-abandon rule, stale assignment handling and mutation-time revalidation.
4. Native field offline storage is encrypted and has actor/install scope, idempotency, correlation, retry/backoff and corruption preservation, but the operation model still lacks explicit expiry, cancellation, unknown-result reconciliation and queue schema migration. Only create_visit, complete_visit, readiness_check and escalation are represented.
5. Catalog setup uses central catalog/batch linking, but the current product UI still relies on text barcode search and sends `barcode: null` for new proposals; camera barcode capture is not proven. Conflict/version and final partner/client readback still need same-journey evidence.
6. Escalation creation is implemented; employee-visible post-submission lifecycle and operator request/decision readback are not proven end to end.
7. Field wallet/ledger/commissions/payouts are current Product Truth scope, but the Product Truth remains DISCOVERY and requires field-only runtime, isolation, WLT-unavailable and financial-control evidence. COD custody is excluded from this package.
8. `apps/app-field/runtime/package.json` maps `test` to the generic mobile runtime contract checker. The app-field test directory currently contains a readiness transport test that this package script does not execute, so the declared `test` command is not sufficient behavioral evidence.
9. Physical push/deep-link launch, background/lifecycle, process death, secure offline recovery, permissions, accessibility, release-build behavior, observability identity and same-SHA convergence remain runtime evidence requirements.

## Exact related surfaces
- `control-panel`: field provisioning/readiness/assignment, onboarding review, store/readiness decisions, support/escalation readback and permission-scoped field finance lookup.
- `app-partner`: only partner/store/readiness/catalog state produced or changed by field onboarding.
- `app-client`: only public store/catalog/product visibility after applicable publication gates.
- `app-captain`: explicitly not a field closure dependency under current Product Truth.
- Identity/Workforce/DSH/WLT/Media/PostgreSQL/providers: only the field-owned trust, persistence, evidence, finance, location/push and readback paths.

## Closure model
Execution must change canonical code/contracts/tests, never turn this package into product truth. A successful app-field screen is not closure if server authorization, persistence, idempotency, audit or an explicitly required reader disagrees. A surface explicitly excluded by Product Truth must not be invented as a closure gate. Final closure requires field-scoped automated checks plus physical-device and cross-surface evidence on one resulting SHA.

# DSH SYSTEMIC DEEP DIAGNOSIS — ROOT-CAUSE LANDSCAPE

Status: `ACTIVE_DIAGNOSIS / NOT_CLOSED`
Repository: `bthwani2-boop/bthwani-suite-next`
Branch: `b`
Pinned evidence HEAD before this documentation write: `3f3d0362b8d4f0c6c27a4c5eec68c6a397c0c6b1`
Method: `TOP-DOWN DIAGNOSIS; BOTTOM-UP EVIDENCE; FIX HIGHEST PROVEN ROOT FIRST`

## 0. Scope law

This diagnosis covers DSH as an operational system, not only `services/dsh/backend`.

Mandatory closure scope includes:

- `services/dsh/backend/**`
- `services/dsh/database/**`
- `services/dsh/contracts/**`
- `services/dsh/frontend/shared/**`
- `services/dsh/frontend/app-client/**`
- `services/dsh/frontend/app-partner/**`
- `services/dsh/frontend/app-captain/**`
- `services/dsh/frontend/app-field/**`
- `services/dsh/frontend/control-panel/**`
- runtime hosts under `apps/app-client`, `apps/app-partner`, `apps/app-captain`, `apps/app-field`, `apps/control-panel`
- direct authority dependencies: `services/wlt`, `core/identity`, `core/workforce`, `core/platform-control`, `core/providers`
- jobs, outboxes, callbacks, caches, provider paths, generated contracts/clients, guards, migrations, observability, security and cleanup.

No domain is closed by a representative file. Required coverage chain for every material capability:

`Authority -> Writers -> Readers -> DB -> API/Event -> Shared/Generated -> Surface -> Runtime -> Failure/Recovery -> Cleanup -> Closure Evidence`

Any missing link remains `OPEN` or `HOLD`.

## 1. Target architecture invariants

1. One authoritative owner per mutable fact.
2. DSH owns operational intent/state; WLT owns money/policy/ledger; Workforce owns HR/workforce activation truth; Identity owns actor/session identity; Platform Control owns governed platform variable/feature changes; Providers owns provider configuration/health authority.
3. A success state may not be recorded before the required real-world/canonical effect is proven.
4. Required audit/provenance is part of the same durable commitment as the governed mutation.
5. Required cross-service effects are transactional-outbox/saga effects, never fire-and-forget post-commit best effort.
6. No raw identifier may be reused across actor/membership/store/branch authorities.
7. Client-visible/store-ready truth must be derived from the same commercial truth used by cart/checkout.
8. Cache may accelerate reads but cannot overrule a canonical deny/revocation.
9. Checkout cannot reach payment handoff without a canonical READY state and valid reservations.
10. Inventory quantity-tracked checkout requires a real reservation lifecycle.
11. No compatibility projection may remain an authoritative writer after cutover.
12. Destructive cleanup happens only after all live consumers are migrated and proven.

## 2. Proven systemic root causes

### DSH-RC-01 — Platform/provider authority duplication

Status: `PROVEN`
Priority: `P0 architecture`

Evidence:

- DSH contains parallel provider registry/config paths over `dsh_platform_providers` with incompatible column models.
- The DSH migration-backed model uses fields such as `is_active`, `is_maintenance`, `secret_reference`, timeout/retry budgets and `last_health_check_at`, while another wired DSH path expects a different schema such as `status`, `secret_reference_name`, `metadata`, `last_health_check`.
- The incompatible DSH provider service is wired into protected store servers.
- Canonical `core/providers` already exists with backend/contracts/database and a governed transactional update model.
- `core/providers` separates desired provider configuration from observed provider health.
- Canonical `core/platform-control` already exists with true ChangeSet apply/rollback, serializable transaction, target locks, revision/snapshot validation and audit.

Root:

DSH contains authority implementations for platform/provider concerns already owned by dedicated core services.

Required remediation:

1. Declare `core/providers` sole provider config/health authority.
2. Declare `core/platform-control` sole platform ChangeSet/config authority.
3. Replace DSH provider/platform DB access with typed clients to the canonical services.
4. Migrate Control Panel consumers to canonical BFF/service routes.
5. Prove read/write parity and failure semantics.
6. Delete DSH parallel tables/routes/services only after cutover proof.
7. Do not repair the duplicate DSH schema as a compatibility solution.

Closure evidence:

- zero live writer to DSH provider/platform duplicate tables;
- zero live route exposing duplicate mutations;
- canonical service contract tests + BFF/runtime smoke;
- deletion/reference scan passes.

---

### DSH-RC-02 — Branch identity is not canonical

Status: `PROVEN`
Priority: `P0 domain model`

Evidence:

`partnerdelivery.Service.AssignCourier` explicitly documents that `dsh_orders` has no `branch_id`, assumes single-branch stores, then sets `branchID := storeID` and persists it into `dsh_partner_delivery_tasks.branch_id`.

Legacy partner-team/courier migrations also use textual `branch_assignment` / `selected_branch_ids` instead of a canonical branch aggregate.

Root:

Store and Branch identities are semantically collapsed.

Blast radius:

- partner delivery
- inventory allocation
- serviceability/coverage
- store team/fleet scopes
- dispatch
- settlement/analytics
- branch-level operator controls

Required remediation:

1. Introduce/confirm canonical `StoreBranch` entity with DB identity/FK.
2. Add canonical branch reference to orders where branch is operationally material.
3. Migrate delivery tasks, fleet scopes, coverage and inventory ownership to real branch IDs.
4. Remove `storeId-as-branchId`, text branch assignments and untyped arrays after cutover.
5. Add typed IDs/contracts and migration assertions preventing cross-identity substitution.

---

### DSH-RC-03 — Captain affiliation, partner membership and store/branch scope are conflated

Status: `PROVEN`
Priority: `P0 domain model`

Evidence:

`dsh_captain_memberships` combines `captain_actor_id`, `affiliation`, `partner_id`, `store_id`, `branch_assignment`, `delivery_assignment`, and enforces one active row per captain actor.

This conflates:

- primary fleet affiliation;
- membership in a partner fleet;
- store scope;
- branch scope.

Required target:

- `PrimaryFleetAffiliation` — exactly one active affiliation per captain;
- `PartnerCaptainMembership` — partner membership lifecycle;
- `StoreScope` — zero or more;
- `BranchScope` — zero or more;
- Workforce remains owner of HR/activation readiness.

---

### DSH-RC-04 — Partner-delivery courier identity is ambiguous

Status: `PROVEN`
Priority: `P0 correctness/security`

Evidence:

- Partner fleet has a membership-row ID and a distinct `captain_actor_id`.
- Partner Delivery accepts a raw `storeCourierId`.
- The same raw value is persisted as courier identity and passed to Workforce `ActivationReadiness` as if it were an Actor ID.

Root:

A single untyped string crosses two authority identities.

Required remediation:

- API accepts `captainMembershipId` for DSH assignment.
- DSH resolves membership -> canonical `captainActorId`.
- Workforce receives Actor ID only.
- DB/FK and typed contract wrappers make membership/actor substitution impossible.

---

### DSH-RC-05 — Inventory reservation lifecycle is missing

Status: `PROVEN`
Priority: `P0 commercial correctness`

Evidence:

- `dsh_store_assortment_inventory` contains `quantity` and `reserved_quantity`.
- Cart/purchasability uses `quantity - reserved_quantity`.
- Inventory mutation preserves `reserved_quantity` but does not create/release reservations.
- Checkout validates/snapshots cart and serviceability but does not reserve stock.
- Order creation copies immutable item snapshots but does not commit/release stock reservations.
- No current reservation aggregate/worker lifecycle was found for `reserved_quantity`.

Risk:

Concurrent checkouts can both observe the same available units and oversell.

Required target aggregate:

`InventoryReservation { HELD -> COMMITTED | RELEASED | EXPIRED }`

Must include:

- checkout/item/assortment identity;
- quantity;
- expiry;
- idempotency identity;
- row locking/OCC;
- checkout hold;
- order commit;
- cancel/payment failure release;
- expiry worker;
- audit/outbox;
- readback and invariants.

Checkout must not become payment-handoff eligible for quantity-tracked items without a valid hold.

---

### DSH-RC-06 — Checkout state machine is bypassed by the normal WLT handoff

Status: `PROVEN`
Priority: `P0 journey correctness`

Evidence:

- `CreatePricedIntentTx` creates every new priced intent in `draft`.
- The normal HTTP create flow commits that intent, performs external WLT quote/session work, then calls `AttachWltPaymentSessionIdempotent`.
- `AttachWltPaymentSessionIdempotent` explicitly permits handoff from `ready`, `blocked`, `draft`, and `validating`, moving the intent directly to `confirming`.

Root:

The declared `draft -> validating -> ready -> confirming` state machine is not the actual governing transition graph; validation is spread across handler code rather than enforced by the aggregate.

Required remediation:

1. Define one canonical checkout transition service.
2. `READY` means all required cart/serviceability/address/pricing/coupon/inventory-reservation evidence is current and frozen.
3. WLT session handoff only from `READY`.
4. No domain method can move `draft/validating/blocked` directly to payment handoff.
5. Revalidation/reservation expiry invalidates readiness explicitly.

---

### DSH-RC-07 — WLT -> DSH -> Order payment projection can permanently diverge

Status: `PROVEN`
Priority: `P0 runtime/financial projection`

Evidence chain:

1. WLT terminal payment/refund outcomes are durably enqueued in `wlt_dsh_outbox_events` and retried until DSH returns 2xx.
2. DSH applies checkout projection + coupon projection + WLT event receipt in one transaction.
3. DSH commits that transaction before updating the optional order payment projection.
4. `applyOrderPaymentProjection` is post-commit and an error is logged only; the HTTP request still succeeds.
5. The projection-change SQL references placeholders `$1,$3,$4,$5` but the call passes only four arguments; the changed-projection path therefore cannot execute correctly as written.
6. `mapWltPaymentProjection` does not cover every checkout WLT status accepted by `paymentEventTargetState` (for example COD-specific states are not uniformly represented).
7. WLT marks its outbox event `sent` after DSH 2xx, so it will not retry the already accepted event.
8. `dsh_order_payment_projection_reconciliation` exists and is scheduled by DB trigger, but DSH `main.go` starts no worker that consumes this reconciliation table; `wltoutbox` handles different operational/financial events.

Result:

A required order projection may remain stale permanently while both services believe delivery of the WLT event succeeded.

Required remediation:

Preferred architecture:

- WLT event receipt and every required DSH projection/event effect for that source event must become one durable DSH saga/transaction boundary.
- If order does not yet exist, persist a durable projection source fact keyed by WLT event/session and let order creation consume it.
- If order exists, update order projection + status event/outbox atomically with the WLT receipt where possible.
- If post-commit work is unavoidable, enqueue it durably before acknowledging WLT.
- Implement or remove the orphan reconciliation queue; do not keep a table/runbook claiming a worker that is not wired.
- Add supported-status contract shared with WLT and exhaustive tests.

Immediate defect proof required during execution:

- regression test for the SQL placeholder path;
- COD status mapping tests;
- lost-event/post-commit-failure test proving eventual repair;
- worker wiring test.

---

### DSH-RC-08 — Checkout has manual reconciliation but no complete self-healing payment-outcome saga

Status: `PROVEN`
Priority: `P0 resilience`

Evidence:

- ambiguous WLT payment-session creation returns `202` with `reconciliationRequired=true` and leaves intent `confirming`.
- operator reconciliation replays the idempotent WLT session creation and reattaches the session.
- successful reattachment only proves session handoff; the intent still awaits the eventual WLT payment outcome callback.
- no active DSH worker was found to consume the payment-projection reconciliation queue.

Required remediation:

Split explicit concerns:

1. `SESSION_HANDOFF_RECONCILIATION`
2. `PAYMENT_OUTCOME_RECONCILIATION`
3. `ORDER_PAYMENT_PROJECTION_RECONCILIATION`

Each needs durable ownership, retry/lease/backoff, source readback, operator visibility and terminal escalation.

---

### DSH-RC-09 — Order Truth governance audit is deliberately best-effort

Status: `PROVEN`
Priority: `P0 audit/governance`

Evidence:

- Order Truth HTTP paths ignore `RecordOrderTruthAudit` errors on success/replay/conflict paths.
- `order_truth_audit.go` explicitly says audit is deliberately best-effort at HTTP boundaries.

Root:

Governance evidence is not part of the mutation commitment.

Required remediation:

Classify audit:

- `MANDATORY_GOVERNANCE`: transaction/outbox-coupled; failure blocks or durably defers the governed transition.
- `DIAGNOSTIC_ONLY`: may be best-effort.

Order creation/state/idempotency/security provenance belongs to `MANDATORY_GOVERNANCE`.

---

### DSH-RC-10 — Order Rescue/Support can record false completion

Status: `PROVEN`
Priority: `P0 operational truth`

Evidence:

Order rescue can persist actions/cases as completed/resolved while recording `execution_result.mode = dsh_operational_reference_only` for actions whose real downstream effect is not performed by that path, including change/remove/replace/reassign-style operations.

Required remediation:

- No `completed/resolved` before canonical downstream effect + readback.
- Multi-domain rescue is a durable saga with per-step state, idempotency, failure/retry/compensation and final readback.
- Reference-only operations must be represented as `requested/queued/manual_action_required`, never `completed`.

---

### DSH-RC-11 — Coupon/promotion funding inverts financial authority

Status: `PROVEN`
Priority: `P0 financial authority`

Evidence:

- DSH coupon funding computes platform-funded and partner-funded minor-unit amounts.
- WLT promotion funding accepts caller-provided split amounts and validates their arithmetic before ledgering.
- Field Commission already demonstrates the desired model: DSH sends operational evidence, WLT selects versioned financial policy and derives the monetary amount.

Required remediation:

- DSH sends coupon/promotion identity + operational evidence + reservation lifecycle intent.
- WLT owns funding policy version, split derivation, reservation and ledger effects.
- Remove DSH numeric funding split authority and parallel persisted monetary derivation after cutover.

---

### DSH-RC-12 — Central Catalog transitions contain required best-effort side effects

Status: `PROVEN`
Priority: `P1 data consistency`

Evidence:

Catalog approval transitions contain ignored `tx.Exec` errors for relationship/media/assortment side effects while canonical state advances.

Required remediation:

Any side effect required for the new state to be true must either:

- succeed inside the same transaction; or
- be represented as an explicit saga state that prevents false readiness/publication until completed.

No ignored-error required side effect in semantic transitions.

---

### DSH-RC-13 — Storefront readiness and client catalog use different commercial truth

Status: `PROVEN`
Priority: `P1 client truth`

Evidence:

- `ClientStorefrontPredicate` uses legacy assortment `available=true` plus publication metadata.
- actual client catalog filtering uses normalized effective price + normalized inventory availability.

Possible result:

A store can satisfy Home/Discovery publication gating while its actual purchasable client catalog is empty.

Required remediation:

- derive Store readiness/publication from the same `purchasable assortment` truth or a materialized readiness projection generated from it;
- compatibility `available/stock_status/unit_price` fields cannot authorize storefront visibility.

---

### DSH-RC-14 — Home Discovery contains authority, cache and false-interaction gaps

Status: `PROVEN`
Priority: `P1 client behavior`

Evidence:

1. backend accepts `audienceSegment=guest|authenticated` from request query rather than deriving audience from authenticated session truth;
2. full discovery response is cached for 30 seconds and a cache hit does not re-run canonical store publication checks;
3. backend exposes filter capabilities (`favorites`, `nearest`, `new`, `offers`) without applying those filter semantics in the discovery query;
4. frontend `activeFilter` changes local state only and is not part of query key/fetch parameters nor a local filtering transform.

Required remediation:

- audience is server-derived;
- deny/suspend/unpublish invalidates or bypasses stale cache immediately;
- filters are implemented end-to-end with explicit semantics or removed until real;
- UI cannot signal state change without corresponding data behavior.

---

### DSH-RC-15 — Central transitions use inconsistent durability standards

Status: `PROVEN_SYSTEMIC_PATTERN`
Priority: `P0/P1 depending domain`

Observed contrast:

- Pickup and Partner Delivery correctly demonstrate `lock -> mutate -> authoritative order transition -> audit -> outbox -> commit` patterns.
- Order Truth audit, Home cache, Rescue completion, Catalog ignored side effects and payment projection use weaker semantics.

Root:

There is no enforced shared mutation protocol classifying which effects must share commitment, which may be eventual, and what evidence is required before a state is terminal.

Required platform pattern:

`CommandEnvelope -> Idempotency -> Lock/OCC -> Validate canonical dependencies -> Apply authoritative state -> Required Audit -> Required Outbox/Saga intents -> Commit -> Canonical readback`

For external dependencies:

`Intent persisted -> external idempotent call -> durable outcome/readback -> explicit UNKNOWN/RETRY -> terminal only after source proof`

## 3. Positive patterns to preserve and standardize

Do not rewrite sound patterns merely for uniformity.

### Partner Delivery / Pickup transactional transition

Preserve the pattern where task transition, sovereign order transition, audit and outbox are committed together.

### WLT terminal event outbox

Preserve WLT’s pattern where financial state transition and DSH notification outbox enqueue share one transaction.

### Checkout financial-closure outbox

Preserve the cancellation/closure outbox pattern with leasing, retry/backoff and surfaced failure state. Extend it with explicit operator recovery/DLQ policy where required.

### Field Commission financial boundary

Use Field Commission as the reference for `DSH operational evidence -> WLT versioned monetary policy/ledger`.

## 4. Required restructuring waves — no patch wave

### Wave 0 — Freeze semantic authority

- authority registry for every DSH-adjacent mutable fact;
- canonical ID registry;
- journey/state registry;
- classify every duplicate as `AUTHORITY | PROJECTION | LEGACY_REACHABLE | DELETE_AFTER_CUTOVER`.

### Wave 1 — Canonical identity/domain foundations

- StoreBranch;
- Captain primary affiliation vs partner membership vs store/branch scopes;
- typed Actor/Membership/Partner/Store/Branch IDs;
- eliminate semantic ID substitution.

### Wave 2 — Shared mutation/saga protocol

- mandatory governance audit;
- idempotency envelope;
- outbox/saga rules;
- false-completion prohibition;
- readback requirement;
- explicit unknown/retry/dead-letter states.

### Wave 3 — Inventory and Checkout rebuild

- InventoryReservation aggregate;
- checkout canonical state machine;
- `READY_WITH_VALID_RESERVATIONS` gate;
- session/outcome/order-projection reconciliation as real workers/sagas;
- remove post-commit best-effort required projection.

### Wave 4 — Financial authority cutover

- coupon funding policy/split to WLT;
- review all commission/fee/refund/COD/settlement paths using the same authority test;
- delete DSH-derived monetary policy fields/writers after migration.

### Wave 5 — Platform/Providers cutover

- core/providers;
- core/platform-control;
- BFF and Control Panel bindings;
- delete DSH duplicate authorities.

### Wave 6 — Storefront/Catalog/Discovery truth

- one purchasable-commercial truth;
- store readiness derived from it;
- atomic catalog publication;
- authoritative audience;
- cache invalidation/revocation;
- real filter semantics.

### Wave 7 — Rescue/Support/Incident/Operations

- replace reference-only completion with executable saga or explicit manual-required states;
- unify operational audit, correlation and owner/readback.

### Wave 8 — Contract/surface/runtime convergence

For every active capability prove:

- OpenAPI/event contract;
- generated/shared client;
- app-client/app-partner/app-captain/app-field/control-panel consumer;
- error/loading/empty/offline/conflict/retry states;
- BFF/service auth;
- runtime config;
- no raw/direct bypass.

### Wave 9 — Migration/cutover/delete

- backfill canonical IDs/states;
- dual-read only when explicitly bounded;
- no indefinite dual-write;
- switch all consumers;
- assert parity;
- delete duplicate tables/columns/routes/modules/config/docs;
- fresh-install and upgrade proof.

### Wave 10 — Same-candidate closure

- unit/domain/contract tests;
- DB invariant/migration tests;
- concurrency/idempotency/failure tests;
- cross-service integration;
- all five surfaces;
- runtime smoke/E2E;
- security boundary tests;
- observability/DLQ/recovery tests;
- generated-client/contract/binding guards;
- zero-residue scan;
- re-pin HEAD;
- adversarial re-diagnosis.

## 5. Coverage ledger — current state

`PROVEN` below means a material root has evidence; it does not mean the domain is closed.

| Domain | Diagnosis state | Closure state |
|---|---|---|
| Provider configuration/health | PROVEN authority duplication | OPEN |
| Platform change governance | PROVEN authority duplication | OPEN |
| Store/Branch identity | PROVEN semantic collapse | OPEN |
| Captain affiliation/membership/scopes | PROVEN conflation | OPEN |
| Partner Delivery | PROVEN ID/branch gaps; positive transaction pattern | OPEN |
| Inventory | PROVEN missing reservation lifecycle | OPEN |
| Checkout | PROVEN state-gate/reconciliation gaps | OPEN |
| WLT callback bridge | PROVEN durable WLT outbox + broken DSH order projection path | OPEN |
| Order Truth | PROVEN best-effort governance audit | OPEN |
| Order Rescue/Support | PROVEN false completion | OPEN |
| Coupon/promotion funding | PROVEN wrong monetary owner | OPEN |
| Field Commission | positive reference pattern | OPEN full coverage |
| Catalog | PROVEN ignored required side effects | OPEN |
| Storefront publication | PROVEN legacy-vs-normalized truth mismatch | OPEN |
| Home Discovery | PROVEN audience/cache/filter/UI gaps | OPEN |
| Pickup | positive transactional reference pattern | OPEN full coverage |
| Dispatch | HOLD — deep concurrency/eligibility/reassignment scan pending | OPEN |
| Serviceability/maps | HOLD — provider/cache/degraded policy deep scan pending | OPEN |
| Addresses/profile/auth | HOLD — end-to-end authority/privacy/IDOR scan pending | OPEN |
| Notifications/outboxes | PARTIAL — several workers proven; complete queue/DLQ inventory pending | OPEN |
| Returns/refunds | HOLD — WLT/DSH saga and amount-authority scan pending | OPEN |
| COD custody | HOLD — status/event/projection mapping and custody reconciliation pending | OPEN |
| Partner onboarding/team | PARTIAL — membership legacy proven; full workflow pending | OPEN |
| Field assignment/onboarding | HOLD — full Identity/Workforce/DSH scope scan pending | OPEN |
| Contracts/generated clients | HOLD — full drift/bypass inventory pending | OPEN |
| Control Panel | HOLD — all sections/actions/bindings pending | OPEN |
| app-client | HOLD — all journeys/states pending | OPEN |
| app-partner | HOLD — all journeys/states pending | OPEN |
| app-captain | HOLD — all journeys/states pending | OPEN |
| app-field | HOLD — all journeys/states pending | OPEN |
| runtime/config/deploy | PARTIAL — worker wiring examined; complete topology pending | OPEN |
| security | HOLD — deep trust-boundary scan pending | OPEN |
| observability | PARTIAL — diagnostics exist; recovery-action coverage pending | OPEN |
| cleanup/dead code | HOLD — destructive classification only after cutover map | OPEN |

## 6. Execution prohibition until root order is respected

Do not start with leaf UI fixes, SQL compatibility columns, one-off fallback code, duplicate provider schemas, or extra retries around a broken authority.

The first execution frontier is:

1. canonical IDs/Branch/membership boundaries;
2. common mutation/saga/audit protocol;
3. inventory reservation + checkout state machine;
4. WLT->DSH payment projection durability;
5. financial-authority cutover;
6. provider/platform authority cutover.

Only then descend into dependent surface cleanup and cosmetic consistency.

## 7. Current verdict

DSH is **not eligible for CLOSED/DONE**. The currently proven findings are systemic and cross-service; fixing them one file at a time without authority/state/cutover design would create more compatibility residue.

This file is an active root-cause register. Every later diagnosis must either:

- add a new proven root;
- attach a finding to an existing higher root;
- prove a finding false and record the counter-evidence;
- or close a root with same-candidate evidence.

No finding may disappear merely because a later local test passes.

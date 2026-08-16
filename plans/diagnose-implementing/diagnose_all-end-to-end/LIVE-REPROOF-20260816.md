# LIVE REPROOF — 2026-08-16 — branch `b`

Status: `LIVE_EVIDENCE / PREPARE / NOT_RUNTIME_CLOSED`

Pinned implementation evidence commit before these package writes:

`b@1c31adb1e8d1443e59ca49e4b75051c2f897a334`

This document is a re-proof ledger against the current branch, not a copy of prior plans and not a claim that the system is closed. Prior attachment findings are carried only when the current code still proves them. If the current implementation contradicts an older diagnosis, the current implementation wins as implementation evidence and the older claim is downgraded or rewritten.

## Classification law

Each item uses exactly one of these states:

- `PROVEN_CURRENT` — directly re-proven from the pinned `b` implementation.
- `PARTIALLY_IMPLEMENTED` — the old root has meaningful cutover progress, but a material semantic gap remains.
- `DISPROVEN_OLD_FORM` — the older wording no longer describes the current code and must not be executed as written.
- `HOLD_REQUIRES_E2E` — code evidence is incomplete; do not convert it into a defect claim without the missing writer/reader/runtime proof.
- `POSITIVE_CONTROL` — current implementation demonstrates a pattern that should be preserved while adjacent gaps are fixed.

---

## R-001 — DSH -> Identity session verification protocol is incompatible, and Push delivery fails open on verification error

**State:** `PROVEN_CURRENT`

**Priority:** `P0 SECURITY / TRUST BOUNDARY`

**Root:** `RC-AUTHORIZATION-TRUTH-DUPLICATION + RC-DISTRIBUTED-DEPENDENCY-FAIL-OPEN`

### Current evidence

`services/dsh/backend/internal/auth/client.go`

`IsSessionValid(...)` calls:

`GET /internal/actors/{actorId}/sessions`

but sets the internal token into `X-Service-Caller` and does not send the bearer credential expected by the Identity route.

The same DSH client uses a different, coherent DSH protocol for other Identity internal endpoints: `Authorization: Bearer <token>` plus `X-Service-Caller: dsh`.

`core/identity/backend/internal/http/server.go`

The `/internal/actors/{actorId}/sessions` route is guarded by `serviceOnly`, which requires:

- `X-Service-Caller == workforce`;
- bearer token matching `IDENTITY_WORKFORCE_SERVICE_TOKEN`.

Therefore the DSH caller and the Identity guard do not implement one trust contract.

`services/dsh/backend/internal/operationaloutbox/push_worker.go`

Push endpoint validation contains an additional fail-open rule. When `IsSessionValid` returns an error, the endpoint token is still appended. The token is deactivated only when verification returns **no error** and explicitly says invalid.

### Consequence

Revoked/compromised session state cannot reliably gate push delivery. An Identity outage or protocol mismatch becomes permission to continue rather than `UNKNOWN/DENY`.

### Required closure

1. Define one internal Identity session-verification endpoint for DSH with the correct DSH service identity, or route the operation through the correct owning service.
2. Use one standardized bearer + service-caller protocol.
3. Critical session-bound delivery must fail closed or enter an explicit retry/unknown state when Identity verification is unavailable.
4. Add contract tests across both services using the exact headers used in production wiring.
5. Prove compromised/revoked session -> endpoint deactivated/not delivered, and Identity unavailable -> no silent send.

---

## R-002 — Platform ChangeSet can report `APPLIED` without applying the payload

**State:** `PROVEN_CURRENT`

**Priority:** `P0/P1 FALSE COMPLETION`

**Root:** `RC-WORKFLOW-STATE-BUSINESS-EFFECT-CONFLATION`

### Current evidence

`services/dsh/backend/internal/http/platform_changesets_routes.go`

`handleApplyChangeSet` calls the ChangeSet repository/service `Apply(...)`, then contains an explicit TODO to actually emit/apply the payload, and nevertheless returns:

`{"status":"APPLIED"}`.

### Consequence

Control Panel can show an authoritative-looking applied configuration state while no target capability has changed. Audit/workflow state and business effect are not the same truth.

### Required closure

`APPLIED` is forbidden until target mutation succeeds and authoritative readback proves it. Required states must distinguish at least approved, apply-pending, applied, failed/unknown, and reconciled/observed where the target is distributed.

---

## R-003 — Return action can be marked `executed` without executing the return state transition

**State:** `PROVEN_CURRENT`

**Priority:** `P0/P1 FALSE COMPLETION`

**Root:** `RC-WORKFLOW-STATE-BUSINESS-EFFECT-CONFLATION`

### Current evidence

`services/dsh/backend/internal/orders/return_saga.go`

`ExecuteReturnActionTx(...)` explicitly states that the real state transitions would be applied in a real implementation, then updates the action to `status='executed'` and commits.

The same implementation also treats an existing return for an order as a conflict keyed by the order-level unique path, so the current model does not prove multiple independent partial-return episodes.

### Consequence

Action status can lie about physical/logistical/financial effect. Refund/restock/custody can drift from Return workflow state.

### Required closure

- action execution and business transition must be atomic/durably coordinated;
- item quantities must be validated against immutable delivered quantities and cumulative prior returns;
- physical return, received/damaged/restock disposition, WLT refund lineage, promotion and settlement reversal must be explicit;
- partial/repeated return policy must be represented intentionally rather than emerging from a unique index.

---

## R-004 — Workforce availability is an overlay, not a fail-closed Captain Eligibility authority

**State:** `PROVEN_CURRENT`

**Priority:** `P0 DISPATCH SAFETY`

**Root:** `RC-CAPTAIN-ELIGIBILITY-AUTHORITY-SPLIT`

### Current evidence

`services/dsh/backend/internal/http/operations_intelligence.go`

For candidate lists, Workforce availability is applied only if the projection operation succeeds. If parsing/context/projection application fails, the middleware falls through to the original successful candidate response.

For assignment/reassignment/acceptance, the Workforce unavailability conflict replaces the handler response only when the original handler already returned a `5xx`. If the governed dispatch handler succeeds, `unavailable == true` does not independently deny that successful mutation.

Several precheck errors also return `(false, "", nil)` or otherwise collapse into non-denial.

### Consequence

A captain known unavailable by Workforce can still be presented or accepted/assigned depending on which lower path succeeds. This violates D29/D30.

### Required closure

One semantic eligibility primitive must be authoritative for candidate/capacity/assign/reassign/accept. Critical writes require a fresh current decision and fail closed when a required authority is unavailable. Preview projections may exist only as explicitly non-authorizing data.

---

## R-005 — Special Requests retain a live development OperatorContext fallback

**State:** `PROVEN_CURRENT`

**Priority:** `P0/P1 TENANT / CONTEXT ISOLATION`

**Root:** `RC-RUNTIME-CONFIG-AND-FALLBACK-DRIFT`

### Current evidence

`services/dsh/backend/internal/specialrequests/service.go`

Defines:

`DefaultOperatorContextID = "OperatorContext-dev-001"`

and public service methods such as Create/Get/List operator/client variants call `OperatorContextOrDefault(...)` or the default directly when explicit context is absent.

### Consequence

A missing trusted context can become a real tenant/context selection instead of an error. Production reachability must not be inferred away simply because newer HTTP handlers may pass context correctly; these service APIs remain live code and require caller inventory.

### Required closure

No production-capable business method may manufacture OperatorContext. Trusted context must be required at the boundary and propagated explicitly. Test/dev fixtures must be outside production authority paths.

---

## R-006 — Special Requests still allow DSH-authored monetary amount/currency

**State:** `PROVEN_CURRENT`

**Priority:** `P0 FINANCIAL AUTHORITY`

**Root:** `RC-MONETARY-FACT-OWNERSHIP-SPLIT`

### Current evidence

`services/dsh/backend/internal/specialrequests/service.go`

The workflow explicitly permits `EstimatedAmountMinorUnits` and `Currency` edits while a request is under review / needs customer input, and forwards those fields into the update model.

### Consequence

The operational domain can author a monetary outcome that later becomes input to the WLT payment/session flow. This conflicts with D01 and the WLT monetary authority boundary unless this value is explicitly classified as non-authoritative evidence and WLT independently derives/approves the binding quote.

### Required closure

Special Request pricing must become a governed WLT-owned quote/financial decision. DSH supplies operational evidence and proposal context only. If an operator adjustment is allowed, it must occur through the governed WLT policy/quote boundary with reason, bounds, version and customer acceptance.

---

## R-007 — Cart converts financial dependency failures into `0`/`nil`

**State:** `PROVEN_CURRENT`

**Priority:** `P0/P1 FINANCIAL FAIL-OPEN`

**Root:** `RC-DEPENDENCY-FAILURE-AS-EMPTY-OR-ZERO`

### Current evidence

`services/dsh/backend/internal/cart/cart.go`

- `FetchDeliveryFeeMinorUnits(...)` ignores the database query/scan error and returns the zero-value fee.
- `FetchWltQuote(...)` returns `(nil, nil)` when the WLT client is not configured.
- `GetOrCreateActiveCart`, `GetCart`, and `GetActiveCartForClient` deliberately ignore WLT quote errors via assignment of the quote while discarding the error.

### Consequence

Database/WLT unavailability can be represented as `delivery fee = 0` or `quote = nil`, indistinguishable from a legitimate free/no-quote state. Downstream UI can display apparently valid commerce state while the financial authority failed.

### Required closure

- configuration failure and provider/authority unavailability are typed errors;
- fee lookup error never becomes zero;
- WLT unavailable never becomes an ordinary nil quote for a non-empty cart;
- surface gets explicit `financial/pricing unavailable` state;
- checkout readiness cannot pass without the canonical quote required by the selected journey.

---

## R-008 — Checkout silently chooses user/product decisions

**State:** `PROVEN_CURRENT`

**Priority:** `P1 PRODUCT SEMANTICS`

**Root:** `RC-SURFACE/BACKEND-DEFAULT-AS-BUSINESS-DECISION`

### Current evidence

`services/dsh/backend/internal/checkout/checkout.go`

`CreateIntent(...)` silently sets:

- missing fulfillment mode -> `bthwani_delivery`;
- missing payment method -> `cod`.

### Consequence

Absence of a client decision is converted into a business decision even when multiple valid choices may exist.

### Required closure

Server may auto-resolve only when canonical eligibility proves exactly one allowed option. Otherwise the request must carry an explicit choice and invalid/missing choice must fail validation.

---

## R-009 — Operator Checkout read/reconcile primitives are not scoped by OperatorContext at the data primitive

**State:** `PROVEN_CURRENT`

**Priority:** `P0 AUTHORIZATION / DATA ISOLATION`

**Root:** `RC-PERMISSION-WITHOUT-OBJECT-CONTEXT-SCOPE`

### Current evidence

`services/dsh/backend/internal/checkout/checkout.go`

`ListOperatorIntents(...)` filters by state/limit but not by `operator_context_id`.

`GetIntentForOperator(...)` fetches by `id` only.

The HTTP routes are permission-protected, but permission alone is not object/tenant scope.

### Consequence

If more than one OperatorContext exists, generic Operations permission can become cross-context visibility or mutation authority unless every caller adds an external scope check. The primitive itself does not enforce it.

### Required closure

Every operator/admin read or mutation uses trusted OperatorContext/object scope in the repository query or a single mandatory authorization primitive. Add negative IDOR/cross-context tests.

---

## R-010 — Stale public/live routes coexist with newer capability implementations

**State:** `PROVEN_CURRENT`

**Priority:** `P1 CONTRACT / LEGACY RESIDUE`

**Root:** `RC-LIVE-LEGACY-AND-UNIFIED-PATH-COEXISTENCE`

### Current evidence

`services/dsh/backend/internal/http/server.go`

Still registers explicit routes that always return `NOT_IMPLEMENTED`, including old SLA/capacity and Partner invite endpoints, while the same server also registers newer governed service-area/capacity/fleet/team capabilities.

### Consequence

The API surface advertises overlapping meanings with different behavior. Clients/contracts can bind to a dead capability while another implementation exists.

### Required closure

For every duplicate capability: choose canonical route/contract, migrate all generated/front-end consumers, prove zero references, then remove the stale route/OpenAPI/types/tests. Do not leave permanent `NOT_IMPLEMENTED` compatibility authorities.

---

## R-011 — Workforce still owns and writes captain financial guarantee fields

**State:** `PROVEN_CURRENT`

**Priority:** `P0 FINANCIAL AUTHORITY`

**Root:** `RC-MONETARY-FACT-OWNERSHIP-SPLIT`

### Current evidence

`core/workforce/backend/internal/workforce/operational_core.go`

`CaptainActivationCore` still contains and returns:

- `FinancialGuaranteeMinorUnits`
- `FinancialGuaranteeCurrency`
- `FinancialGuaranteeStatus`
- `FinancialGuaranteeReference`

The patch model exposes those fields, and the repository executes `UPDATE workforce_captain_activation_core` writing the financial guarantee amount/currency/status/reference.

The same Workforce domain also exposes `ProposedPenaltyMinorUnits` and `Currency` in provider incidents.

### Consequence

D02/D03/D19 are not implemented. Workforce remains a live monetary writer/source, not merely stale DTO residue.

### Required closure

Migrate guarantee/collateral truth to WLT restricted financial position/policy and penalty monetary derivation to WLT. Workforce may retain non-financial evidence/reference only if semantically necessary and clearly non-authoritative. Remove DB columns, writers, OpenAPI, generated/shared TS/UI and tests after cutover.

---

## R-012 — Workforce geographic scope vocabulary remains independent (`ServiceZoneID`)

**State:** `PROVEN_CURRENT / REQUIRES AUTHORITY CUTOVER`

**Priority:** `P1 GEOGRAPHY / SCOPE`

**Root:** `RC-GEOGRAPHIC-SCOPE-IDENTITY-COLLAPSE + RC-WORKFORCE-DSH-OPERATIONAL-SCOPE-OVERLAP`

### Current evidence

`core/workforce/backend/internal/workforce/operational_core.go`

Availability notices include mutable `ServiceZoneID` / `serviceZoneId` in Workforce.

This does not by itself prove whether the ID is a canonical DSH ServiceArea reference or a separate Workforce zone authority. The current naming/API makes the distinction ambiguous and therefore the final owner/reference mapping remains open.

### Required closure

Prove every writer/reader and DB relation. Workforce may reference canonical DSH geographic IDs for human availability scope, but must not create a parallel geography. Rename/foreign-key/contract-map accordingly.

---

## R-013 — Rating moderation does not gate public/general aggregation

**State:** `PROVEN_CURRENT`

**Priority:** `P1 CONTENT TRUST`

**Root:** `RC-RATING-MODERATION-VS-PUBLIC-AGGREGATION`

### Current evidence

`services/dsh/backend/internal/ratings/ratings.go`

New/edited ratings are persisted with `moderation_status='pending'` and `status='active'`.

`RatingSummary` aggregation computes average/count/distribution from rows filtered by `status='active'` only; it does not require an approved moderation state.

### Consequence

Pending/rejected/disputed content can affect aggregate rating truth while moderation claims otherwise.

### Required closure

Define explicit publication eligibility. Public aggregate must consume only publishable/approved ratings. Operational/admin views may include the full moderation history separately.

---

## R-014 — Marketing consent is stored as mutable booleans without durable consent provenance; audit write is best-effort

**State:** `PROVEN_CURRENT`

**Priority:** `P1 PRIVACY / CONSENT`

**Root:** `RC-CONSENT-AS-PREFERENCE`

### Current evidence

`services/dsh/backend/internal/clientprofile/clientprofile.go`

Consent truth is three booleans on the profile:

- email;
- SMS;
- push.

The mutation does not carry policy version, decision timestamp distinct from generic update, source/surface, revocation record or legal/jurisdiction provenance.

`logEvent(...)` calls `tx.Exec(...)` and discards the error.

### Consequence

A legally/materially significant consent change can commit even when the audit event failed, and current state cannot prove which policy/version the client accepted or revoked.

### Required closure

Consent decisions need an append-only/versioned provenance model. Notification preferences are a separate downstream concern. Consent mutation and its required audit evidence must share a fail-closed transaction/durable event boundary.

---

## R-015 — Operator can directly write observed-looking Provider health status

**State:** `PROVEN_CURRENT`

**Priority:** `P1 PLATFORM CONTROL / OBSERVABILITY`

**Root:** `RC-PROVIDER-DESIRED-CONFIG-VS-OBSERVED-HEALTH`

### Current evidence

`services/dsh/backend/internal/platform/provider/provider.go`

One persisted `status` enum contains `ACTIVE`, `DEGRADED`, `MAINTENANCE`, `UNKNOWN` together with `last_health_check`.

`services/dsh/backend/internal/http/platform_providers_routes.go`

A `platform.manage` operator can call `UpdateStatus(...)` and directly set the same `status` field.

### Consequence

Desired administration state and observed runtime health share one writable truth. An operator can make a provider appear `ACTIVE`/`DEGRADED` without a health observation.

### Required closure

Separate desired enablement/maintenance/config from observed health and health evidence. Control Panel writes desired state only; probes/workers own observed health.

---

## R-016 — Media readiness mutates infrastructure and treats unconfigured provider as ready

**State:** `PROVEN_CURRENT`

**Priority:** `P1 RUNTIME / READINESS`

**Root:** `RC-MEDIA-BOOTSTRAP-VS-READINESS`

### Current evidence

`services/dsh/backend/internal/media/provider.go`

`Ready(...)` returns `true` when provider is nil/unconfigured. When configured but disconnected, it calls `connect(...)`; readiness ultimately invokes `EnsureBucket(...)`.

`connect(...)` also calls `EnsureBucket(...)`.

### Consequence

Readiness is not read-only and can provision/mutate a dependency. Required-but-unconfigured media can be represented as ready depending on caller configuration semantics.

### Required closure

Separate bootstrap/provisioning from readiness. Readiness observes only. Required/optional capability policy must explicitly determine `N/A` vs `NOT_READY`.

---

## R-017 — Subscription purchase has an unresolved parallel payment semantic and a silent `official_wallet` default

**State:** `PROVEN_CURRENT / PRODUCT-DECISION RECONCILIATION REQUIRED`

**Priority:** `P1 FINANCIAL PRODUCT`

**Root:** `RC-PAYMENT/TENDER-SEMANTIC-DRIFT`

### Current evidence

`services/dsh/backend/internal/http/subscription_purchases.go`

`normalizeSubscriptionPaymentMethod(...)` converts missing payment method to `official_wallet` and accepts `wallet`, `mixed`, and `official_wallet`.

The implementation then creates a WLT-bound subscription payment session using the selected value.

### Consequence

Order checkout has moved to `cod | wallet | mixed`, while subscription purchase implements a separate tender vocabulary and silently selects an external-looking method when omitted. Whether direct external-rail subscription charging is product-correct is not established by order-checkout D10 alone.

### Required closure

Apply the reconciled subscription product decision recorded in `DECISION-RECONCILIATION-20260816.md`; no missing payment method may choose a tender silently.

---

## R-018 — Shared payment presentation has the correct three method names but does not enforce numeric eligibility

**State:** `PARTIALLY_IMPLEMENTED`

**Priority:** `P1 CROSS-SURFACE PAYMENT UX`

**Root:** `RC-SURFACE-LOCAL-BUSINESS-LOGIC`

### Current evidence

`services/wlt/frontend/shared/dsh/payment/use-wlt-payment-controller.tsx`

Positive cutover: `PaymentMethodKey` is now exactly `cod | wallet | mixed`; `official_wallet` is no longer a checkout option in this controller.

Remaining gaps:

- wallet option is not disabled when balance is insufficient;
- mixed option is not disabled when wallet leg is zero or when wallet balance fully covers the total;
- controller starts with `cod` selected before canonical availability/choice resolution;
- provider-payments feature flag is locally derived from frontend env and is always considered enabled in development.

### Consequence

D10/D12 naming cutover is partly done, but UI eligibility still does not represent the canonical numeric allocation invariant.

### Required closure

Payment option availability must come from server/WLT canonical eligibility/allocation. Mixed only exists when both legs are strictly positive. Frontend flags may hide/show a capability but may not authorize it.

---

## R-019 — Cart/catalog normalization has real positive progress and must not be overwritten by an obsolete diagnosis

**State:** `POSITIVE_CONTROL / HOLD ON RESERVATION LIFECYCLE`

### Current evidence

`services/dsh/backend/internal/cart/serviceability.go` and `services/dsh/backend/internal/cart/cart.go`

Current cart validation checks:

- MasterProduct approval/active;
- StoreAssortment publication/available;
- current effective normalized price/currency;
- normalized inventory policy and `quantity - reserved_quantity` for quantity policy;
- persisted snapshot drift before readiness.

`UpsertItem` locks the cart row and obtains price/name/currency from server-side assortment rather than trusting the client.

### Consequence

The old blanket statement "cart/catalog is local/unnormalized" is no longer valid. The remaining high-risk cone is specifically the full reservation lifecycle and dependency/error semantics, not basic price authority in this path.

### Required closure still open

Inventory reservation writers must still be proven end-to-end: reserve, TTL, commit, release on payment/order failure, cancellation, return/restock, duplicate/restart/concurrency and reconciliation.

---

## R-020 — Checkout cancellation demonstrates a positive durable-finance pattern

**State:** `POSITIVE_CONTROL`

### Current evidence

`services/dsh/backend/internal/checkout/checkout.go`

When a cancelled checkout has a WLT payment session, DSH enqueues an `expire-session` event within the same local transaction rather than performing a best-effort external call after commit.

### Why retain this

This is the correct direction for D33: an operational transition and its distributed financial obligation are durably coupled locally and reconciled asynchronously. The same pattern should govern every required cross-service financial mutation.

---

# Immediate root hierarchy after live re-proof

## P0 roots proven current

1. `RC-AUTHORIZATION/TRUST-BOUNDARY-FAIL-OPEN` — R-001, R-009.
2. `RC-CAPTAIN-ELIGIBILITY-AUTHORITY-SPLIT` — R-004.
3. `RC-MONETARY-FACT-OWNERSHIP-SPLIT` — R-006, R-011.
4. `RC-DEPENDENCY-FAILURE-AS-EMPTY-OR-ZERO` — R-007.
5. `RC-WORKFLOW-STATE-BUSINESS-EFFECT-CONFLATION` — R-002, R-003.

## P1 roots proven current

6. `RC-RUNTIME-CONTEXT-FALLBACK` — R-005.
7. `RC-LIVE-LEGACY-AND-CANONICAL-PATH-COEXISTENCE` — R-010.
8. `RC-RATING-MODERATION-VS-PUBLICATION` — R-013.
9. `RC-CONSENT-AS-PREFERENCE` — R-014.
10. `RC-PROVIDER-CONFIG-VS-HEALTH` — R-015.
11. `RC-MEDIA-BOOTSTRAP-VS-READINESS` — R-016.
12. `RC-PAYMENT/TENDER-SEMANTIC-DRIFT` — R-017/R-018.
13. `RC-GEOGRAPHIC/WORKFORCE-SCOPE-OVERLAP` — R-012, full geography inventory still HOLD.

# Execution consequence

Do **not** start by repairing leaves independently. The first execution frontier must close the highest shared roots and their consumers:

1. trust/context/authorization primitives;
2. false-completion state machines;
3. Captain Eligibility authority;
4. financial authority cutover outside WLT;
5. fail-closed financial dependency semantics;
6. then geography/identifier/catalog-inventory state and cross-surface cutover;
7. then physical removal of stale contracts/routes/fields.

# What this file does not claim

This re-proof is intentionally stricter than prior diagnosis. It does **not** claim the following cones are closed merely because representative files were inspected:

- full WLT writer/ledger/COD/payout/penalty/commercial/reconciliation graph;
- full Identity RBAC/session writer graph;
- full Workforce scope/proxy graph;
- complete geography/serviceability/capacity graph;
- inventory reservation lifecycle;
- all Return logistics/refund/restock paths;
- all Support/Rescue actions;
- all notification producers and consent gates;
- all Media ACL/retention/redaction paths;
- all five frontend surfaces;
- OpenAPI/generated-client parity;
- every DB table/column/migration;
- jobs/outbox restart/DLQ/reconciliation inventory;
- runtime/prod reachability of every fallback;
- observability/PII/alerts;
- CI architecture guards;
- actor-provenance failed-verification closure.

Those remain explicitly accounted in `HOLD-REPROOF-MATRIX-20260816.md`; none may disappear from the package by omission.

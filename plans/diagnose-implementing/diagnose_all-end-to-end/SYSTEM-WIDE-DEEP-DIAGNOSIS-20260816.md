# SYSTEM-WIDE DEEP DIAGNOSIS — DSH AND EVERY CONNECTED SURFACE/SERVICE

Status: `PREPARE / FAIL-CLOSED / ROOT-CAUSE LANDSCAPE / NOT CLOSED`

Implementation evidence baseline before diagnosis-only writes:

`b@1c31adb1e8d1443e59ca49e4b75051c2f897a334`

Diagnosis working HEAD after initial re-proof documents:

`b@df52396ca769c024303968a8a072a1f4bfa7e772`

Scope: **DSH plus every service, database, contract, runtime, job and user/operator surface that can create, mutate, interpret, authorize, display, cache, reconcile or depend on DSH truth.**

This file is deliberately not a leaf-bug list. It identifies the architectural roots that must be removed before the repository can truthfully be restructured and closed without patches.

---

# 0. Diagnostic law

No domain is considered diagnosed merely because one representative file was inspected. Every closure candidate must trace:

`Product decision -> canonical owner -> identifiers -> state/invariants -> writer(s) -> DB -> API/event -> generated/shared binding -> every consuming surface -> runtime wiring -> failure/recovery -> audit/observability -> migration/cutover -> physical cleanup -> same-SHA evidence`.

Every discovered item is classified as one of:

- `PROVEN_CURRENT_DEFECT` — current branch directly proves the defect.
- `PARTIAL_CUTOVER` — canonical work exists but old/parallel semantics remain.
- `HOLD_EXHAUSTIVE_INVENTORY` — not enough evidence yet for a complete statement; cannot be silently dropped.
- `POSITIVE_CONTROL` — current code demonstrates the target pattern and must be preserved/generalized.
- `EXTERNAL_POLICY_REQUIRED` — mechanism can be implemented, but the concrete business/legal value must not be invented.

A `HOLD` is not permission to defer. It is a required inventory cone before closure.

---

# 1. Live topology that the execution package must cover

## Runtime applications

- `apps/app-client`
- `apps/app-partner`
- `apps/app-captain`
- `apps/app-field`
- `apps/control-panel`

## DSH sovereign frontend surfaces

- `services/dsh/frontend/app-client`
- `services/dsh/frontend/app-partner`
- `services/dsh/frontend/app-captain`
- `services/dsh/frontend/app-field`
- `services/dsh/frontend/control-panel`
- `services/dsh/frontend/shared/**`

## Core/services that directly participate in DSH journeys

- `services/dsh`
- `services/wlt`
- `core/identity`
- `core/workforce`
- `core/platform-control`
- `core/providers`

## DSH backend domain inventory

Current DSH backend contains independent areas including:

`administration, analytics, auth, cache, cart, catalogapproval, centralcatalog, checkout, checkoutfinanceoutbox, clientaddress, clientprofile, coupons, dispatch, fieldassignment, fieldcommissionoutbox, fieldreadiness, health, homediscovery, http, incident, mapproviders, marketing, media, notifications, operationaloutbox, orders, partner, partnerdelivery, partnerfleet, partnerteam, partnerwltoutbox, pickup, platform, platformclient, platformpolicies, promotionfundingoutbox, providers, ratings, servicearea, specialrequests, store, storepolicy, support, supportsession, wlt, wltoutbox, workforceclient`.

Therefore “DSH diagnosis” cannot mean only cart/order/payment. Every one of these cones is an execution/verification obligation.

---

# 2. Highest systemic root causes

## SYS-RC-A — Canonical authority is split between DSH and services that already own the domain

### Proven examples

1. DSH has its own Platform ChangeSet routes/service while `core/platform-control` already owns a complete governed ChangeSet system with serializable apply, target locking, validation snapshot/revision checks, audit, rollback and readback.
2. DSH has two incompatible provider registries over `dsh_platform_providers`, while `core/providers` already owns provider configuration, credentials/parameters, governed update/idempotency/audit and separate observed health.
3. DSH/Workforce author monetary values that WLT later records instead of WLT deriving financial truth from operational evidence.

### Target state

Canonical service boundaries are not optional architecture documentation. They are enforced physically:

- Identity owns actor/session/RBAC/auth context.
- Workforce owns person/provider lifecycle and durable non-financial readiness.
- DSH owns commerce/operational fulfillment state.
- WLT owns every monetary amount, allocation, financial policy decision and ledger effect.
- Platform Control owns governed platform variables/feature flags/change workflow.
- Providers owns external provider configuration/capability/credentials and observed provider health model.

DSH must call/consume these authorities. It must not maintain a second mutable copy because that is convenient for Control Panel.

---

## SYS-RC-B — Workflow state is repeatedly confused with actual business effect

### Proven examples

- DSH Platform ChangeSet returns `APPLIED` while target payload is not applied.
- Return action is marked `executed` while the return transition is intentionally not implemented in that transaction.
- Support Order Rescue writes action `completed`, `execution_result.mode = dsh_operational_reference_only` and resolves the case without executing actions such as replace/remove/change-delivery/reassign.

### Target state

Every command follows one of two permitted models:

**Atomic local command**

`lock -> validate -> mutate authoritative state -> required audit/outbox -> commit -> readback`

or

**Distributed saga**

`accepted -> pending external effect -> confirmed/reconciled | failed/compensating -> terminal`

A request/audit/reference record can never be named `applied`, `executed`, `completed` or `resolved` before the authoritative effect exists and is observable.

---

## SYS-RC-C — Trust/context/object-scope enforcement is not one primitive

### Proven examples

- DSH session verification uses an Identity internal endpoint with the wrong service-auth protocol.
- Push delivery continues when session verification errors.
- Special Requests can manufacture `OperatorContext-dev-001`.
- Checkout operator list/get primitives omit OperatorContext in SQL and therefore rely on outer permission rather than repository-level object scope.

### Target state

Every governed request has immutable trusted context:

`ActorID + OperatorContextID + Surface + Roles/Permissions + Object Scope + CorrelationID`

No service method manufactures tenant/operator context. No permission-only route may access an object outside trusted context. Required downstream identity/readiness checks fail closed when unavailable.

---

## SYS-RC-D — Semantic identifier overloading corrupts service boundaries

### Proven examples

- Partner Delivery stores `branch_id = store_id` because a real Branch is absent from the Order model.
- Partner Fleet has membership ID and `captain_actor_id`, yet Partner Delivery accepts a generic `storeCourierId` and passes it directly to Workforce readiness, where an actor ID is required.
- Partner Fleet API projection scans `captain_actor_id` into a field named `CourierName`.
- `branch_assignment` remains untyped text.

### Target state

Identifiers must be explicit in schema, Go, OpenAPI, TypeScript and UI binding:

- `captainActorId`
- `primaryFleetAffiliationId`
- `partnerCaptainMembershipId`
- `storeId`
- `branchId`
- `serviceAreaId/code`
- `workforcePersonId`

No generic `courierId`, `memberId`, raw string or display-name field may silently carry a different semantic ID across a service boundary.

---

## SYS-RC-E — Failure/unavailability is often converted into a valid-looking value

### Proven examples

- Cart delivery-fee query failure becomes `0`.
- WLT unavailable/unconfigured can become `quote=nil` without an error.
- Push session-verification error permits delivery.
- Workforce availability projection failure can leave candidate/assignment behavior authorized by the underlying DSH path.
- Media unconfigured is treated as ready and readiness can mutate infrastructure.

### Target state

Critical dependency results use explicit algebraic states:

`READY | DENIED | UNAVAILABLE | UNKNOWN | STALE`

`UNAVAILABLE/UNKNOWN` never become `0`, `false=no restriction`, empty list, nil quote or successful mutation when that authority is required.

---

## SYS-RC-F — Audit durability is inconsistent across domains

### Proven examples

- Order Truth audit is explicitly best-effort and caller ignores failure.
- Marketing audit is best-effort.
- Client consent audit uses ignored `tx.Exec` error.
- Pickup and several Special Request paths correctly put required audit + outbox inside the business transaction.

### Target state

Create one repository-wide audit classification:

1. `MANDATORY_GOVERNANCE` — authorization, finance, lifecycle, moderation, consent, provider/platform config, high-impact operator action. Failure aborts or becomes a durable saga failure.
2. `DIAGNOSTIC_ONLY` — optional telemetry/logging that may fail independently.

No domain chooses ad hoc whether an authoritative mutation can survive loss of mandatory audit provenance.

---

# 3. Identity / Auth / RBAC

## Proven defects

### ID-01 — DSH session validation protocol mismatch + Push fail-open

DSH calls Identity `/internal/actors/{actorId}/sessions` using headers that do not satisfy Identity's `serviceOnly` guard. Push worker then only suppresses a token when verification returns `nil error + invalid`; verification error still sends.

**Required restructure:** create one explicit DSH internal session-verification contract or use a canonical Identity introspection primitive. Standardize service authentication and make critical delivery fail closed/retry on verification unavailability.

### ID-02 — Operator/object scope is not uniformly repository-enforced

Checkout operator reads demonstrate permission without OperatorContext filter at the data primitive.

**Required restructure:** common scoped-repository guard or mandatory scoped query interface; cross-context IDOR tests for every operator/admin route.

## HOLD inventory

- every Identity internal caller and service credential;
- RBAC role/permission writers;
- session issuance/refresh/revoke/device compromise;
- permission derivation/version invalidation;
- surface authorization for all five apps;
- support-session authority;
- activation code lifecycle.

## Positive control

Control Panel `dev-session` route is currently hard-gated to `NODE_ENV=development`, same-origin and Identity surface authorization. Preserve that fail-closed environment isolation while auditing all other dev/mock paths.

---

# 4. Workforce / Provider readiness

## Proven defects

### WF-01 — Workforce remains a live financial writer

`CaptainActivationCore` still exposes and updates financial guarantee amount/currency/status/reference. Provider incident input carries proposed penalty money/currency.

**Required restructure:** WLT owns collateral/restricted position, policy minimum, penalty monetary derivation and resulting receivable/setoff. Workforce retains only non-financial evidence/status references needed for operational readiness.

### WF-02 — Availability is only an overlay on Dispatch

Current middleware can preserve successful candidate/assignment/accept behavior even when Workforce availability is unavailable or the captain is marked unavailable.

**Required restructure:** one Captain Eligibility decision service/composition used authoritatively by discovery, capacity, assignment, reassignment, offer/accept and COD financial gate.

### WF-03 — Workforce geographic `ServiceZoneID` semantics are ambiguous

It must either be an explicit reference to canonical DSH geography or be removed; it cannot be an independent geography authority.

## HOLD inventory

- employment/provider lifecycle;
- accreditation;
- suspension;
- work windows;
- leave/absence;
- documents/KYC;
- operational scopes;
- app-field/app-captain readiness consumers;
- all Workforce -> DSH projections.

---

# 5. Platform Control and Providers

## Proven defects

### PLAT-01 — DSH duplicates Platform Control

DSH ChangeSet is a false-completion implementation while `core/platform-control` already applies real governed variables/flags with lock/version/audit/rollback.

**Recommendation:** do not implement DSH's TODO. Migrate DSH/Control Panel consumers to `core/platform-control`; migrate any legitimate DSH change data; delete DSH ChangeSet tables/routes/service/types/tests after zero-reference proof.

### PROV-01 — Three provider models compete

Inside DSH:

- one repository expects `status/secret_reference_name/metadata/last_health_check`;
- another expects `is_active/is_maintenance/secret_reference/timeout_budget_ms/retry_budget` and matches the DSH migration;
- protected Control Panel path wires the first, while MapProviders is created without the second registry.

Outside DSH, `core/providers` already has a clean canonical model:

- desired config: active/credentials/parameters;
- observed health: status/checkedAt/message;
- governed update with OperatorContext, idempotency and secret-safe audit.

**Recommendation:** canonicalize provider ownership in `core/providers`; remove `dsh_platform_providers` and both DSH registries after adapter/caller/data cutover. Do not add columns merely to make the broken DSH model compile at runtime.

---

# 6. Partner / Store / Branch / Fleet

## Proven defects

### PSB-01 — StoreBranch is not a real operational identity in Order/Partner Delivery

Partner Delivery explicitly sets `branchID := storeID` because `dsh_orders` has no branch ID.

**Target:** every Store has at least one real Branch. Order/Inventory/Fleet/Coverage/Delivery task references use Branch where branch semantics matter. Forward migration creates deterministic canonical branches and maps historical facts without pretending Store IDs were Branch IDs.

### PSB-02 — Primary affiliation and Store membership are conflated

`dsh_captain_memberships` combines:

`captain_actor_id + affiliation + partner_id + store_id + branch_assignment`

and a unique active index allows one active row per captain. That blocks the decided model of one PARTNER primary affiliation with multiple Store/Branch memberships/scopes inside the same Partner.

**Target data model:**

- `dsh_captain_primary_affiliations` — exactly one active BTHWANI or PARTNER affiliation.
- `dsh_partner_captain_memberships` — Partner-level membership for PARTNER affiliation.
- `dsh_partner_captain_store_scopes` / Branch scopes — many explicit scopes.

### PSB-03 — Membership ID and Actor ID are overloaded

Partner Delivery accepts `storeCourierId` and sends it to Workforce. Fleet connection records distinguish membership ID from `captain_actor_id`.

**Target:** assignment command receives `captainMembershipId`; DSH resolves/locks membership and canonical actor; Workforce receives `captainActorId`; task persists both if both are operationally needed.

### PSB-04 — Display projection mislabels Actor ID as courier name

Current list projection scans `captain_actor_id` into a property named `CourierName`.

**Target:** human display identity comes from a governed person/profile projection; IDs never masquerade as names.

### PSB-05 — Legacy Store Team/Fleet schema retains untyped scope/config residue

Historical schema includes text `branch_assignment`, `selected_branch_ids TEXT[]`, delivery assignment summaries and Store courier compensation/pricing configuration. Later migrations partially cut over couriers but do not produce typed Branch scopes.

**Required restructure:** migrate only legitimate Store-owned people/config to explicit models; eliminate pseudo-branch text/arrays and any BTHWANI financial semantics for Store payroll/collateral.

---

# 7. Geography / Addresses / Serviceability / Capacity

## Positive controls

### GEO-P1 — Client address service-area validation uses canonical geofence resolution

Current address validation resolves coordinates through `servicearea.Resolve` and requires resolved ServiceArea to match supplied reference.

### GEO-P2 — ServiceArea geofence has a real versioned PostGIS model

Current service-area geofence uses active/effective versions, PostGIS containment, priority, idempotency and history.

## Remaining structural gaps

- Branch identity is not integrated end-to-end.
- Workforce `ServiceZoneID` must be mapped to canonical geography.
- Capacity and assignment must consume the same eligible-captain population.
- old SLA/capacity `NOT_IMPLEMENTED` routes coexist with newer governed routes.
- every Store creation/update path must be proven to use real geofence/service-area semantics, not city aliasing.

## Target hierarchy

`City -> OperationalZone -> ServiceArea -> Geofence`

Branch/location is a physical entity referencing that geography; it is not itself a ServiceArea.

---

# 8. Catalog / Assortment / Inventory / Pricing

## Positive controls

### CAT-P1 — Normalized current assortment truth exists

Client catalog/cart paths now require MasterProduct approval/active state, StoreAssortment publication, current effective normalized price and normalized inventory policy. Cart snapshots price/currency server-side.

This progress must be preserved.

## Proven defects

### CAT-01 — “Atomic” proposal transition contains ignored required side effects

On catalog approval, media-link and assortment-migration updates are executed with ignored errors. Proposal/MasterProduct can advance while linked commercial data silently remains stale.

**Target:** required side effects are part of the same failing transaction or an explicit saga with pending/failed/reconcile states. No ignored error in a state transition.

### CAT-02 — Store visibility uses compatibility `assortment.available`, not normalized purchasable truth

Storefront predicate can make a Store visible because a legacy assortment says available, while the real client catalog excludes every item for missing price/inventory.

**Target:** one `StorefrontEligibility` primitive or materialized/source-versioned projection that uses the exact same purchasable catalog truth as public catalog.

### CAT-03 — Compatibility inventory/price fields remain alive as projections/bootstrap inputs

Normalized truth writes legacy `available/stock_status`, and bootstrap can seed synthetic signal quantities from those legacy fields.

**Target:** time-bounded migration bridge only. After data reconciliation, remove legacy writers/readers and prevent bootstrap from becoming ongoing runtime authority.

### INV-01 — `reserved_quantity` exists without a proven reservation lifecycle

Database and Cart read `quantity - reserved_quantity`; Checkout validation and Order creation do not reserve/commit/release inventory. Current inventory writer preserves the reservation value but does not own its lifecycle.

**Consequence:** two concurrent checkouts can both observe availability and later create orders unless a hidden writer is proven elsewhere. No such reservation domain is present in the current DSH internal topology.

**Target aggregate:**

`InventoryReservation(id, checkoutIntentId, branchId, line items, quantities, version, expiresAt, status)`

with:

`reserve atomically -> payment/order commit -> consume`

or

`reserve -> cancel/failure/timeout -> release`

plus reconciliation, restart safety, duplicate command safety and negative-inventory constraints.

---

# 9. Home Discovery / Search / Marketing

## Proven defects

### DISC-01 — Audience segment is client-selected

Home endpoint accepts `audienceSegment=guest|authenticated` from query input instead of deriving it from trusted session/identity context.

**Target:** audience is server-derived from trusted actor/session and server-owned segmentation policy.

### DISC-02 — Positive Store visibility can be resurrected by cache

Home response is cached and returned before DB publication predicate is re-evaluated. A Store suspended/deleted after cache fill can remain visible during TTL.

**Target:** canonical deny always wins. Use invalidation/source-version tokens/deny overlay or cache only data that can be safely re-filtered against fresh deny truth.

### DISC-03 — Home filters are false capability

Backend advertises `all/favorites/nearest/new/offers`, while shared frontend `activeFilter` is local UI state and is not part of query key/request/actual sorting/filtering.

**Target:** each filter has explicit server contract, semantics and tested result transformation, or the UI control is removed until supported.

### MKT-01 — Marketing audit is allowed to fail independently

Governed publication/config actions require mandatory audit classification; current best-effort model is insufficient for high-impact operator actions.

## HOLD inventory

- reels/public content moderation/expiry;
- targeting;
- offers/campaigns;
- coupon visibility;
- subscriptions/loyalty;
- search cache/index deny semantics;
- analytics event trust;
- all Control Panel marketing actions.

---

# 10. Cart / Checkout

## Positive controls

- cart item price/name/currency resolved server-side;
- cart row locking/version checks exist in important mutation paths;
- checkout cancellation can enqueue WLT expire-session durably in the same local transaction.

## Proven defects

### CART-01 — Financial dependency errors are converted into ordinary values

Delivery fee DB failure -> `0`; WLT unavailable/error -> nil quote in read paths.

**Target:** explicit pricing unavailability, no checkout Ready without required canonical financial quote.

### CHK-01 — Missing user decisions are silently defaulted

Missing mode -> BTHWANI delivery; missing payment -> COD.

**Target:** server may choose only if exactly one canonically eligible option exists. Otherwise missing choice is validation failure.

### CHK-02 — Operator checkout primitives are not tenant/object scoped in SQL

List/Get operator primitives do not require OperatorContext.

**Target:** context is a mandatory repository parameter, with negative cross-context tests.

### CHK-03 — Inventory reservation is absent from Ready/order handoff

See INV-01.

### CHK-04 — Payment UI names are partially correct but eligibility remains frontend-local

Shared payment controller now exposes COD/Wallet/Mixed only, but Wallet/Mixed enablement does not enforce canonical numeric PaymentAllocation and default selection begins locally.

**Target:** WLT/checkout returns allowed tender options + immutable numeric allocation/preconditions. UI presents, never invents.

---

# 11. Order / Pickup / Partner Delivery / Dispatch

## Positive controls

### ORD-P1 — Order creation has strong idempotency and ownership locking

Current Order Truth creation uses advisory locks, client/OperatorContext ownership checks, immutable item snapshots, status event + outbox inside one transaction.

### PICKUP-P1 — Several pickup transitions are transactionally coherent

Order state, required audit and outbox are committed/rolled back together.

## Proven defects

### ORD-01 — Order Truth audit outside the core transition is best-effort in HTTP paths

The existence of a strong Order event/outbox does not justify a second optional governance audit layer with silently lost records. Either make it diagnostic-only and remove authority meaning, or make it mandatory/durable.

### PDEL-01 — Branch identity is fabricated from Store ID

See PSB-01.

### PDEL-02 — Courier membership/actor identity is ambiguous

See PSB-03.

### DISP-01 — Captain Eligibility is fragmented

Candidate, availability, assignment and accept must use one decision primitive including Identity + Workforce + primary affiliation/membership + ServiceArea + DSH conflicts/presence/capacity + WLT financial eligibility.

### DISP-02 — Workforce unavailability can fail open

See WF-02.

## HOLD inventory

- complete order status vocabulary;
- partner accept/reject/preparing/ready/handoff;
- captain offer/accept/decline/status/PoD/location/exception;
- BTHWANI vs PARTNER fulfillment parity;
- customer self-pickup as a distinct product;
- cancellation compensation;
- expired offers/reassignment;
- offline evidence/reconnect.

---

# 12. Returns / Support / Incidents / Special Requests

## Proven defects

### RET-01 — Return action false execution

Action can be marked executed without applying the transition.

### RET-02 — Current order-level return uniqueness does not prove multiple partial return episodes

Target must explicitly define cumulative line quantities, repeated partial returns, disposition/restock and original-funding refund lineage.

### SUP-01 — Order Rescue false completion

Operational-reference-only bookkeeping marks action completed/case resolved without executing requested business effect.

**Target:** each rescue action maps to a canonical command owned by Order/Dispatch/WLT/etc. Unsupported action stays unsupported; manual external resolution has an explicit evidenced manual state, not fake completed.

### SP-01 — Special Request can manufacture OperatorContext

Remove default dev context from production-capable methods.

### SP-02 — DSH authors estimated amount/currency

Binding special-request quote must be WLT-owned and versioned; DSH supplies operational evidence/proposal only.

## HOLD inventory

- logistics return-to-store;
- received/damaged/restock disposition;
- refund/reversal/promotion/settlement effects;
- support ticket/message/rescue command matrix;
- incident classification and policy IDs;
- Special Request quote acceptance/expiry/dispatch/cancel/compensation.

---

# 13. WLT / Financial authority

## Positive control

### FIN-P1 — Field commission demonstrates the desired boundary

DSH sends actor/visit/store/partner/category/evidence/idempotency. WLT selects a versioned commission policy, derives the money and posts ledger/audit transactionally.

This is the reference pattern for all DSH->WLT financial effects.

## Proven defects

### FIN-01 — Coupon funding split is calculated in DSH and trusted by WLT

DSH calculates Platform/Partner monetary funding amounts. WLT accepts those amounts from caller, checks only the arithmetic sum and then posts ledger.

**Target:** DSH passes promotion identity/version/eligibility/funding-source evidence. WLT owns financial funding policy, derives exact amounts and records immutable source version.

### FIN-02 — Workforce writes collateral/penalty money

See WF-01.

### FIN-03 — Special Requests author money outside WLT

See SP-02.

### FIN-04 — Subscription tender vocabulary still accepts/defaults `official_wallet`

Order checkout has cut over to COD/Wallet/Mixed; subscription is a separate product and must have an explicit reconciled tender policy. Missing method must never silently choose `official_wallet`.

## Mandatory WLT exhaustive inventory

No finance closure until every writer is classified across:

- pricing/quote;
- PaymentAllocation;
- wallet/ledger;
- cash-in/external providers;
- collateral/restricted positions;
- COD exposure;
- cash custody;
- settlement;
- commission;
- promotion funding;
- penalties/debt/receivable;
- refund/reversal;
- payout;
- subscription/commercial;
- reconciliation;
- provider webhook/unknown-result handling.

---

# 14. Notifications / Consent / Ratings / Media / Privacy

## Proven defects

### NOTIF-01 — Push session verifier fails open

See ID-01.

### CONSENT-01 — Marketing consent is modeled as profile booleans

No policy/version/source/surface/acceptedAt/revokedAt provenance, and audit insert error is ignored.

**Target:** append-only/versioned consent decision records; notification preference is separate from legal/marketing consent; mandatory audit is durable.

### RATE-01 — Moderation does not gate aggregate

New rating has `moderation_status=pending` but `status=active`; aggregate filters only `status=active`.

**Target:** public aggregate consumes only canonical publishable moderation state.

### MEDIA-01 — Readiness mutates/provisions infrastructure

Media Ready can call connection/EnsureBucket and returns ready when unconfigured.

**Target:** bootstrap/provision is separate from read-only readiness; required vs optional capability policy determines NOT_READY vs N/A.

## HOLD inventory

- notification producer/topic/consent matrix;
- endpoint/device/session lifecycle;
- retries/DLQ/dedup/readback;
- OTP secret handling;
- media upload/download ACL;
- signed URLs/expiry;
- document/PoD/incident/reel visibility;
- retention/redaction/orphans;
- phone/address/GPS/bank/device/support data in logs/events/analytics.

---

# 15. Analytics / Observability

Status: `HOLD_EXHAUSTIVE_INVENTORY`.

Required diagnosis per metric/event:

- canonical source table/event;
- time window/timezone;
- currency and financial owner where applicable;
- freshness timestamp;
- completeness state (`missing` != `0`);
- source version/reconciliation state;
- access scope;
- PII redaction;
- dashboard label parity.

Required operational observability:

- correlation + causation + idempotency across DSH/WLT/Identity/Workforce/Platform/Providers;
- queue/outbox lag and dead/failed state;
- reconciliation drift;
- financial unknown result;
- cache staleness/invalidation;
- permission denial/security event;
- provider dependency health.

---

# 16. Surface diagnosis obligations

Every surface must be audited action-by-action. A screen existing is not proof that the journey works.

## app-client

Required domains include account/profile/consent, address/maps/serviceability, home/search/catalog/reels, cart, checkout/payment, orders/tracking/cancel/return, ratings, notifications, special requests, subscription/loyalty and finance/top-up.

For every route/CTA:

`visible state -> preconditions -> canonical API -> mutation -> authoritative readback -> loading/empty/error/retry/offline -> deep link/cache/persistence`.

Current proven UI defect: Home filters are local visual state without request/result semantics.

## app-partner

Required domains include Partner/Store/Branch, team/fleet, catalog/assortment/inventory/pricing, order decision/preparation/handoff, Partner Delivery, cash/settlement views, finance, support, notifications, permissions/security.

Current structural risk: legacy Store/Fleet/Branch semantics still leak through shared APIs.

## app-captain

Required domains include primary affiliation mode, memberships/scopes, readiness, availability, assignment/offer/accept/decline, navigation/location, pickup/PoD, exceptions/return-to-store, contact proxy, COD/cash custody, wallet/collateral/settlement, notifications and offline/reconnect.

No internal actor/membership ID may be displayed as a human name.

## app-field

Required domains include Workforce readiness/profile, assignments/visits, Partner onboarding, Store verification, GPS/evidence/media, escalation/incidents, field commission readback and offline evidence queue.

Field must not own Partner approval, Store publication or financial amount decisions.

## control-panel

Every action in administration/analytics/carts/catalogs/dashboard/finance/hr/maps/marketing/operations/partners/platform/support/security must prove:

`permission + OperatorContext/object scope + state precondition + reason/evidence + maker/checker where required + idempotency + mandatory audit + actual effect + authoritative readback`.

Control Panel must call canonical service owners directly through governed BFF/adapters; it must not cause DSH to re-own Platform/Provider/Identity/Workforce/WLT truth.

---

# 17. Shared frontend / contracts / generated bindings

Status: `HOLD_EXHAUSTIVE_INVENTORY` with current evidence of local business-state drift.

Every module under `services/dsh/frontend/shared/**` must be classified as:

- generated binding;
- transport adapter;
- controller/query coordinator;
- view model/formatter;
- presentation-only policy;
- local ephemeral state;
- forbidden business authority.

Forbidden after cutover:

- local tender/eligibility authority;
- local permission authority;
- duplicate domain state machines;
- direct environment-based enablement of server-forbidden capability;
- ad-hoc API semantics outside canonical binding;
- local cache as authoritative operational state;
- UI control with no actual backend effect.

OpenAPI closure requires:

`registered runtime route <-> OpenAPI operation <-> schema <-> generated/shared adapter <-> surface consumer`.

Stale `NOT_IMPLEMENTED` routes/contracts must be deleted after consumer migration, not permanently advertised.

---

# 18. Database / migrations / legacy residue

## Proven structural residues

- `branch_id=store_id` substitution;
- conflated captain affiliation/membership table;
- Workforce monetary columns;
- DSH duplicate provider registry/table;
- legacy Store Team/Fleet branch strings/arrays;
- legacy assortment compatibility fields used by Store visibility;
- reservation field without lifecycle;
- DSH platform ChangeSet authority parallel to core Platform Control.

## Migration law

Never rewrite already-applied migrations to hide history. Use forward-only cutover:

1. create canonical schema;
2. backfill with evidence;
3. dual-read only if strictly bounded and non-authoritative;
4. migrate writers first to single canonical owner;
5. migrate all readers/consumers;
6. compare/reconcile old vs canonical;
7. disable old writer;
8. prove zero references;
9. drop old column/table/route/type;
10. test fresh install + supported historical upgrade + cutover/restart.

A compatibility bridge without an explicit removal gate is an unresolved defect.

---

# 19. Runtime / configuration / readiness

## Positive control

Control Panel dev-session is development-only and same-origin guarded.

## Proven defects

- Special Request production-capable methods can create dev OperatorContext default.
- DSH provider registry wiring bypasses its own registry and conflicts with schema/core Providers.
- Media readiness mutates provider state.

## Required runtime audit

- all service URLs/ports from current config;
- production startup validation;
- secret/service-token ownership;
- no debug identity/mock truth in production;
- dependency health/readiness semantics;
- migration/bootstrap ordering;
- restart/unknown-result behavior;
- Docker/profiles/local-vs-production parity;
- mobile runtime transport must not change business authority.

---

# 20. CI / architecture guards required before final closure

Add mechanical guards for at least:

1. monetary fields/writers outside WLT allowlist;
2. `storeId` passed/stored as `branchId`;
3. membership ID crossing actor-ID APIs;
4. dev OperatorContext/default identity in production-capable code;
5. ignored errors inside governed transitions/audit;
6. business status `completed/applied/executed/resolved` without registered effect/readback primitive;
7. DSH direct ownership of Platform Control / Core Providers truth after cutover;
8. frontend direct authoritative calculations/permissions/tender decisions;
9. stale `NOT_IMPLEMENTED` runtime route declared as supported contract;
10. OpenAPI/runtime/generated binding drift;
11. legacy assortment fields used as public eligibility authority;
12. required dependency errors converted to zero/nil/allow;
13. duplicate source/writer registry violations;
14. migration fresh/upgrade parity;
15. forbidden best-effort mandatory audit.

---

# 21. Recommended target architecture

## Canonical command envelope

Every governed mutation should carry/derive:

- trusted `actorId`;
- trusted `operatorContextId`;
- explicit object-scope IDs;
- `commandId/idempotencyKey`;
- `correlationId` and causation;
- expected version where aggregate mutation is optimistic;
- reason/evidence for governed actions;
- no caller-authored money if WLT can derive it.

## Canonical operational command primitive

For local DSH aggregates:

`Lock Aggregate -> Verify authority/scope -> Verify state/version -> Apply transition -> Mandatory audit -> Outbox -> Commit -> Readback`

## Canonical distributed primitive

For DSH -> Identity/Workforce/WLT/Platform/Providers obligations:

- synchronous authority check for decisions that must be current before write;
- durable outbox/saga for required side effects where atomic DB transaction is impossible;
- explicit unknown/pending/failed states;
- idempotent consumer;
- reconciliation worker;
- never “best effort and continue” for required business truth.

---

# 22. Highest-value execution order

1. **Authority cutover map** — lock canonical owners and remove ambiguity before code movement.
2. **Trusted context/typed ID foundation** — OperatorContext/object scope/Actor vs Membership vs Store vs Branch.
3. **False-completion elimination** — ChangeSet/Return/Rescue and every similar status.
4. **Platform Control + Providers cutover out of DSH.**
5. **WLT financial authority cutover** — Workforce money, Coupon funding, Special Request money, PaymentAllocation/COD/custody/settlement/refund.
6. **Captain Eligibility + Fleet restructuring.**
7. **Real StoreBranch + geography integration.**
8. **Catalog/Storefront/Inventory Reservation canonicalization.**
9. **Order/Dispatch/PartnerDelivery/Pickup/Return/Support state-machine convergence.**
10. **Notifications/Consent/Ratings/Media/Privacy.**
11. **All five surface bindings and UI/UX state correctness.**
12. **OpenAPI/generated clients/DB migrations/runtime/observability/CI.**
13. **Physical cleanup of every superseded route/table/column/type/file/config/plan reference.**
14. **Adversarial same-SHA final proof.**

This order is mandatory because fixing a leaf before its owner/identifier/state authority is settled creates another patch layer.

---

# 23. Final diagnosis verdict

`SYSTEM_WIDE_RESTRUCTURE_REQUIRED`.

The current branch contains substantial correct engineering islands—normalized catalog price/inventory, strong Order idempotency/outbox, transactional Pickup transitions, WLT-owned Field Commission, real ServiceArea geofences, protected dev session—but these coexist with severe authority duplication, identifier overloading, false completion, monetary ownership inversion, fail-open dependency handling and legacy compatibility semantics.

The correct strategy is **not** to preserve every current module and patch its defects. The package must perform owner-first cutovers, migrate data/consumers, and delete parallel truth physically.

No system-wide `DONE` is permitted while any row in `HOLD-REPROOF-MATRIX-20260816.md` remains HOLD/OPEN or any superseded authority remains writable/reachable.

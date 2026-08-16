# DSH OPERATIONAL POLICIES — DEEP ROOT-CAUSE DIAGNOSIS

Status: `ACTIVE_DIAGNOSIS / NOT_CLOSED`
Branch: `b`
Evidence HEAD before this documentation write: `8d9c85e44ede83a0fb281c872a88f356a5c54208`
Parent: `DSH-SYSTEMIC-DEEP-DIAGNOSIS-20260816.md`

## 1. Authority position

`internal/platformpolicies` is not automatically redundant with `core/platform-control`.

The DSH package contains domain-operational facts such as:

- operational zones;
- fulfillment-mode enablement;
- SLA rules;
- zone capacity;
- operational pressure/effects.

Those facts can remain DSH-owned **if** DSH is the declared domain owner. `core/platform-control` should govern generic platform configuration/change workflow, not become a second semantic owner of DSH operational state.

The problem is therefore not the existence of DSH operational policy. The current problems are identity conflation, stale status vocabulary, failure classification and cross-read inconsistency.

## 2. Positive mechanics to preserve

Policy mutations already provide useful mechanics:

- optimistic version control;
- idempotent mutation result storage;
- advisory serialization per actor/operation/key;
- required mutation reason;
- policy audit events;
- versioned rollback support.

These should remain while the domain model is corrected.

## 3. Proven root causes

### POL-RC-01 — Operational Zone, City and ServiceArea identities are conflated

Status: `PROVEN`
Priority: `P0 domain model`

Evidence:

- `dsh_platform_zones` stores a field named `city_code`.
- `resolveOperationalZoneForStore` resolves a store's `service_area_code` by querying `dsh_platform_zones WHERE LOWER(city_code)=LOWER(serviceAreaCode)`.
- the code comment explicitly states that `city_code` is a **legacy persisted name for the service-area binding**.
- `GetZoneServiceability` counts stores with `s.service_area_code = z.city_code`.
- `BuildOperationalDecision` returns `ServiceAreaCode = snapshot.Zone.CityCode` and treats an input ServiceArea mismatch against the zone `city_code` as unserviceable.

Consequences:

- a field named City is semantically acting as ServiceArea;
- one Zone is effectively forced into a one-ServiceArea alias;
- multiple ServiceAreas per operational Zone, or a City containing many independent ServiceAreas, cannot be represented cleanly;
- Dispatch/Store/Geofence/Capacity terminology diverges around the same identifier.

Required target:

- canonical `City` identity where product geography needs it;
- canonical `ServiceArea` identity from the PostGIS ServiceArea aggregate;
- canonical `OperationalZone` identity;
- explicit `OperationalZoneServiceArea` relation, versioned/effective where required;
- no field named `city_code` may carry a ServiceArea ID after cutover.

---

### POL-RC-02 — Capacity counts terminal cancelled/failed orders as active

Status: `PROVEN`
Priority: `P0 operational correctness`

Evidence:

`EvaluateOperationalPolicyForStoreSnapshot` counts active orders using:

`status NOT IN ('delivered', 'cancelled', 'returned_to_store')`.

But the governed cancellation migration removes ambiguous generic `cancelled` and permits terminal states including:

- `cancelled_by_client`;
- `cancelled_by_store`;
- `cancelled_by_operator`;
- `cancelled_no_driver`;
- `failed_payment`;
- `failed_dispatch`.

Therefore cancelled/failed orders can continue consuming `MaxConcurrentOrders` pressure indefinitely.

Operational effect:

A zone can be reported `throttled` or `capacity_exhausted` because of already terminal work.

Required remediation:

1. Define terminality once in canonical order state semantics.
2. Capacity must use that canonical terminal predicate/view/function, never a copied string list.
3. Every consumer of "active orders" must call the same predicate.
4. Add migration/runtime tests covering every terminal state.

---

### POL-RC-03 — Storefront visibility and operational active-store counting disagree on `limited`

Status: `PROVEN`
Priority: `P0/P1 cross-surface truth`

Evidence:

- canonical client storefront publication accepts `serviceability_status IN ('serviceable','limited')`.
- `GetZoneServiceability` counts an active store only when `s.serviceability_status = 'serviceable'`.
- operational policy denies with `NO_ACTIVE_STORES` when the count is zero.

Possible runtime contradiction:

A customer can be shown a published `limited` store by Home/Discovery while the operational policy says the zone has zero active stores and blocks cart/checkout.

Required target:

Define the semantics of `limited` once:

- if limited means client-visible but conditionally orderable, policy evaluation must explicitly evaluate the limiting condition rather than omit the store from existence;
- if limited means non-orderable, Storefront must not advertise it as normal purchasable availability.

The same canonical store readiness predicate/projection must drive discovery and operational policy.

---

### POL-RC-04 — Policy dependency database errors are swallowed as absent configuration

Status: `PROVEN`
Priority: `P1 failure semantics/observability`

Evidence:

`EvaluateOperationalPolicy` ignores errors from SLA, Capacity and DeliveryMode queries with `_ = db.QueryRowContext(...).Scan(...)`.

It also ignores `GetZoneServiceability` errors unless the call succeeds.

Consequences:

- `sql.ErrNoRows` and infrastructure/query/schema failures are collapsed into the same zero-value snapshot;
- callers receive `SLA_NOT_CONFIGURED`, `CAPACITY_NOT_CONFIGURED`, `FULFILLMENT_MODE_NOT_CONFIGURED` or `NO_ACTIVE_STORES` rather than a dependency/runtime error;
- operational incidents can be misdiagnosed as product configuration omissions;
- schema drift can be hidden behind apparently valid fail-closed decisions.

This is fail-closed in many cases, but it is not truthful failure classification.

Required remediation:

- distinguish `NOT_CONFIGURED` from `DEPENDENCY_UNAVAILABLE` and `SCHEMA/QUERY_FAILURE`;
- only `sql.ErrNoRows` may map to "not configured";
- all other errors propagate with correlation/telemetry;
- Control Panel should expose configuration incompleteness separately from runtime degradation.

---

### POL-RC-05 — Policy decision is not bound to a durable composite revision

Status: `PROVEN CONTRACT GAP`
Priority: `P1`

Positive fact:

`OperationalDecision.PolicyVersions` carries separate Zone/SLA/Capacity/DeliveryMode versions.

Gap:

Serviceability/Checkout evidence currently does not persist the complete composite policy revision with ServiceArea/address/store/branch versions, and the cart serviceability layer replaces revision identity with a random `quoteVersion`.

Required target:

Create a deterministic `OperationalDecisionSnapshotID` / hash over:

- Zone revision;
- Zone↔ServiceArea binding revision;
- ServiceArea revision;
- Store/Branch readiness revision;
- DeliveryMode policy revision;
- SLA revision;
- Capacity revision + pressure observation;
- address version;
- fulfillment mode.

Checkout `READY` must bind to this snapshot and invalidate it when a required source changes/expires.

## 4. Vocabulary note — pickup is not currently a defect

`NormalizeFulfillmentMode` explicitly maps compatibility value `pickup` to canonical operational-policy value `client_pickup`.

Therefore this vocabulary difference is currently an intentional adapter, not a proven runtime bug.

Long-term cleanup should still converge contracts so adapters are bounded and documented, but it is not an execution priority above the proven roots.

## 5. Required restructuring sequence

1. Introduce explicit `OperationalZoneServiceArea` relation.
2. Migrate `city_code` misuse to actual City and ServiceArea fields/relations.
3. Establish one canonical Order terminal predicate and use it for capacity.
4. Align Storefront and policy interpretation of `limited` readiness.
5. Replace swallowed SQL errors with typed configuration-vs-runtime failure handling.
6. Bind decisions to deterministic composite revisions.
7. Route DSH operational-policy changes through the desired Platform Control governance workflow only if that workflow is the approved mutation orchestrator; do not duplicate semantic storage in core.
8. Delete legacy semantic aliases only after all readers/writers are migrated.

## 6. Mandatory closure tests

- every cancellation/failure terminal state releases capacity immediately;
- `limited` store behavior is identical in Home/Discovery, Cart, Checkout and policy decision;
- one city may contain multiple ServiceAreas without identifier substitution;
- one OperationalZone may map to one or multiple ServiceAreas according to explicit product policy;
- ambiguous/missing Zone↔ServiceArea mapping fails with explicit reason;
- DB failure in SLA/Capacity/Mode query is not reported as `NOT_CONFIGURED`;
- policy snapshot revision changes when any authoritative policy component changes;
- stale checkout policy evidence cannot proceed to WLT handoff.

## 7. Verdict

DSH operational policies have useful governance mechanics, but their current decision truth is not safe for final closure because **geographic identity is conflated and capacity uses stale order-terminal vocabulary**. These are higher-order roots and must be corrected before treating Cart/Checkout/Dispatch serviceability as authoritative.

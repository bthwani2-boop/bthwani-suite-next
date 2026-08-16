# DSH SERVICEABILITY + MAPS — DEEP ROOT-CAUSE DIAGNOSIS

Status: `ACTIVE_DIAGNOSIS / NOT_CLOSED`
Branch: `b`
Evidence HEAD before this documentation write: `bc0a517df85cbe61c828d9bf669172721a146037`
Parent: `DSH-SYSTEMIC-DEEP-DIAGNOSIS-20260816.md`

## 1. Target truth

Geographic serviceability must have one canonical decision path:

`Client coordinates -> governed ServiceArea geofence/version -> Store/Branch operational coverage -> requested fulfillment mode -> canonical operational policy/capacity -> result evidence`

Map providers may enrich search/reverse/route/ETA. They must not become a second service-area authority, and provider failure must not silently manufacture authoritative geography.

## 2. Positive canonical pieces to preserve

### Governed ServiceArea geofences

`servicearea` already has a strong foundation:

- PostGIS polygon authority;
- SRID 4326;
- deterministic overlap policy (`priority_then_code`);
- effective/expiry windows;
- immutable versions;
- OCC/version conflict;
- mutation idempotency;
- audit/events;
- coordinate resolution through `servicearea.Resolve`.

### Client address creation/update validation

Client address create/update calls `clientaddress.ValidateServiceArea`, which resolves coordinates through canonical `servicearea.Resolve` and requires the supplied service-area code to match.

These should become the only geographic authority foundations.

## 3. Proven root causes

### SVC-RC-01 — Cart/Checkout serviceability uses a second geographic resolver instead of canonical geofences

Status: `PROVEN`
Priority: `P0`

Evidence:

`cart.CheckServiceability` does not call `servicearea.Resolve`.

It instead derives `inZone` using an independent algorithm:

- normalize city/service-area strings through hard-coded aliases;
- same normalized city; OR
- exact text match between store area/city and supplied area; OR
- calculated/store distance `<= 35km`.

This directly contradicts the comment in `CheckGovernedServiceability` claiming there is no second zone resolver.

Root:

The canonical PostGIS ServiceArea aggregate and the commerce serviceability decision are separate geographic authorities.

Required remediation:

1. Remove city-alias/text/35km authorization from serviceability truth.
2. Resolve customer coordinates through the effective ServiceArea geofence at decision time.
3. Resolve store/branch coverage against canonical ServiceArea/Branch scope.
4. Use distance only as a policy/ETA input where explicitly governed, never as a substitute for geofence membership.
5. Persist the exact ServiceArea version used in each serviceability/checkout evidence snapshot.

---

### SVC-RC-02 — Unknown distance is treated as within range

Status: `PROVEN`
Priority: `P0 fail-open`

Evidence:

`CheckServiceability` computes:

`isWithinDistance := calculatedDistance == nil || *calculatedDistance <= 35.0`

Therefore absence of a usable distance is interpreted as satisfying the range predicate.

Because `inZone` is `sameCity || matchesZone || isWithinDistance`, missing distance can authorize serviceability even when the other geographic signals do not prove it.

Required remediation:

Unknown evidence is not affirmative evidence.

- `distance unknown` must never evaluate to `within distance`;
- missing required geographic evidence returns an explicit fail-closed/degraded code;
- route/distance inputs must carry source and freshness.

---

### SVC-RC-03 — Address geofence validation is write-time only; commerce path does not re-resolve current geofence

Status: `PROVEN`
Priority: `P0/P1`

Evidence:

- address create/update correctly validates coordinates with `servicearea.Resolve`;
- serviceability later loads the stored address and passes its stored `ServiceAreaCode` + coordinates to `CheckGovernedServiceability`;
- `CheckGovernedServiceability` delegates geographic truth to `CheckServiceability`, which does not re-resolve the current effective ServiceArea version.

Result:

A previously valid address can continue participating in commerce decisions after geofence boundaries/effectivity change without proving current membership in the new canonical version.

Required target:

Every material checkout/serviceability decision re-resolves the coordinates against the current effective ServiceArea (or validates a still-current signed/versioned geographic evidence token).

---

### SVC-RC-04 — DSH map client bypasses governed provider timeout budgets

Status: `PROVEN`
Priority: `P1 runtime resilience`

Evidence:

- `mapproviders.NewClient` creates `http.Client{}` with no fixed timeout.
- registry timeout budget is used only when `Client.reg != nil`.
- client Search/Reverse/ProviderHealth handlers instantiate `mapproviders.NewClient(os.Getenv("DSH_PROVIDERS_BASE_URL"), nil)`.
- therefore the provider registry timeout path is not active for these runtime calls.

This is another consequence of the broader Provider authority/wiring split.

Required remediation:

- use canonical `core/providers` client/config;
- one governed timeout/retry/circuit policy per operation;
- no nil-registry production wiring;
- bounded context on every provider request;
- distinguish timeout, unavailable and uncertain without indefinite wait.

---

### SVC-RC-05 — ETA silently degrades to heuristic values and unlabeled defaults

Status: `PROVEN`
Priority: `P1 product truth`

Evidence:

In `CheckGovernedServiceability`:

- if map route fails or yields no usable duration, ETA uses straight-line distance multiplied by `3 minutes/km`;
- route time is floored to 10 minutes;
- if SLA is not configured, prep time silently defaults to 15 minutes;
- result is returned as a normal ETA window without a source/degraded-confidence field.

This conflicts with the fail-closed/no-hidden-fallback goal and with the local comment that no SLA fallback exists.

Required remediation:

Choose one explicit product contract:

- authoritative ETA requires governed route + SLA and otherwise returns `ETA_UNAVAILABLE`; or
- heuristic ETA is allowed but must be an explicit versioned policy and response must expose `estimateSource`, `confidence`, `degraded=true`.

No invisible heuristic fallback.

---

### SVC-RC-06 — `quoteVersion` is not a source revision

Status: `PROVEN CONTRACT GAP`
Priority: `P1`

Evidence:

`CheckGovernedServiceability` assigns `QuoteVersion = uuid.NewString()` on every evaluation and an arbitrary 15-minute expiry.

The value is not derived from:

- ServiceArea version;
- address version;
- store version;
- operational-policy revision;
- capacity snapshot revision;
- route-provider result revision.

Therefore the field named `quoteVersion` cannot prove that a later checkout is based on the same underlying serviceability facts.

Required target:

Use a deterministic evidence/snapshot identity or signed hash over the actual authoritative revisions and decision inputs. Do not call a random request identifier a version.

---

### SVC-RC-07 — Lightweight fulfillment-mode endpoint is not authoritative serviceability

Status: `PROVEN FALSE-CAPABILITY RISK`
Priority: `P1`

Evidence:

`GET /dsh/client/cart/fulfillment-modes` accepts browser-supplied `serviceAreaCode` and intentionally does not require physical coordinates; the comment says it 'just relies on the zone/serviceAreaCode'. It delegates to the same legacy `CheckServiceability` resolver.

Required target:

- either label this endpoint as store capability only (not customer serviceability), removing geographic claims;
- or require a governed address/evidence token and use the same canonical decision path as checkout.

Frontend must not present it as proof that delivery is available to the customer.

## 4. Serviceability evidence gap

`RecordServiceabilityCheck` records useful fields such as address version, mode, area code, capacity and SLA values, but it does not persist the canonical ServiceArea version or a deterministic decision snapshot/revision.

Required evidence should include at minimum:

- address ID/version;
- resolved coordinates or safe location reference;
- ServiceArea code/version;
- Store/Branch coverage version;
- fulfillment-mode policy version;
- capacity policy/snapshot revision;
- SLA policy revision;
- provider/route source where ETA matters;
- decision hash;
- checked/expires timestamps.

## 5. Required restructuring sequence

1. Make `servicearea.Resolve` the sole geographic resolver for customer coordinates.
2. Introduce canonical StoreBranch↔ServiceArea coverage.
3. Delete geographic authorization based on city aliases/text/implicit 35km.
4. Rebuild `CheckGovernedServiceability` around canonical versioned evidence.
5. Make Checkout consume/refresh that evidence before `READY`.
6. Fix Provider wiring through `core/providers` with governed timeout budgets.
7. Decide authoritative-vs-heuristic ETA product contract and encode it explicitly.
8. Rename/remove random `quoteVersion`; replace with actual snapshot identity.
9. Align fulfillment-modes UI/API semantics with real serviceability.
10. Add current-geofence revalidation tests after ServiceArea boundary changes.

## 6. Mandatory failure/concurrency tests

- coordinates outside all active geofences are never serviceable even if within 35km;
- unknown store/client distance cannot authorize serviceability;
- changing a geofence invalidates/recomputes prior address serviceability evidence;
- overlapping polygons obey the canonical priority/version policy;
- provider timeout is bounded and returns deterministic degraded/error state;
- route-provider failure cannot silently return an authoritative-looking ETA unless explicit heuristic policy is enabled;
- checkout cannot reuse expired/stale ServiceArea evidence;
- pickup remains independent of customer delivery-zone membership but still requires store operational readiness;
- service-area deactivation immediately prevents new delivery checkout decisions.

## 7. Verdict

ServiceArea storage/governance is substantially stronger than the commerce path that consumes it. The highest root is **parallel geographic authority**: PostGIS geofence truth exists, but Cart/Checkout Serviceability still authorizes delivery through legacy city/distance logic. The restructuring must remove that resolver rather than keep it as a fallback.

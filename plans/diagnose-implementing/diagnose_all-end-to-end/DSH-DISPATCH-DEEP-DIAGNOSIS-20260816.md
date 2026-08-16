# DSH DISPATCH — DEEP ROOT-CAUSE DIAGNOSIS

Status: `ACTIVE_DIAGNOSIS / NOT_CLOSED`
Branch: `b`
Evidence HEAD before this documentation write: `ef152530649efa7191c0ceef744390c0a6705a60`
Parent: `DSH-SYSTEMIC-DEEP-DIAGNOSIS-20260816.md`

## 1. Operational scope

Dispatch closure includes all platform-captain and special-request paths that write/read the shared `dsh_assignments` / `dsh_deliveries` aggregates, plus:

- order transitions;
- special-request transitions;
- captain readiness;
- Workforce availability;
- WLT financial/COD eligibility;
- service-area/branch scopes;
- reassignment/exception paths;
- location/proof/return flows;
- operator and captain surfaces;
- DB constraints, workers and expiration;
- audit/decision history.

No dispatch path is considered closed if another reachable writer can bypass its invariants.

## 2. Positive canonical pattern to retain

`CreateGovernedAssignment` has valuable mechanics:

- operator-context-scoped idempotency key;
- advisory lock on the order dispatch aggregate;
- row lock on the captain profile before capacity evaluation;
- recomputation of active capacity under the lock;
- order ownership/fulfillment checks;
- atomic order transition + assignment + delivery + dispatch-decision write;
- offer deadline;
- governed accept/decline/expiry state transitions.

These mechanics should become the **single assignment mutation kernel**, not coexist with older assignment writers.

## 3. Proven root causes

### DISP-RC-01 — ServiceArea is request metadata, not a captain eligibility scope

Status: `PROVEN`
Priority: `P0`

Evidence:

- `ListCaptainDispatchCandidates(operatorContextID, serviceAreaCode, ...)` returns the requested `serviceAreaCode` as SQL parameter `$2`, but its candidate query does not join/filter any captain-to-service-area scope.
- `validateCaptainForAssignmentTx(... serviceAreaCode)` only verifies that the string is non-empty; the SQL eligibility query does not use it.
- `CreateGovernedAssignment` proves the order store's `service_area_code` equals the caller-provided service area, but never proves the selected captain is assigned/eligible for that area.
- `dsh_captain_dispatch_profiles` is keyed only by `(operator_context_id, captain_id)` and contains no area/branch scope.
- `dsh-079` adds `service_area_code` to the assignment itself, not a canonical captain scope relation.

Result:

A captain who satisfies global OperatorContext readiness can be selected for any service area inside that OperatorContext regardless of a canonical area assignment.

Required target:

- canonical `CaptainServiceAreaScope` / `CaptainBranchScope` relation;
- assignment eligibility joins that scope under the same transaction;
- scope status/effective period/version;
- no caller-supplied area can confer eligibility;
- explicit transfer/suspension/revocation semantics.

---

### DISP-RC-02 — Shared assignment aggregate has parallel writers with different invariants

Status: `PROVEN`
Priority: `P0`

Evidence:

`dispatch.CreateAssignment` and `dispatch.CreateAssignmentForSpecialRequest` write directly to `dsh_assignments` / `dsh_deliveries` outside the governed creation kernel.

The legacy special-request writer is live through:

`POST /dsh/operator/special-requests/{requestId}/dispatch`
-> `dispatch.CreateAssignmentForSpecialRequest(...)`.

That writer does not enforce the governed creation set:

- no dispatch idempotency key;
- no captain profile/accreditation gate;
- no captain capacity gate;
- no live/aggregated Workforce readiness gate;
- no WLT financial eligibility gate;
- no service-area scope;
- no governed dispatch-decision audit entry;
- no governed assignment metadata.

Root:

The same table/aggregate has two mutation authorities.

Required remediation:

- one `AssignmentCommandService` for order and special-request assignment;
- source type is a typed target (`ORDER | SPECIAL_REQUEST`) inside one invariant set;
- target-specific readiness is plugged into the kernel, not implemented as a second writer;
- remove direct legacy INSERT writers after migration/tests prove all routes use the kernel.

---

### DISP-RC-03 — Special-request assignment corrupts OperatorContext lineage

Status: `PROVEN`
Priority: `P0 isolation/correctness`

Evidence:

- HTTP passes the authenticated `actor.OperatorContextID` to `CreateAssignmentForSpecialRequest`.
- that function uses the value for special-request readiness/update but omits `operator_context_id` from the `INSERT INTO dsh_assignments`.
- schema default from `dsh-079` is `operator_context_id='default'`.
- governed captain inbox reads assignments with `WHERE a.operator_context_id=$1 AND a.captain_id=$2`.
- no later alignment migration was found that changes this writer or removes the default behavior.

Result:

A special request can belong to one OperatorContext while its assignment is persisted as `default`, breaking isolation, visibility and later governed lifecycle checks.

Required remediation:

- remove DB semantic default for authoritative OperatorContext on new writes;
- require explicit non-empty trusted context in every assignment insert;
- backfill existing rows by authoritative parent lineage;
- DB constraint/trigger must prove assignment context matches order/special-request parent;
- add cross-context negative tests.

---

### DISP-RC-04 — Offer creation does not require the same live readiness required at acceptance

Status: `PROVEN`
Priority: `P1 operational correctness`

Evidence:

- `getCaptainAggregatedReadiness` calls Workforce `ActivationReadiness` live, checks DSH dispatch profile and WLT financial eligibility.
- captain inbox and governed acceptance invoke this aggregate readiness.
- governed operator assignment creation refreshes financial eligibility but does not call aggregated/live Workforce readiness.
- candidate list uses DSH profile + local availability projection + financial snapshot rather than the live Workforce readiness call.

Result:

The system can create offers for a captain who later fails the sovereign readiness gate at acceptance. This produces false actionable work, capacity distortion and avoidable expiration/reassignment churn.

Required target:

- one readiness snapshot contract used by candidate selection, offer creation and acceptance;
- a short-lived/versioned readiness proof may be used for performance, but its owner/freshness/revocation semantics must be explicit;
- offer creation fails closed when sovereign readiness cannot be proven.

---

### DISP-RC-05 — Workforce absence projection has ordering protection but no source-freshness/heartbeat authority

Status: `PROVEN_GAP`
Priority: `P1`

Positive behavior:

- `UpsertProviderAvailabilityProjection` rejects older `source_updated_at` events.
- active projected absence blocks local availability and assignment validation.

Gap:

- eligibility reads check whether an active absence row exists, but do not prove that the Workforce projection feed itself is current/healthy.
- dispatch profile freshness (`p.updated_at > NOW()-24h`) is not evidence that Workforce absence truth is fresh; the profile is DSH-owned and can be updated independently.

Risk:

If Workforce→DSH projection delivery stops after an earlier active/cancelled state, DSH cannot distinguish 'no absence' from 'projection feed stale'.

Required target:

- projection source cursor/heartbeat/high-water mark per OperatorContext;
- maximum accepted staleness for assignment decisions;
- fail-closed or explicit degraded policy when sovereign Workforce truth is stale;
- replay/reconciliation worker and operator visibility.

---

### DISP-RC-06 — Capacity policy silently falls back to executable defaults

Status: `HOLD -> MUST_CLASSIFY_BY_USAGE`
Priority: `P1 if decision-authorizing; P2 if analytics-only`

Evidence:

`loadCapacityPolicy` returns an in-code policy when no DB row exists:

- minimum captains = 1;
- target captains = 2;
- demand buffer = 2000 bp;
- mass-absence threshold = 4000 bp;
- horizon = 180 min;
- version = 0 / updatedBy = `default`.

Required classification:

- if only descriptive forecast UI consumes it, document it as an explicit product default with canonical ownership;
- if it gates serviceability/dispatch decisions, silent absence-of-config fallback is prohibited and must fail closed or use a versioned canonical Platform Control value.

## 4. Concurrency findings

The governed order assignment path has meaningful serialization:

- advisory lock by OperatorContext + order;
- order row lock;
- captain profile row lock;
- capacity recount after serialization;
- idempotency uniqueness.

However database indexes on active order/captain are ordinary indexes, not a complete substitute for the application locks. Therefore all other writers must be removed or made to use the same kernel; otherwise an alternate writer can bypass the serialization model.

## 5. Required restructuring sequence

1. Create typed dispatch target and one AssignmentCommandService.
2. Introduce canonical Captain↔Partner/Store/Branch/ServiceArea scopes from the domain identity model.
3. Make explicit OperatorContext mandatory; backfill/remove `'default'` semantic fallback.
4. Build one sovereign readiness proof used at list/offer/accept.
5. Add Workforce projection heartbeat/reconciliation semantics.
6. Route Special Requests through governed assignment kernel.
7. Migrate reassign/delivery-exception replacement paths to the same kernel.
8. Delete direct legacy assignment writers.
9. Add DB invariants for parent context, active assignment rules and typed target exclusivity.
10. Prove app-captain + control-panel + special-request workbench behavior end-to-end.

## 6. Mandatory tests before closure

- captain outside area/branch cannot be listed/offered/accepted;
- revoked/suspended Workforce captain cannot receive a new offer;
- stale Workforce projection feed fails according to explicit policy;
- two simultaneous offers to same order yield one active assignment;
- captain capacity remains correct under concurrent offers;
- special request assignment retains exact OperatorContext;
- cross-context reads/mutations are denied;
- special request writer uses same audit/idempotency/readiness kernel;
- reassignment cannot bypass scope/readiness/capacity;
- restart/offer-expiry recovery is deterministic;
- no remaining direct `INSERT INTO dsh_assignments` outside canonical kernel/migrations/tests.

## 7. Verdict

Dispatch is `OPEN` and contains **P0 authority/isolation gaps** despite a strong governed subpath. The correct fix is to make that governed pattern the sole mutation authority and delete/bury the parallel semantics after migration, not to add isolated checks to each legacy route.

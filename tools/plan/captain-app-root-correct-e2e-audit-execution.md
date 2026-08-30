# Captain App — Root-Correct End-to-End Live Execution Ledger

> **STATUS: OPEN — EXECUTION IN PROGRESS — NOT CLOSED**
>
> This file is an execution/evidence ledger only. It is **not** runtime/product authority and it must never substitute for the fix. Canonical truth remains in the actual code, contracts, data, runtime and service owners identified below.

## 0. Execution identity and governing law

- **Repository:** `bthwani2-boop/bthwani-suite-next`
- **Branch:** `f`
- **Target app / Audit Anchor:** `app-captain`
- **Pinned re-audit HEAD:** `171234de25992f251a80b838700afc9478c6b2d5`
- **Governing entry point:** `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`
- **Observed Orchestrator package revision:** `20`
- **Date:** `2026-08-29` — Asia/Aden
- **Closure state:** `OPEN`
- **ACTIVE_WORKSET:** not supplied. Branch `f` is moving from other direct sessions, therefore every product mutation must re-pin HEAD, detect collisions, and fail closed on overlapping material changes.

### Governing execution law

`AUDIT -> INSPECT -> DIAGNOSE -> ROOT GRAPH -> HIGHEST PROVEN EXECUTABLE ROOT -> ACTUAL SOURCE-OF-FIX -> MIGRATE/CUTOVER -> RECONCILE -> CLEAN/DELETE/FINISH -> VERIFY -> RE-AUDIT -> RE-RANK -> REPEAT -> EXACT FINAL CANDIDATE -> CLOSURE GATES`

Forbidden: Patch, Workaround, Fallback-as-fix, Symptom Fix, Half Migration, Parallel/Shadow Truth, local duplicated authority, documentation-only closure, green-only closure, unrelated scope expansion.

## 1. Selected closure objective

**SELECTED CLOSURE OBJECTIVE:** Eliminate every material Captain-app defect and parallel/shadow truth from the canonical DSH/Identity/Workforce/WLT-backed operational cone by making server-owned governed assignment/readiness/location/exception/PoD/return state the single executable truth, migrating every Captain/operator/client/partner consumer to that truth, deleting obsolete local rules and duplicate transports, and iterating through exact-candidate verification until no known material gap, stale path, unreachable legal transition, bypass, uncontracted wire field, duplicate owner, dead residue or unverified consumer remains.

## 2. Re-audit reset — stale evidence is not current truth

The previous ledger was rebuilt from an older snapshot and is no longer a valid live diagnosis. The following previously reported findings were re-proven against current code and reclassified:

| Historical finding | Current classification | Current evidence / action |
|---|---|---|
| Missing Captain `driver_assigned -> driver_arrived_store` command | **RESOLVED / STALE FINDING** | `use-captain-order-runtime.ts` now implements `confirmStoreArrival` with expected version, durable command identity and canonical status write. |
| Missing Captain `picked_up -> arrived_customer` command | **RESOLVED / STALE FINDING** | `confirmCustomerArrival` now exists and writes canonical `arrived_customer`. |
| Pickup jumped directly from `driver_assigned -> picked_up` | **RESOLVED / STALE FINDING** | Current runtime sequences arrival-at-store before pickup. |
| Captain command identity disappeared on restart | **RESOLVED / RE-PROVEN** | Captain command attempts are durably persisted and reconciled by actor/installation/assignment/fingerprint. |
| Local Captain readiness transport duplicated `/dsh/captain/me/readiness` | **RESOLVED + DELETE COMPLETED** | `services/dsh/frontend/app-captain/captain-readiness.api.ts` was deleted; the public Captain boundary now aliases canonical shared dispatch readiness instead of owning a second HTTP client/type. |
| Duplicate `app-captain/dispatch` surface residue | **RESOLVED / NO LONGER PRESENT** | Current tree no longer contains the previously observed duplicate path. |

**Rule:** historical findings above MUST NOT be used to justify new mutations unless independently re-proven on the current candidate.

## 3. Current Material Cone

`app-captain` is only the anchor. Material ownership spans:

1. `apps/app-captain/runtime/*` — Expo shell, Identity session, Workforce gate, readiness gate, push registration, routes/device capabilities.
2. `services/dsh/frontend/app-captain/*` — Captain screen/navigation/journey presentation.
3. `services/dsh/frontend/shared/dispatch/*` — dispatch transport, generated types, availability, assignment commands, location, exceptions, return-to-store and operator consumers.
4. `services/dsh/frontend/shared/delivery/*` — Captain runtime/binding/derived action policy and operational presentation.
5. `services/dsh/frontend/shared/delivery-proof/*`, media/PoD paths — proof capture/upload/submission/readback.
6. `services/dsh/frontend/shared/orders/*`, special requests and partner-fleet/store-courier paths where they materially drive Captain execution.
7. `services/dsh/contracts/dsh.openapi.yaml`, `components/schemas/*`, `paths/*`, and modular dispatch/proof/exception contracts.
8. `services/dsh/backend/internal/dispatch/*` — canonical assignment, delivery, allowed-actions, availability/capacity, financial eligibility, exceptions, returns, PoD and location state.
9. `services/dsh/backend/internal/http/*` — authenticated route and wire serialization boundary.
10. DSH persistence/migrations governing assignments, delivery, location, exceptions, PoD, COD and fleet membership.
11. Material cross-surface consumers: Control Panel operations/HR, Client tracking, Partner dispatch/handoff, WLT completion/COD and Identity/Workforce readiness.

No Captain-only local fix is sufficient where a higher contract/backend owner exists.

## 4. Current Root Graph — ranked by highest proven source-of-defect

### CR-1 — P0 — Generated governed assignment authority is structurally split

**PROVEN ROOT.** The generated OpenAPI root exposes `DshDispatchAssignment`, while the richer `GovernedDispatchAssignment` lives in `dsh.dispatch-governance.openapi.yaml` with client generation disabled. `dispatch.types.ts` therefore manually intersects the generated base assignment with governance fields and weakens required fields such as `operatorContextId`, `serviceAreaCode`, `priority` to optional values.

At runtime, governed Captain/operator handlers serialize additional fields including governance metadata plus `allowedActions` and staged `deliveryAddress`, but the generated canonical schema/path responses do not describe the full wire payload.

Consequences:

- generated client != actual governed wire model;
- frontend owns a shadow repair type;
- required server fields become optional in TypeScript;
- operator/Captain endpoints are documented as base assignment responses although they return governed responses;
- canonical `allowedActions` is dropped at the contract boundary;
- frontend re-creates lifecycle legality locally from `delivery.status`;
- `deliveryAddress` is an uncontracted wire field.

**Actual source-of-fix:** DSH OpenAPI generated schema + path response ownership first, then generated client and every governed consumer.

**Closure Unit CU-1:**

1. Create/export one generated canonical governed assignment schema from the main generated OpenAPI component graph.
2. Contract every field actually serialized by governed Captain/operator readback, including `allowedActions`; contract `deliveryAddress` only after its exact DTO/privacy shape is proven.
3. Point Captain/operator governed endpoint responses to governed response/list schemas; retain Client tracking on its intended client-safe/base projection.
4. Generate/materialize clients.
5. Replace the manual `DshDispatchAssignment & { governance... }` shadow intersection with generated types.
6. Give operator governed consumers the governed DTO explicitly; do not widen every client/partner consumer unnecessarily.
7. Migrate Captain action/presentation logic to server-projected `allowedActions` fail-closed.
8. Delete `delivery-status-flow.ts` and any equivalent local legality table only after all consumers have cut over.
9. Reconcile privacy: partner must not receive Captain live coordinates; client tracking must remain within intended visibility; staged `deliveryAddress` must not leak pre-stage fields.
10. Add contract/runtime negative tests proving generated schema and serialized payload cannot drift silently again.

**Do not mark CU-1 closed** until generated materialization, TypeScript typecheck/tests, backend tests, affected runtime tests and negative-space searches all pass on one exact SHA.

### CR-2 — P0/P1 — Captain GPS accuracy policy is client-only and bypassable

**PROVEN ROOT.** Captain frontend rejects samples above 100m accuracy and sends `accuracyMeters`; the HTTP handler decodes `accuracyMeters` but discards it when constructing `dispatch.PushLocationInput`. The domain validates latitude/longitude only. Therefore a noncanonical client can submit low-quality location and bypass the operational policy used to justify arrival actions.

**Actual source-of-fix:** server/domain location command contract, not a stronger frontend check.

**Closure Unit CU-2:**

1. Add `accuracyMeters` to canonical location request schema and backend domain input.
2. Enforce one server-owned accuracy rule at the mutation boundary; frontend may present/preflight but may not own enforcement.
3. Prove/define server-side timestamp freshness/future-skew semantics instead of trusting arbitrary `recordedAt`.
4. Preserve foreground-only/no-history policy and terminal-state location purge.
5. Verify arrival-at-store/customer and continuous location writes use the same canonical validated sample semantics.
6. Add backend DB/unit/HTTP tests for poor accuracy, stale/future timestamp, invalid coordinate, wrong actor/context, terminal assignment and valid sample.
7. Reconcile client tracking privacy and partner non-exposure after the change.

### CR-3 — P1 — Delivery-exception contract mixes domains and lags runtime

**PROVEN ROOT.** The canonical contract and runtime disagree in multiple directions:

- resolve HTTP supports `cancel_order`, while `DshResolveDeliveryExceptionRequest.action` omits it;
- backend `DeliveryException` readback includes `proofMediaRef` and `policyNextAction`, while generated response schema omits them;
- one global reason enum includes `handoff_shortage` / `handoff_mismatch`, although generic delivery exception domain validation does not accept those reasons;
- frontend compensates with custom unions/`Omit<>` overrides;
- generated `orderId` is nullable for special-request exceptions, while frontend currently lies by forcing it to non-null `string`.

**Actual source-of-fix:** endpoint-specific canonical schemas aligned to backend domain invariants.

**Closure Unit CU-3:**

1. Separate generic delivery-exception report reason type from store/captain handoff-exception reason type.
2. Add `cancel_order` to canonical resolve request action.
3. Contract `proofMediaRef` and `policyNextAction` with exact nullability/enums derived from runtime.
4. Preserve nullable `orderId` and `specialRequestId`; update consumers to branch on source truth instead of asserting an order always exists.
5. Cut all frontend exception types back to generated canonical types; delete manual enum/type repairs.
6. Verify captain report, handoff report, operator acknowledge/resolve, return-to-store and special-request exception paths end-to-end.

### CR-4 — P1 — Governed `deliveryAddress` is serialized but uncontracted and apparently unconsumed

**PROVEN CONTRACT GAP / CONSUMER TRACE STILL OPEN.** Governed dispatch marshalling reads `delivery_address_snapshot`, removes sensitive address/contact/instruction fields in early stages, then emits `deliveryAddress`. No direct frontend consumer of `assignment.deliveryAddress` was found in the current search, while Captain presentation still contains generic pickup/dropoff labels.

Two valid outcomes exist; one must be proven, not guessed:

- if this is intended Captain operational truth, contract the exact staged DTO and consume it in the correct execution/map surface with privacy tests; or
- if it has no legitimate consumer/purpose, delete the wire field and its query from governed marshalling.

Leaving an undocumented orphan payload is forbidden.

### CR-5 — P1 — Local lifecycle legality remains a shadow of canonical server `allowedActions`

**PROVEN CHILD OF CR-1.** Backend already computes `AssignmentAllowedActions(...)`, but frontend uses `delivery-status-flow.ts` and `resolveCaptainDeliveryAction(deliveryStatus)` to infer next legal operations. Even if they match today, they are two rule authorities and can drift independently.

**Treatment:** do not patch the local table. Close CR-1, consume canonical `allowedActions`, then delete the local legality source and prove no alternate action table remains.

### CR-6 — P1 — Remaining Captain E2E cones require re-audit after higher-root cutovers

These are material but must not pre-empt CR-1/CR-2/CR-3 unless a higher blocker is proven during execution:

- PoD/media capture -> upload -> proof issuance/submission -> operator review -> delivery completion -> client proof visibility -> WLT completion/outbox;
- exception -> acknowledge -> retry/reassign/return/cancel -> Captain return arrival -> partner return acceptance -> final terminal state;
- special-request assignments where `orderId` is absent;
- partner-fleet/store-courier mode and membership/revocation state;
- Captain availability/readiness/financial eligibility/COD capacity boundaries;
- support/chat/notification/deep-link routing;
- offline/restart/replay behavior for every mutation, not only assignment status;
- accessibility, RTL, focus/touch targets, loading/empty/error/offline/permission-denied/terminal states;
- dead/stale/orphan route, type, registry, facade and compatibility residues.

## 5. Current Source-of-Fix map

| Concern | Canonical owner | Known shadow/residue to eliminate |
|---|---|---|
| Governed assignment wire DTO | Main DSH generated OpenAPI + backend governed marshaller | manual governance intersection in `dispatch.types.ts`; non-generated parallel DTO |
| Legal Captain actions | backend `AssignmentAllowedActions` projection | `delivery-status-flow.ts` / status-derived legality table |
| Assignment/delivery state mutation | backend dispatch domain | any UI/local state claiming persisted transition authority |
| Captain readiness | canonical shared DSH readiness endpoint/controller | **duplicate app-local readiness transport deleted** |
| Location validity | backend location mutation boundary | client-only 100m enforcement |
| Generic delivery exception | backend delivery-exception domain + endpoint-specific OpenAPI | global mixed reason type + frontend repair unions |
| Handoff exception | canonical handoff endpoint/domain | sharing generic report type without endpoint constraints |
| PoD completion | backend proof domain/review lifecycle | local “delivery confirmed” semantics that are navigation only |
| Finance/COD | WLT + governed DSH integration/outbox | any Captain-side balance/completion write |
| Workforce/identity access | Identity + Workforce | app-local actor/profile truth |

## 6. Completed mutations in this execution wave

### DONE-1 — Delete duplicate Captain readiness transport

Deleted:

- `services/dsh/frontend/app-captain/captain-readiness.api.ts`

Cutover:

- `services/dsh/frontend/app-captain/index.ts` preserves the public API by aliasing `fetchCaptainOperationalReadiness` and `CaptainOperationalReadiness` directly to the canonical shared dispatch implementation/type.

Relevant commits in this execution wave:

- `505c0cfd545e4e70f53a59b534f25ef790df1e91` — delete duplicate readiness API.
- `ad33ac5b7ec169237d0a49de29e3d2ef9a9e5c3b` — preserve public Captain boundary through canonical shared alias.

This item is **CLOSED**, subject to final exact-candidate regression verification with the whole Captain cone.

## 7. Mandatory execution order

1. **CU-1 — canonical governed assignment contract/generated-client cutover.**
2. Re-audit/rank exposed failures; if no higher root appears, **CU-2 — server-owned location validation**.
3. Re-audit/rank; then **CU-3 — endpoint-correct exception contracts**.
4. Resolve **CR-4 deliveryAddress** by proven consumer purpose or delete it.
5. Re-audit PoD/return/special-request/partner-fleet/finance/support/offline journeys against the new canonical DTOs/actions.
6. Cleanup/delete every obsolete type, local rule, helper, compatibility path, dead facade, stale test fixture and registry residue exposed by migration.
7. Exact-candidate verification and fixed-point re-audit.

No lower surface polish may be used to hide a higher contract/server root.

## 8. Verification and closure gates

At minimum, the exact final candidate must prove all applicable gates on the same SHA:

### Contracts / generation

- canonical OpenAPI materialization/generation succeeds;
- generated clients contain exactly one governed assignment authority;
- path responses match actual Captain/operator/client/partner serializers;
- no frontend manual `Omit`/intersection exists to repair known contract drift;
- no uncontracted material runtime field remains.

### Backend / persistence

- DSH Go unit/integration/DB tests for dispatch, location, exceptions, returns and PoD pass;
- optimistic concurrency/idempotency/replay remain correct;
- wrong actor, wrong OperatorContext, stale version, invalid state and terminal-state negative paths fail closed;
- location privacy/purge and address redaction are proven.

### Captain frontend/runtime

- typecheck and affected tests pass after generated cutover;
- assignment offer/accept/decline/restart flows pass;
- legal action availability is driven by canonical server projection;
- store arrival -> pickup -> customer arrival -> PoD is reachable without bypass;
- offline/retry/restart behavior preserves command identity and canonical readback;
- permission-denied/location-disabled/poor-accuracy/error/empty/loading/terminal states are explicit;
- navigation/deep links cannot reach illegal mutation state.

### Cross-surface reconciliation

- Control Panel assignment/decision/exception/proof flows remain correct;
- Client tracking sees only intended assignment/location/proof truth;
- Partner tracking/handoff/return paths remain privacy-correct;
- WLT/COD completion and release outboxes remain exactly-once/idempotent;
- Workforce/Identity readiness remains the access authority.

### Product/UX/A11y/RTL finishing

- Arabic/RTL layout and semantic reading order are correct;
- touch targets, roles/labels, disabled/loading states and error recovery are verified;
- no misleading action label implies a persisted mutation that is only navigation/local state;
- no placeholder/mock/fake production path is present in the material cone.

### Negative-space cleanup

Repository searches must prove absence of:

- deleted readiness API/imports;
- manual governed assignment shadow type after CU-1;
- `delivery-status-flow.ts` or equivalent duplicate legality owner after cutover;
- stale exception enum/type repairs after CU-3;
- undocumented/orphan `deliveryAddress` payload after CR-4 resolution;
- dead routes, duplicate registries, obsolete compatibility facades and superseded tests within the affected cone.

## 9. CLOSED is forbidden until fixed point

`CLOSED` may be written only when:

1. every current root above is `CLOSED` or `N/A_PROVEN`;
2. every exposed child finding from the migrations is closed;
3. all writers/readers/consumers/handoffs are reconciled;
4. migrations/cutovers/deletions are complete — no half migration;
5. one exact final SHA passes the required contract/backend/frontend/runtime/cross-surface gates;
6. a fresh re-audit on that exact SHA finds **zero known material root/gap/residue/parallel truth** in the Captain material cone.

**CURRENT VERDICT: OPEN.** The current highest proven executable root is **CR-1: the split generated/non-generated governed assignment contract that drops canonical server legality/read-model fields and forces frontend shadow types/rules. Execution must continue from that source-of-fix before lower-layer finishing.**

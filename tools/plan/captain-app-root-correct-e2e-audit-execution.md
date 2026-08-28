# Captain App — Root-Correct End-to-End Audit & Execution Ledger

> **STATUS: OPEN — NOT CLOSED**
>
> This file is an execution ledger and evidence index only. It is **not** a product/runtime authority and it is **not** closure proof. Canonical product truth remains in the actual source-of-fix paths identified below.

## 0. Execution identity

- **Repository:** `bthwani2-boop/bthwani-suite-next`
- **Branch:** `f`
- **Target app / audit anchor:** Captain app (`apps/app-captain` + its materially linked canonical cone)
- **Governing entry point:** `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`
- **Observed orchestrator package revision:** `20`
- **Audit start HEAD:** `ef90675f04f39ae1cce12bc19f875a7e6b15d93c`
- **Pre-write HEAD:** `ef90675f04f39ae1cce12bc19f875a7e6b15d93c`
- **Date:** `2026-08-29` (Asia/Aden)
- **Closure state:** `OPEN`
- **ACTIVE_WORKSET:** not supplied by the caller. No open pull request targeting `f` was found during this audit, and HEAD was stable across the audit window, but direct concurrent sessions/worktrees cannot be proven absent from GitHub alone. Therefore the explicitly requested audit-ledger write is permitted, while material product mutation remains subject to the Orchestrator concurrency/collision gate.

## 1. Selected closure objective

**SELECTED CLOSURE OBJECTIVE:** Close the Captain app’s complete material delivery/dispatch cone root-correctly from canonical DSH assignment and delivery state through Captain commands, UX states, location, pickup/customer-arrival, PoD, exceptions/returns, operator readback, client/partner projections and final verification, eliminating every unreachable transition, invalid action, shadow/local lifecycle truth and stale/bypass path without weakening the backend state machine.

## 2. Anchor is not authority

`apps/app-captain` is a runtime/composition shell, not the primary authority for Captain delivery behavior. The audited chain proves the material frontend authority is distributed through:

- `apps/app-captain/runtime/*` — Expo/runtime shell and route composition.
- `services/dsh/frontend/app-captain/*` — Captain-specific journey/rendering surface.
- `services/dsh/frontend/shared/delivery/*` — Captain binding, inbox, lifecycle actions, location and runtime commands.
- `services/dsh/frontend/shared/dispatch/*` — shared DSH dispatch API/contracts consumed by Captain, Control Panel, Client and Partner projections.
- `services/dsh/frontend/shared/delivery-proof/*` and `shared/media/pod/*` — PoD submission/review/media path.
- `services/dsh/backend/internal/dispatch/*` — canonical dispatch/delivery state machine, assignment governance, proof, exceptions, returns, availability/capacity and financial eligibility.
- `services/dsh/database/migrations/*dispatch*`, `*delivery*`, `*captain*` — persisted state and integrity constraints.
- `services/dsh/frontend/control-panel/operations/*` — operator assignment management, exceptions and proof review.
- `services/dsh/frontend/app-client/*` — client delivery tracking/proof consumer.
- `services/dsh/frontend/app-partner/*` — partner dispatch tracking/handoff consumer.
- Identity/session, workforce/readiness, WLT completion/outbox, runtime transport/location permissions and media are in-cone where materially exercised by Captain journeys.

No closure is valid if only `apps/app-captain` is changed.

## 3. Material cone inventory

### 3.1 Captain runtime/composition

Observed Captain runtime routes/surfaces include the operational areas for orders, map/execution, proof, support, account and notifications. The local runtime `src/features` is not the business authority; it is thin relative to the DSH shared feature layer.

### 3.2 Captain surface and journey layer

Material files proven in the current branch include:

- `services/dsh/frontend/app-captain/DshCaptainSurface.tsx`
- `services/dsh/frontend/app-captain/useDshCaptainSurfaceModel.ts`
- `services/dsh/frontend/app-captain/DshCaptainOrderJourneyRenderer.tsx`
- `services/dsh/frontend/app-captain/DshCaptainRouteRenderer.tsx`
- `services/dsh/frontend/app-captain/orders/OperationalCaptainExecutionScreen.tsx`
- `services/dsh/frontend/app-captain/orders/DshCaptainPoDSubmissionScreen.tsx`
- `services/dsh/frontend/app-captain/orders/DshCaptainOrdersScreen.tsx`
- `services/dsh/frontend/app-captain/orders/CaptainAssignmentOfferPanel.tsx`
- `services/dsh/frontend/app-captain/orders/Order*Section.tsx`
- `services/dsh/frontend/app-captain/orders/*Support*`
- `services/dsh/frontend/app-captain/account/*`
- `services/dsh/frontend/app-captain/finance/WltCaptainFinanceScreen.tsx`
- `services/dsh/frontend/app-captain/captain-navigation.ts`
- `services/dsh/frontend/app-captain/captain-readiness.api.ts`

`useDshCaptainSurfaceModel.ts` delegates directly to `shared/delivery/captain-surface.binding.ts`, proving that changing the surface model alone would be a symptom-level fix.

### 3.3 Canonical Captain frontend binding/runtime

Material files:

- `services/dsh/frontend/shared/delivery/captain-surface.binding.ts`
- `services/dsh/frontend/shared/delivery/delivery.actions.ts`
- `services/dsh/frontend/shared/delivery/use-captain-order-runtime.ts`
- `services/dsh/frontend/shared/delivery/captain-inbox.model.ts`
- `services/dsh/frontend/shared/delivery/captain-inbox.mapper.ts`
- `services/dsh/frontend/shared/delivery/captain-inbox.fulfillment.ts`
- `services/dsh/frontend/shared/delivery/captain-availability.model.ts`
- `services/dsh/frontend/shared/delivery/captain-gps.model.ts`
- `services/dsh/frontend/shared/delivery/captain-profile.model.ts`
- `services/dsh/frontend/shared/delivery/captain-service-mode.model.ts`
- `services/dsh/frontend/shared/delivery/captain.contract.ts`
- `services/dsh/frontend/shared/delivery/captain.state.ts`
- `services/dsh/frontend/shared/delivery/captain.derived.ts`
- `services/dsh/frontend/shared/delivery/captain.derived.policy.ts`

### 3.4 Shared dispatch authority and cross-surface consumers

`services/dsh/frontend/shared/dispatch/dispatch.api.ts` is a material cross-surface contract/transport node. It exposes Captain assignment, accept/decline, delivery status, location, PoD and exception paths, while also exposing operator dispatch, client tracking and partner tracking. Therefore a Captain lifecycle change must reconcile all projections rather than creating a Captain-only truth.

Material cross-surface consumers include at minimum:

- Control Panel: `services/dsh/frontend/control-panel/operations/DispatchOperationsPanel.tsx`
- Control Panel: `operations/DeliveryProofReviewScreen.tsx`
- Control Panel: `operations/ExceptionsEscalationsScreen.tsx`
- Control Panel: `operations/OrderJourneyDispatchAssignmentScreen.tsx`
- Control Panel: `operations/OrderJourneyLiveOrdersScreen.tsx`
- Control Panel: `dashboard/DispatchTrackingAlertsPanel.tsx`
- Control Panel HR/readiness: `hr/CaptainCreateView.tsx`, `hr/CaptainDetailView.tsx`, `hr/CaptainFleetMembershipsPanel.tsx`
- Client delivery tracking/proof consumers under `services/dsh/frontend/app-client`
- Partner dispatch/handoff tracking consumers under `services/dsh/frontend/app-partner`

The Control Panel assignment screen is not a mock shell: its controller performs real cancellation/reassignment/readback and maintains a durable decision history. This must remain compatible with Captain lifecycle corrections.

### 3.5 Backend canonical state machine

Canonical backend source-of-fix:

- `services/dsh/backend/internal/dispatch/dispatch.go`
- `services/dsh/backend/internal/dispatch/delivery_proof.go`
- `services/dsh/backend/internal/dispatch/delivery_exceptions.go`
- `services/dsh/backend/internal/dispatch/assignment_governance.go`
- `services/dsh/backend/internal/dispatch/captain_availability.go`
- `services/dsh/backend/internal/dispatch/availability_capacity.go`
- `services/dsh/backend/internal/dispatch/financial_eligibility.go`
- `services/dsh/backend/internal/dispatch/store_captain_handoff.go`

The backend lifecycle observed in `dispatch.go` is intentionally strict:

```text
Order ready_for_pickup
  -> assignment offered + delivery assigned
  -> Captain accepts
  -> assignment accepted + delivery driver_assigned
  -> driver_arrived_store
  -> picked_up
  -> arrived_customer
  -> delivery proof / review
  -> delivered (or exception/return lifecycle)
```

`UpdateDeliveryStatus` does **not** accept arbitrary jumps. It enforces:

```text
driver_assigned       -> driver_arrived_store
driver_arrived_store -> picked_up
picked_up             -> arrived_customer
```

`delivery_proof.go` requires an accepted assignment and delivery state `arrived_customer` before issuing/submitting delivery proof. This is a canonical safety/integrity rule and must not be weakened to accommodate frontend gaps.

### 3.6 Persistence/integrity cone

Material migrations already present include, among others:

- `dsh-007_dispatch.sql`
- `dsh-039_dispatch_captain_location.sql`
- `dsh-079_dispatch_assignment_governance.sql`
- `dsh-091_pickup_cancellation_state.sql`
- `dsh-092_delivery_exception_lifecycle.sql`
- `dsh-093_delivery_return_lifecycle.sql`
- `dsh-095_store_captain_outbound_handoff.sql`
- `dsh-096_delivery_proof_media_integrity.sql`
- `dsh-097_dispatch_location_integrity.sql`
- `dsh-099_captain_dispatch_financial_eligibility.sql`
- `dsh-117_delivery_proof_completion.sql`
- `dsh-118_delivery_proof_location_snapshot.sql`
- `dsh-119_delivery_pin_hardening.sql`
- `dsh-138_dispatch_capacity_wlt_decoupling.sql`
- `dsh-139_delivery_proof_recipients.sql`
- `dsh-140_delivery_media_governance.sql`
- `dsh-141_delivery_exceptions_policy.sql`
- `dsh-976_captain_fleet_memberships.sql`
- `dsh-1010_dispatch_cod_reservation_release_outbox.sql`
- `dsh-1030_captain_cod_legacy_write_fence.sql`
- `dsh-1049_delivery_proof_review_idempotency.sql`
- `dsh-1055_dispatch_assignment_context_integrity.sql`

The existing schema/migration surface is evidence that lifecycle integrity is deliberate; a frontend bypass is not an acceptable treatment.

## 4. Root graph

```text
Identity / Workforce / Captain readiness & fleet eligibility
                 |
                 v
DSH Order ready_for_pickup
                 |
                 v
Operator governed assignment writer
(Control Panel / backend assignment governance)
                 |
                 v
[dsh assignment + delivery persisted authority]
                 |
      +----------+------------------+
      |                             |
      v                             v
Captain assignment API        Operator readback / decisions
      |
      v
shared/dispatch/dispatch.api.ts
      |
      v
captain-inbox.model.ts
      |
      v
captain-surface.binding.ts
      |
      +--> use-captain-order-runtime.ts ----> canonical status writer
      |                                         |
      +--> delivery.actions.ts                   v
      |                                    backend dispatch.go
      +--> location / availability               |
      |                                         v
      +--> PoD controller ---------------> delivery_proof.go
      |                                         |
      v                                         v
Captain journey/renderers                proof review / completion
      |                                         |
      v                                         +--> WLT completion/outbox
apps/app-captain runtime shell                  |
                                                +--> client tracking/proof projection
                                                +--> partner tracking/handoff projection
                                                +--> operator exceptions/returns/readback
```

The highest currently proven executable root is **Captain lifecycle command/presentation parity with the existing canonical backend delivery state machine**. The backend state machine itself is not the defect demonstrated by this audit.

## 5. Proven material findings — ranked

### R1 — P0 / BLOCKER — Captain delivery lifecycle is unreachable end-to-end

**Evidence chain:**

1. After Captain accepts an offered assignment, backend canonical state becomes `driver_assigned`.
2. Backend only permits `driver_assigned -> driver_arrived_store`.
3. Captain `use-captain-order-runtime.ts` exposes `acceptTask`, `declineTask`, `confirmPickup`, `pushLocation`, and failure/exception behavior, but no command that writes `driver_arrived_store`.
4. Captain `confirmPickup()` directly calls `updateDeliveryStatus(..., 'picked_up', ...)`.
5. Backend only permits `picked_up` from `driver_arrived_store`.
6. Therefore the normal post-accept Captain path attempts an invalid state jump and is rejected by canonical backend integrity.

**Negative-space confirmation:** no Captain app/shared lifecycle action was found that owns the missing `driver_arrived_store` transition.

**Impact:** pickup cannot be completed through the normal Captain journey without an out-of-band writer or bypass. Any such external bypass would itself be Parallel/Shadow Truth and is forbidden.

**Correct source-of-fix:** Captain shared lifecycle command/presenter/action model, preserving the backend transition contract.

**Forbidden treatment:** loosen backend to allow `driver_assigned -> picked_up`.

### R2 — P0 / BLOCKER — `arrived_customer` is also unreachable, making canonical PoD precondition unreachable

**Evidence chain:**

1. Backend only permits `picked_up -> arrived_customer`.
2. `delivery_proof.go` requires delivery state `arrived_customer` before proof issue/submission.
3. Captain runtime exposes no `arriveCustomer` / `arrived_customer` writer.
4. Captain journey can open the PoD route for an accepted active assignment without proving `arrived_customer`.
5. The PoD subsystem itself is real and implemented (`useCaptainDeliveryProofController`, media upload/submission, operator review), but the Captain journey cannot establish its canonical entry precondition.

**Impact:** proof UI can be reachable while proof submission is backend-invalid; accepted proof/delivery completion is consequently unreachable from the normal Captain lifecycle.

**Correct source-of-fix:** same canonical lifecycle parity root as R1; do not duplicate proof logic.

### R3 — P0 / ROOT-DESIGN — Captain operational action model is not derived from canonical delivery state

`OperationalCaptainExecutionScreen.tsx` displays generic `تأكيد الاستلام` and `تأكيد التسليم`/`فتح إثبات التسليم` actions. Its material delivery status is not used to derive the exact next legal transition. In `DshCaptainOrderJourneyRenderer.tsx`, `activeDeliveryStatus` is used to enable the handoff-exception form at `driver_arrived_store`, but it does not produce a complete legal-action matrix.

This creates a UI/action model that is structurally simpler than the backend state machine and is the reason R1/R2 can exist.

**Required canonical behavior:** actions must be derived fail-closed from backend delivery status, e.g.:

```text
driver_assigned       => Confirm arrival at store
driver_arrived_store => Confirm pickup (subject to handoff readback)
picked_up             => Confirm arrival at customer
arrived_customer      => Open/submit PoD or report exception
returning_to_store    => Confirm return arrival according to exception lifecycle
terminal/review states=> no illegal forward action
```

The exact labels, permissions and UX may vary, but the transition authority may not.

### R4 — P1 / INTEGRATION — local `confirmDelivery` semantics are not a delivery-state mutation

`delivery.actions.ts` currently treats `confirmDelivery()` as local PoD readiness/navigation logic rather than a backend lifecycle transition. This is acceptable only if a prior canonical `arrived_customer` command has already succeeded. In the current graph it has not.

**Treatment:** rename/reframe local semantics if needed after adding canonical arrival transition, so no API/action name implies a persisted state transition when it is only local navigation/readiness.

### R5 — P1 / GATING — PoD route access is assignment-gated but not sufficiently delivery-state-gated

`DshCaptainOrderJourneyRenderer.tsx` blocks map/pickup/PoD routes when there is no unique accepted operational assignment, which is good. However, PoD route access is not proven to require `arrived_customer` before rendering the submission surface.

**Treatment:** derive route/action eligibility from the canonical lifecycle projection. Do not rely on backend rejection as normal UX control flow.

### R6 — P1 / CROSS-SURFACE RECONCILIATION — status correction must preserve operator/client/partner projections

The shared dispatch API serves Captain, operator, client and partner consumers. The backend specifically treats partner tracking as a reference view and protects live Captain coordinates from partner serialization, while client tracking has delivery visibility. Any lifecycle correction must verify:

- operator assignment/readback remains coherent;
- operator PoD review remains coherent;
- client tracking receives only intended state/location/proof changes;
- partner tracking remains privacy-restricted and does not gain Captain live coordinates;
- exception and return-to-store state remains visible to the correct surfaces;
- WLT completion/outbox remains exactly-once after proof acceptance/completion.

No defect is asserted here beyond the need for reconciliation; this is a mandatory blast-radius gate.

### R7 — P1 / UX-A11Y-RTL VERIFICATION REQUIRED — state-specific UX must be completed with the lifecycle fix

Current Captain UI contains Arabic/RTL-oriented layout and explicit loading/error/readback states in several areas, including operational GPS and handoff exception handling. Therefore this is not a claim that RTL/accessibility are globally absent.

However, the missing lifecycle stages mean the product currently lacks the complete state-specific UX for at least:

- approaching/arriving at store;
- arrived at store / pickup eligibility;
- en route to customer;
- arrived at customer / proof eligibility;
- conflict/version mismatch during transition;
- offline/retry semantics for non-queueable state mutations;
- disabled/blocked action explanation when a transition is not legal.

Every new/changed action must preserve RTL, screen-reader semantics, disabled/busy state, error recovery, no accidental double-submit, and route consistency.

## 6. Findings explicitly NOT claimed

To prevent scope inflation and false positives:

- PoD submission is **not** missing. `useCaptainDeliveryProofController` and media-assisted submission exist.
- Operator proof review is **not** missing from the observed cone.
- Operator assignment cancellation/reassignment/readback is **not** missing from the observed cone.
- Backend strict transition validation is **not** classified as a defect; it is canonical integrity to preserve.
- Existing Arabic/RTL work is **not** discarded; only missing lifecycle-specific UX must be added/reconciled.
- No unrelated app/service is in scope unless a concrete writer/reader/consumer/handoff relationship to Captain is proven.

## 7. Root-correct execution contract

### Wave 0 — Collision/concurrency gate

Before material product mutation:

1. Re-read `f` HEAD.
2. Reconcile declared `ACTIVE_WORKSET` if/when available.
3. Detect overlapping changed paths/roots against any active session/worktree evidence available to the executor.
4. Preserve one integration authority.
5. If collision cannot be excluded for a root, do not race-write it; re-rank to another proven executable root or coordinate ownership.

### Wave 1 — Canonical Captain lifecycle commands

At `services/dsh/frontend/shared/delivery/use-captain-order-runtime.ts` and the shared dispatch contract boundary:

- add explicit canonical command capability for `driver_arrived_store`;
- retain pickup as `driver_arrived_store -> picked_up` only;
- add explicit canonical command capability for `arrived_customer`;
- use existing optimistic concurrency (`expectedVersion`) and idempotency/correlation conventions;
- read-after-write/refresh using existing canonical patterns;
- classify conflict/offline/error states without silently advancing local state;
- do not add a second lifecycle store or local shadow status.

Prefer a single state-aware transition primitive internally if it reduces duplication without hiding legality; expose domain-named actions to the Captain UI.

### Wave 2 — Action/binding/presenter lifecycle parity

Update the actual shared owner chain rather than patching the screen:

- `delivery.actions.ts`
- `captain-surface.binding.ts`
- derived/presenter model and contracts that feed Captain renderers

Required outcome:

- next legal action is derived from authoritative delivery status;
- illegal actions are absent/disabled fail-closed;
- local phase/navigation cannot overrule persisted delivery state;
- successful mutation refreshes canonical inbox/assignment projection;
- conflict causes refresh/reconciliation, not local force-progress.

### Wave 3 — Captain journey/UX state completion

Reconcile:

- `DshCaptainOrderJourneyRenderer.tsx`
- `OperationalCaptainExecutionScreen.tsx`
- route renderer/navigation
- order panels/details/map/PoD entry

Required UX sequence:

```text
accepted / driver_assigned
  -> واضح: الوصول إلى المتجر
  -> driver_arrived_store
  -> عهدة/جاهزية + تأكيد الاستلام
  -> picked_up
  -> التوجه للعميل + تحديث الموقع
  -> arrived_customer
  -> إثبات التسليم أو الاستثناء
  -> pending_review / accepted / rejected / return flow
```

Every stage must have loading/error/conflict/retry/blocked states as materially applicable. Avoid generic buttons that can express an illegal transition.

### Wave 4 — PoD/exception/return reconciliation

Do **not** reimplement PoD. Reconcile the existing chain:

- `shared/delivery-proof/*`
- `shared/media/pod/*`
- `DshCaptainPoDSubmissionScreen.tsx`
- backend `delivery_proof.go`
- operator `DeliveryProofReviewScreen.tsx`
- `delivery_exceptions.go`
- return-to-store and store/captain handoff paths

Prove:

- PoD entry only after `arrived_customer`;
- PIN/photo/signature/composite behavior remains governed;
- pending review does not falsely mark delivery terminal;
- accepted proof performs completion exactly once;
- rejected proof permits a governed retry without duplicate completion;
- exception freezes/redirects lifecycle correctly;
- return-to-store remains a separate governed path rather than a normal-delivery shortcut.

### Wave 5 — Cross-surface projections and privacy

Verify exact consumers:

- Control Panel dispatch operations/decision history;
- Control Panel exception handling;
- Control Panel delivery proof review;
- Client order tracking and accepted proof visibility;
- Partner dispatch tracking/handoff view;
- WLT completion/outbox;
- notifications/support where status transitions generate/read events.

Explicit negative-space proof: partner-facing tracking must not receive Captain live GPS coordinates if backend contract prohibits them.

### Wave 6 — Tests and runtime verification

Minimum material verification matrix:

| Journey / Gate | Required proof |
|---|---|
| Offer -> accept | assignment accepted + delivery `driver_assigned` |
| Arrive store | `driver_assigned -> driver_arrived_store`, OCC/idempotency correct |
| Pickup | only `driver_arrived_store -> picked_up` |
| Arrive customer | only `picked_up -> arrived_customer` |
| Premature pickup | rejected and UI cannot normally issue it |
| Premature PoD | route/action blocked; backend remains fail-closed |
| PoD PIN accepted | expected accepted/completion semantics |
| PoD media pending review | delivery remains non-terminal until operator decision |
| PoD rejection | governed retry, no duplicate completion |
| Location | active-state push only, accuracy/privacy policy preserved |
| Exception | forward delivery transition blocked/redirected per policy |
| Return | return state machine and store receipt remain coherent |
| Reassign/cancel | operator readback and Captain inbox reconcile without stale active task |
| Client tracking | intended state/location projection only |
| Partner tracking | intended reference projection, no forbidden live coordinates |
| WLT completion | exactly-once durable completion/outbox behavior |
| Auth/readiness | unauthenticated/ineligible Captain cannot operate |
| RTL/A11y | stage actions/readbacks remain usable and correctly announced |

Run the narrowest authoritative checks first, then affected/full candidate verification according to the repository’s canonical CI interface. Test success on stale SHA is not closure proof.

### Wave 7 — Cleanup / deletion / negative space

After canonical cutover, remove any path made obsolete by the corrected lifecycle model, including if discovered during execution:

- direct or UI-generated `driver_assigned -> picked_up` shortcut assumptions;
- local-only delivery-phase truth that can disagree with backend delivery status;
- duplicated status labels/policies that contradict the canonical mapping;
- stale route gating that allows PoD before `arrived_customer`;
- compatibility bypasses/fallbacks added during development;
- dead handlers/tests/docs that encode the old two-action lifecycle.

Deletion is required only when a path is proven obsolete; do not delete active consumers merely to simplify the audit.

## 8. Candidate closure gates

`CLOSED` is forbidden until one exact final candidate proves all of the following:

1. **Exact SHA identity:** all evidence belongs to the same final candidate SHA.
2. **Canonical lifecycle parity:** Captain can perform every required legal transition with no illegal shortcut.
3. **End-to-end continuity:** assignment -> pickup -> customer arrival -> PoD -> completion/exception is executable through real writers/readers.
4. **No Parallel/Shadow Truth:** backend status remains the lifecycle authority; UI derives behavior from it.
5. **Concurrency/collision safety:** active work ownership is reconciled for the mutated roots.
6. **Cross-surface reconciliation:** operator/client/partner/WLT consumers pass their material contracts.
7. **Data/integrity:** OCC/idempotency/invariants and migration constraints are preserved.
8. **UX/Product:** every canonical stage has coherent action/readback/error/blocked behavior.
9. **Accessibility/RTL:** materially affected controls and state messages are verified.
10. **Runtime:** auth, readiness, location permissions/accuracy, network/offline behavior and media flows are verified where applicable.
11. **Negative space:** no old bypass, stale route, dead duplicate or hidden fallback remains in the material cone.
12. **CI/tests:** required authoritative checks pass on the exact candidate.
13. **Re-audit fixed point:** re-running root discovery on the candidate produces no remaining known material executable root inside the Captain cone.

## 9. Current gate result

| Gate | Current result | Reason |
|---|---|---|
| Governing Orchestrator read | PASS | revision 20 read from branch `f` |
| Branch identity | PASS | audit and pre-write HEAD both `ef90675f...` |
| App-as-anchor / cone expansion | PASS | shell -> shared Captain -> dispatch backend/data -> cross-surface consumers traced |
| Root Graph | PASS for current evidence | highest proven root identified |
| Canonical lifecycle executable | **FAIL** | missing Captain `driver_arrived_store` and `arrived_customer` writers/actions |
| PoD canonical entry reachable | **FAIL** | `arrived_customer` cannot be established through current Captain command graph |
| UI legal-action parity | **FAIL** | generic pickup/delivery actions not fully derived from canonical delivery state |
| ACTIVE_WORKSET collision proof | **UNPROVEN** | caller did not supply active workset; GitHub proves no open PR to `f`, not absence of direct sessions |
| Exact final candidate tests | **NOT RUN / NOT PROVEN** | no corrected candidate exists yet |
| Fixed point | **FAIL** | material P0 roots remain |
| Closure | **OPEN** | closure gates not satisfied |

## 10. Immediate execution rank

1. **P0:** Establish canonical Captain `driver_arrived_store` transition capability with OCC/idempotency and readback.
2. **P0:** Establish canonical Captain `arrived_customer` transition capability.
3. **P0:** Replace generic operational action model with backend-status-derived legal action model across binding/presenter/journey UI.
4. **P1:** Gate PoD route/action on canonical `arrived_customer` and reconcile existing proof controller/readback.
5. **P1:** Reconcile exception/return path with the new action model.
6. **P1:** Verify Control Panel, Client, Partner and WLT consumers/projections/privacy.
7. **P1:** Complete affected UX/A11y/RTL/error/conflict states and tests.
8. **P1:** Delete stale/bypass assumptions and prove negative space.
9. **FINAL:** Build exact candidate, run authoritative verification, re-audit/re-rank until fixed point.

## 11. Mutation rule for the next loop

The next material code change must start at the proven source-of-fix, not at the symptom:

```text
shared Captain lifecycle command contract/runtime
  -> shared actions/binding/presenter
  -> Captain journey/renderers
  -> existing PoD/exception consumers
  -> cross-surface reconciliation
  -> tests/runtime/CI
  -> re-audit
```

Do not patch `OperationalCaptainExecutionScreen` alone. Do not weaken `dispatch.go`. Do not manufacture a second state machine in the app. Do not claim closure from a plan or from a subset of green tests.

---

**CURRENT VERDICT: OPEN.** The deepest proven blocker is a structural Captain/frontend lifecycle parity gap against the existing canonical DSH delivery state machine. The correct treatment is a full root-correct lifecycle cutover through the shared Captain command/action/presentation chain, followed by cross-surface reconciliation, cleanup, exact-candidate verification and fixed-point re-audit.
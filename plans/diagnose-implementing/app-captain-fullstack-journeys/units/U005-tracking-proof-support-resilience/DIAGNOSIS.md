# U005 — tracking-proof-support-resilience

## Objective
Close active delivery execution, foreground location, proof-of-delivery, exception/support/rescue, notifications and recovery without leaking protected data or inventing local truth.

## Truth owner
DSH owns delivery/status/location-reference/support/incident/rescue operational truth; media service owns governed proof assets; WLT is read-only from rescue.

## Diagnosis
This unit exists because the Captain path cannot be closed from a single screen. It must trace the authoritative write/read owner through shared adapters, contracts, backend state, persistence and only the downstream surfaces that are directly affected. The package deliberately distinguishes **absence of candidate-bound proof** from a proven code defect: where current source already implements a behavior, execution first verifies it against the applicable Product Truth and changes code only when the evidence reveals a mismatch. Where a concrete mismatch is already visible—most notably Captain commission readback—the task names that gap directly.

The unit must preserve trusted actor context, idempotency/correlation, legal state transitions, refresh/restart readback and strict tenant/actor isolation. UI state, local storage, derived planning files and historical evidence cannot become authoritative operational or financial truth. Any implementation that changes a canonical contract must migrate every Captain-specific consumer and rerun invalidated evidence on the same final candidate.

## Planned work
- Verify active task tracking/status/PoD path: Captain runtime sends foreground location only in active states and supports delivery status/PoD, but static code does not prove OS lifecycle, retry queue, media binding, tracking freshness or privacy. Target: Active task survives refresh/restart; location/proof/status are retry-safe and privacy-bounded; client tracking is current without exposing internal Captain data.
- Close Captain support/incident/order-rescue convergence: Support Product Truth is discovery and requires assigned-order ownership, internal-note isolation, idempotent incident/rescue transitions and append-only audit. Target: Captain support is available only for assigned orders and converges with operator incident/rescue state; no local-only rescue or financial mutation exists.

## Boundaries
Affected surfaces: app-captain, app-client, app-partner, control-panel. Dependencies: U004. Journeys/capabilities: Captain active delivery tracking, Captain PoD and delivery exception, SUPPORT_INCIDENTS_ORDER_RESCUE, J105 return-to-store consequences. Unrelated sections remain out of scope unless a new direct dependency is proven and `COVERAGE.json` is updated before implementation.

## Closure rule
Do not mark this unit done from static inspection alone when persisted, cross-surface, security, runtime or financial behavior is involved. Execute the linked verification checks after the final relevant write and record exact resulting SHA/evidence in `RESULT.json`.

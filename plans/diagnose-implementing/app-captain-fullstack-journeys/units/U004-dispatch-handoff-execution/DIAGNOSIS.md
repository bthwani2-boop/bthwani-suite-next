# U004 — dispatch-handoff-execution

## Objective
Close the governed order path from offer through accept/decline, store arrival and bilateral custody to legal pickup/reassignment with cross-surface readback.

## Truth owner
DSH owns assignment, delivery lifecycle, store↔Captain custody and operational exceptions; surfaces render and issue authorized commands only.

## Diagnosis
This unit exists because the Captain path cannot be closed from a single screen. It must trace the authoritative write/read owner through shared adapters, contracts, backend state, persistence and only the downstream surfaces that are directly affected. The package deliberately distinguishes **absence of candidate-bound proof** from a proven code defect: where current source already implements a behavior, execution first verifies it against the applicable Product Truth and changes code only when the evidence reveals a mismatch. Where a concrete mismatch is already visible—most notably Captain commission readback—the task names that gap directly.

The unit must preserve trusted actor context, idempotency/correlation, legal state transitions, refresh/restart readback and strict tenant/actor isolation. UI state, local storage, derived planning files and historical evidence cannot become authoritative operational or financial truth. Any implementation that changes a canonical contract must migrate every Captain-specific consumer and rerun invalidated evidence on the same final candidate.

## Planned work
- Verify dispatch offer/decision/reassignment invariants: Dispatch Product Truth is implemented-pending-verification and requires one active assignment, expiry, actor-scoped decision, idempotency, service area/capacity and atomic reassignment. Target: Every offer and decision is authoritative, retry-safe and isolated; client sees only tracking state while operator sees governed decisions.
- Close bilateral store↔Captain custody before pickup: Handoff Product Truth requires partner confirmation and Captain completion before picked_up; open blocking exceptions and superseded assignments must prevent pickup. Target: Pickup can occur only after valid bilateral custody; exceptions persist across restart and resolution re-enables only legal continuation.

## Boundaries
Affected surfaces: app-captain, app-partner, app-client, control-panel. Dependencies: U003. Journeys/capabilities: J102 captain dispatch, J105 store-captain handoff. Unrelated sections remain out of scope unless a new direct dependency is proven and `COVERAGE.json` is updated before implementation.

## Closure rule
Do not mark this unit done from static inspection alone when persisted, cross-surface, security, runtime or financial behavior is involved. Execute the linked verification checks after the final relevant write and record exact resulting SHA/evidence in `RESULT.json`.

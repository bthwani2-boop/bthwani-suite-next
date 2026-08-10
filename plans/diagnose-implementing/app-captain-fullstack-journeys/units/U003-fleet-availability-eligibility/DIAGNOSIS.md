# U003 — fleet-availability-eligibility

## Objective
Unify Captain availability, service mode, service-area/capacity eligibility and partner-fleet memberships on authoritative DSH state.

## Truth owner
DSH owns Captain dispatch readiness, availability/service-area eligibility and partner-fleet membership; Identity only authenticates.

## Diagnosis
This unit exists because the Captain path cannot be closed from a single screen. It must trace the authoritative write/read owner through shared adapters, contracts, backend state, persistence and only the downstream surfaces that are directly affected. The package deliberately distinguishes **absence of candidate-bound proof** from a proven code defect: where current source already implements a behavior, execution first verifies it against the applicable Product Truth and changes code only when the evidence reveals a mismatch. Where a concrete mismatch is already visible—most notably Captain commission readback—the task names that gap directly.

The unit must preserve trusted actor context, idempotency/correlation, legal state transitions, refresh/restart readback and strict tenant/actor isolation. UI state, local storage, derived planning files and historical evidence cannot become authoritative operational or financial truth. Any implementation that changes a canonical contract must migrate every Captain-specific consumer and rerun invalidated evidence on the same final candidate.

## Planned work
- Verify and complete partner-fleet membership lifecycle: Product Truth requires one-time code redemption, own membership list/disconnect, partner lifecycle visibility and redacted operator readback with optimistic versioning and audit. Target: Partner, Captain and operator observe one versioned DSH membership lifecycle; secret code material is single-use/digest-only and never leaked.
- Close availability/service-area/capacity eligibility path: Dispatch Product Truth requires approved, available, service-area-bound Captain with remaining capacity; UI must not calculate final eligibility. Target: Eligibility is server-owned, concurrency-safe and visible to Captain/operator without duplicating calculation in frontend.

## Boundaries
Affected surfaces: app-captain, app-partner, control-panel. Dependencies: U002. Journeys/capabilities: PARTNER_FLEET_CONNECTION, J102 captain readiness/eligibility. Unrelated sections remain out of scope unless a new direct dependency is proven and `COVERAGE.json` is updated before implementation.

## Closure rule
Do not mark this unit done from static inspection alone when persisted, cross-surface, security, runtime or financial behavior is involved. Execute the linked verification checks after the final relevant write and record exact resulting SHA/evidence in `RESULT.json`.

# U002 — identity-workforce-access

## Objective
Make Captain authentication, role/surface authorization, Workforce readiness and operator Captain lifecycle one consistent fail-closed access path.

## Truth owner
Identity authenticates; Workforce owns Captain profile/readiness; DSH consumes authorized actor context but does not replace those truths.

## Diagnosis
This unit exists because the Captain path cannot be closed from a single screen. It must trace the authoritative write/read owner through shared adapters, contracts, backend state, persistence and only the downstream surfaces that are directly affected. The package deliberately distinguishes **absence of candidate-bound proof** from a proven code defect: where current source already implements a behavior, execution first verifies it against the applicable Product Truth and changes code only when the evidence reveals a mismatch. Where a concrete mismatch is already visible—most notably Captain commission readback—the task names that gap directly.

The unit must preserve trusted actor context, idempotency/correlation, legal state transitions, refresh/restart readback and strict tenant/actor isolation. UI state, local storage, derived planning files and historical evidence cannot become authoritative operational or financial truth. Any implementation that changes a canonical contract must migrate every Captain-specific consumer and rerun invalidated evidence on the same final candidate.

## Planned work
- Close Captain access/readiness gaps: App.tsx already composes IdentitySessionGate and WorkforceAccessGate, but static composition does not prove backend profile provisioning, status transitions, role/surface enforcement, refresh/restart behavior or isolation. Target: A Captain can enter only with a valid captain role, app-captain surface authorization and allowed Workforce state; denied states remain explicit after refresh/restart.
- Verify session/device/push trust boundaries: SecureStore session, device fingerprint and push registration are composed in runtime but need negative evidence around logout/restart/actor changes. Target: No stale actor token, device binding or push registration can authorize or address another Captain.

## Boundaries
Affected surfaces: app-captain, control-panel. Dependencies: U001. Journeys/capabilities: Captain identity/workforce readiness, J102 dispatch eligibility precondition. Unrelated sections remain out of scope unless a new direct dependency is proven and `COVERAGE.json` is updated before implementation.

## Closure rule
Do not mark this unit done from static inspection alone when persisted, cross-surface, security, runtime or financial behavior is involved. Execute the linked verification checks after the final relevant write and record exact resulting SHA/evidence in `RESULT.json`.

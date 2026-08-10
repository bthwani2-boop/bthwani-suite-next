# U005 — visit-checklist-verification

## Boundary
This unit owns the field employee's store visit, device location evidence, checklist/evidence, verification result and resulting store-readiness readback. Control-panel and app-partner are readers/reviewers only where current store readiness exposes the field result. app-client publication is closed in U004/U006, not by making the visit screen itself a client journey.

## Current diagnosis
`DshFieldVisitScreen` is materially improved: it verifies location services, requests foreground permission, rejects mocked locations, validates coordinates/accuracy, uses governed reason codes and prevents starting a second visible/queued visit for the same store. The visible lifecycle is start visit → checklist → complete visit → verification. Checklist and verification screens already upload evidence and preserve precise field problem states. These are foundations to keep.

The remaining closure question is state-machine completeness, not UI quantity. Execution must inspect current contracts/backend/domain state before adding any new lifecycle state. If current authority requires cancel/abandon/arrive or explicit stale-task transitions, they must be implemented end-to-end; if not, the package must record that evidence instead of inventing them. Regardless of state names, concurrent starts/completions, stale assignment/version, checklist/evidence blockers, open escalations, GPS/geofence/mocked-location failures and unknown commit results must have deterministic server-owned outcomes. Completion must not be inferred locally.

## Remaining changes
- Reconcile visible visit actions with current contract/state machine and fill only authoritative missing transitions.
- Revalidate assignment/session/readiness and store scope at each mutation.
- Prove checklist/evidence prerequisites and verification idempotency/version conflict behavior.
- Prove geofence/location freshness/accuracy/mock rules in backend as well as device prechecks.
- Verify operator/partner store-readiness readback after committed verification and after refresh/restart.

## Exit condition
A field actor can execute every authorized visit/checklist/verification transition exactly once under retries, cannot bypass location/evidence/scope gates, and sees the same committed result as required operator/partner readers. Negative cases must leave no hidden partial or duplicate state.

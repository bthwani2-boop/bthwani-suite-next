# U003 — field-work-center-navigation

## Boundary
This unit is the employee's app-field work entry/navigation layer. Control-panel participates only where it changes the assignment or operational record that the field work center must reflect. It does not implement generic dashboard, client, partner or captain navigation.

## Current diagnosis
`DshFieldWorkQueueScreen` currently renders the authenticated field actor's in-progress visits and open escalations. It has loading, error, empty and refresh handling and now uses governed problem presentation. This is useful but narrower than a fully reliable field work center: assignment provenance/freshness, stale or revoked tasks, pending offline operations, deterministic priority/deadline/location representation and map/list requirements are not proven from current Product Truth/current controller behavior. These features must not be invented blindly; execution should first resolve what the canonical assignment/read model actually guarantees and then expose only that truth.

The app runtime parses field deep links for work queue, visit, checklist, verification, escalation, finance, partner progress and products. Static parsing accepts route identifiers before the target is revalidated by the owning screen/backend. The closure requirement is that initial links, resumed links, notification actions and stale identifiers cannot bypass current session/readiness/assignment scope, and invalid parameters have explicit recoverable UX rather than a blank or unrelated screen. Back navigation and refresh must converge on authoritative current state.

## Remaining changes
- Bind work-center content to current Workforce/DSH assignment truth, including freshness and stale/revoked behavior, without creating a local assignment registry.
- Expose pending/offline status where it affects the employee's next safe action.
- Validate deep-link target parameters and current authorization on initial launch and resume; stale/revoked targets fail safely.
- Verify Arabic RTL, large text, screen-reader labels/roles, focus/touch targets and empty/error/retry navigation states.

## Exit condition
A field employee must be able to enter from normal launch or valid deep link, see only currently authorized work, understand loading/offline/stale state and recover predictably after refresh/reassignment/restart. No unrelated surface is required for this unit.

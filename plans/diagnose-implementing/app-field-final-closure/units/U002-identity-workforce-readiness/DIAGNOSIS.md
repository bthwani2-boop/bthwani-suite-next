# U002 — identity-workforce-readiness

## Boundary
Functional surfaces are `app-field` plus control-panel actions that provision or govern the same field actor. Other mobile applications are not part of this unit. Identity owns actor/session truth and Workforce owns professional profile, assignment and readiness.

## Current diagnosis
The current app-field runtime correctly uses SecureStore-backed session storage, a persistent device fingerprint, `IdentitySessionGate` with role `field` and surface `app-field`, then `WorkforceAccessGate` and a readiness query before entering DSH. This is the correct composition direction and should be preserved. The remaining visible defect is that `UnifiedReadinessWrapper` renders `null` whenever readiness is not yet ALLOWED or BLOCKED. During initial fetch, refresh or Workforce-state change the employee can see a blank application instead of an explicit loading/unavailable state.

Static composition alone also does not prove mutation-time authorization. A field actor can lose assignment, engagement, role eligibility or session validity after a screen was loaded or while mutations were queued offline. Every sensitive field mutation and reconnect/replay path must revalidate authoritative identity/workforce scope server-side. The field should never use a client-supplied actor identifier as authorization and should receive precise blocker reasons plus allowed recovery actions.

## Remaining changes
- Replace blank readiness state with explicit loading/error/retry presentation and deterministic refresh lifecycle.
- Trace field provisioning/activation/profile completion/assignment/readiness/revocation from operator action through Identity/Workforce persistence to app-field readback.
- Prove wrong role, wrong surface, incomplete/suspended profile, expired/revoked session and revoked/reassigned work all fail closed.
- Ensure mutation and reconnect authorization uses current server truth rather than screen-entry state.

## Exit condition
The same actor must move predictably through provisioning, activation, profile readiness, assignment and revocation with no duplicate Identity truth, no blank readiness screen and no stale authorized mutation after revocation. Negative paths must be tested from control-panel to app-field on the resulting SHA.

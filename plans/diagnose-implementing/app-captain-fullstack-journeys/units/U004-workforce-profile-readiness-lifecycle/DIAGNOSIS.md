# U004 — workforce-profile-readiness-lifecycle

The Captain runtime is intentionally gated twice: Identity authenticates the actor and Workforce confirms the actor is a Captain with a usable profile/readiness state. The mobile path consumes Workforce profile/readiness while DSH also has an internal readiness transport for dispatch decisions. Both transports must converge on the same Workforce-owned state, otherwise a Captain can be allowed into the app while dispatch blocks them, or the reverse.

The fail-closed wrapper currently handles missing/mismatched actor and Workforce kind plus backend failure by producing an eligibility-unavailable gate. That is safer than fabricating readiness, but closure requires proving all lifecycle transitions: not provisioned, incomplete, active, suspended, terminated, document/accreditation state and any explicit reactivation. The app must not cache an old active state across logout, profile mutation or backend loss.

Control-panel HR/administration enters scope only for the exact Captain provisioning/lifecycle operations that create or change this canonical state. Generic HR functions remain outside. The unit closes creation/readback, authorization, two-transport convergence, audit and negative runtime behavior before dispatch eligibility consumes Workforce output.

## Closure boundary

Workforce owns Captain employment/profile/readiness lifecycle; DSH and app-captain consume projections but cannot invent employment truth. The unit remains open until all required checks are executed on the exact candidate, all known fixable Captain defects in this concern are removed, cleanup is complete, and later units have not invalidated its evidence.

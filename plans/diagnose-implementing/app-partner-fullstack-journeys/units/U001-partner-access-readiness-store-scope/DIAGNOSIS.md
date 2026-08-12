# U001 — Partner access, readiness, Store scope and post-onboarding feedback

## Objective

Close the Partner authentication/session → canonical Partner/Store readiness → authorized Store scope → post-onboarding feedback path without allowing local/device state, a selected Store, rating UI or stale session state to become authorization truth.

## Current diagnosis

The high-level Partner runtime boundary is still sound: SecureStore session persistence, stable Partner device fingerprint, push registration and `IdentitySessionGate requiredRole="partner" requiredSurface="app-partner"` wrap the Partner surface. Store selection remains client intent and must be re-authorized by DSH.

The old package under-described the current Identity blast radius. Current `BB` adds explicit refresh-rotation concurrency and stronger mobile-session/outage contracts. U001 must now prove simultaneous refresh has one governed successor, stale/replayed refresh cannot create a second valid Partner session, exact `sessionSurface`/role rules remain enforced, and logout/relogin/restart/actor switch cannot reuse prior Partner or Store readback.

Current Partner runtime also includes `PartnerFieldRatingGate`, a post-onboarding feedback interaction absent from the old package. The component always renders children and shows a dismissible modal only when the server prompt says the Partner is eligible and has not completed the rating. It therefore must **not** be treated as an access/readiness gate.

The feedback slice is Partner-related because it is presented after Store onboarding/activation and rates the field actor associated with that onboarding relationship. It must remain narrowly bounded: server-derived eligibility, correct Partner/onboarding/field relationship, duplicate-safe completion and canonical readback. This does not authorize independent app-field workforce/product work.

`PARTNER_ONBOARDING_STORE_PUBLICATION` remains `READY_FOR_IMPLEMENTATION`, so source presence cannot close activation/publication. Trusted context, Partner/Store authorization, payout prerequisite, publication gates and required counterpart readback still need exact-candidate proof.

## Root-cause targets

1. Identity session/refresh remains exact-surface, actor-scoped, replay-safe and outage-safe.
2. Logout/relogin/restart/actor switch clears/rebuilds Partner/Store/push state from canonical truth.
3. Partner Store intent is re-authorized server-side for every Store-scoped operation.
4. Missing/incomplete/deactivated/unauthorized Partner or Store fails closed; app-partner cannot self-approve activation/publication.
5. `PartnerFieldRatingGate` stays non-authoritative for access. Prompt failure/dismissal cannot mark rating complete or alter Partner readiness.
6. Rating eligibility/completion is server-owned and scoped to the authenticated Partner and actual onboarding/field relationship; duplicate/replay/cross-Partner attempts fail deterministically.
7. Raw payout destination identifiers remain WLT-owned and never become DSH Partner readiness truth.

## Boundaries

Primary: app-partner + Identity + DSH Partner/Store. app-field/control-panel/app-client enter only as required onboarding/publication/rating counterparts. WLT enters only for the Partner payout prerequisite/reference boundary.

## Closure rule

U001 requires Identity backend/session contract evidence, DSH Partner/rating authorization and persistence evidence, Partner truth guards, PostgreSQL/migration checks where affected, runtime journey proof, actor-switch/restart negatives and exact-candidate counterpart readback. No local fallback/bypass is permitted.

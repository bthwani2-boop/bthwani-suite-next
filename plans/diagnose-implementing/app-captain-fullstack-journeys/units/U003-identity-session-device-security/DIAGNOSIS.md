# U003 — identity-session-device-security

App-captain configures Identity persistence through SecureStore, supplies a stable device fingerprint and gates the surface with the exact captain role and app-captain surface. That composition is correct only if every backend and refresh path preserves the same actor/surface authority. A successful token is insufficient when its session surface, surfaceAccess or role does not authorize app-captain.

The refresh lifecycle includes concurrency semantics: one refresh rotates the token while a racing replay must receive the governed conflict rather than generating a second valid session. Invalid or expired credentials, wrong surface, missing Captain role, logout, revoked session and backend outage must all resolve without leaking a prior authenticated Captain UI. Device fingerprint creation/persistence must not become an alternate identity authority.

Secure storage and notification endpoint cleanup are coupled to session end but ownership stays separated: Identity ends the session; downstream hooks may deactivate Captain push endpoints without blocking or changing who the actor is. Tests must prove cross-role and cross-surface isolation, concurrent refresh behavior, restart persistence and logout/revocation on the exact candidate.

## Closure boundary

Identity exclusively owns authentication/session identity and surface authorization; app-captain may consume but not replace it. The unit remains open until all required checks are executed on the exact candidate, all known fixable Captain defects in this concern are removed, cleanup is complete, and later units have not invalidated its evidence.

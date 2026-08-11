# U002 — identity-workforce-readiness

## Current-BB diagnosis

Historical U002 says PASS but records no resulting SHA and no check results, so it is not candidate-bound evidence. Current app-field composition already has explicit readiness failure handling; this unit is verification-first, not a redesign. Re-prove the actor lifecycle from operator provisioning through Identity activation/session, correct `field` role plus `app-field` surface, Workforce profile/assignment/readiness, app access, suspension/revocation and restart/logout. Highest risks are wrong-actor reuse, stale session/device trust, readiness-fetch failure being mistaken for eligibility, and assignment/profile changes not invalidating access. Only a reproduced mismatch authorizes code change, and that change belongs in the authoritative Identity/Workforce/app-field adapter rather than a second readiness truth in mobile state.

Preserve fail-closed role/surface checks and server authority. Shared identity/workforce changes require consumer regression verification but do not import Captain/Partner journeys into this unit.

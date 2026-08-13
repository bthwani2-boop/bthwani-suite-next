# U008 — location-maps-navigation-tracking

Location is both operational and privacy-sensitive. The Captain surface exposes GPS status, map/navigation and active-assignment location push, while the native manifest declares foreground and background location capabilities. The data path must bind every location sample to the authenticated Captain and the current assignment, validate coordinates/timestamps/accuracy as required, and reject samples from another actor or stale assignment.

A mobile request timing out cannot be interpreted as “not stored” or “stored” without canonical readback. Retries must be duplicate-safe and monotonic rules must prevent stale coordinates from overwriting newer state. The app’s GPS status is presentation, not evidence that DSH accepted a point. When permissions are denied/revoked, GPS is disabled, network is offline or the assignment closes/reassigns, tracking must stop or degrade according to Product Truth without fabricating movement.

Maps/navigation are consumers of canonical assignment endpoints and device location, not truth owners. Client and control-panel tracking readbacks enter only because they display Captain-caused state. This unit also settles the foreground/background contract from U002: any background tracking that remains declared must have a governed task lifecycle, privacy disclosure and physical proof; otherwise the excess permission/config is removed.

## Closure boundary

DSH owns canonical Captain tracking state; device GPS/location is input, and client/operator views are authorized projections only. The unit remains open until all required checks are executed on the exact candidate, all known fixable Captain defects in this concern are removed, cleanup is complete, and later units have not invalidated its evidence.

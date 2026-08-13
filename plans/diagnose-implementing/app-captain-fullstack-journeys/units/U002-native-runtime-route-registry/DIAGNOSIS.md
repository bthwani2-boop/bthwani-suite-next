# U002 — native-runtime-route-registry

The Captain runtime is generated from the shared mobile manifest and declares a wide native capability set: SecureStore, notifications, camera/media, location, background location, maps, TaskManager, updates and supporting device APIs. The generated Expo configuration enables background-location platform permissions and services when that feature is present. This creates a privacy and runtime contract that must be justified by actual Captain behavior rather than by a manifest flag.

The Captain delivery runtime diagnosed so far is foreground-oriented; no canonical evidence has established a governed background tracking task. Leaving background-location permissions enabled while the product does not execute a governed background task is a capability/permission mismatch. Conversely, if Product Truth requires background tracking, the runtime needs explicit task registration, lifecycle, battery/privacy/error controls and development-build/device proof. The package must resolve the mismatch from authority rather than silently keeping both states.

The screen registry is also a contract. Routes such as home, account sections, inbox/detail/orderchat/bell/support/pickup-dropoff/PoD/map carry screen identifiers, owner paths, required states, permissions, analytics/deep-link metadata and release criticality. A registry entry that points at a disabled or contradictory runtime screen is a defect. This unit therefore proves registry-to-renderer-to-deep-link parity, native permission least privilege, build/update compatibility and real development-build behavior before later journey units depend on those routes.

## Closure boundary

app-captain native capability and route declarations must match reachable Product Truth; device permissions may not exceed proven Captain behavior. The unit remains open until all required checks are executed on the exact candidate, all known fixable Captain defects in this concern are removed, cleanup is complete, and later units have not invalidated its evidence.

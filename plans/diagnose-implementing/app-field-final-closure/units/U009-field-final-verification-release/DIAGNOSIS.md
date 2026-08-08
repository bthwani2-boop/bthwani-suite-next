# U009 — field-final-verification-release

## Boundary
This is the final evidence unit for `app-field` and only its causally required readers: control-panel, app-partner and app-client. app-captain remains explicitly excluded under current Product Truth. The unit does not add features; it proves that U001–U008 are complete on one resulting SHA and that native/security/accessibility/release behavior matches the repository's field contracts.

## Current diagnosis
Static source shows the app-field runtime includes SecureStore, notifications, deep links, location, camera/document/media capabilities, Sentry integration and offline queue wiring. Dependencies for background tasks, SQLite and native features also exist. None of that proves physical-device behavior. Final field closure requires evidence outside static code for notification registration/action launch, deep-link cold/warm start, permissions, GPS/mock-location, camera/document upload, network transitions, process death/reboot/update, offline encrypted recovery, background limits, native release configuration and accessibility.

Verification quality itself is a known gap. The current app-field package test is a generic runtime configuration check and the dedicated readiness test is outside it. U001 must correct this before U009. Backend/database, migrations, generated contracts, boundary guards and field-specific tests must pass on the exact code SHA that is used for manual/device evidence. A mixed collection of historical runs is not final proof.

Security proof must focus on field threats: token/device/session leakage, cross-actor/cross-partner/store access, untrusted deep links/files, tampered IDs/versions/idempotency identities, location spoofing, offline replay after revocation and excess PII in logs/crash data. Accessibility must cover Arabic RTL, large text, touch targets, focus, TalkBack and VoiceOver on the actual final build. Observability must provide correlation/audit sufficient to diagnose unknown results without exposing secrets.

## Required final evidence
- Strict diagnosis-package validation and all field-specific static/type/lint/test/build gates.
- Identity/Workforce/DSH/WLT/backend/database/migration/boundary checks needed by U001–U008.
- Physical Android development and release-mode field journeys; physical iOS equivalent before cross-platform closure.
- Push and notification-action cold/warm launch, safe deep links, permissions, media/document, GPS/geofence/mock behavior.
- Offline/network loss before/after commit, process death, restart/reboot/update, corrupt queue recovery and revoked-assignment replay denial.
- TalkBack/VoiceOver/RTL/large text plus crash/trace/correlation/privacy checks.
- Same partner/store/field actor readback through only the related control-panel, partner and client surfaces after refresh/restart.
- Migration upgrade/forward recovery and release artifact/source-map/SHA identity where applicable.

## Exit condition
No final PASS until one SHA identifies source, generated artifacts, migrations, native builds and retained automated/manual evidence for all field closure units. External product/finance/security/QA/release approvals remain independent and cannot be fabricated by this package.

# Google Platform all-surfaces execution — 2026-07-25

## Scope

- Repository: `bthwani2-boop/bthwani-suite-next`
- Branch: `reemsam`
- Central Google Cloud/Firebase project: `bthwani-platform`
- Billing account: `01287E-01F576-ACBB90`
- Mobile surfaces: `app-client`, `app-partner`, `app-captain`, `app-field`
- Web surface: `control-panel`

## Decision

Firebase, FCM V1, and Google Maps are required for the current Android development line. The implementation is all-surface; no single-app activation path is accepted for the governed remote-build sequence.

## Repository implementation completed

1. Declared native Maps for all four mobile applications.
2. Added `react-native-maps` to client and partner; captain and field already owned it.
3. Added a central Google platform manifest covering:
   - all four Firebase Android apps;
   - all four Android Maps keys;
   - the control-panel Maps JavaScript key;
   - the central FCM V1 service account.
4. Added guarded scripts to:
   - add Firebase to the existing Cloud project;
   - register/download/validate all four Firebase Android apps;
   - upload each matching `google-services.json` to its own EAS project;
   - create four package/SHA-restricted Android Maps keys;
   - create one HTTP-referrer-restricted control-panel Maps JavaScript key;
   - create one least-privilege FCM V1 service account/key;
   - visit the supported EAS FCM V1 credentials workflow for all four Android apps;
   - run an all-surface prebuild gate.
5. Added an ignored local-input model for four Android SHA-1 fingerprints and control-panel referrers.
6. Added automatic loading of ignored mobile and control-panel Google environment files.
7. Added a shared native Google Map component.
8. Bound a real map to:
   - client address search/GPS/map-click selection with DSH service-area verification;
   - partner current-location context for the selected branch;
   - captain trusted mission-location readback;
   - field partner onboarding, replacing the synthetic map and fake landmarks.
9. Added a control-panel Google Maps JavaScript canvas.
10. Added visual service-area polygon display and point entry while preserving DSH topology, version, idempotency, and audit ownership.
11. Extended the authorized operator tracking projection with rounded live assignment locations.
12. Added the control-panel operations map and kept missing/stale/lost alerts.
13. Updated the canonical live-tracking OpenAPI contract.
14. Changed the all-app EAS build runner to require Google platform readiness for development builds before remote submission.
15. Updated the activation runbook to require all four apps and the control panel together.

## Security invariants

- No Firebase file, Maps key, FCM private key, SHA input, or local environment file is committed.
- Android Maps keys are separate per application and restricted by package, signing SHA-1, and Maps SDK for Android.
- The browser key is separate and restricted to Maps JavaScript API plus approved HTTP referrers.
- The FCM V1 service account receives `roles/firebasecloudmessaging.admin`, not project Owner or Editor.
- Mobile applications do not call external search, reverse-geocoding, or routing providers directly.
- DSH remains the sole source of service-area/geofence and operational assignment truth.

## External mutations not executed by GitHub source changes

The following require the authenticated operator's local `gcloud`, Firebase CLI, EAS CLI, browser approvals, private key creation, signing SHA fingerprints, and interactive EAS credentials screens:

1. Adding Firebase to `bthwani-platform`.
2. Creating the four Firebase Android app records.
3. Downloading the four new `google-services.json` files.
4. Uploading those four files to their matching EAS projects.
5. Creating the FCM V1 service account private key.
6. Attaching the FCM V1 key to all four EAS Android application identifiers.
7. Collecting all four EAS development SHA-1 fingerprints.
8. Creating and uploading the four Android Maps keys.
9. Creating the control-panel browser key.
10. Running authenticated all-surface preflight and EAS remote builds.

No statement in this evidence treats those external operations as complete before their local command outputs prove completion.

## CI state at evidence creation

- Database-contract and contextual workflows were running against the latest branch commits.
- Node workspace jobs could not yet provide code-level evidence because `pnpm-lock.yaml` was behind the client/partner package manifests after adding `react-native-maps`.
- The repository's Lockfile Snapshot workflow successfully generated a frozen-install-compatible candidate.
- The operator must synchronize and commit the regenerated lockfile; CI must then rerun before remote EAS build approval.

## Required acceptance evidence

1. Frozen lockfile install passes.
2. Typecheck, build, lint, contracts, journey gates, and DSH Go tests pass.
3. Firebase project ID is `bthwani-platform` in all four SDK configs.
4. EAS contains matching `GOOGLE_SERVICES_JSON` and `GOOGLE_MAPS_ANDROID_API_KEY` values for all four projects.
5. FCM V1 sender credential is attached to all four Android EAS identifiers.
6. All-surface Google preflight passes.
7. All-app Android EAS preflight passes.
8. Four remote development builds succeed.
9. Physical-device evidence proves Firebase initialization, push registration/receipt, native map rendering, GPS behavior, service-area rejection, field-map truth, captain tracking, and control-panel maps.

# Mobile development providers diagnosis — 2026-07-24

## Scope

- Repository: `bthwani2-boop/bthwani-suite-next`
- Original branch: `fix/lianbassam-pr-ci-trigger`
- Remediation branch: `fix/mobile-firebase-bootstrap`
- Target: Android development clients for `app-client`, `app-partner`, `app-captain`, and `app-field`.
- Secret policy: no Firebase file, map key, SMS credential, or provider secret is committed.

## Required development baseline

| Application | FCM | Location | Background location | Native Google Maps |
| --- | --- | --- | --- | --- |
| `app-client` | required | required | no | no |
| `app-partner` | required | required | no | no |
| `app-captain` | required | required | required | optional fallback in development |
| `app-field` | required | required | no | no |

Native Google Maps remains mandatory for captain `internal` and `production` builds. Development may omit the key and use the governed non-map fallback.

## Findings before remediation

### 1. Partner location capability drift

`app-partner` already depended on `expo-location`, but its central mobile manifest did not declare the `location` feature. The generated Expo configuration therefore omitted the native location plugin and permission description despite the dependency being installed.

### 2. FCM was code-ready but not native-build-ready

All four applications declared the notifications capability and depended on `expo-notifications`. Android Firebase initialization is intentionally conditional on a valid per-application `google-services.json` file. The installed development client error showing an uninitialized default Firebase application is consistent with a build produced without that file.

The repository correctly ignores `google-services.json`; activation cannot be completed from GitHub source alone.

### 3. Firebase validation accepted package-only placeholders

The original guard and setup script treated a JSON file as valid when it contained the expected `package_name`. They did not require `project_info`, `configuration_version`, `mobilesdk_app_id`, or an Android API key. Package-only placeholders could therefore pass repository checks and be uploaded to EAS.

### 4. Firebase setup mutated EAS during validation

The original setup command validated and uploaded one application at a time. A failure on a later application could leave earlier EAS projects partially updated.

### 5. Runtime policy drift

The generated Expo configuration used `runtimeVersion.policy=appVersion` while the central guard still required `fingerprint`. This guaranteed a preflight conflict unrelated to Firebase credentials.

### 6. Development Maps policy drift

A later build-runner change required the captain Maps key during development. This contradicted the accepted development policy that allows the captain non-map fallback.

### 7. OTP is development-local; real SMS is not active

The Identity service provides an internal OTP/activation flow. The local bootstrap code `000000` is blocked by `ActivationSafetyMiddleware` whenever `IDENTITY_LOCAL_BOOTSTRAP` is not explicitly `true`. This is acceptable for the governed local development runtime.

No real SMS delivery integration is required or activated for the current development phase. A Twilio record with mock credentials must not be interpreted as working SMS delivery.

## Remediation applied on `fix/mobile-firebase-bootstrap`

1. Added a shared strict validator for Firebase Android SDK configuration files.
2. Required all of the following before a file can pass:
   - `project_info.project_number`;
   - `project_info.project_id`;
   - `configuration_version`;
   - an exact Android package match;
   - `client_info.mobilesdk_app_id`;
   - at least one `api_key.current_key`.
3. Updated the central mobile guard to use the strict validator.
4. Aligned the central guard with `runtimeVersion.policy=appVersion`.
5. Replaced package-only test fixtures with structurally complete Firebase fixtures.
6. Added a regression proving that package-only placeholders fail.
7. Restored the policy that Maps is optional for captain development and mandatory outside development.
8. Changed Firebase/EAS setup to validate all four files before its first EAS write.
9. Made Firebase/EAS setup validation-only by default; `-Apply` is required for EAS mutation.
10. Added an idempotent Firebase bootstrap script that:
    - performs a dry run by default;
    - creates only missing Android apps with `-Apply`;
    - downloads all four SDK configurations into isolated staging;
    - validates every staged file before secure installation;
    - never changes EAS variables, credentials, builds, or workflows.
11. Updated the governed activation runbook and regression contracts.

## Firebase project state at diagnosis

The authenticated Firebase account can access:

```text
Project ID: bthwani
Project Number: 806591977022
Registered apps: none
```

The project is therefore suitable for the controlled development bootstrap, subject to explicit `-Apply` execution by the authenticated operator.

## Required local secure paths

The bootstrap installs the validated files at:

```text
C:\bthwani-secrets\firebase\app-client\google-services.json
C:\bthwani-secrets\firebase\app-partner\google-services.json
C:\bthwani-secrets\firebase\app-captain\google-services.json
C:\bthwani-secrets\firebase\app-field\google-services.json
```

Equivalent paths may be supplied through the ignored `infra/local/mobile.env` file:

```text
GOOGLE_SERVICES_JSON_APP_CLIENT=<secure path>
GOOGLE_SERVICES_JSON_APP_PARTNER=<secure path>
GOOGLE_SERVICES_JSON_APP_CAPTAIN=<secure path>
GOOGLE_SERVICES_JSON_APP_FIELD=<secure path>
GOOGLE_MAPS_ANDROID_API_KEY_APP_CAPTAIN=<optional in development>
```

Do not define a Google Maps key for client, partner, or field.

## Safe execution sequence

```powershell
# Dry run: no Firebase or EAS mutation
pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/bootstrap-mobile-firebase-development.ps1

# Explicit Firebase app creation and SDK config download; no EAS mutation
pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/bootstrap-mobile-firebase-development.ps1 -Apply

# Validate all local files; no EAS mutation
pnpm run mobile:firebase:setup:dev

# Explicit EAS development-variable upload
pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/setup-mobile-firebase-development.ps1 -Apply

# Preflight only; no remote build
pnpm run mobile:eas:preflight:all:dev

# Prove one development artifact before all applications
pnpm run mobile:eas:build:client:dev
```

A new development client must be installed after the builds complete. Metro reloads and EAS Updates cannot add missing native Firebase or Maps configuration to an existing binary.

## Acceptance criteria

- Dry run lists four exact Android package targets and performs no mutation.
- `-Apply` creates only missing Firebase Android apps.
- Downloaded files all report Firebase project ID `bthwani`.
- Every downloaded `mobilesdk_app_id` equals the Firebase App ID returned by `apps:list`.
- Package-only placeholder files fail validation.
- Local validation succeeds for all four files before any EAS mutation.
- EAS apply uploads `GOOGLE_SERVICES_JSON` only to the matching project.
- Development preflight succeeds without a captain Maps key when Firebase inputs are complete.
- Internal and production preflight reject a missing captain Maps key.
- Partner Expo configuration contains `expo-location` and no native Google Maps configuration.
- Push token registration no longer logs `Default FirebaseApp is not initialized` in newly built clients.

## Deferred by design

- FCM V1 service-account activation and end-to-end push delivery proof.
- Real SMS/Twilio activation.
- Stripe and production payment providers.
- AWS S3 production storage.
- Places, Routes, or Geocoding APIs.
- Production provider promotion or commercial readiness.

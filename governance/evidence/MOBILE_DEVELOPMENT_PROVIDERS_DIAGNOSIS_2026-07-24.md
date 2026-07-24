# Mobile development providers diagnosis — 2026-07-24

## Scope

- Repository: `bthwani2-boop/bthwani-suite-next`
- Branch: `fix/lianbassam-pr-ci-trigger`
- Target: Android development clients for `app-client`, `app-partner`, `app-captain`, and `app-field`.
- Secret policy: no Firebase file, map key, SMS credential, or provider secret is committed.

## Required development baseline

| Application | FCM | Location | Background location | Native Google Maps |
| --- | --- | --- | --- | --- |
| `app-client` | required | required | no | no |
| `app-partner` | required | required | no | no |
| `app-captain` | required | required | required | required |
| `app-field` | required | required | no | no |

## Findings before remediation

### 1. Partner location capability drift

`app-partner` already depended on `expo-location`, but its central mobile manifest did not declare the `location` feature. The generated Expo configuration therefore omitted the native location plugin and permission description despite the dependency being installed.

### 2. FCM was code-ready but not native-build-ready

All four applications declared the notifications capability and depended on `expo-notifications`. Android Firebase initialization is intentionally conditional on a valid per-application `google-services.json` file. The installed development client error showing an uninitialized default Firebase application is consistent with a build produced without that file.

The repository correctly ignores `google-services.json`; activation cannot be completed from GitHub source alone.

### 3. Firebase setup did not configure the complete native baseline

The existing setup command validated and uploaded the four Firebase files, but it did not configure the Google Maps key required by `app-captain`.

### 4. Development preflight allowed a captain build without maps

The generic mobile guard required Google Maps keys only for non-development profiles. This allowed an Android development build to be submitted while `app-captain` declared native maps but had no map key.

### 5. OTP is development-local; real SMS is not active

The Identity service provides an internal OTP/activation flow. The local bootstrap code `000000` is blocked by `ActivationSafetyMiddleware` whenever `IDENTITY_LOCAL_BOOTSTRAP` is not explicitly `true`. This is acceptable for the governed local development runtime.

No real SMS delivery integration is required or activated for the current development phase. A Twilio record with mock credentials must not be interpreted as working SMS delivery.

## Remediation applied

1. Added `location` to the central `app-partner` feature manifest without adding `maps`.
2. Kept native `maps` and background location exclusive to `app-captain`.
3. Added scoped local variables for the captain Android and iOS map keys.
4. Extended `mobile:firebase:setup:dev` to:
   - validate each Firebase file against its exact Android package;
   - upload `GOOGLE_SERVICES_JSON` to the matching EAS project only;
   - upload `GOOGLE_MAPS_ANDROID_API_KEY` only to the captain EAS project;
   - optionally upload the captain iOS map key;
   - fail instead of reporting success when any required native input is missing.
5. Updated the EAS build runner to require the captain map key during development preflight as well as preview and production.
6. Added a regression test locking the capability matrix and map-key isolation.
7. Updated the governed EAS activation runbook with the exact development baseline and commands.

## External inputs still required

The following cannot be generated or verified from repository source:

1. Four real Firebase Android configuration files matching:
   - `com.bthwani.client.next`
   - `com.bthwani.partner.next`
   - `com.bthwani.captain.next`
   - `com.bthwani.field.next`
2. One restricted Android Google Maps key for:
   - package: `com.bthwani.captain.next`
   - API: `Maps SDK for Android`
   - development signing SHA certificate
3. Valid EAS authentication with access to all four EAS projects.

## Required local secure configuration

Copy `infra/local/mobile.env.example` to the ignored file `infra/local/mobile.env`, then set:

```text
GOOGLE_SERVICES_JSON_APP_CLIENT=<secure path>
GOOGLE_SERVICES_JSON_APP_PARTNER=<secure path>
GOOGLE_SERVICES_JSON_APP_CAPTAIN=<secure path>
GOOGLE_SERVICES_JSON_APP_FIELD=<secure path>
GOOGLE_MAPS_ANDROID_API_KEY_APP_CAPTAIN=<restricted key>
```

Do not define a Google Maps key for client, partner, or field.

## Execution sequence

```powershell
pnpm run mobile:firebase:setup:dev
pnpm run mobile:eas:preflight:all:dev
pnpm run mobile:eas:build:all:dev
```

A new development client must be installed after the builds complete. Metro reloads and EAS Updates cannot add missing native Firebase or Google Maps configuration to an existing binary.

## Acceptance criteria

- Setup reports `Firebase=Valid` and `EAS FCM=Uploaded` for all four applications.
- Setup reports `Maps=Uploaded` only for `app-captain`.
- Development preflight fails when the captain map key or any Firebase file is absent.
- Partner Expo configuration contains `expo-location` and no native Google Maps configuration.
- Captain Expo configuration contains both location support and the restricted map key.
- Push token registration no longer logs `Default FirebaseApp is not initialized` in newly built clients.

## Deferred by design

- Real SMS/Twilio activation.
- Stripe and production payment providers.
- AWS S3 production storage.
- Places, Routes, or Geocoding APIs.
- Production provider promotion or commercial readiness.

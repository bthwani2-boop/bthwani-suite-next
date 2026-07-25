# Mobile EAS environment activation

## Central Google platform

The governed Google Cloud and Firebase project for the current application line is:

```text
bthwani-platform
```

One central project owns Firebase and enabled Google Maps services. Isolation is still mandatory per application through Android package, Firebase App ID, EAS project, signing certificate, and restricted API key.

## Surfaces in scope

The current development activation is all-surface. It must cover these five surfaces together:

| Surface | Firebase/FCM | Location | Google map |
| --- | --- | --- | --- |
| `app-client` | required | foreground | native Android map required |
| `app-partner` | required | foreground | native Android map required |
| `app-captain` | required | foreground and background | native Android map required |
| `app-field` | required | foreground | native Android map required |
| `control-panel` | not a mobile FCM client | server-projected operational coordinates | Maps JavaScript API required |

A development EAS build must fail closed when any mobile Firebase file or Android Maps key is missing. Metro reload and EAS Update cannot add native Firebase or Maps configuration to an already installed binary.

## Isolation model

Each mobile surface is a separate EAS project and owns its own environment variables and credentials. A credential may originate from the same central Google project but must not be copied into an unrelated EAS application without package and signing restrictions.

Environments are fixed:

| Build profile | EAS environment | Update channel |
| --- | --- | --- |
| `development` | `development` | `development` |
| `internal` | `preview` | `preview` |
| `production` | `production` | `production` |

## All-surface orchestrator

The entry point is:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass `
  -File tools/scripts/google-cloud/prepare-google-platform-all-surfaces.ps1 `
  -Phase Plan
```

No single-app mode exists in this orchestrator. Supported phases are:

- `Plan`
- `EnableFirebase`
- `BootstrapFirebaseApps`
- `UploadFirebaseToEas`
- `CreateMapsKeys`
- `Preflight`
- `All`

Every mutating phase requires `-Apply`. Maps upload to EAS additionally requires `-UploadMapsToEas`.

## Firebase project activation

Dry run and Firebase CLI login:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass `
  -File tools/scripts/google-cloud/prepare-google-platform-all-surfaces.ps1 `
  -Phase EnableFirebase `
  -Login
```

Apply after reviewing the output:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass `
  -File tools/scripts/google-cloud/prepare-google-platform-all-surfaces.ps1 `
  -Phase EnableFirebase `
  -Login `
  -Apply
```

The Firebase Terms of Service may require one browser acceptance before CLI activation can complete.

## Firebase Android applications

The exact packages are:

- `com.bthwani.client.next`
- `com.bthwani.partner.next`
- `com.bthwani.captain.next`
- `com.bthwani.field.next`

Dry run:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass `
  -File tools/scripts/google-cloud/prepare-google-platform-all-surfaces.ps1 `
  -Phase BootstrapFirebaseApps
```

Apply:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass `
  -File tools/scripts/google-cloud/prepare-google-platform-all-surfaces.ps1 `
  -Phase BootstrapFirebaseApps `
  -Apply
```

The apply phase creates only missing Android apps, downloads all four configurations, validates exact package and project identity, and installs them under:

```text
C:\bthwani-secrets\firebase\app-client\google-services.json
C:\bthwani-secrets\firebase\app-partner\google-services.json
C:\bthwani-secrets\firebase\app-captain\google-services.json
C:\bthwani-secrets\firebase\app-field\google-services.json
```

Every file must report `project_info.project_id = bthwani-platform`. Files from the former Firebase project `bthwani` are invalid for this application line.

## Firebase files in EAS

Validation only:

```powershell
pnpm run mobile:firebase:setup:dev
```

Upload all four matching files:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass `
  -File tools/scripts/google-cloud/prepare-google-platform-all-surfaces.ps1 `
  -Phase UploadFirebaseToEas `
  -Apply
```

The EAS variable name inside each app project is:

```text
GOOGLE_SERVICES_JSON
```

## FCM V1 sending credential

`google-services.json` configures the Android client. Expo Push Service also requires an FCM V1 service-account credential for sending Android notifications.

Prepare one least-privilege central service account and secure private key:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass `
  -File tools/scripts/google-cloud/prepare-fcm-v1-service-account.ps1
```

Apply after review:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass `
  -File tools/scripts/google-cloud/prepare-fcm-v1-service-account.ps1 `
  -Apply
```

The default secure key path is outside Git:

```text
C:\bthwani-secrets\firebase\bthwani-platform-fcm-v1-service-account.json
```

Attach the same central sender credential to all four EAS Android applications through the supported interactive EAS credentials workflow:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass `
  -File tools/scripts/google-cloud/configure-eas-fcm-v1-all-apps.ps1
```

The script stages the key temporarily in each application root, opens `eas credentials -p android`, and deletes the staged copy after every application. It never prints or commits the private key.

Do not confuse this FCM V1 key with the separate Google Play submission service account.

## Android signing fingerprints

Collect the EAS development signing SHA-1 for all four apps. The package and SHA-1 pair is the Android Maps application restriction.

Create the ignored local input:

```powershell
Copy-Item `
  tools/scripts/google-cloud/google-platform-input.example.json `
  tools/scripts/google-cloud/google-platform-input.local.json
```

Replace all four SHA-1 placeholders. The local input file is ignored by Git.

For production, use the Google Play App Signing SHA fingerprint rather than the directly installed development build fingerprint. Development and production keys must remain separate.

## Google Maps keys

Create four Android keys and one browser key in one governed phase.

Dry run:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass `
  -File tools/scripts/google-cloud/prepare-google-platform-all-surfaces.ps1 `
  -Phase CreateMapsKeys
```

Apply and upload all four Android keys to EAS:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass `
  -File tools/scripts/google-cloud/prepare-google-platform-all-surfaces.ps1 `
  -Phase CreateMapsKeys `
  -Apply `
  -UploadMapsToEas
```

The four local scoped variables are written only to ignored `infra/local/mobile.env`:

- `GOOGLE_MAPS_ANDROID_API_KEY_APP_CLIENT`
- `GOOGLE_MAPS_ANDROID_API_KEY_APP_PARTNER`
- `GOOGLE_MAPS_ANDROID_API_KEY_APP_CAPTAIN`
- `GOOGLE_MAPS_ANDROID_API_KEY_APP_FIELD`

Each matching EAS project receives:

```text
GOOGLE_MAPS_ANDROID_API_KEY
```

Every Android key is restricted to Maps SDK for Android, the exact package, and its exact SHA-1.

The control-panel Browser key is restricted to Maps JavaScript API and approved HTTP referrers. Its local development variable is written only to ignored `infra/local/control-panel.google.env`:

```text
NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY
```

`pnpm control` loads that file before starting Next.js.

## Governed map behavior

- Mobile apps use native Google Maps for display and interaction.
- The client resolves map clicks and GPS coordinates through the governed DSH/Providers search and reverse-geocoding path before accepting a delivery address.
- The field app must not use synthetic landmarks or pixel-derived fake coordinates.
- The captain map displays trusted mission-bound GPS samples.
- The partner map is operational context and does not mutate store-location truth.
- The control panel displays authorized rounded live assignment locations and service-area polygons.
- Google Maps never owns the zone decision. DSH remains the sole source of service-area and geofence truth.
- Client applications must not call Places, Geocoding, Routes, Nominatim, OSRM, or other external providers directly.

## Preflight and build

Run the all-surface Google platform gate:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass `
  -File tools/scripts/google-cloud/prepare-google-platform-all-surfaces.ps1 `
  -Phase Preflight
```

Then run the full Android EAS preflight:

```powershell
pnpm run mobile:eas:preflight:all:dev
```

Only after both pass, submit all four development builds together:

```powershell
pnpm run mobile:eas:build:all:dev
```

This activation does not use a one-app proof build. The all-surface preflight must pass for all four apps before any remote submission.

After installation on physical devices, prove:

1. Firebase initializes without `Default FirebaseApp is not initialized`.
2. Every app registers an Expo push token.
3. A real FCM V1-backed Expo notification reaches each app.
4. The native map renders in all four apps.
5. Foreground GPS works in client, partner, and field.
6. Foreground and background mission location works in captain.
7. Client map selection resolves through DSH and rejects points outside active service areas.
8. Field onboarding no longer displays synthetic map truth.
9. Control-panel operations map displays authorized live assignment locations.
10. Control-panel service-area editor displays and edits polygons while DSH validates topology and version.

## Deferred services

Do not enable Firebase Authentication, Firestore, Realtime Database, Firebase Storage, Remote Config, or Crashlytics merely because Firebase is active. Identity, PostgreSQL, Media runtime, Platform Control, and Sentry remain the current system owners.

Places, Geocoding, and Google Routes may be added later only behind the Providers backend, with usage budgets and quotas. They are not a prerequisite for the current native map display because governed Nominatim/OSRM adapters already own search, reverse lookup, and route metrics during development.

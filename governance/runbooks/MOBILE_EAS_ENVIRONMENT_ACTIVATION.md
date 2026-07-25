# Mobile EAS environment activation

## Central Google platform

The governed Google Cloud and Firebase project for the current application line is:

```text
bthwani-platform
```

This is one central Google Cloud/Firebase project. It owns the shared Firebase project boundary and Google Maps APIs, while each mobile application remains isolated by Android package, Firebase App ID, EAS project, signing certificate, and restricted API key.

## Isolation model

Each mobile surface is a separate EAS project and must own its own environment variables and credentials. Variables from one application must never be copied into another application merely because both belong to the same monorepo.

Environments are fixed:

| Build profile | EAS environment | Update channel |
| --- | --- | --- |
| `development` | `development` | `development` |
| `internal` | `preview` | `preview` |
| `production` | `production` | `production` |

## Development capability baseline

The governed minimum for the current development phase is:

| Application | Remote notifications | Location | Native Google Maps |
| --- | --- | --- | --- |
| `app-client` | FCM | foreground location | no |
| `app-partner` | FCM | foreground location | no |
| `app-captain` | FCM | foreground and background location | optional fallback in development; required outside development |
| `app-field` | FCM | foreground location | optional fallback in development; required outside development |

`expo-location` does not require a Google Maps API key. A native Google map does require a key embedded into a newly built binary. EAS Update or Metro reload cannot add it to an already installed APK.

## Required Android notification files

Create a File environment variable named `GOOGLE_SERVICES_JSON` in every EAS project/environment that enables remote notifications. The value must be a complete Firebase-generated file whose Android package exactly matches that application:

- `com.bthwani.client.next`
- `com.bthwani.partner.next`
- `com.bthwani.captain.next`
- `com.bthwani.field.next`

A valid file must include `project_info`, `configuration_version`, a matching Android client, `client_info.mobilesdk_app_id`, and at least one `api_key.current_key`. Package-only placeholders are forbidden.

The file is referenced through `process.env.GOOGLE_SERVICES_JSON`. It must not be committed or shared across applications.

For local multi-application tooling, use the scoped variables in `infra/local/mobile.env`:

- `GOOGLE_SERVICES_JSON_APP_CLIENT`
- `GOOGLE_SERVICES_JSON_APP_PARTNER`
- `GOOGLE_SERVICES_JSON_APP_CAPTAIN`
- `GOOGLE_SERVICES_JSON_APP_FIELD`

The build runner converts the selected application's scoped value to the project-local `GOOGLE_SERVICES_JSON` variable.

## Add Firebase to the existing Google Cloud project

The Google Cloud project and Billing must already be active. Firebase enablement is a separate, guarded phase.

Dry run:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass `
  -File tools/scripts/google-cloud/enable-firebase-platform.ps1
```

Apply after review:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass `
  -File tools/scripts/google-cloud/enable-firebase-platform.ps1 `
  -Apply
```

Use `-Login` only when Firebase CLI authentication has not yet been completed. This phase adds Firebase to `bthwani-platform`; it does not create Android apps, download files, change EAS, or build applications.

The Firebase Terms of Service may require one manual acceptance in Firebase Console before CLI activation can complete.

## Firebase Android-app bootstrap

After Firebase is enabled, calculate the four-app plan without mutation:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass `
  -File tools/scripts/bootstrap-mobile-firebase-development.ps1 `
  -ProjectId bthwani-platform
```

After review:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass `
  -File tools/scripts/bootstrap-mobile-firebase-development.ps1 `
  -ProjectId bthwani-platform `
  -Apply
```

`-Apply` creates only missing Android apps, downloads all four SDK configurations into an isolated staging directory, validates every file, and then installs them under `C:\bthwani-secrets\firebase`. It does not change EAS variables, credentials, builds, or workflows.

Any existing local or EAS Firebase configuration belonging to the former project `bthwani` must be replaced with a newly downloaded configuration whose `project_info.project_id` is exactly `bthwani-platform`.

## EAS validation and apply

Local validation is the default and makes no EAS mutation:

```powershell
pnpm run mobile:firebase:setup:dev
```

After all four files pass and the EAS account is verified, upload project-scoped variables explicitly:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass `
  -File tools/scripts/setup-mobile-firebase-development.ps1 `
  -Apply
```

The setup script validates all four files before the first EAS write. It uploads each Firebase file only to its matching EAS project.

## FCM V1 sending credentials

`google-services.json` configures the Android client, but it is not the server credential used by Expo to send Android notifications.

After the four Firebase Android apps exist:

1. Create or select a tightly scoped Google service account for FCM V1.
2. Grant only the Firebase Cloud Messaging sending role required by the selected delivery path.
3. Store the private JSON outside Git.
4. Upload the FCM V1 service-account credential to each matching EAS Android application through `eas credentials` or the EAS credentials dashboard.
5. Verify that the Firebase project number in each `google-services.json` matches the sender project of the uploaded FCM V1 credential.
6. Build and install a new development client, then prove token registration, sending, and receipt on a physical Android device.

Do not confuse the FCM V1 service-account key with the separate Google Play submission service account.

## Maps

Native Maps is currently declared for:

- `app-captain` → `com.bthwani.captain.next`
- `app-field` → `com.bthwani.field.next`

Use separate restricted Android keys even though both are managed inside `bthwani-platform`:

- `GOOGLE_MAPS_ANDROID_API_KEY_APP_CAPTAIN`
- `GOOGLE_MAPS_ANDROID_API_KEY_APP_FIELD`

Each key must be restricted to:

- Maps SDK for Android only;
- the exact package name;
- the exact signing SHA certificate for that build/distribution channel.

Development may use the governed non-map fallback when the key is absent. Internal and production builds must reject a missing key for applications that declare `maps`.

For iOS release builds, use separate app-scoped variables:

- `GOOGLE_MAPS_IOS_API_KEY_APP_CAPTAIN`
- `GOOGLE_MAPS_IOS_API_KEY_APP_FIELD`

Do not enable Places, Routes, or Geocoding until a code path and usage budget explicitly require them.

## Android signing certificates

Preserve and back up the EAS Android keystore for every application. Register the appropriate SHA-1 and SHA-256 fingerprints where needed:

- EAS development/internal signing fingerprint for directly installed builds;
- Google Play App Signing fingerprint for Play-distributed production builds.

Maps key restrictions and Firebase features that validate Android application identity must use the certificate that actually signed the installed artifact.

## Google Play Console

Google Play applications remain separate from the Cloud/Firebase project. Before creating new Play records, compare existing records against the current package names. A Play app cannot be converted to a different package name.

Current packages:

- `app-client`: `com.bthwani.client.next`
- `app-partner`: `com.bthwani.partner.next`
- `app-captain`: `com.bthwani.captain.next`
- `app-field`: `com.bthwani.field.next`

The first Play submission and required store declarations must be completed before EAS Submit can automate later releases.

## OTP and SMS in development

Use the internal Identity activation/OTP path during development. Keep `IDENTITY_LOCAL_BOOTSTRAP=true` only in the governed local Docker runtime. The bootstrap code `000000` is rejected by the HTTP safety middleware whenever local bootstrap is not explicitly enabled.

A real SMS provider is not required for the current development phase. Twilio or another paid SMS provider must remain inactive until production delivery, sender identity, rate limits, and cost controls are approved.

## Sentry

Preview and production require the variables defined in `JRN-SENTRY-ACTIVATION.md`. Development may run with Sentry disabled.

## Safe execution sequence

```powershell
# 1. Add Firebase to the existing central Cloud project: dry run
pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/google-cloud/enable-firebase-platform.ps1

# 2. Add Firebase after review
pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/google-cloud/enable-firebase-platform.ps1 -Apply

# 3. Inspect the four Firebase Android apps without mutation
pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/bootstrap-mobile-firebase-development.ps1 -ProjectId bthwani-platform

# 4. Create only missing apps and install validated local files
pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/bootstrap-mobile-firebase-development.ps1 -ProjectId bthwani-platform -Apply

# 5. Validate all local Firebase files; no EAS mutation
pnpm run mobile:firebase:setup:dev

# 6. Upload validated files to matching EAS development projects
pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/setup-mobile-firebase-development.ps1 -Apply

# 7. Configure FCM V1 sending credentials in every matching EAS project
# Interactive and credential-sensitive: use eas credentials per application.

# 8. Create restricted Maps keys for captain and field after obtaining their signing SHA fingerprints

# 9. Preflight only; no build submission
pnpm run mobile:eas:preflight:all:dev

# 10. Prove one development build first
pnpm run mobile:eas:build:field:dev

# 11. Install and prove Firebase initialization, push token registration, map rendering, and notification receipt

# 12. Submit all development builds only after the first artifact is verified
pnpm run mobile:eas:build:all:dev
```

A new development client must be installed after the builds complete. Metro reloads and EAS Updates cannot add missing native Firebase or Maps configuration to an existing binary.

A successful EAS artifact is technical evidence only and cannot promote SaaS commercial or financial readiness.

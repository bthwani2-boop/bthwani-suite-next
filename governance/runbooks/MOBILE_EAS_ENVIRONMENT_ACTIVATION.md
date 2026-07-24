# Mobile EAS environment activation

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
| `app-captain` | FCM | foreground and background location | optional fallback in development |
| `app-field` | FCM | foreground location | no |

`expo-location` does not require a Google Maps API key. The captain may run a development client without a Maps key and must render the governed non-map fallback. Native Google Maps remains required for captain `internal` and `production` builds.

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

## Firebase bootstrap

The Firebase project must already exist. Bootstrap is idempotent and separated from EAS mutation:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/bootstrap-mobile-firebase-development.ps1
```

The default invocation is a dry run. It lists the existing Android apps and calculates the create/download plan without changing Firebase.

After review:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/bootstrap-mobile-firebase-development.ps1 -Apply
```

`-Apply` creates only missing Android apps, downloads all four SDK configurations into an isolated staging directory, validates every file, and then installs them under `C:\bthwani-secrets\firebase`. It does not change EAS variables, credentials, builds, or workflows.

## EAS validation and apply

Local validation is the default and makes no EAS mutation:

```powershell
pnpm run mobile:firebase:setup:dev
```

After all four files pass and the EAS account is verified, upload project-scoped variables explicitly:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/setup-mobile-firebase-development.ps1 -Apply
```

The setup script validates all four files before the first EAS write. It uploads each Firebase file only to its matching EAS project.

## Maps

Only `app-captain` owns the native maps capability.

Development behavior:

- `GOOGLE_MAPS_ANDROID_API_KEY_APP_CAPTAIN` is optional.
- When absent, no native Maps configuration is emitted and the captain fallback remains active.
- When present, the setup script may upload it only to the captain EAS project.

Internal and production behavior:

- `GOOGLE_MAPS_ANDROID_API_KEY_APP_CAPTAIN` is required for Android.
- The EAS project variable is `GOOGLE_MAPS_ANDROID_API_KEY`.
- Enable only `Maps SDK for Android`.
- Restrict the key to `com.bthwani.captain.next` and the appropriate signing SHA certificate.

For iOS release builds, use `GOOGLE_MAPS_IOS_API_KEY_APP_CAPTAIN` locally and `GOOGLE_MAPS_IOS_API_KEY` in the captain EAS project.

Do not provide map keys to `app-client`, `app-partner`, or `app-field`. Do not enable Places, Routes, or Geocoding until a code path and usage budget explicitly require them.

## OTP and SMS in development

Use the internal Identity activation/OTP path during development. Keep `IDENTITY_LOCAL_BOOTSTRAP=true` only in the governed local Docker runtime. The bootstrap code `000000` is rejected by the HTTP safety middleware whenever local bootstrap is not explicitly enabled.

A real SMS provider is not required for the current development phase. Twilio or another paid SMS provider must remain inactive until production delivery, sender identity, rate limits, and cost controls are approved.

## Sentry

Preview and production require the variables defined in `JRN-SENTRY-ACTIVATION.md`. Development may run with Sentry disabled.

## Safe execution sequence

```powershell
# 1. Firebase dry run
pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/bootstrap-mobile-firebase-development.ps1

# 2. Create missing Firebase apps and install validated local files
pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/bootstrap-mobile-firebase-development.ps1 -Apply

# 3. Validate local files only; no EAS mutation
pnpm run mobile:firebase:setup:dev

# 4. Upload validated files to matching EAS development projects
pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/setup-mobile-firebase-development.ps1 -Apply

# 5. Preflight only; no build submission
pnpm run mobile:eas:preflight:all:dev

# 6. Prove one client build first
pnpm run mobile:eas:build:client:dev

# 7. Submit all development builds only after the client artifact is verified
pnpm run mobile:eas:build:all:dev
```

A new development client must be installed after the builds complete. Metro reloads and EAS Updates cannot add missing native Firebase or Maps configuration to an existing binary.

A successful EAS artifact is technical evidence only and cannot promote SaaS commercial or financial readiness.

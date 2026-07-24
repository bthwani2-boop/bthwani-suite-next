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
| `app-captain` | FCM | foreground and background location | yes |
| `app-field` | FCM | foreground location | no |

`expo-location` does not require a Google Maps API key. A Google Maps key is required only when the application embeds the native map renderer through `react-native-maps`.

## Required Android notification files

Create a File environment variable named `GOOGLE_SERVICES_JSON` in every EAS project/environment that enables remote notifications. The value must be the Firebase file whose Android package exactly matches that application:

- `com.bthwani.client.next`
- `com.bthwani.partner.next`
- `com.bthwani.captain.next`
- `com.bthwani.field.next`

The file is referenced through `process.env.GOOGLE_SERVICES_JSON`. It must not be committed or shared across applications.

For local multi-application tooling, use the scoped variables in `infra/local/mobile.env`:

- `GOOGLE_SERVICES_JSON_APP_CLIENT`
- `GOOGLE_SERVICES_JSON_APP_PARTNER`
- `GOOGLE_SERVICES_JSON_APP_CAPTAIN`
- `GOOGLE_SERVICES_JSON_APP_FIELD`

The build runner converts the selected application's scoped value to the project-local `GOOGLE_SERVICES_JSON` variable.

## Maps

Only `app-captain` owns the native maps capability in the current development baseline.

Android requires:

- `GOOGLE_MAPS_ANDROID_API_KEY_APP_CAPTAIN` locally.
- `GOOGLE_MAPS_ANDROID_API_KEY` in the `app-captain` EAS project.
- Google Cloud API: `Maps SDK for Android`.
- Android application restriction: `com.bthwani.captain.next` plus the development signing SHA certificate.

For iOS builds, use `GOOGLE_MAPS_IOS_API_KEY_APP_CAPTAIN` locally and `GOOGLE_MAPS_IOS_API_KEY` in the captain EAS project.

Do not provide map keys to `app-client`, `app-partner`, or `app-field`. Do not enable Places, Routes, or Geocoding until a code path and usage budget explicitly require them.

## OTP and SMS in development

Use the internal Identity activation/OTP path during development. Keep `IDENTITY_LOCAL_BOOTSTRAP=true` only in the governed local Docker runtime. The bootstrap code `000000` is rejected by the HTTP safety middleware whenever local bootstrap is not explicitly enabled.

A real SMS provider is not required for the current development phase. Twilio or another paid SMS provider must remain inactive until production delivery, sender identity, rate limits, and cost controls are approved.

## Sentry

Preview and production require the variables defined in `JRN-SENTRY-ACTIVATION.md`. Development may run with Sentry disabled.

## Setup and verification

Place the four Firebase files under the governed local secret paths or point `infra/local/mobile.env` at equivalent secure paths. Set the captain map key in that same ignored file, then run:

```powershell
pnpm run mobile:firebase:setup:dev
pnpm run mobile:eas:preflight:all:dev
pnpm run mobile:eas:build:all:dev
```

The setup command uploads each Firebase file only to its matching EAS project. It also uploads the Google Maps key only to the captain project.

The governed build runner validates local file paths and package names before spending an EAS build. Firebase files and provider keys remain ignored by Git.

A successful EAS artifact is technical evidence only and cannot promote SaaS commercial or financial readiness.

# Mobile EAS environment activation

## Isolation model

Each mobile surface is a separate EAS project and must own its own environment variables and credentials. Variables from one application must never be copied into another application merely because both belong to the same monorepo.

Environments are fixed:

| Build profile | EAS environment | Update channel |
| --- | --- | --- |
| `development` | `development` | `development` |
| `internal` | `preview` | `preview` |
| `production` | `production` | `production` |

## Required Android notification file

Create a File environment variable named `GOOGLE_SERVICES_JSON` in every EAS project/environment that enables remote notifications. The value must be the Firebase file whose Android package exactly matches that application:

- `com.bthwani.client.next`
- `com.bthwani.partner.next`
- `com.bthwani.captain.next`
- `com.bthwani.field.next`

The file is referenced through `process.env.GOOGLE_SERVICES_JSON`. It must not be committed or shared across applications.

## Maps

`app-captain` requires `GOOGLE_MAPS_ANDROID_API_KEY` for Android and `GOOGLE_MAPS_IOS_API_KEY` for iOS. Keys must be restricted by package/bundle identifier, signing certificate and enabled APIs. Client-supplied keys or unrestricted project-wide keys are forbidden.

## Sentry

Preview and production require the variables defined in `JRN-SENTRY-ACTIVATION.md`. Development may run with Sentry disabled.

## Local preflight

The governed build runner intentionally validates local file paths before it spends an EAS build. Pull or provide a local copy of the matching File variable and set `GOOGLE_SERVICES_JSON` to that path for preflight. The file remains ignored by Git.

Production deployment authorization remains separate from successful mobile compilation. A successful EAS artifact is technical evidence only and cannot promote SaaS commercial or financial readiness.

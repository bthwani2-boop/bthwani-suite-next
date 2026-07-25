# Mobile Android EAS workflow

## Scope

This runbook covers Android development builds for the four mobile applications:

- `app-client`
- `app-partner`
- `app-captain`
- `app-field`

Every operation targets exactly one application. All-app initialization, preflight, and build commands are prohibited.

## Single entry point

Use only:

```powershell
pnpm mobile:eas -- -App <app-key> -Mode <mode>
```

Supported modes:

1. `Initialize`
2. `Preflight`
3. `Build`

The required order is:

```text
Initialize -> Preflight -> Build
```

## Initialize

Run once for the selected application, or again only when its signing or provider inputs change:

```powershell
pnpm mobile:eas -- -App app-field -Mode Initialize
```

`Initialize` performs only the missing work for that application:

- creates or reuses its isolated Android development keystore;
- records the keystore SHA-1 used by the restricted Maps key;
- creates or reuses its Firebase Android application in `bthwani-platform`;
- downloads and validates its package-specific `google-services.json`;
- creates or reuses its package-and-SHA-1-restricted Android Maps key;
- stages the validated local inputs used by Expo and EAS.

It does not submit a build.

## Preflight

Run the selected application preflight without submitting a build:

```powershell
pnpm mobile:eas -- -App app-field -Mode Preflight
```

The preflight is application-scoped and performs:

- Expo/EAS configuration synchronization checks for the selected application;
- Firebase and Maps input validation;
- TypeScript checking;
- Expo Doctor;
- local Expo export;
- native prebuild verification.

A successful preflight writes an ignored local stamp bound to the current Git commit and the exact Firebase, Maps, and signing inputs.

## Build

After a successful current preflight, submit one remote build:

```powershell
pnpm mobile:eas -- -App app-field -Mode Build
```

To clear the remote build cache:

```powershell
pnpm mobile:eas -- -App app-field -Mode Build -ClearCache
```

`Build` fails closed when the commit or any validated input changed after preflight. It never builds another application.

## Generated local files

The workflow may create these ignored files:

```text
C:\bthwani-secrets\firebase\<app>\google-services.json
C:\bthwani-secrets\eas\android\<app>\development.jks
apps\<app>\runtime\credentials.json
apps\<app>\runtime\google-services.json
apps\<app>\runtime\.env.local
infra\local\mobile.env
secrets.local.mobile.json
tools\scripts\google-cloud\google-platform-input.local.json
.tmp\mobile-eas\<app>-development-android.json
```

Secrets and generated native inputs must not be committed.

## Firebase and Maps ownership

The governed Google project is `bthwani-platform`.

Each application remains isolated by:

- Android package name;
- Firebase App ID;
- Expo/EAS project ID;
- development signing certificate;
- Android Maps API key restricted to the exact package and SHA-1.

## Push sending credential

The FCM V1 service-account credential is an operational sending credential. It is not required to compile an Android APK and is intentionally excluded from `Initialize`, `Preflight`, and `Build`.

Configure and verify push delivery separately after the application binary builds and installs successfully.

## Execution sequence

Complete one application before starting the next:

```powershell
pnpm mobile:eas -- -App app-field -Mode Initialize
pnpm mobile:eas -- -App app-field -Mode Preflight
pnpm mobile:eas -- -App app-field -Mode Build
```

Then repeat the same three commands for another app by changing only `-App`.

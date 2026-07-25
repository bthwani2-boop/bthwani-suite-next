# BThwani Google Cloud scripted setup

This folder contains local PowerShell automation for Google Cloud Console setup.

No script stores Google secrets in Git.

## What must still be done manually first

Google Cloud Billing activation must be completed by the account owner in the Google Cloud Console. A script can link an already-active billing account to a project, but it cannot create a payment profile or activate a suspended/free-trial billing account.

## Scripts

### `bootstrap-google-cloud-console.ps1`

Use this first. It can:

- authenticate `gcloud` interactively,
- select and verify a Google Cloud project,
- grant least-privilege project access to a selected Google account,
- optionally grant billing-link permissions when a billing account id is supplied,
- link an active billing account to the project,
- enable the services needed for Android Google Maps API keys.

Example, self setup without granting another user:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass `
  -File tools/scripts/google-cloud/bootstrap-google-cloud-console.ps1 `
  -ProjectId bthwani-platform `
  -BillingAccountId 01287E-01F576-ACBB90 `
  -Login `
  -LinkBilling `
  -EnableMapsSdkAndroid
```

Example, grant a second Google account controlled Maps setup access:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass `
  -File tools/scripts/google-cloud/bootstrap-google-cloud-console.ps1 `
  -ProjectId bthwani-platform `
  -BillingAccountId 01287E-01F576-ACBB90 `
  -GrantConsoleAccess `
  -GrantPrincipalEmail operator@example.com `
  -AccessProfile billing-linker
```

Access profiles:

- `read-only`: project viewer only.
- `maps-setup`: viewer + service enablement + API key management.
- `billing-linker`: maps setup + project billing manager + billing account user on the supplied billing account.

### `create-android-maps-api-key.ps1`

Use this after you have the EAS Android SHA-1 fingerprint for the app signing credentials.

For app-field development:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass `
  -File tools/scripts/google-cloud/create-android-maps-api-key.ps1 `
  -ProjectId bthwani-platform `
  -AppKey app-field `
  -PackageName com.bthwani.field.next `
  -Sha1Fingerprint "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD" `
  -UploadToEas
```

The script creates or updates a key restricted to:

- Android package name,
- SHA-1 certificate fingerprint,
- `maps-android-backend.googleapis.com` only.

If `-UploadToEas` is present, the key is passed in-memory to `tools/scripts/repair-mobile-eas-maps-variable.ps1` and uploaded to the matching EAS project environment.

## Current package names

- app-client: `com.bthwani.client.next`
- app-partner: `com.bthwani.partner.next`
- app-captain: `com.bthwani.captain.next`
- app-field: `com.bthwani.field.next`

Use one Google Cloud project, but use one restricted Android Maps API key per app when maps are enabled.

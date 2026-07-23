# BThwani Sentry factory reset

This directory contains the governed Sentry reset for organization `bthwani`.

## Operation

The reset:

- removes local Sentry CLI state and old Sentry values from `infra/local/mobile.env` after creating a timestamped backup;
- opens Sentry OAuth login and requests organization/project administration plus `org:ci`;
- deletes every existing Sentry project in `bthwani` and waits for asynchronous deletion;
- recreates the four mobile projects, Control Panel, Identity, Workforce, Platform Control, Providers, DSH, and WLT projects;
- creates or reads the public DSN for every project;
- deletes and recreates only Sentry-related EAS variables for `development`, `preview`, and `production` across the four mobile apps;
- installs a Windows task that refreshes the OAuth token and synchronizes it to EAS every 14 days;
- verifies the recreated project set.

It does not delete EAS projects, EAS builds, signing credentials, Firebase configuration, non-Sentry EAS variables, or repository code.

## Run

```powershell
cd C:\bthwani-suite-next

pwsh -NoProfile -ExecutionPolicy Bypass -File `
  "tools\scripts\sentry\factory-reset.ps1" `
  -ConfirmFullReset
```

The `-ConfirmFullReset` switch is mandatory because all projects in the Sentry organization are deleted.

Optional switches:

```powershell
-SkipEas
-SkipScheduledRefresh
```

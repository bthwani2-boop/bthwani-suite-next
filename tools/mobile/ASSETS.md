# Governed Expo mobile asset contract

Each application must contain the following tracked files before a remote EAS build:

```text
apps/<app-key>/runtime/assets/icon.png
apps/<app-key>/runtime/assets/adaptive-icon.png
apps/<app-key>/runtime/assets/splash-icon.png
apps/<app-key>/runtime/assets/notification-icon.png
```

Requirements:

- `icon.png`: square production brand icon, 1024×1024 recommended, no environment badges.
- `adaptive-icon.png`: Android foreground artwork with safe padding and transparent background.
- `splash-icon.png`: centered transparent brand artwork suitable for a white splash background.
- `notification-icon.png`: Android-only 96×96 all-white glyph with transparency.
- Files are source inputs, not generated build outputs.
- The four surfaces may use differentiated glyphs, but the brand system and ownership must remain consistent.
- No tenant logo may replace the sovereign application identity. Tenant branding belongs to governed runtime content or a future white-label entitlement, not to an unreviewed native build.

`defineBthwaniExpoApp.js` binds these files when present. `guard-mobile-apps.mjs --require-build-secrets` blocks remote builds when any file is absent.

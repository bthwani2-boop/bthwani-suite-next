---
name: bthwani-platform-runtime-config
description: Control runtime variables, providers, auth/session shell, and service slots safely.
---

# bthwani-platform-runtime-config

## Use when

- Environment variables, app shell bootstrap, provider config, or service slot wiring is touched.

## Procedure

1. Keep runtime config explicit and centralized.
2. Do not hardcode LAN/IP/base URLs in screens.
3. Do not use preview/demo/mock runtime data in live paths.
4. Ensure app shell owns bootstrap only, not service business logic.

## Evidence / checks

Run targeted typecheck and provider/guard checks for touched paths. For env changes, include redacted env evidence and rollback note.



## Global constraints

- Target root: `C:\bthwani-suite-next`.
- Use PowerShell and `pnpm`; never use `npx`.
- Keep scope narrow; do not touch unrelated files.
- Do not claim closure without evidence.
- Prefer targeted checks over full workspace checks unless risk justifies more.

---
name: bthwani-service-fullstack-slice
description: Implement service-owned full-stack slices with backend, contract, frontend, runtime, and evidence alignment.
---

# bthwani-service-fullstack-slice

## Use when

- A DSH/WLT or other service slice is being implemented or closed.

## Procedure

1. Identify service, surface, capability, owner, API contract, runtime path, and evidence session.
2. Keep logic inside `services/<service>` and reusable UI in `shared/ui-kit`.
3. Bind screen/route/client to OpenAPI or typed contract.
4. Prove loading/empty/error/success/offline/disabled states for affected UI.
5. Verify backend/frontend/runtime gates relevant to the slice.

## Evidence / checks

Use `pnpm -w run slice:gate` only when slice scope justifies it. Otherwise run targeted typecheck/tests/contracts/smoke commands.



## Global constraints

- Target root: `C:\bthwani-suite-next`.
- Use PowerShell and `pnpm`; never use `npx`.
- Keep scope narrow; do not touch unrelated files.
- Do not claim closure without evidence.
- Prefer targeted checks over full workspace checks unless risk justifies more.

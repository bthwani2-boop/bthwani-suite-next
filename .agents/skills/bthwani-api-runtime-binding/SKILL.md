---
name: bthwani-api-runtime-binding
description: Connect OpenAPI/contracts, generated clients, runtime env, and screen/service consumers.
---

# bthwani-api-runtime-binding

## Use when

- API, OpenAPI, client generation, env base URL, direct fetch, or frontend binding is involved.

## Procedure

1. Start from `contracts` and approved service API.
2. Generate/update typed client only when contract change is intentional.
3. Prohibit direct `fetch` in screens.
4. Validate env/provider configuration and runtime binding.
5. Check both backend and consumer side for breakage.

## Evidence / checks

Run contract lint and targeted consumer typecheck. Use `tools/guards/no-direct-fetch-in-screen.mjs` when frontend screens are touched.



## Global constraints

- Target root: `C:\bthwani-suite-next`.
- Use PowerShell and `pnpm`; never use `npx`.
- Keep scope narrow; do not touch unrelated files.
- Do not claim closure without evidence.
- Prefer targeted checks over full workspace checks unless risk justifies more.

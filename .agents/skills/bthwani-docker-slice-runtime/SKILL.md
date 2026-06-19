---
name: bthwani-docker-slice-runtime
description: Verify local Docker-backed runtime for slices without treating stale compose as truth.
---

# bthwani-docker-slice-runtime

## Use when

- Docker compose, DB, local runtime, smoke, migrations, or provider data plane is involved.

## Procedure

1. Confirm compose path under `infra/docker`.
2. Confirm env and ports are intentional.
3. Start/stop/reset only through approved scripts.
4. Do not claim runtime pass without container status, logs/smoke output, and relevant API evidence.

## Evidence / checks

```powershell
Set-Location -LiteralPath "C:\bthwani-suite-next"
pnpm -w run docker:runtime:up
pnpm -w run docker:runtime:smoke
```



## Global constraints

- Target root: `C:\bthwani-suite-next`.
- Use PowerShell and `pnpm`; never use `npx`.
- Keep scope narrow; do not touch unrelated files.
- Do not claim closure without evidence.
- Prefer targeted checks over full workspace checks unless risk justifies more.

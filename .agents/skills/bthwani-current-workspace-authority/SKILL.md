---
name: bthwani-current-workspace-authority
description: Verify the active bthwani-suite-next workspace, branch, paths, and package manager before acting.
---

# bthwani-current-workspace-authority

## Use when

- The task depends on current repo structure, branch, local paths, or workspace layout.
- A donor snapshot or old path may be confused with the new repo.

## Procedure

1. Confirm root is `C:\bthwani-suite-next`.
2. Read `package.json`, `pnpm-workspace.yaml`, and relevant governance/machine-readable files.
3. Treat `realtest` and uploaded snapshots as donor/reference only.
4. Mark unknowns as `UNPROVEN`.

## Evidence / checks

```powershell
Set-Location -LiteralPath "C:\bthwani-suite-next"
git branch --show-current
git --no-pager status --short
git --no-pager log --oneline -n 3
Get-Content .\package.json -Raw
Get-Content .\pnpm-workspace.yaml -Raw
```



## Global constraints

- Target root: `C:\bthwani-suite-next`.
- Use PowerShell and `pnpm`; never use `npx`.
- Keep scope narrow; do not touch unrelated files.
- Do not claim closure without evidence.
- Prefer targeted checks over full workspace checks unless risk justifies more.

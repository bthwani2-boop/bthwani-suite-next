---
name: bthwani-patch-review-evidence
description: Review local changes, Copilot edits, or scripted changes using git evidence only.
---

# bthwani-patch-review-evidence

## Use when

- The user provides or requests review of local changes, patches, staged files, or untracked files.

## Procedure

1. Require status, diff stat, name-status, diff check, and untracked list.
2. Check changed files against approved scope.
3. Inspect staged and untracked files separately.
4. Decide: PASS, PASS_WITH_WARNINGS, FIX_REQUIRED, BLOCKED, REVERT_REQUIRED, READY_FOR_PR, NEEDS_EVIDENCE.

## Evidence / checks

```powershell
Set-Location -LiteralPath "C:\bthwani-suite-next"
git --no-pager status --short
git --no-pager diff --stat
git --no-pager diff --name-status
git --no-pager diff --check
git ls-files --others --exclude-standard
```



## Global constraints

- Target root: `C:\bthwani-suite-next`.
- Use PowerShell and `pnpm`; never use `npx`.
- Keep scope narrow; do not touch unrelated files.
- Do not claim closure without evidence.
- Prefer targeted checks over full workspace checks unless risk justifies more.

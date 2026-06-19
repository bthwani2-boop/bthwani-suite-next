---
name: bthwani-graphify-context-tool
description: Use Graphify for context/navigation only, not as an agent or acceptance gate.
---

# bthwani-graphify-context-tool

## Use when

- File scope is unknown.
- Imports/exports, service links, or cross-surface relationships must be traced.

## Procedure

1. Ask a focused graph question.
2. Use results only to narrow paths.
3. Continue with direct file inspection and gate router.
4. Do not update graph unless stale data blocks the task.

## Evidence / checks

```powershell
Set-Location -LiteralPath "C:\bthwani-suite-next"
graphify query "<focused question>"
graphify path "<source>" "<target>"
graphify explain "<concept>"
```

## Forbidden

- Treating Graphify as an orchestrator.
- Running `graphify update .` automatically.
- Claiming `PASS` from Graphify output.

## Global constraints

- Target root: `C:\bthwani-suite-next`.
- Use PowerShell and `pnpm`; never use `npx`.
- Keep scope narrow; do not touch unrelated files.
- Do not claim closure without evidence.
- Prefer targeted checks over full workspace checks unless risk justifies more.

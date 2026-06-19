---
name: bthwani-foundation-execution
description: Execute new repo foundation work without drifting into service implementation prematurely.
---

# bthwani-foundation-execution

## Use when

- Work affects root package, workspace layout, governance, tools, guards, baseline contracts, or foundation gates.

## Procedure

1. Confirm foundation owner and target path.
2. Keep apps as runtime shells and services as domain owners.
3. Validate package/workspace/toolchain before adding layers.
4. Do not implement service slices before foundation gate inputs exist.

## Evidence / checks

Run root status, diff check, targeted script syntax, and `pnpm -w run typecheck` only when files changed in TypeScript/workspace paths.



## Global constraints

- Target root: `C:\bthwani-suite-next`.
- Use PowerShell and `pnpm`; never use `npx`.
- Keep scope narrow; do not touch unrelated files.
- Do not claim closure without evidence.
- Prefer targeted checks over full workspace checks unless risk justifies more.

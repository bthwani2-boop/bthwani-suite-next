---
name: bthwani-evidence-gate-router
description: Choose the minimum correct verification gate and avoid all-tools-at-once execution.
---

# bthwani-evidence-gate-router

## Use when

- Before any implementation or review where risk level and evidence depth must be selected.

## Procedure

1. Classify task: LOW, MEDIUM, UI, BACKEND/API, RUNTIME, HIGH, CRITICAL.
2. Choose the narrowest skill and checks.
3. Use Graphify only for unknown cross-file relationships.
4. Do not create evidence folders/ZIP unless the user asks or risk requires it.

## Evidence / checks

Minimum after writes: `git status`, `git diff --check`, and the narrowest relevant type/test/guard command.
For UI, add screenshots or mark `NEEDS_VISUAL_EVIDENCE`.
For HIGH, export/review patch before acceptance.

## Forbidden

- Running all guards by default.
- Running full workspace `typecheck` for docs-only changes.
- Using Graphify output as final proof.

## Global constraints

- Target root: `C:\bthwani-suite-next`.
- Use PowerShell and `pnpm`; never use `npx`.
- Keep scope narrow; do not touch unrelated files.
- Do not claim closure without evidence.
- Prefer targeted checks over full workspace checks unless risk justifies more.

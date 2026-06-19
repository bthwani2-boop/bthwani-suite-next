---
name: bthwani-clean-code-guard
description: Keep code changes minimal, readable, non-duplicated, and root-cause based.
---

# bthwani-clean-code-guard

## Use when

- Refactor, cleanup, duplicate removal, code quality, or logic hardening is requested.

## Procedure

1. Prove the target files and reason.
2. Prefer small root-cause fixes over broad rewrites.
3. Remove duplication only after proving consumers/imports.
4. Do not hide errors with casts, `any`, or dead branches.
5. Preserve public contracts or add compatibility aliases when required.

## Evidence / checks

Use targeted syntax/type checks. For multi-file refactor, run `git diff --check`, targeted typecheck, and import/guard checks relevant to touched paths.

## Forbidden

- Formatting the whole repo.
- Blind global replace.
- Deleting files without import/export/runtime proof.

## Global constraints

- Target root: `C:\bthwani-suite-next`.
- Use PowerShell and `pnpm`; never use `npx`.
- Keep scope narrow; do not touch unrelated files.
- Do not claim closure without evidence.
- Prefer targeted checks over full workspace checks unless risk justifies more.

---
name: bthwani-legacy-extraction
description: Extract value from realtest/donor snapshots without copying noise or stale architecture.
---

# bthwani-legacy-extraction

## Use when

- Any file, skill, screen, guard, or logic is considered from `realtest` or uploaded donor packages.

## Procedure

1. Classify source as DONOR_REFERENCE.
2. Identify target owner, target path, consumer, runtime purpose, acceptance gate, and rollback.
3. Extract concept or minimal code only after conflict review.
4. Rewrite for `bthwani-suite-next` paths and current governance.

## Evidence / checks

Evidence must include source path, target path, decision, risks, and verification command.
Reject extraction if owner/path/contract is not proven.

## Forbidden

- Copying full donor directories.
- Importing old `C:\bthwani-suite` rules.
- Restoring large Nx generic skill dumps.

## Global constraints

- Target root: `C:\bthwani-suite-next`.
- Use PowerShell and `pnpm`; never use `npx`.
- Keep scope narrow; do not touch unrelated files.
- Do not claim closure without evidence.
- Prefer targeted checks over full workspace checks unless risk justifies more.

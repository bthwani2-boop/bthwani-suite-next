# GitHub Operating System

This repository uses GitHub as the decision gate, not only as remote storage.

## Flow

1. Issue defines scope, affected surfaces, and required evidence.
2. Branch implements the smallest safe change.
3. Pull request links the issue and lists affected DSH/WLT surfaces.
4. GitHub Actions runs required checks on the exact commit SHA.
5. CODEOWNERS review covers service, runtime, CI, and contract changes.
6. Merge is blocked until checks are green and review is complete.

## Required Labels

- `bug`
- `slice`
- `runtime`
- `gate`
- `security`
- `needs-evidence`
- `fix-required`

## Required Checks

The merge decision must be based on GitHub Actions results for the exact SHA under review. Required checks include contracts, frontend ownership guards, no-financial-mutation guards, Go backends, DB integration when present, Docker runtime smoke, typecheck, test, build, foundation gate, and slice gate.

## Closure Rule

Do not write `READY`, `CLOSED`, or `100%` unless the exact GitHub SHA has green required checks and the PR contains concise evidence for runtime, contracts, data, and ownership boundaries.

Use `READY_CANDIDATE` only after all required checks pass but before final human review and merge.

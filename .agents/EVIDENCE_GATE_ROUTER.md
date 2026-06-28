# Evidence Gate Router

Goal: choose the smallest sufficient code-based check.

## Default mode — CODE_BASED_LEAN

Use this for normal implementation.

Required:
- inspect directly relevant code paths
- implement the smallest safe diff
- run one targeted package/type/build/test/guard check only when useful and available
- summarize changed paths, check result, and remaining risk

Not required by default:
- evidence packs
- handoff ZIPs
- command logs
- screenshots or recordings
- visual evidence packs
- Graphify
- Nx graph
- full repository typecheck/test/build
- full guard suite
- repeated status/diff artifacts

## Gate levels

### LOW
Text/doc/agent wording only.
No evidence files.
Use direct text review.

### FOCUSED
Source code within one clear module.
Use targeted code-based check only when useful.

### STANDARD
Multi-file or cross-layer but ownership is clear.
Use affected/touched-area checks only.

### UI
Code-based check first.
Screenshot/recording required only for final visual closure, redesign approval, or explicit user request.

### API
Contract/client checks only when OpenAPI, generated client, adapter, or backend binding changed.

### RUNTIME
Runtime smoke only when runtime behavior changed or is claimed.

### HIGH
Move/delete/refactor/boundary/public API.
Use targeted verification and rollback awareness.
Evidence pack only when requested or review-critical.

### CRITICAL
Remote writes, branch mutation, destructive operations.
Blocked unless explicitly requested.

## Decision output

Every review must end with one of:

`PASS`, `PASS_WITH_WARNINGS`, `FIX_REQUIRED`, `BLOCKED`, `READY_FOR_PR`, `REVERT_REQUIRED`, `NEEDS_EVIDENCE`, `NEEDS_VISUAL_EVIDENCE`, `NO_ACTION_REQUIRED`.

Use `NEEDS_EVIDENCE` or `NEEDS_VISUAL_EVIDENCE` only when escalation rules make evidence required.

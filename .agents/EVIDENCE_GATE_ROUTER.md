# Evidence Gate Router

Goal: choose the smallest sufficient code-based check.

## Default mode — CODE_BASED_LEAN

The canonical policy for default execution is detailed in [LEAN_CODE_BASED_CHECK.md](../governance/LEAN_CODE_BASED_CHECK.md).

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

All token-drain path and file exclusions from [LEAN_CODE_BASED_CHECK.md](../governance/LEAN_CODE_BASED_CHECK.md) apply to all scans and file checks.

## Automation and Sizing Policy
* **LeanCTX Lifecycle Integration**: Sizing down a gate does not bypass LeanCTX. LeanCTX must be utilized in the understanding and diagnostic phase of all tasks. Automated execution scripts or guards are strictly for the execution and verification/evidence phase as required.
* **Automation is Mandatory**: Choosing the smallest sufficient verification level (e.g. `LOW` or `FOCUSED`) does NOT bypass the requirement for automated verification. It does not mean a script is always created (as per the Smart Automation Selection levels), nor does it permit manual edits without verification. It demands code-based automated verification appropriate to the scope (such as targeted guard runs, `git diff --check`, or precise status tools).
* **No Manual Chasing**: Sizing down a gate must never be used to justify arbitrary manual files modifications without automated validation checks.


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
Normal UI work uses code-based validation. Do not block implementation or closure due to lack of screenshots.
Screenshot/recording required only for final visual closure, visual parity approval, release/store visual requirements, or explicit user request.

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

Use `NEEDS_VISUAL_EVIDENCE` only when visual evidence is required for explicit visual request, final visual closure, visual parity approval, or release/store visual requirements. Use `NEEDS_EVIDENCE` only when escalation rules make evidence files mandatory.

## Closure Vocabulary Alignment

When the task is code-only, do not return a generic `PASS` if it can be misread as runtime proof. Use precise closure results instead, matched to the evidence actually produced:

- `CODE_CHECK_PASS`: static/code checks passed, no runtime claim.
- `CODE_CHECK_FAIL`: static/code checks failed.
- `DSH_WLT_CODE_CLOSURE_PASS`: DSH/WLT code closure passed, no runtime claim.
- `DSH_WLT_CODE_CLOSURE_FAIL`: DSH/WLT code closure failed.
- `RUNTIME_SMOKE_PASS`: runtime smoke was executed and passed.
- `RUNTIME_SMOKE_FAIL`: runtime smoke failed.
- `UI_VISUAL_PASS`: visual proof was produced and accepted.
- `BLOCKED_EXTERNAL`: blocked by secret, permission, device, external service, or unavailable environment.
- `PROTOCOL_VIOLATION`: required governance or command policy was skipped.

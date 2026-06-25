# BThwani Agent Layer

Version: 2026.06.24-v1

This directory supports agent routing, boundaries, adapters, and task-specific skills. `AGENTS.md` remains the main entry contract.

## Command Safety Policy

All operations must strictly conform to the [Command Safety Policy](./COMMAND_SAFETY_POLICY.md).

## Branch rule

Every agent must use the current local branch as the execution branch:

```text
ACTIVE_BRANCH = git branch --show-current
TARGET_BRANCH = ACTIVE_BRANCH
DEFAULT_BRANCH = ACTIVE_BRANCH
```

No tool may assume, switch, or prefer a remote metadata branch during execution. Local execution uses the active local branch only. Remote metadata may be used only for explicit remote audit, PR review, or GitHub diagnosis, and must never cause automatic local branch switching.

## Read order

1. `AGENTS.md`
2. `.agents/COMMAND_SAFETY_POLICY.md`
3. `.agents/INDEX.md`
4. `.agents/AUTHORITY_BOUNDARY.md`
5. `.agents/EVIDENCE_GATE_ROUTER.md` when choosing verification
6. One or two task-specific skills only

Do not read every skill by default.

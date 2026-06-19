# BThwani Agent Layer

Version: 2026.06.19-strict-branch-safe

This directory supports agent routing, boundaries, adapters, and task-specific skills. `AGENTS.md` remains the main entry contract.

## Branch rule

Every agent must use the current local branch as the execution branch:

```text
ACTIVE_BRANCH = git branch --show-current
TARGET_BRANCH = ACTIVE_BRANCH
DEFAULT_BRANCH = ACTIVE_BRANCH
```

No tool may assume, switch, or prefer a remote metadata branch during execution.

## Read order

1. `AGENTS.md`
2. `.agents/INDEX.md`
3. `.agents/AUTHORITY_BOUNDARY.md`
4. `.agents/EVIDENCE_GATE_ROUTER.md` when choosing verification
5. One or two task-specific skills only

Do not read every skill by default.

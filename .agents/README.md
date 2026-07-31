# BThwani Agent Layer

`AGENTS.md` is the only default instruction entry point.

## Minimal read order

For normal repository work, read only:

1. `AGENTS.md`
2. `.agents/COMMAND_SAFETY_POLICY.md` before a write or destructive command

Read `.agents/INDEX.md` only when a governed skill must be selected. Load one task-specific `SKILL.md`; load a second only when a separate risk domain is actually affected.

Do not preload every skill, adapter, catalog, governance document, journey file, diagnostic report, or historical audit.

## Branch rule

- Local task: use the active local branch unless the user names another branch.
- Remote task: use the exact user-named remote branch and pin its current commit SHA.
- Never replace an explicit remote target with the local branch, default branch, stale diagnostics, or a prior pull request.
- Re-pin before each write batch and after the final push.

## Tool adapters

Adapters are compatibility shims only. They must defer to `AGENTS.md`, may not add mandatory tools, and may not widen the default read order.

Graphify, LeanCTX, Nx, runtime environments, and full verification suites are conditional tools. Use them only when the task evidence requires them.

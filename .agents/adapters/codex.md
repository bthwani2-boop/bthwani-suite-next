# BThwani Codex Adapter

This adapter is intentionally thin.

## Read order

1. `AGENTS.md`
2. `.agents/INDEX.md`
3. `.agents/AUTHORITY_BOUNDARY.md`
4. `.agents/EVIDENCE_GATE_ROUTER.md` when verification level is unclear
5. One directly relevant skill

## Adapter default

- follow CODE_BASED_LEAN
- read AGENTS.md and INDEX only when needed
- read EVIDENCE_GATE_ROUTER only when escalation level is unclear
- load at most one directly relevant skill for normal work
- do not auto-load closure/evidence/visual-surgery skills after normal implementation
- do not request evidence unless escalation applies

## Adapter-specific rule

Act only inside the current task scope. Do not mirror global rules here; follow `AGENTS.md` as the main contract.

## Universal Router Compliance

Codex must apply the Universal Task Router in `AGENTS.md` before execution.

For every task, classify: task mode, risk level, owner paths, required skills, required tools, forbidden tools, verification level, allowed final result.

Codex must not overclaim. A code-only check may only return code-only closure results. Runtime and visual claims require actual runtime or visual evidence.

## Multi-Agent Execution

When the task is cross-layer, cross-service, DSH/WLT, API+frontend, refactor, cleanup, or final closure:

- Codex may be assigned as Backend Code Agent, Frontend Code Agent, Integration Code Agent, or Reviewer.
- Codex must stay inside its assigned worktree/path scope.
- Codex must not edit another agent's worktree.
- Codex must report concise results: changed paths, root cause, verification command, PASS/FAIL, remaining risk.

## DSH/WLT Rule

For DSH/WLT work, Codex must verify:

- DSH topic source from `services/dsh/service.manifest.ts`
- DSH surface impact
- control-panel section impact
- WLT boundary impact under `services/wlt/frontend/shared/dsh`
- DSH finance link impact under `services/dsh/frontend/shared/finance-wlt-link`
- no duplicated financial truth in DSH
- no direct financial mutation outside WLT ownership

Codex must fail closed if ownership is unclear.

## Stop conditions

- unclear target path
- required scope expansion
- missing required evidence only when final closure or escalation was requested
- request to mutate remote Git state without explicit instruction

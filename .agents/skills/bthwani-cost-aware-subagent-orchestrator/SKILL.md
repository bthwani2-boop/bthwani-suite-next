---
name: bthwani-cost-aware-subagent-orchestrator
version: 2026.07.17-v1
summary: Coordinate hierarchical subagents using capability-aware, cost-aware, context-minimized execution.
---

# bthwani-cost-aware-subagent-orchestrator

## Purpose

Coordinate hierarchical subagents for BThwani tasks so the strongest available agent stays as advisory supervisor and architect, while the least-cost capable executor performs each bounded work unit. Enforce non-overlapping ownership, minimal context per agent, structured merge, and independent review of high-risk results. This skill only orchestrates; it never duplicates the logic of specialist skills.

## Invoke when

- The user explicitly asks to create or use subagents, model/cost routing, or hierarchical delegation.
- At least two independent work units exist that can run without overlapping writes.
- Clear multi-layer work exists: Contract, Backend, Database, Frontend, Runtime, Verification.
- Decomposition reduces wall-clock time, reduces context per agent, or raises specialization accuracy.
- A central coordinator is needed to review the outputs of several executors.

## Do not invoke when

- The task is a small single-file edit.
- The task is a text/typo correction.
- The task is simple reading or explanation.
- The task is a chain of related changes inside the same file.
- The execution platform provides no real subagent capability.
- Coordination cost would exceed direct execution cost.

## Read before

Read only from the branch resolved by `bthwani-current-workspace-authority`:

- `AGENTS.md`
- `.agents/INDEX.md`
- `.agents/SKILL_CATALOG.md`
- `.agents/skills/bthwani-cost-aware-subagent-orchestrator/references/WORK_UNIT_CONTRACT.md`
- `.agents/skills/bthwani-cost-aware-subagent-orchestrator/references/MODEL_ROUTING_AND_TOKEN_POLICY.md`

Reference, do not inline, the owner skills listed in `## Integration with existing skills`.

## Authority boundary

- This skill is a coordinator only. It does not own SDLC gate state, WLT/finance truth, security policy, or Graphify logic.
- It never claims human or regulatory approval that does not exist.
- Agent review never substitutes for formal SDLC approvals owned by `bthwani-sdlc-stage-gate-orchestrator`.
- Final multi-dimensional closure remains owned by `bthwani-final-journey-closure-judge`.
- Allowed results: `CODE_CHECK_PASS`, `CODE_CHECK_FAIL`, `BLOCKED_EXTERNAL`. No runtime claim is allowed from this skill.

## Delegation decision

Delegate when decomposition yields independent, non-overlapping work units whose combined cost (including coordination) is lower or whose accuracy is higher than direct execution. Do not delegate tiny single-scope tasks. Choose the lowest capability tier that satisfies the required capability, risk constraints, and verification requirements — never the cheapest tier blindly.

## Supervisor contract

Define the top coordinator as `MASTER_ADVISORY_SUPERVISOR`. It is responsible for:

- Understanding the user goal and constraints.
- Pinning repository, branch, and resolved commit (via `bthwani-current-workspace-authority`).
- Classifying risk (via `bthwani-universal-task-router`).
- Defining ownership scopes and non-overlapping write boundaries.
- Building the work-unit DAG.
- Deciding what may run in parallel.
- Selecting the capability tier for each work unit.
- Reviewing structured results and detecting conflicts.
- Requesting re-execution or escalation when needed.
- Selecting the final verification and issuing the final decision.

The supervisor is the strongest available agent (`T3_ADVISORY_MAX`) and is preserved for coordination, cross-layer architecture, conflict analysis, and high-risk review. It does not perform small mechanical edits that a lower-cost agent can safely do. The supervisor may edit directly only when the task is small and indivisible, when spawning a subagent costs more, or when a final bounded conflict fix cannot be delegated without resending large context.

## Subagent roles

Define the possible roles but create only those actually required:

```text
RESEARCH_AGENT
PLANNING_AGENT
BACKEND_EXECUTOR
API_CONTRACT_EXECUTOR
FRONTEND_EXECUTOR
DATABASE_EXECUTOR
RUNTIME_EXECUTOR
SECURITY_SPECIALIST
FINANCE_WLT_SPECIALIST
VERIFICATION_AGENT
INDEPENDENT_REVIEWER
```

`PLANNING_AGENT` is optional; the supervisor plans by default. Use a separate planning agent only when scope is provably broad and a dedicated planner reduces total context.

## Work decomposition

Transform the task into a clear DAG. Each work unit must declare: one objective, a non-overlapping write scope, bounded inputs, measurable acceptance criteria, a targeted verification command, prior dependencies, risks, required capability tier, read-only or write mode, and allowed/forbidden paths.

Decompose by ownership, dependency direction, write boundaries, and independent-verifiability — not by section names alone. Default order for cross-cutting tasks:

```text
Architecture/Ownership
→ Contract
→ Backend
→ Database
→ Generated Client
→ Adapter/State
→ UI Surface
→ Runtime
→ Verification
```

Change the order only when repository structure proves a different one.

## Capability and cost routing

Use symbolic capability tiers, never hardcoded commercial model names or versions:

```text
T0_MINIMAL      limited reads, direct scoped search, small mechanical edits, non-sensitive formatting, structured extraction
T1_BALANCED     focused feature work, bounded module edits, limited frontend binding, targeted tests, multi-file changes within one owner
T2_SPECIALIST   API contracts, database logic, runtime behavior, security/auth/privacy, DSH/WLT/finance, migrations, in-scope architectural conflicts
T3_ADVISORY_MAX top coordination, cross-layer architecture, conflict analysis, remediation planning, high-risk review, final decision
```

Selection rule:

```text
selected_tier = lowest_cost_tier
  that satisfies required_capability
  and risk constraints
  and verification requirements
```

Never downgrade tier for cost if it risks accuracy, money, security, data, or public contracts. Full routing detail lives in `references/MODEL_ROUTING_AND_TOKEN_POLICY.md`.

If the platform does not actually offer model or tier selection: do not claim the model was changed; use the available logical roles; emit `routing_capability_limited: true`; record the intended routing as an applicable recommendation; continue with the strongest safe available configuration.

## Context minimization

Apply `CONTEXT_MINIMIZATION_POLICY`:

- Never send the whole repository to any agent.
- Never send full Git history unless proven necessary.
- Never send generated, cache, or build files that are not required.
- Do not repeat full global policies; pass their references only.
- Send relevant snippets or symbols instead of full files when sufficient.
- Use `allowed_paths` and `forbidden_paths` per work unit.
- Pass Graphify/search output as a relationship summary, not full output.
- Reuse prior diagnostics within the same run instead of repeating them.
- Stop the agent once acceptance criteria are met.
- Forbid long preambles and reports from executor agents.
- Forbid extended chain-of-thought or internal narration in the handoff.
- Require a short, structured result.
- Do not create evidence packs or persistent logs unless the user explicitly asks.

Logical effort budgets (no fixed token numbers, since they vary by platform and model):

```text
planning_budget: minimal_sufficient
executor_budget: scoped_to_work_unit
review_budget: risk_proportional
retry_budget: maximum_two_attempts_per_assertion
```

## Parallel execution rules

- Default maximum parallel executors is `2`.
- Raise to `4` only with four genuinely independent, non-overlapping scopes.
- Two agents must never write the same file.
- Two agents must never write folders that exchange generated files or shared contracts without a dependency order.
- Read-only research/read may run in parallel.
- Contract edit and client generation must be sequential.
- Migration edits and dependent code must declare explicit order.
- Independent review starts after writes complete, never in parallel with an unstable version.
- No open agent-chat-swarm pattern.
- All results return to the supervisor, not to an ungoverned chat network.

## Conflict prevention

- Assign disjoint `allowed_write_paths` per parallel work unit.
- Serialize any unit that produces inputs another unit consumes.
- Detect overlapping write scopes before dispatch; if detected, either serialize or re-scope.
- The supervisor reconciles all merges and resolves conflicts; conflicting units re-run with corrected scope, not force-merged.

## Independent verification

Apply independent reviewer separation in these domains:

```text
auth_sessions_rbac
tenant_isolation
pii_secrets_security
wlt_finance
migrations_production_data
infrastructure_ci_release
critical_high_vulnerabilities
```

In these domains: the executor may not self-approve its own change as final; use `INDEPENDENT_REVIEWER` at tier `T2_SPECIALIST` or higher; use `T3_ADVISORY_MAX` on conflict or critical risk. The supervisor does not claim human or regulatory approval; agent review does not replace formal SDLC approvals.

## Failure and escalation

- Escalate a failing work unit from `T0` to `T1` to `T2`; use `T3` for coordination and architectural decisions.
- Maximum two attempts per failing assertion.
- On escalation, do not resend the full context; send only the error, the affected snippet, the failing verification, and what was already tried.
- Do not re-run the same agent with the same prompt and unchanged inputs.
- If the same verification fails twice with no new information, stop with `BLOCKED_NEEDS_EVIDENCE`.

## Integration with existing skills

This skill orchestrates only and references owner skills instead of copying them:

- `bthwani-universal-task-router` — classifies task, risk, and required skills.
- `bthwani-current-workspace-authority` — pins repository, branch, and resolved ref.
- `bthwani-evidence-gate-router` — selects the appropriate proof level.
- `bthwani-guard-command-router` — selects existing verification commands.
- `graphify` — optional context tool for ownership/dependency clarity; not an agent.
- `bthwani-agent-skill-integrity` — validates this skill's structure and registration.
- `bthwani-sdlc-stage-gate-orchestrator` — owns SDLC stages and gates, not executor distribution.
- `bthwani-final-journey-closure-judge` — used only for final closure needing appropriate evidence.

Do not copy full SDLC, WLT, security, Graphify, or specialist-skill rules into this skill; refer to the owner skill.

## Forbidden behavior

- Copying an open-source agent framework into the repository.
- Adding AutoGen, CrewAI, LangGraph, an Agents SDK, or any runtime dependency.
- Running installers from external repositories.
- Copying `agency-agents` agents verbatim.
- Adding a submodule.
- Building an open agent chat network without a coordinator.
- Broadcasting full context to every agent.
- Hardcoding model names that may change.
- Treating price alone as the selection criterion.
- Using a low-capability agent for security, finance, or sensitive migrations.
- Letting an executor self-approve its own high-risk change.
- Editing DSH, WLT, Frontend, or Backend applications within this task.
- Editing dependency files or lockfiles.
- Editing CI or Docker.
- Creating tracked logs or run reports.
- Running full build, full test, or full Nx graph without a proven reason.
- Creating a duplicate skill in another path.

## Required output

Each executor returns a result matching the unified result contract in `references/WORK_UNIT_CONTRACT.md`: `work_unit_id`, `status`, `summary`, `changed_paths`, `findings`, `checks`, `assumptions`, `remaining_risks`, `conflicts`, `handoff`. Reject any agent result that does not match the contract or does not state what was changed and verified.

## Closure decision

The supervisor issues one allowed result:

- `CODE_CHECK_PASS` — all work units meet acceptance criteria, no unresolved conflicts, targeted checks pass, high-risk units independently reviewed.
- `CODE_CHECK_FAIL` — a work unit fails acceptance or verification and cannot be safely fixed within scope.
- `BLOCKED_EXTERNAL` — external access, platform capability, or new evidence is missing.

No runtime-verified, production-ready, or fully-closed claim is issued from this skill.

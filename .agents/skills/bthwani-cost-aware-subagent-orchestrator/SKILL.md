---
name: bthwani-cost-aware-subagent-orchestrator
version: 2026.07.17-v1
summary: Coordinate product-aware hierarchical subagents with non-overlapping ownership, minimum sufficient context, independent review, and deterministic merge.
---

# bthwani-cost-aware-subagent-orchestrator

## Purpose

Coordinate broad BThwani tasks so the strongest available agent remains the advisory supervisor while the lowest-cost capable agents execute bounded non-overlapping work units. Preserve product intent, authority separation, architecture ownership, minimal context, deterministic integration, and independent review.

This skill orchestrates only. It does not replace Product Truth, architecture, QA, security, release, WLT finance, runtime, or final-closure authorities.

## Invoke when

- The user explicitly requests subagents, hierarchical delegation, or cost-aware routing.
- At least two independent work units exist with non-overlapping write scopes.
- A task crosses product, contract, backend, database, frontend, runtime, or verification boundaries.
- Decomposition reduces context, execution time, or risk without fragmenting ownership.

## Do not invoke when

- The task is a small or indivisible edit.
- The platform offers no real subagent capability.
- Two work units would write the same file or shared generated boundary concurrently.
- Coordination overhead exceeds direct execution value.
- The task is analysis or wording only and needs no delegated execution.

## Read before

- `governance/authority/authority-precedence.json`
- `AGENTS.md`
- `governance/contracts/decision-vocabulary.json`
- `governance/product/PRODUCT_TRUTH_POLICY.md` when product impact applies
- `governance/agents/agent-registry.json`
- `governance/skills/skills-registry.json`
- `references/WORK_UNIT_CONTRACT.md`
- `references/MODEL_ROUTING_AND_TOKEN_POLICY.md`

## Authority boundary

- `MASTER_ADVISORY_SUPERVISOR` owns coordination, risk routing, conflict resolution, and scoped final synthesis.
- `PRODUCT_MANAGER_AUTHORITY` owns the problem, actors, outcome, scope, exclusions, priority, and product-model approval.
- `PRODUCT_OWNER_ACCEPTANCE_AUTHORITY` owns functional behavior, permissions, states, cross-surface acceptance, implementation readiness, and product acceptance.
- `UX_JOURNEY_AUTHORITY` owns human-facing journey coherence.
- `ARCHITECTURE_AUTHORITY` owns service boundaries, contracts, data flow, and dependency direction.
- Engineering executors own implementation and developer verification only.
- Independent QA, application security, release, and risk-acceptance authorities retain their formal decisions.
- Agent review never fabricates a missing human, regulatory, QA, security, release, or production approval.
- SaaS implementation is outside this skill unless explicitly authorized in a separate task.

## Supervisor contract

The supervisor must:

1. Pin repository, remote branch, and immutable commit.
2. Classify task mode, risk, and affected authorities.
3. Resolve Product Truth before architecture when product impact applies.
4. Define one objective and one owner for each work unit.
5. Define allowed read/write paths and forbidden paths.
6. Build a dependency DAG and identify safe parallelism.
7. Select the lowest capability tier that satisfies risk and verification needs.
8. Review every structured result and reject incomplete handoffs.
9. Resolve conflicts without force-merging or hiding failed checks.
10. Re-pin the branch after writes and before final verification.
11. Issue only a decision allowed by the canonical vocabulary.

## Logical roles

Create only roles needed by the current task:

```text
PRODUCT_MANAGER_ANALYST
PRODUCT_OWNER_ACCEPTANCE_REVIEWER
UX_JOURNEY_REVIEWER
RESEARCH_AGENT
ARCHITECTURE_PLANNER
API_CONTRACT_EXECUTOR
BACKEND_EXECUTOR
DATABASE_EXECUTOR
FRONTEND_EXECUTOR
RUNTIME_EXECUTOR
SECURITY_SPECIALIST
FINANCE_WLT_SPECIALIST
VERIFICATION_AGENT
INDEPENDENT_REVIEWER
```

The supervisor plans by default. A separate planning role is justified only when it reduces total context or isolates a specialist authority.

## Work order

For product-impacting capabilities:

```text
Problem and evidence
→ actors and role boundaries
→ required and excluded surfaces
→ outcome and acceptance
→ Product Manager approval
→ Product Owner functional approval
→ architecture and ownership
→ API and data contracts
→ backend and database
→ generated clients and adapters
→ surfaces and UI
→ runtime
→ product acceptance
→ independent QA/security/release as applicable
→ scoped decision
```

For behavior-preserving internal work with `product_impact: NONE`, begin at the relevant owner boundary.

## Work-unit contract

Each work unit must declare:

- `work_unit_id`;
- objective;
- owner role;
- risk class and required capability tier;
- dependencies;
- allowed read paths;
- allowed write paths;
- forbidden paths;
- bounded inputs;
- acceptance criteria;
- targeted verification;
- read-only or write mode;
- expected structured output.

Two units must not write the same file or mutually generated boundaries concurrently.

## Capability routing

```text
T0_MINIMAL
  scoped reads, extraction, formatting, and small mechanical edits

T1_BALANCED
  focused module work and bounded multi-file implementation under one owner

T2_SPECIALIST
  Product Truth, API contracts, database logic, runtime, security, finance,
  migrations, CI, and independent review

T3_ADVISORY_MAX
  coordination, cross-domain architecture, conflict resolution, high-risk review,
  and final scoped synthesis
```

Selection rule:

```text
selected_tier = lowest tier
  satisfying required capability
  + risk constraints
  + verification requirements
```

Never reduce capability for cost when money, security, privacy, data, public contracts, migrations, CI, release, or product authority is involved.

## Context minimization

- Send only relevant files, symbols, contracts, and relationship summaries.
- Never broadcast the full repository or full Git history.
- Exclude generated, cache, build, diagnostic, and binary outputs unless directly required.
- Reference global policies instead of repeating them.
- Reuse findings within the same run.
- Stop a worker when its acceptance criteria are met.
- Require concise structured handoffs; do not request private chain-of-thought.
- Do not create tracked logs or evidence packs by default.

## Parallel execution

- Default maximum parallel executors: 2.
- Raise to 4 only for four proven independent scopes.
- Serialize contract edits before generated clients and consumers.
- Serialize migration edits before dependent code and tests.
- Independent review begins only after the target version is stable.
- All results return to the supervisor; no open swarm or ungoverned agent network is allowed.

## Independent review

Independent review is mandatory for:

- product-model and product-acceptance decisions;
- auth, sessions, RBAC, PII, secrets, and privacy;
- WLT, payments, ledger, settlement, payout, reconciliation, and commission;
- migrations and production data;
- infrastructure, CI, release, rollback, and signing;
- critical or high vulnerabilities;
- final closure.

An executor cannot finally approve its own high-risk work.

## Failure and escalation

- Escalate capability only when the same assertion requires deeper expertise.
- Maximum two attempts for the same unchanged assertion.
- On retry, send only the failure, affected context, previous attempt, and changed hypothesis.
- If the branch moves unexpectedly, stop, re-pin, and re-read affected files.
- Never force-push, reset, or discard concurrent work to simplify integration.
- A repeated unresolved assertion becomes `FIX_REQUIRED`, `NEEDS_EVIDENCE`, or `BLOCKED_EXTERNAL` as applicable.

## Forbidden behavior

- Beginning from architecture or a feature list when Product Truth is required.
- Treating UI, backend, or tests alone as proof of product completeness.
- Letting one actor receive another actor’s actions or surfaces.
- Allowing parallel overlapping writes.
- Hardcoding commercial model names or prices.
- Using a low-capability agent for security, finance, migrations, CI, or release.
- Letting an executor self-approve high-risk work.
- Adding agent-framework runtime dependencies without explicit need and approval.
- Committing generated diagnostics, execution logs, or evidence packs.
- Claiming runtime, visual, QA, security, release, production, or closure evidence not actually produced.
- Activating SaaS from this skill.

## Required output

Each executor returns:

```text
work_unit_id:
status:
summary:
changed_paths:
findings:
checks:
assumptions:
remaining_risks:
conflicts:
handoff:
```

The supervisor returns:

```text
repository:
target_branch:
resolved_commit_sha:
product_truth_state:
work_units:
independent_reviews:
checks:
decision:
remaining_risks:
```

Allowed canonical decisions are `PASS`, `FIX_REQUIRED`, `NEEDS_EVIDENCE`, `BLOCKED_EXTERNAL`, and `PROTOCOL_VIOLATION`. This skill cannot issue `CLOSED_WITH_EVIDENCE` by itself.

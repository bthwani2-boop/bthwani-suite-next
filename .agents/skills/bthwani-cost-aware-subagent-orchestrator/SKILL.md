
---
name: bthwani-cost-aware-subagent-orchestrator
version: 2026.08.06-v3
summary: Coordinate independent bounded work units with minimum sufficient context, non-overlapping writes, deterministic integration, and protected review.
---

# bthwani-cost-aware-subagent-orchestrator

## Purpose

Coordinate broad tasks when decomposition reduces context, execution time, or integration risk.
This skill orchestrates only; higher authorities and owner skills remain unchanged.

## Invoke when

- The user requests subagents or delegated execution.
- At least two independent work units have non-overlapping write scopes.
- A cross-layer task can be decomposed without splitting one source-of-truth decision.

## Do not invoke when

- The task is small, indivisible, analysis-only, or text-only.
- The platform has no real subagent capability.
- Work units would write the same file or mutually generated boundary.
- Coordination would cost more context than direct execution.

## Read before

- `AGENTS.md`
- `governance/agents/agent-registry.json`
- `governance/skills/skills-registry.json`
- `references/WORK_UNIT_CONTRACT.md`
- `references/MODEL_ROUTING_AND_TOKEN_POLICY.md`

Load product, security, finance, runtime, or evidence skills only when their triggers apply.

## Authority boundary

This skill owns coordination and work-unit routing only. It cannot approve product,
architecture, finance, governance, CI, QA, security, release, risk, production, or final closure.

The coordinator must not act as the independent reviewer of work it coordinated.

## Routing method

1. Pin the exact repository, branch, and commit.
2. Classify task mode, risk, owner paths, and protected domains.
3. Define one objective and one owner for each work unit.
4. Declare allowed read/write paths, forbidden paths, dependencies, acceptance, and focused verification.
5. Build a dependency DAG; parallelize only proven independent units.
6. Select the lowest capable tier that satisfies risk and verification.
7. Reject incomplete handoffs and resolve conflicts without force operations.
8. Re-pin after writes and before final verification.
9. Return only a canonical scoped decision.

Capability tiers:

- `T0_MINIMAL` — extraction, formatting, and mechanical bounded edits.
- `T1_BALANCED` — focused module work under one owner.
- `T2_SPECIALIST` — contracts, data, runtime, security, finance, migrations, CI, and independent review.
- `T3_ADVISORY_MAX` — cross-domain coordination, architecture conflict resolution, and final scoped synthesis.

Never lower capability for cost in security, privacy, finance, migrations, production data,
public contracts, CI, release, or protected approval work.

## Work-unit contract

Each unit declares:

```text
work_unit_id:
objective:
owner_role:
risk_tier:
dependencies:
allowed_read_paths:
allowed_write_paths:
forbidden_paths:
bounded_inputs:
acceptance:
verification:
mode:
expected_output:
```

Two units must not write the same file or a source and its generated consumer concurrently.
Serialize contracts before generated clients, and migrations before dependent code and tests.

## Context and parallelism

- Send only relevant files, symbols, contracts, and relationship summaries.
- Reference global policies instead of copying them.
- Exclude generated, cache, diagnostic, binary, and historical output unless required.
- Reuse findings within the run and stop a worker when acceptance is met.
- Require concise structured handoffs, not private reasoning.
- Default to two parallel executors; raise to four only for four proven independent scopes.
- Independent review starts only after the target revision is stable.

## Failure handling

- Re-pin and stop if the branch moves unexpectedly.
- Retry an unchanged assertion at most twice, with only the failure and changed hypothesis.
- Never force-push, reset, discard concurrent work, or hide failed checks.
- Map unresolved work to `FIX_REQUIRED`, `NEEDS_EVIDENCE`, or `BLOCKED_EXTERNAL`.

## Required output

Worker:

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

Coordinator:

```text
repository:
target_branch:
resolved_commit_sha:
work_units:
independent_reviews:
checks:
decision:
remaining_risks:
```

Allowed decisions: `PASS`, `FIX_REQUIRED`, `NEEDS_EVIDENCE`, `BLOCKED_EXTERNAL`, and `PROTOCOL_VIOLATION`.

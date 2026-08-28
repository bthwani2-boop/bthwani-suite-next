---
name: bthwani-cost-aware-subagent-orchestrator
version: 2026.08.27-v5
summary: Maximize useful safe subagent parallelism with bounded context, proven dependency/collision control, and one deterministic integration authority.
---

# bthwani-cost-aware-subagent-orchestrator

## Invoke when

- The user explicitly requests delegated execution; or
- parallel read-only discovery/challenge can materially deepen or accelerate evidence; or
- two or more bounded work units can reduce execution time/context with proven safe coordination.

Do not invoke when coordination costs more than direct execution, when work is indivisible, or when the platform has no real subagent capability.

## Inputs

Read only:

- `AGENTS.md`;
- `.agents/INDEX.md` when routing is not obvious;
- the actual code/contracts/data/runtime needed by each work unit.

No agent-role registry, SDLC stage registry, guard registry, or approval graph is required.

## Routing

1. Pin exact repository/branch/SHA.
2. Build a task-local dependency/collision graph; split by proven causal/authority-independent cones, not arbitrary files/languages/surfaces.
3. Fan out read-only cartography, negative-space search and independent challenge as widely as useful when real subagent capability exists.
4. Give each unit one objective, bounded inputs, allowed writes, forbidden writes, dependencies, proof limits and focused verification.
5. Admit mutation workers only when they are mutually `PARALLEL_SAFE`; never allow concurrent writes to the same authority/file or a source/generated pair.
6. Serialize canonical-owner changes, shared migrations/cutovers, integration/ref movement and evidence-dependent work before descendants.
7. Use the smallest capable executor and minimum sufficient context; worker count is elastic, not fixed.
8. Reconcile every returned finding/diff/provenance record through one coordinator before integration.
9. Re-pin after material writes; rebuild invalidated dependencies/collisions and immediately refill safe capacity.

Default to **maximum useful safe parallelism** when delegation has material benefit. Do not impose a fixed two-worker ceiling or a fixed minimum. If coordination cost exceeds benefit or the work is indivisible, execute directly.

## Output

Worker:

```text
work_unit_id:
status:
summary:
changed_paths:
checks:
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
checks:
decision:
remaining_risks:
```

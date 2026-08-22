---
name: bthwani-cost-aware-subagent-orchestrator
version: 2026.08.18-v4
summary: Coordinate independent bounded work units with minimum sufficient context, non-overlapping writes, and deterministic integration.
---

# bthwani-cost-aware-subagent-orchestrator

## Invoke when

- The user explicitly requests delegated execution; or
- two or more independent bounded work units can reduce execution time/context without overlapping writes.

Do not invoke when coordination costs more than direct execution, when work is indivisible, or when the platform has no real subagent capability.

## Inputs

Read only:

- `AGENTS.md`;
- `.agents/INDEX.md` when routing is not obvious;
- `governance/skills/skills-registry.json` for available skill paths;
- the actual code/contracts/data/runtime needed by each work unit.

No agent-role registry, SDLC stage registry, guard registry, or approval graph is required.

## Routing

1. Pin exact repository/branch/SHA.
2. Split only along proven independent ownership boundaries.
3. Give each unit one objective, bounded inputs, allowed writes, forbidden writes, dependencies, and focused verification.
4. Never allow two units to write the same file or a source/generated pair concurrently.
5. Serialize authoritative owner changes before dependent consumers.
6. Use the smallest capable executor and smallest useful context.
7. Reconcile every returned diff before integration.
8. Re-pin after writes and before final verification.

Default to direct execution unless delegation has clear material benefit. Default to two parallel workers; increase only when independence is proven.

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

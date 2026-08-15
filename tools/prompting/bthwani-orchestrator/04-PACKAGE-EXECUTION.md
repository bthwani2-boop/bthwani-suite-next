# 04 — Package & Execution

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY

## Package

Every new invocation creates isolated package + Task Branch. Package machine artifacts:

```text
00-OVERVIEW.md
operational-root.json
lower-layer-observations.json
root-cause-landscape.json
NNN-<sequence>.md JIT
```

## Write gate order

```text
task-isolation-gate
→ root-anchor-gate
→ operational-root-gate
→ root-cause-priority-gate
→ frontier-derivation-gate
→ sequence/common solution gates
→ live write
```

Canonical location: `tools/guards/orchestrator/`.

## Execute only highest proven root

No live Product/Runtime write merely because a technical defect is reproducible. Before execution prove:

```text
operational parent
highest proven causal owner/root
no unresolved higher upstream cause outranks it
journey/state/authority/handoff/canonical-truth impact
blast radius + dependencies + consumers
comparative systemic priority
verification definition
```

## Diagnostic blocker exception

Only a defect that prevents diagnosis/truth acquisition itself may be fixed before operational coverage. Record why it is `DIAGNOSTIC_BLOCKER` and keep scope minimal; re-enter operational diagnosis immediately afterward.

## Backtracking

When a deeper inspection discovers a higher root:

```text
suspend current
→ update operational/root-cause registries
→ invalidate affected priority
→ rerank
→ execute newly proven upstream root
→ reconcile descendants
```

No mechanical `SEQ-NNN+1` execution.

## Parallelism

Parallel read-only breadth diagnosis is encouraged. Parallel writes require proven independent conflict domains and isolated worker branches/worktrees. Worker outputs integrate into Task Branch first; one Integration Owner updates target.

## Integration

Task-branch green is not closure. Resolve latest target, classify foreign delta, semantically reconcile/rebase, rerun invalidated gates/evidence, integrate non-force, then final candidate verification.

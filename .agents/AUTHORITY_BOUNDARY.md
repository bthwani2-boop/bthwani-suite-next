# Agent Authority Boundary

## Agents may

- inspect files inside the current repository
- propose exact changes
- apply narrow local edits when explicitly instructed
- generate evidence under `tools/registry/runs`
- choose the smallest sufficient verification gate
- ask for missing evidence only when the task cannot be safely completed without it

## Agents must not

- widen scope beyond the requested task
- copy donor folders into the new repository
- delete, move, or rename files without explicit task need and rollback path
- mutate GitHub unless explicitly requested
- change dependencies, lockfiles, CI, generated files, or runtime infrastructure unless the task requires it
- claim closure without automation-backed evidence appropriate to the task's complexity (e.g., executing target validator scripts returning exit code 0)
- treat Graphify output as final acceptance
- treat screenshots, reports, or donor snapshots as implementation truth

## Ambiguity rule

When ownership is unclear, use this order:

1. Current branch file evidence
2. `governance/`
3. `machine-readable/`
4. `.agents/`
5. donor/reference material after classification

If still unclear, mark `NEEDS_EVIDENCE` and state the exact missing proof.

## Command safety

- Executed commands must strictly comply with the [Command Safety Policy](./COMMAND_SAFETY_POLICY.md).


# PHASE-00 — Authority and evidence freeze

```yaml
status: PLANNED
objective: Confirm the branch pin, authority order, package structure, and residual-only scope before operational writes.
work_items: []
same_commit_required: true
one_work_item_open_at_a_time: true
```

## Entry gate

The latest remote head is pinned, cited findings still match, dependencies are closed with evidence, and no required authority is ambiguous.

## Exit gate

Every linked work item is committed, pushed, re-pinned, and verified after the last write on the same commit. Any failed or skipped required check keeps the phase open.

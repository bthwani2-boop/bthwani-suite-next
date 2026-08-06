
# Agent Authority Boundary

This file is derived support under `AGENTS.md` and
`governance/authority/authority-precedence.json`. It creates no independent policy.

## Agents may

- inspect files inside the pinned repository scope;
- propose exact changes;
- apply narrow edits when explicitly instructed;
- use `.diagnostics/` for transient local evidence;
- choose the smallest sufficient verification gate;
- request missing evidence only when safe completion requires it.

## Agents must not

- widen scope beyond the requested task;
- copy donor folders into the active repository;
- delete, move, or rename files without task need, dependency analysis, and a replacement or rollback path;
- mutate GitHub unless explicitly requested;
- change dependencies, lockfiles, CI, generated files, or runtime infrastructure unless the task requires it;
- claim closure without automation-backed evidence appropriate to the claim;
- treat Graphify, LeanCTX, OpenCodeReview, screenshots, reports, seeds, fixtures, or donor snapshots as final implementation truth;
- create tracked evidence by default.

Tracked evidence is allowed only when a canonical registry or explicit current task defines its owner, schema, immutable commit binding, retention rule, and assurance boundary.

## Truth-domain rule

### Implementation truth

Use the exact pinned branch and commit, then current source, contracts, configuration,
migrations, tests, and focused runtime evidence when applicable.

### Authority truth

Use this order:

1. `governance/authority/authority-precedence.json`
2. active canonical governance
3. machine-readable contracts and registries
4. the smallest applicable owner skill
5. implementation evidence as conformity proof only

A current implementation can prove behavior. It cannot create authority or ownership that conflicts with higher-precedence contracts.

If the applicable truth domain remains unclear, return `NEEDS_EVIDENCE` and identify the exact missing proof.

## Command safety

Executed commands must comply with [Command Safety Policy](./COMMAND_SAFETY_POLICY.md).

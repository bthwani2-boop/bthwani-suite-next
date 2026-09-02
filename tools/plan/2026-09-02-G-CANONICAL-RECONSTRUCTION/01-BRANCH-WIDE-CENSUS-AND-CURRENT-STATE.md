# 01 — BRANCH-WIDE CENSUS AND CURRENT-STATE MODEL

## Purpose

Maintain an evidence-backed view of what branch `g` contains and continuously discover structural roots.

The census is **not** a global pre-mutation blocker. A root that independently passes the `ROOT-CORRECT EXECUTION GATE` in `00-START-HERE.md` may be executed before the branch-wide census is complete.

## Exact live pin

Before relying on census evidence:

`FETCH g → RESOLVE EXACT REMOTE G SHA → LOAD LIVE AUTHORITIES → RECORD PINNED SHA`.

Evidence invalidated by a changed ref must be rechecked.

## Branch-wide discovery

Traverse the actual tracked tree rather than a hardcoded expected-directory list. Cover material source/runtime code, apps/surfaces, domains/services, shared/core/packages, database/schema/migrations, contracts/generated bindings, runtime/config/env, infra, scripts/tooling, workflows/CI, tests/fixtures/mocks, dependencies/plugins, material assets, and live authoritative documents.

For each material artifact/tree establish where applicable:

```text
WHAT_EXISTS?
WHY_DOES_IT_EXIST?
CURRENT_RESPONSIBILITY?
CURRENT_OWNER_AND_WRITER?
READERS_AND_CONSUMERS?
DEPENDENCIES_AND_DIRECTION?
RUNTIME_REACHABILITY?
DATA_CONTRACT_CONFIG_AUTHORITY?
NAME_AND_PATH_TRUTHFUL?
BOUNDARY_CORRECT?
DUPLICATED_OR_SHADOWED?
DEAD_STALE_OBSOLETE?
STILL_REQUIRED?
```

Use graph/search/runtime/schema/contract/config evidence. Tool output is evidence only.

## Two census modes

### 1. Continuous branch-wide discovery

Runs throughout the campaign to discover additional or higher roots. It may remain incomplete while an independently proven root is executed.

Do not mutate an artifact merely because census discovered it; first pass the root-correct gate.

### 2. Root-scoped affected-cone census

Before mutating a selected root, census its complete affected cone deeply enough to prove:

```text
SOURCE_OF_DEFECT
SOURCE_OF_FIX
CANONICAL_OWNER_WRITER
ALL_MATERIAL_WRITERS_READERS_CONSUMERS
DATA_SCHEMA_IMPACT
CONTRACT_GENERATED_IMPACT
RUNTIME_CONFIG_TOOLING_IMPACT
TEST_FIXTURE_MOCK_DEPENDENCY_IMPACT
MIGRATION_CUTOVER_REQUIREMENTS
LOSING_AUTHORITIES_AND_RESIDUE
```

This root-scoped census **is mandatory** for execution safety.

## `CURRENT g` model

Maintain `CURRENT g` incrementally as campaign evidence. Update affected portions after each closure and broaden it whenever discovery exposes a higher structural relationship.

A complete branch-wide `CURRENT g` model is required for final adversarial qualification in `06`, not before every root execution.

## Preemption rule

If unresolved evidence could change the canonical owner, migration direction, affected cone, or reveal a higher causal root for the root about to be changed, that root is **not executable yet**.

If an unrelated part of the repository remains uncensused and cannot change those facts, it does not block the proven root.

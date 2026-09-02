# 01 — BRANCH-WIDE CENSUS AND CURRENT-STATE MODEL

## Purpose

Build and maintain the complete evidence-backed view of what branch `g` contains before any material root selection or mutation.

The census is a hard global pre-mutation gate. No root may be selected or executed before this branch-wide census is complete for the exact pinned candidate.

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

### 1. Complete branch-wide reconstruction census

Runs before the first mutation and is rebuilt after every material closure or invalidating ref/topology change. It must cover the actual tracked tree and produce the complete `CURRENT g` input, not an informal sample.

Do not mutate an artifact merely because the census discovered it. Complete the current-state model, canonical target, structural delta, and true root synthesis/ranking first.

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

Build `CURRENT g` completely from the branch-wide census before the first mutation. Refresh the complete model after every material closure, branch movement, or discovery that can change ownership, topology, contracts, data, runtime, tooling, or root ranking.

A complete branch-wide `CURRENT g` model is required before every root selection and every material mutation, and is revalidated again during final adversarial qualification in `06`.

## Preemption rule

If unresolved evidence could change the canonical owner, migration direction, affected cone, or reveal a higher causal root for the root about to be changed, that root is **not executable yet**.

Any uncensused material tracked area blocks the pre-mutation baseline. Only explicitly proven non-material or out-of-scope content may be excluded, with the exclusion recorded in the census and root graph.

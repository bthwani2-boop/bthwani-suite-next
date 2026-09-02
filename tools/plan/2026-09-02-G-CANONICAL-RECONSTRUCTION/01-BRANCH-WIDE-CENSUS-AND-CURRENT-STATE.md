# 01 — BRANCH-WIDE CENSUS AND CURRENT-STATE MODEL

## Purpose

Build an evidence-backed model of what branch `g` actually contains **before any reconstruction mutation begins**.

This is not bug triage. It is branch-wide structural discovery.

## Step 0 — exact live pin

Before census:

`FETCH g → RESOLVE EXACT REMOTE G SHA → LOAD ORCHESTRATOR 00–05 + MATERIAL FOCUS MODULES → LOAD THIS PLAN → RECORD PINNED SHA`.

No product/code mutation during this stage.

## Step 1 — traverse the actual tracked tree

Do not use a hardcoded expected-directory list as the census boundary. Traverse the actual tracked tree of the pinned SHA, including every material top-level entry and every material subtree.

Cover as applicable:

- source/runtime code;
- apps/surfaces;
- domains/services;
- shared/core/packages/modules;
- database/schema/migrations/seeds/bootstrap;
- contracts/generated bindings;
- runtime/config/env/manifests;
- infra/container/topology;
- scripts/CLI/tooling/hooks;
- workflows/actions/CI control paths;
- tests/fixtures/mocks/snapshots;
- dependencies/devDependencies/plugins;
- assets where runtime/security/build material;
- documents/plans only when they act as live authority or execution machinery.

Generated/vendor/binary/asset families are not silently skipped: disposition them as scan-required or justified exclusion based on materiality.

## Per-artifact/tree census questions

Establish where applicable:

```text
WHAT_EXISTS?
WHY_DOES_IT_EXIST?
CURRENT_RESPONSIBILITY?
CURRENT_OWNER?
CURRENT_WRITER?
READERS?
CONSUMERS?
DEPENDENCIES?
DEPENDENCY_DIRECTION?
CYCLES?
RUNTIME_REACHABILITY?
DATA_SCHEMA_AUTHORITY?
CONTRACT_GENERATED_AUTHORITY?
SCRIPT_WORKFLOW_TOOLING_OWNER?
NAME_TRUTHFUL?
PATH_CANONICAL?
BOUNDARY_CORRECT?
DUPLICATED_ELSEWHERE?
PARALLEL_OR_SHADOW_AUTHORITY?
DEAD_STALE_OBSOLETE_UNREACHABLE?
STILL_REQUIRED?
```

Use `graphify`, repository search, call/dependency graphs, runtime/config inspection, contract/schema inspection, and other read-only evidence to establish relationships. Tool output is evidence only; it does not select execution order.

## No clean-as-you-go

During this entire file's work:

```text
MATERIAL_MUTATION=NO
DELETE_AS_DISCOVERED=NO
RENAME_AS_DISCOVERED=NO
REFACTOR_AS_DISCOVERED=NO
PATCH_AS_DISCOVERED=NO
```

Reason: changing the branch while its structural model is incomplete can hide higher roots, corrupt comparison, and produce partial migrations.

## Step 2 — build `CURRENT g`

Build one coherent current-state architecture model covering:

```text
OWNERSHIP_AND_RESPONSIBILITY_BOUNDARIES
WRITERS_READERS_CONSUMERS
PACKAGE_DIRECTORY_TOPOLOGY
DEPENDENCY_DIRECTION_AND_CYCLES
DATA_SCHEMA_OWNERSHIP
CONTRACT_GENERATED_LINEAGE
RUNTIME_CONFIG_ENV_COMPOSITION
SCRIPT_WORKFLOW_TOOLING_OWNERSHIP
CROSS_BOUNDARY_COUPLING
NAMES_PATHS_BOUNDARIES
PARALLEL_SHADOW_DUPLICATE_AUTHORITIES
DEAD_STALE_OBSOLETE_UNREACHABLE_STRUCTURE
```

The model is campaign evidence, not a new durable project authority.

## Completion gate

Do not continue to `02` until:

```text
EXACT_G_PIN=PASS
ALL_MATERIAL_TOP_LEVEL_ENTRIES_VISITED=YES
ALL_MATERIAL_SUBTREES_CAPABLE_OF_CHANGING_ROOT_RANKING_VISITED=YES
WORKSPACE_PACKAGE_MODULE_ROOTS_DISCOVERED=YES
MATERIAL_WRITER_READER_CONSUMER_RELATIONSHIPS_MAPPED=YES
MATERIAL_RUNTIME_REACHABILITY_MAPPED=YES
MATERIAL_DATA_CONTRACT_CONFIG_TOOLING_OWNERSHIP_MAPPED=YES
MATERIAL_NAMING_PATH_BOUNDARY_REVIEW=COMPLETE_ENOUGH
TOOL_BLIND_SPOTS_RECORDED=YES
CURRENT_G_MODEL=ESTABLISHED
```

If an unresolved current-state unknown could change the winning owner, target boundary, migration direction, or highest root, this stage is not complete.

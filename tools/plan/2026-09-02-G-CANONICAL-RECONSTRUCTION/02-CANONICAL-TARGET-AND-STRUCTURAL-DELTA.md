# 02 — CANONICAL TARGET AND STRUCTURAL DELTA

## Purpose

Convert the branch-wide current-state model into a standards-grounded target architecture, then compute the material difference between the two.

Do not mutate yet.

## Step 3 — define `CANONICAL g`

For every material responsibility ask:

`IF BUILT TODAY FROM CURRENT PROVEN TRUTH AND APPLICABLE BEST PRACTICES, WHO SHOULD OWN IT, WHERE SHOULD IT LIVE, WHAT SHOULD IT BE CALLED, WHAT BOUNDARY SHOULD CONTAIN IT, WHAT SHOULD BE THE SOLE WRITER, WHAT SHOULD BE DERIVED, AND WHAT SHOULD NOT EXIST?`

Resolve enough target architecture to establish, where applicable:

```text
CANONICAL_RESPONSIBILITY
CANONICAL_OWNER
CANONICAL_WRITER_OR_DERIVED_STATUS
CANONICAL_PACKAGE_DIRECTORY_BOUNDARY
CANONICAL_FILE_DIRECTORY_PACKAGE_NAMES
CANONICAL_PATH
DEPENDENCY_DIRECTION
DATA_SCHEMA_OWNER
CONTRACT_GENERATED_OWNER
RUNTIME_CONFIG_OWNER
SCRIPT_WORKFLOW_TOOLING_OWNER
REQUIRED_CONSUMERS
REQUIRED_DATA_CONTRACT_RUNTIME_RELATIONSHIPS
STRUCTURE_TO_KEEP
STRUCTURE_TO_HARDEN
STRUCTURE_TO_REHOME_RENAME_MERGE_SPLIT_REWRITE_REGENERATE_MIGRATE_DELETE
```

The target is not speculative redesign for style. It must be grounded in live Product/System truth, applicable governance/engineering standards, actual consumers, runtime/data constraints, and framework/language best practices where material.

No preservation bias exists for inherited layout.

## Naming/path/topology standard

A correct implementation in the wrong place is still structurally wrong.

Target architecture must prefer:

`TRUTHFUL NAMES → OWNER-ALIGNED PATHS → UNIQUE RESPONSIBILITIES → LOW UNJUSTIFIED COUPLING → HIGH COHESION → PREDICTABLE FRAMEWORK-NATIVE STRUCTURE → MINIMUM NECESSARY LAYERS`.

Permanent architecture must not preserve chronology or patch history such as `old`, `new`, `legacy`, `v2`, `v3`, `tmp`, `temp`, `copy`, `backup`, `fixed`, `final` unless that term has real domain/version semantics.

Generic buckets (`common`, `utils`, `helpers`, `misc`, `shared`, `core`) require a precise proven canonical role; otherwise responsibilities must be rehomed/split.

## Step 4 — compute structural delta

Compare:

`CURRENT g ↔ CANONICAL g`.

Every material delta item should establish conceptually:

```text
CURRENT_STATE
CANONICAL_TARGET
DELTA_CLASS
CURRENT_EVIDENCE
AFFECTED_AUTHORITY
AFFECTED_WRITERS_READERS_CONSUMERS
DATA_SCHEMA_IMPACT
CONTRACT_GENERATED_IMPACT
RUNTIME_CONFIG_TOOLING_IMPACT
NAMING_PATH_TOPOLOGY_IMPACT
SYMPTOM_DESCENDANT_OR_ROOT_CANDIDATE
EXPECTED_STRUCTURAL_DISPOSITION
```

Material delta classes include:

- wrong ownership;
- wrong package/directory/module boundaries;
- misplaced files;
- misleading names/paths;
- duplicate responsibility trees;
- parallel/shadow truth;
- duplicate mutable writers;
- duplicate semantic decisions/policies/state machines/mappings;
- unnecessary wrappers/adapters/mappers;
- contract/generated/manual-repair drift;
- data/schema parallel authority;
- runtime/config duplication;
- dead packages/files/routes/scripts/workflows;
- legacy/transitional paths;
- unused dependencies/config/routes/exports;
- stale tests/fixtures/mocks/snapshots;
- unbounded compatibility;
- patch-shaped architecture;
- obsolete residue.

## No execution yet

Even if a delta looks obvious, do not mutate in this stage. It may be a descendant of a higher structural root discovered elsewhere in the complete delta.

## Completion gate

Continue to `03` only when:

```text
CANONICAL_G_TARGET=ESTABLISHED
MATERIAL_OWNER_WRITER_BOUNDARY_DECISIONS=RESOLVED_ENOUGH_TO_RANK
MATERIAL_NAMING_PATH_TOPOLOGY_TARGET=ESTABLISHED
CURRENT_TO_CANONICAL_DELTA=ESTABLISHED
ALL_MATERIAL_DELTA_ITEMS=CLASSIFIED_ENOUGH_FOR_CAUSAL_SYNTHESIS
NO_TARGET_UNKNOWN_CAPABLE_OF_INVALIDATING_ROOT_RANKING_OR_CUTOVER_DIRECTION
```

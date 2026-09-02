# 02 — CANONICAL TARGET AND STRUCTURAL DELTA

## Purpose

Define the complete branch-wide canonical target and structural delta before root selection or any material mutation, then refine the selected root's affected cone.

A complete branch-wide `CANONICAL g` and complete branch-wide Structural Delta are mandatory prerequisites for the first mutation and every subsequent material mutation.

## Root-scoped canonical target

For a candidate root, establish from current Product/System/Data truth and applicable engineering standards:

```text
CANONICAL_RESPONSIBILITY
CANONICAL_OWNER
CANONICAL_WRITER_OR_DERIVED_STATUS
CANONICAL_PACKAGE_DIRECTORY_BOUNDARY
CANONICAL_NAME_AND_PATH
DEPENDENCY_DIRECTION
DATA_SCHEMA_OWNER
CONTRACT_GENERATED_OWNER
RUNTIME_CONFIG_OWNER
REQUIRED_WRITERS_READERS_CONSUMERS
STRUCTURE_TO_KEEP_HARDEN_REHOME_RENAME_MERGE_SPLIT_REWRITE_REGENERATE_MIGRATE_DELETE
```

Ask:

`IF THIS RESPONSIBILITY WERE BUILT TODAY FROM CURRENT PROVEN TRUTH, WHO SHOULD OWN IT, WHERE SHOULD IT LIVE, WHAT SHOULD WRITE IT, WHAT SHOULD CONSUME IT, AND WHAT SHOULD NOT EXIST?`

The target must be evidence-backed, not stylistic speculation.

## Root-scoped structural delta

Compare the proven current state of the affected cone with its canonical target:

```text
CURRENT_STATE
CANONICAL_TARGET
CAUSAL_ROOT
AFFECTED_AUTHORITY
WRITERS_READERS_CONSUMERS
DATA_SCHEMA_IMPACT
CONTRACT_GENERATED_IMPACT
RUNTIME_CONFIG_TOOLING_IMPACT
NAMING_PATH_TOPOLOGY_IMPACT
MIGRATION_CUTOVER_REQUIREMENTS
LOSING_AUTHORITY_TO_REMOVE
VERIFICATION_AND_NEGATIVE_SPACE
```

Material delta classes include wrong ownership/boundaries, duplicate mutable writers, parallel/shadow truth, contract or generated drift, data/schema parallel authority, runtime/config duplication, misleading paths/names, dead/stale structure, unbounded compatibility, patch-shaped architecture, and obsolete residue.

## Execution boundary

Do not execute a candidate while its **own** canonical target or affected-cone delta contains an unknown capable of changing:

- canonical owner or writer;
- Source-of-Fix;
- migration/cutover direction;
- required consumers;
- deletion safety;
- whether a higher root subsumes the candidate.

Once those facts are proven, the complete branch-wide reconstruction baseline is fresh, and the `ROOT-CORRECT EXECUTION GATE` passes, execution may begin. Incomplete unrelated material delta discovery is not an allowed execution state.

## Branch-wide model

Build `CANONICAL g` and the Structural Delta completely from the branch-wide census before root selection. Refresh both completely after every material closure or invalidating branch/topology/authority change.

If later evidence proves a higher root, preempt descendant work and recompute the affected target/delta.

The complete branch-wide Current↔Canonical model is a pre-mutation requirement; the final adversarial qualification in `06` adds the fixed-point proof and zero-unknowns closure standard.

## Naming/path/topology standard

Prefer:

`TRUTHFUL NAMES → OWNER-ALIGNED PATHS → UNIQUE RESPONSIBILITIES → LOW UNJUSTIFIED COUPLING → HIGH COHESION → FRAMEWORK-NATIVE STRUCTURE → MINIMUM NECESSARY LAYERS`.

Do not preserve patch chronology (`old`, `new`, `legacy`, `v2`, `tmp`, `backup`, `fixed`, `final`) as permanent architecture unless it carries real domain/version semantics.

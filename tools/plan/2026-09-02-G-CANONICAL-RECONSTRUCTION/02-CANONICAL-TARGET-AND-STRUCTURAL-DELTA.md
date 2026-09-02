# 02 — CANONICAL TARGET, WINNER/LOSER MAP, AND STRUCTURAL DELTA

## Purpose

Turn the complete census into a complete canonical target and executable structural delta before any mutation.

## Branch-wide canonical target

For every material responsibility define:

```text
CANONICAL_RESPONSIBILITY=
CANONICAL_OWNER=
CANONICAL_WRITER_OR_DERIVED_STATUS=
CANONICAL_PACKAGE_DIRECTORY_BOUNDARY=
CANONICAL_NAME_AND_PATH=
DEPENDENCY_DIRECTION=
DATA_SCHEMA_OWNER=
CONTRACT_GENERATED_OWNER=
RUNTIME_CONFIG_OWNER=
REQUIRED_WRITERS_READERS_CONSUMERS=
TARGET_DISPOSITION_OF_CURRENT_ARTIFACTS=
```

Ask:

`IF BUILT TODAY FROM CURRENT PROVEN TRUTH, WHAT IS THE SMALLEST CORRECT STRUCTURE, WHO OWNS IT, WHAT WRITES IT, WHAT CONSUMES IT, AND WHAT SHOULD NOT EXIST?`

## Mandatory Winner/Loser Authority Map

For every proven duplicate/parallel/shadow semantic authority:

```text
SEMANTIC_MEANING=
WINNING_AUTHORITY=
WHY_WINNER=
LOSING_AUTHORITIES=
LOSING_WRITERS=
LOSING_READERS_CONSUMERS=
MIGRATION_PATH=
CUTOVER_CONDITION=
DELETION_TARGETS=
ZERO_REFERENCE_PROOF=
```

No unresolved `COEXIST`, `KEEP_BOTH`, or permanent `SYNC` outcome is valid.

```text
DUPLICATE_AUTHORITY_WITHOUT_WINNER_LOSER=BASELINE_FAIL
LOSING_AUTHORITY_WITHOUT_DELETION_TARGET=BASELINE_FAIL
```

## Artifact disposition realization matrix

Translate every census disposition into target work:

```text
KEEP_PROVEN → no structural change; proof retained
HARDEN/REFACTOR → semantics remain canonical; structure/code corrected
REHOME/RENAME → exact target owner/name/path + complete reference migration
MERGE → winner + value to absorb + losing tree deletion
SPLIT → exact responsibilities + exact target owners
REWRITE → old abstraction encodes wrong semantics; target replaces it
REGENERATE → canonical source defined; manual repair deleted
MIGRATE → consumers/data/contracts/runtime moved to target
DELETE_NOW → low-risk proven garbage; no migration ceremony
DELETE → deletion after required migration/cutover proof
BOUNDED_RETIREMENT → exceptional live external compatibility only
```

## Compatibility forbidden by default

`COMPATIBILITY=FORBIDDEN_BY_DEFAULT`.

Bounded retention requires all:

```text
EXTERNAL_OR_UNAVOIDABLE_LIVE_CONSUMER=PROVEN
ATOMIC_MIGRATION_NOT_CURRENTLY_POSSIBLE=PROVEN
EXACT_OWNER=KNOWN
EXACT_CONSUMERS=KNOWN
NO_SECOND_MUTABLE_WRITER=PASS
CUTOVER_CONDITION=DEFINED
REMOVAL_TRIGGER=DEFINED
EXPIRY_OR_BOUND=DEFINED
```

Otherwise: `MIGRATE NOW → DELETE NOW`.

## Complete Structural Delta

Compare `CURRENT g` with `CANONICAL g` and enumerate all material deltas:

`wrong owner/writer | wrong boundary | misplaced artifact | misleading name/path | duplicate responsibility tree | parallel/shadow truth | duplicate mutable writer | duplicate decision/policy/validation/state/mapping/DTO/enum/default | unnecessary wrapper/adapter | contract/generated repair | data/schema parallel authority | runtime/config duplication | dead package/file/route/symbol | dead script/workflow | legacy path | unused dependency | stale test/fixture/mock | unbounded compatibility | patch-shaped architecture | obsolete residue`.

Every delta must reference its ledger entries and authority map. Do not create roots directly from individual deltas until causal collapsing is complete.

## Pre-mutation completeness gate

Before root synthesis:

```text
CURRENT_G_COMPLETE=PASS
CANONICAL_G_COMPLETE=PASS
ARTIFACT_DISPOSITION_LEDGER_COMPLETE=PASS
SEMANTIC_AUTHORITY_REGISTRY_COMPLETE=PASS
DIRECTORY_PACKAGE_VERDICTS_COMPLETE=PASS
WINNER_LOSER_MAP_COMPLETE=PASS
STRUCTURAL_DELTA_COMPLETE=PASS
UNREVIEWED_TRACKED_ARTIFACTS=0
UNDISPOSITIONED_MATERIAL_ARTIFACTS=0
UNRESOLVED_DIRECTORY_PACKAGE_VERDICTS=0
UNRESOLVED_SEMANTIC_AUTHORITIES=0
```

Only then proceed to `03`.

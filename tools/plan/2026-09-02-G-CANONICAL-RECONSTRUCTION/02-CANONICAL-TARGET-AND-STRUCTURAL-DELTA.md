# 02 — CANONICAL TARGET, WINNER/LOSER MAP, STRUCTURAL DELTA, AND PARITY INPUTS

## Purpose

Turn the complete census into a complete canonical target and executable structural delta before any mutation, and provide the canonical ownership/contract/data targets required by `02A` for vertical parity proof.

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

`IF BUILT TODAY FROM CURRENT PROVEN TRUTH, WHAT IS THE SMALLEST CORRECT STRUCTURE, WHO OWNS IT, WHAT WRITES IT, WHAT CONSUMES IT, HOW DOES IT CONNECT END-TO-END, AND WHAT SHOULD NOT EXIST?`

## Canonical cross-layer target

For every material product meaning/capability define where applicable:

```text
PRODUCT_MEANING=
ACTOR_JOURNEY=
CANONICAL_STATE_TRANSITIONS=
CANONICAL_DOMAIN_OWNER=
CANONICAL_DB_STORAGE_TRUTH=
CANONICAL_MUTABLE_WRITER=
CANONICAL_BACKEND_SERVICE_USE_CASE=
CANONICAL_API_EVENT_COMMAND=
CANONICAL_REQUEST_RESPONSE_ERROR_CONTRACT=
CANONICAL_GENERATED_BINDING=
CANONICAL_FRONTEND_CONSUMER=
CANONICAL_COMPONENT_SCREEN_ROUTE=
CANONICAL_USER_ACTION_MUTATION=
CANONICAL_PERSISTED_READBACK=
CANONICAL_VISIBLE_FINAL_STATE=
```

Do not create one truth model for backend and another for frontend. `02A` must prove that these canonical targets form one continuous chain.

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

Frontend/backend manual mirrors of the same business truth participate in the same winner/loser law.

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

`wrong owner/writer | wrong boundary | misplaced artifact | misleading name/path | duplicate responsibility tree | parallel/shadow truth | duplicate mutable writer | duplicate decision/policy/validation/state/mapping/DTO/enum/default | frontend/backend semantic divergence | manual frontend business mirror | manual backend contract mirror | orphan screen/API/binding/data truth | unnecessary wrapper/adapter | contract/generated repair | data/schema parallel authority | runtime/config duplication | dead package/file/route/symbol | dead script/workflow | legacy path | unused dependency | stale test/fixture/mock | unbounded compatibility | patch-shaped architecture | obsolete residue`.

Every delta must reference its ledger entries and authority map. Do not create roots directly from individual deltas until causal collapsing is complete.

## Handoff to `02A`

After `CURRENT g`, `CANONICAL g`, winner/loser map, and Structural Delta are complete, build the full Cross-Layer Capability Matrix in `02A`.

Every backend/frontend/data/contract/generated/UI parity break found by `02A` must be added back into the Structural Delta and assigned a causal owner before root synthesis.

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
END_TO_END_CAPABILITY_MATRIX_COMPLETE=PASS
UNREVIEWED_TRACKED_ARTIFACTS=0
UNDISPOSITIONED_MATERIAL_ARTIFACTS=0
UNRESOLVED_DIRECTORY_PACKAGE_VERDICTS=0
UNRESOLVED_SEMANTIC_AUTHORITIES=0
UNMAPPED_MATERIAL_CAPABILITIES=0
UNRESOLVED_E2E_PARITY_GAPS=0
```

Only then proceed to `03`.

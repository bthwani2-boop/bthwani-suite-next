# 01 — BRANCH-WIDE CENSUS, AUTHORITY REGISTRY, DISPOSITION LEDGER, FILE/CONTAINER VERDICTS, AND CAPABILITY COVERAGE

## Purpose

Build the complete evidence-backed inventory of branch `g` before structural root selection. The census classifies ownership, semantic authority, boundary responsibility, reachability, survival disposition, end-to-end capability coverage, and whether each file/directory/package deserves to exist as a container.

## Exact live pin

`FETCH g → RESOLVE EXACT REMOTE G SHA → PIN SHA → LOAD LIVE PLAN + APPLICABLE ORCHESTRATOR INVARIANTS → INVALIDATE STALE SHA-SPECIFIC EVIDENCE`.

## 1. Full tracked-tree census

Traverse the actual tracked tree. No hardcoded directory list may act as a scope boundary.

Cover all material source/runtime code, apps/surfaces, screens/routes/components, frontend data/query/mutation/store/view-model layers, domains/services/backend handlers/use-cases, `core/**`, `shared/**`, packages/modules, database/schema/migrations, APIs/events/contracts/generated bindings, runtime/config/env, `infra/**`, `tools/**`, scripts/CLI, `.github/**`, tests/fixtures/mocks/snapshots, dependencies/plugins, assets/manifests, and live authoritative documents.

## 2. Semantic discovery is independent of names and paths

Do not infer responsibility from filenames or current paths. For every material code/data/config artifact ask:

```text
WHAT DECISION DOES THIS MAKE?
WHAT BUSINESS MEANING DOES IT REPRESENT?
WHAT DATA DOES IT READ?
WHAT DATA DOES IT WRITE?
WHAT STATE DOES IT INTERPRET OR TRANSITION?
WHAT POLICY/VALIDATION/DEFAULT/MAPPING DOES IT APPLY?
WHO CALLS IT?
WHO CONSUMES ITS OUTPUT?
WHAT CONTRACT/EVENT/ROUTE DOES IT IMPLEMENT?
WHAT SCREEN/JOURNEY/OPERATION DEPENDS ON IT?
WHAT OTHER ARTIFACT PRODUCES THE SAME MATERIAL OUTCOME?
```

Compare artifacts even when they have different names, directories, packages, languages, apps, or layers.

```text
DIFFERENT_NAME != DIFFERENT_RESPONSIBILITY
DIFFERENT_PATH != DIFFERENT_RESPONSIBILITY
SAME_MATERIAL_RESPONSIBILITY → SAME_STRUCTURAL_CLUSTER
```

Use call/import graphs, data flow, DB reads/writes, contracts, enum/status semantics, state machines, tests, screen behavior, runtime routes, config keys, and generated lineage as evidence. Graph/name similarity alone is insufficient.

## 3. Fast garbage elimination during census — highest safe granularity

The census is read-only for structural/semantic work, but may delete proven low-risk garbage immediately.

An artifact is `DELETE_NOW` eligible when all are proven:

```text
NOT_REQUIRED_BY_CURRENT_PRODUCT_SYSTEM
NO_CANONICAL_AUTHORITY
NO_MUTABLE_STATE
NO_REQUIRED_RUNTIME_ROUTE
NO_REQUIRED_EXTERNAL_CONTRACT
NO_REQUIRED_IMPORT_CALLER_READER_CONSUMER
NO_REQUIRED_MIGRATION_OR_UPGRADE_ROLE
NO_SECURITY_OR_COMPLIANCE_ROLE
NO_GENERATED_LINEAGE_REQUIREMENT
```

Before deleting the first dead line/symbol, evaluate upward:

```text
FOUND DEAD LINE
→ CHECK WHOLE SYMBOL
→ CHECK WHOLE FILE
→ CHECK PARENT DIRECTORY
→ CHECK PACKAGE/BOUNDARY
→ DELETE/COLLAPSE AT HIGHEST SAFE CANONICAL GRANULARITY
→ RE-EVALUATE PARENT RECURSIVELY
```

Do not leave a responsibility-less file because only one dead symbol was initially discovered.

## 4. Artifact Disposition Ledger — mandatory

Every in-scope material artifact receives exactly one current disposition:

`KEEP_PROVEN | HARDEN | REFACTOR | REHOME | RENAME | MERGE | SPLIT | REWRITE | REGENERATE | MIGRATE | DELETE | DELETE_NOW | BOUNDED_RETIREMENT`.

Required fields:

```text
ARTIFACT=
TYPE=
CURRENT_PATH=
CURRENT_RESPONSIBILITY=
CURRENT_OWNER=
CURRENT_WRITER_OR_DERIVED_STATUS=
CURRENT_CONSUMERS=
RUNTIME_OR_BUILD_REACHABILITY=
PRODUCT_CAPABILITY_JOURNEY=
SEMANTIC_MEANING_OWNED=
DUPLICATE_PARALLEL_SHADOW_RELATIONSHIP=
NAME_PATH_BOUNDARY_VERDICT=
RIGHT_TO_EXIST_PROOF=
CAN_BE_ABSORBED_BY_CANONICAL_CONTAINER=YES|NO
TARGET_OWNER=
TARGET_NAME_PATH_BOUNDARY=
TARGET_CANONICAL_CONTAINER=
DISPOSITION=
MIGRATION_CUTOVER_DEPENDENCIES=
DELETION_RISK_CLASS=LOW|STATEFUL|CONTRACTUAL|RUNTIME|SECURITY|MIGRATION
```

## 5. Semantic Authority Registry — mandatory

Inventory material meanings independently of filenames and implementations:

`permission | eligibility | serviceability | financial truth | state/status interpretation | transition | allowed action | validation | default | mapping | vocabulary | error-to-state semantics | location | pricing/fees | runtime/config meaning | retry/idempotency | contract semantics`.

For every meaning record all current authorities/writers/readers, including frontend/backend local interpretations, then identify canonical owner/writer and candidate winners/losers.

## 6. File Responsibility Census — mandatory

Every material file must answer:

```text
DOES_THIS_FILE_OWN_A_UNIQUE_COHESIVE_RESPONSIBILITY?
IS_THAT_RESPONSIBILITY_CORRECTLY_OWNED_HERE?
IS_THIS_FILE_A_JUSTIFIED_MEMBER_OF_THE_MINIMUM_CANONICAL_FILE_SET?
CAN_ITS_REQUIRED_VALUE_BE_ABSORBED_INTO_ANOTHER_CANONICAL_FILE?
IS_IT_REEXPORT_ONLY / PASS_THROUGH_ONLY / FORWARDER_ONLY / SHIM_ONLY / ALIAS_ONLY?
IS_IT_A_HISTORICAL_CONTAINER?
IS_IT_DUPLICATING_A_RESPONSIBILITY_FOUND_ELSEWHERE_UNDER_DIFFERENT_NAMES_OR_PATHS?
```

Verdicts:

```text
UNIQUE_CORRECT_FILE → KEEP/HARDEN
REQUIRED_VALUE_BUT_WRONG_CONTAINER → REHOME/MERGE → DELETE_OLD_FILE
DUPLICATE_RESPONSIBILITY_FILE → SELECT_CANONICAL_CONTAINER → MIGRATE → DELETE_LOSER_FILE
NO_UNIQUE_RESPONSIBILITY → DELETE_NOW IF LOW-RISK; OTHERWISE ABSORB REQUIRED VALUE → DELETE
REEXPORT/PASS_THROUGH/FORWARDER/SHIM/ALIAS_ONLY → DELETE AFTER INTERNAL CONSUMER MIGRATION UNLESS BOUNDED EXTERNAL COMPAT IS PROVEN
MIXED_UNRELATED_RESPONSIBILITIES → SPLIT INTO TRUE OWNERS → DELETE_OLD_CONTAINER
```

Before structural root mutation: `UNRESOLVED_FILE_VERDICTS=0`.

## 7. Directory / Package Responsibility Census — mandatory

Every material directory/package boundary must answer whether it owns one unique cohesive responsibility, is correctly owned, duplicates another tree, mixes responsibilities, or exists only as pass-through/historical compatibility.

Verdicts:

```text
UNIQUE_CORRECT_RESPONSIBILITY → KEEP/HARDEN
NO_UNIQUE_RESPONSIBILITY → DELETE_AFTER_MIGRATION OR DELETE_NOW IF UNUSED/DEAD
DUPLICATE_RESPONSIBILITY → SELECT_WINNER → MIGRATE → DELETE_LOSER
MIXED_RESPONSIBILITIES → SPLIT_BY_TRUE_OWNER
WRONG_OWNER → REHOME
PASS_THROUGH_ONLY → REMOVE
HISTORICAL_COMPAT_ONLY → REMOVE AFTER BOUNDED CUTOVER
MISLEADING_NAME_PATH → RENAME/REHOME
```

## 8. Capability / journey coverage census — mandatory

Inventory every material capability/journey represented anywhere in `g`, including backend-only, frontend-only, data-only, contract-only, and partially connected implementations. Feed `02A` with actor/journey/state/domain/data/backend/API/contract/generated/frontend/screen/action/mutation/readback evidence.

## 9. Candidate Canonical Container Map inputs

For each semantic responsibility/cluster record candidate:

```text
SEMANTIC_RESPONSIBILITY=
CURRENT_FILES_DIRECTORIES_PACKAGES=
CURRENT_NAMES_PATHS=
CURRENT_CONSUMERS=
CANONICAL_OWNER_CANDIDATE=
CANONICAL_PACKAGE_CANDIDATE=
CANONICAL_DIRECTORY_CANDIDATE=
CANONICAL_FILE_SET_CANDIDATE=
CANONICAL_SYMBOLS_CANDIDATE=
LOSING_CONTAINER_CANDIDATES=
```

This feeds `02B`.

## 10. Heightened support surfaces

`core/**`, `shared/**`, `infra/**`, `tools/**`, `.github/**`, scripts/workflows/config/tests/dependencies are first-class architecture. Generic buckets, forwarding shells, manual mirrors, stale tooling and redundant tests do not receive preservation bias.

## Baseline output

Before structural root mutation require:

```text
UNREVIEWED_TRACKED_ARTIFACTS=0
UNDISPOSITIONED_MATERIAL_ARTIFACTS=0
UNKNOWN_KEEP=0
UNRESOLVED_FILE_VERDICTS=0
UNRESOLVED_DIRECTORY_PACKAGE_VERDICTS=0
UNRESOLVED_SEMANTIC_AUTHORITIES=0
```

The census must produce complete inputs for `CURRENT g`, Artifact Ledger, Semantic Authority Registry, File/Directory/Package Verdicts, capability inventory, candidate winner/loser map, and Canonical Container Map.

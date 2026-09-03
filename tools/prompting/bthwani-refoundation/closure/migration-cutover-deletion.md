# Closure — Migration, Cutover and Deletion

This file specializes target migration/cutover requirements. The orchestrator remains the execution authority.

## 1. Never perform cosmetic moves

For every losing container:

```text
SALVAGE_REQUIRED_TRUTH
→ ESTABLISH_CANONICAL_OWNER
→ BUILD/REFOUND WINNER
→ MIGRATE DATA/CONTRACTS/GENERATED OUTPUTS
→ MIGRATE WRITERS
→ MIGRATE READERS/CONSUMERS
→ CUT OVER ROUTES/EXPORTS/CONFIG/RUNTIME
→ DISABLE OLD WRITES
→ DELETE LOSER
→ REMOVE ALIASES/COMPAT
→ PRUNE PARENTS
→ VERIFY NEGATIVE SPACE
```

`MOVE`, `RENAME`, `MERGE`, or `BUILD_GREEN` alone is not closure.

## 2. Execution-unit reconstruction

Every active unit derives from live state:

```text
UNIT_ID
EXACT_H_SHA
SOURCE_OF_DEFECT
REQUIRED_SOURCE_OF_FIX
WHY_HIGHEST_SAFE_EXECUTABLE_ROOT
REQUIRED_TRUTH
CURRENT_OWNER/WRITER/READERS
CANONICAL_TARGET
EXPECTED_LOSERS
COMPLETE_AFFECTED_CONE
DATA_MIGRATION
CODE_MIGRATION
CONTRACT/GENERATION_MIGRATION
FRONTEND/APP_MIGRATION
RUNTIME/CONFIG_MIGRATION
TEST/ASSURANCE_MIGRATION
CUTOVER_ORDER
DELETION_ORDER
PARENT_PRUNING
POSITIVE_VERIFICATION
FALSIFICATION/NEGATIVE_SPACE
ADMISSION_PREVENTION
FRESH_RE_CENSUS
```

Do not persist unit status into this package.

## 3. Systemic roots before long vertical work

During Stage A, favor high-yield systemic roots that reduce repeated closure tax, including when proven:

```text
TOP_LEVEL core/shared TAXONOMY
apps/*/runtime PASS-THROUGH TOPOLOGY
DESIGN SYSTEM AUTHORITY
PROVIDER SECRET/CONTROL-PLANE/DATA-PLANE SPLIT
WORKFORCE RELATIONSHIP/ROLE MODEL
CONTRACT COMPOSITION/GENERATED CATALOG AUTHORITY
APP↔SERVICE DEPENDENCY DIRECTION
BACKEND runtime/transport/integration TOPOLOGY
WLT FINANCIAL WRITER/REFERENCE AUTHORITY
```

Do not use this list as a fixed queue; live root ranking and recovery frontier decide the next unit.

## 4. Vertical capability closure

After enabling structural catastrophes are closed, prefer end-to-end capability units:

```text
PRODUCT MEANING
→ DATA/STORAGE
→ DOMAIN WRITER/READER
→ TRANSPORT/EVENT
→ SERVICE CONTRACT
→ GENERATED BINDING
→ SERVICE FRONTEND
→ APP HOST COMPOSITION
→ ACTION/MUTATION
→ PERSISTED/OBSERVABLE READBACK
→ DELETE LOSERS
→ NEGATIVE SPACE
```

Do not mark backend/contract/frontend/app subparts separately closed while the chain is split.

## 5. Data migration

For durable refoundation:

```text
PROVE_REQUIRED_DURABLE_TRUTH
→ DEFINE_DETERMINISTIC_TRANSFORMATION
→ BACKFILL/MIGRATE
→ VERIFY_COUNTS/KEYS/CONSTRAINTS/INVARIANTS
→ CUT OVER WRITER
→ CUT OVER READERS
→ RECONCILE
→ DELETE OLD STORAGE AUTHORITY
→ PROVE READBACK
```

No constraint weakening just to ease migration.

Financial/security data requires heightened proof, reversible/roll-forward-safe execution where applicable, and reconciliation.

## 6. Public API/package path migration

Internal repository consumers must cut over atomically where feasible.

Forbidden default:

```text
OLD_PATH_REEXPORT
COMPAT_ALIAS
DUPLICATE_PACKAGE_NAME
TWO_EXPORTS_FOR_SAME_OWNER
```

External consumers outside atomic control may justify a bounded compatibility layer only with explicit evidence, scope, telemetry/migration condition, and deletion trigger.

## 7. Concurrency

```text
ONE_ACTIVE_WRITER_AUTHORITY_PER_OVERLAPPING_CONE
RE_PIN_BEFORE_EACH_WRITE_SEQUENCE
NO_UNCOORDINATED_MUTATION_OF_SHARED_DB/CONTRACT/EXPORT/RUNTIME AUTHORITY
HEAD_MOVEMENT→RECONCILE
```

Parallel work is allowed only for proven disjoint cones.

## 8. Eager deletion

Certain-dead garbage and losing wrappers die immediately when no migration dependency remains.

Delete at highest safe granularity:

```text
DEAD SYMBOL
→ CHECK FILE
→ CHECK DIRECTORY
→ CHECK PACKAGE
→ CHECK TOP-LEVEL ROOT
```

Do not leave empty parents, stale manifests, workspace entries, test fixtures, docs, CI paths, or dependency residue for later cleanup.

## 9. Campaign-specific major loser set

Subject to live proof/cutover, expected losing structures include:

```text
core/
shared/
apps/*/runtime pass-through layer
DSH app-shaped frontend trees/exports
DSH frontend/shared umbrella
DSH WLT feature tree
core/providers generic provider authority
provider credentials JSONB secret authority
Workforce mutually exclusive employee/captain/field model
root contracts manual master index/common dumping
infra-owned provider behavioral fixtures
old package/workspace/Go replace/Docker/script/CI paths
```

This list expresses target intent, not current-state proof. Re-census before deletion.

## 10. Deletion closure gate

A unit is not closed until applicable:

```text
OLD_WRITES=0
OLD_READERS=0
OLD_IMPORTS=0
OLD_EXPORTS=0
OLD_ROUTES=0
OLD_RUNTIME_REGISTRATIONS=0
OLD_DB_AUTHORITY=0
LOSING_CONTAINER=ABSENT
PARENT_RESIDUE=0
WORKSPACE/DEPENDENCY_RESIDUE=0
COMPATIBILITY_RESIDUE=0
NEGATIVE_SPACE=PASS
```

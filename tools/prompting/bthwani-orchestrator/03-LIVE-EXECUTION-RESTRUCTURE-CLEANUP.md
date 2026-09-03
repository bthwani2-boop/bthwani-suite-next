# H Live Refoundation, Migration and Cleanup

Status: ACTIVE_CANONICAL_ORCHESTRATOR_OWNER
Owner: implementation, structural rewrite, migration, cutover, deletion, recursive pruning and finishing.

## 1. Execution principle

Once the highest proven executable root is selected, implement the canonical target at the highest correct granularity.

```text
ROOT_CORRECTNESS > DIFF_SIZE
CANONICAL_BOUNDARY > CURRENT_BOUNDARY
COMPLETE_CUTOVER > COMPATIBILITY_LAYER
DELETE_LOSER > KEEP_IN_SYNC
REFOUNDATION > PATCH_STACK
```

Do not preserve structure merely to reduce immediate effort.

## 2. Mandatory execution order

Unless evidence proves a different safe dependency order:

```text
1. DEFINE CANONICAL SEMANTICS/OWNER/WRITER/BOUNDARY
2. CREATE OR REFOUND CANONICAL DATA/STRUCTURE
3. CREATE/REGENERATE CANONICAL CONTRACT LINEAGE
4. MIGRATE WRITERS
5. MIGRATE READERS/CONSUMERS
6. MIGRATE/BACKFILL/RECONCILE DATA WHEN REQUIRED
7. CUT OVER RUNTIME/ROUTES/CONFIG
8. DISABLE OLD WRITES
9. PROVE ZERO OLD READERS/CONSUMERS
10. DELETE LOSING AUTHORITIES
11. DELETE OLD CONTAINERS/BRIDGES/COMPENSATIONS
12. PRUNE EMPTY/REDUNDANT PARENTS UPWARD
13. FINISH FILE/SYMBOL/DEPENDENCY CLEANUP
14. REFOUND ADMISSION/PREVENTION
15. VERIFY + FALSIFY
```

No half-migration closure.

## 3. Highest-safe deletion

Deletion is a first-class operation, not post-cleanup.

When a losing structure is proven unnecessary after value migration/cutover:

```text
DELETE ITS SYMBOLS
DELETE ITS FILES
DELETE ITS DIRECTORY WHEN EMPTY OR SEMANTICALLY OBSOLETE
DELETE ITS PACKAGE WHEN ITS RESPONSIBILITY MOVED/DIED
DELETE ITS CONFIG/ROUTES/WORKFLOWS/TESTS/GENERATED OUTPUTS WHEN THEY ONLY SERVE THE LOSER
REMOVE ITS DEPENDENCIES
PRUNE ITS PARENT CONTAINERS RECURSIVELY
```

The target is the highest safe obsolete container, not the smallest removable line.

## 4. Directory/package death test

For every affected directory/package/module:

```text
NO RESPONSIBILITY => DELETE
DUPLICATE RESPONSIBILITY => MIGRATE TO WINNER THEN DELETE LOSER
MIXED RESPONSIBILITIES => SPLIT INTO TRUE OWNERS THEN DELETE MIXED CONTAINER
WRONG OWNER => REHOME
PASS-THROUGH ONLY => REMOVE
COMPATIBILITY ONLY => REMOVE AFTER CUTOVER
DEAD/ORPHANED => DELETE
CANONICAL COHESIVE OWNER => KEEP_PROVEN
```

A directory surviving only because deleting it is inconvenient fails the gate.

## 5. Structural rewrite escalation

Mandatory escalation to larger rewrite/rehome/merge/split when any of these is proven:

```text
LOCAL FIX WOULD PRESERVE DUPLICATE AUTHORITY
LOCAL FIX WOULD REQUIRE KEEP-IN-SYNC LOGIC
LOCAL FIX WOULD ADD ANOTHER WRAPPER
LOCAL FIX WOULD LEAVE WRONG OWNERSHIP
LOCAL FIX WOULD LEAVE BAD PACKAGE/SERVICE BOUNDARY
LOCAL FIX WOULD EXTEND AN OBSOLETE MIGRATION EPOCH
LOCAL FIX WOULD PRESERVE REACHABLE SUPERSEDED RUNTIME
LOCAL FIX WOULD KEEP PATCH/COMPENSATION ARCHITECTURE
```

Do not issue a patch under these conditions.

## 6. Compatibility is forbidden by default

A compatibility layer may survive only when all are proven:

```text
EXTERNAL LIVE CONSUMER EXISTS
ATOMIC MIGRATION IS NOT POSSIBLE NOW
EXACT OWNER AND CONSUMERS ARE KNOWN
LAYER HAS NO SECOND MUTABLE WRITER
REMOVAL TRIGGER IS EXPLICIT
RETIREMENT IS BOUNDED
```

Otherwise migrate now and delete.

`PERMANENT_TEMP`, `KEEP_JUST_IN_CASE`, `MAYBE_USED`, `LEGACY_FOR_SAFETY` are forbidden dispositions.

## 7. Migration and data safety

Destructive structural authority does not permit destructive uncertainty with durable data.

Before changing persisted meaning prove:

```text
SOURCE DATA SEMANTICS
TARGET DATA SEMANTICS
TRANSFORMATION
BACKFILL/RECONCILIATION
ROLL-FORWARD STRATEGY
CUTOVER ORDER
READBACK PROOF
FINANCIAL/SECURITY INVARIANTS WHEN APPLICABLE
```

Prefer deterministic roll-forward migration over preserving obsolete architecture.

## 8. Generated artifacts

Generated outputs never become a second hand-maintained authority.

For generated contracts/clients/types:

```text
ONE GENERATOR SOURCE
ONE REPRODUCIBLE TOOLCHAIN
ONE CANONICAL OUTPUT LOCATION
ZERO MANUAL MIRROR EDITS
ZERO DUPLICATE GENERATED TREES
ZERO STALE OUTPUT AFTER SOURCE CHANGE
```

When lineage is wrong, refound lineage; do not hand-patch generated output.

## 9. File-level finishing pass

Every materially affected surviving file must end with:

```text
DEAD_SYMBOLS=0
UNUSED_EXPORTS=0
DUPLICATE_LOCAL_SEMANTICS=0
SHADOW_POLICY=0
OBSOLETE_BRANCHES=0
UNJUSTIFIED_SUPPRESSIONS=0
STALE_TODO_FIXME_HACK=0
MISLEADING_SYMBOL_NAMES=0
UNNECESSARY_WRAPPERS=0
LOSING_AUTHORITY_REFERENCES=0
```

This is not a license for cosmetic churn outside the causal cone; it is mandatory finishing inside it.

## 10. Core/shared burden of proof

`core/**` and `shared/**` are not preferred destinations.

A concern belongs there only when cross-domain ownership is genuinely canonical and proven by multiple stable consumers without embedding domain-specific mutable policy.

If a `core`/`shared` abstraction hides a real domain owner, duplicates service logic, owns mutable business truth, or exists mainly to avoid choosing ownership, rehome it.

## 11. No cleanup deferral

Forbidden completion states:

```text
NEW_CANONICAL_PATH_EXISTS + OLD_PATH_REACHABLE
NEW_WRITER_EXISTS + OLD_WRITER_ACTIVE
NEW_CONTRACT_EXISTS + OLD_CONTRACT_STILL_REFERENCED
MIGRATION_DONE + BRIDGE_LEFT_PERMANENTLY
ROOT_FIXED + TODO_CLEANUP_LATER
```

Cleanup belongs to the same root closure.

## 12. Deletion suspicion

When a proven structural root closes with no losing structure removed, ask whether the execution merely added another layer.

```text
STRUCTURAL_ROOT_CLOSED_WITH_ZERO_LOSING_STRUCTURE_REMOVED
=> MANDATORY_REINVESTIGATION
```

This is a suspicion trigger, not a blind deletion quota. If zero deletion is genuinely correct, evidence must prove why no losing structure existed.

## 13. Checkpoint discipline

A large root may require multiple direct commits on `h`.

Every checkpoint must be internally coherent and must not falsely claim closure.

Checkpoint labels should state the active root and whether migration/cutover/deletion remain.

Do not start a second overlapping mutation root before the active root closes or is explicitly blocked by a valid stop state.

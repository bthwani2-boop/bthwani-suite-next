# H Live Refoundation, Migration and Destructive Cleanup

Status: ACTIVE_CANONICAL_ORCHESTRATOR_OWNER
Owner: canonical implementation, highest-granularity refoundation, migration, cutover, deletion, recursive pruning and structural finishing.

## 1. Execution law

Once diagnosis selects the highest correct execution unit, implement the canonical target at that granularity.

```text
ROOT_CORRECTNESS > DIFF_SIZE
CANONICAL_BOUNDARY > CURRENT_BOUNDARY
COMPLETE_CUTOVER > COMPATIBILITY_LAYER
DELETE_LOSER > KEEP_IN_SYNC
REFOUNDATION > PATCH_STACK
WHOLE-SURFACE REFOUNDATION > MANY LOCAL PATCHES WHEN THE SURFACE IS THE ROOT
```

Do not preserve structure to reduce immediate effort.

## 2. Preferred treatment model

For each selected unit:

```text
SALVAGE REQUIRED TRUTH
→ ESTABLISH CANONICAL OWNER/WRITER/BOUNDARY
→ BUILD MINIMUM NECESSARY CANONICAL CONTAINER SET
→ MIGRATE DATA/CONTRACTS/GENERATED LINEAGE
→ MIGRATE ALL WRITERS
→ MIGRATE ALL READERS/CONSUMERS
→ CUT OVER RUNTIME/ROUTES/CONFIG/NAVIGATION
→ DISABLE OLD WRITES
→ PROVE ZERO OLD READERS
→ DELETE LOSING AUTHORITIES
→ DELETE LOSING FILES/DIRECTORIES/PACKAGES/SERVICES/SURFACES
→ DELETE OLD ALIASES/REEXPORTS/ROUTES/TEST RESIDUE
→ PRUNE PARENTS UPWARD
→ REFOUND ADMISSION/PREVENTION
→ VERIFY + FALSIFY
```

No half-migration closure.

## 3. Delete at the highest safe canonical granularity

When dead/losing material is found, do not automatically delete only the smallest item.

```text
DEAD LINE?
→ CAN THE SYMBOL DIE?
→ CAN THE FILE DIE OR BE ABSORBED?
→ CAN THE DIRECTORY DIE/COLLAPSE?
→ CAN THE PACKAGE/SERVICE/SUBTREE DIE?
→ DELETE AT THE HIGHEST SAFE CANONICAL GRANULARITY
```

The highest safe obsolete container is the target.

## 4. File death test

Every affected file must answer:

```text
DOES IT OWN A UNIQUE COHESIVE CANONICAL RESPONSIBILITY?
IS IT A REQUIRED MEMBER OF THE MINIMUM NECESSARY FILE SET?
CAN ITS REQUIRED VALUE BE ABSORBED INTO A BETTER CANONICAL FILE?
IS IT REEXPORT/PASS-THROUGH/FORWARDER/SHIM/ALIAS ONLY?
IS IT A HISTORICAL COMPENSATION SHELL?
```

If no unique reason remains:

```text
MIGRATE REQUIRED VALUE
→ UPDATE ALL CONSUMERS
→ DELETE FILE
```

A used wrong file is migrated and deleted, not kept.

## 5. Directory/package/service/surface death test

For every affected container:

```text
NO UNIQUE RESPONSIBILITY => DELETE
DUPLICATE RESPONSIBILITY => MIGRATE TO WINNER THEN DELETE LOSER
MIXED RESPONSIBILITIES => SPLIT/REHOME THEN DELETE MIXED CONTAINER
WRONG OWNER => REHOME THEN DELETE OLD PATH
PASS-THROUGH ONLY => REMOVE
COMPATIBILITY ONLY => REMOVE AFTER BOUNDED CUTOVER
HISTORICAL COMPENSATION => ABSORB REQUIRED VALUE THEN DELETE
DEAD/ORPHANED => DELETE
CANONICAL COHESIVE OWNER => KEEP_PROVEN
```

This applies through top-level surfaces including `.agents`, `.github`, `.opencodereview`, `docs`, `tools`, `governance`.

## 6. Whole-subtree refoundation

When a subtree is structurally noisy, contradictory, duplicated or largely compensatory, do not spend multiple roots cleaning files individually.

Preferred pattern:

```text
FORENSICALLY EXTRACT UNIQUE REQUIRED VALUE
→ DESIGN MINIMAL CANONICAL REPLACEMENT
→ DELETE NONCANONICAL SUBTREE
→ RECREATE ONLY REQUIRED CANONICAL MATERIAL
→ UPDATE EVERY REFERENCE/CONSUMER
→ PROVE ZERO OLD PATH/AUTHORITY REACHABILITY
```

Use this for control-plane/governance/tooling/doc surfaces as readily as product code when evidence supports it.

## 7. Structural rewrite escalation

Escalation is mandatory when a local fix would:

```text
PRESERVE DUPLICATE AUTHORITY
REQUIRE KEEP-IN-SYNC LOGIC
ADD ANOTHER WRAPPER
LEAVE WRONG OWNERSHIP
LEAVE BAD PACKAGE/SERVICE/DOMAIN BOUNDARY
EXTEND A BAD MIGRATION EPOCH
PRESERVE SUPERSEDED RUNTIME
PRESERVE PATCH/COMPENSATION ARCHITECTURE
PRESERVE CONFUSING GOVERNANCE/CI/TOOL AUTHORITY
```

Do not issue the local patch under those conditions.

## 8. Fast garbage elimination

Low-risk garbage that has no required truth, consumer, authority, durable state, external contract, migration role or security/compliance purpose is removed immediately.

Before deleting the found item, apply the highest-safe-granularity test.

```text
PROVEN UNUSED + NOT REQUIRED
→ DELETE NOW AT HIGHEST SAFE GRANULARITY
→ SEARCH REFERENCES
→ PRUNE PARENTS
→ RUN AFFECTED VERIFICATION
```

Forbidden:

```text
KEEP JUST IN CASE
COMMENT OUT
MOVE TO archive/legacy/history
CREATE CLEANUP BACKLOG
LEAVE DEAD SHELL
```

## 9. Upward recursive pruning

After every delete/merge/rehome/split:

```text
RE-EVALUATE SYMBOL
→ FILE
→ DIRECTORY
→ PACKAGE
→ SERVICE/BOUNDARY
→ TOP-LEVEL SURFACE
```

Delete/collapse every parent that lost its unique responsibility.

```text
LOSING_TRUTH_REMOVED + LOSING_CONTAINER_SURVIVES_WITHOUT_UNIQUE_VALUE = OPEN
```

## 10. Merge/rehome completion

A merge/rehome is incomplete until:

```text
REQUIRED_VALUE_ABSORBED=YES
ALL_REQUIRED_CONSUMERS_MIGRATED=YES
LOSING_CONTAINERS_DELETED=YES_OR_NA
OLD_FILE_PATHS=0
OLD_IMPORT_PATHS=0
OLD_EXPORT_NAMES=0
OLD_BARREL_REEXPORTS=0
OLD_INTERNAL_ALIASES=0
OLD_ROUTE_REGISTRATIONS=0
OLD_TEST/FIXTURE/MOCK/SNAPSHOT RESIDUE=0
```

Internal migration shells are forbidden by default.

## 11. Compatibility

Compatibility survives only with proof of a live unavoidable external consumer, exact ownership, bounded retirement, no second mutable writer and explicit removal trigger.

Otherwise:

```text
MIGRATE NOW
→ DELETE NOW
```

## 12. Durable data and database safety

Aggressive structure removal does not permit blind destruction of durable truth.

Before changing persisted meaning prove:

```text
SOURCE SEMANTICS
TARGET SEMANTICS
TRANSFORMATION
BACKFILL/RECONCILIATION
ROLL-FORWARD STRATEGY
CUTOVER ORDER
READBACK
FINANCIAL/SECURITY INVARIANTS WHEN APPLICABLE
```

If the migration epoch itself is corrupt, refound the epoch rather than patching hundreds of migration artifacts by default.

## 13. Contracts/generated lineage

Generated outputs are derived, never hand-maintained parallel truth.

```text
ONE CANONICAL SOURCE
→ ONE REPRODUCIBLE GENERATION TOOLCHAIN
→ JUSTIFIED GENERATED OUTPUT SET
→ ZERO MANUAL MIRRORS
→ ZERO STALE GENERATED TREES
```

Refound bad lineage; do not hand-patch generated output.

## 14. End-to-end cutover

When product behavior is material, migrate the complete vertical chain as applicable:

```text
DATA/STORAGE
→ BACKEND/DOMAIN
→ API/EVENT
→ CONTRACT
→ GENERATED BINDING
→ FRONTEND DATA
→ COMPONENT/SCREEN
→ USER ACTION/MUTATION
→ PERSISTED READBACK
```

A clean backend plus disconnected frontend is open.

## 15. File/surface finishing

Every materially affected surviving file must end with:

```text
DEAD_SYMBOLS=0
UNUSED_EXPORTS=0
DUPLICATE_LOCAL_SEMANTICS=0
SHADOW_POLICY=0
OBSOLETE_BRANCHES=0
UNJUSTIFIED_SUPPRESSIONS=0
STALE_TODO_FIXME_HACK=0
MISLEADING_NAMES=0
UNNECESSARY_WRAPPERS=0
LOSING_AUTHORITY_REFERENCES=0
```

Every affected surface must end with:

```text
RESPONSIBILITY_LESS_FILES=0
RESPONSIBILITY_LESS_DIRECTORIES=0
REEXPORT/PASS_THROUGH/FORWARDER/SHIM RESIDUE=0
UNJUSTIFIED_FRAGMENTATION=0
LOSING_SUBTREES=0
```

## 16. No cleanup deferral

Forbidden:

```text
NEW_PATH_EXISTS + OLD_PATH_REACHABLE
NEW_WRITER_EXISTS + OLD_WRITER_ACTIVE
NEW_CONTRACT_EXISTS + OLD_CONTRACT_REFERENCED
MIGRATION_DONE + PERMANENT BRIDGE
ROOT_FIXED + CLEANUP_LATER
```

Cleanup is part of the same refoundation unit.

## 17. Deletion suspicion

If a structural refoundation closes with zero losing structure removed, re-investigate whether another layer was merely added.

Zero deletion is acceptable only with evidence that no losing structure existed.

## 18. Checkpoints

Large units may span multiple direct commits on `h`. Each checkpoint must be coherent, exact-head safe and explicitly incomplete until migration/cutover/deletion/pruning and falsification are done.

Do not start an overlapping mutation unit before the active one closes or is materially blocked.

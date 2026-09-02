# 04 — ELIMINATION, DELETION, HIGHEST-GRANULARITY PRUNING, AND LINE/FILE/DIRECTORY/SCREEN FINISHING

## Purpose

Make cleanup destructive where safe, proportional to risk, and inseparable from structural/end-to-end closure. Remove losing containers, not only losing lines.

## 1. Deletion risk classes

### LOW-RISK / NOISE

Examples: dead line/symbol, unused helper/export, obsolete file, empty/useless directory, dead pass-through wrapper, stale script, unused workflow/dependency, redundant fixture/mock/snapshot, temporary/copied artifact, orphan screen/route/binding/API with no required consumer or authority.

Required proof:

```text
NO_CANONICAL_AUTHORITY
NO_MUTABLE_STATE
NO_REQUIRED_RUNTIME_ROUTE
NO_REQUIRED_EXTERNAL_CONTRACT
NO_REQUIRED_IMPORT/CALLER/CONSUMER
NO_REQUIRED_PRODUCT_CAPABILITY/JOURNEY
NO_REQUIRED_MIGRATION_OR_UPGRADE_ROLE
NO_SECURITY_OR_COMPLIANCE_ROLE
```

Then do not blindly delete only the discovered line/symbol. Apply `HIGHEST_SAFE_DELETION_GRANULARITY` first.

### STATEFUL / CONTRACTUAL / RUNTIME / SECURITY / MIGRATION-SENSITIVE

Use fuller consumer/data/contract/runtime/generated/security/upgrade/readback proof, then delete the losing structure as soon as cutover is proven.

## 2. Highest Safe Deletion Granularity — mandatory

```text
FOUND DEAD LINE
→ CAN THE WHOLE SYMBOL DIE?
→ CAN THE WHOLE FILE DIE OR BE ABSORBED?
→ CAN THE WHOLE DIRECTORY DIE OR BE COLLAPSED?
→ CAN THE WHOLE PACKAGE/BOUNDARY DIE OR BE CONSOLIDATED?
→ DELETE AT HIGHEST SAFE CANONICAL GRANULARITY
```

The discovered granularity is not the required deletion granularity.

## 3. File Responsibility Death Test — mandatory

Every affected file must prove:

```text
UNIQUE_COHESIVE_RESPONSIBILITY=YES
OR JUSTIFIED_MEMBER_OF_MINIMUM_CANONICAL_FILE_SET=YES
```

If not:

```text
ABSORB/MOVE REQUIRED VALUE
→ MIGRATE ALL CONSUMERS
→ DELETE FILE
```

A file is not preserved because it has callers. `HAS_CALLERS != DESERVES_TO_EXIST`.

## 4. Directory/package death test

```text
UNIQUE_COHESIVE_RESPONSIBILITY? YES → KEEP/HARDEN
NO RESPONSIBILITY → DELETE
DUPLICATE RESPONSIBILITY → MIGRATE TO WINNER → DELETE LOSER
MIXED RESPONSIBILITIES → SPLIT BY TRUE OWNER → DELETE OLD MIXED CONTAINER
WRONG OWNER → REHOME → DELETE OLD PATH
PASS-THROUGH ONLY → REMOVE
HISTORICAL COMPAT ONLY → REMOVE AFTER BOUNDED CUTOVER
MISLEADING NAME/PATH → RENAME/REHOME
```

## 5. Upward Recursive Pruning

After every delete, merge, split, or rehome:

```text
RE-EVALUATE SURVIVING FILE
→ RE-EVALUATE PARENT DIRECTORY
→ RE-EVALUATE PACKAGE/BOUNDARY
→ DELETE/COLLAPSE ANY PARENT THAT NO LONGER OWNS UNIQUE RESPONSIBILITY
→ REPEAT UNTIL FIRST JUSTIFIED CANONICAL PARENT
```

Do not leave empty, single-shell, or responsibility-less parents.

## 6. Semantic duplication is not filename duplication

Search for same responsibility/meaning even across unrelated names, paths, packages, layers, or languages. Evidence includes data reads/writes, decisions, state transitions, contracts, consumers, screen outcomes, and runtime behavior.

```text
DIFFERENT_NAME != DIFFERENT_RESPONSIBILITY
DIFFERENT_PATH != DIFFERENT_RESPONSIBILITY
```

## 7. Winner/Loser elimination — authority + containers

```text
SELECT WINNER
→ IDENTIFY CANONICAL CONTAINER SET
→ INVENTORY LOSER WRITERS/READERS/CONSUMERS
→ ABSORB REQUIRED VALUE
→ MIGRATE
→ CUT OVER
→ DISABLE LOSER WRITES
→ ZERO LOSER READERS
→ DELETE LOSER SYMBOLS/FILES/DIRECTORIES/PACKAGES/CONFIG/CONTRACTS/MANUAL MODELS
→ REMOVE IMPORTS/EXPORTS/BARRELS/ALIASES/ROUTES/DEPENDENCIES
→ MIGRATE/DELETE OLD TESTS/FIXTURES/MOCKS/SNAPSHOTS
→ RECURSIVELY PRUNE PARENTS
→ PROVE ZERO LOSER REACHABILITY
```

`KEEP_BOTH`, permanent mirrors, keep-in-sync layers, and internal old-path forwarders are forbidden final states.

## 8. Internal migration shells forbidden by default

Flag and remove after consumer migration:

```text
REEXPORT_ONLY_FILE
PASS_THROUGH_FILE
FORWARDER_ONLY_FILE
SHIM_ONLY_FILE
ALIAS_ONLY_FILE
OLD_PATH_COMPAT_FILE
BARREL_PRESERVING_DEAD_PATH
```

Retention requires proven bounded external compatibility, exact consumers, no second writer, and removal trigger.

## 9. MERGE completion

```text
MERGE_COMPLETE
IFF
REQUIRED_VALUE_ABSORBED
AND ALL_CONSUMERS_MIGRATED
AND LOSING_CONTAINERS_DELETED
AND OLD_FILE_PATHS=0
AND OLD_IMPORT_PATHS=0
AND OLD_EXPORT_NAMES=0
AND OLD_BARREL_REEXPORTS=0
AND OLD_ALIASES=0
AND OLD_ROUTE_REGISTRATIONS=0
```

## 10. Anti-fragmentation finishing

For every affected responsibility require:

```text
UNJUSTIFIED_SINGLE_SYMBOL_FILES=0
REEXPORT_ONLY_INTERNAL_FILES=0
PASS_THROUGH_ONLY_FILES=0
FORWARDER_ONLY_FILES=0
SHIM_ONLY_FILES=0
ALIAS_ONLY_FILES=0
DUPLICATE_RESPONSIBILITY_FILES=0
RESPONSIBILITY_LESS_FILES=0
EMPTY_OR_RESPONSIBILITY_LESS_DIRECTORIES=0
UNJUSTIFIED_FILE_FRAGMENTATION=0
```

Do not collapse distinct cohesive responsibilities into God files merely to reduce count.

## 11. Backend/frontend mirror elimination

When domain/contract semantics are canonical, eliminate manual DTO/enum/status/permission/allowed-action/validation/default/error maps and direct generated repairs that restate the same truth. Presentation-only derived transformations may remain.

## 12. Screen / route / frontend-flow finishing

If duplicate screens/flows serve the same material responsibility without justified actor/journey/state distinction:

`SELECT CANONICAL FLOW → MIGRATE NAVIGATION/REQUIRED UI VALUE → DELETE LOSING SCREEN FILES/ROUTES → RECURSIVELY PRUNE PARENTS`.

If no current capability requires the screen and deletion is low-risk: `DELETE_NOW`.

## 13. Generated / database exceptions

Generated code may legitimately be many files when derived from one canonical source. Do not merge generated outputs merely to reduce file count; eliminate competing/manual truth.

Normalized DB design may legitimately use many tables/columns. Do not merge storage merely to reduce count; eliminate duplicate mutable storage authority for the same business meaning.

## 14. Test/mock residue follows canonical ownership

When a losing production container disappears, its tests/fixtures/mocks/snapshots/helpers must be deleted or migrated to the canonical owner. Historical test names/paths must not keep old structure alive.

## 15. File/symbol/line finishing pass

Every touched surviving file receives:

```text
DEAD_SYMBOLS=0
UNUSED_EXPORTS=0
DUPLICATE_LOCAL_SEMANTICS=0
SHADOW_LOCAL_POLICY=0
OBSOLETE_BRANCHES=0
UNNECESSARY_WRAPPERS=0
UNJUSTIFIED_SUPPRESSIONS=0
STALE_TODO_FIXME_HACK=0
MISLEADING_SYMBOL_NAMES=0
DUPLICATE_DEFAULTS_VALIDATIONS_MAPPINGS=0
UNIQUE_FILE_RESPONSIBILITY_OR_JUSTIFIED_FILE_SET_MEMBERSHIP=PASS
```

## 16. No cosmetic cleanup

Forbidden outcomes include:

`legacy → archive`, `old → history`, `duplicate → common`, `multiple truths → shared`, `two authorities → wrapper around both`, `old path → permanent reexport`, `dead lines removed → responsibility-less file retained`, `losing file deleted → responsibility-less parent retained`.

## 17. Per-root elimination proof

Before closure answer:

```text
WHAT_GARBAGE_WAS_DELETED_AT_HIGHEST_SAFE_GRANULARITY?
WHAT_REQUIRED_VALUE_WAS_ABSORBED?
WHAT_LOSING_FILES_DISAPPEARED?
WHAT_LOSING_DIRECTORIES_DISAPPEARED?
WHAT_LOSING_PACKAGES_DISAPPEARED?
WHAT_OLD_PATHS_IMPORTS_EXPORTS_BARRELS_ALIASES_ROUTES_DISAPPEARED?
WHAT_TEST_FIXTURE_MOCK_SNAPSHOT_RESIDUE_DISAPPEARED?
WHAT_PARENT_CONTAINERS_WERE_REEVALUATED_AND_PRUNED?
WHAT_PROVES_EACH_SURVIVING_FILE_HAS_UNIQUE_JUSTIFIED_RESPONSIBILITY?
WHAT_PROVES_NO_UNJUSTIFIED_FRAGMENTATION_REMAINS?
```

`ROOT FIXED + MATERIAL RESIDUE = ROOT OPEN`.

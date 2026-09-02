# 02B — CANONICAL CONTAINER CONSOLIDATION AND ANTI-FRAGMENTATION

## Purpose

Prevent semantic cleanup from leaving historical files/directories/packages alive as empty, thin, pass-through, or arbitrarily fragmented containers. This stage runs after `02A` and before root selection.

## Core law

```text
DO NOT MATCH DUPLICATION BY NAME OR PATH.
MATCH BY MATERIAL RESPONSIBILITY, BUSINESS MEANING, DATA AUTHORITY,
DECISION SEMANTICS, STATE TRANSITIONS, WRITER/READER BEHAVIOR,
CONTRACT MEANING, AND CONSUMER OUTCOME.
```

```text
USED != CANONICAL
HAS_CALLERS != DESERVES_TO_EXIST
DIFFERENT_NAME != DIFFERENT_RESPONSIBILITY
DIFFERENT_PATH != DIFFERENT_RESPONSIBILITY
```

## Canonical container model

Every material responsibility must resolve to:

```text
SEMANTIC RESPONSIBILITY
↓
CANONICAL OWNER
↓
CANONICAL PACKAGE / BOUNDARY
↓
CANONICAL DIRECTORY
↓
MINIMUM NECESSARY CANONICAL FILE SET
↓
CANONICAL SYMBOLS
```

The target is not one file by default. The target is the minimum necessary cohesive file set with no redundant containers.

## File Death Test — mandatory

For every material file:

```text
DOES THIS FILE OWN A UNIQUE COHESIVE CANONICAL RESPONSIBILITY?
IS THIS FILE REQUIRED AS A DISTINCT MEMBER OF THE MINIMUM CANONICAL FILE SET?
CAN ITS REQUIRED VALUE BE ABSORBED INTO ANOTHER CANONICAL FILE WITHOUT CREATING A GOD FILE OR BREAKING A FRAMEWORK BOUNDARY?
DOES IT EXIST ONLY TO REEXPORT/FORWARD/ALIAS/SHIM/PASS THROUGH?
DOES IT EXIST ONLY BECAUSE OF HISTORICAL PATHS OR PREVIOUS PATCHES?
```

Outcomes:

```text
UNIQUE + CORRECT → KEEP/HARDEN
WRONG OWNER/PATH → REHOME/RENAME → UPDATE CONSUMERS → DELETE OLD FILE
DUPLICATE/OVERLAPPING RESPONSIBILITY → ABSORB REQUIRED VALUE → MIGRATE CONSUMERS → DELETE LOSER FILE
MIXED RESPONSIBILITIES → SPLIT TO TRUE OWNERS → DELETE OLD MIXED FILE
NO UNIQUE RESPONSIBILITY → DELETE_NOW IF LOW-RISK; OTHERWISE MIGRATE REQUIRED VALUE → DELETE
REEXPORT/FORWARDER/SHIM/ALIAS/PASS-THROUGH ONLY → MIGRATE INTERNAL CONSUMERS → DELETE
```

## Highest Safe Deletion Granularity

Every dead/noise finding must climb upward before final deletion:

```text
DEAD LINE
→ TEST WHOLE SYMBOL
→ TEST WHOLE FILE
→ TEST WHOLE DIRECTORY
→ TEST WHOLE PACKAGE/BOUNDARY
→ DELETE/COLLAPSE HIGHEST SAFE LOSING CONTAINER
```

Never intentionally preserve a lower-level container merely because the initial finding was at line/symbol level.

## Upward Recursive Pruning

After each delete/merge/rehome:

```text
DELETE OR MOVE CHILD
→ RE-EVALUATE FILE
→ RE-EVALUATE DIRECTORY
→ RE-EVALUATE PACKAGE/BOUNDARY
→ DELETE/COLLAPSE ANY PARENT THAT LOST ITS UNIQUE RESPONSIBILITY
→ REPEAT UNTIL FIRST JUSTIFIED CANONICAL PARENT
```

## Losing-container law

Winner/Loser applies to both semantics and containers.

```text
LOSING SYMBOL → MERGE/DELETE
LOSING FILE → ABSORB REQUIRED VALUE → DELETE FILE
LOSING DIRECTORY → REHOME REQUIRED VALUE → DELETE DIRECTORY
LOSING PACKAGE → MIGRATE REQUIRED VALUE → DELETE PACKAGE
LOSING ROUTE/SCREEN/API/CONTRACT/STORAGE AUTHORITY → MIGRATE/CUTOVER → DELETE/DECOMMISSION
```

```text
LOSING_SEMANTICS_REMOVED + LOSING_FILE_WITHOUT_UNIQUE_RESPONSIBILITY_SURVIVES = ROOT_OPEN
LOSING_FILE_DELETED + RESPONSIBILITY_LESS_DIRECTORY_SURVIVES = ROOT_OPEN
LOSING_DIRECTORY_DELETED + RESPONSIBILITY_LESS_PACKAGE_SURVIVES = ROOT_OPEN
```

## Internal migration shells forbidden by default

Flag:

```text
REEXPORT_ONLY_FILE
PASS_THROUGH_FILE
FORWARDER_ONLY_FILE
SHIM_ONLY_FILE
ALIAS_ONLY_FILE
OLD_PATH_COMPAT_FILE
BARREL_PRESERVING_DEAD_PATH
```

Internal consumers must be migrated to the canonical path and the shell deleted. Retention requires a proven bounded external compatibility need with exact consumers and removal trigger.

## Anti-fragmentation gate

Before root synthesis, classify all same-responsibility clusters independent of names and paths. Require:

```text
UNRESOLVED_FRAGMENTATION_CLUSTERS=0
UNRESOLVED_FILE_VERDICTS=0
UNRESOLVED_CANONICAL_CONTAINER_MAP_ENTRIES=0
```

Every cluster states:

```text
SEMANTIC_RESPONSIBILITY=
CURRENT_CONTAINER_SET=
WHY_CURRENT_SPLIT_EXISTS=
CANONICAL_OWNER=
CANONICAL_CONTAINER_SET=
WHY_EACH_SURVIVING_FILE_IS_DISTINCT_AND_NECESSARY=
VALUE_TO_ABSORB=
CONSUMERS_TO_MIGRATE=
LOSING_FILES=
LOSING_DIRECTORIES=
LOSING_PACKAGES=
OLD_PATHS_EXPORTS_ALIASES_TO_REMOVE=
```

## Merge completion gate

```text
MERGE_COMPLETE
IFF
REQUIRED_VALUE_ABSORBED
AND ALL_REQUIRED_CONSUMERS_MIGRATED
AND LOSING_CONTAINERS_DELETED
AND OLD_FILE_PATHS=0
AND OLD_IMPORT_PATHS=0
AND OLD_EXPORT_NAMES=0
AND OLD_BARREL_REEXPORTS=0
AND OLD_ALIASES=0
AND OLD_ROUTE_REGISTRATIONS=0
```

## Generated-code exception

Multiple generated files are allowed when each is derived from one canonical source or generator contract. Do not merge generated files merely to reduce count. Eliminate manual mirrors and competing generated authorities.

## Database exception

Multiple normalized tables/columns are allowed when they own distinct normalized facts. Do not merge storage merely to reduce count. Eliminate duplicate mutable storage authorities for the same business meaning.

## Screen/flow consolidation

Different screen names/routes do not prove different responsibilities. If multiple screens/flows serve the same material responsibility without a justified actor/journey/state distinction:

`SELECT CANONICAL FLOW → MIGRATE NAVIGATION/REQUIRED UI VALUE → DELETE LOSING SCREEN FILES/ROUTES → PRUNE PARENT CONTAINERS`.

## Test/mock residue consolidation

When a losing production container disappears, migrate or delete its dedicated tests/fixtures/mocks/snapshots/helpers. Tests must follow the canonical owner; they must not preserve historical names/paths or old semantic authority.

## Output to `03`

Root synthesis receives the Structural Delta plus explicit container consolidation obligations. Any root that changes semantic ownership must include the entire losing-container cone through file/directory/package/path/alias/test cleanup.

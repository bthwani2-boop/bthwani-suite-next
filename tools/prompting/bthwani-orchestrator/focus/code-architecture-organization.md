# Focus — Code, Architecture and Repository Organization

Status: ACTIVE_CANONICAL_ORCHESTRATOR_OWNER

## 1. Structural target

Repository structure must express real semantic ownership, not accumulated history.

```text
ONE MATERIAL RESPONSIBILITY → ONE CANONICAL OWNER
ONE OWNER → ONE JUSTIFIED MINIMUM NECESSARY CONTAINER SET
NO DUPLICATE RESPONSIBILITY TREES
NO SHADOW SERVICES/PACKAGES
NO PASS-THROUGH LAYERS WITHOUT UNIQUE VALUE
NO "shared" OR "core" AS OWNERSHIP REFUGE
NO FILE/DIRECTORY/PACKAGE KEPT ONLY BECAUSE IT EXISTS
```

## 2. Semantic responsibility outranks names/paths

```text
DIFFERENT_NAME != DIFFERENT_RESPONSIBILITY
DIFFERENT_PATH != DIFFERENT_RESPONSIBILITY
DIFFERENT_LANGUAGE != DIFFERENT_RESPONSIBILITY
USED != CANONICAL
```

Detect structural duplication through decisions, data flow, writers/readers, state semantics, contracts, runtime behavior and consumer outcome—not filename similarity.

If different containers implement the same material meaning, cluster them together, select the canonical owner, migrate required value and delete losers.

## 3. Canonical container map

For every material responsibility determine:

```text
SEMANTIC RESPONSIBILITY
→ CANONICAL DOMAIN/SERVICE OWNER
→ CANONICAL PACKAGE/BOUNDARY
→ CANONICAL DIRECTORY
→ MINIMUM NECESSARY CANONICAL FILE SET
→ CANONICAL SYMBOLS
```

Target `MINIMUM NECESSARY FILES`, not `MINIMUM POSSIBLE FILES`. Do not manufacture god files, but do not preserve artificial fragmentation.

## 4. Topology audit

Audit every material:

```text
TOP-LEVEL SURFACE
SERVICE
DOMAIN
PACKAGE
WORKSPACE
MODULE
DIRECTORY
FILE
PUBLIC EXPORT
ENTRYPOINT
ROUTE/ADAPTER BOUNDARY
```

Ask:

```text
WHAT UNIQUE RESPONSIBILITY DOES THIS CONTAINER OWN?
IS IT REQUIRED?
IS THIS THE CORRECT OWNER/PATH/BOUNDARY?
IS THE SAME MEANING OWNED ELSEWHERE UNDER ANOTHER NAME?
CAN IT BE ABSORBED INTO A STRONGER CANONICAL OWNER?
IS IT A WRAPPER/BRIDGE/SHIM/ALIAS/COMPATIBILITY SHELL?
SHOULD CHILDREN BE REHOMED AND THE CONTAINER DELETED?
WOULD WHOLE-SUBTREE REFOUNDATION REMOVE MORE DEBT CLEANLY?
```

## 5. File death test

A surviving file must prove a unique cohesive role in the canonical file set.

Delete/absorb files that are:

```text
RESPONSIBILITY-LESS
DUPLICATE RESPONSIBILITY
REEXPORT-ONLY
PASS-THROUGH-ONLY
FORWARDER-ONLY
SHIM/ALIAS-ONLY
HISTORICAL COMPENSATION
WRONG-OWNER CONTAINERS AFTER REHOME
EMPTY/NEAR-EMPTY AFTER MIGRATION
```

If required value exists inside a losing file:

```text
ABSORB/MOVE REQUIRED VALUE
→ MIGRATE ALL CONSUMERS
→ DELETE LOSING FILE
```

## 6. Highest-safe deletion and upward pruning

```text
DEAD LINE
→ CHECK SYMBOL
→ CHECK FILE
→ CHECK DIRECTORY
→ CHECK PACKAGE
→ CHECK SERVICE/BOUNDARY
→ CHECK TOP-LEVEL SURFACE
→ DELETE AT HIGHEST SAFE CANONICAL GRANULARITY
```

After deletion/merge/rehome/split, recursively re-evaluate parents and remove every parent that has lost unique responsibility.

## 7. Anti-fragmentation law

Forbidden stable shapes:

```text
A + B + SYNC WRAPPER
OLD SERVICE + NEW SERVICE + ROUTING BRIDGE
OLD PACKAGE + NEW PACKAGE + REEXPORT SHELL
MULTIPLE SHARED TREES WITH OVERLAPPING POLICY
SINGLE-SYMBOL FILES WITHOUT STRUCTURAL JUSTIFICATION
FORWARDER/ALIAS FILES PRESERVING OLD PATHS
LOCAL DOMAIN LOGIC COPIED INTO FRONTENDS
DUPLICATE ADAPTERS EMBEDDING THE SAME MUTABLE POLICY
```

At closure:

```text
RESPONSIBILITY_LESS_FILES=0
RESPONSIBILITY_LESS_DIRECTORIES=0
DUPLICATE_RESPONSIBILITY_FILES/TREES=0
UNJUSTIFIED_FILE_FRAGMENTATION=0
REEXPORT/PASS_THROUGH/FORWARDER/SHIM/ALIAS RESIDUE=0
EMPTY PARENTS=0
```

## 8. Package/workspace/service survival

A package/workspace/service survives only with coherent unique ownership and justified lifecycle/consumer boundaries.

Delete/collapse containers that are duplicate owners, compatibility holders, utility junk drawers, obsolete topology, or empty after migration.

Remove manifests, exports, dependencies, config and lockfile ownership associated only with the loser.

## 9. `core/**` and `shared/**`

Heightened burden of proof:

- genuinely cross-cutting and stable;
- multiple real consumers where relevant;
- no hidden domain-specific mutable policy;
- no duplicate service logic;
- no manual contract/business mirror;
- no use as a place to avoid choosing the true owner.

Rehome domain-owned truth out of `core/shared` and delete losing wrappers/paths.

## 10. Frontend structural ownership

For all web/mobile surfaces:

```text
SCREEN/JOURNEY OWNER IS EXPLICIT
STATE SOURCE IS CANONICAL
DATA ACCESS DOES NOT DUPLICATE DOMAIN POLICY
SHARED UI IS PRESENTATIONAL OR GENUINELY CROSS-SURFACE
NAVIGATION/ROUTE AUTHORITY IS NOT DUPLICATED
FORM VALIDATION DOES NOT BECOME SECOND BACKEND BUSINESS AUTHORITY
```

Duplicate screens/flows serving the same material responsibility must converge to a canonical flow unless real actor/journey/state distinctions justify separation.

## 11. Control/support surfaces

`.agents/**`, `.github/**`, `.opencodereview/**`, `docs/**`, `tools/**`, `governance/**` are ordinary architectural surfaces for survival purposes.

If a whole surface is mostly stale, duplicated, compensatory or confusing:

```text
EXTRACT UNIQUE REQUIRED VALUE
→ DELETE NONCANONICAL SURFACE/SUBTREE
→ RECREATE MINIMUM CANONICAL STRUCTURE
→ UPDATE REFERENCES
→ PROVE OLD SURFACE RESIDUE=0
```

Do not preserve a large control surface because deleting/rebuilding it feels aggressive.

## 12. Structural completion

An affected architecture unit is not closed until:

```text
LOSING SYMBOLS/FILES/DIRECTORIES/PACKAGES/SERVICES/SUBTREES REMOVED
REEXPORT/BRIDGE/ALIAS RESIDUE REMOVED
IMPORTS/EXPORTS POINT ONLY TO CANONICAL OWNERS
EMPTY/MEANINGLESS PARENTS PRUNED
WORKSPACE/MANIFEST/LOCKFILE OWNERSHIP UPDATED
UNUSED DEPENDENCIES REMOVED
NAMES/PATHS MATCH RESPONSIBILITIES
NEGATIVE-SPACE SEARCH FINDS NO LOSING STRUCTURE
```

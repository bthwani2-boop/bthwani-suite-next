# Focus — Code, Architecture and Repository Organization

Status: ACTIVE_CANONICAL_ORCHESTRATOR_OWNER

## 1. Structural target

Repository structure must reflect real semantic ownership, not accumulated history.

Required invariants:

```text
ONE RESPONSIBILITY → ONE CANONICAL OWNER
ONE OWNER → COHESIVE CONTAINER SET
NO DUPLICATE RESPONSIBILITY TREES
NO SHADOW SERVICES/PACKAGES
NO PASS-THROUGH LAYERS WITHOUT UNIQUE VALUE
NO "shared" AS A REFUGE FROM OWNERSHIP
NO DIRECTORY KEPT ONLY BECAUSE IT EXISTS
```

## 2. Topology audit

Audit every material:

```text
SERVICE
DOMAIN
PACKAGE
WORKSPACE
MODULE
DIRECTORY
FILE
PUBLIC EXPORT SURFACE
ENTRYPOINT
ROUTE/ADAPTER BOUNDARY
```

For each ask:

```text
WHAT RESPONSIBILITY DOES THIS CONTAINER OWN?
IS THAT RESPONSIBILITY REQUIRED?
IS THIS THE CORRECT OWNER?
IS THERE ANOTHER CONTAINER OWNING THE SAME MEANING?
CAN THIS BE COLLAPSED INTO A STRONGER CANONICAL OWNER?
IS THIS ONLY A WRAPPER/BRIDGE/COMPATIBILITY SHELL?
SHOULD ITS CHILDREN BE REHOMED AND THE CONTAINER DELETED?
```

## 3. Anti-fragmentation law

Do not solve duplication by adding another abstraction layer unless it becomes the sole canonical owner and the old owners are removed.

Forbidden stable shapes:

```text
A + B + SYNC WRAPPER
OLD SERVICE + NEW SERVICE + ROUTING BRIDGE
OLD PACKAGE + NEW PACKAGE + REEXPORT SHELL
MULTIPLE "shared" TREES WITH OVERLAPPING POLICY
LOCAL DOMAIN LOGIC COPIED INTO FRONTENDS
DUPLICATE ADAPTERS THAT EMBED THE SAME MUTABLE POLICY
```

## 4. File and symbol structure

A surviving file must have a coherent reason to exist.

Refound when a file contains unrelated responsibilities, duplicate policy, multiple lifecycle authorities, stale compatibility branches or excessive forwarding logic.

Split only when split creates true ownership boundaries. Merge when fragmentation creates artificial indirection.

Names and paths are architecture. Rename/rehome when current naming materially misrepresents responsibility.

## 5. Package/workspace survival

A package/workspace survives only when it owns a coherent reusable boundary with real consumers and justified independent lifecycle/tooling.

Delete or collapse packages that are:

```text
SINGLE-FILE PASS-THROUGH
REEXPORT-ONLY
DUPLICATE DOMAIN OWNER
LEGACY COMPATIBILITY HOLDER
UNOWNED UTILITY BUCKET
EMPTY/NEAR-EMPTY AFTER MIGRATION
CREATED ONLY TO MATCH OLD TOPOLOGY
```

Remove associated manifests/dependencies/config after deletion.

## 6. `core/**` and `shared/**`

Heightened burden of proof:

- cross-cutting semantics must be real, stable and consumer-driven;
- domain-specific mutable policy must remain with its domain owner;
- a shared component may be reusable presentation, but not a second business-policy source;
- a shared hook/store/client may not silently own domain truth that belongs to a service/domain;
- duplicate `shared` trees should converge or be rehomed.

## 7. Frontend structural ownership

For all web/mobile surfaces:

```text
SCREEN/JOURNEY OWNER IS EXPLICIT
STATE SOURCE IS CANONICAL
DATA ACCESS DOES NOT DUPLICATE DOMAIN POLICY
SHARED UI IS PRESENTATIONAL OR GENUINELY CROSS-SURFACE
NAVIGATION/ROUTE AUTHORITY IS NOT DUPLICATED
FORM VALIDATION DOES NOT BECOME A SECOND BACKEND RULE AUTHORITY
```

When the same business behavior is independently implemented across surfaces, choose the correct canonical source and derive/adapt rather than synchronize copies.

## 8. Structural completion

An affected topology root is not closed until:

```text
LOSING PACKAGES/DIRECTORIES/FILES REMOVED
REEXPORT/BRIDGE RESIDUE REMOVED
IMPORTS/EXPORTS POINT TO CANONICAL OWNERS
EMPTY PARENTS PRUNED
WORKSPACE/MANIFEST/LOCKFILE OWNERSHIP UPDATED
UNUSED DEPENDENCIES REMOVED
NAMES/PATHS MATCH RESPONSIBILITIES
NEGATIVE-SPACE SEARCH FINDS NO LOSING STRUCTURE
```
